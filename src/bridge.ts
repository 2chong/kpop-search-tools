// Rust 쪽 명령(src-tauri/src/catalog.rs) 과 플러그인 호출을 한 곳에 모은다.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export interface LoadResult { json: string; source: 'bundled' | 'downloaded'; version: string; count: number }
export type CheckResult =
  | { status: 'updated'; version: string; count: number }
  | { status: 'current'; version: string }
  | { status: 'skipped'; reason: string };

/** Tauri 창 밖(일반 브라우저에서 `npm run dev`)에서는 out/catalog/catalog.json 을 읽어 화면만 확인할 수 있게 한다. */
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function loadCatalog(): Promise<LoadResult> {
  if (inTauri) return invoke<LoadResult>('catalog_load');
  const res = await fetch('/out/catalog/catalog.json');
  if (!res.ok) throw new Error('개발용 목록(out/catalog/catalog.json)이 없습니다. tools/export_catalog.py 를 먼저 실행하세요.');
  const json = await res.text();
  const head = JSON.parse(json) as { version: string; count: number };
  return { json, source: 'bundled', version: head.version, count: head.count };
}
export const checkUpdate = (timeoutMs = 5000): Promise<CheckResult> =>
  inTauri ? invoke<CheckResult>('catalog_check_update', { timeoutMs }) : Promise.resolve({ status: 'skipped', reason: '브라우저 미리보기' });
export const resetCatalog = () => (inTauri ? invoke<void>('catalog_reset') : Promise.resolve());
export const copyText = (text: string) => (inTauri ? writeText(text) : navigator.clipboard.writeText(text));
export const appVersion = () => (inTauri ? getVersion().catch(() => 'dev') : Promise.resolve('dev'));
