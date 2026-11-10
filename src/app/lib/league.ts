// League (round-robin) support shared by the fixture generator, the match-result API and the
// tournament pages. Pure functions only — safe on client and server.

import { BracketTeam, buildKnockoutBracket } from './bracket';

export type TournamentFormat = 'knockout' | 'league' | 'league_knockout';

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  knockout: 'Knockout',
  league: 'League (everyone plays everyone)',
  league_knockout: 'League, then knockout (semi-finals & final)',
};

export const POINTS = { win: 3, draw: 1, loss: 0 };

export interface LeagueMatchDoc {
  matchNumber: number;
  round: string; // "Matchday 3"
  stage: 'league';
  player1Name: string;
  player1Partner: string;
  player1TeamId: string;
  player2Name: string;
  player2Partner: string;
  player2TeamId: string;
}

/**
 * Round-robin fixtures by the circle method: every team meets every other team `legs` times
 * (2 = home and away), and nobody plays twice on the same matchday. With an odd number of
 * teams one team rests each matchday.
 */
export function buildRoundRobin(teams: BracketTeam[], startMatchNumber: number, legs: 1 | 2 = 1) {
  const list: (BracketTeam | null)[] = [...teams];
  if (list.length % 2) list.push(null); // rest day
  const n = list.length;
  const rounds = n - 1;

  // First leg: pair up by the circle method; whoever has hosted less so far is listed first
  const homeGames = new Map<string, number>();
  const firstLeg: { round: number; home: BracketTeam; away: BracketTeam }[] = [];
  let rotation = [...list];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      let home = rotation[i];
      let away = rotation[n - 1 - i];
      if (!home || !away) continue;
      if ((homeGames.get(away.teamId) || 0) < (homeGames.get(home.teamId) || 0)) [home, away] = [away, home];
      homeGames.set(home.teamId, (homeGames.get(home.teamId) || 0) + 1);
      firstLeg.push({ round: r, home, away });
    }
    // keep the first team fixed, rotate the rest one place
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)];
  }

  // Return leg (home and away): same order, venues swapped
  const fixtures = legs === 2 ? [...firstLeg, ...firstLeg.map((f) => ({ round: f.round + rounds, home: f.away, away: f.home }))] : firstLeg;

  let matchNumber = startMatchNumber;
  const matches: LeagueMatchDoc[] = fixtures.map(({ round, home, away }) => ({
    matchNumber: matchNumber++,
    round: `Matchday ${round + 1}`,
    stage: 'league',
    player1Name: home.name,
    player1Partner: home.partner || '',
    player1TeamId: home.teamId,
    player2Name: away.name,
    player2Partner: away.partner || '',
    player2TeamId: away.teamId,
  }));
  return { matches, nextMatchNumber: matchNumber };
}

/** Largest bracket size (2, 4 or 8) that fits the requested qualifiers and the number of teams. */
export function qualifierCount(requested: number | undefined, teamCount: number) {
  let q = [2, 4, 8].includes(requested as number) ? (requested as number) : 4;
  while (q > teamCount && q > 2) q /= 2;
  return q;
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
export const seedLabel = (seed: number) => `League ${ORDINAL[seed - 1] || `#${seed}`}`;

/**
 * Knockout matches that follow the league. Slots hold placeholders ("League 1st") plus the seed
 * number, and are filled with real teams once every league match is completed.
 */
export function buildKnockoutAfterLeague(qualifiers: number, startMatchNumber: number) {
  const seeds: BracketTeam[] = Array.from({ length: qualifiers }, (_, i) => ({ name: seedLabel(i + 1), teamId: `seed${i + 1}` }));
  const { matches, nextMatchNumber } = buildKnockoutBracket(seeds, startMatchNumber);
  return {
    nextMatchNumber,
    matches: matches.map((m) => ({
      ...m,
      stage: 'knockout' as const,
      player1Seed: m.player1TeamId.startsWith('seed') ? Number(m.player1TeamId.slice(4)) : null,
      player2Seed: m.player2TeamId.startsWith('seed') ? Number(m.player2TeamId.slice(4)) : null,
      player1TeamId: '',
      player2TeamId: '',
    })),
  };
}

// ---------------- table ----------------

export interface TableMatch {
  stage?: string;
  status: string;
  player1Name: string;
  player2Name?: string;
  player1Partner?: string;
  player2Partner?: string;
  score?: { player1Sets?: number; player2Sets?: number };
  winnerName?: string;
}

export interface TableRow {
  name: string;
  partner: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

/** True for matches that belong to the league stage (older matches have no stage = knockout). */
export const isLeagueMatch = (m: { stage?: string }) => m.stage === 'league';

/**
 * League table from league-stage matches. Goals (or runs) live in score.player1Sets/player2Sets;
 * `points` defaults to football's 3/1/0.
 * Order: points, goal difference, goals scored, head-to-head points, then name.
 */
export function leagueTable(matches: TableMatch[], points: { win: number; draw: number } = POINTS): TableRow[] {
  const league = matches.filter(isLeagueMatch);
  const rows = new Map<string, TableRow>();
  const row = (name: string, partner = '') => {
    if (!rows.has(name)) rows.set(name, { name, partner, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, form: [] });
    return rows.get(name)!;
  };
  // every team appears, even before kick-off
  league.forEach((m) => {
    row(m.player1Name, m.player1Partner);
    if (m.player2Name) row(m.player2Name, m.player2Partner);
  });

  const h2h = new Map<string, number>(); // "a|b" → points a took from b
  league
    .filter((m) => m.status === 'completed' && m.player2Name)
    .forEach((m) => {
      const a = row(m.player1Name);
      const b = row(m.player2Name!);
      const ga = m.score?.player1Sets ?? 0;
      const gb = m.score?.player2Sets ?? 0;
      a.played++;
      b.played++;
      a.goalsFor += ga;
      a.goalsAgainst += gb;
      b.goalsFor += gb;
      b.goalsAgainst += ga;
      // a winner picked by the admin overrides the goal count (walkovers, awarded games)
      const result = m.winnerName === m.player1Name ? 1 : m.winnerName === m.player2Name ? -1 : m.winnerName ? 0 : Math.sign(ga - gb);
      const [pa, pb] = result > 0 ? [points.win, 0] : result < 0 ? [0, points.win] : [points.draw, points.draw];
      a.points += pa;
      b.points += pb;
      if (result > 0) { a.won++; b.lost++; a.form.push('W'); b.form.push('L'); }
      else if (result < 0) { b.won++; a.lost++; a.form.push('L'); b.form.push('W'); }
      else { a.drawn++; b.drawn++; a.form.push('D'); b.form.push('D'); }
      h2h.set(`${a.name}|${b.name}`, (h2h.get(`${a.name}|${b.name}`) || 0) + pa);
      h2h.set(`${b.name}|${a.name}`, (h2h.get(`${b.name}|${a.name}`) || 0) + pb);
    });

  return Array.from(rows.values())
    .map((r) => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst, form: r.form.slice(-5) }))
    .sort(
      (x, y) =>
        y.points - x.points ||
        y.goalDiff - x.goalDiff ||
        y.goalsFor - x.goalsFor ||
        (h2h.get(`${y.name}|${x.name}`) || 0) - (h2h.get(`${x.name}|${y.name}`) || 0) ||
        x.name.localeCompare(y.name)
    );
}

/** Every league match is finished (cancelled ones don't block qualification). */
export const leagueFinished = (matches: TableMatch[]) => {
  const league = matches.filter(isLeagueMatch);
  return league.length > 0 && league.every((m) => m.status === 'completed' || m.status === 'cancelled');
};
