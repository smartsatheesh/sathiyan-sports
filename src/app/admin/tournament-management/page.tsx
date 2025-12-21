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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fab,
  Divider,
  Stack,
  Badge,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  SportsTennis,
  EmojiEvents,
  People,
  PlayArrow,
  Save,
  Cancel,
  Refresh,
  Settings,
  ScoreboardOutlined,
  PersonAdd,
  Groups,
  Schedule,
  AccountCircle,
  Sports
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

// Avatar generation utility
const generateCartoonAvatar = (name: string, category: string = 'default') => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = {
    singles: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
    doubles: ['#6C5CE7', '#FD79A8', '#FDCB6E', '#E17055', '#00B894'],
    team: ['#0984E3', '#E84393', '#00CEC9', '#6C5CE7', '#FD79A8'],
    mixed: ['#A29BFE', '#FF7675', '#74B9FF', '#00CEC9', '#FDCB6E'],
    default: ['#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
  };
  
  const colorSet = colors[category as keyof typeof colors] || colors.default;
  const colorIndex = name.length % colorSet.length;
  const backgroundColor = colorSet[colorIndex];
  
  return { initials, backgroundColor };
};

// Team avatar component with cartoon style
const TeamAvatar: React.FC<{ 
  name: string; 
  category?: string; 
  size?: number;
  showBorder?: boolean;
}> = ({ name, category = 'default', size = 40, showBorder = true }) => {
  const avatar = generateCartoonAvatar(name, category);
  
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        backgroundColor: avatar.backgroundColor,
        border: showBorder ? '3px solid #fff' : 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontWeight: 'bold',
        fontSize: size / 2.5,
        '&:hover': {
          transform: 'scale(1.1)',
          transition: 'transform 0.2s ease'
        }
      }}
    >
      {avatar.initials}
    </Avatar>
  );
};

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  type: string;
  status: string;
  description?: string;
  startDate: string;
  endDate?: string;
  registrationFee: number;
  maxPlayers?: number;
  venue: string;
  categories?: string[];
  playersCount?: number;
  matchesCount?: number;
}

interface Player {
  _id: string;
  name: string;
  phone?: string;
  category: string;
  partner?: string;
  registrationFee: number;
  paymentStatus: string;
  registeredAt: string;
  skill?: string; // beginner, intermediate, advanced
  avatar?: string;
}

interface Match {
  _id: string;
  team1: string;
  team2: string;
  category: string;
  matchCode: string;
  status: string;
  scheduledTime?: string;
  venue?: string;
  round: string;
  score?: any;
  team1Players?: Player[];
  team2Players?: Player[];
}

interface PlayerFormData {
  name: string;
  phone: string;
  category: string;
  partner?: string;
  skill: string;
  registrationFee: number;
  paymentStatus: string;
}

interface MatchFormData {
  team1Players: string[];
  team2Players: string[];
  category: string;
  scheduledTime: string;
  venue: string;
  round: string;
}

export default function AdminTournamentManagement() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'tournament' | 'player' | 'match' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Enhanced state for better player/match management
  const [playerFormOpen, setPlayerFormOpen] = useState(false);
  const [matchFormOpen, setMatchFormOpen] = useState(false);
  const [bulkPlayerAddOpen, setBulkPlayerAddOpen] = useState(false);
  const [autoMatchGenOpen, setAutoMatchGenOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  
  const [playerForm, setPlayerForm] = useState<PlayerFormData>({
    name: '',
    phone: '',
    category: 'singles',
    partner: '',
    skill: 'beginner',
    registrationFee: 500,
    paymentStatus: 'pending'
  });
  
  const [matchForm, setMatchForm] = useState<MatchFormData>({
    team1Players: [],
    team2Players: [],
    category: 'singles',
    scheduledTime: '',
    venue: '',
    round: 'round1'
  });

  // Enhanced player addition with validation
  const handleAddPlayer = async () => {
    if (!selectedTournament || !playerForm.name.trim()) {
      setError('Tournament and player name are required');
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament._id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...playerForm,
          tournamentId: selectedTournament._id
        })
      });

      if (response.ok) {
        setPlayerFormOpen(false);
        setPlayerForm({
          name: '',
          phone: '',
          category: 'singles',
          partner: '',
          skill: 'beginner',
          registrationFee: 500,
          paymentStatus: 'pending'
        });
        handleTournamentSelect(selectedTournament);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Failed to add player');
    }
  };

  // Enhanced match creation with team validation
  const handleCreateMatch = async () => {
    if (!selectedTournament || matchForm.team1Players.length === 0 || matchForm.team2Players.length === 0) {
      setError('Please select players for both teams');
      return;
    }

    try {
      const team1Names = matchForm.team1Players.map(id => 
        players.find(p => p._id === id)?.name || 'Unknown'
      ).join(' & ');
      
      const team2Names = matchForm.team2Players.map(id => 
        players.find(p => p._id === id)?.name || 'Unknown'
      ).join(' & ');

      const response = await fetch(`/api/tournaments/${selectedTournament._id}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matchForm,
          team1: team1Names,
          team2: team2Names,
          tournamentId: selectedTournament._id,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        setMatchFormOpen(false);
        setMatchForm({
          team1Players: [],
          team2Players: [],
          category: 'singles',
          scheduledTime: '',
          venue: '',
          round: 'round1'
        });
        handleTournamentSelect(selectedTournament);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      setError('Failed to create match');
    }
  };

  // Auto-generate tournament bracket
  const generateTournamentBracket = async () => {
    if (!selectedTournament) return;

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament._id}/generate-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setAutoMatchGenOpen(false);
        handleTournamentSelect(selectedTournament);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to generate bracket');
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      setError('Failed to generate bracket');
    }
  };

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.push('/auth/login');
      return;
    }
    fetchTournaments();
  }, [session, status]);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments-native');
      const result = await response.json();
      
      if (result.success) {
        setTournaments(result.tournaments);
        if (result.tournaments.length > 0 && !selectedTournament) {
          handleTournamentSelect(result.tournaments[0]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to load tournaments');
      setLoading(false);
    }
  };

  const handleTournamentSelect = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/tournaments-native/${tournament._id}`);
      const result = await response.json();
      
      if (result.success) {
        setPlayers(result.players);
        setMatches(result.matches);
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      setError('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: 'tournament' | 'player' | 'match', item: any) => {
    setEditType(type);
    setEditItem({ ...item });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editType || !editItem) return;

    try {
      let endpoint = '';
      let method = 'PUT';
      
      switch (editType) {
        case 'tournament':
          endpoint = `/api/tournaments-native/${editItem._id}`;
          break;
        case 'player':
          endpoint = `/api/players-native/${editItem._id}`;
          break;
        case 'match':
          endpoint = `/api/matches-native/${editItem._id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editItem),
      });

      const result = await response.json();

      if (result.success) {
        setUpdateSuccess(true);
        setEditDialogOpen(false);
        
        // Refresh data
        if (editType === 'tournament') {
          fetchTournaments();
        } else if (selectedTournament) {
          handleTournamentSelect(selectedTournament);
        }

        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Error updating:', error);
      setError('Failed to update');
    }
  };

  const renderEditDialog = () => {
    if (!editItem || !editType) return null;

    return (
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit {editType.charAt(0).toUpperCase() + editType.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {editType === 'tournament' && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tournament Name"
                    value={editItem.name || ''}
                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Sport"
                    value={editItem.sport || ''}
                    onChange={(e) => setEditItem({ ...editItem, sport: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editItem.status || ''}
                      label="Status"
                      onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                    >
                      <MenuItem value="upcoming">Upcoming</MenuItem>
                      <MenuItem value="live">Live</MenuItem>
                      <MenuItem value="ongoing">Ongoing</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={editItem.description || ''}
                    onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Venue"
                    value={editItem.venue || ''}
                    onChange={(e) => setEditItem({ ...editItem, venue: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Registration Fee"
                    value={editItem.registrationFee || 0}
                    onChange={(e) => setEditItem({ ...editItem, registrationFee: parseInt(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    InputLabelProps={{ shrink: true }}
                    value={editItem.startDate ? editItem.startDate.split('T')[0] : ''}
                    onChange={(e) => setEditItem({ ...editItem, startDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    InputLabelProps={{ shrink: true }}
                    value={editItem.endDate ? editItem.endDate.split('T')[0] : ''}
                    onChange={(e) => setEditItem({ ...editItem, endDate: e.target.value })}
                  />
                </Grid>
              </Grid>
            )}

            {editType === 'player' && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Player Name"
                    value={editItem.name || ''}
                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={editItem.phone || ''}
                    onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={editItem.category || ''}
                      label="Category"
                      onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                    >
                      <MenuItem value="A">Category A</MenuItem>
                      <MenuItem value="B">Category B</MenuItem>
                      <MenuItem value="C">Category C</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Partner"
                    value={editItem.partner || ''}
                    onChange={(e) => setEditItem({ ...editItem, partner: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Registration Fee"
                    value={editItem.registrationFee || 0}
                    onChange={(e) => setEditItem({ ...editItem, registrationFee: parseInt(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={editItem.paymentStatus || ''}
                      label="Payment Status"
                      onChange={(e) => setEditItem({ ...editItem, paymentStatus: e.target.value })}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {editType === 'match' && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Team 1"
                    value={editItem.team1 || ''}
                    onChange={(e) => setEditItem({ ...editItem, team1: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Team 2"
                    value={editItem.team2 || ''}
                    onChange={(e) => setEditItem({ ...editItem, team2: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editItem.status || ''}
                      label="Status"
                      onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                    >
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="live">Live</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Venue"
                    value={editItem.venue || ''}
                    onChange={(e) => setEditItem({ ...editItem, venue: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Round"
                    value={editItem.round || ''}
                    onChange={(e) => setEditItem({ ...editItem, round: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Score Management</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Team 1 Sets Won"
                        value={editItem.score?.team1Sets || 0}
                        onChange={(e) => setEditItem({
                          ...editItem,
                          score: { ...editItem.score, team1Sets: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Team 2 Sets Won"
                        value={editItem.score?.team2Sets || 0}
                        onChange={(e) => setEditItem({
                          ...editItem,
                          score: { ...editItem.score, team2Sets: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" startIcon={<Save />}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Successfully updated!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" gutterBottom>
        🎾 Tournament Management
      </Typography>

      {/* Tournament Selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Tournament
        </Typography>
        <Grid container spacing={2}>
          {tournaments.map((tournament) => (
            <Grid item xs={12} md={6} key={tournament._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedTournament?._id === tournament._id ? 2 : 1,
                  borderColor: selectedTournament?._id === tournament._id ? 'primary.main' : 'divider'
                }}
                onClick={() => handleTournamentSelect(tournament)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SportsTennis color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{tournament.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tournament.sport} • {tournament.venue}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip 
                          label={tournament.status} 
                          color={tournament.status === 'live' ? 'error' : 'primary'}
                          size="small" 
                        />
                        <Chip label={`${tournament.playersCount || 0} players`} size="small" />
                        <Chip label={`${tournament.matchesCount || 0} matches`} size="small" />
                      </Stack>
                    </Box>
                    <IconButton onClick={(e) => {
                      e.stopPropagation();
                      handleEdit('tournament', tournament);
                    }}>
                      <Edit />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {selectedTournament && (
        <Paper sx={{ p: 3 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 3 }}>
            <Tab label={`Players (${players.length})`} />
            <Tab label={`Matches (${matches.length})`} />
            <Tab label="Tournament Details" />
          </Tabs>


          {/* Enhanced Players Tab */}
          {activeTab === 0 && selectedTournament && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Tournament Players ({players.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => setPlayerFormOpen(true)}
                  >
                    Add Player
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Groups />}
                    onClick={() => setBulkPlayerAddOpen(true)}
                  >
                    Bulk Add
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Sports />}
                    onClick={() => setAutoMatchGenOpen(true)}
                    disabled={players.length < 4}
                  >
                    Generate Matches
                  </Button>
                </Stack>
              </Box>

              <Grid container spacing={2}>
                {players.map((player, index) => (
                  <Grid item xs={12} sm={6} md={4} key={player._id}>
                    <Card 
                      sx={{ 
                        '&:hover': { 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s ease'
                        } 
                      }}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <TeamAvatar 
                            name={player.name} 
                            category={player.category}
                            size={50}
                          />
                          <Box ml={2} flex={1}>
                            <Typography variant="h6" fontWeight="bold">
                              {player.name}
                            </Typography>
                            <Chip 
                              label={player.category}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Phone:
                            </Typography>
                            <Typography variant="body2">
                              {player.phone || 'N/A'}
                            </Typography>
                          </Box>
                          
                          {player.skill && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Skill:
                              </Typography>
                              <Chip 
                                label={player.skill}
                                size="small"
                                color={player.skill === 'advanced' ? 'success' : player.skill === 'intermediate' ? 'warning' : 'default'}
                              />
                            </Box>
                          )}
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Payment:
                            </Typography>
                            <Chip 
                              label={player.paymentStatus}
                              size="small"
                              color={player.paymentStatus === 'completed' ? 'success' : player.paymentStatus === 'pending' ? 'warning' : 'error'}
                            />
                          </Box>
                          
                          {player.partner && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Partner:
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {player.partner}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                      
                      <CardActions>
                        <Button size="small" onClick={() => handleEdit('player', player)}>
                          <Edit fontSize="small" />
                        </Button>
                        <Button size="small" color="error">
                          <Delete fontSize="small" />
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {players.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Players Registered
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Start by adding players to create exciting tournament matches
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PersonAdd />}
                    onClick={() => setPlayerFormOpen(true)}
                  >
                    Add First Player
                  </Button>
                </Paper>
              )}
            </Box>
          )}

          {/* Enhanced Matches Tab */}
          {activeTab === 1 && selectedTournament && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Tournament Matches ({matches.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setMatchFormOpen(true)}
                    disabled={players.length < 2}
                  >
                    Create Match
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Schedule />}
                    disabled={matches.length === 0}
                  >
                    Schedule All
                  </Button>
                </Stack>
              </Box>

              <Grid container spacing={2}>
                {matches.map((match, index) => (
                  <Grid item xs={12} md={6} key={match._id}>
                    <Card 
                      sx={{ 
                        border: match.status === 'live' ? '2px solid #ff4444' : '1px solid #e0e0e0',
                        '&:hover': { 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s ease'
                        } 
                      }}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" fontWeight="bold">
                            Match #{index + 1}
                          </Typography>
                          <Chip 
                            label={match.status}
                            color={match.status === 'live' ? 'error' : match.status === 'completed' ? 'success' : 'default'}
                            size="small"
                            icon={match.status === 'live' ? <PlayArrow /> : undefined}
                          />
                        </Box>

                        {/* Team 1 vs Team 2 with avatars */}
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box display="flex" alignItems="center" flex={1}>
                            <Stack direction="row" spacing={-1}>
                              {match.team1.split(' & ').map((playerName, i) => (
                                <TeamAvatar 
                                  key={i}
                                  name={playerName} 
                                  category={match.category}
                                  size={35}
                                />
                              ))}
                            </Stack>
                            <Box ml={2}>
                              <Typography variant="body2" fontWeight="bold">
                                {match.team1}
                              </Typography>
                            </Box>
                          </Box>

                          <Typography variant="h6" color="primary" fontWeight="bold" mx={2}>
                            VS
                          </Typography>

                          <Box display="flex" alignItems="center" flex={1} justifyContent="flex-end">
                            <Box mr={2} textAlign="right">
                              <Typography variant="body2" fontWeight="bold">
                                {match.team2}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={-1}>
                              {match.team2.split(' & ').map((playerName, i) => (
                                <TeamAvatar 
                                  key={i}
                                  name={playerName} 
                                  category={match.category}
                                  size={35}
                                />
                              ))}
                            </Stack>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Category:
                            </Typography>
                            <Typography variant="body2">
                              {match.category}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Round:
                            </Typography>
                            <Typography variant="body2">
                              {match.round}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Venue:
                            </Typography>
                            <Typography variant="body2">
                              {match.venue || 'TBA'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Time:
                            </Typography>
                            <Typography variant="body2">
                              {match.scheduledTime ? new Date(match.scheduledTime).toLocaleTimeString() : 'TBA'}
                            </Typography>
                          </Grid>
                        </Grid>

                        {match.score && (
                          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              Score: {match.score.team1Sets || 0} - {match.score.team2Sets || 0}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>

                      <CardActions>
                        <Button size="small" onClick={() => handleEdit('match', match)}>
                          <ScoreboardOutlined fontSize="small" />
                        </Button>
                        <Button size="small" color="primary">
                          <PlayArrow fontSize="small" />
                        </Button>
                        <Button size="small" color="error">
                          <Delete fontSize="small" />
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {matches.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Matches Created
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Create matches manually or auto-generate tournament bracket
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setMatchFormOpen(true)}
                      disabled={players.length < 2}
                    >
                      Create Match
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Sports />}
                      onClick={() => setAutoMatchGenOpen(true)}
                      disabled={players.length < 4}
                    >
                      Auto Generate
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Box>
          )}

          {/* Tournament Details Tab */}
          {activeTab === 2 && selectedTournament && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography><strong>Name:</strong> {selectedTournament.name}</Typography>
                  <Typography><strong>Sport:</strong> {selectedTournament.sport}</Typography>
                  <Typography><strong>Type:</strong> {selectedTournament.type}</Typography>
                  <Typography><strong>Status:</strong> {selectedTournament.status}</Typography>
                  <Typography><strong>Venue:</strong> {selectedTournament.venue}</Typography>
                  <Typography><strong>Registration Fee:</strong> ₹{selectedTournament.registrationFee}</Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Edit />} 
                    sx={{ mt: 2 }}
                    onClick={() => handleEdit('tournament', selectedTournament)}
                  >
                    Edit Details
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <Typography><strong>Total Players:</strong> {selectedTournament.playersCount || 0}</Typography>
                  <Typography><strong>Total Matches:</strong> {selectedTournament.matchesCount || 0}</Typography>
                  <Typography><strong>Categories:</strong> {selectedTournament.categories?.join(', ') || 'N/A'}</Typography>
                  <Typography><strong>Start Date:</strong> {new Date(selectedTournament.startDate).toLocaleDateString()}</Typography>
                  {selectedTournament.endDate && (
                    <Typography><strong>End Date:</strong> {new Date(selectedTournament.endDate).toLocaleDateString()}</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {renderEditDialog()}
      
      {/* Enhanced Player Addition Dialog */}
      <Dialog open={playerFormOpen} onClose={() => setPlayerFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <PersonAdd sx={{ mr: 1 }} />
            Add New Player
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player Name"
                value={playerForm.name}
                onChange={(e) => setPlayerForm({...playerForm, name: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={playerForm.phone}
                onChange={(e) => setPlayerForm({...playerForm, phone: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={playerForm.category}
                  label="Category"
                  onChange={(e) => setPlayerForm({...playerForm, category: e.target.value})}
                >
                  <MenuItem value="singles">Singles</MenuItem>
                  <MenuItem value="doubles">Doubles</MenuItem>
                  <MenuItem value="mixed">Mixed Doubles</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Skill Level</InputLabel>
                <Select
                  value={playerForm.skill}
                  label="Skill Level"
                  onChange={(e) => setPlayerForm({...playerForm, skill: e.target.value})}
                >
                  <MenuItem value="beginner">🟢 Beginner</MenuItem>
                  <MenuItem value="intermediate">🟡 Intermediate</MenuItem>
                  <MenuItem value="advanced">🔴 Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {playerForm.category.includes('doubles') && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Partner Name"
                  value={playerForm.partner || ''}
                  onChange={(e) => setPlayerForm({...playerForm, partner: e.target.value})}
                  helperText="For doubles/mixed doubles matches"
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Registration Fee"
                value={playerForm.registrationFee}
                onChange={(e) => setPlayerForm({...playerForm, registrationFee: Number(e.target.value)})}
                InputProps={{ startAdornment: <span>₹</span> }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={playerForm.paymentStatus}
                  label="Payment Status"
                  onChange={(e) => setPlayerForm({...playerForm, paymentStatus: e.target.value})}
                >
                  <MenuItem value="pending">⏳ Pending</MenuItem>
                  <MenuItem value="completed">✅ Completed</MenuItem>
                  <MenuItem value="failed">❌ Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Live Preview */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>Preview:</Typography>
                <Box display="flex" alignItems="center">
                  <TeamAvatar 
                    name={playerForm.name || 'Player Name'} 
                    category={playerForm.category}
                    size={40}
                  />
                  <Box ml={2}>
                    <Typography variant="body1" fontWeight="bold">
                      {playerForm.name || 'Player Name'}
                    </Typography>
                    <Chip 
                      label={playerForm.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlayerFormOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddPlayer}
            disabled={!playerForm.name.trim()}
          >
            Add Player
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Match Creation Dialog */}
      <Dialog open={matchFormOpen} onClose={() => setMatchFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Sports sx={{ mr: 1 }} />
            Create New Match
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Select Team 1 Players</Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                {players.map(player => (
                  <Box key={player._id} display="flex" alignItems="center" mb={1}>
                    <input
                      type="checkbox"
                      checked={matchForm.team1Players.includes(player._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMatchForm({
                            ...matchForm,
                            team1Players: [...matchForm.team1Players, player._id]
                          });
                        } else {
                          setMatchForm({
                            ...matchForm,
                            team1Players: matchForm.team1Players.filter(id => id !== player._id)
                          });
                        }
                      }}
                      style={{ marginRight: 8 }}
                    />
                    <TeamAvatar name={player.name} category={player.category} size={30} />
                    <Typography sx={{ ml: 1 }}>{player.name}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Select Team 2 Players</Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                {players.map(player => (
                  <Box key={player._id} display="flex" alignItems="center" mb={1}>
                    <input
                      type="checkbox"
                      checked={matchForm.team2Players.includes(player._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMatchForm({
                            ...matchForm,
                            team2Players: [...matchForm.team2Players, player._id]
                          });
                        } else {
                          setMatchForm({
                            ...matchForm,
                            team2Players: matchForm.team2Players.filter(id => id !== player._id)
                          });
                        }
                      }}
                      style={{ marginRight: 8 }}
                      disabled={matchForm.team1Players.includes(player._id)}
                    />
                    <TeamAvatar name={player.name} category={player.category} size={30} />
                    <Typography sx={{ ml: 1 }}>{player.name}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={matchForm.category}
                  label="Category"
                  onChange={(e) => setMatchForm({...matchForm, category: e.target.value})}
                >
                  <MenuItem value="singles">Singles</MenuItem>
                  <MenuItem value="doubles">Doubles</MenuItem>
                  <MenuItem value="mixed">Mixed Doubles</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Round</InputLabel>
                <Select
                  value={matchForm.round}
                  label="Round"
                  onChange={(e) => setMatchForm({...matchForm, round: e.target.value})}
                >
                  <MenuItem value="round1">Round 1</MenuItem>
                  <MenuItem value="quarterfinal">Quarter Final</MenuItem>
                  <MenuItem value="semifinal">Semi Final</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Scheduled Time"
                value={matchForm.scheduledTime}
                onChange={(e) => setMatchForm({...matchForm, scheduledTime: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Venue"
                value={matchForm.venue}
                onChange={(e) => setMatchForm({...matchForm, venue: e.target.value})}
                placeholder="Court 1, Hall A, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchFormOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateMatch}
            disabled={matchForm.team1Players.length === 0 || matchForm.team2Players.length === 0}
          >
            Create Match
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Auto Match Generation Dialog */}
      <Dialog open={autoMatchGenOpen} onClose={() => setAutoMatchGenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Tournament Bracket</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will automatically generate a tournament bracket based on the registered players.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              • Players will be randomly paired for first round<br/>
              • Bracket will follow single elimination format<br/>
              • Existing matches will not be affected
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Registered Players:</strong> {players.length}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoMatchGenOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateTournamentBracket}>
            Generate Bracket
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}