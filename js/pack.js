/* DOROSYNC 카드팩 (관리자 전용 · 미공개)
   1팩 5장 · 1박스 30팩 · 일반/기업팩 100싱크칩(일반 박스 10% 할인) · 필그림팩 1 DORO칩
   배포 사이트: 서버(/raid a=pack)가 뽑아 계정에 기록 · 미리보기: 이 기기에서만 뽑는 연습용
   풀코강(11장)을 넘는 카드는 골드칩 1개(싱크칩 10)로 돌려줌 */
(() => {
  'use strict';
  const PROD = /github\.io$/.test(location.hostname), TS = { SSS: 9, SS: 8, S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
  const TW = { 9: 2, 8: 5, 7: 10, 6: 16, 5: 20, 4: 18, 3: 14, 2: 9, 1: 6 }; /* 티어별 확률 가중치(서버와 같게) */
  const PCO = ['엘리시온', '미실리스', '테트라', '어브노멀'];
  const BASE_KINDS = [{ k: 'std', nm: '일반팩', sub: '필그림 제외 전체', c1: '#2c3644', c2: '#a9bdd6', price: 100, box: 2700 }]
    .concat(PCO.map((c, i) => ({ k: 'co:' + c, co: c, nm: c + ' 팩', sub: c + ' 니케만', c1: ['#5c0a10', '#0a2f63', '#6e4e00', '#050506'][i], c2: ['#ff3d45', '#3d9bff', '#ffd23d', '#4a4d57'][i], price: 100, box: 3000 })))
    .concat([{ k: 'pil', co: '필그림', nm: '필그림 팩', sub: '필그림 니케만', c1: '#1a1408', c2: '#e8c35a', price: 1, box: 30, r: 1 }]);
  /* 픽업 부스터팩(관리 탭에서 추가): 픽업 카드 1장 확정 + 일반팩 4장. 일반팩 왼쪽에 놓임. 여러 개가 함께 있을 수 있음 */
  const KINDS = [], BN = (k) => k.bn || 30;
  function syncKinds() { let P = []; try { P = window.doroCfg.get().packs || []; } catch (e) { P = []; } const L = (window.doroRaidData ? window.doroRaidData().list : []) || [];
    const bo = P.map((x) => { const card = L.find((c) => String(c.code) === String(x.code)) || L.find((c) => c.n === x.n); if (!card) return null; return { k: 'bo:' + x.id, bo: 1, nm: x.n + ' 부스터', pn: x.n, code: String(card.code), sub: '픽업 확률 UP', rate: +x.rate === 1 ? 1 : 2, c1: 'color-mix(in srgb,' + x.c2 + ' 30%,#000)', c2: x.c2 || '#ffcf5a', price: 75, box: 1500, bn: 20, cover: window.doroCfg.img(x.cover), face: card.img || window.doroCfg.face(x.n) }; }).filter(Boolean);
    KINDS.length = 0; bo.concat(BASE_KINDS).forEach((k) => KINDS.push(k)); }
  syncKinds(); window.addEventListener('dorocfg', () => { syncKinds(); if (root && root.isConnected && !busy && !cur && $('.pp-ov', root) && $('.pp-ov', root).hidden) shop(); });
  const GL = { 9: 'rb', 8: '#ff3b3b', 7: '#b05cff', 6: '#3fe07a' }, glOf = (tv) => GL[tv] || '';
  const $ = (s, r) => (r || document).querySelector(s), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR'), chip = (k, px) => (window.doroChipSvg ? window.doroChipSvg(k, px, false, true) : '');
  const data = () => window.doroRaidData();
  let root = null, Q = [], cur = null, got = [], busy = false, AC = null;
  /* ---------- 소리: 스틸 카드 톤(쇠판·걸쇠·모루) ---------- */
  const ac = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  const tone = (f, d, v, t, type) => { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (t || 0); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02); };
  const metal = (f, d, v, t) => { [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(f * m, d / (1 + i * 0.6), (v || 0.05) / (1 + i * 0.8), t, i ? 'sine' : 'triangle')); }; /* 쇠가 울리는 비화성 배음 */
  const noise = (d, v, f, t, type) => { const a = ac(); if (!a) return; const b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length); const s = a.createBufferSource(), g = a.createGain(), q = a.createBiquadFilter(); q.type = type || 'bandpass'; q.frequency.value = f || 3000; q.Q.value = 1.2; g.gain.value = v || 0.1; s.buffer = b; s.connect(q).connect(g).connect(a.destination); s.start(a.currentTime + (t || 0)); };
  const sweep = (d, v, f0, f1) => { const a = ac(); if (!a) return; const b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / ch.length); const s2 = a.createBufferSource(), g = a.createGain(), q = a.createBiquadFilter(); q.type = 'bandpass'; q.Q.value = 2.2; q.frequency.setValueAtTime(f0, a.currentTime); q.frequency.exponentialRampToValueAtTime(f1, a.currentTime + d); g.gain.value = v; s2.buffer = b; s2.connect(q).connect(g).connect(a.destination); s2.start(); };
  const sfx = {
    tear: (p) => { noise(0.045, 0.09, 5200 + (p || 0) * 2500, 0, 'highpass'); metal(2400 + (p || 0) * 1800, 0.04, 0.012, 0); }, /* 호일이 찢기는 소리, 갈수록 높아짐 */
    rip: () => { noise(0.28, 0.2, 2600, 0, 'highpass'); metal(420, 0.5, 0.07, 0.02); metal(1260, 0.35, 0.03, 0.05); tone(70, 0.3, 0.14, 0); },
    card: () => { sweep(0.16, 0.13, 1800, 9000); metal(2900, 0.12, 0.02, 0.03); metal(4350, 0.2, 0.012, 0.05); tone(140, 0.06, 0.07, 0); }, /* 쇠 카드를 빼는 '샤악' + 끝의 맑은 울림 */
    jack: (tv) => { const a = ac(); if (!a) return; const big = tv >= 9, t0 = a.currentTime; /* 파칭코식: 솟구치는 사이렌 → 쾅 → 팡파르 → 쏟아지는 쇳소리 */
      const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(big ? 1900 : 1200, t0 + 0.45); g.gain.setValueAtTime(0.05, t0); g.gain.linearRampToValueAtTime(0.09, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 0.55);
      tone(48, 1.1, 0.22, 0.45); noise(0.5, 0.16, 5000, 0.45, 'highpass');
      const sc = big ? [0, 4, 7, 12, 16, 19, 24, 28] : [0, 4, 7, 12, 16]; sc.forEach((st, i) => { metal(523 * Math.pow(2, st / 12), 0.7, 0.07, 0.5 + i * 0.075); tone(261 * Math.pow(2, st / 12), 0.25, 0.035, 0.5 + i * 0.075, 'square'); });
      const base = 0.5 + sc.length * 0.075 + 0.1; [0, 7, 12, 7, 12, 19].slice(0, big ? 6 : 3).forEach((st, i) => metal(1046 * Math.pow(2, st / 12), 0.5, 0.05, base + i * 0.13));
      for (let i = 0; i < (big ? 30 : 14); i++) metal(2200 + Math.random() * 2600, 0.09, 0.014, 0.7 + i * 0.07 + Math.random() * 0.03); },
    land: () => { metal(820, 0.16, 0.04, 0); noise(0.03, 0.08, 2400, 0); },
    tier: (tv) => { if (tv >= 9) { [0, 4, 7, 12, 16, 19].forEach((st, i) => metal(620 * Math.pow(2, st / 12), 0.7, 0.06, i * 0.085)); tone(62, 0.9, 0.16, 0); noise(0.5, 0.08, 7000, 0.1, 'highpass'); } else if (tv >= 6) { for (let i = 0; i <= tv - 6; i++) metal(520 * Math.pow(2, [0, 4, 7][i] / 12) * (tv >= 8 ? 1.19 : 1), 0.5, 0.055, i * 0.09); tone(80, 0.3, tv >= 8 ? 0.12 : 0.06, 0); } else metal(300, 0.12, 0.03, 0); },
    up: () => { metal(1040, 0.3, 0.06, 0); metal(1560, 0.5, 0.06, 0.09); }, deal: (i) => { metal(520 * Math.pow(2, Math.min(36, i) / 12), 0.09, 0.022, 0); noise(0.02, 0.04, 5000, 0); }, buy: () => { metal(640, 0.2, 0.05, 0); metal(960, 0.3, 0.05, 0.08); } };
  /* ---------- 뽑기 ---------- */
  function rollLocal(kind) { /* 미리보기 전용 */
    const k = KINDS.find((x) => x.k === kind), L = data().list.filter((x) => (k.r ? x.c === '필그림' : k.co ? x.c === k.co : x.c !== '필그림')), puC = k.bo ? data().list.find((x) => String(x.code) === k.code) : null;
    const by = {}; L.forEach((x) => { const tv = TS[x.t] || 1; (by[tv] = by[tv] || []).push(x); }); const tvs = Object.keys(by), tot = tvs.reduce((a, t) => a + TW[t], 0);
    const one = () => { let u = Math.random() * tot; for (const t of tvs) { u -= TW[t]; if (u <= 0) return by[t][Math.floor(Math.random() * by[t].length)]; } return by[tvs[0]][0]; };
    return [0, 1, 2, 3, 4].map((q) => { const x = puC && Math.random() < k.rate / 100 ? puC : one(), dup = window.doroDex.count(x.n) >= 11; if (!dup) window.doroDex.add(x.n, 1); return [x.code, dup ? 1 : 0, dup ? 11 : window.doroDex.count(x.n)]; });
  }
  async function buy(kind, n) {
    const k = KINDS.find((x) => x.k === kind), price = n > 1 ? k.box : k.price;
    if (PROD && window.doroAccount && window.doroAccount.user) { const j = await window.doroRaid.api('pack', { kind, n }); const a = window.doroAccount; if (a && a.doc) a.doc.dex = j.dex; if (window.doroChips.sync) window.doroChips.sync(j.chips); try { window.doroStat.add({ cd: (j.gold || 0) * 10 }); } catch (e2) { /* 무시 */ } return j.packs; }
    /* 로그인하지 않았으면 이 기기에서 뽑음(칩·카드는 이 브라우저에 저장). 미리보기에서는 DORO칩 팩을 차감 없이 체험 */
    if (k.r ? (PROD && !window.doroChips.spendR(price)) : !window.doroChips.spend(price)) throw new Error('chips');
    const packs = []; let gold = 0; for (let i = 0; i < n; i++) { const p = rollLocal(kind); gold += p.filter((c) => c[1]).length; packs.push(p); }
    if (k.bo && n > 1 && !packs.some((p) => p.some((c) => String(c[0]) === k.code))) { const pu = data().list.find((x) => String(x.code) === k.code), dup = window.doroDex.count(pu.n) >= 11; if (!dup) window.doroDex.add(pu.n, 1); else gold++; packs[Math.floor(Math.random() * n)][Math.floor(Math.random() * 5)] = [pu.code, dup ? 1 : 0, dup ? 11 : window.doroDex.count(pu.n)]; } /* 하프박스: 픽업 최소 1장(미리보기 계산) */
    if (gold) window.doroChips.add({ g: gold }, 'cap'); return packs;
  }
  /* ---------- 화면 ---------- */
  const RBG = 'conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f)', ZIG = (n, a, b) => { let p = []; for (let i = 0; i <= n; i++) p.push((i / n * 100).toFixed(1) + '% ' + (i % 2 ? a : b) + '%'); return p; };
  const CLIP = 'polygon(' + ZIG(14, 0, 1.6).join(',') + ',' + ZIG(14, 100, 98.4).reverse().join(',') + ')', CLIP_T = 'polygon(' + ZIG(28, 0, 17).join(',') + ',100% 100%,0 100%)', CLIP_B = 'polygon(0 0,100% 0,' + ZIG(28, 100, 83).reverse().join(',') + ')';
  const CSS = `
#tab-pack{--pw:min(236px,56vw)}
.pp-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:22px 14px;margin-top:16px}
.pp-it{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 12px;border-radius:16px;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c2) 22%,transparent),transparent 70%),rgba(127,127,127,.06);border:1px solid var(--line);transition:transform .18s,box-shadow .18s}
.pp-it:hover{transform:translateY(-4px);box-shadow:0 10px 24px rgba(0,0,0,.3)}.pp-it:hover .pp{transform:rotateY(-14deg) rotateX(6deg) scale(1.04)}
.pp-it .pp{--pw:112px;cursor:default;animation:none}
.pp-it b{font-size:14px;margin-top:4px}.pp-it small{color:var(--muted);font-size:12px;margin-top:-6px}
.pp-buy{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.pp-buy button{display:inline-flex;align-items:center;gap:3px;padding:6px 9px;font-size:12.5px;font-weight:800;border-radius:10px}
.pp-bal{display:flex;gap:14px;align-items:center;font-weight:800}.pp-bal span{display:inline-flex;align-items:center;gap:4px}
.pp-odds{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px;margin-top:10px;color:var(--muted)}.pp-odds b{font-weight:900}
.pp-wrap{perspective:900px}
.pp{position:relative;width:var(--pw);aspect-ratio:9/17.6;transform-style:preserve-3d;transform:rotateY(calc(var(--fy,0deg) + var(--ry,0deg))) rotateX(var(--rx,0deg));transition:transform .35s cubic-bezier(.3,1.3,.5,1);touch-action:none;user-select:none;-webkit-user-select:none}
.pp.flip{--fy:180deg}.pp.live{transition:transform .08s linear}
.pp-f,.pp-b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;filter:drop-shadow(0 14px 18px rgba(0,0,0,.55))}.pp-b{transform:rotateY(180deg);display:flex}
.pp-skin{background:
 linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.55) 44%,rgba(255,255,255,.08) 50%,rgba(255,255,255,0) 58%) var(--sh,-60%) 0/260% 100% no-repeat,
 repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 3px,rgba(0,0,0,.06) 3px 6px),
 radial-gradient(ellipse 90% 60% at 50% 42%,color-mix(in srgb,var(--c2) 85%,#fff) 0,var(--c2) 30%,var(--c1) 78%,#07080b 100%)}
.pp-st .pp .pp-skin,.pp-it:hover .pp-skin{animation:ppSheen 3.4s ease-in-out infinite}@keyframes ppSheen{0%,35%{background-position:-60% 0,0 0,0 0}75%,100%{background-position:160% 0,0 0,0 0}}
.pp-all{position:absolute;inset:0}.pp-h{clip-path:${CLIP}}
.pp-top,.pp-bot{position:absolute;left:0;right:0;height:9.5%;z-index:2;background-blend-mode:normal}
.pp-top{top:0;transform-origin:100% 100%;clip-path:${CLIP_T}}.pp-bot{bottom:0;transform-origin:100% 0;clip-path:${CLIP_B}}
.pp-top:before,.pp-bot:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0 2px,rgba(255,255,255,.16) 2px 4px)} /* 압착 무늬 */
.pp-top:after,.pp-bot:after{content:"";position:absolute;left:0;right:0;height:0;border-top:2px dashed rgba(255,255,255,.75);filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))} /* 절취선 */
.pp-top:after{bottom:0}.pp-bot:after{top:0}
.pp-body{position:absolute;left:0;right:0;top:9.5%;bottom:9.5%;overflow:hidden}
.pp-frame{position:absolute;inset:5% 6%;border:calc(var(--pw)*.008) solid rgba(255,255,255,.55);border-radius:calc(var(--pw)*.03);box-shadow:inset 0 0 calc(var(--pw)*.1) rgba(0,0,0,.45),0 0 0 calc(var(--pw)*.012) rgba(0,0,0,.25)}
.pp-ttl{position:absolute;left:0;right:0;top:8%;text-align:center;font-family:"Arial Black",Arial,sans-serif;font-style:italic;color:#fff;font-size:calc(var(--pw)*.1);line-height:1.02;letter-spacing:-.01em;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 calc(var(--pw)*.08) var(--c2)}
.pp-ttl small{display:block;font-size:.42em;letter-spacing:.34em;opacity:.9;font-style:normal;margin-bottom:.3em}
.pp-ring{position:absolute;left:50%;top:52%;width:50%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 28%,#fff,#cfd5da 22%,#6b737c 55%,#1c2026 100%);box-shadow:0 calc(var(--pw)*.02) calc(var(--pw)*.05) rgba(0,0,0,.6),inset 0 0 0 calc(var(--pw)*.014) rgba(255,255,255,.8),inset 0 0 0 calc(var(--pw)*.03) rgba(0,0,0,.35)}
.pp-ring i{width:74%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#15181d,#000);box-shadow:inset 0 0 calc(var(--pw)*.05) var(--c2)}
.pp-ring b{font-family:"Arial Black",Arial,sans-serif;font-size:calc(var(--pw)*.17);color:#fff;text-shadow:0 0 calc(var(--pw)*.07) var(--c2),0 0 calc(var(--pw)*.02) #fff}
.pp-co{position:absolute;left:6%;bottom:5%;width:46%;aspect-ratio:1;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 3px 2px rgba(0,0,0,.55));opacity:.96}
.pp-n{position:absolute;right:9%;bottom:8%;font-family:"Arial Black",Arial,sans-serif;color:#fff;font-size:calc(var(--pw)*.062);text-align:right;line-height:1.15;text-shadow:0 2px 0 rgba(0,0,0,.45)}
.pp.pil{--c1:#120d04!important}.pp.pil .pp-skin{background:
 linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,245,200,.7) 44%,rgba(255,255,255,.1) 50%,rgba(255,255,255,0) 58%) var(--sh,-60%) 0/260% 100% no-repeat,
 linear-gradient(125deg,rgba(255,93,143,.22),rgba(255,184,77,.2) 22%,rgba(94,240,160,.2) 48%,rgba(90,184,255,.22) 72%,rgba(176,122,255,.22)),
 repeating-linear-gradient(115deg,rgba(255,255,255,.06) 0 3px,rgba(0,0,0,.1) 3px 6px),
 radial-gradient(ellipse 90% 60% at 50% 42%,#f3d98a 0,#b88a22 30%,#2a1f08 78%,#050402 100%)}
.pp-h{flex:1;position:relative}.pp-b .pp-all{display:flex}
.pp-h.l{box-shadow:inset -8px 0 10px rgba(0,0,0,.4)}.pp-h.r{box-shadow:inset 8px 0 10px rgba(0,0,0,.4)}
.pp-seam{position:absolute;left:50%;top:0;bottom:0;width:0;border-left:2px dashed rgba(255,255,255,.7);z-index:2}
.pp-tab{position:absolute;left:50%;top:50%;width:28%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 28%,#fff,#cfd5da 40%,#7b838c);color:#14161c;display:grid;place-items:center;font-weight:900;font-size:calc(var(--pw)*.055);box-shadow:0 3px 8px rgba(0,0,0,.5);z-index:3;animation:ppPulse 1.2s ease-in-out infinite}
@keyframes ppPulse{50%{transform:translate(-50%,-50%) scale(1.1)}}
.pp-ov{position:fixed;inset:0;z-index:8000;background:radial-gradient(circle at 50% 44%,#232a3a,#0a0c12 62%,#030406);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;overflow:hidden;font-family:"Pretendard","Malgun Gothic",sans-serif}
.pp-ov[hidden]{display:none}
.pp-rays{position:absolute;left:50%;top:44%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;pointer-events:none;background:repeating-conic-gradient(from 0deg,var(--rc,rgba(255,255,255,.07)) 0 5deg,transparent 5deg 14deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 42%);mask-image:radial-gradient(circle,#000 0,transparent 42%);animation:ppRay 50s linear infinite;opacity:var(--ro,.5);transition:opacity .4s}@keyframes ppRay{to{transform:rotate(360deg)}}
.pp-dust i{position:absolute;bottom:-10px;width:3px;height:3px;border-radius:50%;background:#fff;opacity:0;animation:ppDust var(--t) linear var(--d) infinite}@keyframes ppDust{0%{transform:translate(0,0);opacity:0}15%{opacity:.6}100%{transform:translate(var(--dx),-105vh);opacity:0}}
.pp-skip{position:absolute;right:14px;top:14px;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:8px 14px;font-weight:900;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;z-index:9;letter-spacing:.08em}
.pp-left{position:absolute;left:14px;top:16px;font-weight:800;font-size:13px;opacity:.85;z-index:9}
.pp-tip{font-size:13px;font-weight:700;opacity:.75;min-height:20px;text-align:center;position:relative;z-index:2}
.pp-st{position:relative;width:var(--pw);aspect-ratio:9/16;display:grid;place-items:center;margin-bottom:34px;z-index:2}
.pp-st .pp-wrap{position:absolute;left:0;top:4%;animation:ppBob 3.2s ease-in-out infinite}@keyframes ppBob{50%{transform:translateY(-9px)}}
.pp-cut{position:absolute;left:0;height:4px;width:0;z-index:5;border-radius:4px;pointer-events:none;background:#fff;box-shadow:0 0 14px 5px var(--gc,#fff),0 0 40px 14px var(--gc,#fff)}
.pp-hint{position:absolute;left:0;right:0;height:9.5%;z-index:6;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;letter-spacing:.25em;color:#fff;text-shadow:0 1px 3px #000;animation:ppSw 1.5s ease-in-out infinite}@keyframes ppSw{0%{transform:translateX(-20%);opacity:0}30%{opacity:1}100%{transform:translateX(20%);opacity:0}}
.pp-fl{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;pointer-events:none;z-index:6;opacity:0}
.pp-cut.rb{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f);box-shadow:0 0 12px 4px rgba(255,255,255,.55);animation:ppHue 1.1s linear infinite}.pp-cut.rb:after{content:"";position:absolute;inset:-14px -6px;border-radius:20px;background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f);filter:blur(14px);opacity:.95;z-index:-1}
.pp-beam.rb{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f);-webkit-mask-image:linear-gradient(0deg,#000,transparent);mask-image:linear-gradient(0deg,#000,transparent);animation:ppHueB 1.1s linear infinite}
.pp-rg.rb{border:0;background:${RBG};-webkit-mask-image:radial-gradient(circle,transparent 56%,#000 60%);mask-image:radial-gradient(circle,transparent 56%,#000 60%)}
@keyframes ppHue{to{filter:hue-rotate(360deg)}}@keyframes ppHueB{from{filter:blur(10px) hue-rotate(0deg)}to{filter:blur(10px) hue-rotate(360deg)}}
.pp-rg{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:4px solid var(--gc,#fff);pointer-events:none;z-index:6;opacity:0}
.pp-sp{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px var(--gc,#fff);pointer-events:none;z-index:7}
.pp-beam{position:absolute;left:8%;right:8%;bottom:50%;height:120vh;pointer-events:none;z-index:1;background:linear-gradient(0deg,var(--gc,#fff),rgba(255,255,255,0));opacity:0;filter:blur(10px);transform-origin:50% 100%}
.pp-cards{position:absolute;inset:0}
.pp-cards .pk{--cw:var(--pw);position:absolute;left:0;top:0;width:100%;cursor:grab;touch-action:none;transform:translate(var(--sx,0),var(--sy,0)) rotate(var(--sr,0deg))}
.pp-cards .pk.back .pk-in>*{visibility:hidden}.pp-cards .pk.back .pk-in{background:linear-gradient(#111,#111) padding-box,linear-gradient(150deg,#f4f6f8 0,#8a929a 16%,#e8ecef 30%,#59616a 48%,#d3d9de 64%,#737b83 80%,#eef1f3 100%) border-box}
.pp-cards .pk.back .pk-in:before{content:"";position:absolute;inset:0;background:#111 url(assets/img/raid-back.webp) center/cover;border-radius:.5em}.pp-cards .pk.back .pk-in:after{display:none}
.pp-glow{position:absolute;inset:-3%;border-radius:8%;pointer-events:none;opacity:calc(.1 + .9*var(--gi,0));filter:blur(calc(8px + 22px*var(--gi,0)));transform:scale(calc(1 + .12*var(--gi,0)));background:var(--gc,transparent)}
.pp-glow.rb{background:${RBG};animation:ppRb 1.6s linear infinite}@keyframes ppRb{to{filter:blur(calc(8px + 22px*var(--gi,0))) hue-rotate(360deg)}}
.pp-stamp{position:absolute;left:50%;top:-58px;transform:translateX(-50%);font-family:"Arial Black",Arial,sans-serif;font-style:italic;font-size:46px;line-height:1;pointer-events:none;z-index:8;text-shadow:0 4px 0 rgba(0,0,0,.55),0 0 22px currentColor;opacity:0;white-space:nowrap}
.pp-stamp.rb{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 4px 0 rgba(0,0,0,.55)) drop-shadow(0 0 14px #fff)}
.pp-tag{position:absolute;left:50%;bottom:-34px;transform:translateX(-50%);white-space:nowrap;font-weight:900;font-size:14px;padding:3px 12px;border-radius:99px;background:rgba(12,14,18,.8)}
.pp-pips{display:flex;gap:8px;z-index:2}.pp-pips i{width:26px;height:6px;border-radius:4px;background:rgba(255,255,255,.18);transition:background .25s,box-shadow .25s}.pp-pips i.on{background:var(--pc,#cfd5da);box-shadow:0 0 10px var(--pc,transparent)}.pp-pips i.rb{background:linear-gradient(90deg,#ff5d8f,#f6f05a,#5ef0a0,#5ab8ff,#b07aff)}
.pp-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;width:min(680px,94vw);max-height:62vh;overflow:auto;padding:16px 8px 8px;z-index:2}
.pp-sum>div{container-type:inline-size;text-align:center;font-size:11.5px;font-weight:800;opacity:0;animation:ppDeal .45s cubic-bezier(.2,1.5,.4,1) forwards;animation-delay:calc(var(--i)*70ms)}@keyframes ppDeal{from{opacity:0;transform:translateY(60px) rotate(8deg) scale(.6)}to{opacity:1;transform:none}}
.pp-sum .pk{--cw:100cqw;width:100%;cursor:default}.pp-sum .hi{filter:drop-shadow(0 0 10px var(--gc))}
.pp-sum em{display:block;margin-top:5px;font-style:normal;color:#ffd24a}.pp-sum em.n{color:#5ef0a0}
.pp-fb{display:flex;gap:10px;z-index:2;flex-wrap:wrap;justify-content:center}.pp-fb button{display:inline-flex;align-items:center;gap:4px;border:0;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;cursor:pointer;color:#fff;background:#0d8bf2;box-shadow:0 4px 0 rgba(0,0,0,.4)}.pp-fb button.g{background:#3a3f47}.pp-fb button.o{background:#f59e0b}
.pp-fb button:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
@media(max-width:560px){.pp-sum{gap:5px}.pp-stamp{font-size:36px}}
/* v3: 평평한 상·하단 마감, 두꺼운 상단 + 펀치홀, 말려 올라가는 절취 조각, 뒷면 은색 스트랩 */
.pp{--cs:color-mix(in srgb,var(--c2) 80%,#000)}
.pp-top,.pp-bot{clip-path:none!important;display:flex;background:none!important;animation:none!important}.pp-top{height:13%}.pp-bot{height:6.5%}.pp-body{top:13%;bottom:6.5%}
.pp-top:before,.pp-bot:before{display:none}.pp-top:after,.pp-bot:after{z-index:3;border-top:2px dashed rgba(255,255,255,.8)}
.pp-sl{flex:1;position:relative;margin-right:-.5px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.16) 0 2px,rgba(0,0,0,.16) 2px 4px),linear-gradient(180deg,color-mix(in srgb,var(--cs) 80%,#fff),var(--cs) 40%,color-mix(in srgb,var(--cs) 70%,#000));backface-visibility:visible;will-change:transform}
.pp-top .pp-sl{transform-origin:50% 100%}.pp-bot .pp-sl{transform-origin:50% 0}
.pp-hole{position:absolute;left:50%;top:42%;width:calc(var(--pw)*.085);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:#0b0d12;box-shadow:inset 0 2px 3px rgba(0,0,0,.9),0 0 0 1.5px rgba(255,255,255,.35);z-index:4}
.pp-ring{background:none;box-shadow:none;width:54%;filter:drop-shadow(0 calc(var(--pw)*.025) calc(var(--pw)*.04) rgba(0,0,0,.6))}.pp-ring svg{width:100%;height:100%;display:block}
.pp-h{clip-path:none!important}
.pp-in{position:absolute;inset:3.5% 8%;border-radius:5%;border:calc(var(--pw)*.014) solid transparent;background:url(assets/img/raid-back.webp) center/cover padding-box,linear-gradient(150deg,#f4f6f8 0,#8a929a 16%,#e8ecef 30%,#59616a 48%,#d3d9de 64%,#737b83 80%,#eef1f3 100%) border-box}
.pp-bsl{position:absolute;left:0;right:0;height:13%;top:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.16) 0 2px,rgba(0,0,0,.16) 2px 4px),var(--cs);z-index:1}.pp-bsl.b{top:auto;bottom:0;height:6.5%}
.pp-b .pp-all{z-index:1}.pp-b .pp-h{background-size:auto}.pp-seam{display:none}
.pp-strap{position:absolute;left:41%;width:18%;top:0;bottom:0;z-index:3;display:flex;flex-direction:column;filter:drop-shadow(0 0 3px rgba(0,0,0,.5))}
.pp-strap i{flex:1;margin-bottom:-.5px;transform-origin:100% 50%;background:repeating-linear-gradient(0deg,rgba(255,255,255,.5) 0 1px,rgba(0,0,0,.08) 1px 3px),linear-gradient(90deg,#8d949c,#f4f6f8 28%,#c3c9cf 50%,#ffffff 72%,#8d949c);will-change:transform}
.pp-tab{width:auto;aspect-ratio:auto;padding:.5em .9em;border-radius:99px;top:50%}
.pp-st .pp-wrap{z-index:5}
.pp-ov.jp:after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;padding:10px;background:var(--jb);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ppJb 1s linear infinite;filter:blur(3px) brightness(1.3)}@keyframes ppJb{to{filter:blur(3px) brightness(1.3) hue-rotate(360deg)}}
.pp-ov.jp .pp-rays{animation-duration:9s;opacity:1}
.pp-ov.jp8{--jb:conic-gradient(#ff3b3b,#ffd24a,#ff3b3b,#ffd24a,#ff3b3b)}.pp-ov.jp9{--jb:conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f)}
.pp-ov.jp8:after{animation:ppJb8 .5s ease-in-out infinite alternate}@keyframes ppJb8{from{opacity:.55}to{opacity:1}}
.pp-mq{position:absolute;left:0;top:50%;z-index:1;white-space:nowrap;pointer-events:none;font-family:"Arial Black",Arial,sans-serif;font-style:italic;font-size:min(34vh,260px);line-height:1;transform:translateY(-50%);opacity:.22;color:var(--mc,#fff);text-shadow:0 0 40px var(--mc,#fff)}
.pp-mq.rb{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;opacity:.32}
.pp-rn{position:absolute;top:-30px;width:8px;height:14px;border-radius:2px;pointer-events:none;z-index:3;background:var(--gc,#ffd24a);box-shadow:0 0 8px var(--gc,#ffd24a)}
.pp-white{position:absolute;inset:0;background:#fff;pointer-events:none;z-index:8;opacity:0}
.pp-ov{background:none}.pp-bgd{position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,#232a3a,#0a0c12 62%,#030406)}
svg.pp-top,svg.pp-bot{display:block;overflow:visible;position:absolute;left:0;width:100%;z-index:3}svg.pp-top{top:0;height:13%}svg.pp-bot{bottom:0;height:6.5%}
.pp-top .sd,.pp-bot .sd{fill:var(--cs)}.pp-top .hl,.pp-bot .hl{fill:#0b0d12;stroke:rgba(255,255,255,.4);stroke-width:.5}

.pp-body{z-index:2;border-top:2px dashed rgba(255,255,255,.75);border-bottom:2px dashed rgba(255,255,255,.75)}
svg.pp-strap{display:block;position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:3;filter:drop-shadow(0 0 2px rgba(0,0,0,.6))}
.pp-seam{display:block!important;border-left:2px dashed rgba(255,255,255,.75);z-index:2}
.pp-tab{left:26%;animation:none;transform:translate(-50%,-50%);background:rgba(12,14,18,.82);color:#fff;font-size:calc(var(--pw)*.045);pointer-events:none}
.pp-shop{padding-top:8px}.pp-it{padding-top:26px}
.pp-hang{position:relative;transform-origin:50% 6%;transition:transform .3s}.pp-it:hover .pp-hang{animation:ppSway 1.1s ease-in-out}@keyframes ppSway{25%{transform:rotate(4deg)}60%{transform:rotate(-3deg)}85%{transform:rotate(1deg)}}
.pp-hang .pp-gh{position:absolute;inset:0;border-radius:2px;background:linear-gradient(180deg,var(--cs2) 0 13%,var(--c2g) 13% 93.5%,var(--cs2) 93.5%);filter:brightness(.62)}.pp-hang .pp-gh.a{transform:translate(5px,-3px) rotate(2.5deg)}.pp-hang .pp-gh.b{transform:translate(-5px,-2px) rotate(-3deg);filter:brightness(.48)}
.pp-pin{position:absolute;left:50%;top:-14px;width:9px;height:calc(14px + 7%);margin-left:-4.5px;border-radius:5px;background:linear-gradient(90deg,#7b838c,#f4f6f8 45%,#8a929a);box-shadow:0 2px 3px rgba(0,0,0,.5);z-index:6}.pp-pin:after{content:"";position:absolute;left:50%;bottom:-3px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#aeb5bd 55%,#5b636c)}
.pp-it:hover .pp{transform:none}
.pp-dock{position:absolute;left:18px;bottom:18px;width:92px;z-index:6;text-align:center;font-family:"Arial Black",Arial,sans-serif;font-size:13px}
.pp-ctn{position:relative;width:100%;aspect-ratio:1.25;border-radius:6px;background:linear-gradient(160deg,color-mix(in srgb,var(--c2) 75%,#fff),var(--c2) 40%,var(--c1));box-shadow:inset 0 0 0 2px rgba(255,255,255,.3),0 8px 16px rgba(0,0,0,.6);display:grid;place-items:center;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.pp-ctn:before,.pp-ctn:after{content:"";position:absolute;top:-2px;width:50%;height:26%;background:color-mix(in srgb,var(--c2) 60%,#000);transform-origin:50% 0;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25)}
.pp-ctn:before{left:0;transform:rotateX(180deg) skewX(-14deg)}.pp-ctn:after{right:0;transform:rotateX(180deg) skewX(14deg)}
.pp-ctn.big{position:absolute;left:50%;top:46%;width:min(300px,62vw);margin:0;transform:translate(-50%,-50%);z-index:6;font-family:"Arial Black",Arial,sans-serif;font-size:26px}
.pp-ctn.shut:before,.pp-ctn.shut:after{transform:none;top:0;height:50%;transition:transform .35s}
.pp-rb{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;transition:opacity .35s}
.pp-sum{padding:28px 34px 20px;width:min(780px,98vw)}
.pp-hang .pp-gh,.pp-hang .pp-gh.a,.pp-hang .pp-gh.b{transform:translateY(calc(var(--q)*-3.4px)) scale(calc(1 - var(--q)*.012));filter:brightness(calc(.78 - var(--q)*.09));border-radius:1px;box-shadow:0 -1px 0 rgba(255,255,255,.25)}
.pp-it{padding-top:44px}
.pp-pin{display:block;position:absolute;left:50%;bottom:calc(100% - 5.7% - 1px);width:5px;height:24px;margin-left:-2.5px;border-radius:3px 3px 2px 2px;background:linear-gradient(90deg,#5b636c,#f4f6f8 45%,#8a929a);box-shadow:0 1px 2px rgba(0,0,0,.6);z-index:7;border-radius:2px}.pp-pin:before,.pp-pin:after{display:none!important;content:none!important} /* 걸쇠: 펀치홀을 지나 위로 올라가는 짧은 금속 막대 하나 */
.pp-sum{scrollbar-width:none;overflow-x:hidden}.pp-sum::-webkit-scrollbar{display:none}
.pp-cv{position:absolute;inset:0;background:#111 center/cover}.pp-cv:after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.05) 30%,rgba(0,0,0,.1) 60%,rgba(0,0,0,.6))}
.pp-ttl.bo{font-size:calc(var(--pw)*.092);top:7.5%}.pp-star{width:.95em;height:.95em;vertical-align:-.12em;margin:0 .02em;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}
.pp-ring.bo{background:radial-gradient(circle at 35% 28%,#fff,#cfd5da 22%,#6b737c 55%,#1c2026 100%);box-shadow:0 calc(var(--pw)*.02) calc(var(--pw)*.05) rgba(0,0,0,.6);filter:none;width:52%;padding:calc(var(--pw)*.022)}.pp-ring.bo i{width:100%;height:100%;border-radius:50%;background:#222 50% 14%/cover;box-shadow:inset 0 0 0 calc(var(--pw)*.012) #ffd23d}
.pp-bx.half{width:84px}.pp-bx.half.big{width:min(200px,44vw)}.pp-bx.half .bx-lid{aspect-ratio:.86;background-size:cover;background-position:center;clip-path:polygon(0 12%,14% 12%,20% 0,80% 0,86% 12%,100% 12%,100% 100%,0 100%)}.pp-bx.half .bx-lid b{font-size:15cqw}.pp-bx.half .bx-lid small{font-size:6.5cqw}.pp-bx.half .bx-tray{aspect-ratio:1.4}.pp-bx.half .bx-col i{bottom:calc(var(--i)*3.6%)}.pp-bx.half .bx-front em{font-size:16cqw}.pp-bx.half .bx-face{width:38cqw;height:38cqw}
.pp-od{border:0;background:none;color:var(--muted,#9aa5b8);font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:0}.pp-od:hover{color:var(--ink,#fff)}.pp-msg{font-size:14px;font-weight:800;color:#ffb84d;text-align:center;min-height:1.2em}
.pp-odm{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px}.pp-odm[hidden]{display:none}.pp-odb{width:min(420px,100%);max-height:86vh;overflow:auto;background:#161a22;color:#e8edf6;border:1px solid #2a3140;border-radius:16px;padding:18px}.pp-odb h3{margin:0 0 6px;font-size:18px}.pp-odb p{margin:0 0 10px;font-size:13px;line-height:1.6;color:#b9c2d3}.pp-odb p.s{margin:10px 0 12px;font-size:12px}.pp-odb table{width:100%;border-collapse:collapse;font-size:13.5px}.pp-odb th,.pp-odb td{padding:6px 8px;border-bottom:1px solid #2a3140;text-align:right}.pp-odb th:first-child,.pp-odb td:first-child{text-align:left}.pp-odb th{color:#9aa5b8;font-weight:600;font-size:12px}.pp-odb button{width:100%}
.bx-face{display:block;width:60px;height:60px;border-radius:50%;background:#222 50% 14%/cover;box-shadow:0 0 0 3px #ffd23d}
.pp-body{box-shadow:inset 7px 0 9px -5px rgba(0,0,0,.45),inset -7px 0 9px -5px rgba(0,0,0,.45)} /* 속에 카드 뭉치가 든 것처럼: 가운데가 카드 모양으로 도드라지고 가장자리는 눌려 있음 */
.pp-body:before{content:"";position:absolute;inset:4.5% 7.5%;border-radius:5%/3.2%;pointer-events:none;z-index:1;background:linear-gradient(100deg,rgba(255,255,255,.13),rgba(255,255,255,0) 28%,rgba(0,0,0,0) 62%,rgba(0,0,0,.16));box-shadow:inset 1.5px 1.5px 2px rgba(255,255,255,.34),inset -1.5px -2px 3px rgba(0,0,0,.38),2px 3px 5px rgba(0,0,0,.3),-1px -1px 2px rgba(255,255,255,.16)}
.pp-vinyl{position:absolute;inset:0;z-index:3;pointer-events:none;box-shadow:inset 1.5px 0 1px rgba(255,255,255,.32),inset -1.5px 0 1px rgba(255,255,255,.12);background:
 radial-gradient(ellipse 5% 20% at 13% 0,rgba(255,255,255,.34),transparent 72%),radial-gradient(ellipse 4% 27% at 30% 0,rgba(0,0,0,.34),transparent 72%),radial-gradient(ellipse 6% 17% at 48% 0,rgba(255,255,255,.24),transparent 72%),radial-gradient(ellipse 4% 25% at 67% 0,rgba(0,0,0,.32),transparent 72%),radial-gradient(ellipse 5% 19% at 85% 0,rgba(255,255,255,.28),transparent 72%),
 radial-gradient(ellipse 4% 24% at 19% 100%,rgba(0,0,0,.34),transparent 72%),radial-gradient(ellipse 6% 18% at 37% 100%,rgba(255,255,255,.26),transparent 72%),radial-gradient(ellipse 4% 26% at 56% 100%,rgba(0,0,0,.32),transparent 72%),radial-gradient(ellipse 5% 20% at 76% 100%,rgba(255,255,255,.3),transparent 72%),radial-gradient(ellipse 4% 16% at 91% 100%,rgba(0,0,0,.3),transparent 72%),
 radial-gradient(ellipse 24% 30% at 26% 26%,rgba(255,255,255,.2),transparent 70%),linear-gradient(101deg,transparent 63%,rgba(255,255,255,.11) 70%,transparent 76%),
 linear-gradient(90deg,rgba(0,0,0,.58) 0,rgba(0,0,0,.14) 8%,rgba(255,255,255,.13) 21%,transparent 40%,transparent 68%,rgba(0,0,0,.22) 90%,rgba(0,0,0,.62) 100%),
 linear-gradient(180deg,rgba(0,0,0,.52) 0,rgba(0,0,0,.1) 6%,transparent 13%,transparent 87%,rgba(0,0,0,.12) 94%,rgba(0,0,0,.56) 100%)} /* 비닐 포장: 가운데가 부풀고 압착부로 갈수록 눌리며, 위아래로 주름이 퍼지고 유광 반사가 얹힘 */
.pp.pil .pp-body:after{content:"";position:absolute;left:-150%;width:400%;top:-60%;height:220%;pointer-events:none;mix-blend-mode:color-dodge;opacity:.42;transform:rotate(24deg);background:repeating-linear-gradient(90deg,#ff5d8f 0,#ffb84d 4.17%,#f6f05a 8.33%,#5ef0a0 12.5%,#5ab8ff 16.67%,#b07aff 20.83%,#ff5d8f 25%);animation:ppHolo 9s linear infinite;will-change:transform}@keyframes ppHolo{from{transform:rotate(24deg) translateX(0)}to{transform:rotate(24deg) translateX(-25%)}} /* 니케 카드의 폴리크롬과 같은 방식: 한 주기만큼만 밀어 이음매가 없음 */
.pp-bx{position:relative;width:150px;font-family:"Arial Black",Arial,sans-serif;color:#fff;filter:drop-shadow(0 12px 16px rgba(0,0,0,.6))}
.pp-bx.big{position:absolute;left:50%;top:48%;width:min(360px,74vw);transform:translate(-50%,-50%);z-index:6}
.bx-lid{position:relative;aspect-ratio:1.55;clip-path:polygon(0 22%,14% 22%,20% 0,80% 0,86% 22%,100% 22%,100% 100%,0 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2%;text-align:center;animation:none!important;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.bx-lid b{font-style:italic;font-size:10.5cqw;line-height:1;text-shadow:0 2px 0 rgba(0,0,0,.5)}.pp-bx{container-type:inline-size}.bx-lid span svg{width:17cqw;height:17cqw;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}.bx-lid small{font-size:4.2cqw;letter-spacing:.08em;opacity:.9}
.bx-tray{position:relative;aspect-ratio:2.5;margin-top:-1px;background:#0b0d12;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--c2) 60%,#000)}
.bx-in{position:absolute;inset:6% 5% 30% 5%;display:flex;gap:5%}
.bx-col{flex:1;position:relative}.bx-col i{position:absolute;left:0;right:0;height:26%;bottom:calc(var(--i)*5.2%);transform:scale(calc(1 - var(--i)*.006));border-radius:1px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.2) 0 1px,rgba(0,0,0,.2) 1px 2px),color-mix(in srgb,var(--c2) 80%,#000);box-shadow:0 -1px 0 rgba(255,255,255,.35),0 1px 1px rgba(0,0,0,.5);z-index:calc(20 - var(--i))}
.bx-col i:first-child{height:60%;background:linear-gradient(180deg,color-mix(in srgb,var(--c2) 80%,#000) 0 30%,var(--c2) 30%)}
.bx-front{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:30;background:linear-gradient(180deg,color-mix(in srgb,var(--c2) 85%,#fff),var(--c2) 45%,var(--c1));box-shadow:inset 0 2px 0 rgba(255,255,255,.4);display:grid;place-items:center}
.bx-front em{font-style:normal;font-size:9cqw;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.pp-dock{width:150px}
.pp-sum>div{animation:none;opacity:0;transform:translateY(40px) scale(.6) rotate(6deg);transition:opacity .16s,transform .3s cubic-bezier(.2,1.6,.4,1);position:relative}.pp-sum>div.in{opacity:1;transform:none}
`;
  const VH = 162.2, TH = 21.1, BH = 10.55, SW = 15; let pid = 0; /* 팩 좌표: 가로 100 기준 */
  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  /* 상·하단 마감(한 조각): 뜯긴 쪽부터 절취선을 따라 곡선으로 들림 */
  const bandD = (zone, p, rt) => { const H = zone === 'top' ? TH : BH, top = zone === 'top', A = [], B = []; let lc = 0;
    for (let k = 0; k <= 32; k++) { const x = k / 32 * 100, s2 = rt ? x / 100 : 1 - x / 100, lift = 13 * Math.pow(Math.max(0, p * 1.12 - s2), 1.7); if (k === 16) lc = lift; /* 뜯긴 거리만큼 계속 휘어 올라감(상한 없음) */
      A.push(x.toFixed(1) + ' ' + (top ? -lift * 1.2 : lift).toFixed(2)); B.push(x.toFixed(1) + ' ' + (top ? H - lift : H + lift * 1.2).toFixed(2)); }
    return { d: 'M' + A.join('L') + 'L' + B.reverse().join('L') + 'Z', lc: top ? -lc : lc }; };
  const bandSvg = (zone) => { const id = 'ppr' + (++pid), H = zone === 'top' ? TH : BH, r = bandD(zone, 0, true);
    return '<svg class="pp-' + (zone === 'top' ? 'top' : 'bot') + '" viewBox="0 0 100 ' + H + '" aria-hidden="true"><defs><pattern id="' + id + '" width="6" height="1.5" patternUnits="userSpaceOnUse"><rect width="6" height=".75" fill="rgba(255,255,255,.2)"/><rect y=".75" width="6" height=".75" fill="rgba(0,0,0,.2)"/></pattern></defs><path class="sd" d="' + r.d + '"/><path class="rg" fill="url(#' + id + ')" d="' + r.d + '"/>' + (zone === 'top' ? '<circle class="hl" cx="50" cy="' + (H * 0.44) + '" r="4.2"/>' : '') + '</svg>'; };
  /* 뒷면 은색 스트랩(한 조각): 오른쪽 변이 가운데 절취선에 붙어 있고, 뜯으면 말리면서 뒤집힘 */
  const strapQ = (p, dw) => { let h = ''; const N = 30; for (let k = 0; k < N; k++) { const y0 = k / N * VH, y1 = (k + 1) / N * VH + 0.15, f = (y) => { const s2 = dw ? y / VH : 1 - y / VH; return p > 0 ? sm((p * 1.4 - s2) / 0.4) : 0; }, t0 = f(y0), t1 = f(y1), x0 = 50 - SW * Math.cos(t0 * Math.PI), x1 = 50 - SW * Math.cos(t1 * Math.PI), tm = (t0 + t1) / 2, back = tm > 0.5, br = Math.round(205 + 45 * Math.sin(tm * Math.PI) - (back ? 40 : 0));
      h += '<path d="M50 ' + y0.toFixed(2) + 'L' + x0.toFixed(2) + ' ' + (y0 - Math.sin(t0 * Math.PI) * 2).toFixed(2) + 'L' + x1.toFixed(2) + ' ' + (y1 - Math.sin(t1 * Math.PI) * 2).toFixed(2) + 'L50 ' + y1.toFixed(2) + 'Z" fill="' + (tm > 0.02 ? 'rgb(' + br + ',' + (br + 3) + ',' + (br + 8) + ')' : 'url(#pps)') + '"/>'; } return h; };
  const strapSvg = () => '<svg class="pp-strap" viewBox="0 0 100 ' + VH + '" aria-hidden="true"><defs><linearGradient id="pps" gradientUnits="userSpaceOnUse" x1="' + (50 - SW) + '" x2="50"><stop offset="0" stop-color="#8d949c"/><stop offset=".3" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#c3c9cf"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#9aa1a9"/></linearGradient></defs><g>' + strapQ(0, true) + '</g></svg>';
  const packHtml = (k) => { const d = data(), ico = k.co && d.coIco && d.coIco[k.co];
    const STAR = '<svg class="pp-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.6 7.1.8-5.3 4.9 1.5 7L12 17.7 5.7 21.3l1.5-7L1.9 9.4 9 8.6z" fill="#ffd23d" stroke="#7a4a00" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const face = k.bo ? '<i class="pp-cv" style="background-image:url(&quot;' + esc(k.cover) + '&quot;)"></i><div class="pp-frame"></div><div class="pp-ttl bo"><small>DOROSYNC</small>PICK' + STAR + 'UP<br>BOOSTER PACK</div><div class="pp-ring bo"><i style="background-image:url(&quot;' + esc(k.face) + '&quot;)"></i></div>' : '<div class="pp-frame"></div><div class="pp-ttl"><small>DOROSYNC</small>' + (k.r ? 'PILGRIM' : k.co ? 'CORP' : 'NIKKE') + '<br>CARD PACK</div><div class="pp-ring">' + chip(k.r ? 'r' : 'b', 120) + '</div>' + (ico ? '<img class="pp-co" alt="" src="' + ico + '">' : '') + '<div class="pp-n">5 CARDS<br>' + esc(k.nm) + '</div>';
    return '<div class="pp-wrap"><div class="pp' + (k.r ? ' pil' : '') + (k.bo ? ' bo' : '') + '" style="--c1:' + k.c1 + ';--c2:' + k.c2 + '"><div class="pp-f"><div class="pp-all">' + bandSvg('top') + '<div class="pp-body pp-skin">' + face + '<i class="pp-vinyl"></i></div>' + bandSvg('bot') + '</div></div><div class="pp-b"><div class="pp-in"></div><div class="pp-all"><div class="pp-h l pp-skin"><b class="pp-bsl"></b><b class="pp-bsl b"></b></div><div class="pp-h r pp-skin"><b class="pp-bsl"></b><b class="pp-bsl b"></b></div></div><div class="pp-seam"></div>' + strapSvg() + '<div class="pp-tab">스트랩 ↕</div></div></div></div>'; };
  function shop() {
    syncKinds();
    const o = window.doroChips ? window.doroChips.get() : { r: 0 }, bal = window.doroChips ? window.doroChips.total() : 0;
    root.innerHTML = '<div class="card"><div class="row-ctl sp"><h2 class="inline">카드팩</h2><div class="pp-bal"><span>' + chip('b', 20) + fmt(bal) + '</span><span>' + chip('r', 20) + fmt((o && o.r) || 0) + '</span></div></div>' +
      '<div class="pp-shop">' + KINDS.map((k) => '<div class="pp-it" style="--c2:' + k.c2 + '"><div class="pp-hang" style="--c2g:' + k.c2 + ';--cs2:color-mix(in srgb,' + k.c2 + ' 80%,#000)">' + [5, 4, 3, 2, 1].map((q) => '<i class="pp-gh" style="--q:' + q + '"></i>').join('') + packHtml(k) + '<i class="pp-pin"></i></div><b>' + esc(k.nm) + '</b><div class="pp-buy"><button type="button" class="primary" data-buy="' + esc(k.k) + '" data-n="1">' + chip(k.r ? 'r' : 'b', 14) + fmt(k.price) + '</button><button type="button" class="ghost" data-buy="' + esc(k.k) + '" data-n="' + BN(k) + '">' + (k.bo ? '하프박스(100) ' : '박스(150) ') + chip(k.r ? 'r' : 'b', 14) + fmt(k.box) + '</button></div><button type="button" class="pp-od" data-odds="' + esc(k.k) + '">확률 보기</button></div>').join('') + '</div><p class="pp-msg" style="margin-top:8px"></p></div><div class="pp-odm" hidden></div>' +
      '<div class="pp-ov" hidden></div>';
  }
  /* 팩별 확률표: 등급마다 가중치가 있고, 그 팩에 든 등급끼리 나눠 가짐. 같은 등급 안에서는 니케마다 같은 확률 */
  function oddsHtml(k) { const L = data().list.filter((x) => (k.r ? x.c === '필그림' : k.co ? x.c === k.co : x.c !== '필그림')), by = {}, tc = data().tierCol || {}; L.forEach((x) => { const tv = TS[x.t] || 1; (by[tv] = by[tv] || []).push(x); });
    const tvs = Object.keys(by).map(Number).sort((a, b) => b - a), tot = tvs.reduce((a, t) => a + TW[t], 0), TN = Object.keys(TS).reduce((o, t) => { o[TS[t]] = t; return o; }, {}), pu = k.bo ? k.rate / 100 : 0, pc = (v) => (v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)).replace(/\.?0+$/, '') + '%';
    return '<div class="pp-odb"><h3>' + esc(k.nm) + ' 확률</h3><p>1팩 5장 · 카드 1장마다 아래 확률로 나옵니다.' + (k.bo ? '<br><b style="color:#ffd23d">픽업 ' + esc(k.pn) + ': 장당 ' + k.rate + '%</b> · 하프박스(20팩 · 100장)는 최소 1장 확정' : '') + '</p><table><thead><tr><th>등급</th><th>확률</th><th>니케 수</th><th>니케 1명당</th></tr></thead><tbody>' +
      tvs.map((t) => { const p = TW[t] / tot * 100 * (1 - pu); return '<tr><td><b style="color:' + (tc[TN[t]] || '#fff') + '">' + TN[t] + '</b></td><td>' + pc(p) + '</td><td>' + by[t].length + '</td><td>' + pc(p / by[t].length) + '</td></tr>'; }).join('') + '</tbody></table><p class="s">풀코강(11장)을 넘는 카드는 골드칩 1개(싱크칩 10)로 바뀝니다.</p><button type="button" class="primary" data-oddsx="1">닫기</button></div>'; }
  const DBc = () => { const m = {}; data().list.forEach((x) => { m[String(x.code)] = x; }); return m; };
  const ERR = { chips: '칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' };
  const tvOf = (c) => TS[c.x.t] || 1;
  let lastBuy = null;
  let boxN = 0, fromR = null;
  async function onBuy(kind, n, btn) {
    if (busy) return; busy = true; const msg = $('.pp-msg', root); if (msg) msg.textContent = ''; const it = btn && btn.closest('.pp-it'), sp = it && $('.pp', it); fromR = sp ? sp.getBoundingClientRect() : null;
    try { const k0 = KINDS.find((x) => x.k === kind), bal0 = root.querySelectorAll('.pp-bal span')[k0.r ? 1 : 0], pr = n > 1 ? k0.box : k0.price; let wait = 0;
      const packs = await buy(kind, n), DB = DBc(); lastBuy = { kind, n }; sfx.buy(); try { if (window.doroStat) window.doroStat.add({ packs: packs.length }); } catch (e2) { /* 무시 */ }
      if (sp && bal0 && bal0.isConnected && window.doroChipFly) { wait = window.doroChipFly(bal0, sp, n > 1 && !k0.r ? pr / 10 : pr, { size: 20, k: k0.r ? 'r' : 'g' }) || 0; /* 박스는 칩을 1/10만 그림(필그림 박스 제외) */ await new Promise((ok) => setTimeout(ok, Math.min(1700, wait))); fromR = sp.isConnected ? sp.getBoundingClientRect() : null; } /* 잔고에서 칩이 나와 팩으로 들어간 뒤 뜯기 */
      Q = packs.map((p) => ({ k: KINDS.find((x) => x.k === kind), cards: p.map((c) => ({ x: DB[String(c[0])], dup: !!c[1], cnt: c[2] || 1, o: 0 })).filter((c) => c.x) }));
      Q.forEach((p) => { p.cards.forEach((c) => { c.o = tvOf(c) + Math.random() * 2.6; }); p.cards.sort((a, b) => a.o - b.o); }); /* 낮은 확률(높은 티어)일수록 뒤에 나올 가능성이 큼 */
      got = []; busy = false; boxN = n > 1 ? Q.length : 0; if (boxN) boxIntro(Q[0].k); else nextPack(); }
    catch (e) { busy = false; const t = ERR[e && e.message] || '카드팩을 열지 못했습니다. (' + ((e && e.message) || e) + ')'; const ov = $('.pp-ov', root); if (ov && !ov.hidden) { cur = null; ov.hidden = true; shop(); } const m2 = $('.pp-msg', root); if (m2) m2.textContent = t; }
  }
  /* 박스(진열 상자): 뒤에 세운 표지 + 앞쪽 트레이에 팩이 2줄로 꽂혀 있음. 남은 수만큼 실제로 줄어듦 */
  const boxHtml = (k, left, cls) => { const col = (n) => { let h = ''; for (let i = 0; i < n; i++) h += '<i style="--i:' + i + '"></i>'; return '<span class="bx-col">' + h + '</span>'; };
    return '<div class="pp-bx ' + (cls || '') + (k.r ? ' pil' : '') + (k.bo ? ' half' : '') + '" style="--c1:' + k.c1 + ';--c2:' + k.c2 + '"><div class="bx-lid ' + (k.bo ? 'cv" style="background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.1) 45%,rgba(0,0,0,.6)),url(&quot;' + esc(k.cover) + '&quot;)' : 'pp-skin') + '"><b>' + (k.bo ? 'PICK★UP<br>BOOSTER PACK' : (k.r ? 'PILGRIM' : k.co ? 'CORP' : 'NIKKE') + '<br>CARD PACK') + '</b><span>' + (k.bo ? '<i class="bx-face" style="background-image:url(&quot;' + esc(k.face) + '&quot;)"></i>' : chip(k.r ? 'r' : 'b', 60)) + '</span><small>' + BN(k) + ' PACKS · ' + esc(k.nm) + '</small></div><div class="bx-tray"><div class="bx-in">' + (k.bo ? col(left) : col(Math.ceil(left / 2)) + col(Math.floor(left / 2))) + '</div><div class="bx-front"><em>' + left + '</em></div></div></div>'; };
  function boxIntro(k) {
    const ov = $('.pp-ov', root); fromR = null; ov.hidden = false; ov.style.setProperty('--rc', k.c2 + '33'); ov.style.setProperty('--ro', '.5');
    ov.innerHTML = '<div class="pp-bgd"></div><div class="pp-rays"></div>' + boxHtml(k, Q.length, 'big');
    const c = $('.pp-bx', ov); $('.pp-bgd', ov).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    c.animate([{ transform: 'translate(-50%,-220vh) rotate(-8deg)', easing: 'cubic-bezier(.5,0,1,.7)' }, { transform: 'translate(-50%,-50%) rotate(0deg) scale(1.06,.9)', offset: 0.62 }, { transform: 'translate(-50%,-58%) scale(.97,1.04)', offset: 0.8 }, { transform: 'translate(-50%,-50%)' }], { duration: 700 }); /* 위에서 쿵 */
    setTimeout(() => { sfx.land(); tone(52, 0.45, 0.28, 0); noise(0.2, 0.2, 300, 0, 'lowpass'); try { ov.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(10px)' }, { transform: 'translateY(-5px)' }, { transform: 'none' }], { duration: 260 }); } catch (e) { /* 무시 */ } }, 430);
    setTimeout(() => { const r = c.getBoundingClientRect(), tw = 150, sc = tw / r.width, dx = 18 + tw / 2 - (r.left + r.width / 2), dy = innerHeight - 18 - r.height * sc / 2 - (r.top + r.height / 2); sfx.card();
      c.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(' + sc + ')' }], { duration: 520, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }); }, 1250);
    setTimeout(() => nextPack(), 1800);
  }
  const colOf = (tv) => { const c = glOf(tv); return c === 'rb' ? '#fff' : c || '#cfd5da'; };
  const stageBg = (ov, tv, on) => { const c = glOf(tv); ov.style.setProperty('--rc', c && c !== 'rb' ? c + '55' : c === 'rb' ? 'rgba(255,220,140,.4)' : 'rgba(255,255,255,.07)'); ov.style.setProperty('--ro', on ? '1' : '.5'); };
  function burst(st, tv, big) { const col = glOf(tv), f = document.createElement('i'); f.className = 'pp-fl'; f.style.background = col === 'rb' ? RBG : (col || '#fff'); st.appendChild(f);
    f.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.95, filter: 'blur(6px)' }, { transform: 'translate(-50%,-50%) scale(' + (big ? 80 : 40) + ')', opacity: 0, filter: 'blur(14px)' }], { duration: big ? 950 : 600, easing: 'ease-out' }).onfinish = () => f.remove();
    const rg = document.createElement('i'); rg.className = 'pp-rg'; rg.style.setProperty('--gc', colOf(tv)); if (glOf(tv) === 'rb') rg.classList.add('rb'); st.appendChild(rg); rg.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(' + (big ? 16 : 9) + ')', opacity: 0 }], { duration: big ? 800 : 520, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => rg.remove();
    const N = tv >= 9 ? 34 : tv >= 8 ? 22 : tv >= 6 ? 12 : 6; for (let i = 0; i < N; i++) { const s = document.createElement('i'); s.className = 'pp-sp'; const a = Math.random() * 6.283, r = 120 + Math.random() * (big ? 320 : 200), hue = tv >= 9 ? 'hsl(' + Math.floor(Math.random() * 360) + ',100%,70%)' : colOf(tv); s.style.setProperty('--gc', hue); st.appendChild(s);
      s.animate([{ transform: 'translate(0,0) scale(1.6)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * r).toFixed(0) + 'px,' + (Math.sin(a) * r + 60).toFixed(0) + 'px) scale(.2)', opacity: 0 }], { duration: 600 + Math.random() * 600, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => s.remove(); } }
  const shake = (ov, m) => { try { const k = [{ transform: 'none' }]; for (let i = 0; i < 7; i++) k.push({ transform: 'translate(' + ((Math.random() * 2 - 1) * m).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * m).toFixed(1) + 'px)' }); k.push({ transform: 'none' }); (ov.classList && ov.classList.contains('pp-ov') ? ($('.pp-st', ov) || $('.pp-sum', ov) || ov) : ov).animate(k, { duration: 60 * 8 }); if (navigator.vibrate) navigator.vibrate(m > 8 ? [30, 20, 60] : 20); } catch (e) { /* 무시 */ } };
  function nextPack() {
    cur = Q.shift(); const ov = $('.pp-ov', root); if (!cur) { ov.hidden = true; shop(); return; }
    const best = Math.max.apply(null, cur.cards.map(tvOf)); cur.best = best; cur.fake = best >= 7 && Math.random() < 0.3 ? best - 1 - (Math.random() < 0.4 ? 1 : 0) : best; /* 페이크: 뜯을 때는 한두 단계 낮은 빛 */
    let dust = ''; for (let i = 0; i < 26; i++) dust += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;--dx:' + ((Math.random() * 2 - 1) * 80).toFixed(0) + 'px;--t:' + (6 + Math.random() * 8).toFixed(1) + 's;--d:-' + (Math.random() * 14).toFixed(1) + 's"></i>';
    const first = ov.hidden || !$('.pp-bgd', ov); ov.hidden = false; ov.classList.remove('jp', 'jp8', 'jp9'); ov.style.setProperty('--rc', cur.k.c2 + '33'); ov.style.setProperty('--ro', '.5');
    ov.innerHTML = '<div class="pp-bgd"></div><div class="pp-rays"></div><div class="pp-dust">' + dust + '</div><button type="button" class="pp-skip" data-pp="skip">SKIP</button><div class="pp-st">' + packHtml(cur.k) + '</div><div class="pp-pips">' + cur.cards.map(() => '<i></i>').join('') + '</div><div class="pp-tip">절취선을 따라 옆으로 끌어 뜯으세요</div><div class="pp-fb"></div>' +
      (boxN ? '<div class="pp-dock">' + boxHtml(cur.k, Q.length, '') + '</div>' : '');
    const wr = $('.pp-wrap', ov), dock = $('.pp-dock', ov); let r0 = fromR; fromR = null; if (!r0 && dock) { const tr = $('.bx-in', dock).getBoundingClientRect(); r0 = { left: tr.left + tr.width * 0.3, top: tr.top, width: tr.width * 0.4, height: tr.height }; } /* 상자에서 한 팩을 꺼냄 */
    if (first) { $('.pp-bgd', ov).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' }); $('.pp-rays', ov).animate([{ opacity: 0 }, { opacity: 0.5 }], { duration: 600 }); } /* 주변이 어두워지며 */
    wr.style.animation = 'none'; const r1 = wr.getBoundingClientRect(), bob = () => { wr.style.animation = ''; };
    if (r0 && r0.width) { const sc = Math.min(1, r0.width / r1.width), dx = r0.left + r0.width / 2 - (r1.left + r1.width / 2), dy = r0.top + r0.height / 2 - (r1.top + r1.height / 2); /* 고른 팩이 그 자리에서 화면 가운데로 */
      wr.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(0deg)' }, { transform: 'translate(' + dx * 0.4 + 'px,' + (dy * 0.4 - 40) + 'px) scale(' + (sc + (1.08 - sc) * 0.7) + ') rotate(-5deg)', offset: 0.6 }, { transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.3,.8,.3,1)' }).onfinish = bob; setTimeout(() => sfx.land(), 560); }
    else { wr.animate([{ transform: 'translateY(120vh) rotate(-14deg) scale(.7)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,1.2,.4,1)' }).onfinish = bob; sfx.land(); }
    tearInit(ov);
  }
  function tearInit(ov) {
    const st = $('.pp-st', ov), wr = $('.pp-wrap', st), pk = $('.pp', st), top = $('svg.pp-top', pk), bot = $('svg.pp-bot', pk), hl = $('.pp-h.l', pk), hr = $('.pp-h.r', pk), strap = $('svg.pp-strap', pk), sg = $('g', strap); let dn = null, done = false, lastS = 0;
    const cut = document.createElement('i'); cut.className = 'pp-cut'; cut.style.setProperty('--gc', colOf(cur.fake)); if (glOf(cur.fake) === 'rb') cut.classList.add('rb'); pk.appendChild(cut);
    const hint = document.createElement('div'); hint.className = 'pp-hint'; hint.style.top = '3.5%'; hint.textContent = '→ 뜯기 →'; pk.appendChild(hint);
    const curl = (zone, p, rt) => { const el = zone === 'top' ? top : bot, r = bandD(zone, p, rt); el.querySelectorAll('path').forEach((e) => e.setAttribute('d', r.d)); const h = $('.hl', el); if (h) h.setAttribute('cy', String(TH * 0.44 + r.lc * 1.1)); };
    const peel = (p, dw) => { sg.innerHTML = strapQ(p, dw); hl.style.transform = 'translateX(' + (-p * 13) + '%) rotate(' + (-p * 2) + 'deg)'; hr.style.transform = 'translateX(' + (p * 13) + '%) rotate(' + (p * 2) + 'deg)'; };
    const open = (mode) => { if (done) return; done = true; sfx.rip(); hint.remove(); cut.remove(); $('.pp-fb', ov).innerHTML = ''; pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); wr.style.animation = 'none';
      stageBg(ov, cur.fake, true); burst(st, cur.fake, cur.fake >= 8); shake(ov, cur.fake >= 8 ? 12 : 6); setTimeout(() => sfx.tier(cur.fake), 130);
      const beam = document.createElement('i'); beam.className = 'pp-beam'; beam.style.setProperty('--gc', colOf(cur.fake)); if (glOf(cur.fake) === 'rb') beam.classList.add('rb'); st.appendChild(beam); beam.animate([{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 0.85, transform: 'scaleY(1)', offset: 0.25 }, { opacity: 0, transform: 'scaleY(1.1)' }], { duration: 900, easing: 'ease-out' }).onfinish = () => beam.remove();
      const fly = (el, tr, dl, du) => el.animate([{ transform: 'none' }, { transform: tr }], { duration: du || 440, delay: dl || 0, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
      if (mode === 'back') { fly(strap, 'translate(140%,-30%) rotate(50deg)', 0, 420); const tb = $('.pp-tab', pk); if (tb) tb.remove(); const sm0 = $('.pp-seam', pk); if (sm0) sm0.remove();
        setTimeout(() => { hl.animate([{ transform: hl.style.transform }, { transform: 'translate(-190%,8%) rotate(-26deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }); hr.animate([{ transform: hr.style.transform }, { transform: 'translate(190%,8%) rotate(26deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }); }, 140);
        setTimeout(() => cardsInit(ov, 'back'), 500); }
      else { fly(mode === 'top' ? top : bot, 'translate(70%,' + (mode === 'top' ? -420 : 420) + '%) rotate(' + (mode === 'top' ? 40 : -40) + 'deg)', 0, 460); setTimeout(() => cardsInit(ov, mode), 660); } }; /* 빛이 터지고 0.5초 뒤 카드가 나옴 */
    pk.addEventListener('pointerdown', (e) => { if (done) return; const r = pk.getBoundingClientRect(), back = pk.classList.contains('flip'), fy = (e.clientY - r.top) / r.height; const zone = back ? 'back' : fy < 0.3 ? 'top' : fy > 0.74 ? 'bot' : ''; if (!zone) return; dn = { x: e.clientX, y: e.clientY, zone, w: r.width, h: r.height }; pk.classList.add('live'); const tb = $('.pp-tab', pk); if (tb && back) tb.style.display = 'none'; try { pk.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    pk.addEventListener('pointermove', (e) => { if (done) return; const r = pk.getBoundingClientRect();
      if (!dn) { if (e.pointerType === 'mouse' && !pk.classList.contains('flip')) { pk.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 22).toFixed(1) + 'deg'); pk.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 14).toFixed(1) + 'deg'); } return; }
      const dx = e.clientX - dn.x, dy = e.clientY - dn.y;
      if (dn.zone === 'back') { const p = Math.min(1, Math.abs(dy) / (dn.h * 0.62)); peel(p, dy > 0); if (Math.abs(p - lastS) > 0.07) { lastS = p; sfx.tear(p); } if (p >= 0.97) open('back'); }
      else { const p = Math.min(1, Math.abs(dx) / (dn.w * 0.85)), rt = dx > 0; curl(dn.zone, p, rt);
        cut.style.top = dn.zone === 'top' ? 'calc(13% - 2px)' : 'calc(93.5% - 2px)'; cut.style.width = (p * 100) + '%'; cut.style.left = rt ? '0' : 'auto'; cut.style.right = rt ? 'auto' : '0'; if (Math.abs(p - lastS) > 0.07) { lastS = p; sfx.tear(p); } if (p >= 0.96) open(dn.zone); } });
    const up = () => { pk.classList.remove('live'); if (!dn || done) { dn = null; return; } const z = dn.zone; dn = null; lastS = 0; if (z === 'back') { peel(0, true); hl.style.transform = ''; hr.style.transform = ''; const tb = $('.pp-tab', pk); if (tb) tb.style.display = ''; } else curl(z, 0, true); cut.style.width = '0'; };
    pk.addEventListener('pointerup', up); pk.addEventListener('pointercancel', up); pk.addEventListener('pointerleave', () => { if (!dn && !done) { pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); } });
  }
  /* SSS 배경: 가챠 머신 DORO TIME 화면과 같은 구성(도는 무지개 + 바깥으로 흩날리는 꽃·빛줄기·점) */
  function rbCanvas(ov, ms) {
    const cv = document.createElement('canvas'); cv.className = 'pp-rb'; const bg = $('.pp-bgd', ov); (bg ? bg.after(cv) : ov.prepend(cv)); const c = cv.getContext('2d'), TAU = Math.PI * 2, t0 = performance.now(); let w = 0, h = 0, last = t0, t = 0;
    const fit = () => { const d = Math.min(0.75, (window.devicePixelRatio || 1) * 0.6); w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); c.setTransform(d, 0, 0, d, 0, 0); }; fit();
    const PAL = ['#ffd1ea', '#fff3a6', '#c9f7ff', '#ffd9a8', '#e3d0ff', '#d6ffd8'], BGC = ['#ff2f6d', '#ff9a1f', '#ffe838', '#3ff07a', '#22d3ff', '#3a6bff', '#b23dff', '#ff2fb4', '#ff2f6d'];
    const mk = (z) => ({ a: Math.random() * TAU, z: z == null ? Math.random() * 0.15 : z, v: 0.25 + Math.random() * 0.4, r: 14 + Math.random() * 22, rot: Math.random() * TAU, vr: Math.random() * 2 - 1, col: PAL[(Math.random() * PAL.length) | 0], fill: Math.random() < 0.3, len: 0.15 + Math.random() * 0.35, wd: 0.6 + Math.random() * 2.2 });
    const fl = [], ln = [], dots = []; for (let i = 0; i < 30; i++) fl.push(mk(Math.random())); for (let i = 0; i < 46; i++) ln.push(Object.assign(mk(Math.random()), { v: 1.2 + Math.random() * 1.6 })); for (let i = 0; i < 50; i++) dots.push(Object.assign(mk(Math.random()), { v: 0.4 + Math.random() * 0.9 }));
    requestAnimationFrame(() => { cv.style.opacity = '1'; });
    const draw = (now) => { if (!cv.isConnected) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; const cx = w / 2, cy = h * 0.44, R = Math.hypot(w, h) * 0.62;
      if (c.createConicGradient) { const g = c.createConicGradient(t * 0.7, cx, cy); BGC.forEach((col, i) => g.addColorStop(i / (BGC.length - 1), col)); c.fillStyle = g; } else c.fillStyle = '#ff2fb4'; c.globalAlpha = 1; c.fillRect(0, 0, w, h);
      const rg = c.createRadialGradient(cx, cy, 0, cx, cy, R); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.22, 'rgba(255,255,255,.4)'); rg.addColorStop(1, 'rgba(20,0,40,.35)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#fff'; ln.forEach((l) => { l.z += l.v * dt * 0.6; if (l.z > 1) { l.z = 0; l.a = Math.random() * TAU; } const r0 = l.z * R, r1 = Math.min(R, r0 + l.len * R * l.z); c.globalAlpha = 0.25 + 0.6 * l.z; c.lineWidth = l.wd * (0.5 + l.z); c.beginPath(); c.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0); c.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1); c.stroke(); });
      dots.forEach((d) => { d.z += d.v * dt * 0.5; if (d.z > 1) { d.z = 0; d.a = Math.random() * TAU; } c.globalAlpha = Math.min(1, d.z * 2); c.fillStyle = d.col; c.beginPath(); c.arc(cx + Math.cos(d.a) * d.z * R, cy + Math.sin(d.a) * d.z * R, d.wd * (0.6 + d.z * 1.6), 0, TAU); c.fill(); });
      fl.forEach((f) => { f.z += f.v * dt * 0.5; f.rot += f.vr * dt; if (f.z > 1) { Object.assign(f, mk(0)); } const x = cx + Math.cos(f.a) * f.z * R, y = cy + Math.sin(f.a) * f.z * R, r = f.r * (0.3 + f.z * 1.5); c.save(); c.translate(x, y); c.rotate(f.rot); c.globalAlpha = Math.min(1, f.z * 3); c.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; c.moveTo(0, 0); c.bezierCurveTo(Math.cos(a - 0.62) * r * 1.25, Math.sin(a - 0.62) * r * 1.25, Math.cos(a + 0.62) * r * 1.25, Math.sin(a + 0.62) * r * 1.25, 0, 0); } if (f.fill) { c.fillStyle = f.col; c.fill(); } c.lineWidth = Math.max(2, r * 0.22); c.strokeStyle = f.col; c.stroke(); c.lineWidth = Math.max(1, r * 0.07); c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke(); c.restore(); });
      if (now - t0 > ms) { cv.style.opacity = '0'; setTimeout(() => cv.remove(), 400); return; } requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
  }
  /* SS·SSS: 파칭코식 대박 연출(테두리 점멸, 지나가는 큰 글자, 쏟아지는 빛 조각, 번쩍임) */
  function jackpot(ov, c) {
    const tv = tvOf(c), big = tv >= 9, D = big ? 4200 : 2800; sfx.jack(tv); if (big) { const o0 = $('.pp-rb', ov); if (o0) o0.remove(); rbCanvas(ov, D + 2500); } ov.classList.remove('jp', 'jp8', 'jp9'); void ov.offsetWidth; ov.classList.add('jp', big ? 'jp9' : 'jp8'); clearTimeout(jackpot.t); jackpot.t = setTimeout(() => ov.classList.remove('jp', 'jp8', 'jp9'), D);
    const w = document.createElement('i'); w.className = 'pp-white'; ov.appendChild(w); w.animate([{ opacity: 0.9 }, { opacity: 0 }, { opacity: big ? 0.5 : 0.25, offset: 0.3 }, { opacity: 0 }], { duration: 700 }).onfinish = () => w.remove();
    const mq = document.createElement('div'); mq.className = 'pp-mq' + (big ? ' rb' : ''); mq.style.setProperty('--mc', '#ff3b3b'); mq.textContent = (c.x.t + '!! ').repeat(6); ov.insertBefore(mq, ov.firstChild.nextSibling); mq.animate([{ transform: 'translate(100vw,-50%)' }, { transform: 'translate(-100%,-50%)' }], { duration: D, easing: 'linear' }).onfinish = () => mq.remove();
    const N = big ? 70 : 36; for (let i = 0; i < N; i++) { const r = document.createElement('i'); r.className = 'pp-rn'; r.style.left = (Math.random() * 100) + '%'; r.style.setProperty('--gc', big ? 'hsl(' + Math.floor(Math.random() * 360) + ',100%,65%)' : (i % 2 ? '#ffd24a' : '#ff4b4b')); ov.appendChild(r);
      r.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translate(' + ((Math.random() * 2 - 1) * 120).toFixed(0) + 'px,110vh) rotate(' + (360 + Math.random() * 720).toFixed(0) + 'deg)' }], { duration: 1300 + Math.random() * 1500, delay: Math.random() * (D - 1500), easing: 'cubic-bezier(.3,0,.8,.6)' }).onfinish = () => r.remove(); }
    [0, 260, 520].slice(0, big ? 3 : 2).forEach((t, i) => setTimeout(() => { const st = $('.pp-st', ov); if (st) { burst(st, tv, i === 0); shake(ov, big ? 16 - i * 4 : 9 - i * 3); } }, t));
  }
  function cardsInit(ov, mode) {
    const st = $('.pp-st', ov), wr0 = $('.pp-wrap', st); [...st.children].forEach((e) => { if (e !== wr0) e.remove(); }); st.insertAdjacentHTML('afterbegin', '<div class="pp-glow"></div><div class="pp-cards"></div><div class="pp-stamp"></div><div class="pp-tag"></div>'); const host = $('.pp-cards', st), gl = $('.pp-glow', st), tag = $('.pp-tag', st), stamp = $('.pp-stamp', st), C = cur.cards, pips = ov.querySelectorAll('.pp-pips i'), tc = data().tierCol || {};
    $('.pp-tip', ov).textContent = '끌면 천천히, 누르면 빠르게 넘깁니다'; stageBg(ov, 0, false);
    const els = C.map((c, i) => { const w = document.createElement('div'); w.innerHTML = window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })); const e = w.firstElementChild; e.style.zIndex = String(20 - i); e.style.setProperty('--sx', (i * 0.7) + '%'); e.style.setProperty('--sy', (i * 0.6) + '%'); return e; });
    const cover = document.createElement('div'); cover.innerHTML = window.doroRaid.card(Object.assign({}, C[0].x, { cnt: 1 })); const cv = cover.firstElementChild; cv.classList.add('back'); cv.classList.remove('foil', 'poly'); cv.style.zIndex = '30'; /* 표지: 스틸 테두리의 카드 뒷면 */
    els.slice().reverse().forEach((e) => host.appendChild(e)); host.appendChild(cv);
    /* 카드는 팩 안에 들어 있다가, 팩이 벗겨지면서 드러남 */
    const sgn = mode === 'bot' ? 1 : -1, IN = 'translateY(' + (-sgn * 1.5) + '%) scale(.84)'; let ready = false;
    if (mode === 'back') { if (wr0) wr0.remove(); host.animate([{ transform: 'translateY(-3%) scale(.86)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,1.4,.4,1)' }); ready = true; sfx.land(); }
    else { /* ① 카드 뭉치가 입구로 쑥 올라옴(팩은 살짝 반대로 밀림) → ② 팩이 떨어져 나감 → ③ 카드가 가운데로 내려앉으며 커짐 */
      host.style.transform = IN; sfx.card();
      host.animate([{ transform: IN, easing: 'cubic-bezier(.2,.9,.3,1)' }, { transform: 'translateY(' + (sgn * 62) + '%) scale(.84)', offset: 0.42, easing: 'ease-in-out' }, { transform: 'translateY(' + (sgn * 66) + '%) scale(.86)', offset: 0.58, easing: 'cubic-bezier(.4,0,.2,1.2)' }, { transform: 'none' }], { duration: 1050, fill: 'both' }).onfinish = () => { host.style.transform = ''; ready = true; sfx.land(); };
      if (wr0) wr0.animate([{ transform: 'none', opacity: 1, easing: 'cubic-bezier(.2,.9,.3,1)' }, { transform: 'translateY(' + (-sgn * 12) + '%) rotate(' + (sgn * 1.5) + 'deg)', opacity: 1, offset: 0.42, easing: 'cubic-bezier(.6,0,.9,.5)' }, { transform: 'translate(' + (sgn * 30) + '%,' + (-sgn * 170) + '%) rotate(' + (-sgn * 24) + 'deg)', opacity: 0 }], { duration: 900, fill: 'forwards' }).onfinish = () => wr0.remove(); }
    let i = -1, top = cv, dn = null, fk = null; /* i: 지금 보이는 카드(-1 = 표지) */
    const setGlow = (tv, p) => { const col = glOf(tv); gl.classList.toggle('rb', col === 'rb'); if (col === 'rb') gl.style.removeProperty('--gc'); else gl.style.setProperty('--gc', col || 'rgba(255,255,255,.35)'); gl.style.setProperty('--gi', String(p)); };
    const plan = () => { const nx = C[i + 1]; if (!nx) { fk = null; return; } const tv = tvOf(nx), u = Math.random(); fk = tv >= 7 && u < 0.32 ? { a: tv - 1, b: tv, up: 1 } : tv <= 5 && u < 0.14 ? { a: 6 + (Math.random() < 0.3 ? 1 : 0), b: tv } : { a: tv, b: tv }; fk.said = 0; setGlow(fk.a, 0.08); };
    const show = (p) => { if (!fk) return; const late = p > 0.55, tv = late ? fk.b : fk.a; if (late && fk.up && !fk.said) { fk.said = 1; sfx.up(); burst(st, fk.b, false); shake(ov, 5); } setGlow(tv, late && !fk.up && fk.a !== fk.b ? p * 0.35 : p); };
    const label = () => { const c = C[i]; if (!c) { tag.textContent = ''; return; } tag.innerHTML = esc(c.x.n) + ' · ' + (c.dup ? '<span style="color:#ffd24a">골드칩 반환</span>' : c.cnt === 1 ? '<span style="color:#5ef0a0">NEW</span>' : c.cnt + '장'); };
    const slam = (c) => { const tv = tvOf(c); stamp.className = 'pp-stamp' + (tv >= 9 ? ' rb' : ''); stamp.style.color = tc[c.x.t] || '#fff'; stamp.textContent = c.x.t; stamp.getAnimations().forEach((a) => a.cancel()); stamp.animate(tv >= 6 ? [{ opacity: 0, transform: 'translateX(-50%) scale(3.2) rotate(-8deg)' }, { opacity: 1, transform: 'translateX(-50%) scale(.9)', offset: 0.35 }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: 0.5 }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }] : [{ opacity: 0, transform: 'translateX(-50%) scale(.8)' }, { opacity: 0.75, transform: 'translateX(-50%) scale(.62)' }], { duration: tv >= 6 ? 520 : 200, fill: 'forwards', easing: 'cubic-bezier(.2,1,.3,1)' }); };
    const leave = (dx, dy, fast) => { const el = top; if (!el) return; sfx.card(); const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; el.style.pointerEvents = 'none';
      el.animate([{ transform: getComputedStyle(el).transform }, { transform: 'translate(' + (ux * 900) + 'px,' + (uy * 900 - 60) + 'px) rotate(' + (ux * 40) + 'deg)' }], { duration: fast ? 240 : 380, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove();
      i++; top = els[i] || null; label(); if (!C[i]) { stamp.textContent = ''; setTimeout(() => summary([cur]), 200); return; }
      const c = C[i], tv = tvOf(c); setGlow(tv, tv >= 6 ? 1 : 0.15); stageBg(ov, tv, tv >= 6); if (tv < 8) sfx.tier(tv); slam(c); if (tv >= 8) jackpot(ov, c); else if (tv >= 6) { burst(st, tv, false); shake(ov, 4); } got.push(c);
      if (pips[i]) { pips[i].classList.add('on'); if (tv >= 9) pips[i].classList.add('rb'); pips[i].style.setProperty('--pc', glOf(tv) && glOf(tv) !== 'rb' ? glOf(tv) : '#cfd5da'); }
      if (top) top.animate([{ transform: 'translate(var(--sx,0),var(--sy,0)) scale(' + (tv >= 8 ? 1.16 : 1.06) + ')' }, { transform: 'translate(var(--sx,0),var(--sy,0)) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      if (i >= C.length - 1) { fk = null; $('.pp-tip', ov).textContent = '한 번 더 넘기면 결과를 봅니다'; return; } setTimeout(plan, 350); };
    host.addEventListener('pointerdown', (e) => { if (!ready || !top || !e.target.closest('.pk')) return; dn = { x: e.clientX, y: e.clientY, m: 0 }; try { host.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    host.addEventListener('pointermove', (e) => { if (!dn || !top) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y, d = Math.hypot(dx, dy); dn.m = Math.max(dn.m, d); dn.dx = dx; dn.dy = dy; const kr = 0.22 + 0.78 * Math.min(1, d / 150) * Math.min(1, d / 150), ex2 = dx * kr, ey2 = dy * kr, de = d * kr; /* 초반에는 묵직하게 버티다가 풀림 */ dn.e = de; top.style.transform = 'translate(' + ex2 + 'px,' + ey2 + 'px) rotate(' + (ex2 * 0.06) + 'deg)'; show(Math.min(1, de / 150)); });
    const up = () => { if (!dn || !top) { dn = null; return; } const d = dn; dn = null; if (d.m < 8) { show(1); leave(1, -0.15, true); } else if ((d.e || 0) > 80) leave(d.dx || 1, d.dy || 0, false); else { top.style.transform = ''; if (fk) setGlow(fk.a, 0.08); } };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    plan();
  }
  let sumT = 0;
  function summary(packs) {
    const ov = $('.pp-ov', root), all = [], multi = packs.length > 1; packs.forEach((p) => p.cards.forEach((c) => all.push(c))); if (!multi) all.sort((a, b) => tvOf(b) - tvOf(a)); /* 여러 팩: 열리는 순서 그대로 */
    const gold = all.filter((c) => c.dup).length, nw = all.filter((c) => !c.dup && c.cnt === 1).length, best = all.reduce((m, c) => Math.max(m, tvOf(c)), 0), k = lastBuy && KINDS.find((x) => x.k === lastBuy.kind);
    ov.classList.remove('jp', 'jp8', 'jp9'); stageBg(ov, multi ? 0 : best, !multi && best >= 7); ['.pp-st', '.pp-pips', '.pp-skip', '.pp-fb', '.pp-tip', '.pp-sbox', '.pp-mq'].concat(boxN && (multi || Q.length) ? [] : ['.pp-dock']).forEach((q) => { const e = $(q, ov); if (e) e.remove(); });
    const box = document.createElement('div'); box.className = 'pp-sbox'; box.style.cssText = 'display:contents';
    const fin = '<div class="pp-fb">' + (Q.length ? '<button type="button" data-pp="next">다음 팩 (' + Q.length + ')</button><button type="button" class="g" data-pp="all">모두 열기</button>' : (k ? '<button type="button" class="o" data-pp="again">한 번 더 ' + chip(k.r ? 'r' : 'b', 15) + fmt(lastBuy.n > 1 ? k.box : k.price) + '</button>' : '') + '<button type="button" class="g" data-pp="close">확인</button>') + '</div>';
    box.innerHTML = '<div class="pp-tip" style="font-size:15px;opacity:1">' + all.length + '장' + (nw ? ' · <span style="color:#5ef0a0">NEW ' + nw + '</span>' : '') + (gold ? ' · <span style="color:#ffd24a">골드칩 ' + gold + '개 반환</span>' : '') + '</div><div class="pp-sum">' + all.map((c) => '<div style="--gc:' + colOf(tvOf(c)) + '"><div class="' + (tvOf(c) >= 7 ? 'hi' : '') + '">' + window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })) + '</div>' + (c.dup ? '<em>골드칩</em>' : c.cnt === 1 ? '<em class="n">NEW</em>' : '<em>' + c.cnt + '장</em>') + '</div>').join('') + '</div><div class="pp-fb"><button type="button" class="g" data-pp="fast">건너뛰기</button></div>';
    ov.appendChild(box); const lf = $('.pp-left', ov); if (lf) lf.textContent = Q.length ? '남은 팩 ' + Q.length : '';
    const sum = $('.pp-sum', box), cells = [...sum.children], run = ++sumT; let i = 0, hot = 0; const dock = $('.pp-dock', ov), dk = multi && dock ? packs[0].k : null, setDock = (n) => { if (dk && dock.isConnected) dock.innerHTML = boxHtml(dk, n, ''); }; if (multi) setDock(packs.length);
    const end = () => { setDock(0); cells.forEach((e) => e.classList.add('in')); const fb = $('.pp-fb', box); if (fb) fb.outerHTML = fin; };
    summary.fast = () => { sumT++; end(); };
    const step = () => { if (run !== sumT || !box.isConnected) return; if (i >= cells.length) { end(); if (best >= 8) sfx.tier(best); return; }
      const el = cells[i], c = all[i], tv = tvOf(c); el.classList.add('in'); sum.scrollTop = Math.max(0, el.offsetTop - sum.clientHeight + el.offsetHeight + 40); sfx.deal(multi ? (i % 24) + hot : i * 2); /* 이어지며 음이 올라감 */
      let wait = multi ? 120 : 90; /* 일정한 빠르기 */
      if (tv >= 7) { hot++; const rg = document.createElement('i'); rg.className = 'pp-rg'; rg.style.setProperty('--gc', colOf(tv)); if (glOf(tv) === 'rb') rg.classList.add('rb'); rg.style.zIndex = '9'; el.appendChild(rg); rg.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(' + (tv >= 9 ? 9 : tv >= 8 ? 7 : 5) + ')', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => rg.remove();
        shake(sum, tv >= 9 ? 7 : tv >= 8 ? 5 : 3); sfx.tier(tv); wait = tv >= 9 ? 900 : tv >= 8 ? 650 : 400; /* 연출이 끝난 뒤 이어서 */ }
      i++; if (i % 5 === 1) setDock(packs.length - Math.ceil(i / 5)); /* 한 팩(5장)을 열 때마다 상자에서 한 팩이 줄어듦 */ setTimeout(step, wait); };
    setTimeout(step, 150);
  }
  function onClick(e) {
    const od = e.target.closest('[data-odds]'); if (od) { const k = KINDS.find((x) => x.k === od.dataset.odds), m = $('.pp-odm', root); if (k && m) { m.innerHTML = oddsHtml(k); m.hidden = false; } return; }
    if (e.target.closest('[data-oddsx]') || e.target.classList.contains('pp-odm')) { const m = $('.pp-odm', root); if (m) m.hidden = true; return; }
    const b = e.target.closest('[data-buy]'); if (b) { onBuy(b.dataset.buy, +b.dataset.n > 1 ? +b.dataset.n : 1, b); return; }
    const p = e.target.closest('[data-pp]'); if (!p) return; const a = p.dataset.pp;
    if (a === 'flip') { const pk = $('.pp-st .pp', root); if (pk) { pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); pk.classList.toggle('flip'); sfx.card(); const h = $('.pp-hint', root); if (h) h.style.display = pk.classList.contains('flip') ? 'none' : ''; } }
    else if (a === 'skip') { if (cur) summary([cur]); }
    else if (a === 'fast') { if (summary.fast) summary.fast(); }
    else if (a === 'next') nextPack();
    else if (a === 'all') { const rest = Q.splice(0); summary(rest); }
    else if (a === 'again') { if (lastBuy) onBuy(lastBuy.kind, lastBuy.n); }
    else if (a === 'close') { cur = null; boxN = 0; $('.pp-ov', root).hidden = true; shop(); }
  }
  window.doroPack = { rainbow: (el, ms) => rbCanvas(el, ms), art(kind) { if (!document.getElementById('pack-css')) { const s0 = document.createElement('style'); s0.id = 'pack-css'; s0.textContent = CSS; document.head.appendChild(s0); } return packHtml(KINDS.find((x) => x.k === kind) || KINDS[0]); }, mount(el) {
    if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; } if (!d.list.length || !window.doroRaid) { setTimeout(() => window.doroPack.mount(el), 400); return; }
    if (!document.getElementById('pack-css')) { const s = document.createElement('style'); s.id = 'pack-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (root !== el) { root = el; el.addEventListener('click', onClick); window.addEventListener('dorochips', () => { if (root && root.isConnected && !cur && $('.pp-ov', root) && $('.pp-ov', root).hidden && !busy) shop(); }); }
    if (!cur) shop();
  } };
})();
