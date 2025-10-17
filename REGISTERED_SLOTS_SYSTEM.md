# Registered Slots Blocking System

## Overview
This system allows monthly and yearly verified subscribers to register for specific time slots that will be blocked for regular bookings.

## Key Features

### 1. User Registration System
- Monthly/Yearly subscribers can register specific time slots
- Only verified users with confirmed payments are eligible
- Slots are registered per day of the week (e.g., "Monday 05:00-06:00")
- Each slot is tied to a specific court for Shuttle Badminton

### 2. Automatic Slot Blocking
- Registered slots are automatically blocked during regular booking
- Visual distinction in booking interface:
  - 🟢 Green: Available slots
  - 🔵 Blue: Selected slots
  - 🟠 Orange: Reserved (registered) slots (👑 icon)
  - 🔴 Red: Booked slots (🔒 icon)

### 3. Admin Management
- Admins can manage registered slots through the admin dashboard
- "👑 Slots" button appears for eligible users (Shuttle Badminton + Monthly/Yearly + Verified)
- Add/remove slots with day, time, and court selection

## Database Structure

### User Model Addition
```typescript
registeredSlots: [{
  timeSlot: String, // e.g., "05:00 - 06:00"
  dayOfWeek: String, // e.g., "monday", "tuesday", etc.
  court: String, // "S1", "S2", or "S3"
  registeredAt: Date
}]
```

## API Endpoints

### 1. Check Registered Slots
`GET /api/check-registered-slots?sport=Shuttle Badminton&date=2025-10-18&court=S1`
- Returns registered slots for specific date and court

### 2. Manage User Registered Slots
- `GET /api/admin/users/[userId]/registered-slots` - Fetch user's slots
- `POST /api/admin/users/[userId]/registered-slots` - Add new slot
- `DELETE /api/admin/users/[userId]/registered-slots?slotId=[id]` - Remove slot

### 3. Enhanced Booking API
`GET /api/bookings?sport=Shuttle Badminton&date=2025-10-18&court=S1`
- Now includes registered slots in blocked slots
- Prevents booking conflicts with registered users

## Usage Workflow

### For Regular Users:
1. Visit booking page
2. Select Shuttle Badminton and date
3. Choose court (S1, S2, or S3)
4. See available slots (registered slots appear as "Reserved" in orange)
5. Cannot select reserved slots

### For Admins:
1. Go to Admin Dashboard → Users tab
2. Find verified monthly/yearly Shuttle Badminton user
3. Click "👑 Slots" button
4. Add slots by selecting day, time, and court
5. Remove existing slots as needed

### For Registered Users:
- Registered users get priority access to their registered slots
- Their slots are blocked from regular booking
- They maintain exclusive access during their subscription period

## Subscription Eligibility
- **Subscription Type**: Must be "monthly" or "yearly"
- **Payment Status**: Must be "completed" or "confirmed"  
- **User Status**: Must be "verified"
- **Sport**: Must be "Shuttle Badminton"
- **Subscription Validity**: Must have active subscription (endDate >= current date)

## Visual Indicators
- **Available**: Green background, ✨ icon
- **Selected**: Blue background, ✓ icon
- **Reserved**: Orange background, 👑 icon (registered slots)
- **Booked**: Red background, 🔒 icon

## Error Handling
- API returns specific error for registered slot conflicts
- Clear messaging in booking interface
- Admin interface shows eligibility requirements
- Proper validation for slot addition/removal

## Benefits
1. **Revenue Security**: Guaranteed slots for premium subscribers
2. **User Retention**: Premium subscribers get exclusive benefits
3. **Fair System**: Clear visual distinction between slot types
4. **Admin Control**: Easy management through admin interface
5. **Conflict Prevention**: Automatic blocking prevents double bookings