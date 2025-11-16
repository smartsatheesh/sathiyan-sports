import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Expense from "@/app/models/Expense";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongoose();
    
    const expense = await (Expense.findById as any)(params.id);
    
    if (!expense) {
      return NextResponse.json(
        { message: "Expense not found", success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      expense,
      success: true
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { message: "Error fetching expense", success: false },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const {
      subscriptionType,
      amount,
      sport,
      paymentDate,
      description,
      status
    } = body;

    // Validation
    if (!subscriptionType || !amount || !sport || !paymentDate || !status) {
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

    const expense = await (Expense.findByIdAndUpdate as any)(
      params.id,
      {
        subscriptionType,
        amount,
        sport,
        paymentDate: new Date(paymentDate),
        description,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!expense) {
      return NextResponse.json(
        { message: "Expense not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Expense updated successfully",
      expense,
      success: true
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { message: "Error updating expense", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongoose();

    const expense = await (Expense.findByIdAndDelete as any)(params.id);

    if (!expense) {
      return NextResponse.json(
        { message: "Expense not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Expense deleted successfully",
      success: true
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { message: "Error deleting expense", success: false },
      { status: 500 }
    );
  }
}