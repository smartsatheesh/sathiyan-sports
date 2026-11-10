"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, DeleteOutline, Edit, OpenInNew, PersonAdd } from "@mui/icons-material";
import ClubForm, { ClubFormValues, EMPTY_CLUB } from "../../components/ClubForm";

interface ClubRow extends ClubFormValues {
  _id: string;
  members: number;
  admins: { id: string; name: string; mobile: string }[];
}

// Owner only: partner clubs that use the app for their own memberships and fees.
export default function PartnerClubsPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ClubRow | "new" | null>(null);
  const [adminFor, setAdminFor] = useState<ClubRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/admin/clubs").then((r) => r.json());
      if (!d.success) throw new Error(d.error);
      setClubs(d.clubs);
    } catch (e: any) {
      setError(e.message || "Failed to load clubs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values: ClubFormValues) => {
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/admin/clubs" : `/api/admin/clubs/${(editing as ClubRow).slug}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const d = await res.json();
    if (!d.success) return d.error || "Failed to save";
    setEditing(null);
    load();
    return null;
  };

  const removeAdmin = async (club: ClubRow, adminId: string) => {
    if (!window.confirm(`Remove this admin's access to ${club.name}?`)) return;
    await fetch(`/api/admin/clubs/${club.slug}?admin=${adminId}`, { method: "DELETE" });
    load();
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Partner clubs</Typography>
          <Typography variant="body2" color="text.secondary">
            Other clubs run their memberships and fee collection here. Their members, fees and payments stay separate from Sathiyan&apos;s.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEditing("new")} sx={{ flexShrink: 0 }}>
          New club
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : clubs.length === 0 ? (
        <Alert severity="info">No partner clubs yet. Add one, then give it a club admin who collects its fees.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {clubs.map((c) => (
            <Card key={c._id} variant="outlined" sx={{ borderLeft: `5px solid ${c.color}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800}>{c.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[c.city, `${c.members} member${c.members === 1 ? "" : "s"}`, `IDs ${c.champIdPrefix}…`].filter(Boolean).join(" · ")}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
                      {!c.active && <Chip size="small" color="warning" label="Inactive" />}
                      {!c.upi?.vpa && <Chip size="small" color="error" variant="outlined" label="No UPI ID" />}
                      {c.programs.map((p) => (
                        <Chip key={p.key} size="small" variant="outlined" label={`${p.name} ₹${p.monthly}`} />
                      ))}
                    </Stack>
                  </Box>
                  <Stack direction="row">
                    <IconButton component={Link} href={`/club/${c.slug}`} target="_blank" aria-label="Open club page"><OpenInNew /></IconButton>
                    <IconButton onClick={() => setEditing(c)} aria-label="Edit club"><Edit /></IconButton>
                  </Stack>
                </Stack>

                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                  CLUB ADMINS
                </Typography>
                {c.admins.length === 0 && <Typography variant="body2" color="text.secondary">None yet</Typography>}
                {c.admins.map((a) => (
                  <Stack key={a.id} direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">{a.name} · {a.mobile}</Typography>
                    <IconButton size="small" aria-label={`Remove ${a.name}`} onClick={() => removeAdmin(c, a.id)}><DeleteOutline fontSize="small" /></IconButton>
                  </Stack>
                ))}
                <Button size="small" startIcon={<PersonAdd />} onClick={() => setAdminFor(c)} sx={{ mt: 0.5 }}>Add club admin</Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {editing && (
        <Dialog open onClose={() => setEditing(null)} fullScreen={fullScreen} maxWidth="sm" fullWidth>
          <DialogTitle>{editing === "new" ? "New partner club" : `Edit ${editing.name}`}</DialogTitle>
          <DialogContent dividers>
            <ClubForm
              initial={editing === "new" ? EMPTY_CLUB : editing}
              identity
              identityLocked={editing !== "new" && editing.members > 0}
              submitLabel={editing === "new" ? "Create club" : "Save"}
              onSubmit={save}
            />
          </DialogContent>
          <DialogActions><Button onClick={() => setEditing(null)}>Close</Button></DialogActions>
        </Dialog>
      )}

      {adminFor && <AddAdminDialog club={adminFor} fullScreen={fullScreen} onClose={() => setAdminFor(null)} onAdded={() => { setAdminFor(null); load(); }} />}
    </Container>
  );
}

function AddAdminDialog({ club, fullScreen, onClose, onAdded }: { club: ClubRow; fullScreen: boolean; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    setError("");
    const d = await fetch(`/api/admin/clubs/${club.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addAdmin", ...form }),
    }).then((r) => r.json());
    setSaving(false);
    if (d.success) onAdded();
    else setError(d.error || "Failed to add admin");
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>Club admin for {club.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            They sign in by choosing <b>{club.name}</b> on the login page, with this mobile and password, and can only see and collect this club&apos;s fees.
          </Typography>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Mobile" inputProps={{ inputMode: "tel" }} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <TextField label="Password" type="password" helperText="At least 6 characters — share it with them privately" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={add} disabled={saving}>Add admin</Button>
      </DialogActions>
    </Dialog>
  );
}
