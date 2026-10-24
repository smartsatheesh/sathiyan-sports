'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  TextField,
  Typography,
  Fab,
  Stack,
  Avatar,
  CircularProgress,
  Chip,
  Zoom,
} from '@mui/material';
import { Chat, Close, Send, SportsTennis } from '@mui/icons-material';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SUGGESTIONS = [
  'Book badminton today 7 to 9 PM',
  'What are your prices?',
  'Where are you located?',
  'Tell me about tournaments',
];

const WELCOME_MESSAGE: ChatMessage = {
  role: 'model',
  text: "Hi! 👋 I'm the Sathiyan Sports Assistant. I can book a court/slot for you right here, or answer questions about pricing, tournaments and coaching!",
};

/** Floating chatbot widget rendered globally, backed by the Gemini-powered /api/chatbot route. */
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages.slice(0, -1).filter((m) => m !== WELCOME_MESSAGE),
        }),
      });
      const data = await res.json();
      const replyText = data.success ? data.reply : (data.error || 'Something went wrong. Please try again.');
      setMessages((prev) => [...prev, { role: 'model', text: replyText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: "Sorry, I couldn't reach the server. Please try again or WhatsApp us at +91 9342090194." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Zoom in={!open}>
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
          aria-label="Open chat assistant"
        >
          <Chat />
        </Fab>
      </Zoom>

      <Zoom in={open}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: { xs: 0, sm: 24 },
            right: { xs: 0, sm: 24 },
            width: { xs: '100vw', sm: 360 },
            height: { xs: '100vh', sm: 520 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: { xs: 0, sm: 3 },
            overflow: 'hidden',
            zIndex: 1300,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 32, height: 32 }}>
              <SportsTennis fontSize="small" />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Sathiyan Assistant</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>Booking & info help</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }} aria-label="Close chat">
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2, bgcolor: '#f5f6f8' }}>
            <Stack spacing={1.25}>
              {messages.map((m, idx) => (
                <Box
                  key={idx}
                  sx={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    bgcolor: m.role === 'user' ? 'primary.main' : 'white',
                    color: m.role === 'user' ? 'white' : 'text.primary',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
              ))}
              {loading && (
                <Box sx={{ alignSelf: 'flex-start', bgcolor: 'white', px: 1.5, py: 1, borderRadius: 2 }}>
                  <CircularProgress size={16} />
                </Box>
              )}
            </Stack>

            {messages.length === 1 && !loading && (
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                {SUGGESTIONS.map((s) => (
                  <Chip key={s} label={s} size="small" onClick={() => sendMessage(s)} clickable />
                ))}
              </Stack>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.25, borderTop: '1px solid #eee', display: 'flex', gap: 1, bgcolor: 'white' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about booking, pricing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={loading}
            />
            <IconButton color="primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} aria-label="Send message">
              <Send />
            </IconButton>
          </Box>
        </Paper>
      </Zoom>
    </>
  );
}
