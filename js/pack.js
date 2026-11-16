/* DOROSYNC 카드팩 (관리자 전용 · 미공개)
   1팩 5장 · 1박스 30팩 · 일반/기업팩 100싱크칩(일반 박스 10% 할인) · 필그림팩 5 DORO칩
   배포 사이트: 서버(/raid a=pack)가 뽑아 계정에 기록 · 미리보기: 이 기기에서만 뽑는 연습용
   풀코강(11장)을 넘는 카드는 골드칩 1개(싱크칩 10)로 돌려줌 */
(() => {
  'use strict';
  const PROD = /github\.io$/.test(location.hostname), TS = { SSS: 9, SS: 8, S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
  const TW = { 9: 2, 8: 5, 7: 10, 6: 16, 5: 20, 4: 18, 3: 14, 2: 9, 1: 6 }; /* 티어별 확률 가중치(서버와 같게) */
  const PCO = ['엘리시온', '미실리스', '테트라', '어브노멀'];
  const KINDS = [{ k: 'std', nm: '일반팩', sub: '필그림 제외 전체', c1: '#3b4658', c2: '#8fa3bd', price: 100, box: 2700 }]
    .concat(PCO.map((c, i) => ({ k: 'co:' + c, co: c, nm: c + ' 팩', sub: c + ' 니케만', c1: ['#12406e', '#5a2a12', '#6b1f4d', '#2d2d33'][i], c2: ['#4da3ff', '#ff9a3d', '#ff6fb5', '#b9bcc6'][i], price: 100, box: 3000 })))
    .concat([{ k: 'pil', co: '필그림', nm: '필그림 팩', sub: '필그림 니케만', c1: '#1a1408', c2: '#e8c35a', price: 5, box: 150, r: 1 }]);
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
  const sfx = {
    tear: (p) => { noise(0.045, 0.09, 5200 + (p || 0) * 2500, 0, 'highpass'); metal(2400 + (p || 0) * 1800, 0.04, 0.012, 0); }, /* 호일이 찢기는 소리, 갈수록 높아짐 */
    rip: () => { noise(0.28, 0.2, 2600, 0, 'highpass'); metal(420, 0.5, 0.07, 0.02); metal(1260, 0.35, 0.03, 0.05); tone(70, 0.3, 0.14, 0); },
    card: () => { noise(0.11, 0.1, 6200, 0); metal(1900, 0.09, 0.022, 0.02); }, /* 쇠 카드가 미끄러짐 */
    land: () => { metal(820, 0.16, 0.04, 0); noise(0.03, 0.08, 2400, 0); },
    tier: (tv) => { if (tv >= 9) { [0, 4, 7, 12, 16, 19].forEach((st, i) => metal(620 * Math.pow(2, st / 12), 0.7, 0.06, i * 0.085)); tone(62, 0.9, 0.16, 0); noise(0.5, 0.08, 7000, 0.1, 'highpass'); } else if (tv >= 6) { for (let i = 0; i <= tv - 6; i++) metal(520 * Math.pow(2, [0, 4, 7][i] / 12) * (tv >= 8 ? 1.19 : 1), 0.5, 0.055, i * 0.09); tone(80, 0.3, tv >= 8 ? 0.12 : 0.06, 0); } else metal(300, 0.12, 0.03, 0); },
    up: () => { metal(1040, 0.3, 0.06, 0); metal(1560, 0.5, 0.06, 0.09); }, deal: (i) => metal(700 + i * 60, 0.08, 0.02, 0), buy: () => { metal(640, 0.2, 0.05, 0); metal(960, 0.3, 0.05, 0.08); } };
  /* ---------- 뽑기 ---------- */
  function rollLocal(kind) { /* 미리보기 전용 */
    const k = KINDS.find((x) => x.k === kind), L = data().list.filter((x) => (k.r ? x.c === '필그림' : k.co ? x.c === k.co : x.c !== '필그림'));
    const by = {}; L.forEach((x) => { const tv = TS[x.t] || 1; (by[tv] = by[tv] || []).push(x); }); const tvs = Object.keys(by), tot = tvs.reduce((a, t) => a + TW[t], 0);
    const one = () => { let u = Math.random() * tot; for (const t of tvs) { u -= TW[t]; if (u <= 0) return by[t][Math.floor(Math.random() * by[t].length)]; } return by[tvs[0]][0]; };
    return [0, 1, 2, 3, 4].map(() => { const x = one(), dup = window.doroDex.count(x.n) >= 11; if (!dup) window.doroDex.add(x.n, 1); return [x.code, dup ? 1 : 0, dup ? 11 : window.doroDex.count(x.n)]; });
  }
  async function buy(kind, n) {
    const k = KINDS.find((x) => x.k === kind), price = n === 30 ? k.box : k.price;
    if (PROD) { const j = await window.doroRaid.api('pack', { kind, n }); const a = window.doroAccount; if (a && a.doc) a.doc.dex = j.dex; if (window.doroChips.sync) window.doroChips.sync(j.chips); return j.packs; }
    if (!k.r && !window.doroChips.spend(price)) throw new Error('chips'); /* 미리보기: DORO칩 팩은 차감 없이 체험 */
    const packs = []; let gold = 0; for (let i = 0; i < n; i++) { const p = rollLocal(kind); gold += p.filter((c) => c[1]).length; packs.push(p); }
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
.pp{position:relative;width:var(--pw);aspect-ratio:9/14.6;transform-style:preserve-3d;transform:rotateY(calc(var(--fy,0deg) + var(--ry,0deg))) rotateX(var(--rx,0deg));transition:transform .35s cubic-bezier(.3,1.3,.5,1);touch-action:none;user-select:none;-webkit-user-select:none}
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
`;
  const packHtml = (k) => { const d = data(), ico = k.co && d.coIco && d.coIco[k.co];
    const face = '<div class="pp-frame"></div><div class="pp-ttl"><small>DOROSYNC</small>' + (k.r ? 'PILGRIM' : k.co ? 'CORP' : 'NIKKE') + '<br>CARD PACK</div><div class="pp-ring"><i><b>' + (k.r ? 'P' : 'N') + '</b></i></div>' + (ico ? '<img class="pp-co" alt="" src="' + ico + '">' : '') + '<div class="pp-n">5 CARDS<br>' + esc(k.nm) + '</div>';
    return '<div class="pp-wrap"><div class="pp' + (k.r ? ' pil' : '') + '" style="--c1:' + k.c1 + ';--c2:' + k.c2 + '"><div class="pp-f"><div class="pp-all"><div class="pp-top pp-skin"></div><div class="pp-body pp-skin">' + face + '</div><div class="pp-bot pp-skin"></div></div></div><div class="pp-b"><div class="pp-all"><div class="pp-h l pp-skin"></div><div class="pp-h r pp-skin"></div></div><div class="pp-seam"></div><div class="pp-tab">뜯기</div></div></div></div>'; };
  function shop() {
    const o = window.doroChips ? window.doroChips.get() : { r: 0 }, bal = window.doroChips ? window.doroChips.total() : 0, tc = data().tierCol || {};
    root.innerHTML = '<div class="card"><div class="row-ctl sp"><h2 class="inline">카드팩</h2><div class="pp-bal"><span>' + chip('b', 20) + fmt(bal) + '</span><span>' + chip('r', 20) + fmt((o && o.r) || 0) + '</span></div></div>' +
      '<div class="pp-shop">' + KINDS.map((k) => '<div class="pp-it" style="--c2:' + k.c2 + '">' + packHtml(k) + '<b>' + esc(k.nm) + '</b><small>' + esc(k.sub) + '</small><div class="pp-buy"><button type="button" class="primary" data-buy="' + esc(k.k) + '" data-n="1">' + chip(k.r ? 'r' : 'b', 14) + fmt(k.price) + '</button><button type="button" class="ghost" data-buy="' + esc(k.k) + '" data-n="30">박스 ' + chip(k.r ? 'r' : 'b', 14) + fmt(k.box) + '</button></div></div>').join('') + '</div>' +
      '<div class="pp-odds">' + Object.keys(TS).map((t) => '<span><b style="color:' + (tc[t] || 'inherit') + '">' + t + '</b> ' + TW[TS[t]] + '%</span>').join('') + '<span>· 1팩 5장 · 1박스 30팩 · 풀코강 초과분은 골드칩' + (PROD ? '' : ' · 미리보기: 연습용') + '</span></div><p class="muted sm pp-msg" style="margin-top:8px"></p></div>' +
      '<div class="pp-ov" hidden></div>';
  }
  const DBc = () => { const m = {}; data().list.forEach((x) => { m[String(x.code)] = x; }); return m; };
  const ERR = { chips: '칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' };
  const tvOf = (c) => TS[c.x.t] || 1;
  let lastBuy = null;
  async function onBuy(kind, n) {
    if (busy) return; busy = true; const msg = $('.pp-msg', root); if (msg) msg.textContent = '';
    try { const packs = await buy(kind, n), DB = DBc(); lastBuy = { kind, n }; sfx.buy();
      Q = packs.map((p) => ({ k: KINDS.find((x) => x.k === kind), cards: p.map((c) => ({ x: DB[String(c[0])], dup: !!c[1], cnt: c[2] || 1, o: 0 })).filter((c) => c.x) }));
      Q.forEach((p) => { p.cards.forEach((c) => { c.o = tvOf(c) + Math.random() * 2.6; }); p.cards.sort((a, b) => a.o - b.o); }); /* 낮은 확률(높은 티어)일수록 뒤에 나올 가능성이 큼 */
      got = []; busy = false; nextPack(); }
    catch (e) { busy = false; const t = ERR[e && e.message] || '카드팩을 열지 못했습니다. (' + ((e && e.message) || e) + ')'; const ov = $('.pp-ov', root); if (ov && !ov.hidden) { cur = null; ov.hidden = true; shop(); } const m2 = $('.pp-msg', root); if (m2) m2.textContent = t; }
  }
  const colOf = (tv) => { const c = glOf(tv); return c === 'rb' ? '#fff' : c || '#cfd5da'; };
  const stageBg = (ov, tv, on) => { const c = glOf(tv); ov.style.setProperty('--rc', c && c !== 'rb' ? c + '55' : c === 'rb' ? 'rgba(255,220,140,.4)' : 'rgba(255,255,255,.07)'); ov.style.setProperty('--ro', on ? '1' : '.5'); };
  function burst(st, tv, big) { const col = glOf(tv), f = document.createElement('i'); f.className = 'pp-fl'; f.style.background = col === 'rb' ? RBG : (col || '#fff'); st.appendChild(f);
    f.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.95, filter: 'blur(6px)' }, { transform: 'translate(-50%,-50%) scale(' + (big ? 80 : 40) + ')', opacity: 0, filter: 'blur(14px)' }], { duration: big ? 950 : 600, easing: 'ease-out' }).onfinish = () => f.remove();
    const rg = document.createElement('i'); rg.className = 'pp-rg'; rg.style.setProperty('--gc', colOf(tv)); st.appendChild(rg); rg.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(' + (big ? 16 : 9) + ')', opacity: 0 }], { duration: big ? 800 : 520, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => rg.remove();
    const N = tv >= 9 ? 34 : tv >= 8 ? 22 : tv >= 6 ? 12 : 6; for (let i = 0; i < N; i++) { const s = document.createElement('i'); s.className = 'pp-sp'; const a = Math.random() * 6.283, r = 120 + Math.random() * (big ? 320 : 200), hue = tv >= 9 ? 'hsl(' + Math.floor(Math.random() * 360) + ',100%,70%)' : colOf(tv); s.style.setProperty('--gc', hue); st.appendChild(s);
      s.animate([{ transform: 'translate(0,0) scale(1.6)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * r).toFixed(0) + 'px,' + (Math.sin(a) * r + 60).toFixed(0) + 'px) scale(.2)', opacity: 0 }], { duration: 600 + Math.random() * 600, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => s.remove(); } }
  const shake = (ov, m) => { try { const k = [{ transform: 'none' }]; for (let i = 0; i < 7; i++) k.push({ transform: 'translate(' + ((Math.random() * 2 - 1) * m).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * m).toFixed(1) + 'px)' }); k.push({ transform: 'none' }); $('.pp-st', ov).animate(k, { duration: 60 * 8 }); if (navigator.vibrate) navigator.vibrate(m > 8 ? [30, 20, 60] : 20); } catch (e) { /* 무시 */ } };
  function nextPack() {
    cur = Q.shift(); const ov = $('.pp-ov', root); if (!cur) { ov.hidden = true; shop(); return; }
    const best = Math.max.apply(null, cur.cards.map(tvOf)); cur.best = best; cur.fake = best >= 7 && Math.random() < 0.3 ? best - 1 - (Math.random() < 0.4 ? 1 : 0) : best; /* 페이크: 뜯을 때는 한두 단계 낮은 빛 */
    let dust = ''; for (let i = 0; i < 26; i++) dust += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;--dx:' + ((Math.random() * 2 - 1) * 80).toFixed(0) + 'px;--t:' + (6 + Math.random() * 8).toFixed(1) + 's;--d:-' + (Math.random() * 14).toFixed(1) + 's"></i>';
    ov.hidden = false; ov.style.setProperty('--rc', cur.k.c2 + '33'); ov.style.setProperty('--ro', '.5');
    ov.innerHTML = '<div class="pp-rays"></div><div class="pp-dust">' + dust + '</div><span class="pp-left">' + (Q.length ? '남은 팩 ' + Q.length : '') + '</span><button type="button" class="pp-skip" data-pp="skip">SKIP</button><div class="pp-st">' + packHtml(cur.k) + '</div><div class="pp-pips">' + cur.cards.map(() => '<i></i>').join('') + '</div><div class="pp-tip">절취선을 따라 옆으로 끌어 뜯거나, 뒤집어서 가운데를 잡아 뜯으세요</div><div class="pp-fb"><button type="button" class="g" data-pp="flip">↻ 뒤집기</button></div>';
    const wr = $('.pp-wrap', ov); wr.animate([{ transform: 'translateY(120vh) rotate(-14deg) scale(.7)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,1.2,.4,1)' }); sfx.land();
    tearInit(ov);
  }
  function tearInit(ov) {
    const st = $('.pp-st', ov), wr = $('.pp-wrap', st), pk = $('.pp', st), top = $('.pp-top', pk), bot = $('.pp-bot', pk), body = $('.pp-body', pk), hl = $('.pp-h.l', pk), hr = $('.pp-h.r', pk); let dn = null, done = false, lastS = 0;
    const cut = document.createElement('i'); cut.className = 'pp-cut'; cut.style.setProperty('--gc', colOf(cur.fake)); pk.appendChild(cut);
    const hint = document.createElement('div'); hint.className = 'pp-hint'; hint.style.top = '0'; hint.textContent = '→ 뜯기 →'; pk.appendChild(hint);
    const open = (mode) => { if (done) return; done = true; sfx.rip(); hint.remove(); cut.remove(); $('.pp-fb', ov).innerHTML = ''; pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); wr.style.animation = 'none';
      stageBg(ov, cur.fake, true); burst(st, cur.fake, cur.fake >= 8); shake(ov, cur.fake >= 8 ? 12 : 6); setTimeout(() => sfx.tier(cur.fake), 130);
      const beam = document.createElement('i'); beam.className = 'pp-beam'; beam.style.setProperty('--gc', colOf(cur.fake)); st.appendChild(beam); beam.animate([{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 0.85, transform: 'scaleY(1)', offset: 0.25 }, { opacity: 0, transform: 'scaleY(1.1)' }], { duration: 900, easing: 'ease-out' }).onfinish = () => beam.remove();
      const fly = (el, tr, dl) => el.animate([{ transform: el.style.transform || 'none' }, { transform: tr }], { duration: 440, delay: dl || 0, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
      if (mode === 'back') { fly(hl, 'translate(-170%,12%) rotate(-30deg)'); fly(hr, 'translate(170%,12%) rotate(30deg)'); $('.pp-tab', pk).remove(); $('.pp-seam', pk).remove(); }
      else if (mode === 'bot') { fly(bot, 'translate(60%,300%) rotate(-50deg)'); const up = document.createElement('div'); fly(body, 'translateY(-150%)', 240); fly(top, 'translateY(-1500%)', 240); void up; }
      else { fly(top, 'translate(60%,-300%) rotate(50deg)'); fly(body, 'translateY(150%)', 240); fly(bot, 'translateY(1500%)', 240); }
      setTimeout(() => cardsInit(ov), mode === 'back' ? 400 : 640); };
    pk.addEventListener('pointerdown', (e) => { if (done) return; const r = pk.getBoundingClientRect(), back = pk.classList.contains('flip'), fy = (e.clientY - r.top) / r.height; const zone = back ? 'back' : fy < 0.28 ? 'top' : fy > 0.72 ? 'bot' : ''; if (!zone) return; dn = { x: e.clientX, y: e.clientY, zone, w: r.width }; pk.classList.add('live'); try { pk.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    pk.addEventListener('pointermove', (e) => { if (done) return; const r = pk.getBoundingClientRect();
      if (!dn) { if (e.pointerType === 'mouse' && !pk.classList.contains('flip')) { pk.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 22).toFixed(1) + 'deg'); pk.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 14).toFixed(1) + 'deg'); } return; }
      const dx = e.clientX - dn.x, dy = e.clientY - dn.y;
      if (dn.zone === 'back') { const p = Math.min(1, Math.hypot(dx, dy) / (dn.w * 0.55)); hl.style.transform = 'translateX(' + (-p * 14) + '%) rotate(' + (-p * 5) + 'deg)'; hr.style.transform = 'translateX(' + (p * 14) + '%) rotate(' + (p * 5) + 'deg)'; if (p - lastS > 0.1) { lastS = p; sfx.tear(p); } if (p >= 1) open('back'); }
      else { const p = Math.min(1, Math.abs(dx) / (dn.w * 0.85)), el = dn.zone === 'top' ? top : bot, sg = dn.zone === 'top' ? -1 : 1, rt = dx > 0; el.style.transformOrigin = (rt ? '100% ' : '0 ') + (dn.zone === 'top' ? '100%' : '0'); el.style.transform = 'rotate(' + (rt ? 1 : -1) * sg * p * 15 + 'deg) translateY(' + (sg * p * 22) + '%)';
        cut.style.top = dn.zone === 'top' ? 'calc(9.5% - 2px)' : 'calc(90.5% - 2px)'; cut.style.width = (p * 100) + '%'; cut.style.left = rt ? '0' : 'auto'; cut.style.right = rt ? 'auto' : '0'; if (p - lastS > 0.08) { lastS = p; sfx.tear(p); } if (p >= 0.95) open(dn.zone); } });
    const up = () => { pk.classList.remove('live'); if (!dn || done) { dn = null; return; } dn = null; lastS = 0; top.style.transform = ''; bot.style.transform = ''; hl.style.transform = ''; hr.style.transform = ''; cut.style.width = '0'; };
    pk.addEventListener('pointerup', up); pk.addEventListener('pointercancel', up); pk.addEventListener('pointerleave', () => { if (!dn && !done) { pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); } });
  }
  function cardsInit(ov) {
    const st = $('.pp-st', ov); st.innerHTML = '<div class="pp-glow"></div><div class="pp-cards"></div><div class="pp-stamp"></div><div class="pp-tag"></div>'; const host = $('.pp-cards', st), gl = $('.pp-glow', st), tag = $('.pp-tag', st), stamp = $('.pp-stamp', st), C = cur.cards, pips = ov.querySelectorAll('.pp-pips i'), tc = data().tierCol || {};
    $('.pp-tip', ov).textContent = '끌면 천천히, 누르면 빠르게 넘깁니다'; stageBg(ov, 0, false);
    const els = C.map((c, i) => { const w = document.createElement('div'); w.innerHTML = window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })); const e = w.firstElementChild; e.style.zIndex = String(20 - i); e.style.setProperty('--sx', (i * 0.7) + '%'); e.style.setProperty('--sy', (i * 0.6) + '%'); return e; });
    const cover = document.createElement('div'); cover.innerHTML = window.doroRaid.card(Object.assign({}, C[0].x, { cnt: 1 })); const cv = cover.firstElementChild; cv.classList.add('back'); cv.classList.remove('foil', 'poly'); cv.style.zIndex = '30'; /* 표지: 스틸 테두리의 카드 뒷면 */
    els.slice().reverse().forEach((e) => host.appendChild(e)); host.appendChild(cv);
    host.animate([{ transform: 'translateY(40%) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)' }); sfx.land();
    let i = -1, top = cv, dn = null, fk = null; /* i: 지금 보이는 카드(-1 = 표지) */
    const setGlow = (tv, p) => { const col = glOf(tv); gl.classList.toggle('rb', col === 'rb'); if (col === 'rb') gl.style.removeProperty('--gc'); else gl.style.setProperty('--gc', col || 'rgba(255,255,255,.35)'); gl.style.setProperty('--gi', String(p)); };
    const plan = () => { const nx = C[i + 1]; if (!nx) { fk = null; return; } const tv = tvOf(nx), u = Math.random(); fk = tv >= 7 && u < 0.32 ? { a: tv - 1, b: tv, up: 1 } : tv <= 5 && u < 0.14 ? { a: 6 + (Math.random() < 0.3 ? 1 : 0), b: tv } : { a: tv, b: tv }; fk.said = 0; setGlow(fk.a, 0.08); };
    const show = (p) => { if (!fk) return; const late = p > 0.55, tv = late ? fk.b : fk.a; if (late && fk.up && !fk.said) { fk.said = 1; sfx.up(); burst(st, fk.b, false); shake(ov, 5); } setGlow(tv, late && !fk.up && fk.a !== fk.b ? p * 0.35 : p); };
    const label = () => { const c = C[i]; if (!c) { tag.textContent = ''; return; } tag.innerHTML = esc(c.x.n) + ' · ' + (c.dup ? '<span style="color:#ffd24a">골드칩 반환</span>' : c.cnt === 1 ? '<span style="color:#5ef0a0">NEW</span>' : c.cnt + '장'); };
    const slam = (c) => { const tv = tvOf(c); stamp.className = 'pp-stamp' + (tv >= 9 ? ' rb' : ''); stamp.style.color = tc[c.x.t] || '#fff'; stamp.textContent = c.x.t; stamp.getAnimations().forEach((a) => a.cancel()); stamp.animate(tv >= 6 ? [{ opacity: 0, transform: 'translateX(-50%) scale(3.2) rotate(-8deg)' }, { opacity: 1, transform: 'translateX(-50%) scale(.9)', offset: 0.35 }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: 0.5 }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }] : [{ opacity: 0, transform: 'translateX(-50%) scale(.8)' }, { opacity: 0.75, transform: 'translateX(-50%) scale(.62)' }], { duration: tv >= 6 ? 520 : 200, fill: 'forwards', easing: 'cubic-bezier(.2,1,.3,1)' }); };
    const leave = (dx, dy, fast) => { const el = top; if (!el) return; sfx.card(); const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; el.style.pointerEvents = 'none';
      el.animate([{ transform: getComputedStyle(el).transform }, { transform: 'translate(' + (ux * 900) + 'px,' + (uy * 900 - 60) + 'px) rotate(' + (ux * 40) + 'deg)' }], { duration: fast ? 240 : 380, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove();
      i++; top = els[i] || null; label(); if (!C[i]) { stamp.textContent = ''; setTimeout(() => summary([cur]), 200); return; }
      const c = C[i], tv = tvOf(c); setGlow(tv, tv >= 6 ? 1 : 0.15); stageBg(ov, tv, tv >= 6); sfx.tier(tv); slam(c); if (tv >= 6) { burst(st, tv, tv >= 9); shake(ov, tv >= 9 ? 16 : tv >= 8 ? 10 : 4); } got.push(c);
      if (pips[i]) { pips[i].classList.add('on'); if (tv >= 9) pips[i].classList.add('rb'); pips[i].style.setProperty('--pc', glOf(tv) && glOf(tv) !== 'rb' ? glOf(tv) : '#cfd5da'); }
      if (top) top.animate([{ transform: 'translate(var(--sx,0),var(--sy,0)) scale(' + (tv >= 8 ? 1.16 : 1.06) + ')' }, { transform: 'translate(var(--sx,0),var(--sy,0)) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      if (i >= C.length - 1) { fk = null; $('.pp-tip', ov).textContent = '한 번 더 넘기면 결과를 봅니다'; return; } setTimeout(plan, 350); };
    host.addEventListener('pointerdown', (e) => { if (!top || !e.target.closest('.pk')) return; dn = { x: e.clientX, y: e.clientY, m: 0 }; try { host.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    host.addEventListener('pointermove', (e) => { if (!dn || !top) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y, d = Math.hypot(dx, dy); dn.m = Math.max(dn.m, d); dn.dx = dx; dn.dy = dy; top.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.06) + 'deg)'; show(Math.min(1, d / 170)); });
    const up = () => { if (!dn || !top) { dn = null; return; } const d = dn; dn = null; if (d.m < 8) { show(1); leave(1, -0.15, true); } else if (d.m > 95) leave(d.dx || 1, d.dy || 0, false); else { top.style.transform = ''; if (fk) setGlow(fk.a, 0.08); } };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    plan();
  }
  function summary(packs) {
    const ov = $('.pp-ov', root), all = []; packs.forEach((p) => p.cards.forEach((c) => all.push(c))); all.sort((a, b) => tvOf(b) - tvOf(a));
    const gold = all.filter((c) => c.dup).length, nw = all.filter((c) => !c.dup && c.cnt === 1).length, best = all.length ? tvOf(all[0]) : 0, k = lastBuy && KINDS.find((x) => x.k === lastBuy.kind);
    stageBg(ov, best, best >= 7); $('.pp-st', ov) && $('.pp-st', ov).remove(); const pp = $('.pp-pips', ov); if (pp) pp.remove(); const sk = $('.pp-skip', ov); if (sk) sk.remove(); const fb0 = $('.pp-fb', ov); if (fb0) fb0.remove(); const tp = $('.pp-tip', ov); if (tp) tp.remove();
    const ob = $('.pp-sbox', ov); if (ob) ob.remove(); const box = document.createElement('div'); box.className = 'pp-sbox'; box.style.cssText = 'display:contents';
    box.innerHTML = '<div class="pp-tip" style="font-size:15px;opacity:1">' + all.length + '장' + (nw ? ' · <span style="color:#5ef0a0">NEW ' + nw + '</span>' : '') + (gold ? ' · <span style="color:#ffd24a">골드칩 ' + gold + '개 반환</span>' : '') + '</div><div class="pp-sum">' + all.map((c, i) => '<div style="--i:' + Math.min(i, 24) + ';--gc:' + colOf(tvOf(c)) + '"><div class="' + (tvOf(c) >= 7 ? 'hi' : '') + '">' + window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })) + '</div>' + (c.dup ? '<em>골드칩</em>' : c.cnt === 1 ? '<em class="n">NEW</em>' : '<em>' + c.cnt + '장</em>') + '</div>').join('') + '</div>' +
      '<div class="pp-fb">' + (Q.length ? '<button type="button" data-pp="next">다음 팩 (' + Q.length + ')</button><button type="button" class="g" data-pp="all">모두 열기</button>' : (k ? '<button type="button" class="o" data-pp="again">한 번 더 ' + chip(k.r ? 'r' : 'b', 15) + fmt(lastBuy.n === 30 ? k.box : k.price) + '</button>' : '') + '<button type="button" class="g" data-pp="close">확인</button>') + '</div>';
    ov.appendChild(box); all.slice(0, 10).forEach((c, i) => setTimeout(() => sfx.deal(i), i * 70)); if (best >= 8) setTimeout(() => sfx.tier(best), 200);
    const lf = $('.pp-left', ov); if (lf) lf.textContent = Q.length ? '남은 팩 ' + Q.length : '';
  }
  function onClick(e) {
    const b = e.target.closest('[data-buy]'); if (b) { onBuy(b.dataset.buy, +b.dataset.n === 30 ? 30 : 1); return; }
    const p = e.target.closest('[data-pp]'); if (!p) return; const a = p.dataset.pp;
    if (a === 'flip') { const pk = $('.pp-st .pp', root); if (pk) { pk.style.setProperty('--rx', '0deg'); pk.style.setProperty('--ry', '0deg'); pk.classList.toggle('flip'); sfx.card(); const h = $('.pp-hint', root); if (h) h.style.display = pk.classList.contains('flip') ? 'none' : ''; } }
    else if (a === 'skip') { if (cur) summary([cur]); }
    else if (a === 'next') nextPack();
    else if (a === 'all') { const rest = Q.splice(0); summary(rest); }
    else if (a === 'again') { if (lastBuy) onBuy(lastBuy.kind, lastBuy.n); }
    else if (a === 'close') { cur = null; $('.pp-ov', root).hidden = true; shop(); }
  }
  window.doroPack = { mount(el) {
    if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; } if (!d.list.length || !window.doroRaid) { setTimeout(() => window.doroPack.mount(el), 400); return; }
    if (!document.getElementById('pack-css')) { const s = document.createElement('style'); s.id = 'pack-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (root !== el) { root = el; el.addEventListener('click', onClick); window.addEventListener('dorochips', () => { if (root && root.isConnected && !cur && $('.pp-ov', root) && $('.pp-ov', root).hidden && !busy) shop(); }); }
    if (!cur) shop();
  } };
})();
