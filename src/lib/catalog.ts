// 목록 파일(catalog.json) 파싱. tools/export_catalog.py 가 만든 형식(schema 1).
import { artistKeyOf, hasStandaloneConsonant, initialsOf, initialsOfText } from './hangul';

export interface Song {
  idx: number;            // 목록 안 순서 = 기본 정렬(긴 제목 → 제목 가나다) 의 tiebreak
  title: string;
  chars: number;
  artist: string;
  originalTitle: string | null;
  pending: boolean;       // 보관 목록(자음 포함 제목만 실림) — 자음 보기에서만 표시
  initials: string;       // 초성 검색 키
  lower: string;          // 소문자 제목(검색 키)
  consonant: boolean;     // 홀로 쓰인 자음 포함
  artistKey: string;      // 가수 검색 키(소문자·글자만)
  artistInitials: string; // 가수 초성 검색 키
}

export interface Catalog {
  schema: number;
  version: string;
  generated: string;
  count: number;          // 기본 목록(main) 곡 수
  songs: Song[];
}

type Row = [string, number, string, string | null, number];

export function parseCatalog(json: string): Catalog {
  const raw = JSON.parse(json) as { schema: number; version: string; generated: string; count: number; songs: Row[] };
  if (raw.schema !== 1) throw new Error(`지원하지 않는 목록 형식: schema ${raw.schema}`);
  if (!Array.isArray(raw.songs)) throw new Error('목록 형식 오류: songs 없음');
  const songs: Song[] = raw.songs.map((r, idx) => ({
    idx, title: r[0], chars: r[1], artist: r[2] ?? '', originalTitle: r[3] ?? null, pending: r[4] === 1,
    initials: initialsOf(r[0]), lower: r[0].toLowerCase(), consonant: hasStandaloneConsonant(r[0]),
    artistKey: artistKeyOf(r[2] ?? ''), artistInitials: initialsOfText(artistKeyOf(r[2] ?? '')),
  }));
  const mainCount = songs.reduce((n, s) => n + (s.pending ? 0 : 1), 0);
  if (mainCount !== raw.count) throw new Error(`목록 곡 수 불일치: ${mainCount} != ${raw.count}`);
  return { schema: raw.schema, version: raw.version, generated: raw.generated, count: raw.count, songs };
}

/** 목록 버전 "YYYY-MM-DD.N" 비교. a > b 면 양수. */
export function compareVersion(a: string, b: string): number {
  const [ad, an] = a.split('.'); const [bd, bn] = b.split('.');
  if (ad !== bd) return ad < bd ? -1 : 1;
  return (parseInt(an ?? '0', 10) || 0) - (parseInt(bn ?? '0', 10) || 0);
}
