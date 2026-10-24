"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Send, SmartToy } from "@mui/icons-material";
import { ChatMessage } from "@/app/lib/coach";

const SUGGESTIONS = [
  "Make this week easier",
  "Make it more challenging",
  "My knee hurts when jumping — what should I change?",
  "What should I eat before training?",
  "Swap an exercise I can't do",
];

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  initial: ChatMessage[];
  onPlanChanged: () => void;
}

export default function CoachChat({ open, onClose, planId, initial, onPlanChanged }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages(initial), [initial]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/coach/plans/${planId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMessages((m) => [
        ...m,
        { role: "coach", text: data.reply + (data.planChanged ? "\n\n✅ I've updated your plan." : "") },
      ]);
      if (data.planChanged) onPlanChanged();
    } catch (e: any) {
      setError(e.message || "Could not reach the coach");
      setMessages((m) => m.slice(0, -1));
      setInput(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: { xs: "88vh", sm: "75vh" }, maxWidth: 720, mx: "auto" } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <SmartToy color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={800}>Ask Coach Sathiyan</Typography>
          <Typography variant="caption" color="text.secondary">Questions, or ask me to change your plan</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close chat"><Close /></IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, bgcolor: "#f6f8fb" }}>
        {messages.length === 0 && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Hi! 👋 I know your plan. Ask me anything — or tap a suggestion below.
          </Typography>
        )}
        <Stack spacing={1}>
          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                px: 1.75,
                py: 1,
                borderRadius: 3,
                bgcolor: m.role === "user" ? "primary.main" : "#fff",
                color: m.role === "user" ? "#fff" : "text.primary",
                boxShadow: m.role === "user" ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                whiteSpace: "pre-wrap",
              }}
            >
              <Typography variant="body2">{m.text}</Typography>
            </Box>
          ))}
          {busy && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Coach is thinking…</Typography>
            </Stack>
          )}
        </Stack>
        <div ref={endRef} />
      </Box>

      <Box sx={{ px: 2, pt: 1, pb: "calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: 1, borderColor: "divider" }}>
        {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} size="small" variant="outlined" onClick={() => send(s)} disabled={busy} sx={{ flexShrink: 0 }} />
          ))}
        </Stack>
        <TextField
          fullWidth
          size="small"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          inputProps={{ maxLength: 500 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => send(input)} disabled={busy || !input.trim()} color="primary" aria-label="Send">
                  <Send />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Drawer>
  );
}
