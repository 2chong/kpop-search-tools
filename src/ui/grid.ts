// 결과 표: 200행씩 추가 렌더, 선택 글자 강조, 헤더 클릭 정렬, 더블클릭 복사
import type { Song } from '../lib/catalog';
import { letterCount, type LetterSort } from '../lib/search';
import { state } from '../state';
import { ICON_CHEVRON_DOWN, ICON_SEARCH_X } from './icons';

const CHUNK = 200;

export interface GridCallbacks {
  onCopy(song: Song): void;
  onSortChange(sort: LetterSort): void;
  onArtistSort(): void;
}

/** 보던 자리: 선택한 곡과 그 행이 화면 위에서 얼마나 내려와 있었는지. 검색어를 지우면 이 자리로 돌아온다. */
export interface ViewSnapshot {
  song: Song | null;
  rowOffset: number;   // 선택 행의 위치 - 스크롤 위치
  scrollTop: number;
}

export interface Grid {
  render(songs: Song[], restore?: ViewSnapshot): void;
  snapshot(): ViewSnapshot;
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

function artistHtml(artist: string): string {
  const q = state.target === 'artist' ? state.query.trim().toLowerCase() : '';
  if (!q) return escapeHtml(artist);
  const i = artist.toLowerCase().indexOf(q);
  if (i < 0) return escapeHtml(artist);
  return `${escapeHtml(artist.slice(0, i))}<mark class="hit">${escapeHtml(artist.slice(i, i + q.length))}</mark>${escapeHtml(artist.slice(i + q.length))}`;
}

export function renderGrid(root: HTMLElement, cb: GridCallbacks): Grid {
  root.className = 'grid-wrap';
  const glyph = `<span class="glyph">${ICON_CHEVRON_DOWN}</span>`;
  root.innerHTML = `<table class="grid hide-count">
    <thead><tr>
      <th class="th-title"><span class="th-inner">노래 제목</span></th>
      <th class="sortable num th-len" data-sort="lengthFirst" title="글자 선택 시: 긴 제목 → 많은 개수"><span class="th-inner"><span class="th-text">글자 수</span>${glyph}</span></th>
      <th class="sortable num count th-count" data-sort="countFirst" title="글자가 많은 순, 같은 개수는 긴 제목부터"><span class="th-inner"><span class="th-text">포함 개수</span>${glyph}</span></th>
      <th class="sortable th-artist" data-sort="artist" title="클릭: 가수 가나다순 / 다시 클릭: 역순"><span class="th-inner"><span class="th-text">가수</span>${glyph}</span></th>
    </tr></thead>
    <tbody></tbody></table>
    <div class="more" hidden><button type="button">더 보기</button></div>
    <div class="empty" hidden><span class="ico">${ICON_SEARCH_X}</span><span class="t">검색 결과가 없습니다</span><span class="d">다른 검색어나 글자를 선택해 보세요.</span></div>`;
  const table = root.querySelector<HTMLTableElement>('table.grid')!;
  const tbody = table.tBodies[0];
  const more = root.querySelector<HTMLElement>('.more')!;
  const moreBtn = more.querySelector('button')!;
  const empty = root.querySelector<HTMLElement>('.empty')!;
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
      tr.innerHTML = `<td class="title">${titleHtml(s.title, letter)}</td><td class="num">${s.chars}</td><td class="num">${letter ? letterCount(s, letter) : ''}</td><td class="artist">${artistHtml(s.artist)}</td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    rendered = end;
    more.hidden = rendered >= songs.length;
    moreBtn.textContent = `더 보기 (남은 ${(songs.length - rendered).toLocaleString('ko-KR')}개)`;
  }

  tbody.addEventListener('click', (e) => {
    const tr = (e.target as HTMLElement).closest('tr');
    if (tr) select(tr);
  });
  tbody.addEventListener('dblclick', (e) => {
    const tr = (e.target as HTMLElement).closest('tr');
    if (!tr) return;
    const s = songs[Number(tr.dataset.i)];
    if (s) cb.onCopy(s);
  });
  table.querySelectorAll<HTMLElement>('th.sortable').forEach((th) => th.addEventListener('click', () => {
    if (th.dataset.sort === 'artist') { cb.onArtistSort(); return; }
    if (state.artistSort) { cb.onSortChange((th.dataset.sort as LetterSort) || 'countFirst'); return; }   // 가수 정렬 중이면 글자 수 클릭 = 기본 정렬로
    if (!state.letter) return;
    cb.onSortChange(th.dataset.sort as LetterSort);
  }));

  function updateHeader() {
    const has = state.letter.length > 0;
    table.classList.toggle('hide-count', !has);   // 열 숨김은 th·td 를 함께 CSS 로 (fixed 레이아웃 정렬 유지)
    countTh.querySelector<HTMLElement>('.th-text')!.textContent = has ? `${state.letter} 개수` : '포함 개수';
    table.querySelectorAll<HTMLElement>('th.sortable .glyph').forEach((g) => g.classList.remove('on', 'desc'));
    if (state.artistSort) table.querySelector<HTMLElement>('th[data-sort="artist"] .glyph')!.classList.add('on', ...(state.artistSort === 'asc' ? ['desc'] : []));
    else if (has) table.querySelector<HTMLElement>(`th[data-sort="${state.letterSort}"] .glyph`)!.classList.add('on');
  }

  function select(tr: HTMLTableRowElement | null) {
    selected?.classList.remove('selected');
    if (tr) tr.classList.add('selected');
    selected = tr;
  }

  return {
    snapshot() {
      const song = selected ? songs[Number(selected.dataset.i)] ?? null : null;
      return { song, rowOffset: selected ? selected.offsetTop - root.scrollTop : 0, scrollTop: root.scrollTop };
    },
    render(list, restore) {
      songs = list; rendered = 0; selected = null;
      minLen = Infinity; maxLen = 0;
      for (const s of list) { if (s.chars < minLen) minLen = s.chars; if (s.chars > maxLen) maxLen = s.chars; }
      if (list.length === 0) { minLen = 0; }
      tbody.innerHTML = '';
      root.scrollTop = 0;
      empty.hidden = list.length > 0;
      updateHeader();
      appendChunk();
      // 보던 자리 복원: 같은 곡(목록이 갈렸으면 제목·가수가 같은 곡)을 찾아 그 행까지 그린 뒤 같은 높이에 놓는다.
      let idx = -1;
      if (restore?.song) {
        const want = restore.song;
        idx = list.indexOf(want);
        if (idx < 0) idx = list.findIndex((s) => s.title === want.title && s.artist === want.artist);
      }
      if (idx >= 0) {
        while (rendered <= idx && rendered < songs.length) appendChunk();
        const tr = tbody.rows[idx];
        select(tr);
        root.scrollTop = Math.max(0, tr.offsetTop - restore!.rowOffset);
      } else if (restore && restore.scrollTop > 0) {
        while (rendered * 42 < restore.scrollTop + root.clientHeight && rendered < songs.length) appendChunk();
        root.scrollTop = restore.scrollTop;
        select(tbody.querySelector('tr'));
      } else {
        select(tbody.querySelector('tr'));
      }
    },
  };
}
