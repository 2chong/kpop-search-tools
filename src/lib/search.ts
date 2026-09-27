// 검색·정렬. 기존 C# Database.Search / SearchInitials / PrioritizeExactInitials / ApplyLetterSort (SongSearch.cs 55-110, 341-365행) 이식.
import type { Catalog, Song } from './catalog';
import { expandCompoundJamo, isInitialQuery } from './hangul';
import { clean } from './titleRules';

export type Mode = 'contains' | 'starts' | 'ends';
export type LetterSort = 'countFirst' | 'lengthFirst';
export type ArtistSort = 'asc' | 'desc' | null;

export interface SearchOptions {
  mode: Mode;
  consonantOnly?: boolean;   // "자음 포함 제목" 보기 (보관 목록의 자음 제목 포함)
  threeOnly?: boolean;       // 3글자만
  letter?: string;           // 선택 글자('' 이면 없음)
  letterSort?: LetterSort;   // 글자 선택 시 정렬
  artistSort?: ArtistSort;   // 가수 이름순 정렬 (다른 정렬보다 우선, 가수 없는 곡은 맨 뒤)
}

export interface SearchResult {
  songs: Song[];
  initialQuery: boolean;     // 초성 검색이었는가
  query: string;             // 정리된 검색어
}

export function letterCount(song: Song, letter: string): number {
  if (!letter) return 0;
  let n = 0;
  for (const c of song.title) if (c === letter) n++;
  return n;
}

function matches(key: string, q: string, mode: Mode): boolean {
  if (q.length === 0) return true;
  return mode === 'ends' ? key.endsWith(q) : mode === 'starts' ? key.startsWith(q) : key.includes(q);
}

export function search(catalog: Catalog, rawQuery: string, opts: SearchOptions): SearchResult {
  const q = clean(expandCompoundJamo(rawQuery.trim())).toLowerCase();
  const initial = isInitialQuery(q);
  const base = opts.consonantOnly ? catalog.songs.filter((s) => s.consonant) : catalog.songs.filter((s) => !s.pending);
  let songs = base.filter((s) => matches(initial ? s.initials : s.lower, q, opts.mode));
  if (initial) {
    // 초성이 정확히 일치하는 제목을 앞으로 (각 무리 안에서는 기본 순서 유지)
    const exact = songs.filter((s) => s.initials === q);
    const partial = songs.filter((s) => s.initials !== q);
    songs = exact.concat(partial);
  }
  if (opts.threeOnly) songs = songs.filter((s) => s.chars === 3);
  const letter = opts.letter ?? '';
  if (letter) {
    const lengthFirst = opts.letterSort === 'lengthFirst';
    const counts = new Map<Song, number>();
    for (const s of songs) counts.set(s, letterCount(s, letter));
    songs = songs.slice().sort((a, b) => {
      const countOrder = counts.get(b)! - counts.get(a)!;
      const lengthOrder = b.chars - a.chars;
      const primary = lengthFirst ? lengthOrder : countOrder;
      const secondary = lengthFirst ? countOrder : lengthOrder;
      return primary !== 0 ? primary : secondary !== 0 ? secondary : a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
    });
  }
  if (opts.artistSort) {
    const dir = opts.artistSort === 'asc' ? 1 : -1;
    songs = songs.slice().sort((a, b) => {
      if (!a.artist && !b.artist) return 0;
      if (!a.artist) return 1;
      if (!b.artist) return -1;
      return dir * a.artist.localeCompare(b.artist, 'ko');
    });
  }
  return { songs, initialQuery: initial, query: q };
}
