export interface IBillingCycle {
  userId: string;
  userEmail: string;
  userName: string;
  
  // Billing Configuration
  cycleType: 'monthly' | 'quarterly' | 'yearly';
  billingDate: number; // Day of the month (1-28) when billing occurs
  currentAmount: number;
  currency: string;
  
  // Payment History
  lastPaymentDate: Date;
  nextBillingDate: Date;
  paymentHistory: PaymentRecord[];
  
  // Notification Settings
  reminderDays: number[]; // Days before billing to send reminders (e.g., [7, 3, 1])
  notificationPreferences: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
  
  // Status & Tracking
  status: 'active' | 'suspended' | 'cancelled' | 'overdue';
  autoRenewal: boolean;
  gracePeriodDays: number;
  overdueCount: number;
  
  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  notes?: string;
}

export interface PaymentRecord {
  paymentId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  transactionId?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  notes?: string;
}

export interface BillingReminder {
  _id?: string;
  userId: string;
  billingCycleId: string;
  userEmail: string;
  userName: string;
  
  // Reminder Details
  reminderType: 'upcoming_payment' | 'overdue_payment' | 'payment_failed' | 'cycle_changed';
  scheduledDate: Date;
  daysUntilBilling: number;
  amount: number;
  cycleType: string;
  
  // Status
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Date;
  sentVia: ('email' | 'whatsapp' | 'sms')[];
  
  // Content
  message: string;
  
  // Metadata
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
}