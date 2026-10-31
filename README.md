# DOROSYNC 웹

니케 싱크로 레벨업 시간·과금 시뮬레이터 (엑셀 DOROSYNC V2.1의 웹 이식판).
서버 없이 브라우저에서만 동작하는 정적 사이트입니다.
주소: https://levelinfinikke.github.io/DOROSYNC/

## 배포 (GitHub Pages)
- 저장소 루트의 `index.html` 한 파일이 완성본입니다(스타일·스크립트 포함).
- Settings → Pages → Source `Deploy from a branch`, Branch `main` / `/ (root)`.
- 수정 후에는 `python3 build.py`로 `dist/index.html`을 만들어 저장소 루트의 `index.html`을 교체합니다.

## 소스 구성 (`src/` 같은 폴더에 보관)
- `index.html` / `style.css` / `app.js` : 화면
- `engine.js` : 시뮬레이션 엔진 (엑셀 시뮬레이션 시트 규칙)
- `data.js`, `tables.js` : 레벨표·투력표·보스표·패키지 기본값 (엑셀에서 추출)
- `worker.js` : 최적 조합 병렬 탐색
- `build.py` : 위 파일을 한 파일로 합쳐 `dist/index.html` 생성
- `tests/` : 원본 엑셀 대조 검산 (`tests/README.md` 참고)

## 데이터 갱신
레벨표·투력표·보스표·패키지 가격이 바뀌면 `data.js`(와 필요시 `tables.js`)를 새 엑셀에서 다시 뽑아 교체하고, 검산을 돌린 뒤 빌드하세요.

## QR / 설정 코드
이미지 저장 시 입력값이 PNG 안에 숨겨지고, QR(주소 + 설정 코드)이 붙습니다.
QR을 폰 카메라로 찍으면 `…/DOROSYNC/#DS1.…` 주소로 열리며 설정이 자동으로 채워집니다. 주소를 바꾸면 `app.js`의 `SITE` 상수를 수정하세요.
