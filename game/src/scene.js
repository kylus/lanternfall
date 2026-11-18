// Draws the floor, everything that lives on it, and the darkness over it. The lantern's light is a hole
// cut in a night-coloured layer; embers, bolts and glowcaps cut smaller holes. Eyes and glows are drawn
// on top of the night, so a creature in the dark is still a pair of eyes.
import { ARENA, COLORS, H, PLAYER, W } from './config.js';
import { ENEMY_TYPES } from './enemies.js';
import { createRng } from './rng.js';
import { glow } from './draw.js';
import { lightRadius } from './world.js';

/** Fixed glowing mushrooms: faint pools of light so the dark has places in it. */
export const GLOWCAPS = [
  { x: 170, y: 150, c: '#6ee7c8' }, { x: 1090, y: 120, c: '#b48cff' }, { x: 640, y: 96, c: '#6ee7c8' },
  { x: 120, y: 560, c: '#b48cff' }, { x: 1150, y: 600, c: '#6ee7c8' }, { x: 640, y: 640, c: '#ffb86b' },
];

let floorCanvas = null;
let nightCanvas = null;

/** The stone floor and its frame, drawn once. */
function floorLayer() {
  if (floorCanvas !== null) return floorCanvas;
  floorCanvas = document.createElement('canvas');
  floorCanvas.width = W;
  floorCanvas.height = H;
  const c = floorCanvas.getContext('2d');
  const rng = createRng(7);
  c.fillStyle = COLORS.wall;
  c.fillRect(0, 0, W, H);
  for (let ty = 0; ty < ARENA.h; ty += 48) {
    for (let tx = 0; tx < ARENA.w; tx += 48) {
      c.fillStyle = (tx / 48 + ty / 48) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
      c.fillRect(ARENA.x + tx, ARENA.y + ty, 48, 48);
      if (rng.chance(0.18)) {
        c.strokeStyle = 'rgba(120,100,180,0.12)';
        c.beginPath();
        const x = ARENA.x + tx + rng.range(6, 40);
        const y = ARENA.y + ty + rng.range(6, 40);
        c.moveTo(x, y);
        c.lineTo(x + rng.range(-16, 16), y + rng.range(-16, 16));
        c.lineTo(x + rng.range(-20, 20), y + rng.range(-20, 20));
        c.stroke();
      }
    }
  }
  c.strokeStyle = COLORS.wallEdge;
  c.lineWidth = 4;
  c.strokeRect(ARENA.x - 2, ARENA.y - 2, ARENA.w + 4, ARENA.h + 4);
  for (const g of GLOWCAPS) {
    c.fillStyle = g.c;
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      c.arc(g.x + (i - 1) * 9, g.y + (i % 2) * 5, 4 + (i % 2) * 2, Math.PI, 0);
      c.fill();
    }
  }
  return floorCanvas;
}

function drawEnemy(ctx, e, t) {
  const def = ENEMY_TYPES[e.type];
  const wob = Math.sin(e.bob + t * 6) * 1.5;
  const flash = e.flash > 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.type === 'eclipse') {
    ctx.strokeStyle = 'rgba(165,140,255,0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i += 1) {
      const a = t * 0.6 + (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (e.r + 4), Math.sin(a) * (e.r + 4));
      ctx.lineTo(Math.cos(a) * (e.r + 18 + Math.sin(t * 3 + i) * 5), Math.sin(a) * (e.r + 18 + Math.sin(t * 3 + i) * 5));
      ctx.stroke();
    }
  }
  if (e.state === 'wind') {
    ctx.strokeStyle = 'rgba(255,120,140,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 8 + Math.sin(t * 30) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = flash ? '#ffe7c0' : def.color;
  ctx.beginPath();
  if (e.type === 'darter') {
    const a = Math.atan2(e.vy || e.dy, e.vx || e.dx);
    ctx.rotate(a);
    ctx.moveTo(e.r + 5, 0);
    ctx.lineTo(-e.r, e.r * 0.9);
    ctx.lineTo(-e.r * 0.4, 0);
    ctx.lineTo(-e.r, -e.r * 0.9);
    ctx.closePath();
  } else if (e.type === 'hulk') {
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const r = e.r * (i % 2 === 0 ? 1.12 : 0.88);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  } else {
    ctx.ellipse(0, 0, e.r + wob, e.r - wob, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
  if (e.maxHp > 6 && e.hp < e.maxHp && e.type !== 'eclipse') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4);
    ctx.fillStyle = COLORS.hurt;
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * (e.hp / e.maxHp), 4);
  }
}

function drawEyes(ctx, e) {
  const def = ENEMY_TYPES[e.type];
  const dark = e.flash > 0 ? '#ffffff' : '#fff0c2';
  ctx.fillStyle = dark;
  const gap = Math.max(4, e.r * 0.42);
  const size = e.type === 'eclipse' ? 7 : Math.max(2.5, e.r * 0.2);
  const looking = e.state === 'wind' ? '#ff6a86' : dark;
  ctx.fillStyle = looking;
  ctx.beginPath();
  ctx.ellipse(e.x - gap, e.y - e.r * 0.15, size, size * 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(e.x + gap, e.y - e.r * 0.15, size, size * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (def.boss) {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.r * 0.35, size * 0.8, size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, world, t) {
  const p = world.player;
  if (p.invuln > 0 && p.flash <= 0 && Math.floor(t * 20) % 2 === 0 && p.dashT <= 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = p.flash > 0 ? '#ffd6dc' : '#3b3160';
  ctx.beginPath();
  ctx.moveTo(0, -PLAYER.radius - 5);
  ctx.quadraticCurveTo(PLAYER.radius + 5, -4, PLAYER.radius, PLAYER.radius);
  ctx.lineTo(-PLAYER.radius, PLAYER.radius);
  ctx.quadraticCurveTo(-PLAYER.radius - 5, -4, 0, -PLAYER.radius - 5);
  ctx.fill();
  ctx.fillStyle = '#12101c';
  ctx.beginPath();
  ctx.ellipse(0, -3, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.flameCore;
  ctx.beginPath();
  ctx.arc(-2.5, -3, 1.8, 0, Math.PI * 2);
  ctx.arc(2.5, -3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const lx = p.x + Math.cos(p.aim) * 19;
  const ly = p.y + Math.sin(p.aim) * 19;
  ctx.strokeStyle = '#6b5a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * 8, p.y + Math.sin(p.aim) * 8);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = COLORS.flameCore;
  ctx.beginPath();
  ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Cut a soft hole of `radius` in the night layer at (x, y). */
function cut(n, x, y, radius, strength) {
  const g = n.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.8})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  n.fillStyle = g;
  n.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function drawScene(ctx, world, t, { showPlayer = true } = {}) {
  ctx.drawImage(floorLayer(), 0, 0);
  for (const g of GLOWCAPS) glow(ctx, g.x, g.y, 70, g.c, 0.16 + Math.sin(t * 2 + g.x) * 0.03);
  for (const r of world.rings) {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, r.life * 2);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const e of world.enemies) drawEnemy(ctx, e, t);
  for (const o of world.orbs) {
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (showPlayer) drawPlayer(ctx, world, t);

  if (nightCanvas === null) {
    nightCanvas = document.createElement('canvas');
    nightCanvas.width = W;
    nightCanvas.height = H;
  }
  const n = nightCanvas.getContext('2d');
  n.globalCompositeOperation = 'source-over';
  n.clearRect(0, 0, W, H);
  n.fillStyle = COLORS.night;
  n.fillRect(0, 0, W, H);
  n.globalCompositeOperation = 'destination-out';
  const p = world.player;
  const flicker = 1 + Math.sin(t * 13) * 0.012 + Math.sin(t * 7.3) * 0.01;
  cut(n, p.x, p.y, lightRadius(world) * flicker, 1);
  for (const g of GLOWCAPS) cut(n, g.x, g.y, 95, 0.42);
  for (const s of world.shots) cut(n, s.x, s.y, 70, 0.7);
  for (const m of world.embers) cut(n, m.x, m.y, 46, 0.6);
  for (const o of world.orbs) cut(n, o.x, o.y, 44, 0.5);
  for (const e of world.enemies) if (ENEMY_TYPES[e.type].boss) cut(n, e.x, e.y, 120, 0.3);
  for (const r of world.rings) cut(n, r.x, r.y, r.r + 40, Math.max(0, r.life) * 0.9);
  ctx.drawImage(nightCanvas, 0, 0);

  // On top of the night: a warm wash where the lantern reaches, then eyes, glows and sparks.
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, p.x, p.y, lightRadius(world) * flicker, 'rgba(255,170,80,0.34)', 1);
  ctx.globalCompositeOperation = 'source-over';
  for (const e of world.enemies) drawEyes(ctx, e);
  ctx.globalCompositeOperation = 'lighter';
  for (const m of world.embers) {
    glow(ctx, m.x, m.y, 16, COLORS.ember, 0.9);
    glow(ctx, m.x, m.y, 5, '#fff2c9', 1);
  }
  for (const s of world.shots) {
    glow(ctx, s.x, s.y, 20, COLORS.flame, 0.85);
    glow(ctx, s.x, s.y, 6, '#ffffff', 1);
  }
  for (const o of world.orbs) glow(ctx, o.x, o.y, 18, o.color, 0.8);
  if (showPlayer) glow(ctx, p.x + Math.cos(p.aim) * 19, p.y + Math.sin(p.aim) * 19, 34, COLORS.flame, 0.7);
  for (const q of world.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size * (0.4 + 0.6 * (q.life / q.max)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
