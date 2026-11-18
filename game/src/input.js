// Keyboard and mouse, read once a frame into an "intent": where to move, where to aim and what was pressed.
// The mouse is reported in the game's own 1280 by 720 coordinates, whatever size the canvas is shown at.
import { W, H } from './config.js';

const held = new Set();
const tapped = new Set();
const mouse = { x: W / 2, y: H / 2, down: false, clicked: false };

const MOVE_KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
};

export function attachInput(canvas) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!held.has(event.code)) tapped.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  const place = (event) => {
    const box = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - box.left) / box.width) * W;
    mouse.y = ((event.clientY - box.top) / box.height) * H;
  };
  canvas.addEventListener('mousemove', place);
  canvas.addEventListener('mousedown', (event) => {
    place(event);
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

const anyHeld = (codes) => codes.some((code) => held.has(code));

/** This frame's intent for a player standing at (px, py). */
export function readIntent(px, py) {
  const mx = (anyHeld(MOVE_KEYS.right) ? 1 : 0) - (anyHeld(MOVE_KEYS.left) ? 1 : 0);
  const my = (anyHeld(MOVE_KEYS.down) ? 1 : 0) - (anyHeld(MOVE_KEYS.up) ? 1 : 0);
  return {
    mx,
    my,
    ax: mouse.x - px,
    ay: mouse.y - py,
    fire: mouse.down || held.has('KeyJ'),
    dash: tapped.has('Space') || tapped.has('ShiftLeft') || tapped.has('ShiftRight'),
  };
}

/** Whether a key went down since the last frame ended. */
export const wasPressed = (code) => tapped.has(code);
export const mousePosition = () => mouse;
export const wasClicked = () => mouse.clicked;

/** Call once at the end of every frame. */
export function endFrame() {
  tapped.clear();
  mouse.clicked = false;
}
