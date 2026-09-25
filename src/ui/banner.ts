// 상단 배너: 파란 그라데이션 + SVG 장식 + 타이포그래피 이미지 + 곡 수 칩 + 업데이트 확인 버튼
import titleImage from '../assets/banner-title.png';
import { num } from '../lib/format';

const BARS = [12, 24, 40, 58, 34, 48, 70, 30, 46, 62, 22, 38, 54, 28, 16, 36, 20];

function decoration(): string {
  // 좌표는 viewBox 기준(1980x112). 오른쪽 정렬로 잘라 창 너비가 바뀌어도 장식 위치가 유지된다.
  const W = 1980, H = 112;
  const circles = [[W - 220, -10, 160], [W - 35, 145, 115], [W / 2 - 35, H + 25, 85], [390, -30, 90]]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" fill-opacity=".086"/>`).join('');
  const bars = BARS.map((h, i) => { const x = W - 700 + i * 15, y = H / 2 - h / 2; return `<rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="#fff" fill-opacity=".31"/>`; }).join('');
  const notes = [[W - 330, 34, '♫', 32], [W - 270, 78, '♩', 32], [W - 430, 78, '♪', 22], [360, 34, '♪', 22], [W / 2 - 40, 90, '♫', 22]]
    .map(([x, y, t, s]) => `<text x="${x}" y="${y}" font-size="${s}" font-family="Segoe UI Symbol" fill="#fff" fill-opacity=".25">${t}</text>`).join('');
  const arcs = `<path d="M ${W - 560} 100 A 210 130 0 0 1 ${W - 140} 100" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
    <path d="M ${W - 520} 104 A 170 110 0 0 1 ${W - 180} 104" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>`;
  return `<svg class="deco" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">${circles}${bars}${notes}${arcs}</svg>`;
}

export function renderBanner(root: HTMLElement): { setCount(n: number): void; updateButton: HTMLButtonElement } {
  root.className = 'banner';
  root.innerHTML = `${decoration()}<img class="title" src="${titleImage}" alt="한국 대중 음악 Search Tools" draggable="false">
    <div class="chip" id="count-chip">-</div><button class="update" id="update-btn" type="button" title="온라인 목록 업데이트 확인">목록 업데이트 확인</button>`;
  const chip = root.querySelector<HTMLElement>('#count-chip')!;
  return { setCount: (n) => { chip.textContent = `${num(n)}곡`; }, updateButton: root.querySelector<HTMLButtonElement>('#update-btn')! };
}
