const DEFAULT_COLOR = [1, 1, 1, 1];

export function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string') return [...DEFAULT_COLOR.slice(0, 3), alpha];

  const h = hex.replace('#', '');

  let expanded = h;
  if (h.length === 3) {
    expanded = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  } else if (h.length !== 6 && h.length !== 8) {
    return [...DEFAULT_COLOR.slice(0, 3), alpha];
  }

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return [...DEFAULT_COLOR.slice(0, 3), alpha];
  }

  const a = expanded.length === 8
    ? parseInt(expanded.slice(6, 8), 16) / 255
    : alpha;

  return [r / 255, g / 255, b / 255, Number.isNaN(a) ? alpha : a];
}