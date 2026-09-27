// 검색 카드: 입력창(지우기 버튼·단축키 힌트), 검색 방식·목록 세그먼트, 글자 칩, 3글자만 스위치
import { MODE_LABELS } from '../lib/format';
import type { LetterSort, Mode, Target } from '../lib/search';
import { expandCompoundJamo } from '../lib/hangul';
import { LETTERS, state } from '../state';
import { ICON_CLOSE, ICON_SEARCH } from './icons';

export interface Controls {
  input: HTMLInputElement;
  focusSearch(): void;
  clearSearch(): void;
  setLetterSort(sort: LetterSort): void;
}

const MODE_SHORT: Record<Mode, string> = { starts: '시작', contains: '포함', ends: '끝' };
const PLACEHOLDER: Record<Target, string> = { title: '노래 제목 또는 초성으로 검색 (예: 사랑, ㅇㅂㅋ)', artist: '가수 이름 또는 초성으로 검색 (예: 아이유, ㅌㅇ)' };

export type ChangeReason = 'query' | 'target' | 'filter';

export function renderControls(root: HTMLElement, onChange: (immediate: boolean, reason?: ChangeReason) => void): Controls {
  root.className = 'card';
  const modes = (Object.keys(MODE_LABELS) as Mode[])
    .map((m) => `<label title="${MODE_LABELS[m]}"><input type="radio" name="mode" value="${m}"${m === state.mode ? ' checked' : ''}><span>${MODE_SHORT[m]}</span></label>`).join('');
  const targets = ([['title', '제목'], ['artist', '가수']] as [Target, string][])
    .map(([v, t]) => `<label><input type="radio" name="target" value="${v}"${v === state.target ? ' checked' : ''}><span>${t}</span></label>`).join('');
  const collections = [['all', '전체 제목'], ['consonant', '자음 포함']]
    .map(([v, t]) => `<label><input type="radio" name="collection" value="${v}"${v === 'all' ? ' checked' : ''}><span>${t}</span></label>`).join('');
  const letters = ['', ...LETTERS]
    .map((l) => `<label class="chip-radio${l ? '' : ' none'}"><input type="radio" name="letter" value="${l}"${l === '' ? ' checked' : ''}><span>${l || '전체'}</span></label>`).join('');
  root.innerHTML = `
    <div class="row1">
      <div class="searchbox" id="searchbox">
        <span class="lead">${ICON_SEARCH}</span>
        <input id="search" type="text" placeholder="${PLACEHOLDER[state.target]}" autocomplete="off" spellcheck="false" aria-label="검색어">
        <kbd>Ctrl F</kbd>
        <button class="clear" id="clear-btn" type="button" title="지우기 (Esc)" aria-label="검색어 지우기">${ICON_CLOSE}</button>
      </div>
      <div class="segment" role="radiogroup" aria-label="검색 대상">${targets}</div>
      <div class="segment" id="mode-seg" role="radiogroup" aria-label="검색 방식" title="제목 검색에서 쓰는 방식">${modes}</div>
      <div class="segment" role="radiogroup" aria-label="자료 분류">${collections}</div>
    </div>
    <div class="row2">
      <span class="label">글자 선택</span>
      <div class="chips">${letters}</div>
      <label class="switch"><input type="checkbox" id="three-only"><span class="track"></span><span>3글자만</span></label>
    </div>`;

  const box = root.querySelector<HTMLElement>('#searchbox')!;
  const input = root.querySelector<HTMLInputElement>('#search')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear-btn')!;
  const threeOnly = root.querySelector<HTMLInputElement>('#three-only')!;
  const modeSeg = root.querySelector<HTMLElement>('#mode-seg')!;
  const applyTarget = () => {
    const artist = state.target === 'artist';
    modeSeg.classList.toggle('disabled', artist);
    modeSeg.querySelectorAll('input').forEach((i) => (i.disabled = artist));
    input.placeholder = PLACEHOLDER[state.target];
  };
  applyTarget();

  const syncBox = () => box.classList.toggle('has-value', input.value.length > 0);

  // 겹받침(ㄶ 등)은 두 자음(ㄴㅎ)으로 바꿔 보여 준다. IME 조합 중에는 건드리지 않고 조합이 끝났을 때 처리.
  const fixCompound = () => {
    const v = expandCompoundJamo(input.value);
    if (v !== input.value) { const atEnd = input.selectionEnd === input.value.length; input.value = v; if (atEnd) input.setSelectionRange(v.length, v.length); }
  };
  input.addEventListener('compositionend', () => { fixCompound(); state.query = input.value; syncBox(); onChange(false); });
  input.addEventListener('input', (e) => { if (!(e as InputEvent).isComposing) fixCompound(); state.query = input.value; syncBox(); onChange(false); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.query = input.value; onChange(true); e.preventDefault(); } });
  clearBtn.addEventListener('click', () => api.clearSearch());
  threeOnly.addEventListener('change', () => { state.threeOnly = threeOnly.checked; onChange(true); });
  root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
    if (r.checked) { state.mode = r.value as Mode; onChange(true); }
  }));
  root.querySelectorAll<HTMLInputElement>('input[name="target"]').forEach((r) => r.addEventListener('change', () => {
    if (r.checked) { state.target = r.value as Target; applyTarget(); onChange(true, 'target'); }
  }));
  root.querySelectorAll<HTMLInputElement>('input[name="collection"]').forEach((r) => r.addEventListener('change', () => {
    if (r.checked) { state.consonantOnly = r.value === 'consonant'; onChange(true); }
  }));
  root.querySelectorAll<HTMLInputElement>('input[name="letter"]').forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    state.letter = r.value; onChange(true);
  }));

  const api: Controls = {
    input,
    focusSearch() { input.focus(); input.select(); },
    clearSearch() { input.value = ''; state.query = ''; syncBox(); input.focus(); onChange(true); },
    setLetterSort(sort) { state.letterSort = sort; },   // 정렬은 표 머리글 클릭으로만 바꾼다
  };
  return api;
}
