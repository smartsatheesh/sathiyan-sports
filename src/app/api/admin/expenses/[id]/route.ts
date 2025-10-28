import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Expense from "@/app/models/Expense";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";

interface Params {
  params: { id: string };
}

// PUT - Update expense
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectToMongoose();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const expenseId = params.id;
    const body = await req.json();
    const { amount, description, paidBy, paymentMethod, transactionId, category, date } = body;

    // Validate required fields
    if (!amount || !description || !paidBy || !paymentMethod || !category) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate GPay transaction ID if payment method is GPay
    if (paymentMethod === "gpay" && !transactionId) {
      return NextResponse.json(
        { success: false, message: "Transaction ID is required for GPay payments" },
        { status: 400 }
      );
    }

    const updateData: any = {
      amount: parseFloat(amount),
      description: description.trim(),
      paidBy,
      paymentMethod,
      category,
      date: date ? new Date(date) : new Date(),
      updatedAt: new Date(),
      updatedBy: (session.user as any).id
    };

    if (paymentMethod === "gpay") {
      updateData.transactionId = transactionId.trim();
    } else {
      updateData.$unset = { transactionId: 1 };
    }

    const expense = await (Expense.findByIdAndUpdate as any)(
      expenseId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    if (!expense) {
      return NextResponse.json(
        { success: false, message: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Expense updated successfully",
      expense
    });

  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { success: false, message: "Error updating expense" },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToMongoose();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const expenseId = params.id;

    const expense = await (Expense.findByIdAndDelete as any)(expenseId);

    if (!expense) {
      return NextResponse.json(
        { success: false, message: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, message: "Error deleting expense" },
      { status: 500 }
    );
  }
}