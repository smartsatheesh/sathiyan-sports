'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';

interface TournamentOption {
  _id: string;
  name: string;
}

interface RegistrationRow {
  id: string;
  tournamentId: string;
  tournamentName: string;
  sport: string;
  venue: string;
  name: string;
  phone: string;
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

interface Summary {
  total: number;
  payNow: number;
  payLater: number;
  completed: number;
  pending: number;
}

export default function AdminTournamentRegistrationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, payNow: 0, payLater: 0, completed: 0, pending: 0 });

  const [filters, setFilters] = useState({
    tournamentId: 'all',
    paymentChoice: 'all',
    paymentStatus: 'all',
    source: 'public',
    search: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin?callbackUrl=/admin/tournament-registrations');
      return;
    }
    if (session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    const run = async () => {
      await Promise.all([fetchTournaments(), fetchRegistrations()]);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tournamentId', filters.tournamentId);
    params.set('paymentChoice', filters.paymentChoice);
    params.set('paymentStatus', filters.paymentStatus);
    params.set('source', filters.source);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    return params.toString();
  }, [filters]);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      if (data.success) {
        setTournaments((data.data || []).map((t: any) => ({ _id: t._id, name: t.name })));
      }
    } catch {
      // silently ignore tournaments dropdown failures
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tournament-registrations?${queryString}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.registrations || []);
        setSummary(data.summary || { total: 0, payNow: 0, payLater: 0, completed: 0, pending: 0 });
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to fetch registrations' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Failed to fetch registrations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchRegistrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const downloadCsv = async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/admin/tournament-registrations?${queryString}&format=csv`);
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
      setAlert({ type: 'success', message: 'CSV exported successfully' });
    } catch {
      setAlert({ type: 'error', message: 'Failed to export CSV' });
    } finally {
      setExporting(false);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Tournament Registrations</Typography>
          <Typography variant="body2" color="text.secondary">Public direct-link registrations with payment tracking and CSV export.</Typography>
        </Box>

        {alert && <Alert severity={alert.type}>{alert.message}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={6} md={2.4}><Card><CardContent><Typography variant="caption">Total</Typography><Typography variant="h5" fontWeight={800}>{summary.total}</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2.4}><Card><CardContent><Typography variant="caption">Pay Now</Typography><Typography variant="h5" fontWeight={800}>{summary.payNow}</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2.4}><Card><CardContent><Typography variant="caption">Pay Later</Typography><Typography variant="h5" fontWeight={800}>{summary.payLater}</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2.4}><Card><CardContent><Typography variant="caption">Completed</Typography><Typography variant="h5" fontWeight={800} color="success.main">{summary.completed}</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2.4}><Card><CardContent><Typography variant="caption">Pending</Typography><Typography variant="h5" fontWeight={800} color="warning.main">{summary.pending}</Typography></CardContent></Card></Grid>
        </Grid>

        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tournament</InputLabel>
                <Select
                  value={filters.tournamentId}
                  label="Tournament"
                  onChange={(e) => setFilters((prev) => ({ ...prev, tournamentId: String(e.target.value) }))}
                >
                  <MenuItem value="all">All Tournaments</MenuItem>
                  {tournaments.map((t) => (
                    <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Choice</InputLabel>
                <Select
                  value={filters.paymentChoice}
                  label="Payment Choice"
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentChoice: String(e.target.value) }))}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pay_now">Pay Now</MenuItem>
                  <MenuItem value="pay_later">Pay Later</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={filters.paymentStatus}
                  label="Payment Status"
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: String(e.target.value) }))}
                >
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
                <Select
                  value={filters.source}
                  label="Source"
                  onChange={(e) => setFilters((prev) => ({ ...prev, source: String(e.target.value) }))}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search name / phone / txn"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchRegistrations}>Refresh</Button>
            <Button variant="contained" startIcon={<Download />} onClick={downloadCsv} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">No registrations found</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
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
                      <Chip
                        size="small"
                        color={row.paymentChoice === 'pay_now' ? 'success' : 'warning'}
                        label={row.paymentChoice === 'pay_now' ? 'Pay Now' : 'Pay Later'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={row.paymentStatus === 'completed' ? 'success' : row.paymentStatus === 'failed' ? 'error' : 'warning'}
                        label={row.paymentStatus}
                      />
                    </TableCell>
                    <TableCell>{row.transactionId || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Container>
  );
}
