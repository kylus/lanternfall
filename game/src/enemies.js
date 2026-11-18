// The things that live in the dark. Each kind is a definition (size, health, what it drops) and a
// behaviour function run every step. Behaviours only steer the enemy and may ask the world to fire an
// orb or spawn more enemies; the world does the moving, the hitting and the dying.
import { COLORS } from './config.js';

const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

function toward(e, tx, ty, speed) {
  const d = dist(e.x, e.y, tx, ty) || 1;
  e.vx = ((tx - e.x) / d) * speed;
  e.vy = ((ty - e.y) / d) * speed;
}

/** Walks straight at the player. */
function gloomling(e, w, dt) {
  toward(e, w.player.x, w.player.y, e.speed);
  e.bob += dt * 6;
}

/** Stalks, crouches, then lunges along a locked line. */
function darter(e, w, dt) {
  e.timer -= dt;
  if (e.state === 'seek') {
    toward(e, w.player.x, w.player.y, e.speed * 0.55);
    if (e.timer <= 0 && dist(e.x, e.y, w.player.x, w.player.y) < 340) {
      e.state = 'wind';
      e.timer = 0.55;
    }
  } else if (e.state === 'wind') {
    e.vx = 0;
    e.vy = 0;
    if (e.timer <= 0) {
      const d = dist(e.x, e.y, w.player.x, w.player.y) || 1;
      e.dx = (w.player.x - e.x) / d;
      e.dy = (w.player.y - e.y) / d;
      e.state = 'dash';
      e.timer = 0.42;
    }
  } else {
    e.vx = e.dx * e.speed * 3.6;
    e.vy = e.dy * e.speed * 3.6;
    if (e.timer <= 0) {
      e.state = 'seek';
      e.timer = 0.9;
    }
  }
}

/** Keeps its distance and lobs slow orbs. */
function spitter(e, w, dt) {
  const d = dist(e.x, e.y, w.player.x, w.player.y);
  if (d > 330) toward(e, w.player.x, w.player.y, e.speed);
  else if (d < 220) toward(e, w.player.x, w.player.y, -e.speed);
  else {
    e.vx = (-(w.player.y - e.y) / (d || 1)) * e.speed * 0.6;
    e.vy = ((w.player.x - e.x) / (d || 1)) * e.speed * 0.6;
  }
  e.timer -= dt;
  if (e.timer <= 0) {
    e.timer = 2.1;
    w.fireOrb(e.x, e.y, Math.atan2(w.player.y - e.y, w.player.x - e.x), 175, COLORS.spitter);
  }
}

/** Slow and heavy; breaks into gloomlings when it dies (see onDeath). */
function hulk(e, w) {
  toward(e, w.player.x, w.player.y, e.speed);
}

/** The Eclipse: drifts, then cycles through an orb spray, a summon and a charge. */
function eclipse(e, w, dt) {
  e.timer -= dt;
  if (e.state === 'drift') {
    toward(e, w.player.x, w.player.y, e.speed);
    if (e.timer <= 0) {
      e.phase = (e.phase + 1) % 3;
      e.state = ['spray', 'summon', 'wind'][e.phase];
      e.timer = e.state === 'spray' ? 2.6 : e.state === 'summon' ? 0.6 : 0.8;
      e.shotClock = 0;
    }
  } else if (e.state === 'spray') {
    e.vx = 0;
    e.vy = 0;
    e.shotClock -= dt;
    if (e.shotClock <= 0) {
      e.shotClock = 0.17;
      e.spin += 0.5;
      for (let i = 0; i < 6; i += 1) w.fireOrb(e.x, e.y, e.spin + (i * Math.PI) / 3, 150, COLORS.eclipse);
    }
    if (e.timer <= 0) endPhase(e);
  } else if (e.state === 'summon') {
    e.vx = 0;
    e.vy = 0;
    if (e.timer <= 0) {
      for (let i = 0; i < 3 + Math.floor(w.wave / 5); i += 1) w.spawnEnemy('gloomling', e.x + (i - 1) * 40, e.y + 50);
      endPhase(e);
    }
  } else if (e.state === 'wind') {
    e.vx = 0;
    e.vy = 0;
    if (e.timer <= 0) {
      const d = dist(e.x, e.y, w.player.x, w.player.y) || 1;
      e.dx = (w.player.x - e.x) / d;
      e.dy = (w.player.y - e.y) / d;
      e.state = 'dash';
      e.timer = 0.7;
    }
  } else if (e.state === 'dash') {
    e.vx = e.dx * 400;
    e.vy = e.dy * 400;
    if (e.timer <= 0) endPhase(e);
  }
}

function endPhase(e) {
  e.state = 'drift';
  e.timer = 1.6;
  e.vx = 0;
  e.vy = 0;
}

export const ENEMY_TYPES = {
  gloomling: { hp: 2, r: 13, speed: 72, damage: 1, embers: 1, score: 10, color: COLORS.gloom, ai: gloomling },
  darter: { hp: 1, r: 10, speed: 90, damage: 1, embers: 1, score: 15, color: COLORS.darter, ai: darter },
  spitter: { hp: 3, r: 14, speed: 62, damage: 1, embers: 2, score: 25, color: COLORS.spitter, ai: spitter },
  hulk: { hp: 12, r: 25, speed: 46, damage: 2, embers: 4, score: 60, color: COLORS.hulk, ai: hulk, onDeath: (w, e) => {
    for (let i = 0; i < 3; i += 1) w.spawnEnemy('gloomling', e.x + Math.cos(i * 2.1) * 20, e.y + Math.sin(i * 2.1) * 20);
  } },
  eclipse: { hp: 80, r: 44, speed: 38, damage: 2, embers: 14, score: 500, color: COLORS.eclipse, ai: eclipse, boss: true },
};

/** Which kinds can appear in a wave, with their weights: new kinds arrive as the waves go on. */
export function spawnTable(wave) {
  const table = [['gloomling', 10]];
  if (wave >= 2) table.push(['darter', 4 + wave]);
  if (wave >= 3) table.push(['spitter', 2 + wave * 0.6]);
  if (wave >= 4) table.push(['hulk', 1 + wave * 0.4]);
  return table;
}

export function makeEnemy(type, x, y, wave, rng) {
  const def = ENEMY_TYPES[type];
  const hp = Math.round(def.hp * (def.boss ? 1 + (wave - 5) * 0.5 : 1 + wave * 0.08) * 10) / 10;
  return {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    r: def.r,
    hp,
    maxHp: hp,
    speed: def.speed * (1 + wave * 0.035),
    flash: 0,
    bob: rng.range(0, 6),
    state: type === 'eclipse' ? 'drift' : 'seek',
    timer: type === 'eclipse' ? 1.8 : 0.6 + rng.next(),
    phase: -1,
    spin: 0,
    shotClock: 0,
    dx: 0,
    dy: 0,
    age: 0,
  };
}
