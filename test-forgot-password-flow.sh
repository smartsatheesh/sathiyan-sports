#!/bin/bash

# Test script for WhatsApp OTP-based forgot password flow
# Run this script to test the complete forgot password functionality

echo "🧪 Testing WhatsApp OTP Forgot Password Flow"
echo "============================================="

# Set the base URL
BASE_URL="http://localhost:3000"

# Test mobile number (should exist in your database)
MOBILE="9566006597"

echo "📱 Step 1: Testing forgot password OTP request"
echo "Mobile: $MOBILE"

# Step 1: Request OTP
response1=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\":\"$MOBILE\"}")

echo "Response: $response1"
echo ""

# Extract success status
success1=$(echo $response1 | grep -o '"success":true' || echo "failed")

if [[ $success1 == *"success\":true"* ]]; then
  echo "✅ Step 1 PASSED: OTP request successful"
  
  echo "📝 Please check the terminal output above for the OTP"
  echo "🤚 Enter the 6-digit OTP when you see it in the logs"
  
  # Wait for user input
  read -p "Enter the OTP: " OTP
  
  echo ""
  echo "🔐 Step 2: Testing OTP verification"
  
  # Step 2: Verify OTP
  response2=$(curl -s -X POST "$BASE_URL/api/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{\"mobile\":\"$MOBILE\",\"otp\":\"$OTP\"}")
  
  echo "Response: $response2"
  echo ""
  
  # Extract reset token
  reset_token=$(echo $response2 | grep -o '"resetToken":"[^"]*' | cut -d'"' -f4)
  success2=$(echo $response2 | grep -o '"success":true' || echo "failed")
  
  if [[ $success2 == *"success\":true"* ]] && [[ ! -z "$reset_token" ]]; then
    echo "✅ Step 2 PASSED: OTP verification successful"
    echo "Reset Token: $reset_token"
    
    echo ""
    echo "🔑 Step 3: Testing password reset"
    
    NEW_PASSWORD="newPassword123"
    
    # Step 3: Reset Password
    response3=$(curl -s -X POST "$BASE_URL/api/auth/reset-password-otp" \
      -H "Content-Type: application/json" \
      -d "{\"resetToken\":\"$reset_token\",\"mobile\":\"$MOBILE\",\"newPassword\":\"$NEW_PASSWORD\",\"confirmPassword\":\"$NEW_PASSWORD\"}")
    
    echo "Response: $response3"
    echo ""
    
    success3=$(echo $response3 | grep -o '"success":true' || echo "failed")
    
    if [[ $success3 == *"success\":true"* ]]; then
      echo "✅ Step 3 PASSED: Password reset successful"
      echo "🎉 COMPLETE FLOW SUCCESSFUL!"
      echo ""
      echo "📱 You can now login with:"
      echo "   Mobile: $MOBILE"
      echo "   Password: $NEW_PASSWORD"
    else
      echo "❌ Step 3 FAILED: Password reset failed"
    fi
  else
    echo "❌ Step 2 FAILED: OTP verification failed"
  fi
else
  echo "❌ Step 1 FAILED: OTP request failed"
  echo "💡 Make sure:"
  echo "   - Development server is running (npm run dev)"
  echo "   - User with mobile $MOBILE exists in database"
  echo "   - User has a password set (not just social login)"
fi

echo ""
echo "🔍 To test the UI flow, visit:"
echo "   $BASE_URL/auth/forgot-password"
