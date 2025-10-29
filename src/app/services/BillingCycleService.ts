import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

export interface BillingCycleConfig {
  subscriptionType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  cycleLength?: number; // For flexible monthly (1-5 months)
  startDate: Date;
  gracePeriodDays?: number;
}

export interface PaymentRecord {
  paymentDate: Date;
  amount: number;
  method: string;
  transactionId?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  status: 'completed' | 'failed' | 'pending';
}

export class BillingCycleService {
  /**
   * Calculate next due date based on subscription type and cycle length
   */
  static calculateNextDueDate(config: BillingCycleConfig): Date {
    const { subscriptionType, cycleLength = 1, startDate } = config;
    const nextDue = new Date(startDate);

    switch (subscriptionType) {
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + cycleLength);
        break;
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'half yearly':
        nextDue.setMonth(nextDue.getMonth() + 6);
        break;
      case 'yearly':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
    }

    return nextDue;
  }

  /**
   * Calculate billing period end date
   */
  static calculateBillingPeriodEnd(config: BillingCycleConfig): Date {
    const nextDue = this.calculateNextDueDate(config);
    // Billing period ends one day before next due date
    const periodEnd = new Date(nextDue);
    periodEnd.setDate(periodEnd.getDate() - 1);
    return periodEnd;
  }

  /**
   * Check if payment is overdue
   */
  static isPaymentOverdue(dueDate: Date, gracePeriodDays: number = 5): boolean {
    const today = new Date();
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);
    
    return today > graceEndDate;
  }

  /**
   * Calculate overdue days
   */
  static calculateOverdueDays(dueDate: Date, gracePeriodDays: number = 5): number {
    const today = new Date();
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);
    
    if (today <= graceEndDate) {
      return 0;
    }
    
    const diffTime = today.getTime() - graceEndDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get payment status based on dates and current status
   */
  static getPaymentStatus(
    currentStatus: string,
    dueDate: Date | null,
    gracePeriodDays: number = 5
  ): 'pending' | 'registered' | 'completed' | 'failed' | 'overdue' {
    if (currentStatus === 'completed') {
      return 'completed';
    }
    
    if (currentStatus === 'failed') {
      return 'failed';
    }

    if (!dueDate) {
      return currentStatus as any;
    }

    if (this.isPaymentOverdue(dueDate, gracePeriodDays)) {
      return 'overdue';
    }

    return currentStatus as any;
  }

  /**
   * Record a payment and update billing cycle
   */
  static async recordPayment(
    userId: string,
    paymentData: {
      amount: number;
      method: string;
      transactionId?: string;
      paymentDate?: Date;
    }
  ) {
    await connectToMongoose();
    
    const user = await (User.findById as any)(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const paymentDate = paymentData.paymentDate || new Date();
    
    // Calculate billing period
    const billingPeriodStart = user.paymentCompletedDate || user.subscriptionStartDate || paymentDate;
    const billingPeriodEnd = this.calculateBillingPeriodEnd({
      subscriptionType: user.subscriptionType,
      cycleLength: user.billingCycleLength || 1,
      startDate: billingPeriodStart
    });

    // Create payment record
    const paymentRecord: PaymentRecord = {
      paymentDate,
      amount: paymentData.amount,
      method: paymentData.method,
      transactionId: paymentData.transactionId,
      billingPeriodStart,
      billingPeriodEnd,
      status: 'completed'
    };

    // Calculate next due date
    const nextDueDate = this.calculateNextDueDate({
      subscriptionType: user.subscriptionType,
      cycleLength: user.billingCycleLength || 1,
      startDate: paymentDate
    });

    // Update user
    user.paymentStatus = 'completed';
    user.paymentCompletedDate = paymentDate;
    user.nextDueDate = nextDueDate;
    user.lastPaymentAmount = paymentData.amount;
    user.paymentMethod = paymentData.method;
    user.transactionId = paymentData.transactionId;
    user.overdueDays = 0;
    
    // Add to payment history
    if (!user.paymentHistory) {
      user.paymentHistory = [];
    }
    user.paymentHistory.push(paymentRecord);

    await user.save();
    return user;
  }

  /**
   * Update payment status from registered to completed
   */
  static async markPaymentCompleted(
    userId: string,
    paymentData: {
      amount: number;
      method: string;
      transactionId?: string;
      paymentDate?: Date;
    }
  ) {
    return this.recordPayment(userId, paymentData);
  }

  /**
   * Register a user (set status to registered)
   */
  static async registerUser(userId: string, subscriptionData: {
    subscriptionType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
    cycleLength?: number;
    amount: number;
  }) {
    await connectToMongoose();
    
    const user = await (User.findById as any)(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const startDate = new Date();
    const nextDueDate = this.calculateNextDueDate({
      subscriptionType: subscriptionData.subscriptionType,
      cycleLength: subscriptionData.cycleLength || 1,
      startDate
    });

    user.paymentStatus = 'registered';
    user.subscriptionType = subscriptionData.subscriptionType;
    user.billingCycleLength = subscriptionData.cycleLength || 1;
    user.subscriptionAmount = subscriptionData.amount;
    user.subscriptionStartDate = startDate;
    user.nextDueDate = nextDueDate;
    user.overdueDays = 0;

    await user.save();
    return user;
  }

  /**
   * Update overdue status for all users
   */
  static async updateOverdueStatus() {
    await connectToMongoose();
    
    const users = await (User.find as any)({
      paymentStatus: { $in: ['pending', 'registered'] },
      nextDueDate: { $exists: true, $ne: null }
    });

    const updatePromises = users.map(async (user: any) => {
      const overdueDays = this.calculateOverdueDays(
        user.nextDueDate,
        user.gracePeriodDays || 5
      );
      
      const newStatus = this.getPaymentStatus(
        user.paymentStatus,
        user.nextDueDate,
        user.gracePeriodDays || 5
      );

      if (overdueDays !== user.overdueDays || newStatus !== user.paymentStatus) {
        user.overdueDays = overdueDays;
        user.paymentStatus = newStatus;
        return user.save();
      }
    });

    await Promise.all(updatePromises.filter(Boolean));
  }

  /**
   * Get users with upcoming due dates (for notifications)
   */
  static async getUsersWithUpcomingDueDates(daysAhead: number = 7) {
    await connectToMongoose();
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    
    return (User.find as any)({
      paymentStatus: { $in: ['registered', 'pending'] },
      nextDueDate: {
        $gte: new Date(),
        $lte: targetDate
      }
    }).select('name email mobile nextDueDate subscriptionType subscriptionAmount paymentStatus');
  }

  /**
   * Get overdue users (for notifications)
   */
  static async getOverdueUsers() {
    await connectToMongoose();
    
    return (User.find as any)({
      paymentStatus: 'overdue'
    }).select('name email mobile nextDueDate subscriptionType subscriptionAmount overdueDays');
  }
}

export default BillingCycleService;