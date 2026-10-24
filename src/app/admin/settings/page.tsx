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
  SUBSCRIPTION_TYPES,
  withDefaults,
  type PlanPrices,
} from "@/app/lib/pricing";
import { buildUpiUrl } from "@/app/lib/upi";
import { invalidateSiteSettings } from "@/app/hooks/useSiteSettings";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PLAN_ROWS: { key: "kids" | "adultMale" | "adultFemale"; label: string; hint: string }[] = [
  { key: "kids", label: "Kids", hint: "All kids, any time" },
  { key: "adultMale", label: "Adults", hint: "Regular adult price" },
  { key: "adultFemale", label: "Women (discount hours)", hint: "Women booking inside the discount window" },
];
const TYPE_LABEL: Record<string, string> = { monthly: "1 month", quarterly: "3 months", "half yearly": "6 months", yearly: "12 months" };

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

  const setPlan = (plan: "kids" | "adultMale" | "adultFemale", type: keyof PlanPrices, n: number) =>
    update((d) => { d.membership[plan][type] = n; });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: 12 }}>
      <Typography variant="h5" fontWeight={800}>Prices & settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Changes apply to the website, booking chatbot and new registrations within a minute. Existing members keep their current amount until renewal.
      </Typography>

      <Stack spacing={2}>
        <Section title="Court & venue prices" subtitle="Price per 30-minute slot (per hour for events). Turn a sport off to stop online bookings.">
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
                    <MoneyField label={`Weekday ${c.perHour ? "/ hour" : "/ 30 min"}`} value={c.weekday} onChange={(n) => update((d) => { d.courts[i].weekday = n; })} />
                  </Grid>
                  <Grid item xs={6}>
                    <MoneyField label={`Weekend ${c.perHour ? "/ hour" : "/ 30 min"}`} value={c.weekend} onChange={(n) => update((d) => { d.courts[i].weekend = n; })} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Weekend pricing applies on</Typography>
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

        <Section title="Membership fees" subtitle="Total price for each plan length. Used for new registrations and renewals.">
          <Stack spacing={2}>
            {PLAN_ROWS.map((row) => (
              <Box key={row.key}>
                <Typography fontWeight={600}>{row.label}</Typography>
                <Typography variant="caption" color="text.secondary">{row.hint}</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {SUBSCRIPTION_TYPES.map((t) => (
                    <Grid item xs={6} sm={3} key={t}>
                      <MoneyField label={TYPE_LABEL[t]} value={s.membership[row.key][t]} onChange={(n) => setPlan(row.key, t, n)} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}

            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Women's window from"
                  size="small"
                  fullWidth
                  type="number"
                  value={s.membership.womenWindow.startHour}
                  onChange={(e) => update((d) => { d.membership.womenWindow.startHour = Number(e.target.value); })}
                  InputProps={{ endAdornment: <InputAdornment position="end">:00</InputAdornment> }}
                  inputProps={{ min: 0, max: 23 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="until"
                  size="small"
                  fullWidth
                  type="number"
                  value={s.membership.womenWindow.endHour}
                  onChange={(e) => update((d) => { d.membership.womenWindow.endHour = Number(e.target.value); })}
                  InputProps={{ endAdornment: <InputAdornment position="end">:00</InputAdornment> }}
                  inputProps={{ min: 1, max: 24 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyField
                  label="Flexible timing surcharge per month"
                  value={s.membership.flexibleSurchargePerMonth}
                  onChange={(n) => update((d) => { d.membership.flexibleSurchargePerMonth = n; })}
                />
              </Grid>
            </Grid>
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
