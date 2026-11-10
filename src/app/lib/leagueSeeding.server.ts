import Match from '../models/Match';
import Tournament from '../models/Tournament';
import { sportRules } from './tournamentSports';
import { leagueFinished, leagueTable, seedLabel } from './league';

/**
 * Fill the knockout slots that follow a league ("League 1st" vs "League 4th") with the teams
 * holding those positions — once every league match in the group is done. Until then (or if a
 * result is reopened) not-yet-started slots show the placeholder again. Started or finished
 * knockout matches are never touched.
 */
export async function seedKnockoutFromLeague(tournamentId: string, category?: string) {
  const all = await (Match.find as any)({ tournamentId }).lean();
  const group = all.filter((m: any) => (m.category || '') === (category || ''));
  const finished = leagueFinished(group);
  const tournament = finished ? await (Tournament.findById as any)(tournamentId).select('sport').lean() : null;
  const table = finished ? leagueTable(group, sportRules(tournament?.sport).points) : [];

  for (const m of group) {
    if (m.stage !== 'knockout' || m.status !== 'scheduled') continue;
    const update: Record<string, string> = {};
    for (const slot of ['player1', 'player2'] as const) {
      const seed = m[`${slot}Seed`];
      if (!seed) continue;
      const row = table[seed - 1];
      update[`${slot}Name`] = row ? row.name : seedLabel(seed);
      update[`${slot}Partner`] = row ? row.partner : '';
    }
    const changed = Object.entries(update).some(([k, v]) => (m[k] || '') !== v);
    if (changed) await (Match.updateOne as any)({ _id: m._id }, { $set: update });
  }
}
