/* DOROSYNC DORO DROP(플링코) (관리자 전용 · 미공개)
   싱크칩(1)·실버칩(5)·골드칩(10)을 떨어뜨려 바닥 칸의 배수만큼 받음 · 위험도 3단계 · 12줄 고정
   환수율 약 95% · 양 끝(최고 배수) 칸은 DORO칩을 반드시 지급(환수율과 별도, 건 값 1,000당 1개꼴)
   배포 사이트: 서버(/raid a=plinko)가 결과를 정하고 화면은 그 칸으로 떨어지는 연출만 함 · 미리보기: 이 기기에서 계산 */
(() => {
  'use strict';
  const PROD = /github\.io$/.test(location.hostname), RTP = 0.95, doroOf = (val, rows) => Math.max(1, Math.round(val * Math.pow(2, rows - 1) / 1000)); /* 끝 칸: DORO칩을 반드시 지급. 건 값 1,000당 1개꼴이 되도록(최소 1개) */
  const RISK = ['LOW', 'MEDIUM', 'HIGH'], CH = [['b', '싱크칩', 1], ['s', '실버칩', 5], ['g', '골드칩', 10]], CNT = [1, 10, 50];
  /* 배수표(서버와 같은 식): 가운데가 가장 낮고 바깥으로 갈수록 커짐. 환수율에 맞춰 전체를 맞춘 뒤 보기 좋은 수로 반올림 */
  const table = (rows, risk) => { const m0 = [0.5, 0.35, 0.2][risk], c = [1.42, 1.85, 2.7][risk], P = [], raw = []; let b = 1, sum = 0;
    for (let k = 0; k <= rows; k++) { P.push(b / Math.pow(2, rows)); b = b * (rows - k) / (k + 1); raw.push(m0 * Math.pow(c, Math.abs(k - rows / 2))); sum += P[k] * raw[k]; }
    const f = RTP / sum; return raw.map((v) => { v *= f; return v < 10 ? Math.max(0.1, Math.round(v * 10) / 10) : v < 100 ? Math.round(v) : Math.round(v / 10) * 10; }); };
  const $ = (s, r) => (r || document).querySelector(s), fmt = (n) => Math.round(n).toLocaleString('ko-KR'), chip = (k, px) => (window.doroChipSvg ? window.doroChipSvg(k, px, false, true) : '');
  let cutN = 0, cutT = 0, root = null, cv = null, c = null, S = { rows: 12, risk: 1, ch: 0, n: 1 }, T = [], balls = [], hits = [], pops = [], raf = 0, pend = 0, pendR = 0, busy = false, AC = null, W = 520, H = 600; const IMG = {};
  try { Object.assign(S, JSON.parse(localStorage.getItem('dorosync-plinko') || '{}')); } catch (e) { /* 무시 */ } S.rows = 12; /* 12줄 고정 */
  const save = () => { try { localStorage.setItem('dorosync-plinko', JSON.stringify(S)); } catch (e) { /* 무시 */ } };
  const tick = (f, v, d) => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* 무시 */ } };
  const colOf = (m) => (m >= 100 ? '#ff2f6d' : m >= 10 ? '#ff5a3d' : m >= 2 ? '#ff9a24' : m >= 1 ? '#f5c63a' : '#7b8494');
  /* ---------- 판 ---------- */
  const geo = () => { const dx = W / (S.rows + 3), top = 64, bot = H - 58, dy = (bot - top) / S.rows; return { dx, top, dy, pr: Math.max(2.5, dx * 0.11), br: Math.max(6, Math.min(13, dx * 0.3)), by: bot + 6 }; };
  const pegX = (r, j, g) => W / 2 + (j - (r + 2) / 2) * g.dx;
  function draw(now) {
    raf = 0; if (!cv || !cv.isConnected) return; const g = geo(), d = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); } c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    for (let r = 0; r < S.rows; r++) for (let j = 0; j < r + 3; j++) { const x = pegX(r, j, g), y = g.top + r * g.dy, h = hits.find((q) => q.r === r && q.j === j), a = h ? Math.max(0, 1 - (now - h.t) / 260) : 0; if (a > 0) { c.beginPath(); c.arc(x, y, g.pr + 7 * a, 0, 6.283); c.fillStyle = 'rgba(255,220,120,' + (0.5 * a) + ')'; c.fill(); }
      const gr = c.createRadialGradient(x - g.pr * 0.4, y - g.pr * 0.4, 0, x, y, g.pr); gr.addColorStop(0, '#fff'); gr.addColorStop(1, a > 0 ? '#ffd24a' : '#8f9bb2'); c.beginPath(); c.arc(x, y, g.pr, 0, 6.283); c.fillStyle = gr; c.fill(); }
    hits = hits.filter((q) => now - q.t < 260);
    /* 바닥 칸 */
    const bw = g.dx - 3, n = S.rows; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let k = 0; k <= n; k++) { const x = W / 2 + (k - n / 2) * g.dx, p = pops.find((q) => q.k === k), a = p ? Math.max(0, 1 - (now - p.t) / 380) : 0, y = g.by + a * 7, m = T[k], edge = k === 0 || k === n;
      c.fillStyle = colOf(m); c.beginPath(); if (c.roundRect) c.roundRect(x - bw / 2, y, bw, 30, 5); else c.rect(x - bw / 2, y, bw, 30); c.fill(); if (a > 0) { c.fillStyle = 'rgba(255,255,255,' + (0.6 * a) + ')'; c.fill(); }
      c.fillStyle = m >= 1 ? '#14161c' : '#fff'; c.font = '900 ' + Math.max(8, Math.min(13, bw * 0.36)) + 'px "Arial Black",Arial,sans-serif'; c.fillText((m >= 100 ? m : m) + (bw > 30 ? 'x' : ''), x, y + (edge && IMG.r ? 10 : 15));
      if (edge && IMG.r && IMG.r.complete) c.drawImage(IMG.r, x - 6, y + 16, 12, 12); }
    pops = pops.filter((q) => now - q.t < 380);
    /* 칩 */
    balls.forEach((b) => { const el = now - b.t0; if (el < 0) return; const SEG = b.seg, i = Math.min(b.pts.length - 2, Math.floor(el / SEG)), t = Math.min(1, (el - i * SEG) / SEG), A = b.pts[i], B = b.pts[i + 1];
      if (i !== b.li) { b.li = i; if (i > 0 && i <= S.rows) { hits.push({ r: i - 1, j: b.pj[i - 1], t: now }); tick(900 + i * 55 + Math.random() * 60, 0.03, 0.05); } }
      const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t * t - (i > 0 ? g.dy * 0.34 * Math.sin(Math.PI * t) * (1 - t) : 0), im = IMG[b.ch];
      c.save(); c.translate(x, y); c.rotate(b.rot + el * 0.006 * b.sp); c.scale(1, 0.82 + 0.18 * Math.cos(el * 0.012)); if (im && im.complete) c.drawImage(im, -g.br, -g.br, g.br * 2, g.br * 2); else { c.beginPath(); c.arc(0, 0, g.br, 0, 6.283); c.fillStyle = '#f5b301'; c.fill(); } c.restore();
      if (el >= SEG * (b.pts.length - 1)) { b.done = true; pops.push({ k: b.k, t: now }); b.fx = B[0]; b.fy = g.by + 15; land(b); } });
    balls = balls.filter((b) => !b.done);
    if (balls.length || hits.length || pops.length) raf = requestAnimationFrame(draw);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function land(b) {
    const m = T[b.k], cr = cv.getBoundingClientRect(), sx = cr.left + b.fx / W * cr.width, sy = cr.top + b.fy / H * cr.height, from = { getBoundingClientRect: () => ({ left: sx - 8, top: sy - 8, width: 16, height: 16 }) }, sp = root.querySelectorAll('.pl-bal span');
    const settle = () => { pend -= b.pay; pendR -= b.r; ui(); }; let ms = 0; /* 칸에서 얻은 칩이 잔고로 빨려 들어간 뒤 잔고가 오름 */
    try { if (b.pay > 0 && sp[0] && window.doroChipFly) ms = b.ch === 'b' ? (window.doroChipFly(from, sp[0], Math.min(b.pay, 60), { size: 16, k: b.pay >= 10 ? 'g' : 'b' }) || 0) : (window.doroChipFly(from, sp[0], 1, { size: 20, k: b.ch, single: 1 }) || 0); /* 실버·골드 베팅: 분열 없이 그 칩 하나가 잔고로(렉 방지) */ if (b.r > 0 && sp[1] && window.doroChipFly) ms = Math.max(ms, window.doroChipFly(from, sp[1], Math.min(b.r, 12), { size: 20, k: 'r' }) || 0); } catch (e) { /* 무시 */ }
    setTimeout(settle, ms ? Math.min(1500, ms) : 0); tick(m >= 10 ? 1320 : m >= 1 ? 880 : 300, m >= 1 ? 0.09 : 0.04, m >= 10 ? 0.5 : 0.15); if (m >= 10) setTimeout(() => tick(1760, 0.08, 0.5), 90);
    const log = $('.pl-log', root); if (log) { const e = document.createElement('span'); e.style.background = colOf(m); e.style.color = m >= 1 ? '#14161c' : '#fff'; e.textContent = m + 'x'; log.prepend(e); while (log.children.length > 14) log.lastChild.remove(); }
    if (b.r > 0) { cutN += b.r; clearTimeout(cutT); cutT = setTimeout(() => { const n2 = cutN; cutN = 0; if (window.doroCutin) window.doroCutin(n2); }, 350); } /* 같은 묶음의 DORO칩은 한 번에 */
    else if (m >= 10) { const w = $('.pl-win', root); if (w) { w.innerHTML = m + 'x · ' + chip('b', 18) + ' +' + fmt(b.pay); w.classList.remove('on'); void w.offsetWidth; w.classList.add('on'); } }
  }
  /* ---------- 결과 ---------- */
  const roll = (rows, val, tb) => { let k = 0; const bits = []; for (let i = 0; i < rows; i++) { const r = Math.random() < 0.5 ? 1 : 0; bits.push(r); k += r; } const x = val * tb[k], pay = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0); /* 소수 부분은 그 확률로 1개 */
    const dr = k === 0 || k === rows ? doroOf(val, rows) : 0; return [k, pay, dr, bits]; };
  async function drop() {
    if (busy) return; const ch = CH[S.ch], cost = ch[2] * S.n, msg = $('.pl-msg', root); msg.textContent = '';
    if (window.doroChips.total() - 0 < cost) { msg.textContent = '싱크칩이 부족합니다.'; return; }
    busy = true; ui(); let res;
    try {
      if (PROD) { const j = await window.doroRaid.api('plinko', { rows: S.rows, risk: S.risk, bet: ch[0], n: S.n }); res = j.balls; const win = res.reduce((a, b) => a + b[1], 0), wr = res.reduce((a, b) => a + b[2], 0); pend += win; pendR += wr; window.doroChips.sync(j.chips); }
      else { if (!window.doroChips.spend(cost)) throw new Error('chips'); res = []; for (let i = 0; i < S.n; i++) res.push(roll(S.rows, ch[2], T)); const win = res.reduce((a, b) => a + b[1], 0), wr = res.reduce((a, b) => a + b[2], 0); pend += win; pendR += wr; const add = {}; if (win) add.b = win; if (wr) add.r = wr; if (win || wr) window.doroChips.add(add, 'cap'); }
    } catch (e) { busy = false; ui(); msg.textContent = ({ chips: '싱크칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' })[e && e.message] || '서버와 연결하지 못했습니다. (' + ((e && e.message) || e) + ')'; return; }
    const g = geo(), now = performance.now(), gap = S.n > 10 ? 70 : 130;
    res.forEach((r, i) => { const k = r[0]; let bits = r[3]; if (!bits) { bits = []; for (let q = 0; q < S.rows; q++) bits.push(q < k ? 1 : 0); for (let q = bits.length - 1; q > 0; q--) { const z = Math.floor(Math.random() * (q + 1)), t = bits[q]; bits[q] = bits[z]; bits[z] = t; } } /* 서버가 정한 칸으로 가는 길을 무작위로 */
      const pts = [[W / 2 + (Math.random() * 2 - 1) * 4, 14]], pj = []; let off = 0, j = 1;
      for (let q = 0; q < S.rows; q++) { pts.push([W / 2 + off * g.dx, g.top + q * g.dy - g.pr - g.br]); pj.push(j); off += bits[q] ? 0.5 : -0.5; if (bits[q]) j++; }
      pts.push([W / 2 + off * g.dx, g.by + 2]);
      balls.push({ k, pay: r[1], r: r[2], ch: ch[0], pts, pj, t0: now + i * gap, seg: 150 + Math.random() * 14, li: -1, rot: Math.random() * 6, sp: Math.random() < 0.5 ? 1 : -1 }); });
    kick(); setTimeout(() => { busy = false; ui(); }, Math.min(900, 250 + S.n * 30));
  }
  /* ---------- 화면 ---------- */
  const CSS = `
.pl{display:grid;grid-template-columns:270px 1fr;gap:0;border-radius:16px;overflow:hidden;background:#0c1626;color:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;border:1px solid #1d3355}
.pl-side{background:linear-gradient(180deg,#14325c,#0d2343);padding:16px 14px;display:flex;flex-direction:column;gap:12px}
.pl-t{font-family:"Arial Black",Arial,sans-serif;font-style:italic;font-size:34px;line-height:.95;background:linear-gradient(180deg,#e8f6ff,#49b3ff 55%,#1367c9);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.45))}
.pl-t small{display:block;font-size:.62em;background:linear-gradient(180deg,#fff3b0,#ffb21c 55%,#c97700);-webkit-background-clip:text;background-clip:text;color:transparent}
.pl-g>span{display:block;font-size:12px;font-weight:800;color:#ffd24a;margin-bottom:4px}
.pl-seg{display:flex;flex-wrap:wrap;gap:4px}.pl-seg button{flex:1 0 auto;min-width:30px;border:0;border-radius:7px;padding:6px 6px;font:inherit;font-size:12.5px;font-weight:800;color:#dfe9f7;background:#0b1a30;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.pl-seg button.on{background:#ffb21c;color:#14161c;box-shadow:0 0 10px rgba(255,178,28,.5)}
.pl-bal{display:flex;gap:10px;background:#0b1a30;border-radius:10px;padding:8px 10px;font-weight:800}.pl-bal span{display:inline-flex;align-items:center;gap:5px}
.pl-go{border:0;border-radius:14px;padding:13px;font:inherit;font-family:"Arial Black","Pretendard",sans-serif;font-size:18px;font-weight:900;color:#14161c;cursor:pointer;background:linear-gradient(180deg,#ffe58a,#ffb21c 55%,#e08a00);box-shadow:0 5px 0 #8a5200,0 8px 16px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;gap:8px}
.pl-go:active{transform:translateY(4px);box-shadow:0 1px 0 #8a5200}.pl-go:disabled{filter:grayscale(.6);opacity:.7;cursor:default}.pl-go small{font-family:"Pretendard",sans-serif;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:3px}
.pl-msg{min-height:16px;font-size:12px;color:#ff9a8a;font-weight:700}
.pl-main{position:relative;background:radial-gradient(ellipse at 50% 30%,#1c4c8e,#0b2247 70%,#071630);padding:8px}
.pl-main canvas{display:block;width:100%;max-width:640px;height:auto;margin:0 auto}
.pl-log{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:3px}.pl-log span{font:900 11px "Arial Black",Arial,sans-serif;border-radius:5px;padding:2px 6px;text-align:center;min-width:38px;animation:plIn .25s}@keyframes plIn{from{transform:translateX(20px);opacity:0}}
.pl-win{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.5);opacity:0;pointer-events:none;white-space:nowrap;font:900 26px "Arial Black","Pretendard",sans-serif;color:#ffe58a;text-shadow:0 3px 0 #7a4a00,0 0 20px rgba(255,200,80,.8);display:flex;align-items:center;gap:6px}
.pl-win.on{animation:plWin 1.5s cubic-bezier(.2,1.5,.4,1) forwards}@keyframes plWin{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}30%,75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}
@media(max-width:760px){.pl{grid-template-columns:1fr}.pl-main{order:-1}.pl-t{font-size:24px}.pl-side{gap:9px}}
`;
  function ui() {
    if (!root) return; const o = window.doroChips.get(), ch = CH[S.ch];
    $('.pl-bal', root).innerHTML = '<span>' + chip('b', 18) + fmt(Math.max(0, window.doroChips.total() - pend)) + '</span><span>' + chip('r', 18) + fmt(Math.max(0, ((o && o.r) || 0) - pendR)) + '</span>';
    root.querySelectorAll('.pl-seg button').forEach((b) => b.classList.toggle('on', String(S[b.dataset.k]) === b.dataset.v));
    const go = $('.pl-go', root); go.disabled = busy; go.innerHTML = '떨어뜨리기 <small>' + chip('b', 14) + fmt(ch[2] * S.n) + '</small>';
  }
  function build() {
    const seg = (k, arr) => '<div class="pl-seg">' + arr.map((v) => '<button type="button" data-k="' + k + '" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';
    root.innerHTML = '<div class="pl"><aside class="pl-side"><div class="pl-t">DORO<small>DROP</small></div>' +
      '<div class="pl-g"><span>위험도</span>' + seg('risk', RISK.map((r, i) => [i, r])) + '</div>' +
      '<div class="pl-g"><span>칩</span>' + seg('ch', CH.map((x, i) => [i, chip(x[0], 16) + x[2]])) + '</div>' +
      '<div class="pl-g"><span>개수</span>' + seg('n', CNT.map((n) => [n, n])) + '</div>' +
      '<div class="pl-bal"></div><button type="button" class="pl-go"></button><div class="pl-msg"></div></aside>' +
      '<main class="pl-main"><canvas></canvas><div class="pl-log"></div><div class="pl-win"></div></main></div>';
    cv = $('canvas', root); c = cv.getContext('2d'); cv.style.aspectRatio = W + '/' + H; T = table(S.rows, S.risk); ui(); kick();
  }
  function onClick(e) {
    const b = e.target.closest('.pl-seg button'); if (b) { if (balls.length) return; S[b.dataset.k] = +b.dataset.v; save(); T = table(S.rows, S.risk); ui(); kick(); return; }
    if (e.target.closest('.pl-go')) drop();
  }
  window.doroPlinko = { table, mount(el) {
    if (!el) return; const d = window.doroRaidData ? window.doroRaidData() : { ok: false }; if (!d.ok) { el.innerHTML = ''; return; }
    if (!document.getElementById('plinko-css')) { const s = document.createElement('style'); s.id = 'plinko-css'; s.textContent = CSS; document.head.appendChild(s); }
    ['b', 's', 'g', 'r'].forEach((k) => { if (!IMG[k]) { const im = new Image(); im.onload = kick; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(((sv) => (sv.indexOf('xmlns=') < 0 ? sv.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') : sv))(chip(k, 64))); IMG[k] = im; } });
    if (root !== el) { root = el; el.addEventListener('click', onClick); window.addEventListener('dorochips', () => { if (root && root.isConnected) ui(); }); }
    build();
  } };
})();
