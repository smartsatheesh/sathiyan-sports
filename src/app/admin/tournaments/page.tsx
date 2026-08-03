'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Refresh,
  Download,
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

interface RegistrationRow {
  id: string;
  tournamentId: string;
  tournamentName: string;
  sport: string;
  venue: string;
  name: string;
  phone: string;
  partnerName: string;
  sex: string;
  category: string;
  eventType: string;
  registrationFee: number;
  paymentChoice: 'pay_now' | 'pay_later';
  paymentStatus: 'pending' | 'completed' | 'failed';
  transactionId: string;
  registrationSource: 'public' | 'user' | 'admin';
  registeredAt: string | null;
}

interface RegSummary {
  total: number;
  payNow: number;
  payLater: number;
  completed: number;
  pending: number;
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

  // Registrations tab state
  const [regLoading, setRegLoading] = useState(false);
  const [regExporting, setRegExporting] = useState(false);
  const [regAlert, setRegAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [regRows, setRegRows] = useState<RegistrationRow[]>([]);
  const [regSummary, setRegSummary] = useState<RegSummary>({ total: 0, payNow: 0, payLater: 0, completed: 0, pending: 0 });
  const [regFilters, setRegFilters] = useState({
    tournamentId: 'all',
    paymentChoice: 'all',
    paymentStatus: 'all',
    source: 'all',
    search: '',
  });
  const [regEditDialog, setRegEditDialog] = useState(false);
  const [regEditRow, setRegEditRow] = useState<RegistrationRow | null>(null);
  const [regSaving, setRegSaving] = useState(false);

  // Registered players for match creation dropdowns
  const [registeredPlayers, setRegisteredPlayers] = useState<Array<{ id: string; label: string; name: string; partner: string }>>([]);

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
    fetchTournaments();
  }, [session]);

  const fetchRegisteredPlayers = async (tournamentId: string) => {
    try {
      const res = await fetch(`/api/admin/tournament-registrations?tournamentId=${tournamentId}&source=all&paymentChoice=all&paymentStatus=all`);
      const data = await res.json();
      if (data.success) {
        const sorted = (data.registrations || []).sort((a: any, b: any) =>
          new Date(a.registeredAt || 0).getTime() - new Date(b.registeredAt || 0).getTime()
        );
        setRegisteredPlayers(sorted.map((r: any, idx: number) => ({
          id: `I${idx + 1}`,
          label: `I${idx + 1} — ${r.name}${r.partnerName ? ` / ${r.partnerName}` : ''}`,
          name: r.name,
          partner: r.partnerName || '',
        })));
      }
    } catch { /* silently ignore */ }
  };

  // Fetch registrations when tab is active or filters change
  useEffect(() => {
    if (activeTab === 3) fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, regFilters]);

  const regQueryString = () => {
    const params = new URLSearchParams();
    params.set('tournamentId', regFilters.tournamentId);
    params.set('paymentChoice', regFilters.paymentChoice);
    params.set('paymentStatus', regFilters.paymentStatus);
    params.set('source', regFilters.source);
    if (regFilters.search.trim()) params.set('search', regFilters.search.trim());
    return params.toString();
  };

  const fetchRegistrations = async () => {
    try {
      setRegLoading(true);
      const res = await fetch(`/api/admin/tournament-registrations?${regQueryString()}`);
      const data = await res.json();
      if (data.success) {
        setRegRows(data.registrations || []);
        setRegSummary(data.summary || { total: 0, payNow: 0, payLater: 0, completed: 0, pending: 0 });
      } else {
        setRegAlert({ type: 'error', message: data.error || 'Failed to fetch registrations' });
      }
    } catch {
      setRegAlert({ type: 'error', message: 'Failed to fetch registrations' });
    } finally {
      setRegLoading(false);
    }
  };

  const downloadRegCsv = async () => {
    try {
      setRegExporting(true);
      const res = await fetch(`/api/admin/tournament-registrations?${regQueryString()}&format=csv`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tournament-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setRegAlert({ type: 'success', message: 'CSV exported successfully' });
    } catch {
      setRegAlert({ type: 'error', message: 'Failed to export CSV' });
    } finally {
      setRegExporting(false);
    }
  };

  const handleRegEdit = (row: RegistrationRow) => {
    setRegEditRow({ ...row });
    setRegEditDialog(true);
  };

  const handleRegSave = async () => {
    if (!regEditRow) return;
    try {
      setRegSaving(true);
      const res = await fetch('/api/admin/tournament-registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: regEditRow.id,
          name: regEditRow.name,
          phone: regEditRow.phone,
          partnerName: regEditRow.partnerName,
          sex: regEditRow.sex,
          category: regEditRow.category,
          eventType: regEditRow.eventType,
          paymentChoice: regEditRow.paymentChoice,
          paymentStatus: regEditRow.paymentStatus,
          transactionId: regEditRow.transactionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRegAlert({ type: 'success', message: 'Registration updated' });
        setRegEditDialog(false);
        fetchRegistrations();
      } else {
        setRegAlert({ type: 'error', message: data.error || 'Update failed' });
      }
    } catch {
      setRegAlert({ type: 'error', message: 'Update failed' });
    } finally {
      setRegSaving(false);
    }
  };

  const handleRegDelete = async (id: string) => {
    if (!confirm('Delete this registration? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/tournament-registrations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRegAlert({ type: 'success', message: 'Registration deleted' });
        fetchRegistrations();
      } else {
        setRegAlert({ type: 'error', message: data.error || 'Delete failed' });
      }
    } catch {
      setRegAlert({ type: 'error', message: 'Delete failed' });
    }
  };

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
      fetchRegisteredPlayers(selectedTournament);
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

  const matchesByRound = useMemo(() => {
    return matches.reduce((acc: Record<string, Match[]>, m) => {
      if (!acc[m.round]) acc[m.round] = [];
      acc[m.round].push(m);
      return acc;
    }, {});
  }, [matches]);

  const standings = useMemo(() => {
    const table: Record<string, { name: string; played: number; won: number; lost: number; setsWon: number; setsLost: number; points: number }> = {};
    const ensure = (name: string) => { if (!table[name]) table[name] = { name, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0 }; };
    matches.filter(m => m.status === 'completed').forEach(m => {
      const p1 = m.player1Name + (m.player1Partner ? ` / ${m.player1Partner}` : '');
      const p2 = m.player2Name ? m.player2Name + (m.player2Partner ? ` / ${m.player2Partner}` : '') : null;
      ensure(p1);
      if (p2) ensure(p2);
      table[p1].played++;
      if (p2) table[p2].played++;
      const p1Won = m.winnerName ? m.winnerName === m.player1Name : m.score.player1Sets > m.score.player2Sets;
      if (p1Won) { table[p1].won++; table[p1].points += 2; if (p2) table[p2].lost++; }
      else { if (p2) { table[p2].won++; table[p2].points += 2; } table[p1].lost++; }
      table[p1].setsWon += m.score.player1Sets; table[p1].setsLost += m.score.player2Sets;
      if (p2) { table[p2].setsWon += m.score.player2Sets; table[p2].setsLost += m.score.player1Sets; }
    });
    return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won);
  }, [matches]);

  const handleStartMatch = async (match: Match) => {
    try {
      await fetch(`/api/tournaments/${match.tournamentId}/matches/${match._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live', liveScore: { currentSet: 1, player1CurrentScore: 0, player2CurrentScore: 0, server: 'player1' } }),
      });
      fetchMatches(selectedTournament);
    } catch { setError('Failed to start match'); }
  };

  const handleDeleteMatch = async (matchId: string, tournamentId: string) => {
    if (!confirm('Delete this match?')) return;
    try {
      await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, { method: 'DELETE' });
      fetchMatches(selectedTournament);
    } catch { setError('Failed to delete match'); }
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
                      {tournament.venue} • {new Date(tournament.startDate).toLocaleDateString('en-GB')}
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
          <Tab label="Registrations" />
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
                    {new Date(tournament.startDate).toLocaleDateString('en-GB')}
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
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Fixtures</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { resetMatchForm(); setMatchDialog(true); }}>Add Match</Button>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => fetchMatches(selectedTournament)}>Refresh</Button>
            {matches.length > 0 && (
              <Button size="small" color="error" variant="outlined" onClick={async () => {
                if (!confirm(`Delete all ${matches.length} matches? This cannot be undone.`)) return;
                await fetch(`/api/tournaments/${selectedTournament}/matches`, { method: 'DELETE' });
                fetchMatches(selectedTournament);
              }}>Clear All Matches</Button>
            )}
          </Stack>

          {/* Stats bar */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Total', val: matches.length, color: undefined },
              { label: 'Scheduled', val: matches.filter(m => m.status === 'scheduled').length, color: 'info.main' },
              { label: '🔴 Live', val: matches.filter(m => m.status === 'live').length, color: 'error.main' },
              { label: 'Completed', val: matches.filter(m => m.status === 'completed').length, color: 'success.main' },
            ].map(s => (
              <Grid item xs={6} md={3} key={s.label}>
                <Card><CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800} color={s.color}>{s.val}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>

          {/* Fixtures grouped by round */}
          {Object.keys(matchesByRound).length === 0 && (
            <Alert severity="info">No matches yet. Click "Add Match" to create fixtures.</Alert>
          )}
          {Object.entries(matchesByRound).map(([round, roundMatches]) => (
            <Box key={round} sx={{ mb: 4 }}>
              <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1, borderRadius: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>{round}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, ml: 'auto' }}>{roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}</Typography>
              </Box>
              <Grid container spacing={2}>
                {roundMatches.map(match => {
                  const isLive = match.status === 'live';
                  const isDone = match.status === 'completed';
                  const regIdx1 = registeredPlayers.findIndex(p => p.name === match.player1Name);
                  const regIdx2 = registeredPlayers.findIndex(p => p.name === match.player2Name);
                  const id1 = regIdx1 >= 0 ? registeredPlayers[regIdx1].id : null;
                  const id2 = regIdx2 >= 0 ? registeredPlayers[regIdx2].id : null;
                  const p1display = id1 ? `${id1} (${match.player1Name || 'TBD'})` : (match.player1Name || 'TBD');
                  const p2display = id2 ? `${id2} (${match.player2Name})` : (match.player2Name || 'TBD');
                  const p1label = p1display + (match.player1Partner ? ` / ${match.player1Partner}` : '');
                  const p2label = p2display + (match.player2Partner ? ` / ${match.player2Partner}` : '');
                  return (
                    <Grid item xs={12} md={6} lg={4} key={match._id}>
                      <Card sx={{
                        border: isLive ? '2px solid #f44336' : isDone ? '1px solid #4caf50' : '1px solid #e0e0e0',
                        borderRadius: 2,
                        position: 'relative',
                        overflow: 'visible',
                      }}>
                        {isLive && (
                          <Box sx={{ position: 'absolute', top: -10, right: 10, bgcolor: 'error.main', color: 'white', px: 1, py: 0.3, borderRadius: 1, fontSize: '0.7rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                            ● LIVE
                          </Box>
                        )}
                        <CardContent sx={{ pb: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">#{match.matchNumber} · {match.courtNumber ? `Court ${match.courtNumber}` : 'Court TBD'}</Typography>
                            <Chip size="small" label={match.status} color={getStatusColor(match.status) as any} />
                          </Stack>

                          {/* Score row */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                              <Typography variant="body2" fontWeight={isDone && match.winnerName === match.player1Name ? 800 : 400}
                                sx={{ color: isDone && match.winnerName === match.player1Name ? 'success.main' : 'text.primary' }}>
                                {p1label}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                              {isDone && (
                                <Typography variant="h6" fontWeight={700}>
                                  {match.score.player1Sets} – {match.score.player2Sets}
                                </Typography>
                              )}
                              {isLive && match.liveScore && (
                                <Typography variant="h6" fontWeight={700} color="error.main">
                                  {match.liveScore.player1CurrentScore} – {match.liveScore.player2CurrentScore}
                                </Typography>
                              )}
                              {!isDone && !isLive && <Typography variant="body2" color="text.secondary">vs</Typography>}
                            </Box>
                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                              <Typography variant="body2" fontWeight={isDone && match.winnerName === match.player2Name ? 800 : 400}
                                sx={{ color: isDone && match.winnerName === match.player2Name ? 'success.main' : 'text.primary' }}>
                                {p2label}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Set-by-set scores */}
                          {isDone && match.score.sets?.length > 0 && (
                            <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 1 }}>
                              {match.score.sets.map(s => (
                                <Chip key={s.set} size="small" variant="outlined" label={`${s.player1Score}-${s.player2Score}`} sx={{ fontSize: '0.7rem' }} />
                              ))}
                            </Stack>
                          )}

                          {match.scheduledTime && !isDone && (
                            <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                              {new Date(match.scheduledTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </CardContent>

                        {/* Action buttons */}
                        <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1 }}>
                          {match.status === 'scheduled' && (
                            <Button size="small" variant="contained" color="warning" fullWidth onClick={() => handleStartMatch(match)}>
                              ▶ Start Match
                            </Button>
                          )}
                          {isLive && (
                            <Button size="small" variant="contained" color="error" fullWidth onClick={() => openEditScore(match)}>
                              Update Score
                            </Button>
                          )}
                          {isDone && (
                            <Button size="small" variant="outlined" fullWidth onClick={() => openEditScore(match)}>
                              Edit Result
                            </Button>
                          )}
                          <IconButton size="small" onClick={() => openEditScore(match)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteMatch(match._id, match.tournamentId)}><Delete fontSize="small" /></IconButton>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}

          {/* Standings */}
          {standings.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🏆 Current Standings</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      {['Rank', 'Player / Pair', 'P', 'W', 'L', 'Sets W-L', 'Pts'].map(h => (
                        <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {standings.map((row, idx) => (
                      <TableRow key={row.name} sx={{ bgcolor: idx === 0 ? 'rgba(255,215,0,0.1)' : 'inherit' }}>
                        <TableCell><strong>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</strong></TableCell>
                        <TableCell><strong>{row.name}</strong></TableCell>
                        <TableCell>{row.played}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>{row.won}</TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{row.lost}</TableCell>
                        <TableCell>{row.setsWon}-{row.setsLost}</TableCell>
                        <TableCell><Chip size="small" label={row.points} color={idx === 0 ? 'warning' : 'default'} sx={{ fontWeight: 800 }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Stack spacing={2.5}>
          {regAlert && <Alert severity={regAlert.type}>{regAlert.message}</Alert>}

          <Grid container spacing={2}>
            {[{ label: 'Total', val: regSummary.total, color: undefined }, { label: 'Pay Now', val: regSummary.payNow, color: undefined }, { label: 'Pay Later', val: regSummary.payLater, color: undefined }, { label: 'Completed', val: regSummary.completed, color: 'success.main' }, { label: 'Pending', val: regSummary.pending, color: 'warning.main' }].map((s) => (
              <Grid item xs={6} md={2.4} key={s.label}>
                <Card><CardContent>
                  <Typography variant="caption">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800} color={s.color}>{s.val}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tournament</InputLabel>
                  <Select value={regFilters.tournamentId} label="Tournament" onChange={(e) => setRegFilters((p) => ({ ...p, tournamentId: String(e.target.value) }))}>
                    <MenuItem value="all">All Tournaments</MenuItem>
                    {tournaments.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Choice</InputLabel>
                  <Select value={regFilters.paymentChoice} label="Payment Choice" onChange={(e) => setRegFilters((p) => ({ ...p, paymentChoice: String(e.target.value) }))}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pay_now">Pay Now</MenuItem>
                    <MenuItem value="pay_later">Pay Later</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={regFilters.paymentStatus} label="Payment Status" onChange={(e) => setRegFilters((p) => ({ ...p, paymentStatus: String(e.target.value) }))}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select value={regFilters.source} label="Source" onChange={(e) => setRegFilters((p) => ({ ...p, source: String(e.target.value) }))}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Search name / phone / txn" value={regFilters.search} onChange={(e) => setRegFilters((p) => ({ ...p, search: e.target.value }))} />
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchRegistrations}>Refresh</Button>
              <Button variant="contained" startIcon={<Download />} onClick={downloadRegCsv} disabled={regExporting}>
                {regExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              {regRows.length > 0 && regFilters.tournamentId !== 'all' && (
                <Button color="error" variant="outlined" onClick={async () => {
                  if (!confirm(`Delete ALL ${regRows.length} registrations for this tournament? This cannot be undone.`)) return;
                  await fetch(`/api/admin/tournament-registrations?tournamentId=${regFilters.tournamentId}&deleteAll=true`, { method: 'DELETE' });
                  fetchRegistrations();
                }}>Clear All Registrations</Button>
              )}
            </Stack>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Registered</TableCell>
                  <TableCell>Tournament</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Choice</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Transaction ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regLoading ? (
                  <TableRow><TableCell colSpan={11} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                ) : regRows.length === 0 ? (
                  <TableRow><TableCell colSpan={11} align="center">No registrations found</TableCell></TableRow>
                ) : (
                  regRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.registeredAt ? new Date(row.registeredAt).toLocaleString('en-GB') : '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{row.tournamentName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.sport} • {row.venue}</Typography>
                      </TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.sex}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.eventType}</TableCell>
                      <TableCell>₹{row.registrationFee || 499}</TableCell>
                      <TableCell>
                        <Chip size="small" color={row.paymentChoice === 'pay_now' ? 'success' : 'warning'} label={row.paymentChoice === 'pay_now' ? 'Pay Now' : 'Pay Later'} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={row.paymentStatus === 'completed' ? 'success' : row.paymentStatus === 'failed' ? 'error' : 'warning'} label={row.paymentStatus} />
                      </TableCell>
                      <TableCell>{row.transactionId || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleRegEdit(row)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRegDelete(row.id)}><Delete fontSize="small" /></IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
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

      {/* Registration Edit Dialog */}
      <Dialog open={regEditDialog} onClose={(_, reason) => { if (reason !== 'backdropClick') setRegEditDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Registration</DialogTitle>
        <DialogContent>
          {regEditRow && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Name" value={regEditRow.name} onChange={(e) => setRegEditRow((p) => p ? { ...p, name: e.target.value } : p)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Phone" value={regEditRow.phone} onChange={(e) => setRegEditRow((p) => p ? { ...p, phone: e.target.value } : p)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Sex</InputLabel>
                  <Select value={regEditRow.sex} label="Sex" onChange={(e) => setRegEditRow((p) => p ? { ...p, sex: e.target.value } : p)}>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select value={regEditRow.eventType} label="Format" onChange={(e) => setRegEditRow((p) => p ? { ...p, eventType: e.target.value } : p)}>
                    <MenuItem value="Singles">Singles</MenuItem>
                    <MenuItem value="Doubles">Doubles</MenuItem>
                    <MenuItem value="Mixed Doubles">Mixed Doubles</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {(regEditRow.eventType === 'Doubles' || regEditRow.eventType === 'Mixed Doubles') && (
                <Grid item xs={12}>
                  <TextField fullWidth label="Partner Name" value={regEditRow.partnerName || ''} onChange={(e) => setRegEditRow((p) => p ? { ...p, partnerName: e.target.value } : p)} helperText="Partner for doubles events" />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Age Category</InputLabel>
                  <Select value={regEditRow.category} label="Age Category" onChange={(e) => setRegEditRow((p) => p ? { ...p, category: e.target.value } : p)}>
                    <MenuItem value="20 to 40 Adult">20 to 40 Adult</MenuItem>
                    <MenuItem value="40 plus Veteran">40 plus Veteran</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Choice</InputLabel>
                  <Select value={regEditRow.paymentChoice} label="Payment Choice" onChange={(e) => setRegEditRow((p) => p ? { ...p, paymentChoice: e.target.value as any } : p)}>
                    <MenuItem value="pay_now">Pay Now</MenuItem>
                    <MenuItem value="pay_later">Pay Later</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={regEditRow.paymentStatus} label="Payment Status" onChange={(e) => setRegEditRow((p) => p ? { ...p, paymentStatus: e.target.value as any } : p)}>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Transaction ID" value={regEditRow.transactionId === '-' ? '' : regEditRow.transactionId} onChange={(e) => setRegEditRow((p) => p ? { ...p, transactionId: e.target.value } : p)} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegSave} disabled={regSaving}>{regSaving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Tournament Dialog */}
      <Dialog open={tournamentDialog} onClose={(_, reason) => { if (reason !== 'backdropClick') setTournamentDialog(false); }} maxWidth="md" fullWidth>
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
      <Dialog open={matchDialog} onClose={(_, reason) => { if (reason !== 'backdropClick') setMatchDialog(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Create Match</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Round</InputLabel>
                <Select value={matchForm.round} label="Round" onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}>
                  {['Group Stage', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  <MenuItem value="custom">Custom...</MenuItem>
                </Select>
              </FormControl>
              {matchForm.round === 'custom' && (
                <TextField fullWidth sx={{ mt: 1 }} label="Custom Round Name" onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Match Number" type="number" value={matchForm.matchNumber}
                onChange={(e) => setMatchForm({ ...matchForm, matchNumber: parseInt(e.target.value) || 1 })} />
            </Grid>

            {registeredPlayers.length > 0 ? (
              <>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Team 1</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select Player / Pair (Team 1)</InputLabel>
                    <Select
                      value={matchForm.player1Name}
                      label="Select Player / Pair (Team 1)"
                      onChange={(e) => {
                        const p = registeredPlayers.find(r => r.name === e.target.value);
                        setMatchForm({ ...matchForm, player1Name: p?.name || '', player1Partner: p?.partner || '' });
                      }}
                    >
                      {registeredPlayers.map(p => <MenuItem key={p.id} value={p.name}>{p.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Team 2</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select Player / Pair (Team 2)</InputLabel>
                    <Select
                      value={matchForm.player2Name}
                      label="Select Player / Pair (Team 2)"
                      onChange={(e) => {
                        const p = registeredPlayers.find(r => r.name === e.target.value);
                        setMatchForm({ ...matchForm, player2Name: p?.name || '', player2Partner: p?.partner || '' });
                      }}
                    >
                      <MenuItem value="">TBD</MenuItem>
                      {registeredPlayers.map(p => <MenuItem key={p.id} value={p.name}>{p.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Player 1 Name" value={matchForm.player1Name} onChange={(e) => setMatchForm({ ...matchForm, player1Name: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Player 1 Partner" value={matchForm.player1Partner} onChange={(e) => setMatchForm({ ...matchForm, player1Partner: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Player 2 Name" value={matchForm.player2Name} onChange={(e) => setMatchForm({ ...matchForm, player2Name: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Player 2 Partner" value={matchForm.player2Partner} onChange={(e) => setMatchForm({ ...matchForm, player2Partner: e.target.value })} />
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Court Number" value={matchForm.courtNumber} onChange={(e) => setMatchForm({ ...matchForm, courtNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Scheduled Time" type="datetime-local" value={matchForm.scheduledTime}
                onChange={(e) => setMatchForm({ ...matchForm, scheduledTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMatch}>Create Match</Button>
        </DialogActions>
      </Dialog>

      {/* Score Dialog */}
      <Dialog open={scoreDialog} onClose={(_, reason) => { if (reason !== 'backdropClick') setScoreDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {scoreForm.status === 'live' ? '🔴 Update Live Score' : scoreForm.status === 'completed' ? '✅ Edit Result' : '📋 Match Details'}
          {editingMatch && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editingMatch.player1Name}{editingMatch.player1Partner ? ` / ${editingMatch.player1Partner}` : ''} vs {editingMatch.player2Name || 'TBD'}{editingMatch.player2Partner ? ` / ${editingMatch.player2Partner}` : ''}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Match Status</InputLabel>
                <Select value={scoreForm.status} onChange={(e) => setScoreForm({ ...scoreForm, status: e.target.value as any })} label="Match Status">
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="live">🔴 Live</MenuItem>
                  <MenuItem value="completed">✅ Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Live score entry */}
            {scoreForm.status === 'live' && (
              <>
                <Grid item xs={12}><Typography variant="subtitle2" fontWeight={700} color="error.main">Current Set Score — Set {scoreForm.liveScore.currentSet}</Typography></Grid>
                <Grid item xs={5}>
                  <Typography variant="caption">{editingMatch?.player1Name || 'Player 1'}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton size="small" onClick={() => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, player1CurrentScore: Math.max(0, f.liveScore.player1CurrentScore - 1) } }))}>−</IconButton>
                    <Typography variant="h4" fontWeight={800} sx={{ minWidth: 40, textAlign: 'center' }}>{scoreForm.liveScore.player1CurrentScore}</Typography>
                    <IconButton size="small" onClick={() => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, player1CurrentScore: f.liveScore.player1CurrentScore + 1 } }))}>+</IconButton>
                  </Stack>
                </Grid>
                <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="h5" color="text.secondary">–</Typography></Grid>
                <Grid item xs={5}>
                  <Typography variant="caption">{editingMatch?.player2Name || 'Player 2'}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton size="small" onClick={() => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, player2CurrentScore: Math.max(0, f.liveScore.player2CurrentScore - 1) } }))}>−</IconButton>
                    <Typography variant="h4" fontWeight={800} sx={{ minWidth: 40, textAlign: 'center' }}>{scoreForm.liveScore.player2CurrentScore}</Typography>
                    <IconButton size="small" onClick={() => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, player2CurrentScore: f.liveScore.player2CurrentScore + 1 } }))}>+</IconButton>
                  </Stack>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Current Set #" type="number" value={scoreForm.liveScore.currentSet}
                    onChange={(e) => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, currentSet: parseInt(e.target.value) || 1 } }))} />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Serving</InputLabel>
                    <Select value={scoreForm.liveScore.server} label="Serving"
                      onChange={(e) => setScoreForm(f => ({ ...f, liveScore: { ...f.liveScore, server: e.target.value as any } }))}>
                      <MenuItem value="player1">{editingMatch?.player1Name || 'Player 1'} 🏸</MenuItem>
                      <MenuItem value="player2">{editingMatch?.player2Name || 'Player 2'} 🏸</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {/* Set-by-set scores */}
            {(scoreForm.status === 'live' || scoreForm.status === 'completed') && (
              <>
                <Grid item xs={12}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>Set Scores</Typography>
                    <Button size="small" onClick={() => setScoreForm(f => ({ ...f, sets: [...f.sets, { set: f.sets.length + 1, player1Score: 0, player2Score: 0 }] }))}>+ Add Set</Button>
                  </Stack>
                </Grid>
                {scoreForm.sets.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={1}><Typography variant="caption" sx={{ mt: 1.5, display: 'block' }}>S{s.set}</Typography></Grid>
                    <Grid item xs={5}>
                      <TextField size="small" fullWidth label={editingMatch?.player1Name || 'P1'} type="number" value={s.player1Score}
                        onChange={(e) => { const sets = [...scoreForm.sets]; sets[idx] = { ...sets[idx], player1Score: parseInt(e.target.value) || 0 }; setScoreForm(f => ({ ...f, sets, player1Sets: sets.filter(s => s.player1Score > s.player2Score).length, player2Sets: sets.filter(s => s.player2Score > s.player1Score).length })); }} />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField size="small" fullWidth label={editingMatch?.player2Name || 'P2'} type="number" value={s.player2Score}
                        onChange={(e) => { const sets = [...scoreForm.sets]; sets[idx] = { ...sets[idx], player2Score: parseInt(e.target.value) || 0 }; setScoreForm(f => ({ ...f, sets, player1Sets: sets.filter(s => s.player1Score > s.player2Score).length, player2Sets: sets.filter(s => s.player2Score > s.player1Score).length })); }} />
                    </Grid>
                    <Grid item xs={1}><IconButton size="small" color="error" onClick={() => setScoreForm(f => ({ ...f, sets: f.sets.filter((_, i) => i !== idx) }))}><Delete fontSize="small" /></IconButton></Grid>
                  </React.Fragment>
                ))}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Sets: {editingMatch?.player1Name || 'P1'} <strong>{scoreForm.player1Sets}</strong> — <strong>{scoreForm.player2Sets}</strong> {editingMatch?.player2Name || 'P2'}
                  </Typography>
                </Grid>
              </>
            )}

            {/* Winner + duration */}
            {scoreForm.status === 'completed' && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Winner</InputLabel>
                    <Select value={scoreForm.winnerName} label="Winner" onChange={(e) => setScoreForm({ ...scoreForm, winnerName: e.target.value })}>
                      <MenuItem value="">— Select Winner —</MenuItem>
                      <MenuItem value={editingMatch?.player1Name || ''}>{editingMatch?.player1Name || 'Player 1'}{editingMatch?.player1Partner ? ` / ${editingMatch.player1Partner}` : ''}</MenuItem>
                      <MenuItem value={editingMatch?.player2Name || ''}>{editingMatch?.player2Name || 'Player 2'}{editingMatch?.player2Partner ? ` / ${editingMatch.player2Partner}` : ''}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Duration (minutes)" type="number" value={scoreForm.duration}
                    onChange={(e) => setScoreForm({ ...scoreForm, duration: parseInt(e.target.value) || 0 })} />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScoreDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateMatchScore}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}