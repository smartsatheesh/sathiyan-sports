// Sample tournament data setup script
// This creates a badminton doubles tournament with the 35 players you specified

const sampleTournamentData = {
  tournament: {
    name: "Sathiyan Sports Badminton Doubles Championship",
    sport: "badminton",
    type: "doubles", 
    description: "Annual badminton doubles tournament featuring top players from the region. Real-time scoring and live updates throughout the competition.",
    registrationFee: 1000,
    prizePool: 50000,
    maxParticipants: 70, // 35 pairs = 70 individual participants
    registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // Tournament duration: 3 days
    venue: "Sathiyan Sports Complex, Main Court",
    category: "Open",
    status: "upcoming"
  },
  
  players: [
    // Your 35 badminton players organized into doubles pairs
    { name: "Satheesh Kumar", partner: "Arjun Patel", category: "Open" },
    { name: "Arjun Patel", partner: "Satheesh Kumar", category: "Open" },
    
    { name: "Rahul Sharma", partner: "Vikash Singh", category: "Open" },
    { name: "Vikash Singh", partner: "Rahul Sharma", category: "Open" },
    
    { name: "Amit Joshi", partner: "Rohan Gupta", category: "Open" },
    { name: "Rohan Gupta", partner: "Amit Joshi", category: "Open" },
    
    { name: "Deepak Verma", partner: "Sunil Yadav", category: "Open" },
    { name: "Sunil Yadav", partner: "Deepak Verma", category: "Open" },
    
    { name: "Karan Mehta", partner: "Neeraj Kumar", category: "Open" },
    { name: "Neeraj Kumar", partner: "Karan Mehta", category: "Open" },
    
    { name: "Ashish Tiwari", partner: "Manish Agarwal", category: "Open" },
    { name: "Manish Agarwal", partner: "Ashish Tiwari", category: "Open" },
    
    { name: "Pradeep Singh", partner: "Rajesh Choudhary", category: "Open" },
    { name: "Rajesh Choudhary", partner: "Pradeep Singh", category: "Open" },
    
    { name: "Sanjay Mishra", partner: "Dinesh Pandey", category: "Open" },
    { name: "Dinesh Pandey", partner: "Sanjay Mishra", category: "Open" },
    
    { name: "Ankit Sharma", partner: "Gaurav Tripathi", category: "Open" },
    { name: "Gaurav Tripathi", partner: "Ankit Sharma", category: "Open" },
    
    { name: "Mohit Agarwal", partner: "Ravi Shankar", category: "Open" },
    { name: "Ravi Shankar", partner: "Mohit Agarwal", category: "Open" },
    
    { name: "Sachin Pal", partner: "Ajay Singh", category: "Open" },
    { name: "Ajay Singh", partner: "Sachin Pal", category: "Open" },
    
    { name: "Vishal Kumar", partner: "Nitin Jain", category: "Open" },
    { name: "Nitin Jain", partner: "Vishal Kumar", category: "Open" },
    
    { name: "Akash Goel", partner: "Puneet Bansal", category: "Open" },
    { name: "Puneet Bansal", partner: "Akash Goel", category: "Open" },
    
    { name: "Naveen Chandra", partner: "Manoj Singh", category: "Open" },
    { name: "Manoj Singh", partner: "Naveen Chandra", category: "Open" },
    
    { name: "Shubham Jain", partner: "Abhishek Rawat", category: "Open" },
    { name: "Abhishek Rawat", partner: "Shubham Jain", category: "Open" },
    
    { name: "Harsh Vardhan", partner: "Tarun Kaushik", category: "Open" },
    { name: "Tarun Kaushik", partner: "Harsh Vardhan", category: "Open" },
    
    { name: "Sumit Chauhan", partner: "Yogesh Kumar", category: "Open" },
    { name: "Yogesh Kumar", partner: "Sumit Chauhan", category: "Open" },
    
    // One player without a partner (will need to be assigned)
    { name: "Aditya Raj", partner: "", category: "Open" }
  ],
  
  sampleMatches: [
    {
      round: "Round of 16",
      matchNumber: 1,
      player1Name: "Satheesh Kumar",
      player1Partner: "Arjun Patel",
      player2Name: "Rahul Sharma", 
      player2Partner: "Vikash Singh",
      courtNumber: "Court 1",
      status: "scheduled"
    },
    {
      round: "Round of 16",
      matchNumber: 2,
      player1Name: "Amit Joshi",
      player1Partner: "Rohan Gupta",
      player2Name: "Deepak Verma",
      player2Partner: "Sunil Yadav", 
      courtNumber: "Court 2",
      status: "scheduled"
    },
    {
      round: "Quarter Final",
      matchNumber: 3,
      player1Name: "Karan Mehta",
      player1Partner: "Neeraj Kumar",
      player2Name: "Ashish Tiwari",
      player2Partner: "Manish Agarwal",
      courtNumber: "Court 1", 
      status: "live",
      liveScore: {
        currentSet: 1,
        player1CurrentScore: 15,
        player2CurrentScore: 12,
        server: "player1"
      }
    }
  ]
};

export default sampleTournamentData;