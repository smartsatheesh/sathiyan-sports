import Subscription from "@/app/models/Subscription";
import User from "@/app/models/User";
import { getISTTodayStart } from "@/app/lib/istDate";

// Shared by fees.server (admin/member flows) and payments.server (UPI confirmation).

export async function latestPaidTill(userId: string): Promise<Date | null> {
  const last = await (Subscription.findOne as any)({ userId, paymentStatus: "Paid" }).sort({ endDate: -1 }).select("endDate").lean();
  return last?.endDate ? new Date(last.endDate) : null;
}

/** Keep the denormalised fields on User in step with the latest paid period. */
export async function syncUserFeeStatus(userId: string) {
  const paidTill = await latestPaidTill(userId);
  if (!paidTill) return;
  const active = paidTill.getTime() >= getISTTodayStart().getTime();
  await (User.findByIdAndUpdate as any)(userId, {
    subscriptionEndDate: paidTill,
    nextDueDate: paidTill,
    hasActiveSubscription: active,
    paymentStatus: active ? "completed" : "overdue",
    lastSubscriptionDate: new Date(),
  });
}
