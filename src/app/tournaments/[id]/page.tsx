"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  CalendarMonth,
  EmojiEvents,
  Groups,
  LocationOn,
  Share,
  SportsCricket,
  SportsMartialArts,
  SelfImprovement,
  SportsSoccer,
  SportsTennis,
} from "@mui/icons-material";
import TournamentBracket from "../../components/TournamentBracket";
import LeagueTable from "../../components/LeagueTable";
import { leagueFinished, leagueTable, qualifierCount } from "../../lib/league";
import { TOURNAMENT_SPORTS, sportRules } from "../../lib/tournamentSports";

interface Tournament {
  _id: string;
  name: string;
  sport?: string;
  type?: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  categories?: string[];
  format?: "knockout" | "league" | "league_knockout";
  qualifiers?: number;
}

interface Match {
  _id: string;
  matchNumber: number;
  round: string;
  category?: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  player1Name: string;
  player2Name: string;
  player1Partner?: string;
  player2Partner?: string;
  courtNumber?: string;
  scheduledTime?: string;
  winnerName?: string;
  score?: { player1Sets: number; player2Sets: number; sets?: { set: number; player1Score: number; player2Score: number }[] };
  liveScore?: { currentSet: number; player1CurrentScore: number; player2CurrentScore: number } | null;
  nextMatchNumber?: number | null;
  stage?: "league" | "knockout";
}

interface Player {
  _id: string;
  name: string;
  partnerName?: string;
  category?: string;
}

const ROUND_ORDER = ["Preliminary", "Round of 64", "Round of 32", "Round of 16", "Quarter Final", "Semi Final", "Final"];
// League matchdays first (in order), then the knockout rounds
const roundRank = (r: string) => {
  const day = /^Matchday (\d+)$/.exec(r);
  if (day) return Number(day[1]);
  return 1000 + (ROUND_ORDER.indexOf(r) + 1 || 99);
};
const SPORT_THEME: Record<string, { icon: React.ReactNode; gradient: string }> = {
  badminton: { icon: <SportsTennis />, gradient: "linear-gradient(135deg, #3a1c71 0%, #d76d77 60%, #ffaf7b 100%)" },
  football: { icon: <SportsSoccer />, gradient: "linear-gradient(135deg, #0f2027 0%, #1f8f3a 100%)" },
  cricket: { icon: <SportsCricket />, gradient: "linear-gradient(135deg, #05233a 0%, #1565c0 100%)" },
  karate: { icon: <SportsMartialArts />, gradient: TOURNAMENT_SPORTS.karate.gradient },
  silambam: { icon: <SportsMartialArts />, gradient: TOURNAMENT_SPORTS.silambam.gradient },
  taekwondo: { icon: <SportsMartialArts />, gradient: TOURNAMENT_SPORTS.taekwondo.gradient },
  yoga: { icon: <SelfImprovement />, gradient: TOURNAMENT_SPORTS.yoga.gradient },
};
const STATUS_COLOR: Record<string, "error" | "warning" | "success" | "default"> = { ongoing: "error", live: "error", upcoming: "warning", completed: "success" };

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const team = (name: string, partner?: string) => (partner ? `${name} / ${partner}` : name);

function MatchRow({ m }: { m: Match }) {
  const live = m.status === "live";
  const done = m.status === "completed";
  const sets = m.score?.sets?.filter((s) => s.player1Score || s.player2Score) || [];
  const rows = [
    { name: m.player1Name, partner: m.player1Partner, setsWon: m.score?.player1Sets ?? 0, side: "player1Score" as const, live: m.liveScore?.player1CurrentScore },
    { name: m.player2Name, partner: m.player2Partner, setsWon: m.score?.player2Sets ?? 0, side: "player2Score" as const, live: m.liveScore?.player2CurrentScore },
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: live ? "error.main" : "divider", borderWidth: live ? 2 : 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, pt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Match {m.matchNumber}
          {m.courtNumber && ` · Court ${m.courtNumber}`}
          {m.scheduledTime && ` · ${new Date(m.scheduledTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
        </Typography>
        {live ? (
          <Chip size="small" color="error" label="LIVE" sx={{ fontWeight: 800, animation: "pulse 1.5s infinite", "@keyframes pulse": { "50%": { opacity: 0.55 } } }} />
        ) : done ? (
          <Chip size="small" label={m.stage === "league" && !m.winnerName ? "Draw" : sets.length === 0 ? "FT" : "Final"} variant="outlined" />
        ) : null}
      </Stack>
      <Box sx={{ px: 1.5, pb: 1.25, pt: 0.5 }}>
        {rows.map((r) => {
          const winner = done && m.winnerName && m.winnerName === r.name;
          const tbd = !r.name || r.name === "TBD";
          return (
            <Stack key={r.side} direction="row" alignItems="center" spacing={1} sx={{ py: 0.4 }}>
              <Typography
                sx={{ flex: 1, minWidth: 0, fontWeight: winner ? 800 : 500, color: tbd ? "text.disabled" : done && !winner ? "text.secondary" : "text.primary" }}
                noWrap
              >
                {winner && <EmojiEvents sx={{ fontSize: 16, color: "#f9a825", mr: 0.5, verticalAlign: "-3px" }} />}
                {tbd ? "To be decided" : team(r.name, r.partner)}
              </Typography>
              {sets.map((s) => (
                <Typography key={s.set} sx={{ width: 24, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: (r.side === "player1Score" ? s.player1Score > s.player2Score : s.player2Score > s.player1Score) ? 800 : 400 }}>
                  {s[r.side]}
                </Typography>
              ))}
              {done && sets.length === 0 && (
                <Typography sx={{ width: 28, textAlign: "center", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{r.setsWon}</Typography>
              )}
              {live && r.live !== undefined && (
                <Typography sx={{ width: 28, textAlign: "center", fontWeight: 900, color: "error.main", fontVariantNumeric: "tabular-nums" }}>{r.live}</Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Card>
  );
}

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"matches" | "table" | "bracket" | "teams">("matches");
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "done">("all");
  const [category, setCategory] = useState<string>("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments-native/${params.id}?_t=${Date.now()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTournament(data.tournament);
      setMatches(data.matches || []);
      setPlayers(data.players || []);
    } catch (e: any) {
      setError(e.message || "Could not load tournament");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh scores every 20 s while any match is live
  const anyLive = matches.some((m) => m.status === "live");
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [anyLive, load]);

  const categories = useMemo(() => Array.from(new Set(matches.map((m) => m.category).filter(Boolean))) as string[], [matches]);
  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0]);
  }, [categories, category]);

  const inCategory = (m: Match) => categories.length <= 1 || m.category === category;

  const grouped = useMemo(() => {
    const list = matches.filter(inCategory).filter((m) => {
      if (filter === "live") return m.status === "live";
      if (filter === "upcoming") return m.status === "scheduled";
      if (filter === "done") return m.status === "completed";
      return true;
    });
    const rounds = Array.from(new Set(list.map((m) => m.round))).sort((a, b) => roundRank(a) - roundRank(b));
    return rounds.map((r) => ({ round: r, items: list.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, filter, category, categories.length]);

  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: tournament?.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
        <Button component={Link} href="/tournaments" startIcon={<ArrowBack />} sx={{ mt: 2 }}>All tournaments</Button>
      </Container>
    );
  }
  if (!tournament) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  const theme = SPORT_THEME[(tournament.sport || "").toLowerCase()] || SPORT_THEME.badminton;
  const done = matches.filter((m) => m.status === "completed").length;
  const leagueMatches = matches.filter(inCategory).filter((m) => m.stage === "league");
  const knockoutMatches = matches.filter(inCategory).filter((m) => m.stage !== "league");
  const hasLeague = leagueMatches.length > 0;
  const leagueTeams = new Set(leagueMatches.flatMap((m) => [m.player1Name, m.player2Name])).size;
  // knockout champion, or the league winner when the competition is league-only
  const champion =
    matches.find((m) => m.round === "Final" && m.status === "completed")?.winnerName ||
    (hasLeague && knockoutMatches.length === 0 && leagueFinished(leagueMatches) ? leagueTable(leagueMatches, sportRules(tournament.sport).points)[0]?.name : undefined);

  return (
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100vh", pb: 6 }}>
      {/* header */}
      <Box sx={{ background: theme.gradient, color: "#fff", pt: { xs: 2, md: 4 }, pb: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <IconButton component={Link} href="/tournaments" sx={{ color: "#fff", ml: -1 }} aria-label="All tournaments">
              <ArrowBack />
            </IconButton>
            <IconButton onClick={share} sx={{ color: "#fff" }} aria-label="Share tournament">
              <Share />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1 }}>
            {tournament.status && (
              <Chip size="small" label={tournament.status.toUpperCase()} color={STATUS_COLOR[tournament.status] || "default"} sx={{ fontWeight: 800 }} />
            )}
            {tournament.sport && <Chip size="small" icon={theme.icon as any} label={tournament.sport} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }} />}
            {tournament.type && <Chip size="small" label={tournament.type} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />}
          </Stack>
          <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: "1.6rem", md: "2.4rem" }, lineHeight: 1.15 }}>
            {tournament.name}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 2.5 }} sx={{ mt: 1.5, opacity: 0.95 }}>
            {tournament.startDate && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarMonth fontSize="small" />
                <Typography variant="body2">
                  {fmtDate(tournament.startDate)}
                  {tournament.endDate && tournament.endDate !== tournament.startDate && ` – ${fmtDate(tournament.endDate)}`}
                </Typography>
              </Stack>
            )}
            {tournament.venue && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <LocationOn fontSize="small" />
                <Typography variant="body2">{tournament.venue}</Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Groups fontSize="small" />
              <Typography variant="body2">{players.length} teams · {done}/{matches.length} matches played</Typography>
            </Stack>
          </Stack>
          {champion && (
            <Chip icon={<EmojiEvents sx={{ color: "#f9a825 !important" }} />} label={`Champion: ${champion}`} sx={{ mt: 2, bgcolor: "#fff", color: "#111", fontWeight: 800 }} />
          )}
          {tournament.status === "upcoming" && (
            <Button
              component={Link}
              href={`/tournaments/register?tournamentId=${tournament._id}`}
              variant="contained"
              size="large"
              sx={{ mt: 2.5, bgcolor: "#ffc400", color: "#111", fontWeight: 900, "&:hover": { bgcolor: "#ffd740" } }}
            >
              Register now
            </Button>
          )}
        </Container>
      </Box>

      {/* tabs */}
      <Box sx={{ position: "sticky", top: { xs: 56, sm: 64 }, zIndex: 10, bgcolor: "#fff", borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="md">
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab value="matches" label={anyLive ? "Matches 🔴" : "Matches"} />
            {hasLeague && <Tab value="table" label="Table" />}
            {(!hasLeague || knockoutMatches.length > 0) && <Tab value="bracket" label={hasLeague ? "Knockout" : "Bracket"} />}
            <Tab value="teams" label={`Teams (${players.length})`} />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 2 }}>
        {tournament.description && tab === "matches" && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>{tournament.description}</Typography>
        )}

        {categories.length > 1 && tab !== "teams" && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: "auto", pb: 0.5 }}>
            {categories.map((c) => (
              <Chip key={c} label={c} color={category === c ? "primary" : "default"} variant={category === c ? "filled" : "outlined"} onClick={() => setCategory(c)} />
            ))}
          </Stack>
        )}

        {tab === "matches" && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
              {([
                ["all", "All"],
                ["live", "Live"],
                ["upcoming", "Upcoming"],
                ["done", "Results"],
              ] as const).map(([k, label]) => (
                <Chip key={k} label={label} color={filter === k ? "primary" : "default"} variant={filter === k ? "filled" : "outlined"} onClick={() => setFilter(k)} />
              ))}
            </Stack>
            {grouped.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                {matches.length === 0 ? "Fixtures will appear here once the draw is made." : "No matches in this view."}
              </Typography>
            ) : (
              <Stack spacing={3}>
                {grouped.map((g) => (
                  <Box key={g.round}>
                    <Typography sx={{ fontWeight: 800, mb: 1, textTransform: "uppercase", letterSpacing: 1, fontSize: 13, color: "text.secondary" }}>
                      {g.round} · {g.items.length}
                    </Typography>
                    <Grid container spacing={1.25}>
                      {g.items.map((m) => (
                        <Grid item xs={12} sm={6} key={m._id}>
                          <MatchRow m={m} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}

        {tab === "table" && (
          <LeagueTable
            matches={leagueMatches}
            qualifiers={tournament.format === "league_knockout" ? qualifierCount(tournament.qualifiers, leagueTeams) : 0}
            sport={tournament.sport}
          />
        )}

        {tab === "bracket" && (
          <Box sx={{ overflowX: "auto", mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 } }}>
            {matches.length ? (
              <TournamentBracket matches={knockoutMatches as any} />
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>The bracket appears once fixtures are drawn.</Typography>
            )}
          </Box>
        )}

        {tab === "teams" && (
          <Grid container spacing={1.25}>
            {players.map((p, i) => (
              <Grid item xs={12} sm={6} key={p._id}>
                <Card variant="outlined" sx={{ borderRadius: 3, px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {i + 1}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{team(p.name, p.partnerName)}</Typography>
                    {p.category && <Typography variant="caption" color="text.secondary">{p.category}</Typography>}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Snackbar open={Boolean(toast)} autoHideDuration={2000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
