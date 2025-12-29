'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Button,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Badge,
  IconButton,
  Tooltip,
  Fade,
  Slide,
  useTheme,
  Skeleton
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
  Cancel,
  Refresh,
  LiveTv,
  Visibility,
  Share,
  FilterList,
  Search,
  TrendingUp,
  Timer,
  Update,
  Bookmark,
  BookmarkBorder,
  Notifications,
  NotificationsActive,
  Groups,
  EmojiEventsOutlined,
  AccessTime
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { format, formatDistanceToNow, isValid } from 'date-fns';

// Enhanced Avatar generation utility
const generateCartoonAvatar = (name: string, category: string = 'default') => {
  if (!name) return { initials: 'TBD', backgroundColor: '#gray' };
  
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = {
    singles: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
    doubles: ['#6C5CE7', '#FD79A8', '#FDCB6E', '#E17055', '#00B894'],
    team: ['#0984E3', '#E84393', '#00CEC9', '#6C5CE7', '#FD79A8'],
    mixed: ['#A29BFE', '#FF7675', '#74B9FF', '#00CEC9', '#FDCB6E'],
    default: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
  };
  
  const colorSet = colors[category as keyof typeof colors] || colors.default;
  const colorIndex = name.length % colorSet.length;
  const backgroundColor = colorSet[colorIndex];
  
  return { initials, backgroundColor };
};

// Enhanced Player Avatar Component
const PlayerAvatar: React.FC<{
  name: string;
  category?: string;
  size?: number;
  showBorder?: boolean;
  isWinner?: boolean;
  animate?: boolean;
}> = ({ name, category = 'default', size = 40, showBorder = true, isWinner = false, animate = true }) => {
  const avatar = generateCartoonAvatar(name, category);
  
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        isWinner ? (
          <Avatar
            sx={{
              width: size / 3,
              height: size / 3,
              backgroundColor: '#FFD700',
              fontSize: size / 6,
              animation: animate ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            🏆
          </Avatar>
        ) : null
      }
    >
      <Avatar
        sx={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${avatar.backgroundColor} 0%, ${avatar.backgroundColor}dd 100%)`,
          border: showBorder ? '3px solid #fff' : 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          fontWeight: 'bold',
          fontSize: size / 2.5,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 6px 25px rgba(0,0,0,0.25)',
            filter: 'brightness(1.1)'
          }
        }}
      >
        {avatar.initials}
      </Avatar>
    </Badge>
  );
};

// Live Score Indicator
const LiveIndicator = ({ isLive }: { isLive: boolean }) => {
  if (!isLive) return null;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#ff4444',
          animation: 'blink 1s infinite',
          '@keyframes blink': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 }
          }
        }}
      />
      <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
        LIVE
      </Typography>
    </Box>
  );
};

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

interface Player {
  _id: string;
  name: string;
  partner?: string;
  category: string;
  registrationFee: number;
  paymentStatus: string;
  registeredAt: string;
  phone?: string;
  userId?: {
    name: string;
    email: string;
    phone?: string;
  };
}

interface Match {
  _id: string;
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
  category?: string;
  winnerName?: string;
  duration?: number;
  liveScore?: {
    currentSet: number;
    player1CurrentScore: number;
    player2CurrentScore: number;
    server: 'player1' | 'player2';
  };
}

interface TournamentData {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  stats: {
    totalPlayers: number;
    registrationProgress: number;
    completedMatches: number;
    liveMatches: number;
    upcomingMatches: number;
  };
}

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'badminton':
        return <SportsTennis sx={{ color: '#1976d2' }} />;
      case 'football':
        return <SportsFootball sx={{ color: '#1976d2' }} />;
      default:
        return <SportsTennis sx={{ color: '#1976d2' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'error';
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'primary';
      case 'cancelled':
        return 'default';
      case 'ongoing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <PlayArrow fontSize="small" />;
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'cancelled':
        return <Cancel fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  const fetchTournamentData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`/api/tournaments-native/${params.id}?_t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tournament data');
      }

      const result = await response.json();
      
      if (result.success) {
        // Native API returns tournament, players, matches directly
        const newData = {
          tournament: result.tournament,
          players: result.players,
          matches: result.matches,
          stats: {
            totalPlayers: result.players.length,
            registrationProgress: (result.players.length / (result.tournament.maxPlayers || 40)) * 100,
            completedMatches: result.matches.filter((m: any) => m.status === 'completed').length,
            liveMatches: result.matches.filter((m: any) => m.status === 'live').length,
            upcomingMatches: result.matches.filter((m: any) => m.status === 'scheduled').length,
          }
        };
        
        setData(newData);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch tournament data');
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const handleRegister = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${params.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: data?.tournament.category || 'Open'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data to show new registration
        fetchTournamentData();
        alert('Registration successful!');
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [params.id]);

  // Auto refresh for live updates - Enhanced for admin sync
  useEffect(() => {
    if (!autoRefresh || !data) return;

    const interval = setInterval(() => {
      fetchTournamentData(false); // Don't show loading on auto-refresh
    }, 10000); // Refresh every 10 seconds for better admin sync

    return () => clearInterval(interval);
  }, [autoRefresh, data]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Tournament not found'}</Alert>
      </Container>
    );
  }

  const { tournament, players, matches, stats } = data;

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Tournament Header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            {getSportIcon(tournament.sport)}
            <Typography variant="h4" fontWeight="bold">
              {tournament.name}
            </Typography>
            <Chip 
              label={tournament.status.toUpperCase()}
              color={getStatusColor(tournament.status) as any}
              icon={getStatusIcon(tournament.status)}
              variant="filled"
              sx={{ 
                fontWeight: 'bold',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <LocationOn fontSize="small" />
                <Typography variant="body1">{tournament.venue}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Schedule fontSize="small" />
                <Typography variant="body1">
                  {new Date(tournament.startDate).toLocaleDateString()}
                  {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString()}`}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <People fontSize="small" />
                <Typography variant="body1">
                  {stats.totalPlayers}/{tournament.maxParticipants} Players
                </Typography>
              </Stack>
              {tournament.prizePool > 0 && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EmojiEvents fontSize="small" />
                  <Typography variant="body1">
                    Prize Pool: ₹{tournament.prizePool.toLocaleString()}
                  </Typography>
                </Stack>
              )}
            </Grid>
          </Grid>

          {tournament.description && (
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {tournament.description}
            </Typography>
          )}
        </Box>

        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        {tournament.status === 'upcoming' && session && (
          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={stats.totalPlayers >= tournament.maxParticipants}
            sx={{ minWidth: 120 }}
          >
            {stats.totalPlayers >= tournament.maxParticipants ? 'Tournament Full' : 'Register'}
          </Button>
        )}
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<EmojiEvents />}
          onClick={() => router.push(`/tournaments/${params.id}/results`)}
          sx={{ minWidth: 120 }}
        >
          View Results
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => fetchTournamentData()}
        >
          Refresh
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            Auto-refresh: 
          </Typography>
          <Button
            size="small"
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{ minWidth: 60 }}
          >
            {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.totalPlayers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registered Players
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.completedMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {stats.liveMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live Matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats.upcomingMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming Matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Registration Progress */}
      {tournament.status === 'upcoming' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Registration Progress
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats.registrationProgress}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {stats.totalPlayers} of {tournament.maxParticipants} spots filled 
              ({Math.round(stats.registrationProgress)}%)
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Live Matches" />
          <Tab label="All Matches" />
          <Tab label="Players" />
          <Tab label="Results" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Live & Upcoming Matches
          </Typography>
          {matches.filter(m => m.status === 'live' || m.status === 'scheduled').length === 0 ? (
            <Alert severity="info">No live or scheduled matches at the moment</Alert>
          ) : (
            <Grid container spacing={2}>
              {matches
                .filter(m => m.status === 'live' || m.status === 'scheduled')
                .map((match) => (
                  <Grid item xs={12} md={6} key={match._id}>
                    <Card 
                      sx={{ 
                        border: match.status === 'live' ? '2px solid #f44336' : '1px solid #e0e0e0',
                        background: match.status === 'live' ? 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' : 'white'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {match.round} - Match #{match.matchNumber}
                          </Typography>
                          <Chip 
                            label={match.status.toUpperCase()}
                            color={getStatusColor(match.status) as any}
                            size="small"
                            icon={getStatusIcon(match.status)}
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {match.player1Name}
                            {match.player1Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player1Partner}
                              </Typography>
                            )}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                            VS
                          </Typography>
                          
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {match.player2Name || 'TBD'}
                            {match.player2Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player2Partner}
                              </Typography>
                            )}
                          </Typography>
                        </Box>

                        {match.status === 'live' && match.liveScore && (
                          <Box sx={{ p: 2, background: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                            <Typography variant="subtitle2" color="error.main" gutterBottom>
                              LIVE SCORE
                            </Typography>
                            <Typography variant="h5">
                              {match.liveScore.player1CurrentScore} - {match.liveScore.player2CurrentScore}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Set {match.liveScore.currentSet}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {match.courtNumber && (
                            <Typography variant="body2" color="text.secondary">
                              Court {match.courtNumber}
                            </Typography>
                          )}
                          {match.scheduledTime && (
                            <Typography variant="body2" color="text.secondary">
                              {new Date(match.scheduledTime).toLocaleTimeString()}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Matches by Category
          </Typography>
          
          {/* Group matches by category */}
          {Array.from(new Set(matches.map(m => m.category || 'General'))).sort().map(category => {
            const categoryMatches = matches.filter(m => (m.category || 'General') === category);
            
            if (categoryMatches.length === 0) return null;
            
            return (
              <Paper key={category} sx={{ mb: 3 }}>
                <Box sx={{ p: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents />
                    Category {category} 
                    <Chip 
                      label={`${categoryMatches.length} matches`} 
                      size="small" 
                      sx={{ ml: 1, backgroundColor: 'white', color: '#1976d2' }}
                    />
                  </Typography>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Match</TableCell>
                        <TableCell>Round</TableCell>
                        <TableCell>Players</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Court</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryMatches.map((match) => (
                        <TableRow key={match._id}>
                          <TableCell>#{match.matchNumber}</TableCell>
                          <TableCell>{match.round}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {match.player1Name}
                                {match.player1Partner && ` / ${match.player1Partner}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
                                vs
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {match.player2Name || 'TBD'}
                                {match.player2Partner && ` / ${match.player2Partner}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {match.status === 'completed' && (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {match.score.player1Sets} - {match.score.player2Sets}
                                </Typography>
                                {match.winnerName && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    Winner: {match.winnerName}
                                  </Typography>
                                )}
                                {match.score.sets.length > 0 && (
                                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                    {match.score.sets.map((set, index) => (
                                      <Chip
                                        key={index}
                                        label={`${set.player1Score}-${set.player2Score}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem', height: '20px' }}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            )}
                            {match.status === 'live' && match.liveScore && (
                              <Box>
                                <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                                  {match.liveScore.player1CurrentScore} - {match.liveScore.player2CurrentScore}
                                </Typography>
                                <Typography variant="caption" color="error.main" display="block">
                                  Set {match.liveScore.currentSet} (LIVE)
                                </Typography>
                              </Box>
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
                          <TableCell>
                            {match.courtNumber || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            );
          })}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Registered Players by Category
          </Typography>
          
          {/* Group players by category */}
          {Array.from(new Set(players.map(p => p.category || 'General'))).sort().map(category => {
            const categoryPlayers = players.filter(p => (p.category || 'General') === category);
            
            if (categoryPlayers.length === 0) return null;
            
            return (
              <Paper key={category} sx={{ mb: 3 }}>
                <Box sx={{ p: 2, background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People />
                    Category {category} 
                    <Chip 
                      label={`${categoryPlayers.length} players`} 
                      size="small" 
                      sx={{ ml: 1, backgroundColor: 'white', color: '#4caf50' }}
                    />
                    {tournament.type === 'doubles' && (
                      <Chip 
                        label={`${Math.ceil(categoryPlayers.length / 2)} pairs`} 
                        size="small" 
                        sx={{ ml: 0.5, backgroundColor: 'rgba(255,255,255,0.8)', color: '#4caf50' }}
                      />
                    )}
                  </Typography>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Player</TableCell>
                        {tournament.type === 'doubles' && <TableCell>Partner</TableCell>}
                        <TableCell>Contact</TableCell>
                        <TableCell>Registration Fee</TableCell>
                        <TableCell>Payment Status</TableCell>
                        <TableCell>Registered</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryPlayers.map((player) => (
                        <TableRow key={player._id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: category === 'A' ? '#1976d2' : category === 'B' ? '#9c27b0' : '#ff9800' }}>
                                {player.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {player.name}
                                </Typography>
                                {player.userId?.email && (
                                  <Typography variant="caption" color="text.secondary">
                                    {player.userId.email}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          {tournament.type === 'doubles' && (
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                                {player.partner || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="body2">
                              {player.phone || player.userId?.phone || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>₹{player.registrationFee}</TableCell>
                          <TableCell>
                            <Chip 
                              label={player.paymentStatus}
                              color={player.paymentStatus === 'completed' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(player.registeredAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Category Summary */}
                <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary">Total Players</Typography>
                      <Typography variant="h6" color="primary.main">{categoryPlayers.length}</Typography>
                    </Grid>
                    {tournament.type === 'doubles' && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Pairs Formed</Typography>
                        <Typography variant="h6" color="success.main">{Math.floor(categoryPlayers.length / 2)}</Typography>
                      </Grid>
                    )}
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary">Paid Players</Typography>
                      <Typography variant="h6" color="success.main">
                        {categoryPlayers.filter(p => p.paymentStatus === 'completed').length}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary">Pending Payment</Typography>
                      <Typography variant="h6" color="warning.main">
                        {categoryPlayers.filter(p => p.paymentStatus !== 'completed').length}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Tournament Results
          </Typography>
          {matches.filter(m => m.status === 'completed').length === 0 ? (
            <Alert severity="info">No completed matches yet</Alert>
          ) : (
            <Grid container spacing={2}>
              {matches
                .filter(m => m.status === 'completed')
                .map((match) => (
                  <Grid item xs={12} md={6} key={match._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {match.round} - Match #{match.matchNumber}
                          </Typography>
                          <Chip label="COMPLETED" color="success" size="small" />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {match.player1Name}
                            {match.player1Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player1Partner}
                              </Typography>
                            )}
                            <Typography variant="h6" sx={{ mx: 1 }}>
                              {match.score.player1Sets}
                            </Typography>
                          </Typography>
                          
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            {match.player2Name}
                            {match.player2Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player2Partner}
                              </Typography>
                            )}
                            <Typography variant="h6" sx={{ mx: 1 }}>
                              {match.score.player2Sets}
                            </Typography>
                          </Typography>
                        </Box>

                        {match.score.sets.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Set Scores:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {match.score.sets.map((set, index) => (
                                <Chip
                                  key={index}
                                  label={`${set.player1Score}-${set.player2Score}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {match.winnerName && (
                          <Alert severity="success" sx={{ py: 0 }}>
                            <strong>Winner:</strong> {match.winnerName}
                          </Alert>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          {match.courtNumber && (
                            <Typography variant="body2" color="text.secondary">
                              Court {match.courtNumber}
                            </Typography>
                          )}
                          {match.duration && (
                            <Typography variant="body2" color="text.secondary">
                              {match.duration} minutes
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          )}
        </Box>
      )}
    </Container>
  );
}