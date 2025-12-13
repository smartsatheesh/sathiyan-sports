/**
 * Test the new due date calculation logic
 * Due date should be first day of next month regardless of payment date
 */

function testDueDateCalculation() {
  console.log('=== TESTING NEW DUE DATE CALCULATION ===\n');
  
  // Test different payment dates in November 2025
  const testCases = [
    { paymentDate: new Date('2025-11-01'), description: 'Payment on 1st of month' },
    { paymentDate: new Date('2025-11-15'), description: 'Payment on 15th of month' },
    { paymentDate: new Date('2025-11-30'), description: 'Payment on last day of month' },
    { paymentDate: new Date('2025-12-25'), description: 'Payment on Christmas' },
  ];
  
  testCases.forEach(({ paymentDate, description }) => {
    // Calculate next due date as first day of next month
    const nextDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
    
    console.log(`📅 ${description}:`);
    console.log(`   Payment Date: ${paymentDate.toDateString()}`);
    console.log(`   Next Due Date: ${nextDueDate.toDateString()}`);
    console.log('');
  });
  
  // Test edge cases
  console.log('=== EDGE CASES ===\n');
  
  // December payment -> January due date
  const decPayment = new Date('2025-12-15');
  const janDueDate = new Date(decPayment.getFullYear(), decPayment.getMonth() + 1, 1);
  console.log(`🗓️ December payment -> January due date:`);
  console.log(`   Payment: ${decPayment.toDateString()}`);
  console.log(`   Due Date: ${janDueDate.toDateString()}`);
  console.log('');
  
  // End of year payment -> Next year due date
  const endYearPayment = new Date('2025-12-31');
  const nextYearDue = new Date(endYearPayment.getFullYear(), endYearPayment.getMonth() + 1, 1);
  console.log(`🎊 End of year payment -> Next year due date:`);
  console.log(`   Payment: ${endYearPayment.toDateString()}`);
  console.log(`   Due Date: ${nextYearDue.toDateString()}`);
}

// Run the test
testDueDateCalculation();