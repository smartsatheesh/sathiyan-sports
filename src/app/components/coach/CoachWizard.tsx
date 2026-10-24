"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack, AutoAwesome } from "@mui/icons-material";
import { COACH_QUESTIONS, COACH_STEPS, CoachInputs } from "@/app/lib/coach";

const TIPS = [
  "Warming up the coach… 🔥",
  "Picking drills for your sport… 🏸⚽🏏",
  "Balancing effort and recovery… 😴",
  "Adding warm-ups to protect your joints… 🦵",
  "Planning 4 weeks of progress… 📈",
  "Almost there — writing coaching tips… ✍️",
];

interface Props {
  onCreated: (id: string) => void;
  onCancel?: () => void;
  defaults?: Partial<CoachInputs>;
}

// One question per screen with big tap targets — friendly on phones.
export default function CoachWizard({ onCreated, onCancel, defaults }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<CoachInputs>>(defaults || {});
  const [notes, setNotes] = useState(defaults?.notes || "");
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState(0);
  const [error, setError] = useState("");

  const total = COACH_STEPS.length + 1; // + notes screen
  const key = COACH_STEPS[step];

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3500);
    return () => clearInterval(id);
  }, [busy]);

  const pick = (value: string) => {
    const next = { ...answers, [key]: value };
    // Kids goal implies a kids' age group; skip ahead sensibly
    if (key === "goal" && value === "kids" && !next.age) next.age = "6-12";
    setAnswers(next);
    setStep((s) => s + 1);
  };

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, notes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onCreated(data.id);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, textAlign: "center" }}>
        <AutoAwesome sx={{ fontSize: 56, color: "primary.main", animation: "spin 3s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
        <Typography variant="h6" fontWeight={800} sx={{ mt: 2 }}>Building your plan</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, minHeight: 24 }}>{TIPS[tip]}</Typography>
        <LinearProgress sx={{ mt: 3, borderRadius: 2, height: 6 }} />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>This usually takes 15–30 seconds.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        {(step > 0 || onCancel) && (
          <Button size="small" startIcon={<ArrowBack />} onClick={() => (step > 0 ? setStep(step - 1) : onCancel?.())}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={((step + 1) / total) * 100} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
        <Typography variant="caption" color="text.secondary">{step + 1}/{total}</Typography>
      </Stack>

      {step < COACH_STEPS.length ? (
        <>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 2.5 }}>{COACH_QUESTIONS[key].label}</Typography>
          <Grid container spacing={1.5}>
            {COACH_QUESTIONS[key].options.map((o) => {
              const selected = answers[key] === o.value;
              return (
                <Grid item xs={6} sm={4} key={o.value}>
                  <Paper
                    variant="outlined"
                    role="button"
                    tabIndex={0}
                    onClick={() => pick(o.value)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(o.value)}
                    sx={{
                      p: 2,
                      height: "100%",
                      textAlign: "center",
                      cursor: "pointer",
                      borderRadius: 3,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? "primary.main" : "divider",
                      bgcolor: selected ? "action.selected" : "background.paper",
                      transition: "transform .1s",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
                    }}
                  >
                    <Typography sx={{ fontSize: 32, lineHeight: 1.2 }}>{o.emoji}</Typography>
                    <Typography fontWeight={700} sx={{ mt: 0.5 }}>{o.label}</Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </>
      ) : (
        <>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Anything the coach should know?</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Injuries, pain, things you love or hate. Optional.</Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. mild knee pain when jumping; want to improve my backhand"
            inputProps={{ maxLength: 400 }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button fullWidth size="large" variant="contained" startIcon={<AutoAwesome />} onClick={create} sx={{ mt: 3, py: 1.5, fontSize: "1.05rem" }}>
            Create my plan
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1.5 }}>
            AI-generated guidance — not medical advice. Stop if anything hurts and talk to our coaches.
          </Typography>
        </>
      )}
    </Paper>
  );
}
