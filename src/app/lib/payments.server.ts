import { connectToMongoose } from "@/app/server/mongodb";
import Payment from "@/app/models/Payment";
import Booking from "@/app/models/Booking";
import Subscription from "@/app/models/Subscription";
import Player from "@/app/models/Player";
import Tournament from "@/app/models/Tournament";
import { findBlockingConflicts } from "@/app/lib/bookingConflicts";
import { getISTDayStart } from "@/app/lib/istDate";
import { normalizeUtr, isValidUtr } from "@/app/lib/upi";
import { syncUserFeeStatus } from "@/app/lib/feeStatus.server";
import { DEFAULT_CLUB } from "@/app/lib/clubs";

export type PaymentKind = "booking" | "subscription" | "tournament";

export class PaymentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

interface Target {
  amount: number;
  reference: string;
  payerName: string;
  payerPhone: string;
  alreadyPaid: boolean;
  club?: string; // membership fees belong to the member's club
}

// The amount always comes from the stored record, never from the browser.
async function loadTarget(kind: PaymentKind, refId: string): Promise<Target> {
  if (kind === "booking") {
    const b = await (Booking.findById as any)(refId).lean();
    if (!b) throw new PaymentError("Booking not found", 404);
    return {
      amount: Number(b.totalAmount || 0),
      reference: b.bookingReference || "",
      payerName: b.customerName || "",
      payerPhone: b.customerPhone || "",
      alreadyPaid: ["completed", "paid", "refunded"].includes(b.paymentStatus),
    };
  }
  if (kind === "subscription") {
    const s = await (Subscription.findById as any)(refId).lean();
    if (!s) throw new PaymentError("Subscription not found", 404);
    return {
      amount: Number(s.amount || 0),
      reference: s.champId || "",
      payerName: s.userName || "",
      payerPhone: s.userMobile || "",
      alreadyPaid: s.paymentStatus === "Paid",
      club: s.club || DEFAULT_CLUB,
    };
  }
  const p = await (Player.findById as any)(refId).lean();
  if (!p) throw new PaymentError("Registration not found", 404);
  const t = await (Tournament.findById as any)(p.tournamentId).select("name").lean();
  return {
    amount: Number(p.registrationFee || 0),
    reference: t?.name || "Tournament",
    payerName: p.name || "",
    payerPhone: p.phone || p.mobile || "",
    alreadyPaid: p.paymentStatus === "completed",
  };
}

async function markTargetSubmitted(kind: PaymentKind, refId: string, utr: string) {
  if (kind === "booking") {
    await (Booking.findByIdAndUpdate as any)(refId, {
      paymentStatus: "pending_verification",
      paymentMethod: "upi",
      upiTransactionId: utr,
      updatedAt: new Date(),
    });
  } else if (kind === "tournament") {
    await (Player.findByIdAndUpdate as any)(refId, {
      paymentStatus: "pending_verification",
      paymentChoice: "pay_now",
      transactionId: utr,
    });
  }
  // Subscriptions keep their status until confirmed; the Payment record tracks the proof.
}

/** Customer submits a UPI reference (UTR) for something they owe. */
export async function submitPaymentProof(kind: PaymentKind, refId: string, rawUtr: string) {
  const utr = normalizeUtr(rawUtr);
  if (!isValidUtr(utr)) {
    throw new PaymentError("Please enter the 12-digit UPI reference number (UTR) from your payment app");
  }

  await connectToMongoose();
  const target = await loadTarget(kind, refId);
  if (target.alreadyPaid) throw new PaymentError("This is already marked as paid", 409);

  const pending = await (Payment.findOne as any)({ kind, refId, status: "submitted" }).lean();
  if (pending) throw new PaymentError("A payment for this is already waiting for verification", 409);

  try {
    const payment = await (Payment.create as any)({ kind, refId, utr, ...target, method: "upi" });
    await markTargetSubmitted(kind, refId, utr);
    return payment;
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new PaymentError("This UPI reference number has already been used", 409);
    }
    throw err;
  }
}

/** Admin confirms or rejects a submitted proof; confirming updates the linked record. */
export async function decidePayment(paymentId: string, action: "confirm" | "reject", adminName: string, note = "") {
  await connectToMongoose();
  const payment = await (Payment.findById as any)(paymentId);
  if (!payment) throw new PaymentError("Payment not found", 404);
  if (payment.status !== "submitted") throw new PaymentError(`Payment is already ${payment.status}`, 409);

  const refId = String(payment.refId);

  if (action === "confirm") {
    if (payment.kind === "booking") {
      const booking = await (Booking.findById as any)(refId);
      if (!booking) throw new PaymentError("Booking no longer exists", 404);

      // Confirming blocks the slot, so make sure nobody else holds it now
      if (booking.bookingStatus !== "confirmed") {
        const conflicts = [
          ...(await findBlockingConflicts(booking.sport, getISTDayStart(booking.date), booking.timeSlots || [], booking.court, refId)),
          ...(booking.nextDayDate
            ? await findBlockingConflicts(booking.sport, getISTDayStart(booking.nextDayDate), booking.nextDayTimeSlots || [], booking.court, refId)
            : []),
        ];
        if (conflicts.length > 0) {
          throw new PaymentError("Slot is now taken by another confirmed booking. Reject or contact the customer.", 409);
        }
      }

      booking.paymentStatus = "completed";
      booking.bookingStatus = "confirmed";
      booking.updatedAt = new Date();
      await booking.save();
    } else if (payment.kind === "subscription") {
      const sub = await (Subscription.findById as any)(refId);
      if (!sub) throw new PaymentError("Subscription no longer exists", 404);
      sub.paymentStatus = "Paid";
      sub.status = "active";
      sub.paymentMethod = "UPI";
      sub.transactionId = payment.utr;
      sub.lastPaymentDate = new Date();
      await sub.save();
      await (Subscription.updateMany as any)(
        { userId: sub.userId, _id: { $ne: sub._id }, status: "active", endDate: { $lte: sub.startDate } },
        { status: "expired" }
      );
      await syncUserFeeStatus(String(sub.userId));
    } else {
      await (Player.findByIdAndUpdate as any)(refId, { paymentStatus: "completed" });
    }
  } else {
    if (payment.kind === "booking") {
      await (Booking.findByIdAndUpdate as any)(refId, { paymentStatus: "pending", updatedAt: new Date() });
    } else if (payment.kind === "tournament") {
      await (Player.findByIdAndUpdate as any)(refId, { paymentStatus: "pending" });
    } else {
      // Member-initiated period that was never paid
      await (Subscription.updateOne as any)(
        { _id: refId, paymentStatus: "Pending" },
        { status: "cancelled", paymentStatus: "Cancelled" }
      );
    }
  }

  payment.status = action === "confirm" ? "confirmed" : "rejected";
  payment.decidedBy = adminName;
  payment.decidedAt = new Date();
  if (note) payment.note = note;
  // Free the UTR after a rejection so the customer can resubmit a corrected one
  if (action === "reject") {
    payment.rejectedUtr = payment.utr;
    payment.utr = undefined;
  }
  await payment.save();
  return payment;
}
