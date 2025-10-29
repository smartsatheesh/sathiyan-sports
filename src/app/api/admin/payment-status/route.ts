import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";
import BillingCycleService from "@/app/services/BillingCycleService";

// POST - Register a user (set status to registered)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscriptionType, cycleLength, amount } = body;

    if (!userId || !subscriptionType || !amount) {
      return NextResponse.json(
        { message: "Missing required fields: userId, subscriptionType, amount", success: false },
        { status: 400 }
      );
    }

    const user = await BillingCycleService.registerUser(userId, {
      subscriptionType,
      cycleLength,
      amount
    });

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        paymentStatus: user.paymentStatus,
        subscriptionType: user.subscriptionType,
        billingCycleLength: user.billingCycleLength,
        subscriptionAmount: user.subscriptionAmount,
        nextDueDate: user.nextDueDate,
        subscriptionStartDate: user.subscriptionStartDate
      }
    });

  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to register user", 
        success: false 
      },
      { status: 500 }
    );
  }
}

// PUT - Update payment status from registered to completed
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amount, method, transactionId, paymentDate } = body;

    if (!userId || !amount || !method) {
      return NextResponse.json(
        { message: "Missing required fields: userId, amount, method", success: false },
        { status: 400 }
      );
    }

    const user = await BillingCycleService.markPaymentCompleted(userId, {
      amount,
      method,
      transactionId,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined
    });

    return NextResponse.json({
      success: true,
      message: "Payment completed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        paymentStatus: user.paymentStatus,
        paymentCompletedDate: user.paymentCompletedDate,
        nextDueDate: user.nextDueDate,
        lastPaymentAmount: user.lastPaymentAmount,
        paymentMethod: user.paymentMethod,
        transactionId: user.transactionId,
        overdueDays: user.overdueDays
      }
    });

  } catch (error) {
    console.error("Error completing payment:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to complete payment", 
        success: false 
      },
      { status: 500 }
    );
  }
}