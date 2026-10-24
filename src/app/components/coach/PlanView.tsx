"use client";

import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ExpandMore, Print, PlayCircleOutline, WhatsApp, Restaurant, HealthAndSafety, TrendingUp } from "@mui/icons-material";
import { COACH_QUESTIONS, CoachInputs, CoachPlanContent, howToUrl, progressKey } from "@/app/lib/coach";

interface Props {
  inputs: CoachInputs;
  plan: CoachPlanContent;
  progress: Record<string, boolean>;
  onProgress: (key: string, done: boolean) => void;
}

const optionLabel = (key: keyof typeof COACH_QUESTIONS, value: string) =>
  (COACH_QUESTIONS[key].options as readonly { value: string; label: string; emoji: string }[]).find((o) => o.value === value);

function TipList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {icon}
        <Typography fontWeight={800}>{title}</Typography>
      </Stack>
      <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
        {items.map((t, i) => (
          <Typography component="li" variant="body2" key={i}>{t}</Typography>
        ))}
      </Stack>
    </Paper>
  );
}

export default function PlanView({ inputs, plan, progress, onProgress }: Props) {
  const [week, setWeek] = useState(1);
  const [open, setOpen] = useState<number | false>(0);

  const weekStats = useMemo(() => {
    const total = plan.days.reduce((s, d) => s + d.exercises.length, 0);
    const done = plan.days.reduce((s, d, di) => s + d.exercises.filter((_, ei) => progress[progressKey(week, di, ei)]).length, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [plan, progress, week]);

  const shareText =
    `🏋️ My ${plan.title} — Sathiyan Sports AI Coach\n\n` +
    plan.days.map((d) => `${d.day}: ${d.focus} (${d.durationMinutes} min)`).join("\n") +
    `\n\nMake yours at www.sathiyansports.fit/coach`;

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 4, background: "linear-gradient(135deg, #071a2e 0%, #0d6e8a 100%)", color: "#fff" }}>
        <Typography sx={{ color: "#ffc400", fontWeight: 800, fontSize: 12, letterSpacing: 2 }}>YOUR 4-WEEK PLAN</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5 }}>{plan.title}</Typography>
        <Typography sx={{ opacity: 0.9, mt: 1 }}>{plan.summary}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }}>
          {(["goal", "sport", "level", "days", "minutes"] as const).map((k) => {
            const o = optionLabel(k, (inputs as any)[k]);
            return o ? <Chip key={k} size="small" label={`${o.emoji} ${o.label}`} sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff" }} /> : null;
          })}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} className="no-print">
          <Button size="small" startIcon={<WhatsApp />} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" sx={{ color: "#fff" }}>
            Share
          </Button>
          <Button size="small" startIcon={<Print />} onClick={() => window.print()} sx={{ color: "#fff" }}>
            Print
          </Button>
        </Stack>
      </Paper>

      {/* week picker + progress */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          {[1, 2, 3, 4].map((w) => (
            <Chip key={w} label={`Week ${w}`} color={week === w ? "primary" : "default"} variant={week === w ? "filled" : "outlined"} onClick={() => setWeek(w)} sx={{ flex: 1 }} />
          ))}
        </Stack>
        {plan.progression[week - 1] && (
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.5 }}>
            <TrendingUp color="primary" fontSize="small" sx={{ mt: 0.25 }} />
            <Typography variant="body2">{plan.progression[week - 1]}</Typography>
          </Stack>
        )}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <LinearProgress variant="determinate" value={weekStats.pct} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
          <Typography variant="body2" fontWeight={700}>{weekStats.done}/{weekStats.total}</Typography>
        </Stack>
      </Paper>

      {/* sessions */}
      <Box>
        {plan.days.map((d, di) => {
          const done = d.exercises.filter((_, ei) => progress[progressKey(week, di, ei)]).length;
          const complete = done === d.exercises.length && d.exercises.length > 0;
          return (
            <Accordion key={di} expanded={open === di} onChange={(_, isOpen) => setOpen(isOpen ? di : false)} disableGutters sx={{ borderRadius: "12px !important", mb: 1, "&:before": { display: "none" }, border: 1, borderColor: complete ? "success.main" : "divider" }} elevation={0}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={800}>
                    {complete ? "✅ " : ""}{d.day} · {d.focus}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.durationMinutes} min · {done}/{d.exercises.length} done
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {d.warmup.length > 0 && (
                  <Box sx={{ mb: 1.5, p: 1.5, bgcolor: "#fff8e1", borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>🔥 Warm-up</Typography>
                    <Typography variant="body2">{d.warmup.join(" · ")}</Typography>
                  </Box>
                )}
                <Stack spacing={1}>
                  {d.exercises.map((e, ei) => {
                    const key = progressKey(week, di, ei);
                    const checked = Boolean(progress[key]);
                    const dose = [e.sets && e.reps ? `${e.sets} × ${e.reps}` : e.reps || (e.sets ? `${e.sets} sets` : ""), e.duration, e.rest && `rest ${e.rest}`].filter(Boolean).join(" · ");
                    return (
                      <Paper key={ei} variant="outlined" sx={{ p: 1.25, borderRadius: 2, display: "flex", gap: 1, alignItems: "flex-start", opacity: checked ? 0.7 : 1 }}>
                        <Checkbox checked={checked} onChange={(ev) => onProgress(key, ev.target.checked)} sx={{ p: 0.5 }} inputProps={{ "aria-label": `Done: ${e.name}` }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} sx={{ textDecoration: checked ? "line-through" : "none" }}>{e.name}</Typography>
                          {dose && <Typography variant="body2" color="primary.main" fontWeight={700}>{dose}</Typography>}
                          <Typography variant="body2" color="text.secondary">{e.tip}</Typography>
                          <MuiLink href={howToUrl(e.name, inputs.sport)} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5 }} className="no-print">
                            <PlayCircleOutline sx={{ fontSize: 16 }} /> Watch how
                          </MuiLink>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
                {d.cooldown.length > 0 && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#e3f2fd", borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>🧊 Cool-down</Typography>
                    <Typography variant="body2">{d.cooldown.join(" · ")}</Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <TipList icon={<Restaurant color="warning" />} title="Food & recovery" items={plan.nutrition} />
      <TipList icon={<HealthAndSafety color="error" />} title="Stay safe" items={plan.safety} />
    </Stack>
  );
}
