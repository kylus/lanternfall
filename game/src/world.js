// The rules of Lanternfall, with no drawing and no browser in them: a world is a plain object, and
// update(world, dt, intent) moves it forward. Because nothing here reads a clock or Math.random, a
// seed and a list of intents always play the same game, which is how the screenshots are made.
import { ARENA, COLORS, COMBO, FINAL_WAVE, BOSS_WAVES, H, PLAYER, W, WAVE_SECONDS } from './config.js';
import { createRng } from './rng.js';
import { ENEMY_TYPES, makeEnemy, spawnTable } from './enemies.js';
import { drawCards, takeUpgrade } from './upgrades.js';
import { sfx } from './audio.js';

export const PHASE = { PLAY: 'play', CARDS: 'cards', OVER: 'over', WON: 'won' };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isBossWave = (wave) => BOSS_WAVES.includes(wave);

export function createWorld(seed = 1) {
  const world = {
    seed,
    rng: createRng(seed),
    t: 0,
    phase: PHASE.PLAY,
    wave: 1,
    waveTime: 0,
    spawnClock: 1.4,
    bossSpawned: false,
    player: {
      x: W / 2, y: H / 2, vx: 0, vy: 0, aim: 0,
      hp: PLAYER.hp, maxHp: PLAYER.hp, fuel: PLAYER.fuelStart, fuelDecay: PLAYER.fuelDecay, darkTimer: 0,
      speed: PLAYER.speed, fireInterval: PLAYER.fireInterval, fireClock: 0, damage: PLAYER.shotDamage,
      shots: 1, pierce: 0, bounces: 0, lightScale: 1, magnet: PLAYER.magnet, nova: false,
      dashT: 0, dashCd: 0, dashCooldown: PLAYER.dashCooldown, dashDx: 1, dashDy: 0, invuln: 0, flash: 0,
    },
    enemies: [], shots: [], orbs: [], embers: [], particles: [], texts: [], rings: [],
    score: 0, kills: 0, combo: 0, comboTimer: 0, bestCombo: 0, embersTaken: 0,
    taken: {}, cards: [], shake: 0, hitstop: 0, banner: null, hitSoundClock: 0,
  };
  setBanner(world, 'Wave 1', 'Keep the lantern lit');
  return world;
}

function setBanner(world, text, sub) {
  world.banner = { text, sub, time: 2.4 };
}

/** How far the lantern lights the floor right now. */
export function lightRadius(world) {
  const p = world.player;
  const level = clamp(p.fuel / PLAYER.fuelMax, 0, 1);
  return (PLAYER.lightMin + (PLAYER.lightMax - PLAYER.lightMin) * Math.sqrt(level)) * p.lightScale;
}

export const comboMultiplier = (world) => 1 + Math.floor(world.combo / COMBO.step) * 0.5;

// ---- spawning ---------------------------------------------------------------------------------

function spark(world, x, y, color, count, speed, life = 0.5, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: world.rng.range(size * 0.6, size) });
  }
}

function floatText(world, x, y, text, color) {
  world.texts.push({ x, y, text, color, life: 0.8 });
}

export function spawnEnemy(world, type, x, y) {
  const e = makeEnemy(type, clamp(x, ARENA.x + 20, ARENA.x + ARENA.w - 20), clamp(y, ARENA.y + 20, ARENA.y + ARENA.h - 20), world.wave, world.rng);
  world.enemies.push(e);
  return e;
}

function fireOrb(world, x, y, angle, speed, color) {
  world.orbs.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 7, color, life: 7 });
}

/** A spawn point on the floor's edge, at least 320 px from the player. */
function edgePoint(world) {
  const p = world.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const side = world.rng.int(4);
    const x = side === 0 ? ARENA.x + 16 : side === 1 ? ARENA.x + ARENA.w - 16 : world.rng.range(ARENA.x, ARENA.x + ARENA.w);
    const y = side === 2 ? ARENA.y + 16 : side === 3 ? ARENA.y + ARENA.h - 16 : world.rng.range(ARENA.y, ARENA.y + ARENA.h);
    if (Math.hypot(x - p.x, y - p.y) > 320) return [x, y];
  }
  return [ARENA.x + 16, ARENA.y + 16];
}

function pickKind(world) {
  const table = spawnTable(world.wave);
  let roll = world.rng.next() * table.reduce((sum, row) => sum + row[1], 0);
  for (const [kind, weight] of table) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return 'gloomling';
}

// ---- hurting and killing ----------------------------------------------------------------------

function hurtPlayer(world, amount) {
  const p = world.player;
  if (p.invuln > 0 || world.phase !== PHASE.PLAY) return;
  p.hp -= amount;
  p.invuln = PLAYER.hurtInvuln;
  p.flash = 0.25;
  world.shake = Math.max(world.shake, 14);
  world.hitstop = 0.06;
  world.combo = 0;
  sfx.hurt();
  spark(world, p.x, p.y, COLORS.hurt, 18, 260, 0.6, 4);
  if (p.hp <= 0) {
    p.hp = 0;
    world.phase = PHASE.OVER;
    sfx.lose();
    spark(world, p.x, p.y, COLORS.flame, 60, 340, 1.2, 5);
    world.rings.push({ x: p.x, y: p.y, r: 10, max: 320, life: 1, color: COLORS.flame });
  }
}

function dropEmbers(world, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(40, 150);
    world.embers.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0 });
  }
}

function killEnemy(world, e, scored = true) {
  e.dead = true;
  const def = ENEMY_TYPES[e.type];
  spark(world, e.x, e.y, def.color, def.boss ? 70 : 14, def.boss ? 380 : 220, 0.6, 4);
  world.rings.push({ x: e.x, y: e.y, r: e.r, max: e.r * 2.6, life: 0.35, color: def.color });
  dropEmbers(world, e.x, e.y, def.embers);
  if (def.onDeath) def.onDeath({ spawnEnemy: (...args) => spawnEnemy(world, ...args) }, e);
  if (!scored) return;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = COMBO.window;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const points = Math.round(def.score * comboMultiplier(world));
  world.score += points;
  floatText(world, e.x, e.y - e.r, `+${points}`, COLORS.flame);
  world.shake = Math.max(world.shake, def.boss ? 26 : 5);
  world.hitstop = def.boss ? 0.2 : def.hp > 5 ? 0.06 : 0.02;
  sfx.kill();
}

// ---- the player -------------------------------------------------------------------------------

function fireBolts(world) {
  const p = world.player;
  const spread = 0.17;
  for (let i = 0; i < p.shots; i += 1) {
    const a = p.aim + (i - (p.shots - 1) / 2) * spread;
    world.shots.push({
      x: p.x + Math.cos(p.aim) * 18, y: p.y + Math.sin(p.aim) * 18,
      vx: Math.cos(a) * PLAYER.shotSpeed, vy: Math.sin(a) * PLAYER.shotSpeed,
      life: PLAYER.shotLife, damage: p.damage, pierce: p.pierce, bounces: p.bounces, hit: [],
    });
  }
  sfx.shoot();
}

function novaBurst(world) {
  const p = world.player;
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    world.shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 0.5, damage: p.damage * 1.5, pierce: 1, bounces: 0, hit: [] });
  }
  world.rings.push({ x: p.x, y: p.y, r: 10, max: 150, life: 0.4, color: COLORS.flame });
}

function updatePlayer(world, dt, intent) {
  const p = world.player;
  if (intent.ax !== 0 || intent.ay !== 0) p.aim = Math.atan2(intent.ay, intent.ax);
  let mx = intent.mx;
  let my = intent.my;
  const m = Math.hypot(mx, my);
  if (m > 0) { mx /= m; my /= m; }

  p.dashCd = Math.max(0, p.dashCd - dt);
  if (intent.dash && p.dashCd <= 0 && p.dashT <= 0) {
    p.dashDx = m > 0 ? mx : Math.cos(p.aim);
    p.dashDy = m > 0 ? my : Math.sin(p.aim);
    p.dashT = PLAYER.dashTime;
    p.dashCd = p.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.1);
    sfx.dash();
    spark(world, p.x, p.y, COLORS.flameCore, 10, 180, 0.3, 3);
  }
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashDx * PLAYER.dashSpeed;
    p.vy = p.dashDy * PLAYER.dashSpeed;
    if (world.rng.chance(0.7)) spark(world, p.x, p.y, COLORS.flame, 1, 60, 0.35, 3);
    if (p.dashT <= 0 && p.nova) novaBurst(world);
  } else {
    const step = PLAYER.accel * dt;
    p.vx += clamp(mx * p.speed - p.vx, -step, step);
    p.vy += clamp(my * p.speed - p.vy, -step, step);
  }
  p.x = clamp(p.x + p.vx * dt, ARENA.x + PLAYER.radius, ARENA.x + ARENA.w - PLAYER.radius);
  p.y = clamp(p.y + p.vy * dt, ARENA.y + PLAYER.radius, ARENA.y + ARENA.h - PLAYER.radius);

  p.fireClock -= dt;
  if (intent.fire && p.fireClock <= 0 && p.dashT <= 0) {
    p.fireClock = p.fireInterval;
    fireBolts(world);
  }

  p.fuel = Math.max(0, p.fuel - p.fuelDecay * dt);
  if (p.fuel <= 0) {
    p.darkTimer += dt;
    if (p.darkTimer >= 1 / PLAYER.darkDrain) {
      p.darkTimer = 0;
      hurtPlayer(world, 1);
      setBanner(world, 'The lantern is out', 'Collect embers!');
    }
  } else p.darkTimer = 0;
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);
}

// ---- waves ------------------------------------------------------------------------------------

function updateWave(world, dt) {
  world.waveTime += dt;
  const boss = isBossWave(world.wave);
  if (boss && !world.bossSpawned) {
    world.bossSpawned = true;
    const [x, y] = edgePoint(world);
    spawnEnemy(world, 'eclipse', x, y);
    sfx.boss();
    setBanner(world, 'The Eclipse rises', 'Light it up');
  }
  world.spawnClock -= dt;
  if (world.spawnClock <= 0) {
    world.spawnClock = boss ? 2.6 : Math.max(0.3, 1.35 - world.wave * 0.085);
    const count = 1 + (world.wave >= 6 && world.rng.chance(0.5) ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const [x, y] = edgePoint(world);
      spawnEnemy(world, boss ? 'gloomling' : pickKind(world), x, y);
    }
  }
  const bossAlive = world.enemies.some((e) => ENEMY_TYPES[e.type].boss);
  const done = boss ? world.bossSpawned && !bossAlive : world.waveTime >= WAVE_SECONDS;
  if (done) endWave(world);
}

function endWave(world) {
  for (const e of world.enemies) if (!e.dead) killEnemy(world, e, false);
  world.enemies = world.enemies.filter((e) => !e.dead);
  world.orbs = [];
  world.score += world.wave * 100;
  if (world.wave >= FINAL_WAVE) {
    world.phase = PHASE.WON;
    world.score += 1000 + world.player.hp * 250;
    sfx.win();
    setBanner(world, 'Dawn', 'The Eclipse is gone');
    return;
  }
  world.phase = PHASE.CARDS;
  world.cards = drawCards(world.rng, world.taken);
  sfx.wave();
}

/** Take the upgrade in slot `index` and begin the next wave. */
export function chooseCard(world, index) {
  if (world.phase !== PHASE.CARDS || index < 0 || index >= world.cards.length) return false;
  takeUpgrade(world.player, world.taken, world.cards[index]);
  world.cards = [];
  world.wave += 1;
  world.waveTime = 0;
  world.bossSpawned = false;
  world.spawnClock = 1.2;
  world.phase = PHASE.PLAY;
  world.player.invuln = 1;
  setBanner(world, `Wave ${world.wave}`, isBossWave(world.wave) ? 'Something large is coming' : 'Hold the light');
  sfx.card();
  return true;
}

// ---- everything else that moves ---------------------------------------------------------------

function updateEnemies(world, dt) {
  const p = world.player;
  for (const e of world.enemies) {
    e.age += dt;
    ENEMY_TYPES[e.type].ai(e, { player: p, wave: world.wave, fireOrb: (...a) => fireOrb(world, ...a), spawnEnemy: (...a) => spawnEnemy(world, ...a) }, dt);
    e.x = clamp(e.x + (e.vx + e.kx) * dt, ARENA.x + e.r, ARENA.x + ARENA.w - e.r);
    e.y = clamp(e.y + (e.vy + e.ky) * dt, ARENA.y + e.r, ARENA.y + ARENA.h - e.r);
    const damp = Math.max(0, 1 - 9 * dt);
    e.kx *= damp;
    e.ky *= damp;
    e.flash = Math.max(0, e.flash - dt);
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < e.r + PLAYER.radius * 0.8) hurtPlayer(world, ENEMY_TYPES[e.type].damage);
  }
  // Soft separation, so a crowd spreads out instead of stacking on one point.
  for (let i = 0; i < world.enemies.length; i += 1) {
    const a = world.enemies[i];
    for (let j = i + 1; j < world.enemies.length; j += 1) {
      const b = world.enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
      }
    }
  }
}

function updateShots(world, dt) {
  world.hitSoundClock -= dt;
  for (const s of world.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    const outX = s.x < ARENA.x || s.x > ARENA.x + ARENA.w;
    const outY = s.y < ARENA.y || s.y > ARENA.y + ARENA.h;
    if (outX || outY) {
      if (s.bounces > 0) {
        s.bounces -= 1;
        if (outX) s.vx = -s.vx;
        if (outY) s.vy = -s.vy;
        s.x = clamp(s.x, ARENA.x, ARENA.x + ARENA.w);
        s.y = clamp(s.y, ARENA.y, ARENA.y + ARENA.h);
        s.hit = [];
      } else s.life = 0;
    }
    if (s.life <= 0) continue;
    for (const e of world.enemies) {
      if (e.dead || s.hit.includes(e)) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > e.r + 5) continue;
      s.hit.push(e);
      e.hp -= s.damage;
      e.flash = 0.12;
      const speed = Math.hypot(s.vx, s.vy) || 1;
      e.kx += (s.vx / speed) * (ENEMY_TYPES[e.type].boss ? 20 : 170);
      e.ky += (s.vy / speed) * (ENEMY_TYPES[e.type].boss ? 20 : 170);
      spark(world, s.x, s.y, COLORS.flame, 4, 150, 0.25, 2.5);
      if (world.hitSoundClock <= 0) { sfx.hit(); world.hitSoundClock = 0.04; }
      if (e.hp <= 0) killEnemy(world, e);
      if (s.pierce <= 0) { s.life = 0; break; }
      s.pierce -= 1;
    }
  }
  world.shots = world.shots.filter((s) => s.life > 0);
  world.enemies = world.enemies.filter((e) => !e.dead);
}

function updateOrbs(world, dt) {
  const p = world.player;
  for (const o of world.orbs) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.x < ARENA.x || o.x > ARENA.x + ARENA.w || o.y < ARENA.y || o.y > ARENA.y + ARENA.h) o.life = 0;
    if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + PLAYER.radius * 0.7) {
      o.life = 0;
      hurtPlayer(world, 1);
    }
  }
  world.orbs = world.orbs.filter((o) => o.life > 0);
}

function updateEmbers(world, dt) {
  const p = world.player;
  for (const m of world.embers) {
    m.age += dt;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < p.magnet + 30 && m.age > 0.25) {
      const pull = 520 * (1 - d / (p.magnet + 30)) + 160;
      m.vx += ((p.x - m.x) / (d || 1)) * pull * dt * 6;
      m.vy += ((p.y - m.y) / (d || 1)) * pull * dt * 6;
    }
    const damp = Math.max(0, 1 - 3 * dt);
    m.vx *= damp;
    m.vy *= damp;
    m.x = clamp(m.x + m.vx * dt, ARENA.x + 6, ARENA.x + ARENA.w - 6);
    m.y = clamp(m.y + m.vy * dt, ARENA.y + 6, ARENA.y + ARENA.h - 6);
    if (d < PLAYER.radius + 9 && m.age > 0.15) {
      m.taken = true;
      p.fuel = Math.min(PLAYER.fuelMax, p.fuel + 7);
      world.score += 1;
      world.embersTaken += 1;
      sfx.pickup(Math.min(8, world.combo / 3));
    }
  }
  world.embers = world.embers.filter((m) => !m.taken);
}

function updateEffects(world, dt) {
  for (const q of world.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= Math.max(0, 1 - 3 * dt);
    q.vy *= Math.max(0, 1 - 3 * dt);
    q.life -= dt;
  }
  world.particles = world.particles.filter((q) => q.life > 0);
  for (const t of world.texts) { t.y -= 34 * dt; t.life -= dt; }
  world.texts = world.texts.filter((t) => t.life > 0);
  for (const r of world.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, 9 * dt); }
  world.rings = world.rings.filter((r) => r.life > 0);
  world.shake = Math.max(0, world.shake - 60 * dt);
  if (world.banner) { world.banner.time -= dt; if (world.banner.time <= 0) world.banner = null; }
}

/** Move the world forward by `dt` seconds. */
export function update(world, dt, intent) {
  if (world.hitstop > 0) { world.hitstop -= dt; updateEffects(world, dt * 0.2); return; }
  updateEffects(world, dt);
  if (world.phase !== PHASE.PLAY) return;
  world.t += dt;
  updatePlayer(world, dt, intent);
  if (world.comboTimer > 0) { world.comboTimer -= dt; if (world.comboTimer <= 0) world.combo = 0; }
  updateWave(world, dt);
  if (world.phase !== PHASE.PLAY) return;
  updateEnemies(world, dt);
  updateShots(world, dt);
  updateOrbs(world, dt);
  updateEmbers(world, dt);
}
