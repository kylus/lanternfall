// The heads-up display: hearts, the lantern's oil, the wave clock, score and combo, the dash charge
// and the boss's health. Drawn after the scene, never shaken, so it always reads at a glance.
import { BOSS_WAVES, COLORS, COMBO, FINAL_WAVE, H, PLAYER, W, WAVE_SECONDS } from './config.js';
import { ENEMY_TYPES } from './enemies.js';
import { bar, glow, heart, roundRect, text } from './draw.js';
import { comboMultiplier } from './world.js';

export function drawHud(ctx, world, t, best) {
  const p = world.player;

  for (let i = 0; i < p.maxHp; i += 1) {
    heart(ctx, 70 + i * 34, 30, 26, false, 'rgba(255,90,110,0.35)');
    if (i < p.hp) heart(ctx, 70 + i * 34, 30, 26, true, i < p.hp && p.flash > 0 ? '#ffffff' : COLORS.hurt);
  }
  text(ctx, 'LIFE', 20, 36, { size: 13, color: COLORS.dim, spacing: 2 });

  text(ctx, 'LANTERN', 20, 66, { size: 13, color: COLORS.dim, spacing: 2 });
  const fuel = p.fuel / PLAYER.fuelMax;
  const low = fuel < 0.22;
  bar(ctx, 96, 54, 190, 14, fuel, low ? (Math.floor(t * 6) % 2 ? COLORS.hurt : COLORS.ember) : COLORS.flame);
  if (low) text(ctx, 'LOW', 294, 66, { size: 13, color: COLORS.hurt, spacing: 2 });

  const boss = BOSS_WAVES.includes(world.wave);
  text(ctx, `WAVE ${world.wave} / ${FINAL_WAVE}`, W / 2, 34, { size: 22, align: 'center', spacing: 3 });
  if (boss) {
    text(ctx, 'DEFEAT THE ECLIPSE', W / 2, 58, { size: 13, align: 'center', color: COLORS.eclipse, spacing: 3 });
  } else {
    bar(ctx, W / 2 - 110, 44, 220, 8, world.waveTime / WAVE_SECONDS, COLORS.good);
    text(ctx, `${Math.max(0, Math.ceil(WAVE_SECONDS - world.waveTime))}s`, W / 2, 70, { size: 13, align: 'center', color: COLORS.dim });
  }

  text(ctx, String(world.score).padStart(6, '0'), W - 24, 36, { size: 30, align: 'right', spacing: 2 });
  text(ctx, `BEST ${String(Math.max(best, world.score)).padStart(6, '0')}`, W - 24, 58, { size: 13, align: 'right', color: COLORS.dim, spacing: 2 });
  if (world.combo >= 2) {
    const mult = comboMultiplier(world);
    text(ctx, `${world.combo} COMBO  x${mult.toFixed(1)}`, W - 24, 84, { size: 16, align: 'right', color: COLORS.flame, spacing: 1 });
    bar(ctx, W - 164, 92, 140, 5, world.comboTimer / COMBO.window, COLORS.flame);
  }

  // Dash charge: a ring around the player that fills while the dash recharges.
  const ready = 1 - p.dashCd / p.dashCooldown;
  ctx.strokeStyle = ready >= 1 ? 'rgba(124,227,192,0.6)' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
  ctx.stroke();

  const eclipse = world.enemies.find((e) => ENEMY_TYPES[e.type].boss);
  if (eclipse) {
    text(ctx, 'THE ECLIPSE', W / 2, H - 52, { size: 14, align: 'center', color: COLORS.eclipse, spacing: 4 });
    bar(ctx, W / 2 - 260, H - 40, 520, 12, eclipse.hp / eclipse.maxHp, COLORS.eclipse);
  }

  if (world.banner) {
    const b = world.banner;
    const a = Math.min(1, b.time * 2, (2.4 - b.time) * 4);
    ctx.globalAlpha = Math.max(0, a);
    glow(ctx, W / 2, H / 2 - 120, 260, 'rgba(255,193,90,0.25)');
    text(ctx, b.text, W / 2, H / 2 - 110, { size: 54, align: 'center', color: COLORS.flameCore, spacing: 4 });
    text(ctx, b.sub, W / 2, H / 2 - 74, { size: 20, align: 'center', color: COLORS.dim, spacing: 2 });
    ctx.globalAlpha = 1;
  }

  text(ctx, 'WASD move   Mouse aim + hold to shoot   Space dash   P pause   M mute', W / 2, H - 14, { size: 12, align: 'center', color: 'rgba(143,134,176,0.7)', shadow: false, weight: 600 });
}

/** A rounded panel behind menu text. */
export function panel(ctx, x, y, w, h, alpha = 0.78) {
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = `rgba(14,12,26,${alpha})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(143,134,176,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
