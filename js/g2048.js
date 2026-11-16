/* DOROSYNC 2048 (관리자 전용 · 미공개)
   타일 = 지금 픽업 중인 니케(window.doroPickup). 명함으로 시작해 같은 단계끼리 합칠 때마다 돌파 +1
   명함 → 1돌 → 2돌 → 풀돌 → 코강 1 … → 코강 7(풀코강, 고전 2048의 2048 타일)을 만들면 끝
   칩 보상 없음 · AUTO(자동 진행)는 한 판에 싱크칩 500 */
(() => {
  'use strict';
  const K = 'dorosync-2048b', AUTO_FEE = 500, GOAL = 11;
  const mulb = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const $ = (s, r) => (r || document).querySelector(s), fmt = (n) => Math.round(n).toLocaleString('ko-KR'), chip = (k, px) => (window.doroChipSvg ? window.doroChipSvg(k, px, false, true) : '');
  const pick = () => (window.doroPickup ? window.doroPickup() : { n: '', img: '' }), data = () => (window.doroRaidData ? window.doroRaidData() : { ok: false });
  const stage = (v) => (v <= 1 ? '명함' : v < 4 ? (v - 1) + '돌파' : v === 4 ? '풀돌' : v < GOAL ? '코강 ' + (v - 4) : '풀코강'), lbSrc = (v) => { try { return v > 1 ? data().lb(Math.min(3, v - 1), Math.max(0, v - 4)) : ''; } catch (e) { return ''; } };
  let root = null, G = null, AC = null, idN = 0, autoT = 0;
  const tone = (f, d, v, t, type) => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + (t || 0); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + 0.02); } catch (e) { /* 무시 */ } };
  /* ---------- 규칙 ---------- */
  const spawn = (g) => { const e = []; for (let i = 0; i < 16; i++) if (!g.c[i]) e.push(i); if (!e.length) return; const i = e[Math.floor(g.r() * e.length)], v = g.r() < 0.9 ? 1 : 2; g.c[i] = { v, id: ++idN, nw: 1 }; };
  const LINES = { L: [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => r * 4 + c)), R: [0, 1, 2, 3].map((r) => [3, 2, 1, 0].map((c) => r * 4 + c)), U: [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => r * 4 + c)), D: [0, 1, 2, 3].map((c) => [3, 2, 1, 0].map((r) => r * 4 + c)) };
  const slide = (cells, d) => { let moved = false, gain = 0; const c = cells.slice(), gone = []; /* 순수 계산: 칸 배열을 받아 민 결과를 돌려줌 */
    LINES[d].forEach((ln) => { const t = ln.map((i) => c[i]).filter(Boolean), out = []; for (let i = 0; i < t.length; i++) { if (i + 1 < t.length && t[i].v === t[i + 1].v) { gone.push({ id: t[i + 1].id, to: ln[out.length] }); out.push({ v: t[i].v + 1, id: t[i].id, mg: 1 }); gain += t[i].v + 1; i++; } else out.push({ v: t[i].v, id: t[i].id }); }
      ln.forEach((ci, k) => { const nv = out[k] || null, ov = c[ci]; if ((nv ? nv.id : 0) !== (ov ? ov.id : 0) || (nv && ov && nv.v !== ov.v)) moved = true; c[ci] = nv; }); }); return { c, moved, gain, gone }; };
  function move(g, d) { const r = slide(g.c, d); if (r.moved) { g.c = r.c; g.n++; g.moves += d; spawn(g); } return r; }
  const canMove = (g) => 'LRUD'.split('').some((d) => slide(g.c, d).moved), maxOf = (g) => g.c.reduce((m, x) => Math.max(m, x ? x.v : 0), 0);
  function fresh(seed, moves, auto) { const g = { seed, r: mulb(seed), c: Array(16).fill(null), n: 0, moves: '', auto: !!auto, on: false }; spawn(g); spawn(g); (moves || '').split('').forEach((d) => { if (LINES[d]) move(g, d); }); g.c.forEach((x) => { if (x) { x.nw = 0; x.mg = 0; } }); return g; }
  const save = () => { try { if (G) localStorage.setItem(K, JSON.stringify({ s: G.seed, m: G.moves, a: G.auto ? 1 : 0 })); else localStorage.removeItem(K); } catch (e) { /* 무시 */ } };
  /* AUTO: 큰 타일을 구석에 모으는 쪽을 고름(두 수 앞까지) */
  const W8 = [15, 14, 13, 12, 8, 9, 10, 11, 7, 6, 5, 4, 0, 1, 2, 3];
  const evalC = (c) => { let s = 0, e = 0; for (let i = 0; i < 16; i++) { if (!c[i]) e++; else s += Math.pow(2, c[i].v) * W8[i]; } return s + e * 60; };
  const best = (c, depth) => { let bd = '', bs = -1e18; 'LDRU'.split('').forEach((d) => { const r = slide(c, d); if (!r.moved) return; const sc = evalC(r.c) + r.gain * 20 + (depth > 0 ? best(r.c, depth - 1).s * 0.6 : 0); if (sc > bs) { bs = sc; bd = d; } }); return { d: bd, s: bd ? bs : -1e6 }; };
  /* ---------- 화면 ---------- */
  const CSS = `
.g48{display:grid;grid-template-columns:260px 1fr;border-radius:16px;overflow:hidden;background:#12141a;color:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;border:1px solid var(--line)}
.g48-side{background:linear-gradient(180deg,#232838,#171a24);padding:16px 14px;display:flex;flex-direction:column;gap:11px}
.g48-t{font:900 40px "Arial Black",Arial,sans-serif;font-style:italic;line-height:1;background:linear-gradient(180deg,#fff3b0,#ffb21c 55%,#c97700);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.45))}
.g48-pk{display:flex;align-items:center;gap:9px;background:#0c0e14;border-radius:10px;padding:7px 9px;font-size:12px;color:#9aa5b8}.g48-pk i{width:42px;height:42px;border-radius:50%;background:#222 center 12%/cover;flex:none;box-shadow:0 0 0 2px #ffb21c}.g48-pk b{display:block;color:#fff;font-size:14px}
.g48-k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.g48-k div{background:#0c0e14;border-radius:10px;padding:7px 9px;font-size:11.5px;color:#9aa5b8}.g48-k b{display:block;color:#fff;font-size:18px;font-weight:800}
.g48-bal{display:flex;gap:10px;background:#0c0e14;border-radius:10px;padding:8px 10px;font-weight:800}.g48-bal span{display:inline-flex;align-items:center;gap:5px}
.g48-b{border:0;border-radius:12px;padding:11px;font:inherit;font-weight:900;font-size:15px;cursor:pointer;color:#14161c;background:linear-gradient(180deg,#ffe58a,#ffb21c 55%,#e08a00);box-shadow:0 4px 0 #8a5200;display:flex;align-items:center;justify-content:center;gap:6px}.g48-b.g{background:#3a4252;color:#fff;box-shadow:0 4px 0 #1c212b}.g48-b.on{background:linear-gradient(180deg,#a8f0c8,#22b573);box-shadow:0 4px 0 #0c6a3c}.g48-b:disabled{opacity:.5;cursor:default}.g48-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8a5200}
.g48-msg{min-height:16px;font-size:12px;color:#ffb0a0;font-weight:700}.g48-hint{font-size:11.5px;line-height:1.7;color:#9aa5b8}
.g48-main{display:grid;place-items:center;padding:18px;background:radial-gradient(ellipse at 50% 30%,#2a3147,#0f1118 75%);position:relative;touch-action:none}
.g48-bd{position:relative;width:min(460px,84vw);aspect-ratio:1;background:#0a0c12;border-radius:14px;box-shadow:inset 0 0 0 3px #2a3147,0 10px 30px rgba(0,0,0,.5)}
.g48-bd u{position:absolute;width:22%;height:22%;border-radius:10px;background:rgba(255,255,255,.05);left:calc(2.4% + var(--c)*24.4%);top:calc(2.4% + var(--r)*24.4%)}
.g48-tl{position:absolute;width:22%;height:22%;left:2.4%;top:2.4%;border-radius:10px;overflow:hidden;transform:translate(calc(var(--c)*110.9%),calc(var(--r)*110.9%));transition:transform .11s ease-out;background:#1a1e26 var(--img) 50% 0/86% auto no-repeat;box-shadow:inset 0 0 0 3px var(--bd,#5a6270);container-type:inline-size}
.g48-tl:after{content:"";position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 0 3px var(--bd,#5a6270),inset 0 -22cqw 16cqw -8cqw rgba(0,0,0,.75);pointer-events:none}
.g48-tl em{position:absolute;right:5%;top:5%;z-index:1;min-width:24cqw;height:24cqw;padding:0 4cqw;border-radius:6cqw;display:grid;place-items:center;font:900 15cqw "Arial Black",Arial,sans-serif;font-style:normal;color:#fff;background:linear-gradient(135deg,#d24bff,#7a2bd0);box-shadow:0 0 0 1.5cqw rgba(255,255,255,.85),0 1px 3px #000}.g48-tl img{position:absolute;right:5%;bottom:17%;height:20cqw;width:auto;z-index:1;filter:drop-shadow(0 1px 1px #000)}.g48-tl b{position:absolute;left:0;right:0;bottom:3%;z-index:1;text-align:center;font:900 13cqw "Pretendard","Malgun Gothic",sans-serif;text-shadow:0 1px 2px #000}
.g48-tl.s1{filter:saturate(.55) brightness(.8)}.g48-tl.s4{--bd:#cfe2ff}.g48-tl.s5{--bd:#ffd24a}.g48-tl.s8{--bd:#ff7a3d}.g48-tl.s11{--bd:#fff;box-shadow:0 0 22px #fff}
.g48-tl.foil:before,.g48-tl.poly:before{content:"";position:absolute;left:-150%;width:400%;top:-60%;height:220%;z-index:1;pointer-events:none;transform:rotate(24deg);animation:g48Fx 4s linear infinite;mix-blend-mode:overlay;opacity:.7;background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.8) 5%,rgba(255,255,255,0) 12%,rgba(255,255,255,0) 25%)}
.g48-tl.poly:before{mix-blend-mode:color-dodge;opacity:.5;background:repeating-linear-gradient(90deg,#ff5d8f 0,#ffb84d 4.17%,#f6f05a 8.33%,#5ef0a0 12.5%,#5ab8ff 16.67%,#b07aff 20.83%,#ff5d8f 25%)}@keyframes g48Fx{to{transform:rotate(24deg) translateX(-25%)}}
.g48-tl.nw{animation:g48N .16s ease-out}.g48-tl.mg{animation:g48M .2s ease-out;z-index:2}@keyframes g48N{from{transform:translate(calc(var(--c)*110.9%),calc(var(--r)*110.9%)) scale(.2);opacity:0}}@keyframes g48M{50%{transform:translate(calc(var(--c)*110.9%),calc(var(--r)*110.9%)) scale(1.2);filter:brightness(1.6)}} /* 자리 이동(translate)과 함께 써야 위치가 어긋나지 않음 */
.g48-ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,10,14,.8);border-radius:14px;text-align:center;font-weight:800;z-index:5;padding:14px;line-height:1.7}.g48-ov[hidden]{display:none}.g48-ov b{display:block;font:900 30px "Arial Black","Pretendard",sans-serif;color:#ffd24a}
.lb-48g{position:absolute;left:50%;top:8px;width:138px;transform:translateX(-50%) rotate(-4deg);display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.lb-48g .g48-tl{position:relative;left:0;top:0;width:100%;height:auto;aspect-ratio:1;transform:none;border-radius:7px}.lb-48g .g48-tl:after{border-radius:7px}
@media(max-width:760px){.g48{grid-template-columns:1fr}.g48-main{order:-1}}
`;
  const addCss = () => { if (!document.getElementById('g48-css')) { const s = document.createElement('style'); s.id = 'g48-css'; s.textContent = CSS; document.head.appendChild(s); } };
  const dress = (e, v) => { const lb = lbSrc(v); e.className = 'g48-tl s' + (v >= GOAL ? 11 : v >= 8 ? 8 : v >= 5 ? 5 : v >= 4 ? 4 : v <= 1 ? 1 : 2) + (v >= GOAL ? ' poly' : v >= 4 ? ' foil' : ''); e.style.setProperty('--img', 'url(' + pick().img + ')'); e.innerHTML = (v >= 5 ? '<em>' + (v >= GOAL ? 'MAX' : v - 4) + '</em>' : lb ? '<img alt="" src="' + lb + '">' : '') + '<b>' + stage(v) + '</b>'; }; /* 코강 단계: 별 없이 코강 숫자만(초상화가 잘 보이게) */
  function ui() {
    if (!root) return; const o = window.doroChips.get(), mx = G ? maxOf(G) : 0, p = pick();
    $('.g48-pk', root).innerHTML = '<i style="background-image:url(' + p.img + ')"></i><span>지금 픽업<b>' + String(p.n).replace(/[<>&]/g, '') + '</b></span>';
    $('.g48-bal', root).innerHTML = '<span>' + chip('b', 18) + fmt(window.doroChips.total()) + '</span><span>' + chip('r', 18) + fmt((o && o.r) || 0) + '</span>';
    $('.g48-k', root).innerHTML = '<div>움직인 횟수<b>' + fmt(G ? G.n : 0) + '</b></div><div>가장 높은 단계<b>' + (mx ? stage(mx) : '-') + '</b></div>';
    const ab = $('[data-g=auto]', root), over = !G || maxOf(G) >= GOAL || !canMove(G); ab.disabled = over; ab.classList.toggle('on', !!(G && G.on)); ab.innerHTML = G && G.auto ? (G.on ? 'AUTO 멈춤' : 'AUTO 계속') : 'AUTO ' + chip('b', 15) + AUTO_FEE;
    const ov = $('.g48-ov', root); if (!G) { ov.hidden = false; ov.innerHTML = '<div><b>2048</b>방향키 · WASD · 밀기로 같은 단계를 합치세요<br>명함에서 시작해 풀코강을 만들면 끝</div>'; } else if (mx >= GOAL) { ov.hidden = false; ov.innerHTML = '<div><b>풀코강 완성!</b>' + fmt(G.n) + '번 만에 ' + String(p.n).replace(/[<>&]/g, '') + ' 풀코강</div>'; } else if (!canMove(G)) { ov.hidden = false; ov.innerHTML = '<div><b>더 움직일 수 없습니다</b>' + stage(mx) + '까지 · [새 판]으로 다시</div>'; } else ov.hidden = true;
  }
  function paint(gone) {
    const bd = $('.g48-bd', root), have = {}; if (!G) { bd.querySelectorAll('.g48-tl').forEach((e) => e.remove()); return; }
    (gone || []).forEach((x) => { const e = bd.querySelector('[data-id="' + x.id + '"]'); if (e) { e.style.setProperty('--r', x.to >> 2); e.style.setProperty('--c', x.to & 3); e.style.zIndex = '0'; setTimeout(() => e.remove(), 110); e.dataset.id = ''; } });
    G.c.forEach((x, i) => { if (!x) return; have[x.id] = 1; let e = bd.querySelector('[data-id="' + x.id + '"]'); const isNew = !e; if (!e) { e = document.createElement('div'); e.dataset.id = x.id; e.dataset.v = ''; bd.appendChild(e); }
      if (e.dataset.v !== String(x.v)) { dress(e, x.v); e.dataset.v = String(x.v); } e.style.setProperty('--r', i >> 2); e.style.setProperty('--c', i & 3);
      if (x.nw || isNew) { e.classList.add('nw'); x.nw = 0; } if (x.mg) { e.classList.remove('mg'); void e.offsetWidth; e.classList.add('mg'); x.mg = 0; } });
    bd.querySelectorAll('.g48-tl').forEach((e) => { if (e.dataset.id && !have[e.dataset.id]) e.remove(); });
  }
  function go(d) { if (!G || maxOf(G) >= GOAL) return false; const r = move(G, d); if (!r.moved) return false; paint(r.gone); save(); const mx = maxOf(G);
    if (r.gain) { tone(300 + Math.min(1400, r.gain * 70), 0.12, 0.07); if (mx >= GOAL) { stopAuto(); [0, 4, 7, 12, 16, 19, 24].forEach((s2, i) => tone(523 * Math.pow(2, s2 / 12), 0.35, 0.08, i * 0.08)); } } else tone(180, 0.04, 0.035, 0, 'sine'); ui(); return true; }
  const stopAuto = () => { clearInterval(autoT); autoT = 0; if (G) G.on = false; };
  function auto() {
    if (!G) return; const msg = $('.g48-msg', root); msg.textContent = '';
    if (!G.auto) { if (!window.doroChips.spend(AUTO_FEE)) { msg.textContent = '싱크칩이 부족합니다. (AUTO ' + AUTO_FEE + ')'; return; } G.auto = true; save(); try { if (window.doroChipFly) window.doroChipFly(root.querySelectorAll('.g48-bal span')[0], $('[data-g=auto]', root), AUTO_FEE, { size: 18 }); } catch (e) { /* 무시 */ } } /* 이 판에서는 다시 내지 않음 */
    if (G.on) { stopAuto(); ui(); return; } G.on = true; ui();
    autoT = setInterval(() => { if (!G || !root.isConnected || !root.classList.contains('on')) { stopAuto(); if (root.isConnected) ui(); return; } const b = best(G.c, 2); if (!b.d || !go(b.d)) { stopAuto(); ui(); } }, 110);
  }
  function build() {
    let cells = ''; for (let i = 0; i < 16; i++) cells += '<u style="--r:' + (i >> 2) + ';--c:' + (i & 3) + '"></u>';
    root.innerHTML = '<div class="g48"><aside class="g48-side"><div class="g48-t">2048</div><div class="g48-pk"></div><div class="g48-k"></div><div class="g48-bal"></div><button type="button" class="g48-b" data-g="new">새 판</button><button type="button" class="g48-b g" data-g="auto"></button><div class="g48-msg"></div><div class="g48-hint">명함 → 1돌파 → 2돌파 → 풀돌 → 코강 1~6 → 풀코강<br>같은 단계 두 장을 합치면 한 단계 오릅니다.</div></aside>' +
      '<main class="g48-main"><div class="g48-bd">' + cells + '<div class="g48-ov"></div></div></main></div>';
    const mn = $('.g48-main', root); let dn = null;
    mn.addEventListener('pointerdown', (e) => { dn = [e.clientX, e.clientY]; }); mn.addEventListener('pointerup', (e) => { if (!dn) return; const dx = e.clientX - dn[0], dy = e.clientY - dn[1]; dn = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24 || (G && G.on)) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); });
    paint(); ui();
  }
  const KEY = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D' };
  window.doro2048 = {
    art() { addCss(); const d = document.createElement('div'); return '<span class="lb-48g">' + [1, 2, 4, 3, 6, 8, 1, 5, 11].map((v) => { dress(d, v); return d.outerHTML; }).join('') + '</span>'; }, /* 로비 그림: 지금 픽업 니케의 타일 */
    mount(el) {
      if (!el) return; if (!data().ok) { el.innerHTML = ''; return; } addCss();
      if (root !== el) { root = el; el.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'new') { stopAuto(); G = fresh((Math.random() * 4294967296) >>> 0, ''); G.c.forEach((x) => { if (x) x.nw = 1; }); save(); paint(); ui(); } else auto(); });
        document.addEventListener('keydown', (e) => { if (!root || !root.isConnected || !root.classList.contains('on') || !G || G.on || !KEY[e.key] || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); go(KEY[e.key]); });
        window.addEventListener('dorochips', () => { if (root && root.isConnected) ui(); });
        try { const st = JSON.parse(localStorage.getItem(K)); if (st && st.s != null) G = fresh(st.s, st.m, st.a); } catch (e) { /* 무시 */ } }
      build();
    } };
})();
