"use client";

import React, { useMemo } from "react";
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { leagueFinished, leagueTable, TableMatch } from "../lib/league";
import { sportRules } from "../lib/tournamentSports";

// What the "for / against / difference" columns count, per sport scoring, and what a level game is called
const COLUMNS = {
  goals: { for: "GF", against: "GA", diff: "GD", level: "D", levelWord: "Draw", unit: "goal" },
  runs: { for: "RF", against: "RA", diff: "RD", level: "T", levelWord: "Tie", unit: "run" },
  sets: { for: "SW", against: "SL", diff: "SD", level: "D", levelWord: "Draw", unit: "set" },
  points: { for: "PF", against: "PA", diff: "PD", level: "D", levelWord: "Draw", unit: "point" },
} as const;
const FORM_COLORS = { W: "#2e7d32", D: "#9e9e9e", L: "#c62828" } as const;

/**
 * League table (P W D L GF GA GD Pts; runs and ties for cricket, sets for badminton, points for
 * the martial arts); the top `qualifiers` rows are highlighted. For/against are dropped on phones
 * so the difference and points always fit.
 */
export default function LeagueTable({ matches, qualifiers = 0, title, sport }: { matches: TableMatch[]; qualifiers?: number; title?: string; sport?: string }) {
  const rules = sportRules(sport);
  const cols = COLUMNS[rules.scoring] || COLUMNS.goals;
  const rows = useMemo(() => leagueTable(matches, rules.points), [matches, rules.points]);
  const done = useMemo(() => leagueFinished(matches), [matches]);
  if (!rows.length) return null;

  const HIDE_ON_PHONE = new Set<string>([cols.for, cols.against]);
  const head = ["#", "Team", "P", "W", cols.level, "L", cols.for, cols.against, cols.diff, "Pts"];
  return (
    <Box sx={{ mb: 3 }}>
      {title && (
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          {title}
        </Typography>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#071a2e" }}>
              {head.map((h) => (
                <TableCell key={h} align={h === "Team" ? "left" : "center"} sx={{ color: "#fff", fontWeight: 800, px: 1, display: HIDE_ON_PHONE.has(h) ? { xs: "none", sm: "table-cell" } : undefined }}>
                  {h}
                </TableCell>
              ))}
              <TableCell sx={{ color: "#fff", fontWeight: 800, display: { xs: "none", sm: "table-cell" } }}>Form</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const qualifies = i < qualifiers;
              return (
                <TableRow key={r.name} sx={{ bgcolor: qualifies ? "rgba(46,125,50,0.08)" : undefined, borderLeft: qualifies ? "4px solid #2e7d32" : "4px solid transparent" }}>
                  <TableCell align="center" sx={{ fontWeight: 800, px: 1 }}>{i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 700, px: 1, wordBreak: "break-word" }}>
                    {r.name}
                    {r.partner ? ` / ${r.partner}` : ""}
                  </TableCell>
                  {[r.played, r.won, r.drawn, r.lost].map((v, k) => (
                    <TableCell key={k} align="center" sx={{ px: 1 }}>{v}</TableCell>
                  ))}
                  {[r.goalsFor, r.goalsAgainst].map((v, k) => (
                    <TableCell key={`g${k}`} align="center" sx={{ px: 1, display: { xs: "none", sm: "table-cell" } }}>{v}</TableCell>
                  ))}
                  <TableCell align="center" sx={{ px: 1 }}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Chip size="small" label={r.points} sx={{ fontWeight: 900, bgcolor: qualifies ? "#2e7d32" : "action.selected", color: qualifies ? "#fff" : "inherit" }} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    <Stack direction="row" spacing={0.4}>
                      {r.form.map((f, k) => (
                        <Box key={k} title={f === "W" ? "Won" : f === "D" ? (cols.levelWord === "Tie" ? "Tied" : "Drawn") : "Lost"} sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: FORM_COLORS[f], color: "#fff", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center" }}>
                          {f}
                        </Box>
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        {`Win ${rules.points.win} pts · ${cols.levelWord} ${rules.points.draw} pt · Level teams split by ${cols.unit} difference, ${cols.unit}s ${cols.unit === "set" ? "won" : "scored"}, then head-to-head.`}
        {qualifiers > 0 && (done ? ` Top ${qualifiers} are through to the knockouts.` : ` Top ${qualifiers} go through to the knockouts.`)}
      </Typography>
    </Box>
  );
}
