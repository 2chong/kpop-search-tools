// 기존 앱 --self-test (SongSearch.cs 409-483행) 의 단언을 옮긴 테스트. 픽스처는 실제 export 결과.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from './catalog';
import { expandCompoundJamo, hasStandaloneConsonant, initialsOf, isInitialQuery } from './hangul';
import { letterCount, search, type Mode } from './search';
import { clean } from './titleRules';

const catalog = parseCatalog(readFileSync(new URL('../../out/catalog/catalog.json', import.meta.url), 'utf-8'));
const titles = (mode: Mode, q: string, extra = {}) => search(catalog, q, { mode, ...extra }).songs.map((s) => s.title);

describe('clean', () => {
  const cases: Record<string, string> = {
    '사랑, 그게 뭔데 (Feat. 홍길동)': '사랑그게뭔데', '너에게 (부제 [원문]) 다시': '너에게다시', '안녕（Hello）!': '안녕', 'LOVE (사랑)': 'LOVE',
    '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지': '어떻게이별까지사랑하겠어널사랑하는거지', '가[나]다{라}마': '가다마', '별★빛… 노래': '별빛노래',
    '(Intro)': '', '노래 (미완성': '노래', '가요)': '가요', '너와 나, 2026': '너와나2026', '노래 <부제> 새로': '노래새로',
    '사랑 feat. 홍길동': '사랑', '0X1=LOVESONG (I Know I Love You) feat. pH-1': '0X1LOVESONG', '노래 - Prod. 이름': '노래',
    '트월ㅋ': '트월ᄏ', 'ㅊ취했': 'ᄎ취했', '어디야ㅠㅡㅠ': '어디야ᅲᅳᅲ',
  };
  for (const [src, dst] of Object.entries(cases)) it(`${src} → ${dst}`, () => expect(clean(src)).toBe(dst));
  it('BMP 밖 문자는 버린다', () => expect(clean('노래😀')).toBe('노래'));
});

describe('hangul', () => {
  it('initialsOf', () => {
    expect(initialsOf('가까나다따라마바빠사싸아자짜차카타파하')).toBe(clean('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'));
    expect(initialsOf('값한글ABC123')).toBe(clean('ㄱㅎㄱabc123'));
  });
  it('isInitialQuery', () => {
    for (const q of ['ㅇㅂㅋ', 'ㅇ ㅂ ㅋ', 'ᄋᄇᄏ', 'ㄱ', 'ㅅ']) expect(isInitialQuery(q), q).toBe(true);
    for (const q of ['', '이ㅂㅋ', 'ㅏ', '가', 'abc', 'ㅠㅡㅠ']) expect(isInitialQuery(q), q).toBe(false);
  });
  it('expandCompoundJamo: ㄶ → ㄴㅎ', () => {
    expect(expandCompoundJamo('ㄶ')).toBe('ㄴㅎ');
    expect(expandCompoundJamo('ㅇㅂㅋ')).toBe('ㅇㅂㅋ');
    expect(expandCompoundJamo('ㄳ각ㅄ')).toBe('ㄱㅅ각ㅂㅅ');
  });
  it('hasStandaloneConsonant', () => {
    for (const t of ['트월ㅋ', 'ㄳ', 'ㅊ취했', 'ㅎㅇ']) expect(hasStandaloneConsonant(t), t).toBe(true);
    for (const t of ['어디야ㅠㅡㅠ', 'ㅏㅑ', '각', '이불킥']) expect(hasStandaloneConsonant(t), t).toBe(false);
  });
});

describe('catalog', () => {
  it('main 곡 수와 기본 순서', () => {
    expect(catalog.count).toBeGreaterThan(13000);
    const main = catalog.songs.filter((s) => !s.pending);
    for (let i = 1; i < main.length; i++) expect(main[i - 1].chars).toBeGreaterThanOrEqual(main[i].chars);
    expect(new Set(main.map((s) => s.title)).size).toBe(main.length);
  });
});

describe('search', () => {
  it('초성 정확 일치 우선: ㅇㅂㅋ → 이불킥', () => {
    for (const mode of ['contains', 'starts', 'ends'] as Mode[]) for (const q of ['ㅇㅂㅋ', 'ㅇ ㅂ ㅋ', 'ᄋᄇᄏ']) {
      const r = search(catalog, q, { mode });
      expect(r.initialQuery).toBe(true);
      expect(r.songs[0]?.title, `${mode} ${q}`).toBe('이불킥');
    }
  });
  it('겹받침 검색어는 두 자음으로: ㄶ → ㄴㅎ 초성', () => {
    expect(search(catalog, 'ㄶ', { mode: 'contains' }).query).toBe(clean('ㄴㅎ'));
    expect(titles('contains', 'ㄶ')).toEqual(titles('contains', 'ㄴㅎ'));
  });
  it('ㅂㅋ: 포함 O, 시작 X, 끝 O', () => {
    expect(titles('contains', 'ㅂㅋ')).toContain('이불킥');
    expect(titles('starts', 'ㅂㅋ')).not.toContain('이불킥');
    expect(titles('ends', 'ㅂㅋ')).toContain('이불킥');
    expect(titles('ends', 'ㅇㅂ')).not.toContain('이불킥');
  });
  it('ㄲ 시작 → 꿈, ㄱ 시작 → 꿈 없음', () => {
    expect(titles('starts', 'ㄲ')).toContain('꿈');
    expect(titles('starts', 'ㄱ')).not.toContain('꿈');
  });
  it('ㅅ 한 글자: 정확 일치가 먼저, 뒤에 긴 제목', () => {
    const r = search(catalog, 'ㅅ', { mode: 'contains' });
    expect(r.songs[0].initials).toBe(clean('ㅅ'));
    expect(r.songs.some((s) => s.chars > 1)).toBe(true);
  });
  it('일반 검색: 포함/시작/끝', () => {
    for (const t of titles('starts', '가')) expect(t.startsWith('가')).toBe(true);
    for (const t of titles('ends', '사랑')) expect(t.endsWith('사랑')).toBe(true);
    expect(titles('ends', '킥')).toContain('이불킥');
    expect(titles('ends', '이불')).not.toContain('이불킥');
    expect(titles('contains', 'LOVE')).toEqual(titles('contains', 'love'));
    expect(titles('contains', '존재하지않는검색어987654321')).toEqual([]);
    expect(titles('contains', '')).toHaveLength(catalog.count);
  });
  it('원제 검색 없이도 제로바이원러브송', () => {
    const r = search(catalog, '제로바이원러브', { mode: 'contains' }).songs.find((s) => s.title === '제로바이원러브송');
    expect(r?.originalTitle ?? '').toContain('0X1=LOVESONG');
  });
  it('숫자 한글 읽기', () => {
    expect(titles('contains', '육십초')).toContain('육십초');
    expect(titles('contains', '60초')).not.toContain('60초');
  });
  it('자음 포함 제목 보기', () => {
    const r = search(catalog, '', { mode: 'contains', consonantOnly: true }).songs;
    expect(r.length).toBe(12);
    const t = r.map((s) => s.title);
    for (const q of ['ㅊ취했', 'ㅎㅇ', 'ㅈㄴ멋있어허성현']) expect(t).toContain(clean(q));
    expect(t).not.toContain('이불킥');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].chars).toBeGreaterThanOrEqual(r[i].chars);
    expect(search(catalog, 'ㅊ', { mode: 'contains', consonantOnly: true }).songs.map((s) => s.title)).toContain(clean('ㅊ취했'));
    const held = r.filter((s) => s.pending);
    expect(held.length).toBe(6);
    for (const s of held) expect(titles('contains', s.title)).not.toContain(s.title); // 보관 곡은 전체 보기에 없음
  });
  it('3글자만', () => {
    for (const s of search(catalog, '', { mode: 'contains', threeOnly: true }).songs) expect(s.chars).toBe(3);
  });
  it('가수 검색: 이름 일부·괄호 안 표기·초성, 항상 포함 방식', () => {
    const byArtist = (q: string, mode: Mode = 'starts') => search(catalog, q, { mode, target: 'artist' }).songs;
    const zb1 = byArtist('제로베이스원');
    expect(zb1.length).toBeGreaterThan(20);
    for (const s of zb1) expect(s.artist).toContain('제로베이스원');
    expect(zb1.map((s) => s.title)).toContain('인블룸');
    expect(byArtist('zerobaseone').length).toBe(zb1.length);
    expect(byArtist('ZERO BASE ONE').length).toBe(zb1.length);
    const taeyong = byArtist('ㅌㅇ');
    expect(taeyong.some((s) => s.artist.includes('태용'))).toBe(true);
    expect(byArtist('태용', 'ends').length).toBe(byArtist('태용', 'contains').length);
    expect(byArtist('').length).toBe(catalog.count);
  });
  it('가수 정렬: 가나다순/역순, 가수 없는 곡은 맨 뒤', () => {
    const asc = search(catalog, '사랑', { mode: 'contains', artistSort: 'asc' }).songs;
    const named = asc.filter((s) => s.artist);
    for (let i = 1; i < named.length; i++) expect(named[i - 1].artist.localeCompare(named[i].artist, 'ko')).toBeLessThanOrEqual(0);
    const firstEmpty = asc.findIndex((s) => !s.artist);
    if (firstEmpty >= 0) for (const s of asc.slice(firstEmpty)) expect(s.artist).toBe('');
    const desc = search(catalog, '사랑', { mode: 'contains', artistSort: 'desc' }).songs.filter((s) => s.artist);
    expect(desc[0].artist).toBe(named[named.length - 1].artist);
  });
  it('글자 선택 정렬', () => {
    const many = search(catalog, '사랑', { mode: 'contains', letter: '가', letterSort: 'countFirst' }).songs;
    for (let i = 1; i < many.length; i++) {
      const a = many[i - 1], b = many[i], ca = letterCount(a, '가'), cb = letterCount(b, '가');
      expect(ca > cb || (ca === cb && (a.chars > b.chars || (a.chars === b.chars && a.title <= b.title)))).toBe(true);
    }
    const long = search(catalog, '사랑', { mode: 'contains', letter: '가', letterSort: 'lengthFirst' }).songs;
    for (let i = 1; i < long.length; i++) {
      const a = long[i - 1], b = long[i];
      expect(a.chars > b.chars || (a.chars === b.chars && letterCount(a, '가') >= letterCount(b, '가'))).toBe(true);
    }
    expect(many.length).toBe(long.length);
  });
});
