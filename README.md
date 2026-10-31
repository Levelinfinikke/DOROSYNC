# DOROSYNC 웹

니케 싱크로 레벨업 시간·과금 시뮬레이터 (엑셀 DOROSYNC V2.1의 웹 이식판).
서버 없이 브라우저에서만 동작하는 정적 사이트입니다.

## GitHub Pages 배포
1. GitHub에서 새 저장소를 만듭니다 (예: `dorosync`).
2. 이 폴더의 파일 전부(`index.html`, `style.css`, `app.js`, `engine.js`, `data.js`, `worker.js`, `.nojekyll`)를 저장소 루트에 올립니다.
3. 저장소 Settings → Pages → Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 지정하고 Save.
4. 1~2분 뒤 `https://<계정>.github.io/dorosync/` 로 접속합니다.

※ `index.html`을 더블클릭(file://)로 열어도 계산은 되지만, 최적 조합 탐색은 워커를 못 써서 느린 단일 스레드로 돌아갑니다.

## 구성
- `engine.js` : 시뮬레이션 엔진 (엑셀 시뮬레이션 시트 규칙)
- `data.js` : 레벨표·투력표·보스표·패키지 기본값 (엑셀에서 추출)
- `app.js` / `style.css` / `index.html` : 화면
- `worker.js` : 최적 조합 병렬 탐색

## 데이터 갱신
레벨표·투력표·보스표·패키지 가격이 바뀌면 `data.js`를 새 엑셀에서 다시 뽑아 교체하세요.
