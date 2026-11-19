/** Minimal inline icon set (24×24, stroke-based). Decorative unless `label` is set. */
const PATHS: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  close: 'M6 6l12 12M18 6L6 18',
  speaker: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  turtle: 'M4 15c0-4 3.5-7 8-7s8 3 8 7H4zM6 15v3M18 15v3M20 12h2M9 8l1.5 3.5h3L15 8',
  flame: 'M12 2c.6 3.2 4.2 5.4 5.6 9 .9 2.4.6 5.4-1.4 7.4A6.2 6.2 0 016 15.2c0-2.3 1-4 2.4-5.3.2 1.6.9 2.7 2 3.3-.5-3.8.3-7.6 1.6-11.2z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v2',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 13a7.5 7.5 0 000-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 00-1.7-1L15 3.5h-4L10.7 6a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 000 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 001.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 001.7-1l2.4 1 2-3.4z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3',
  stop: 'M7 7h10v10H7z',
  play: 'M7 5l12 7-12 7z',
  book: 'M4 5a2 2 0 012-2h5v17H6a2 2 0 00-2 2zM20 5a2 2 0 00-2-2h-5v17h5a2 2 0 012 2z',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  path: 'M7 4a2 2 0 100 4 2 2 0 000-4zM17 16a2 2 0 100 4 2 2 0 000-4zM7 8v3a3 3 0 003 3h4a3 3 0 013 3',
  snow: 'M12 2v20M4 6l16 12M20 6L4 18M9 3l3 3 3-3M9 21l3-3 3 3',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  keyboard: 'M3 7h18v11H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10',
  backspace: 'M21 5H9l-6 7 6 7h12zM12 9l6 6M18 9l-6 6',
  shift: 'M12 4l8 8h-4v7H8v-7H4z',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11a1 1 0 100 2 1 1 0 000-2z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5v.01',
};

export function Icon({
  name,
  className = 'size-6',
  label,
  flipRtl = false,
  filled = false,
}: {
  name: keyof typeof PATHS | string;
  className?: string;
  label?: string;
  /** Mirror in RTL (for directional icons like arrows) */
  flipRtl?: boolean;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${flipRtl ? 'rtl:-scale-x-100' : ''} shrink-0`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
