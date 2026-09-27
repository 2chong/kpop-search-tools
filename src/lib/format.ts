// 화면 문구. 기존 C# RefreshResults / SortDescription 의 문자열을 그대로 쓴다.
import type { ArtistSort, LetterSort, Mode, Target } from './search';

export const MODE_LABELS: Record<Mode, string> = { starts: '시작하는 제목', contains: '포함하는 제목', ends: '끝나는 제목' };   // 화면 순서

export function num(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function sortDescription(letter: string, letterSort: LetterSort, initialQuery: boolean, artistSort: ArtistSort = null): string {
  if (artistSort) return `가수 ${artistSort === 'asc' ? '가나다순' : '역순'} · 가수 클릭: 방향 바꾸기 · 글자 수 클릭: 기본 정렬`;
  if (letter) return `‘${letter}’ ${letterSort === 'lengthFirst' ? '긴 제목 → 많은 개수' : '많은 개수 → 긴 제목'}`;
  return initialQuery ? '초성 정확히 일치 우선 · 나머지는 긴 제목부터' : '긴 제목부터';
}

export function statusText(opts: { consonantOnly: boolean; mode: Mode; threeOnly: boolean; letter: string; letterSort: LetterSort; initialQuery: boolean; artistSort?: ArtistSort; target?: Target }): string {
  return (opts.consonantOnly ? '자음 포함 제목' : '전체 제목')
    + (opts.target === 'artist' ? ' · 가수 이름으로 검색' : opts.mode === 'ends' ? ' · 끝나는 제목' : '')
    + (opts.threeOnly ? ' · 3글자만' : '')
    + '  ·  ' + sortDescription(opts.letter, opts.letterSort, opts.initialQuery, opts.artistSort ?? null);
}

export function countPill(count: number, initialQuery: boolean): string {
  return (initialQuery ? '초성 검색 결과 ' : '검색 결과 ') + num(count) + '개';
}
