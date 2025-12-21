'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Divider,
  Stack,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  Save,
  ArrowBack,
  Add,
  Remove,
  SportsTennis,
  EmojiEvents
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

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
  score?: {
    team1Sets: number;
    team2Sets: number;
    sets: Array<{
      set: number;
      team1Score: number;
      team2Score: number;
    }>;
  };
}

export default function LiveScoreUpdate() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentSet, setCurrentSet] = useState(1);
  const [sets, setSets] = useState<Array<{set: number, team1Score: number, team2Score: number}>>([
    { set: 1, team1Score: 0, team2Score: 0 }
  ]);

  useEffect(() => {
    if (!session || session.user?.role !== 'admin') {
      router.push('/auth/login');
      return;
    }
    fetchMatch();
  }, [session]);

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches-native/${params.id}`);
      const result = await response.json();
      
      if (result.success) {
        setMatch(result.match);
        if (result.match.score?.sets) {
          setSets(result.match.score.sets);
          setCurrentSet(result.match.score.sets.length);
        }
      } else {
        setError('Failed to load match');
      }
    } catch (error) {
      setError('Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const updateScore = (setIndex: number, team: 'team1' | 'team2', increment: number) => {
    setSets(prev => {
      const newSets = [...prev];
      newSets[setIndex][`${team}Score`] = Math.max(0, newSets[setIndex][`${team}Score`] + increment);
      return newSets;
    });
  };

  const addSet = () => {
    setSets(prev => [...prev, { set: prev.length + 1, team1Score: 0, team2Score: 0 }]);
    setCurrentSet(prev => prev + 1);
  };

  const removeSet = () => {
    if (sets.length > 1) {
      setSets(prev => prev.slice(0, -1));
      setCurrentSet(prev => prev - 1);
    }
  };

  const calculateWinner = () => {
    const team1Sets = sets.filter(set => set.team1Score > set.team2Score).length;
    const team2Sets = sets.filter(set => set.team2Score > set.team1Score).length;
    
    if (team1Sets > team2Sets) return 'team1';
    if (team2Sets > team1Sets) return 'team2';
    return null;
  };

  const handleSave = async () => {
    if (!match) return;
    
    setSaving(true);
    try {
      const team1Sets = sets.filter(set => set.team1Score > set.team2Score).length;
      const team2Sets = sets.filter(set => set.team2Score > set.team1Score).length;
      const winner = calculateWinner();

      const updateData = {
        ...match,
        score: {
          team1Sets,
          team2Sets,
          sets
        },
        status: winner ? 'completed' : 'live',
        winner: winner === 'team1' ? match.team1 : winner === 'team2' ? match.team2 : undefined
      };

      const response = await fetch(`/api/matches-native/${match._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchMatch(); // Refresh data
      } else {
        setError(result.error || 'Failed to save');
      }
    } catch (error) {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading match...</Typography>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Match not found</Alert>
      </Container>
    );
  }

  const winner = calculateWinner();
  const team1Sets = sets.filter(set => set.team1Score > set.team2Score).length;
  const team2Sets = sets.filter(set => set.team2Score > set.team1Score).length;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">Live Score Update</Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Score saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Match Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Chip label={match.matchCode} color="primary" />
          </Grid>
          <Grid item>
            <Chip label={`Category ${match.category}`} variant="outlined" />
          </Grid>
          <Grid item>
            <Chip 
              label={match.status} 
              color={match.status === 'live' ? 'error' : match.status === 'completed' ? 'success' : 'default'}
            />
          </Grid>
          <Grid item xs />
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              {match.venue} • {match.round}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            {match.team1} <strong>vs</strong> {match.team2}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: winner ? 'success.main' : 'text.primary' }}>
            {team1Sets} - {team2Sets}
          </Typography>
          {winner && (
            <Box sx={{ mt: 1 }}>
              <Chip 
                icon={<EmojiEvents />}
                label={`Winner: ${winner === 'team1' ? match.team1 : match.team2}`}
                color="success"
                variant="filled"
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Score Interface */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Set Scores
        </Typography>

        {sets.map((set, index) => (
          <Card key={index} sx={{ mb: 2, bgcolor: index === currentSet - 1 ? 'action.selected' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Set {set.set}</Typography>
                {index === currentSet - 1 && (
                  <Chip label="Current Set" size="small" color="primary" />
                )}
              </Box>

              <Grid container spacing={2} alignItems="center">
                {/* Team 1 */}
                <Grid item xs={12} md={5}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" gutterBottom>{match.team1}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <IconButton onClick={() => updateScore(index, 'team1', -1)} disabled={set.team1Score === 0}>
                        <Remove />
                      </IconButton>
                      <Typography variant="h3" sx={{ minWidth: 80, textAlign: 'center' }}>
                        {set.team1Score}
                      </Typography>
                      <IconButton onClick={() => updateScore(index, 'team1', 1)}>
                        <Add />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>

                {/* VS */}
                <Grid item xs={12} md={2}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">VS</Typography>
                  </Box>
                </Grid>

                {/* Team 2 */}
                <Grid item xs={12} md={5}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" gutterBottom>{match.team2}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <IconButton onClick={() => updateScore(index, 'team2', -1)} disabled={set.team2Score === 0}>
                        <Remove />
                      </IconButton>
                      <Typography variant="h3" sx={{ minWidth: 80, textAlign: 'center' }}>
                        {set.team2Score}
                      </Typography>
                      <IconButton onClick={() => updateScore(index, 'team2', 1)}>
                        <Add />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Set Result */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                {set.team1Score > set.team2Score && (
                  <Chip label={`${match.team1} wins set`} color="success" size="small" />
                )}
                {set.team2Score > set.team1Score && (
                  <Chip label={`${match.team2} wins set`} color="success" size="small" />
                )}
                {set.team1Score === set.team2Score && set.team1Score > 0 && (
                  <Chip label="Tie" color="default" size="small" />
                )}
              </Box>
            </CardContent>
          </Card>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addSet}
            disabled={sets.length >= 5}
          >
            Add Set
          </Button>
          <Button
            variant="outlined"
            startIcon={<Remove />}
            onClick={removeSet}
            disabled={sets.length <= 1}
          >
            Remove Set
          </Button>
        </Box>
      </Paper>

      {/* Save Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ minWidth: 200 }}
        >
          {saving ? 'Saving...' : 'Save Score'}
        </Button>
      </Box>
    </Container>
  );
}