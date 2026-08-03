'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Hooks must be called before any conditional returns
  const allMatches = data?.matches || [];
  const allPlayers = data?.players || [];

  const playerIdMap = useMemo(() => {
    const sorted = [...allPlayers].sort((a, b) =>
      new Date(a.registeredAt || 0).getTime() - new Date(b.registeredAt || 0).getTime()
    );
    const map: Record<string, string> = {};
    sorted.forEach((p, idx) => { map[p.name] = `I${idx + 1}`; });
    return map;
  }, [allPlayers]);

  const matchesByRound = useMemo(() => {
    const ROUND_ORDER = ['Group Stage', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
    const grouped = allMatches.reduce((acc: Record<string, Match[]>, m) => {
      if (!acc[m.round]) acc[m.round] = [];
      acc[m.round].push(m);
      return acc;
    }, {});
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => {
        const ai = ROUND_ORDER.indexOf(a), bi = ROUND_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      })
    );
  }, [allMatches]);

  const standings = useMemo(() => {
    const table: Record<string, { name: string; played: number; won: number; lost: number; setsWon: number; setsLost: number; points: number }> = {};
    const ensure = (name: string) => { if (!table[name]) table[name] = { name, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0 }; };
    allMatches.filter((m: Match) => m.status === 'completed').forEach((m: Match) => {
      const p1 = m.player1Name + (m.player1Partner ? ` / ${m.player1Partner}` : '');
      const p2 = m.player2Name ? m.player2Name + (m.player2Partner ? ` / ${m.player2Partner}` : '') : null;
      ensure(p1); if (p2) ensure(p2);
      table[p1].played++; if (p2) table[p2].played++;
      const p1Won = m.winnerName ? m.winnerName === m.player1Name : m.score.player1Sets > m.score.player2Sets;
      if (p1Won) { table[p1].won++; table[p1].points += 2; if (p2) table[p2].lost++; }
      else { if (p2) { table[p2].won++; table[p2].points += 2; } table[p1].lost++; }
      table[p1].setsWon += m.score.player1Sets; table[p1].setsLost += m.score.player2Sets;
      if (p2) { table[p2].setsWon += m.score.player2Sets; table[p2].setsLost += m.score.player1Sets; }
    });
    return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won);
  }, [allMatches]);

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
                  {new Date(tournament.startDate).toLocaleDateString('en-GB')}
                  {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString('en-GB')}`}
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
            sx={{ 
              minWidth: 120,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1976D2 90%)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {stats.totalPlayers >= tournament.maxParticipants ? 'Tournament Full' : 'Register Now 🏆'}
          </Button>
        )}
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => fetchTournamentData()}
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s ease'
          }}
        >
          Refresh
        </Button>

        <Button
          variant="outlined"
          startIcon={<Share />}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            // You could add a toast notification here
          }}
          sx={{
            borderColor: 'success.main',
            color: 'success.main',
            '&:hover': {
              backgroundColor: 'success.main',
              color: 'white',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s ease'
          }}
        >
          Share
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            Auto-refresh: 
          </Typography>
          <Button
            size="small"
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{ 
              minWidth: 60,
              ...(autoRefresh && {
                background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
                }
              })
            }}
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

      {/* Enhanced Tabs */}
      <Paper sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 'bold',
              fontSize: '1rem',
              minHeight: 60,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              }
            },
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: 2,
            }
          }}
        >
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <LiveTv color={activeTab === 0 ? 'primary' : 'inherit'} />
                <Typography>Live Matches</Typography>
                {matches.filter(m => m.status === 'live').length > 0 && (
                  <Chip 
                    label={matches.filter(m => m.status === 'live').length} 
                    size="small" 
                    color="error"
                    sx={{ animation: 'pulse 2s infinite' }}
                  />
                )}
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <SportsTennis color={activeTab === 1 ? 'primary' : 'inherit'} />
                <Typography>Fixtures</Typography>
                <Chip label={matches.length} size="small" color="primary" />
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <People color={activeTab === 2 ? 'primary' : 'inherit'} />
                <Typography>Players</Typography>
                <Chip label={stats.totalPlayers} size="small" color="success" />
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmojiEvents color={activeTab === 3 ? 'primary' : 'inherit'} />
                <Typography>Results</Typography>
                <Chip 
                  label={matches.filter(m => m.status === 'completed').length} 
                  size="small" 
                  color="warning"
                />
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmojiEvents color={activeTab === 4 ? 'primary' : 'inherit'} />
                <Typography>Standings</Typography>
                <Chip label={standings.length} size="small" color="secondary" />
              </Stack>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              ⚡ Live & Upcoming Matches
              {matches.filter(m => m.status === 'live').length > 0 && (
                <Chip 
                  label={`${matches.filter(m => m.status === 'live').length} LIVE`} 
                  color="error" 
                  size="small"
                  sx={{ 
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                      '100%': { opacity: 1 }
                    }
                  }}
                />
              )}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => fetchTournamentData()}
              size="small"
            >
              Refresh Live Status
            </Button>
          </Box>
          
          {matches.filter(m => m.status === 'live' || m.status === 'scheduled').length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
              <Schedule sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No live or scheduled matches at the moment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All matches have been completed or are yet to be scheduled
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {matches
                .filter(m => m.status === 'live' || m.status === 'scheduled')
                .map((match) => (
                  <Grid item xs={12} md={6} key={match._id}>
                    <Card 
                      sx={{ 
                        border: match.status === 'live' ? '3px solid #f44336' : '2px solid #2196f3',
                        background: match.status === 'live' 
                          ? 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)'
                          : 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                        boxShadow: match.status === 'live' ? '0 0 20px rgba(244, 67, 54, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: match.status === 'live' ? '0 0 30px rgba(244, 67, 54, 0.4)' : '0 8px 20px rgba(0,0,0,0.15)',
                        },
                        transition: 'all 0.3s ease'
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
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Fixtures</Typography>
          {Object.keys(matchesByRound).length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No fixtures published yet. Check back soon!</Typography>
            </Paper>
          ) : (
            Object.entries(matchesByRound).map(([round, roundMatches]) => (
              <Box key={round} sx={{ mb: 4 }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1, borderRadius: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>{round}</Typography>
                  <Chip size="small" label={`${roundMatches.filter(m => m.status === 'completed').length}/${roundMatches.length} played`} sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                </Box>
                <Grid container spacing={2}>
                  {roundMatches.map(match => {
                    const isLive = match.status === 'live';
                    const isDone = match.status === 'completed';
                    const id1 = playerIdMap[match.player1Name] || null;
                    const id2 = match.player2Name ? playerIdMap[match.player2Name] || null : null;
                    const p1display = id1 ? `${id1} (${match.player1Name || 'TBD'})` : (match.player1Name || 'TBD');
                    const p2display = id2 ? `${id2} (${match.player2Name})` : (match.player2Name || 'TBD');
                    const p1 = p1display + (match.player1Partner ? ` / ${match.player1Partner}` : '');
                    const p2 = p2display + (match.player2Partner ? ` / ${match.player2Partner}` : '');
                    const p1Wins = isDone && match.winnerName === match.player1Name;
                    const p2Wins = isDone && match.winnerName === match.player2Name;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={match._id}>
                        <Card sx={{ border: isLive ? '2px solid #f44336' : isDone ? '1px solid #4caf50' : '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                              <Typography variant="caption" color="text.secondary">#{match.matchNumber}{match.courtNumber ? ` · Court ${match.courtNumber}` : ''}</Typography>
                              <Chip size="small" label={isLive ? '🔴 LIVE' : match.status} color={isLive ? 'error' : isDone ? 'success' : 'default'} sx={isLive ? { fontWeight: 700 } : {}} />
                            </Stack>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={p1Wins ? 800 : 500} color={p1Wins ? 'success.main' : 'text.primary'}>
                                  {p1Wins && '🏆 '}{p1}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'center', minWidth: 48 }}>
                                {isDone && <Typography variant="h6" fontWeight={700}>{match.score.player1Sets}–{match.score.player2Sets}</Typography>}
                                {isLive && match.liveScore && <Typography variant="h6" fontWeight={700} color="error.main">{match.liveScore.player1CurrentScore}–{match.liveScore.player2CurrentScore}</Typography>}
                                {!isDone && !isLive && <Typography color="text.disabled" variant="body2">vs</Typography>}
                              </Box>
                              <Box sx={{ flex: 1, textAlign: 'right' }}>
                                <Typography variant="body2" fontWeight={p2Wins ? 800 : 500} color={p2Wins ? 'success.main' : 'text.primary'}>
                                  {p2}{p2Wins && ' 🏆'}
                                </Typography>
                              </Box>
                            </Box>
                            {isDone && match.score.sets?.length > 0 && (
                              <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                                {match.score.sets.map(s => <Chip key={s.set} size="small" variant="outlined" label={`${s.player1Score}–${s.player2Score}`} sx={{ fontSize: '0.7rem' }} />)}
                              </Stack>
                            )}
                            {isLive && match.liveScore && <Typography variant="caption" color="error.main" display="block" textAlign="center" sx={{ mt: 0.5 }}>Set {match.liveScore.currentSet} in progress</Typography>}
                            {match.scheduledTime && match.status === 'scheduled' && (
                              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 0.5 }}>
                                {new Date(match.scheduledTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))
          )}
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
                        <TableCell>Team ID</TableCell>
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
                            <Chip label={playerIdMap[player.name] || '—'} color="primary" size="small" sx={{ fontWeight: 800, minWidth: 36 }} />
                          </TableCell>
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
                            {new Date(player.registeredAt).toLocaleDateString('en-GB')}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🏆 Tournament Results
              <Chip 
                label={`${matches.filter(m => m.status === 'completed').length} completed`} 
                color="success" 
                size="small" 
              />
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmojiEvents />}
              onClick={() => router.push(`/tournaments/${params.id}/results`)}
              sx={{ 
                minWidth: 140,
                background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FF5252 30%, #FF6B6B 90%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 10px 2px rgba(255, 107, 107, .4)',
                },
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              View Full Results
            </Button>
          </Box>
          
          {matches.filter(m => m.status === 'completed').length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
              <EmojiEventsOutlined sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No completed matches yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Once matches are completed, results will appear here
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<Refresh />}
                onClick={() => fetchTournamentData()}
              >
                Check for Updates
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {matches
                .filter(m => m.status === 'completed')
                .slice(0, 6) // Show only first 6 matches, with link to view all
                .map((match) => (
                  <Grid item xs={12} md={6} key={match._id}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
                      border: '2px solid #4caf50',
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                      },
                      transition: 'all 0.3s ease'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                            {match.round} - Match #{match.matchNumber}
                          </Typography>
                          <Chip label="COMPLETED" color="success" size="small" icon={<CheckCircle />} />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                            {match.player1Name}
                            {match.player1Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player1Partner}
                              </Typography>
                            )}
                            {match.winnerName === match.player1Name && (
                              <Chip label="WINNER" color="success" size="small" />
                            )}
                            <Typography variant="h6" sx={{ mx: 1 }}>
                              {match.score.player1Sets}
                            </Typography>
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ my: 1, textAlign: 'center' }}>
                            VS
                          </Typography>
                          
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mt: 1 }}>
                            {match.player2Name}
                            {match.player2Partner && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                / {match.player2Partner}
                              </Typography>
                            )}
                            {match.winnerName === match.player2Name && (
                              <Chip label="WINNER" color="success" size="small" />
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
                                  color="primary"
                                />
                              ))}
                            </Box>
                          </Box>
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
              
              {matches.filter(m => m.status === 'completed').length > 6 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <Typography variant="h6" gutterBottom>
                      {matches.filter(m => m.status === 'completed').length - 6} more completed matches
                    </Typography>
                    <Button
                      variant="contained"
                      color="inherit"
                      startIcon={<EmojiEvents />}
                      onClick={() => router.push(`/tournaments/${params.id}/results`)}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      View All Results
                    </Button>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>🏆 Standings</Typography>
          {standings.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <EmojiEventsOutlined sx={{ fontSize: 60, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">Standings will appear once matches are completed.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Rank', 'Player / Pair', 'Played', 'Won', 'Lost', 'Sets', 'Points'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {standings.map((row, idx) => (
                    <TableRow key={row.name} sx={{ bgcolor: idx === 0 ? 'rgba(255,215,0,0.08)' : idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'inherit' }}>
                      <TableCell><Typography fontWeight={700}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {playerIdMap[row.name.split(' / ')[0]] && (
                            <Chip size="small" label={playerIdMap[row.name.split(' / ')[0]]} color="primary" sx={{ fontWeight: 800, minWidth: 36 }} />
                          )}
                          <Typography fontWeight={idx < 3 ? 700 : 400}>{row.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.played}</TableCell>
                      <TableCell><Typography fontWeight={700} color="success.main">{row.won}</Typography></TableCell>
                      <TableCell><Typography color="error.main">{row.lost}</Typography></TableCell>
                      <TableCell>{row.setsWon}–{row.setsLost}</TableCell>
                      <TableCell><Chip size="small" label={row.points} color={idx === 0 ? 'warning' : 'default'} sx={{ fontWeight: 800 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Container>
  );
}