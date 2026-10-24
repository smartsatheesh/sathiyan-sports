// Dynamic single-elimination bracket generator.
// Given N teams, builds a standard seeded knockout bracket (byes given to top seeds)
// sized automatically to N — no hardcoded team count or match count.

export interface BracketTeam {
  name: string;
  partner?: string;
  teamId: string;
}

export interface BracketMatchDoc {
  matchNumber: number;
  round: string;
  player1Name: string;
  player1Partner: string;
  player1TeamId: string;
  player2Name: string;
  player2Partner: string;
  player2TeamId: string;
  nextMatchNumber: number | null;
  nextMatchSlot: 'player1' | 'player2' | null;
}

const TBD: BracketTeam = { name: 'TBD', partner: '', teamId: '' };

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Classic bracket seeding order (1 & 2 seeds land on opposite ends, etc.)
function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const s = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed);
      next.push(s + 1 - seed);
    }
    order = next;
  }
  return order.slice(0, size);
}

function roundLabel(matchesInThisRound: number, isFirstRound: boolean, hasByes: boolean): string {
  if (isFirstRound && hasByes) return 'Preliminary';
  if (matchesInThisRound === 1) return 'Final';
  if (matchesInThisRound === 2) return 'Semi Final';
  if (matchesInThisRound === 4) return 'Quarter Final';
  return `Round of ${matchesInThisRound * 2}`;
}

type SlotRef = { kind: 'team'; team: BracketTeam } | { kind: 'match'; doc: BracketMatchDoc };

/**
 * Builds a full knockout bracket for the given teams, starting match numbering at startMatchNumber.
 * Returns the ordered match documents to insert and the next free match number for the caller.
 * Wiring (nextMatchNumber/nextMatchSlot) is set in a single pass using live object references,
 * so it stays correct regardless of how many byes or rounds the bracket needs.
 */
export function buildKnockoutBracket(
  teams: BracketTeam[],
  startMatchNumber: number
): { matches: BracketMatchDoc[]; nextMatchNumber: number } {
  const n = teams.length;
  if (n < 2) {
    return { matches: [], nextMatchNumber: startMatchNumber };
  }

  const size = nextPowerOfTwo(n);
  const byes = size - n;
  const order = seedOrder(size);

  let roundSlots: SlotRef[] = order.map((seed) => ({
    kind: 'team',
    team: seed <= n ? teams[seed - 1] : TBD,
  }));

  const matches: BracketMatchDoc[] = [];
  let matchNumber = startMatchNumber;
  let isFirstRound = true;

  while (roundSlots.length > 1) {
    const matchesInRound = roundSlots.length / 2;
    const label = roundLabel(matchesInRound, isFirstRound, byes > 0);
    const nextRoundSlots: SlotRef[] = [];

    for (let i = 0; i < matchesInRound; i++) {
      const a = roundSlots[2 * i];
      const b = roundSlots[2 * i + 1];
      const aIsBye = a.kind === 'team' && a.team.teamId === '';
      const bIsBye = b.kind === 'team' && b.team.teamId === '';

      // Byes only ever occur pre-seeded in the first round.
      if (isFirstRound && aIsBye !== bIsBye) {
        const passthrough = aIsBye ? (b as { kind: 'team'; team: BracketTeam }).team : (a as { kind: 'team'; team: BracketTeam }).team;
        nextRoundSlots.push({ kind: 'team', team: passthrough });
        continue;
      }

      const doc: BracketMatchDoc = {
        matchNumber,
        round: label,
        player1Name: a.kind === 'team' ? a.team.name : 'TBD',
        player1Partner: a.kind === 'team' ? a.team.partner || '' : '',
        player1TeamId: a.kind === 'team' ? a.team.teamId : '',
        player2Name: b.kind === 'team' ? b.team.name : 'TBD',
        player2Partner: b.kind === 'team' ? b.team.partner || '' : '',
        player2TeamId: b.kind === 'team' ? b.team.teamId : '',
        nextMatchNumber: null,
        nextMatchSlot: null,
      };
      matches.push(doc);

      if (a.kind === 'match') {
        a.doc.nextMatchNumber = matchNumber;
        a.doc.nextMatchSlot = 'player1';
      }
      if (b.kind === 'match') {
        b.doc.nextMatchNumber = matchNumber;
        b.doc.nextMatchSlot = 'player2';
      }

      nextRoundSlots.push({ kind: 'match', doc });
      matchNumber++;
    }

    roundSlots = nextRoundSlots;
    isFirstRound = false;
  }

  return { matches, nextMatchNumber: matchNumber };
}
