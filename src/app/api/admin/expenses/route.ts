import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Expense from "@/app/models/Expense";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";

// GET - Fetch expenses with optional filtering
export async function GET(req: NextRequest) {
  try {
    await connectToMongoose();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const paidBy = searchParams.get("paidBy");
    const paymentMethod = searchParams.get("paymentMethod");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month"); // Format: YYYY-MM
    
    // Build query
    const query: any = {};
    
    if (category) query.category = category;
    if (paidBy) query.paidBy = paidBy;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    // Date filtering
    if (month) {
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]) - 1; // JS months are 0-indexed
      const startOfMonth = new Date(year, monthNum, 1);
      const endOfMonth = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (page - 1) * limit;
    
    const expenses = await (Expense.find as any)(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await (Expense.countDocuments as any)(query);
    
    // Calculate totals for current query
    const totals = await (Expense.aggregate as any)([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAmount = totals.length > 0 ? totals[0].totalAmount : 0;

    return NextResponse.json({
      success: true,
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      totals: {
        totalAmount,
        count: totals.length > 0 ? totals[0].count : 0
      }
    });

  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching expenses" },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(req: NextRequest) {
  try {
    await connectToMongoose();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const expenseData = {
      amount: parseFloat(amount),
      description: description.trim(),
      paidBy,
      paymentMethod,
      category,
      date: date ? new Date(date) : new Date(),
      createdBy: (session.user as any).id,
      ...(paymentMethod === "gpay" && { transactionId: transactionId.trim() })
    };

    const expense = await (Expense.create as any)(expenseData);
    
    // Populate the created expense for response
    const populatedExpense = await (Expense.findById as any)(expense._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    return NextResponse.json({
      success: true,
      message: "Expense created successfully",
      expense: populatedExpense
    });

  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, message: "Error creating expense" },
      { status: 500 }
    );
  }
}