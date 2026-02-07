'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import {
  SportsTennis,
  SportsFootball,
  EmojiEvents,
  Schedule,
  LocationOn,
  People,
  PlayArrow,
  CheckCircle,
  Visibility,
  PersonAdd,
  CalendarToday
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  type: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'live';
  registrationFee: number;
  prizePool?: number;
  maxParticipants?: number;
  maxPlayers?: number;
  registrationDeadline?: string;
  startDate: string;
  endDate?: string;
  venue: string;
  category?: string;
  categories?: string[];
  playersCount?: number;
  matchesCount?: number;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface TournamentStats {
  totalPlayers: number;
  registrationProgress: number;
  completedMatches: number;
  liveMatches: number;
  upcomingMatches: number;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState('');
  const [tournamentStats, setTournamentStats] = useState<{[key: string]: TournamentStats}>({});

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'badminton':
        return <SportsTennis sx={{ color: '#1976d2', fontSize: 40 }} />;
      case 'football':
        return <SportsFootball sx={{ color: '#1976d2', fontSize: 40 }} />;
      default:
        return <SportsTennis sx={{ color: '#1976d2', fontSize: 40 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'primary';
      case 'ongoing':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Schedule fontSize="small" />;
      case 'ongoing':
        return <PlayArrow fontSize="small" />;
      case 'completed':
        return <CheckCircle fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments-native');
      const result = await response.json();
      
      if (result.success) {
        setTournaments(result.tournaments); // Native API returns tournaments array
        setFilteredTournaments(result.tournaments);
        
        // Create basic stats from the tournament data (no need for additional API calls)
        const statsMap: Record<string, TournamentStats> = {};
        result.tournaments.forEach((tournament: Tournament) => {
          statsMap[tournament._id] = {
            totalPlayers: tournament.playersCount || 0,
            registrationProgress: ((tournament.playersCount || 0) / (tournament.maxPlayers || tournament.maxParticipants || 40)) * 100,
            completedMatches: 0, // Will be calculated when we have match status data
            liveMatches: 0,
            upcomingMatches: tournament.matchesCount || 0,
          };
        });
        setTournamentStats(statsMap);
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

  const fetchTournamentStats = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments-native/${tournamentId}`);
      const result = await response.json();
      
      if (result.success) {
        // Calculate stats from the native API response
        const stats = {
          totalPlayers: result.players.length,
          registrationProgress: (result.players.length / (result.tournament.maxPlayers || 40)) * 100,
          completedMatches: result.matches.filter((m: any) => m.status === 'completed').length,
          liveMatches: result.matches.filter((m: any) => m.status === 'live').length,
          upcomingMatches: result.matches.filter((m: any) => m.status === 'scheduled').length,
        };
        
        setTournamentStats(prev => ({
          ...prev,
          [tournamentId]: stats
        }));
      }
    } catch (error) {
      console.error('Error fetching tournament stats:', error);
    }
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    if (selectedSport !== 'all') {
      filtered = filtered.filter(tournament => tournament.sport === selectedSport);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tournament => tournament.status === selectedStatus);
    }

    setFilteredTournaments(filtered);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [selectedSport, selectedStatus, tournaments]);

  const handleViewTournament = (tournamentId: string) => {
    router.push(`/tournaments/${tournamentId}`);
  };

  const handleRegisterForTournament = async (tournamentId: string) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (result.success) {
        alert('Registration successful!');
        fetchTournamentStats(tournamentId);
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const getUniqueValues = (field: keyof Tournament) => {
    if (!tournaments || tournaments.length === 0) return [];
    return [...new Set(tournaments.map(tournament => tournament[field]))];
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const sports = getUniqueValues('sport');
  const statuses = getUniqueValues('status');

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Tournament Center
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Discover and participate in exciting sports tournaments
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filter Tournaments
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Sport</InputLabel>
              <Select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                label="Sport"
              >
                <MenuItem value="all">All Sports</MenuItem>
                {sports.map((sport, index) => (
                  <MenuItem key={`sport-${index}`} value={String(sport)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {String(sport) === 'badminton' ? <SportsTennis fontSize="small" /> : <SportsFootball fontSize="small" />}
                      {String(sport).charAt(0).toUpperCase() + String(sport).slice(1)}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {statuses.map((status, index) => (
                  <MenuItem key={`status-${index}`} value={String(status)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(String(status))}
                      {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {filteredTournaments.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Tournaments
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              {filteredTournaments.filter(t => t.status === 'ongoing').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Live Tournaments
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight="bold">
              {filteredTournaments.filter(t => t.status === 'upcoming').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upcoming
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              {filteredTournaments.filter(t => t.status === 'completed').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tournaments found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or check back later for new tournaments
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredTournaments.map((tournament) => {
            const stats = tournamentStats[tournament._id];
            const isRegistrationOpen = tournament.status === 'upcoming' && 
              new Date() < new Date(tournament.registrationDeadline);
            const isFull = stats && stats.totalPlayers >= tournament.maxParticipants;

            return (
              <Grid item xs={12} md={6} lg={4} key={tournament._id}>
                <Card 
                  elevation={3} 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  {/* Tournament Header */}
                  <Box sx={{ p: 2, background: `linear-gradient(135deg, ${tournament.status === 'ongoing' ? '#ff9800' : tournament.status === 'upcoming' ? '#2196f3' : '#4caf50'} 0%, ${tournament.status === 'ongoing' ? '#ffb74d' : tournament.status === 'upcoming' ? '#42a5f5' : '#66bb6a'} 100%)`, color: 'white' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSportIcon(tournament.sport)}
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {tournament.sport.toUpperCase()} • {tournament.type.toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={tournament.status.toUpperCase()}
                        size="small"
                        icon={getStatusIcon(tournament.status)}
                        sx={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {tournament.name}
                    </Typography>
                  </Box>

                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    {/* Tournament Info */}
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {tournament.venue}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {new Date(tournament.startDate).toLocaleDateString('en-GB')}
                            {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString('en-GB')}`}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <People fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Category: {tournament.category}
                          </Typography>
                        </Stack>
                      </Box>

                      {tournament.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2
                          }}
                        >
                          {tournament.description}
                        </Typography>
                      )}

                      {/* Tournament Stats */}
                      {stats && (
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Registration: {stats.totalPlayers}/{tournament.maxParticipants}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {Math.round(stats.registrationProgress)}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={stats.registrationProgress}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}

                      {/* Prize and Fee Info */}
                      <Box>
                        <Grid container spacing={2}>
                          {tournament.registrationFee > 0 && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Entry Fee
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                ₹{tournament.registrationFee}
                              </Typography>
                            </Grid>
                          )}
                          {tournament.prizePool > 0 && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Prize Pool
                              </Typography>
                              <Typography variant="body2" fontWeight="medium" color="success.main">
                                ₹{tournament.prizePool.toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      {/* Live Stats for Ongoing Tournaments */}
                      {tournament.status === 'ongoing' && stats && (
                        <Box sx={{ p: 2, background: '#fff3e0', borderRadius: 1 }}>
                          <Typography variant="caption" color="warning.main" fontWeight="bold" gutterBottom display="block">
                            LIVE TOURNAMENT
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Live
                              </Typography>
                              <Typography variant="h6" color="error.main" align="center" fontWeight="bold">
                                {stats.liveMatches}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Completed
                              </Typography>
                              <Typography variant="h6" color="success.main" align="center" fontWeight="bold">
                                {stats.completedMatches}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Upcoming
                              </Typography>
                              <Typography variant="h6" color="info.main" align="center" fontWeight="bold">
                                {stats.upcomingMatches}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleViewTournament(tournament._id)}
                      size="small"
                    >
                      View Details
                    </Button>

                    {tournament.status === 'upcoming' && isRegistrationOpen && !isFull && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => handleRegisterForTournament(tournament._id)}
                        size="small"
                        disabled={!session}
                      >
                        {!session ? 'Login to Register' : 'Register'}
                      </Button>
                    )}

                    {tournament.status === 'upcoming' && isFull && (
                      <Chip 
                        label="Full" 
                        color="error" 
                        size="small" 
                      />
                    )}

                    {tournament.status === 'upcoming' && !isRegistrationOpen && (
                      <Chip 
                        label="Registration Closed" 
                        color="default" 
                        size="small" 
                      />
                    )}

                    {tournament.status === 'ongoing' && (
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<PlayArrow />}
                        onClick={() => handleViewTournament(tournament._id)}
                        size="small"
                      >
                        Watch Live
                      </Button>
                    )}

                    {tournament.status === 'completed' && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<EmojiEvents />}
                        onClick={() => handleViewTournament(tournament._id)}
                        size="small"
                      >
                        View Results
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}