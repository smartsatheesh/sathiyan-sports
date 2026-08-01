'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, WhatsApp } from '@mui/icons-material';

const REGISTRATION_FEE = 600;
const AGE_CATEGORIES = ['20 to 40 Adult', '40 plus Veteran'];
const EVENT_TYPES = ['Singles', 'Doubles', 'Mixed Doubles'];

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  startDate: string;
  venue: string;
  status: string;
}

export default function TournamentRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentIdFromQuery = searchParams.get('tournamentId') || '';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    tournamentId: tournamentIdFromQuery,
    name: '',
    phone: '',
    partnerName: '',
    sex: 'Male',
    ageCategory: AGE_CATEGORIES[0],
    eventType: EVENT_TYPES[0],
    paymentChoice: 'pay_later',
    transactionId: '',
  });

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t._id === formData.tournamentId),
    [tournaments, formData.tournamentId]
  );

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      let upcoming: Tournament[] = [];

      const response = await fetch('/api/tournaments?status=upcoming');
      const data = response.ok ? await response.json() : { success: false };
      if (data.success) {
        upcoming = (data.data || []).filter((t: Tournament) => t.status === 'upcoming');
      }

      // Fallback to native API when primary source has no upcoming tournaments.
      if (upcoming.length === 0) {
        const nativeResponse = await fetch('/api/tournaments-native');
        const nativeData = nativeResponse.ok ? await nativeResponse.json() : { success: false };
        if (nativeData.success) {
          const nativeTournaments = nativeData.tournaments || [];
          upcoming = nativeTournaments.filter((t: Tournament) => t.status === 'upcoming' || t.status === 'live');
        }
      }

      if (upcoming.length > 0) {
        setTournaments(upcoming);
        setAlert(null);

        if (!formData.tournamentId) {
          setFormData((prev) => ({ ...prev, tournamentId: upcoming[0]._id }));
        }
      } else {
        setTournaments([]);
        setAlert({ type: 'info', message: 'No upcoming tournaments available right now.' });
      }
    } catch (error) {
      setTournaments([]);
      setAlert({ type: 'error', message: 'Failed to load tournaments. Please refresh and try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upiId = process.env.NEXT_PUBLIC_GPAY_UPI_ID || 'Vyapar.175693786746@hdfcbank';
  const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Sathiyan Multi Sport Club';
  const upiNote = `Tournament registration - ${selectedTournament?.name || 'Sathiyan Sports'}`;
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${REGISTRATION_FEE}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER || '919787020525';
  const waPaymentMessage = `Hi, I want to pay tournament registration fee ₹${REGISTRATION_FEE}. Name: ${formData.name || '-'}, Phone: ${formData.phone || '-'}, Tournament: ${selectedTournament?.name || '-'}.`;
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waPaymentMessage)}`;

  const handleCopy = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAlert({ type: 'success', message: successMessage });
    } catch {
      setAlert({ type: 'error', message: 'Failed to copy' });
    }
  };

  const handleSubmit = async () => {
    if (!formData.tournamentId || !formData.name.trim() || !formData.phone.trim()) {
      setAlert({ type: 'error', message: 'Please fill Tournament, Name, and Phone Number' });
      return;
    }

    if (formData.paymentChoice === 'pay_now' && !formData.transactionId.trim()) {
      setAlert({ type: 'error', message: 'Please enter transaction ID for Pay Now' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/tournaments/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: formData.tournamentId,
          name: formData.name,
          phone: formData.phone,
          sex: formData.sex,
          ageCategory: formData.ageCategory,
          eventType: formData.eventType,
          paymentChoice: formData.paymentChoice,
          transactionId: formData.transactionId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setAlert({ type: 'success', message: 'Registration successful!' });
        setFormData((prev) => ({
          ...prev,
          name: '',
          phone: '',
          transactionId: '',
          paymentChoice: 'pay_later',
        }));
      } else {
        setAlert({ type: 'error', message: data.error || 'Registration failed' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={6}
        sx={{
          p: { xs: 2.5, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(160deg, #ffffff 0%, #f1fbff 100%)',
          border: '1px solid #d7eef8',
        }}
      >
        <Stack spacing={2.5}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={900} color="primary.main">
              Tournament Registration
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Sathiyan Sports 1st Ever Independence Day Tournament
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Theme: Freedom to be Fit
            </Typography>
            <Box
              component="img"
              src="/sathiyanlogo.png"
              alt="Sathiyan Sports Logo"
              sx={{ width: 120, height: 120, mt: 1.5, borderRadius: 2, boxShadow: 2, display: 'block', mx: 'auto' }}
            />
          </Box>

          {alert && <Alert severity={alert.type}>{alert.message}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>Tournament</FormLabel>
                  <Select
                    value={formData.tournamentId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tournamentId: String(e.target.value) }))}
                  >
                    {tournaments.map((t) => (
                      <MenuItem key={t._id} value={t._id}>
                        {t.name} • {new Date(t.startDate).toLocaleDateString('en-GB')} • {t.venue}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>Format</FormLabel>
                  <Select
                    value={formData.eventType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, eventType: String(e.target.value) }))}
                  >
                    {EVENT_TYPES.map((f) => (
                      <MenuItem key={f} value={f}>{f}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>

              {(formData.eventType === 'Doubles' || formData.eventType === 'Mixed Doubles') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Partner Name"
                    value={formData.partnerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, partnerName: e.target.value }))}
                    helperText="Required for doubles events"
                  />
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>Sex</FormLabel>
                  <Select
                    value={formData.sex}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sex: String(e.target.value) }))}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>Category</FormLabel>
                  <Select
                    value={formData.ageCategory}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ageCategory: String(e.target.value) }))}
                  >
                    {AGE_CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>Category</FormLabel>
                  <Select
                    value={formData.ageCategory}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ageCategory: String(e.target.value) }))}
                  >
                    {AGE_CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl>
                  <FormLabel>Payment</FormLabel>
                  <RadioGroup
                    row
                    value={formData.paymentChoice}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentChoice: e.target.value }))}
                  >
                    <FormControlLabel value="pay_now" control={<Radio />} label="Pay Now" />
                    <FormControlLabel value="pay_later" control={<Radio />} label="Pay Later" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {formData.paymentChoice === 'pay_now' && (
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 3, border: '1px solid #cde7f7' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Pay ₹{REGISTRATION_FEE}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                        <Button variant="contained" onClick={() => window.open(upiUrl, '_blank')}>
                          Pay via UPI App
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<WhatsApp />}
                          onClick={() => window.open(waUrl, '_blank')}
                        >
                          Pay via WhatsApp
                        </Button>
                        <Button
                          variant="text"
                          startIcon={<ContentCopy />}
                          onClick={() => handleCopy(upiId, 'UPI ID copied')}
                        >
                          Copy UPI ID
                        </Button>
                      </Stack>

                      <TextField
                        fullWidth
                        label="Transaction ID / UTR"
                        value={formData.transactionId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, transactionId: e.target.value }))}
                        helperText="Required if you choose Pay Now"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}

              <Grid item xs={12}>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  sx={{ py: 1.4, fontWeight: 800 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  Registration Fee: ₹{REGISTRATION_FEE}
                </Typography>
              </Grid>
            </Grid>
          )}

          {result && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Registration ID: {result.registrationId} | Payment: {result.paymentChoice === 'pay_now' ? 'Pay Now' : 'Pay Later'} | Sex: {result.sex || formData.sex}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
            <Button variant="text" onClick={() => router.push('/tournaments')}>
              Back to Tournaments
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => handleCopy(`${window.location.origin}/tournaments/register${formData.tournamentId ? `?tournamentId=${formData.tournamentId}` : ''}`, 'Direct registration link copied')}
            >
              Copy Direct Link
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
