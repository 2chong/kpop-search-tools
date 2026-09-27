// 인라인 SVG 아이콘 (Lucide 스타일, 선 두께 2)
const base = (size: number, body: string, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const ICON_NOTE = base(20, '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', ' stroke-width="2.2"');
export const ICON_MUSIC = base(14, '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', ' stroke-width="2.4"');
export const ICON_REFRESH = base(15, '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>');
export const ICON_SEARCH = base(20, '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', ' stroke-width="2.2"');
export const ICON_CLOSE = base(15, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', ' stroke-width="2.4"');
export const ICON_CHEVRON_DOWN = base(14, '<path d="m6 9 6 6 6-6"/>', ' stroke-width="2.6"');
export const ICON_COPY = base(14, '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>');
export const ICON_CHECK = base(13, '<path d="M20 6 9 17l-5-5"/>', ' stroke-width="2.8"');
export const ICON_SEARCH_X = base(26, '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="m8.5 8.5 5 5"/><path d="m13.5 8.5-5 5"/>');
