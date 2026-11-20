"use client";

// Sathiyan Finance rules (owner only): default interest by tenure, instalment counts, rounding,
// the penalty for late payment, and the WhatsApp texts. Separate from the club's prices.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import { canManageFinance } from "@/app/lib/roles";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  FinanceSettings,
  PENALTY_MODE_LABELS,
  PenaltyMode,
  TEMPLATE_VARS,
  installmentPlan,
  validateFinanceSettings,
} from "@/app/lib/finance";

export default function FinanceSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const [s, setS] = useState<FinanceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/auth/login?callbackUrl=/admin/finance/settings");
    else if (!canManageFinance(role)) router.push("/admin/finance");
  }, [status, session, role, router]);

  useEffect(() => {
    if (status !== "authenticated" || !canManageFinance(role)) return;
    fetch("/api/admin/finance/settings")
      .then((r) => r.json())
      .then((d) => (d.success ? setS(d.settings) : setMsg({ type: "error", text: d.error || "Could not load" })))
      .catch(() => setMsg({ type: "error", text: "Could not load the settings" }));
  }, [status, role]);

  const save = async () => {
    if (!s) return;
    const errors = validateFinanceSettings(s);
    if (errors.length) return setMsg({ type: "error", text: errors[0] });
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Could not save");
      setS(d.settings);
      setMsg({ type: "success", text: "Saved" });
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <Container sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress /></Container>;

  const num = (v: string) => (v === "" ? NaN : Number(v));
  const example = installmentPlan(10000, s.rates.daily, s.tenures.daily, s.roundTo);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton component={Link} href="/admin/finance" aria-label="Back"><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>Finance settings</Typography>
          <Typography variant="body2" color="text.secondary">Defaults for new loans, the late penalty and the WhatsApp texts</Typography>
        </Box>
        <Button variant="contained" startIcon={<Save />} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </Stack>

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField label="Business name" value={s.businessName} onChange={(e) => setS({ ...s, businessName: e.target.value })} fullWidth size="small" helperText="Shown on the page and in WhatsApp messages" />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>Default interest and tenure</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Daily and weekly thavanai use a flat % of the amount for the whole tenure. Monthly and yearly loans charge the % every period. Each loan can still be given at its own rate, and a person can have a personal rate.
          </Typography>
          <Grid container spacing={1.5}>
            {FREQUENCIES.map((f) => (
              <React.Fragment key={f}>
                <Grid item xs={6}>
                  <TextField
                    label={`${FREQUENCY_LABELS[f]} rate`}
                    type="number"
                    size="small"
                    fullWidth
                    value={Number.isFinite(s.rates[f]) ? s.rates[f] : ""}
                    onChange={(e) => setS({ ...s, rates: { ...s.rates, [f]: num(e.target.value) } })}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ min: 0, max: 100, step: 0.5, inputMode: "decimal" }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={`${FREQUENCY_LABELS[f]} instalments`}
                    type="number"
                    size="small"
                    fullWidth
                    value={Number.isFinite(s.tenures[f]) ? s.tenures[f] : ""}
                    onChange={(e) => setS({ ...s, tenures: { ...s.tenures, [f]: num(e.target.value) } })}
                    inputProps={{ min: 1, max: 1000, inputMode: "numeric" }}
                  />
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={6}>
              <TextField select label="Round instalments to" size="small" fullWidth value={s.roundTo} onChange={(e) => setS({ ...s, roundTo: Number(e.target.value) })}>
                {[1, 5, 10, 50, 100].map((r) => <MenuItem key={r} value={r}>{r === 1 ? "Exact rupee" : `₹${r}`}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Example: ₹10,000 daily → {s.tenures.daily} × ₹{example.installmentAmount.toLocaleString("en-IN")} = ₹{example.totalRepayable.toLocaleString("en-IN")}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>Late penalty</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Added on top of what is overdue once the grace days pass. It shows on the loan as "penalty due"; staff record it when it is actually collected.
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField select label="Rule" size="small" fullWidth value={s.penalty.mode} onChange={(e) => setS({ ...s, penalty: { ...s.penalty, mode: e.target.value as PenaltyMode } })}>
                {(Object.keys(PENALTY_MODE_LABELS) as PenaltyMode[]).map((m) => <MenuItem key={m} value={m}>{PENALTY_MODE_LABELS[m]}</MenuItem>)}
              </TextField>
            </Grid>
            {s.penalty.mode !== "none" && (
              <>
                <Grid item xs={4}>
                  <TextField
                    label={s.penalty.mode.startsWith("percent") ? "Percent" : "Amount"}
                    type="number"
                    size="small"
                    fullWidth
                    value={Number.isFinite(s.penalty.value) ? s.penalty.value : ""}
                    onChange={(e) => setS({ ...s, penalty: { ...s.penalty, value: num(e.target.value) } })}
                    InputProps={s.penalty.mode.startsWith("percent") ? { endAdornment: <InputAdornment position="end">%</InputAdornment> } : { startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.5, inputMode: "decimal" }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Grace days" type="number" size="small" fullWidth value={Number.isFinite(s.penalty.graceDays) ? s.penalty.graceDays : ""} onChange={(e) => setS({ ...s, penalty: { ...s.penalty, graceDays: num(e.target.value) } })} inputProps={{ min: 0, max: 365, inputMode: "numeric" }} />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Cap (% of overdue)" type="number" size="small" fullWidth value={Number.isFinite(s.penalty.maxPercent) ? s.penalty.maxPercent : ""} onChange={(e) => setS({ ...s, penalty: { ...s.penalty, maxPercent: num(e.target.value) } })} inputProps={{ min: 0, max: 1000, inputMode: "numeric" }} helperText="0 = no cap" />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>WhatsApp messages</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Opened in WhatsApp with the words filled in. You can use:
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mb: 1.5 }}>
            {TEMPLATE_VARS.map((v) => <Chip key={v} size="small" label={v} />)}
          </Stack>
          <Stack spacing={1.5}>
            <TextField label="Reminder (due soon / today)" value={s.whatsapp.reminder} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, reminder: e.target.value } })} fullWidth multiline minRows={2} size="small" />
            <TextField label="Overdue notice" value={s.whatsapp.overdue} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, overdue: e.target.value } })} fullWidth multiline minRows={2} size="small" />
            <TextField label="Receipt (after money is received)" value={s.whatsapp.receipt} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, receipt: e.target.value } })} fullWidth multiline minRows={2} size="small" />
          </Stack>
        </Paper>

        <Button variant="contained" startIcon={<Save />} onClick={save} disabled={saving} size="large">{saving ? "Saving…" : "Save settings"}</Button>
      </Stack>
    </Container>
  );
}
