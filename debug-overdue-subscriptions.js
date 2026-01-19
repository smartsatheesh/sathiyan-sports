#!/usr/bin/env node

// Debug script to check overdue subscription logic
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

async function debugOverdueSubscriptions() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
    return;
  }

  console.log('🔍 Debugging overdue subscription logic...');
  console.log('📅 Current date:', new Date().toISOString());
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const subscriptions = db.collection('subscriptions');
    
    // Get all subscriptions
    const allSubs = await subscriptions.find({}).sort({ createdAt: -1 }).toArray();
    console.log(`\n📊 Total subscriptions in database: ${allSubs.length}`);
    
    // Group by status
    const byStatus = {};
    const byPaymentStatus = {};
    
    allSubs.forEach(sub => {
      const status = sub.status || 'undefined';
      const paymentStatus = sub.paymentStatus || 'undefined';
      
      byStatus[status] = (byStatus[status] || 0) + 1;
      byPaymentStatus[paymentStatus] = (byPaymentStatus[paymentStatus] || 0) + 1;
    });
    
    console.log('\n📋 Subscriptions by status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n💰 Subscriptions by payment status:');
    Object.entries(byPaymentStatus).forEach(([paymentStatus, count]) => {
      console.log(`   ${paymentStatus}: ${count}`);
    });
    
    // Check overdue logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('\n🔍 Checking overdue logic...');
    console.log('📅 Today (normalized):', today.toISOString());
    
    const potentialOverdue = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    console.log(`\n⏰ Subscriptions with past due dates: ${potentialOverdue.length}`);
    
    if (potentialOverdue.length > 0) {
      console.log('\n📝 Sample past due subscriptions:');
      potentialOverdue.slice(0, 5).forEach((sub, index) => {
        const dueDate = new Date(sub.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysPast = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        
        console.log(`\n   ${index + 1}. ${sub.userName || 'Unknown'}`);
        console.log(`      Due Date: ${dueDate.toDateString()} (${daysPast} days ago)`);
        console.log(`      Status: ${sub.status || 'undefined'}`);
        console.log(`      Payment Status: ${sub.paymentStatus || 'undefined'}`);
        console.log(`      Subscription Type: ${sub.subscriptionType || 'undefined'}`);
        console.log(`      Amount: ₹${sub.amount || 0}`);
        
        // Apply new overdue logic
        const isPastDue = today > dueDate;
        const isActive = sub.status === 'active' || !sub.status;
        const hasNotPaidCurrentPeriod = sub.paymentStatus === 'Pending' || sub.paymentStatus === 'pending';
        const shouldBeOverdue = isPastDue && isActive && hasNotPaidCurrentPeriod;
        
        console.log(`      Should be overdue (new logic): ${shouldBeOverdue}`);
      });
    }
    
    // Apply new overdue logic to all
    const overdueByNewLogic = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const isPastDue = today > dueDate;
      const isActive = sub.status === 'active' || !sub.status;
      const hasNotPaidCurrentPeriod = sub.paymentStatus === 'Pending' || sub.paymentStatus === 'pending';
      
      return isPastDue && isActive && hasNotPaidCurrentPeriod;
    });
    
    console.log(`\n✨ Subscriptions that should be overdue (new logic): ${overdueByNewLogic.length}`);
    
    if (overdueByNewLogic.length > 0) {
      console.log('\n📋 Overdue subscriptions (new logic):');
      overdueByNewLogic.forEach((sub, index) => {
        const dueDate = new Date(sub.nextDueDate);
        const daysPast = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        console.log(`   ${index + 1}. ${sub.userName || 'Unknown'} - Due ${daysPast} days ago (₹${sub.amount || 0})`);
      });
    }
    
    // Check for January 2026 renewals needed
    const jan2026 = new Date(2026, 0, 1); // January 1, 2026
    const jan2026End = new Date(2026, 1, 1); // February 1, 2026
    
    const needingJan2026Renewal = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      return dueDate >= jan2026 && dueDate < jan2026End && 
             (sub.status === 'active' || !sub.status) &&
             (sub.paymentStatus === 'Pending' || sub.paymentStatus === 'pending');
    });
    
    console.log(`\n📅 Subscriptions needing January 2026 renewal: ${needingJan2026Renewal.length}`);
    
    if (needingJan2026Renewal.length > 0) {
      console.log('\n📋 January 2026 renewal needed:');
      needingJan2026Renewal.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.userName || 'Unknown'} - Due ${new Date(sub.nextDueDate).toDateString()} (₹${sub.amount || 0})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugOverdueSubscriptions().catch(console.error);