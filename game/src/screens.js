// The full-screen states around the play: title, upgrade cards, pause, and the two endings.
import { COLORS, FINAL_WAVE, H, W } from './config.js';
import { UPGRADES } from './upgrades.js';
import { FONT, glow, roundRect, text } from './draw.js';
import { panel } from './hud.js';
import { drawIcon } from './icons.js';

const dim = (ctx, alpha) => {
  ctx.fillStyle = `rgba(4,4,12,${alpha})`;
  ctx.fillRect(0, 0, W, H);
};

/** The three upgrade cards' rectangles, shared by the drawing and the mouse hit test. */
export function cardRects(count) {
  const w = 300;
  const h = 330;
  const gap = 34;
  const left = (W - (count * w + (count - 1) * gap)) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: left + i * (w + gap), y: 230, w, h }));
}

export function drawTitle(ctx, t, best, mouse) {
  dim(ctx, 0.35);
  glow(ctx, W / 2, 190, 360, 'rgba(255,193,90,0.35)', 0.8 + Math.sin(t * 2) * 0.1);
  text(ctx, 'LANTERNFALL', W / 2, 205, { size: 104, align: 'center', color: COLORS.flameCore, spacing: 10 });
  text(ctx, 'Keep the last lantern burning. Ten waves until dawn.', W / 2, 252, { size: 24, align: 'center', color: COLORS.dim, spacing: 1, weight: 500 });

  panel(ctx, W / 2 - 330, 300, 660, 214);
  const rows = [
    ['WASD / Arrows', 'walk through the dark'],
    ['Mouse  +  hold click', 'aim and throw bolts of light'],
    ['Space', 'dash: a short step nothing can hurt'],
    ['Embers', 'dropped by shadows: they refill the lantern'],
    ['Lantern empty?', 'the dark bites. Shrinking light, rising danger'],
  ];
  rows.forEach(([key, what], i) => {
    text(ctx, key, W / 2 - 300, 342 + i * 38, { size: 19, color: COLORS.flame });
    text(ctx, what, W / 2 - 80, 342 + i * 38, { size: 19, color: COLORS.ink, weight: 500 });
  });

  const pulse = 0.75 + Math.sin(t * 4) * 0.25;
  const hover = mouse.x > W / 2 - 210 && mouse.x < W / 2 + 210 && mouse.y > 548 && mouse.y < 612;
  roundRect(ctx, W / 2 - 210, 548, 420, 64, 32);
  ctx.fillStyle = hover ? COLORS.flame : `rgba(255,193,90,${0.2 + pulse * 0.3})`;
  ctx.fill();
  ctx.strokeStyle = COLORS.flame;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'LIGHT THE LANTERN', W / 2, 590, { size: 26, align: 'center', color: hover ? '#2a1a05' : COLORS.flameCore, spacing: 3, shadow: !hover });
  text(ctx, 'click, or press Enter', W / 2, 640, { size: 15, align: 'center', color: COLORS.dim });
  if (best > 0) text(ctx, `BEST SCORE  ${String(best).padStart(6, '0')}`, W / 2, 676, { size: 16, align: 'center', color: COLORS.good, spacing: 3 });
}

export function drawCardsScreen(ctx, world, t, mouse) {
  dim(ctx, 0.72);
  text(ctx, `WAVE ${world.wave} CLEARED`, W / 2, 112, { size: 24, align: 'center', color: COLORS.good, spacing: 6 });
  text(ctx, 'Choose a flame', W / 2, 172, { size: 56, align: 'center', color: COLORS.flameCore, spacing: 3 });
  text(ctx, `${world.player.hp} of ${world.player.maxHp} hearts   ${world.score} points   next: wave ${world.wave + 1}`, W / 2, 204, { size: 16, align: 'center', color: COLORS.dim });
  const rects = cardRects(world.cards.length);
  world.cards.forEach((card, i) => {
    const r = rects[i];
    const hover = mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > r.y && mouse.y < r.y + r.h;
    const lift = hover ? -10 : 0;
    roundRect(ctx, r.x, r.y + lift, r.w, r.h, 18);
    ctx.fillStyle = hover ? 'rgba(52,40,84,0.98)' : 'rgba(26,22,44,0.96)';
    ctx.fill();
    ctx.strokeStyle = hover ? COLORS.flame : 'rgba(143,134,176,0.5)';
    ctx.lineWidth = hover ? 4 : 2;
    ctx.stroke();
    glow(ctx, r.x + r.w / 2, r.y + lift + 96, 90, 'rgba(255,193,90,0.35)');
    drawIcon(ctx, card.id, r.x + r.w / 2, r.y + lift + 96, 64 + Math.sin(t * 5 + i) * 2, COLORS.flameCore);
    text(ctx, String(i + 1), r.x + 22, r.y + lift + 40, { size: 24, color: COLORS.dim });
    text(ctx, card.name, r.x + r.w / 2, r.y + lift + 186, { size: 27, align: 'center', color: COLORS.flameCore });
    wrap(ctx, card.desc, r.x + r.w / 2, r.y + lift + 226, r.w - 56, 25, { size: 19, align: 'center', color: COLORS.ink, weight: 500 });
    const owned = world.taken[card.id] ?? 0;
    const max = Math.min(card.max, 4);
    if (card.max < 99) {
      for (let k = 0; k < max; k += 1) {
        ctx.fillStyle = k < owned ? COLORS.flame : 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2 + (k - (max - 1) / 2) * 20, r.y + lift + r.h - 30, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  text(ctx, 'click a card, or press 1 / 2 / 3', W / 2, 620, { size: 17, align: 'center', color: COLORS.dim, spacing: 2 });
  const taken = UPGRADES.filter((u) => world.taken[u.id]).map((u) => `${u.name} ${world.taken[u.id] > 1 ? `x${world.taken[u.id]}` : ''}`.trim());
  if (taken.length > 0) wrap(ctx, `Your build: ${taken.join(', ')}`, W / 2, 656, 1000, 22, { size: 14, align: 'center', color: 'rgba(143,134,176,0.85)', weight: 500 });
}

export function drawPause(ctx) {
  dim(ctx, 0.7);
  text(ctx, 'PAUSED', W / 2, H / 2 - 10, { size: 72, align: 'center', color: COLORS.flameCore, spacing: 10 });
  text(ctx, 'P or Esc to resume    R to restart    M to mute', W / 2, H / 2 + 40, { size: 20, align: 'center', color: COLORS.dim, spacing: 1 });
}

function statRows(ctx, world, best, isNew, y) {
  panel(ctx, W / 2 - 300, y, 600, 206);
  const rows = [
    ['Score', String(world.score)],
    ['Waves reached', `${world.wave} of ${FINAL_WAVE}`],
    ['Shadows put out', String(world.kills)],
    ['Best combo', String(world.bestCombo)],
    ['Embers gathered', String(world.embersTaken)],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, W / 2 - 260, y + 42 + i * 34, { size: 20, color: COLORS.dim, weight: 500 });
    text(ctx, v, W / 2 + 260, y + 42 + i * 34, { size: 22, align: 'right', color: i === 0 ? COLORS.flame : COLORS.ink });
  });
  text(ctx, isNew ? 'NEW BEST SCORE' : `BEST ${best}`, W / 2, y + 238, { size: 18, align: 'center', color: isNew ? COLORS.good : COLORS.dim, spacing: 4 });
}

function restartButton(ctx, t, mouse, y) {
  const hover = mouse.x > W / 2 - 190 && mouse.x < W / 2 + 190 && mouse.y > y && mouse.y < y + 60;
  roundRect(ctx, W / 2 - 190, y, 380, 60, 30);
  ctx.fillStyle = hover ? COLORS.flame : `rgba(255,193,90,${0.2 + (0.75 + Math.sin(t * 4) * 0.25) * 0.25})`;
  ctx.fill();
  ctx.strokeStyle = COLORS.flame;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'PLAY AGAIN', W / 2, y + 39, { size: 24, align: 'center', color: hover ? '#2a1a05' : COLORS.flameCore, spacing: 4, shadow: !hover });
  text(ctx, 'click, or press R', W / 2, y + 90, { size: 15, align: 'center', color: COLORS.dim });
}

export function drawOver(ctx, world, t, best, isNew, mouse) {
  dim(ctx, 0.74);
  text(ctx, 'THE LIGHT GOES OUT', W / 2, 150, { size: 64, align: 'center', color: COLORS.hurt, spacing: 6 });
  text(ctx, world.wave >= 5 ? 'The dark was patient. Try a different flame.' : 'The shadows closed in. Keep moving and keep burning.', W / 2, 192, { size: 20, align: 'center', color: COLORS.dim });
  statRows(ctx, world, best, isNew, 236);
  restartButton(ctx, t, mouse, 520);
}

export function drawWon(ctx, world, t, best, isNew, mouse) {
  dim(ctx, 0.55);
  glow(ctx, W / 2, 150, 380, 'rgba(255,193,90,0.45)');
  text(ctx, 'DAWN BREAKS', W / 2, 150, { size: 78, align: 'center', color: COLORS.flameCore, spacing: 10 });
  text(ctx, 'The Eclipse is gone and the lantern still burns.', W / 2, 192, { size: 22, align: 'center', color: COLORS.good });
  statRows(ctx, world, best, isNew, 236);
  restartButton(ctx, t, mouse, 520);
}

/** Wrapped, centred or left text in a column `width` wide. */
function wrap(ctx, str, x, y, width, lineHeight, style) {
  ctx.font = `${style.weight ?? 700} ${style.size}px ${FONT}`;
  const words = str.split(' ');
  let line = '';
  let row = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      text(ctx, line, x, y + row * lineHeight, style);
      line = word;
      row += 1;
    } else line = test;
  }
  if (line) text(ctx, line, x, y + row * lineHeight, style);
}
