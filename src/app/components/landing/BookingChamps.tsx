"use client";

import React from "react";
import { Avatar, Box, Card, Chip, Grid, Stack, Typography } from "@mui/material";

export interface ChampCard {
  id: string;
  name: string;
  mobile: string; // already masked by the server
  bookings: number;
  hours: number;
  sport: string;
  photoUrl: string | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const AVATAR_COLORS = ["#ff6d00", "#1e88e5", "#43a047", "#8e24aa", "#e53935"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The week's most active booking customers — a little public recognition for the regulars. */
export default function BookingChamps({ champs }: { champs: ChampCard[] }) {
  if (!champs.length) return null;
  return (
    <Grid container spacing={2}>
      {champs.map((c, i) => (
        <Grid item xs={12} sm={6} md={champs.length >= 4 ? 3 : 4} key={c.id}>
          <Card
            sx={{
              borderRadius: 4,
              p: 2.5,
              height: "100%",
              textAlign: "center",
              position: "relative",
              boxShadow: i === 0 ? "0 12px 40px rgba(255,196,0,0.35)" : "0 8px 30px rgba(7,26,46,0.08)",
              border: i === 0 ? "2px solid #ffc400" : "1px solid rgba(7,26,46,0.06)",
            }}
          >
            {MEDALS[i] && (
              <Box sx={{ position: "absolute", top: 10, left: 12, fontSize: 28, lineHeight: 1 }} aria-label={`Rank ${i + 1}`}>
                {MEDALS[i]}
              </Box>
            )}
            <Avatar
              src={c.photoUrl || undefined}
              alt={c.name}
              sx={{ width: 84, height: 84, mx: "auto", mb: 1.5, fontSize: 30, fontWeight: 800, bgcolor: AVATAR_COLORS[i % AVATAR_COLORS.length], border: "3px solid #fff", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
            >
              {initials(c.name)}
            </Avatar>
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>{c.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 1 }}>{c.mobile}</Typography>
            <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" color="warning" label={`${c.bookings} booking${c.bookings === 1 ? "" : "s"} this week`} sx={{ fontWeight: 800 }} />
              {c.sport && <Chip size="small" variant="outlined" label={c.sport} />}
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
