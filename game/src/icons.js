// One small glyph per upgrade, drawn with strokes and arcs, centred on (x, y) and about `s` wide.
import { heart } from './draw.js';

const arc = (ctx, x, y, r, fill) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) ctx.fill();
  else ctx.stroke();
};
const line = (ctx, ax, ay, bx, by) => {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
};
const flame = (ctx, x, y, s) => {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.1, x, y + s * 0.8);
  ctx.quadraticCurveTo(x - s * 0.8, y - s * 0.1, x, y - s);
  ctx.fill();
};

const GLYPHS = {
  rapid: (c, x, y, s) => { for (let i = -1; i <= 1; i += 1) { line(c, x + i * s * 0.32 - s * 0.12, y - s * 0.3, x + i * s * 0.32 + s * 0.12, y); line(c, x + i * s * 0.32 + s * 0.12, y, x + i * s * 0.32 - s * 0.12, y + s * 0.3); } },
  twin: (c, x, y, s) => { flame(c, x - s * 0.28, y, s * 0.38); flame(c, x + s * 0.28, y, s * 0.38); },
  pierce: (c, x, y, s) => { line(c, x - s * 0.5, y, x + s * 0.5, y); arc(c, x - s * 0.15, y, s * 0.14, false); arc(c, x + s * 0.2, y, s * 0.14, false); line(c, x + s * 0.3, y - s * 0.15, x + s * 0.5, y); line(c, x + s * 0.3, y + s * 0.15, x + s * 0.5, y); },
  power: (c, x, y, s) => { for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; line(c, x + Math.cos(a) * s * 0.18, y + Math.sin(a) * s * 0.18, x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5); } arc(c, x, y, s * 0.12, true); },
  glow: (c, x, y, s) => { arc(c, x, y, s * 0.14, true); arc(c, x, y, s * 0.32, false); arc(c, x, y, s * 0.5, false); },
  slowburn: (c, x, y, s) => { flame(c, x, y - s * 0.05, s * 0.45); line(c, x - s * 0.3, y + s * 0.5, x + s * 0.3, y + s * 0.5); },
  magnet: (c, x, y, s) => { c.beginPath(); c.arc(x, y, s * 0.34, Math.PI, 0); c.lineTo(x + s * 0.34, y + s * 0.38); c.moveTo(x - s * 0.34, y); c.lineTo(x - s * 0.34, y + s * 0.38); c.stroke(); arc(c, x, y - s * 0.62, s * 0.06, true); },
  boots: (c, x, y, s) => { line(c, x - s * 0.5, y, x + s * 0.3, y); line(c, x + s * 0.1, y - s * 0.25, x + s * 0.4, y); line(c, x + s * 0.4, y, x + s * 0.1, y + s * 0.25); line(c, x - s * 0.5, y - s * 0.3, x - s * 0.15, y - s * 0.3); line(c, x - s * 0.5, y + s * 0.3, x - s * 0.15, y + s * 0.3); },
  heart: (c, x, y, s) => heart(c, x, y, s * 1.1, true, c.fillStyle),
  dash: (c, x, y, s) => { c.beginPath(); c.arc(x, y, s * 0.4, -2.4, 2.2); c.stroke(); line(c, x + s * 0.2, y + s * 0.4, x + s * 0.45, y + s * 0.2); line(c, x + s * 0.2, y + s * 0.4, x + s * 0.5, y + s * 0.5); },
  nova: (c, x, y, s) => { for (let i = 0; i < 12; i += 1) { const a = (i / 12) * Math.PI * 2; arc(c, x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.06, true); } arc(c, x, y, s * 0.16, true); },
  ricochet: (c, x, y, s) => { c.beginPath(); c.moveTo(x - s * 0.5, y + s * 0.4); c.lineTo(x - s * 0.1, y - s * 0.3); c.lineTo(x + s * 0.2, y + s * 0.35); c.lineTo(x + s * 0.5, y - s * 0.35); c.stroke(); },
  refill: (c, x, y, s) => { c.beginPath(); c.moveTo(x - s * 0.12, y - s * 0.5); c.lineTo(x - s * 0.12, y - s * 0.2); c.lineTo(x - s * 0.38, y + s * 0.4); c.lineTo(x + s * 0.38, y + s * 0.4); c.lineTo(x + s * 0.12, y - s * 0.2); c.lineTo(x + s * 0.12, y - s * 0.5); c.closePath(); c.stroke(); flame(c, x, y + s * 0.18, s * 0.2); },
};

export function drawIcon(ctx, id, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (GLYPHS[id] ?? GLYPHS.glow)(ctx, x, y, size);
  ctx.restore();
}
