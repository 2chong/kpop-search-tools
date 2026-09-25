// 결과 표: 200행씩 추가 렌더, 선택 글자 강조, 헤더 클릭 정렬, 더블클릭 복사
import type { Song } from '../lib/catalog';
import { letterCount, type LetterSort } from '../lib/search';
import { state } from '../state';

const CHUNK = 200;

export interface GridCallbacks {
  onCopy(song: Song): void;
  onSortChange(sort: LetterSort): void;
}

export interface Grid {
  render(songs: Song[]): void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function titleHtml(title: string, letter: string): string {
  if (title.length === 0) return '<span class="muted">정리 후 빈 제목</span>';
  if (!letter || !title.includes(letter)) return escapeHtml(title);
  let out = '';
  for (const c of title) out += c === letter ? `<mark class="hit">${escapeHtml(c)}</mark>` : escapeHtml(c);
  return out;
}

export function renderGrid(root: HTMLElement, cb: GridCallbacks): Grid {
  root.className = 'grid-wrap';
  root.innerHTML = `<table class="grid"><colgroup><col><col style="width:80px"><col style="width:90px"><col style="width:190px"></colgroup>
    <thead><tr><th>노래 제목</th><th class="sortable" data-sort="lengthFirst" title="글자 선택 시: 긴 제목 → 많은 개수">글자 수<span class="glyph"></span></th>
    <th class="sortable count" data-sort="countFirst" title="글자가 많은 순, 같은 개수는 긴 제목부터">포함 개수<span class="glyph"></span></th><th>가수</th></tr></thead>
    <tbody></tbody></table><div class="more" hidden><button type="button">더 보기</button></div><div class="empty" hidden>검색 결과가 없습니다.</div>`;
  const table = root.querySelector<HTMLTableElement>('table.grid')!;
  const tbody = table.tBodies[0];
  const more = root.querySelector<HTMLElement>('.more')!;
  const moreBtn = more.querySelector('button')!;
  const empty = root.querySelector<HTMLElement>('.empty')!;
  const countCol = table.querySelector<HTMLTableColElement>('colgroup col:nth-child(3)')!;
  const countTh = table.querySelector<HTMLElement>('th.count')!;

  let songs: Song[] = [];
  let rendered = 0;
  let minLen = 0, maxLen = 0;
  let selected: HTMLTableRowElement | null = null;

  const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) appendChunk(); }, { root, rootMargin: '400px' });
  observer.observe(more);
  moreBtn.addEventListener('click', appendChunk);

  function appendChunk() {
    if (rendered >= songs.length) { more.hidden = true; return; }
    const letter = state.letter;
    const frag = document.createDocumentFragment();
    const end = Math.min(songs.length, rendered + CHUNK);
    for (let i = rendered; i < end; i++) {
      const s = songs[i];
      const tr = document.createElement('tr');
      const t = maxLen > minLen ? (s.chars - minLen) / (maxLen - minLen) : 0;
      tr.style.setProperty('--t', t.toFixed(3));
      tr.dataset.i = String(i);
      const tip = [s.originalTitle ? `원제: ${s.originalTitle}` : '', s.artist ? `가수: ${s.artist}` : '', s.pending ? '보관 목록(자음 포함 제목)' : ''].filter(Boolean).join('\n');
      if (tip) tr.title = tip;
      tr.innerHTML = `<td class="title">${titleHtml(s.title, letter)}</td><td class="num">${s.chars}</td><td class="num">${letter ? letterCount(s, letter) : ''}</td><td class="artist">${escapeHtml(s.artist)}</td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    rendered = end;
    more.hidden = rendered >= songs.length;
    moreBtn.textContent = `더 보기 (남은 ${(songs.length - rendered).toLocaleString('ko-KR')}개)`;
  }

  tbody.addEventListener('click', (e) => {
    const tr = (e.target as HTMLElement).closest('tr');
    if (!tr) return;
    selected?.classList.remove('selected'); tr.classList.add('selected'); selected = tr;
  });
  tbody.addEventListener('dblclick', (e) => {
    const tr = (e.target as HTMLElement).closest('tr');
    if (!tr) return;
    const s = songs[Number(tr.dataset.i)];
    if (s) cb.onCopy(s);
  });
  table.querySelectorAll<HTMLElement>('th.sortable').forEach((th) => th.addEventListener('click', () => {
    if (!state.letter) return;
    cb.onSortChange(th.dataset.sort as LetterSort);
  }));

  function updateHeader() {
    const has = state.letter.length > 0;
    countCol.style.width = has ? '90px' : '0';
    countTh.style.display = has ? '' : 'none';
    tbody.querySelectorAll('td:nth-child(3)').forEach((td) => ((td as HTMLElement).style.display = has ? '' : 'none'));
    countTh.firstChild!.textContent = has ? `${state.letter} 개수` : '포함 개수';
    table.querySelectorAll<HTMLElement>('th.sortable .glyph').forEach((g) => (g.textContent = ''));
    if (has) table.querySelector<HTMLElement>(`th[data-sort="${state.letterSort}"] .glyph`)!.textContent = '▼';
  }

  return {
    render(list) {
      songs = list; rendered = 0; selected = null;
      minLen = Infinity; maxLen = 0;
      for (const s of list) { if (s.chars < minLen) minLen = s.chars; if (s.chars > maxLen) maxLen = s.chars; }
      if (list.length === 0) { minLen = 0; }
      tbody.innerHTML = '';
      root.scrollTop = 0;
      empty.hidden = list.length > 0;
      updateHeader();
      appendChunk();
      const has = state.letter.length > 0;
      tbody.querySelectorAll('td:nth-child(3)').forEach((td) => ((td as HTMLElement).style.display = has ? '' : 'none'));
      const first = tbody.querySelector('tr'); if (first) { first.classList.add('selected'); selected = first; }
    },
  };
}
