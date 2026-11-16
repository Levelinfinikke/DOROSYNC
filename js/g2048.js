/* DOROSYNC 2048 (관리자 전용 · 미공개)
   입장 싱크칩 10 · 판을 끝내고 정산하면 가장 큰 타일에 따라 보상
   배포 사이트: 서버가 씨앗을 주고, 정산 때 움직인 기록을 그대로 다시 돌려 확인(점수 조작 방지) · 미리보기: 이 기기에서 계산
   새 타일: 씨앗으로 정해짐(빈칸 고르기 → 90% 2, 10% 4). 서버와 같은 순서로 난수를 씀 */
(() => {
  'use strict';
  const PROD = /github\.io$/.test(location.hostname), K = 'dorosync-2048', FEE = 10;
  const REW = { 6: [5, 0], 7: [10, 0], 8: [20, 0], 9: [50, 0], 10: [120, 0], 11: [300, 1], 12: [800, 3], 13: [2000, 10] }; /* 가장 큰 타일(2^n) → [싱크칩, DORO칩] */
  const mulb = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const $ = (s, r) => (r || document).querySelector(s), fmt = (n) => Math.round(n).toLocaleString('ko-KR'), chip = (k, px) => (window.doroChipSvg ? window.doroChipSvg(k, px, false, true) : '');
  let root = null, G = null, busy = false, AC = null, idN = 0;
  const tone = (f, d, v, t, type) => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + (t || 0); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + 0.02); } catch (e) { /* 무시 */ } };
  /* ---------- 규칙(서버와 같음) ---------- */
  const spawn = (g) => { const e = []; for (let i = 0; i < 16; i++) if (!g.c[i]) e.push(i); if (!e.length) return; const i = e[Math.floor(g.r() * e.length)], v = g.r() < 0.9 ? 1 : 2; g.c[i] = { v, id: ++idN, nw: 1 }; };
  const LINES = { L: [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => r * 4 + c)), R: [0, 1, 2, 3].map((r) => [3, 2, 1, 0].map((c) => r * 4 + c)), U: [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => r * 4 + c)), D: [0, 1, 2, 3].map((c) => [3, 2, 1, 0].map((r) => r * 4 + c)) };
  function move(g, d) { let moved = false, gain = 0; const gone = [];
    LINES[d].forEach((ln) => { const t = ln.map((i) => g.c[i]).filter(Boolean), out = []; for (let i = 0; i < t.length; i++) { if (i + 1 < t.length && t[i].v === t[i + 1].v) { const m = { v: t[i].v + 1, id: t[i].id, mg: 1 }; gone.push({ id: t[i + 1].id, to: ln[out.length] }); out.push(m); gain += Math.pow(2, m.v); i++; } else out.push({ v: t[i].v, id: t[i].id }); }
      ln.forEach((ci, k) => { const nv = out[k] || null, ov = g.c[ci]; if ((nv ? nv.id : 0) !== (ov ? ov.id : 0) || (nv && ov && nv.v !== ov.v)) moved = true; g.c[ci] = nv; }); });
    if (moved) { g.score += gain; g.moves += d; spawn(g); } return { moved, gain, gone }; }
  const canMove = (g) => { for (let i = 0; i < 16; i++) { if (!g.c[i]) return true; const r = i >> 2, c = i & 3; if (c < 3 && g.c[i + 1] && g.c[i + 1].v === g.c[i].v) return true; if (r < 3 && g.c[i + 4] && g.c[i + 4].v === g.c[i].v) return true; } return false; };
  const maxOf = (g) => g.c.reduce((m, x) => Math.max(m, x ? x.v : 0), 0);
  function fresh(seed, moves) { const g = { seed, r: mulb(seed), c: Array(16).fill(null), score: 0, moves: '' }; spawn(g); spawn(g); (moves || '').split('').forEach((d) => { if (LINES[d]) move(g, d); }); g.c.forEach((x) => { if (x) { x.nw = 0; x.mg = 0; } }); return g; }
  const save = () => { try { if (G) localStorage.setItem(K, JSON.stringify({ s: G.seed, m: G.moves })); else localStorage.removeItem(K); } catch (e) { /* 무시 */ } };
  /* ---------- 화면 ---------- */
  const COL = ['', '#3a4252', '#4a5670', '#2f7de0', '#1fa8c9', '#22b573', '#8bc34a', '#f5c63a', '#ff9a24', '#ff5a3d', '#e23c8a', '#b05cff', '#ffd24a', '#fff'];
  const CSS = `
.g48{display:grid;grid-template-columns:260px 1fr;border-radius:16px;overflow:hidden;background:#12141a;color:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;border:1px solid var(--line)}
.g48-side{background:linear-gradient(180deg,#232838,#171a24);padding:16px 14px;display:flex;flex-direction:column;gap:11px}
.g48-t{font:900 40px "Arial Black",Arial,sans-serif;font-style:italic;line-height:1;background:linear-gradient(180deg,#fff3b0,#ffb21c 55%,#c97700);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.45))}
.g48-k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.g48-k div{background:#0c0e14;border-radius:10px;padding:7px 9px;font-size:11.5px;color:#9aa5b8}.g48-k b{display:block;color:#fff;font-size:19px;font-weight:800}
.g48-bal{display:flex;gap:10px;background:#0c0e14;border-radius:10px;padding:8px 10px;font-weight:800}.g48-bal span{display:inline-flex;align-items:center;gap:5px}
.g48-b{border:0;border-radius:12px;padding:11px;font:inherit;font-weight:900;font-size:15px;cursor:pointer;color:#14161c;background:linear-gradient(180deg,#ffe58a,#ffb21c 55%,#e08a00);box-shadow:0 4px 0 #8a5200;display:flex;align-items:center;justify-content:center;gap:6px}.g48-b.g{background:#3a4252;color:#fff;box-shadow:0 4px 0 #1c212b}.g48-b:disabled{opacity:.5;cursor:default}.g48-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8a5200}
.g48-rw{font-size:11.5px;line-height:1.7;background:#0c0e14;border-radius:10px;padding:8px 10px}.g48-rw span{display:flex;justify-content:space-between}.g48-rw span.on{color:#ffd24a;font-weight:800}.g48-rw i{font-style:normal;display:inline-flex;align-items:center;gap:3px}
.g48-msg{min-height:16px;font-size:12px;color:#ffb0a0;font-weight:700}
.g48-main{display:grid;place-items:center;padding:18px;background:radial-gradient(ellipse at 50% 30%,#2a3147,#0f1118 75%);position:relative;touch-action:none}
.g48-bd{position:relative;width:min(440px,84vw);aspect-ratio:1;background:#0a0c12;border-radius:14px;box-shadow:inset 0 0 0 3px #2a3147,0 10px 30px rgba(0,0,0,.5)}
.g48-bd u{position:absolute;width:22%;height:22%;border-radius:10px;background:rgba(255,255,255,.05);left:calc(2.4% + var(--c)*24.4%);top:calc(2.4% + var(--r)*24.4%)}
.g48-tl{position:absolute;width:22%;height:22%;left:2.4%;top:2.4%;border-radius:10px;display:grid;place-items:center;font:900 28px "Arial Black",Arial,sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35);transform:translate(calc(var(--c)*110.9%),calc(var(--r)*110.9%));transition:transform .11s ease-out;background:var(--bg);box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),inset 0 2px 0 rgba(255,255,255,.25);container-type:inline-size}
.g48-tl b{font-size:calc(38cqw - var(--d)*5.5cqw)}.g48-tl.nw{animation:g48N .16s ease-out}.g48-tl.mg{animation:g48M .18s ease-out;z-index:2}.g48-tl.hi{box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),inset 0 2px 0 rgba(255,255,255,.4),0 0 18px var(--bg)}
@keyframes g48N{from{scale:.2;opacity:0}}@keyframes g48M{50%{scale:1.2}}
.g48-ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,10,14,.78);border-radius:14px;text-align:center;font-weight:800;z-index:5;padding:14px;line-height:1.7}.g48-ov[hidden]{display:none}.g48-ov b{display:block;font:900 30px "Arial Black",Arial,sans-serif;color:#ffd24a}
@media(max-width:760px){.g48{grid-template-columns:1fr}.g48-main{order:-1}}
`;
  const rewOf = (mx) => { let r = [0, 0]; Object.keys(REW).forEach((k) => { if (mx >= +k) r = REW[k]; }); return r; };
  function ui() {
    if (!root) return; const o = window.doroChips.get(), mx = G ? maxOf(G) : 0, rw = rewOf(mx);
    $('.g48-bal', root).innerHTML = '<span>' + chip('b', 18) + fmt(window.doroChips.total()) + '</span><span>' + chip('r', 18) + fmt((o && o.r) || 0) + '</span>';
    $('.g48-k', root).innerHTML = '<div>점수<b>' + fmt(G ? G.score : 0) + '</b></div><div>가장 큰 타일<b>' + (mx ? Math.pow(2, mx) : '-') + '</b></div>';
    $('.g48-rw', root).innerHTML = Object.keys(REW).map((k) => '<span class="' + (mx >= +k ? 'on' : '') + '"><i>' + Math.pow(2, +k) + '</i><i>' + chip('b', 13) + fmt(REW[k][0]) + (REW[k][1] ? ' · ' + chip('r', 13) + REW[k][1] : '') + '</i></span>').join('');
    const nb = $('[data-g=new]', root), eb = $('[data-g=end]', root); nb.disabled = busy || !!G; nb.innerHTML = '새 판 ' + chip('b', 15) + FEE; eb.disabled = busy || !G; eb.innerHTML = '끝내고 정산' + (G && rw[0] ? ' ' + chip('b', 15) + fmt(rw[0]) + (rw[1] ? ' ' + chip('r', 15) + rw[1] : '') : '');
    const ov = $('.g48-ov', root); if (!G) { ov.hidden = false; if (!ov.dataset.keep) ov.innerHTML = '<div><b>2048</b>방향키 · WASD · 밀기로 타일을 합치세요<br>판을 끝내면 가장 큰 타일만큼 보상</div>'; } else if (!canMove(G)) { ov.hidden = false; ov.dataset.keep = ''; ov.innerHTML = '<div><b>더 움직일 수 없습니다</b>[끝내고 정산]을 눌러 보상을 받으세요</div>'; } else { ov.hidden = true; ov.dataset.keep = ''; }
  }
  function paint(gone) {
    const bd = $('.g48-bd', root), have = {}; if (!G) { bd.querySelectorAll('.g48-tl').forEach((e) => e.remove()); return; }
    (gone || []).forEach((x) => { const e = bd.querySelector('[data-id="' + x.id + '"]'); if (e) { e.style.setProperty('--r', x.to >> 2); e.style.setProperty('--c', x.to & 3); e.style.zIndex = '0'; setTimeout(() => e.remove(), 110); e.dataset.id = ''; } });
    G.c.forEach((x, i) => { if (!x) return; have[x.id] = 1; let e = bd.querySelector('[data-id="' + x.id + '"]'); if (!e) { e = document.createElement('div'); e.className = 'g48-tl'; e.dataset.id = x.id; e.innerHTML = '<b></b>'; bd.appendChild(e); }
      const n = Math.pow(2, x.v); e.style.setProperty('--r', i >> 2); e.style.setProperty('--c', i & 3); e.style.setProperty('--bg', COL[Math.min(13, x.v)]); e.style.setProperty('--d', String(String(n).length)); e.style.color = x.v >= 13 ? '#14161c' : '#fff'; e.firstChild.textContent = n; e.classList.toggle('hi', x.v >= 7);
      if (x.nw) { e.classList.add('nw'); x.nw = 0; } if (x.mg) { e.classList.remove('mg'); void e.offsetWidth; e.classList.add('mg'); x.mg = 0; } });
    bd.querySelectorAll('.g48-tl').forEach((e) => { if (e.dataset.id && !have[e.dataset.id]) e.remove(); });
  }
  function go(d) { if (!G || busy) return; const r = move(G, d); if (!r.moved) return; paint(r.gone); save(); if (r.gain) { tone(300 + Math.min(1400, Math.log2(r.gain) * 110), 0.12, 0.07); const mx = maxOf(G); if (r.gain >= 256 && Math.pow(2, mx) === r.gain) [0, 4, 7, 12].forEach((s2, i) => tone(523 * Math.pow(2, s2 / 12), 0.25, 0.07, i * 0.07)); } else tone(180, 0.04, 0.035, 0, 'sine'); ui(); }
  async function start() {
    if (busy || G) return; const msg = $('.g48-msg', root); msg.textContent = ''; busy = true; ui(); let seed;
    try { if (PROD) { const j = await window.doroRaid.api('g2048', { start: 1 }); seed = j.seed; window.doroChips.sync(j.chips); } else { if (!window.doroChips.spend(FEE)) throw new Error('chips'); seed = (Math.random() * 4294967296) >>> 0; } }
    catch (e) { busy = false; ui(); msg.textContent = ({ chips: '싱크칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' })[e && e.message] || '서버와 연결하지 못했습니다. (' + ((e && e.message) || e) + ')'; return; }
    busy = false; G = fresh(seed, ''); G.c.forEach((x) => { if (x) x.nw = 1; }); save(); paint(); ui();
  }
  async function end() {
    if (busy || !G) return; const msg = $('.g48-msg', root); msg.textContent = ''; busy = true; ui(); const mx = maxOf(G); let rw = rewOf(mx);
    try { if (PROD) { const j = await window.doroRaid.api('g2048', { moves: G.moves }); rw = [j.d || 0, j.r || 0]; window.doroChips.sync(j.chips); } else { const add = {}; if (rw[0]) add.b = rw[0]; if (rw[1]) add.r = rw[1]; if (rw[0] || rw[1]) window.doroChips.add(add, 'cap'); } }
    catch (e) { busy = false; ui(); msg.textContent = '정산하지 못했습니다. (' + ((e && e.message) || e) + ')'; return; }
    const bd = $('.g48-bd', root), bal = root.querySelectorAll('.g48-bal span'); try { if (rw[0] && window.doroChipFly) window.doroChipFly(bd, bal[0], rw[0], { size: 20 }); if (rw[1] && window.doroCutin) setTimeout(() => window.doroCutin(rw[1]), 500); } catch (e) { /* 무시 */ }
    const ov = $('.g48-ov', root); ov.dataset.keep = '1'; ov.innerHTML = '<div><b>' + Math.pow(2, mx) + '</b>점수 ' + fmt(G.score) + '<br>' + (rw[0] || rw[1] ? chip('b', 16) + ' +' + fmt(rw[0]) + (rw[1] ? ' · ' + chip('r', 16) + ' +' + rw[1] : '') : '보상 없음 (64부터)') + '</div>';
    G = null; busy = false; save(); paint(); ui();
  }
  function build() {
    let cells = ''; for (let i = 0; i < 16; i++) cells += '<u style="--r:' + (i >> 2) + ';--c:' + (i & 3) + '"></u>';
    root.innerHTML = '<div class="g48"><aside class="g48-side"><div class="g48-t">2048</div><div class="g48-k"></div><div class="g48-bal"></div><button type="button" class="g48-b" data-g="new"></button><button type="button" class="g48-b g" data-g="end"></button><div class="g48-msg"></div><div class="g48-rw"></div></aside>' +
      '<main class="g48-main"><div class="g48-bd">' + cells + '<div class="g48-ov"></div></div></main></div>';
    const mn = $('.g48-main', root); let dn = null;
    mn.addEventListener('pointerdown', (e) => { dn = [e.clientX, e.clientY]; }); mn.addEventListener('pointerup', (e) => { if (!dn) return; const dx = e.clientX - dn[0], dy = e.clientY - dn[1]; dn = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); });
    paint(); ui();
  }
  const KEY = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D' };
  window.doro2048 = { mount(el) {
    if (!el) return; const d = window.doroRaidData ? window.doroRaidData() : { ok: false }; if (!d.ok) { el.innerHTML = ''; return; }
    if (!document.getElementById('g48-css')) { const s = document.createElement('style'); s.id = 'g48-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (root !== el) { root = el; el.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'new') start(); else end(); });
      document.addEventListener('keydown', (e) => { if (!root || !root.isConnected || !root.classList.contains('on') || !G || !KEY[e.key] || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); go(KEY[e.key]); });
      window.addEventListener('dorochips', () => { if (root && root.isConnected) ui(); });
      try { const st = JSON.parse(localStorage.getItem(K)); if (st && st.s != null) G = fresh(st.s, st.m); } catch (e) { /* 무시 */ } }
    build();
  } };
})();
