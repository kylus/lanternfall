// Scenes for the screenshots (?shot=start|play|cards|end|win&seed=N) and a headless run for testing
// (?sim=1&seed=N&seconds=S&skill=K). Both play the real rules forward with the autopilot from a fresh
// world, so a frame is what a short game really looks like and the same seed gives the same frame.
import { H, STEP, W } from './config.js';
import { botCard, botIntent } from './bot.js';
import { SCREEN } from './render.js';
import { PHASE, chooseCard, createWorld, lightRadius, update } from './world.js';

/** Play `seconds` of game time with the autopilot, or until `until(world)` is true. */
export function simulate(seed, { seconds = 120, skill = 1, until = () => false } = {}) {
  const world = createWorld(seed);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase === PHASE.CARDS) {
      if (until(world)) break;
      chooseCard(world, botCard(world));
    }
    if (world.phase === PHASE.OVER || world.phase === PHASE.WON) break;
    update(world, STEP, botIntent(world, skill));
    if (until(world)) break;
  }
  return world;
}

export function summary(world) {
  return {
    phase: world.phase, wave: world.wave, score: world.score, kills: world.kills, bestCombo: world.bestCombo,
    hp: world.player.hp, maxHp: world.player.maxHp, fuel: Math.round(world.player.fuel), seconds: Math.round(world.t),
    upgrades: world.taken, enemies: world.enemies.length,
  };
}

/** The game object for a named screenshot scene. */
export function shotScene(name, seed) {
  const mouse = { x: W * 0.62, y: H * 0.4, down: false, clicked: false };
  let world;
  let screen = SCREEN.PLAY;
  if (name === 'start') {
    world = simulate(seed, { seconds: 400, skill: 0.9, until: (w) => w.wave === 2 && w.waveTime > 9 });
    screen = SCREEN.TITLE;
    world.banner = null;
  } else if (name === 'cards') {
    world = simulate(seed, { seconds: 400, until: (w) => w.phase === PHASE.CARDS && w.wave === 3 });
  } else if (name === 'end') {
    world = simulate(seed, { seconds: 400, skill: 0.1 });
  } else if (name === 'win') {
    world = simulate(seed, { seconds: 900 });
  } else {
    // The first moment in wave 4 or later with a crowd close in, bolts in the air and the lantern in good shape.
    world = simulate(seed, {
      seconds: 400,
      until: (w) => w.wave >= 4 && w.waveTime > 8 && w.shots.length >= 3 && w.player.hp >= 4 && w.player.fuel > 40
        && w.enemies.filter((e) => Math.hypot(e.x - w.player.x, e.y - w.player.y) < lightRadius(w)).length >= 5,
    });
    world.banner = null;
  }
  if (name === 'play') {
    mouse.x = world.player.x + Math.cos(world.player.aim) * 160;
    mouse.y = world.player.y + Math.sin(world.player.aim) * 160;
  }
  return { screen, world, t: 3.3, best: 18240, isNew: name === 'win', mouse };
}
