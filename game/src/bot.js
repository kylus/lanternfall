// An autopilot that plays the real rules. It exists so the game can be tested and photographed
// without a person: it keeps away from shadows and orbs, collects embers, aims at the nearest
// shadow and dashes out of a corner. `skill` from 0 to 1 is how well it does that.
import { ARENA } from './config.js';

const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const PRIORITY = ['heart', 'rapid', 'twin', 'power', 'glow', 'pierce', 'slowburn', 'magnet', 'boots', 'dash', 'nova', 'ricochet', 'refill'];

export function botIntent(world, skill = 1) {
  const p = world.player;
  let near = null;
  let nearD = Infinity;
  let ax = 0;
  let ay = 0;
  for (const e of world.enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < nearD) { nearD = d; near = e; }
    const reach = 150 + e.r + (e.state === 'dash' || e.state === 'wind' ? 80 : 0);
    if (d < reach) {
      const w = (reach - d) / reach;
      ax += ((p.x - e.x) / (d || 1)) * w * 2.2 * skill;
      ay += ((p.y - e.y) / (d || 1)) * w * 2.2 * skill;
    }
  }
  for (const o of world.orbs) {
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < 120) {
      ax += ((p.x - o.x) / (d || 1)) * (120 - d) / 60 * skill;
      ay += ((p.y - o.y) / (d || 1)) * (120 - d) / 60 * skill;
    }
  }
  // Walls push back, so the bot is not pinned in a corner.
  const wall = 90;
  ax += Math.max(0, wall - (p.x - ARENA.x)) / wall - Math.max(0, wall - (ARENA.x + ARENA.w - p.x)) / wall;
  ay += Math.max(0, wall - (p.y - ARENA.y)) / wall - Math.max(0, wall - (ARENA.y + ARENA.h - p.y)) / wall;
  // Without a threat, go for the closest ember, else circle the middle.
  let mx = ax;
  let my = ay;
  if (Math.hypot(ax, ay) < 0.25) {
    let ember = null;
    let emberD = Infinity;
    for (const m of world.embers) {
      const d = dist(p.x, p.y, m.x, m.y);
      if (d < emberD) { emberD = d; ember = m; }
    }
    if (ember !== null) {
      mx = (ember.x - p.x) / (emberD || 1);
      my = (ember.y - p.y) / (emberD || 1);
    } else if (near !== null && nearD > 260) {
      mx = (near.x - p.x) / nearD;
      my = (near.y - p.y) / nearD;
    } else {
      mx = Math.cos(world.t * 0.7);
      my = Math.sin(world.t * 0.9);
    }
  }
  const aimAt = near === null ? null : near;
  return {
    mx, my,
    ax: aimAt === null ? Math.cos(p.aim) : aimAt.x - p.x,
    ay: aimAt === null ? Math.sin(p.aim) : aimAt.y - p.y,
    fire: aimAt !== null && nearD < 560,
    dash: near !== null && nearD < 58 + (1 - skill) * 20 && p.dashCd <= 0,
  };
}

/** The index of the card the bot would take. */
export function botCard(world) {
  let best = 0;
  let bestRank = Infinity;
  world.cards.forEach((card, i) => {
    const rank = PRIORITY.indexOf(card.id);
    if (rank < bestRank) { bestRank = rank; best = i; }
  });
  return best;
}
