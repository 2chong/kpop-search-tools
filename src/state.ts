import type { Catalog } from './lib/catalog';
import type { LetterSort, Mode } from './lib/search';

export interface AppState {
  catalog: Catalog | null;
  catalogSource: 'bundled' | 'downloaded' | null;
  query: string;
  mode: Mode;
  consonantOnly: boolean;
  threeOnly: boolean;
  letter: string;
  letterSort: LetterSort;
}

export const state: AppState = {
  catalog: null,
  catalogSource: null,
  query: '',
  mode: 'starts',
  consonantOnly: false,
  threeOnly: false,
  letter: '',
  letterSort: 'countFirst',
};

export const LETTERS = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
