// Rust 쪽 명령(src-tauri/src/catalog.rs) 과 플러그인 호출을 한 곳에 모은다.
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export interface LoadResult { json: string; source: 'bundled' | 'downloaded'; version: string; count: number }
export type CheckResult =
  | { status: 'updated'; version: string; count: number }
  | { status: 'current'; version: string }
  | { status: 'skipped'; reason: string };

export const loadCatalog = () => invoke<LoadResult>('catalog_load');
export const checkUpdate = (timeoutMs = 5000) => invoke<CheckResult>('catalog_check_update', { timeoutMs });
export const resetCatalog = () => invoke<void>('catalog_reset');
export const copyText = (text: string) => writeText(text);
export const appVersion = () => getVersion().catch(() => 'dev');
