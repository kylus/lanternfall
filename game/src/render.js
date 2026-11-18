// One frame: the scene (shaken), then the HUD and whichever screen the game is on.
import { H, W } from './config.js';
import { drawScene } from './scene.js';
import { drawHud } from './hud.js';
import { drawCardsScreen, drawOver, drawPause, drawTitle, drawWon } from './screens.js';
import { PHASE } from './world.js';

export const SCREEN = { TITLE: 'title', PLAY: 'play', PAUSE: 'pause' };

export function renderFrame(ctx, game) {
  const { world, screen, t, best, mouse } = game;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (world.shake > 0) ctx.translate(Math.sin(t * 91) * world.shake * 0.35, Math.cos(t * 77) * world.shake * 0.35);
  drawScene(ctx, world, t);
  ctx.restore();

  if (screen === SCREEN.TITLE) {
    drawTitle(ctx, t, best, mouse);
    return;
  }
  drawHud(ctx, world, t, best);
  if (screen === SCREEN.PAUSE) drawPause(ctx);
  else if (world.phase === PHASE.CARDS) drawCardsScreen(ctx, world, t, mouse);
  else if (world.phase === PHASE.OVER) drawOver(ctx, world, t, best, game.isNew, mouse);
  else if (world.phase === PHASE.WON) drawWon(ctx, world, t, best, game.isNew, mouse);
}
