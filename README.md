# 한국 대중 음악 Search Tools (Kpop Search Tools)

한국 대중음악 노래 제목 13,000여 곡을 글자·초성으로 찾는 Windows 프로그램입니다.
제목에 특정 글자가 몇 번 들어가는지, 어떤 글자로 시작하거나 끝나는지, 초성만으로도 찾을 수 있습니다.

## 설치

1. [Releases](../../releases) 에서 `KpopSearchTools-Setup.exe` 를 내려받아 실행합니다. (Windows 10/11, 관리자 권한 불필요)
2. Windows SmartScreen 경고가 뜨면 **추가 정보 → 실행** 을 누르세요. (서명되지 않은 프로그램이라 뜨는 안내입니다.)
3. 시작 메뉴의 **Kpop Search Tools** 로 실행합니다. 제거는 설정 → 앱에서 합니다.

## 사용

- 검색창에 제목 일부(예: `사랑`) 또는 초성(예: `ㅇㅂㅋ`)을 입력합니다. 포함/시작/끝나는 제목을 고를 수 있습니다.
- **글자 선택** 에서 글자를 고르면 그 글자가 제목에 몇 번 들어가는지 세어 정렬합니다.
- **자음 포함 제목** 은 `ㅊ취했` 처럼 자음이 홀로 들어간 제목만 보여 줍니다.
- 제목을 두 번 클릭하면 복사됩니다. `Ctrl+F` 검색창, `Esc` 지우기.
- 목록은 프로그램에 들어 있으며, 인터넷이 연결되어 있으면 새 목록이 나왔을 때 자동으로 갱신됩니다. (배너의 "목록 업데이트 확인")

제목 목록은 수집 시점 기준 참고용입니다.

## 개발

필요: Node.js 20+, Rust(stable, MSVC), Visual Studio 2022 Build Tools(C++ 데스크톱 워크로드), Python 3 (목록 내보내기).

```powershell
npm install
npm test                 # 검색 규칙 단위 테스트 (vitest)
npm run tauri dev        # 개발 실행
.\scripts\release.ps1    # 설치 파일 빌드 → release\KpopSearchTools-Setup.exe
```

### 구조

- `src/lib/` 제목 정규화(`titleRules.ts`), 초성(`hangul.ts`), 목록 파싱(`catalog.ts`), 검색·정렬(`search.ts`)
- `src/ui/` 배너·검색 카드·결과 표, `src/main.ts` 조립
- `src-tauri/src/catalog.rs` 목록 읽기와 온라인 업데이트(manifest 확인 → 다운로드 → sha256 검증 → 교체)
- `src-tauri/resources/catalog.json.gz` 내장 목록, `catalog/manifest.json` 앱이 확인하는 최신 목록 정보
- `tools/export_catalog.py` 원본 DB → 목록 파일, `tools/publish_catalog.ps1` GitHub Release 발행

### 목록 갱신 절차

1. 원본 DB(`../gapfill_20260924/release/songs.db`)를 갱신합니다.
2. `.\tools\publish_catalog.ps1` 실행 → `catalog-<버전>` 릴리스 생성, `catalog/manifest.json` 커밋·푸시.
3. 설치된 앱은 다음 실행 때 새 목록을 내려받습니다. 새 설치 파일이 필요하면 `.\scripts\release.ps1` 로 다시 빌드해 `v<버전>` 릴리스에 첨부합니다.
