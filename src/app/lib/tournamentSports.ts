// Per-sport tournament rules shared by the admin pages, the public registration page and the
// APIs: who registers (a team or a person), which events and age groups exist, how a match is
// scored and which formats are allowed.

import type { TournamentFormat } from './league';

export type TournamentSport = 'badminton' | 'football' | 'cricket' | 'karate' | 'silambam' | 'taekwondo' | 'yoga';

export interface SportRules {
  label: string;
  emoji: string;
  gradient: string;
  /** Registers a team (team name + captain) rather than a player or pair. */
  team: boolean;
  /** Tournament "type" stored on the tournament. */
  type: 'singles' | 'doubles' | 'team';
  /** Events offered at registration; empty for team sports. */
  events: string[];
  /** Events that need a partner's name. */
  partnerEvents: string[];
  ageCategories: string[];
  /** Separate brackets per event as well as per age group (martial arts divisions). */
  divisionByEvent: boolean;
  /** How a match is scored: badminton keeps set-by-set scores, the rest one number per side. */
  scoring: 'sets' | 'goals' | 'runs' | 'points';
  formats: TournamentFormat[];
  /** League points; draws only exist where a league game can end level. */
  points: { win: number; draw: number };
}

/** Age groups every sport offers: Under 6 … Under 21, Under 23, then open/adult/veteran. */
export const AGE_GROUPS = [
  ...Array.from({ length: 16 }, (_, i) => `Under ${i + 6}`), // Under 6 … Under 21
  'Under 23',
  'Open',
  'Adult (18+)',
  'Veterans (40+)',
];
// Labels used by badminton entries registered before the common list existed
const LEGACY_BADMINTON_AGES = ['20 to 40 Adult', '40 plus Veteran'];

export const TOURNAMENT_SPORTS: Record<TournamentSport, SportRules> = {
  badminton: {
    label: 'Badminton',
    emoji: '🏸',
    gradient: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 60%, #ffaf7b 100%)',
    team: false,
    type: 'doubles',
    events: ['Singles', 'Doubles', 'Mixed Doubles'],
    partnerEvents: ['Doubles', 'Mixed Doubles'],
    ageCategories: [...AGE_GROUPS, ...LEGACY_BADMINTON_AGES],
    divisionByEvent: false,
    scoring: 'sets',
    formats: ['knockout'],
    points: { win: 2, draw: 1 },
  },
  football: {
    label: 'Football',
    emoji: '⚽',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #1f8f3a 100%)',
    team: true,
    type: 'team',
    events: [],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: false,
    scoring: 'goals',
    formats: ['knockout', 'league', 'league_knockout'],
    points: { win: 3, draw: 1 },
  },
  cricket: {
    label: 'Cricket',
    emoji: '🏏',
    gradient: 'linear-gradient(135deg, #05233a 0%, #1565c0 100%)',
    team: true,
    type: 'team',
    events: [],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: false,
    scoring: 'runs',
    formats: ['knockout', 'league', 'league_knockout'],
    points: { win: 2, draw: 1 }, // a tie (or no result) is shared
  },
  karate: {
    label: 'Karate',
    emoji: '🥋',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #b71c1c 100%)',
    team: false,
    type: 'singles',
    events: ['Kata', 'Kumite'],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: true,
    scoring: 'points',
    formats: ['knockout'],
    points: { win: 2, draw: 1 },
  },
  silambam: {
    label: 'Silambam',
    emoji: '🪵',
    gradient: 'linear-gradient(135deg, #3e2723 0%, #e65100 100%)',
    team: false,
    type: 'singles',
    events: ['Forms', 'Sparring'],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: true,
    scoring: 'points',
    formats: ['knockout'],
    points: { win: 2, draw: 1 },
  },
  taekwondo: {
    label: 'Taekwondo',
    emoji: '🥋',
    gradient: 'linear-gradient(135deg, #0d1b3d 0%, #1e40af 55%, #dc2626 100%)',
    team: false,
    type: 'singles',
    events: ['Poomsae', 'Kyorugi (Sparring)'],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: true,
    scoring: 'points',
    formats: ['knockout'],
    points: { win: 2, draw: 1 },
  },
  yoga: {
    label: 'Yoga',
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0d9488 60%, #fbbf24 100%)',
    team: false,
    type: 'singles',
    events: ['Yogasana', 'Artistic Yoga'],
    partnerEvents: [],
    ageCategories: AGE_GROUPS,
    divisionByEvent: true,
    scoring: 'points',
    formats: ['knockout'],
    points: { win: 2, draw: 1 },
  },
};

export const SPORT_KEYS = Object.keys(TOURNAMENT_SPORTS) as TournamentSport[];

/** Rules for a sport, falling back to badminton for unknown/old values. */
export const sportRules = (sport?: string): SportRules => TOURNAMENT_SPORTS[(sport || '').toLowerCase() as TournamentSport] || TOURNAMENT_SPORTS.badminton;

/** Every event type any sport offers (for model validation); teams register as "Team". */
export const ALL_EVENT_TYPES = Array.from(new Set(['Team', ...SPORT_KEYS.flatMap((k) => TOURNAMENT_SPORTS[k].events)]));

/** The bracket/league group a registration plays in. */
export const divisionFor = (sport: string | undefined, ageCategory: string, eventType?: string) =>
  sportRules(sport).divisionByEvent && eventType ? `${eventType} · ${ageCategory}` : ageCategory;

export const SCORE_LABEL: Record<SportRules['scoring'], string> = { sets: 'Sets', goals: 'Goals', runs: 'Runs', points: 'Points' };

/** Every group a registration can be placed in for this sport (admin edit dropdowns). */
export const divisionOptions = (sport?: string) => {
  const r = sportRules(sport);
  return r.divisionByEvent ? r.events.flatMap((e) => r.ageCategories.map((a) => `${e} · ${a}`)) : r.ageCategories;
};
