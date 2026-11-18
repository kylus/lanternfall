// Every number the game's rules and look are tuned by, in one place.
export const W = 1280;
export const H = 720;
/** The walkable floor, inside the stone wall that frames the screen. */
export const ARENA = { x: 48, y: 48, w: 1184, h: 624 };

export const STEP = 1 / 60;
export const WAVE_SECONDS = 24;
export const FINAL_WAVE = 10;
export const BOSS_WAVES = [5, 10];

export const PLAYER = {
  hp: 5,
  radius: 12,
  speed: 235,
  accel: 2400,
  fuelMax: 100,
  fuelStart: 70,
  fuelDecay: 3.4,
  darkDrain: 0.5,
  lightMin: 70,
  lightMax: 250,
  fireInterval: 0.3,
  shotSpeed: 640,
  shotLife: 0.62,
  shotDamage: 1,
  dashTime: 0.17,
  dashSpeed: 760,
  dashCooldown: 1.5,
  hurtInvuln: 1.1,
  magnet: 70,
};

export const COMBO = { window: 2.6, step: 6 };

export const COLORS = {
  floor: '#2a2540',
  floorAlt: '#322c4c',
  wall: '#0d0b16',
  wallEdge: '#4a4170',
  night: 'rgba(4, 4, 14, 0.9)',
  flame: '#ffc15a',
  flameCore: '#fff2c9',
  ember: '#ff8a3d',
  hurt: '#ff5a6e',
  good: '#7ce3c0',
  ink: '#efe6ff',
  dim: '#8f86b0',
  gloom: '#5b4a8a',
  darter: '#c25a7a',
  spitter: '#4aa0a8',
  hulk: '#7a5a46',
  eclipse: '#a58cff',
};
