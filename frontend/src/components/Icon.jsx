// Barcha ikonkalar stroke-uslubida (24x24). Har biri path'lar ro'yxati.
export const ICONS = {
  leaf: ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z', 'M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12'],
  map: ['M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z', 'M9 3v15', 'M15 6v15'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  user: ['M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M4 21c0-4 3.6-7 8-7s8 3 8 7'],
  chart: ['M3 3v18h18', 'M7 15l4-4 3 3 5-6'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  locate: ['M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3'],
  check: ['M20 6L9 17l-5-5'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  camera: ['M3 7h4l2-3h6l2 3h4v13H3Z', 'M8.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0'],
  pin: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z', 'M9 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 7v5l3 2'],
  thumb: ['M7 10v11', 'M15 5.9L14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-7a2 2 0 0 1 4 .9Z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  info: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 16v-4', 'M12 8h.01'],
  star: ['M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  recycle: ['M21 12a9 9 0 0 1-15.5 6.2L3 16', 'M3 12a9 9 0 0 1 15.5-6.2L21 8', 'M21 3v5h-5', 'M3 21v-5h5'],
  bottle: ['M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3V2Z'],
  paper: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8'],
  metal: ['M21 16V8l-9-5-9 5v8l9 5 9-5Z', 'M3.3 7L12 12l8.7-5', 'M12 22V12'],
  sprout: ['M12 22v-10', 'M12 12C12 7 8.5 4 4 4c0 5 3 8 8 8Z', 'M12 12c0-4 3-7 8-7 0 4.5-3 7-8 7Z'],
  plug: ['M9 2v6', 'M15 2v6', 'M6 8h12v4a6 6 0 0 1-12 0V8Z', 'M12 18v4'],
  brick: ['M3 6h18v12H3Z', 'M3 12h18', 'M9 6v6', 'M15 6v6', 'M6 12v6', 'M18 12v6'],
  alert: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
};

// Chiqindi turi -> ikonka
export const WASTE_ICON = {
  plastic: 'recycle', glass: 'bottle', paper: 'paper', metal: 'metal', organic: 'sprout',
  ewaste: 'plug', construction: 'brick', hazardous: 'alert', mixed: 'trash',
};

export function Icon({ name, size = 20, strokeWidth = 1.9, className = '' }) {
  return (
    <svg
      className={`ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(ICONS[name] || []).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
