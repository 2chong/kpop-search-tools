import './styles/app.css';
import { appVersion, checkUpdate, copyText, loadCatalog } from './bridge';
import { parseCatalog } from './lib/catalog';
import { countPill, num, statusText } from './lib/format';
import { search } from './lib/search';
import { state } from './state';
import { renderBanner } from './ui/banner';
import { renderControls } from './ui/controls';
import { renderGrid } from './ui/grid';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'catalog.lastCheck';

const app = document.getElementById('app')!;
const bannerEl = document.createElement('header');
const body = document.createElement('div'); body.className = 'body';
const cardEl = document.createElement('section');
const statusEl = document.createElement('div'); statusEl.className = 'status';
statusEl.innerHTML = '<span class="pill" id="count-pill">불러오는 중</span><span class="text" id="status-text"></span>';
const gridEl = document.createElement('div');
const toast = document.createElement('div'); toast.className = 'toast';
body.append(cardEl, statusEl, gridEl);
app.append(bannerEl, body, toast);

const banner = renderBanner(bannerEl);
const pill = statusEl.querySelector<HTMLElement>('#count-pill')!;
const statusTextEl = statusEl.querySelector<HTMLElement>('#status-text')!;
let statusOverride = '';
let toastTimer = 0;

function showToast(text: string) {
  toast.textContent = text; toast.classList.add('show');
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function refresh() {
  if (!state.catalog) return;
  const r = search(state.catalog, state.query, { mode: state.mode, consonantOnly: state.consonantOnly, threeOnly: state.threeOnly, letter: state.letter, letterSort: state.letterSort });
  grid.render(r.songs);
  pill.textContent = countPill(r.songs.length, r.initialQuery);
  statusTextEl.textContent = statusOverride || statusText({ consonantOnly: state.consonantOnly, mode: state.mode, threeOnly: state.threeOnly, letter: state.letter, letterSort: state.letterSort, initialQuery: r.initialQuery });
  statusOverride = '';
}

let debounce = 0;
const controls = renderControls(cardEl, (immediate) => {
  window.clearTimeout(debounce);
  if (immediate) refresh(); else debounce = window.setTimeout(refresh, 80);
});
const grid = renderGrid(gridEl, {
  async onCopy(song) {
    if (song.title.length === 0) { statusOverride = '괄호 속 내용을 제거한 뒤 제목이 남지 않았습니다. 마우스를 올려 원제를 확인해 주세요.'; refresh(); return; }
    try { await copyText(song.title); showToast(`복사됨: ${song.title}`); statusOverride = '제목을 복사했습니다.'; refresh(); }
    catch { showToast('클립보드를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
  },
  onSortChange(sort) { controls.setLetterSort(sort); refresh(); },
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); controls.focusSearch(); }
  else if (e.key === 'Escape') { e.preventDefault(); controls.clearSearch(); }
});

async function loadAndRender(): Promise<void> {
  const r = await loadCatalog();
  state.catalog = parseCatalog(r.json);
  state.catalogSource = r.source;
  banner.setCount(state.catalog.count);
  refresh();
}

function updateLabel() {
  banner.updateButton.textContent = `목록 ${state.catalog?.version ?? '?'} · 업데이트 확인`;
}

async function runUpdateCheck(manual: boolean, force = false) {
  const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
  if (!manual && !force && Date.now() - last < CHECK_INTERVAL_MS) return;
  banner.updateButton.disabled = true; banner.updateButton.textContent = '확인 중…';
  try {
    const res = await checkUpdate(manual ? 10000 : 5000);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    if (res.status === 'updated') { await loadAndRender(); showToast(`목록이 ${num(res.count)}곡으로 업데이트되었습니다 (${res.version})`); }
    else if (manual && res.status === 'current') showToast(`최신 목록입니다 (${res.version})`);
    else if (manual && res.status === 'skipped') showToast(`업데이트를 확인하지 못했습니다: ${res.reason}`);
  } catch (err) {
    if (manual) showToast(`업데이트 확인 실패: ${String(err)}`);
  } finally {
    banner.updateButton.disabled = false; updateLabel();
  }
}
banner.updateButton.addEventListener('click', () => void runUpdateCheck(true));

(async () => {
  try {
    await loadAndRender();
    controls.focusSearch();
    const ver = await appVersion();
    banner.updateButton.title = `앱 ${ver} · 목록 ${state.catalog?.version ?? '?'} (${state.catalogSource === 'downloaded' ? '내려받음' : '내장'})`;
    updateLabel();
    void runUpdateCheck(false, true);                                   // 시작할 때는 항상 한 번 확인(조용히)
    window.setInterval(() => void runUpdateCheck(false), CHECK_INTERVAL_MS); // 켜 둔 채로도 6시간마다
  } catch (err) {
    pill.textContent = '목록을 열 수 없습니다';
    statusTextEl.textContent = String(err);
  }
})();
