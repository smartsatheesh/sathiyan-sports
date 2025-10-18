import cron from 'node-cron';
import { BillingService } from './billingService';
import { billingNotificationService } from './billingNotificationService';

class BillingSchedulerService {
  private isRunning = false;

  constructor() {
    this.initializeSchedulers();
  }

  private initializeSchedulers() {
    // Run daily at 9:00 AM to check for billing reminders
    cron.schedule('0 9 * * *', async () => {
      console.log('🕘 Running daily billing reminder check...');
      await this.processDailyReminders();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run every hour to check for overdue payments
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running hourly overdue payment check...');
      await this.processOverduePayments();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run weekly on Sunday at 10:00 AM for analytics and cleanup
    cron.schedule('0 10 * * 0', async () => {
      console.log('📊 Running weekly billing analytics and cleanup...');
      await this.weeklyMaintenanceTasks();
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('✅ Billing scheduler service initialized with cron jobs');
  }

  /**
   * Process daily billing reminders
   */
  private async processDailyReminders(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Daily reminder process already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Get pending reminders for today using BillingService
      const pendingReminders = await BillingService.getPendingReminders();
      
      console.log(`📋 Found ${pendingReminders.length} pending reminders to process`);

      let notificationsSent = 0;

      for (const reminder of pendingReminders) {
        try {
          if (!reminder.billingCycleId) {
            console.warn(`⚠️ Reminder ${reminder._id} has no billing cycle, skipping`);
            continue;
          }

          // Calculate days until billing for context
          const today = new Date();
          const nextBillingDate = new Date(reminder.billingCycleId.nextBillingDate);
          const daysUntilBilling = Math.floor(
            (nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Send notification using billing notification service
          const billingCycle = reminder.billingCycleId;
          const notificationSent = await billingNotificationService.sendBillingReminder(
            billingCycle,
            {
              reminderType: 'upcoming_payment',
              scheduledDate: reminder.scheduledDate,
              daysUntilBilling: reminder.daysUntilBilling,
              status: 'pending',
              sentVia: [],
              message: reminder.message,
              createdAt: new Date(),
              attempts: 0
            } as any,
            daysUntilBilling
          );

          if (notificationSent) {
            // Mark reminder as sent
            await BillingService.markReminderSent(reminder._id.toString(), ['email', 'whatsapp']);
            notificationsSent++;
            console.log(`✅ Sent reminder for user ${billingCycle.userName} (${daysUntilBilling} days until billing)`);
          } else {
            console.error(`❌ Failed to send reminder for user ${billingCycle.userName}`);
          }

        } catch (error) {
          console.error(`❌ Error processing reminder ${reminder._id}:`, error);
        }
      }

      console.log(`✅ Daily reminder processing completed: ${notificationsSent} notifications sent`);

    } catch (error) {
      console.error('❌ Error in daily reminder processing:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process overdue payments
   */
  private async processOverduePayments(): Promise<void> {
    try {
      // Get users due today (will include overdue users)
      const usersDueToday = await BillingService.getUsersDueToday();
      
      console.log(`⚠️ Found ${usersDueToday.length} users with billing due today`);

      let alertsSent = 0;

      for (const billingCycle of usersDueToday) {
        try {
          const today = new Date();
          const billingDate = new Date(billingCycle.nextBillingDate);
          const daysOverdue = Math.floor(
            (today.getTime() - billingDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Only process if actually overdue
          if (daysOverdue > 0) {
            // Send overdue alert
            const alertSent = await billingNotificationService.sendOverdueAlert(billingCycle);
            
            if (alertSent) {
              alertsSent++;
              console.log(`🚨 Sent overdue alert for user ${billingCycle.userName} (${daysOverdue} days overdue)`);
            }
          }

        } catch (error) {
          console.error(`❌ Error processing overdue billing cycle ${billingCycle._id}:`, error);
        }
      }

      console.log(`✅ Overdue processing completed: ${alertsSent} alerts sent`);

    } catch (error) {
      console.error('❌ Error in overdue payment processing:', error);
    }
  }

  /**
   * Weekly maintenance tasks
   */
  private async weeklyMaintenanceTasks(): Promise<void> {
    try {
      console.log('🧹 Starting weekly maintenance tasks...');

      // Generate weekly summary using BillingService analytics
      const weeklyStats = await BillingService.getBillingAnalytics();
      console.log('📈 Weekly billing summary:', weeklyStats);

      console.log('✅ Weekly maintenance tasks completed');

    } catch (error) {
      console.error('❌ Error in weekly maintenance tasks:', error);
    }
  }

  /**
   * Manual trigger for testing reminders
   */
  async manualTriggerReminders(): Promise<{success: boolean, message: string}> {
    try {
      console.log('🔔 Manual trigger for billing reminders...');
      await this.processDailyReminders();
      return {
        success: true,
        message: 'Daily reminders processing completed manually'
      };
    } catch (error) {
      console.error('❌ Error in manual trigger:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Manual trigger for overdue processing
   */
  async manualTriggerOverdue(): Promise<{success: boolean, message: string}> {
    try {
      console.log('🔧 Manual trigger for overdue processing...');
      await this.processOverduePayments();
      return {
        success: true,
        message: 'Overdue payments processing completed manually'
      };
    } catch (error) {
      console.error('❌ Error in manual overdue trigger:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send test notification to specific user
   */
  async sendTestNotification(userEmail: string): Promise<{success: boolean, message: string}> {
    try {
      // Create mock billing cycle for testing
      const testBillingCycle: any = {
        _id: 'test-cycle-id',
        userId: 'test-user-id',
        userEmail: userEmail,
        userName: 'Test User',
        cycleType: 'monthly' as const,
        billingDate: 15,
        currentAmount: 1000,
        currency: 'INR',
        lastPaymentDate: new Date(),
        nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'active' as const,
        reminderDays: [7, 3, 1],
        notificationPreferences: {
          email: true,
          whatsapp: true,
          sms: false
        },
        autoRenewal: true,
        gracePeriodDays: 7,
        overdueCount: 0,
        paymentHistory: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        notes: 'Test billing cycle for notification testing'
      };

      const testReminder: any = {
        reminderType: 'upcoming_payment',
        scheduledDate: new Date(),
        daysUntilBilling: 3,
        status: 'pending' as const,
        sentVia: [],
        message: 'Test reminder message',
        createdAt: new Date(),
        attempts: 0
      };

      const result = await billingNotificationService.sendBillingReminder(
        testBillingCycle,
        testReminder,
        3
      );

      if (result) {
        return {
          success: true,
          message: `Test notification sent successfully to ${userEmail}`
        };
      } else {
        return {
          success: false,
          message: 'Failed to send test notification'
        };
      }

    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    schedulers: string[];
    nextRuns: {
      dailyReminders: string;
      overdueCheck: string;
      weeklyMaintenance: string;
    };
  } {
    const now = new Date();
    
    // Calculate next 9 AM for daily reminders
    const nextDaily = new Date(now);
    nextDaily.setHours(9, 0, 0, 0);
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }

    // Calculate next hour for overdue check
    const nextHourly = new Date(now);
    nextHourly.setMinutes(0, 0, 0);
    nextHourly.setHours(nextHourly.getHours() + 1);

    // Calculate next Sunday 10 AM for weekly maintenance
    const nextWeekly = new Date(now);
    nextWeekly.setHours(10, 0, 0, 0);
    const daysUntilSunday = 7 - nextWeekly.getDay();
    nextWeekly.setDate(nextWeekly.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    if (nextWeekly <= now) {
      nextWeekly.setDate(nextWeekly.getDate() + 7);
    }

    return {
      isRunning: this.isRunning,
      schedulers: [
        'Daily reminders: 9:00 AM IST',
        'Overdue check: Every hour',
        'Weekly maintenance: Sunday 10:00 AM IST'
      ],
      nextRuns: {
        dailyReminders: nextDaily.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        overdueCheck: nextHourly.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        weeklyMaintenance: nextWeekly.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      }
    };
  }
}

// Export singleton instance
export const billingSchedulerService = new BillingSchedulerService();
export default billingSchedulerService;