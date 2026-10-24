"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Fab,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { Add, AutoAwesome, Forum } from "@mui/icons-material";
import CoachWizard from "../components/coach/CoachWizard";
import PlanView from "../components/coach/PlanView";
import CoachChat from "../components/coach/CoachChat";
import { ChatMessage, CoachInputs, CoachPlanContent } from "../lib/coach";

interface PlanSummary {
  _id: string;
  createdAt: string;
  plan: { title: string };
}

interface FullPlan {
  _id: string;
  inputs: CoachInputs;
  plan: CoachPlanContent;
  progress: Record<string, boolean>;
  chat: ChatMessage[];
}

export default function CoachPage() {
  const { status } = useSession();
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [current, setCurrent] = useState<FullPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState("");

  const loadPlan = useCallback(async (id: string) => {
    const res = await fetch(`/api/coach/plans/${id}`);
    const data = await res.json();
    if (data.success) setCurrent(data.plan);
    else setError(data.error || "Could not load plan");
  }, []);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/coach/plans");
    const data = await res.json();
    const list: PlanSummary[] = data.plans || [];
    setPlans(list);
    // ?plan=<id> lets coaches open a member's plan; otherwise show the latest
    const wanted = new URLSearchParams(window.location.search).get("plan");
    if (wanted) loadPlan(wanted);
    else if (list[0]) loadPlan(list[0]._id);
  }, [loadPlan]);

  useEffect(() => {
    if (status === "authenticated") loadList();
  }, [status, loadList]);

  const toggle = async (key: string, done: boolean) => {
    if (!current) return;
    setCurrent({ ...current, progress: { ...current.progress, [key]: done } });
    fetch(`/api/coach/plans/${current._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, done }),
    }).catch(() => {});
  };

  if (status === "loading" || (status === "authenticated" && plans === null)) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  if (status === "unauthenticated") {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <AutoAwesome sx={{ fontSize: 56, color: "primary.main" }} />
        <Typography variant="h4" fontWeight={900} sx={{ mt: 2 }}>Your AI coach</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Answer 8 quick questions and get a free 4-week plan for badminton, football, cricket or fitness — in English or Tamil.
        </Typography>
        <Button component={Link} href="/auth/login?callbackUrl=/coach" variant="contained" size="large">Log in to start</Button>
      </Container>
    );
  }

  const showWizard = creating || (plans !== null && plans.length === 0 && !current);

  return (
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100vh", pb: 12 }}>
      <Container maxWidth="md" sx={{ pt: { xs: 2, md: 4 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} className="no-print">
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesome color="primary" />
            <Typography variant="h5" fontWeight={900}>AI Coach</Typography>
          </Stack>
          {!showWizard && (
            <Button startIcon={<Add />} onClick={() => setCreating(true)}>New plan</Button>
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {showWizard ? (
          <CoachWizard
            defaults={current?.inputs}
            onCancel={plans && plans.length > 0 ? () => setCreating(false) : undefined}
            onCreated={async (id) => {
              setCreating(false);
              await loadList();
              loadPlan(id);
            }}
          />
        ) : current ? (
          <>
            {plans && plans.length > 1 && (
              <Select
                size="small"
                fullWidth
                value={plans.some((p) => p._id === current._id) ? current._id : ""}
                onChange={(e) => loadPlan(String(e.target.value))}
                sx={{ mb: 2, bgcolor: "#fff" }}
                className="no-print"
              >
                {plans.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.plan?.title} · {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </MenuItem>
                ))}
              </Select>
            )}
            <PlanView inputs={current.inputs} plan={current.plan} progress={current.progress} onProgress={toggle} />
            <Fab
              color="primary"
              variant="extended"
              onClick={() => setChatOpen(true)}
              className="no-print"
              sx={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
            >
              <Forum sx={{ mr: 1 }} /> Ask coach
            </Fab>
            <CoachChat
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              planId={current._id}
              initial={current.chat || []}
              onPlanChanged={() => loadPlan(current._id)}
            />
          </>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
        )}
      </Container>

      <style jsx global>{`
        @media print {
          header, .MuiAppBar-root, .no-print { display: none !important; }
          .MuiAccordionDetails-root { display: block !important; }
          .MuiCollapse-root { height: auto !important; visibility: visible !important; }
        }
      `}</style>
    </Box>
  );
}
