"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Add, DeleteOutline, PhotoCamera } from "@mui/icons-material";
import { ClubFacility, ClubFeatures, ClubProgram, PARTNER_DEFAULT_FEATURES, slugify } from "../lib/clubs";
import { BASE_DOMAIN } from "../lib/tenant";
import { resizeImage } from "../lib/resizeImage";

export interface ClubFormValues {
  name: string;
  slug: string;
  champIdPrefix: string;
  city: string;
  tagline: string;
  color: string;
  accentColor: string;
  logo?: string | null; // data URL to set, null to remove, undefined = unchanged
  logoUrl?: string | null; // current logo (display only)
  location: { address: string; mapUrl: string };
  contact: { phone: string; email: string; instagram: string };
  facilities: ClubFacility[];
  whatsappNumber: string;
  upi: { vpa: string; payeeName: string };
  programs: ClubProgram[];
  features: ClubFeatures;
  plan: string;
  planPaidTill: string; // yyyy-mm-dd or ""
  customDomain: string;
  active: boolean;
}

export const EMPTY_CLUB: ClubFormValues = {
  name: "",
  slug: "",
  champIdPrefix: "",
  city: "",
  tagline: "",
  color: "#1565c0",
  accentColor: "#ffc400",
  logoUrl: null,
  location: { address: "", mapUrl: "" },
  contact: { phone: "", email: "", instagram: "" },
  facilities: [],
  whatsappNumber: "",
  upi: { vpa: "", payeeName: "" },
  programs: [{ key: "", name: "", monthly: 0, adultMonthly: undefined }],
  features: PARTNER_DEFAULT_FEATURES,
  plan: "trial",
  planPaidTill: "",
  customDomain: "",
  active: true,
};

const FEATURE_LABELS: Record<keyof ClubFeatures, string> = {
  memberships: "Memberships & fees",
  attendance: "Attendance (QR check-in)",
  bookings: "Court booking (coming soon)",
  tournaments: "Tournaments (coming soon)",
  shop: "Shop (coming soon)",
  coach: "AI coach (coming soon)",
};
const PLANS = [
  { value: "trial", label: "Trial (free)" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
];

/**
 * Club profile, branding, location, facilities, payment details and coaching fees. `identity`
 * shows the web address, member-ID prefix, features, plan and on/off switch, which only the
 * owner sets (address and prefix lock once the club has members).
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
  const [v, setV] = useState<ClubFormValues>({ ...EMPTY_CLUB, ...initial, planPaidTill: initial.planPaidTill ? String(initial.planPaidTill).slice(0, 10) : "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<ClubFormValues>) => {
    setV((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const setProgram = (i: number, patch: Partial<ClubProgram>) =>
    set({ programs: v.programs.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const setFacility = (i: number, patch: Partial<ClubFacility>) =>
    set({ facilities: v.facilities.map((f, k) => (k === i ? { ...f, ...patch } : f)) });

  const pickLogo = async (file?: File) => {
    if (!file) return;
    try {
      // Small square-ish logo; the browser shrinks it so the upload stays tiny
      set({ logo: await resizeImage(file, 256, 0.85) });
    } catch {
      setError("Could not read that image");
    }
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const err = await onSubmit({ ...v, programs: v.programs.filter((p) => p.name.trim()), facilities: v.facilities.filter((f) => f.name.trim()) });
    setSaving(false);
    if (err) setError(err);
    else setSaved(true);
  };

  const num = (s: string) => (s === "" ? 0 : Math.max(0, Math.round(Number(s)) || 0));
  const logoPreview = v.logo === null ? null : v.logo || v.logoUrl || null;

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
          <TextField fullWidth label="Tagline (shown on the club's home page)" value={v.tagline} onChange={(e) => set({ tagline: e.target.value })} />
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
                InputProps={{ endAdornment: <InputAdornment position="end">.{BASE_DOMAIN}</InputAdornment> }}
                helperText={identityLocked ? "Fixed once the club has members" : "Letters, numbers and dashes — the club's own site"}
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
      </Grid>

      <Typography variant="subtitle2" fontWeight={800}>Branding</Typography>
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} sm={4}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: v.color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <Typography sx={{ color: "#fff", fontWeight: 900 }}>{(v.name || "?").slice(0, 1).toUpperCase()}</Typography>
              )}
            </Box>
            <Stack spacing={0.5}>
              <Button component="label" size="small" startIcon={<PhotoCamera />} variant="outlined">
                {logoPreview ? "Change logo" : "Upload logo"}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </Button>
              {logoPreview && (
                <Button size="small" color="inherit" onClick={() => set({ logo: null })}>
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth type="color" label="Header colour" value={v.color} onChange={(e) => set({ color: e.target.value })} helperText="Top bar and buttons" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth type="color" label="Accent colour" value={v.accentColor} onChange={(e) => set({ accentColor: e.target.value })} helperText="Highlights" />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800}>Location & contact</Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={7}>
          <TextField fullWidth label="Address" value={v.location.address} onChange={(e) => set({ location: { ...v.location, address: e.target.value } })} />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField fullWidth label="Google Maps link" placeholder="https://maps.app.goo.gl/…" value={v.location.mapUrl} onChange={(e) => set({ location: { ...v.location, mapUrl: e.target.value.trim() } })} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="WhatsApp number" inputProps={{ inputMode: "tel" }} value={v.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} helperText="Members message this number" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Phone (shown on the site)" inputProps={{ inputMode: "tel" }} value={v.contact.phone} onChange={(e) => set({ contact: { ...v.contact, phone: e.target.value } })} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Email" type="email" value={v.contact.email} onChange={(e) => set({ contact: { ...v.contact, email: e.target.value } })} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Instagram" value={v.contact.instagram} onChange={(e) => set({ contact: { ...v.contact, instagram: e.target.value } })} InputProps={{ startAdornment: <InputAdornment position="start">@</InputAdornment> }} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800}>Facilities</Typography>
      {v.facilities.map((f, i) => (
        <Grid container spacing={1} key={i} alignItems="center">
          <Grid item xs={3} sm={1.5}>
            <TextField fullWidth size="small" label="Icon" value={f.emoji} onChange={(e) => setFacility(i, { emoji: e.target.value.slice(0, 8) })} />
          </Grid>
          <Grid item xs={9} sm={3.5}>
            <TextField fullWidth size="small" label="Facility" placeholder="Badminton courts" value={f.name} onChange={(e) => setFacility(i, { name: e.target.value })} />
          </Grid>
          <Grid item xs={10} sm={6}>
            <TextField fullWidth size="small" label="Details" placeholder="3 wooden courts, floodlit" value={f.description} onChange={(e) => setFacility(i, { description: e.target.value })} />
          </Grid>
          <Grid item xs={2} sm={1}>
            <IconButton aria-label="Remove facility" onClick={() => set({ facilities: v.facilities.filter((_, k) => k !== i) })}>
              <DeleteOutline />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Box>
        <Button startIcon={<Add />} onClick={() => set({ facilities: [...v.facilities, { name: "", emoji: "🏟️", description: "" }] })}>
          Add facility
        </Button>
      </Box>

      <Typography variant="subtitle2" fontWeight={800}>Fee payments (UPI)</Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="UPI ID" placeholder="clubname@okaxis" value={v.upi.vpa} onChange={(e) => set({ upi: { ...v.upi, vpa: e.target.value.trim() } })} helperText="Members' fees are paid straight to this UPI ID" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Name on the UPI account" value={v.upi.payeeName} onChange={(e) => set({ upi: { ...v.upi, payeeName: e.target.value } })} />
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

      {identity && (
        <>
          <Typography variant="subtitle2" fontWeight={800}>Features & plan (owner only)</Typography>
          <Grid container spacing={1}>
            {(Object.keys(FEATURE_LABELS) as (keyof ClubFeatures)[]).map((k) => (
              <Grid item xs={12} sm={6} key={k}>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(v.features[k])} onChange={(e) => set({ features: { ...v.features, [k]: e.target.checked } })} />}
                  label={FEATURE_LABELS[k]}
                />
              </Grid>
            ))}
            <Grid item xs={6} sm={4}>
              <TextField select fullWidth label="Plan" value={v.plan} onChange={(e) => set({ plan: e.target.value })}>
                {PLANS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth type="date" label="Paid till" InputLabelProps={{ shrink: true }} value={v.planPaidTill} onChange={(e) => set({ planPaidTill: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Own domain (optional)" placeholder="coolclub.com" value={v.customDomain} onChange={(e) => set({ customDomain: e.target.value.trim().toLowerCase() })} helperText="Needs a DNS mapping — ask Sathiyan" />
            </Grid>
          </Grid>
        </>
      )}

      <Button variant="contained" size="large" onClick={submit} disabled={saving || !v.name.trim()}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </Stack>
  );
}
