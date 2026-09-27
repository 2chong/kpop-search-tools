// 검색 카드: 입력창, 검색 방식, 목록 선택, 글자 칩, 정렬, 3글자만
import { MODE_LABELS } from '../lib/format';
import type { LetterSort, Mode } from '../lib/search';
import { expandCompoundJamo } from '../lib/hangul';
import { LETTERS, state } from '../state';

export interface Controls {
  input: HTMLInputElement;
  focusSearch(): void;
  clearSearch(): void;
  setLetterSort(sort: LetterSort): void;
}

export function renderControls(root: HTMLElement, onChange: (immediate: boolean) => void): Controls {
  root.className = 'card';
  const modes = (Object.keys(MODE_LABELS) as Mode[]).map((m) => `<option value="${m}"${m === state.mode ? ' selected' : ''}>${MODE_LABELS[m]}</option>`).join('');
  const letters = ['', ...LETTERS].map((l) => `<label class="chip-radio"><input type="radio" name="letter" value="${l}"${l === '' ? ' checked' : ''}><span>${l || '없음'}</span></label>`).join('');
  root.innerHTML = `
    <div class="row1">
      <div class="searchbox"><input id="search" type="text" placeholder="노래 제목 또는 초성 (예: 사랑, ㅇㅂㅋ)" autocomplete="off" spellcheck="false" aria-label="검색어 (제목 또는 초성)"></div>
      <select class="flat" id="mode" aria-label="검색 방식">${modes}</select>
      <select class="flat" id="collection" aria-label="자료 분류"><option value="all">전체 제목</option><option value="consonant">자음 포함 제목</option></select>
    </div>
    <div class="row2">
      <span class="label">글자 선택</span>${letters}
      <span class="label sort">정렬</span>
      <select class="flat" id="letter-sort" disabled aria-label="글자 정렬"><option value="countFirst">많은 개수 → 긴 제목</option><option value="lengthFirst">긴 제목 → 많은 개수</option></select>
      <label class="check"><input type="checkbox" id="three-only"> 3글자만</label>
    </div>`;

  const input = root.querySelector<HTMLInputElement>('#search')!;
  const mode = root.querySelector<HTMLSelectElement>('#mode')!;
  const collection = root.querySelector<HTMLSelectElement>('#collection')!;
  const letterSort = root.querySelector<HTMLSelectElement>('#letter-sort')!;
  const threeOnly = root.querySelector<HTMLInputElement>('#three-only')!;

  // 겹받침(ㄶ 등)은 두 자음(ㄴㅎ)으로 바꿔 보여 준다. IME 조합 중에는 건드리지 않고 조합이 끝났을 때 처리.
  const fixCompound = () => {
    const v = expandCompoundJamo(input.value);
    if (v !== input.value) { const atEnd = input.selectionEnd === input.value.length; input.value = v; if (atEnd) input.setSelectionRange(v.length, v.length); }
  };
  input.addEventListener('compositionend', () => { fixCompound(); state.query = input.value; onChange(false); });
  input.addEventListener('input', (e) => { if (!(e as InputEvent).isComposing) fixCompound(); state.query = input.value; onChange(false); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.query = input.value; onChange(true); e.preventDefault(); } });
  mode.addEventListener('change', () => { state.mode = mode.value as Mode; onChange(true); });
  collection.addEventListener('change', () => { state.consonantOnly = collection.value === 'consonant'; onChange(true); });
  letterSort.addEventListener('change', () => { state.letterSort = letterSort.value as LetterSort; onChange(true); });
  threeOnly.addEventListener('change', () => { state.threeOnly = threeOnly.checked; onChange(true); });
  root.querySelectorAll<HTMLInputElement>('input[name="letter"]').forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    state.letter = r.value; letterSort.disabled = state.letter.length === 0; onChange(true);
  }));

  return {
    input,
    focusSearch() { input.focus(); input.select(); },
    clearSearch() { input.value = ''; state.query = ''; input.focus(); onChange(true); },
    setLetterSort(sort) { state.letterSort = sort; letterSort.value = sort; },
  };
}
