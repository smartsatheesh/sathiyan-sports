'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Stop,
  CheckCircle,
  Schedule,
  EmojiEvents,
  People,
  SportsTennis,
  SportsFootball,
  Refresh
} from '@mui/icons-material';

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  type: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  registrationFee: number;
  prizePool: number;
  maxParticipants: number;
  registrationDeadline: string;
  startDate: string;
  endDate?: string;
  venue: string;
  category: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface Match {
  _id: string;
  tournamentId: string;
  round: string;
  matchNumber: number;
  player1Name: string;
  player2Name?: string;
  player1Partner?: string;
  player2Partner?: string;
  courtNumber?: string;
  scheduledTime?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score: {
    player1Sets: number;
    player2Sets: number;
    sets: Array<{
      set: number;
      player1Score: number;
      player2Score: number;
    }>;
  };
  winner?: string;
  winnerName?: string;
  duration?: number;
  liveScore?: {
    currentSet: number;
    player1CurrentScore: number;
    player2CurrentScore: number;
    server: 'player1' | 'player2';
  };
}

export default function AdminTournamentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');

  // Dialog states
  const [tournamentDialog, setTournamentDialog] = useState(false);
  const [matchDialog, setMatchDialog] = useState(false);
  const [scoreDialog, setScoreDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Form states
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    sport: 'badminton',
    type: 'doubles',
    description: '',
    registrationFee: 0,
    prizePool: 0,
    maxParticipants: 32,
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    venue: '',
    category: 'Open'
  });

  const [matchForm, setMatchForm] = useState({
    round: '',
    matchNumber: 1,
    player1Name: '',
    player2Name: '',
    player1Partner: '',
    player2Partner: '',
    courtNumber: '',
    scheduledTime: ''
  });

  const [scoreForm, setScoreForm] = useState({
    status: 'scheduled' as 'scheduled' | 'live' | 'completed' | 'cancelled',
    player1Sets: 0,
    player2Sets: 0,
    sets: [] as Array<{set: number, player1Score: number, player2Score: number}>,
    winnerName: '',
    duration: 0,
    liveScore: {
      currentSet: 1,
      player1CurrentScore: 0,
      player2CurrentScore: 0,
      server: 'player1' as 'player1' | 'player2'
    }
  });

  // Check admin access
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user is admin (you'll need to implement this check)
    fetchTournaments();
  }, [session]);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments');
      const result = await response.json();
      
      if (result.success) {
        setTournaments(result.data);
        if (result.data.length > 0 && !selectedTournament) {
          setSelectedTournament(result.data[0]._id);
        }
      } else {
        setError(result.error || 'Failed to fetch tournaments');
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (tournamentId: string) => {
    if (!tournamentId) return;
    
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`);
      const result = await response.json();
      
      if (result.success) {
        setMatches(result.data.matches);
      } else {
        setError(result.error || 'Failed to fetch matches');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches');
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      fetchMatches(selectedTournament);
    }
  }, [selectedTournament]);

  const handleCreateTournament = async () => {
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentForm),
      });

      const result = await response.json();

      if (result.success) {
        setTournamentDialog(false);
        fetchTournaments();
        resetTournamentForm();
        alert('Tournament created successfully!');
      } else {
        alert(result.error || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament');
    }
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;

    try {
      const response = await fetch(`/api/tournaments/${editingTournament._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentForm),
      });

      const result = await response.json();

      if (result.success) {
        setTournamentDialog(false);
        fetchTournaments();
        resetTournamentForm();
        setEditingTournament(null);
        alert('Tournament updated successfully!');
      } else {
        alert(result.error || 'Failed to update tournament');
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      alert('Failed to update tournament');
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all associated matches and registrations.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchTournaments();
        if (selectedTournament === id) {
          setSelectedTournament('');
          setMatches([]);
        }
        alert('Tournament deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete tournament');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament');
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedTournament) return;

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...matchForm,
          player1Id: 'dummy-id', // You'll need proper player IDs
          player2Id: 'dummy-id'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMatchDialog(false);
        fetchMatches(selectedTournament);
        resetMatchForm();
        alert('Match created successfully!');
      } else {
        alert(result.error || 'Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match');
    }
  };

  const handleUpdateMatchScore = async () => {
    if (!editingMatch) return;

    try {
      const response = await fetch(`/api/tournaments/${editingMatch.tournamentId}/matches/${editingMatch._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: scoreForm.status,
          score: {
            player1Sets: scoreForm.player1Sets,
            player2Sets: scoreForm.player2Sets,
            sets: scoreForm.sets
          },
          winnerName: scoreForm.winnerName,
          duration: scoreForm.duration,
          liveScore: scoreForm.status === 'live' ? scoreForm.liveScore : undefined
        }),
      });

      const result = await response.json();

      if (result.success) {
        setScoreDialog(false);
        fetchMatches(selectedTournament);
        setEditingMatch(null);
        alert('Match updated successfully!');
      } else {
        alert(result.error || 'Failed to update match');
      }
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Failed to update match');
    }
  };

  const resetTournamentForm = () => {
    setTournamentForm({
      name: '',
      sport: 'badminton',
      type: 'doubles',
      description: '',
      registrationFee: 0,
      prizePool: 0,
      maxParticipants: 32,
      registrationDeadline: '',
      startDate: '',
      endDate: '',
      venue: '',
      category: 'Open'
    });
  };

  const resetMatchForm = () => {
    setMatchForm({
      round: '',
      matchNumber: 1,
      player1Name: '',
      player2Name: '',
      player1Partner: '',
      player2Partner: '',
      courtNumber: '',
      scheduledTime: ''
    });
  };

  const openEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setTournamentForm({
      name: tournament.name,
      sport: tournament.sport,
      type: tournament.type,
      description: tournament.description || '',
      registrationFee: tournament.registrationFee,
      prizePool: tournament.prizePool,
      maxParticipants: tournament.maxParticipants,
      registrationDeadline: tournament.registrationDeadline ? new Date(tournament.registrationDeadline).toISOString().slice(0, 16) : '',
      startDate: new Date(tournament.startDate).toISOString().slice(0, 16),
      endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : '',
      venue: tournament.venue,
      category: tournament.category
    });
    setTournamentDialog(true);
  };

  const openEditScore = (match: Match) => {
    setEditingMatch(match);
    setScoreForm({
      status: match.status,
      player1Sets: match.score.player1Sets,
      player2Sets: match.score.player2Sets,
      sets: match.score.sets,
      winnerName: match.winnerName || '',
      duration: match.duration || 0,
      liveScore: match.liveScore || {
        currentSet: 1,
        player1CurrentScore: 0,
        player2CurrentScore: 0,
        server: 'player1'
      }
    });
    setScoreDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'error';
      case 'completed':
        return 'success';
      case 'ongoing':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Tournament Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetTournamentForm();
            setEditingTournament(null);
            setTournamentDialog(true);
          }}
        >
          Create Tournament
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchTournaments}
        >
          Refresh
        </Button>
      </Stack>

      {/* Tournament Selection */}
      {tournaments.length > 0 && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Tournament</InputLabel>
          <Select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            label="Select Tournament"
          >
            {tournaments.map((tournament) => (
              <MenuItem key={tournament._id} value={tournament._id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {tournament.sport === 'badminton' ? <SportsTennis /> : <SportsFootball />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">{tournament.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tournament.venue} • {new Date(tournament.startDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip 
                    label={tournament.status}
                    color={getStatusColor(tournament.status) as any}
                    size="small"
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Tournaments" />
          <Tab label="Matches" />
          <Tab label="Live Updates" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tournament</TableCell>
                <TableCell>Sport</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tournaments.map((tournament) => (
                <TableRow key={tournament._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {tournament.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tournament.category} • {tournament.maxParticipants} players
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tournament.sport === 'badminton' ? <SportsTennis fontSize="small" /> : <SportsFootball fontSize="small" />}
                      {tournament.sport}
                    </Box>
                  </TableCell>
                  <TableCell>{tournament.type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={tournament.status}
                      color={getStatusColor(tournament.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tournament.venue}</TableCell>
                  <TableCell>
                    {new Date(tournament.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => openEditTournament(tournament)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTournament(tournament._id)}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && selectedTournament && (
        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetMatchForm();
                setMatchDialog(true);
              }}
            >
              Create Match
            </Button>
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Match #</TableCell>
                  <TableCell>Round</TableCell>
                  <TableCell>Players</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Court</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match._id}>
                    <TableCell>#{match.matchNumber}</TableCell>
                    <TableCell>{match.round}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {match.player1Name}
                          {match.player1Partner && ` / ${match.player1Partner}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          vs
                        </Typography>
                        <Typography variant="body2">
                          {match.player2Name || 'TBD'}
                          {match.player2Partner && ` / ${match.player2Partner}`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {match.status === 'completed' && (
                        <Typography variant="body2">
                          {match.score.player1Sets} - {match.score.player2Sets}
                        </Typography>
                      )}
                      {match.status === 'live' && match.liveScore && (
                        <Typography variant="body2" color="error.main">
                          {match.liveScore.player1CurrentScore} - {match.liveScore.player2CurrentScore}
                          <Typography variant="caption" display="block">
                            Set {match.liveScore.currentSet}
                          </Typography>
                        </Typography>
                      )}
                      {(match.status === 'scheduled' || match.status === 'cancelled') && (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={match.status}
                        color={getStatusColor(match.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{match.courtNumber || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => openEditScore(match)}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {activeTab === 2 && (
        <Grid container spacing={2}>
          {matches.filter(m => m.status === 'live').map((match) => (
            <Grid item xs={12} md={6} key={match._id}>
              <Card sx={{ border: '2px solid #f44336' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Match #{match.matchNumber} - {match.round}
                    </Typography>
                    <Chip label="LIVE" color="error" />
                  </Box>
                  
                  <Typography variant="h5" gutterBottom>
                    {match.player1Name} vs {match.player2Name || 'TBD'}
                  </Typography>
                  
                  {match.liveScore && (
                    <Box sx={{ textAlign: 'center', p: 2, background: '#fff3e0', borderRadius: 1 }}>
                      <Typography variant="h4" color="error.main">
                        {match.liveScore.player1CurrentScore} - {match.liveScore.player2CurrentScore}
                      </Typography>
                      <Typography variant="body2">
                        Set {match.liveScore.currentSet}
                      </Typography>
                    </Box>
                  )}
                  
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => openEditScore(match)}
                  >
                    Update Score
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {matches.filter(m => m.status === 'live').length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">No live matches at the moment</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Tournament Dialog */}
      <Dialog open={tournamentDialog} onClose={() => setTournamentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tournament Name"
                value={tournamentForm.name}
                onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sport</InputLabel>
                <Select
                  value={tournamentForm.sport}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, sport: e.target.value })}
                  label="Sport"
                >
                  <MenuItem value="badminton">Badminton</MenuItem>
                  <MenuItem value="football">Football</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={tournamentForm.type}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="singles">Singles</MenuItem>
                  <MenuItem value="doubles">Doubles</MenuItem>
                  <MenuItem value="team">Team</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={tournamentForm.description}
                onChange={(e) => setTournamentForm({ ...tournamentForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Venue"
                value={tournamentForm.venue}
                onChange={(e) => setTournamentForm({ ...tournamentForm, venue: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Category"
                value={tournamentForm.category}
                onChange={(e) => setTournamentForm({ ...tournamentForm, category: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Registration Fee"
                type="number"
                value={tournamentForm.registrationFee}
                onChange={(e) => setTournamentForm({ ...tournamentForm, registrationFee: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Prize Pool"
                type="number"
                value={tournamentForm.prizePool}
                onChange={(e) => setTournamentForm({ ...tournamentForm, prizePool: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Participants"
                type="number"
                value={tournamentForm.maxParticipants}
                onChange={(e) => setTournamentForm({ ...tournamentForm, maxParticipants: parseInt(e.target.value) || 32 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="datetime-local"
                value={tournamentForm.startDate}
                onChange={(e) => setTournamentForm({ ...tournamentForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                type="datetime-local"
                value={tournamentForm.endDate}
                onChange={(e) => setTournamentForm({ ...tournamentForm, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Registration Deadline"
                type="datetime-local"
                value={tournamentForm.registrationDeadline}
                onChange={(e) => setTournamentForm({ ...tournamentForm, registrationDeadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTournamentDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingTournament ? handleUpdateTournament : handleCreateTournament}
          >
            {editingTournament ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={matchDialog} onClose={() => setMatchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Match</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Round"
                value={matchForm.round}
                onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                placeholder="e.g., Group Stage, Quarter Final"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Match Number"
                type="number"
                value={matchForm.matchNumber}
                onChange={(e) => setMatchForm({ ...matchForm, matchNumber: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player 1 Name"
                value={matchForm.player1Name}
                onChange={(e) => setMatchForm({ ...matchForm, player1Name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player 1 Partner"
                value={matchForm.player1Partner}
                onChange={(e) => setMatchForm({ ...matchForm, player1Partner: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player 2 Name"
                value={matchForm.player2Name}
                onChange={(e) => setMatchForm({ ...matchForm, player2Name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player 2 Partner"
                value={matchForm.player2Partner}
                onChange={(e) => setMatchForm({ ...matchForm, player2Partner: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Court Number"
                value={matchForm.courtNumber}
                onChange={(e) => setMatchForm({ ...matchForm, courtNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Scheduled Time"
                type="datetime-local"
                value={matchForm.scheduledTime}
                onChange={(e) => setMatchForm({ ...matchForm, scheduledTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMatch}>
            Create Match
          </Button>
        </DialogActions>
      </Dialog>

      {/* Score Dialog */}
      <Dialog open={scoreDialog} onClose={() => setScoreDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Update Match Score
          {editingMatch && (
            <Typography variant="subtitle2" color="text.secondary">
              {editingMatch.player1Name} vs {editingMatch.player2Name || 'TBD'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Match Status</InputLabel>
                <Select
                  value={scoreForm.status}
                  onChange={(e) => setScoreForm({ ...scoreForm, status: e.target.value as any })}
                  label="Match Status"
                >
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="live">Live</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {scoreForm.status === 'live' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Live Score</Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Player 1 Current Score"
                    type="number"
                    value={scoreForm.liveScore.player1CurrentScore}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      liveScore: {
                        ...scoreForm.liveScore,
                        player1CurrentScore: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Player 2 Current Score"
                    type="number"
                    value={scoreForm.liveScore.player2CurrentScore}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      liveScore: {
                        ...scoreForm.liveScore,
                        player2CurrentScore: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Current Set"
                    type="number"
                    value={scoreForm.liveScore.currentSet}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      liveScore: {
                        ...scoreForm.liveScore,
                        currentSet: parseInt(e.target.value) || 1
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Server</InputLabel>
                    <Select
                      value={scoreForm.liveScore.server}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        liveScore: {
                          ...scoreForm.liveScore,
                          server: e.target.value as 'player1' | 'player2'
                        }
                      })}
                      label="Server"
                    >
                      <MenuItem value="player1">Player 1</MenuItem>
                      <MenuItem value="player2">Player 2</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {(scoreForm.status === 'completed' || scoreForm.status === 'live') && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Final Score</Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Player 1 Sets"
                    type="number"
                    value={scoreForm.player1Sets}
                    onChange={(e) => setScoreForm({ ...scoreForm, player1Sets: parseInt(e.target.value) || 0 })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Player 2 Sets"
                    type="number"
                    value={scoreForm.player2Sets}
                    onChange={(e) => setScoreForm({ ...scoreForm, player2Sets: parseInt(e.target.value) || 0 })}
                  />
                </Grid>
              </>
            )}

            {scoreForm.status === 'completed' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Winner Name"
                    value={scoreForm.winnerName}
                    onChange={(e) => setScoreForm({ ...scoreForm, winnerName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Match Duration (minutes)"
                    type="number"
                    value={scoreForm.duration}
                    onChange={(e) => setScoreForm({ ...scoreForm, duration: parseInt(e.target.value) || 0 })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScoreDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateMatchScore}>
            Update Score
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}