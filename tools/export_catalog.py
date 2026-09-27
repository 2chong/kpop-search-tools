"""release/songs.db → 배포용 목록(catalog.json, catalog.json.gz, manifest.json).

배포 목록에는 제목·글자 수·가수·원제만 넣는다 (좋아요 수·출처·수집 메모는 넣지 않음, 사용자 결정 2026-09-25).
행 형식: [title, chars, artist, original_title|null, pending(0|1)]
 - pending=1 인 행은 보관 목록 중 '자음 포함 제목' 뿐이며 자음 보기에서만 쓴다.
 - 내보낸 순서(chars DESC, title, id)가 앱의 기본 정렬이다.

사용:  python tools/export_catalog.py [--db PATH] [--out DIR] [--version YYYY-MM-DD.N] [--install] [--repo USER/REPO]
"""
import argparse, datetime, gzip, hashlib, json, pathlib, re, sqlite3, sys, unicodedata

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent
DEFAULT_DB = APP.parent / 'gapfill_20260924' / 'release' / 'songs.db'
DEFAULT_OUT = APP / 'out' / 'catalog'
BUNDLED = APP / 'src-tauri' / 'resources' / 'catalog.json.gz'
SCHEMA = 1
MIN_APP_VERSION = '0.1.0'

OPENS = '([{<〈《「『【〔〖'
ENDS = ')]}>〉》」』】〕〗'
FEAT = re.compile(r'(?:\s+|\s*[-–—]\s*)(?:feat\.?|featuring|ft\.|prod\.?|produced\s+by)\s+.*$', re.I)


def clean(raw):
    """C# TitleRules.Clean 과 동일 (release/SongSearch.cs 37-48행)."""
    pending, out = [], []
    for c in unicodedata.normalize('NFKC', raw):
        i = OPENS.find(c)
        if i >= 0:
            pending.append(ENDS[i]); continue
        if c in ENDS:
            if c in pending:
                while pending and pending.pop() != c:
                    pass
            continue
        if not pending:
            out.append(c)
    s = FEAT.sub('', ''.join(out))
    keep = []
    for c in s:
        if ord(c) > 0xFFFF:
            continue                      # C# 는 UTF-16 단위로 보므로 BMP 밖 문자는 버려짐
        cat = unicodedata.category(c)
        if cat.startswith('L') or cat == 'Nd':
            keep.append(c)
    return ''.join(keep)


def has_standalone_consonant(title):
    """C# TitleRules.HasStandaloneConsonant (결합형 자모 범위)."""
    for c in clean(title):
        o = ord(c)
        if 0x1100 <= o <= 0x115E or 0x11A8 <= o <= 0x11FF or 0xA960 <= o <= 0xA97C or 0xD7CB <= o <= 0xD7FB:
            return True
    return False


def next_version(out_dir):
    today = datetime.date.today().isoformat()
    n = 0
    for p in out_dir.glob('manifest*.json'):
        try:
            v = json.loads(p.read_text('utf-8')).get('version', '')
            if v.startswith(today + '.'):
                n = max(n, int(v.rsplit('.', 1)[1]))
        except Exception:
            pass
    return f'{today}.{n + 1}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', default=str(DEFAULT_DB))
    ap.add_argument('--out', default=str(DEFAULT_OUT))
    ap.add_argument('--version')
    ap.add_argument('--repo', default='2chong/kpop-search-tools', help='GitHub user/repo (manifest url)')
    ap.add_argument('--install', action='store_true', help='src-tauri/resources/catalog.json.gz 에도 복사')
    a = ap.parse_args()

    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    version = a.version or next_version(out)
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.\d+', version):
        sys.exit(f'bad version {version}')

    db = sqlite3.connect(f'file:{pathlib.Path(a.db).as_posix()}?mode=ro', uri=True)
    rows = db.execute("SELECT title,chars,artist,original_title,bucket FROM songs WHERE bucket IN ('main','pending') ORDER BY chars DESC, title, id").fetchall()
    songs = []
    for title, chars, artist, original, bucket in rows:
        if bucket == 'pending' and not has_standalone_consonant(title):
            continue
        assert title == clean(title), f'not clean: {title!r}'
        assert chars == len(title), f'chars mismatch: {title!r}'
        assert ' ' not in title
        orig = original if original and original != title else None
        songs.append([title, chars, artist or '', orig, 1 if bucket == 'pending' else 0])
    main_count = sum(1 for s in songs if s[4] == 0)
    assert main_count > 13000, main_count

    generated = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec='seconds')
    catalog = {'schema': SCHEMA, 'version': version, 'generated': generated, 'count': main_count,
               'fields': ['title', 'chars', 'artist', 'original_title', 'pending'], 'songs': songs}
    raw = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    (out / 'catalog.json').write_bytes(raw)
    gz_path = out / 'catalog.json.gz'
    with open(gz_path, 'wb') as f:
        with gzip.GzipFile(filename='', mode='wb', compresslevel=9, fileobj=f, mtime=0) as g:
            g.write(raw)
    gz = gz_path.read_bytes()
    manifest = {'schema': SCHEMA, 'version': version,
                'url': f'https://github.com/{a.repo}/releases/download/catalog-{version}/catalog.json.gz',
                'sha256': hashlib.sha256(gz).hexdigest(), 'size': len(gz), 'count': main_count,
                'min_app_version': MIN_APP_VERSION, 'generated': generated}
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), 'utf-8')
    if a.install:
        BUNDLED.parent.mkdir(parents=True, exist_ok=True)
        BUNDLED.write_bytes(gz)
    print(json.dumps({'version': version, 'main': main_count, 'pending_consonant': len(songs) - main_count,
                      'json_bytes': len(raw), 'gz_bytes': len(gz), 'out': str(out), 'installed': a.install}, ensure_ascii=False))


if __name__ == '__main__':
    main()
