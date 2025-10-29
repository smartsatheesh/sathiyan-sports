// Test script for the enhanced payment tracking system
// This demonstrates the billing cycle and notification functionality

const { BillingCycleService } = require('./src/app/services/BillingCycleService.ts');
const { PaymentNotificationService } = require('./src/app/services/PaymentNotificationService.ts');

// Simulate test users with different payment scenarios
const testUsers = [
  {
    _id: '1',
    email: 'user1@example.com',
    name: 'John Doe',
    paymentStatus: 'pending',
    subscriptionType: 'monthly',
    billingCycleLength: 1, // 1 month
    registrationDate: new Date('2024-01-01'),
    nextDueDate: new Date('2024-02-01'),
    gracePeriodDays: 5
  },
  {
    _id: '2', 
    email: 'user2@example.com',
    name: 'Jane Smith',
    paymentStatus: 'overdue',
    subscriptionType: 'monthly',
    billingCycleLength: 2, // 2 months
    registrationDate: new Date('2024-01-01'),
    paymentCompletedDate: new Date('2024-01-15'),
    nextDueDate: new Date('2024-01-20'),
    gracePeriodDays: 3,
    overdueDays: 10
  },
  {
    _id: '3',
    email: 'user3@example.com', 
    name: 'Bob Johnson',
    paymentStatus: 'registered',
    subscriptionType: 'monthly',
    billingCycleLength: 3, // 3 months
    registrationDate: new Date('2024-02-01'),
    gracePeriodDays: 7
  }
];

async function testPaymentSystem() {
  console.log('🔄 Testing Enhanced Payment Tracking System\n');
  
  // Test 1: Calculate next due dates
  console.log('📅 Testing Billing Cycle Calculations:');
  testUsers.forEach(user => {
    const nextDue = BillingCycleService.calculateNextDueDate(
      user.paymentCompletedDate || user.registrationDate,
      user.subscriptionType,
      user.billingCycleLength
    );
    console.log(`  ${user.name}: Next due ${nextDue.toDateString()} (${user.billingCycleLength}-month cycle)`);
  });
  
  // Test 2: Check overdue status
  console.log('\n⚠️  Testing Overdue Detection:');
  testUsers.forEach(user => {
    const isOverdue = BillingCycleService.isPaymentOverdue(user);
    const overdueDays = BillingCycleService.calculateOverdueDays(user);
    console.log(`  ${user.name}: ${isOverdue ? '🔴 OVERDUE' : '✅ Current'} (${overdueDays} days)`);
  });
  
  // Test 3: Payment status workflow
  console.log('\n💰 Testing Payment Workflow:');
  
  // Register a user
  const registeredUser = BillingCycleService.registerUser(testUsers[2]);
  console.log(`  ✅ Registered ${registeredUser.name} - Status: ${registeredUser.paymentStatus}`);
  
  // Complete a payment
  const completedUser = BillingCycleService.recordPayment(testUsers[0], 'completed');
  console.log(`  ✅ Payment completed for ${completedUser.name} - Next due: ${completedUser.nextDueDate?.toDateString()}`);
  
  // Test 4: Notification system
  console.log('\n📧 Testing Notification System:');
  
  const upcomingUsers = testUsers.filter(user => {
    if (!user.nextDueDate) return false;
    const daysUntilDue = Math.ceil((user.nextDueDate - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 3 && daysUntilDue > 0;
  });
  
  const overdueUsers = testUsers.filter(user => 
    BillingCycleService.isPaymentOverdue(user)
  );
  
  console.log(`  📬 ${upcomingUsers.length} users with upcoming payments`);
  console.log(`  🚨 ${overdueUsers.length} users with overdue payments`);
  
  // Simulate sending notifications
  if (upcomingUsers.length > 0) {
    console.log('  📤 Sending upcoming payment reminders...');
    await PaymentNotificationService.sendUpcomingPaymentReminders(upcomingUsers);
  }
  
  if (overdueUsers.length > 0) {
    console.log('  📤 Sending overdue payment notifications...');
    await PaymentNotificationService.sendOverduePaymentNotifications(overdueUsers);
  }
  
  // Test 5: Admin stats
  console.log('\n📊 Admin Dashboard Stats:');
  const stats = await PaymentNotificationService.getNotificationStats(testUsers);
  console.log(`  Total users: ${stats.totalUsers}`);
  console.log(`  Pending payments: ${stats.pendingPayments}`);
  console.log(`  Overdue payments: ${stats.overduePayments}`);
  console.log(`  Completed payments: ${stats.completedPayments}`);
  console.log(`  Registered users: ${stats.registeredUsers}`);
  
  console.log('\n✅ Payment system testing completed!');
  console.log('\n🌐 Admin panel available at: http://localhost:3000/admin');
  console.log('🔧 API endpoints ready for payment management');
}

// Run the test
testPaymentSystem().catch(console.error);