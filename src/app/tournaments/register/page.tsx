  'use client';

  import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Snackbar,
    Stack,
    TextField,
    Typography,
  } from '@mui/material';
  import { ContentCopy } from '@mui/icons-material';
  import UpiPaymentDialog from "../../components/UpiPaymentDialog";
  import { useSiteSettings } from "../../hooks/useSiteSettings";
  import { sportRules } from "../../lib/tournamentSports";

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
    const [payFor, setPayFor] = useState<{ id: string; fee: number; tournament: string } | null>(null);
    const { settings } = useSiteSettings();
    const alertRef = useRef<HTMLDivElement>(null);
    const [validationSnack, setValidationSnack] = useState<string | null>(null);

    // Scroll to and briefly animate the alert whenever it appears
    useEffect(() => {
      if (alert && alertRef.current) {
        alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [alert]);

    const [formData, setFormData] = useState({
      tournamentId: tournamentIdFromQuery,
      name: '',
      phone: '',
      clubName: '',
      partnerName: '',
      captainName: '',
      sex: 'Male',
      ageCategory: '',
      eventType: '',
      paymentChoice: 'pay_now',
    });

    const selectedTournament = useMemo(
      () => tournaments.find((t) => t._id === formData.tournamentId),
      [tournaments, formData.tournamentId]
    );
    // Fields depend on the sport: a team for football/cricket, Kata/Kumite for karate, pairs for badminton
    const rules = sportRules(selectedTournament?.sport);
    const needsPartner = rules.partnerEvents.includes(formData.eventType);

    // Pick valid defaults whenever the tournament (and so the sport) changes
    useEffect(() => {
      setFormData((prev) => ({
        ...prev,
        eventType: rules.events.includes(prev.eventType) ? prev.eventType : rules.events[rules.type === 'doubles' ? 1 : 0] || '',
        ageCategory: rules.ageCategories.includes(prev.ageCategory) ? prev.ageCategory : rules.ageCategories[0],
      }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTournament?.sport]);

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

    const registrationFee = Number((selectedTournament as any)?.registrationFee) > 0
      ? Number((selectedTournament as any).registrationFee)
      : settings.tournamentDefaultFee;

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
        setValidationSnack(rules.team ? 'Please fill the team name and phone number' : 'Please fill Tournament, Name, and Phone Number');
        return;
      }
      if (rules.team && !formData.captainName.trim()) {
        setValidationSnack("Please enter the captain's name");
        return;
      }
      if (needsPartner && !formData.partnerName.trim()) {
        setValidationSnack("Please enter your partner's name");
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
            partnerName: needsPartner ? formData.partnerName : '',
            captainName: rules.team ? formData.captainName : '',
            sex: rules.team ? undefined : formData.sex,
            ageCategory: formData.ageCategory,
            eventType: formData.eventType,
            paymentChoice: formData.paymentChoice,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setResult(data.data);
          setAlert({ type: 'success', message: 'Registration successful!' });
          if (formData.paymentChoice === 'pay_now' && data.data.registrationFee > 0) {
            setPayFor({ id: data.data.registrationId, fee: data.data.registrationFee, tournament: data.data.tournamentName });
          }
          setFormData((prev) => ({
            ...prev,
            name: '',
            phone: '',
            partnerName: '',
            captainName: '',
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
      <>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid #d7eef8',
          }}
        >
          {/* Banner themed by the chosen tournament's sport */}
          <Box sx={{ background: rules.gradient, color: '#fff', px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 4 }, position: 'relative', overflow: 'hidden' }}>
            <Box aria-hidden sx={{ position: 'absolute', right: { xs: -10, md: 20 }, top: '50%', transform: 'translateY(-50%) rotate(-12deg)', fontSize: { xs: '5rem', md: '7rem' }, opacity: 0.25, lineHeight: 1 }}>
              {rules.emoji}
            </Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
              <Box
                component="img"
                src="/sathiyanlogo.png"
                alt="Sathiyan Sports"
                sx={{ width: { xs: 64, md: 84 }, height: { xs: 64, md: 84 }, borderRadius: '50%', bgcolor: '#fff', p: 0.5, objectFit: 'contain', flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', opacity: 0.9 }}>
                  {rules.emoji} {rules.label} tournament registration
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.35rem', md: '1.8rem' }, lineHeight: 1.2 }}>
                  {selectedTournament?.name || 'Tournament registration'}
                </Typography>
                {selectedTournament && (
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    {new Date(selectedTournament.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {selectedTournament.venue}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>

          {/* Form content */}
          <Box sx={{ p: { xs: 2.5, md: 4 }, background: 'linear-gradient(160deg, #ffffff 0%, #f1fbff 100%)' }}>
          <Stack spacing={2.5}>

            {alert && (
              <div ref={alertRef}>
                <Alert
                  severity={alert.type}
                  sx={{
                    animation: 'alertPop 0.35s ease',
                    '@keyframes alertPop': {
                      '0%': { opacity: 0, transform: 'scale(0.97)' },
                      '100%': { opacity: 1, transform: 'scale(1)' },
                    },
                  }}
                >
                  {alert.message}
                </Alert>
              </div>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>Tournament</FormLabel>
                    <Select
                      value={formData.tournamentId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tournamentId: String(e.target.value) }))}
                    >
                      {tournaments.map((t) => (
                        <MenuItem key={t._id} value={t._id}>
                          {sportRules(t.sport).emoji} {t.name} • {new Date(t.startDate).toLocaleDateString('en-GB')} • {t.venue}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {rules.events.length > 0 && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <FormLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>Event</FormLabel>
                      <Select
                        value={formData.eventType}
                        onChange={(e) => setFormData((prev) => ({ ...prev, eventType: String(e.target.value) }))}
                      >
                        {rules.events.map((f) => (
                          <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={rules.team ? 'Team Name' : 'Your Name'}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Grid>

                {rules.team && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Captain's Name"
                      value={formData.captainName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, captainName: e.target.value }))}
                    />
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={rules.team ? "Captain's Phone Number" : 'Phone Number'}
                    type="tel"
                    inputProps={{ inputMode: 'tel' }}
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} md={rules.team ? 6 : 12}>
                  <TextField
                    fullWidth
                    label="Club Name"
                    placeholder="e.g. Sathiyan Multi Sport Club"
                    value={formData.clubName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clubName: e.target.value }))}
                    helperText="Optional — enter your club or academy name"
                  />
                </Grid>

                {needsPartner && (
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

                {!rules.team && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <FormLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>Sex</FormLabel>
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
                )}

                <Grid item xs={12} md={rules.team ? 12 : 6}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>{rules.team ? 'Category' : 'Age group'}</FormLabel>
                    <Select
                      value={formData.ageCategory}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ageCategory: String(e.target.value) }))}
                    >
                      {rules.ageCategories.map((c) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl>
                    <FormLabel sx={{ color: 'text.primary', fontWeight: 600 }}>Payment</FormLabel>
                    <RadioGroup
                      row
                      value={formData.paymentChoice}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paymentChoice: e.target.value }))}
                    >
                      <FormControlLabel value="pay_now" control={<Radio />} label={`Pay ₹${registrationFee} now by UPI`} />
                      <FormControlLabel value="pay_later" control={<Radio />} label="Pay at venue" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

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
                    Registration Fee: ₹{registrationFee}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {result && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Registration ID: {result.registrationId} | Payment: {result.paymentChoice === 'pay_now' ? 'UPI' : 'At venue'} | {result.category}
              </Alert>
            )}

            {payFor && (
              <UpiPaymentDialog
                open
                kind="tournament"
                refId={payFor.id}
                amount={payFor.fee}
                note={`Tournament ${payFor.tournament}`.slice(0, 60)}
                title="Pay registration fee"
                allowPayLater
                onClose={() => setPayFor(null)}
              />
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

      {/* Bottom popup for validation errors — more visible than the top alert */}
      <Snackbar
        open={!!validationSnack}
        autoHideDuration={5000}
        onClose={() => setValidationSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setValidationSnack(null)}
          sx={{ width: '100%', fontWeight: 700, fontSize: '0.95rem' }}
        >
          {validationSnack}
        </Alert>
      </Snackbar>
      </>
    );
  }
