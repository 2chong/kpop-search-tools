import type { Catalog } from './lib/catalog';
import type { ArtistSort, LetterSort, Mode, Target } from './lib/search';

export interface AppState {
  catalog: Catalog | null;
  catalogSource: 'bundled' | 'downloaded' | null;
  query: string;
  mode: Mode;
  target: Target;
  consonantOnly: boolean;
  threeOnly: boolean;
  letter: string;
  letterSort: LetterSort;
  artistSort: ArtistSort;   // 가수 열 클릭 정렬 (null 이면 기본)
}

export const state: AppState = {
  catalog: null,
  catalogSource: null,
  query: '',
  mode: 'starts',
  target: 'title',
  consonantOnly: false,
  threeOnly: false,
  letter: '',
  letterSort: 'countFirst',
  artistSort: null,
};

export const LETTERS = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
