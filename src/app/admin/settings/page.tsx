"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import QRCode from "react-qr-code";
import {
  DEFAULT_SETTINGS,
  SiteSettings,
  withDefaults,
  type Holiday,
} from "@/app/lib/pricing";
import { buildUpiUrl } from "@/app/lib/upi";
import { invalidateSiteSettings } from "@/app/hooks/useSiteSettings";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <TextField
      label={label}
      size="small"
      fullWidth
      type="number"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
      inputProps={{ min: 0, inputMode: "numeric" }}
      error={!Number.isFinite(value) || value < 0}
    />
  );
}

function ChipListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 1 }}>
        {values.map((v) => (
          <Chip key={v} label={v} onDelete={values.length > 1 ? () => onChange(values.filter((x) => x !== v)) : undefined} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add new"
          value={draft}
          inputProps={{ maxLength: 40 }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outlined" onClick={add} disabled={!draft.trim()}>Add</Button>
      </Stack>
    </Box>
  );
}

function HolidayEditor({ holidays, onChange }: { holidays: Holiday[]; onChange: (h: Holiday[]) => void }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const add = () => {
    if (!date || !name.trim()) return;
    onChange([...holidays.filter((h) => h.date !== date), { date, name: name.trim().slice(0, 40) }]);
    setDate("");
    setName("");
  };
  return (
    <Box>
      <Stack spacing={0.75} sx={{ mb: 2, maxHeight: 260, overflowY: "auto" }}>
        {upcoming.length === 0 && <Typography variant="body2" color="text.secondary">No holidays added.</Typography>}
        {upcoming.map((h) => (
          <Stack key={h.date} direction="row" alignItems="center" spacing={1} sx={{ opacity: h.date < today ? 0.5 : 1 }}>
            <Typography variant="body2" sx={{ width: 110, fontVariantNumeric: "tabular-nums" }}>
              {new Date(h.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Typography>
            <Typography variant="body2" sx={{ flex: 1 }}>{h.name}</Typography>
            <Button size="small" color="inherit" onClick={() => onChange(holidays.filter((x) => x.date !== h.date))}>Remove</Button>
          </Stack>
        ))}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField size="small" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} label="Date" />
        <TextField size="small" fullWidth label="Holiday name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deepavali" />
        <Button variant="outlined" onClick={add} disabled={!date || !name.trim()}>Add</Button>
      </Stack>
    </Box>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const [s, setS] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setS(withDefaults(d.settings)))
      .catch(() => setError("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const update = (fn: (draft: SiteSettings) => void) => {
    setS((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setS(withDefaults(data.settings));
      invalidateSiteSettings(withDefaults(data.settings));
      setDirty(false);
      setSaved(true);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: 12 }}>
      <Typography variant="h5" fontWeight={800}>Prices & settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Changes apply to the website, booking chatbot and new registrations within a minute. Existing members keep their current amount until renewal.
      </Typography>

      <Stack spacing={2}>
        <Section title="Court & venue prices" subtitle="Price per hour. Courts are booked in 30-minute slots, which cost half the hourly price. Turn a sport off to stop online bookings.">
          <Stack spacing={2}>
            {s.courts.map((c, i) => (
              <Paper key={c.sport} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography fontWeight={600}>{c.sport}</Typography>
                  <Stack direction="row" alignItems="center">
                    <Typography variant="caption" color="text.secondary">{c.active ? "Bookable" : "Hidden"}</Typography>
                    <Switch checked={c.active} onChange={(e) => update((d) => { d.courts[i].active = e.target.checked; })} />
                  </Stack>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <MoneyField label={c.perPerson ? "Weekday / person / hr" : "Weekday / hour"} value={c.weekday} onChange={(n) => update((d) => { d.courts[i].weekday = n; })} />
                  </Grid>
                  <Grid item xs={6}>
                    <MoneyField label={c.perPerson ? "Weekend / person / hr" : "Weekend & holiday / hour"} value={c.weekend} onChange={(n) => update((d) => { d.courts[i].weekend = n; })} />
                  </Grid>
                  {!c.perHour && !c.perPerson && (
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={(c.weekdayBlockHours || 0) >= 2}
                            onChange={(e) => update((d) => { d.courts[i].weekdayBlockHours = e.target.checked ? 2 : 0; })}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Weekdays: sell in 2-hour blocks (1 hour free){(c.weekdayBlockHours || 0) >= 2 ? ` — ₹${(c.weekday * 2).toLocaleString("en-IN")} per 2 hours` : ""}
                          </Typography>
                        }
                      />
                    </Grid>
                  )}
                  {c.perPerson && (
                    <>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth type="number" label="Minimum people" value={c.minPeople ?? 1}
                          onChange={(e) => update((d) => { d.courts[i].minPeople = Number(e.target.value); })} inputProps={{ min: 1 }} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth type="number" label="Maximum people" value={c.maxPeople ?? 12}
                          onChange={(e) => update((d) => { d.courts[i].maxPeople = Number(e.target.value); })} inputProps={{ min: 1 }} />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <TextField size="small" fullWidth label="Note shown with the price (optional)" placeholder="e.g. per court, up to 4 players"
                      value={c.note || ""} onChange={(e) => update((d) => { d.courts[i].note = e.target.value.slice(0, 60); })} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Weekend pricing applies on (plus the holidays below)</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            {DAYS.map((label, day) => {
              const on = s.weekendDays.includes(day);
              return (
                <Chip
                  key={label}
                  label={label}
                  color={on ? "primary" : "default"}
                  variant={on ? "filled" : "outlined"}
                  onClick={() => update((d) => {
                    d.weekendDays = on ? d.weekendDays.filter((x) => x !== day) : [...d.weekendDays, day].sort();
                  })}
                />
              );
            })}
          </Stack>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Extras</Typography>
          <Grid container spacing={1.5}>
            {s.extras.map((e, i) => (
              <Grid item xs={6} key={e.key}>
                <MoneyField label={`${e.name} (each)`} value={e.price} onChange={(n) => update((d) => { d.extras[i].price = n; })} />
              </Grid>
            ))}
          </Grid>
        </Section>

        <Section title="Holidays" subtitle="Public and local holidays are charged at the weekend price. Add festivals each year (Pongal, Ramzan, Vinayakar Chathurthi, Deepavali…).">
          <HolidayEditor holidays={s.holidays} onChange={(list) => update((d) => { d.holidays = list; })} />
        </Section>

        <Section title="Coaching fees (monthly)" subtitle="Per person per month for each coaching programme, for kids and for adults & veterans — separate from court booking prices. 3, 6 and 12-month plans are this × months. Members default to the programme for their sport.">
          <Stack spacing={1.5}>
            {s.membership.programs.map((p, i) => (
              <Grid container spacing={1.5} key={p.key} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField size="small" fullWidth label="Programme" value={p.name}
                    onChange={(e) => update((d) => { d.membership.programs[i].name = e.target.value.slice(0, 50); })} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <MoneyField label="Kids / month" value={p.monthly} onChange={(n) => update((d) => { d.membership.programs[i].monthly = n; })} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <MoneyField label="Adults & veterans / month" value={p.adultMonthly ?? p.monthly} onChange={(n) => update((d) => { d.membership.programs[i].adultMonthly = n; })} />
                </Grid>
              </Grid>
            ))}
            <Box>
              <Button size="small" onClick={() => update((d) => {
                d.membership.programs.push({ key: `program-${Date.now().toString(36)}`, name: "New programme", monthly: 0, adultMonthly: 0 });
              })}>
                + Add programme
              </Button>
            </Box>
            <Box sx={{ maxWidth: 320 }}>
              <MoneyField label="Flexible timing extra per month (0 = none)" value={s.membership.flexibleSurchargePerMonth} onChange={(n) => update((d) => { d.membership.flexibleSurchargePerMonth = n; })} />
            </Box>
          </Stack>
        </Section>

        <Section title="Tournaments" subtitle="Used when a tournament does not have its own entry fee.">
          <Box sx={{ maxWidth: 240 }}>
            <MoneyField label="Default entry fee" value={s.tournamentDefaultFee} onChange={(n) => update((d) => { d.tournamentDefaultFee = n; })} />
          </Box>
        </Section>

        <Section title="Expenses" subtitle="Names and categories shown when adding an expense. Old entries keep their values.">
          <Stack spacing={2.5}>
            <ChipListEditor label="Paid by" values={s.expenses.people} onChange={(v) => update((d) => { d.expenses.people = v; })} />
            <ChipListEditor label="Categories" values={s.expenses.categories} onChange={(v) => update((d) => { d.expenses.categories = v; })} />
          </Stack>
        </Section>

        <Section title="UPI & WhatsApp" subtitle="Customers pay to this UPI ID. A UPI Business / merchant ID avoids app payment limits.">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={7}>
              <Stack spacing={1.5}>
                <TextField label="UPI ID" size="small" fullWidth value={s.upi.vpa} onChange={(e) => update((d) => { d.upi.vpa = e.target.value.trim(); })} />
                <TextField label="Payee name" size="small" fullWidth value={s.upi.payeeName} onChange={(e) => update((d) => { d.upi.payeeName = e.target.value; })} />
                <TextField
                  label="WhatsApp number"
                  size="small"
                  fullWidth
                  value={s.whatsappNumber}
                  onChange={(e) => update((d) => { d.whatsappNumber = e.target.value; })}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ inputMode: "tel" }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={5} sx={{ textAlign: "center" }}>
              <Box sx={{ display: "inline-block", p: 1.5, bgcolor: "#fff", borderRadius: 2, border: 1, borderColor: "divider" }}>
                <QRCode value={buildUpiUrl({ vpa: s.upi.vpa, payeeName: s.upi.payeeName, amount: 1, note: "Test" })} size={120} />
              </Box>
              <Typography variant="caption" display="block" color="text.secondary">Scan to test with ₹1</Typography>
            </Grid>
          </Grid>
        </Section>
      </Stack>

      {/* Sticky save bar, thumb-reachable on phones */}
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          p: 1.5,
          pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
          zIndex: 1100,
        }}
      >
        <Container maxWidth="md">
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            disabled={!dirty || saving}
            onClick={save}
          >
            {dirty ? "Save changes" : "All changes saved"}
          </Button>
        </Container>
      </Paper>

      <Snackbar open={saved} autoHideDuration={2500} onClose={() => setSaved(false)} message="Prices updated" />
    </Container>
  );
}
