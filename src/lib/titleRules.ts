// 제목 정규화. 기존 C# TitleRules.Clean (gapfill_20260924/release/SongSearch.cs 37-48행) 과 동일하게 동작한다.
const OPENS = '([{<〈《「『【〔〖';
const ENDS = ')]}>〉》」』】〕〗';
const FEAT = /(?:\s+|\s*[-–—]\s*)(?:feat\.?|featuring|ft\.|prod\.?|produced\s+by)\s+.*$/i;
const KEEP = /^[\p{L}\p{Nd}]$/u;

/** 괄호(안 내용 포함)·feat 꼬리·공백·기호를 제거하고 글자와 숫자만 남긴다. 대소문자는 바꾸지 않는다. */
export function clean(raw: string): string {
  const pending: string[] = [];
  let out = '';
  for (const c of raw.normalize('NFKC')) {
    const open = OPENS.indexOf(c);
    if (open >= 0) { pending.push(ENDS[open]); continue; }
    if (ENDS.includes(c)) {
      if (pending.includes(c)) { while (pending.length > 0) { if (pending.pop() === c) break; } }
      continue;
    }
    if (pending.length === 0) out += c;
  }
  const outside = out.replace(FEAT, '');
  let cleaned = '';
  for (const c of outside) {
    if ((c.codePointAt(0) ?? 0) > 0xffff) continue; // C# 는 UTF-16 단위로 검사하므로 BMP 밖 문자는 버려진다
    if (KEEP.test(c)) cleaned += c;
  }
  return cleaned;
}
