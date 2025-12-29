'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Badge,
  LinearProgress,
  Alert,
  CircularProgress,
  Stack,
  useTheme
} from '@mui/material';
import {
  SportsTennis,
  EmojiEvents,
  Schedule,
  LocationOn,
  PlayArrow,
  CheckCircle,
  Cancel,
  Leaderboard,
  Timeline
} from '@mui/icons-material';
import { format, isValid } from 'date-fns';

// Enhanced Avatar generation utility
const generateCartoonAvatar = (name: string, category: string = 'default') => {
  if (!name) return { initials: 'TBD', backgroundColor: '#gray' };
  
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = {
    'A League': ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#DC143C'],
    'B League': ['#4169E1', '#6495ED', '#87CEEB', '#4682B4', '#5F9EA0'],
    'C League': ['#32CD32', '#90EE90', '#98FB98', '#00FA9A', '#00FF7F'],
    default: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
  };
  
  const colorSet = colors[category as keyof typeof colors] || colors.default;
  const colorIndex = name.length % colorSet.length;
  const backgroundColor = colorSet[colorIndex];
  
  return { initials, backgroundColor };
};

// Player Avatar Component
const PlayerAvatar: React.FC<{
  name: string;
  category?: string;
  size?: number;
  position?: number;
}> = ({ name, category = 'default', size = 50, position }) => {
  const avatar = generateCartoonAvatar(name, category);
  
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      badgeContent={
        position && position <= 3 ? (
          <Avatar
            sx={{
              width: size / 3,
              height: size / 3,
              backgroundColor: position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32',
              fontSize: size / 8,
              fontWeight: 'bold'
            }}
          >
            {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
          </Avatar>
        ) : null
      }
    >
      <Avatar
        sx={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${avatar.backgroundColor} 0%, ${avatar.backgroundColor}dd 100%)`,
          border: '2px solid #fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          fontWeight: 'bold',
          fontSize: size / 2.5,
          '&:hover': {
            transform: 'scale(1.05)',
            transition: 'transform 0.2s ease'
          }
        }}
      >
        {avatar.initials}
      </Avatar>
    </Badge>
  );
};

// League Standings Component
const LeagueStandings: React.FC<{ players: any[], matches: any[], category: string }> = ({ 
  players, 
  matches, 
  category 
}) => {
  const calculateStandings = () => {
    const standings = players
      .filter(p => p.category === category)
      .map(player => {
        const playerMatches = matches.filter(m => 
          (m.team1 === player.name || m.team2 === player.name) && 
          m.status === 'completed'
        );
        
        const wins = playerMatches.filter(m => m.winnerName === player.name).length;
        const losses = playerMatches.filter(m => m.winnerName && m.winnerName !== player.name).length;
        const played = wins + losses;
        const winRate = played > 0 ? (wins / played) * 100 : 0;
        
        return {
          ...player,
          played,
          wins,
          losses,
          winRate,
          points: wins * 3 + losses * 1
        };
      })
      .sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.winRate !== b.winRate) return b.winRate - a.winRate;
        return a.name.localeCompare(b.name);
      });
    
    return standings;
  };

  const standings = calculateStandings();

  return (
    <TableContainer component={Paper} sx={{ mt: 2, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#1976d2' }}>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Position</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Player</TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Played</TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Won</TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Lost</TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Win Rate</TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Points</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((player, index) => (
            <TableRow 
              key={player._id}
              sx={{
                backgroundColor: index < 3 ? `rgba(255, 215, 0, ${0.3 - index * 0.1})` : 'inherit',
                '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
              }}
            >
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" color={index < 3 ? 'primary' : 'text.primary'}>
                    #{index + 1}
                  </Typography>
                  {index < 3 && (
                    <Typography>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PlayerAvatar 
                    name={player.name} 
                    category={category}
                    position={index < 3 ? index + 1 : undefined}
                  />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {player.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={player.played} 
                  size="small" 
                  variant="outlined"
                  color={player.played > 3 ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={player.wins} 
                  size="small" 
                  color="success"
                  sx={{ fontWeight: 'bold' }}
                />
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={player.losses} 
                  size="small" 
                  color="error"
                />
              </TableCell>
              <TableCell align="center">
                <Stack alignItems="center" spacing={1}>
                  <LinearProgress 
                    variant="determinate" 
                    value={player.winRate} 
                    sx={{ 
                      width: '100%', 
                      height: 8,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: player.winRate > 50 ? '#4caf50' : '#ff9800'
                      }
                    }}
                  />
                  <Typography variant="caption" fontWeight="bold">
                    {player.winRate.toFixed(1)}%
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={player.points}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 'bold' }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Simple Match Results Component
function MatchResults({ matches, category }: { matches: any[], category: string }) {
  const categoryMatches = matches.filter(m => m.category === category);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'live':
        return <PlayArrow color="warning" />;
      case 'scheduled':
        return <Schedule color="info" />;
      default:
        return <Cancel color="error" />;
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {categoryMatches.map((match) => (
        <Card 
          key={match._id} 
          sx={{ 
            mb: 2, 
            background: match.status === 'completed' ? 
              'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)' :
              'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
            border: `2px solid ${match.status === 'completed' ? '#4caf50' : '#ff9800'}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <CardContent>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {getStatusIcon(match.status)}
                  <Typography variant="h6" fontWeight="bold">
                    Match #{match.matchNumber}
                  </Typography>
                  <Chip 
                    label={match.status.toUpperCase()} 
                    color={match.status === 'completed' ? 'success' : 'default'}
                    size="small"
                    variant="filled"
                  />
                </Stack>

                <Box sx={{ mt: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PlayerAvatar name={match.team1} category={category} size={40} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          {match.team1}
                        </Typography>
                        {match.status === 'completed' && match.winnerName === match.team1 && (
                          <Chip label="WINNER" color="success" size="small" />
                        )}
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={2} textAlign="center">
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        VS
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={5}>
                      <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end">
                        {match.status === 'completed' && match.winnerName === match.team2 && (
                          <Chip label="WINNER" color="success" size="small" />
                        )}
                        <Typography variant="subtitle1" fontWeight="bold">
                          {match.team2}
                        </Typography>
                        <PlayerAvatar name={match.team2} category={category} size={40} />
                      </Stack>
                    </Grid>
                  </Grid>

                  {match.status === 'completed' && match.score && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Paper sx={{ p: 2, backgroundColor: 'rgba(25,118,210,0.1)' }}>
                        <Typography variant="h6" color="primary">
                          Final Score: {match.score.team1Sets} - {match.score.team2Sets}
                        </Typography>
                        {match.duration && (
                          <Typography variant="caption" color="text.secondary">
                            Duration: {match.duration} minutes
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  status: string;
  description?: string;
  startDate: string;
  venue: string;
  categories?: string[];
}

interface Player {
  _id: string;
  name: string;
  category: string;
  phone?: string;
  paymentStatus: string;
  registeredAt: string;
}

interface Match {
  _id: string;
  round: string;
  matchNumber: number;
  team1: string;
  team2: string;
  category: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score?: {
    team1Sets: number;
    team2Sets: number;
  };
  winnerName?: string;
  scheduledTime?: string;
  venue?: string;
  duration?: number;
}

interface TournamentData {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
}

export default function TournamentResults() {
  const params = useParams();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments-native/${params.id}?_t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tournament data');
      }

      const result = await response.json();
      
      if (result.success) {
        setData({
          tournament: result.tournament,
          players: result.players,
          matches: result.matches
        });
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
  };

  useEffect(() => {
    fetchTournamentData();
  }, [params.id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">No tournament data available</Alert>
      </Container>
    );
  }

  const categories = ['A League', 'B League', 'C League'];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Tournament Header */}
      <Paper sx={{ 
        p: 4, 
        mb: 4, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 3
      }}>
        <Stack direction="row" alignItems="center" spacing={3}>
          <Avatar sx={{ 
            width: 80, 
            height: 80, 
            backgroundColor: 'rgba(255,255,255,0.2)',
            fontSize: '2rem'
          }}>
            🏆
          </Avatar>
          <Box>
            <Typography variant="h3" gutterBottom fontWeight="bold">
              {data.tournament.name}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Results & Standings
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Chip 
                icon={<LocationOn />} 
                label={data.tournament.venue} 
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip 
                icon={<SportsTennis />} 
                label={data.tournament.sport} 
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Tabs for different categories */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          centered
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: theme.palette.primary.main },
            '& .MuiTab-root': { fontWeight: 'bold', fontSize: '1.1rem' }
          }}
        >
          {categories.map((category, index) => (
            <Tab
              key={category}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography>{category}</Typography>
                  <Chip 
                    label={data.players.filter(p => p.category === category).length} 
                    size="small" 
                    color="primary"
                  />
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {categories.map((category, index) => (
        <Box key={category} hidden={activeTab !== index}>
          {activeTab === index && (
            <Grid container spacing={3}>
              {/* Standings */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Leaderboard color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                      {category} Standings
                    </Typography>
                  </Stack>
                  <LeagueStandings 
                    players={data.players} 
                    matches={data.matches} 
                    category={category}
                  />
                </Paper>
              </Grid>

              {/* Match Results */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Timeline color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                      {category} Match Results
                    </Typography>
                  </Stack>
                  <MatchResults 
                    matches={data.matches} 
                    category={category}
                  />
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      ))}
    </Container>
  );
}