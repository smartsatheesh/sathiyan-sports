'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack, IconButton, Tooltip } from '@mui/material';
import { Shuffle, EmojiEvents } from '@mui/icons-material';

export interface BracketMatch {
  _id: string;
  round: string;
  matchNumber: number;
  player1Name: string;
  player2Name?: string;
  player1Partner?: string;
  player2Partner?: string;
  player1TeamId?: string;
  player2TeamId?: string;
  category?: string;
  courtNumber?: string;
  scheduledTime?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score?: { player1Sets: number; player2Sets: number };
  winnerName?: string;
  nextMatchNumber?: number | null;
}

// Round-robin/pool rounds (e.g. "Group Stage", "A League Group Stage") are rendered as a
// separate pools section rather than as a column in the knockout tree, since they aren't
// wired to a next match and don't fit a single-elimination layout.
function isGroupRound(round: string): boolean {
  return /group|league/i.test(round);
}

// Ranks any round label produced dynamically by the bracket generator
// (Preliminary, Round of N for any N, Quarter/Semi Final, Final) into left-to-right order.
function roundWeight(round: string): number {
  if (round === 'Preliminary') return -Infinity;
  if (round === 'Final') return 0;
  if (round === 'Semi Final') return -1;
  if (round === 'Quarter Final') return -2;
  const match = round.match(/Round of (\d+)/i);
  if (match) return -parseInt(match[1], 10);
  return 1; // unknown labels sort last
}

function sortRounds(rounds: string[]): string[] {
  return [...rounds].sort((a, b) => roundWeight(a) - roundWeight(b));
}

interface Props {
  matches: BracketMatch[];
  isAdmin?: boolean;
  onMatchClick?: (match: BracketMatch) => void;
  onShuffleRound?: (round: string) => void;
}

/** Pictorial single-elimination bracket with measured SVG connector lines between rounds. */
export default function TournamentBracket({ matches, isAdmin = false, onMatchClick, onShuffleRound }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; key: string }>>([]);

  // Group/pool rounds (round-robin, no next-match wiring) shown as their own pools section,
  // separate from the single-elimination knockout tree.
  const groupRoundNames = useMemo(() => {
    const set = new Set(matches.filter((m) => isGroupRound(m.round)).map((m) => m.round));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const knockoutRoundNames = useMemo(() => {
    const set = new Set(matches.filter((m) => !isGroupRound(m.round)).map((m) => m.round));
    return sortRounds(Array.from(set));
  }, [matches]);

  const matchesByRound = useMemo(() => {
    const grouped: Record<string, BracketMatch[]> = {};
    for (const round of [...groupRoundNames, ...knockoutRoundNames]) {
      grouped[round] = matches.filter((m) => m.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return grouped;
  }, [matches, groupRoundNames, knockoutRoundNames]);

  const recomputeLines = () => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const next: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];

    for (const m of matches) {
      if (!m.nextMatchNumber) continue;
      const fromEl = boxRefs.current[m.matchNumber];
      const toEl = boxRefs.current[m.nextMatchNumber];
      if (!fromEl || !toEl) continue;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      next.push({
        x1: fromRect.right - containerRect.left + container.scrollLeft,
        y1: fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop,
        x2: toRect.left - containerRect.left + container.scrollLeft,
        y2: toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop,
        key: `${m.matchNumber}-${m.nextMatchNumber}`,
      });
    }
    setLines(next);
  };

  useLayoutEffect(() => {
    recomputeLines();
    const ro = new ResizeObserver(() => recomputeLines());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recomputeLines);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recomputeLines);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const statusColor = (m: BracketMatch) =>
    m.status === 'live' ? '#f44336' : m.status === 'completed' ? '#4caf50' : '#bdbdbd';

  const renderMatchCard = (m: BracketMatch, width: number) => {
    const isDone = m.status === 'completed';
    const isLive = m.status === 'live';
    const p1Wins = isDone && m.winnerName === m.player1Name;
    const p2Wins = isDone && m.winnerName === m.player2Name;
    return (
      <Box
        key={m._id}
        ref={(el: HTMLDivElement | null) => { boxRefs.current[m.matchNumber] = el; }}
        onClick={() => onMatchClick?.(m)}
        sx={{
          width,
          bgcolor: 'white',
          border: `1.5px solid ${statusColor(m)}`,
          borderRadius: 1.5,
          boxShadow: isLive ? '0 0 10px rgba(244,67,54,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
          cursor: onMatchClick ? 'pointer' : 'default',
          overflow: 'hidden',
          '&:hover': onMatchClick ? { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' } : {},
        }}
      >
        <Box sx={{ px: 1, py: 0.5, bgcolor: 'grey.100', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            #{m.matchNumber}{m.courtNumber ? ` · Court ${m.courtNumber}` : ''}
          </Typography>
          {isLive && <Chip label="LIVE" size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.75, borderBottom: '1px solid #eee' }}>
          <Typography variant="body2" fontWeight={p1Wins ? 800 : 500} color={p1Wins ? 'success.main' : 'text.primary'} noWrap sx={{ maxWidth: width - 80 }}>
            {m.player1TeamId ? `${m.player1TeamId} ` : ''}{m.player1Name || 'TBD'}
            {m.player1Partner ? ` / ${m.player1Partner}` : ''}
          </Typography>
          {p1Wins && <EmojiEvents sx={{ fontSize: 14, color: '#FFD700' }} />}
          {isDone && <Typography variant="body2" fontWeight={700}>{m.score?.player1Sets ?? 0}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.75 }}>
          <Typography variant="body2" fontWeight={p2Wins ? 800 : 500} color={p2Wins ? 'success.main' : 'text.primary'} noWrap sx={{ maxWidth: width - 80 }}>
            {m.player2TeamId ? `${m.player2TeamId} ` : ''}{m.player2Name || 'TBD'}
            {m.player2Partner ? ` / ${m.player2Partner}` : ''}
          </Typography>
          {p2Wins && <EmojiEvents sx={{ fontSize: 14, color: '#FFD700' }} />}
          {isDone && <Typography variant="body2" fontWeight={700}>{m.score?.player2Sets ?? 0}</Typography>}
        </Box>
      </Box>
    );
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      >
        {lines.map((l) => {
          const midX = (l.x1 + l.x2) / 2;
          return (
            <path
              key={l.key}
              d={`M ${l.x1} ${l.y1} H ${midX} V ${l.y2} H ${l.x2}`}
              fill="none"
              stroke="#c7c7c7"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Group / pool stage — round-robin matches shown as pool cards, no elimination lines */}
      {groupRoundNames.length > 0 && (
        <Box sx={{ position: 'relative', zIndex: 1, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
            Group Stage
          </Typography>
          <Stack spacing={2.5}>
            {groupRoundNames.map((round) => {
              const roundMatches = matchesByRound[round] || [];
              const canShuffle =
                isAdmin && !!onShuffleRound && roundMatches.every((m) => m.status === 'scheduled');
              return (
                <Box key={round}>
                  {groupRoundNames.length > 1 && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{round}</Typography>
                      {canShuffle && (
                        <Tooltip title={`Shuffle teams in ${round}`}>
                          <IconButton size="small" onClick={() => onShuffleRound?.(round)}>
                            <Shuffle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {roundMatches.map((m) => renderMatchCard(m, 240))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Knockout stage — single-elimination tree with measured connector lines */}
      {knockoutRoundNames.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          {groupRoundNames.length > 0 && (
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              Knockout Stage
            </Typography>
          )}
          <Box sx={{ position: 'relative', display: 'flex', gap: 6, overflowX: 'auto', overflowY: 'hidden', pb: 2, pt: 1, px: 1 }}>
            {knockoutRoundNames.map((round) => {
              const roundMatches = matchesByRound[round];
              const canShuffle =
                isAdmin && !!onShuffleRound && roundMatches.every((m) => m.status === 'scheduled');
              return (
                <Box key={round} sx={{ position: 'relative', zIndex: 1, minWidth: 240, display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ whiteSpace: 'nowrap' }}>{round}</Typography>
                    {canShuffle && (
                      <Tooltip title={`Shuffle teams in ${round}`}>
                        <IconButton size="small" onClick={() => onShuffleRound?.(round)}>
                          <Shuffle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 3, flex: 1 }}>
                    {roundMatches.map((m) => renderMatchCard(m, 240))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
