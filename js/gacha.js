/* DOROSYNC 가챠 머신 v3 — 독립 모듈. DoroGacha.mount(root, {assets, pools, stock, tiers}) */
(function () {
  'use strict';
  const GM_ALL = []; /* 열린 가챠 머신들(보관함 확인용) */
  const lsg = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, lss = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 무시 */ } };
  const DM = { on: lsg('dsgm-doro') === '1' }; /* DORO MODE: DORO칩으로만 뽑기(1칩 = 1뽑), 2배속 AUTO 고정 */
  const DCLK = { v: +lsg('dsgm-dclk') || 0, saved: 0 }; /* DORO MODE 게임 시계(ms): COMBO·DORO TIME은 이 시계로 흐름(기기 속도와 상관없이 같은 환수율) */
  const W = 960, H = 956, TAU = Math.PI * 2;
  const TRICO = 'assets/img/f2b148d53e13.png';
  const CT = { x: 150, y: 78, w: 660, h: 384, r: 44 }, IN = { x0: 158, x1: 802, y0: 88, y1: 454, r: 40 };  // 볼록한 사각 통
  const BAN = { cx: 480, cy: 268, w: 470, h: 264.4 }, BLK = { x: 272, y: 172, w: 416, h: 196 };
  const LIDR = { x: 134, y: 30, w: 692, h: 56 }, BODY = { x: 150, y: 452, w: 660, h: 272 };
  const BK = { x0: 4, x1: 956, y0: 754, y1: 949 };
  const CR = 19, YR = 23, OR = 27, CAP = 220, GRAV = 1500, NDOME = 150, TAPN = 6;
  const COL = { R: ['#2f7df6', '#cfe1ff'], SR: ['#a04df0', '#ead6ff'], SSR: ['#ffc21a', '#ffe88f'], Q: ['#7d8797', '#d5dae3'] };
  const LVC = ['#4f9bff', '#b06bff', '#ffd24d'], TIERC = { SSS: '#ff4d6d', SS: '#ff8a3c', S: '#ffd93d', A: '#9be15d', B: '#5ad1ff', C: '#8fb0ff', D: '#b79bff', E: '#b9c0cc', F: '#8a93a3', '-': '#5d6574' }, TV = { SSS: 15000, SS: 8000, S: 4000, A: 2000 };
  const LABEL = { R: 150, SR: 200 }, PER = { jw: 3000, pick: 10, norm: 10 };
  const LED = { x: 176, y: 492, w: 150, h: 48 }, CH = { x: 176, y: 548, w: 150, h: 148 }, LV = { x: 480, y: 587, r: 89 };
  const SLOT = { bill: { x: 634, y: 492, w: 150, h: 58 }, coin: { x: 634, y: 558, w: 150, h: 138 } };
  const SLIT = { x: 709, y: 516, w: 112 }, HOLE = { x: 709, y: 624, s: 78 }, TKR = 300 / 185;
  const DSLOT = { w: 12, h: 84 }; /* DORO 동전 투입구: 폭 = 칩 두께 */
  const HUDP = { x: 856, y: 788 }, RV = { x: 480, y: 392, r: 112 };
  const CORP = { '엘리시온': 'ely', '미실리스': 'mis', '테트라': 'tet', '필그림': 'pil' };
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }, eout = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const pick = (L) => L[Math.floor(Math.random() * L.length)];
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function mkc(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

  const CSS = `
.gm{--gold:#ffc21a;display:grid;grid-template-columns:min(50%,calc((100vh - var(--gm-top,84px)) * 1.0042)) minmax(0,1fr);gap:12px;align-items:start;color:#eef3fb;font-family:inherit;user-select:none;-webkit-user-select:none}
.gm *{box-sizing:border-box}
.gm-left{width:100%;position:relative;border-radius:16px;overflow:hidden;background:#10141d;border:1px solid #2a3348;box-shadow:0 6px 24px rgba(0,0,0,.35)}
.gm-cv{display:block;width:100%;height:auto;touch-action:none}
.gm-hud{position:absolute;left:85.6%;top:51.5%;width:13.4%;display:grid;gap:6px;justify-items:center;text-align:center}
.gm-lab{display:grid;justify-items:center;gap:2px;width:100%;padding:8px 4px;border-radius:12px;background:rgba(10,14,22,.78);border:1px solid rgba(255,255,255,.14)}
.gm-lab img{width:44px;height:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
.gm-lab small{font-size:11px;color:#aeb9cc}.gm-lab b{font-size:16px;font-variant-numeric:tabular-nums;transition:transform .12s}
.gm-lab.bump b{transform:scale(1.25);color:#fff}
.gm-btn{appearance:none;border:0;border-radius:10px;padding:8px 4px;font-weight:800;font-size:12.5px;cursor:pointer;color:#1b1400;background:linear-gradient(#ffd24d,#ffb21c);box-shadow:0 2px 0 #b97800,0 4px 10px rgba(0,0,0,.35);width:100%}
.gm-btn:active{transform:translateY(2px);box-shadow:0 0 0 #b97800}
.gm-btn.blue{color:#fff;background:linear-gradient(#5aa9ff,#2f7df6);box-shadow:0 2px 0 #184aa8,0 4px 10px rgba(0,0,0,.35)}
.gm-refill{position:absolute;left:85.6%;top:9%;width:13.4%}
.gm-tools{position:absolute;left:1.2%;top:1.4%;display:grid;gap:6px;width:13%}
.gm-tb{appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,22,.7);color:#dfe7f5;border-radius:9px;padding:5px 8px;font-size:12.5px;font-weight:700;cursor:pointer}
.gm-tb:hover{background:rgba(40,52,80,.9)}
.gm-how{position:absolute;left:1.2%;top:51.5%;width:13.4%;display:grid;gap:6px;font-size:11px;line-height:1.4;color:#c5cfdf;pointer-events:none}
.gm-how div{padding:6px 7px;border-radius:10px;background:rgba(10,14,22,.78);border:1px solid rgba(255,255,255,.1)}
.gm-how b{color:var(--gold)}
.gm-right{display:grid;gap:10px;min-width:0}
.gm-wal{position:relative;height:230px;border-radius:12px;overflow:hidden;border:1.5px solid #3d8bff;background:radial-gradient(120% 90% at 50% 0%,#24304a 0%,#1a1f2b 60%,#16191f 100%)}
.gm-wcv{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;cursor:grab}
.gm-wt{position:relative;padding:12px 14px;pointer-events:none;text-shadow:0 0 2px #000,0 0 6px rgba(0,0,0,.9)}
.gm-wt small{display:block;color:#c9d2e0;font-size:12.5px;font-weight:600}
.gm-jw{display:flex;align-items:center;gap:8px;font-size:44px;line-height:1.15;color:#5aa9ff;font-weight:800;font-variant-numeric:tabular-nums}
.gm-jw img{height:36px;filter:drop-shadow(0 0 6px rgba(90,169,255,.5))}
.gm-chips{display:flex;gap:10px;margin-top:5px}
.gm-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(10,14,22,.62);border:1px solid rgba(255,255,255,.14);padding:2px 10px 2px 5px;border-radius:10px;font-weight:700;font-size:17.5px;font-variant-numeric:tabular-nums}
.gm-chip img{height:26px}
.gm-pulls{margin-top:7px;font-weight:700;font-size:17.5px}
.gm-mode{position:absolute;right:10px;top:38px;display:grid;gap:5px}
.gm-seg{display:flex;gap:4px;flex-wrap:wrap}
.gm-mode button,.gm-seg button{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(10,14,22,.7);color:#dfe7f5;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12.5px}
.gm-mode button.on,.gm-seg button.on{background:#3d8bff;border-color:#3d8bff;color:#fff}
.gm-opt{display:grid;gap:7px;background:#171c28;border:1px solid #2a3348;border-radius:12px;padding:9px 11px}
.gm-opt>div{display:flex;align-items:center;gap:8px}.gm-opt small{flex:none;width:54px;font-size:11.5px;color:#9eaac0;font-weight:700}
.gm-stat{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.gm-stat div{background:#171c28;border:1px solid #2a3348;border-radius:10px;padding:6px 4px;text-align:center}
.gm-stat small{display:block;font-size:11px;color:#9eaac0}.gm-stat b{font-size:15px;font-variant-numeric:tabular-nums}
.gm-tray{border-radius:14px;padding:11px;background:linear-gradient(#2b2f38,#1b1e25);border:1px solid #3a404d;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.gm-trh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:800;font-size:14px}
.gm-trr{display:inline-flex;gap:8px;align-items:center}.gm-chipbal{cursor:pointer}
.gm-tray{position:relative}
.gm-spread{position:absolute;z-index:7;left:8px;right:8px;top:40px;bottom:8px;border-radius:12px;background:rgba(10,13,20,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;animation:gmSpIn .2s ease-out}
@keyframes gmSpIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.gm-spg{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:100%;max-width:330px;padding:0 6px}
.gm-spc{position:relative;aspect-ratio:1;perspective:260px}.gm-spc .gm-orb{inset:4%}
.gm-spn{font-size:12px;color:#9eaac0;min-height:16px}.gm-skip{position:absolute;right:10px;top:10px;display:inline-flex;align-items:center;gap:5px;font-weight:800;letter-spacing:.04em}.gm-odds{position:absolute;z-index:8;top:44px;right:8px;left:8px;padding:10px 12px;border-radius:14px;background:rgba(12,16,26,.97);border:1px solid rgba(240,160,32,.5);box-shadow:0 10px 30px rgba(0,0,0,.6);color:#e9edf5;font-size:12px}
.gm-oddh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.gm-odds table{width:100%;border-collapse:collapse}.gm-odds th,.gm-odds td{padding:4px 3px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07);font-variant-numeric:tabular-nums}
.gm-odds tbody th{text-align:left;font-weight:700;white-space:nowrap}.gm-odds th small{display:block;font-weight:400;opacity:.6;font-size:10px}.gm-odds thead th{text-align:right}.gm-odds thead th svg{display:inline-block}.gm-odds td.z{opacity:.35}.gm-odds p{margin:8px 0 0;opacity:.7;font-size:11px;line-height:1.5}.gm-flipall{white-space:nowrap}
.gm-chipbal{display:inline-flex;align-items:center;gap:5px;padding:3px 10px 3px 5px;border-radius:999px;background:rgba(10,14,22,.75);border:1px solid rgba(240,160,32,.55);font-size:13.5px;font-variant-numeric:tabular-nums;color:#ffd58a}
.gm-chipbal b{display:inline-block;transition:transform .1s}.gm-chipbal svg{display:block}.gm-cbr{display:inline-flex;align-items:center;gap:4px;margin-left:6px;color:#e6d9ff}.gm-cbr[hidden]{display:none}
.gm-chipbal.bump{animation:gmBal .16s ease-out}.gm-chipbal.bump .gm-cbn,.gm-cbr.bump b{transform:scale(1.28);color:#fff}
@keyframes gmBal{0%{box-shadow:0 0 0 0 rgba(255,190,70,.9)}100%{box-shadow:0 0 0 7px rgba(255,190,70,0)}}
.gm-chipfly{position:fixed;z-index:9999;pointer-events:none;will-change:transform}
.gm-c3l{width:var(--cs);height:var(--cs);border-radius:50%;background:center/100% 100% no-repeat;background-color:#b8780e;box-shadow:0 2px 3px rgba(0,0,0,.4);animation:gmC3L .9s linear infinite}
@keyframes gmC3L{0%{transform:rotate(-18deg) scaleX(1)}12.5%{transform:rotate(-18deg) scaleX(.72)}25%{transform:rotate(-18deg) scaleX(.12)}37.5%{transform:rotate(-18deg) scaleX(-.72)}50%{transform:rotate(-18deg) scaleX(-1)}62.5%{transform:rotate(-18deg) scaleX(-.72)}75%{transform:rotate(-18deg) scaleX(-.12)}87.5%{transform:rotate(-18deg) scaleX(.72)}100%{transform:rotate(-18deg) scaleX(1)}}.gm-chipfly svg{display:block}
.gm-c3{width:var(--cs);height:var(--cs);perspective:calc(var(--cs) * 6);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
.gm-c3r{position:relative;width:100%;height:100%;transform-style:preserve-3d;--ct:calc(var(--cs) * .13);animation:gmC3Spin .9s linear infinite}
.gm-c3r>i{position:absolute;inset:0;border-radius:50%;background:linear-gradient(rgba(10,10,20,var(--dk)),rgba(10,10,20,var(--dk))),linear-gradient(90deg,#6d727a,#e4e7ec 30%,#9ea4ad 55%,#f1f3f6 75%,#70757d)}
.gm-c3-g .gm-c3r>i{background:linear-gradient(rgba(10,10,20,var(--dk)),rgba(10,10,20,var(--dk))),linear-gradient(90deg,#8a6508,#fff3b0 30%,#d9a520 55%,#fff6c8 75%,#8a6508)}.gm-c3-r .gm-c3r>i{background:linear-gradient(rgba(10,10,20,var(--dk)),rgba(10,10,20,var(--dk))),conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f)}
.gm-c3f{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:translateZ(calc(var(--ct) * .5 + .3px)) scale(.93)}.gm-c3b{transform:rotateY(180deg) translateZ(calc(var(--ct) * .5 + .3px)) scale(.93)}.gm-c3f svg{width:100%;height:100%;display:block}
@keyframes gmC3Spin{from{transform:rotateX(24deg) rotateY(0deg)}to{transform:rotateX(24deg) rotateY(360deg)}}
.gm-pan{display:grid;grid-template-columns:repeat(var(--cols,4),1fr);align-content:start;flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;gap:8px;padding:10px;border-radius:12px;background:#15171c;box-shadow:inset 0 2px 8px rgba(0,0,0,.7)}
.gm-well{position:relative;perspective:240px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 35%,#0c0d10 0%,#1d2027 70%,#30343e 100%);box-shadow:inset 0 5px 9px rgba(0,0,0,.85),0 1px 0 rgba(255,255,255,.1)}
.gm-well.over{box-shadow:inset 0 5px 9px rgba(0,0,0,.85),0 0 0 3px var(--gold)}
.gm-cf,.gm-float.orb{background:center/cover no-repeat,radial-gradient(circle at 50% 30%,#fff6d8,#d9b35a)}
.gm-orb{position:absolute;inset:5%;border-radius:50%;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.4,0,.3,1.2);cursor:pointer;touch-action:none}.gm-orb.pop{animation:gmIn .35s cubic-bezier(.2,1.6,.4,1)}
.gm-orb.under{top:11%;bottom:-1%;cursor:default}.gm-orb.under .gm-cf{filter:brightness(.62)}.gm-orb.lift{top:0;bottom:10%}.gm-orb.lift .gm-cf{box-shadow:inset 0 0 0 1px rgba(60,35,0,.55),inset 0 -5px 9px rgba(0,0,0,.38),inset 0 4px 7px rgba(255,255,255,.22),0 0 0 3.8px rgba(50,28,0,.7),0 7px 10px rgba(0,0,0,.7)}
.gm-orb.top{animation:none;transform:rotateX(0deg) rotateY(0deg)}.gm-orb.top.lift{animation:none}
.gm-orb.flip.shine{animation:gmShine .5s ease-out forwards}
.gm-orb.shine-s .gm-cb{box-shadow:0 0 10px 3px rgba(225,235,250,.95)}.gm-orb.shine-g .gm-cb{box-shadow:0 0 12px 4px rgba(255,214,80,.95)}.gm-orb.shine-r .gm-cb{box-shadow:0 0 14px 5px rgba(200,140,255,.95)}
@keyframes gmShine{0%{scale:1}60%{scale:1.16}100%{scale:1.12}}
.gm-orb.flip{transform:rotateX(var(--tx,0deg)) rotateY(calc(180deg + var(--ty,0deg)));animation:none}
.gm-orb.sss{transition:none;z-index:2}
.gm-orb.glow .gm-ce,.gm-orb.glow .gm-cf,.gm-orb.glow .gm-cb{transition:box-shadow .25s}
.gm-orb.glow.st-s .gm-ce,.gm-orb.glow.st-s .gm-cf,.gm-orb.glow.st-s .gm-cb{box-shadow:0 0 4px 1px rgba(235,242,252,.55),0 0 9px 2px rgba(190,205,225,.35)}
.gm-orb.glow.st-s .gm-ce{background:linear-gradient(90deg,#e9eef5,#c3ccd8 40%,#e9eef5 60%,#9aa4b2)}
.gm-orb.glow.st-g .gm-ce,.gm-orb.glow.st-g .gm-cf,.gm-orb.glow.st-g .gm-cb{animation:gmGlowG 1.1s ease-in-out infinite alternate}
.gm-orb.glow.st-g .gm-ce{background:linear-gradient(90deg,#fff3b0,#ffd23f 40%,#fff8d6 60%,#f6b40e)}
.gm-orb.glow.st-r .gm-ce,.gm-orb.glow.st-r .gm-cf,.gm-orb.glow.st-r .gm-cb{animation:gmGlowR 1.2s linear infinite}
.gm-orb.glow.st-r .gm-ce{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff)}
@keyframes gmGlowG{from{box-shadow:0 0 4px 1px #ffe27a,0 0 10px 3px rgba(255,200,60,.7)}to{box-shadow:0 0 7px 2px #fff1b0,0 0 18px 6px rgba(255,200,60,.9)}}
@keyframes gmGlowR{0%{box-shadow:0 0 6px 2px #ff5d8f,0 0 16px 5px #ffb84d}25%{box-shadow:0 0 6px 2px #f6f05a,0 0 16px 5px #5ef0a0}50%{box-shadow:0 0 6px 2px #5ef0a0,0 0 16px 5px #5ab8ff}75%{box-shadow:0 0 6px 2px #5ab8ff,0 0 16px 5px #b47cff}100%{box-shadow:0 0 6px 2px #ff5d8f,0 0 16px 5px #ffb84d}}
.gm-sssp{position:fixed;z-index:9999;pointer-events:none;border-radius:50%;box-shadow:0 0 6px currentColor}
.gm-cf,.gm-cb{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.gm-cf{transform:translateZ(calc(var(--ot) * .5 + .4px)) scale(.94);box-shadow:inset 0 0 0 1px rgba(60,35,0,.55),inset 0 -5px 9px rgba(0,0,0,.38),inset 0 4px 7px rgba(255,255,255,.22),0 0 0 3.8px rgba(50,28,0,.7),0 3px 8px rgba(0,0,0,.6)}
/* 노랑 테두리 2.5D 마감: 금속 금테(위 밝고 아래 어두운 베벨) + 바깥·안쪽 어두운 경계 */
.gm-cf::before{content:"";position:absolute;inset:-3px;z-index:1;border-radius:50%;pointer-events:none;background:linear-gradient(160deg,#fff6c4 0%,#ffd84a 22%,#f5bd22 50%,#e0a010 72%,#a86f06 100%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4.2px),#000 calc(100% - 3.6px));mask:radial-gradient(farthest-side,transparent calc(100% - 4.2px),#000 calc(100% - 3.6px));box-shadow:inset 0 0 0 .6px rgba(40,22,0,.7)}
.gm-cb{transform:rotateY(180deg) translateZ(calc(var(--ot) * .5 + .4px)) scale(.94)}.gm-cb svg{position:absolute;left:-4%;top:-4%;width:108%;height:108%;display:block}
.gm-ce{position:absolute;inset:-1px;border-radius:50%;background:linear-gradient(90deg,#6d727a,#e4e7ec 30%,#9ea4ad 55%,#f1f3f6 75%,#70757d)}
.gm-orb{--ot:7px}.gm-spc .gm-orb{--ot:9px}.gm-ce::after{content:"";position:absolute;inset:0;border-radius:50%;background:rgba(10,12,20,var(--dk,0))}
.gm-orb.pu .gm-cf{box-shadow:0 0 0 2.5px #fff,0 0 12px 3px #ff7ad9,0 3px 8px rgba(0,0,0,.6)}
.gm-cf::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.55),rgba(255,255,255,0) 38%)}
.gm-orb i,.gm-float.orb i{position:absolute;right:-7px;bottom:-4px;z-index:2;font-style:normal;font-size:12px;font-weight:800;background:#11141b;border:1px solid #ffc21a;color:#ffc21a;border-radius:9px;padding:0 6px;white-space:nowrap}
.gm-orb u{position:absolute;left:-6px;top:-4px;z-index:2;text-decoration:none;font-size:11px;font-weight:900;background:#11141b;border-radius:8px;padding:0 5px;border:1px solid currentColor}
.gm-orb.merge{animation:gmMerge .4s}
.gm-cnt{position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);z-index:5;font-size:12px;font-weight:800;line-height:16px;background:#11141b;border:1px solid #ffc21a;color:#ffc21a;border-radius:9px;padding:0 6px;white-space:nowrap;pointer-events:none}
.gm-rbcut{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(12,4,28,.6);animation:gmRbBg .25s ease-out both;cursor:default;overflow:hidden;touch-action:none;user-select:none}
.gm-rbcut.hit{animation:gmRbShake .6s}
.gm-rbcut.ok{cursor:pointer}.gm-rbcut.leave{background:transparent;transition:background .35s;pointer-events:none}.gm-rbcut.leave .gm-rbcv,.gm-rbcut.leave .gm-rbtx,.gm-rbcut.leave .gm-rbtap,.gm-rbcut.leave .gm-rbfl,.gm-rbcut.leave .gm-rbcnt{opacity:0!important;transition:opacity .35s;animation:none}.gm-rbcut.leave .gm-rbch::before{opacity:0;transition:opacity .3s}
.gm-rbcv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0}.gm-rbcut.hit .gm-rbcv{opacity:1}
.gm-rbfl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:6}.gm-rbcut.hit .gm-rbfl{animation:gmRbFlash 1.1s ease-out both}
.gm-rbtx{position:absolute;top:8%;left:0;right:0;display:grid;justify-items:center;font:400 clamp(50px,14.5vw,190px)/1.1 Bungee,'Arial Black',Impact,sans-serif;letter-spacing:.03em;transform:skewX(-7deg);pointer-events:none;z-index:3}
.gm-rbtx>span{grid-area:1/1;white-space:nowrap;padding:0 .2em;position:relative}.gm-rbtx>span b{display:inline-block;font-weight:400;opacity:0}
.gm-rbcut.hit .gm-rbtx>span b{animation:gmRbDrop .34s calc(.12s + var(--i) * .07s) cubic-bezier(.3,1.5,.5,1) both}
.gm-rbtx .ta{z-index:1;color:#5a3402;-webkit-text-stroke:.24em #5a3402;text-shadow:0 .03em 0 #4a2a01,0 .06em 0 #3d2201,0 .09em 0 #2e1900,0 .12em 0 #221200,0 .2em .25em rgba(40,0,60,.7)}
.gm-rbtx .tb{z-index:2;color:#f7c844;-webkit-text-stroke:.19em #e7aa1c;text-shadow:0 -.025em 0 #fff6c2,0 .025em 0 #b37406}
.gm-rbtx .tc{z-index:3;color:#fff4b8;-webkit-text-stroke:.115em #ffe57a;top:-.018em}
.gm-rbtx .td{z-index:4;color:#140a1e;-webkit-text-stroke:.075em #140a1e}
.gm-rbtx .te{z-index:5;animation:gmRbHue 3s linear infinite}
.gm-rbtx .te b{color:transparent;-webkit-text-fill-color:transparent;background:repeating-conic-gradient(from 8deg at 35% 42%,rgba(255,255,255,.42) 0 14deg,rgba(255,255,255,.08) 14deg 31deg,rgba(20,0,60,.2) 31deg 44deg,transparent 44deg 60deg) 0 0/.82em 1.1em,repeating-conic-gradient(from 40deg at 60% 65%,rgba(255,255,255,.25) 0 22deg,transparent 22deg 47deg,rgba(0,30,80,.14) 47deg 70deg,transparent 70deg 90deg) .3em .4em/1.3em 1.5em,linear-gradient(90deg,#ff3f8e,#ff9e2c,#f8ee3c,#40f08e,#2fc4ff,#6a6bff,#c04bff,#ff3f8e) calc(var(--i) * -.95em) 0/8.6em 100%;-webkit-background-clip:text;background-clip:text}
.gm-rbtx .tf{z-index:6}.gm-rbtx .tf b{color:transparent;-webkit-text-fill-color:transparent;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.95) 50%,transparent 65%) 0 0/300% 100% no-repeat;-webkit-background-clip:text;background-clip:text}
.gm-rbcut.hit .gm-rbtx .tf b{animation:gmRbDrop .34s calc(.12s + var(--i) * .07s) cubic-bezier(.3,1.5,.5,1) both,gmRbGlint 2.2s calc(1s + var(--i) * .06s) ease-in-out infinite}
.gm-rbch{position:relative;top:10%;--cs:min(260px,50vw);--ct:calc(var(--cs) * .12);pointer-events:none;z-index:4}
.gm-rbch::before{content:"";position:absolute;inset:-35%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,240,255,.5) 38%,transparent 68%);opacity:0}.gm-rbcut.hit .gm-rbch::before{opacity:1;animation:gmRbPulse 1.2s ease-in-out infinite alternate}
.gm-rbsw{position:absolute;left:50%;top:50%;width:var(--cs);height:var(--cs);margin:calc(var(--cs) / -2) 0 0 calc(var(--cs) / -2);border-radius:50%;border:7px solid #fff;box-shadow:0 0 18px 4px rgba(255,255,255,.9),inset 0 0 18px 4px rgba(255,200,255,.8);opacity:0;pointer-events:none}
.gm-rbcut.hit .gm-rbsw{animation:gmRbWave .9s cubic-bezier(.1,.6,.3,1) both}.gm-rbcut.hit .gm-rbsw:nth-child(2){animation-delay:.12s;border-color:#ffe36a}.gm-rbcut.hit .gm-rbsw:nth-child(3){animation-delay:.24s;border-color:#9ad8ff}
.gm-rbtl{perspective:1100px;transform:rotateX(14deg);transform-style:preserve-3d}
.gm-rbsp{position:relative;width:var(--cs);height:var(--cs);transform-style:preserve-3d}.gm-rbcut.hit .gm-rbsp{animation:gmRbRot 4s 1.6s ease-in-out infinite}
.gm-rbsp>i{position:absolute;inset:0;border-radius:50%;background:linear-gradient(rgba(10,0,25,var(--dk)),rgba(10,0,25,var(--dk))),conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.gm-rbf{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:translateZ(calc(var(--ct) * .5 + .5px)) scale(.925)}.gm-rbf svg{width:100%;height:100%;display:block}.gm-rbbk{transform:rotateY(180deg) translateZ(calc(var(--ct) * .5 + .5px)) scale(.925)}
.gm-rbcnt{position:absolute;bottom:15%;left:0;right:0;display:flex;justify-content:center;align-items:baseline;gap:.25em;opacity:0;pointer-events:none;z-index:5;transform:skewX(-7deg)}
.gm-rbcut.hit .gm-rbcnt{animation:gmRbCnt .35s .85s cubic-bezier(.3,1.6,.5,1) both}
.gm-rbcnt b{font:400 clamp(34px,8vw,84px)/1 Bungee,'Arial Black',Impact,sans-serif;color:#ffe680;-webkit-text-stroke:.05em #7a4a03;paint-order:stroke fill;text-shadow:0 .04em 0 #b8790c,0 .08em 0 #7a4a03,0 .14em .2em rgba(40,0,60,.6),0 0 .4em rgba(255,230,120,.8);font-variant-numeric:tabular-nums}
.gm-rbcnt span{font:900 clamp(17px,3.4vw,34px)/1 system-ui,sans-serif;color:#fff;-webkit-text-stroke:.14em #3a145e;paint-order:stroke fill;text-shadow:0 .1em .2em rgba(40,0,60,.6)}
.gm-rbcnt.done b{animation:gmRbPop .4s cubic-bezier(.3,1.8,.5,1)}
.gm-rbtap{position:absolute;bottom:6%;left:0;right:0;text-align:center;color:#fff;font-weight:900;font-size:0;letter-spacing:.12em;opacity:0;pointer-events:none;z-index:5}.gm-rbtap::before{content:'- 탭하여 계속 -';font-size:17px;display:inline-block;padding:7px 20px;border-radius:20px;background:rgba(20,8,40,.62);box-shadow:0 0 0 1px rgba(255,255,255,.35),0 4px 18px rgba(60,0,100,.35)}
.gm-rbcut.ok .gm-rbtap{animation:gmRbBlink 1.1s ease-in-out infinite}
@keyframes gmRbBg{from{opacity:0}to{opacity:1}}
@keyframes gmRbFlash{0%{opacity:1}12%{opacity:.15}20%{opacity:.75}45%{opacity:0}100%{opacity:0}}
@keyframes gmRbShake{0%,100%{transform:none}8%{transform:translate(-18px,12px) rotate(-.6deg)}18%{transform:translate(16px,-14px) rotate(.5deg)}30%{transform:translate(-12px,-8px)}42%{transform:translate(10px,8px)}56%{transform:translate(-6px,4px)}72%{transform:translate(3px,-2px)}}
@keyframes gmRbDrop{0%{opacity:0;transform:translateY(-.5em) scale(2.8)}60%{opacity:1;transform:translateY(.04em) scale(.88)}100%{opacity:1;transform:none}}
@keyframes gmRbGlint{0%{background-position:150% 0}45%,100%{background-position:-50% 0}}
@keyframes gmRbHue{to{filter:hue-rotate(360deg)}}
@keyframes gmRbWave{0%{transform:scale(.6);opacity:1}100%{transform:scale(4.2);opacity:0}}
@keyframes gmRbCnt{from{opacity:0;transform:skewX(-7deg) scale(2.2)}to{opacity:1;transform:skewX(-7deg) scale(1)}}
@keyframes gmRbPop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes gmRbPulse{from{transform:scale(.9);opacity:.7}to{transform:scale(1.12);opacity:1}}
@keyframes gmRbRot{0%{transform:rotateY(0)}25%,50%{transform:rotateY(180deg)}75%,100%{transform:rotateY(360deg)}}
@keyframes gmRbBlink{0%,100%{opacity:.35}50%{opacity:1}}
.gm-demo{white-space:nowrap;padding-left:7px!important;padding-right:7px!important}
.gm-demob{position:absolute;right:8px;top:44px;z-index:30;display:flex;flex-direction:column;gap:5px;padding:9px;border-radius:12px;background:rgba(14,16,22,.96);box-shadow:0 8px 24px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.12)}.gm-demob b{font-size:12px;color:#ffd24d;margin-bottom:2px}.gm-demob .gm-tb{text-align:left;white-space:nowrap}
.gm-gpop{position:fixed;z-index:9998;pointer-events:none;width:0;height:0}
.gm-gpop i{position:absolute;left:calc(var(--sz) / -2);top:calc(var(--sz) / -2);width:var(--sz);height:var(--sz);border-radius:50%;border:3px solid #ffd84a;box-shadow:0 0 14px 4px rgba(255,200,60,.8),inset 0 0 10px rgba(255,230,140,.8);animation:gmGring .7s cubic-bezier(.1,.7,.3,1) forwards}.gm-gpop i+i{animation-delay:.12s;border-color:#fff3b0}
.gm-gpop b{position:absolute;left:0;top:calc(var(--sz) * -.55);transform:translate(-50%,-50%);font:900 calc(var(--sz) * .42)/1 system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap;background:linear-gradient(180deg,#fffbe0,#ffd84a 45%,#d98f00);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.06em #5a3402;paint-order:stroke fill;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6)) drop-shadow(0 0 8px rgba(255,200,60,.8));animation:gmGtxt 1.25s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes gmGring{from{transform:scale(.7);opacity:1}to{transform:scale(2.4);opacity:0}}
@keyframes gmGtxt{0%{transform:translate(-50%,-10%) scale(.3);opacity:0}25%{transform:translate(-50%,-50%) scale(1.15);opacity:1}40%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{transform:translate(-50%,-90%) scale(1);opacity:0}}
.gm-mpop{position:fixed;z-index:9998;pointer-events:none;transform:translate(-50%,-50%);text-align:center;animation:gmMp 1.85s cubic-bezier(.2,1.4,.4,1) forwards}
.gm-mpop b{display:block;font:italic 900 clamp(44px,7vw,92px)/1 system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;background:linear-gradient(180deg,#fffbe0,#ffd84a 40%,#ff9a1a 75%,#d65a00);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.05em #4a1a00;paint-order:stroke fill;filter:drop-shadow(0 4px 0 #2a0c00) drop-shadow(0 0 18px rgba(255,170,40,.85));transform:skewX(-8deg)}
.gm-mpop small{display:inline-block;margin-top:4px;padding:2px 12px;border-radius:12px;background:rgba(20,8,0,.75);color:#ffe28a;font:800 15px/1.4 system-ui,sans-serif;letter-spacing:.08em}
.gm-mp3 b{background:linear-gradient(180deg,#fff,#ff9ad5 35%,#c46bff 70%,#6b4bff);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 #20003a) drop-shadow(0 0 20px rgba(220,120,255,.9))}
.gm-mp4 b{background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 #20003a) drop-shadow(0 0 22px rgba(255,255,255,.9))}
@keyframes gmMp{0%{transform:translate(-50%,-50%) scale(2.6);opacity:0}14%{transform:translate(-50%,-50%) scale(.92);opacity:1}22%{transform:translate(-50%,-50%) scale(1.04)}30%,78%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-62%) scale(1.05);opacity:0}}
.gm-tease{position:fixed;inset:0;z-index:9997;pointer-events:none;box-shadow:inset 0 0 60px 18px rgba(255,93,143,.55),inset 0 0 120px 30px rgba(90,184,255,.35);animation:gmTease .85s ease-out forwards}
@keyframes gmTease{0%{opacity:0}12%{opacity:1}30%{opacity:.4}42%{opacity:.9}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.gm-gpop b,.gm-mpop,.gm-tease{animation-duration:.01s}}
.gm-stk.out{animation:gmRbOut .26s ease-in forwards}@keyframes gmRbOut{to{opacity:0;transform:scale(1.06)}}
.gm-stk .gm-rbtx{font-size:clamp(44px,12vw,160px)}
.gm-stk .gm-rbtx>span b{font-family:Bungee,'Arial Black','Noto Sans KR',sans-serif;font-weight:900}
.gm-stk-r .gm-rbtx .te b{background:repeating-conic-gradient(from 8deg at 35% 42%,rgba(255,255,255,.42) 0 14deg,rgba(255,255,255,.08) 14deg 31deg,rgba(0,20,60,.2) 31deg 44deg,transparent 44deg 60deg) 0 0/.82em 1.1em,linear-gradient(90deg,#bfe8ff,#4fb0ff,#1f6dff,#7fd8ff,#ffffff,#3a8bff,#bfe8ff) calc(var(--i) * -.95em) 0/8.6em 100%;-webkit-background-clip:text;background-clip:text}
.gm-stk-sr .gm-rbtx .te b{background:repeating-conic-gradient(from 8deg at 35% 42%,rgba(255,255,255,.42) 0 14deg,rgba(255,255,255,.08) 14deg 31deg,rgba(40,0,60,.2) 31deg 44deg,transparent 44deg 60deg) 0 0/.82em 1.1em,linear-gradient(90deg,#f2d8ff,#c06bff,#7a3bff,#ff7ae0,#ffffff,#a04df0,#f2d8ff) calc(var(--i) * -.95em) 0/8.6em 100%;-webkit-background-clip:text;background-clip:text}
.gm-stk .gm-rbtx .te{animation:none}
.gm-stk .gm-rbtx .ta{color:#0d1a3a;-webkit-text-stroke-color:#0d1a3a;text-shadow:0 .03em 0 #0a1430,0 .06em 0 #081028,0 .09em 0 #060c20,0 .12em 0 #040818,0 .2em .25em rgba(0,0,40,.6)}
.gm-stk .gm-rbtx .tb{color:#dfe6f2;-webkit-text-stroke-color:#b8c2d2;text-shadow:0 -.025em 0 #fff,0 .025em 0 #7d8797}
.gm-stk .gm-rbtx .tc{color:#fff;-webkit-text-stroke-color:#eef3fa}
.gm-rbsp.e-b>i{background:linear-gradient(rgba(10,0,25,var(--dk)),rgba(10,0,25,var(--dk))),linear-gradient(90deg,#8a5205,#ffd38a 30%,#e09018 55%,#ffe2ae 75%,#8a5205)}
.gm-rbsp.e-s>i{background:linear-gradient(rgba(10,0,25,var(--dk)),rgba(10,0,25,var(--dk))),linear-gradient(90deg,#5d6168,#e4e7ec 30%,#9ea4ad 55%,#f1f3f6 75%,#60656d)}
.gm-rbsp.e-g>i{background:linear-gradient(rgba(10,0,25,var(--dk)),rgba(10,0,25,var(--dk))),linear-gradient(90deg,#7a5a06,#fff3b0 30%,#d9a520 55%,#fff6c8 75%,#7a5a06)}
.gm-stk .gm-rbcnt b{font-size:clamp(30px,6.5vw,64px)}
.gm-stk-r .gm-rbcnt b{color:#dff3ff;-webkit-text-stroke-color:#0a3a8a;text-shadow:0 .04em 0 #2f7df6,0 .08em 0 #0a3a8a,0 .14em .2em rgba(0,20,60,.6),0 0 .4em rgba(120,200,255,.8)}
.gm-stk-sr .gm-rbcnt b{color:#f6e6ff;-webkit-text-stroke-color:#4a1a7a;text-shadow:0 .04em 0 #a04df0,0 .08em 0 #4a1a7a,0 .14em .2em rgba(40,0,60,.6),0 0 .4em rgba(220,150,255,.8)}
.gm-qchip{position:absolute;inset:0}.gm-qchip svg{width:100%;height:100%;display:block;filter:grayscale(.6) brightness(.85)}.gm-qchip b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 calc(var(--cs) * .42)/1 Bungee,'Arial Black',sans-serif;color:#fff;-webkit-text-stroke:.05em #2a2f3a;paint-order:stroke fill;text-shadow:0 .04em 0 #2a2f3a,0 0 .3em rgba(255,255,255,.6)}
.gm-stk .gm-rbch{pointer-events:auto;touch-action:none}
.gm-hring{position:absolute;left:50%;top:50%;width:calc(var(--cs) * 1.28);height:calc(var(--cs) * 1.28);transform:translate(-50%,-50%) rotate(-90deg);pointer-events:none;opacity:0;transition:opacity .25s}
.gm-hring svg{width:100%;height:100%;overflow:visible}.gm-hring circle{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;stroke-dasharray:296;stroke-dashoffset:296;filter:drop-shadow(0 0 6px rgba(255,255,255,.9))}
.gm-stk.askhold .gm-hring,.gm-stk.holding .gm-hring{opacity:1}
.gm-hold{position:absolute;left:50%;bottom:7%;transform:translateX(-50%) scale(.6);z-index:6;opacity:0;pointer-events:none;border:0;border-radius:40px;padding:14px 34px;font:900 18px/1 system-ui,sans-serif;letter-spacing:.06em;color:#fff;background:linear-gradient(180deg,#ffd84a,#e8960c);box-shadow:0 6px 0 #9a5a00,0 10px 24px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.6);text-shadow:0 1px 0 #7a4a00;transition:opacity .25s,transform .25s;touch-action:none;user-select:none}
.gm-stk.askhold .gm-hold{opacity:1;pointer-events:auto;transform:translateX(-50%) scale(1);animation:gmHoldPulse 1s ease-in-out infinite}
.gm-stk.holding .gm-hold{transform:translateX(-50%) translateY(4px) scale(.97);box-shadow:0 2px 0 #9a5a00,0 6px 14px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.6);animation:none}
@keyframes gmHoldPulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.06)}}
.gm-stk.holding .gm-rbtl{animation:gmShk .07s linear infinite}
@keyframes gmShk{0%{transform:rotateX(14deg) translate(var(--shk,1px),0)}50%{transform:rotateX(14deg) translate(calc(var(--shk,1px) * -1),var(--shk,1px))}100%{transform:rotateX(14deg) translate(0,calc(var(--shk,1px) * -1))}}
.gm-stk .gm-rbch{transition:filter .2s}
.gm-stk[data-st="s"] .gm-rbch{filter:drop-shadow(0 0 14px rgba(235,242,252,.95))}.gm-stk[data-st="g"] .gm-rbch{filter:drop-shadow(0 0 18px rgba(255,210,60,1))}.gm-stk[data-st="r"] .gm-rbch{filter:drop-shadow(0 0 22px rgba(200,140,255,1)) drop-shadow(0 0 12px rgba(90,184,255,.9))}
.gm-stk .gm-rbsp.e-r>i{background:linear-gradient(rgba(10,0,25,var(--dk)),rgba(10,0,25,var(--dk))),conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f)}
.gm-stk.revealed .gm-rbsp{animation:gmRbRot 4s .6s ease-in-out infinite}
.gm-stk .gm-rbcnt{bottom:17%}
.gm-stk.hit .gm-rbsp{animation:none}.gm-stk.revealed.hit .gm-rbsp{animation:gmRbRot 4s .6s ease-in-out infinite}
.gm.gm-fever .gm-left{animation:gmFever 1s linear infinite;box-shadow:0 0 0 3px #ff5d8f,0 0 24px 6px rgba(255,93,143,.6)}
@keyframes gmFever{0%{box-shadow:0 0 0 3px #ff5d8f,0 0 24px 6px rgba(255,93,143,.6)}25%{box-shadow:0 0 0 3px #ffd84a,0 0 24px 6px rgba(255,216,74,.6)}50%{box-shadow:0 0 0 3px #5ef0a0,0 0 24px 6px rgba(94,240,160,.6)}75%{box-shadow:0 0 0 3px #5ab8ff,0 0 24px 6px rgba(90,184,255,.6)}100%{box-shadow:0 0 0 3px #ff5d8f,0 0 24px 6px rgba(255,93,143,.6)}}
.gm-fevb{position:fixed;z-index:9998;pointer-events:none;overflow:hidden;height:86px;margin-top:-43px;display:flex;align-items:center;background:linear-gradient(90deg,transparent,rgba(20,0,40,.75) 15%,rgba(20,0,40,.75) 85%,transparent);animation:gmFevBand 2.2s ease forwards}
.gm-fevb b{white-space:nowrap;font:italic 900 54px/1 system-ui,sans-serif;letter-spacing:.04em;background:linear-gradient(90deg,#ff5d8f,#ffd84a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f) 0 0/200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(255,255,255,.6));animation:gmFevTxt 2.2s cubic-bezier(.2,.8,.2,1) forwards,cvRflow 1.2s linear infinite}
@keyframes gmFevBand{0%{transform:scaleY(0)}10%,85%{transform:scaleY(1)}100%{transform:scaleY(0)}}
@keyframes gmFevTxt{0%{transform:translateX(110%)}25%,70%{transform:translateX(calc(50% - 50%))}100%{transform:translateX(-120%)}}
.gm-fevb{justify-content:center}
.gm-combo{position:fixed;z-index:9998;pointer-events:none;transform:translate(-50%,-50%);text-align:center;filter:hue-rotate(var(--h));animation:gmCombo 1.05s cubic-bezier(.3,1.7,.5,1) forwards}
.gm-combo small{display:block;font:900 14px/1 system-ui,sans-serif;letter-spacing:.2em;color:#fff;text-shadow:0 0 6px #ff3a6a}
.gm-combo b{display:block;font:italic 900 46px/1 system-ui,sans-serif;color:#ffe14a;-webkit-text-stroke:2px #8a1a00;paint-order:stroke fill;text-shadow:0 3px 0 #5a0e00,0 0 14px rgba(255,120,40,.9)}
@keyframes gmCombo{0%{transform:translate(-50%,-50%) scale(2.2);opacity:0}25%{transform:translate(-50%,-50%) scale(1);opacity:1}75%{opacity:1}100%{transform:translate(-50%,-110%) scale(.9);opacity:0}}
.gm-jstamp{position:fixed;z-index:9998;pointer-events:none;transform:translate(-50%,-50%) rotate(-12deg);animation:gmStamp 2.35s cubic-bezier(.5,0,.6,1) forwards}
.gm-jstamp b{display:block;padding:8px 26px;border:6px double #e0242f;border-radius:14px;font:900 64px/1 system-ui,sans-serif;letter-spacing:.08em;color:#e0242f;background:rgba(255,240,240,.12);text-shadow:0 0 1px #e0242f;-webkit-mask:repeating-radial-gradient(circle at 30% 40%,#000 0 3px,rgba(0,0,0,.82) 3px 4px)}
@keyframes gmStamp{0%{transform:translate(-50%,-50%) rotate(-12deg) scale(3.2);opacity:0}11%{transform:translate(-50%,-50%) rotate(-12deg) scale(.95);opacity:1}16%{transform:translate(-50%,-50%) rotate(-12deg) scale(1.03)}20%,80%{transform:translate(-50%,-50%) rotate(-12deg) scale(1);opacity:1}100%{transform:translate(-50%,-50%) rotate(-12deg) scale(1);opacity:0}}
.gm.gm-thump .gm-left{animation:gmThump .4s}
.gm-rbedge{position:fixed;inset:0;z-index:2147483100;pointer-events:none;opacity:0;--w:20px;--a:0deg;background:conic-gradient(from var(--a),#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f);-webkit-mask:linear-gradient(90deg,#000,transparent var(--w),transparent calc(100% - var(--w)),#000),linear-gradient(#000,transparent var(--w),transparent calc(100% - var(--w)),#000);mask:linear-gradient(90deg,#000,transparent var(--w),transparent calc(100% - var(--w)),#000),linear-gradient(#000,transparent var(--w),transparent calc(100% - var(--w)),#000)}
.gm-thermo{position:absolute;left:88.6%;width:8.4%;bottom:23%;z-index:3;pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s}
.gm-thermo svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 7px var(--lq,#ff3a3a)) drop-shadow(0 3px 5px rgba(0,0,0,.45))}
.gm-thermo text{font:italic 900 1px system-ui,sans-serif;fill:#fff6c0;stroke:#6a1000;paint-order:stroke fill;stroke-linejoin:round}
.gm-thermo.on{opacity:1;transform:none}
.gm-ccf{position:absolute;left:50%;bottom:-13%;transform:translateX(-50%);z-index:5;padding:1px 6px;border-radius:9px;font:italic 900 10.5px/1.45 system-ui,sans-serif;letter-spacing:.02em;color:#fff6c0;background:linear-gradient(90deg,#c41a00,#ff7a00);border:1px solid #ffd27a;box-shadow:0 0 8px rgba(255,100,0,.7);white-space:nowrap;pointer-events:none}
.gm-ccf small{font-size:.85em;margin-left:2px;opacity:.85}
.gm-float.orb.cmb{box-shadow:0 0 0 3px #ff7a00,0 0 18px rgba(255,90,0,.8)}
.gm-cmul{position:fixed;z-index:9998;pointer-events:none;transform:translate(-50%,-50%);font:italic 900 20px/1 system-ui,sans-serif;color:#ffe14a;-webkit-text-stroke:1.5px #7a1600;paint-order:stroke fill;animation:gmCmul .9s ease-out forwards}
@keyframes gmCmul{0%{transform:translate(-50%,-30%) scale(.6);opacity:0}25%{transform:translate(-50%,-60%) scale(1.15);opacity:1}100%{transform:translate(-50%,-150%) scale(1);opacity:0}}

@keyframes gmThump{0%,100%{transform:none}25%{transform:translateY(6px) scale(.995)}55%{transform:translateY(-2px)}}
#gm-fevbar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:2147482000;display:flex;align-items:center;gap:12px;padding:8px 20px;border-radius:30px;background:rgba(14,6,30,.88);box-shadow:0 0 0 2px rgba(255,255,255,.12),0 0 22px rgba(200,120,255,.45),0 6px 20px rgba(0,0,0,.4);pointer-events:none;white-space:nowrap}
#gm-fevbar[hidden]{display:none}
#gm-fevbar .fl,#gm-fevbar b{font:400 18px/1 Bungee,'Arial Black',sans-serif;letter-spacing:.04em;background:linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f) 0 0/200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:cvRflow 2s linear infinite}
#gm-fevbar b{font-size:26px;font-variant-numeric:tabular-nums;min-width:6.2em;text-align:center}
#gm-fevbar small{font:800 11px/1 system-ui,sans-serif;color:#ffe28a;letter-spacing:.06em}
#gm-fevbar.last{animation:gmFevLast .5s ease-in-out infinite alternate}
@keyframes gmFevLast{to{box-shadow:0 0 0 2px #ff5d8f,0 0 30px rgba(255,93,143,.8),0 6px 20px rgba(0,0,0,.4)}}
@media(max-width:560px){#gm-fevbar{gap:8px;padding:7px 14px}#gm-fevbar .fl{font-size:13px}#gm-fevbar b{font-size:20px}#gm-fevbar small{display:none}}
.gm.gm-feveron .gm-left{animation:gmFever 2.4s linear infinite}
.gm-jp{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(40,10,70,.82),rgba(5,0,15,.94));animation:gmRbBg .25s ease-out both;touch-action:none}
.gm-jp.out{animation:gmRbOut .4s ease-in forwards}
.gm-jptw i{position:absolute;width:calc(10px * var(--s));height:calc(10px * var(--s));background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);filter:drop-shadow(0 0 4px #fff);animation:gmTw 1.6s ease-in-out infinite}
.gm-jptw i:nth-child(3n){background:#ffe36a}.gm-jptw i:nth-child(4n){background:#c8a0ff}.gm-jptw i:nth-child(5n){background:#9ad8ff}
@keyframes gmTw{0%,100%{opacity:0;transform:scale(.3) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
.gm-jptx{position:absolute;top:50%;left:0;white-space:nowrap;font:400 clamp(90px,22vw,320px)/1 Bungee,'Arial Black',Impact,sans-serif;letter-spacing:.02em;background:linear-gradient(90deg,#ff3f8e,#ff9e2c,#f8ee3c,#40f08e,#2fc4ff,#6a6bff,#c04bff,#ff3f8e) 0 0/50% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.025em rgba(255,255,255,.9);filter:drop-shadow(0 .03em 0 #2a0c45) drop-shadow(0 0 .12em rgba(255,255,255,.7));animation:gmJpMove 3.4s cubic-bezier(.25,.6,.55,.95) forwards,cvRflow 1.4s linear infinite}
@keyframes gmJpMove{0%{transform:translate(-105%,-50%) skewX(-8deg)}100%{transform:translate(100vw,-50%) skewX(-8deg)}}
.gm-rain{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483001;pointer-events:none}
.gm-odds.fev{border:0!important;box-shadow:0 0 0 2px transparent,0 10px 30px rgba(0,0,0,.45)!important;background:linear-gradient(#141018,#141018) padding-box,linear-gradient(90deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b47cff,#ff5d8f) border-box!important;border:2px solid transparent!important;animation:gmOddsFev 3s linear infinite}
.gm-odds.fev td:nth-child(5):not(.z){background:linear-gradient(90deg,#ff7aa8,#ffc76a,#f8f27a,#7af0b5,#7ac8ff,#c39aff) 0 0/200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;font-weight:900;animation:cvRflow 3s linear infinite}
.gm-odds.fev .gm-oddh em{font-style:normal;margin-left:6px;font-size:11px;padding:1px 7px;border-radius:9px;color:#1a0b33;background:linear-gradient(90deg,#ff7aa8,#ffc76a,#f8f27a,#7af0b5,#7ac8ff,#c39aff)}
@keyframes gmOddsFev{0%{filter:hue-rotate(0)}100%{filter:hue-rotate(360deg)}}
.gm-rbbeat{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 56%,rgba(255,255,255,.55),rgba(255,255,255,0) 60%)}
.gm-rbcut.hit .gm-rbbeat{animation:gmBeat .48s ease-out 1.2s infinite}
@keyframes gmBeat{0%{opacity:.7}100%{opacity:0}}
.gm-rbkk{position:absolute;left:50%;top:calc(56% + min(130px,25vw));z-index:6;pointer-events:none;opacity:0;transform:translate(-50%,-50%) rotate(-10deg)}
.gm-rbkk b{display:block;padding:4px 22px 6px;border:5px solid #ffd84a;border-radius:12px;font:900 clamp(34px,7vw,64px)/1 'Noto Sans KR',system-ui,sans-serif;letter-spacing:.08em;color:#fff6c4;background:linear-gradient(180deg,#d4141f,#8a0a12);box-shadow:0 0 0 3px #7a4a00,0 8px 24px rgba(0,0,0,.45),0 0 30px rgba(255,200,60,.7);text-shadow:0 3px 0 #5a0008}
.gm-rbcut.kk .gm-rbkk{animation:gmKK .4s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes gmKK{0%{opacity:0;transform:translate(-50%,-50%) rotate(-10deg) scale(3)}60%{opacity:1;transform:translate(-50%,-50%) rotate(-10deg) scale(.9)}100%{opacity:1;transform:translate(-50%,-50%) rotate(-10deg) scale(1)}}
.gm-rbcut.kk .gm-rbcnt{bottom:calc(15% - 40px)}
.gm-rbcut.spin2 .gm-rbtl{animation:gmSpin2 .9s cubic-bezier(.2,.7,.2,1)}
@keyframes gmSpin2{0%{transform:rotateX(14deg) rotateZ(0) scale(1)}35%{transform:rotateX(14deg) rotateZ(-200deg) scale(1.25)}100%{transform:rotateX(14deg) rotateZ(-720deg) scale(1)}}
.gm-rbcut.spin2 .gm-rbsw{animation:gmRbWave .9s cubic-bezier(.1,.6,.3,1) both}.gm-rbcut.spin2 .gm-rbsw:nth-child(2){animation-delay:.1s}.gm-rbcut.spin2 .gm-rbsw:nth-child(3){animation-delay:.2s}
.gm-rbcut .gm-jptx{opacity:0;animation:none;z-index:7;pointer-events:none}
.gm-rbcut.jpgo .gm-jptx{opacity:1;animation:gmJpMove 2.6s cubic-bezier(.25,.6,.55,.95) forwards,cvRflow 1.4s linear infinite}
.gm-rbfv{position:absolute;right:6%;top:30%;z-index:7;pointer-events:none;opacity:0;font:400 clamp(26px,5vw,58px)/1 Bungee,'Arial Black',sans-serif;color:#fff;padding:8px 18px;border-radius:14px;background:linear-gradient(90deg,#ff5d8f,#ffb84d,#5ef0a0,#5ab8ff,#b47cff);box-shadow:0 0 0 3px #fff,0 0 26px rgba(255,255,255,.8);text-shadow:0 3px 0 rgba(0,0,0,.35);transform:rotate(8deg)}
.gm-rbcut.fvgo .gm-rbfv{animation:gmKK2 .45s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes gmKK2{0%{opacity:0;transform:rotate(8deg) scale(3)}60%{opacity:1;transform:rotate(8deg) scale(.9)}100%{opacity:1;transform:rotate(8deg) scale(1)}}
.gm-rbjp .gm-rbtx .te b{background:repeating-conic-gradient(from 8deg at 35% 42%,rgba(255,255,255,.5) 0 14deg,rgba(255,255,255,.08) 14deg 31deg,rgba(80,40,0,.2) 31deg 44deg,transparent 44deg 60deg) 0 0/.82em 1.1em,linear-gradient(90deg,#fff6c4,#ffd84a,#ff9a1a,#fff2a8,#ffd84a,#e8960c,#fff6c4) calc(var(--i) * -.95em) 0/8.6em 100%;-webkit-background-clip:text;background-clip:text}
@keyframes gmIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
@keyframes gmMerge{50%{transform:scale(1.22);filter:brightness(1.8)}}
.gm-float{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;transform:translate(-50%,-50%);filter:drop-shadow(0 8px 12px rgba(0,0,0,.55))}
.gm-float.cur{width:0;height:0}
.gm-float.cur img{position:absolute;left:0;top:0;width:var(--w);max-width:none;transform:translate(-50%,-50%) translate(calc(var(--dx)*var(--k)),calc(var(--dy)*var(--k))) rotate(var(--rt));transition:width .16s ease-out}
.gm-float.cur b{position:absolute;left:calc(var(--w)*.4);top:calc(var(--w)*.25);font-size:14px;font-weight:800;color:#fff;background:rgba(10,14,22,.85);border:1px solid rgba(255,255,255,.3);border-radius:9px;padding:1px 7px;white-space:nowrap}
.gm-float.orb{width:70px;height:70px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(60,35,0,.55),inset 0 -5px 9px rgba(0,0,0,.38),inset 0 4px 7px rgba(255,255,255,.22),0 0 0 4.4px rgba(50,28,0,.7),0 8px 18px rgba(0,0,0,.6)}
.gm-float.orb::before{content:"";position:absolute;inset:-3.6px;border-radius:50%;pointer-events:none;background:linear-gradient(160deg,#fff6c4 0%,#ffd84a 22%,#f5bd22 50%,#e0a010 72%,#a86f06 100%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4.4px),#000 calc(100% - 3.8px));mask:radial-gradient(farthest-side,transparent calc(100% - 4.4px),#000 calc(100% - 3.8px))}
.gm-float.orb.mg{animation:gmMerge .35s}
.gm-name{display:none!important}
.gm-tools{display:flex;gap:5px;width:auto}
.gm-ib{appearance:none;width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,22,.72);color:#dfe7f5;border-radius:10px;cursor:pointer;padding:0}
.gm-ib:hover{background:rgba(40,52,80,.9)}.gm-ib.on{background:#3d8bff;border-color:#3d8bff;color:#fff}.gm-ib.off{opacity:.45}
.gm-pop{position:absolute;left:1.2%;top:calc(1.4% + 42px);z-index:5;display:grid;gap:7px;min-width:210px;max-width:300px;background:rgba(14,18,28,.96);border:1px solid #33405c;border-radius:12px;padding:10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.gm-pop[hidden]{display:none}.gm-pop small{font-size:11.5px;color:#9eaac0;font-weight:700}
.gm-help{margin:0;padding-left:18px;font-size:12.5px;line-height:1.55;color:#dbe3f1;display:grid;gap:4px}
.gm-fs{position:absolute;right:1.2%;top:1.4%}.gm-auto{position:absolute;right:calc(1.2% + 40px);top:1.4%;appearance:none;height:34px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(10,14,22,.72);color:#dfe7f5;font-weight:800;font-size:13px;letter-spacing:.5px;cursor:pointer}.gm-auto.on{background:linear-gradient(#ff8a5c,#ff5a7a);border-color:#ff8a5c;color:#fff}
.gm-left.clean .gm-tools,.gm-left.clean .gm-auto,.gm-left.clean .gm-fs,.gm-left.clean .gm-hud,.gm-left.clean .gm-pop{display:none}
.gm-hud{top:auto;bottom:22.5%}
.gm-graph{background:#121722;border:1px solid #2a3348;border-radius:14px;padding:10px 12px}
.gm-gh{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:13px;margin-bottom:6px}.gm-gh label{color:#9eaac0;font-size:12px}.gm-gh input{width:86px;background:#0c1019;border:1px solid #33405c;color:#eef3fb;border-radius:7px;padding:3px 6px;font:inherit}
.gm-gl{color:#c5cfdf;font-size:12px;margin-left:auto}.gm-gcv{display:block;width:100%;height:0;flex:1 1 0;min-height:56px}.gm-gl{margin-left:0;flex-basis:100%}
.gm-stat{margin-top:8px}.gm-stat div{background:#0c1019}
.gm-right{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,9fr) minmax(0,11fr);gap:10px;min-width:0;overflow:hidden}
.gm-wal{grid-area:1/1;height:auto;min-height:0}.gm-graph{grid-area:2/1;display:flex;flex-direction:column;min-height:0}
.gm-tray{grid-area:1/2/3/3;display:flex;flex-direction:column;min-height:0}.gm-trh{flex:none}.gm-name{flex:none}
.gm-wt small span{font-weight:500}.gm-stat em{font-style:normal;font-size:.78em;color:#ffd24d;white-space:nowrap}
.gm-mode{right:8px;top:8px;gap:6px;justify-items:end}
.gm-mode .gm-mg{width:36px;height:36px;padding:0;display:grid;place-items:center;border-radius:10px}.gm-mode .gm-mg svg{pointer-events:none}
.gm-mode .gm-dmt{appearance:none;border:0;border-radius:10px;padding:6px 9px;font-weight:900;cursor:pointer;font-size:12.5px;color:#fff;background:linear-gradient(90deg,#ff5d8f,#ffb84d,#5ef0a0,#5ab8ff,#b47cff);box-shadow:0 0 0 1px rgba(255,255,255,.35) inset;opacity:.75}.gm-dmt.on{opacity:1;box-shadow:0 0 0 2px #fff inset,0 0 14px rgba(200,120,255,.8)}
.gm-wal.dm .gm-wt{padding-right:112px}.gm-dw{display:inline-flex;align-items:center;gap:4px}.gm-dw svg{width:15px;height:15px}.gm-dmb svg{width:40px;height:40px}
.gm-fb{appearance:none;border:1px solid #ffc21a;background:rgba(40,30,0,.78);color:#ffd24d;border-radius:10px;padding:6px 9px;font-weight:800;cursor:pointer;font-size:12.5px}
.gm-mode .gm-fb.run{background:#ffc21a;color:#1b1400}.gm-mode .gm-fb.full{border-color:#ff8a5c;color:#ffb494;background:rgba(60,20,0,.8)}
.gm-trt{display:none}.gm-trbtn{display:none;position:absolute;left:2.4%;bottom:21.5%;z-index:5;overflow:visible}.gm-trbtn img{width:22px;height:22px;object-fit:contain;pointer-events:none}.gm-trbtn span{position:absolute;right:-5px;top:-5px;min-width:17px;height:17px;border-radius:9px;background:#11141b;border:1px solid #ffc21a;color:#ffc21a;font:800 10.5px/15px sans-serif;text-align:center;padding:0 4px}.gm-left.clean .gm-trbtn{display:none!important}
.gm-multi{position:relative}.gm-btn{white-space:nowrap;font-size:11.5px;letter-spacing:-.4px;padding:8px 2px}
.gm-slides{display:grid}.gm-slide{grid-area:1/1;min-width:0}.gm-slide:not(.cur){visibility:hidden;pointer-events:none}.gm-slide.peek .gm-left{visibility:visible}
.gm-dots{position:absolute;left:50%;top:1.5%;transform:translateX(-50%);z-index:4;display:flex;gap:8px;padding:5px}.gm-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.4);border:1px solid rgba(0,0,0,.35);cursor:pointer}.gm-dots i.on{background:#ffc21a}
.gm-left.clean .gm-dots{display:none}
.gm-play{display:none;position:absolute;inset:0;z-index:8;place-items:center;background:rgba(8,10,16,.55);border-radius:16px}
.gm-play button{appearance:none;width:112px;height:112px;border-radius:50%;border:3px solid #fff;background:linear-gradient(#ffd24d,#ffb21c);color:#1b1400;display:grid;place-items:center;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.6)}
html.gm-lock,html.gm-lock body{overflow:hidden!important}
.gm-multi.fs{position:fixed;inset:0;z-index:9000;background:#0b0e14;padding:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;width:auto;height:auto}
.gm-multi.fs .gm-slides{width:100%}.gm-multi.fs .gm{--gm-top:16px}
@media (max-width:1000px),(pointer:coarse){
.gm-multi:not(.fs) .gm-play{display:grid}.gm-multi:not(.fs) .gm{grid-template-columns:1fr}.gm-multi:not(.fs) .gm-right{display:none}.gm-multi:not(.fs) .gm-left{max-width:calc((100vh - 120px) * 1.0042);justify-self:center}
.gm-btn{font-size:10.5px;padding:5px 1px}.gm-lab{padding:3px 3px;gap:3px}.gm-lab img{width:18px}.gm-lab b{font-size:11px;letter-spacing:-.3px}.gm-pop{left:calc(1.2% + 36px)}.gm-ib{width:30px;height:30px}.gm-auto{height:30px;padding:0 9px;font-size:11.5px;right:calc(1.2% + 36px)}
.gm-pop{max-width:92%}
}
@media (max-width:1000px) and (orientation:portrait){
.gm-multi.fs{padding:6px;align-items:stretch}.gm-multi.fs .gm-slides{grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr)}.gm-multi.fs .gm-slide{display:grid;grid-template-rows:minmax(0,1fr);min-height:0}
.gm-multi.fs .gm{align-items:stretch;min-height:0;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:150px minmax(0,1fr);gap:6px}
.gm-multi.fs .gm-right{display:contents}
.gm-multi.fs .gm-wal{grid-area:1/1}.gm-multi.fs .gm-graph{grid-area:1/2;padding:6px 7px}
.gm-multi.fs .gm-left{grid-area:2/1/3/3;align-self:center;width:min(100%,calc((100vh - 150px - 24px) * 1.0042));width:min(100%,calc((100dvh - 150px - 24px) * 1.0042));justify-self:center}
.gm-multi.fs .gm-tray{grid-area:2/1/3/3;z-index:6;padding:7px;align-self:stretch;transform:translateX(105%);visibility:hidden;transition:transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s .3s}.gm-multi.fs .gm.topen .gm-tray{transform:none;visibility:visible;transition:transform .3s cubic-bezier(.2,.8,.2,1)}.gm-multi.fs .gm-trt{display:block}.gm-multi.fs .gm-trbtn{display:grid}
.gm-multi.fs .gm-pan{padding:7px}.gm-multi.fs .gm-trh{margin-bottom:5px;font-size:12.5px}.gm-multi.fs .gm-name{display:none}
.gm-multi.fs .gm-gh{gap:4px;margin-bottom:3px}.gm-multi.fs .gm-gh b{display:none}.gm-multi.fs .gm-seg button{padding:3px 6px;font-size:10.5px}
.gm-multi.fs .gm-stat{margin-top:4px;gap:4px}.gm-multi.fs .gm-stat div{padding:2px;display:flex;justify-content:center;gap:5px;align-items:baseline}.gm-multi.fs .gm-stat b{font-size:12px;white-space:nowrap}.gm-multi.fs .gm-stat small{font-size:10px}
.gm-multi.fs .gm-wt{padding:7px 9px}.gm-multi.fs .gm-wt small span{display:none}.gm-multi.fs .gm-jw{font-size:29px}.gm-multi.fs .gm-jw img{height:25px}.gm-multi.fs .gm-chip{font-size:15.5px}.gm-multi.fs .gm-pulls{font-size:14px;margin-top:4px}
.gm-multi.fs .gm-mode{right:5px;top:5px;gap:4px}.gm-multi.fs .gm-mode .gm-mg{width:30px;height:30px}.gm-multi.fs .gm-mode .gm-fb{padding:4px 6px;font-size:11px}.gm-dmt{padding:4px 6px;font-size:11px}
}

.gm-hud{left:auto;right:2%;top:80.6%;bottom:auto;width:18%;gap:4px;z-index:4}
.gm-lab{display:flex;align-items:center;justify-content:center;gap:5px;padding:4px 6px;border-radius:10px}.gm-lab img{width:24px;height:auto}.gm-lab b{font-size:14px;line-height:1}
.gm-btn{font-size:12px;padding:6px 2px;border-radius:9px}
.gm-tools{display:flex;flex-direction:column;gap:5px;width:auto}.gm-pop{left:calc(1.2% + 42px);top:1.4%}
.gm-trbtn{transition:transform .18s}.gm-trbtn.pop{transform:scale(1.25)}
@media (max-width:1000px),(pointer:coarse){.gm-pop{left:calc(1.2% + 36px)}.gm-btn{font-size:10.5px;padding:5px 1px}.gm-lab{padding:3px 3px;gap:3px}.gm-lab img{width:18px}.gm-lab b{font-size:11px;letter-spacing:-.3px}}
`;

  function css() { if (!document.getElementById('gm-css')) { const st = document.createElement('style'); st.id = 'gm-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function mount(root, o) {
    css(); const PV = o.puRate === 2 ? 15000 : 30000;
    const A = o.assets, P = o.pools, TIERS = (o.tiers && o.tiers.boss && o.tiers.pvp) ? o.tiers : Object.assign({ boss: {}, pvp: {} }, o.tiers);
    let dirty = true, spr = {}, scale = 1, stA = null, stB = null, stC = null, stD = null, domeStale = true;
    const ld = (src) => { const i = new Image(); i.onload = () => { dirty = true; spr = {}; }; i.src = src; return i; };
    const IM = { cover: ld(A.cover), label: ld(A.label), jw: ld(A.icons.jw), pick: ld(A.tk.pick), norm: ld(A.tk.norm), emb: {} };
    Object.keys(A.emb).forEach((k) => { IM.emb[k] = ld(A.emb[k]); });
    const SRC = { jw: A.icons.jw, pick: A.tk.pick, norm: A.tk.norm };
    /* 투입용 골드칩(= DORO칩 10 = 10뽑) 실물 */
    const doroImg = (n, k) => { const S2 = 71, c = mkc(S2, S2), x = c.getContext('2d'), sp = chipSprite(k || 'b'), R = 30, TH = 5, ec = k === 'g' ? ['#7a5a06', '#d6a51c'] : ['#a86405', '#e0a030'];
      for (let k = n - 1; k >= 0; k--) { const cx = S2 / 2 + (n > 1 ? (k - (n - 1) / 2) * 2.2 : 0), cy = 33 + (n > 1 ? 14 - k * 4.2 : 0); for (let i = TH; i >= 1; i--) { x.fillStyle = i > 2 ? ec[0] : ec[1]; x.beginPath(); x.arc(cx, cy + i, R * 0.985, 0, TAU); x.fill(); } x.drawImage(sp.c, cx - R - 3, cy - R - 3, (R + 3) * 2, (R + 3) * 2); }
      c.complete = true; return c; };
    IM.doro = doroImg(1, 'g'); IM.doro10 = IM.doro; SRC.doro = IM.doro.toDataURL(); SRC.doro10 = IM.doro10.toDataURL();
    const orbBg = (n) => 'background-image:url(' + (n.img || '') + '),radial-gradient(circle at 50% 30%,#fff6d8,#d9b35a);' + (n.tall ? 'background-size:107% auto,cover;background-position:50% 22%,center;' : '');
    const embOf = (n) => CORP[n.c] || 'pil', isOvr = (n) => !!(n.p && n.c && n.c !== '필그림'), isSSS = (n) => TIERS.boss[n.n] === 'SSS', tierOf = (n) => TIERS[S.mode.tier === 'pvp' ? 'pvp' : 'boss'][n.n] || '-';
    const pimg = {}; const portrait = (n) => { if (!n.img) return null; if (!pimg[n.n]) { const i = new Image(); i.src = n.img; pimg[n.n] = i; } return pimg[n.n]; };

    root.innerHTML = '<div class="gm"><div class="gm-left"><canvas class="gm-cv"></canvas>'
      + '<div class="gm-tools">' + [['open', '개봉 방식 · 게임 모드', '<path d="M5 10.5a7 7 0 0114 0z"/><path d="M5 13.5a7 7 0 0014 0z"/>'], ['snd', '소리', '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/>'], ['reset', '초기화', '<path d="M4 12a8 8 0 0113.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 01-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>'], ['hide', '화면 정리', '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 4l16 16"/>']].map((x) => '<button class="gm-ib" data-a="' + x[0] + '" title="' + x[1] + '" aria-label="' + x[1] + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + x[2] + '</svg></button>').join('') + '</div><button class="gm-ib gm-trbtn" data-a="topen" aria-label="SSR 보관함 열기" title="SSR 보관함"><img alt="" src="' + TRICO + '"><span>0</span></button><div class="gm-pop" hidden></div><button class="gm-auto" data-a="auto">AUTO</button><button class="gm-ib gm-fs" data-a="fs" title="전체화면" aria-label="전체화면"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>'
      + '<div class="gm-thermo" aria-hidden="true"><svg></svg></div>'
      + '<div class="gm-hud"><div class="gm-lab"><img alt=""><b>0</b></div><button class="gm-btn" data-a="exch">라벨 교환</button></div>' + '</div>'
      + '<div class="gm-right"><div class="gm-wal"><canvas class="gm-wcv"></canvas><div class="gm-wt"></div><div class="gm-mode"></div></div><div class="gm-graph"><div class="gm-gh"><b>실시간 수지</b><span class="gm-seg"><button data-v="0">픽업</button><button data-v="1">솔레티어</button><button data-v="2">PVP티어</button></span></div><canvas class="gm-gcv"></canvas><div class="gm-stat"></div></div><div class="gm-tray"><div class="gm-trh">SSR 보관함 <span class="gm-trr">' + (/github\.io$/.test(location.hostname) ? '' : '<button class="gm-tb gm-demo" data-a="demo" title="연출 시안 빠르게 보기">시안</button>') + '<button class="gm-tb gm-flipall" data-a="flipall" title="SSS를 뺀 모든 초상화를 뒤집어 바로 잔고에 넣습니다">모두 뒤집기</button><span class="gm-chipbal" data-a="odds" role="button" tabindex="0" title="DORO칩 잔고 · 누르면 획득 확률">' + (window.doroChipSvg ? window.doroChipSvg('b', 18) : '') + '<b class="gm-cbn">0</b><span class="gm-cbr" hidden>' + (window.doroChipSvg ? window.doroChipSvg('r', 18) : '') + '<b>0</b></span></span><button class="gm-tb gm-trt" data-a="tfold">접기</button></span></div><div class="gm-pan"></div><div class="gm-name"></div></div></div></div>';
    const $ = (s) => root.querySelector(s);
    const cv = $('.gm-cv'), ctx = cv.getContext('2d'), walEl = $('.gm-wal'), wcv = $('.gm-wcv'), wctx = wcv.getContext('2d'), wtEl = $('.gm-wt'), modeEl = $('.gm-mode'), optEl = $('.gm-pop'), gcv = $('.gm-gcv'), panEl = $('.gm-pan'), statEl = $('.gm-stat'), labEl = $('.gm-lab'), leftEl = $('.gm-left'), rightEl = $('.gm-right'); let txs = 1;
    const vib = (p, force) => { try { if (!navigator.vibrate) return; if (!force && typeof S !== 'undefined' && S.auto) return; navigator.vibrate(p); } catch (e) { /* 미지원(iOS 등) */ } }; /* 햅틱: 안드로이드 크롬 계열만 동작. AUTO 중에는 확정 진동만 */
    labEl.querySelector('img').src = A.label;

    const S = { stock: o.shared ? o.stock : Object.assign({ jw: 0, pick: 0, norm: 0 }, o.stock), gl: [], cred: [], credN: 0, dome: [], bask: [], pile: [], cup: [], emerg: [], parts: [], pops: [], ins: [], lab: 0,
      stats: { n: 0, ssr: 0, pu: 0, gold: 0, silver: 0 }, tray: [], sq: [], streak: null, lev: { t: 0, tg: 0, auto: 0, q: 0, sp: 1, wait: 0, drag: null, clunk: 0 }, log: [], pop: null, auto: 0, autoLid: false, at: 0, val: { mode: 0, pv: [30000, 20000] }, lid: { a: 0, drag: null, push: false, pt: 0, rel: 0 }, cap: 0, refill: null,
      reveal: null, grab: null, hand: false, mute: false, time: 0, hl: null, msg: null, flash: 0, led: 0, mode: { random: false, black: false, tier: false }, openM: 'mix' };
    const stock0 = Object.assign({}, S.stock);

    /* ---------- 소리 ---------- */
    const snd = (() => {
      let ac = null, master = null, nb = null; const last = {};
      const C = () => { if (S.mute) return null; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.25; master.connect(ac.destination); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; };
      const thr = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return true; last[k] = n; return false; };
      function tone(f, d, type, v, f2, dl) { const a = C(); if (!a) return; const t = a.currentTime + (dl || 0), os = a.createOscillator(), g = a.createGain(); os.type = type || 'sine'; os.frequency.setValueAtTime(f, t); if (f2) os.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); os.connect(g); g.connect(master); os.start(t); os.stop(t + d + 0.02); }
      function noise(d, v, fc, type, dl) { const a = C(); if (!a) return; if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } const t = a.currentTime + (dl || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = nb; f.type = type || 'bandpass'; f.frequency.value = fc; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, d + 0.02); }
      function motor(d, v, f1, f2, dl) {
        const a = C(); if (!a) return; const t = a.currentTime + (dl || 0);
        const o = a.createOscillator(), bp = a.createBiquadFilter(), hp = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + d * 0.3); o.frequency.setValueAtTime(f2, t + d * 0.75); o.frequency.linearRampToValueAtTime(f1 * 0.9, t + d);
        bp.type = 'bandpass'; bp.frequency.value = f2 * 3; bp.Q.value = 0.9; hp.type = 'highpass'; hp.frequency.value = 300;
        lfo.frequency.value = 55; lg.gain.value = v * 0.3; lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0008, t); g.gain.linearRampToValueAtTime(v, t + 0.04); g.gain.setValueAtTime(v, t + d - 0.05); g.gain.linearRampToValueAtTime(0.0008, t + d);
        o.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02); lfo.start(t); lfo.stop(t + d + 0.02);
        if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
        const s = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain(); s.buffer = nb; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(2200, t + d);
        ng.gain.setValueAtTime(v * 0.9, t); ng.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(f); f.connect(ng); ng.connect(master); s.start(t, Math.random() * 0.5, d + 0.02);
      }
      return {
        tick() { noise(0.035, 0.7, 2400, 'bandpass'); tone(170, 0.05, 'square', 0.1, 90); },
        clunk() { if (thr('cl', 300)) return; tone(95, 0.13, 'sine', 0.6, 48); noise(0.06, 0.35, 380, 'lowpass'); },
        fanfare() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, null, i * 0.07)); [1047, 1319, 1568, 2093].forEach((f) => tone(f, 1.3, 'sawtooth', 0.05, null, 0.45)); tone(2093, 1.5, 'sine', 0.14, null, 0.45); noise(0.5, 0.35, 5000, 'highpass'); },
        riser() { const a = C(); if (!a) return; tone(180, 0.95, 'sawtooth', 0.07, 1400); tone(360, 0.95, 'triangle', 0.08, 2800); noise(0.95, 0.12, 1800, 'bandpass'); },
        boom() { tone(55, 0.9, 'sine', 1, 28); tone(110, 0.35, 'square', 0.18, 40); noise(0.5, 0.9, 700, 'lowpass'); noise(0.25, 0.4, 6000, 'highpass'); },
        thud(big) { tone(big ? 90 : 130, 0.18, 'sine', big ? 0.7 : 0.45, 50); noise(0.06, big ? 0.5 : 0.3, 1600, 'bandpass'); },
        tickUp(p) { tone(900 + p * 1500, 0.04, 'square', 0.05); },
        beep(hi) { tone(hi ? 1760 : 1320, 0.09, 'square', 0.1); if (hi) tone(2640, 0.09, 'square', 0.05, null, 0.02); },
        fevEnd() { tone(660, 0.35, 'triangle', 0.18, 330); tone(440, 0.6, 'sine', 0.14, 220, 0.25); },
        slam() { tone(70, 0.45, 'sine', 0.9, 38); noise(0.2, 0.6, 900, 'lowpass'); },
        chipPop() { tone(2400, 0.16, 'triangle', 0.22); tone(3600, 0.26, 'sine', 0.14, null, 0.03); tone(5100, 0.2, 'sine', 0.07, null, 0.05); noise(0.03, 0.3, 6500, 'highpass'); },
        chipIn(u, soft) { if (thr('ci', S.auto ? 110 : soft ? 45 : 28)) return; const f = 1500 + 1700 * (u || 0), v = soft ? 0.55 : 1; tone(f, 0.07, 'triangle', 0.13 * v); tone(f * 1.5, 0.1, 'sine', 0.07 * v, null, 0.01); },
        chipBurst(big) { noise(0.12, 0.4, big ? 5200 : 4200, 'highpass'); tone(big ? 3200 : 2600, 0.2, 'triangle', 0.16, big ? 1500 : 1900); tone(big ? 4800 : 3900, 0.3, 'sine', 0.1, null, 0.04); },
        flip() { noise(0.05, 0.22, 3200, 'bandpass'); tone(2100, 0.1, 'triangle', 0.12, 2900, 0.12); },
        coin() { tone(1900, 0.22, 'sine', 0.22); tone(2850, 0.3, 'sine', 0.15, null, 0.05); noise(0.05, 0.2, 500, 'lowpass', 0.18); },
        /* 모집권 투입: 지폐 인식기 모터 위잉 2번(기존 사락 타이밍) + 8비트 2음 상승(기존 크레딧 상승음 타이밍) */
        bill() { motor(0.22, 0.07, 260, 370); motor(0.26, 0.07, 275, 395, 0.26); tone(988, 0.07, 'square', 0.09, null, 0.55); tone(1319, 0.25, 'square', 0.09, null, 0.63); },
        grab() { if (thr('gr', 40)) return; tone(700, 0.05, 'triangle', 0.12, 1000); },
        drop() { if (thr('dr', 45)) return; tone(rnd(200, 260), 0.09, 'sine', 0.32, 110); noise(0.03, 0.12, 900, 'lowpass'); },
        pop() { if (thr('pp', 35)) return; noise(0.07, 0.3, 1900, 'highpass'); tone(rnd(480, 560), 0.09, 'triangle', 0.18, 950); },
        blip() { if (thr('bl', 30)) return; tone(rnd(1150, 1300), 0.07, 'sine', 0.1, 1700); },
        lid() { noise(0.08, 0.25, 700, 'bandpass'); tone(300, 0.06, 'triangle', 0.1, 200); },
        heart() { tone(62, 0.16, 'sine', 0.7, 40); tone(58, 0.2, 'sine', 0.5, 36, 0.17); },
        up(lv) { const f = [0, 660, 880, 1175][lv] || 660; tone(f, 0.16, 'triangle', 0.2); tone(f * 1.5, 0.3, 'sine', 0.18, null, 0.09); noise(0.2, 0.2, 4000, 'highpass'); },
        fakeUp() { tone(500, 0.5, 'sawtooth', 0.07, 1800); tone(1000, 0.5, 'sine', 0.1, 3600); },
        fail() { tone(300, 0.35, 'sawtooth', 0.14, 70); noise(0.25, 0.4, 500, 'lowpass'); },
        crack() { noise(0.06, 0.55, 3200, 'highpass'); tone(rnd(900, 1300), 0.05, 'square', 0.08, 300); },
        zap() { noise(0.3, 0.5, 6000, 'highpass'); tone(2400, 0.25, 'sawtooth', 0.1, 200); tone(90, 0.5, 'sine', 0.5, 40, 0.05); },
        charge(d, hi) { tone(160, d, 'sawtooth', 0.04, hi ? 1300 : 800); tone(320, d, 'sine', 0.06, hi ? 2600 : 1600); },
        burst(lv) { noise(0.6, 0.7, 700, 'lowpass'); noise(0.25, 0.35, 5000, 'highpass'); const ch = lv >= 3 ? [523, 659, 784, 1047, 1319] : lv === 2 ? [523, 659, 784] : lv === 1 ? [392, 494] : [330]; ch.forEach((f, i) => tone(f, lv >= 2 ? 1.1 : 0.5, 'triangle', 0.13, null, 0.05 + i * 0.07)); if (lv >= 3) [1568, 2093].forEach((f, i) => tone(f, 0.9, 'sine', 0.09, null, 0.45 + i * 0.1)); },
        collect() { tone(880, 0.12, 'sine', 0.16); tone(1320, 0.2, 'sine', 0.14, null, 0.08); },
        merge() { tone(660, 0.1, 'triangle', 0.16, 1320); tone(1760, 0.22, 'sine', 0.12, null, 0.08); }
      };
    })();

    /* ---------- 스프라이트 ---------- */
    function tint(img, color, size) { const c = mkc(size, size), x = c.getContext('2d'); if (img && img.complete && img.naturalWidth) { x.drawImage(img, 0, 0, size, size); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, size, size); } return c; }
    const look = (b) => ((S.mode.random && b.kind !== 'orb') ? ['Q', '?'] : b.kind === 'SSR' ? ['SSR', S.mode.tier ? 'T' + tierOf(b.res.nk) : embOf(b.res.nk)] : [b.kind, '']).concat(b.res && b.res.cm > 1 ? [b.res.cm] : []);
    const rOf = (kind) => (kind === 'orb' || kind === 'chip' ? OR : (kind === 'SSR' && !S.mode.random) ? YR : CR);
    function capSprite(kind, pr, r, cm) {
      const dm = S.doro && feverOn(), key = kind + pr + r + (cm ? 'c' + cm : '') + (dm ? 'D' : ''); if (spr[key]) return spr[key];
      const q = r > 60 ? 2 : 2.5, s = (r + 3) * 2 * q, col = COL[kind]; let ready = true;
      const base = mkc(s, s), b = base.getContext('2d'); b.scale(q, q); b.translate(r + 3, r + 3);
      b.save(); b.beginPath(); b.arc(0, 0, r, 0, TAU); b.clip();
      if (dm) { const g0 = b.createLinearGradient(-r, 0, r, 0); ['#ff5d8f', '#ffb84d', '#f6f05a', '#5ef0a0', '#5ab8ff', '#b47cff'].forEach((c0, i, A) => g0.addColorStop(i / (A.length - 1), c0)); b.fillStyle = g0; } else b.fillStyle = col[1]; b.fillRect(-r, -r, 2 * r, 2 * r); b.fillStyle = col[0]; b.fillRect(-r, -r, 2 * r, r); /* DORO TIME: 아래 반쪽이 무지개 */
      if (kind === 'SSR') { const g = b.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffd84a'); g.addColorStop(0.5, '#ffbf12'); g.addColorStop(0.5, '#ffe37a'); g.addColorStop(1, '#fff0b0'); b.fillStyle = g; b.fillRect(-r, -r, 2 * r, 2 * r); if (dm) { const g1 = b.createLinearGradient(-r, 0, r, 0); ['#ff5d8f', '#ffb84d', '#f6f05a', '#5ef0a0', '#5ab8ff', '#b47cff'].forEach((c0, i, A) => g1.addColorStop(i / (A.length - 1), c0)); b.fillStyle = g1; b.fillRect(-r, 0, 2 * r, r); } }
      b.fillStyle = 'rgba(0,0,0,.22)'; b.fillRect(-r, -r * 0.07, 2 * r, r * 0.14); b.fillStyle = 'rgba(255,255,255,.5)'; b.fillRect(-r, -r * 0.11, 2 * r, r * 0.045);
      if (pr === '?') { b.fillStyle = 'rgba(20,24,34,.8)'; b.font = '900 ' + (r * 1.3) + 'px sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('?', 0, r * 0.06); }
      else if (pr && pr[0] === 'T') { const t = pr.slice(1); b.fillStyle = 'rgba(110,50,0,.9)'; b.font = '900 ' + (r * (t.length > 2 ? 0.74 : t.length > 1 ? 0.95 : 1.25)) + 'px sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(t, 0, r * 0.05); }
      else if (pr) { const es = r * 1.25, im = IM.emb[pr]; ready = im.complete && im.naturalWidth; b.globalAlpha = 0.78; b.drawImage(tint(im, '#7a4300', 120), -es / 2, -es / 2, es, es); b.globalAlpha = 1; }
      b.restore();
      const over = mkc(s, s), v = over.getContext('2d'); v.scale(q, q); v.translate(r + 3, r + 3);
      let g = v.createRadialGradient(0, 0, r * 0.55, 0, 0, r); g.addColorStop(0, 'rgba(0,0,40,0)'); g.addColorStop(1, 'rgba(0,0,40,.42)'); v.fillStyle = g; v.beginPath(); v.arc(0, 0, r, 0, TAU); v.fill();
      g = v.createRadialGradient(-r * 0.36, -r * 0.42, 0, -r * 0.36, -r * 0.42, r * 0.75); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); v.fillStyle = g; v.beginPath(); v.arc(0, 0, r, 0, TAU); v.fill();
      v.strokeStyle = 'rgba(0,0,0,.4)'; v.lineWidth = 1; v.beginPath(); v.arc(0, 0, r - 0.5, 0, TAU); v.stroke();
      if (cm) { /* 콤보 캡슐: 가운데 띠가 달아오른 주황 띠, 주황 테, 띠 위에 ×n */
        v.save(); v.beginPath(); v.arc(0, 0, r, 0, TAU); v.clip();
        let fg = v.createLinearGradient(-r, 0, r, 0); fg.addColorStop(0, '#ff2a00'); fg.addColorStop(0.5, '#ffb000'); fg.addColorStop(1, '#ff2a00'); v.fillStyle = fg; v.fillRect(-r, -r * 0.2, 2 * r, r * 0.4);
        v.fillStyle = 'rgba(255,240,170,.85)'; v.fillRect(-r, -r * 0.2, 2 * r, r * 0.06);
        v.restore();
        const rg = v.createLinearGradient(0, -r, 0, r); rg.addColorStop(0, '#ffe066'); rg.addColorStop(0.5, '#ff6a00'); rg.addColorStop(1, '#c41a00'); v.strokeStyle = rg; v.lineWidth = Math.max(2, r * 0.1); v.beginPath(); v.arc(0, 0, r - v.lineWidth / 2, 0, TAU); v.stroke();
        v.font = 'italic 900 ' + Math.round(r * 0.5) + 'px system-ui,sans-serif'; v.textAlign = 'center'; v.textBaseline = 'middle'; v.lineWidth = Math.max(1.5, r * 0.07); v.strokeStyle = '#5a0e00'; v.strokeText('×' + cm, 0, r * 0.01); v.fillStyle = '#fff6c0'; v.fillText('×' + cm, 0, r * 0.01);
      }
      const out = { base, over, r, q }; if (ready) spr[key] = out; return out;
    }
    function drawCap(c, lk, x, y, r, a, sc) { const sp = capSprite(lk[0], lk[1], r, lk[2]), s = (r + 3) * 2 * (sc || 1); c.save(); c.translate(x, y); c.save(); c.rotate(a); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.restore(); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); }
    function orbSprite(n, r) { const key = 'orb' + n.n + (n.pu ? 'p' : '') + r; if (spr[key]) return spr[key]; const q = 2, s = (r + 4) * 2 * q, c = mkc(s, s), x = c.getContext('2d'), im = portrait(n); x.scale(q, q); x.translate(r + 4, r + 4);
      x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip(); let g = x.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r * 1.1); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#d2a94e'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); const ok = im && im.complete && im.naturalWidth; if (ok) { if (im.naturalHeight > im.naturalWidth * 1.5) { const q = im.naturalWidth / 256; x.drawImage(im, 8 * q, 60 * q, 240 * q, 240 * q, -r, -r, 2 * r, 2 * r); } else x.drawImage(im, -r, -r, 2 * r, 2 * r); } else { x.fillStyle = '#6b4a00'; x.font = 'bold ' + (r * 0.8) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n.n.slice(0, 1), 0, 2); }
      g = x.createRadialGradient(0, 0, r * 0.6, 0, 0, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,30,.4)'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r);
      g = x.createRadialGradient(-r * 0.36, -r * 0.45, 0, -r * 0.36, -r * 0.45, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(0.4, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); x.restore();
      x.lineWidth = Math.max(2, r * 0.09); if (n.pu && x.createConicGradient) { const cg = x.createConicGradient(0, 0, 0); ['#ff6b6b', '#ffd93d', '#6bff95', '#5ad1ff', '#b06bff', '#ff6bd6', '#ff6b6b'].forEach((cl, i) => cg.addColorStop(i / 6, cl)); x.strokeStyle = cg; } else if (isOvr(n)) x.strokeStyle = '#9ff3ff'; else { const lg = x.createLinearGradient(-r, -r, r, r); lg.addColorStop(0, '#fff6c4'); lg.addColorStop(0.28, '#ffd84a'); lg.addColorStop(0.55, '#f5bd22'); lg.addColorStop(0.78, '#e0a010'); lg.addColorStop(1, '#a86f06'); x.strokeStyle = lg; } x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
      if (!n.pu) { const lw = x.lineWidth; x.lineWidth = Math.max(0.8, r * 0.018); x.strokeStyle = 'rgba(50,28,0,.7)'; x.beginPath(); x.arc(0, 0, r + lw / 2, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(60,35,0,.5)'; x.beginPath(); x.arc(0, 0, r - lw / 2, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,250,220,.6)'; x.lineWidth = Math.max(0.6, r * 0.014); x.beginPath(); x.arc(0, 0, r + lw * 0.2, Math.PI * 1.05, Math.PI * 1.55); x.stroke(); } /* 금테 2.5D 베벨 */
      const out = { c, s: (r + 4) * 2 }; if (ok || !n.img) spr[key] = out; return out; }
    function comboAura(c, x, y, r) { const t = S.time, k = 0.75 + 0.25 * Math.sin(t * 9 + x * 0.05); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.55); g.addColorStop(0, 'rgba(255,120,20,' + (0.55 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,40,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.55, 0, TAU); c.fill(); c.restore(); }
    function drawOrb(c, n, x, y, r, a) { const br = r >= 80 ? 112 : OR, sp = orbSprite(n, br), s = (r + 4 * r / br) * 2; c.save(); c.translate(x, y); c.rotate(a || 0); c.drawImage(sp.c, -s / 2, -s / 2, s, s); c.restore(); }
    function badge(c, x, y, t, col) { c.font = 'bold 12px sans-serif'; const w = c.measureText(t).width + 10; c.fillStyle = '#11141b'; rr(c, x - w / 2, y - 8, w, 16, 8); c.fill(); c.strokeStyle = col || '#ffc21a'; c.lineWidth = 1; c.stroke(); c.fillStyle = col || '#ffc21a'; c.textAlign = 'center'; c.fillText(t, x, y + 4); }

    /* ---------- 물리 ---------- */
    function body(kind, x, y, res) { return { kind, x, y, vx: 0, vy: 0, r: rOf(kind), a: rnd(0, TAU), w: 0, res, sl: false, st: 0, gc: false }; }
    const wake = (L) => L.forEach((b) => { b.sl = false; b.st = 0; });
    function wallsDome(b) {
      const r = b.r; if (b.exit) return; if (b.x < IN.x0 + r) { b.x = IN.x0 + r; if (b.vx < 0) b.vx *= -0.3; } else if (b.x > IN.x1 - r) { b.x = IN.x1 - r; if (b.vx > 0) b.vx *= -0.3; }
      if (S.cap < 0.03 && b.y < IN.y0 + r) { b.y = IN.y0 + r; if (b.vy < 0) b.vy *= -0.2; } const fy = IN.y1 + 28 - Math.abs(b.x - 480) * 0.085; if (b.y > fy - r) { b.y = fy - r; if (b.vy > 0) b.vy *= -0.2; b.vx += b.x < 480 ? 1.6 : -1.6; b.gc = true; }
      const cy = IN.y1 - IN.r; if (b.y > cy) for (let sx = -1; sx <= 1; sx += 2) { const cx = sx < 0 ? IN.x0 + IN.r : IN.x1 - IN.r; if ((b.x - cx) * sx <= 0) continue; const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), lim = IN.r - r; if (d > lim) { const nx = dx / d, ny = dy / d; b.x = cx + nx * lim; b.y = cy + ny * lim; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.25 * vn * nx; b.vy -= 1.25 * vn * ny; } b.gc = true; } }
    }
    function wallsCup(b) { const x0 = CH.x + 12, x1 = CH.x + CH.w - 12, y1 = CH.y + CH.h - 12; if (b.x < x0 + b.r) { b.x = x0 + b.r; if (b.vx < 0) b.vx *= -0.3; } if (b.x > x1 - b.r) { b.x = x1 - b.r; if (b.vx > 0) b.vx *= -0.3; } if (b.y > y1 - b.r) { b.y = y1 - b.r; if (b.vy > 0) b.vy *= -0.25; b.gc = true; } }
    function wallsBask(b) { if (b.x < BK.x0 + b.r) { b.x = BK.x0 + b.r; if (b.vx < 0) b.vx *= -0.35; } if (b.x > BK.x1 - b.r) { b.x = BK.x1 - b.r; if (b.vx > 0) b.vx *= -0.35; } if (b.y > BK.y1 - b.r) { b.y = BK.y1 - b.r; if (b.vy > 0) { if (b.vy > 220) snd.drop(); b.vy *= -0.28; } b.gc = true; } }
    let PW = 360, PH = 230;
    function wallsPile(b) { if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx *= -0.3; } if (b.x > PW - b.r) { b.x = PW - b.r; if (b.vx > 0) b.vx *= -0.3; } if (b.y > PH - b.r) { b.y = PH - b.r; if (b.vy > 0) b.vy *= -0.2; b.gc = true; } }
    function step(L, dt, walls) {
      const n = L.length; let i, j, a, b;
      for (i = 0; i < n; i++) { b = L[i]; b.gc = false; if (b.sl) continue; b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; }
      const O = step.o || (step.o = []); O.length = n; let mr = 0; for (i = 0; i < n; i++) { O[i] = L[i]; if (L[i].r > mr) mr = L[i].r; } const MD = mr * 2 + 2; /* x로 정렬해 가까운 것끼리만 충돌 검사(렉 방지) */
      for (let it = 0; it < 3; it++) { O.sort((p, q) => p.x - q.x);
        for (i = 0; i < n; i++) { a = O[i]; for (j = i + 1; j < n; j++) { b = O[j]; if (b.x - a.x > MD) break; if (a.sl && b.sl) continue; const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r; if (dx > m || dx < -m || dy > m || dy < -m) continue; const d2 = dx * dx + dy * dy; if (d2 >= m * m || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = m - d, vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (a.sl && (vn < -70 || b.held)) { a.sl = false; a.st = 0; } if (b.sl && (vn < -70 || a.held)) { b.sl = false; b.st = 0; }
          const fa = a.sl || a.held ? 0 : (b.sl || b.held) ? 1 : 0.5, fb = b.sl || b.held ? 0 : (a.sl || a.held) ? 1 : 0.5;
          a.x -= nx * ov * fa; a.y -= ny * ov * fa; b.x += nx * ov * fb; b.y += ny * ov * fb;
          if (vn < 0) { const jm = -1.22 * vn; a.vx -= nx * jm * fa; a.vy -= ny * jm * fa; b.vx += nx * jm * fb; b.vy += ny * jm * fb; if (vn < -260 && walls !== wallsPile) snd.drop(); }
          if (ny > 0.35) a.gc = true; else if (ny < -0.35) b.gc = true; } }
        for (i = 0; i < n; i++) if (!L[i].sl) walls(L[i]);
      }
      for (i = 0; i < n; i++) { b = L[i]; if (b.sl) continue; b.vx *= b.gc ? (b.flat ? 0.93 : 0.985) : 0.999; if (b.flat) b.w *= b.gc ? 0.8 : 0.99; else if (b.gc) b.w += (b.vx / b.r - b.w) * Math.min(1, dt * 14); else b.w *= 0.995;
        if (b.held) { b.st = 0; continue; } const mx = b.x - (b.ax || 0), my = b.y - (b.ay || 0); if (mx * mx + my * my > 6.25) { b.ax = b.x; b.ay = b.y; b.st = 0; } else { b.st += dt; if (b.st > 0.55) { b.sl = true; b.vx = b.vy = b.w = 0; } } }
    }
    /* 통 안의 캡슐은 넣을 때 내용물이 정해짐(실제 확률). 자동 리필 없음 */
    function roll() { const u = Math.random() * 100; let nk = null, pu = false; if (u < 1) { nk = P.pickup; pu = true; } else if (u < 1.5) nk = pick(P.pil); else if (u < 4) nk = pick(P.std); if (nk) return { kind: 'SSR', nk: Object.assign({}, nk, { pu }) }; return { kind: u < 47 ? 'SR' : 'R', dummy: Math.random() < 0.04 }; }
    function domeAdd(top) { const res = roll(), b = body(res.kind, rnd(IN.x0 + 30, IN.x1 - 30), top ? -rnd(30, 560) : rnd(IN.y0 + 30, IN.y1 - 30), res); if (top) { b.vy = 320; b.vx = rnd(-30, 30); }  S.dome.push(b); }
    function domeInit() { S.dome = []; for (let i = 0; i < NDOME; i++) domeAdd(false); for (let k = 0; k < 420; k++) step(S.dome, 1 / 120, wallsDome); domeStale = true; }
    function domeTake() { let bi = null, bd = 1e9; for (const b of S.dome) { if (b.exit) continue; const d = Math.hypot((b.x - 480) * 0.7, b.y - IN.y1); if (d < bd) { bd = d; bi = b; } } if (!bi) return null; bi.exit = true; bi.held = true; bi.sl = false; wake(S.dome); return bi; }
    const domeN = () => { let n = 0; for (const b of S.dome) if (!b.exit) n++; return n; };

    /* ---------- 재화 상자(물리) ---------- */
    const PSZ = { doro: { w: 32, h: 32, r: 13.6 }, jw: { w: 26.6, h: 26.6, r: 11.2 }, pick: { w: 37.8, h: 23.3, r: 11.9 }, norm: { w: 37.8, h: 23.3, r: 11.9 } };
    function pileItem(k, x, y, u) { const sc = u === 1 ? 0.62 : 1; return { k, u: u || 10, sc, x, y, vx: rnd(-30, 30), vy: 0, r: PSZ[k].r * sc, a: rnd(-0.6, 0.6), w: rnd(-2, 2), flat: true, sl: false, st: 0, gc: false }; }
    function pileSync() { if (S.doro) { S.pile = S.pile.filter((b) => b.k === 'doro'); wake(S.pile); return; } S.pile = S.pile.filter((b) => b.k !== 'doro'); ['jw', 'pick'].forEach((k) => { const st = Math.max(0, S.stock[k]); [[10, Math.floor(st / PER[k])], [1, Math.floor((st % PER[k]) / (PER[k] / 10))]].forEach(([u, want]) => { const have = S.pile.filter((b) => b.k === k && b.u === u); while (have.length > want) { const top = have.sort((a, b) => a.y - b.y).shift(); S.pile.splice(S.pile.indexOf(top), 1); } for (let i = have.length; i < want; i++) S.pile.push(pileItem(k, rnd(30, PW - 30), -rnd(20, S.fy || 500), u)); }); }); wake(S.pile); }
    function pileResize() { const r = walEl.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); if (!r.width) return; PW = r.width; PH = r.height; wcv.width = Math.round(PW * d); wcv.height = Math.round(PH * d); wake(S.pile); }
    function drawPile() { const d = wcv.width / PW; wctx.setTransform(d, 0, 0, d, 0, 0); wctx.clearRect(0, 0, PW, PH); for (const b of S.pile) { const z = PSZ[b.k], im = b.k === 'doro' && b.u === 10 ? IM.doro10 : IM[b.k]; if (!im || !im.complete) continue; wctx.save(); wctx.translate(b.x, b.y); wctx.rotate(b.a); wctx.scale(b.sc || 1, b.sc || 1); if (b.mag) { wctx.shadowColor = '#ffd93d'; wctx.shadowBlur = 12; } wctx.drawImage(im, -z.w / 2, -z.h / 2, z.w, z.h); wctx.restore(); } }

    /* ---------- 뽑기 ---------- */
    const room = () => CAP - S.bask.length - S.cup.length - S.emerg.length - (S.dome.length - domeN());
    const doroBal = () => (window.doroChips ? window.doroChips.get().b : 0);
    const allowed = () => (S.reveal || S.refill ? 0 : Math.max(0, Math.min(S.credN, room(), domeN())));
    function pull() { const c = S.cred[0]; if (!c || !domeN()) return; c.n--; if (!c.n) S.cred.shift(); S.credN--; const b = domeTake(); if (!b) return; const res = b.res; if (S.doro) res.dm = 1; /* 1칩 = 1뽑 */
      S.stats.n++; S.stats.gold++; if (res.kind === 'SSR') { S.stats.ssr++; if (res.nk.pu) S.stats.pu++; } S.log.push(0); if (S.doro) { S.dnet = (S.dnet || 0) - 1; (S.dlog = S.dlog || [0]).push(S.dnet); } res.sq = S.sq.length; S.sq.push({ k: res.kind, d: 0, a: 0 }); res.blk = blockAdd(res.kind); { const m = comboMul(); if (m > 1) res.cm = m; } /* COMBO 중에 뽑은 캡슐 = 콤보 캡슐(안에서 나오는 칩 n배) */ gDirty = true; snd.tick(); /* AUTO에서도 레버 드르륵 10번 모두 */ uiStat(); }
    /* 10연속 R·SR: 뽑은 순서 기준, 10개가 모두 까졌을 때 확률 고지 */
    function streak(k) { if (!S.doro) return; const p = +(Math.pow(k === 'SR' ? 0.43 : 0.53, 10) * 100).toPrecision(2), ck = chipRoll(k === 'SR' ? 'stkSR' : 'stkR'); S.flash = 0.7; snd.burst(2); vib([40, 30, 40, 30, 120], true); sparks(480, 330, 70, k === 'SR' ? '#b06bff' : '#4f9bff', 700, 200); setTimeout(() => streakCut(k, p, ck), 260); } /* 10연속 보상: 고유 연출 뒤 보상 칩이 바구니로 */
    /* R·SR 10연속 컷인: ?칩이 박히고, 가운데 버튼을 꾹 누르면 단계가 오르내리다 보상이 정해짐. 3초 뒤 탭하여 계속(AUTO는 자동) */
    function streakCut(k, p, ck, demo) {
      rbFont(); S.stk = true; const sr = k === 'SR', ov = document.createElement('div'); ov.className = 'gm-rbcut gm-stk ' + (sr ? 'gm-stk-sr' : 'gm-stk-r');
      const T = k + ' 10연속!', N = 18; let edge = '';
      for (let i = 0; i < N; i++) { const f = i / (N - 1) - 0.5, sc = 1 - 0.075 * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * f, 2)))), dk = (0.08 + Math.abs(f) * 0.75).toFixed(2); edge += '<i style="transform:translateZ(calc(var(--ct) * ' + f.toFixed(3) + ')) scale(' + sc.toFixed(3) + ');--dk:' + dk + '"></i>'; }
      const lay = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => '<span class="t' + x + '">' + T.split('').map((c2, i) => '<b style="--i:' + i + '">' + (c2 === ' ' ? '&nbsp;' : c2) + '</b>').join('') + '</span>').join('');
      const qf = '<div class="gm-qchip">' + chipSvg('s', 260, false, true) + '<b>?</b></div>';
      ov.innerHTML = '<canvas class="gm-rbcv"></canvas><div class="gm-rbfl"></div><div class="gm-rbtx">' + lay + '</div>' +
        '<div class="gm-rbch"><div class="gm-rbtl"><div class="gm-rbsp e-s">' + edge + '<div class="gm-rbf">' + qf + '</div><div class="gm-rbf gm-rbbk">' + qf + '</div></div></div><div class="gm-hring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/></svg></div></div>' +
        '<div class="gm-rbcnt"><b>' + p + '%</b><span>확률</span></div><button type="button" class="gm-hold">꾹 눌러서 열기</button><div class="gm-rbtap"></div>';
      (document.fullscreenElement || document.body).appendChild(ov);
      const bg = rbBg(ov.querySelector('canvas'), sr ? { bg: ['#6a1bff', '#b23dff', '#ff4fd8', '#8a5cff', '#3a1bff', '#c070ff', '#6a1bff'], pal: [], flowers: false, burst: false } : { bg: ['#0a5bff', '#22b8ff', '#5ad1ff', '#1f7dff', '#3a4bff', '#7fe0ff', '#0a5bff'], pal: [], flowers: false, burst: false, rays: false, lines: false });
      const ch = ov.querySelector('.gm-rbch'), sp = ov.querySelector('.gm-rbsp'), ring = ov.querySelector('.gm-hring circle'), btn = ov.querySelector('.gm-hold'), cnt = ov.querySelector('.gm-rbcnt span'), IMP = 700;
      ch.animate([{ transform: 'scale(.1) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.5) rotate(6deg)', opacity: 1, offset: 0.72, easing: 'cubic-bezier(.75,0,1,.6)' }, { transform: 'scale(1)' }], { duration: IMP, fill: 'both' });
      try { snd.riser(); } catch (e) { /* 무시 */ }
      setTimeout(() => { ov.classList.add('hit'); bg.hit(); vib([60, 30, 100], true); try { snd.boom(); } catch (e) { /* 무시 */ } T.split('').forEach((c2, i) => setTimeout(() => { try { snd.thud(i >= T.length - 1); } catch (e) { /* 무시 */ } }, 120 + i * 70)); setTimeout(() => ov.classList.add('askhold'), 120 + T.length * 70 + 200); }, IMP);
      /* 꾹 누르기: 1.8초 동안 누르면 열림. 손을 떼면 천천히 줄어듦. 진행에 따라 단계(도로→실버→골드→무지개)가 오르내림 */
      const path = stagePath(ck), HOLD = 1800; let prog = 0, holding = false, last = 0, raf = 0, stI = 0, done = false;
      const setSt = (st) => { sp.className = 'gm-rbsp e-' + st; ov.dataset.st = st; };
      const tick = (now) => { const dt = Math.min(50, now - (last || now)); last = now; if (done) return;
        prog = holding ? Math.min(1, prog + dt / HOLD) : Math.max(0, prog - dt / 4000); ring.style.strokeDashoffset = (296 * (1 - prog)).toFixed(1); ch.style.setProperty('--shk', (holding ? 1 + prog * 5 : 0) + 'px');
        const want = Math.min(path.length - 1, Math.floor(prog * path.length * 0.999)); while (stI < want) { stI++; const up = STG.indexOf(path[stI]) > STG.indexOf(path[stI - 1]); setSt(path[stI]); try { if (up) snd.chipBurst(path[stI] === 'r' || path[stI] === 'g'); else snd.fail(); } catch (e) { /* 무시 */ } if (up && path[stI] === 'r') edgeTo(0.3, 180); else if (!up && path[stI - 1] === 'r') edgeTo(0, 700); }
        if (ov.dataset.st === 'r' && edgeK > 0 && edgeK < 1 && edgeM && performance.now() - edgeM.t0 > edgeM.ms) edgeSet(Math.min(0.999, Math.max(0.3, 0.3 + 0.7 * prog))); /* 누를수록 커짐, 떼면 줄어듦 */
        if (prog >= 1) { reveal(); return; } raf = requestAnimationFrame(tick); };
      const down = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (done || !ov.classList.contains('askhold')) return; holding = true; ov.classList.add('holding'); if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
      const up = () => { holding = false; ov.classList.remove('holding'); };
      btn.addEventListener('pointerdown', down); ch.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      function reveal() {
        done = true; holding = false; cancelAnimationFrame(raf); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); ov.classList.remove('holding', 'askhold'); ov.classList.add('revealed'); setSt(ck); if (ck === 'r') edgeFlare(); else if (edgeK > 0) edgeTo(0, 500);
        const fx = ck === 'g' || ck === 'r', face = chipSvg(ck, 260, fx, true); ov.querySelectorAll('.gm-rbf').forEach((f) => { f.innerHTML = face; });
        ch.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
        const fl2 = ov.querySelector('.gm-rbfl'); fl2.style.animation = 'none'; void fl2.offsetWidth; fl2.style.animation = 'gmRbFlash .9s ease-out both';
        try { snd.chipBurst(ck === 'r' || ck === 'g'); snd.chipPop(); if (ck === 'g' || ck === 'r') setTimeout(() => snd.fanfare(), 200); } catch (e) { /* 무시 */ } vib(ck === 'b' ? [40] : [60, 30, 120], true);
        cnt.textContent = '확률 · 보상 ' + CHIP_NM[ck] + '!';
        setTimeout(() => { ov.classList.add('ok'); okNow = true; }, 450); if (S.auto) setTimeout(close, 1400);
      }
      let okNow = false, closed = false;
      const close = () => { if (closed) return; closed = true; ov.classList.add('out'); setTimeout(() => { bg.stop(); ov.remove(); S.stk = false; if (!demo) dropChip(ck, rnd(BK.x0 + 200, BK.x1 - 200), BK.y0 + 40, 'streak'); }, 260); };
      ov.addEventListener('pointerdown', (e) => { if (e.target.closest('.gm-hold') || e.target.closest('.gm-rbch')) return; e.preventDefault(); if (okNow) close(); });
      if (S.auto) setTimeout(() => { if (!done) { holding = true; ov.classList.add('holding'); last = 0; raf = requestAnimationFrame(tick); } }, IMP + 120 + T.length * 70 + 600); /* AUTO: 알아서 꾹 누름 */
    }
    function seqDone(res) { const q = S.sq, i = res && res.sq; if (i == null || !q[i] || q[i].d) return; q[i].d = 1; if (res.kind === 'SSR' && res.blk != null && (S.mode.random || S.mode.black)) { const T2 = S.blkT || (S.blkT = {}), e = T2[res.blk] || (T2[res.blk] = { tot: -1, seen: 0, said: 0 }); e.seen++; blkSay(res.blk); } }
    /* 처음 뽑은 것부터 10개씩 끊어서, 그 10개가 사출되는 순간 판정(DOUBLE·TRIPLE·10연속). 많이 쌓아 뒀다 열어도 엉뚱한 고지가 없음 */
    function blockAdd(kind) { const i = Math.floor((S.stats.n - 1) / 10); let B = S.blk; if (!B || B.i !== i) B = S.blk = { i, c: {}, n: 0 }; B.n++; B.c[kind] = (B.c[kind] || 0) + 1;
      if (B.n !== 10) return i; const ssr = B.c.SSR || 0, hid = S.mode.random || S.mode.black;
      if (hid) { const T2 = S.blkT || (S.blkT = {}); T2[i] = { tot: ssr, seen: (T2[i] && T2[i].seen) || 0, said: (T2[i] && T2[i].said) || 0 }; blkSay(i); } /* 가려진 모드: 그 묶음의 SSR이 열릴 때마다 두 번째에 DOUBLE, 마지막에 TRIPLE… */
      else if (ssr >= 2) setTimeout(() => multiPop(ssr), 250); if (B.c.R === 10) setTimeout(() => streak('R'), 400); else if (B.c.SR === 10) setTimeout(() => streak('SR'), 400); return i; }
    function blkSay(i) { const q = S.blkT && S.blkT[i]; if (!q || q.tot < 2) return; const n = Math.min(q.seen, q.tot); if (n >= 2 && n > q.said) { q.said = n; setTimeout(() => multiPop(n), 300); } }
    S.sup = { pick: 0, jw: 0, full: false, acc: 0, key: '' };
    const feedCap = () => Math.max(12, Math.floor(PW * PH * 0.8 / 490));
    function uiFeed() { const b = modeEl.querySelector('.gm-fb'); if (!b) return; const u = S.sup; b.classList.toggle('full', u.full); b.classList.toggle('run', !u.full && (u.pick > 0 || u.jw > 0)); }
    function feedTick(dt) { const u = S.sup; if (u.pick <= 0 && u.jw <= 0 && !u.full) return; const cap = feedCap(), n = S.pile.length;
      if (!u.full && n >= cap) { u.full = true; uiFeed(); return; } if (u.full) { if (n <= cap * 0.5) { u.full = false; uiFeed(); } else return; }
      u.acc += dt; if (u.acc < 0.09) return; u.acc = 0; S.fy = 50;
      ['pick', 'jw'].forEach((k) => { const d = Math.min(PER[k], u[k]); if (d > 0) { u[k] -= d; S.stock[k] += d; } }); pileSync(); S.fy = 0; snd.grab(); uiFeed(); }
    function credit(k, n) { S.cred.push({ k, n }); S.credN += n; S.led = 1; }
    function insert(k, items, x, y) { items.forEach((it, i) => { const u = it.u || 10; if (k !== 'doro') S.stock[k] -= PER[k] / 10 * u; const a = i * 2.4, r = i ? 10 + i * 5 : 0; S.ins.push({ k, u, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: -i * 0.3, snd: false }); }); uiWal(); }
    function say(t) { S.msg = { t, life: 2.4 }; }
    /* 모드 전환: DORO MODE에서 나갈 때는 이미 칩으로 뽑은 것(바구니·컵·개봉 중)을 다 처리한 뒤 바꿈 */
    function setDoro(v, remote) {
      v = !!v; if (v === !!S.doro && !S.dmOut) return;
      if (!v && S.doro) { if (!remote) { S.dmOut = true; uiWal(); return; } } /* 바구니 정리가 끝나면 dmTick이 마저 바꿈 */
      if (v && !window.doroChips) { say('DORO칩을 불러오지 못했습니다.'); return; }
      if (!remote) { DM.on = v; lss('dsgm-doro', v ? '1' : '0'); GM_ALL.forEach((x) => { if (x.S !== S && x.setDoro) x.setDoro(v); }); }
      S.doro = v; S.dmOut = false; S.dpile = 0; S.dlog = [0]; S.dnet = 0; gDirty = true; S.pile = []; pileSync(); dirty = true; traySave(); TRAY_K = TRAY_K0 + (v ? '-doro' : ''); S.tray = []; trayLoad();
      S.cred = []; S.credN = 0; S.bask = []; S.cup = []; S.emerg = []; S.pops = []; S.ins = []; S.lab = 0; S.reveal = null; S.grab = null; S.blk = null; S.blkT = null; S.streak = null; S.lev.q = 0;
      S.auto = v ? 2 : 0; S.autoLid = false; const ab = root.querySelector('[data-a=auto]'); if (ab) { ab.textContent = S.auto ? 'AUTO ×' + S.auto : 'AUTO'; ab.classList.toggle('on', !!S.auto); }
      for (const k in spr) if (/^(R|SR|SSR|Q)/.test(k)) delete spr[k]; /* 캡슐 모양(무지개) 다시 그림 */
      domeStale = true; uiWal(); uiTray(); uiLab(); feverTick(); say(v ? 'DORO MODE: 1 DORO칩 = 1뽑 · 2배속 AUTO' : '일반 모드');
    }
    /* 잔고에서 골드칩(DORO칩 10 = 10뽑)으로 꺼내 재화 상자에 떨어뜨림. 실제로 쓰는 건 투입구에 넣을 때 */
    function doroWithdraw(n) {
      const av = Math.max(0, doroBal() - (S.dpile || 0)), room2 = Math.max(0, 2000 - (S.dpile || 0)); if (room2 <= 0) { say('재화 상자에는 골드칩을 200개까지 둘 수 있습니다.'); return; } n = Math.min(n, av, room2); /* 골드칩 최대 200개 */ if (n <= 0) { say('꺼낼 DORO칩이 없습니다.'); return; }
      n -= n % 10; if (n <= 0) { say('골드칩 1개(DORO칩 10)부터 꺼낼 수 있습니다.'); return; } const tens = n / 10, ones = 0, num = wtEl.querySelector('.gm-dmb'), wr = walEl.getBoundingClientRect(), nr = num ? num.getBoundingClientRect() : wr, sx = clamp(nr.left - wr.left + 20, 20, PW - 20), sy = clamp(nr.top - wr.top + nr.height / 2, 10, PH - 20);
      S.dpile = (S.dpile || 0) + n; let i = 0; const drop = (u) => { const b = pileItem('doro', sx + rnd(-14, 14), sy, u); b.vx = rnd(30, 160); b.vy = rnd(-260, -80); b.w = rnd(-6, 6); S.pile.push(b); wake(S.pile); };
      for (let k = 0; k < tens; k++) setTimeout(() => { drop(10); try { snd.chipPop(); } catch (e) { /* 무시 */ } }, (i++) * 70);
      for (let k = 0; k < ones; k++) setTimeout(() => drop(1), (i++) * 70);
      uiWal();
    }
    let dmT = 0;
    function dmTick() {
      if (!S.doro) return; const now = performance.now(); if (now - dmT < 400) return; dmT = now; const bl = Math.max(0, doroBal() - (S.dpile || 0)), w = wtEl.querySelector('.gm-dmb span'); if (w && w.textContent !== fmt(bl)) uiWal();
      if (S.dmOut) { const busy = S.credN > 0 || S.ins.length > 0 || S.lev.q > 0 || S.lev.auto > 0 || S.reveal || S.cup.length || S.emerg.length || S.pops.length || S.dome.some((b) => b.exit) || S.bask.length > 0; if (!busy) setDoro(false, true); else if (!S.auto) S.auto = 2; }
    }
    function setMode(k, v) { S.mode[k] = v; [S.dome, S.bask, S.cup].forEach((L) => L.forEach((b) => { if (b && b.kind !== 'orb') b.r = rOf(b.kind); })); wake(S.dome); wake(S.bask); domeStale = true; uiOpt(); }
    function refill() { if (S.refill) return; if (S.dome.length >= NDOME) { say('통이 이미 가득 차 있습니다.'); return; } S.refill = { t: 0, acc: 0 }; snd.lid(); }

    /* ---------- 캡슐 까기 ---------- */
    function popStart(L) { if (!L.length) return; const gap = Math.min(0.03, 2.2 / L.length); L.sort((a, b) => a.y - b.y).forEach((b, i) => { if (!b.pop) { b.pop = 1; S.pops.push({ b, t: -i * gap, hop: false }); } }); }
    /* 깨트려서 열기: 캡슐이 조각나 사방으로 흩어짐 */
    function shards(x, y, r, cc) { for (let i = 0; i < 26; i++) { const ang = rnd(0, TAU), d = rnd(0.1, 0.85) * r, v = rnd(260, 820), m = rnd(0.12, 0.28) * r, nv = 3 + ((Math.random() * 3) | 0), poly = []; for (let k = 0; k < nv; k++) { const t = k / nv * TAU + rnd(-0.4, 0.4); poly.push([Math.cos(t) * m * rnd(0.5, 1.2), Math.sin(t) * m * rnd(0.5, 1.2)]); }
      S.parts.push({ ty: 'shard', x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - rnd(150, 380), a: rnd(0, TAU), w: rnd(-14, 14), poly, col: Math.sin(ang) < 0 ? cc[0] : cc[1], life: 0 }); } }
    function shells(x, y, r, a, col, up) { for (let h = 0; h < 2; h++) S.parts.push({ ty: 'shell', x, y, vx: (h ? 1 : -1) * rnd(120, 300), vy: rnd(-520, -300) * (up || 1), a, w: (h ? 1 : -1) * rnd(6, 14), r, col: col[h ? 1 : 0], top: !h }); }
    function popBurst(b) { const i = S.bask.indexOf(b); if (i < 0) return; S.bask.splice(i, 1); wake(S.bask); snd.pop(); const col = COL[look(b)[0]];
      shells(b.x, b.y, b.r, b.a, col); sparks(b.x, b.y, 5, COL[b.kind][0]); S.parts.push({ ty: 'lab', x: b.x, y: b.y, sx: b.x, sy: b.y, t: 0, val: LABEL[b.kind] }); capChip(b.x, b.y, b.kind, b.res.cm); seqDone(b.res); }
    function sparks(x, y, n, col, v0, g) { for (let k = 0; k < n; k++) { const a = rnd(0, TAU), v = rnd(80, v0 || 320); S.parts.push({ ty: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: g == null ? 220 : g, life: 0, max: rnd(0.3, 0.9), col: typeof col === 'function' ? col() : (col || '#ffe08a'), size: rnd(2, 5) }); } }
    /* 개봉 연출: 단계(0 파랑 → 1 보라 → 2 금 → 3 특별)가 진행도에 따라 고지됨. 가짜 승급(fake) 후 실패(fail)도 섞임 */
    function startReveal(b) { const i = S.bask.indexOf(b); if (i < 0) return; S.bask.splice(i, 1); wake(S.bask);
      const res = b.res, nk = res.nk || null, kind = res.kind, T = kind === 'R' ? 0 : kind === 'SR' ? 1 : (nk.pu || isOvr(nk) || isSSS(nk)) ? 3 : 2, rand = S.mode.random, ev = [];
      let method = S.openM === 'mix' ? pick(['pull', 'tap', 'hold', 'auto']) : S.openM;
      if (rand) { for (let lv = 1; lv <= T; lv++) ev.push({ p: clamp(0.16 + 0.64 * lv / (T + 0.5) + rnd(-0.04, 0.04), 0.1, 0.9), lv }); if (T < 3 && Math.random() < [0.1, 0.14, 0.2][T]) { ev.push({ p: 0.8, lv: T + 1, fake: true }); ev.push({ p: 0.94, lv: T, fail: true }); } }
      else if (T === 3) ev.push({ p: Math.random() < 0.5 ? 0.9 : 0.42, lv: 3 }); else if (Math.random() < 0.2) { ev.push({ p: 0.6, lv: 3, fake: true }); ev.push({ p: 0.9, lv: 2, fail: true }); }
      if (rand && res.dummy && kind !== 'SSR') { const u = Math.random(), pk = Math.max(T, u < 0.2 ? 0 : u < 0.5 ? 1 : u < 0.8 ? 2 : 3); ev.length = 0; for (let lv = 1; lv <= pk; lv++) ev.push({ p: clamp(0.14 + 0.66 * lv / (pk + 0.5) + rnd(-0.03, 0.03), 0.1, 0.86), lv }); if (pk > T) ev.push({ p: 0.95, lv: T, fail: true }); }
      S.reveal = { res, nk, kind, T, grow: 0, hold: false, skin: T === 3 ? (nk.pu || isSSS(nk) ? 'rb' : 'ov') : pick(['rb', 'ov']), method, ev, ei: 0, shown: rand ? 0 : 2, fakeOn: false, prog: 0, t: 0, ph: 'in', x0: b.x, y0: b.y, a0: b.a % TAU, r0: b.r, lk: look(b), taps: 0, cracks: [], drag: null, punch: 0, shake: 0, rings: [], hb: 0, D: 1.25 + 0.55 * ev.length,
        pu: !!(nk && nk.pu), ovr: !!(nk && isOvr(nk)), isNew: !!nk && !S.tray.some((x) => x && x.nk.n === nk.n) }; }
    function lvCol(R, lv, al) { if (lv < 3) { const h = LVC[lv]; return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + al + ')'; } return R.skin === 'ov' ? 'rgba(150,240,255,' + al + ')' : 'hsla(' + ((S.time * 200) % 360) + ',100%,70%,' + al + ')'; }
    function revEvent(R, e) { R.shown = e.lv; R.fakeOn = !!e.fake; R.rings.push({ t: 0, lv: e.lv }); R.shake = 1; if (!e.fail && e.lv >= 2) vib(e.lv === 3 ? [50, 40, 110] : 45); if (e.fail) { snd.fail(); S.flash = 0; sparks(RV.x, RV.y, 26, '#8a93a3', 380, 500); } else if (e.fake) { snd.fakeUp(); S.flash = 0.2; } else { snd.up(e.lv); S.flash = 0.3; sparks(RV.x, RV.y, 30, () => lvCol(R, e.lv, 1), 520, 120); } }
    function revBurst(R) { while (R.ei < R.ev.length) { const e = R.ev[R.ei++]; R.shown = e.lv; R.fakeOn = false; } R.shown = R.T; R.ph = 'hit'; R.t = 0; R.drag = null; }
    function orbBody(nk, count, x, y, cm) { const b = body('orb', x, y, { nk, count: count || 1, cm: cm > 1 ? cm : 0 }); S.bask.push(b); return b; }
    function endReveal(toBasket) { const R = S.reveal; if (!R) return; S.reveal = null; if (toBasket && R.nk) orbBody(R.nk, 1, RV.x + rnd(-30, 30), BK.y0 - 60, R.res.cm).vy = 100; }
    function flyOrb(nk, count, x, y, cm) { // 바구니 → 보관함으로 날아감
      const r = cvRect(), el = document.createElement('div'); el.className = 'gm-float orb'; el.style.cssText = 'left:' + (r.left + x * r.width / W) + 'px;top:' + (r.top + y * r.height / H) + 'px;transition:left .5s cubic-bezier(.3,.1,.2,1),top .5s cubic-bezier(.5,-.4,.3,1),transform .5s;' + orbBg(nk); (document.fullscreenElement || document.body).appendChild(el);
      let i = S.tray.findIndex((x) => x && x.nk.n === nk.n); if (i < 0) i = trayFree(); const well = panEl.children[i] || panEl.lastElementChild; let w = well.getBoundingClientRect(); const tb = leftEl.querySelector('.gm-trbtn'), tbv = tb && tb.offsetParent && !$('.gm').classList.contains('topen'); if (tbv) w = tb.getBoundingClientRect(); else if (!w.width) w = cv.getBoundingClientRect(); void el.offsetWidth; el.style.left = (w.left + w.width / 2) + 'px'; el.style.top = (w.top + w.height / 2) + 'px'; el.style.transform = 'translate(-50%,-50%) scale(' + (w.width / 78) + ')';
      setTimeout(() => { el.remove(); trayAdd(nk, count, null, null, null, cm); if (tbv) { tb.classList.add('pop'); setTimeout(() => tb.classList.remove('pop'), 180); } }, 520 / (S.auto || 1)); }
    /* ---------- 도로칩 ---------- */
    const CHIP_VAL = { b: 1, s: 5, g: 10 }, CHIP_NM = { r: '무지개 DORO칩', g: '골드칩', s: '실버칩', b: 'DORO칩' };
    const CHT = (o.chipTiers && o.chipTiers.boss) || TIERS.boss; /* DORO칩 판정은 기본 티어표 고정(유저가 바꾼 티어 무시) */
    /* 도로칩 확률표 [도로, 실버, 골드, 무지개](%) — 목표: 도로칩 1,000개당 무지개 1개 */
    const CHIP_P = {
      SSS: [2, 8, 89, 1], SS: [15, 35, 49.9, 0.1], S: [45, 45, 9.96, 0.04], low: [85, 13, 1.992, 0.008],
      capR: [90, 9, 0.995, 0.005], capSR: [80, 17, 2.988, 0.012], stkR: [0, 20, 72, 8], stkSR: [0, 0, 70, 30], /* 10연속: 확률이 낮은 만큼 크게 */
    };
    const CAP_RATE = { R: 10, SR: 15 }; /* R·SR 캡슐을 열 때 칩이 나올 확률(%) — DORO MODE 1칩 = 1뽑, 10뽑마다 전부 개봉·개봉 중 시간 정지(10뽑당 게임 시간 약 2.3초) 기준 환수율 약 105% */
    const KS = ['b', 's', 'g', 'r'], tierGrp = (nk) => { const t = CHT[nk.n]; return t === 'SSS' || t === 'SS' || t === 'S' ? t : 'low'; };
    /* DORO TIME(무지개칩 획득 후 5분): 무지개·골드·실버 확률 2배(위 등급부터 채우고 남는 만큼 DORO칩), 캡슐 칩 확률도 2배 */
    const FEV_K = 'dsgm-fever', FEV_MS = 5 * 60 * 1000;
    const fevEnd = () => { const v = +lsg(FEV_K) || 0; return v > 1e12 ? 0 : v; }; /* 예전(실제 시각) 값은 무시 */
    const feverOn = () => DM.on && DCLK.v < fevEnd();
    const fevP = (a) => { const r = Math.min(2 * a[3], 100), g = Math.min(2 * a[2], 100 - r), s2 = Math.min(2 * a[1], 100 - r - g); return [100 - r - g - s2, s2, g, r]; };
    const chipRoll = (key) => { const p = feverOn() ? fevP(CHIP_P[key]) : CHIP_P[key], u = Math.random() * 100; let a = 0; for (let i = 0; i < 4; i++) { a += p[i]; if (u < a) return KS[i]; } return 'b'; };
    const mkTop = (e) => ({ nk: e.nk, cm: e.cq && e.cq.length ? e.cq.shift() : 0 }); /* 맨 위 장: 남은 콤보 배수 중 가장 큰 것부터 */
    const isSSSn = (nk) => CHT[nk.n] === 'SSS', chipOf = (nk) => chipRoll(tierGrp(nk)), chipE = (en) => { if (!en.ck || en.ck === 'x') en.ck = chipOf(en.nk); return en.ck; }, chipSvg = (k, px, fx, flat) => (window.doroChipSvg ? window.doroChipSvg(k, px, fx, flat) : '');
    /* 2.5D 도로칩(두께 있는 원판, 기울어진 채 회전): 날아가는 칩용 */
    const C3E = (() => { let h = ''; for (let i = 0; i < 9; i++) { const f = i / 8 - 0.5, sc = 1 - 0.07 * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * f, 2)))); h += '<i style="transform:translateZ(calc(var(--ct) * ' + f.toFixed(3) + ')) scale(' + sc.toFixed(3) + ');--dk:' + (0.05 + Math.abs(f) * 0.7).toFixed(2) + '"></i>'; } return h; })();
    const chip3d = (k, px, fx, spin) => { const sv = chipSvg(k, px, fx, true); return '<div class="gm-c3 gm-c3-' + k + '" style="--cs:' + px + 'px"><div class="gm-c3r" style="animation-duration:' + (spin || 0.9).toFixed(2) + 's;animation-delay:-' + (Math.random() * 2).toFixed(2) + 's">' + C3E + '<div class="gm-c3f">' + sv + '</div><div class="gm-c3f gm-c3b">' + sv + '</div></div></div>'; };
    const C3L = {}, chipLite = (k, px, spin) => { const u = C3L[k] || (C3L[k] = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chipSvg(k, 64, false, true).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) + '")'); return '<div class="gm-c3l gm-c3l-' + k + '" style="--cs:' + px + 'px;background-image:' + u + ';animation-duration:' + (spin || 0.9).toFixed(2) + 's;animation-delay:-' + (Math.random() * 2).toFixed(2) + 's"></div>'; };
    S.doro = DM.on; GM_ALL.push({ S, setDoro: (v) => setDoro(v, true) });
    const balEl = $('.gm-chipbal'); let chipPend = 0, chipPendR = 0, chipSeq = 0;
    /* 잔고 숫자: 바뀌면 이전 값에서 굴러 올라감 */
    function rollNum(el, to) { if (!el) return; const from = el._v == null ? to : el._v; el._v = to; cancelAnimationFrame(el._raf); if (from === to || !el.isConnected) { el.textContent = to.toLocaleString('ko-KR'); return; }
      const t0 = performance.now(), D = Math.min(700, 220 + Math.abs(to - from) * 6); const run = (now) => { const p = Math.min(1, (now - t0) / D), v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('ko-KR'); if (p < 1) el._raf = requestAnimationFrame(run); }; el._raf = requestAnimationFrame(run); }
    function uiBal(bump) {
      if (!balEl) return; const w = window.doroChips, o = w ? w.get() : { b: 0, s: 0, g: 0, r: 0 }, tot = o.b + o.s * 5 + o.g * 10;
      rollNum(balEl.querySelector('.gm-cbn'), Math.max(0, tot - chipPend));
      const rr = balEl.querySelector('.gm-cbr'), rv = Math.max(0, o.r - chipPendR); rr.hidden = !(o.r > 0 || chipPendR > 0); rollNum(rr.querySelector('b'), rv);
      if (bump) { const t = bump === 'r' ? rr : balEl; t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
    }
    window.addEventListener('dorochips', () => uiBal()); uiBal();
    /* 칩이 잔고 숫자로 빨려 들어감. 실버칩은 도로칩 5개, 골드칩은 10개로 쪼개진 뒤 들어감 */
    let flyN = 0, sndT = 0, balQ = 0, balB = null; /* 날아가는 칩 수 · 효과음/잔고 갱신은 프레임당 한 번 */
    const balSoon = (b) => { if (b) balB = b === 'r' || balB === 'r' ? 'r' : b; if (balQ) return; balQ = requestAnimationFrame(() => { balQ = 0; const x = balB; balB = null; uiBal(x); }); };
    function chipAbsorb(k, n, cx, cy, size, src, cm, whole) {
      if (!window.doroChips) { say('DORO칩을 불러오지 못했습니다.'); return; }
      n = n || 1; if (k !== 'r' && cm > 1) { cmulPop(cx, cy, cm); let v = (CHIP_VAL[k] || 1) * (n || 1) * cm; const parts = [['g', Math.floor(v / 10)], ['s', Math.floor((v % 10) / 5)], ['b', v % 5]].filter((p) => p[1] > 0); /* n배 → 골드·실버칩 단위로 개수 최소화 */ parts.forEach((p, j) => setTimeout(() => chipAbsorb(p[0], p[1], cx, cy, size, src, 1, true), j * 140)); return; } const host = document.fullscreenElement || document.body, isR = k === 'r', unit = CHIP_VAL[k] || 0, total = isR ? n : unit * n;
      if (isR) chipPendR += n; else chipPend += total; if (S.doro && !isR && src !== 'daily') { S.dnet = (S.dnet || 0) + total; S.dlog = S.dlog || [0]; S.dlog[S.dlog.length - 1] = S.dnet; gDirty = true; } /* DORO 수지 */
      window.doroChips.add({ [k]: n }, src || 'ssr');
      const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
      const tbtn = leftEl.querySelector('.gm-trbtn'), toBtn = !vis(balEl) && vis(tbtn); /* 모바일처럼 보관함이 접혀 있으면 보관함 아이콘으로 */
      let br = toBtn ? vis(tbtn) : vis(balEl ? (isR ? balEl.querySelector('.gm-cbr') : balEl) : null) || vis(balEl);
      if (!br) { const r0 = root.getBoundingClientRect(); br = { left: r0.right - 60, top: r0.top + 10, width: 20, height: 20 }; }
      const tx = br.left + Math.min(14, br.width / 2), ty = br.top + br.height / 2;
      const lite = whole || (!isR && unit > 1 && (S.lite > 0 || flyN > 24)); /* 여러 칸을 한꺼번에 정산할 때는 분열 없이 그 칩 그대로 날아감(렉 방지) */
      const P = whole ? Math.min(n, 12) : lite ? Math.min(n, 3) : Math.min(total, isR ? 12 : 60), per = total / P, split = !isR && unit > 1 && !lite, ps = split ? Math.max(14, size * (unit >= 10 ? 0.42 : 0.5)) : size, rad = split ? (unit >= 10 ? Math.max(70, size * 1.7) : Math.max(50, size * 1.2)) * Math.min(1.6, 1 + (n - 1) * 0.15) : 0;
      const seq = ++chipSeq; let arrived = 0, acc = 0;
      const launch = () => {
        if (split) { try { snd.chipBurst(unit >= 10); } catch (e) { /* 무시 */ } }
        for (let i = 0; i < P; i++) {
          const d = document.createElement('div'); d.className = 'gm-chipfly'; flyN++; d.innerHTML = chip3d(isR ? 'r' : split ? 'b' : k, Math.round(ps), isR || (!split && k === 'g'), split ? rnd(0.5, 0.9) : 1.1); /* 작은 분열 칩은 가벼운 2D 회전판 */ d.style.left = (cx - ps / 2) + 'px'; d.style.top = (cy - ps / 2) + 'px'; host.appendChild(d);
          const a = rnd(0, TAU), rr = split ? rad * Math.sqrt(rnd(0.08, 1)) : 0, sx = Math.cos(a) * rr, sy = Math.sin(a) * rr * 0.85, ex = tx - cx, ey = ty - cy;
          const stag = split ? (unit >= 10 ? i * 22 : i * 40) : i * 60, T = split ? 980 : 720;
          const kf = split
            ? [{ transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.1,.8,.2,1)' }, { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1) rotate(' + rnd(-90, 90) + 'deg)', opacity: 1, offset: 0.36 }, { transform: 'translate(' + sx + 'px,' + (sy + 4) + 'px) scale(1) rotate(0deg)', opacity: 1, offset: 0.5, easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.35) rotate(180deg)', opacity: 0.9 }]
            : [{ transform: 'translate(0,0) scale(1)', opacity: 1, easing: 'cubic-bezier(.25,.1,.25,1)' }, { transform: 'translate(0,-10px) scale(1.06)', opacity: 1, offset: 0.22, easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.3) rotate(200deg)', opacity: 0.9 }]; /* 살짝 떠올랐다가 부드럽게 날아감 */
          const an = d.animate(kf, { duration: T, delay: stag, fill: 'both' });
          an.onfinish = () => { d.remove(); flyN--; arrived++; acc += per; const v = i === P - 1 || arrived === P ? Math.round(acc) : Math.floor(acc); acc -= v; if (isR) chipPendR = Math.max(0, chipPendR - v); else chipPend = Math.max(0, chipPend - v); balSoon(isR ? 'r' : true); if (toBtn && arrived === P) { tbtn.classList.remove('pop'); void tbtn.offsetWidth; tbtn.classList.add('pop'); } const nw = performance.now(); if (nw - sndT > 35 || arrived === P) { sndT = nw; try { snd.chipIn(arrived / P, !isR && unit === 1); } catch (e) { /* 무시 */ } } };
        }
      };
      if (split) { /* 큰 칩이 부풀었다가 터지며 분열 */
        const big = document.createElement('div'); big.className = 'gm-chipfly'; big.innerHTML = chip3d(k, Math.round(size), true, 1.4); big.style.left = (cx - size / 2) + 'px'; big.style.top = (cy - size / 2) + 'px'; host.appendChild(big);
        const an = big.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.82)', opacity: 1, offset: 0.45 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 300, easing: 'ease-in' }); an.onfinish = () => { big.remove(); launch(); };
      } else launch();
    }
    /* SSS 초상화 뒤집기: 천천히 세워 절반 직전(옆면이 보일락 말락)에서 멈추고, 틈새로 금빛이 샘.
       그 사이 빛이 무지개로 오르면 무지개 DORO칩(5%), 무지개로 올랐다가 다시 뒤집히기 직전에 금빛으로 내려오면 골드칩(가짜 연출).
       무지개 빛이 오르는 경우는 SSS의 20%(진짜 5% + 가짜 15%) */
    /* 상위 연출: 천천히 세워 절반 직전에서 멈추고, 틈새로 빛이 터져 나오며 도로→실버→골드→무지개로 한 단계씩 바뀜.
       단계는 오르기도 하고(가짜면) 넘쳤다가 내려오기도 함. 결과 단계에서 멈춘 뒤에야 마저 뒤집힘(결과는 그 전엔 안 보임) */
    const STG = ['b', 's', 'g', 'r'], STG_COL = { b: ['#ffb24a', '#ff8a00'], s: ['#ffffff', '#cfd8e6'], g: ['#fff1a8', '#ffc21a'], r: ['#ff5d8f', '#5ab8ff', '#f6f05a', '#5ef0a0', '#b47cff'] };
    function stagePath(k) {
      const end = STG.indexOf(k), path = [0];
      let peak = end;
      if (end < 3 && Math.random() < 0.3) peak = Math.min(3, end + 1 + (Math.random() < 0.25 ? 1 : 0)); /* 가짜: 넘쳤다가 내려옴 */
      for (let i = 1; i <= peak; i++) path.push(i);
      for (let i = peak - 1; i >= end; i--) path.push(i);
      return path.map((i) => STG[i]);
    }
    /* 뒤집을 때 어떤 연출로 할지: SSS는 늘 상위 연출, 나머지는 결과가 좋을수록 자주 */
    const SLOW_P = { b: 0.03, s: 0.12, g: 0.35, r: 1 };
    const wantSlow = (t, k) => isSSSn(t.nk) || Math.random() < SLOW_P[k];
    /* 골드칩 확정: 칩 위로 GOLD! 글자가 튀어오르고 금빛 고리가 퍼짐 */
    function goldPop(el) { const host = document.fullscreenElement || document.body, r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null, cx = r && r.width ? r.left + r.width / 2 : innerWidth / 2, cy = r && r.width ? r.top + r.height / 2 : innerHeight / 2, sz = r && r.width ? r.width : 60;
      const d = document.createElement('div'); d.className = 'gm-gpop'; d.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;--sz:' + sz + 'px'; d.innerHTML = '<i></i><i></i><b>GOLD!</b>'; host.appendChild(d); setTimeout(() => d.remove(), 1300); vib([30, 20, 50]); }
    /* 한 번의 10연속에서 SSR이 2장 이상: DOUBLE! / TRIPLE! … */
    function multiPop(n, demo) { if (!S.doro && !demo) return; /* 일반 모드: 순수 가챠(고지·COMBO 없음) */ comboHit(n, demo); /* 보상 칩 없음: COMBO n배만 */ const host = document.fullscreenElement || document.body, r = cvRect(), W2 = ['', '', 'DOUBLE', 'TRIPLE', 'QUADRA', 'PENTA'][n] || n + 'x';
      const d = document.createElement('div'); d.className = 'gm-mpop gm-mp' + Math.min(n, 4); d.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height * 0.24) + 'px'; d.innerHTML = '<b>' + W2 + '!</b><small>SSR ×' + n + (S.doro || demo ? ' · COMBO ×' + n : '') + '</small>'; host.appendChild(d); setTimeout(() => d.remove(), 1900);
      try { snd.burst(3); if (n >= 3) setTimeout(() => snd.fanfare(), 250); } catch (e) { /* 무시 */ } S.flash = Math.max(S.flash || 0, 0.6); sparks(RV.x, RV.y - 120, 40 + n * 20, () => pick(['#fff3b0', '#ffd24d', '#ffffff', '#ff9ad5']), 700, 200); vib([50, 30, 50, 30, 50 + n * 40], true); }
    /* 가짜 무지개 예고: 무지개 단계까지 갔다가 떨어질 때 가끔 화면 가장자리가 무지개로 번쩍 */
    /* ---- DORO TIME: 화면 아래 무지개 타이머, 기계 테두리 무지개 ---- */
    const FEV_LV = 'dsgm-fevlv';
    const fevLv = () => { try { return feverOn() ? (+localStorage.getItem(FEV_LV) || 1) : 0; } catch (e) { return 0; } };
    function feverStart(ms, up) { const lv = up ? fevLv() + 1 : 1; try { localStorage.setItem(FEV_K, String(DCLK.v + (ms || FEV_MS))); localStorage.setItem(FEV_LV, String(lv)); } catch (e) { /* 무시 */ } window.__fevEndT = 0; rbFont(); feverPop(lv); feverTick(); }
    /* 남은 시간 계산·마지막 10초 효과음·끝날 때 회색 정지(표시는 기계의 픽업 표지 화면에서) */
    function feverTick() {
      if (window.__fevT && window.__fevT !== feverTick) { window.__fevT(); return; } window.__fevT = feverTick; /* 기계가 여러 대여도 타이머는 하나 */
      const on = feverOn(), left = Math.max(0, fevEnd() - DCLK.v);
      document.querySelectorAll('.gm').forEach((g) => g.classList.toggle('gm-feveron', on));
      if (on) { window.__fevWas = true; const sec = Math.ceil(left / 1000); if (left <= 10000 && sec !== window.__fevBeep) { window.__fevBeep = sec; try { snd.beep(sec <= 3); } catch (e) { /* 무시 */ } } }
      else if (window.__fevWas) { window.__fevWas = false; window.__fevEndT = performance.now(); try { snd.fevEnd(); } catch (e) { /* 무시 */ } }
      cancelAnimationFrame(feverTick.raf); if (on) feverTick.raf = requestAnimationFrame(feverTick);
    }
    /* 픽업 표지 = 화면: DORO TIME 중에는 표지 위에 무지개 타이머를 띄움. 끝나면 회색으로 멈췄다가 천천히 흐려짐 */
    function drawScreen(c) {
      const on = feverOn(), endT = window.__fevEndT || 0, nowP = performance.now(); let al = 1;
      if (!on) { if (!endT || nowP - endT > 2600) return; al = 1 - (nowP - endT) / 2600; }
      const x0 = BAN.cx - BAN.w / 2, y0 = BAN.cy - BAN.h / 2, w = BAN.w, h = BAN.h, gray = !on, left = on ? Math.max(0, fevEnd() - DCLK.v) : 0, t = gray ? endT / 1000 : S.time, last = on && left <= 10000;
      c.save(); c.globalAlpha = al;
      { let rb; if (gray) rb = '#8a8f99'; else if (c.createConicGradient) { rb = c.createConicGradient(t * 1.2, BAN.cx, BAN.cy); ['#ff5d8f', '#ffb84d', '#f6f05a', '#5ef0a0', '#5ab8ff', '#b47cff', '#ff5d8f'].forEach((col, i, A) => rb.addColorStop(i / (A.length - 1), col)); } else rb = '#ff5d8f'; c.fillStyle = rb; if (!gray) { c.shadowColor = 'rgba(255,255,255,.7)'; c.shadowBlur = 12; } stkPath(c, 6); c.fill(); c.shadowBlur = 0; } /* 표지 테두리 → 무지개 테두리 */
      stkPath(c, 0); c.clip();
      let g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, gray ? '#1a1b20' : '#0c0620'); g.addColorStop(1, gray ? '#26272e' : '#1a0b33'); c.fillStyle = g; c.fillRect(x0, y0, w, h);
      if (!gray) { c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 10; k++) { const a = t * 0.6 + k * TAU / 10; c.fillStyle = 'hsla(' + ((k * 36 + t * 80) % 360) + ',90%,60%,.10)'; c.beginPath(); c.moveTo(BAN.cx, BAN.cy); c.arc(BAN.cx, BAN.cy, w, a, a + 0.22); c.closePath(); c.fill(); } c.globalCompositeOperation = 'source-over'; }
      c.fillStyle = 'rgba(255,255,255,.035)'; for (let yy = y0; yy < y0 + h; yy += 4) c.fillRect(x0, yy, w, 1.4); /* 화면 주사선 */
      const rg = (yy) => { if (gray) return '#8a8f99'; const sh = (t * 160) % w, gg = c.createLinearGradient(x0 + sh - w, yy, x0 + sh + w, yy); ['#ff5d8f', '#ffb84d', '#f6f05a', '#5ef0a0', '#5ab8ff', '#b47cff', '#ff5d8f', '#ffb84d', '#f6f05a', '#5ef0a0', '#5ab8ff', '#b47cff', '#ff5d8f'].forEach((col, i, A) => gg.addColorStop(i / (A.length - 1), col)); return gg; };
      let lv = 1; try { lv = +localStorage.getItem(FEV_LV) || 1; } catch (e) { /* 무시 */ }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const txt = (s2, yy, sz, fill, sc) => { c.save(); c.translate(BAN.cx, yy); if (sc) c.scale(sc, sc); c.font = sz + 'px Bungee, "Arial Black", Impact, sans-serif'; c.lineWidth = sz * 0.14; c.strokeStyle = gray ? '#2a2c33' : '#12062a'; c.strokeText(s2, 0, 0); c.fillStyle = fill; if (!gray) { c.shadowColor = 'rgba(255,255,255,.55)'; c.shadowBlur = 14; } c.fillText(s2, 0, 0); c.restore(); };
      txt('DORO TIME' + (lv > 1 ? ' ×' + lv : ''), y0 + h * 0.24, lv > 1 ? 50 : 58, rg(y0 + h * 0.24));
      const m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60, cs = Math.floor(left / 10) % 100, z = (n) => String(n).padStart(2, '0'), pul = last ? 1 + 0.1 * Math.max(0, Math.sin((left / 1000) * TAU)) : 1;
      txt(z(m) + ':' + z(sec) + ':' + z(cs), y0 + h * 0.58, 84, last ? '#ff5d6c' : rg(y0 + h * 0.58), pul);
      c.font = '800 20px system-ui, sans-serif'; c.fillStyle = gray ? '#6b6f78' : '#ffe28a'; c.fillText(gray ? 'DORO TIME 종료' : 'DORO칩 확률 2배', BAN.cx, y0 + h * 0.88);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; stkPath(c, 0); c.stroke();
      c.restore();
    }
    setTimeout(() => { if (feverOn()) rbFont(); feverTick(); }, 500);
    /* ---- JACKPOT: DORO TIME 중 무지개를 또 얻으면. 커다란 무지개 JACKPOT이 왼쪽에서 오른쪽으로 지나가고 금칩 비, 바구니의 DORO·실버칩이 모두 골드로 ---- */
    function jackpotShow() {
      rbFont(); S.stk = true; const host = document.fullscreenElement || document.body, ov = document.createElement('div'); ov.className = 'gm-jp';
      let tw = ''; for (let i = 0; i < 70; i++) tw += '<i style="left:' + rnd(0, 100).toFixed(1) + '%;top:' + rnd(0, 100).toFixed(1) + '%;animation-delay:-' + rnd(0, 1.6).toFixed(2) + 's;--s:' + rnd(0.5, 1.6).toFixed(2) + '"></i>';
      ov.innerHTML = '<div class="gm-jptw">' + tw + '</div><div class="gm-jptx">JACKPOT!!</div>'; host.appendChild(ov);
      try { snd.boom(); setTimeout(() => snd.fanfare(), 300); setTimeout(() => snd.fanfare(), 1300); } catch (e) { /* 무시 */ } vib([100, 40, 100, 40, 300], true);
      setTimeout(() => coinRain(true), 700);
      setTimeout(() => { let n = 0; S.bask.forEach((b) => { if (b.kind === 'chip' && (b.res.chip === 'b' || b.res.chip === 's')) { b.res.chip = 'g'; n++; sparks(b.x, b.y, 14, () => pick(['#fff3b0', '#ffd24d', '#ffffff']), 260, 120); } }); if (n) say('바구니의 칩 ' + n + '개가 골드칩으로!'); }, 1200);
      const end = () => { if (!ov.isConnected) return; ov.classList.add('out'); setTimeout(() => { ov.remove(); S.stk = false; }, 400); };
      setTimeout(end, 3600); ov.addEventListener('pointerdown', (e) => { e.preventDefault(); });
    }
    function basketGold() { let n = 0; S.bask.forEach((b) => { if (b.kind === 'chip' && (b.res.chip === 'b' || b.res.chip === 's')) { b.res.chip = 'g'; n++; sparks(b.x, b.y, 14, () => pick(['#fff3b0', '#ffd24d', '#ffffff']), 260, 120); } }); if (n) say('바구니의 칩 ' + n + '개가 골드칩으로!'); }
    /* ---- 시안용 추가 연출 ---- */
    function feverPop(lv) { const g = $('.gm'); if (!g) return; g.classList.remove('gm-fever'); void g.offsetWidth; g.classList.add('gm-fever'); clearTimeout(feverPop.t); feverPop.t = setTimeout(() => g.classList.remove('gm-fever'), 8000);
      const r = cvRect(), d = document.createElement('div'); d.className = 'gm-fevb'; d.style.cssText = 'left:' + r.left + 'px;top:' + (r.top + r.height * 0.42) + 'px;width:' + r.width + 'px'; d.innerHTML = '<b>DORO TIME' + (lv > 1 ? ' ×' + lv : '') + '!</b>'; (document.fullscreenElement || document.body).appendChild(d); setTimeout(() => d.remove(), 2200); try { snd.fanfare(); } catch (e) { /* 무시 */ } }
    /* 칩 비: 캔버스 한 장에 칩 그림을 찍어 그림(두께는 옆면 띠로 흉내). DOM 수백 개보다 훨씬 가벼움 */
    const RAIN_IMG = {};
    const rainImg = (k) => { if (RAIN_IMG[k]) return RAIN_IMG[k]; const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chipSvg(k, 96, false, true).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); RAIN_IMG[k] = im; return im; };
    function coinRain(gold, host0, lv) {
      const host = host0 || document.fullscreenElement || document.body, cv2 = document.createElement('canvas'), dpr = Math.min(1.5, window.devicePixelRatio || 1), W2 = innerWidth, H2 = innerHeight;
      cv2.className = 'gm-rain'; cv2.width = W2 * dpr; cv2.height = H2 * dpr; host.appendChild(cv2); const c = cv2.getContext('2d');
      const ks = lv ? (lv <= 2 ? ['b', 'b', 'b', 's'] : lv <= 3 ? ['b', 'b', 's', 's', 'g'] : lv <= 5 ? ['b', 's', 's', 'g', 'g'] : lv <= 8 ? ['s', 'g', 'g', 'g'] : ['s', 'g', 'g', 'g', 'g']) : gold ? ['g', 'g', 'g', 'g', 'g', 'g', 'r'] : ['b', 'b', 'b', 's', 's', 'g', 'g', 'r'], EC = { b: '#a86405', s: '#8b9097', g: '#b8860b', r: '#7d5fc0' };
      if (lv >= 6) ks.push('r'); ks.forEach(rainImg); const N = lv ? (lv <= 10 ? lv * 3 : Math.min(160, 30 + (lv - 10) * 10)) : gold ? 90 : 60, ps = []; /* 10콤보까지는 적게 */
      for (let i = 0; i < N; i++) { const k = lv ? (lv >= 6 && Math.random() < 0.02 ? 'r' : pick(ks.filter((x) => x !== 'r'))) : pick(ks); /* 칩 비 무지개는 드물게(2%) */ ps.push({ k, x: rnd(0, W2), y: -rnd(30, H2 * 0.9), vy: rnd(380, 720), vx: rnd(-40, 40), sz: rnd(26, 56), sp: rnd(0, TAU), vs: rnd(5, 12) * (Math.random() < 0.5 ? -1 : 1), tl: rnd(-0.5, 0.5), d: i * (lv ? 14 : gold ? 18 : 30) }); }
      const t0 = performance.now(); let last = t0;
      const step = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W2, H2); let alive = 0;
        for (const q of ps) { if (now - t0 < q.d) { alive++; continue; } q.vy += 600 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.sp += q.vs * dt; if (q.y > H2 + 60) continue; alive++;
          const im = RAIN_IMG[q.k], cs = Math.cos(q.sp), sx = Math.abs(cs), th = q.sz * 0.13; c.save(); c.translate(q.x, q.y); c.rotate(q.tl);
          const rx = q.sz / 2 * sx, ry = q.sz / 2, dx = th * Math.sin(q.sp); /* 세로축으로 도는 원판: 뒷면 타원 + 옆면 띠 + 앞면 */
          c.fillStyle = EC[q.k]; c.beginPath(); c.ellipse(dx, 0, Math.max(0.5, rx), ry, 0, 0, TAU); c.fill(); c.fillRect(Math.min(0, dx), -ry, Math.abs(dx), ry * 2);
          c.save(); c.scale(Math.max(0.04, sx), 1); if (im.complete && im.naturalWidth) c.drawImage(im, -q.sz / 2, -q.sz / 2, q.sz, q.sz); c.restore(); c.restore(); }
        if (alive && cv2.isConnected) requestAnimationFrame(step); else cv2.remove(); };
      requestAnimationFrame(step);
      try { snd.chipIn(0.5, true); } catch (e) { /* 무시 */ }
    }
    /* ---- COMBO: DOUBLE 이상이면 n배(DOUBLE 2 · TRIPLE 3 …), 제한시간 10×n초. 시간 안에 또 터지면 배수 합산 + 시간 추가(상한 = 이번 콤보에서 나온 최고 단계의 시간) ---- */
    const CB = { mul: 0, end: 0, top: 0, raf: 0 };
    const cNow = () => (S.doro ? DCLK.v : performance.now()), comboMul = () => (CB.mul > 0 && !CB.demo && cNow() < CB.end ? CB.mul : 1); /* 시안(demo)은 연출만 */
    const thEl = $('.gm-thermo'), thSvg = thEl.querySelector('svg'), TH = { id: 'gmth' + Math.random().toString(36).slice(2, 8) };
    function comboHit(n, demo) {
      const now = cNow(), on = CB.mul > 0 && now < CB.end, left = on ? CB.end - now : 0; CB.demo = on ? CB.demo && !!demo : !!demo;
      if (on) { CB.mul += n; CB.top = Math.max(CB.top, n); CB.end = now + Math.min(left + n * 10000, CB.top * 10000); } else { CB.mul = n; CB.top = n; CB.end = now + n * 10000; }
      thEl.style.height = Math.min(64, 18 + CB.top * 9) + '%'; thermoBuild(); thEl.classList.add('on');
      if (on) comboPop(CB.mul); quake(CB.mul); coinRain(false, null, CB.mul); /* COMBO마다 칩 비(연출): 배수가 클수록 많고 좋은 칩 */ cancelAnimationFrame(CB.raf); CB.raf = requestAnimationFrame(comboTick);
    }
    function comboTick() {
      const now = cNow(), left = Math.max(0, CB.end - now), cap = CB.top * 10000, f = cap ? left / cap : 0;
      const R = [255, 58, 58], B2 = [58, 139, 255], col = 'rgb(' + R.map((v, i) => Math.round(B2[i] + (v - B2[i]) * f)).join(',') + ')'; /* 시간이 흐를수록 빨강 → 파랑 */
      thEl.style.setProperty('--lq', col); if (TH.lq) TH.lq.setAttribute('y', (TH.y0 - f * (TH.y0 - TH.y1)).toFixed(2));
      if (left <= 0) { CB.mul = 0; CB.top = 0; thEl.classList.remove('on'); return; }
      CB.raf = requestAnimationFrame(comboTick);
    }
    /* 온도계: 관과 알이 하나로 이어진 한 덩어리(SVG 한 개의 윤곽). 알은 늘 차 있고 관의 액체만 줄어듦. 눈금 1초·5초·10초 */
    function thermoBuild() {
      const w = thEl.clientWidth, h = thEl.clientHeight; if (!w || !h) return; const sw = Math.max(1.6, w * 0.045), tw = w * 0.38, R = w * 0.46, cx = w / 2, cy = h - R - sw, x0 = cx - tw / 2, x1 = cx + tw / 2, top = sw + tw / 2, yj = cy - Math.sqrt(R * R - (tw / 2) * (tw / 2));
      const d = 'M' + x0 + ',' + yj + 'L' + x0 + ',' + top + 'A' + tw / 2 + ',' + tw / 2 + ' 0 0 1 ' + x1 + ',' + top + 'L' + x1 + ',' + yj + 'A' + R + ',' + R + ' 0 1 1 ' + x0 + ',' + yj + 'Z';
      TH.y0 = yj + tw * 0.2; TH.y1 = top - tw / 2 + sw; const N = CB.top * 10; let tk = ''; for (let i = 1; i < N; i++) { const y = TH.y0 - (TH.y0 - TH.y1) * i / N, L = i % 10 ? (i % 5 ? 0.22 : 0.38) : 0.56; tk += '<line x1="' + x0 + '" x2="' + (x0 + tw * L) + '" y1="' + y.toFixed(2) + '" y2="' + y.toFixed(2) + '" stroke="rgba(255,255,255,' + (i % 10 ? 0.6 : 0.95) + ')" stroke-width="' + (i % 10 ? 0.8 : 1.5) + '"/>'; }
      thSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      thSvg.innerHTML = '<defs><clipPath id="' + TH.id + '"><path d="' + d + '"/></clipPath><linearGradient id="' + TH.id + 'g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></linearGradient></defs>' +
        '<path d="' + d + '" fill="rgba(20,24,34,.55)"/><g clip-path="url(#' + TH.id + ')"><rect class="lq" x="0" y="' + TH.y1 + '" width="' + w + '" height="' + h + '" style="fill:var(--lq,#ff3a3a)"/><path d="' + d + '" fill="url(#' + TH.id + 'g)"/>' + tk +
        '<ellipse cx="' + (cx - R * 0.38) + '" cy="' + (cy - R * 0.4) + '" rx="' + R * 0.22 + '" ry="' + R * 0.14 + '" fill="rgba(255,255,255,.55)" transform="rotate(-35 ' + (cx - R * 0.38) + ' ' + (cy - R * 0.4) + ')"/></g>' +
        '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
        '<text x="' + cx + '" y="' + (cy + R * 0.28) + '" text-anchor="middle" style="font-size:' + (R * (CB.mul >= 10 ? 0.66 : 0.8)).toFixed(1) + 'px;stroke-width:' + (R * 0.12).toFixed(2) + 'px">×' + CB.mul + '</text>';
      TH.lq = thSvg.querySelector('.lq');
    }
    /* 기계 전체가 휘청 */
    function quake(m) { /* 지진처럼 축 없이 흔들림. 배수가 클수록 세고 길게 */ const A = Math.min(14, 1.2 + (m - 1) * 1.3), D = Math.min(1300, 450 + m * 70), N = Math.round(D / 45), kf = [{ transform: 'none' }];
      for (let i = 1; i < N; i++) { const f = 1 - i / N, a = A * f; kf.push({ transform: 'translate(' + rnd(-a, a).toFixed(1) + 'px,' + rnd(-a * 0.7, a * 0.7).toFixed(1) + 'px)' }); } kf.push({ transform: 'none' });
      leftEl.animate(kf, { duration: D, easing: 'linear' }); try { snd.thud(m >= 4); } catch (e) { /* 무시 */ } vib(m >= 4 ? [30, 20, 30, 20, 60] : [30, 20, 40], true); }
    function cmulPop(x, y, m) { if (!(x > 0)) return; const d = document.createElement('div'); d.className = 'gm-cmul'; d.style.cssText = 'left:' + x + 'px;top:' + y + 'px'; d.textContent = '×' + m; (document.fullscreenElement || document.body).appendChild(d); setTimeout(() => d.remove(), 950); }
    /* 화면 테두리 무지갯빛: 무지개 단계에 오르면 점점 커지며 빛나고, 꽝이면 다시 작아짐. 진짜 무지개면 터진 뒤 사라짐 */
    let edgeK = 0, edgeM = null, edgeRaf = 0; /* edgeK = 목표값, edgeM = 진행 중인 변화 */
    const edgeNow = () => { if (!edgeM) return 0; const p = Math.min(1, (performance.now() - edgeM.t0) / edgeM.ms); return edgeM.k0 + (edgeM.k1 - edgeM.k0) * p; };
    function edgeEl() { const host = document.fullscreenElement || document.body; let el = document.querySelector('.gm-rbedge'); if (!el) { el = document.createElement('div'); el.className = 'gm-rbedge'; } if (el.parentNode !== host) host.appendChild(el); return el; }
    function edgeLoop(now) {
      const el = edgeEl(), k = Math.max(0, edgeNow());
      if (k <= 0.002 && edgeK <= 0) { el.remove(); edgeRaf = 0; edgeM = null; return; }
      const w = 14 + 150 * k, a = (now / 8) % 360, pulse = 1 + 0.12 * k * Math.sin(now / 90);
      el.style.setProperty('--w', (w * pulse).toFixed(1) + 'px'); el.style.setProperty('--a', a.toFixed(1) + 'deg'); el.style.opacity = Math.min(1, 0.25 + k * 1.1).toFixed(3); el.style.filter = 'brightness(' + (1 + 0.6 * Math.max(0, k - 0.4)).toFixed(2) + ') saturate(1.3)';
      edgeRaf = requestAnimationFrame(edgeLoop);
    }
    function edgeTo(k, ms) { edgeEl(); edgeM = { k0: edgeNow(), k1: k, t0: performance.now(), ms: Math.max(16, ms) }; edgeK = k; if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeLoop); }
    const edgeSet = (k) => edgeTo(k, 16);
    function edgeFlare() { edgeTo(1.35, 160); setTimeout(() => { if (edgeK > 1) edgeTo(0, 1400); }, 260); }
    function comboPop(n) { const r = cvRect(), d = document.createElement('div'); d.className = 'gm-combo'; d.style.cssText = 'left:' + (r.left + r.width * 0.78) + 'px;top:' + (r.top + r.height * 0.62) + 'px;--h:' + (n * 40) + 'deg'; d.innerHTML = '<small>COMBO</small><b>×' + n + '</b>'; (document.fullscreenElement || document.body).appendChild(d); setTimeout(() => d.remove(), 1100); try { snd.chipBurst(n >= 4); } catch (e) { /* 무시 */ } }
    function jackpotStamp() { const r = cvRect(), d = document.createElement('div'); d.className = 'gm-jstamp'; d.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height * 0.36) + 'px'; d.innerHTML = '<b>JACKPOT</b>'; (document.fullscreenElement || document.body).appendChild(d); setTimeout(() => { try { snd.boom(); } catch (e) { /* 무시 */ } vib([90], true); const g = $('.gm'); if (g) { g.classList.remove('gm-thump'); void g.offsetWidth; g.classList.add('gm-thump'); } }, 260); setTimeout(() => d.remove(), 2400); }
    function teasePop() { edgeTo(0.35, 160); setTimeout(() => edgeTo(0.6, 700), 170); setTimeout(() => { edgeTo(0, 650); try { snd.fail(); } catch (e) { /* 무시 */ } }, 900); }
    function stageBurst(orb, st, big) {
      if (st === 'b') return; /* DORO칩은 가장 낮은 단계라 빛나지 않음 */
      const host = document.fullscreenElement || document.body, r = orb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, cols = STG_COL[st];
      const N = big ? (st === 'r' ? 34 : 24) : (st === 'r' ? 18 : 12);
      for (let i = 0; i < N; i++) { const p = document.createElement('i'); p.className = 'gm-sssp'; const a = (i / N) * TAU + rnd(-0.2, 0.2), d = rnd(r.width * 0.5, r.width * (big ? (st === 'r' ? 2 : 1.5) : 1.1)), sz = rnd(3, st === 'r' ? 8 : 6); p.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + sz + 'px;height:' + sz + 'px;background:' + cols[i % cols.length]; host.appendChild(p);
        p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px),calc(-50% + ' + Math.sin(a) * d + 'px)) scale(.2)', opacity: 0 }], { duration: rnd(500, 900), easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => p.remove(); }
    }
    function slowFlip(orb, k, en) {
      const path = stagePath(k), STEP = 520, tx = orb.style.getPropertyValue('--tx') || '0deg', ty = parseFloat(orb.style.getPropertyValue('--ty')) || 0;
      const A = 1700, S0 = 750, H = Math.max(250, S0 + (path.length - 1) * STEP + 250 - A), B = 750, T = A + H + B, edge = 'rotateX(' + tx + ') rotateY(80deg)'; /* 천천히 세우는 동안 단계가 바뀌고, 멈춤은 짧게 */
      const setSt = (st) => { STG.forEach((x) => orb.classList.remove('st-' + x)); orb.classList.add('st-' + st); };
      orb.classList.add('sss', 'glow'); setSt(path[0]);
      const an = orb.animate([{ transform: 'rotateX(0deg) rotateY(0deg)', easing: 'cubic-bezier(.25,.1,.35,1)' }, { transform: edge, offset: A / T }, { transform: 'rotateX(' + tx + ') rotateY(83deg)', offset: (A + H) / T, easing: 'cubic-bezier(.5,0,.3,1)' }, { transform: 'rotateX(' + tx + ') rotateY(' + (180 + ty) + 'deg)' }], { duration: T });
      const done = () => { orb.style.transition = 'none'; orb.classList.add('flip'); orb.classList.remove('sss'); void orb.offsetWidth; orb.style.transition = ''; if (en) { en.busy = false; en.anim = false; en._el = null; en.skip = null; if (en.owner) autoAbsorb(en.owner, en, 0); } };
      an.onfinish = done;
      const tm = [], at = (fn, ms) => tm.push(setTimeout(fn, ms));
      let guard = setTimeout(() => { if (en && en.anim) { en.busy = false; en.anim = false; en._el = null; uiTray(); } }, T + 400); /* 혹시 끝 신호가 안 와도 풀림 */
      try { snd.flip(); } catch (e) { /* 무시 */ }
      for (let i = 1; i < path.length; i++) {
        const up = STG.indexOf(path[i]) > STG.indexOf(path[i - 1]);
        at(() => { setSt(path[i]); stageBurst(orb, path[i], false); try { if (up) snd.chipBurst(path[i] === 'r'); else snd.fail(); } catch (e) { /* 무시 */ } /* 내려갈 때: 캡슐 승격 실패와 같은 소리 */ if (up && path[i] === 'r') { edgeTo(0.3, 180); setTimeout(() => { if (edgeK > 0 && edgeK < 1) edgeTo(1, 1500); }, 190); } else if (!up && path[i - 1] === 'r') edgeTo(0, 700); /* 무지개 단계: 화면 테두리 무지갯빛이 점점 커짐, 꽝이면 다시 작아짐 */ }, S0 + (i - 1) * STEP);
      }
      at(() => { try { snd.flip(); } catch (e) { /* 무시 */ } }, A + H);
      const burst = () => { if (k === 'r') edgeFlare(); else if (edgeK > 0) edgeTo(0, 500); orb.classList.remove('glow'); STG.forEach((x) => orb.classList.remove('st-' + x)); try { snd.chipBurst(k === 'r' || k === 'g'); snd.chipPop(); } catch (e) { /* 무시 */ } stageBurst(orb, k, true); if (k === 'g') goldPop(orb); if (k === 'r' && en && !en.cutR) { en.cutR = true; setTimeout(() => rainbowCut(orb, 'ssr'), 450); } };
      at(burst, T);
      /* 연출 중 다시 누르면(1초 뒤부터): 결과 단계로 정리하고 손으로 넘기듯 바로 마지막 뒤집기로 */
      if (en) en.skip = () => {
        const cur = an.currentTime || 0; if (cur >= A + H - 60) return; en.skip = null;
        tm.forEach(clearTimeout); tm.length = 0; clearTimeout(guard); setSt(k); if (k === 'r') edgeTo(1, 500); else if (edgeK > 0) edgeTo(0, 400);
        const p = Math.min(1, cur / A), from = 'rotateX(' + tx + ') rotateY(' + Math.round(80 * (1 - Math.pow(1 - p, 3))) + 'deg)', D = 520;
        an.cancel();
        const a2 = orb.animate([{ transform: from, easing: 'cubic-bezier(.35,0,.25,1.25)' }, { transform: 'rotateX(' + tx + ') rotateY(' + (180 + ty) + 'deg)' }], { duration: D });
        a2.onfinish = done;
        try { snd.flip(); } catch (e) { /* 무시 */ }
        tm.push(setTimeout(burst, D)); guard = setTimeout(() => { if (en.anim) { en.busy = false; en.anim = false; en._el = null; uiTray(); } }, D + 400);
      };
    }
    /* 캔버스 위의 도로칩(바디라벨 10k 보상) */
    function chipSprite(k) { const key = 'chip' + k; if (spr[key]) return spr[key]; const q = 2, R = OR + 3, c = mkc(R * 2 * q, R * 2 * q), x = c.getContext('2d'), u = OR / 72, col = k === 's' ? ['#c3c9d2', '#6f7782'] : k === 'g' ? ['#f6c431', '#8a6508'] : ['#f0a020', '#a86405']; x.scale(q, q); x.translate(R, R); x.scale(u, u);
      x.fillStyle = k === 'g' ? '#f3e3a6' : '#d5d8dd'; x.strokeStyle = k === 'g' ? '#a8830f' : '#8b9097'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 72, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#3b3e44'; x.beginPath(); x.arc(0, 0, 61, 0, TAU); x.fill();
      x.strokeStyle = col[0]; x.lineWidth = 11; x.setLineDash([44, 10.45]); x.beginPath(); x.arc(0, 0, 52, 0, TAU); x.stroke(); x.setLineDash([]); x.fillStyle = '#26282c'; x.beginPath(); x.arc(0, 0, 44, 0, TAU); x.fill();
      x.fillStyle = col[0]; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(40 * Math.sin(i * TAU / 6), -40 * Math.cos(i * TAU / 6), 2.4, 0, TAU); x.fill(); }
      x.fillStyle = col[1]; x.beginPath(); x.arc(0, 0, 34, 0, TAU); x.fill(); x.fillStyle = col[0]; x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.ellipse(-8, -12, 14, 7, -0.5, 0, TAU); x.fill();
      return (spr[key] = { c, R }); }
    function drawChip(c, k, x, y, a) { const sp = chipSprite(k), s = sp.R * 2; c.save(); c.translate(x, y);
      { const TH = 5, ec = k === 'g' ? ['#7a5a06', '#d6a51c'] : ['#4f5359', '#c4c8ce']; for (let i = TH; i >= 1; i--) { c.fillStyle = i > 2 ? ec[0] : ec[1]; c.beginPath(); c.arc(0, i, OR * 0.985, 0, TAU); c.fill(); } } /* 2.5D 두께 */ c.rotate(a || 0); c.drawImage(sp.c, -s / 2, -s / 2, s, s); c.restore(); }
    /* R·SR 캡슐: 도로칩 1%, 실버칩 0.1%, 골드칩 0.01% */
    function capChip(x, y, kind, cm) { if (!S.doro) return; const sr = kind === 'SR'; if (Math.random() * 100 >= CAP_RATE[sr ? 'SR' : 'R'] * (feverOn() ? 2 : 1)) return; dropChip(chipRoll(sr ? 'capSR' : 'capR'), x, y, 'cap', cm || 1); }
    function dropChip(k, x, y, src, cm) { if (cm == null) cm = comboMul(); /* 새로 얻는 칩: 지금 COMBO 배수(캡슐 칩은 그 캡슐의 배수) */ if (k === 'r') { const r = cvRect(), sx = r.left + clamp(x, BK.x0 + OR, BK.x1 - OR) * r.width / W, sy = r.top + clamp(y, BK.y0 + OR, BK.y1 - OR) * r.height / H; sparks(x, y, 30); setTimeout(() => rainbowCut({ left: sx - 22, top: sy - 22, width: 44, height: 44 }, src || 'cap'), 250); return; } /* 무지개는 바구니에 떨어뜨리지 않고 컷인으로 바로 */ if (k === 'g') { const r = cvRect(), sx = r.left + clamp(x, BK.x0 + OR, BK.x1 - OR) * r.width / W, sy = r.top + clamp(y, BK.y0 + OR, BK.y1 - OR) * r.height / H, sz = OR * 2 * r.width / W; setTimeout(() => goldPop({ getBoundingClientRect: () => ({ left: sx - sz / 2, top: sy - sz / 2, width: sz, height: sz }) }), 200); } const b = body('chip', clamp(x, BK.x0 + OR, BK.x1 - OR), clamp(y, BK.y0 + OR, BK.y1 - OR), { chip: k, count: 1, src: src || 'cap', cm: cm > 1 ? cm : 0 }); b.vx = rnd(-160, 160); b.vy = rnd(-620, -420); b.w = rnd(-9, 9); S.bask.push(b); wake(S.bask); if ((src || 'cap') === 'cap') setTimeout(() => chipTake(b), 1100 / (S.auto || 1)); /* 캡슐에서 나온 칩은 저절로 잔고로 */ sparks(b.x, b.y, k === 'b' ? 14 : 30, k === 'g' ? '#ffe27a' : k === 's' ? '#e9eef5' : '#ffc45a', 380); try { snd.chipPop(); if (k !== 'b') setTimeout(() => snd.chipPop(), 90); } catch (e) { /* 무시 */ } }
    /* 무지개칩 확정 컷인: RAINBOW!! 글자가 화면을 가로질러 박히고, 무지개칩이 가운데서 커져 회전(1초 180도 · 1초 정지). 3초간 못 넘기고 그 뒤 탭하면 닫힘. 그동안 기계는 멈춤 */
    function rbFont() { if (!document.getElementById('gm-rbfont')) { const l = document.createElement('link'); l.id = 'gm-rbfont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Bungee&display=swap&text=' + encodeURIComponent('RAINBOW!0123456789,.%S'); document.head.appendChild(l); } }
    function rainbowCut(from, src, opt) {
      const r0 = from && from.getBoundingClientRect ? from.getBoundingClientRect() : from, ok0 = r0 && r0.width > 0;
      const it = { cx: ok0 ? r0.left + r0.width / 2 : innerWidth / 2, cy: ok0 ? r0.top + r0.height / 2 : innerHeight / 2, size: ok0 ? r0.width : 40, src, jp: opt && opt.jp != null ? opt.jp : feverOn() }; /* DORO TIME 중이면 JACKPOT 연출로 합쳐서 강화 */
      if (from && from.style) from.style.visibility = 'hidden'; /* 그 자리의 칩이 직접 날아오름 */
      if (src && window.doroChips) { chipPendR += 1; window.doroChips.add({ r: 1 }, src); } /* 바로 저장, 잔고 숫자는 칩이 도착할 때 올라감 */
      (S.cutQ = S.cutQ || []).push(it); if (S.cut) return;
      rbFont();
      const next = () => {
        const cur = S.cutQ.shift(); if (!cur) { S.cut = false; return; } S.cut = true;
        const ov = document.createElement('div'); ov.className = 'gm-rbcut';
        const T = 'JACKPOT!!!', N = 18, IMP = 1000; /* 무지개칩 = 항상 JACKPOT */ let edge = '';
        for (let i = 0; i < N; i++) { const f = i / (N - 1) - 0.5, sc = 1 - 0.075 * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * f, 2)))), dk = (0.08 + Math.abs(f) * 0.75).toFixed(2); edge += '<i style="transform:translateZ(calc(var(--ct) * ' + f.toFixed(3) + ')) scale(' + sc.toFixed(3) + ');--dk:' + dk + '"></i>'; }
        /* 몇 뽑 만의 무지개인지 (이 기계 기준). 뽑기 없이 얻었으면 보유 개수 */
        const pulls = S.stats.n - (S.rbFrom || 0); S.rbFrom = S.stats.n;
        const own = window.doroChips ? window.doroChips.get().r : 0, cntV = pulls > 0 ? pulls : own, cntT = pulls > 0 ? '뽑 만의 무지개!' : '번째 무지개칩!';
        const lay = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => '<span class="t' + x + '">' + T.split('').map((ch, i) => '<b style="--i:' + i + '">' + ch + '</b>').join('') + '</span>').join('');
        ov.innerHTML = '<canvas class="gm-rbcv"></canvas><div class="gm-rbfl"></div>' +
          '<div class="gm-rbtx">' + lay + '</div>' +
          '<div class="gm-rbch"><div class="gm-rbsw"></div><div class="gm-rbsw"></div><div class="gm-rbsw"></div><div class="gm-rbtl"><div class="gm-rbsp">' + edge + '<div class="gm-rbf">' + chipSvg('r', 260, true, true) + '</div><div class="gm-rbf gm-rbbk">' + chipSvg('r', 260, true, true) + '</div></div></div></div>' +
          '<div class="gm-rbcnt"><b>0</b><span>' + cntT + '</span></div><div class="gm-rbtap">- 탭하여 계속 -</div>';
        (document.fullscreenElement || document.body).appendChild(ov);
        const bg = rbBg(ov.querySelector('canvas'), IMP), stop = bg.stop, ch = ov.querySelector('.gm-rbch'), fr = ch.getBoundingClientRect(), fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
        /* 칩: 제자리에서 가운데로 날아와 → 크게 부풀었다가 → 쿵! 하고 작아지며 멈춤 */
        const dx = cur.cx - fx, dy = cur.cy - fy, s0 = Math.max(0.05, cur.size / fr.width);
        ch.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s0 + ') rotate(0deg)', easing: 'cubic-bezier(.45,0,.3,1)' },
          { transform: 'translate(0,0) scale(1) rotate(-8deg)', offset: 0.45, easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: 'translate(0,-2%) scale(1.85) rotate(4deg)', offset: 0.8, easing: 'linear' },
          { transform: 'translate(0,-2%) scale(1.95) rotate(0deg)', offset: 0.88, easing: 'cubic-bezier(.75,0,1,.6)' },
          { transform: 'translate(0,0) scale(1)' }], { duration: IMP, fill: 'both' });
        try { snd.flip(); } catch (e) { /* 무시 */ }
        setTimeout(() => { try { snd.riser(); } catch (e) { /* 무시 */ } }, 380);
        setTimeout(() => { /* 쿵! */
          ov.classList.add('hit'); bg.hit(); vib([90, 30, 140, 40, 300], true);
          try { snd.boom(); snd.chipBurst(true); } catch (e) { /* 무시 */ }
          T.split('').forEach((c2, i) => setTimeout(() => { try { snd.thud(i >= T.length - 3); } catch (e) { /* 무시 */ } }, 120 + i * 70));
          setTimeout(() => { try { snd.fanfare(); } catch (e) { /* 무시 */ } }, 120 + T.length * 70 + 60);
          /* 숫자 굴리기 */
          setTimeout(() => { const el = ov.querySelector('.gm-rbcnt b'), D = Math.min(1400, 500 + cntV * 0.4), t0 = performance.now(); let lastP = -1;
            const run = (now) => { const p = Math.min(1, (now - t0) / D), v = Math.round(cntV * (1 - Math.pow(1 - p, 3))); el.textContent = fmt(v); const q = Math.floor(p * 18); if (q !== lastP) { lastP = q; try { snd.tickUp(p); } catch (e) { /* 무시 */ } } if (p < 1 && ov.isConnected) requestAnimationFrame(run); else { ov.querySelector('.gm-rbcnt').classList.add('done'); try { snd.chipPop(); } catch (e) { /* 무시 */ } } };
            requestAnimationFrame(run); }, 900);
        }, IMP);
        let ok = false; setTimeout(() => { ok = true; ov.classList.add('ok'); }, IMP + 3000);
        ov.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); if (!ok) return; ok = false; ov.classList.add('leave');
          /* 그 칩이 직접 잔고(모바일은 보관함 아이콘)로 날아감 */
          const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
          const tbtn = leftEl.querySelector('.gm-trbtn'), toBtn = !vis(balEl) && vis(tbtn);
          let br = toBtn ? vis(tbtn) : vis(balEl && balEl.querySelector('.gm-cbr')) || vis(balEl);
          if (!br) { const q = root.getBoundingClientRect(); br = { left: q.right - 60, top: q.top + 10, width: 20, height: 20 }; }
          const c2 = ch.getBoundingClientRect(), tx = br.left + Math.min(14, br.width / 2), ty = br.top + br.height / 2, cx = c2.left + c2.width / 2, cy = c2.top + c2.height / 2;
          const an = ch.animate([{ transform: 'none' }, { transform: 'translate(0,-24px) scale(1.08)', offset: 0.22, easing: 'cubic-bezier(.55,0,.85,.35)' }, { transform: 'translate(' + (tx - cx) + 'px,' + (ty - cy) + 'px) scale(' + (22 / fr.width) + ')' }], { duration: 780, fill: 'both' });
          an.onfinish = () => {
            stop(); ov.remove();
            if (cur.src) { chipPendR = Math.max(0, chipPendR - 1); uiBal('r'); const was = feverOn(); feverStart(undefined, was); if (cur.jp) basketGold(); } /* 무지개 → DORO TIME, DORO TIME 중 무지개 → JACKPOT(DORO TIME 단계 +1) */
            if (toBtn) { tbtn.classList.remove('pop'); void tbtn.offsetWidth; tbtn.classList.add('pop'); }
            try { snd.chipIn(1); snd.chipBurst(true); } catch (er) { /* 무시 */ }
            setTimeout(next, 250);
          };
        });
      };
      next();
    }
    /* 컷인 배경: 무지개 방사 + 빛줄기 + 가운데서 퍼져 나오는 꽃·반짝이 */
    function rbBg(cv, th) {
      const c = cv.getContext('2d'); let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), t = 0, boost = 0; const fl = [], ln = [], dots = [], pt = [];
      const fit = () => { dpr = Math.min(1.5, window.devicePixelRatio || 1); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; };
      fit(); window.addEventListener('resize', fit);
      const PAL = (th && th.pal) || ['#ffd1ea', '#fff3a6', '#c9f7ff', '#ffd9a8', '#e3d0ff', '#d6ffd8'], BGC = (th && th.bg) || ['#ff2f6d', '#ff9a1f', '#ffe838', '#3ff07a', '#22d3ff', '#3a6bff', '#b23dff', '#ff2fb4', '#ff2f6d'];
      const nf = (z) => ({ a: Math.random() * TAU, z: z == null ? Math.random() * 0.15 : z, v: 0.25 + Math.random() * 0.35, r: 14 + Math.random() * 22, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 2, col: PAL[(Math.random() * PAL.length) | 0], fill: Math.random() < 0.3 });
      const nl = () => ({ a: Math.random() * TAU, z: Math.random() * 0.3, v: 1.2 + Math.random() * 1.6, len: 0.15 + Math.random() * 0.35, wd: 0.6 + Math.random() * 2.2 });
      const nd = () => ({ a: Math.random() * TAU, z: Math.random() * 0.2, v: 0.4 + Math.random() * 0.9, r: 1 + Math.random() * 3 });
      for (let i = 0; i < 60; i++) fl.push(nf(Math.random())); for (let i = 0; i < 70; i++) ln.push(Object.assign(nl(), { z: Math.random() })); for (let i = 0; i < 90; i++) dots.push(Object.assign(nd(), { z: Math.random() }));
      const flower = (x, y, r, rot, col, fill, al) => {
        c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = al; c.beginPath();
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5; c.moveTo(0, 0); c.bezierCurveTo(Math.cos(a - 0.62) * r * 1.25, Math.sin(a - 0.62) * r * 1.25, Math.cos(a + 0.62) * r * 1.25, Math.sin(a + 0.62) * r * 1.25, 0, 0); }
        if (fill) { c.fillStyle = col; c.fill(); }
        c.lineWidth = Math.max(2, r * 0.22); c.strokeStyle = col; c.shadowColor = '#fff'; c.shadowBlur = r * 0.5; c.stroke(); c.lineWidth = Math.max(1, r * 0.07); c.strokeStyle = 'rgba(255,255,255,.85)'; c.shadowBlur = 0; c.stroke();
        c.restore();
      };
      const draw = (now) => {
        raf = requestAnimationFrame(draw); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        c.setTransform(dpr, 0, 0, dpr, 0, 0); const cx = w / 2, cy = h * 0.56, R = Math.hypot(w, h) * 0.62;
        let g; if (c.createConicGradient) { g = c.createConicGradient(t * 0.25, cx, cy); BGC.forEach((col, i, A) => g.addColorStop(i / (A.length - 1), col)); } else { g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#3ff07a'); g.addColorStop(0.5, '#ffe838'); g.addColorStop(1, '#ff2fb4'); }
        c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, w, h);
        const rg = c.createRadialGradient(cx, cy, 0, cx, cy, R); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.18, 'rgba(255,255,255,.55)'); rg.addColorStop(0.5, 'rgba(255,255,255,.08)'); rg.addColorStop(1, 'rgba(60,0,90,.25)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
        /* 회전하는 굵은 빛기둥 */
        if (!th || th.rays !== false) { c.save(); c.translate(cx, cy); c.rotate(t * 0.18); for (let k = 0; k < 16; k++) { c.rotate(TAU / 16); const gw = c.createLinearGradient(0, 0, R, 0); gw.addColorStop(0, 'rgba(255,255,255,.55)'); gw.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gw; c.beginPath(); c.moveTo(0, 0); c.lineTo(R, -R * (k % 2 ? 0.05 : 0.11)); c.lineTo(R, R * (k % 2 ? 0.05 : 0.11)); c.fill(); } c.restore(); }
        boost = Math.max(0, boost - dt * 1.6); const bm = 1 + boost * 5;
        c.globalCompositeOperation = 'lighter';
        if (!th || th.lines !== false) ln.forEach((l, i) => { l.z += l.v * dt * (0.4 + l.z) * bm; if (l.z > 1.3) ln[i] = nl(); const d0 = l.z * R, d1 = Math.max(0, l.z - l.len) * R; c.globalAlpha = Math.min(1, l.z * 2) * 0.55; c.strokeStyle = '#fff'; c.lineWidth = l.wd * (0.5 + l.z); c.beginPath(); c.moveTo(cx + Math.cos(l.a) * d1, cy + Math.sin(l.a) * d1); c.lineTo(cx + Math.cos(l.a) * d0, cy + Math.sin(l.a) * d0); c.stroke(); });
        dots.forEach((d, i) => { d.z += d.v * dt * (0.3 + d.z) * bm; if (d.z > 1.2) dots[i] = nd(); const r = d.z * R; c.globalAlpha = Math.min(1, d.z * 3) * 0.8; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + Math.cos(d.a) * r, cy + Math.sin(d.a) * r, d.r * (0.4 + d.z), 0, TAU); c.fill(); });
        c.globalCompositeOperation = 'source-over';
        if (!th || th.flowers !== false) fl.sort((x, y) => x.z - y.z).forEach((f, i) => { f.z += f.v * dt * (0.25 + f.z) * (1 + boost * 3); f.rot += f.vr * dt; if (f.z > 1.25) Object.assign(f, nf()); const d = f.z * R * 0.95, sc = 0.25 + f.z * f.z * 3.2; flower(cx + Math.cos(f.a) * d, cy + Math.sin(f.a) * d, f.r * sc, f.rot, f.col, f.fill, Math.min(1, f.z * 5) * (f.z > 1 ? Math.max(0, 1.25 - f.z) * 4 : 1) * 0.92); });
        /* 쿵 할 때 튀어나오는 칩·금화·별 */
        for (let i = pt.length - 1; i >= 0; i--) { const q = pt[i]; q.vy += 900 * dt; q.vx *= 1 - 0.6 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; q.life -= dt; if (q.life <= 0 || q.y > h + 60) { pt.splice(i, 1); continue; }
          c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.scale(1, Math.abs(Math.cos(q.r * 1.7)) * 0.8 + 0.2); c.globalAlpha = Math.min(1, q.life * 2);
          if (q.k === 's') { c.fillStyle = q.col; c.beginPath(); for (let k = 0; k < 4; k++) { const a = k * TAU / 4; c.lineTo(Math.cos(a) * q.sz, Math.sin(a) * q.sz); c.lineTo(Math.cos(a + TAU / 8) * q.sz * 0.3, Math.sin(a + TAU / 8) * q.sz * 0.3); } c.fill(); }
          else { c.fillStyle = q.col; c.beginPath(); c.arc(0, 0, q.sz, 0, TAU); c.fill(); c.lineWidth = q.sz * 0.28; c.strokeStyle = q.rim; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-q.sz * 0.3, -q.sz * 0.3, q.sz * 0.3, 0, TAU); c.fill(); }
          c.restore(); }
      };
      raf = requestAnimationFrame(draw);
      const hit = () => { boost = 1; if (th && th.burst === false) return; const cx = w / 2, cy = h * 0.56, CC = [['#ff5d8f', '#ffd1e1'], ['#ffb84d', '#fff0c8'], ['#f6f05a', '#fffbd0'], ['#5ef0a0', '#d6ffe8'], ['#5ab8ff', '#d6efff'], ['#b47cff', '#efe2ff'], ['#f6c431', '#a8830f'], ['#f6c431', '#a8830f']];
        for (let i = 0; i < 150; i++) { const a = Math.random() * TAU, v = 500 + Math.random() * 1100, cc = CC[(Math.random() * CC.length) | 0], st = Math.random() < 0.3; pt.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 350, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 18, sz: st ? 7 + Math.random() * 10 : 6 + Math.random() * 11, k: st ? 's' : 'c', col: st ? '#fff' : cc[0], rim: cc[1], life: 1.6 + Math.random() * 1.4 }); } };
      return { stop: () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); }, hit };
    }
    function chipSpawn() { const cm0 = comboMul(), b = body('chip', HUDP.x, HUDP.y - 10, { chip: 'b', count: 1, src: 'label', cm: cm0 > 1 ? cm0 : 0 }); /* COMBO 중 바디라벨 교환 칩도 n배 */ b.vx = rnd(-520, -180); b.vy = rnd(-760, -520); b.w = rnd(-9, 9); S.bask.push(b); wake(S.bask); sparks(HUDP.x, HUDP.y, 16, '#ffc45a', 360); try { snd.chipPop(); } catch (e) { /* 무시 */ } }
    function chipTake(b) { const i = S.bask.indexOf(b); if (i < 0) return; S.bask.splice(i, 1); wake(S.bask); const r = cvRect(), sc = r.width / W; chipAbsorb(b.res.chip, b.res.count, r.left + b.x * sc, r.top + b.y * sc, Math.max(22, OR * 2 * sc), b.res.src || 'cap', b.res.cm); }
    if (location.hostname === 'localhost') (window.__gms = window.__gms || []).push({ S, root, rbCut: () => rainbowCut(), rbCutEl: (el) => rainbowCut(el), dropChip: (k) => dropChip(k, 300, 600, "cap"), trayAdd: (n, c, m) => trayAdd(n, c, null, null, null, m), comboHit: (n) => comboHit(n), dclk: () => DCLK.v, insert: (k, items, x, y) => insert(k, items, x, y), chipSpawn: () => chipSpawn(), ev: () => ({ CHIP_P, CAP_RATE, std: P.std.map(tierGrp), pil: P.pil.map(tierGrp), pu: tierGrp(P.pickup) }), flipTop: (en) => flipTop(en), P, chipSpawn, capChip: (x, y) => capChip(x, y), streak: (k) => streak(k), uiTray: () => uiTray(), combo: (n) => multiPop(n), cmul: () => comboMul(), slow: (el, k) => slowFlip(el, k, null), addLab: (v) => { S.lab += v; labChips(); uiLab(true); } });
    function labChips() { if (!S.doro) return; let n = 0; while (S.lab >= 10000 && n < 20) { S.lab -= 10000; n++; setTimeout(chipSpawn, (n - 1) * 140); } }
    /* 보관함은 빈칸을 그대로 둠(배열에 null). 끌어서 다른 니케 위에 놓으면 그 니케가 원래 칸으로 자리 바꿈 */
    const trayFree = () => { const i = S.tray.findIndex((x) => !x); return i < 0 ? S.tray.length : i; };
    function trayAdd(nk, count, at, from, ent, cm) { const add = Array.isArray(cm) ? cm.slice() : cm > 1 ? Array(count || 1).fill(cm) : []; /* 콤보 배수는 장마다 따로 기억(같은 초상화는 한 칸에) */ const e = ent ? null : S.tray.find((x) => x && x.nk.n === nk.n && !x.top); if (e && add.length) { e.cq = (e.cq || []).concat(add).sort((a, b) => b - a); } /* DORO칩으로 뒤집힌 칸에는 쌓지 않고 새 칸 */ if (e) { e.count += count || 1; e.merge = true; snd.merge(); } else { const en = ent || { nk, count: count || 1, fresh: true, cq: add.sort((a, b) => b - a) };
        if (at != null && at >= 0) { const occ = S.tray[at]; if (occ) { const back = from != null && from >= 0 && !S.tray[from] ? from : trayFree(); S.tray[back] = occ; } S.tray[at] = en; } else S.tray[trayFree()] = en; snd.collect(); }
      while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); uiTray(); }

    /* ---------- UI(DOM) ---------- */
    const magBtn = () => '<button class="gm-mg' + (S.hand ? ' on' : '') + '" data-m="t" title="자석: 한 움큼(10개) 쥐기" aria-label="자석(한 움큼 쥐기)" aria-pressed="' + S.hand + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h5v9a2 2 0 004 0V3h5v9a7 7 0 01-14 0z"/><path d="M5 7.5h5M14 7.5h5"/></svg></button>';
    function uiWal() { walEl.classList.toggle('dm', !!S.doro); if (S.doro) { const bl = Math.max(0, doroBal() - (S.dpile || 0)); wtEl.innerHTML = '<small>골드칩 1 = 10뽑<span> · 2배속 고정</span></small><b class="gm-jw gm-dmb">' + chipSvg('b', 40) + '<span>' + fmt(bl) + '</span></b><div class="gm-pulls">' + (S.dmOut ? '정리 중… 끝나면 일반 모드로 바뀝니다' : S.dpile ? '꺼낸 골드칩 ' + fmt(S.dpile / 10) + '개(' + fmt(S.dpile) + '뽑) · 끌어서 투입구에 넣기' : bl > 0 ? '[100] 버튼으로 골드칩을 꺼내 투입구에 넣어 주세요' : 'DORO칩이 없어요 · 매일 출석하면 100개') + '</div>'; modeEl.innerHTML = '<button class="gm-dmt on" data-dm="0" title="일반 모드로">DORO MODE</button><button class="gm-fb gm-dw" data-dw="1" title="잔고에서 골드칩 10개(DORO칩 100) 꺼내기">100 ' + chipSvg('b', 15) + '</button>' + magBtn(); return; } const s = S.stock, can = Math.max(0, s.pick) + Math.floor(Math.max(0, s.jw) / 300);
      wtEl.innerHTML = '<small>보유 재화<span> · 끌어서 기계에 넣기</span></small><b class="gm-jw"><img alt="" src="' + A.icons.jw + '"><span>' + fmt(s.jw) + '</span></b>'
        + '<div class="gm-chips"><span class="gm-chip" title="특뽑"><img alt="특뽑" src="' + A.icons.pick + '">' + fmt(s.pick) + '</span></div>'
        + '<div class="gm-pulls">이걸로 ' + fmt(can) + '뽑 가능해요</div>';
      modeEl.innerHTML = '<button class="gm-mg' + (S.hand ? ' on' : '') + '" data-m="t" title="자석: 한 움큼 쥐기" aria-label="자석(한 움큼 쥐기)" aria-pressed="' + S.hand + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h5v9a2 2 0 004 0V3h5v9a7 7 0 01-14 0z"/><path d="M5 7.5h5M14 7.5h5"/></svg></button><button class="gm-fb" data-feed="1">돈통</button><button class="gm-dmt" data-dm="1" title="DORO칩으로 플레이">DORO MODE</button>'; uiFeed(); }
    function uiOpt() { const m = S.mode, on = (v) => (v ? ' class="on"' : ''), p = S.pop; optEl.hidden = !p; root.querySelectorAll('.gm-ib').forEach((b) => b.classList.toggle('on', b.dataset.a === p)); if (!p) return;
      optEl.innerHTML = p === 'open' ? '<small>캡슐 표시</small><div class="gm-seg"><button data-g="corp"' + on(!m.tier) + '>기업</button><button data-g="boss"' + on(m.tier === 'boss') + '>솔레 티어</button><button data-g="pvp"' + on(m.tier === 'pvp') + '>PVP 티어</button></div><small>가리기</small><div class="gm-seg"><button data-g="random"' + on(m.random) + '>랜덤</button><button data-g="black"' + on(m.black) + '>블랙</button></div>'
        + '<small>개봉 방식</small><div class="gm-seg">' + [['mix', '랜덤'], ['pull', '당겨 열기'], ['tap', '깨트리기'], ['hold', '꾹 누르기'], ['auto', '자동']].map((x) => '<button data-op="' + x[0] + '"' + on(S.openM === x[0]) + '>' + x[1] + '</button>').join('') + '</div>'
        : '<small>도움말</small><ol class="gm-help"><li>오른쪽 상자의 재화를 끌어 기계 위에 놓기 (큰 것 10뽑 · 작은 것 1뽑)</li><li>레버 클릭 = 10연속, 드래그 = 한 칸씩</li><li>사출구 뚜껑을 위로 끌어 캡슐 꺼내기</li><li>캡슐을 눌렀다 떼면 개봉, 구슬 클릭 = 보관함</li><li>통이 비면 자동 리필</li><li>빈 곳을 옆으로 끌면 다른 픽업 머신</li></ol>'; }
    function uiStat() { const t = S.stats; statEl.innerHTML = [['뽑은 횟수', t.n], ['SSR', t.ssr + (t.pu ? ' <em>픽업 ' + t.pu + '</em>' : '')], ].map((x) => '<div><small>' + x[0] + '</small><b>' + x[1] + '</b></div>').join(''); }
    /* 보관함 한 칸: 겹친 초상화는 맨 위 한 장(top)만 들어 올려 뒤집고, 나머지는 아래에 깔림 */
    /* 초상화 두께: 얇은 원판 11장을 겹쳐 둥근 테두리(가운데가 가장 넓고 앞뒤로 갈수록 살짝 작아짐) */
    const EDGES = Array.from({ length: 11 }, (_, i) => { const f = i / 10 - 0.5, sc = 1 - 0.07 * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * f, 2)))); return '<span class="gm-ce" style="transform:translateZ(calc(var(--ot) * ' + f.toFixed(2) + ')) scale(' + sc.toFixed(3) + ');--dk:' + (0.05 + Math.abs(f) * 0.7).toFixed(2) + '"></span>'; }).join('');
    function orbHtml(t, cls, badge, tr, ctag) {
      const ck = chipE(t);
      return '<div class="gm-orb' + cls + (t.nk.pu ? ' pu' : '') + (t.flip ? ' flip' : '') + '"' + (t.tilt ? ' style="--tx:' + t.tilt[0] + 'deg;--ty:' + t.tilt[1] + 'deg"' : '') + ' title="' + (t.flip ? CHIP_NM[ck] + ' · 누르면 잔고로' : t.nk.n + ' · 누르면 뒤집기') + '">' + EDGES +
        '<div class="gm-cf" style="' + orbBg(t.nk) + '">' + (tr ? '<u style="color:' + (TIERC[tr] || '#fff') + '">' + tr + '</u>' : '') + badge + (ctag || '') + '</div><div class="gm-cb">' + chipSvg(ck, 64, undefined, true) + '</div></div>'; /* COMBO 태그는 앞면에만: 뒤집으면 사라짐 */
    }
    const ctagHtml = (m, nq) => '<b class="gm-ccf">COMBO ×' + m + (nq > 1 ? '<small>+' + (nq - 1) + '</small>' : '') + '</b>';
    function trayOrbs(e, tr) {
      const t = e.top, rest = e.count - (t ? 1 : 0);
      const tc = t ? t.cm || 0 : 0, nq = (e.cq || []).length + (tc > 1 ? 1 : 0), m = t ? tc : (e.cq && e.cq[0]) || 0; /* 다음에 뒤집을 장의 콤보 배수 */
      const ctag = m > 1 ? ctagHtml(m, nq) : '', cnt = !ctag && e.count > 1 ? '<b class="gm-cnt">×' + e.count + '</b>' : ''; /* 콤보 장이 있으면 하단 수량 태그 대신 COMBO 태그(초상화와 함께 뒤집힘) */
      if (!t) { const pp = e.fresh ? ' pop' : ''; e.fresh = false; return orbHtml({ nk: e.nk, ck: 'b' }, (e.merge ? ' merge' : '') + pp, '', tr, ctag) + cnt; }
      return cnt + (rest > 0 ? orbHtml({ nk: e.nk, ck: 'b' }, ' under', '', tr) : '') + orbHtml(t, ' top' + (rest > 0 ? ' lift' : ''), '', rest > 0 ? '' : tr, ctag);
    }
    function uiTray() { uiTray0(); S.tray.forEach((e, i) => {  const t = e && e.top; if (!t || !(t.anim || t.flipping) || !t._el) return; const w = panEl.children[i], o = w && w.querySelector('.gm-orb.top'); if (o && o !== t._el) o.replaceWith(t._el); }); }
    /* SSR 보관함은 이 기기에 저장(머신별). 다시 열면 그대로 */
    const TRAY_K0 = 'dsgm-tray-' + String(o.title || 'std').replace(/\s+/g, ''); let TRAY_K = TRAY_K0 + (DM.on ? '-doro' : ''); /* 보관함은 모드별로 따로 */
    const trayFind = (n) => { for (const k of Object.keys(P)) { const a = P[k]; if (Array.isArray(a)) { const x = a.find((y) => y && y.n === n); if (x) return x; } else if (a && a.n === n) return a; } return null; };
    function traySave() { try { localStorage.setItem(TRAY_K, JSON.stringify(S.tray.map((e) => { if (!e) return 0; const q = (e.cq || []).slice(); if (e.top && e.top.cm > 1) q.unshift(e.top.cm); return q.length ? [e.nk.n, e.count, q] : [e.nk.n, e.count]; }))); } catch (er) { /* 무시 */ } }
    function trayLoad() { try { const a = JSON.parse(localStorage.getItem(TRAY_K) || '[]'); if (!Array.isArray(a)) return; S.tray = a.map((x) => { if (!x) return null; const nk = trayFind(x[0]); if (!nk) return null; const c = Math.max(1, x[1] | 0), q = Array.isArray(x[2]) ? x[2].filter((v) => v > 1).slice(0, c) : (x[2] | 0) > 1 ? Array(c).fill(x[2] | 0) : []; return { nk, count: c, cq: q.sort((a, b) => b - a) }; });
      S.tray.forEach((e, i) => { if (!e) return; const j = S.tray.findIndex((y) => y && y.nk.n === e.nk.n); if (j < i) { const d = S.tray[j]; d.count += e.count; d.cq = d.cq.concat(e.cq).sort((a, b) => b - a); S.tray[i] = null; } }); /* 예전에 따로 쌓인 같은 초상화 합치기 */ while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); } catch (er) { /* 무시 */ } }
    /* 한 칸만 다시 그림(다른 칸의 뒤집기·빛남이 끊기지 않게) */
    function renderWell(i) {
      const w = panEl.children[i]; if (!w) { uiTray(); return; }
      const e = S.tray[i], tr = e ? (TIERS[S.val.mode === 2 ? 'pvp' : 'boss'][e.nk.n] || '-') : '';
      w.innerHTML = e ? trayOrbs(e, tr) : ''; w._h = null; if (e) e.merge = false; traySave();
      const tb = leftEl.querySelector('.gm-trbtn span'); if (tb) tb.textContent = S.tray.filter(Boolean).length;
    }
    function uiTray0() { traySave(); const pw = panEl.clientWidth - 20, ph = panEl.clientHeight - 20, cols = pw > 60 ? Math.max(3, Math.min(12, Math.floor((pw + 8) / 62))) : 5, cell = pw > 60 ? (pw - (cols - 1) * 8) / cols : 50, n = cols * Math.max(Math.ceil((S.tray.length + 1) / cols), pw > 60 ? Math.floor((ph + 8 - 14) / (cell + 8)) : 3, 2); panEl.style.setProperty('--cols', cols); const tb = leftEl.querySelector('.gm-trbtn span'); if (tb) tb.textContent = S.tray.filter(Boolean).length; while (panEl.children.length > n) panEl.lastElementChild.remove(); while (panEl.children.length < n) { const d = document.createElement('div'); d.className = 'gm-well'; d.dataset.i = panEl.children.length; panEl.appendChild(d); }
      for (let i = 0; i < n; i++) { const w = panEl.children[i], e = S.tray[i], t = e && e.top; if (t && (t.anim || t.flipping) && t._el && w.contains(t._el)) continue; /* 뒤집는 중인 칸은 그대로(다시 그리면 애니메이션이 끊김) */
        const tr = e ? (TIERS[S.val.mode === 2 ? 'pvp' : 'boss'][e.nk.n] || '-') : '', h = e ? trayOrbs(e, tr) : ''; if (e) e.merge = false; if (w._h !== h) { w.innerHTML = h; w._h = h; } } }
    const shortN = (n) => (n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? +(n / 1e3).toFixed(1) + 'k' : fmt(n));
    function uiLab(bump) { labEl.querySelector('b').textContent = shortN(S.lab); if (bump) { labEl.classList.add('bump'); clearTimeout(uiLab.t); uiLab.t = setTimeout(() => labEl.classList.remove('bump'), 120); } }

    /* ---------- 끌기 ---------- */
    let fl = null;
    const cvRect = () => cv.getBoundingClientRect();
    const toCv = (e) => { const r = cvRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height, in: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; };
    function floatEl(cls, e) { const d = document.createElement('div'); d.className = 'gm-float ' + cls; (document.fullscreenElement || document.body).appendChild(d); d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; return d; }
    const slotPx = (k) => (k === 'jw' || k === 'doro' ? HOLE.s : SLIT.w * 0.94 * TKR) * cvRect().width / W;
    function curFloatHtml(f) { let h = ''; f.items.forEach((it, i) => { const a = i * 2.4, r = i ? 5 + i * 2.6 : 0; h += '<img alt="" src="' + (f.k === 'doro' && it.u === 10 ? SRC.doro10 : SRC[f.k]) + '" style="--dx:' + (Math.cos(a) * r).toFixed(1) + 'px;--dy:' + (Math.sin(a) * r).toFixed(1) + 'px;--rt:' + ((i % 2 ? 1 : -1) * Math.min(i, 5) * 4) + 'deg">'; }); f.el.innerHTML = h + '<b>' + f.items.reduce((n, it) => n + it.u, 0) + '뽑' + '</b>'; }
    function curSize(f, big) { if (f.big === big) return; f.big = big; f.el.style.setProperty('--w', (big ? slotPx(f.k) : PSZ[f.k].w) * (f.items[0].sc || 1) + 'px'); f.el.style.setProperty('--k', big ? 2 : 1); S.hl = big ? (f.k === 'jw' || f.k === 'doro' ? 'coin' : 'bill') : null; }
    wcv.addEventListener('pointerdown', (e) => { const r = wcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let hit = null; for (let i = S.pile.length - 1; i >= 0; i--) { const b = S.pile[i]; if (Math.hypot(x - b.x, y - b.y) <= b.r + 5) { hit = b; break; } } if (!hit) return; e.preventDefault();
      S.pile.splice(S.pile.indexOf(hit), 1); fl = { ty: 'cur', k: hit.k, items: [hit], el: floatEl('cur', e), big: null, px: e.clientX, py: e.clientY }; curFloatHtml(fl); curSize(fl, false); wake(S.pile); snd.grab(); });
    function magnet(dt) { if (!fl || fl.ty !== 'cur' || !S.hand || fl.big || fl.items.length >= 10) return; const r = wcv.getBoundingClientRect(), x = fl.px - r.left, y = fl.py - r.top; let got = false;
      for (let i = S.pile.length - 1; i >= 0; i--) { const b = S.pile[i]; if (b.k !== fl.k) { b.mag = false; continue; } const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy); if (d < 90) { b.mag = true; b.sl = false; b.st = 0; const f = 5200 * (1 - d / 112); b.vx += dx / (d || 1) * f * dt; b.vy += dy / (d || 1) * f * dt - GRAV * dt * 0.9; if (d < 19 && fl.items.length < 10) { S.pile.splice(i, 1); fl.items.push(b); got = true; } } else b.mag = false; }
      if (got) { curFloatHtml(fl); snd.grab(); } }
    function orbDrag(nk, e, from, count, cm) { fl = { ty: 'orb', nk, from, count: count || 1, cm: cm > 1 ? cm : 0, el: floatEl('orb', e) }; fl.el.style.cssText += ';' + orbBg(nk); if (fl.cm) fl.el.classList.add('cmb'); orbBadge(); }
    function orbBadge() { fl.el.innerHTML = fl.count > 1 ? '<i>×' + fl.count + '</i>' : ''; }
    window.addEventListener('pointermove', (e) => { if (!fl) return; fl.px = e.clientX; fl.py = e.clientY; fl.el.style.left = e.clientX + 'px'; fl.el.style.top = e.clientY + 'px';
      if (fl.ty === 'cur') { const r = walEl.getBoundingClientRect(); curSize(fl, !(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)); }
      else { const w = document.elementFromPoint(e.clientX, e.clientY); panEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); const well = w && w.closest && w.closest('.gm-well'); if (well) well.classList.add('over');
        const p = toCv(e); if (p.in) for (let i = S.bask.length - 1; i >= 0; i--) { const b = S.bask[i]; if (b.kind === 'orb' && b.res.nk.n === fl.nk.n && (b.res.cm || 0) === fl.cm && Math.hypot(p.x - b.x, p.y - b.y) < OR * 2.3) { S.bask.splice(i, 1); wake(S.bask); fl.count += b.res.count || 1; orbBadge(); sparks(b.x, b.y, 22); snd.merge(); fl.el.classList.remove('mg'); void fl.el.offsetWidth; fl.el.classList.add('mg'); } } } });
    window.addEventListener('pointerup', (e) => { if (!fl) return; const f = fl; fl = null; f.el.remove(); S.hl = null; S.pile.forEach((b) => { b.mag = false; });
      if (f.ty === 'cur') { const p = toCv(e); if (p.in) insert(f.k, f.items, p.x, p.y); else { const r = wcv.getBoundingClientRect(), out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; f.items.forEach((it, i) => { it.x = out ? rnd(40, PW - 40) : clamp(e.clientX - r.left, it.r, PW - it.r) + rnd(-8, 8); it.y = out ? -30 - i * 20 : Math.min(e.clientY - r.top, PH - 60) - i * 6; it.vx = it.vy = 0; it.sl = false; it.st = 0; S.pile.push(it); }); wake(S.pile); } }
      else { panEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); const w = document.elementFromPoint(e.clientX, e.clientY); if (w && w.closest && w.closest('.gm-tray')) { const dw = w.closest('.gm-well'); trayAdd(f.nk, f.count, dw ? +dw.dataset.i : null, f.ti, f.en && f.en.count === f.count ? f.en : null, f.en ? (f.en.cq || []).concat(f.en.top && f.en.top.cm > 1 ? [f.en.top.cm] : []) : f.cm); if (f.from === 'reveal') endReveal(false); }
        else if (f.from === 'tray') trayAdd(f.nk, f.count, f.ti, f.ti, f.en ? Object.assign(f.en, { count: f.count }) : null); /* 보관함 SSR은 바구니로 못 돌아감 */
        else if (f.from === 'reveal' && f.count === 1) { /* 개봉 화면에 그대로 둠 */ } else { if (f.from === 'reveal') endReveal(false); const p = toCv(e); orbBody(f.nk, f.count, p.in ? clamp(p.x, BK.x0 + OR, BK.x1 - OR) : CH.x + CH.w / 2, p.in ? clamp(p.y, 500, BK.y1 - OR) : BK.y0 - 40, f.cm); } } });
    modeEl.addEventListener('click', (e) => { if (e.target.closest('[data-dw]')) { doroWithdraw(100); return; } const dmb = e.target.closest('[data-dm]'); if (dmb) { setDoro(dmb.dataset.dm === '1'); return; } if (e.target.closest('[data-feed]')) { S.sup.pick += 500; S.sup.jw += 50000; S.sup.acc = 1; uiFeed(); return; } const m = e.target.closest('[data-m]'); if (m) { S.hand = !S.hand; uiWal(); } });
    optEl.addEventListener('click', (e) => { const g = e.target.closest('[data-g]'), op = e.target.closest('[data-op]'); if (op) { S.openM = op.dataset.op; uiOpt(); } if (!g) return; const k = g.dataset.g; if (k === 'corp') setMode('tier', false); else if (k === 'boss' || k === 'pvp') setMode('tier', k); else if (k === 'random') { S.mode.black = false; setMode('random', !S.mode.random); } else { const v = !S.mode.black; setMode('random', false); setMode('black', v); } uiTray(); });
    let tpd = null; /* 보관함: 누르면 뒤집기/흡수, 끌면 이동 */
    const busyE = (en) => !!(en && en.top && en.top.busy);
    /* 모두 뒤집기: SSS 포함 칸마다 맨 위 한 장만 차례로 뒤집고, 잠시 뒤 그 장들만 한꺼번에 잔고로 (겹친 나머지는 그대로) */
    function flipAll() {
      if (S.flipAllBusy) return; if (!S.doro) { say('일반 모드에서는 SSR을 DORO칩으로 바꾸지 않습니다.'); return; }
      const list = S.tray.filter((e) => e && !busyE(e) && !(e.top && (e.top.anim || e.top.flipping)));
      if (!list.length) { say('보관함이 비어 있습니다.'); return; }
      S.flipAllBusy = true; let changed = false;
      list.forEach((e) => { if (!e.top) { e.top = mkTop(e); changed = true; } e.top.noAuto = true; });
      if (changed) uiTray();
      const step = 90; /* 개수와 상관없이 일정한 속도(시간 상한 없음) */
      list.forEach((e, n) => setTimeout(() => { const i = S.tray.indexOf(e), o = i >= 0 && panEl.children[i] && panEl.children[i].querySelector('.gm-orb.top'); if (!o || !e.top || e.top.flip) return;
        const t = e.top, a = rnd(0, TAU), m = rnd(2, 4), k = chipE(t); t.flip = true; t.tilt = [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)]; o.style.setProperty('--tx', t.tilt[0] + 'deg'); o.style.setProperty('--ty', t.tilt[1] + 'deg'); void o.offsetWidth;
        requestAnimationFrame(() => { o.classList.add('flip'); if (k !== 'b') setTimeout(() => o.classList.add('shine', 'shine-' + k), 700); }); if (k === 'r' && !t.cutR) { t.cutR = true; setTimeout(() => rainbowCut(o, 'ssr'), 800); } if (k === 'g') setTimeout(() => { if (o.isConnected) goldPop(o); }, 600); try { snd.flip(); } catch (er) { /* 무시 */ } }, 60 + n * step));
      setTimeout(() => {
        S.lite = (S.lite || 0) + 1; list.forEach((e, n) => setTimeout(() => { if (e.top) e.top.noAuto = false; absorbTop(e); if (e.count > 0 && S.tray.includes(e)) absorbRest(e); }, n * 40)); /* 겹친 나머지도 한꺼번에 */
        setTimeout(() => { S.flipAllBusy = false; S.lite = Math.max(0, S.lite - 1); }, list.length * 40 + 200);
      }, 60 + list.length * step + 1100);
    }
    panEl.addEventListener('pointerdown', (e) => { const well = e.target.closest('.gm-well'); if (!well || fl || S.spread || S.flipAllBusy) return; const en = S.tray[+well.dataset.i]; if (!en) return; e.preventDefault(); if (busyE(en)) return; /* SSS 뒤집는 중: 누르기·끌기 막음 */ tpd = { en, well, x: e.clientX, y: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (!tpd || fl) return; if (Math.hypot(e.clientX - tpd.x, e.clientY - tpd.y) < 7) return; const en = tpd.en, i = S.tray.indexOf(en); tpd = null; if (i < 0 || busyE(en)) return; S.tray[i] = null; uiTray(); orbDrag(en.nk, e, 'tray', en.count, en.cm); fl.ti = i; fl.en = en; });
    window.addEventListener('pointercancel', () => { tpd = null; });
    window.addEventListener('pointerup', () => { if (!tpd) return; const en = tpd.en; tpd = null; const i = S.tray.indexOf(en); if (i < 0 || busyE(en)) return; if (!S.doro) { say('일반 모드에서는 SSR을 DORO칩으로 바꾸지 않습니다.'); return; }
      if (en.top && en.top.anim) { if (en.top.skip) en.top.skip(); return; }
      if (en.count > 1 && !en.top) { if (isSSSn(en.nk)) spreadOpen(en); else { en.rest = true; flipTop(en); } return; } /* 겹친 칸: SSS는 펼쳐서 한 장씩, 나머지는 맨 위 한 장을 뒤집고 칸 전체를 한꺼번에 정산 */
      if (!en.top || !en.top.flip) { flipTop(en); return; }
      absorbTop(en); if (en.all && en.count > 0) setTimeout(() => { if (!en.top && S.tray.includes(en)) flipTop(en); }, 260); });
    /* 겹친 칸 펼치기: 최대 10장(5×2)을 펼쳐 0.1초마다 왼쪽부터 한 장씩 뒤집고, 다 끝나면 한꺼번에 잔고로. 남으면 다음 10장 */
    function spreadOpen(en) {
      if (S.spread) return; const tr = $('.gm-tray'); if (!tr) return;
      const box = document.createElement('div'); box.className = 'gm-spread'; tr.appendChild(box); S.spread = { en, box };
      box.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.gm-skip')) return;
        if (S.spread && S.spread.cur && !S.spread.cur.hasR) { S.spread.skip = true; S.spread.cur.skip(); return; } /* 화면을 눌러도 바로 건너뜀(무지개가 섞이면 불가) */
        const c = e.target.closest('.gm-spc'); if (!c) return; const t = c._t; if (t && t.anim && !t.busy && t.skip) t.skip(); });
      const batch = () => {
        if (!S.tray.includes(en) || en.count <= 0) { box.remove(); S.spread = null; return; }
        const n = Math.min(10, en.count), cards = [], pre = Array.from({ length: n }, () => mkTop(en)), hasR = pre.some((t) => chipE(t) === 'r');
        box.innerHTML = '<div class="gm-spg">' + Array.from({ length: n }, () => '<div class="gm-spc"></div>').join('') + '</div><div class="gm-spn">' + (en.count > n ? '남은 ' + (en.count - n) + '장' : '') + '</div>' +
          ('<button type="button" class="gm-tb gm-skip" aria-label="건너뛰기">SKIP <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor"/></svg></button>');
        { const sk = box.querySelector('.gm-skip'); if (sk) sk.addEventListener('click', (e) => { e.stopPropagation(); S.spread.skip = true; doSkip(); }); }
        box.querySelectorAll('.gm-spc').forEach((c, j) => { const t = pre[j]; c._t = t; c.innerHTML = orbHtml(t, ' top', '', '', t.cm > 1 ? ctagHtml(t.cm, 1) : ''); cards.push([c, t]); });
        S.spread.cur = { hasR: cards.some(([, t]) => chipE(t) === 'r'), skip: () => doSkip() }; /* 무지개가 섞인 묶음은 건너뛰기 없음 */
        const flipCard = (c, t, fast) => {
          const orb = c.querySelector('.gm-orb'); if (!orb || t.flip) return; const k = chipE(t), a = rnd(0, TAU), m = rnd(2, 4);
          t.flip = true; t.tilt = [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)]; orb.style.setProperty('--tx', t.tilt[0] + 'deg'); orb.style.setProperty('--ty', t.tilt[1] + 'deg');
          if (!fast && wantSlow(t, k)) { t.busy = true; t.anim = true; slowFlip(orb, k, t); setTimeout(() => { t.busy = false; }, 1000); }
          else { try { snd.flip(); } catch (er) { /* 무시 */ } if (fast) orb.style.transition = 'transform .35s ease-out'; void orb.offsetWidth; requestAnimationFrame(() => orb.classList.add('flip')); t.doneAt = performance.now() + (fast ? 400 : 950); }
        };
        /* SKIP: 남은 장은 빠르게 뒤집고, 상위 연출 중인 장은 바로 마지막 뒤집기로 */
        const instant = (c, t) => { /* 즉시 뒤집힌 상태로 */
          const orb = c.querySelector('.gm-orb'); if (!orb) return;
          if (t.anim) { orb.getAnimations().forEach((a) => a.cancel()); t.anim = false; t.busy = false; t.skip = null; ['sss', 'glow', 'st-b', 'st-s', 'st-g', 'st-r'].forEach((x) => orb.classList.remove(x)); }
          t.flip = true; orb.style.transition = 'none'; orb.classList.add('flip'); void orb.offsetWidth; t.doneAt = 0;
        };
        const doSkip = () => { if (hasR) return; cards.forEach(([c, t]) => instant(c, t)); try { snd.chipBurst(false); } catch (er) { /* 무시 */ } };
        const fast = !!S.spread.skip && !hasR;
        if (fast) setTimeout(doSkip, 60); else cards.forEach(([c, t], j) => setTimeout(() => flipCard(c, t, false), 150 + j * 100));
        const wait = () => {
          const ready = cards.every(([, t]) => t.flip && !t.anim && (!t.doneAt || performance.now() >= t.doneAt));
          if (!ready) { setTimeout(wait, 150); return; }
          setTimeout(() => {
            const gap = fast || S.spread.skip ? 30 : 70;
            cards.forEach(([c, t], j) => setTimeout(() => { const r = c.getBoundingClientRect(), k = chipE(t); c.style.visibility = 'hidden'; if (t.cutR) return; if (r.width) chipAbsorb(k, 1, r.left + r.width / 2, r.top + r.height / 2, r.width * 0.8, 'ssr', t.cm); else window.doroChips.add({ [k]: k !== 'r' && t.cm > 1 ? t.cm : 1 }, 'ssr'); }, j * gap));
            setTimeout(() => {
              en.count -= n; if (en.count <= 0) { const i = S.tray.indexOf(en); if (i >= 0) S.tray[i] = null; while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); }
              uiTray(); if (en.count > 0) setTimeout(batch, 350); else { box.remove(); S.spread = null; }
            }, n * gap + 250);
          }, fast || S.spread.skip ? 120 : 450);
        };
        setTimeout(wait, fast ? 120 : 150 + n * 100);
      };
      batch();
    }
    /* 맨 위 한 장을 들어 뒤집기 (도로칩 종류는 뒤집는 순간 정함) */
    function flipTop(en) {
      const i = S.tray.indexOf(en); if (i < 0) return;
      if (!en.top) { /* 다시 그리지 않고 그 자리의 초상화를 맨 위 장으로 (다른 칸 애니메이션이 끊기지 않게) */
        en.top = mkTop(en); const w0 = panEl.children[i], o0 = w0 && w0.querySelector('.gm-orb');
        if (o0) { o0.classList.remove('pop', 'merge'); o0.classList.add('top'); const bd = o0.querySelector('.gm-cf i'); if (bd) bd.remove(); const cb = o0.querySelector('.gm-cb'); if (cb) cb.innerHTML = chipSvg(chipE(en.top), 64, undefined, true); } else uiTray();
      }
      const t = en.top, well = panEl.children[i], orb = well && well.querySelector('.gm-orb.top'); if (!orb || t.flip) return;
      {
        t.flip = true; { const a = rnd(0, TAU), m = rnd(2, 4); t.tilt = [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)]; orb.style.setProperty('--tx', t.tilt[0] + 'deg'); orb.style.setProperty('--ty', t.tilt[1] + 'deg'); }
        orb.title = CHIP_NM[chipE(t)] + ' · 누르면 잔고로';
        if (wantSlow(t, chipE(t))) { t.busy = true; t.anim = true; t._el = orb; t.owner = en; slowFlip(orb, chipE(t), t); setTimeout(() => { t.busy = false; }, 1000); /* 클릭 막는 시간 1초 */ } else { snd.flip(); t._el = orb; t.flipping = true; setTimeout(() => { t.flipping = false; t._el = null; }, 950); void orb.offsetWidth; requestAnimationFrame(() => orb.classList.add('flip')); if (chipE(t) === 'g') setTimeout(() => { if (orb.isConnected) goldPop(orb); try { snd.chipBurst(true); } catch (er) { /* 무시 */ } }, 520); autoAbsorb(en, t, 900); }
      }
    }
    /* 도로칩 잔고를 누르면: 어디서 어떤 칩이 몇 %로 나오는지 */
    function chipOdds() {
      const tr = $('.gm-tray'); let box = tr.querySelector('.gm-odds'); if (box) { box.remove(); return; }
      const fv = feverOn(), row = (nm, key, note) => '<tr><th>' + nm + (note ? '<small>' + note + '</small>' : '') + '</th>' + (fv ? fevP(CHIP_P[key]) : CHIP_P[key]).map((v, i) => '<td class="' + (v ? '' : 'z') + '">' + (v ? (v < 0.1 ? v.toFixed(2) : v < 1 ? v.toFixed(2).replace(/0$/, '') : String(+v.toFixed(2))) + '%' : '—') + '</td>').join('') + '</tr>';
      box = document.createElement('div'); box.className = 'gm-odds' + (fv ? ' fev' : '');
      box.innerHTML = '<div class="gm-oddh"><b>DORO칩 획득 확률' + (fv ? ' <em>DORO TIME ×2</em>' : '') + '</b><button class="gm-tb" data-x>닫기</button></div><table><thead><tr><th></th>' + KS.map((k) => '<th>' + chipSvg(k, 20, false) + '</th>').join('') + '</tr></thead><tbody>' +
        row('SSS', 'SSS') + row('SS', 'SS') + row('S', 'S') + row('A 이하', 'low') + row('R 캡슐', 'capR', CAP_RATE.R * (fv ? 2 : 1) + '% 확률로') + row('SR 캡슐', 'capSR', CAP_RATE.SR * (fv ? 2 : 1) + '% 확률로') + row('R 10연속', 'stkR') + row('SR 10연속', 'stkSR') +
        '</tbody></table><p>COMBO: 10뽑 묶음에서 SSR이 n장(2장 이상) 나오면 10×n초 동안 뽑은 캡슐에서 나오는 DORO칩 n배. 시간 안에 또 나오면 배수 합산·시간 추가</p><p>DORO칩 10 = 실버칩 2 = 골드칩 1 · 바디라벨 10,000 = DORO칩 1 · 티어는 기본 티어표(솔레) 기준</p>';
      box.querySelector('[data-x]').onclick = (e) => { e.stopPropagation(); box.remove(); };
      tr.appendChild(box);
    }
    /* 초기화 전 정산: 보관함의 모든 SSR(SSS 포함)을 칩으로 바꿔 잔고에 넣음 */
    function traySettle() {
      S.lite = (S.lite || 0) + 1; setTimeout(() => { S.lite = Math.max(0, S.lite - 1); }, S.tray.length * 40 + 600);
      S.tray.forEach((e, i) => {
        if (!e) return; const w = panEl.children[i], r = w ? w.getBoundingClientRect() : null, got = {}, q = (e.cq || []).slice();
        for (let c = 0; c < e.count; c++) { const top = c === 0 && e.top, k = top && e.top.ck ? e.top.ck : chipOf(e.nk), m = (top ? e.top.cm : q.shift()) || 1, key = k + '|' + (k === 'r' ? 1 : m); got[key] = (got[key] || 0) + 1; }
        Object.keys(got).forEach((key, j) => { const [k, m] = key.split('|'); setTimeout(() => { if (r && r.width) chipAbsorb(k, got[key], r.left + r.width / 2, r.top + r.height / 2, r.width * 0.9, 'ssr', +m); else window.doroChips.add({ [k]: got[key] * +m }, 'ssr'); }, i * 40 + j * 80); });
      });
    }
    /* 칸에 남은 장을 한꺼번에 칩으로(장마다 콤보 배수 반영). 무지개는 한 장만 컷인, 나머지는 바로 */
    function absorbRest(en) {
      const i = S.tray.indexOf(en); if (i < 0 || en.top || en.count <= 0) return; const w = panEl.children[i], r = w ? w.getBoundingClientRect() : null, got = {}, q = (en.cq || []).slice(); let rb = 0;
      for (let c = 0; c < en.count; c++) { const k = chipOf(en.nk), m = q.shift() || 1; if (k === 'r') { rb++; continue; } const key = k + '|' + m; got[key] = (got[key] || 0) + 1; }
      S.tray[i] = null; while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); renderWell(i); uiTray();
      const rc = r && r.width ? r : null; Object.keys(got).forEach((key, j) => { const [k, m] = key.split('|'); setTimeout(() => { if (rc) chipAbsorb(k, got[key], rc.left + rc.width / 2, rc.top + rc.height / 2, rc.width * 0.9, 'ssr', +m); else window.doroChips.add({ [k]: got[key] * +m }, 'ssr'); }, j * 120); });
      if (rb) { if (rc) setTimeout(() => rainbowCut({ left: rc.left, top: rc.top, width: rc.width, height: rc.height }, 'ssr'), 300); else window.doroChips.add({ r: 1 }, 'ssr'); if (rb > 1) window.doroChips.add({ r: rb - 1 }, 'ssr'); }
    }
    /* 뒤집힌 맨 위 한 장을 잔고로 */
    function absorbTop(en) {
      const i = S.tray.indexOf(en), t = en && en.top; if (i < 0 || !t || !t.flip || t.anim) return;
      const w = panEl.children[i], orb = w && w.querySelector('.gm-orb.top'), r = orb ? orb.getBoundingClientRect() : null;
      en.count -= 1; en.top = null; en.ck = null; if (en.count <= 0) { S.tray[i] = null; while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); }
      renderWell(i); if (t.cutR) return; /* 무지개 컷인이 직접 잔고로 옮김 */ if (r && r.width) chipAbsorb(chipE(t), 1, r.left + r.width / 2, r.top + r.height / 2, r.width, 'ssr', t.cm); else window.doroChips.add({ [chipE(t)]: chipE(t) !== 'r' && t.cm > 1 ? t.cm : 1 }, 'ssr');
    }
    /* 뒤집히고 0.5초 뒤 스스로 잔고로 (실버·골드·무지개는 그 사이 커지며 빛남) */
    function autoAbsorb(en, t, wait) {
      if (t.noAuto) return;
      setTimeout(() => {
        if (en.top !== t || !t.flip || t.anim) return;
        const k = chipE(t), i = S.tray.indexOf(en), o = i >= 0 && panEl.children[i] && panEl.children[i].querySelector('.gm-orb.top');
        if (o && k !== 'b') o.classList.add('shine', 'shine-' + k);
        setTimeout(() => { absorbTop(en); if (en.rest) { en.rest = false; if (en.count > 0 && S.tray.includes(en)) absorbRest(en); return; } if (en.all && en.count > 0 && S.tray.includes(en)) setTimeout(() => { if (!en.top && S.tray.includes(en)) flipTop(en); }, 260); else en.all = false; }, 500);
      }, wait || 0);
    }
    root.addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
      if (k === 'snd') { S.mute = !S.mute; a.classList.toggle('off', S.mute); }
      else if (k === 'fold') { a.parentNode.classList.toggle('fold'); }
      else if (k === 'tfold' || k === 'topen') { const on = k === 'topen' ? true : false; $('.gm').classList.toggle('topen', on); requestAnimationFrame(() => { resize(); uiTray(); }); }
      else if (k === 'open' || k === 'help') { S.pop = S.pop === k ? null : k; uiOpt(); }
      else if (k === 'hide') { a.classList.toggle('on', $('.gm-left').classList.toggle('clean')); S.pop = null; uiOpt(); }
      else if (k === 'refill') refill();
      else if (k === 'flipall') flipAll();
      else if (k === 'odds') chipOdds();
      else if (k === 'demo') { const tr = $('.gm-tray'); let m = tr.querySelector('.gm-demob'); if (m) { m.remove(); return; } m = document.createElement('div'); m.className = 'gm-demob';
        m.innerHTML = '<b>연출 시안</b>' + [['rb', '무지개 컷인'], ['gold', '골드 확정'], ['dbl', 'DOUBLE'], ['tri', 'TRIPLE'], ['stkR', 'R 10연속'], ['stkSR', 'SR 10연속'], ['tease', '가짜 무지개 예고'], ['fev5', 'DORO TIME 5분 시작'], ['fev10s', 'DORO TIME 10초(끝 확인)'], ['fevoff', 'DORO TIME 끄기'], ['jack', 'JACKPOT'], ['rain', '칩 비 내리기'], ['combo', 'COMBO 연속'], ['shard', '깨트리기 파편'], ['tap', '다음 개봉 = 깨트리기'], ['roll', '잔고 굴러가기']].map((x) => '<button type="button" class="gm-tb" data-d="' + x[0] + '">' + x[1] + '</button>').join('');
        m.addEventListener('click', (e2) => { const d = e2.target.closest('[data-d]'); if (!d) return; e2.stopPropagation(); const v = d.dataset.d, o1 = panEl.querySelector('.gm-orb.top, .gm-orb') || balEl;
          if (v === 'rb') rainbowCut(o1 && o1.closest('.gm-well') ? o1 : null, null, { jp: false }); else if (v === 'gold') goldPop(o1); else if (v === 'dbl') multiPop(2, true); else if (v === 'tri') multiPop(3, true); else if (v === 'tease') teasePop(); else if (v === 'fever') feverPop(); else if (v === 'rain') coinRain(); else if (v === 'combo') { multiPop(2, true); setTimeout(() => multiPop(3, true), 2600); } else if (v === 'jack') rainbowCut(null, null, { jp: true }); else if (v === 'fev5') feverStart(); else if (v === 'fev10s') feverStart(10000); else if (v === 'fevoff') { try { localStorage.removeItem(FEV_K); } catch (er) { /* 무시 */ } } else if (v === 'stkR') streakCut('R', 0.17, 'b', true); else if (v === 'stkSR') streakCut('SR', 0.022, 's', true);
          else if (v === 'shard') { S.flash = 0.6; snd.crack(); shards(RV.x, RV.y, RV.r, COL.SSR); sparks(RV.x, RV.y, 60, () => pick(['#fff3b0', '#ffd24d', '#ffffff']), 650, 260); }
          else if (v === 'tap') { S.openM = 'tap'; uiOpt(); say('다음 캡슐은 깨트려서 엽니다.'); }
          else if (v === 'roll') { const el = balEl.querySelector('.gm-cbn'), cur = el._v || 0; rollNum(el, cur + 1234); setTimeout(() => uiBal(), 1600); } });
        tr.appendChild(m); }
      else if (k === 'fs') { const inFs = !!(document.fullscreenElement || root.closest('.gm-multi.fs')); if (inFs && GM_ALL.some((x) => x.S.tray.some(Boolean)) && !(S.fsWarn && performance.now() - S.fsWarn < 4000)) { S.fsWarn = performance.now(); S.msg = { t: '잠깐, 아직 교환하지 않은 SSR이 있습니다!', life: 3.6 }; snd.clunk(); const g = $('.gm'); if (g && !g.classList.contains('topen')) { g.classList.add('topen'); requestAnimationFrame(() => { resize(); uiTray(); }); } return; } if (o.fs) o.fs(); else if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }
      else if (k === 'auto') { if (S.doro) { say('DORO MODE는 2배속 AUTO로 고정입니다.'); return; } S.auto = S.auto === 0 ? 1 : S.auto === 1 ? 2 : S.auto === 2 ? 4 : 0; S.autoLid = false; a.textContent = S.auto ? 'AUTO ×' + S.auto : 'AUTO'; a.classList.toggle('on', !!S.auto); }
      else if (k === 'exch') { const L = S.bask.filter((b) => (b.kind === 'R' || b.kind === 'SR') && !(S.mode.random && b.res.dummy)); if (!L.length) say('교환할 R·SR 캡슐이 없습니다.'); popStart(L); }
      else if (k === 'all') { const L = S.bask.filter((b) => b.kind === 'orb'); L.forEach((b) => { S.bask.splice(S.bask.indexOf(b), 1); trayAdd(b.res.nk, b.res.count, null, null, null, b.res.cm); }); wake(S.bask); const R = S.reveal; if (R && R.ph === 'show' && R.nk && R.t > 0.5) { trayAdd(R.nk, 1, null, null, null, R.res.cm); endReveal(false); } }
      else if (k === 'reset') { if (S.doro) traySettle(); Object.assign(S.stock, stock0); S.gl = []; if (!S.doro) { S.cred = []; S.credN = 0; } S.dpile = 0; S.dlog = [0]; S.dnet = 0; /* DORO MODE: 이미 넣은 칩(크레딧)은 남김 */ S.bask = []; S.cup = []; S.emerg = []; S.parts = []; S.pops = []; S.ins = []; S.lab = 0; S.tray = []; S.reveal = null; S.grab = null; S.refill = null; S.stats = { n: 0, ssr: 0, pu: 0, gold: 0, silver: 0 }; S.log = []; S.sq = []; S.streak = null; S.blk = null; S.blkT = null; gDirty = true; S.pile = []; S.sup.pick = S.sup.jw = 0; S.sup.full = false; pileSync(); domeInit(); uiWal(); uiStat(); uiTray(); uiLab(); } });

    /* 캔버스 조작 */
    const hitBody = (p) => { for (let i = S.bask.length - 1; i >= 0; i--) { const b = S.bask[i]; if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 2) return b; } return null; };
    const inCh = (p) => p.x >= CH.x && p.x <= CH.x + CH.w && p.y >= CH.y && p.y <= CH.y + CH.h;
    function addCracks(R) { /* 탭마다 다른 모양: 균열 수·출발점(빈 곳/기존 균열에서 이어짐)·길이·꺾임·굵기·잔가지가 모두 무작위 */
      const one = (x, y, a, seg, ln, rim, jit, wm) => { const pts = [[x, y, rnd(0.5, 0.8) * wm]]; for (let s = 0; s < seg; s++) { a += rnd(-jit, jit); const l = rnd(ln * 0.5, ln * 1.5); x += Math.cos(a) * l; y += Math.sin(a) * l; const d = Math.hypot(x, y); if (d >= 1) { pts.push([x / d * 1.12, y / d * 1.12, rnd(0.7, 1.2) * wm, 1]); break; } pts.push([x, y, rnd(0.4, 1.4) * wm]); if (rim && s === seg - 1 && seg < 16) seg++; } if (pts.length > 1) R.cracks.push(pts); return pts; };
      const nM = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
      for (let k = 0; k < nM; k++) {
        let x, y; const old = R.cracks.length && Math.random() < 0.45 ? pick(R.cracks) : null;
        if (old) { const q = pick(old); x = q[0]; y = q[1]; if (q[3]) { x *= 0.85; y *= 0.85; } } else { const ang = rnd(0, TAU), rr = Math.sqrt(Math.random()) * 0.6; x = Math.cos(ang) * rr; y = Math.sin(ang) * rr; }
        const out = Math.atan2(y, x), a0 = Math.random() < 0.6 && Math.hypot(x, y) > 0.15 ? out + rnd(-0.9, 0.9) : rnd(0, TAU);
        const pts = one(x, y, a0, 2 + ((Math.random() * 5) | 0), rnd(0.12, 0.3), Math.random() < 0.65, rnd(0.3, 1.1), rnd(0.6, 1.35));
        const nb = pts.length > 2 ? (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0) : 0;
        for (let b = 0; b < nb; b++) { const q = pts[1 + ((Math.random() * (pts.length - 2)) | 0)]; one(q[0], q[1], rnd(0, TAU), 1 + ((Math.random() * 3) | 0), rnd(0.08, 0.17), Math.random() < 0.2, rnd(0.4, 1), rnd(0.45, 0.8)); }
      } }
    cv.addEventListener('pointerdown', (e) => { const lf = $('.gm-left'); if (lf.classList.contains('clean')) { lf.classList.remove('clean'); return; } const p = toCv(e), R = S.reveal;
      if (R) { if (R.ph === 'open') { if (R.method === 'auto') { if (R.t > 1 && !S.auto) R.prog = 1; } else if (R.method === 'hold') { R.hold = true; cv.setPointerCapture(e.pointerId); } else if (R.method === 'tap') { R.taps++; R.punch = 1; R.shake = Math.max(R.shake, 0.6); addCracks(R); snd.crack(); sparks(RV.x + rnd(-40, 40), RV.y + rnd(-40, 40), 8, () => lvCol(R, R.shown, 1), 300); } else { R.drag = { x: p.x, y: p.y, d: 0 }; cv.setPointerCapture(e.pointerId); } }
        else if (R.ph === 'show' && R.nk && R.t > 0.6) { if (Math.hypot(p.x - RV.x, p.y - RV.y) < RV.r + 10) R.down = { x: e.clientX, y: e.clientY }; else endReveal(true); } return; }
      if (Math.hypot(p.x - LV.x, p.y - LV.y) < LV.r + 6) { const L = S.lev; L.drag = { ang: Math.atan2(p.y - LV.y, p.x - LV.x), moved: 0, t0: S.time }; if (L.sp < 1) return; L.q = 0; cv.setPointerCapture(e.pointerId); return; }
      if (inCh(p)) { S.lid.drag = { y0: p.y, a0: S.lid.a, v: S.lid.a }; cv.setPointerCapture(e.pointerId); return; }
      const b = hitBody(p); if (!b || b.pop) { if (o.nav) o.nav(e); return; } S.grab = { b, sx: p.x, sy: p.y, tx: p.x, ty: p.y, ox: b.x - p.x, oy: b.y - p.y, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { const p = toCv(e), L = S.lev, R = S.reveal, g = S.grab;
      if (R && R.drag) { R.drag.d = Math.max(Math.abs(p.y - R.drag.y), Math.abs(p.x - R.drag.x) * 0.7); return; }
      if (R && R.down && !fl && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) > 8) { R.down = null; R.hide = true; orbDrag(R.nk, e, 'reveal', 1, R.res.cm); return; }
      if (S.lid.drag) { const d = S.lid.drag; d.v = clamp(d.a0 + (d.y0 - p.y) / 70, 0, 1); return; }
      if (g) { g.tx = p.x; g.ty = p.y; if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) > 8) { g.moved = true; if (g.b.kind === 'orb') { S.grab = null; S.bask.splice(S.bask.indexOf(g.b), 1); wake(S.bask); try { cv.releasePointerCapture(e.pointerId); } catch (er) { /* 무시 */ } orbDrag(g.b.res.nk, e, 'bask', g.b.res.count, g.b.res.cm); } else { g.b.held = true; wake(S.bask); } } return; }
      if (L.drag) { const a = Math.atan2(p.y - LV.y, p.x - LV.x); let d = a - L.drag.ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; L.drag.ang = a; L.drag.moved += Math.abs(d); if (d > 0) L.tg = Math.min(L.tg + d * 0.9, L.t + 0.85); return; }
      let cur = ''; if (R) cur = 'pointer'; else if (Math.hypot(p.x - LV.x, p.y - LV.y) < LV.r + 6 || inCh(p)) cur = 'grab'; else { const b = hitBody(p); if (b) cur = b.kind === 'orb' ? 'grab' : 'pointer'; } cv.style.cursor = cur; });
    const cvUp = () => { const L = S.lev, R = S.reveal, g = S.grab; if (R) { R.drag = null; R.hold = false; if (R.down) { R.down = null; endReveal(true); } } S.lid.drag = null;
      if (g) { S.grab = null; g.b.held = false; if (!g.moved && S.bask.indexOf(g.b) >= 0) { if (g.b.kind === 'SSR' || (S.mode.random && g.b.kind !== 'orb')) startReveal(g.b); else if (g.b.kind === 'chip') chipTake(g.b); else if (g.b.kind !== 'orb') popStart([g.b]); else { S.bask.splice(S.bask.indexOf(g.b), 1); wake(S.bask); flyOrb(g.b.res.nk, g.b.res.count, g.b.x, g.b.y); } } }
      if (!L.drag) return; if (L.drag.moved < 0.08 && S.time - L.drag.t0 < 0.4) { if (allowed() > 0) { L.an = Math.min(10, allowed()); L.q = L.an; S.btId = (S.btId || 0) + 1; L.wait = 0; } else nope(); } L.drag = null; };
    cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', cvUp);
    window.addEventListener('pointerup', () => { const R = S.reveal; if (R && R.hide) setTimeout(() => { if (S.reveal === R) R.hide = false; }, 0); });
    function nope() { if (S.auto) return; snd.clunk(); if (S.reveal || S.refill) return; say(!S.credN ? '크레딧이 없습니다. 재화를 투입구에 넣어 주십시오.' : '바구니가 가득 찼습니다. [라벨 교환]을 눌러 주십시오.'); }

    /* ---------- 갱신 ---------- */
    function updReveal(R, dt) {
      R.t += dt; R.punch = Math.max(0, R.punch - dt * 5); R.shake = Math.max(0, R.shake - dt * 2.2); for (let i = R.rings.length - 1; i >= 0; i--) { R.rings[i].t += dt; if (R.rings[i].t > 0.7) R.rings.splice(i, 1); }
      if (R.ph === 'in') { if (R.t > 0.42) { R.ph = 'open'; R.t = 0; if (R.method === 'auto') snd.charge(R.D, R.T >= 2); } }
      else if (R.ph === 'open') {
        const nx = R.ev[R.ei];
        if (R.bot) { if (R.method === 'hold') R.hold = true; else if (R.method === 'tap') { R.bt = (R.bt || 0) + dt; if (R.bt > R.D * 0.8 / TAPN && R.taps < TAPN) { R.bt = 0; R.taps++; R.punch = 1; R.shake = Math.max(R.shake, 0.6); addCracks(R); snd.crack(); sparks(RV.x + rnd(-40, 40), RV.y + rnd(-40, 40), 8, () => lvCol(R, R.shown, 1), 300); } } }
        if (R.method === 'auto') { if (R.prog < 1) R.prog = Math.min(1, R.prog + dt / R.D * (nx && nx.p - R.prog < 0.06 ? 0.3 : 1)); }
        else if (R.method === 'pull') { if (R.bot) R.prog = Math.min(1, R.prog + dt / (R.D * 0.8) * (nx && nx.p - R.prog < 0.06 ? 0.35 : 1)); else { const tg = R.drag ? clamp(R.drag.d / 170, 0, 1) : 0; R.prog += (tg - R.prog) * Math.min(1, dt * (R.drag ? 16 : 5)); } }
        else if (R.method === 'hold') { const fl0 = R.ei > 0 ? R.ev[R.ei - 1].p : 0; if (R.hold) { R.prog = Math.min(1, R.prog + dt / (R.D * 0.8) * (nx && nx.p - R.prog < 0.06 ? 0.35 : 1)); R.shake = Math.max(R.shake, 0.22 + 0.5 * R.prog); } else R.prog = Math.max(fl0, R.prog - dt * 0.3); }
        else R.prog += (Math.min(1, R.taps / TAPN) - R.prog) * Math.min(1, dt * 14);
        R.grow += (R.shown - R.grow) * Math.min(1, dt * 9);
        while (R.ei < R.ev.length && R.prog >= R.ev[R.ei].p) revEvent(R, R.ev[R.ei++]);
        R.hb -= dt; if (R.prog > 0.04 && R.hb <= 0) { snd.heart(); R.hb = 0.95 - 0.62 * R.prog; }
        if (R.prog >= (R.method === 'pull' ? 0.97 : 0.995)) revBurst(R);
      } else if (R.ph === 'hit') { if (R.t > 0.11) { R.ph = 'show'; R.t = 0; S.flash = R.T >= 2 ? 1 : 0.5; snd.burst(R.T); seqDone(R.res); if (R.T >= 2) vib(R.pu ? [70, 50, 70, 50, 220] : R.T === 3 ? [70, 40, 140] : [60, 40, 90], true); if (R.kind === 'SSR') { S.gl.push({ at: S.log.length, pu: R.pu, n: R.nk.n }); gDirty = true; } const n = [18, 30, 60, 120][R.T]; sparks(RV.x, RV.y, n, R.T >= 2 ? () => (R.T === 3 ? lvCol(R, 3, 1) : pick(['#fff3b0', '#ffd24d', '#ffffff'])) : LVC[R.T], [380, 480, 650, 900][R.T], 260); if (R.method === 'tap') shards(RV.x, RV.y, RV.r, COL[R.lk[0]] || COL.SSR); else shells(RV.x, RV.y, RV.r, 0, COL[R.lk[0]], 1.5);
          if (R.kind !== 'SSR') { S.parts.push({ ty: 'lab', x: RV.x, y: RV.y, sx: RV.x, sy: RV.y, t: -0.55, val: LABEL[R.kind], big: 1 }); capChip(RV.x, BK.y0 + 30, R.kind, R.res.cm); } else if (R.ovr) setTimeout(() => { if (S.reveal === R) { vib([30, 30, 30, 30, 160], true); snd.zap(); S.flash = 0.6; R.shake = 1; sparks(RV.x, RV.y, 70, '#bff8ff', 900, 0); } }, 420); } }
      else if (R.kind !== 'SSR' && R.t > 1.0) S.reveal = null;
    }
    function autoStep(dt) { // AUTO: 투입 → 레버 → 꺼내기 → 교환·개봉 → 보관 → 리필
      S.at -= dt; const R = S.reveal; S.autoLid = S.cup.length > 0 && !S.lev.auto;
      if (R) { if (R.ph === 'show' && R.kind === 'SSR' && R.t > 1.5 && !R.hide) { const nk = R.nk, cm = R.res.cm; endReveal(false); flyOrb(nk, 1, RV.x, RV.y, cm); } return; }
      if (S.at > 0 || S.refill) return; S.at = 0.25;
      { const ch = S.bask.find((b) => b.kind === 'chip' && b.sl); if (ch) { chipTake(ch); S.at = 0.25; return; } }
      const orb = S.bask.find((b) => b.kind === 'orb' && b.sl); if (orb) { S.bask.splice(S.bask.indexOf(orb), 1); wake(S.bask); flyOrb(orb.res.nk, orb.res.count, orb.x, orb.y, orb.res.cm); return; }
      const busy = S.lev.auto > 0 || S.emerg.length || S.cup.length || S.dome.some((b) => b.exit) || S.pops.length;
      if (!busy) { const keep = (b) => b.kind === 'SSR' || (S.mode.random && b.res.dummy && b.kind !== 'orb'); const junk = S.bask.filter((b) => (b.kind === 'R' || b.kind === 'SR') && !keep(b) && !b.pop); if (junk.length) { popStart(junk); S.at = 0.6; return; }
        const y = S.bask.find((b) => keep(b) && !b.pop); if (y) { if (y.sl) { startReveal(y); if (S.reveal) S.reveal.bot = true; } return; } }
      const unopened = S.bask.some((b) => b.kind !== 'orb' && b.kind !== 'chip'); /* 캡슐이 남아 있으면 다 깔 때까지 다음 10뽑 안 함 */
      if (allowed() > 0) { if (!busy && !unopened && !S.lev.auto && !S.lev.drag) { S.lev.an = Math.min(10, allowed()); S.lev.q = S.lev.an; S.btId = (S.btId || 0) + 1; S.lev.wait = 0; } return; }
      if (S.ins.length || busy) return;
      if (!domeN() && (S.credN || S.pile.length)) { refill(); return; }
      if (!S.credN && room() >= 10) { const it = S.pile.filter((b) => b.k === 'doro').sort((a, b) => b.u - a.u)[0] || S.pile.filter((b) => b.k === 'pick').sort((a, b) => b.u - a.u)[0] || S.pile.filter((b) => b.k === 'jw').sort((a, b) => b.u - a.u)[0]; if (it) { S.pile.splice(S.pile.indexOf(it), 1); wake(S.pile); insert(it.k, [it], it.k === 'jw' ? HOLE.x + 150 : SLIT.x + 150, 300); S.at = 0.5; return; } }
      const left = S.bask.find((b) => (b.kind === 'SSR' || (S.mode.random && b.res.dummy && b.kind !== 'orb')) && !b.pop); if (left) { startReveal(left); if (S.reveal) S.reveal.bot = true; } }
    function update(dt) {
      if (S.streak) { const rd = dt / (S.auto || 1); S.streak.t += rd; S.flash = Math.max(0, S.flash - rd * 3); if (S.streak.t > 3.2) S.streak = null; return; } /* 10연속 고지: 3초간 정지 */
      if (S.auto) autoStep(dt);
      S.time += dt; const L = S.lev, stp = TAU / 10;
      const au = L.q > 0 || L.sp < 1; L.auto = au ? 1 : 0;
      if (au) { if (L.sp >= 1) { if (L.wait > 0) L.wait -= dt; else if (allowed() > 0) { pull(); L.q--; L.sp = 0; L.t0 = Math.round(L.t / stp) * stp; L.dur = L.q === 0 && L.an > 1 ? 0.19 : 0.115; L.w2 = L.q === 1 && L.an > 1 ? 0.2 : 0; } else L.q = 0; }
        if (L.sp < 1) { L.sp = Math.min(1, L.sp + dt / L.dur); L.t = L.tg = L.t0 + stp * ease(L.sp); if (L.sp >= 1) L.wait = L.w2; } }
      if (!au) {
      const i0 = Math.floor(L.t / stp + 1e-6), al = allowed(), maxT = al > 0 ? (i0 + al) * stp + 0.14 : i0 * stp + 0.16;
      if (L.tg > maxT) { if (al === 0 && (L.drag || L.auto > 0) && L.tg > i0 * stp + 0.15) { if (L.auto > 0) L.auto = 0; if (S.time - L.clunk > 0.5) { L.clunk = S.time; nope(); } } L.tg = maxT; }
      if (!L.drag && L.auto <= 0) L.tg += (Math.floor(L.tg / stp + 1e-6) * stp - L.tg) * Math.min(1, dt * 9);
      L.t += clamp((L.tg - L.t) * 22 * dt, -5 * dt, 9 * dt);
      let i1 = Math.floor(L.t / stp + 1e-6); if (i1 > i0 + al) { i1 = i0 + al; L.t = Math.min(L.t, i1 * stp + 0.16); }
      for (let k = i0; k < i1; k++) pull(); }
      // 배출구: 컵에 모였다가 뚜껑을 밀고 나옴
      const Ld = S.lid; for (let i = S.dome.length - 1; i >= 0; i--) { const b = S.dome[i]; if (!b.exit) continue; b.sl = false; b.vx = (480 - b.x) * 16; b.vy = 520; if (b.y > IN.y1 + 58) { S.dome.splice(i, 1); S.emerg.push({ res: b.res, t: 0, ox: rnd(-30, 30) }); wake(S.dome); } }
      for (let i = S.emerg.length - 1; i >= 0; i--) { const m = S.emerg[i]; m.t += dt; if (m.t > 0.02) { S.emerg.splice(i, 1); const b = body(m.res.kind, CH.x + CH.w / 2 + m.ox, CH.y + 4, m.res); b.vy = 280; b.vx = rnd(-60, 60); b.w = rnd(-5, 5); S.cup.push(b); } }
      const over = S.cup.length > 6; Ld.push = over; Ld.pt = over ? Ld.pt + dt : 0;
      const tg = Math.max(Ld.drag ? Ld.drag.v : 0, S.autoLid ? 1 : 0, over || S.time - (Ld.lr || -9) < 0.55 ? 0.62 : 0), pa = Ld.a; Ld.a += (tg - Ld.a) * Math.min(1, dt * (tg > Ld.a ? 7 : 4)); if (pa < 0.3 && Ld.a >= 0.3) snd.lid();
      Ld.rel -= dt; if (Ld.a > 0.4 && Ld.rel <= 0 && S.cup.length && (over || S.autoLid || (Ld.drag && Ld.drag.v > 0.4))) { Ld.lr = S.time; let q = S.cup[0]; for (const b of S.cup) if (b.y > q.y) q = b; S.cup.splice(S.cup.indexOf(q), 1); wake(S.cup); const b = body(q.kind, q.x, CH.y + CH.h - 24, q.res); b.a = q.a; b.vx = rnd(-140, 240); b.vy = 140; b.w = rnd(-6, 6); S.bask.push(b); Ld.rel = 0.08; }
      // 리필: 윗뚜껑이 열리고 캡슐이 쏟아짐
      const F = S.refill; if (F) { F.t += dt; if (F.t > 0.3 && S.dome.length < NDOME) { F.acc += dt * 70; while (F.acc >= 1 && S.dome.length < NDOME) { F.acc--; domeAdd(true); } wake(S.dome); } if (S.dome.length >= NDOME && (F.t > 5.5 || !S.dome.some((b) => b.y < IN.y0 - 4))) { F.done = (F.done || 0) + dt; if (F.done > 0.7) { S.refill = null; snd.lid(); } } }
      S.cap += ((F ? 1 : 0) - S.cap) * Math.min(1, dt * 9);
      if (!F && domeN() === 0) { refill(); }
      const sub = dt > 0.02 ? 3 : 2, h = dt / sub, g = S.grab;
      for (let k = 0; k < sub; k++) { if (g && g.moved) { const b = g.b, tx = clamp(g.tx + g.ox, BK.x0 + b.r, BK.x1 - b.r), ty = clamp(g.ty + g.oy, 470, BK.y1 - b.r); b.sl = false; b.vx = clamp((tx - b.x) * 22, -2600, 2600); b.vy = clamp((ty - b.y) * 22, -2600, 2600) - GRAV * h; } step(S.dome, h, wallsDome); step(S.bask, h, wallsBask); step(S.cup, h, wallsCup); step(S.pile, h, wallsPile); }
      if (fl && fl.ty === 'cur') magnet(dt);
      feedTick(dt);
      for (let i = S.pops.length - 1; i >= 0; i--) { const q = S.pops[i]; q.t += dt; if (q.t >= 0 && !q.hop) { q.hop = true; q.b.sl = false; q.b.st = 0; q.b.vy = -330; q.b.vx += rnd(-60, 60); q.b.w = rnd(-12, 12); } if (q.t >= 0.13) { popBurst(q.b); S.pops.splice(i, 1); } }
      for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i];
        if (p.ty === 'shard') { p.life += dt; p.vy += GRAV * 0.9 * dt; p.vx *= 1 - 0.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt; if (p.y > H + 120 || p.life > 2.2) S.parts.splice(i, 1); }
        else if (p.ty === 'shell') { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt; if (p.y > H + 160) S.parts.splice(i, 1); }
        else if (p.ty === 'spark') { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > p.max) S.parts.splice(i, 1); }
        else if (p.ty === 'lab') { p.t += dt; if (p.t < 0.38) { p.x = p.sx; p.y = p.sy - 34 * eout(Math.max(0, p.t) / 0.38); } else { const u = Math.min(1, (p.t - 0.38) / 0.5), k = u * u, mx = (p.sx + HUDP.x) / 2, my = Math.min(p.sy, HUDP.y) - 160; p.x = (1 - k) * (1 - k) * p.sx + 2 * (1 - k) * k * mx + k * k * HUDP.x; p.y = (1 - k) * (1 - k) * (p.sy - 34) + 2 * (1 - k) * k * my + k * k * HUDP.y; if (u >= 1) { S.parts.splice(i, 1); S.lab += p.val; labChips(); uiLab(true); snd.blip(); } } } }
      for (let i = S.ins.length - 1; i >= 0; i--) { const s = S.ins[i]; s.t += dt; const cn = s.k === 'jw' || s.k === 'doro'; if (!s.snd && s.t > (cn ? 0.34 : 0.5)) { s.snd = true; if (cn) snd.coin(); else snd.bill(); } if (s.t > (cn ? 0.8 : 1.15)) { S.ins.splice(i, 1); if (s.k === 'doro') { const u = s.u || 10; S.dpile = Math.max(0, (S.dpile || 0) - u); if (window.doroChips && window.doroChips.spend(u)) credit('doro', u); else say('DORO칩이 부족합니다.'); uiWal(); } else credit(s.k, s.u || 10); } }
      if (S.led > 0) S.led = Math.max(0, S.led - dt * 3);
      if (S.msg) { S.msg.life -= dt; if (S.msg.life <= 0 || !S.msg.t) S.msg = null; }
      if (S.reveal) updReveal(S.reveal, dt);
      if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.6);
    }

    /* ---------- 그리기 ---------- */
    function stkPath(x, pad) { const x0 = BAN.cx - BAN.w / 2 - pad, x1 = BAN.cx + BAN.w / 2 + pad, y0 = BAN.cy - BAN.h / 2 - pad, y1 = BAN.cy + BAN.h / 2 + pad, r = 18 + pad, bv = 0, bh = 0; x.beginPath(); x.moveTo(x0 + r, y0); x.quadraticCurveTo(BAN.cx, y0 - bv, x1 - r, y0); x.quadraticCurveTo(x1, y0, x1, y0 + r); x.quadraticCurveTo(x1 + bh, BAN.cy, x1, y1 - r); x.quadraticCurveTo(x1, y1, x1 - r, y1); x.quadraticCurveTo(BAN.cx, y1 + bv, x0 + r, y1); x.quadraticCurveTo(x0, y1, x0, y1 - r); x.quadraticCurveTo(x0 - bh, BAN.cy, x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath(); }
    function sticker(x) { // 볼록한 사각 표지: 네 변이 살짝 부풀고 모서리는 둥글게
      const path = (pad) => stkPath(x, pad);
      x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 16; x.shadowOffsetY = 5; x.fillStyle = '#f4f6fa'; path(5); x.fill(); x.restore();
      x.save(); path(0); x.clip(); const bx = BAN.cx - BAN.w / 2 - 6, by = BAN.cy - BAN.h / 2 - 10, bw = BAN.w + 12, bh2 = BAN.h + 20; if (IM.cover.complete && IM.cover.naturalWidth) x.drawImage(IM.cover, bx, by, bw, bh2); else { x.fillStyle = '#2a2140'; x.fillRect(bx, by, bw, bh2); }
      let g = x.createLinearGradient(0, by, 0, by + bh2); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(0.18, 'rgba(255,255,255,0)'); g.addColorStop(0.78, 'rgba(0,0,30,0)'); g.addColorStop(1, 'rgba(0,0,30,.38)'); x.fillStyle = g; x.fillRect(bx, by, bw, bh2);
      g = x.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, 'rgba(0,0,30,.22)'); g.addColorStop(0.08, 'rgba(0,0,30,0)'); g.addColorStop(0.92, 'rgba(0,0,30,0)'); g.addColorStop(1, 'rgba(0,0,30,.22)'); x.fillStyle = g; x.fillRect(bx, by, bw, bh2);
      g = x.createLinearGradient(bx, by, bx + bw * 0.6, by + bh2); g.addColorStop(0, 'rgba(255,255,255,.26)'); g.addColorStop(0.2, 'rgba(255,255,255,.05)'); g.addColorStop(0.24, 'rgba(255,255,255,.16)'); g.addColorStop(0.32, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(bx, by, bw, bh2); x.restore();
    }
    function buildStatic() {
      const mk = () => { const c = mkc(cv.width, cv.height), x = c.getContext('2d'); x.setTransform(scale, 0, 0, scale, 0, 0); return [c, x]; };
      let c, x, g; [c, x] = mk(); stA = c;
      g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c2436'); g.addColorStop(1, '#0d1118'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      g = x.createRadialGradient(480, 280, 60, 480, 280, 620); g.addColorStop(0, 'rgba(90,140,255,.2)'); g.addColorStop(1, 'rgba(90,140,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      g = x.createLinearGradient(0, CT.y, 0, CT.y + CT.h); g.addColorStop(0, 'rgba(165,205,255,.3)'); g.addColorStop(1, 'rgba(40,60,120,.5)'); x.fillStyle = g; rr(x, CT.x, CT.y, CT.w, CT.h, CT.r); x.fill();
      [c, x] = mk(); stB = c;
      // 통 앞면(볼록한 플라스틱)
      x.save(); rr(x, CT.x, CT.y, CT.w, CT.h, CT.r); x.clip();
      g = x.createLinearGradient(0, CT.y, 0, CT.y + CT.h); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(0.16, 'rgba(255,255,255,.03)'); g.addColorStop(0.8, 'rgba(0,0,30,0)'); g.addColorStop(1, 'rgba(0,0,30,.34)'); x.fillStyle = g; x.fillRect(CT.x, CT.y, CT.w, CT.h);
      g = x.createLinearGradient(CT.x, 0, CT.x + CT.w, 0); g.addColorStop(0, 'rgba(0,0,30,.3)'); g.addColorStop(0.07, 'rgba(255,255,255,.2)'); g.addColorStop(0.13, 'rgba(255,255,255,0)'); g.addColorStop(0.88, 'rgba(255,255,255,0)'); g.addColorStop(0.94, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,30,.3)'); x.fillStyle = g; x.fillRect(CT.x, CT.y, CT.w, CT.h);
      x.fillStyle = 'rgba(255,255,255,.2)'; rr(x, CT.x + 40, CT.y + 14, CT.w - 80, 12, 6); x.fill(); x.restore();
      x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; rr(x, CT.x, CT.y, CT.w, CT.h, CT.r); x.stroke(); x.strokeStyle = 'rgba(190,220,255,.2)'; x.lineWidth = 9; rr(x, CT.x + 6, CT.y + 6, CT.w - 12, CT.h - 12, CT.r - 6); x.stroke();
      sticker(x);
      // 본체(정면)
      x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 28; x.shadowOffsetY = 8; g = x.createLinearGradient(0, BODY.y, 0, BODY.y + BODY.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dde3ed'); x.fillStyle = g; rr(x, BODY.x, BODY.y, BODY.w, BODY.h, 22); x.fill(); x.restore();
      x.save(); rr(x, BODY.x, BODY.y, BODY.w, BODY.h, 22); x.clip(); x.fillStyle = '#8fdcd8'; x.fillRect(BODY.x, BODY.y, BODY.w, 26); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(BODY.x, BODY.y, BODY.w, 5); x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(BODY.x, BODY.y + 26, BODY.w, 2); x.restore();
      g = x.createLinearGradient(0, 710, 0, 740); g.addColorStop(0, '#e2e7ef'); g.addColorStop(1, '#b3bccb'); x.fillStyle = g; rr(x, BODY.x - 18, 710, BODY.w + 36, 30, 12); x.fill();
      x.fillStyle = '#eff2f7'; rr(x, 164, 488, 632, 216, 18); x.fill(); x.strokeStyle = '#d3d9e4'; x.lineWidth = 1.5; x.stroke();
      // 계기판·배출구
      x.fillStyle = '#10141b'; rr(x, LED.x, LED.y, LED.w, LED.h, 9); x.fill(); x.strokeStyle = '#5b6578'; x.lineWidth = 2; x.stroke();
      g = x.createLinearGradient(0, CH.y, 0, CH.y + CH.h); g.addColorStop(0, '#c9d1dd'); g.addColorStop(1, '#eef1f6'); x.fillStyle = g; rr(x, CH.x, CH.y, CH.w, CH.h, 18); x.fill(); x.strokeStyle = '#a9b3c3'; x.lineWidth = 1.5; x.stroke();
      g = x.createLinearGradient(0, CH.y, 0, CH.y + CH.h); g.addColorStop(0, '#05060a'); g.addColorStop(1, '#2a3040'); x.fillStyle = g; rr(x, CH.x + 10, CH.y + 10, CH.w - 20, CH.h - 20, 12); x.fill();
      // 레버 링
      x.save(); x.translate(LV.x, LV.y); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(2, 5, LV.r + 3, 0, TAU); x.fill(); x.fillStyle = '#4a63e6'; x.beginPath(); x.arc(0, 0, LV.r, 0, TAU); x.fill();
      const Ra = LV.r - 8, a1 = -Math.PI * 0.14; x.strokeStyle = '#ffd93d'; x.lineWidth = 7; x.beginPath(); x.arc(0, 0, Ra, -Math.PI * 0.9, a1 - 0.08); x.stroke();
      { const px = Ra * Math.cos(a1), py = Ra * Math.sin(a1), tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1); x.fillStyle = '#ffd93d'; x.beginPath(); x.moveTo(px + tx * 11, py + ty * 11); x.lineTo(px + nx * 9 - tx * 8, py + ny * 9 - ty * 8); x.lineTo(px - nx * 9 - tx * 8, py - ny * 9 - ty * 8); x.closePath(); x.fill(); }
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + Math.PI / 2; x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(Math.cos(a) * Ra, Math.sin(a) * Ra, 2.5, 0, TAU); x.fill(); } x.restore();
      // 투입구
      const plate = (r, t) => { g = x.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#3a4150'); g.addColorStop(1, '#232834'); x.fillStyle = g; rr(x, r.x, r.y, r.w, r.h, 10); x.fill(); x.strokeStyle = '#11141b'; x.lineWidth = 1.5; x.stroke(); x.fillStyle = '#aeb9cc'; x.font = 'bold 10.5px sans-serif'; x.textAlign = 'center'; x.fillText(t, r.x + r.w / 2, r.y + r.h - 7); };
      plate(SLOT.bill, 'TICKET'); x.fillStyle = '#8b96aa'; rr(x, SLIT.x - SLIT.w / 2 - 5, SLIT.y - 9, SLIT.w + 10, 18, 6); x.fill(); x.fillStyle = '#05060a'; rr(x, SLIT.x - SLIT.w / 2, SLIT.y - 4, SLIT.w, 8, 4); x.fill();
      if (S.doro) { plate(SLOT.coin, 'DORO'); const bx = HOLE.x, by = HOLE.y - 4, bw = DSLOT.w + 22, bh = DSLOT.h + 22; g = x.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0); g.addColorStop(0, '#6b5320'); g.addColorStop(0.5, '#ffd77a'); g.addColorStop(1, '#6b5320'); x.fillStyle = g; rr(x, bx - bw / 2, by - bh / 2, bw, bh, 10); x.fill(); x.fillStyle = '#05060a'; rr(x, bx - DSLOT.w / 2, by - DSLOT.h / 2, DSLOT.w, DSLOT.h, DSLOT.w / 2); x.fill(); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(bx + DSLOT.w / 2 - 2, by - DSLOT.h / 2 + 6, 1.5, DSLOT.h - 12); } else plate(SLOT.coin, 'JEWEL'); if (!S.doro) { const s = HOLE.s; x.drawImage(tint(IM.jw, '#6fb6ff', 128), HOLE.x - s * 0.58, HOLE.y - s * 0.58, s * 1.16, s * 1.16); x.drawImage(tint(IM.jw, '#05060a', 128), HOLE.x - s * 0.52, HOLE.y - s * 0.52, s * 1.04, s * 1.04); }
      // 바구니 뒤
      x.fillStyle = 'rgba(8,10,16,.6)'; x.fillRect(0, BK.y0, W, H - BK.y0);
      
      [c, x] = mk(); stC = c;
      
      g = x.createLinearGradient(0, BK.y0, 0, BK.y0 + 8); g.addColorStop(0, '#eef1f6'); g.addColorStop(1, '#8e98aa'); x.fillStyle = g; x.fillRect(0, BK.y0, W, 6); { const rad = clamp(15 * W / Math.max(200, cvRect().width), 12, 48), l = 3, b = H - 3; x.strokeStyle = '#aab3c2'; x.lineWidth = 6; x.lineJoin = 'round'; x.beginPath(); x.moveTo(l, BK.y0); x.lineTo(l, b - rad); x.arcTo(l, b, l + rad, b, rad); x.lineTo(W - l - rad, b); x.arcTo(W - l, b, W - l, b - rad, rad); x.lineTo(W - l, BK.y0); x.stroke(); }
      stD = mkc(cv.width, cv.height); dirty = false;
    }
    function resize() { const r = cvRect(), d = Math.min(1.5, window.devicePixelRatio || 1); const w = Math.max(320, Math.round(r.width * d)); if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * H / W); } scale = cv.width / W; dirty = true; txs = clamp(800 / Math.max(1, r.width), 1, 2.4); rightEl.style.height = rightEl.offsetParent ? leftEl.offsetHeight + 'px' : ''; pileResize(); uiTray(); gDirty = true; }
    function drawBodyAny(c, b) { let x = b.x, y = b.y, a = b.a; const g = S.grab; if (g && g.b === b && !g.moved) { x += rnd(-1.8, 1.8); y += rnd(-1.8, 1.8); a += rnd(-0.08, 0.08); } if (b.kind === 'orb') { if (b.res.cm > 1) comboAura(c, x, y, OR); drawOrb(c, b.res.nk, x, y, OR, a); if (b.res.cm > 1) badge(c, x - 16, y + 20, 'C×' + b.res.cm, '#ff7a1a'); if (b.res.count > 1) badge(c, x + 14, y + 20, '×' + b.res.count); if (S.mode.tier) { const t = tierOf(b.res.nk); badge(c, x - 14, y - 20, t, TIERC[t]); } } else if (b.kind === 'chip') { if (b.res.cm > 1) comboAura(c, x, y, OR); drawChip(c, b.res.chip, x, y, a); if (b.res.cm > 1) badge(c, x, y + 22, '×' + b.res.cm, '#ff7a1a'); } else { if (b.res && b.res.cm > 1) comboAura(c, x, y, b.r); drawCap(c, look(b), x, y, b.r, a); } }
    function tkPersp(c, im, x, yFar, wFar, wNear, len, f0) { // 짧은 변부터 안쪽으로: 깊이 방향 띠로 그림
      const N = 18, iw = im.naturalWidth, ih = im.naturalHeight; for (let i = 0; i < N; i++) { const u0 = f0 + (1 - f0) * i / N, u1 = f0 + (1 - f0) * (i + 1) / N, k0 = i / N, k1 = (i + 1) / N, yd = yFar + len * k0 * (1 - f0), hd = len * (k1 - k0) * (1 - f0) + 0.6, wd = wFar + (wNear - wFar) * (k0 + k1) / 2 * (1 - f0), sx = u0 * iw, sw = (u1 - u0) * iw; if (sw <= 0) continue; c.save(); c.translate(x + wd / 2, yd); c.transform(0, hd / sw, -wd / ih, 0, 0, 0); c.drawImage(im, sx, 0, sw, ih, 0, 0, sw, ih); c.restore(); } }
    function drawIns(c, s) { if (s.k === 'doro') { /* 날아오며 옆으로 돌아 옆면이 보이게 선 뒤, 옆면 그대로 투입구 안으로 */ const im = IM.doro, D = HOLE.s, cy0 = HOLE.y - 4, TW = DSLOT.w - 2; if (s.t < 0) { c.drawImage(im, s.x - D / 2, s.y - D / 2, D, D); return; }
        const f = ease(s.t / 0.34), u = clamp((s.t - 0.34) / 0.42, 0, 1), th = ease(Math.min(1, s.t / 0.38)) * Math.PI / 2, x = s.x + (HOLE.x - s.x) * f, y = s.y + (cy0 - s.y) * f - Math.sin(f * Math.PI) * 30, fw = D * Math.cos(th), ew = TW * Math.sin(th), H2 = D * 0.92;
        c.save(); c.translate(x, y); c.globalAlpha = 1 - ease(u) * 0.85;
        if (ew > 0.5) { const ex = -(fw + ew) / 2; let g = c.createLinearGradient(ex, 0, ex + ew, 0); g.addColorStop(0, '#6b4e05'); g.addColorStop(0.45, '#ffe28a'); g.addColorStop(1, '#8a6508'); c.fillStyle = g; rr(c, ex, -H2 / 2, ew, H2, Math.min(ew / 2, 4)); c.fill(); }
        if (fw > 0.8) { c.save(); c.translate(ew / 2, 0); c.scale(Math.max(0.001, fw / D), 1); c.drawImage(im, -D / 2, -D / 2, D, D); c.restore(); }
        if (u > 0) { c.globalAlpha = Math.min(1, u * 1.5) * (1 - ease(u)); c.fillStyle = '#05060a'; c.fillRect(-(fw + ew) / 2 - 1, -H2 / 2, fw + ew + 2, H2); }
        c.restore();
        if (u > 0 && u < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,190,80,' + (1 - u) + ')'; c.lineWidth = 3; rr(c, HOLE.x - DSLOT.w / 2 - 8 - 14 * u, cy0 - DSLOT.h / 2 - 8 - 14 * u, DSLOT.w + 16 + 28 * u, DSLOT.h + 16 + 28 * u, 10); c.stroke(); c.restore(); } return; }
      const jw = s.k === 'jw', im = IM[s.k], w0 = jw ? HOLE.s : SLIT.w * 0.94 * TKR, h0 = jw ? HOLE.s : SLIT.w * 0.94;
      if (s.t < 0) { c.drawImage(im, s.x - w0 / 2, s.y - h0 / 2, w0, h0); return; }
      if (jw) { const f = ease(s.t / 0.34), u = clamp((s.t - 0.34) / 0.42, 0, 1), x = s.x + (HOLE.x - s.x) * f, y = s.y + (HOLE.y - s.y) * f - Math.sin(f * Math.PI) * 30, w = HOLE.s * (1 - 0.2 * ease(u)); c.save(); c.translate(x, y); c.rotate((1 - f) * 0.5); c.globalAlpha = 1 - u * u * u; c.drawImage(im, -w / 2, -w / 2, w, w); if (u > 0) { c.globalAlpha = u * 0.9; c.drawImage(tint(im, '#05060a', 128), -w / 2, -w / 2, w, w); } c.restore();
        if (u > 0 && u < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(120,190,255,' + (1 - u) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(HOLE.x, HOLE.y, 30 + 30 * u, 0, TAU); c.stroke(); c.restore(); } return; }
      const wS = SLIT.w * 0.94, L0 = wS * TKR; // 1) 날아와 세로로 서고 2) 눕혀지며 3) 슬릿 안쪽으로 두 번에 걸쳐 빨려 들어감
      if (s.t < 0.3) { const f = ease(s.t / 0.3), cy = SLIT.y + 20 + L0 / 2; c.save(); c.translate(s.x + (SLIT.x - s.x) * f, s.y + (cy - s.y) * f - Math.sin(f * Math.PI) * 24); c.rotate(f * Math.PI / 2); c.drawImage(im, -w0 / 2, -h0 / 2, w0, h0); c.restore(); return; }
      const p = ease((s.t - 0.3) / 0.2), u = clamp((s.t - 0.5) / 0.6, 0, 1), feed = u < 0.45 ? ease(u / 0.45) * 0.38 : 0.38 + ease((u - 0.45) / 0.55) * 0.62, len = L0 * (1 - 0.56 * p), yFar = SLIT.y + 20 * (1 - p);
      c.save(); c.beginPath(); c.rect(SLIT.x - 120, SLIT.y, 240, 260); c.clip(); c.globalAlpha = 1; tkPersp(c, im, SLIT.x, yFar, wS * (1 - 0.06 * p), wS * (1 + 0.24 * p), len, feed); c.restore();
    }
    function drawChute(c) { const hx = CH.x + 10, hy = CH.y + 10, hw = CH.w - 20, hh = CH.h - 20, Ld = S.lid; c.save(); rr(c, hx, hy, hw, hh, 12); c.clip();
      for (const b of S.cup) { if (b.res && b.res.cm > 1) comboAura(c, b.x, b.y, b.r); drawCap(c, look(b), b.x, b.y, b.r, b.a); }
      c.restore();
      // 둥근 플라스틱 뚜껑(위쪽 경첩)
      const a = Ld.a, lh = hh * (1 - 0.86 * a); c.save(); let g = c.createLinearGradient(0, hy, 0, hy + lh); g.addColorStop(0, 'rgba(235,244,255,.5)'); g.addColorStop(0.5, 'rgba(200,220,255,.2)'); g.addColorStop(1, 'rgba(235,244,255,.42)'); c.fillStyle = g; rr(c, hx - 2 - 5 * a, hy - 2, hw + 4 + 10 * a, lh + 2, Math.min(26, lh / 2)); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, hx + 12, hy + 8, hw - 50, Math.max(2, 7 * (1 - a)), 3); c.fill(); c.fillStyle = 'rgba(240,246,255,.85)'; rr(c, CH.x + CH.w / 2 - 20, hy + lh - 11, 40, 8, 4); c.fill(); c.restore();
      c.fillStyle = '#9aa5b8'; rr(c, hx + 8, hy - 5, hw - 16, 7, 3); c.fill();
      if (S.cup.length && !Ld.push && Ld.a < 0.2 && !Ld.drag) { c.globalAlpha = 0.55 + 0.45 * Math.sin(S.time * 6); c.fillStyle = '#ffd93d'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('▲ 뚜껑 올리기', CH.x + CH.w / 2, hy + hh - 16); c.globalAlpha = 1; } }
    function drawCapLid(c) { const a = S.cap; c.save(); c.translate(LIDR.x + 860 * ease(a), LIDR.y + LIDR.h - 34 * Math.sin(Math.min(1, a) * Math.PI)); c.rotate(0.08 * Math.sin(Math.min(1, a) * Math.PI)); c.translate(0, -LIDR.h); let g = c.createLinearGradient(0, 0, 0, LIDR.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d5dbe6'); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 14; c.shadowOffsetY = 5; c.fillStyle = g; rr(c, 0, 0, LIDR.w, LIDR.h, 18); c.fill(); c.shadowColor = 'transparent'; c.fillStyle = '#8fdcd8'; rr(c, 14, LIDR.h - 16, LIDR.w - 28, 8, 4); c.fill(); c.fillStyle = 'rgba(0,0,0,.08)'; rr(c, LIDR.w / 2 - 90, 12, 180, 10, 5); c.fill(); c.restore(); }
    function draw() {
      let reb = false; if (dirty) { buildStatic(); reb = true; } const c = ctx, t = S.time, L = S.lev;
      const awake = S.dome.some((b) => !b.sl);
      if (reb || awake || domeStale) { const x = stD.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(stA, 0, 0); x.setTransform(scale, 0, 0, scale, 0, 0); x.save(); rr(x, CT.x + 2, CT.y + 2, CT.w - 4, CT.h - 4, CT.r - 2); if (S.cap > 0.03) x.rect(CT.x + 12, -80, CT.w - 24, CT.y + 110); x.clip(); for (const b of S.dome) drawBodyAny(x, b); if (S.mode.black) { x.fillStyle = 'rgba(3,4,8,.93)'; x.fillRect(CT.x, CT.y, CT.w, CT.h); } x.restore(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(stB, 0, 0); domeStale = awake; }
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(stD, 0, 0); c.setTransform(scale, 0, 0, scale, 0, 0);
      drawScreen(c);
      drawCapLid(c);
      const pulse = 0.55 + 0.45 * Math.sin(t * 7);
      if (S.hl) { const r = SLOT[S.hl]; c.save(); c.shadowColor = '#ffd93d'; c.shadowBlur = 22 * pulse; c.strokeStyle = 'rgba(255,217,61,' + (0.6 + 0.4 * pulse) + ')'; c.lineWidth = 4; rr(c, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 12); c.stroke(); c.restore(); }
      c.textAlign = 'left'; c.fillStyle = '#6f7d95'; c.font = 'bold 10px sans-serif'; c.fillText('CREDIT', LED.x + 12, LED.y + 18);
      c.textAlign = 'right'; c.fillStyle = S.credN ? '#7dffb5' : '#3c5a4a'; c.font = 'bold 32px ui-monospace,Consolas,monospace'; c.save(); if (S.credN) { c.shadowColor = '#3cff9a'; c.shadowBlur = 10 + 20 * S.led; } c.fillText(String(S.credN), LED.x + LED.w - 12, LED.y + 36); c.restore();
      // 레버
      const disp = L.t - 0.072 * Math.sin(10 * L.t), k = 1.2; c.save(); c.translate(LV.x, LV.y);
      let g = c.createRadialGradient(-18, -26, 6, 0, 0, 72); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c6cedb'); c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 3; c.beginPath(); c.arc(0, 0, 57 * k, 0, TAU); c.fill(); c.shadowColor = 'transparent';
      c.rotate(disp); g = c.createLinearGradient(0, -18, 0, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b3bccb'); c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 7; c.shadowOffsetY = 3; rr(c, -53 * k, -18, 106 * k, 36, 17); c.fill(); c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(-46, -1.5, 92, 3); c.fillStyle = '#ffb21c'; c.beginPath(); c.arc(50, 0, 5, 0, TAU); c.fill(); c.restore();
      if (allowed() > 0 && !L.drag && L.auto <= 0) { c.save(); c.globalAlpha = 0.35 + 0.35 * pulse; c.strokeStyle = '#ffd93d'; c.lineWidth = 3; c.beginPath(); c.arc(LV.x, LV.y, LV.r + 5, 0, TAU); c.stroke(); c.restore(); }
      drawChute(c);
      for (const b of S.bask) if (!b.held) drawBodyAny(c, b);
      { const y0 = Math.floor(BK.y0 * scale), hh = cv.height - y0; c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(stC, 0, y0, cv.width, hh, 0, y0, cv.width, hh); c.setTransform(scale, 0, 0, scale, 0, 0); }
      for (const b of S.bask) if (b.held) drawBodyAny(c, b);
      for (const s of S.ins) { if (s.u === 1) { const px = s.k !== 'pick' && s.k !== 'norm' ? HOLE.x : SLIT.x, py = s.k !== 'pick' && s.k !== 'norm' ? HOLE.y : SLIT.y; c.save(); c.translate(px, py); c.scale(0.62, 0.62); c.translate(-px, -py); drawIns(c, s); c.restore(); } else drawIns(c, s); }
      const R = S.reveal; if (R) drawReveal(c, R);
      for (const p of S.parts) { if (p.ty === 'shard') { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.globalAlpha = Math.max(0, Math.min(1, 2.2 - p.life)); c.fillStyle = p.col; c.beginPath(); p.poly.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.stroke(); c.restore(); continue; }
        if (p.ty === 'shell') { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; c.beginPath(); if (p.top) c.arc(0, 0, p.r, Math.PI, 0); else c.arc(0, 0, p.r, 0, Math.PI); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,30,.28)'; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.28, 0, 0, TAU); c.fill(); c.restore(); }
        else if (p.ty === 'lab' && p.t > (p.big ? -0.55 : 0)) { const bt = p.big ? 4.4 : 1.8, tt = Math.max(0, p.t), sc = (p.t < 0.38 ? 0.5 + 0.7 * eout(tt / 0.2) - 0.2 * ease((tt - 0.2) / 0.18) : 1 - 0.45 * Math.min(1, (p.t - 0.38) / 0.5)) * (p.t < 0.38 ? bt : 1 + (bt - 1) * (1 - Math.min(1, (p.t - 0.38) / 0.3))), w = 40 * sc; if (IM.label.complete) c.drawImage(IM.label, p.x - w / 2, p.y - w * 0.435, w, w * 0.87); } }
      if (S.streak) { const k = S.streak, t = k.t, col = k.k === 'SR' ? '#b06bff' : '#4f9bff', sc = t < 0.18 ? 0.3 + 1.0 * (t / 0.18) : t < 0.32 ? 1.3 - 0.3 * ((t - 0.18) / 0.14) : 1 + 0.03 * Math.sin(t * 14); c.save(); c.globalAlpha = Math.max(0, Math.min(1, (3.2 - t) * 5)); c.translate(480, 330); c.scale(sc, sc); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 34; c.font = '900 ' + Math.round(96 * txs) + 'px sans-serif'; c.lineWidth = 12; c.strokeStyle = 'rgba(8,10,18,.92)'; c.strokeText(k.p + '%!!', 0, 0); c.fillStyle = col; c.fillText(k.p + '%!!', 0, 0); c.shadowBlur = 0; c.font = '800 ' + Math.round(30 * txs) + 'px sans-serif'; c.lineWidth = 7; c.strokeText(k.k + ' 10연속', 0, 78 * txs); c.fillStyle = '#fff'; c.fillText(k.k + ' 10연속', 0, 78 * txs);
        { const y = 150 * txs, ck = k.k === 'SR' ? 's' : 'b', R2 = 34 * txs; /* 보상 칩은 확률표대로(대표 아이콘만 표시) */ c.font = '800 ' + Math.round(34 * txs) + 'px sans-serif'; c.textAlign = 'right'; c.lineWidth = 7; c.strokeText('보상:', -8 * txs, y); c.fillStyle = '#fff'; c.fillText('보상:', -8 * txs, y);
          const sp = chipSprite(ck); c.drawImage(sp.c, 6 * txs, y - R2, R2 * 2, R2 * 2); c.textAlign = 'left'; c.lineWidth = 7; c.strokeText(ck === 's' ? '실버칩' : 'DORO칩', R2 * 2 + 16 * txs, y); c.fillStyle = ck === 's' ? '#e3e8ef' : '#ffc45a'; c.fillText(ck === 's' ? '실버칩' : 'DORO칩', R2 * 2 + 16 * txs, y); }
        c.restore(); c.textBaseline = 'alphabetic'; }
      if (S.msg) { const mh = 32 * txs; c.font = 'bold ' + Math.round(14 * txs) + 'px sans-serif'; const w = c.measureText(S.msg.t).width + 28; c.globalAlpha = Math.min(1, S.msg.life * 2); c.fillStyle = 'rgba(12,16,26,.92)'; rr(c, 480 - w / 2, 760 - mh / 2, w, mh, mh / 2); c.fill(); c.strokeStyle = '#ffb21c'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(S.msg.t, 480, 761); c.textBaseline = 'alphabetic'; c.globalAlpha = 1; }
      c.save(); c.globalCompositeOperation = 'lighter'; for (const p of S.parts) if (p.ty === 'spark') { c.globalAlpha = 1 - p.life / p.max; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (1 - 0.5 * p.life / p.max), 0, TAU); c.fill(); } c.restore();
      if (S.flash > 0) { c.fillStyle = 'rgba(255,250,220,' + (S.flash * 0.92) + ')'; c.fillRect(0, 0, W, H); }
    }
    function rays(c, R, lv, n, rot, len, alpha, wid) { c.save(); c.translate(RV.x, RV.y); c.rotate(rot); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const a = i * TAU / n, g = c.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); let c0, c1; if (lv === 3 && R.skin === 'rb') { const h = (i * 360 / n + S.time * 120) % 360; c0 = 'hsla(' + h + ',100%,68%,' + alpha + ')'; c1 = 'hsla(' + h + ',100%,68%,0)'; } else { c0 = lvCol(R, lv, alpha); c1 = lvCol(R, lv, 0); } g.addColorStop(0, c0); g.addColorStop(1, c1); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - wid) * len, Math.sin(a - wid) * len); c.lineTo(Math.cos(a + wid) * len, Math.sin(a + wid) * len); c.closePath(); c.fill(); } c.restore(); }
    function bolt(c, x0, y0, x1, y1, seg) { c.beginPath(); c.moveTo(x0, y0); for (let i = 1; i <= seg; i++) { const u = i / seg, j = i < seg ? 26 : 0; c.lineTo(x0 + (x1 - x0) * u + rnd(-j, j), y0 + (y1 - y0) * u + rnd(-j, j)); } c.stroke(); }
    function star4(c, al, sc) { // 오버스펙 고유의 십자별 빛
      if (al <= 0) return; c.save(); c.translate(RV.x, RV.y); c.globalCompositeOperation = 'lighter'; const pl = 1 + 0.06 * Math.sin(S.time * 5);
      const arm = (len, wid, a) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, len); g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(0.25, 'rgba(170,240,255,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(120,220,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -len); c.quadraticCurveTo(wid * 0.18, -wid * 0.18, wid, 0); c.quadraticCurveTo(wid * 0.18, wid * 0.18, 0, len); c.quadraticCurveTo(-wid * 0.18, wid * 0.18, -wid, 0); c.quadraticCurveTo(-wid * 0.18, -wid * 0.18, 0, -len); c.fill(); };
      c.scale(sc * pl, sc * pl); arm(560, 62, al); c.rotate(Math.PI / 2); arm(430, 54, al); c.rotate(Math.PI / 4); arm(190, 30, al * 0.6); c.rotate(Math.PI / 2); arm(190, 30, al * 0.6); c.restore(); }
    function drawReveal(c, R) {
      const t = R.t, pr = R.prog, shk = R.shake * 9 + (R.ph === 'open' ? pr * pr * 4 : 0), ox = rnd(-shk, shk), oy = rnd(-shk, shk);
      const dim = R.ph === 'in' ? ease(t / 0.42) : 1; c.fillStyle = 'rgba(5,7,12,' + (0.84 * dim) + ')'; c.fillRect(0, 0, W, H);
      const lv = R.shown, flick = R.fakeOn ? (Math.sin(S.time * 55) > 0 ? 1 : 0.25) : 1;
      if (R.ph === 'in') { const m = ease(t / 0.42), x = R.x0 + (RV.x - R.x0) * m, y = R.y0 + (RV.y - R.y0) * m - Math.sin(m * Math.PI) * 60, r = R.r0 + (RV.r - R.r0) * m, sp = capSprite(R.lk[0], R.lk[1], RV.r, R.lk[2]), s = (r + 3 * r / RV.r) * 2, a = R.a0 * (1 - m); c.save(); c.translate(x, y); c.rotate(a); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.rotate(-a); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); return; }
      if (R.ph === 'open' || R.ph === 'hit') {
        rays(c, R, lv, 16, S.time * 0.8, 260 + 320 * pr, (0.08 + 0.5 * pr * pr) * flick, 0.06 + 0.06 * pr); if (lv === 3) rays(c, R, 3, 9, -S.time * 1.3, 640, 0.3 * flick, 0.045); if (lv === 3 && R.skin === 'ov') star4(c, 0.9 * flick, 1);
        for (const q of R.rings) { const u = q.t / 0.7; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = lvCol(R, q.lv, 1 - u); c.lineWidth = 16 * (1 - u) + 1; c.beginPath(); c.arc(RV.x, RV.y, RV.r + 360 * eout(u), 0, TAU); c.stroke(); c.restore(); }
        const r = RV.r * (1 + 0.07 * R.punch) * (R.method === 'hold' ? 1 + 0.085 * R.grow + (R.hold ? 0.012 * Math.sin(S.time * 60) : 0) : 1), sp = capSprite(R.lk[0], R.lk[1], RV.r, R.lk[2]), s = (r + 3 * r / RV.r) * 2, x = RV.x + ox, y = RV.y + oy, glow = lvCol(R, lv, 1);
        if (R.method === 'pull') { const gap = pr * RV.r * 1.05, up = gap * 0.78, dn = gap * 0.22; { c.save(); c.globalCompositeOperation = 'lighter'; const ga = c.createRadialGradient(x, y - up / 2, r * 0.7, x, y - up / 2, r + 90 + 110 * pr); ga.addColorStop(0, lvCol(R, lv, (0.3 + 0.4 * pr) * flick)); ga.addColorStop(1, lvCol(R, lv, 0)); c.fillStyle = ga; c.beginPath(); c.arc(x, y - up / 2, r + 90 + 110 * pr, 0, TAU); c.fill(); c.restore(); }
          if (gap > 1) { const cy2 = y - up / 2 + dn / 2, R2 = r * 0.8, k2 = Math.min(1, pr * 3) * flick; c.save(); c.globalCompositeOperation = 'lighter';
            let g = c.createRadialGradient(x, cy2, 0, x, cy2, R2 + 60 + 160 * pr); g.addColorStop(0, lvCol(R, lv, 0.5 * k2)); g.addColorStop(0.4, lvCol(R, lv, 0.18 * k2)); g.addColorStop(1, lvCol(R, lv, 0)); c.fillStyle = g; c.fillRect(x - 420, cy2 - 420, 840, 840);
            c.beginPath(); c.rect(x - r - 4, y - up - 1, 2 * r + 8, gap + 2); c.clip(); g = c.createRadialGradient(x, cy2, 0, x, cy2, R2); g.addColorStop(0, 'rgba(255,255,255,' + flick + ')'); g.addColorStop(0.5, lvCol(R, lv, 0.95 * flick)); g.addColorStop(1, lvCol(R, lv, 0.3 * flick)); c.fillStyle = g; c.beginPath(); c.arc(x, cy2, R2, 0, TAU); c.fill(); c.restore(); }
          for (let h = 0; h < 2; h++) { c.save(); c.translate(x, y + (h ? dn : -up)); c.rotate(h ? 0 : Math.sin(S.time * 30) * 0.015 * pr); c.beginPath(); c.rect(-s / 2, h ? 0 : -s / 2, s, s / 2); c.clip(); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); }
        } else { c.save(); c.translate(x, y); c.shadowColor = glow; c.shadowBlur = 24 + 70 * pr; c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.shadowBlur = 0; c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = glow; c.shadowBlur = 16 + 30 * pr;
          if (R.method === 'tap') { /* 균열: 가운데가 가장 넓고 양 끝이 바늘처럼 뾰족한 틈 (꾹 눌러 열기의 틈새처럼) */
            const taper = (pts, W) => { const n = pts.length; if (n < 2) return; const P = pts.map((q) => [q[0] * r, q[1] * r]), L = [], Rr = [];
              for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = W * (pts[i][2] || 1) / 2; L.push([P[i][0] - dy / d * w, P[i][1] + dx / d * w]); Rr.push([P[i][0] + dy / d * w, P[i][1] - dx / d * w]); }
              const rim = pts[n - 1][3]; c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n - 1; i++) c.lineTo(L[i][0], L[i][1]); if (rim) { c.lineTo(L[n - 1][0], L[n - 1][1]); c.lineTo(Rr[n - 1][0], Rr[n - 1][1]); } else c.lineTo(P[n - 1][0], P[n - 1][1]); for (let i = n - 2; i >= 1; i--) c.lineTo(Rr[i][0], Rr[i][1]); c.closePath(); c.fill(); };
            c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); c.lineJoin = 'miter'; c.fillStyle = lvCol(R, lv, 0.55 * flick); for (const pts of R.cracks) taper(pts, 9 + 10 * pr); c.fillStyle = 'rgba(255,255,255,' + (0.95 * flick) + ')'; for (const pts of R.cracks) taper(pts, 3 + 4 * pr); c.restore(); }
          else { const hw = r * (0.2 + 0.8 * Math.min(1, pr * 1.6)), lens = (th) => { c.beginPath(); c.moveTo(-hw, 0); c.quadraticCurveTo(0, -th, hw, 0); c.quadraticCurveTo(0, th, -hw, 0); c.fill(); }; c.fillStyle = lvCol(R, lv, 0.45 * flick); lens(6 + 20 * pr * pr); c.fillStyle = 'rgba(255,255,255,' + ((0.45 + 0.55 * pr) * flick) + ')'; lens(1.8 + 9 * pr * pr); }
          c.restore(); }
        if (Math.random() < 0.3 + pr * 0.5) { const a2 = rnd(0, TAU), d = rnd(180, 330); S.parts.push({ ty: 'spark', x: RV.x + Math.cos(a2) * d, y: RV.y + Math.sin(a2) * d, vx: -Math.cos(a2) * d * 1.6, vy: -Math.sin(a2) * d * 1.6, g: 0, life: 0, max: 0.55, col: lvCol(R, lv, 1), size: rnd(1.5, 3.5) }); }
        c.textAlign = 'center'; c.font = 'bold ' + Math.round(15 * txs) + 'px sans-serif'; c.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.3 * Math.sin(S.time * 5)) + ')'; c.fillText(R.method === 'pull' ? '위아래로 끌어당겨 열기' : R.method === 'hold' ? (R.hold ? '계속 누르고 계세요…' : '꾹 눌러서 열기') : R.method === 'tap' ? '탭해서 깨트리기  ' + Math.min(R.taps, TAPN) + ' / ' + TAPN : (R.t > 1 && !S.auto ? '클릭하면 바로 개봉' : ''), RV.x, RV.y + RV.r + 150);
        if (R.ph === 'hit') { c.fillStyle = 'rgba(255,255,255,' + (0.5 + 4 * t) + ')'; c.fillRect(0, 0, W, H); }
        return; }
      // 결과
      const gl = 1 - ease(t / 1.7); rays(c, R, R.T, 16, S.time * 0.35, R.T >= 2 ? 520 : 320, (R.T >= 2 ? 0.16 + 0.5 * gl : 0.3 * gl), 0.09); if (R.T === 3) rays(c, R, 3, 8, -S.time * 0.5, 700, 0.14 + 0.3 * gl, 0.04);
      if (t < 0.7) { const u = t / 0.7; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = lvCol(R, R.T, 1 - u); c.lineWidth = 14 * (1 - u) + 1; c.beginPath(); c.arc(RV.x, RV.y, RV.r + 420 * eout(u), 0, TAU); c.stroke(); c.restore(); }
      if (R.kind !== 'SSR') { const a = 1 - ease((t - 0.6) / 0.4); c.globalAlpha = a; c.textAlign = 'center'; c.font = '900 64px sans-serif'; c.fillStyle = LVC[R.T]; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(R.kind, RV.x, RV.y - 86); c.fillText(R.kind, RV.x, RV.y - 86); c.font = 'bold ' + Math.round(18 * txs) + 'px sans-serif'; c.fillStyle = '#fff'; c.fillText('바디라벨 +' + LABEL[R.kind], RV.x, RV.y + 96); c.globalAlpha = 1; return; }
      if (R.ovr && t > 0.3) { const u = t - 0.3; star4(c, 0.95 * ease(u / 0.25), 1 + 0.5 * (1 - ease(u / 0.6)));
        if (!R.bz || S.time - R.bzT > 0.09) { R.bzT = S.time; R.bz = []; const n = u < 1.3 ? 3 : (Math.random() < 0.2 ? 1 : 0); for (let k = 0; k < n; k++) { const a = rnd(0, TAU), len = rnd(250, 430), ca = Math.cos(a), sa = Math.sin(a), pts = []; for (let i = 0; i <= 9; i++) { const v = i / 9, j = Math.sin(v * Math.PI) * rnd(-22, 22); pts.push([RV.x + ca * (RV.r + len * v) - sa * j, RV.y + sa * (RV.r + len * v) + ca * j]); } R.bz.push(pts); const m = pts[4], a2 = a + rnd(-0.7, 0.7), br = [m]; for (let i = 1; i <= 4; i++) br.push([m[0] + Math.cos(a2) * i * 26 + rnd(-8, 8), m[1] + Math.sin(a2) * i * 26 + rnd(-8, 8)]); R.bz.push(br); } }
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round'; const fd = 1 - (S.time - R.bzT) / 0.09 * 0.6; for (const pts of R.bz) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.strokeStyle = 'rgba(120,225,255,' + 0.28 * fd + ')'; c.lineWidth = 7; c.stroke(); c.strokeStyle = 'rgba(235,252,255,' + 0.95 * fd + ')'; c.lineWidth = 1.6; c.stroke(); } c.restore(); }
      if (!R.hide) { const pop = t < 0.45 ? 0.55 + 0.45 * (1 - Math.pow(1 - t / 0.45, 3)) * (1 + 0.25 * Math.sin(t / 0.45 * Math.PI)) : 1, bob = Math.sin(S.time * 2.2) * 5, r = RV.r * pop;
        c.save(); c.shadowColor = R.pu ? '#ff9af0' : R.ovr ? '#7fe9ff' : '#ffd24d'; c.shadowBlur = 40 + 60 * gl; drawOrb(c, R.nk, RV.x + ox, RV.y + bob + oy, r, 0); c.restore();
        if (gl > 0.01) { const g = c.createRadialGradient(RV.x, RV.y + bob, 0, RV.x, RV.y + bob, r + 30 * gl); g.addColorStop(0, 'rgba(255,253,235,' + Math.min(1, gl * 1.25) + ')'); g.addColorStop(0.75, 'rgba(255,224,110,' + gl + ')'); g.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(RV.x, RV.y + bob, r + 30 * gl, 0, TAU); c.fill(); } }
      const na = ease((t - 0.9) / 0.5); if (na > 0) { c.globalAlpha = na; c.textAlign = 'center'; const y = RV.y + RV.r + 62 - 10 * (1 - na);
        let nf = Math.round(Math.min(64, 40 * txs)); const sf = Math.round(Math.min(40, 22 * txs)); c.font = '900 ' + nf + 'px sans-serif'; { const mw = c.measureText(R.nk.n).width; if (mw > W * 0.9) nf = Math.floor(nf * W * 0.9 / mw); }
        c.font = '900 ' + nf + 'px sans-serif'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(R.nk.n, RV.x, y + nf * 0.2); c.fillStyle = '#fff'; c.fillText(R.nk.n, RV.x, y + nf * 0.2);
        c.font = '800 ' + sf + 'px sans-serif'; c.lineWidth = 4; c.strokeText('SSR · ' + (R.nk.c || ''), RV.x, y + nf * 0.2 + sf + 10); c.fillStyle = '#ffd24d'; c.fillText('SSR · ' + (R.nk.c || ''), RV.x, y + nf * 0.2 + sf + 10);
        const tags = []; if (R.pu) tags.push(['PICK UP!', 'hsl(' + ((S.time * 160) % 360) + ',100%,72%)']); if (R.ovr) tags.push(['OVERSPEC', '#9ff3ff']); if (R.isNew) tags.push(['NEW', '#7dffb5']); if (S.mode.tier) { const tr = tierOf(R.nk); tags.push([(S.mode.tier === 'pvp' ? 'PVP ' : 'SOLO ') + tr, TIERC[tr] || '#fff']); }
        c.font = '900 ' + Math.round(Math.min(34, 22 * Math.max(1, txs * 0.8))) + 'px sans-serif'; let tw = 0; tags.forEach((q) => { q[2] = c.measureText(q[0]).width; tw += q[2] + 22; }); let tx = RV.x - (tw - 22) / 2; c.textAlign = 'left'; tags.forEach((q) => { c.save(); c.shadowColor = q[1]; c.shadowBlur = 12; c.fillStyle = q[1]; c.fillText(q[0], tx, RV.y - RV.r - 34); c.restore(); tx += q[2] + 22; });
        c.textAlign = 'center'; c.globalAlpha = 1; }
    }

    /* ---------- 실시간 수지 ---------- */
    let gDirty = true, MC = null;
    const gctx = gcv.getContext('2d'), WT = { SSS: 8, SS: 4, S: 2, A: 1 }, tk = () => (S.val.mode === 2 ? 'pvp' : 'boss');
    const wOf = (name) => WT[TIERS[tk()][name]] || 0, avg = (L) => L.reduce((a, b) => a + b, 0) / (L.length || 1);
    function gScale() { const e = 0.01 * wOf(P.pickup.n) + 0.005 * avg(P.pil.map((n) => wOf(n.n))) + 0.025 * avg(P.std.map((n) => wOf(n.n))); return e > 0 ? 300 / e : 0; } // 티어 가치는 기댓값이 0이 되도록 맞춤
    const gain = (e, sc) => (S.val.mode ? wOf(e.n) * sc : e.pu ? PV : 0);
    function mcBuild(N) { const sc = gScale(), m = S.val.mode, pv = m ? wOf(P.pickup.n) * sc : PV, vp = P.pil.map((n) => (m ? wOf(n.n) * sc : 0)), vs = P.std.map((n) => (m ? wOf(n.n) * sc : 0));
      const RUN = 1400, K = 5, cum = new Float32Array(RUN), p10 = [0], p90 = [0], tmp = new Float32Array(RUN);
      for (let n = 1; n <= N; n++) { for (let r = 0; r < RUN; r++) { const u = Math.random() * 100; cum[r] += -300 + (u < 1 ? pv : u < 1.5 ? vp[(Math.random() * vp.length) | 0] : u < 4 ? vs[(Math.random() * vs.length) | 0] : 0); } if (n % K === 0) { tmp.set(cum); tmp.sort(); p10.push(tmp[(RUN * 0.1) | 0]); p90.push(tmp[(RUN * 0.9) | 0]); } }
      MC = { N, K, p10, p90, sc, ev: -300 + 0.01 * pv + 0.005 * avg(vp) + 0.025 * avg(vs), key: m }; }
    /* DORO MODE 수지 분포(몬테카를로): 지금 규칙(캡슐 칩·SSR 칩·라벨·10연속·COMBO·DORO TIME)을 그대로 돌려 상위·하위 10%와 평균을 구함.
       10뽑 한 묶음에 걸리는 게임 시간은 DM_T초(2배속 AUTO, 개봉 중 시간 정지 기준 측정값) */
    const DM_T = 2.3; let DMC = null;
    function dmcBuild(N) {
      const K = Math.max(1, Math.round(N / 100)), M = Math.floor(N / K), RUNS = Math.max(300, Math.min(1000, Math.floor(1.5e6 / N))), cols = Array.from({ length: M + 1 }, () => new Float64Array(RUNS));
      const groups = [[0.01, [P.pickup]], [0.005, P.pil], [0.025, P.std]].map(([p, L]) => [p, L.map(tierGrp)]), VAL = [1, 5, 10, 0];
      const roll = (key, fv) => { const p = fv ? fevP(CHIP_P[key]) : CHIP_P[key]; let u = Math.random() * 100; for (let i = 0; i < 4; i++) { u -= p[i]; if (u < 0) return i; } return 0; };
      for (let r = 0; r < RUNS; r++) {
        let bal = 0, t = 0, mul = 0, end = -1, top = 0, lab = 0, fend = -1, pulls = 0;
        while (pulls < N) {
          const fv = t < fend, m = t < end ? mul : 1; let nS = 0, nR = 0, nSR = 0, rb = 0;
          for (let q = 0; q < 10 && pulls < N; q++) {
            pulls++; bal -= 1; const u = Math.random();
            if (u < 0.04) { nS++; let uu = Math.random() * 0.04; for (const [p, L] of groups) { if ((uu -= p) < 0) { const k = roll(L[(Math.random() * L.length) | 0], fv); if (k === 3) rb++; else bal += VAL[k] * m; break; } } }
            else if (u < 0.47) { nSR++; lab += 200; if (Math.random() * 100 < CAP_RATE.SR * (fv ? 2 : 1)) { const k = roll('capSR', fv); if (k === 3) rb++; else bal += VAL[k] * m; } }
            else { nR++; lab += 150; if (Math.random() * 100 < CAP_RATE.R * (fv ? 2 : 1)) { const k = roll('capR', fv); if (k === 3) rb++; else bal += VAL[k] * m; } }
            while (lab >= 10000) { lab -= 10000; bal += m; }
            if (pulls % K === 0) cols[pulls / K][r] = bal;
          }
          if (nR === 10) { const k = roll('stkR', fv); if (k === 3) rb++; else bal += VAL[k] * m; } if (nSR === 10) { const k = roll('stkSR', fv); if (k === 3) rb++; else bal += VAL[k] * m; }
          if (rb) fend = t + FEV_MS / 1000;
          if (nS >= 2) { if (t < end) { const left = end - t; mul += nS; top = Math.max(top, nS); end = t + Math.min(left + 10 * nS, 10 * top); } else { mul = nS; top = nS; end = t + 10 * nS; } }
          t += DM_T;
        }
      }
      const p10 = [0], p90 = [0], ev = [0]; for (let i = 1; i <= M; i++) { const a = cols[i].sort(); p10.push(a[Math.floor(RUNS * 0.1)]); p90.push(a[Math.floor(RUNS * 0.9)]); let sm = 0; for (let k = 0; k < RUNS; k++) sm += a[k]; ev.push(sm / RUNS); }
      DMC = { N, K, M, p10, p90, ev };
    }
    /* DORO MODE 실시간 수지: 뽑기에 쓴 칩(-1/뽑)과 얻은 칩의 누적 · 평균과 상위·하위 10% */
    function drawDoroGraph(c, w, h) {
      const A = S.dlog || [0], n = A.length - 1, N = Math.max(100, Math.ceil(n * 1.25 / 50) * 50); if (!DMC || DMC.N < N) dmcBuild(Math.max(N, 200));
      const kN = Math.floor(N / DMC.K), X = (i) => L + (w - L - R) * i / N; let lo = 0, hi = 0; for (let i = 0; i <= kN; i++) { lo = Math.min(lo, DMC.p10[i]); hi = Math.max(hi, DMC.p90[i]); } A.forEach((a) => { lo = Math.min(lo, a); hi = Math.max(hi, a); }); const pad = (hi - lo) * 0.08 || 10; lo -= pad; hi += pad;
      const L = 40, R = 54, T = 10, B = 22, Y = (val) => T + (h - T - B) * (1 - (val - lo) / (hi - lo));
      c.font = '11px sans-serif'; c.textBaseline = 'middle'; c.strokeStyle = 'rgba(255,255,255,.07)'; c.fillStyle = '#8f9bb2'; c.lineWidth = 1;
      const st = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))), stp = (hi - lo) / st > 20 ? st * 5 : (hi - lo) / st > 8 ? st * 2 : st; c.textAlign = 'right'; for (let y = Math.ceil(lo / stp) * stp; y <= hi; y += stp) { c.beginPath(); c.moveTo(L, Y(y)); c.lineTo(w - R, Y(y)); c.stroke(); c.fillText(y === 0 ? '0' : (y > 0 ? '+' : '-') + (Math.abs(y) >= 1000 ? +(Math.abs(y) / 1000).toFixed(1) + 'k' : Math.round(Math.abs(y))), L - 6, Y(y)); }
      c.textAlign = 'center'; c.textBaseline = 'alphabetic'; for (let i = 0; i <= N; i += N / 5) c.fillText(Math.round(i) + '뽑', X(i), h - 6);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
      const band = (arr, c0, c1) => { c.beginPath(); c.moveTo(X(0), Y(0)); for (let i = 1; i <= kN; i++) c.lineTo(X(i * DMC.K), Y(arr[i])); for (let i = kN; i >= 0; i--) c.lineTo(X(i * DMC.K), Y(DMC.ev[i])); c.closePath(); const g = c.createLinearGradient(0, Y(arr[kN]), 0, Y(DMC.ev[kN])); g.addColorStop(0, c0); g.addColorStop(1, c1); c.fillStyle = g; c.fill(); };
      band(DMC.p90, 'rgba(70,225,140,.42)', 'rgba(70,225,140,.04)'); band(DMC.p10, 'rgba(255,90,100,.42)', 'rgba(255,90,100,.04)');
      const line = (arr, col, dash, lw) => { c.beginPath(); for (let i = 0; i <= kN; i++) { const x = X(i * DMC.K), y = Y(arr[i]); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.strokeStyle = col; c.lineWidth = lw || 1.2; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
      line(DMC.p90, 'rgba(70,225,140,.8)', [4, 4]); line(DMC.p10, 'rgba(255,90,100,.8)', [4, 4]); line(DMC.ev, '#e8eefc', null, 1.8);
      c.textAlign = 'left'; c.font = 'bold 11px sans-serif'; c.fillStyle = '#46e18c'; c.fillText('상위 10%', w - R + 5, Y(DMC.p90[kN]) + 4); c.fillStyle = '#ff6a72'; c.fillText('하위 10%', w - R + 5, Y(DMC.p10[kN]) + 4); c.fillStyle = '#e8eefc'; c.fillText('기댓값', w - R + 5, Y(DMC.ev[kN]) + 4);
      if (n) { const v = A[n]; c.beginPath(); c.moveTo(X(0), Y(0)); for (let i = 1; i <= n; i++) c.lineTo(X(i), Y(A[i])); c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(X(n), Y(v), 3.5, 0, TAU); c.fill(); }
    }
    function drawGraph() {
      gDirty = false; const r = gcv.getBoundingClientRect(); if (!r.width) return;
      { const sg = root.querySelector('.gm-gh .gm-seg'); if (sg) { if (!sg._h0) sg._h0 = sg.innerHTML; const want = S.doro ? '<button class="on" disabled>DORO</button>' : sg._h0; if (sg.innerHTML !== want) sg.innerHTML = want; } }
      if (S.doro) { const d = Math.min(2, window.devicePixelRatio || 1); gcv.width = Math.round(r.width * d); gcv.height = Math.round(r.height * d); const gk = r.width < 240 ? 0.7 : 1; gctx.setTransform(d * gk, 0, 0, d * gk, 0, 0); gctx.clearRect(0, 0, r.width / gk, r.height / gk); drawDoroGraph(gctx, r.width / gk, r.height / gk); return; } const d = Math.min(2, window.devicePixelRatio || 1); gcv.width = Math.round(r.width * d); gcv.height = Math.round(r.height * d); const gk = r.width < 240 ? 0.7 : 1, c = gctx, w = r.width / gk, h = r.height / gk; c.setTransform(d * gk, 0, 0, d * gk, 0, 0); c.clearRect(0, 0, w, h);
      const n = S.log.length, N = Math.max(100, Math.ceil(n * 1.25 / 50) * 50); if (!MC || MC.N < N || MC.key !== S.val.mode) mcBuild(Math.max(N, 200));
      const gs = {}; S.gl.forEach((e) => { (gs[e.at] = gs[e.at] || []).push(e); }); const act = [0]; let v = 0; for (let i = 1; i <= n; i++) { v -= 300; (gs[i] || []).forEach((e) => { v += gain(e, MC.sc); }); act.push(v); }
      const kN = Math.floor(N / MC.K); let lo = 0, hi = 0; for (let i = 0; i <= kN; i++) { lo = Math.min(lo, MC.p10[i]); hi = Math.max(hi, MC.p90[i]); } act.forEach((a) => { lo = Math.min(lo, a); hi = Math.max(hi, a); }); const pad = (hi - lo) * 0.08 || 1000; lo -= pad; hi += pad;
      const L = 40, R = 54, T = 10, B = 22, X = (i) => L + (w - L - R) * i / N, Y = (val) => T + (h - T - B) * (1 - (val - lo) / (hi - lo));
      c.font = '11px sans-serif'; c.textBaseline = 'middle'; c.strokeStyle = 'rgba(255,255,255,.07)'; c.fillStyle = '#8f9bb2'; c.lineWidth = 1;
      const st = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))), stp = (hi - lo) / st > 20 ? st * 5 : (hi - lo) / st > 8 ? st * 2 : st; c.textAlign = 'right'; for (let y = Math.ceil(lo / stp) * stp; y <= hi; y += stp) { c.beginPath(); c.moveTo(L, Y(y)); c.lineTo(w - R, Y(y)); c.stroke(); c.fillText(y === 0 ? '0' : (y > 0 ? '+' : '-') + (Math.abs(y) >= 1000 ? +(Math.abs(y) / 1000).toFixed(1) + 'k' : Math.round(Math.abs(y))), L - 6, Y(y)); }
      c.textAlign = 'center'; c.textBaseline = 'alphabetic'; for (let i = 0; i <= N; i += N / 5) c.fillText(Math.round(i) + (gk < 1 ? '' : '뽑'), X(i), h - 6);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
      const band = (arr, c0, c1) => { c.beginPath(); c.moveTo(X(0), Y(0)); for (let i = 1; i <= kN; i++) c.lineTo(X(i * MC.K), Y(arr[i])); for (let i = kN; i >= 0; i--) c.lineTo(X(i * MC.K), Y(MC.ev * i * MC.K)); c.closePath(); const g = c.createLinearGradient(0, Y(arr[kN]), 0, Y(MC.ev * N)); g.addColorStop(0, c0); g.addColorStop(1, c1); c.fillStyle = g; c.fill(); };
      band(MC.p90, 'rgba(70,225,140,.42)', 'rgba(70,225,140,.04)'); band(MC.p10, 'rgba(255,90,100,.42)', 'rgba(255,90,100,.04)');
      const line = (f, col, dash, lw) => { c.beginPath(); for (let i = 0; i <= kN; i++) { const x = X(i * MC.K), y = Y(f(i)); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.strokeStyle = col; c.lineWidth = lw || 1.2; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
      line((i) => MC.p90[i], 'rgba(70,225,140,.8)', [4, 4]); line((i) => MC.p10[i], 'rgba(255,90,100,.8)', [4, 4]); line((i) => MC.ev * i * MC.K, '#e8eefc', null, 1.8);
      c.textAlign = 'left'; c.font = 'bold 11px sans-serif'; c.fillStyle = '#46e18c'; c.fillText('상위 10%', w - R + 5, Y(MC.p90[kN]) + 4); c.fillStyle = '#ff6a72'; c.fillText('하위 10%', w - R + 5, Y(MC.p10[kN]) + 4); c.fillStyle = '#e8eefc'; c.fillText('기댓값', w - R + 5, Y(MC.ev * N) + 4);
      if (n) { c.beginPath(); c.moveTo(X(0), Y(0)); for (let i = 1; i <= n; i++) { c.lineTo(X(i), Y(act[i - 1])); c.lineTo(X(i), Y(act[i])); } c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.stroke();
        S.gl.forEach((e) => { if (e.at > n) return; const x = X(e.at), y = Y(act[e.at]); if (e.pu) { c.fillStyle = '#fff'; c.strokeStyle = '#ff7ad9'; c.lineWidth = 2; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? 4 : 9; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fill(); c.stroke(); } else if (S.val.mode) { const t = TIERS[tk()][e.n] || '-'; c.font = '900 11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#0c1019'; c.strokeText(t, x, y - 6); c.fillStyle = TIERC[t] || '#9aa5b8'; c.fillText(t, x, y - 6); } });
        c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(X(n), Y(v), 3.5, 0, TAU); c.fill(); }
      root.querySelectorAll('.gm-gh [data-v]').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.val.mode)); }
    root.querySelector('.gm-gh').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { S.val.mode = +b.dataset.v; gDirty = true; uiTray(); } });

    /* ---------- 루프 ---------- */
    let lastT = 0, raf = 0;
    function frame(ts) { raf = requestAnimationFrame(frame); if (!root.isConnected) { cancelAnimationFrame(raf); return; } if (!cv.offsetParent) { lastT = ts; return; } const dt = Math.min(0.034, (ts - lastT) / 1000 || 0.016); lastT = ts; const want = Math.round(cvRect().width * Math.min(1.5, window.devicePixelRatio || 1)); if (Math.abs(want - cv.width) > 2) resize(); if (S.paused || S.cut || S.stk) { if (S.peek || dirty) draw(); return; } if (S.doro) S.auto = 2; for (let k = 0; k < (S.auto || 1); k++) { update(dt); if (S.doro && !S.dmOut && !S.reveal && !S.pops.length) DCLK.v += dt * 500; /* 개봉 중에는 COMBO·DORO TIME 정지 */ } if (S.doro && ts - DCLK.saved > 2000) { DCLK.saved = ts; lss('dsgm-dclk', String(Math.round(DCLK.v))); } dmTick(); draw(); drawPile(); if (gDirty) drawGraph(); }
    window.addEventListener('resize', () => { resize(); gDirty = true; });
    trayLoad(); domeInit(); uiWal(); uiOpt(); uiStat(); uiTray(); uiLab(); resize(); requestAnimationFrame(resize); pileSync(); for (let k = 0; k < 500; k++) step(S.pile, 1 / 120, wallsPile);
    raf = requestAnimationFrame(frame);
    return { state: S, streak, retier() { try { uiTray(); } catch (e) { /* 무시 */ } gDirty = true; }, sync() { resize(); pileSync(); uiWal(); gDirty = true; }, pools: P, body, insert, pull, update, draw, popStart, startReveal, endReveal, trayAdd, orbBody, refill, setMode, credit, setStock(s) { Object.assign(S.stock, s); pileSync(); uiWal(); } };
  }
  function mountMulti(root, list) { // 여러 픽업 머신: 위젯 안에서 옆으로 이어 붙음. 빈 곳을 좌우로 끌어 이동
    css(); root.innerHTML = '<div class="gm-multi"><div class="gm-slides"></div><div class="gm-play"><button aria-label="전체화면으로 플레이"><svg viewBox="0 0 24 24" width="54" height="54" fill="currentColor"><path d="M8 5.2v13.6a1 1 0 001.5.86l11-6.8a1 1 0 000-1.72l-11-6.8A1 1 0 008 5.2z"/></svg></button></div></div>';
    const mm = root.firstChild, slides = mm.querySelector('.gm-slides'); let cur = 0, drag = null, busy = false;
    const lazy0 = 0; const setFs = (on) => { mm.classList.toggle('fs', on); document.documentElement.classList.toggle('gm-lock', on); const sy = () => M.forEach((x) => x.inst && x.inst.sync()); sy(); setTimeout(sy, 350); };
    const fs = () => { const on = !mm.classList.contains('fs'); if (on) { setFs(true); if (mm.requestFullscreen) { try { const p = mm.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 미지원: 화면 채우기로 대체 */ } } } else { if (document.fullscreenElement) document.exitFullscreen(); setFs(false); } };
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && mm.classList.contains('fs')) setFs(false); });
    mm.querySelector('.gm-play button').addEventListener('click', fs);
    const nav = (e) => { if (M.length < 2 || drag || busy) return; rest(); drag = { x: e.clientX, d: 0, nb: -1, moved: false }; };
    const M = list.map((o) => { const el = document.createElement('div'); el.className = 'gm-slide'; slides.appendChild(el); o.multi = true; o.nav = nav; o.fs = fs; return { el, o, inst: null, left: null, dots: null }; });
    function build(x) { if (x.inst) return; x.inst = mount(x.el, x.o); x.left = x.el.querySelector('.gm-left'); x.dots = document.createElement('div'); x.dots.className = 'gm-dots'; x.left.appendChild(x.dots); x.inst.state.paused = x !== M[cur]; x.el.classList.toggle('cur', x === M[cur]); fillDots(); place(0, -1, false); }
    function fillDots() { M.forEach((x) => { if (x.dots) x.dots.innerHTML = M.length > 1 ? M.map((q, j) => '<i data-gmgo="' + j + '" title="' + (q.o.title || '') + '"' + (M[j] === M[cur] ? ' class="on"' : '') + '></i>').join('') : ''; }); }
    const rest = () => M.forEach(build); let idleT = 0;
    function place(d, nb, anim) { const c = M[cur], w = c.left.offsetWidth, tr = anim ? 'transform .26s cubic-bezier(.2,.8,.2,1),clip-path .26s cubic-bezier(.2,.8,.2,1)' : '';
      M.forEach((x, k) => { if (!x.inst) return; const pk = k === nb; x.el.classList.toggle('peek', pk); x.inst.state.peek = pk; x.left.style.transition = tr; if (k !== cur && !pk) { x.left.style.transform = ''; x.left.style.clipPath = ''; } });
      c.left.style.transform = d ? 'translateX(' + d + 'px)' : ''; c.left.style.clipPath = d || anim ? (d < 0 ? 'inset(0 0 0 ' + -d + 'px)' : 'inset(0 ' + d + 'px 0 0)') : '';
      if (nb >= 0) { const n = M[nb], dir = nb > cur ? 1 : -1; n.left.style.transform = 'translateX(' + (dir * w + d) + 'px)'; n.left.style.clipPath = dir > 0 ? 'inset(0 ' + Math.max(0, w + d) + 'px 0 0)' : 'inset(0 0 0 ' + Math.max(0, w - d) + 'px)'; } }
    function show(i) { cur = Math.max(0, Math.min(M.length - 1, i)); build(M[cur]); M.forEach((x, k) => { x.el.classList.toggle('cur', k === cur); if (!x.inst) return; x.inst.state.paused = k !== cur; x.dots.innerHTML = M.length > 1 ? M.map((q, j) => '<i data-gmgo="' + j + '" title="' + (q.o.title || '') + '"' + (j === cur ? ' class="on"' : '') + '></i>').join('') : ''; }); place(0, -1, false); M[cur].inst.sync(); }
    function go(nb) { rest(); if (busy || nb === cur || nb < 0 || nb >= M.length) return; busy = true; const w = M[cur].left.offsetWidth, dir = nb > cur ? 1 : -1; if (!drag) place(-dir * 1, nb, false); void M[cur].left.offsetWidth; place(-dir * w, nb, true); setTimeout(() => { busy = false; show(nb); }, 270); }
    window.addEventListener('pointermove', (e) => { const g = drag; if (!g) return; let d = e.clientX - g.x; if (!g.moved) { if (Math.abs(d) < 10) return; g.moved = true; } let nb = cur + (d < 0 ? 1 : -1); if (nb < 0 || nb >= M.length) { nb = -1; d *= 0.25; } g.d = d; g.nb = nb; place(d, nb, false); });
    const end = () => { const g = drag; if (!g) return; drag = null; if (!g.moved) return; const w = M[cur].left.offsetWidth; if (g.nb >= 0 && Math.abs(g.d) > Math.min(110, w * 0.2)) { drag = g; go(g.nb); drag = null; } else { place(0, g.nb, true); busy = true; setTimeout(() => { busy = false; place(0, -1, false); }, 270); } };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    slides.addEventListener('click', (e) => { const g = e.target.closest('[data-gmgo]'); if (g) { e.stopPropagation(); go(+g.dataset.gmgo); } });
    show(0); const idle = window.requestIdleCallback || ((f) => setTimeout(f, 900)); idle(() => setTimeout(rest, 400), { timeout: 2500 }); return { M, show, go, fs };
  }
  window.DoroGacha = { mount, mountMulti };
})();
