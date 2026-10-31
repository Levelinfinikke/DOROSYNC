/* DOROSYNC 웹 – 화면 로직 */
(function () {
  'use strict';
  const D = self.DATA, E = self.DoroEngine;
  const RES = E.RES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => (isFinite(n) ? Math.round(n).toLocaleString('ko-KR') : '-');
  const won = (n) => fmt(n) + '원';
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'dorosync.web.v4';
  const BOSSNAME = {"0-3":["쫄몹","철갑"],"1-4":["블랙스미스","수냉"],"2-12":["그레이브 디거","풍압"],"3-16":["스푸크","풍압"],"4-18":["스카프","작열"],"5-20":["랜드 이터","전격"],"6-24":["토커티브","작열"],"7-24":["모더니아","풍압"],"8-27":["타이피스","작열"],"9-27":["닥터","철갑"],"10-25":["두리안","전격"],"11-27":["하베스터","수냉"],"12-24":["마테리얼H","철갑"],"13-15":["알트아이젠","수냉"],"13-18":["토커티브","작열"],"13-24":["모더니아","풍압"],"14-30":["선바스","전격"],"15-30":["레이턴스","풍압"],"16-28":["케투스","작열"],"17-33":["시니스터","작열"],"18-33":["스톰브링어","철갑"],"19-30":["플레이트","수냉"],"20-31":["니힐리스타","수냉"],"21-32":["마더 웨일","전격"],"22-36":["니힐리스타","수냉"],"23-34":["리빌드 벌컨R","풍압"],"24-38":["마테리얼H","풍압"],"25-36":["핑거즈","철갑"],"26-34":["울트라","철갑"],"27-36":["언노운 크리스탈","전격"],"28-40":["크리스탈 체임버","전격"],"29-34":["리빌드 포터","철갑"],"30-34":["크리스탈 체임버","전격"],"31-36":["크리스탈 체임버","전격"],"32-33":["미러 컨테이너","전격"],"33-34":["크리스탈 아머","전격"],"34-38":["베히모스","전격"],"35-36":["스카라베","수냉"],"36-37":["검은 뱀","수냉"],"37-36":["레비아탄","작열"],"38-37":["글러트니","작열"],"39-36":["리빌드 오벨리스크","작열"],"40-36":["지즈","작열"],"41-20":["베히모스","전격"],"41-25":["지즈","작열"],"41-40":["툼스톤","풍압"],"42-13":["글러트니","작열"],"42-44":["온리 원","수냉"],"43-40":["헤비메탈","풍압"],"44-36":["앨트루이아","철갑"],"45-32":["머슬 토드","전격"],"46-40":["에고비스타","전격"],"47-36":["애니힐리오","풍압"],"48-36":["리버렐리오 바디","수냉"],"49-36":["노스텔지어","풍압"],"50-18":["리버렐리오 바디","수냉"],"50-21":["앨트루이아","철갑"],"50-24":["에고비스타","전격"],"50-27":["애니힐리오","풍압"],"50-36":["승리의 여신상","작열"]};

  /* ---------- 상태 ---------- */
  function todayStr() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function defaults() {
    return {
      S0: 200, T: 600, L0: 282, sortie: 3, start: todayStr(), G: -0.35, power: 0,
      boxes: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
      loose: [0, 0, 0],
      inc: JSON.parse(JSON.stringify(D.inc)),
      pk: JSON.parse(JSON.stringify(D.pk)).map((p) => Object.assign(p, { use: false, opt: !/^\(기간\)/.test(p.name) && p.name.indexOf('스텝업') < 0 && p.name.indexOf('모듈 오버 부스트') < 0 && !/^주간 니케 그로우 업 (I|II)$/.test(p.name) && p.name.indexOf('마스터스 부스트') < 0 })),
      must: false,
      cfg: Object.assign(JSON.parse(JSON.stringify(D.cfg)), { mlen: 30, ratio: [1, 1, 3] }),
    };
  }
  let st = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.pk && s.pk.length === D.pk.length && s.inc && s.inc.length === D.inc.length) st = Object.assign(defaults(), s);
    }
  } catch (e) { /* 저장소를 못 쓰는 환경이면 무시 */ }
  st.pk.forEach((p) => { p.max = 0; }); // 접속할 때마다 구매 횟수(최대)는 0(무제한)에서 시작
  st.cfg = Object.assign({}, st.cfg, { mlen: 30, ratio: [1, 1, 3] });
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }, 200);
  }

  let M = null, TR = null; // 현재 모델/결과

  /* ---------- 날짜 ---------- */
  function dstr(d, withWd) {
    const t = new Date(M.startMs + (d - 1) * 86400000);
    const p = (x) => String(x).padStart(2, '0');
    return t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate()) + (withWd ? '(' + WD[t.getUTCDay()] + ')' : '');
  }

  /* ---------- 입력 폼 ---------- */
  function field(id, label, html, hint) {
    return '<div class="fld"><label for="' + id + '">' + label + '</label>' + html + (hint ? '<div class="hint" id="' + id + '-h">' + hint + '</div>' : '') + '</div>';
  }
  const num = (id, v, min, max, step) =>
    '<input type="number" id="' + id + '" value="' + (v === '' || v == null ? '' : v) + '" ' + (min != null ? 'min="' + min + '" ' : '') + (max != null ? 'max="' + max + '" ' : '') + 'step="' + (step || 'any') + '" inputmode="decimal">';

  function buildUser() {
    const gopt = [];
    for (let p = 0; p <= 45; p += 5) gopt.push('<option value="' + (-p / 100) + '"' + (Math.abs(st.G + p / 100) < 1e-9 ? ' selected' : '') + '>' + (p === 0 ? '0%' : '-' + p + '%' + ({ 20: ' (자동)', 30: ' (손컨)', 35: ' (어려움)', 40: ' (극한)', 45: ' (불가능)' }[p] || '')) + '</option>');
    $('#f-user').innerHTML =
      field('u-S0', '현재 싱크로 레벨', num('u-S0', st.S0, 1, 999, 1), '200~999') +
      field('u-T', '목표 싱크로 레벨', num('u-T', st.T, 2, 1000, 1), '최대 1000') +
      field('u-L0', '전초기지 레벨', num('u-L0', st.L0, 1, 800, 1), '<span id="u-L0-t">비우면 평균 기지레벨 사용</span>') +
      field('u-sortie', '단기섬멸 횟수', num('u-sortie', st.sortie, 1, 11, 1), '1~11 (1회는 무료)') +
      field('u-power', '현재 1군 전투력', num('u-power', st.power || '', 0, null, 1), '<span id="u-power-t">비우면 평균 유저 전투력 사용</span>') +
      field('u-start', '시작 날짜', '<input type="date" id="u-start" value="' + st.start + '">') +
      field('u-G', '투력차 (클리어 성향)', '<select id="u-G">' + gopt.join('') + '</select>', '0% ~ -45% (5% 단위)');
    const bind = (id, fn) => $('#' + id).addEventListener('input', (e) => { fn(e.target.value); onChange(); });
    bind('u-S0', (v) => (st.S0 = +v));
    bind('u-T', (v) => (st.T = +v));
    bind('u-L0', (v) => (st.L0 = v === '' ? '' : +v));
    bind('u-sortie', (v) => (st.sortie = +v));
    bind('u-start', (v) => (st.start = v));
    bind('u-G', (v) => (st.G = +v));
    bind('u-power', (v) => (st.power = +v || 0));
  }

  const BNAMES = ['24h 상자 (개)', '12h 상자 (개)', '8h 상자 (개)', '4h 상자 (개)', '2h 상자 (개)', '1h 상자 (개)'];
  let stockOpen = false;
  function updateStockBtn() {
    const any = st.boxes.some((r) => r.slice(0, 5).some((v) => v > 0));
    $('#stock-toggle').textContent = (stockOpen ? '숨기기' : '펼치기') + (!stockOpen && any ? ' (입력됨)' : '');
  }
  function buildStock() {
    let h = '<thead><tr><th>항목</th><th>코더 (코어더스트)</th><th>배데 (배틀데이터)</th><th>크레딧</th></tr></thead><tbody id="stock-hid"' + (stockOpen ? '' : ' hidden') + '>';
    for (let i = 0; i < 5; i++) {
      h += '<tr><td>' + BNAMES[i] + '</td>';
      for (let k = 0; k < 3; k++) h += '<td>' + num('s-' + k + '-' + i, st.boxes[k][i], 0, null, 1) + '</td>';
      h += '</tr>';
    }
    h += '</tbody><tbody><tr><td>' + BNAMES[5] + '</td>';
    for (let k = 0; k < 3; k++) h += '<td>' + num('s-' + k + '-5', st.boxes[k][5], 0, null, 1) + '</td>';
    h += '</tr><tr><td>낱개 단위</td>';
    for (let k = 0; k < 3; k++) h += '<td>' + num('s-' + k + '-L', st.loose[k], 0, null, 1) + '</td>';
    h += '</tr></tbody><tfoot><tr><td>보유 합계 (낱개 환산)</td><td id="s-sum-0"></td><td id="s-sum-1"></td><td id="s-sum-2"></td></tr></tfoot>';
    $('#t-stock').innerHTML = h;
    $$('#t-stock input').forEach((el) => el.addEventListener('input', () => {
      const [, k, i] = el.id.split('-');
      const v = Math.max(0, +el.value || 0);
      if (i === 'L') st.loose[+k] = v; else st.boxes[+k][+i] = v;
      updateStockBtn();
      onChange();
    }));
    updateStockBtn();
  }
  $('#stock-toggle').addEventListener('click', () => { stockOpen = !stockOpen; $('#stock-hid').hidden = !stockOpen; updateStockBtn(); });

  function buildCfg() {
    const wd = ['월', '화', '수', '목', '금', '토', '일'].map((n, i) => '<option value="' + (i + 1) + '"' + (st.cfg.wk === i + 1 ? ' selected' : '') + '>' + n + '요일</option>').join('');
    $('#f-cfg').innerHTML =
      field('c-wk', '주간 패키지 구매 요일', '<select id="c-wk">' + wd + '</select>') +
      field('c-mday', '월간 패키지 구매일 (매월 N일)', num('c-mday', st.cfg.mday, 1, 28, 1)) +
      field('c-per', '(기간) 패키지 주기 (일)', num('c-per', st.cfg.per, 1, 60, 1));
    const b = (id, f) => $('#' + id).addEventListener('input', (e) => { f(+e.target.value); onChange(); });
    b('c-wk', (v) => (st.cfg.wk = v));
    b('c-mday', (v) => (st.cfg.mday = v || 1));
    b('c-per', (v) => (st.cfg.per = v || 14));
  }

  /* ---------- 패키지 표 (조합 계산에 포함할 패키지 선택) ---------- */
  const pkEff = (p) => {
    const mult = E.periodOf(p.name) === '월정액' ? 30 : 1, r = [1, 1, 3];
    let v = 0;
    if (p.sel && p.base > 0) v = p.base * mult; // 선택재화형은 어느 재화를 골라도 효율 동일
    else for (let k = 0; k < 3; k++) v += (p.h[k] * mult) / r[k];
    return (v / p.price) * 10000;
  };
  const EFF = D.pk.map(pkEff);
  const PKORDER = D.pk.map((p, j) => j).sort((x, y) => EFF[y] - EFF[x] || x - y);
  const mustIdx = () => st.pk.findIndex((p) => p.name.indexOf('스텝업') >= 0);
  const eligible = (j) => !!st.pk[j].opt && j !== mustIdx();
  function comboCount() {
    let n = 0, s = 0;
    st.pk.forEach((p, j) => { if (eligible(j)) { n++; if (p.sel && p.base > 0) s++; } });
    return { n, s, total: Math.pow(2, n - s) * Math.pow(4, s) };
  }
  function updateCombo() {
    const c = comboCount(), big = c.total > 500000;
    const t = '포함 ' + c.n + '개 · 조합 ' + c.total.toLocaleString('ko-KR') + '가지';
    const el = $('#pk-combo');
    if (el) { el.textContent = '현재 ' + t; el.className = big ? 'bad' : ''; }
    const oc = $('#opt-combo');
    if (oc) { oc.textContent = big ? '조합 ' + c.total.toLocaleString('ko-KR') + '가지 · 50만가지를 넘으면 느려집니다' : ''; oc.className = big ? 'hint bad' : 'hint'; }
  }
  const COMP = ["무료쥬얼 1500 / 고급티켓 5 / 일반티켓 10 / 코어더스트1시간 180", "무료쥬얼 1500 / 코어더스트1시간 120 / 크레디트1시간 120", "무료쥬얼 1700 / 고급티켓 15 / 일반티켓 11 / 코어더스트1시간 20", "유료쥬얼 1210 / 30일성장보급상자", "무료쥬얼 1500 / 커스텀선택 3개", "무료쥬얼 4200 / 커스텀선택 4개", "무료쥬얼 1200 / 코어더스트1시간 90", "무료쥬얼 1500 / 코어더스트1시간 48 / 배틀데이터셋1시간 48 / 크레디트1시간 48", "무료쥬얼 320 / 코어더스트1시간 24 / 코어더스트 300", "무료쥬얼 320 / 배틀데이터셋1시간 30", "무료쥬얼 2300 / 배틀데이터셋1시간 90 / 모듈더블하이부스트 150", "무료쥬얼 4200 / 그로우세트1시간 24 / 코어더스트1시간 72 / 배틀데이터셋1시간 72", "일반티켓 10 / 그로우세트1시간 12", "일반티켓 5 / 그로우세트1시간 6", "무료쥬얼 4200 / 크레디트1시간 150 / 모듈더블하이부스트 120", "무료쥬얼 1500 / 배틀데이터셋1시간 90", "무료쥬얼 720 / 크레디트1시간 150", "무료쥬얼 320 / 크레디트1시간 60 / 크레디트 100K", "무료쥬얼 4200 / T9기업장비선택상자 / 소장품선택박스 / 보급물자Ⅰ 120", "무료쥬얼 1500 / 코어더스트1시간 60 / 코드매뉴얼 100", "무료쥬얼 4200 / 스킬선택상자 120 / 그로우세트1시간 40", "무료쥬얼 8000 / 버스트선택상자 120 / 그로우세트1시간 40", "무료쥬얼 2300 / 기업SSR선물 10 / 공용SSR선물 10 / 그로우세트1시간 24", "무료쥬얼 2300 / 크레디트1시간 200 / 모듈 3"];
  function compTok(t) {
    let m;
    if ((m = /^코어더스트1시간 (\d+)$/.exec(t))) return '<span class="rc-c">코더 ' + m[1] + 'h</span>';
    if ((m = /^배틀데이터셋1시간 (\d+)$/.exec(t))) return '<span class="rc-b">배데 ' + m[1] + 'h</span>';
    if ((m = /^크레디트1시간 (\d+)$/.exec(t))) return '<span class="rc-k">크레딧 ' + m[1] + 'h</span>';
    if ((m = /^그로우세트1시간 (\d+)$/.exec(t))) return '그로우세트 ' + m[1] + 'h(<span class="rc-c">코</span><span class="rc-b">배</span><span class="rc-k">크</span>)';
    return esc(t);
  }
  function compOf(p, j) {
    const R = ['코더', '배데', '크레딧'], C = ['rc-c', 'rc-b', 'rc-k'];
    let s = (COMP[j] || '').split(' / ').filter(Boolean).map(compTok).join(' · ');
    if (p.sel && p.base > 0) { const rt = D.cfg.ratio; s += (s ? '<br>' : '') + '선택: ' + R.map((n, k) => '<span class="' + C[k] + '">' + n + ' ' + p.base * rt[k] + 'h</span>').join(' / ') + ' 중 택1'; }
    return s || '-';
  }
  function buildPkg() {
    let h = '<thead><tr><th>포함</th><th class="l">패키지</th><th class="l">구성</th><th>가격(원)</th><th>1만원당 환산h</th><th>구매 횟수(최대)</th><th>과금액(원)</th></tr></thead><tbody>';
    PKORDER.forEach((j) => {
      const p = st.pk[j], must = j === mustIdx();
      h += '<tr data-j="' + j + '"><td><input type="checkbox" data-f="' + (must ? 'must' : 'opt') + '"' + ((must ? st.must : p.opt) ? ' checked' : '') + '></td>' +
        '<td class="name">' + esc(p.name) + (must ? ' <span class="tag">필수 구매 여부</span>' : '') + '</td>' +
        '<td class="l comp">' + compOf(p, j) + '</td><td>' + fmt(p.price) + '</td><td>' + EFF[j].toFixed(1) + '</td><td><input type="number" min="0" step="1" data-f="max" data-o="cnt" value="' + (p.max > 0 ? p.max : '') + '"></td><td data-o="bill"></td></tr>';
    });
    h += '</tbody><tfoot><tr><td></td><td class="l">합계</td><td></td><td></td><td></td><td id="pk-sum-cnt"></td><td id="pk-sum-bill"></td></tr></tfoot>';
    $('#t-pkg').innerHTML = h;
    updateCombo();
  }
  $('#t-pkg').addEventListener('input', (e) => {
    const el = e.target, tr = el.closest('tr[data-j]');
    if (!tr || !el.dataset.f) return;
    if (el.dataset.f === 'max') { const v = Math.floor(+el.value); st.pk[+tr.dataset.j].max = v > 0 ? v : 0; onChange(); return; }
    if (el.dataset.f === 'must') { st.must = el.checked; $('#o-must').checked = el.checked; }
    else st.pk[+tr.dataset.j].opt = el.checked;
    updateCombo();
    onChange();
  });
  $('#pk-all').addEventListener('click', () => { st.pk.forEach((p, j) => { if (j !== mustIdx()) p.opt = true; }); buildPkg(); onChange(); });
  $('#pk-none').addEventListener('click', () => { st.pk.forEach((p, j) => { if (j !== mustIdx()) p.opt = false; }); buildPkg(); onChange(); });

  /* 구매 내역에서 횟수 조정: 0이면 구매 해제, 1 이상이면 최대 구매 횟수로 적용 */
  function setCount(j, n) {
    n = Math.max(0, Math.floor(+n) || 0);
    const p = st.pk[j];
    if (n === 0) { p.use = false; p.max = 0; } else { p.use = true; p.max = n; }
    buildPkg();
    if (OPT) { $('#opt-stale').hidden = false; }
    save(); clearTimeout(tmr); tmr = setTimeout(recalc, 30);
  }
  $('#result').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-dj]'); if (!b || b.disabled) return;
    const j = +b.dataset.dj, cur = TR && TR.cnt ? TR.cnt[j] : 0;
    setCount(j, cur + +b.dataset.d);
  });
  $('#result').addEventListener('change', (e) => {
    const el = e.target.closest('input[data-cj]'); if (!el) return;
    setCount(+el.dataset.cj, el.value);
  });

  /* ---------- 일일 수급 표 ---------- */
  function buildInc() {
    let h = '<thead><tr><th>사용</th><th class="l">항목</th><th>주기(일)</th><th>코더 h</th><th>코더 고정</th><th>배데 h</th><th>배데 고정</th><th>크레딧 h</th><th>크레딧 고정</th><th>일일 코더</th><th>일일 배데</th><th>일일 크레딧</th></tr></thead><tbody>';
    st.inc.forEach((r, i) => {
      h += '<tr data-i="' + i + '"><td><input type="checkbox" data-f="use"' + (r.use ? ' checked' : '') + '></td><td class="name">' + esc(r.name) + '</td>';
      h += '<td><input type="number" data-f="cyc" min="1" step="any" value="' + r.cyc + '"></td>';
      for (let k = 0; k < 3; k++) {
        if (r.sortie) h += '<td data-o="sh' + k + '"></td>';
        else h += '<td><input type="number" data-f="h' + k + '" min="0" step="any" value="' + r.h[k] + '"></td>';
        h += '<td><input type="number" data-f="fx' + k + '" min="0" step="any" value="' + r.fx[k] + '"></td>';
      }
      h += '<td data-o="d0"></td><td data-o="d1"></td><td data-o="d2"></td></tr>';
    });
    h += '</tbody><tfoot><tr><td></td><td class="l">합계</td><td></td><td colspan="6"></td><td id="inc-s0"></td><td id="inc-s1"></td><td id="inc-s2"></td></tr></tfoot>';
    $('#t-inc').innerHTML = h;
  }
  $('#t-inc').addEventListener('input', (e) => {
    const el = e.target, tr = el.closest('tr[data-i]');
    if (!tr || !el.dataset.f) return;
    if (el.dataset.f === 'max') { const v = Math.floor(+el.value); st.pk[+tr.dataset.j].max = v > 0 ? v : 0; onChange(); return; }
    const r = st.inc[+tr.dataset.i], f = el.dataset.f;
    if (f === 'use') r.use = el.checked;
    else if (f === 'cyc') r.cyc = +el.value > 0 ? +el.value : 1;
    else if (f[0] === 'h') r.h[+f[1]] = +el.value || 0;
    else r.fx[+f[2]] = +el.value || 0;
    onChange();
  });

  /* ---------- 차트 ---------- */
  function niceTicks(lo, hi, n) {
    if (hi <= lo) hi = lo + 1;
    const raw = (hi - lo) / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p, step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (let v = a; v <= b + step * 0.5; v += step) t.push(+v.toFixed(10));
    return t;
  }
  /** opts: {series:[{name,color,pts:[[x,y]],dots?}], xl, yl, xf, yf, tip(i,s), onPick(i)} */
  function chart(el, o) {
    const W = 560, H = 270, ml = 58, mr = 12, mt = 10, mb = 34;
    let xs = [], ys = [];
    o.series.forEach((s) => s.pts.forEach((p) => { xs.push(p[0]); ys.push(p[1]); }));
    if (!xs.length) { el.innerHTML = '<p class="muted">표시할 데이터가 없습니다.</p>'; return; }
    const yt = niceTicks(Math.min(...ys), Math.max(...ys), 5), xt = niceTicks(Math.min(...xs), Math.max(...xs), 6);
    const x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
    const X = (v) => ml + ((v - x0) / (x1 - x0 || 1)) * (W - ml - mr);
    const Y = (v) => H - mb - ((v - y0) / (y1 - y0 || 1)) * (H - mt - mb);
    let g = '';
    yt.forEach((v) => { g += '<line class="gl" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="tx" x="' + (ml - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (o.yf ? o.yf(v) : fmt(v)) + '</text>'; });
    xt.forEach((v) => { g += '<text class="tx" x="' + X(v) + '" y="' + (H - mb + 15) + '" text-anchor="middle">' + (o.xf ? o.xf(v) : fmt(v)) + '</text>'; });
    g += '<line class="ax" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (H - mb) + '" y2="' + (H - mb) + '"/>';
    if (o.xl) g += '<text class="tx" x="' + (W - mr) + '" y="' + (H - 4) + '" text-anchor="end">' + o.xl + '</text>';
    o.series.forEach((s, si) => {
      let d = '';
      s.pts.forEach((p, i) => {
        if (s.step && i) d += 'L' + X(p[0]).toFixed(1) + ',' + Y(s.pts[i - 1][1]).toFixed(1);
        d += (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1);
      });
      if (!s.noline) g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="6 4"' : '') + '/>';
      if (s.dots) s.pts.forEach((p, i) => { g += '<circle data-i="' + i + '" cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="' + (s.sel === i ? (s.selR || 6) : (s.dotColors && s.dotColors[i] ? 5 : 3.5)) + '" fill="' + (s.sel === i ? (s.selColor || 'var(--c2)') : (s.dotColors && s.dotColors[i]) || s.color) + '" stroke="var(--card)" stroke-width="1.5"/>'; });
      if (s.selArrow && s.sel != null && s.sel >= 0 && s.pts[s.sel]) {
        const ax = X(s.pts[s.sel][0]), py = Y(s.pts[s.sel][1]), up = py - 9 - 18 < 0;
        g += '<path d="M' + ax.toFixed(1) + ',' + (up ? py + 9 : py - 9).toFixed(1) + (up ? 'l-6,10h4v8h4v-8h4z' : 'l-6,-10h4v-8h4v8h4z') + '" fill="' + (s.selColor || 'var(--c2)') + '" stroke="var(--card)" stroke-width="1"/>';
      }
    });
    if (o.link) {
      const k = o.link, ax = X(k.x1), bx = X(k.x2), ay = Y(k.y1), by = Y(k.y2);
      g += '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="' + k.color + '" stroke-width="2.5" stroke-linecap="round"/>';
      g += '<text x="' + ((ax + bx) / 2).toFixed(1) + '" y="' + (((ay + by) / 2) - 7).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + k.color + '" stroke="var(--card)" stroke-width="3" paint-order="stroke">' + k.text + '</text>';
    }
    g += '<line id="cx" class="ax" y1="' + mt + '" y2="' + (H - mb) + '" style="display:none"/>';
    let lg = '';
    if (o.series.length > 1) lg = '<div class="legend">' + o.series.map((s) => '<span><i style="background:' + s.color + '"></i>' + s.name + '</span>').join('') + '</div>';
    el.innerHTML = lg + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.label || '그래프') + '">' + g + '</svg><div class="tip"></div>';
    const svg = $('svg', el), tip = $('.tip', el), cx = $('#cx', el);
    const snaps = (o.snaps || []).map((s) => Object.assign({}, s, { px: X(s.x), py: Y(s.y) }));
    if (snaps.length) {
      let mk = '';
      snaps.forEach((s) => { mk += '<circle cx="' + s.px.toFixed(1) + '" cy="' + s.py.toFixed(1) + '" r="4.5" fill="' + s.color + '" stroke="var(--card)" stroke-width="1.5"/>'; });
      svg.insertAdjacentHTML('beforeend', mk);
    }
    const base = o.series.reduce((m, s) => (s.pts.length > m.length ? s.pts : m), o.series[0].pts);
    function near(ev) {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      let bi = 0, bd = 1e18;
      base.forEach((p, i) => { const d = Math.abs(X(p[0]) - px); if (d < bd) { bd = d; bi = i; } });
      return bi;
    }
    svg.addEventListener('mousemove', (ev) => {
      const r = svg.getBoundingClientRect();
      const mpx = ((ev.clientX - r.left) / r.width) * W, mpy = ((ev.clientY - r.top) / r.height) * H;
      let sn = null, sd = 18;
      snaps.forEach((s) => { const d = Math.hypot(s.px - mpx, s.py - mpy); if (d < sd) { sd = d; sn = s; } });
      if (sn) {
        cx.setAttribute('x1', sn.px); cx.setAttribute('x2', sn.px); cx.style.display = '';
        tip.innerHTML = sn.html; tip.style.left = (sn.px / W) * r.width + 'px'; tip.style.top = (sn.py / H) * r.height + (lg ? 22 : 0) + 'px'; tip.classList.add('on');
        return;
      }
      const i = near(ev), p = base[i];
      cx.setAttribute('x1', X(p[0])); cx.setAttribute('x2', X(p[0])); cx.style.display = '';
      tip.innerHTML = o.tip(i); tip.style.left = (X(p[0]) / W) * r.width + 'px'; tip.style.top = (Y(p[1]) / H) * r.height + (lg ? 22 : 0) + 'px'; tip.classList.add('on');
    });
    svg.addEventListener('mouseleave', () => { tip.classList.remove('on'); cx.style.display = 'none'; });
    if (o.onPick) svg.addEventListener('click', (ev) => o.onPick(near(ev)));
  }

  /* ---------- 계산 & 렌더 ---------- */
  let tmr = 0;
  function onChange(kind) {
    if (OPT && kind !== 'use' && kind !== 'apply') $('#opt-stale').hidden = false;
    save(); clearTimeout(tmr); tmr = setTimeout(recalc, 90); }

  function problems() {
    const p = [];
    if (!(st.S0 >= 1 && st.S0 < 1000)) p.push('현재 싱크로 레벨은 1~999 사이여야 합니다.');
    if (!(st.T > st.S0)) p.push('목표 싱크로 레벨이 현재보다 커야 합니다.');
    if (st.T > 1000) p.push('목표 싱크로 레벨은 최대 1000입니다.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(st.start)) p.push('시작 날짜를 입력하세요.');
    return p;
  }

  function recalc() {
    const pr = problems();
    const box = $('#result');
    if (pr.length) {
      M = TR = null;
      box.innerHTML = '<p class="bad">' + pr.join('<br>') + '</p>';
      return;
    }
    const warn = [];
    if (st.S0 < 200) warn.push('200 싱크로 레벨 미만은 레벨업 비용표가 없어 정확하지 않습니다(1군의 오버작+소장품+스킬작 완료 후 사용).');
    M = E.buildModel(st, D);
    TR = E.simulate(M, null, true);
    const t = TR;
    const first = t.first;
    const allOk = first.every((x) => x > 0);
    const daysAll = allOk ? Math.max(...first) : 0;
    // 구매 횟수
    const cnt = st.pk.map(() => 0);
    t.rows.forEach((r) => r.flags.forEach((f, j) => (cnt[j] += f)));
    TR.cnt = cnt;
    const bill = t.bill;

    const reachCls = (() => {
      const v = first.map((x) => (x > 0 ? x : Infinity)), mx = Math.max(...v), mn = Math.min(...v);
      if (mx === Infinity) { const c = v.map((x) => (x === Infinity ? 'r-bad' : '')); return c; }
      if ((mx - mn) / mx <= 0.1) return v.map(() => 'r-ok');
      const oth = v.filter((x) => x < mx * 0.97), avg = oth.reduce((p, q) => p + q, 0) / oth.length;
      const c = (mx - avg) / avg > 0.2 ? 'r-bad' : 'r-mid';
      return v.map((x) => (x >= mx * 0.97 ? c : x <= mx * 0.8 ? 'r-lo' : ''));
    })();
    const NP = E.simulate(M, M.Pk.map(() => false), true);
    const npDays = NP.first.every((x) => x > 0) ? Math.max(...NP.first) : 0;
    const saved = allOk && npDays > daysAll ? npDays - daysAll : 0;
    let h = '<div class="kpis">';
    h += '<div class="kpi' + (allOk ? '' : ' bad') + '"><small>전체 목표 달성</small><b>' + (allOk ? daysAll + '일' : '미도달') + (saved ? ' <small class="sv">-' + saved + '일 / -' + Math.round(saved / npDays * 100) + '% (무과금대비)</small>' : '') + '</b><span>' + (allOk ? dstr(daysAll, true) : '1500일 안에 도달하지 못했습니다') + '</span></div>';
    h += '<div class="kpi bill"><small>총 과금액</small><b>' + won(bill) + '</b><span>' + (allOk ? '월 환산 약 ' + won(bill / Math.max(1, daysAll) * 30) : '1500일까지 누적한 값') + '</span></div>';
    h += '</div><div class="tscroll"><table class="tbl"><thead><tr><th class="l">재화</th><th>남는 재화</th><th>도달 일수</th><th>도달 날짜</th></tr></thead><tbody>';
    RES.forEach((n, k) => {
      const cl = reachCls[k];
      h += '<tr><td class="l">' + n + '</td><td>' + (allOk ? (Math.max(0, t.rows[daysAll - 1].cum[k] - M.Need[k]) / M.Boxes[t.rows[daysAll - 1].L - 1][k]).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'h' : '-') + '</td><td class="' + cl + '"><b>' + (first[k] ? first[k] + '일' : '미도달') + '</b></td><td>' + (first[k] ? dstr(first[k], true) : '-') + '</td></tr>';
    });
    h += '</tbody></table></div><div class="rlg"><span><i style="background:var(--bad)"></i>늦음</span><span><i style="background:var(--mid)"></i>조금 늦음</span><span><i style="background:var(--ok)"></i>완벽</span><span><i style="background:var(--accent)"></i>빠름</span></div>';
    const buys = st.pk.map((p, j) => ({ p, c: cnt[j], j })).filter((x) => x.c > 0);
    if (buys.length) {
      h += '<h3 class="mt">구매 내역</h3><div class="tscroll"><table class="tbl compact"><tbody>' +
        buys.map((x) => '<tr><td class="l name">' + esc(x.p.name) + (x.p.sel ? ' <span class="tag">' + x.p.sel + ' 선택</span>' : '') + '</td><td class="cntc"><span class="stp"><button type="button" class="ghost sm" data-dj="' + x.j + '" data-d="-1" aria-label="횟수 줄이기">−</button><input type="number" min="0" step="1" value="' + x.c + '" data-cj="' + x.j + '"><button type="button" class="ghost sm" data-dj="' + x.j + '" data-d="1" aria-label="횟수 늘리기"' + (x.p.max > 0 && x.c >= x.p.max ? '' : ' disabled title="상한에 걸려 있지 않아 늘려도 변화가 없습니다"') + '>+</button></span>회</td><td>' + won(x.c * x.p.price) + '</td></tr>').join('') + '</tbody></table></div>';
    } else h += '<p class="muted mt">선택된 구매 패키지가 없습니다(일일 수급만 반영).</p>';
    if (warn.length) h += '<p class="note warn mt">' + warn.join('<br>') + '</p>';
    box.innerHTML = h;
    // 투력 보정 문구
    const pt = $('#u-power-t');
    if (pt) pt.textContent = st.power > 0 ? (() => { const d = (st.power / M.cpsAt(M.S0) - 1) * 100; return '동기보다 ' + Math.abs(d).toFixed(1) + '% ' + (d >= 0 ? '강합니다' : '약합니다'); })() : '비우면 평균 유저 전투력 사용';
    const lt = $('#u-L0-t');
    if (lt) lt.textContent = M.autoL ? '비우면 평균 기지레벨 ' + M.avgL + ' 사용' : '동기보다 ' + Math.abs(M.L0 - M.avgL) + 'Lv. ' + (M.L0 >= M.avgL ? '높습니다' : '낮습니다');
    // 보유 합계
    for (let k = 0; k < 3; k++) {
      const el = $('#s-sum-' + k);
      if (el) el.textContent = fmt(M.Uh0[k] * M.v1h0[k] + (st.loose[k] || 0));
    }
    // 차트
    const days = t.rows;
    const np = NP.rows;
    const at = (arr, i, key, s0) => (i === 0 ? s0 : arr.length ? arr[Math.min(i, arr.length) - 1][key] : s0);
    chart($('#ch-lv'), {
      label: '싱크로·전초기지 레벨', xl: '일차',
      series: [
        { name: '싱크로 Lv', color: 'var(--c1)', pts: [[0, st.S0]].concat(days.map((r) => [r.t, r.S])) },
        { name: '싱크로 Lv (무과금)', color: 'var(--muted)', dash: true, pts: [[0, st.S0]].concat(np.map((r) => [r.t, r.S])) },
        { name: '전초기지 Lv', color: 'var(--c2)', pts: [[0, M.L0]].concat(days.map((r) => [r.t, r.L])) },
      ],
      link: (np.length && days.length && np[np.length - 1].S === days[days.length - 1].S && np[np.length - 1].t !== days[days.length - 1].t) ? (() => {
        const n = np[np.length - 1], c = days[days.length - 1], d = n.t - c.t, pct = Math.round(Math.abs(d) / n.t * 100);
        return { x1: c.t, y1: c.S, x2: n.t, y2: n.S, color: d > 0 ? 'var(--ok)' : 'var(--bad)', text: (d > 0 ? '-' : '+') + Math.abs(d) + '일 / ' + (d > 0 ? '-' : '+') + pct + '%' };
      })() : null,
      snaps: [
        np.length ? { x: np[np.length - 1].t, y: np[np.length - 1].S, color: 'var(--muted)', html: '무과금 도달점<br>' + np[np.length - 1].t + '일차 · ' + dstr(np[np.length - 1].t) + '<br>싱크로 ' + np[np.length - 1].S } : null,
        days.length ? { x: days[days.length - 1].t, y: days[days.length - 1].S, color: 'var(--c1)', html: '현재 플랜 도달점<br>' + days[days.length - 1].t + '일차 · ' + dstr(days[days.length - 1].t) + '<br>싱크로 ' + days[days.length - 1].S } : null,
      ].filter(Boolean),
      tip: (i) => (i === 0 ? '시작' : i + '일차 · ' + dstr(i)) + '<br>싱크로 ' + at(days, i, 'S', st.S0) + ' · 무과금 ' + at(np, i, 'S', st.S0) + '<br>전초기지 ' + at(days, i, 'L', M.L0),
    });
    renderOut();
  }

  /** 입력 이외의 표(패키지 결과열, 수급, 일자별, 보스) */
  function renderOut() {
    if (!M) return;
    // 패키지 표
    let sc = 0, sb = 0;
    $$('#t-pkg tr[data-j]').forEach((tr) => {
      const j = +tr.dataset.j, p = M.Pk[j];
      const c = TR.cnt[j];
      tr.querySelector('[data-o=cnt]').placeholder = c ? String(c) : '-';
      tr.querySelector('[data-o=bill]').textContent = c ? fmt(c * p.price) : '-';
      sc += c; sb += c * p.price;
    });
    if ($('#pk-sum-cnt')) { $('#pk-sum-cnt').textContent = sc; $('#pk-sum-bill').textContent = fmt(sb); }
    // 수급 표
    const v1 = M.v1h0;
    const sums = [0, 0, 0];
    $$('#t-inc tr[data-i]').forEach((tr) => {
      const r = st.inc[+tr.dataset.i], cyc = r.cyc > 0 ? r.cyc : 1;
      for (let k = 0; k < 3; k++) {
        const h = r.sortie ? 2 * st.sortie : r.h[k];
        const v = r.use ? (h * v1[k] + r.fx[k]) / cyc : 0;
        sums[k] += v;
        tr.querySelector('[data-o=d' + k + ']').textContent = fmt(v);
        const sh = tr.querySelector('[data-o=sh' + k + ']'); if (sh) sh.textContent = h;
      }
    });
    for (let k = 0; k < 3; k++) $('#inc-s' + k).textContent = fmt(sums[k]);
    if ($('#tab-daily').classList.contains('on')) renderDaily();
    if ($('#tab-boss').classList.contains('on')) renderBoss();
  }

  function buyText(r) {
    const a = [];
    r.flags.forEach((f, j) => { if (f) a.push(st.pk[j].name.replace(/^(\(기간\)|월간|주간|일일)\s*/, '').replace(' (월정액)', '')); });
    return a.join(', ');
  }
  function renderDaily() {
    if (!TR) return;
    let h = '<thead><tr><th>일차</th><th class="l">날짜</th><th class="l">구매 패키지</th><th>일일 과금</th><th>누적 과금</th><th>싱크로 Lv</th><th>예상 전투력</th><th>전초기지 Lv</th><th>코더 획득</th><th>배데 획득</th><th>크레딧 획득</th></tr></thead><tbody>';
    const last = TR.rows.length ? TR.rows[TR.rows.length - 1].t : 0;
    TR.rows.forEach((r) => {
      h += '<tr class="' + (r.bill > 0 ? 'buy' : '') + (r.t === last && TR.days < 9999 ? ' end' : '') + '"><td>' + r.t + '</td><td class="l">' + dstr(r.t, true) + '</td><td class="l name">' + esc(buyText(r)) + '</td><td>' + (r.bill ? fmt(r.bill) : '-') + '</td><td>' + fmt(r.billCum) + '</td><td>' + r.S + '</td><td>' + fmt(r.power) + '</td><td>' + r.L + '</td>' +
        r.acq.map((x) => '<td>' + fmt(x) + '</td>').join('') + '</tr>';
    });
    $('#t-daily').innerHTML = h + '</tbody>';
  }
  $('#d-csv').addEventListener('click', () => {
    if (!TR) return;
    const head = ['일차', '날짜', '구매 패키지', '일일 과금', '누적 과금', '싱크로 Lv', '예상 전투력', '전초기지 Lv', '코더 획득', '배데 획득', '크레딧 획득'];
    const rows = TR.rows.map((r) => [r.t, dstr(r.t), '"' + buyText(r).replace(/"/g, '""') + '"', r.bill, r.billCum, r.S, Math.round(r.power), r.L, Math.round(r.acq[0]), Math.round(r.acq[1]), Math.round(r.acq[2])]);
    const csv = [head].concat(rows).map((r) => r.join(',')).join('\n');
    const msg = $('#d-msg');
    const ok = () => { msg.textContent = '복사했습니다. 엑셀이나 메모장에 붙여넣으세요.'; };
    const fail = () => {
      const ta = document.createElement('textarea');
      ta.value = csv; document.body.appendChild(ta); ta.select();
      let r = false;
      try { r = document.execCommand('copy'); } catch (e) { r = false; }
      ta.remove();
      msg.textContent = r ? '복사했습니다. 엑셀이나 메모장에 붙여넣으세요.' : '복사하지 못했습니다. 브라우저 권한을 확인하세요.';
    };
    try { navigator.clipboard.writeText(csv).then(ok, fail); } catch (e) { fail(); }
  });

  function bossCell(b) {
    const code = b.name.replace(' (STAGE)', ''), info = BOSSNAME[code];
    let h = '<b>' + esc(code) + '</b>' + (b.name.indexOf('(STAGE)') >= 0 ? ' <span class="muted">STAGE</span>' : '');
    if (info) {
      h += ' ' + esc(info[0]) + ' <span class="el" data-el="' + info[1] + '">' + info[1] + '</span>';
      if (info[2]) h += ' <span class="muted">' + esc(info[2]) + '</span>';
    }
    if (b.K) h += ' <span class="tag bumptag">방지턱</span>';
    return h;
  }
  function renderBoss() {
    if (!TR) return;
    const all = E.bossTable(M, TR), skipped = all.filter((b) => b.day === 0).length;
    const rows = all.filter((b) => b.day !== 0).sort((x, y) => (x.day === null ? 1e9 : x.day) - (y.day === null ? 1e9 : y.day) || x.no - y.no);
    $('#boss-note').textContent = skipped ? '시작 시점에 이미 클리어 가능한 보스 ' + skipped + '개는 생략했습니다.' : '';
    let h = '<thead><tr><th>순서</th><th class="l">모드</th><th class="l">보스</th><th>기준 전투력</th><th>예상 투력</th><th>예상 싱크로 Lv</th><th>예상 날짜</th><th>일차</th><th>한섭 최저클 평균</th></tr></thead><tbody>';
    const kr = {};
    if (self.TABLES) { self.TABLES.bump.stage.rows.forEach((r) => { if (typeof r[6] === 'number') kr[r[1]] = r[6]; }); self.TABLES.bump.sum.rows.forEach((r) => { if (typeof r[6] === 'number') kr[r[1]] = r[6]; }); }
    rows.forEach((b) => {
      h += '<tr' + (b.K ? ' class="bump"' : '') + '><td>' + b.no + '</td><td class="l">' + b.mode + '</td><td class="l name">' + bossCell(b) + '</td><td>' + fmt(b.base) + '</td><td>' + (b.P == null ? '-' : fmt(b.P)) + '</td><td>' + (b.S == null ? '-' : b.S) + '</td><td class="' + (b.day === null ? 'bad' : '') + '">' + (b.day === null ? '미도달' : dstr(b.day, true)) + '</td><td>' + (b.day === null ? '-' : b.day) + '</td><td>' + (b.mode === '하드' && kr[b.name.replace(' (STAGE)', '')] ? fmt(kr[b.name.replace(' (STAGE)', '')]) : '-') + '</td></tr>';
    });
    $('#t-boss').innerHTML = h + '</tbody>';
  }

  /* ---------- 최적 조합 ---------- */
  const forcedList = () => (st.must && mustIdx() >= 0 ? [mustIdx()] : []);
  let optRun = 0, OPT = null, curWorkers = [];

  function stopOpt(msg) {
    optRun++;
    curWorkers.forEach((w) => w.terminate()); curWorkers = [];
    $('#opt-run').disabled = false; $('#opt-stop').hidden = true; $('#opt-bar').hidden = true;
    $('#opt-status').textContent = msg || '계산을 중지했습니다.';
  }
  $('#opt-stop').addEventListener('click', () => stopOpt());
  $('#opt-run').addEventListener('click', runOpt);
  $('#opt-stale-x').addEventListener('click', () => { $('#opt-stale').hidden = true; });
  $('#o-must').addEventListener('change', () => { st.must = $('#o-must').checked; buildPkg(); save(); if (OPT) $('#opt-stale').hidden = false; });

  function workerURL() {
    const s = document.getElementById('wsrc');
    if (s) return URL.createObjectURL(new Blob([s.textContent], { type: 'text/javascript' }));
    return 'worker.js';
  }

  function runOpt() {
    if (!M) { $('#opt-status').textContent = '입력을 먼저 확인하세요.'; return; }
    const rank = E.rankPackages(M, st, true, eligible);
    const cand = rank.map((x) => x.j), forced = forcedList();
    const snap = JSON.parse(JSON.stringify(st));
    const mm = E.buildModel(snap, D), op = E.optSetup(mm, cand, snap, true, forced), total = op.total;
    const id = ++optRun;
    const btn = $('#opt-run'), bar = $('#opt-bar'), fill = $('i', bar), status = $('#opt-status');
    btn.disabled = true; $('#opt-stop').hidden = false; bar.hidden = false; fill.style.width = '0';
    $('#opt-stale').hidden = true;
    const t0 = performance.now();
    let done = 0;
    const finish = (list) => {
      if (id !== optRun) return;
      list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const par = [];
      let bd = 1e9;
      list.forEach((r) => { if (r[1] < bd) { par.push(r); bd = r[1]; } });
      btn.disabled = false; $('#opt-stop').hidden = true; bar.hidden = true;
      status.textContent = '계산 완료 · ' + ((performance.now() - t0) / 1000).toFixed(0) + '초 · ' + total.toLocaleString('ko-KR') + '가지';
      showOpt(par, cand, snap, forced);
    };
    const prog = (n) => { done += n; fill.style.width = Math.min(100, (done / total) * 100) + '%'; status.textContent = '계산 중… ' + Math.min(100, Math.round((done / total) * 100)) + '%'; };
    let workers = [];
    const inline = () => {
      workers.forEach((w) => w.terminate()); workers = []; curWorkers = [];
      done = 0;
      const m = E.buildModel(snap, D), o2 = E.optSetup(m, cand, snap, true, forced), use = new Array(m.Pk.length).fill(false), R = [];
      let i = 0;
      (function step() {
        if (id !== optRun) return;
        const end = performance.now() + 40;
        let c = 0;
        while (i < total && performance.now() < end) {
          o2.apply(i, use);
          const r = E.simulate(m, use, false);
          if (r.days < 9999) R.push([r.bill, r.days, i]);
          i++; c++;
        }
        prog(c);
        if (i < total) setTimeout(step, 0); else finish(R);
      })();
    };
    const nw = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
    try {
      const url = workerURL(), results = [];
      let finished = 0;
      for (let w = 0; w < nw; w++) {
        const wk = new Worker(url);
        workers.push(wk); curWorkers.push(wk);
        wk.onmessage = (e) => {
          if (id !== optRun) { wk.terminate(); return; }
          if (e.data.type === 'progress') prog(e.data.n);
          else {
            results.push(...e.data.pareto);
            wk.terminate();
            if (++finished === nw) finish(results);
          }
        };
        wk.onerror = () => { if (id === optRun && workers.length) inline(); };
        wk.postMessage({ inp: snap, cand, w, nw, useSlots: true, forced });
      }
    } catch (err) { inline(); }
  }

  /** 직전 점 대비 1일을 줄이는 데 드는 추가 비용(원) */
  function costPerDay(par, i) {
    const sn = OPT && OPT.snap, lv = sn ? sn.T - sn.S0 : 0;
    return lv > 0 ? par[i][0] / lv : null;
  }
  function hullSet(par) {
    const good = par.map(() => false), h = [];
    par.forEach((p, i) => {
      while (h.length >= 2) {
        const o = par[h[h.length - 2]], q = par[h[h.length - 1]];
        if ((q[0] - o[0]) * (p[1] - o[1]) - (q[1] - o[1]) * (p[0] - o[0]) <= 0) h.pop(); else break;
      }
      h.push(i);
    });
    h.forEach((i) => { if (i > 0) good[i] = true; });
    return good;
  }

  function showOpt(par, cand, snap, forced) {
    if (!par.length) {
      OPT = null;
      $('#ch-opt').innerHTML = ''; $('#t-pareto').innerHTML = '';
      $('#opt-pick').textContent = '1500일 안에 목표에 도달하는 조합이 없습니다.';
      return;
    }
    const mm = E.buildModel(snap, D);
    OPT = { par, cand, snap, forced, sel: -1, op: E.optSetup(mm, cand, snap, true, forced), good: hullSet(par) };
    OPT.dd = (d) => { const t = new Date(M.startMs + (d - 1) * 86400000); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); };
    $('#opt-pick').textContent = '곡선의 점이나 목록의 행을 눌러 패키지 조합을 선택하세요.';
    $('#g-sum').textContent = '· 효율 구간 ' + OPT.good.filter(Boolean).length + '개 / 전체 ' + par.length + '개';
    renderPareto();
    drawOpt();
  }

  function renderPareto() {
    const par = OPT.par, good = OPT.good;
    let h = '<thead><tr><th>총 과금</th><th>일수</th><th>도달 날짜</th><th title="총 과금액 ÷ (목표 − 현재 싱크로 Lv.)">1Lv.당 비용</th></tr></thead><tbody>';
    const only = $('#o-good') && $('#o-good').checked;
    par.forEach((r, i) => {
      if (only && !good[i]) return;
      const c = costPerDay(par, i);
      h += '<tr class="click' + (good[i] ? ' good' : '') + (i === OPT.sel ? ' sel' : '') + '" data-i="' + i + '"><td>' + won(r[0]) + '</td><td>' + r[1] + '일</td><td>' + OPT.dd(r[1]) + '</td><td>' + (c === null ? '-' : won(c)) + '</td></tr>';
    });
    $('#t-pareto').innerHTML = h + '</tbody>';
  }

  function drawOpt() {
    const par = OPT.par;
    chart($('#ch-opt'), {
      label: '비용-일수 곡선', xl: '총 과금(만원)', xf: (v) => fmt(v), yf: (v) => v + '일',
      series: [{ name: '최적 곡선', color: 'var(--c1)', step: true, dots: true, sel: OPT.sel, selColor: OPT.good[OPT.sel] ? '#22e070' : 'var(--c1)', selArrow: true, dotColors: OPT.good.map((g) => (g ? 'var(--c3)' : null)), pts: par.map((p) => [p[0] / 10000, p[1]]) }],
      tip: (k) => won(par[k][0]) + ' · ' + par[k][1] + '일' + (costPerDay(par, k) !== null ? '<br>1Lv.당 ' + won(costPerDay(par, k)) : '') + (OPT.good[k] ? ' · 효율 구간' : ''),
      onPick: (k) => selectOpt(k),
    });
  }

  /** 곡선/목록에서 조합을 고르면 패키지 설정에 적용 */
  function selectOpt(i) {
    if (!OPT) return;
    OPT.sel = i;
    const r = OPT.par[i], list = OPT.op.decode(r[2]);
    const useNow = new Array(st.pk.length).fill(false);
    list.forEach((x) => { useNow[x.j] = true; if (x.k >= 0) st.pk[x.j].sel = RES[x.k]; });
    st.pk.forEach((p, j) => (p.use = useNow[j]));
    buildPkg();
    onChange('apply');
    renderPareto();
    drawOpt();
    $('#opt-pick').innerHTML = '<b>선택: ' + won(r[0]) + ' · ' + r[1] + '일 (' + OPT.dd(r[1]) + ' 도달)</b><br><span class="muted">' +
      (list.length ? list.map((x) => esc(st.pk[x.j].name) + (x.k >= 0 ? ' [' + RES[x.k] + ']' : '') + (x.forced ? ' [필수]' : '')).join(' · ') : '구매 없음 (일일 수급만)') + '</span>';
  }
  $('#o-good').checked = true;
  $('#o-good').addEventListener('change', () => { if (OPT) renderPareto(); });
  $('#t-pareto').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr) selectOpt(+tr.dataset.i);
  });

  /* ---------- 계산 규칙 ---------- */
  $('#rules').innerHTML = [
    '<h2>계산 규칙</h2>',
    '<div><h3>기본 흐름</h3><ul><li>시작 날짜를 1일차로 보고, 그날 구매한 일일 패키지와 기본 수급재화를 1일차부터 반영합니다.</li><li>매일 (당일 획득 재화 + 보관 상자를 당일 전초기지 Lv의 1h 값으로 환산한 값)으로 올릴 수 있는 싱크로 레벨을 구하고, 그 레벨까지 모자란 재화만큼만 상자를 엽니다. 남은 상자는 보관되어 전초기지 Lv이 오른 뒤 더 높은 가치로 쓰입니다.</li><li>어느 한 재화가 부족하면 가장 부족한 재화가 레벨업을 막습니다(코더·배데·크레딧 중 최소).</li><li>도달 판정은 해당일 종료 시점의 누적 지급량 ≥ 필요량입니다. 최대 1500일까지 계산합니다.</li></ul></div>',
    '<div><h3>패키지 구매</h3><ul><li>주간은 설정한 요일, 월간은 매월 N일, (기간)은 시작일부터 N일 간격, 월정액은 시작일부터 적용 일수마다 구매합니다(만료 다음 날 자동 재구매).</li><li>패키지가 주는 재화가 모두 목표에 도달하면 그 패키지는 더 구매하지 않습니다(과금 최소화).</li><li>재화선택형(커스텀 패키지, 월정액, 백업마스터)은 선택한 재화 하나에 기준h × 비율을 지급합니다. 비율은 코더 1 : 배데 1 : 크레딧 3으로 고정이고, 월정액 적용 일수도 30일로 고정입니다.</li><li>최대 구매 횟수를 넣으면 그 횟수까지만 구매합니다(월정액은 시작 횟수 기준).</li><li>패키지 탭의 나열 순서는 재화상자 대비 효율이며, 전체 재화 효율이 아닙니다. 자세한 사항은 <a href=\"https://docs.google.com/spreadsheets/d/1qUSwYnpDtWAD_aq_4L6dC6py2vM19WtLed2AGKSdIPk/edit?usp=sharing\" target=\"_blank\" rel=\"noopener noreferrer\">니케 과금 재화 효율표</a>를 확인하세요.</li></ul></div>',
    '<div><h3>전초기지 레벨 · 보스 클리어</h3><ul><li>예상 전투력 = 평균 유저 전투력표(싱크로 Lv별) × 1군 전투력 보정계수. 1군 전투력을 입력하면 현재 싱크로 기준으로 곡선 전체가 보정됩니다.</li><li>예상 전투력 ≥ 보스 판정 투력 × (1+투력차)이면 클리어로 봅니다. 보스 트라이는 매일 한다고 가정합니다.</li><li>전초기지 Lv = 1 + 내림((노말 클리어 스테이지 + 하드 클리어 스테이지) ÷ 5). 챕터는 모드별 순서대로만 열리므로 같은 모드에서 앞선 보스의 판정 투력 최댓값을 씁니다.</li><li>방지턱(하드 15~50장 보스)은 <a href="https://enikk.app/campaign" target="_blank" rel="noopener noreferrer">enikk</a> KR 최저 20위 평균 전투력 기준 보정계수를 반영합니다. 노말 방지턱은 하드 계수를 준용한 추정입니다.</li><li>전초기지 Lv이 오르면 다음 날부터 재화상자 가치와 일일 수급량이 늘어납니다.</li></ul></div>',
    '<div><h3>최적 조합 탐색</h3><ul><li>[패키지] 탭에서 체크한 패키지가 후보입니다. 스텝업5는 \'스텝업5 구매하나요?\'를 체크하면 모든 조합에 넣고 계산합니다.</li><li>월정액·커스텀1·커스텀2는 없음/코더/배데/크레딧 중 하나를 고르는 슬롯이라, 기본 13개 기준 조합은 65,536가지이며, 계산 조합이 50만가지를 넘으면 느려집니다. (최대 17개 권장, 비효율 패키지는 구매횟수 조절)</li><li>비용이 같으면 가장 빠른 조합, 비용이 늘어도 일수가 줄지 않는 조합은 제외해 곡선을 만듭니다.</li><li>효율 구간(초록색)은 돈을 더 쓸수록 1만원당 줄어드는 일수가 점점 줄어드는 지점만 남긴 것으로, 멈추기 좋은 후보입니다.</li></ul></div>',
    '<div class="warnsec"><h3>주의사항</h3><ul><li>200 싱크로 레벨 미만은 사용할 수 없습니다.</li><li>스테이지를 최대한 밀고 이용해주세요.</li><li>겜한분 기준: 지정한 투력컷에 보스를 잡고 빠르게 스테이지를 민다는 낙관적 추정입니다.</li><li>예상 전투력은 평균 유저 기준이며, ±6% 개인차가 존재합니다. 600레벨 이상은 표본이 적어 더 불확실합니다.</li><li class="wh">장비 강화에 소모되는 크레딧은 고려하지 않았습니다.</li><li class="wh">파견 리롤 X, 일반상점 쥬얼 구매 X 가정입니다.</li><li class="wh">이벤트 수급은 연평균 고정값이며 약간의 오차가 발생할 수 있습니다.</li><li class="wh">일반 스테이지 방지턱은 무시합니다. (효과 미미)</li><li class="wh">팝업 보상(레벨 달성, 타워 클리어)은 반영하지 못합니다.</li></ul></div>',
  ].join('');

  /* ---------- 데이터 탭 ---------- */
  let dsel = 'pwr';
  function dcell(v) {
    if (v === '' || v == null) return '';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('ko-KR') : v.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
    return esc(String(v));
  }
  function dtable(t, id) {
    let h = '<div class="tscroll tall"><table class="tbl compact"><thead><tr>' + t.head.map((x, i) => '<th' + (i === 0 ? '' : '') + '>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>';
    t.rows.forEach((r) => { h += '<tr' + (t.hl && typeof r[0] === 'number' && (r[0] - 1) % 20 === 0 ? ' class="hl"' : '') + '>' + r.map((v, i) => '<td' + (typeof v === 'string' && v !== '' && isNaN(parseFloat(v.replace(/,/g, ''))) ? ' class="l"' : '') + '>' + dcell(v) + '</td>').join('') + '</tr>'; });
    return h + '</tbody></table></div><p class="muted">' + t.rows.length.toLocaleString('ko-KR') + '행</p>';
  }
  function renderData() {
    const T = self.TABLES, b = $('#d-body');
    $$('#dtabs button').forEach((x) => x.classList.toggle('on', x.dataset.d === dsel));
    if (!T) { b.innerHTML = '<p class="muted">데이터가 없습니다.</p>'; return; }
    let h = '';
    if (dsel === 'pwr') {
      const ord = [0, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3], P = T.pwr;
      const rr = (v) => (typeof v === 'number' ? Math.round(v) : v);
      P.rows.forEach((r) => { [1, 3, 4, 6, 7, 8, 9, 10].forEach((i) => { r[i] = rr(r[i]); }); if (typeof r[5] === 'number' && r[5] < 1) r[5] = (r[5] * 100).toFixed(2) + '%'; });
      h = '<p class="note">싱크로 레벨별 예상 전투력(평균 유저 기준)과 투력차별 환산값입니다. 오른쪽 끝 3열은 산출에 쓰인 중간값이며, 연노랑 행은 20n+1 레벨입니다.</p>' + dtable({ hl: true, head: ord.map((i) => P.head[i]), rows: P.rows.filter((r) => r[0] >= 200).map((r) => ord.map((i) => r[i])) });
    }
    else if (dsel === 'user') h = '<p class="note">20n+1 점프 직전→직후 실제 유저 기록과 선형 회귀 결과입니다. 사용=0인 기록은 회귀에서 제외됩니다.</p>' + dtable(T.user.main) + '<h3 class="mt">선형 회귀</h3>' + dtable(T.user.reg) + '<h3 class="mt">k · C0 분포 <span class="muted">(사용 기록 vs 제외 기록)</span></h3><div class="charts2"><div><div class="muted">k (스탯 몫 ÷ 공격력)</div><div id="ch-uk" class="chart"></div></div><div><div class="muted">C0 (전투력 − 스탯 몫)</div><div id="ch-uc" class="chart"></div></div></div>';
    else if (dsel === 'bump') h = '<p class="note">하드 챕터 보스 방지턱 데이터(KR 최저 클리어 20위 기록 기준). 49·50챕터는 개방 직후라 신뢰도가 낮습니다.</p><h3>챕터 요약</h3>' + dtable(T.bump.sum) + '<h3 class="mt">스테이지별 추정</h3>' + dtable(T.bump.stage) + '<h3 class="mt">원본 기록</h3>' + dtable(T.bump.raw);
    else if (dsel === 'lvl') h = '<p class="note">싱크로 레벨구간별 필요 재화량과, 전초기지 Lv별 생산량으로 환산한 시간입니다.</p>' + dtable(T.lvl);
    else h = '<p class="note">전초기지 레벨별 1분(M)·1시간(H) 생산 재화량입니다.</p>' + dtable(T.out);
    b.innerHTML = h;
    if (dsel === 'user') {
      const rows = T.user.main.rows.filter((r) => typeof r[0] === 'number');
      const mk = (ci, name) => {
        const ok = rows.filter((r) => typeof r[ci] === 'number' && r[ci] > 0), u = ok.filter((r) => r[7] === 1).map((r) => [r[0], r[ci]]), x = ok.filter((r) => r[7] !== 1).map((r) => [r[0], r[ci]]);
        const ser = [{ name: '사용', color: 'var(--c1)', pts: u, dots: true, noline: true }];
        if (x.length) ser.push({ name: '제외', color: 'var(--muted)', pts: x, dots: true, noline: true });
        return { label: name, xl: '점프 직전 Lv', series: ser, tip: (i) => { const b = u.length >= x.length ? u : x, p = b[i]; return '직전 Lv ' + p[0] + '<br>' + name + ' ' + fmt(p[1]); }, yf: (v) => (v >= 10000 ? fmt(v / 10000) + '만' : String(v)) };
      };
      chart($('#ch-uk'), mk(6, 'k'));
      chart($('#ch-uc'), mk(5, 'C0'));
    }
  }
  $('#dtabs').addEventListener('click', (e) => { const x = e.target.closest('button[data-d]'); if (x) { dsel = x.dataset.d; renderData(); } });

  /* ---------- 이미지 · 엑셀 저장 / 불러오기 ---------- */
  let dlP = null;
  function getDl() {
    if (!dlP) dlP = (window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null)).catch(() => null);
    return dlP;
  }
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 3000);
  }
  async function saveBlob(blob, filename) {
    const dl = await getDl();
    if (!dl) { // 일반 웹(GitHub Pages 등): 브라우저 기본 다운로드
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        return true;
      } catch (e0) { return false; }
    }
    try { await dl.save({ filename: filename, data: blob }); return true; }
    catch (e1) {
      try { await dl.save({ filename: filename, data: await blob.arrayBuffer() }); return true; } catch (e2) { return 'declined'; }
    }
  }
  function resolveSvg(orig, clone) {
    const os = orig.querySelectorAll('svg, svg *'), cs = clone.querySelectorAll('svg, svg *');
    os.forEach((el, i) => {
      const c = cs[i]; if (!c) return;
      const cmp = getComputedStyle(el);
      ['fill', 'stroke', 'stroke-width', 'opacity'].forEach((p) => { if (el.tagName !== 'svg') c.style.setProperty(p, cmp.getPropertyValue(p)); });
      if (el.tagName === 'text') { c.style.setProperty('font-size', cmp.fontSize); c.style.setProperty('font-family', cmp.fontFamily); }
    });
  }
  function fixColors(orig, clone) {
    const os = orig.querySelectorAll('*'), cs = clone.querySelectorAll('*');
    const cv = (s) => { const m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(s); return m ? 'rgba(' + Math.round(m[1] * 255) + ',' + Math.round(m[2] * 255) + ',' + Math.round(m[3] * 255) + ',' + (m[4] == null ? 1 : m[4]) + ')' : null; };
    os.forEach((el, i) => {
      const c = cs[i]; if (!c || el.closest('svg')) return;
      const cmp = getComputedStyle(el);
      ['backgroundColor', 'borderTopColor', 'borderBottomColor', 'color'].forEach((p) => {
        const v = cmp[p]; if (v && v.indexOf('color(') === 0) { const r = cv(v); if (r) c.style[p] = r; }
      });
    });
  }
  function showImg(url, msg) {
    $('#img-out').src = url; $('#img-msg').textContent = msg; $('#img-ov').hidden = false;
  }
  $('#img-close').addEventListener('click', () => { $('#img-ov').hidden = true; });
  async function saveImage(root, filename, btn, pad, withCode) {
    const old = btn.textContent;
    if (typeof html2canvas !== 'function') { btn.textContent = '이미지 도구 로드 실패'; setTimeout(() => (btn.textContent = old), 2500); return; }
    btn.disabled = true; btn.textContent = '만드는 중…';
    root.classList.add('cap');
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      await new Promise((r) => setTimeout(r, 60));
      const cv = await html2canvas(root, { backgroundColor: bg, scale: 2, useCORS: true, logging: false, windowWidth: Math.max(root.scrollWidth, 1000), onclone: (doc) => { const cr = doc.querySelector('#' + root.id); resolveSvg(root, cr); fixColors(root, cr); } });
      root.classList.remove('cap');
      let out = cv, code = null, qm = null;
      if (withCode) {
        try { code = await encodeSettings(); if ($('#o-qr').checked) { qm = qrcode(0, 'L'); qm.addData(SITE + '#' + code); qm.make(); } } catch (e) { qm = null; }
      }
      if (pad || qm) {
        const pp = (pad || 0) * 2, below = withCode === 'below';
        const n = qm ? qm.getModuleCount() : 0, cell = n > 60 ? 2 : 3, q = 2, qb = qm ? (n + q * 2) * cell : 0, gap = 32, fh = qm && below ? qb + gap * 1.5 : 0;
        out = document.createElement('canvas'); out.width = cv.width + pp * 2; out.height = cv.height + pp * 2 + fh;
        const cx = out.getContext('2d'); cx.fillStyle = bg; cx.fillRect(0, 0, out.width, out.height); cx.drawImage(cv, pp, pp);
        if (qm) {
          const qx = out.width - qb - gap, qy = out.height - qb - gap;
          cx.fillStyle = '#fff'; cx.fillRect(qx, qy, qb, qb); cx.fillStyle = '#000';
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qm.isDark(r, c)) cx.fillRect(qx + (c + q) * cell, qy + (r + q) * cell, cell, cell);
        }
      }
      let blob = await new Promise((res) => out.toBlob(res, 'image/png'));
      if (code && blob) blob = new Blob([pngAddText(await blob.arrayBuffer(), 'dorosync', code)], { type: 'image/png' });
      const r = await saveBlob(blob, filename);
      if (r === true) toast('이미지를 저장했습니다.');
      else if (r === 'declined') toast('저장이 취소되었습니다.');
      else showImg(URL.createObjectURL(blob), '이 환경에서는 파일 저장이 막혀 있습니다. 이미지를 길게 누르거나 우클릭해서 저장하세요.');
    } catch (e) { console.error('img', e && e.message); toast('이미지를 만들지 못했습니다.'); }
    root.classList.remove('cap');
    btn.textContent = old; btn.disabled = false;
  }
  $('#btn-save-res').addEventListener('click', () => saveImage($('#result-card'), 'DOROSYNC_결과.png', $('#btn-save-res'), 16, 'below'));
  $('#btn-save').addEventListener('click', () => saveImage($('#tab-main'), 'DOROSYNC_계산기.png', $('#btn-save'), 0, true));
  $('#btn-boss-img').addEventListener('click', () => saveImage($('#tab-boss'), 'DOROSYNC_보스잡는날.png', $('#btn-boss-img')));

  /* ---------- 설정 코드 (이미지 내장 / QR) ---------- */
  const SITE = 'https://levelinfinikke.github.io/DOROSYNC/';
  const codeOf = (t) => { const m = /(DS[01]\.[A-Za-z0-9_-]+)\s*$/.exec(String(t)); return m ? m[1] : String(t); };
  const b64u = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (t) => { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const a = atob(t), u = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) u[i] = a.charCodeAt(i); return u; };
  async function pipeBytes(u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); }
  function snapshot() {
    const cfg = Object.assign({}, st.cfg); delete cfg.mlen; delete cfg.ratio;
    const o = { v: 1, a: [st.S0, st.T, st.L0, st.sortie, st.start, st.G, st.power, st.must ? 1 : 0], b: st.boxes, l: st.loose, c: cfg, p: st.pk.map((p) => [p.opt ? 1 : 0, p.use ? 1 : 0, p.max > 0 ? p.max : 0, p.sel || '']) };
    if (JSON.stringify(st.inc) !== JSON.stringify(D.inc)) o.i = st.inc;
    return o;
  }
  async function encodeSettings() {
    const u8 = new TextEncoder().encode(JSON.stringify(snapshot()));
    if (typeof CompressionStream === 'function') return 'DS1.' + b64u(await pipeBytes(u8, new CompressionStream('deflate-raw')));
    return 'DS0.' + b64u(u8);
  }
  async function decodeSettings(code) {
    const m = /^DS([01])\.([A-Za-z0-9_-]+)$/.exec(String(code).trim());
    if (!m) throw new Error('code');
    let u8 = unb64u(m[2]);
    if (m[1] === '1') u8 = await pipeBytes(u8, new DecompressionStream('deflate-raw'));
    const o = JSON.parse(new TextDecoder().decode(u8));
    if (!(o && o.v === 1 && Array.isArray(o.a) && o.a.length === 8 && Array.isArray(o.p) && o.p.length === D.pk.length && Array.isArray(o.b) && Array.isArray(o.l) && (!o.i || o.i.length === D.inc.length))) throw new Error('shape');
    return o;
  }
  function applyState(o) {
    const d = defaults(), a = o.a;
    d.S0 = a[0]; d.T = a[1]; d.L0 = a[2]; d.sortie = a[3]; d.start = a[4]; d.G = a[5]; d.power = a[6]; d.must = !!a[7];
    d.boxes = o.b; d.loose = o.l; Object.assign(d.cfg, o.c || {});
    if (o.i) d.inc = o.i;
    d.pk.forEach((p, j) => { const x = o.p[j]; p.opt = !!x[0]; p.use = !!x[1]; p.max = +x[2] || 0; if (x[3]) p.sel = x[3]; });
    st = d; st.cfg = Object.assign({}, st.cfg, { mlen: 30, ratio: [1, 1, 3] });
    OPT = null; save(); init(); $('#opt-stale').hidden = true;
  }
  const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRCT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function pngAddText(buf, key, text) {
    const u = new Uint8Array(buf), data = new TextEncoder().encode(key + '\0' + text);
    const chunk = new Uint8Array(12 + data.length), dv = new DataView(chunk.buffer), tag = [116, 69, 88, 116];
    dv.setUint32(0, data.length); chunk.set(tag, 4); chunk.set(data, 8);
    const ci = new Uint8Array(4 + data.length); ci.set(tag, 0); ci.set(data, 4);
    dv.setUint32(8 + data.length, crc32(ci));
    const at = 33, out = new Uint8Array(u.length + chunk.length);
    out.set(u.subarray(0, at)); out.set(chunk, at); out.set(u.subarray(at), at + chunk.length);
    return out;
  }
  function pngReadText(buf, key) {
    const u = new Uint8Array(buf);
    if (u[0] !== 0x89 || u[1] !== 0x50) return null;
    const dv = new DataView(buf); let p = 8;
    while (p + 8 <= u.length) {
      const len = dv.getUint32(p), type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]);
      if (type === 'tEXt') { const t = new TextDecoder('latin1').decode(u.subarray(p + 8, p + 8 + len)), i = t.indexOf('\0'); if (t.slice(0, i) === key) return t.slice(i + 1); }
      if (type === 'IDAT' || type === 'IEND') break;
      p += 12 + len;
    }
    return null;
  }
  async function settingsFromImage(file) {
    const buf = await file.arrayBuffer();
    const meta = pngReadText(buf, 'dorosync');
    if (meta) { try { return await decodeSettings(meta); } catch (e) { /* QR로 재시도 */ } }
    if (typeof jsQR !== 'function') throw new Error('lib');
    const bmp = await createImageBitmap(new Blob([buf]));
    for (const [fx, fy, fw, fh] of [[0, 0, 1, 1], [0.35, 0.6, 0.65, 0.4], [0.6, 0.75, 0.4, 0.25]]) {
      const sx = Math.floor(bmp.width * fx), sy = Math.floor(bmp.height * fy), w = Math.max(1, Math.floor(bmp.width * fw)), h = Math.max(1, Math.floor(bmp.height * fh));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(bmp, sx, sy, w, h, 0, 0, w, h);
      const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
      if (r && r.data) { try { return await decodeSettings(codeOf(r.data)); } catch (e) { /* 다음 영역 */ } }
    }
    throw new Error('none');
  }
  $('#img-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { applyState(await settingsFromImage(f)); toast('이미지에서 설정을 불러왔습니다.'); }
    catch (err) { toast(err && err.message === 'lib' ? 'QR 읽기 도구를 불러오지 못했습니다.' : 'DOROSYNC에서 저장한 이미지가 아니거나 코드를 읽지 못했습니다.', 4000); }
  });

  /* ---------- 탭 ---------- */
  function showTab(name) {
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('.tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + name));
    if (name === 'daily') renderDaily();
    if (name === 'boss') renderBoss();
    if (name === 'data') renderData();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ }
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });
  let rsT = 0;
  $('#btn-reset').addEventListener('click', () => {
    const b = $('#btn-reset');
    if (!rsT) { b.textContent = '한 번 더 누르면 초기화'; rsT = setTimeout(() => { rsT = 0; b.textContent = '초기화'; }, 3000); return; }
    clearTimeout(rsT); rsT = 0; b.textContent = '초기화';
    Object.assign(st, { S0: 200, T: 600, L0: '', sortie: 3, power: 0, start: todayStr(), G: -0.2, must: false, boxes: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], loose: [0, 0, 0] });
    save(); init();
    toast('유저 정보를 초기화했습니다.');
  });

  function init() {
    $('#o-must').checked = !!st.must;
    buildUser(); buildStock(); buildCfg(); buildPkg(); buildInc();
    recalc();
  }
  init();
  const h0 = (location.hash || '').slice(1);
  if (/^DS[01]\./.test(h0)) {
    decodeSettings(h0).then((o) => { applyState(o); toast('QR 설정을 불러왔습니다.'); }).catch(() => toast('QR 설정 코드를 읽지 못했습니다.', 4000))
      .finally(() => { try { history.replaceState(null, '', location.pathname + location.search + '#main'); } catch (e) { /* ignore */ } });
  } else if (h0 && $('#tab-' + h0)) showTab(h0);
})();
