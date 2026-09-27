// 상단 툴바: 로고 마크 + 앱 이름, 오른쪽에 곡 수와 업데이트 확인 버튼
import { num } from '../lib/format';
import { ICON_NOTE, ICON_REFRESH } from './icons';

export interface Banner {
  setCount(n: number): void;
  setUpdateLabel(text: string): void;
  updateButton: HTMLButtonElement;
}

export function renderBanner(root: HTMLElement): Banner {
  root.className = 'topbar';
  root.innerHTML = `
    <div class="brand">
      <span class="logo" aria-hidden="true">${ICON_NOTE}</span>
      <span class="name">한국 대중 음악 <span class="sub">Search Tools</span></span>
      <span class="sep"></span>
      <span class="tagline">제목 · 글자 · 초성으로 찾는 노래 사전</span>
    </div>
    <div class="topbar-right">
      <span class="count" id="count-chip"><b>-</b><span>곡 수록</span></span>
      <button class="ghost-btn" id="update-btn" type="button" title="온라인 목록 업데이트 확인">${ICON_REFRESH}<span id="update-label">업데이트 확인</span></button>
    </div>`;
  const chip = root.querySelector<HTMLElement>('#count-chip b')!;
  const label = root.querySelector<HTMLElement>('#update-label')!;
  return {
    setCount: (n) => { chip.textContent = num(n); },
    setUpdateLabel: (t) => { label.textContent = t; },
    updateButton: root.querySelector<HTMLButtonElement>('#update-btn')!,
  };
}
