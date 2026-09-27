// 한글 초성·자모 처리. 기존 C# TitleRules (SongSearch.cs 12-35행) 과 같은 규칙.
import { clean } from './titleRules';

const SYL_BASE = 0xac00, SYL_END = 0xd7a3;
const CHO_BASE = 0x1100; // 결합형 초성 ᄀ

/** 음절이면 결합형 초성 코드로, 아니면 그대로. */
function initialOf(cp: number): number {
  return cp >= SYL_BASE && cp <= SYL_END ? CHO_BASE + Math.floor((cp - SYL_BASE) / 588) : cp;
}

/** 결합형 자모(초성·종성·확장) 범위인가 — 제목 안에 홀로 남은 자음 판정용. */
export function isConjoiningConsonant(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x115e) || (cp >= 0x11a8 && cp <= 0x11ff) || (cp >= 0xa960 && cp <= 0xa97c) || (cp >= 0xd7cb && cp <= 0xd7fb);
}

/** 정리한 제목에 홀로 쓰인 자음(ㅊ취했, ㅎㅇ 등)이 있는가. NFKC 가 호환 자모 ㅊ 을 결합형 ᄎ 으로 바꾼다. */
export function hasStandaloneConsonant(title: string): boolean {
  for (const c of clean(title)) if (isConjoiningConsonant(c.codePointAt(0)!)) return true;
  return false;
}

/** 정리 후 전부 초성(ᄀ~ᄒ)뿐인 검색어인가. */
export function isInitialQuery(query: string): boolean {
  const cleaned = clean(query);
  if (cleaned.length === 0) return false;
  for (const c of cleaned) { const cp = c.codePointAt(0)!; if (cp < 0x1100 || cp > 0x1112) return false; }
  return true;
}

/** 제목의 초성 문자열(음절은 초성으로, 나머지는 소문자 그대로). */
export function initialsOf(title: string): string {
  let out = '';
  for (const c of clean(title).toLowerCase()) out += String.fromCodePoint(initialOf(c.codePointAt(0)!));
  return out;
}

/** 겹받침 호환 자모(ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ)를 두 자음으로 풀어 쓴다: 초성 검색어를 빨리 치면 IME 가 ㄴ+ㅎ 을 ㄶ 으로 합치는 문제. */
const COMPOUND: Record<string, string> = { 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ' };
export function expandCompoundJamo(text: string): string {
  let out = '';
  for (const c of text) out += COMPOUND[c] ?? c;
  return out;
}

const KEEP_ALL = /[\p{L}\p{Nd}]/gu;
/** 가수 이름 검색 키: 괄호 안 표기도 살리고 글자·숫자만 남긴 소문자. 'ZEROBASEONE (제로베이스원)' → 'zerobaseone제로베이스원' */
export function artistKeyOf(artist: string): string {
  return (artist.normalize('NFKC').match(KEEP_ALL) ?? []).join('').toLowerCase();
}

/** 정리 없이 문자열 그대로의 초성(음절은 초성으로, 나머지는 그대로). 가수 키에 쓴다. */
export function initialsOfText(text: string): string {
  let out = '';
  for (const c of text) out += String.fromCodePoint(initialOf(c.codePointAt(0)!));
  return out;
}

/** 표시용 초성 표(ㄱ~ㅎ, 호환 자모). */
export const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

export function decompose(cp: number): { initial: number; medial: number; final: number | null } | null {
  if (cp < SYL_BASE || cp > SYL_END) return null;
  const n = cp - SYL_BASE;
  const fin = n % 28;
  return { initial: CHO_BASE + Math.floor(n / 588), medial: 0x1161 + Math.floor((n % 588) / 28), final: fin ? 0x11a7 + fin : null };
}
