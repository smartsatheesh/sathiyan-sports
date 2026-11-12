"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowForward, CalendarMonth, EmojiEvents, Groups, SelfImprovement, SportsCricket, SportsMartialArts, SportsSoccer, SportsTennis } from "@mui/icons-material";

interface Tournament {
  _id: string;
  name: string;
  sport?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  playersCount?: number;
  matchesCount?: number;
}

import { TOURNAMENT_SPORTS } from "../lib/tournamentSports";

const GRADIENT: Record<string, string> = {
  badminton: "linear-gradient(135deg, #3a1c71 0%, #d76d77 60%, #ffaf7b 100%)",
  football: "linear-gradient(135deg, #0f2027 0%, #1f8f3a 100%)",
  cricket: "linear-gradient(135deg, #05233a 0%, #1565c0 100%)",
  karate: TOURNAMENT_SPORTS.karate.gradient,
  silambam: TOURNAMENT_SPORTS.silambam.gradient,
  taekwondo: TOURNAMENT_SPORTS.taekwondo.gradient,
  yoga: TOURNAMENT_SPORTS.yoga.gradient,
};
const ICON: Record<string, React.ReactNode> = {
  badminton: <SportsTennis />,
  football: <SportsSoccer />,
  cricket: <SportsCricket />,
  karate: <SportsMartialArts />,
  silambam: <SportsMartialArts />,
  taekwondo: <SportsMartialArts />,
  yoga: <SelfImprovement />,
};
const STATUS_ORDER = ["ongoing", "upcoming", "completed"];
const STATUS_LABEL: Record<string, string> = { ongoing: "Live now", upcoming: "Upcoming", completed: "Completed" };

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetch("/api/tournaments-native")
      .then((r) => r.json())
      .then((d) => setTournaments(d.tournaments || []))
      .finally(() => setLoading(false));
  }, []);

  const sports = useMemo(() => Array.from(new Set(tournaments.map((t) => (t.sport || "").toLowerCase()).filter(Boolean))), [tournaments]);
  const visible = tournaments
    .filter((t) => sport === "all" || (t.sport || "").toLowerCase() === sport)
    .filter((t) => status === "all" || t.status === status)
    .sort((a, b) => (STATUS_ORDER.indexOf(a.status || "") + 1 || 9) - (STATUS_ORDER.indexOf(b.status || "") + 1 || 9) || new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());

  return (
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100vh", pb: 6 }}>
      <Box sx={{ background: "linear-gradient(135deg, #071a2e 0%, #0d6e8a 100%)", color: "#fff", py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#ffc400", mb: 1 }}>
            <EmojiEvents />
            <Typography sx={{ fontWeight: 800, letterSpacing: 2, fontSize: 13 }}>COMPETE</Typography>
          </Stack>
          <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: "2rem", md: "2.8rem" }, lineHeight: 1.1 }}>Tournaments</Typography>
          <Typography sx={{ opacity: 0.9, mt: 1 }}>Fixtures, brackets, live scores and results — right on your phone.</Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, overflowX: "auto", pb: 0.5 }}>
          {["all", "ongoing", "upcoming", "completed"].map((s) => (
            <Chip key={s} label={s === "all" ? "All" : STATUS_LABEL[s]} color={status === s ? "primary" : "default"} variant={status === s ? "filled" : "outlined"} onClick={() => setStatus(s)} />
          ))}
        </Stack>
        {sports.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
            {["all", ...sports].map((s) => (
              <Chip key={s} label={s === "all" ? "All sports" : s[0].toUpperCase() + s.slice(1)} size="small" color={sport === s ? "secondary" : "default"} variant={sport === s ? "filled" : "outlined"} onClick={() => setSport(s)} />
            ))}
          </Stack>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : visible.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>No tournaments here yet — check back soon!</Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {visible.map((t) => {
              const key = (t.sport || "").toLowerCase();
              const teams = t.playersCount;
              return (
                <Grid item xs={12} sm={6} key={t._id}>
                  <Card sx={{ borderRadius: 4, overflow: "hidden", height: "100%", boxShadow: "0 8px 30px rgba(7,26,46,0.08)" }}>
                    <CardActionArea component={Link} href={`/tournaments/${t._id}`} sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                      <Box sx={{ background: GRADIENT[key] || GRADIENT.badminton, color: "#fff", p: 2, minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ display: "flex", opacity: 0.9 }}>{ICON[key] || <EmojiEvents />}</Box>
                          {t.status && (
                            <Chip size="small" label={STATUS_LABEL[t.status] || t.status} sx={{ bgcolor: t.status === "ongoing" ? "#ff1744" : "rgba(0,0,0,0.35)", color: "#fff", fontWeight: 800 }} />
                          )}
                        </Stack>
                        <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", lineHeight: 1.2, mt: 1 }}>{t.name}</Typography>
                      </Box>
                      <Box sx={{ p: 2, flex: 1 }}>
                        <Stack spacing={0.75} color="text.secondary">
                          {t.startDate && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarMonth fontSize="small" />
                              <Typography variant="body2">{fmt(t.startDate)}{t.endDate && t.endDate !== t.startDate ? ` – ${fmt(t.endDate)}` : ""}</Typography>
                            </Stack>
                          )}
                          {teams !== undefined && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Groups fontSize="small" />
                              <Typography variant="body2">{teams} teams{t.type ? ` · ${t.type}` : ""}</Typography>
                            </Stack>
                          )}
                        </Stack>
                        <Typography sx={{ mt: 1.5, fontWeight: 800, color: "primary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
                          {t.status === "upcoming" ? "View & register" : t.status === "completed" ? "See results" : "Follow live"} <ArrowForward fontSize="small" />
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button component={Link} href="/tournaments/register" variant="outlined" size="large">Register for a tournament</Button>
        </Box>
      </Container>
    </Box>
  );
}
