# DOROSYNC 웹

니케 싱크로 레벨업 시간·과금 시뮬레이터 + 작전날짜·오버로드·쥬얼·가챠·전초기지 도구 모음.
서버 없이 브라우저에서만 동작하는 정적 사이트입니다. (블라블라 연동만 Cloudflare 워커 사용)
주소: https://levelinfinikke.github.io/DOROSYNC/

## 폴더 구조
| 경로 | 내용 | 언제 불러오나 |
|---|---|---|
| `index.html` | 화면 뼈대(탭·카드 마크업) | 처음 |
| `css/main.css` | 모든 스타일 | 처음 |
| `js/app.js` | 싱크로·작전날짜·쥬얼·전초기지·티어표 등 본체 + 레벨표·보스표 데이터 | 처음 |
| `js/gm-assets.js` | 가챠 에셋 목록(이미지 경로·티어 기본값) | 처음(작음) |
| `js/gacha.js` | 가챠 머신 엔진 | 가챠 탭을 처음 열 때 |
| `js/worker.js` | 최적 패키지 조합 탐색(백그라운드) | 계산 버튼 누를 때 |
| `ol.html` | 오버로드 계산기(iframe으로 표시) | 오버로드 탭 |
| `assets/img/` | 아이콘·배경·엠블럼 이미지 | 화면에 보일 때 |
| `portraits/` | 니케 초상화 (`블라블라 코드.webp`) | 화면에 보일 때 |
| `dorosync-blablalink.user.js` | (구) 블라블라 연동 유저스크립트 | 다운로드용 |

## 배포 (GitHub Pages)
- Settings → Pages → Source `Deploy from a branch`, Branch `main` / `/ (root)`.
- 위 파일·폴더를 **구조 그대로** 저장소 루트에 올리면 됩니다.
- 로컬에서 확인할 때는 파일을 더블클릭하지 말고 간단한 서버로 여세요(`python3 -m http.server` → http://localhost:8000).
  더블클릭(file://)으로 열면 오버로드 탭·가챠 탭이 브라우저 보안 정책 때문에 열리지 않습니다.

## 새 게임/기능 추가 규칙
- 기능마다 `js/<이름>.js`로 분리하고, 해당 탭을 처음 열 때 불러옵니다(가챠 탭 방식 참고: `app.js`의 `gmMount`).
- 이미지는 파일 안에 넣지 말고 `assets/img/`에 파일로 둡니다.
