"use client";

import React, { useState } from "react";
import { Alert, Box, Button, FormControlLabel, Grid, IconButton, InputAdornment, Stack, Switch, TextField, Typography } from "@mui/material";
import { Add, DeleteOutline } from "@mui/icons-material";
import { ClubProgram, slugify } from "../lib/clubs";

export interface ClubFormValues {
  name: string;
  slug: string;
  champIdPrefix: string;
  city: string;
  tagline: string;
  color: string;
  whatsappNumber: string;
  upi: { vpa: string; payeeName: string };
  programs: ClubProgram[];
  active: boolean;
}

export const EMPTY_CLUB: ClubFormValues = {
  name: "",
  slug: "",
  champIdPrefix: "",
  city: "",
  tagline: "",
  color: "#1565c0",
  whatsappNumber: "",
  upi: { vpa: "", payeeName: "" },
  programs: [{ key: "", name: "", monthly: 0, adultMonthly: undefined }],
  active: true,
};

/**
 * Club profile, payment details and coaching fees. `identity` shows the web address, member-ID
 * prefix and on/off switch, which only the owner sets (and which lock once the club has members).
 */
export default function ClubForm({
  initial,
  identity,
  identityLocked,
  submitLabel,
  onSubmit,
}: {
  initial: ClubFormValues;
  identity?: boolean;
  identityLocked?: boolean;
  submitLabel: string;
  onSubmit: (values: ClubFormValues) => Promise<string | null>; // returns an error message
}) {
  const [v, setV] = useState<ClubFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<ClubFormValues>) => {
    setV((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const setProgram = (i: number, patch: Partial<ClubProgram>) =>
    set({ programs: v.programs.map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  const submit = async () => {
    setSaving(true);
    setError("");
    const err = await onSubmit({ ...v, programs: v.programs.filter((p) => p.name.trim()) });
    setSaving(false);
    if (err) setError(err);
    else setSaved(true);
  };

  const num = (s: string) => (s === "" ? 0 : Math.max(0, Math.round(Number(s)) || 0));

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Saved</Alert>}

      <Typography variant="subtitle2" fontWeight={800}>Club</Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={7}>
          <TextField
            fullWidth
            label="Club name"
            value={v.name}
            onChange={(e) => set({ name: e.target.value, ...(identity && !identityLocked && !initial.slug && { slug: slugify(e.target.value) }) })}
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField fullWidth label="City / area" value={v.city} onChange={(e) => set({ city: e.target.value })} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Tagline (shown on the club page)" value={v.tagline} onChange={(e) => set({ tagline: e.target.value })} />
        </Grid>
        {identity && (
          <>
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                label="Web address"
                value={v.slug}
                disabled={identityLocked}
                onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                InputProps={{ startAdornment: <InputAdornment position="start">/club/</InputAdornment> }}
                helperText={identityLocked ? "Fixed once the club has members" : "Letters, numbers and dashes"}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Member ID prefix"
                value={v.champIdPrefix}
                disabled={identityLocked}
                onChange={(e) => set({ champIdPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) })}
                helperText={v.champIdPrefix ? `IDs like ${v.champIdPrefix}1001` : "2–4 letters"}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControlLabel control={<Switch checked={v.active} onChange={(e) => set({ active: e.target.checked })} />} label="Active" />
            </Grid>
          </>
        )}
        <Grid item xs={6} sm={3}>
          <TextField fullWidth type="color" label="Colour" value={v.color} onChange={(e) => set({ color: e.target.value })} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800}>Payments & WhatsApp</Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="UPI ID" placeholder="clubname@okaxis" value={v.upi.vpa} onChange={(e) => set({ upi: { ...v.upi, vpa: e.target.value.trim() } })} helperText="Members' fees are paid straight to this UPI ID" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Name on the UPI account" value={v.upi.payeeName} onChange={(e) => set({ upi: { ...v.upi, payeeName: e.target.value } })} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="WhatsApp number" inputProps={{ inputMode: "tel" }} value={v.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800}>Coaching fees (per month)</Typography>
      {v.programs.map((p, i) => (
        <Grid container spacing={1} key={i} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField fullWidth size="small" label="Programme" value={p.name} onChange={(e) => setProgram(i, { name: e.target.value })} />
          </Grid>
          <Grid item xs={5} sm={3}>
            <TextField fullWidth size="small" label="Kids ₹" inputProps={{ inputMode: "numeric" }} value={p.monthly || ""} onChange={(e) => setProgram(i, { monthly: num(e.target.value) })} />
          </Grid>
          <Grid item xs={5} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Adults ₹"
              placeholder="same"
              inputProps={{ inputMode: "numeric" }}
              value={p.adultMonthly ?? ""}
              onChange={(e) => setProgram(i, { adultMonthly: e.target.value === "" ? undefined : num(e.target.value) })}
            />
          </Grid>
          <Grid item xs={2} sm={1}>
            <IconButton aria-label="Remove programme" onClick={() => set({ programs: v.programs.filter((_, k) => k !== i) })}>
              <DeleteOutline />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Box>
        <Button startIcon={<Add />} onClick={() => set({ programs: [...v.programs, { key: "", name: "", monthly: 0 }] })}>
          Add programme
        </Button>
      </Box>

      <Button variant="contained" size="large" onClick={submit} disabled={saving || !v.name.trim()}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </Stack>
  );
}
