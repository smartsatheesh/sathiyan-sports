import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Expense from "@/app/models/Expense";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";

// GET - Fetch expense statistics
export async function GET(req: NextRequest) {
  try {
    await connectToMongoose();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || ((session.user as any).role !== "admin" && (session.user as any).role !== "coach")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    
    // Get current month stats
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Get overall totals
    const overallStats = await (Expense.aggregate as any)([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalExpenses: { $sum: 1 },
          avgExpense: { $avg: "$amount" }
        }
      }
    ]);

    // Get current month stats
    const currentMonthStats = await (Expense.aggregate as any)([
      {
        $match: {
          date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalExpenses: { $sum: 1 }
        }
      }
    ]);

    // Get stats by category
    const categoryStats = await (Expense.aggregate as any)([
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get stats by who paid
    const paidByStats = await (Expense.aggregate as any)([
      {
        $group: {
          _id: "$paidBy",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get payment method stats
    const paymentMethodStats = await (Expense.aggregate as any)([
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly breakdown for the specified year
    const monthlyStats = await (Expense.aggregate as any)([
      {
        $match: {
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59, 999)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Get recent high expenses (top 10)
    const recentHighExpenses = await (Expense.find as any)({})
      .populate('createdBy', 'name')
      .sort({ amount: -1 })
      .limit(10)
      .select('amount description paidBy category date');

    // Monthly category breakdown for current year
    const monthlyCategoryStats = await (Expense.aggregate as any)([
      {
        $match: {
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            category: "$category"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        overall: overallStats[0] || { totalAmount: 0, totalExpenses: 0, avgExpense: 0 },
        currentMonth: currentMonthStats[0] || { totalAmount: 0, totalExpenses: 0 },
        byCategory: categoryStats,
        byPaidBy: paidByStats,
        byPaymentMethod: paymentMethodStats,
        monthly: monthlyStats,
        recentHighExpenses,
        monthlyCategoryBreakdown: monthlyCategoryStats
      }
    });

  } catch (error) {
    console.error("Error fetching expense stats:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching expense statistics" },
      { status: 500 }
    );
  }
}