// Lanternfall's entry point: the canvas, the frame loop, and the small state machine around the rules
// (title, play, pause; and inside play, the upgrade cards and the two endings).
import { H, STEP, W } from './config.js';
import { attachInput, endFrame, mousePosition, readIntent, wasClicked, wasPressed } from './input.js';
import { isMuted, musicTick, toggleMute, unlock } from './audio.js';
import { botCard, botIntent } from './bot.js';
import { SCREEN, renderFrame } from './render.js';
import { cardRects } from './screens.js';
import { simulate, shotScene, summary } from './shots.js';
import { PHASE, chooseCard, createWorld, update } from './world.js';

const BEST_KEY = 'lanternfall.best';

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private windows may refuse storage: the best score is then just not kept.
  }
}

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
attachInput(canvas);

const game = { screen: SCREEN.TITLE, world: createWorld(1), t: 0, best: loadBest(), isNew: false, finished: false, mouse: mousePosition() };
const autoplay = params.has('autoplay');

function startRun() {
  game.world = createWorld((Date.now() ^ 0x5bd1e995) >>> 0);
  game.screen = SCREEN.PLAY;
  game.isNew = false;
  game.finished = false;
}

function overlapsCard(index) {
  const r = cardRects(game.world.cards.length)[index];
  const m = game.mouse;
  return r !== undefined && m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h;
}

/** Menus and keys: everything that is not the rules themselves. */
function handleUi() {
  if (wasPressed('KeyM')) toggleMute();
  const clicked = wasClicked();
  const world = game.world;
  if (game.screen === SCREEN.TITLE) {
    if (wasPressed('Enter') || wasPressed('Space') || clicked) startRun();
    return;
  }
  if (game.screen === SCREEN.PAUSE) {
    if (wasPressed('KeyP') || wasPressed('Escape')) game.screen = SCREEN.PLAY;
    if (wasPressed('KeyR')) startRun();
    return;
  }
  if (world.phase === PHASE.PLAY) {
    if (wasPressed('KeyP') || wasPressed('Escape')) game.screen = SCREEN.PAUSE;
  } else if (world.phase === PHASE.CARDS) {
    for (let i = 0; i < world.cards.length; i += 1) {
      if (wasPressed(`Digit${i + 1}`) || wasPressed(`Numpad${i + 1}`) || (clicked && overlapsCard(i))) {
        chooseCard(world, i);
        break;
      }
    }
  } else if (wasPressed('KeyR') || wasPressed('Enter') || clicked) startRun();
}

function finishIfOver() {
  const world = game.world;
  if (game.finished || (world.phase !== PHASE.OVER && world.phase !== PHASE.WON)) return;
  game.finished = true;
  game.isNew = world.score > game.best;
  if (game.isNew) {
    game.best = world.score;
    saveBest(game.best);
  }
}

let last = 0;
let accumulator = 0;

/** Behind the title, the autopilot plays on, so the menu is never a still picture. */
function attract(dt) {
  accumulator += dt;
  const world = game.world;
  if (world.phase === PHASE.CARDS) chooseCard(world, botCard(world));
  if (world.phase === PHASE.OVER || world.phase === PHASE.WON) game.world = createWorld(Math.floor(game.t * 1000) + 1);
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    update(game.world, STEP, botIntent(game.world, 0.9));
    accumulator -= STEP;
    steps += 1;
  }
  game.world.banner = null;
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  game.t += dt;
  handleUi();
  if (game.screen === SCREEN.PLAY) {
    accumulator += dt;
    const world = game.world;
    const intent = autoplay ? botIntent(world) : readIntent(world.player.x, world.player.y);
    if (autoplay && world.phase === PHASE.CARDS) chooseCard(world, botCard(world));
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      update(world, STEP, intent);
      intent.dash = false;
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    if (world.phase === PHASE.PLAY) musicTick(dt, Math.min(1, world.wave / 10 + world.enemies.length / 50));
    finishIfOver();
  } else if (game.screen === SCREEN.TITLE) {
    attract(dt);
  } else accumulator = 0;
  renderFrame(ctx, game);
  endFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', unlock);
window.addEventListener('mousedown', unlock);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.screen === SCREEN.PLAY && game.world.phase === PHASE.PLAY) game.screen = SCREEN.PAUSE;
});

if (params.has('sim')) {
  const world = simulate(Number(params.get('seed')) || 1, { seconds: Number(params.get('seconds')) || 120, skill: Number(params.get('skill') ?? 1) });
  document.body.insertAdjacentHTML('beforeend', `<pre id="sim">${JSON.stringify(summary(world))}</pre>`);
  document.title = 'sim-done';
} else if (params.has('shot')) {
  document.documentElement.classList.add('shot');
  const scene = shotScene(params.get('shot'), Number(params.get('seed')) || 1);
  Object.assign(game, scene);
  renderFrame(ctx, game);
  document.title = 'shot-ready';
} else {
  window.__lanternfall = { game, muted: isMuted };
  if (autoplay) startRun();
  requestAnimationFrame(frame);
}
