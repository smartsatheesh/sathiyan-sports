#!/bin/bash

echo "🚀 WhatsApp Cloud API Setup Assistant"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 STEP $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if server is running
check_server() {
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo "📱 Target Numbers:"
echo "   • Your business: 9787020525"
echo "   • Wife's number: 9566006597"
echo ""

# Check server
if check_server; then
    print_success "Server is running on http://localhost:3000"
else
    print_error "Server not running!"
    echo "💡 Start with: npm run dev"
    exit 1
fi

echo ""
print_step "1" "QUICK LINKS"
echo "🌐 Meta Developers: https://developers.facebook.com/"
echo "📖 Setup Guide: http://localhost:3000/whatsapp-setup-guide.html"
echo "🧪 Test API: http://localhost:3000/api/test-whatsapp-cloud"
echo ""

print_step "2" "SETUP CHECKLIST"
echo "□ Create Meta Developer Account"
echo "□ Create Business App"  
echo "□ Add WhatsApp Product"
echo "□ Generate Access Token"
echo "□ Get Phone Number ID"
echo "□ Add Test Recipients (9787020525, 9566006597)"
echo "□ Configure Environment Variables"
echo "□ Test Message Delivery"
echo ""

print_step "3" "ENVIRONMENT SETUP"
if [ -f ".env.local" ]; then
    if grep -q "WHATSAPP_ACCESS_TOKEN" .env.local; then
        print_success "Environment file exists with WhatsApp config"
    else
        print_warning "Environment file exists but missing WhatsApp config"
    fi
else
    print_warning "No .env.local file found"
    echo "💡 Create .env.local with:"
    echo "   WHATSAPP_ACCESS_TOKEN=your_token_here"
    echo "   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here"
fi

echo ""
print_step "4" "TESTING CURRENT SETUP"
echo "🔍 Checking WhatsApp Cloud API status..."

# Test API
response=$(curl -s http://localhost:3000/api/test-whatsapp-cloud 2>/dev/null)

if [[ $response == *"\"success\":true"* ]]; then
    print_success "WhatsApp Cloud API is configured and working!"
    echo "🎉 Ready to send messages!"
elif [[ $response == *"not configured"* ]]; then
    print_warning "WhatsApp Cloud API not configured yet"
    echo "📋 Follow the setup guide to configure credentials"
else
    print_error "API test failed - check configuration"
fi

echo ""
print_step "5" "NEXT ACTIONS"
echo "1. 🌐 Open setup guide: http://localhost:3000/whatsapp-setup-guide.html"
echo "2. 📱 Follow Meta Developer Console setup"
echo "3. 🔑 Add credentials to .env.local"
echo "4. 🧪 Test with your wife's number: 9566006597"
echo ""

print_step "6" "QUICK TEST COMMANDS"
echo "# Test API status:"
echo "curl http://localhost:3000/api/test-whatsapp-cloud"
echo ""
echo "# Send test message:"
echo "curl -X POST http://localhost:3000/api/test-whatsapp-cloud \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"mobile\": \"9566006597\"}'"
echo ""
echo "# Test OTP flow:"
echo "curl -X POST http://localhost:3000/api/auth/forgot-password-cloud \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"mobile\": \"9566006597\"}'"
echo ""

echo "🎯 GOAL: Wife receives OTP on WhatsApp via Cloud API!"
echo "📖 Open the setup guide for detailed instructions!"
echo ""
