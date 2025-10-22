import { BillingCycle, BillingReminder } from '@/app/models/BillingCycleModel';
import { connectToMongoose } from '@/app/server/mongodb';

/**
 * Billing Cycle Management Service
 * Handles billing reminders, notifications, and cycle calculations
 */
export class BillingService {
  
  /**
   * Calculate next billing date based on cycle type and billing date
   */
  static calculateNextBillingDate(cycleType: string, billingDate: number, fromDate?: Date): Date {
    const baseDate = fromDate || new Date();
    let nextDate = new Date(baseDate);
    
    // Set to the billing date of current month
    nextDate.setDate(billingDate);
    nextDate.setHours(0, 0, 0, 0);
    
    // If the billing date has already passed, move to next cycle
    if (nextDate <= baseDate) {
      switch (cycleType) {
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'half yearly':
          nextDate.setMonth(nextDate.getMonth() + 6);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }
    
    return nextDate;
  }

  /**
   * Create or update billing cycle for a user
   */
  static async createOrUpdateBillingCycle(data: {
    userId: string;
    userEmail: string;
    userName: string;
    cycleType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
    billingDate: number;
    currentAmount: number;
    currency?: string;
    reminderDays?: number[];
    notificationPreferences?: {
      email: boolean;
      whatsapp: boolean;
      sms: boolean;
    };
  }) {
    await connectToMongoose();
    
    const nextBillingDate = this.calculateNextBillingDate(data.cycleType, data.billingDate);
    
    const billingCycle = await (BillingCycle.findOneAndUpdate as any)(
      { userId: data.userId },
      {
        ...data,
        nextBillingDate,
        status: 'active',
        lastUpdated: new Date()
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Schedule initial reminders
    await this.scheduleReminders(billingCycle);
    
    return billingCycle;
  }

  /**
   * Schedule reminders for a billing cycle
   */
  static async scheduleReminders(billingCycle: any) {
    await connectToMongoose();
    
    // Clear existing pending reminders for this billing cycle
    await (BillingReminder.deleteMany as any)({
      billingCycleId: billingCycle._id,
      status: 'pending'
    });
    
    const reminderDays = billingCycle.reminderDays || [7, 3, 1];
    const reminders = [];
    
    for (const days of reminderDays) {
      const reminderDate = new Date(billingCycle.nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - days);
      
      // Only schedule future reminders
      if (reminderDate > new Date()) {
        const reminder = {
          userId: billingCycle.userId,
          billingCycleId: billingCycle._id,
          userEmail: billingCycle.userEmail,
          userName: billingCycle.userName,
          reminderType: 'upcoming_payment',
          scheduledDate: reminderDate,
          daysUntilBilling: days,
          amount: billingCycle.currentAmount,
          cycleType: billingCycle.cycleType,
          message: this.generateReminderMessage(billingCycle, days),
          status: 'pending'
        };
        
        reminders.push(reminder);
      }
    }
    
    if (reminders.length > 0) {
      await (BillingReminder.insertMany as any)(reminders);
    }
    
    return reminders;
  }

  /**
   * Generate reminder message based on billing cycle and days until billing
   */
  static generateReminderMessage(billingCycle: any, daysUntilBilling: number): string {
    const amount = billingCycle.currentAmount;
    const currency = billingCycle.currency || 'INR';
    const cycleType = billingCycle.cycleType;
    const billingDate = billingCycle.nextBillingDate.toLocaleDateString();
    
    if (daysUntilBilling === 1) {
      return `Hi ${billingCycle.userName}! Your ${cycleType} subscription of ${currency} ${amount} is due tomorrow (${billingDate}). Please ensure your payment method is ready.`;
    } else if (daysUntilBilling <= 3) {
      return `Hi ${billingCycle.userName}! Your ${cycleType} subscription of ${currency} ${amount} is due in ${daysUntilBilling} days on ${billingDate}.`;
    } else {
      return `Hi ${billingCycle.userName}! Just a friendly reminder that your ${cycleType} subscription of ${currency} ${amount} is due in ${daysUntilBilling} days on ${billingDate}.`;
    }
  }

  /**
   * Process payment for a billing cycle
   */
  static async processPayment(billingCycleId: string, paymentData: {
    paymentId: string;
    amount: number;
    paymentMethod: string;
    status: 'completed' | 'failed' | 'pending';
    transactionId?: string;
    notes?: string;
  }) {
    await connectToMongoose();
    
    const billingCycle = await (BillingCycle.findById as any)(billingCycleId);
    if (!billingCycle) {
      throw new Error('Billing cycle not found');
    }
    
    const billingPeriodStart = new Date(billingCycle.nextBillingDate);
    const billingPeriodEnd = this.calculateNextBillingDate(
      billingCycle.cycleType, 
      billingCycle.billingDate, 
      billingPeriodStart
    );
    
    const paymentRecord = {
      ...paymentData,
      paymentDate: new Date(),
      billingPeriodStart,
      billingPeriodEnd
    };
    
    await billingCycle.addPaymentRecord(paymentRecord);
    
    if (paymentData.status === 'completed') {
      // Schedule next reminders
      await this.scheduleReminders(billingCycle);
    } else if (paymentData.status === 'failed') {
      // Schedule overdue reminder
      await this.scheduleOverdueReminder(billingCycle);
    }
    
    return billingCycle;
  }

  /**
   * Schedule overdue payment reminder
   */
  static async scheduleOverdueReminder(billingCycle: any) {
    await connectToMongoose();
    
    const overdueReminder = {
      userId: billingCycle.userId,
      billingCycleId: billingCycle._id,
      userEmail: billingCycle.userEmail,
      userName: billingCycle.userName,
      reminderType: 'overdue_payment',
      scheduledDate: new Date(),
      daysUntilBilling: 0,
      amount: billingCycle.currentAmount,
      cycleType: billingCycle.cycleType,
      message: `Hi ${billingCycle.userName}! Your ${billingCycle.cycleType} subscription payment of ${billingCycle.currency} ${billingCycle.currentAmount} is overdue. Please make the payment to continue your service.`,
      status: 'pending'
    };
    
    const reminder = new BillingReminder(overdueReminder);
    return await reminder.save();
  }

  /**
   * Get pending reminders for today
   */
  static async getPendingReminders() {
    await connectToMongoose();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await (BillingReminder.find as any)({
      status: 'pending',
      scheduledDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('billingCycleId');
  }

  /**
   * Mark reminder as sent
   */
  static async markReminderSent(reminderId: string, sentVia: string[]) {
    await connectToMongoose();
    
    return await (BillingReminder.findByIdAndUpdate as any)(reminderId, {
      status: 'sent',
      sentAt: new Date(),
      sentVia,
      $inc: { attempts: 1 },
      lastAttempt: new Date()
    });
  }

  /**
   * Get billing analytics for admin dashboard
   */
  static async getBillingAnalytics() {
    await connectToMongoose();
    
    const totalUsers = await (BillingCycle.countDocuments as any)({});
    const activeUsers = await (BillingCycle.countDocuments as any)({ status: 'active' });
    const overdueUsers = await (BillingCycle.countDocuments as any)({ status: 'overdue' });
    const cancelledUsers = await (BillingCycle.countDocuments as any)({ status: 'cancelled' });
    
    // Revenue by cycle type
    const revenueByType = await (BillingCycle.aggregate as any)([
      { $match: { status: { $in: ['active', 'overdue'] } } },
      {
        $group: {
          _id: '$cycleType',
          totalUsers: { $sum: 1 },
          totalRevenue: { $sum: '$currentAmount' }
        }
      }
    ]);
    
    // Upcoming payments (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingPayments = await (BillingCycle.find as any)({
      status: 'active',
      nextBillingDate: {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    });
    
    const upcomingRevenue = upcomingPayments.reduce((sum: number, cycle: any) => sum + cycle.currentAmount, 0);
    
    return {
      totalUsers,
      activeUsers,
      overdueUsers,
      cancelledUsers,
      revenueByType,
      upcomingPayments: upcomingPayments.length,
      upcomingRevenue
    };
  }

  /**
   * Get users due for billing today
   */
  static async getUsersDueToday() {
    await connectToMongoose();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await (BillingCycle.find as any)({
      status: 'active',
      nextBillingDate: {
        $gte: today,
        $lt: tomorrow
      }
    });
  }

  /**
   * Update billing cycle
   */
  static async updateBillingCycle(billingCycleId: string, updates: any) {
    await connectToMongoose();
    
    const billingCycle = await (BillingCycle.findByIdAndUpdate as any)(
      billingCycleId,
      { ...updates, lastUpdated: new Date() },
      { new: true }
    );
    
    // If cycle type, billing date, or amount changed, reschedule reminders
    if (updates.cycleType || updates.billingDate || updates.currentAmount) {
      if (updates.cycleType || updates.billingDate) {
        billingCycle.calculateNextBillingDate();
        await billingCycle.save();
      }
      await this.scheduleReminders(billingCycle);
    }
    
    return billingCycle;
  }
}