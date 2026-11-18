// The upgrades offered between waves: three cards drawn at random, one taken. Each is a plain change to
// the player's stats; `max` is how many times it can be taken, so a build is a set of choices.
import { PLAYER } from './config.js';

export const UPGRADES = [
  { id: 'rapid', name: 'Quick Wick', max: 4, desc: 'Fire 22% faster.', apply: (p) => (p.fireInterval *= 0.78) },
  { id: 'twin', name: 'Twin Flame', max: 3, desc: 'One more bolt per shot, in a fan.', apply: (p) => (p.shots += 1) },
  { id: 'pierce', name: 'Bright Needle', max: 3, desc: 'Bolts pass through one more shadow.', apply: (p) => (p.pierce += 1) },
  { id: 'power', name: 'Hot Core', max: 4, desc: 'Bolts hit 40% harder.', apply: (p) => (p.damage *= 1.4) },
  { id: 'glow', name: 'Wide Glow', max: 3, desc: 'See 18% further into the dark.', apply: (p) => (p.lightScale *= 1.18) },
  { id: 'slowburn', name: 'Slow Burn', max: 3, desc: 'The lantern burns 28% slower.', apply: (p) => (p.fuelDecay *= 0.72) },
  { id: 'magnet', name: 'Ember Pull', max: 3, desc: 'Embers drift to you from further off.', apply: (p) => (p.magnet += 60) },
  { id: 'boots', name: 'Swift Boots', max: 3, desc: 'Move 12% faster.', apply: (p) => (p.speed *= 1.12) },
  { id: 'heart', name: 'Heartwick', max: 3, desc: 'One more heart, and a full heal.', apply: (p) => { p.maxHp += 1; p.hp = p.maxHp; } },
  { id: 'dash', name: 'Spark Step', max: 3, desc: 'Dash recharges 25% faster.', apply: (p) => (p.dashCooldown *= 0.75) },
  { id: 'nova', name: 'Dash Nova', max: 1, desc: 'Your dash ends in a burst of light bolts.', apply: (p) => (p.nova = true) },
  { id: 'ricochet', name: 'Bounce Light', max: 2, desc: 'Bolts bounce off the walls once.', apply: (p) => (p.bounces += 1) },
  { id: 'refill', name: 'Full Flask', max: 99, desc: 'Refill the lantern now.', apply: (p) => (p.fuel = PLAYER.fuelMax) },
];

/** Three different upgrades the player can still take. */
export function drawCards(rng, taken) {
  const open = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const picks = [];
  while (picks.length < 3 && open.length > 0) {
    picks.push(open.splice(rng.int(open.length), 1)[0]);
  }
  return picks;
}

export function takeUpgrade(player, taken, upgrade) {
  taken[upgrade.id] = (taken[upgrade.id] ?? 0) + 1;
  upgrade.apply(player);
}
