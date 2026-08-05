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
    clubName: '',
    partnerName: '',
    sex: 'Male',
    ageCategory: AGE_CATEGORIES[0],
    eventType: 'Doubles',
    paymentChoice: 'pay_now',
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

  const upiId = process.env.NEXT_PUBLIC_GPAY_UPI_ID || 'sathiyansportacademy202525-1@okaxis';
  const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Sathiyan Multi Sport Club';
  const upiNote = `Tournament registration - ${selectedTournament?.name || 'Sathiyan Sports'}`;
  // tez:// scheme opens GPay directly; upi:// is the generic fallback
  const gpayUrl = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${REGISTRATION_FEE}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
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
          clubName: formData.clubName,
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
          paymentChoice: 'pay_now',
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
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #d7eef8',
        }}
      >
        {/* Independence Day Hero Banner */}
        <Box sx={{
          background: 'linear-gradient(135deg, #FF9933 0%, #FF9933 33%, #ffffff 33%, #ffffff 66%, #138808 66%, #138808 100%)',
          px: { xs: 2, md: 4 },
          pt: 3,
          pb: 2,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative overlay for readability */}
          <Box sx={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />

          {/* Decorative flag emojis scattered */}
          {['🇮🇳', '🕊️', '🇮🇳', '⭐', '🇮🇳', '🕊️'].map((icon, i) => (
            <Box key={i} sx={{
              position: 'absolute',
              fontSize: { xs: '1.2rem', md: '1.6rem' },
              opacity: 0.35,
              top: `${[10, 20, 60, 10, 55, 30][i]}%`,
              left: `${[5, 88, 92, 45, 0, 70][i]}%`,
              transform: 'rotate(' + [-15, 20, -10, 30, 15, -20][i] + 'deg)',
              pointerEvents: 'none',
            }}>{icon}</Box>
          ))}

          {/* Main header content */}
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#FFD700', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              🇮🇳 Jai Hind • 15 August 2026 🇮🇳
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1.5, md: 3 }, my: 1.5 }}>
              {/* Left flag */}
              <Box sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1 }}>🇮🇳</Box>

              {/* Logo */}
              <Box
                component="img"
                src="/sathiyanlogo.png"
                alt="Sathiyan Sports Logo"
                sx={{
                  width: { xs: 100, md: 140 },
                  height: { xs: 100, md: 140 },
                  borderRadius: '50%',
                  boxShadow: '0 0 0 4px #FFD700, 0 0 0 8px rgba(255,215,0,0.3)',
                  objectFit: 'contain',
                  background: '#fff',
                  p: 0.5,
                }}
              />

              {/* Right side "Freedom to be Fit" */}
              <Box sx={{ textAlign: 'left', maxWidth: { xs: 110, md: 180 } }}>
                <Typography sx={{ fontSize: { xs: '1rem', md: '1.3rem' }, color: '#FFD700', fontWeight: 900, lineHeight: 1.2, fontStyle: 'italic', textShadow: '0 2px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
                  🕊️ Freedom to be Fit
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.3, mt: 0.8 }}>
                  {['🧘', '🏸', '⚽', '🏃'].map(e => <span key={e} style={{ fontSize: '1.1rem' }}>{e}</span>)}
                </Box>
              </Box>
            </Box>

            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,0.6)', mb: 0.5, fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
              Tournament Registration
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', fontWeight: 600 }}>
              1st Sathiyan Sports Independence Day Tournament
            </Typography>

            {/* Tricolor strip */}
            <Box sx={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', mt: 1.5, mx: 'auto', maxWidth: 200 }}>
              <Box sx={{ flex: 1, bgcolor: '#FF9933' }} />
              <Box sx={{ flex: 1, bgcolor: '#ffffff' }} />
              <Box sx={{ flex: 1, bgcolor: '#138808' }} />
            </Box>
          </Box>
        </Box>

        {/* Form content */}
        <Box sx={{ p: { xs: 2.5, md: 4 }, background: 'linear-gradient(160deg, #ffffff 0%, #f1fbff 100%)' }}>
        <Stack spacing={2.5}>

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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Club Name"
                  placeholder="e.g. Sathiyan Multi Sport Club"
                  value={formData.clubName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clubName: e.target.value }))}
                  helperText="Optional — enter your club or academy name"
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

              <Grid item xs={12}>
                <FormControl>
                  <FormLabel>Payment</FormLabel>
                  <RadioGroup
                    row
                    value={formData.paymentChoice}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentChoice: e.target.value }))}
                  >
                    <FormControlLabel value="pay_now" control={<Radio />} label="Pay Now" />
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
                        <Button variant="contained" startIcon={<img src="/gpay-icon.png" width={20} height={20} onError={(e) => (e.currentTarget.style.display='none')} />}
                          onClick={() => {
                            // Try GPay first, fall back to generic UPI
                            window.location.href = gpayUrl;
                            setTimeout(() => window.open(upiUrl, '_blank'), 1500);
                          }}>
                          Pay via GPay
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
        </Box>
      </Paper>
    </Container>
  );
}
