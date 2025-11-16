import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Expense from "@/app/models/Expense";

export async function GET() {
  try {
    await connectToMongoose();
    
    const expenses = await (Expense.find as any)({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      expenses,
      success: true
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { message: "Error fetching expenses", success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a fee collection expense (new format)
    if (body.userId && body.subscriptionType) {
      const {
        userId,
        userName,
        champId,
        subscriptionType,
        amount,
        sport,
        paymentDate,
        description,
        status
      } = body;

      // Validation for fee collection
      if (!userId || !userName || !champId || !subscriptionType || !amount || !sport || !paymentDate || !status) {
        return NextResponse.json(
          { message: "All required fields must be provided", success: false },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { message: "Amount must be greater than 0", success: false },
          { status: 400 }
        );
      }

      await connectToMongoose();

      const expense = await (Expense.create as any)({
        userId,
        userName,
        champId,
        subscriptionType,
        amount,
        sport,
        paymentDate: new Date(paymentDate),
        description: description || `${sport} ${subscriptionType} subscription fee for ${userName}`,
        status,
        // Required fields for old format compatibility
        paidBy: "System",
        paymentMethod: "cash",
        category: `${sport} Subscription Fees`,
        date: new Date(paymentDate),
        createdAt: new Date()
      });

      return NextResponse.json({
        message: "Fee collection expense created successfully",
        expense,
        success: true
      });
    } else {
      // Handle old expense format (existing functionality)
      const {
        amount,
        description,
        paidBy,
        paymentMethod,
        transactionId,
        category,
        date,
        createdBy
      } = body;

      // Validation for old format
      if (!amount || !description || !paidBy || !paymentMethod || !category || !createdBy) {
        return NextResponse.json(
          { message: "All required fields must be provided", success: false },
          { status: 400 }
        );
      }

      if (paymentMethod === "gpay" && !transactionId) {
        return NextResponse.json(
          { message: "Transaction ID is required for GPay payments", success: false },
          { status: 400 }
        );
      }

      await connectToMongoose();

      const expense = await (Expense.create as any)({
        amount,
        description,
        paidBy,
        paymentMethod,
        transactionId,
        category,
        date: date ? new Date(date) : new Date(),
        createdBy,
        status: "paid" // Old expenses are typically already paid
      });

      return NextResponse.json({
        message: "Expense created successfully",
        expense,
        success: true
      });
    }
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { message: "Error creating expense", success: false },
      { status: 500 }
    );
  }
}