# Tournament Management System - Setup & Usage Guide

## Overview
The Sathiyan Sports Tournament Management System is a comprehensive real-time tournament platform inspired by BWF and FIFA websites. It supports badminton doubles, singles, and team tournaments with live scoring, player registration, and admin management.

## Features Implemented ✅

### 1. **Tournament Data Models**
- **Tournament.ts**: Main tournament entity with sport, type, status, venue, prize pool
- **Player.ts**: Participant management with partner support for doubles
- **Match.ts**: Match tracking with live scoring, sets, and real-time updates

### 2. **Complete API System**
- **CRUD Operations**: Create, read, update, delete tournaments
- **Player Registration**: User registration for tournaments with validation
- **Match Management**: Create matches, update scores, live scoring
- **Real-time Updates**: Live match scores and tournament progress
- **Admin Authentication**: Secured admin-only endpoints

### 3. **Public Tournament Interface**
- **Live Tournament Viewing**: Real-time match updates every 30 seconds
- **Registration System**: Direct tournament registration for authenticated users
- **Multiple Views**: Live matches, all matches, players, results tabs
- **BWF/FIFA Inspired Design**: Professional sports website aesthetics
- **Mobile Responsive**: Full mobile compatibility

### 4. **Admin Tournament Dashboard**
- **Tournament Creation**: Full tournament setup with all parameters
- **Match Management**: Create and schedule matches
- **Live Score Updates**: Real-time score input with set-by-set tracking
- **Tournament Monitoring**: Overview of all tournaments and live matches
- **Simple Admin Controls**: Easy-to-use interface for match updates

### 5. **Tournament Discovery Page**
- **Sport Filtering**: Dropdown to switch between badminton/football
- **Status Filtering**: Filter by upcoming/ongoing/completed
- **Registration Integration**: Direct registration from tournament cards
- **Statistics Dashboard**: Live counts and progress indicators

## File Structure

```
src/app/
├── models/
│   ├── Tournament.ts          # Tournament data model
│   ├── Player.ts              # Player/participant model  
│   └── Match.ts               # Match and scoring model
├── api/tournaments/
│   ├── route.ts               # List/create tournaments
│   ├── [id]/route.ts          # Get/update/delete tournament
│   ├── [id]/register/route.ts # Player registration
│   ├── [id]/matches/route.ts  # Match management
│   └── [id]/matches/[matchId]/route.ts # Individual match updates
├── tournaments/
│   ├── page.tsx               # Tournament listing page
│   └── [id]/page.tsx          # Individual tournament view
├── admin/tournaments/
│   └── page.tsx               # Admin dashboard
├── data/
│   └── sample-tournament.ts   # Sample data for your 35 badminton players
└── globals-tournament.css     # Professional styling
```

## Usage Instructions

### For Players/Public Users:

1. **Browse Tournaments**: Visit `/tournaments` to see all available tournaments
2. **Filter by Sport**: Use dropdown to filter badminton/football tournaments  
3. **View Details**: Click "View Details" to see live scores, fixtures, results
4. **Register**: Click "Register" for upcoming tournaments (requires login)
5. **Live Updates**: Tournament pages auto-refresh every 30 seconds for real-time data

### For Admins:

1. **Access Dashboard**: Navigate to `/admin/tournaments` (admin role required)
2. **Create Tournament**: Use "Create Tournament" button to set up new tournaments
3. **Manage Matches**: Create matches with player names and court assignments
4. **Update Scores**: Use live score interface to update match progress
5. **Monitor Live**: Track all live matches from the dashboard

## Sample Tournament Data

The system includes sample data for your 35 badminton players organized into doubles pairs:

```javascript
// Located in /src/app/data/sample-tournament.ts
- Satheesh Kumar / Arjun Patel
- Rahul Sharma / Vikash Singh  
- Amit Joshi / Rohan Gupta
// ... and 32 more players
```

## Real-time Features

- **Auto-refresh**: Tournament pages update every 30 seconds
- **Live Scoring**: Real-time score updates during matches
- **Status Tracking**: Live/scheduled/completed match indicators
- **Registration Progress**: Live participant count and capacity tracking

## API Endpoints

```
GET    /api/tournaments              # List all tournaments
POST   /api/tournaments              # Create tournament (admin)
GET    /api/tournaments/{id}         # Get tournament details  
PUT    /api/tournaments/{id}         # Update tournament (admin)
DELETE /api/tournaments/{id}         # Delete tournament (admin)
POST   /api/tournaments/{id}/register # Register for tournament
GET    /api/tournaments/{id}/matches  # Get tournament matches
POST   /api/tournaments/{id}/matches  # Create match (admin)
PUT    /api/tournaments/{id}/matches/{matchId} # Update match score (admin)
```

## Mobile Compatibility

- Responsive design for all screen sizes
- Touch-friendly interface for live score updates
- Mobile-optimized tournament cards and navigation
- Fast loading with optimized API calls

## Security Features

- Role-based access control (admin/user)
- Authentication required for registration
- Admin-only tournament and match management
- Input validation and sanitization

## Next Steps for Deployment

1. **Database Setup**: Ensure MongoDB connection is properly configured
2. **Admin User**: Create an admin user to access tournament management
3. **Sample Data**: Optionally load the sample tournament with your 35 players
4. **Testing**: Test tournament creation, registration, and live scoring
5. **Go Live**: Share tournament links with participants for registration

## Live Tournament Example

Once deployed, your badminton doubles tournament will feature:
- Real-time bracket updates
- Live match scoring with set-by-set details  
- Player registration with partner assignment
- Court scheduling and management
- Prize pool and fee tracking
- Professional BWF-inspired presentation

The system is now ready for your tournament with all 35 players and real-time functionality as requested!