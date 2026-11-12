/* DOROSYNC 가챠 머신 v3 — 독립 모듈. DoroGacha.mount(root, {assets, pools, stock, tiers}) */
(function () {
  'use strict';
  const GM_ALL = []; /* 열린 가챠 머신들(보관함 확인용) */
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
.gm-jw{display:flex;align-items:center;gap:6px;font-size:34px;line-height:1.15;color:#5aa9ff;font-weight:800;font-variant-numeric:tabular-nums}
.gm-jw img{height:28px;filter:drop-shadow(0 0 6px rgba(90,169,255,.5))}
.gm-chips{display:flex;gap:8px;margin-top:4px}
.gm-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(10,14,22,.62);border:1px solid rgba(255,255,255,.14);padding:1px 8px 1px 4px;border-radius:8px;font-weight:700;font-size:13.5px;font-variant-numeric:tabular-nums}
.gm-chip img{height:20px}
.gm-pulls{margin-top:6px;font-weight:700;font-size:13.5px}
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
.gm-spc{position:relative;aspect-ratio:1;perspective:340px}.gm-spc .gm-orb{inset:4%}
.gm-spn{font-size:12px;color:#9eaac0;min-height:16px}.gm-skip{position:absolute;right:10px;top:10px;display:inline-flex;align-items:center;gap:5px;font-weight:800;letter-spacing:.04em}.gm-odds{position:absolute;z-index:8;top:44px;right:8px;left:8px;padding:10px 12px;border-radius:14px;background:rgba(12,16,26,.97);border:1px solid rgba(240,160,32,.5);box-shadow:0 10px 30px rgba(0,0,0,.6);color:#e9edf5;font-size:12px}
.gm-oddh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.gm-odds table{width:100%;border-collapse:collapse}.gm-odds th,.gm-odds td{padding:4px 3px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07);font-variant-numeric:tabular-nums}
.gm-odds tbody th{text-align:left;font-weight:700;white-space:nowrap}.gm-odds th small{display:block;font-weight:400;opacity:.6;font-size:10px}.gm-odds thead th{text-align:right}.gm-odds thead th svg{display:inline-block}.gm-odds td.z{opacity:.35}.gm-odds p{margin:8px 0 0;opacity:.7;font-size:11px;line-height:1.5}.gm-flipall{white-space:nowrap}
.gm-chipbal{display:inline-flex;align-items:center;gap:5px;padding:3px 10px 3px 5px;border-radius:999px;background:rgba(10,14,22,.75);border:1px solid rgba(240,160,32,.55);font-size:13.5px;font-variant-numeric:tabular-nums;color:#ffd58a}
.gm-chipbal b{display:inline-block;transition:transform .1s}.gm-chipbal svg{display:block}.gm-cbr{display:inline-flex;align-items:center;gap:4px;margin-left:6px;color:#e6d9ff}.gm-cbr[hidden]{display:none}
.gm-chipbal.bump{animation:gmBal .16s ease-out}.gm-chipbal.bump .gm-cbn,.gm-cbr.bump b{transform:scale(1.28);color:#fff}
@keyframes gmBal{0%{box-shadow:0 0 0 0 rgba(255,190,70,.9)}100%{box-shadow:0 0 0 7px rgba(255,190,70,0)}}
.gm-chipfly{position:fixed;z-index:9999;pointer-events:none;will-change:transform}.gm-chipfly svg{display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.gm-pan{display:grid;grid-template-columns:repeat(var(--cols,4),1fr);align-content:start;flex:1 1 0;min-height:0;overflow-y:auto;gap:8px;padding:10px;border-radius:12px;background:#15171c;box-shadow:inset 0 2px 8px rgba(0,0,0,.7)}
.gm-well{position:relative;perspective:340px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 35%,#0c0d10 0%,#1d2027 70%,#30343e 100%);box-shadow:inset 0 5px 9px rgba(0,0,0,.85),0 1px 0 rgba(255,255,255,.1)}
.gm-well.over{box-shadow:inset 0 5px 9px rgba(0,0,0,.85),0 0 0 3px var(--gold)}
.gm-cf,.gm-float.orb{background:center/cover no-repeat,radial-gradient(circle at 50% 30%,#fff6d8,#d9b35a)}
.gm-orb{position:absolute;inset:5%;border-radius:50%;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.4,0,.3,1.2);cursor:pointer;touch-action:none}.gm-orb.pop{animation:gmIn .35s cubic-bezier(.2,1.6,.4,1)}
.gm-orb.under{top:11%;bottom:-1%;cursor:default}.gm-orb.under .gm-cf{filter:brightness(.62)}.gm-orb.lift{top:0;bottom:10%}.gm-orb.lift .gm-cf{box-shadow:0 0 0 2.5px var(--gold),0 7px 10px rgba(0,0,0,.7)}
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
.gm-cf{transform:translateZ(1.2px);box-shadow:0 0 0 2.5px var(--gold),0 3px 8px rgba(0,0,0,.6)}
.gm-cb{transform:rotateY(180deg) translateZ(1.2px);display:grid;place-items:center}.gm-cb svg{width:108%;height:108%;flex:none}
.gm-ce{position:absolute;inset:-1px;border-radius:50%;background:linear-gradient(90deg,#6d727a,#e4e7ec 30%,#9ea4ad 55%,#f1f3f6 75%,#70757d);box-shadow:0 0 0 1px #5d6168}
.gm-ce:nth-child(1){transform:translateZ(-1px)}.gm-ce:nth-child(2){transform:translateZ(-.5px)}.gm-ce:nth-child(3){transform:translateZ(0)}.gm-ce:nth-child(4){transform:translateZ(.5px)}.gm-ce:nth-child(5){transform:translateZ(1px)}
.gm-orb.pu .gm-cf{box-shadow:0 0 0 2.5px #fff,0 0 12px 3px #ff7ad9,0 3px 8px rgba(0,0,0,.6)}
.gm-cf::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.55),rgba(255,255,255,0) 38%)}
.gm-orb i,.gm-float.orb i{position:absolute;right:-7px;bottom:-4px;z-index:2;font-style:normal;font-size:12px;font-weight:800;background:#11141b;border:1px solid #ffc21a;color:#ffc21a;border-radius:9px;padding:0 6px;white-space:nowrap}
.gm-orb u{position:absolute;left:-6px;top:-4px;z-index:2;text-decoration:none;font-size:11px;font-weight:900;background:#11141b;border-radius:8px;padding:0 5px;border:1px solid currentColor}
.gm-orb.merge{animation:gmMerge .4s}
@keyframes gmIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
@keyframes gmMerge{50%{transform:scale(1.22);filter:brightness(1.8)}}
.gm-float{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;transform:translate(-50%,-50%);filter:drop-shadow(0 8px 12px rgba(0,0,0,.55))}
.gm-float.cur{width:0;height:0}
.gm-float.cur img{position:absolute;left:0;top:0;width:var(--w);max-width:none;transform:translate(-50%,-50%) translate(calc(var(--dx)*var(--k)),calc(var(--dy)*var(--k))) rotate(var(--rt));transition:width .16s ease-out}
.gm-float.cur b{position:absolute;left:calc(var(--w)*.4);top:calc(var(--w)*.25);font-size:14px;font-weight:800;color:#fff;background:rgba(10,14,22,.85);border:1px solid rgba(255,255,255,.3);border-radius:9px;padding:1px 7px;white-space:nowrap}
.gm-float.orb{width:70px;height:70px;border-radius:50%;box-shadow:0 0 0 3px #ffc21a,0 8px 18px rgba(0,0,0,.6)}
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
.gm-mode .gm-fb{appearance:none;border:1px solid #ffc21a;background:rgba(40,30,0,.78);color:#ffd24d;border-radius:10px;padding:6px 9px;font-weight:800;cursor:pointer;font-size:12.5px}
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
.gm-multi.fs .gm-wt{padding:7px 9px}.gm-multi.fs .gm-wt small span{display:none}.gm-multi.fs .gm-jw{font-size:22px}.gm-multi.fs .gm-jw img{height:19px}.gm-multi.fs .gm-chip{font-size:12px}.gm-multi.fs .gm-pulls{font-size:11px;margin-top:3px}
.gm-multi.fs .gm-mode{right:5px;top:5px;gap:4px}.gm-multi.fs .gm-mode .gm-mg{width:30px;height:30px}.gm-multi.fs .gm-mode .gm-fb{padding:4px 6px;font-size:11px}
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
    const orbBg = (n) => 'background-image:url(' + (n.img || '') + '),radial-gradient(circle at 50% 30%,#fff6d8,#d9b35a);' + (n.tall ? 'background-size:107% auto,cover;background-position:50% 22%,center;' : '');
    const embOf = (n) => CORP[n.c] || 'pil', isOvr = (n) => !!(n.p && n.c && n.c !== '필그림'), isSSS = (n) => TIERS.boss[n.n] === 'SSS', tierOf = (n) => TIERS[S.mode.tier === 'pvp' ? 'pvp' : 'boss'][n.n] || '-';
    const pimg = {}; const portrait = (n) => { if (!n.img) return null; if (!pimg[n.n]) { const i = new Image(); i.src = n.img; pimg[n.n] = i; } return pimg[n.n]; };

    root.innerHTML = '<div class="gm"><div class="gm-left"><canvas class="gm-cv"></canvas>'
      + '<div class="gm-tools">' + [['open', '개봉 방식 · 게임 모드', '<path d="M5 10.5a7 7 0 0114 0z"/><path d="M5 13.5a7 7 0 0014 0z"/>'], ['snd', '소리', '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/>'], ['reset', '초기화', '<path d="M4 12a8 8 0 0113.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 01-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>'], ['hide', '화면 정리', '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 4l16 16"/>']].map((x) => '<button class="gm-ib" data-a="' + x[0] + '" title="' + x[1] + '" aria-label="' + x[1] + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + x[2] + '</svg></button>').join('') + '</div><button class="gm-ib gm-trbtn" data-a="topen" aria-label="SSR 보관함 열기" title="SSR 보관함"><img alt="" src="' + TRICO + '"><span>0</span></button><div class="gm-pop" hidden></div><button class="gm-auto" data-a="auto">AUTO</button><button class="gm-ib gm-fs" data-a="fs" title="전체화면" aria-label="전체화면"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>'
      + '<div class="gm-hud"><div class="gm-lab"><img alt=""><b>0</b></div><button class="gm-btn" data-a="exch">라벨 교환</button></div>' + '</div>'
      + '<div class="gm-right"><div class="gm-wal"><canvas class="gm-wcv"></canvas><div class="gm-wt"></div><div class="gm-mode"></div></div><div class="gm-graph"><div class="gm-gh"><b>실시간 수지</b><span class="gm-seg"><button data-v="0">픽업</button><button data-v="1">솔레티어</button><button data-v="2">PVP티어</button></span></div><canvas class="gm-gcv"></canvas><div class="gm-stat"></div></div><div class="gm-tray"><div class="gm-trh">SSR 보관함 <span class="gm-trr">' + (/github\.io$/.test(location.hostname) ? '' : '<button class="gm-tb gm-add10" data-a="add10" title="시안 확인용: SSR 10개 추가">+10</button>') + '<button class="gm-tb gm-flipall" data-a="flipall" title="SSS를 뺀 모든 초상화를 뒤집어 바로 잔고에 넣습니다">모두 뒤집기</button><span class="gm-chipbal" data-a="odds" role="button" tabindex="0" title="도로칩 잔고 · 누르면 획득 확률">' + (window.doroChipSvg ? window.doroChipSvg('b', 18) : '') + '<b class="gm-cbn">0</b><span class="gm-cbr" hidden>' + (window.doroChipSvg ? window.doroChipSvg('r', 18) : '') + '<b>0</b></span></span><button class="gm-tb gm-trt" data-a="tfold">접기</button></span></div><div class="gm-pan"></div><div class="gm-name"></div></div></div></div>';
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
        chipPop() { tone(2400, 0.16, 'triangle', 0.22); tone(3600, 0.26, 'sine', 0.14, null, 0.03); tone(5100, 0.2, 'sine', 0.07, null, 0.05); noise(0.03, 0.3, 6500, 'highpass'); },
        chipIn(u) { if (thr('ci', 28)) return; const f = 1500 + 1700 * (u || 0); tone(f, 0.07, 'triangle', 0.13); tone(f * 1.5, 0.1, 'sine', 0.07, null, 0.01); },
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
    const look = (b) => (S.mode.random && b.kind !== 'orb') ? ['Q', '?'] : b.kind === 'SSR' ? ['SSR', S.mode.tier ? 'T' + tierOf(b.res.nk) : embOf(b.res.nk)] : [b.kind, ''];
    const rOf = (kind) => (kind === 'orb' || kind === 'chip' ? OR : (kind === 'SSR' && !S.mode.random) ? YR : CR);
    function capSprite(kind, pr, r) {
      const key = kind + pr + r; if (spr[key]) return spr[key];
      const q = r > 60 ? 2 : 2.5, s = (r + 3) * 2 * q, col = COL[kind]; let ready = true;
      const base = mkc(s, s), b = base.getContext('2d'); b.scale(q, q); b.translate(r + 3, r + 3);
      b.save(); b.beginPath(); b.arc(0, 0, r, 0, TAU); b.clip();
      b.fillStyle = col[1]; b.fillRect(-r, -r, 2 * r, 2 * r); b.fillStyle = col[0]; b.fillRect(-r, -r, 2 * r, r);
      if (kind === 'SSR') { const g = b.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffd84a'); g.addColorStop(0.5, '#ffbf12'); g.addColorStop(0.5, '#ffe37a'); g.addColorStop(1, '#fff0b0'); b.fillStyle = g; b.fillRect(-r, -r, 2 * r, 2 * r); }
      b.fillStyle = 'rgba(0,0,0,.22)'; b.fillRect(-r, -r * 0.07, 2 * r, r * 0.14); b.fillStyle = 'rgba(255,255,255,.5)'; b.fillRect(-r, -r * 0.11, 2 * r, r * 0.045);
      if (pr === '?') { b.fillStyle = 'rgba(20,24,34,.8)'; b.font = '900 ' + (r * 1.3) + 'px sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('?', 0, r * 0.06); }
      else if (pr && pr[0] === 'T') { const t = pr.slice(1); b.fillStyle = 'rgba(110,50,0,.9)'; b.font = '900 ' + (r * (t.length > 2 ? 0.74 : t.length > 1 ? 0.95 : 1.25)) + 'px sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(t, 0, r * 0.05); }
      else if (pr) { const es = r * 1.25, im = IM.emb[pr]; ready = im.complete && im.naturalWidth; b.globalAlpha = 0.78; b.drawImage(tint(im, '#7a4300', 120), -es / 2, -es / 2, es, es); b.globalAlpha = 1; }
      b.restore();
      const over = mkc(s, s), v = over.getContext('2d'); v.scale(q, q); v.translate(r + 3, r + 3);
      let g = v.createRadialGradient(0, 0, r * 0.55, 0, 0, r); g.addColorStop(0, 'rgba(0,0,40,0)'); g.addColorStop(1, 'rgba(0,0,40,.42)'); v.fillStyle = g; v.beginPath(); v.arc(0, 0, r, 0, TAU); v.fill();
      g = v.createRadialGradient(-r * 0.36, -r * 0.42, 0, -r * 0.36, -r * 0.42, r * 0.75); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); v.fillStyle = g; v.beginPath(); v.arc(0, 0, r, 0, TAU); v.fill();
      v.strokeStyle = 'rgba(0,0,0,.4)'; v.lineWidth = 1; v.beginPath(); v.arc(0, 0, r - 0.5, 0, TAU); v.stroke();
      const out = { base, over, r, q }; if (ready) spr[key] = out; return out;
    }
    function drawCap(c, lk, x, y, r, a, sc) { const sp = capSprite(lk[0], lk[1], r), s = (r + 3) * 2 * (sc || 1); c.save(); c.translate(x, y); c.save(); c.rotate(a); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.restore(); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); }
    function orbSprite(n, r) { const key = 'orb' + n.n + (n.pu ? 'p' : '') + r; if (spr[key]) return spr[key]; const q = 2, s = (r + 4) * 2 * q, c = mkc(s, s), x = c.getContext('2d'), im = portrait(n); x.scale(q, q); x.translate(r + 4, r + 4);
      x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip(); let g = x.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r * 1.1); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#d2a94e'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); const ok = im && im.complete && im.naturalWidth; if (ok) { if (im.naturalHeight > im.naturalWidth * 1.5) { const q = im.naturalWidth / 256; x.drawImage(im, 8 * q, 60 * q, 240 * q, 240 * q, -r, -r, 2 * r, 2 * r); } else x.drawImage(im, -r, -r, 2 * r, 2 * r); } else { x.fillStyle = '#6b4a00'; x.font = 'bold ' + (r * 0.8) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n.n.slice(0, 1), 0, 2); }
      g = x.createRadialGradient(0, 0, r * 0.6, 0, 0, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,30,.4)'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r);
      g = x.createRadialGradient(-r * 0.36, -r * 0.45, 0, -r * 0.36, -r * 0.45, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(0.4, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); x.restore();
      x.lineWidth = Math.max(2, r * 0.09); if (n.pu && x.createConicGradient) { const cg = x.createConicGradient(0, 0, 0); ['#ff6b6b', '#ffd93d', '#6bff95', '#5ad1ff', '#b06bff', '#ff6bd6', '#ff6b6b'].forEach((cl, i) => cg.addColorStop(i / 6, cl)); x.strokeStyle = cg; } else x.strokeStyle = isOvr(n) ? '#9ff3ff' : '#ffc21a'; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
      const out = { c, s: (r + 4) * 2 }; if (ok || !n.img) spr[key] = out; return out; }
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
      for (let it = 0; it < 3; it++) {
        for (i = 0; i < n; i++) { a = L[i]; for (j = i + 1; j < n; j++) { b = L[j]; if (a.sl && b.sl) continue; const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r; if (dx > m || dx < -m || dy > m || dy < -m) continue; const d2 = dx * dx + dy * dy; if (d2 >= m * m || d2 === 0) continue;
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
    const PSZ = { jw: { w: 26.6, h: 26.6, r: 11.2 }, pick: { w: 37.8, h: 23.3, r: 11.9 }, norm: { w: 37.8, h: 23.3, r: 11.9 } };
    function pileItem(k, x, y, u) { const sc = u === 1 ? 0.62 : 1; return { k, u: u || 10, sc, x, y, vx: rnd(-30, 30), vy: 0, r: PSZ[k].r * sc, a: rnd(-0.6, 0.6), w: rnd(-2, 2), flat: true, sl: false, st: 0, gc: false }; }
    function pileSync() { ['jw', 'pick'].forEach((k) => { const st = Math.max(0, S.stock[k]); [[10, Math.floor(st / PER[k])], [1, Math.floor((st % PER[k]) / (PER[k] / 10))]].forEach(([u, want]) => { const have = S.pile.filter((b) => b.k === k && b.u === u); while (have.length > want) { const top = have.sort((a, b) => a.y - b.y).shift(); S.pile.splice(S.pile.indexOf(top), 1); } for (let i = have.length; i < want; i++) S.pile.push(pileItem(k, rnd(30, PW - 30), -rnd(20, S.fy || 500), u)); }); }); wake(S.pile); }
    function pileResize() { const r = walEl.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); if (!r.width) return; PW = r.width; PH = r.height; wcv.width = Math.round(PW * d); wcv.height = Math.round(PH * d); wake(S.pile); }
    function drawPile() { const d = wcv.width / PW; wctx.setTransform(d, 0, 0, d, 0, 0); wctx.clearRect(0, 0, PW, PH); for (const b of S.pile) { const z = PSZ[b.k], im = IM[b.k]; if (!im.complete) continue; wctx.save(); wctx.translate(b.x, b.y); wctx.rotate(b.a); wctx.scale(b.sc || 1, b.sc || 1); if (b.mag) { wctx.shadowColor = '#ffd93d'; wctx.shadowBlur = 12; } wctx.drawImage(im, -z.w / 2, -z.h / 2, z.w, z.h); wctx.restore(); } }

    /* ---------- 뽑기 ---------- */
    const room = () => CAP - S.bask.length - S.cup.length - S.emerg.length - (S.dome.length - domeN());
    const allowed = () => (S.reveal || S.refill ? 0 : Math.max(0, Math.min(S.credN, room(), domeN())));
    function pull() { const c = S.cred[0]; if (!c) return; const b = domeTake(); if (!b) return; const res = b.res; c.n--; if (!c.n) S.cred.shift(); S.credN--;
      S.stats.n++; S.stats.gold++; if (res.kind === 'SSR') { S.stats.ssr++; if (res.nk.pu) S.stats.pu++; } S.log.push(0); res.sq = S.sq.length; S.sq.push({ k: res.kind, d: 0, a: 0 }); gDirty = true; snd.tick(); uiStat(); }
    /* 10연속 R·SR: 뽑은 순서 기준, 10개가 모두 까졌을 때 확률 고지 */
    function streak(k) { S.streak = { k, t: 0, p: +(Math.pow(k === 'SR' ? 0.43 : 0.53, 10) * 100).toPrecision(2) }; S.flash = 0.7; snd.burst(2); vib([40, 30, 40, 30, 120], true); sparks(480, 330, 70, k === 'SR' ? '#b06bff' : '#4f9bff', 700, 200); setTimeout(() => dropChip(chipRoll(k === 'SR' ? 'stkSR' : 'stkR'), rnd(BK.x0 + 200, BK.x1 - 200), BK.y0 + 40, 'streak'), 600); } /* 10연속 보상: R → 도로칩, SR → 실버칩 */
    function seqDone(res) { const q = S.sq, i = res && res.sq; if (i == null || !q[i] || q[i].d) return; q[i].d = 1; const k = q[i].k; if (k === 'SSR') return; let a = i, b = i; while (a > 0 && q[a - 1].k === k && q[a - 1].d && !q[a - 1].a) a--; while (b < q.length - 1 && q[b + 1].k === k && q[b + 1].d && !q[b + 1].a) b++; if (b - a + 1 >= 10) { for (let j = a; j < a + 10; j++) q[j].a = 1; streak(k); } }
    S.sup = { pick: 0, jw: 0, full: false, acc: 0, key: '' };
    const feedCap = () => Math.max(12, Math.floor(PW * PH * 0.8 / 490));
    function uiFeed() { const b = modeEl.querySelector('.gm-fb'); if (!b) return; const u = S.sup; b.classList.toggle('full', u.full); b.classList.toggle('run', !u.full && (u.pick > 0 || u.jw > 0)); }
    function feedTick(dt) { const u = S.sup; if (u.pick <= 0 && u.jw <= 0 && !u.full) return; const cap = feedCap(), n = S.pile.length;
      if (!u.full && n >= cap) { u.full = true; uiFeed(); return; } if (u.full) { if (n <= cap * 0.5) { u.full = false; uiFeed(); } else return; }
      u.acc += dt; if (u.acc < 0.09) return; u.acc = 0; S.fy = 50;
      ['pick', 'jw'].forEach((k) => { const d = Math.min(PER[k], u[k]); if (d > 0) { u[k] -= d; S.stock[k] += d; } }); pileSync(); S.fy = 0; snd.grab(); uiFeed(); }
    function credit(k, n) { S.cred.push({ k, n }); S.credN += n; S.led = 1; }
    function insert(k, items, x, y) { items.forEach((it, i) => { const u = it.u || 10; S.stock[k] -= PER[k] / 10 * u; const a = i * 2.4, r = i ? 10 + i * 5 : 0; S.ins.push({ k, u, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: -i * 0.3, snd: false }); }); uiWal(); }
    function say(t) { S.msg = { t, life: 2.4 }; }
    function setMode(k, v) { S.mode[k] = v; [S.dome, S.bask, S.cup].forEach((L) => L.forEach((b) => { if (b && b.kind !== 'orb') b.r = rOf(b.kind); })); wake(S.dome); wake(S.bask); domeStale = true; uiOpt(); }
    function refill() { if (S.refill) return; if (S.dome.length >= NDOME) { say('통이 이미 가득 차 있습니다.'); return; } S.refill = { t: 0, acc: 0 }; snd.lid(); }

    /* ---------- 캡슐 까기 ---------- */
    function popStart(L) { if (!L.length) return; const gap = Math.min(0.03, 2.2 / L.length); L.sort((a, b) => a.y - b.y).forEach((b, i) => { if (!b.pop) { b.pop = 1; S.pops.push({ b, t: -i * gap, hop: false }); } }); }
    function shells(x, y, r, a, col, up) { for (let h = 0; h < 2; h++) S.parts.push({ ty: 'shell', x, y, vx: (h ? 1 : -1) * rnd(120, 300), vy: rnd(-520, -300) * (up || 1), a, w: (h ? 1 : -1) * rnd(6, 14), r, col: col[h ? 1 : 0], top: !h }); }
    function popBurst(b) { const i = S.bask.indexOf(b); if (i < 0) return; S.bask.splice(i, 1); wake(S.bask); snd.pop(); const col = COL[look(b)[0]];
      shells(b.x, b.y, b.r, b.a, col); sparks(b.x, b.y, 5, COL[b.kind][0]); S.parts.push({ ty: 'lab', x: b.x, y: b.y, sx: b.x, sy: b.y, t: 0, val: LABEL[b.kind] }); capChip(b.x, b.y, b.kind); seqDone(b.res); }
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
    function orbBody(nk, count, x, y) { const b = body('orb', x, y, { nk, count: count || 1 }); S.bask.push(b); return b; }
    function endReveal(toBasket) { const R = S.reveal; if (!R) return; S.reveal = null; if (toBasket && R.nk) orbBody(R.nk, 1, RV.x + rnd(-30, 30), BK.y0 - 60).vy = 100; }
    function flyOrb(nk, count, x, y) { // 바구니 → 보관함으로 날아감
      const r = cvRect(), el = document.createElement('div'); el.className = 'gm-float orb'; el.style.cssText = 'left:' + (r.left + x * r.width / W) + 'px;top:' + (r.top + y * r.height / H) + 'px;transition:left .5s cubic-bezier(.3,.1,.2,1),top .5s cubic-bezier(.5,-.4,.3,1),transform .5s;' + orbBg(nk); (document.fullscreenElement || document.body).appendChild(el);
      let i = S.tray.findIndex((e) => e && e.nk.n === nk.n); if (i < 0) i = trayFree(); const well = panEl.children[i] || panEl.lastElementChild; let w = well.getBoundingClientRect(); const tb = leftEl.querySelector('.gm-trbtn'), tbv = tb && tb.offsetParent && !$('.gm').classList.contains('topen'); if (tbv) w = tb.getBoundingClientRect(); else if (!w.width) w = cv.getBoundingClientRect(); void el.offsetWidth; el.style.left = (w.left + w.width / 2) + 'px'; el.style.top = (w.top + w.height / 2) + 'px'; el.style.transform = 'translate(-50%,-50%) scale(' + (w.width / 78) + ')';
      setTimeout(() => { el.remove(); trayAdd(nk, count); if (tbv) { tb.classList.add('pop'); setTimeout(() => tb.classList.remove('pop'), 180); } }, 520 / (S.auto || 1)); }
    /* ---------- 도로칩 ---------- */
    const CHIP_VAL = { b: 1, s: 5, g: 10 }, CHIP_NM = { r: '무지개 도로칩', g: '골드칩', s: '실버칩', b: '도로칩' };
    const CHT = (o.chipTiers && o.chipTiers.boss) || TIERS.boss; /* 도로칩 판정은 기본 티어표 고정(유저가 바꾼 티어 무시) */
    /* 도로칩 확률표 [도로, 실버, 골드, 무지개](%) — 목표: 도로칩 1,000개당 무지개 1개 */
    const CHIP_P = {
      SSS: [2, 8, 88.2, 1.8], SS: [15, 35, 49.6, 0.4], S: [45, 45, 9.85, 0.15], low: [85, 13, 1.97, 0.03],
      capR: [90, 9, 0.98, 0.02], capSR: [80, 17, 2.95, 0.05], stkR: [75, 20, 4.95, 0.05], stkSR: [0, 75, 24.5, 0.5],
    };
    const CAP_RATE = { R: 2, SR: 3 }; /* R·SR 캡슐을 열 때 칩이 나올 확률(%) */
    const KS = ['b', 's', 'g', 'r'], tierGrp = (nk) => { const t = CHT[nk.n]; return t === 'SSS' || t === 'SS' || t === 'S' ? t : 'low'; };
    const chipRoll = (key) => { const p = CHIP_P[key], u = Math.random() * 100; let a = 0; for (let i = 0; i < 4; i++) { a += p[i]; if (u < a) return KS[i]; } return 'b'; };
    const isSSSn = (nk) => CHT[nk.n] === 'SSS', chipOf = (nk) => chipRoll(tierGrp(nk)), chipE = (en) => { if (!en.ck || en.ck === 'x') en.ck = chipOf(en.nk); return en.ck; }, chipSvg = (k, px, fx) => (window.doroChipSvg ? window.doroChipSvg(k, px, fx) : '');
    GM_ALL.push({ S });
    const balEl = $('.gm-chipbal'); let chipPend = 0, chipPendR = 0, chipSeq = 0;
    function uiBal(bump) {
      if (!balEl) return; const w = window.doroChips, o = w ? w.get() : { b: 0, s: 0, g: 0, r: 0 }, tot = o.b + o.s * 5 + o.g * 10;
      balEl.querySelector('.gm-cbn').textContent = Math.max(0, tot - chipPend).toLocaleString('ko-KR');
      const rr = balEl.querySelector('.gm-cbr'), rv = Math.max(0, o.r - chipPendR); rr.hidden = !(o.r > 0 || chipPendR > 0); rr.querySelector('b').textContent = rv.toLocaleString('ko-KR');
      if (bump) { const t = bump === 'r' ? rr : balEl; t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
    }
    window.addEventListener('dorochips', () => uiBal()); uiBal();
    /* 칩이 잔고 숫자로 빨려 들어감. 실버칩은 도로칩 5개, 골드칩은 10개로 쪼개진 뒤 들어감 */
    function chipAbsorb(k, n, cx, cy, size, src) {
      if (!window.doroChips) { say('도로칩을 불러오지 못했습니다.'); return; }
      n = n || 1; const host = document.fullscreenElement || document.body, isR = k === 'r', unit = CHIP_VAL[k] || 0, total = isR ? n : unit * n;
      if (isR) chipPendR += n; else chipPend += total;
      window.doroChips.add({ [k]: n }, src || 'ssr');
      const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
      const tbtn = leftEl.querySelector('.gm-trbtn'), toBtn = !vis(balEl) && vis(tbtn); /* 모바일처럼 보관함이 접혀 있으면 보관함 아이콘으로 */
      let br = toBtn ? vis(tbtn) : vis(balEl ? (isR ? balEl.querySelector('.gm-cbr') : balEl) : null) || vis(balEl);
      if (!br) { const r0 = root.getBoundingClientRect(); br = { left: r0.right - 60, top: r0.top + 10, width: 20, height: 20 }; }
      const tx = br.left + Math.min(14, br.width / 2), ty = br.top + br.height / 2;
      const P = Math.min(total, isR ? 12 : 60), per = total / P, split = !isR && unit > 1, ps = split ? Math.max(14, size * (unit >= 10 ? 0.42 : 0.5)) : size, rad = split ? (unit >= 10 ? Math.max(70, size * 1.7) : Math.max(50, size * 1.2)) * Math.min(1.6, 1 + (n - 1) * 0.15) : 0;
      const seq = ++chipSeq; let arrived = 0, acc = 0;
      const launch = () => {
        if (split) { try { snd.chipBurst(unit >= 10); } catch (e) { /* 무시 */ } }
        for (let i = 0; i < P; i++) {
          const d = document.createElement('div'); d.className = 'gm-chipfly'; d.innerHTML = chipSvg(isR ? 'r' : 'b', Math.round(ps), isR); d.style.left = (cx - ps / 2) + 'px'; d.style.top = (cy - ps / 2) + 'px'; host.appendChild(d);
          const a = rnd(0, TAU), rr = split ? rad * Math.sqrt(rnd(0.08, 1)) : 0, sx = Math.cos(a) * rr, sy = Math.sin(a) * rr * 0.85, ex = tx - cx, ey = ty - cy;
          const stag = split ? (unit >= 10 ? i * 22 : i * 40) : i * 60, T = split ? 980 : 720;
          const kf = split
            ? [{ transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.1,.8,.2,1)' }, { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1) rotate(' + rnd(-90, 90) + 'deg)', opacity: 1, offset: 0.36 }, { transform: 'translate(' + sx + 'px,' + (sy + 4) + 'px) scale(1) rotate(0deg)', opacity: 1, offset: 0.5, easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.35) rotate(180deg)', opacity: 0.9 }]
            : [{ transform: 'translate(0,0) scale(1)', opacity: 1, easing: 'cubic-bezier(.25,.1,.25,1)' }, { transform: 'translate(0,-10px) scale(1.06)', opacity: 1, offset: 0.22, easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.3) rotate(200deg)', opacity: 0.9 }]; /* 살짝 떠올랐다가 부드럽게 날아감 */
          const an = d.animate(kf, { duration: T, delay: stag, fill: 'both' });
          an.onfinish = () => { d.remove(); arrived++; acc += per; const v = i === P - 1 || arrived === P ? Math.round(acc) : Math.floor(acc); acc -= v; if (isR) chipPendR = Math.max(0, chipPendR - v); else chipPend = Math.max(0, chipPend - v); uiBal(isR ? 'r' : true); if (toBtn) { tbtn.classList.remove('pop'); void tbtn.offsetWidth; tbtn.classList.add('pop'); } try { snd.chipIn(arrived / P); } catch (e) { /* 무시 */ } };
        }
      };
      if (split) { /* 큰 칩이 부풀었다가 터지며 분열 */
        const big = document.createElement('div'); big.className = 'gm-chipfly'; big.innerHTML = chipSvg(k, Math.round(size), true); big.style.left = (cx - size / 2) + 'px'; big.style.top = (cy - size / 2) + 'px'; host.appendChild(big);
        const an = big.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.82)', opacity: 1, offset: 0.45 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 300, easing: 'ease-in' }); an.onfinish = () => { big.remove(); launch(); };
      } else launch();
    }
    /* SSS 초상화 뒤집기: 천천히 세워 절반 직전(옆면이 보일락 말락)에서 멈추고, 틈새로 금빛이 샘.
       그 사이 빛이 무지개로 오르면 무지개 도로칩(5%), 무지개로 올랐다가 다시 뒤집히기 직전에 금빛으로 내려오면 골드칩(가짜 연출).
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
    function stageBurst(orb, st, big) {
      if (st === 'b') return; /* 도로칩은 가장 낮은 단계라 빛나지 않음 */
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
        at(() => { setSt(path[i]); stageBurst(orb, path[i], false); try { if (up) snd.chipBurst(path[i] === 'r'); else snd.fail(); } catch (e) { /* 무시 */ } /* 내려갈 때: 캡슐 승격 실패와 같은 소리 */ }, S0 + (i - 1) * STEP);
      }
      at(() => { try { snd.flip(); } catch (e) { /* 무시 */ } }, A + H);
      const burst = () => { orb.classList.remove('glow'); STG.forEach((x) => orb.classList.remove('st-' + x)); try { snd.chipBurst(k === 'r' || k === 'g'); snd.chipPop(); } catch (e) { /* 무시 */ } stageBurst(orb, k, true); };
      at(burst, T);
      /* 연출 중 다시 누르면(1초 뒤부터): 결과 단계로 정리하고 손으로 넘기듯 바로 마지막 뒤집기로 */
      if (en) en.skip = () => {
        const cur = an.currentTime || 0; if (cur >= A + H - 60) return; en.skip = null;
        tm.forEach(clearTimeout); tm.length = 0; clearTimeout(guard); setSt(k);
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
    function drawChip(c, k, x, y, a) { const sp = chipSprite(k), s = sp.R * 2; c.save(); c.translate(x, y); c.rotate(a || 0); c.drawImage(sp.c, -s / 2, -s / 2, s, s); c.restore(); }
    /* R·SR 캡슐: 도로칩 1%, 실버칩 0.1%, 골드칩 0.01% */
    function capChip(x, y, kind) { const sr = kind === 'SR'; if (Math.random() * 100 >= CAP_RATE[sr ? 'SR' : 'R']) return; dropChip(chipRoll(sr ? 'capSR' : 'capR'), x, y, 'cap'); }
    function dropChip(k, x, y, src) { const b = body('chip', clamp(x, BK.x0 + OR, BK.x1 - OR), clamp(y, BK.y0 + OR, BK.y1 - OR), { chip: k, count: 1, src: src || 'cap' }); b.vx = rnd(-160, 160); b.vy = rnd(-620, -420); b.w = rnd(-9, 9); S.bask.push(b); wake(S.bask); sparks(b.x, b.y, k === 'b' ? 14 : 30, k === 'g' ? '#ffe27a' : k === 's' ? '#e9eef5' : '#ffc45a', 380); try { snd.chipPop(); if (k !== 'b') setTimeout(() => snd.chipPop(), 90); } catch (e) { /* 무시 */ } }
    function chipSpawn() { const b = body('chip', HUDP.x, HUDP.y - 10, { chip: 'b', count: 1, src: 'label' }); b.vx = rnd(-520, -180); b.vy = rnd(-760, -520); b.w = rnd(-9, 9); S.bask.push(b); wake(S.bask); sparks(HUDP.x, HUDP.y, 16, '#ffc45a', 360); try { snd.chipPop(); } catch (e) { /* 무시 */ } }
    function chipTake(b) { const i = S.bask.indexOf(b); if (i < 0) return; S.bask.splice(i, 1); wake(S.bask); const r = cvRect(), sc = r.width / W; chipAbsorb(b.res.chip, b.res.count, r.left + b.x * sc, r.top + b.y * sc, Math.max(22, OR * 2 * sc), b.res.src || 'cap'); }
    if (location.hostname === 'localhost') (window.__gms = window.__gms || []).push({ S, root, trayAdd: (n, c) => trayAdd(n, c), P, chipSpawn, capChip: (x, y) => capChip(x, y), streak: (k) => streak(k), uiTray: () => uiTray(), addLab: (v) => { S.lab += v; labChips(); uiLab(true); } });
    function labChips() { let n = 0; while (S.lab >= 10000 && n < 20) { S.lab -= 10000; n++; setTimeout(chipSpawn, (n - 1) * 140); } }
    /* 보관함은 빈칸을 그대로 둠(배열에 null). 끌어서 다른 니케 위에 놓으면 그 니케가 원래 칸으로 자리 바꿈 */
    const trayFree = () => { const i = S.tray.findIndex((x) => !x); return i < 0 ? S.tray.length : i; };
    function trayAdd(nk, count, at, from, ent) { const e = ent ? null : S.tray.find((x) => x && x.nk.n === nk.n && !x.top); /* 도로칩으로 뒤집힌 칸에는 쌓지 않고 새 칸 */ if (e) { e.count += count || 1; e.merge = true; snd.merge(); } else { const en = ent || { nk, count: count || 1, fresh: true };
        if (at != null && at >= 0) { const occ = S.tray[at]; if (occ) { const back = from != null && from >= 0 && !S.tray[from] ? from : trayFree(); S.tray[back] = occ; } S.tray[at] = en; } else S.tray[trayFree()] = en; snd.collect(); }
      while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); uiTray(); }

    /* ---------- UI(DOM) ---------- */
    function uiWal() { const s = S.stock, can = Math.max(0, s.pick) + Math.floor(Math.max(0, s.jw) / 300);
      wtEl.innerHTML = '<small>보유 재화<span> · 끌어서 기계에 넣기</span></small><b class="gm-jw"><img alt="" src="' + A.icons.jw + '"><span>' + fmt(s.jw) + '</span></b>'
        + '<div class="gm-chips"><span class="gm-chip" title="특뽑"><img alt="특뽑" src="' + A.icons.pick + '">' + fmt(s.pick) + '</span></div>'
        + '<div class="gm-pulls">이걸로 ' + fmt(can) + '뽑 가능해요</div>';
      modeEl.innerHTML = '<button class="gm-mg' + (S.hand ? ' on' : '') + '" data-m="t" title="자석: 한 움큼 쥐기" aria-label="자석(한 움큼 쥐기)" aria-pressed="' + S.hand + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h5v9a2 2 0 004 0V3h5v9a7 7 0 01-14 0z"/><path d="M5 7.5h5M14 7.5h5"/></svg></button><button class="gm-fb" data-feed="1">돈통</button>'; uiFeed(); }
    function uiOpt() { const m = S.mode, on = (v) => (v ? ' class="on"' : ''), p = S.pop; optEl.hidden = !p; root.querySelectorAll('.gm-ib').forEach((b) => b.classList.toggle('on', b.dataset.a === p)); if (!p) return;
      optEl.innerHTML = p === 'open' ? '<small>캡슐 표시</small><div class="gm-seg"><button data-g="corp"' + on(!m.tier) + '>기업</button><button data-g="boss"' + on(m.tier === 'boss') + '>솔레 티어</button><button data-g="pvp"' + on(m.tier === 'pvp') + '>PVP 티어</button></div><small>가리기</small><div class="gm-seg"><button data-g="random"' + on(m.random) + '>랜덤</button><button data-g="black"' + on(m.black) + '>블랙</button></div>'
        + '<small>개봉 방식</small><div class="gm-seg">' + [['mix', '랜덤'], ['pull', '당겨 열기'], ['tap', '깨트리기'], ['hold', '꾹 누르기'], ['auto', '자동']].map((x) => '<button data-op="' + x[0] + '"' + on(S.openM === x[0]) + '>' + x[1] + '</button>').join('') + '</div>'
        : '<small>도움말</small><ol class="gm-help"><li>오른쪽 상자의 재화를 끌어 기계 위에 놓기 (큰 것 10뽑 · 작은 것 1뽑)</li><li>레버 클릭 = 10연속, 드래그 = 한 칸씩</li><li>사출구 뚜껑을 위로 끌어 캡슐 꺼내기</li><li>캡슐을 눌렀다 떼면 개봉, 구슬 클릭 = 보관함</li><li>통이 비면 자동 리필</li><li>빈 곳을 옆으로 끌면 다른 픽업 머신</li></ol>'; }
    function uiStat() { const t = S.stats; statEl.innerHTML = [['뽑은 횟수', t.n], ['SSR', t.ssr + (t.pu ? ' <em>픽업 ' + t.pu + '</em>' : '')], ].map((x) => '<div><small>' + x[0] + '</small><b>' + x[1] + '</b></div>').join(''); }
    /* 보관함 한 칸: 겹친 초상화는 맨 위 한 장(top)만 들어 올려 뒤집고, 나머지는 아래에 깔림 */
    const EDGES = '<span class="gm-ce"></span><span class="gm-ce"></span><span class="gm-ce"></span><span class="gm-ce"></span><span class="gm-ce"></span>';
    function orbHtml(t, cls, badge, tr) {
      const ck = chipE(t);
      return '<div class="gm-orb' + cls + (t.nk.pu ? ' pu' : '') + (t.flip ? ' flip' : '') + '"' + (t.tilt ? ' style="--tx:' + t.tilt[0] + 'deg;--ty:' + t.tilt[1] + 'deg"' : '') + ' title="' + (t.flip ? CHIP_NM[ck] + ' · 누르면 잔고로' : t.nk.n + ' · 누르면 뒤집기') + '">' + EDGES +
        '<div class="gm-cf" style="' + orbBg(t.nk) + '">' + (tr ? '<u style="color:' + (TIERC[tr] || '#fff') + '">' + tr + '</u>' : '') + badge + '</div><div class="gm-cb">' + chipSvg(ck, 64) + '</div></div>';
    }
    function trayOrbs(e, tr) {
      const t = e.top, rest = e.count - (t ? 1 : 0);
      if (!t) { const pp = e.fresh ? ' pop' : ''; e.fresh = false; return orbHtml(e, (e.merge ? ' merge' : '') + pp, e.count > 1 ? '<i>×' + e.count + '</i>' : '', tr); }
      return (rest > 0 ? orbHtml({ nk: e.nk, ck: 'x' }, ' under', rest > 1 ? '<i>×' + rest + '</i>' : '', tr) : '') + orbHtml(t, ' top' + (rest > 0 ? ' lift' : ''), '', rest > 0 ? '' : tr);
    }
    function uiTray() { uiTray0(); S.tray.forEach((e, i) => { const t = e && e.top; if (!t || !(t.anim || t.flipping) || !t._el) return; const w = panEl.children[i], o = w && w.querySelector('.gm-orb.top'); if (o && o !== t._el) o.replaceWith(t._el); }); }
    /* SSR 보관함은 이 기기에 저장(머신별). 다시 열면 그대로 */
    const TRAY_K = 'dsgm-tray-' + String(o.title || 'std').replace(/\s+/g, '');
    const trayFind = (n) => { for (const k of Object.keys(P)) { const a = P[k]; if (Array.isArray(a)) { const x = a.find((y) => y && y.n === n); if (x) return x; } else if (a && a.n === n) return a; } return null; };
    function traySave() { try { localStorage.setItem(TRAY_K, JSON.stringify(S.tray.map((e) => (e ? [e.nk.n, e.count] : 0)))); } catch (er) { /* 무시 */ } }
    function trayLoad() { try { const a = JSON.parse(localStorage.getItem(TRAY_K) || '[]'); if (!Array.isArray(a)) return; S.tray = a.map((x) => { if (!x) return null; const nk = trayFind(x[0]); return nk ? { nk, count: Math.max(1, x[1] | 0) } : null; }); while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); } catch (er) { /* 무시 */ } }
    /* 한 칸만 다시 그림(다른 칸의 뒤집기·빛남이 끊기지 않게) */
    function renderWell(i) {
      const w = panEl.children[i]; if (!w) { uiTray(); return; }
      const e = S.tray[i], tr = e ? (TIERS[S.val.mode === 2 ? 'pvp' : 'boss'][e.nk.n] || '-') : '';
      w.innerHTML = e ? trayOrbs(e, tr) : ''; if (e) e.merge = false; traySave();
      const tb = leftEl.querySelector('.gm-trbtn span'); if (tb) tb.textContent = S.tray.filter(Boolean).length;
    }
    function uiTray0() { traySave(); const pw = panEl.clientWidth - 20, ph = panEl.clientHeight - 20, cols = pw > 60 ? Math.max(3, Math.min(12, Math.floor((pw + 8) / 62))) : 5, cell = pw > 60 ? (pw - (cols - 1) * 8) / cols : 50, n = cols * Math.max(Math.ceil((S.tray.length + 1) / cols), pw > 60 ? Math.floor((ph + 8) / (cell + 8)) : 3, 2); panEl.style.setProperty('--cols', cols); const tb = leftEl.querySelector('.gm-trbtn span'); if (tb) tb.textContent = S.tray.filter(Boolean).length; let h = ''; for (let i = 0; i < n; i++) { const e = S.tray[i], tr = e ? (TIERS[S.val.mode === 2 ? 'pvp' : 'boss'][e.nk.n] || '-') : ''; h += '<div class="gm-well" data-i="' + i + '">' + (e ? trayOrbs(e, tr) : '') + '</div>'; if (e) e.merge = false; }
      panEl.innerHTML = h;  }
    const shortN = (n) => (n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? +(n / 1e3).toFixed(1) + 'k' : fmt(n));
    function uiLab(bump) { labEl.querySelector('b').textContent = shortN(S.lab); if (bump) { labEl.classList.add('bump'); clearTimeout(uiLab.t); uiLab.t = setTimeout(() => labEl.classList.remove('bump'), 120); } }

    /* ---------- 끌기 ---------- */
    let fl = null;
    const cvRect = () => cv.getBoundingClientRect();
    const toCv = (e) => { const r = cvRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height, in: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; };
    function floatEl(cls, e) { const d = document.createElement('div'); d.className = 'gm-float ' + cls; (document.fullscreenElement || document.body).appendChild(d); d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; return d; }
    const slotPx = (k) => (k === 'jw' ? HOLE.s : SLIT.w * 0.94 * TKR) * cvRect().width / W;
    function curFloatHtml(f) { let h = ''; f.items.forEach((it, i) => { const a = i * 2.4, r = i ? 5 + i * 2.6 : 0; h += '<img alt="" src="' + SRC[f.k] + '" style="--dx:' + (Math.cos(a) * r).toFixed(1) + 'px;--dy:' + (Math.sin(a) * r).toFixed(1) + 'px;--rt:' + ((i % 2 ? 1 : -1) * Math.min(i, 5) * 4) + 'deg">'; }); f.el.innerHTML = h + '<b>' + f.items.reduce((n, it) => n + it.u, 0) + '뽑</b>'; }
    function curSize(f, big) { if (f.big === big) return; f.big = big; f.el.style.setProperty('--w', (big ? slotPx(f.k) : PSZ[f.k].w) * (f.items[0].sc || 1) + 'px'); f.el.style.setProperty('--k', big ? 2 : 1); S.hl = big ? (f.k === 'jw' ? 'coin' : 'bill') : null; }
    wcv.addEventListener('pointerdown', (e) => { const r = wcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let hit = null; for (let i = S.pile.length - 1; i >= 0; i--) { const b = S.pile[i]; if (Math.hypot(x - b.x, y - b.y) <= b.r + 5) { hit = b; break; } } if (!hit) return; e.preventDefault();
      S.pile.splice(S.pile.indexOf(hit), 1); fl = { ty: 'cur', k: hit.k, items: [hit], el: floatEl('cur', e), big: null, px: e.clientX, py: e.clientY }; curFloatHtml(fl); curSize(fl, false); wake(S.pile); snd.grab(); });
    function magnet(dt) { if (!fl || fl.ty !== 'cur' || !S.hand || fl.big || fl.items.length >= 10) return; const r = wcv.getBoundingClientRect(), x = fl.px - r.left, y = fl.py - r.top; let got = false;
      for (let i = S.pile.length - 1; i >= 0; i--) { const b = S.pile[i]; if (b.k !== fl.k) { b.mag = false; continue; } const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy); if (d < 90) { b.mag = true; b.sl = false; b.st = 0; const f = 5200 * (1 - d / 112); b.vx += dx / (d || 1) * f * dt; b.vy += dy / (d || 1) * f * dt - GRAV * dt * 0.9; if (d < 19 && fl.items.length < 10) { S.pile.splice(i, 1); fl.items.push(b); got = true; } } else b.mag = false; }
      if (got) { curFloatHtml(fl); snd.grab(); } }
    function orbDrag(nk, e, from, count) { fl = { ty: 'orb', nk, from, count: count || 1, el: floatEl('orb', e) }; fl.el.style.cssText += ';' + orbBg(nk); orbBadge(); }
    function orbBadge() { fl.el.innerHTML = fl.count > 1 ? '<i>×' + fl.count + '</i>' : ''; }
    window.addEventListener('pointermove', (e) => { if (!fl) return; fl.px = e.clientX; fl.py = e.clientY; fl.el.style.left = e.clientX + 'px'; fl.el.style.top = e.clientY + 'px';
      if (fl.ty === 'cur') { const r = walEl.getBoundingClientRect(); curSize(fl, !(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)); }
      else { const w = document.elementFromPoint(e.clientX, e.clientY); panEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); const well = w && w.closest && w.closest('.gm-well'); if (well) well.classList.add('over');
        const p = toCv(e); if (p.in) for (let i = S.bask.length - 1; i >= 0; i--) { const b = S.bask[i]; if (b.kind === 'orb' && b.res.nk.n === fl.nk.n && Math.hypot(p.x - b.x, p.y - b.y) < OR * 2.3) { S.bask.splice(i, 1); wake(S.bask); fl.count += b.res.count || 1; orbBadge(); sparks(b.x, b.y, 22); snd.merge(); fl.el.classList.remove('mg'); void fl.el.offsetWidth; fl.el.classList.add('mg'); } } } });
    window.addEventListener('pointerup', (e) => { if (!fl) return; const f = fl; fl = null; f.el.remove(); S.hl = null; S.pile.forEach((b) => { b.mag = false; });
      if (f.ty === 'cur') { const p = toCv(e); if (p.in) insert(f.k, f.items, p.x, p.y); else { const r = wcv.getBoundingClientRect(), out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; f.items.forEach((it, i) => { it.x = out ? rnd(40, PW - 40) : clamp(e.clientX - r.left, it.r, PW - it.r) + rnd(-8, 8); it.y = out ? -30 - i * 20 : Math.min(e.clientY - r.top, PH - 60) - i * 6; it.vx = it.vy = 0; it.sl = false; it.st = 0; S.pile.push(it); }); wake(S.pile); } }
      else { panEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); const w = document.elementFromPoint(e.clientX, e.clientY); if (w && w.closest && w.closest('.gm-tray')) { const dw = w.closest('.gm-well'); trayAdd(f.nk, f.count, dw ? +dw.dataset.i : null, f.ti, f.en && f.en.count === f.count ? f.en : null); if (f.from === 'reveal') endReveal(false); }
        else if (f.from === 'tray') trayAdd(f.nk, f.count, f.ti, f.ti, f.en ? Object.assign(f.en, { count: f.count }) : null); /* 보관함 SSR은 바구니로 못 돌아감 */
        else if (f.from === 'reveal' && f.count === 1) { /* 개봉 화면에 그대로 둠 */ } else { if (f.from === 'reveal') endReveal(false); const p = toCv(e); orbBody(f.nk, f.count, p.in ? clamp(p.x, BK.x0 + OR, BK.x1 - OR) : CH.x + CH.w / 2, p.in ? clamp(p.y, 500, BK.y1 - OR) : BK.y0 - 40); } } });
    modeEl.addEventListener('click', (e) => { if (e.target.closest('[data-feed]')) { S.sup.pick += 500; S.sup.jw += 50000; S.sup.acc = 1; uiFeed(); return; } const m = e.target.closest('[data-m]'); if (m) { S.hand = !S.hand; uiWal(); } });
    optEl.addEventListener('click', (e) => { const g = e.target.closest('[data-g]'), op = e.target.closest('[data-op]'); if (op) { S.openM = op.dataset.op; uiOpt(); } if (!g) return; const k = g.dataset.g; if (k === 'corp') setMode('tier', false); else if (k === 'boss' || k === 'pvp') setMode('tier', k); else if (k === 'random') { S.mode.black = false; setMode('random', !S.mode.random); } else { const v = !S.mode.black; setMode('random', false); setMode('black', v); } uiTray(); });
    let tpd = null; /* 보관함: 누르면 뒤집기/흡수, 끌면 이동 */
    const busyE = (en) => !!(en && en.top && en.top.busy);
    /* 모두 뒤집기: SSS를 뺀 칸을 차례로 뒤집고(겹친 칸은 맨 위 한 장), 잠시 뒤 칸째로 잔고에 넣음 */
    function flipAll() {
      if (S.flipAllBusy) return;
      const list = S.tray.map((e, i) => [e, i]).filter(([e]) => e && !isSSSn(e.nk) && !busyE(e) && !(e.top && e.top.anim));
      if (!list.length) { say(S.tray.some(Boolean) ? 'SSS는 직접 뒤집어 주세요.' : '보관함이 비어 있습니다.'); return; }
      S.flipAllBusy = true; let changed = false;
      list.forEach(([e]) => { if (!e.top) { e.top = { nk: e.nk }; changed = true; } e.top.noAuto = true; });
      if (changed) uiTray();
      const step = Math.max(40, Math.min(120, 1400 / list.length));
      list.forEach(([e], n) => setTimeout(() => { const i = S.tray.indexOf(e), o = i >= 0 && panEl.children[i] && panEl.children[i].querySelector('.gm-orb.top'); if (!o || !e.top || e.top.flip) return;
        const t = e.top, a = rnd(0, TAU), m = rnd(2, 4); t.flip = true; t.tilt = [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)]; o.style.setProperty('--tx', t.tilt[0] + 'deg'); o.style.setProperty('--ty', t.tilt[1] + 'deg'); void o.offsetWidth; requestAnimationFrame(() => o.classList.add('flip')); try { snd.flip(); } catch (er) { /* 무시 */ } }, 60 + n * step));
      setTimeout(() => {
        list.forEach(([e], n) => setTimeout(() => { const i = S.tray.indexOf(e); if (i < 0 || !e.top || !e.top.flip) return; const w = panEl.children[i], o = w && w.querySelector('.gm-orb.top'), r = o ? o.getBoundingClientRect() : null, k = chipE(e.top), c = e.count;
          S.tray[i] = null; while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); uiTray(); if (r) chipAbsorb(k, c, r.left + r.width / 2, r.top + r.height / 2, r.width); else window.doroChips.add({ [k]: c }, 'ssr'); }, n * Math.min(160, step * 1.5)));
        setTimeout(() => { S.flipAllBusy = false; }, list.length * Math.min(160, step * 1.5) + 200);
      }, list.length * step + 1000);
    }
    panEl.addEventListener('pointerdown', (e) => { const well = e.target.closest('.gm-well'); if (!well || fl || S.spread) return; const en = S.tray[+well.dataset.i]; if (!en) return; e.preventDefault(); if (busyE(en)) return; /* SSS 뒤집는 중: 누르기·끌기 막음 */ tpd = { en, well, x: e.clientX, y: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (!tpd || fl) return; if (Math.hypot(e.clientX - tpd.x, e.clientY - tpd.y) < 7) return; const en = tpd.en, i = S.tray.indexOf(en); tpd = null; if (i < 0 || busyE(en)) return; S.tray[i] = null; uiTray(); orbDrag(en.nk, e, 'tray', en.count); fl.ti = i; fl.en = en; });
    window.addEventListener('pointercancel', () => { tpd = null; });
    window.addEventListener('pointerup', () => { if (!tpd) return; const en = tpd.en; tpd = null; const i = S.tray.indexOf(en); if (i < 0 || busyE(en)) return;
      if (en.top && en.top.anim) { if (en.top.skip) en.top.skip(); return; }
      if (en.count > 1 && !en.top) { spreadOpen(en); return; } /* 겹친 칸: 최대 10장씩 펼쳐 차례로 뒤집기 */
      if (!en.top || !en.top.flip) { flipTop(en); return; }
      absorbTop(en); if (en.all && en.count > 0) setTimeout(() => { if (!en.top && S.tray.includes(en)) flipTop(en); }, 260); });
    /* 겹친 칸 펼치기: 최대 10장(5×2)을 펼쳐 0.1초마다 왼쪽부터 한 장씩 뒤집고, 다 끝나면 한꺼번에 잔고로. 남으면 다음 10장 */
    function spreadOpen(en) {
      if (S.spread) return; const tr = $('.gm-tray'); if (!tr) return;
      const box = document.createElement('div'); box.className = 'gm-spread'; tr.appendChild(box); S.spread = { en, box };
      box.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.gm-skip')) return;
        if (!isSSSn(en.nk) && S.spread && S.spread.cur && !S.spread.cur.hasR) { S.spread.skip = true; S.spread.cur.skip(); return; } /* SS 이하: 화면을 눌러도 바로 건너뜀 */
        const c = e.target.closest('.gm-spc'); if (!c) return; const t = c._t; if (t && t.anim && !t.busy && t.skip) t.skip(); });
      const batch = () => {
        if (!S.tray.includes(en) || en.count <= 0) { box.remove(); S.spread = null; return; }
        const n = Math.min(10, en.count), cards = [], pre = Array.from({ length: n }, () => ({ nk: en.nk })), hasR = pre.some((t) => chipE(t) === 'r');
        box.innerHTML = '<div class="gm-spg">' + Array.from({ length: n }, () => '<div class="gm-spc"></div>').join('') + '</div><div class="gm-spn">' + (en.count > n ? '남은 ' + (en.count - n) + '장' : '') + '</div>' +
          (hasR ? '' : '<button type="button" class="gm-tb gm-skip" aria-label="건너뛰기">SKIP <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor"/></svg></button>');
        { const sk = box.querySelector('.gm-skip'); if (sk) sk.addEventListener('click', (e) => { e.stopPropagation(); S.spread.skip = true; doSkip(); }); }
        box.querySelectorAll('.gm-spc').forEach((c, j) => { const t = pre[j]; c._t = t; c.innerHTML = orbHtml(t, ' top', '', ''); cards.push([c, t]); });
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
            cards.forEach(([c, t], j) => setTimeout(() => { const r = c.getBoundingClientRect(), k = chipE(t); c.style.visibility = 'hidden'; if (r.width) chipAbsorb(k, 1, r.left + r.width / 2, r.top + r.height / 2, r.width * 0.8, 'ssr'); else window.doroChips.add({ [k]: 1 }, 'ssr'); }, j * gap));
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
        en.top = { nk: en.nk }; const w0 = panEl.children[i], o0 = w0 && w0.querySelector('.gm-orb');
        if (o0) { o0.classList.remove('pop', 'merge'); o0.classList.add('top'); const bd = o0.querySelector('.gm-cf i'); if (bd) bd.remove(); const cb = o0.querySelector('.gm-cb'); if (cb) cb.innerHTML = chipSvg(chipE(en.top), 64); } else uiTray();
      }
      const t = en.top, well = panEl.children[i], orb = well && well.querySelector('.gm-orb.top'); if (!orb || t.flip) return;
      {
        t.flip = true; { const a = rnd(0, TAU), m = rnd(2, 4); t.tilt = [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)]; orb.style.setProperty('--tx', t.tilt[0] + 'deg'); orb.style.setProperty('--ty', t.tilt[1] + 'deg'); }
        orb.title = CHIP_NM[chipE(t)] + ' · 누르면 잔고로';
        if (wantSlow(t, chipE(t))) { t.busy = true; t.anim = true; t._el = orb; t.owner = en; slowFlip(orb, chipE(t), t); setTimeout(() => { t.busy = false; }, 1000); /* 클릭 막는 시간 1초 */ } else { snd.flip(); t._el = orb; t.flipping = true; setTimeout(() => { t.flipping = false; t._el = null; }, 950); void orb.offsetWidth; requestAnimationFrame(() => orb.classList.add('flip')); autoAbsorb(en, t, 900); }
      }
    }
    /* 도로칩 잔고를 누르면: 어디서 어떤 칩이 몇 %로 나오는지 */
    function chipOdds() {
      const tr = $('.gm-tray'); let box = tr.querySelector('.gm-odds'); if (box) { box.remove(); return; }
      const row = (nm, key, note) => '<tr><th>' + nm + (note ? '<small>' + note + '</small>' : '') + '</th>' + CHIP_P[key].map((v, i) => '<td class="' + (v ? '' : 'z') + '">' + (v ? (v < 0.1 ? v.toFixed(2) : v < 1 ? v.toFixed(2).replace(/0$/, '') : String(+v.toFixed(2))) + '%' : '—') + '</td>').join('') + '</tr>';
      box = document.createElement('div'); box.className = 'gm-odds';
      box.innerHTML = '<div class="gm-oddh"><b>도로칩 획득 확률</b><button class="gm-tb" data-x>닫기</button></div><table><thead><tr><th></th>' + KS.map((k) => '<th>' + chipSvg(k, 20, false) + '</th>').join('') + '</tr></thead><tbody>' +
        row('SSS', 'SSS') + row('SS', 'SS') + row('S', 'S') + row('A 이하', 'low') + row('R 캡슐', 'capR', CAP_RATE.R + '% 확률로') + row('SR 캡슐', 'capSR', CAP_RATE.SR + '% 확률로') + row('R 10연속', 'stkR') + row('SR 10연속', 'stkSR') +
        '</tbody></table><p>도로칩 10 = 실버칩 2 = 골드칩 1 · 바디라벨 10,000 = 도로칩 1 · 티어는 기본 티어표(솔레) 기준</p>';
      box.querySelector('[data-x]').onclick = (e) => { e.stopPropagation(); box.remove(); };
      tr.appendChild(box);
    }
    /* 초기화 전 정산: 보관함의 모든 SSR(SSS 포함)을 칩으로 바꿔 잔고에 넣음 */
    function traySettle() {
      S.tray.forEach((e, i) => {
        if (!e) return; const w = panEl.children[i], r = w ? w.getBoundingClientRect() : null, got = {};
        for (let c = 0; c < e.count; c++) { const k = c === 0 && e.top && e.top.ck ? e.top.ck : chipOf(e.nk); got[k] = (got[k] || 0) + 1; }
        Object.keys(got).forEach((k, j) => setTimeout(() => { if (r && r.width) chipAbsorb(k, got[k], r.left + r.width / 2, r.top + r.height / 2, r.width * 0.9, 'ssr'); else window.doroChips.add({ [k]: got[k] }, 'ssr'); }, i * 40 + j * 80));
      });
    }
    /* 뒤집힌 맨 위 한 장을 잔고로 */
    function absorbTop(en) {
      const i = S.tray.indexOf(en), t = en && en.top; if (i < 0 || !t || !t.flip || t.anim) return;
      const w = panEl.children[i], orb = w && w.querySelector('.gm-orb.top'), r = orb ? orb.getBoundingClientRect() : null;
      en.count -= 1; en.top = null; en.ck = null; if (en.count <= 0) { S.tray[i] = null; while (S.tray.length && !S.tray[S.tray.length - 1]) S.tray.pop(); }
      renderWell(i); if (r && r.width) chipAbsorb(chipE(t), 1, r.left + r.width / 2, r.top + r.height / 2, r.width); else window.doroChips.add({ [chipE(t)]: 1 }, 'ssr');
    }
    /* 뒤집히고 0.5초 뒤 스스로 잔고로 (실버·골드·무지개는 그 사이 커지며 빛남) */
    function autoAbsorb(en, t, wait) {
      if (t.noAuto) return;
      setTimeout(() => {
        if (en.top !== t || !t.flip || t.anim) return;
        const k = chipE(t), i = S.tray.indexOf(en), o = i >= 0 && panEl.children[i] && panEl.children[i].querySelector('.gm-orb.top');
        if (o && k !== 'b') o.classList.add('shine', 'shine-' + k);
        setTimeout(() => { absorbTop(en); if (en.all && en.count > 0 && S.tray.includes(en)) setTimeout(() => { if (!en.top && S.tray.includes(en)) flipTop(en); }, 260); else en.all = false; }, 500);
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
      else if (k === 'add10') { for (let i = 0; i < 10; i++) { const u = Math.random() * 4, nk = u < 1 ? P.pickup : u < 1.5 ? pick(P.pil) : pick(P.std); if (nk) trayAdd(nk, 1); } }
      else if (k === 'odds') chipOdds();
      else if (k === 'fs') { const inFs = !!(document.fullscreenElement || root.closest('.gm-multi.fs')); if (inFs && GM_ALL.some((x) => x.S.tray.some(Boolean)) && !(S.fsWarn && performance.now() - S.fsWarn < 4000)) { S.fsWarn = performance.now(); S.msg = { t: '잠깐, 아직 교환하지 않은 SSR이 있습니다!', life: 3.6 }; snd.clunk(); const g = $('.gm'); if (g && !g.classList.contains('topen')) { g.classList.add('topen'); requestAnimationFrame(() => { resize(); uiTray(); }); } return; } if (o.fs) o.fs(); else if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }
      else if (k === 'auto') { S.auto = S.auto === 0 ? 1 : S.auto === 1 ? 2 : S.auto === 2 ? 4 : 0; S.autoLid = false; a.textContent = S.auto ? 'AUTO ×' + S.auto : 'AUTO'; a.classList.toggle('on', !!S.auto); }
      else if (k === 'exch') { const L = S.bask.filter((b) => (b.kind === 'R' || b.kind === 'SR') && !(S.mode.random && b.res.dummy)); if (!L.length) say('교환할 R·SR 캡슐이 없습니다.'); popStart(L); }
      else if (k === 'all') { const L = S.bask.filter((b) => b.kind === 'orb'); L.forEach((b) => { S.bask.splice(S.bask.indexOf(b), 1); trayAdd(b.res.nk, b.res.count); }); wake(S.bask); const R = S.reveal; if (R && R.ph === 'show' && R.nk && R.t > 0.5) { trayAdd(R.nk, 1); endReveal(false); } }
      else if (k === 'reset') { traySettle(); Object.assign(S.stock, stock0); S.gl = []; S.cred = []; S.credN = 0; S.bask = []; S.cup = []; S.emerg = []; S.parts = []; S.pops = []; S.ins = []; S.lab = 0; S.tray = []; S.reveal = null; S.grab = null; S.refill = null; S.stats = { n: 0, ssr: 0, pu: 0, gold: 0, silver: 0 }; S.log = []; S.sq = []; S.streak = null; gDirty = true; S.pile = []; S.sup.pick = S.sup.jw = 0; S.sup.full = false; pileSync(); domeInit(); uiWal(); uiStat(); uiTray(); uiLab(); } });

    /* 캔버스 조작 */
    const hitBody = (p) => { for (let i = S.bask.length - 1; i >= 0; i--) { const b = S.bask[i]; if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 2) return b; } return null; };
    const inCh = (p) => p.x >= CH.x && p.x <= CH.x + CH.w && p.y >= CH.y && p.y <= CH.y + CH.h;
    function addCracks(R) { for (let k = 0; k < 2; k++) { let a = rnd(0, TAU), x = rnd(-0.25, 0.25), y = rnd(-0.25, 0.25); const pts = [[x, y]]; for (let s = 0; s < 4; s++) { a += rnd(-0.7, 0.7); x += Math.cos(a) * rnd(0.15, 0.3); y += Math.sin(a) * rnd(0.15, 0.3); if (x * x + y * y > 0.9) break; pts.push([x, y]); } R.cracks.push(pts); } }
    cv.addEventListener('pointerdown', (e) => { const lf = $('.gm-left'); if (lf.classList.contains('clean')) { lf.classList.remove('clean'); return; } const p = toCv(e), R = S.reveal;
      if (R) { if (R.ph === 'open') { if (R.method === 'auto') { if (R.t > 1 && !S.auto) R.prog = 1; } else if (R.method === 'hold') { R.hold = true; cv.setPointerCapture(e.pointerId); } else if (R.method === 'tap') { R.taps++; R.punch = 1; R.shake = Math.max(R.shake, 0.6); addCracks(R); snd.crack(); sparks(RV.x + rnd(-40, 40), RV.y + rnd(-40, 40), 8, () => lvCol(R, R.shown, 1), 300); } else { R.drag = { x: p.x, y: p.y, d: 0 }; cv.setPointerCapture(e.pointerId); } }
        else if (R.ph === 'show' && R.nk && R.t > 0.6) { if (Math.hypot(p.x - RV.x, p.y - RV.y) < RV.r + 10) R.down = { x: e.clientX, y: e.clientY }; else endReveal(true); } return; }
      if (Math.hypot(p.x - LV.x, p.y - LV.y) < LV.r + 6) { const L = S.lev; L.drag = { ang: Math.atan2(p.y - LV.y, p.x - LV.x), moved: 0, t0: S.time }; if (L.sp < 1) return; L.q = 0; cv.setPointerCapture(e.pointerId); return; }
      if (inCh(p)) { S.lid.drag = { y0: p.y, a0: S.lid.a, v: S.lid.a }; cv.setPointerCapture(e.pointerId); return; }
      const b = hitBody(p); if (!b || b.pop) { if (o.nav) o.nav(e); return; } S.grab = { b, sx: p.x, sy: p.y, tx: p.x, ty: p.y, ox: b.x - p.x, oy: b.y - p.y, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { const p = toCv(e), L = S.lev, R = S.reveal, g = S.grab;
      if (R && R.drag) { R.drag.d = Math.max(Math.abs(p.y - R.drag.y), Math.abs(p.x - R.drag.x) * 0.7); return; }
      if (R && R.down && !fl && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) > 8) { R.down = null; R.hide = true; orbDrag(R.nk, e, 'reveal', 1); return; }
      if (S.lid.drag) { const d = S.lid.drag; d.v = clamp(d.a0 + (d.y0 - p.y) / 70, 0, 1); return; }
      if (g) { g.tx = p.x; g.ty = p.y; if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) > 8) { g.moved = true; if (g.b.kind === 'orb') { S.grab = null; S.bask.splice(S.bask.indexOf(g.b), 1); wake(S.bask); try { cv.releasePointerCapture(e.pointerId); } catch (er) { /* 무시 */ } orbDrag(g.b.res.nk, e, 'bask', g.b.res.count); } else { g.b.held = true; wake(S.bask); } } return; }
      if (L.drag) { const a = Math.atan2(p.y - LV.y, p.x - LV.x); let d = a - L.drag.ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; L.drag.ang = a; L.drag.moved += Math.abs(d); if (d > 0) L.tg = Math.min(L.tg + d * 0.9, L.t + 0.85); return; }
      let cur = ''; if (R) cur = 'pointer'; else if (Math.hypot(p.x - LV.x, p.y - LV.y) < LV.r + 6 || inCh(p)) cur = 'grab'; else { const b = hitBody(p); if (b) cur = b.kind === 'orb' ? 'grab' : 'pointer'; } cv.style.cursor = cur; });
    const cvUp = () => { const L = S.lev, R = S.reveal, g = S.grab; if (R) { R.drag = null; R.hold = false; if (R.down) { R.down = null; endReveal(true); } } S.lid.drag = null;
      if (g) { S.grab = null; g.b.held = false; if (!g.moved && S.bask.indexOf(g.b) >= 0) { if (g.b.kind === 'SSR' || (S.mode.random && g.b.kind !== 'orb')) startReveal(g.b); else if (g.b.kind === 'chip') chipTake(g.b); else if (g.b.kind !== 'orb') popStart([g.b]); else { S.bask.splice(S.bask.indexOf(g.b), 1); wake(S.bask); flyOrb(g.b.res.nk, g.b.res.count, g.b.x, g.b.y); } } }
      if (!L.drag) return; if (L.drag.moved < 0.08 && S.time - L.drag.t0 < 0.4) { if (allowed() > 0) { L.an = Math.min(10, allowed()); L.q = L.an; L.wait = 0; } else nope(); } L.drag = null; };
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
      } else if (R.ph === 'hit') { if (R.t > 0.11) { R.ph = 'show'; R.t = 0; S.flash = R.T >= 2 ? 1 : 0.5; snd.burst(R.T); seqDone(R.res); if (R.T >= 2) vib(R.pu ? [70, 50, 70, 50, 220] : R.T === 3 ? [70, 40, 140] : [60, 40, 90], true); if (R.kind === 'SSR') { S.gl.push({ at: S.log.length, pu: R.pu, n: R.nk.n }); gDirty = true; } const n = [18, 30, 60, 120][R.T]; sparks(RV.x, RV.y, n, R.T >= 2 ? () => (R.T === 3 ? lvCol(R, 3, 1) : pick(['#fff3b0', '#ffd24d', '#ffffff'])) : LVC[R.T], [380, 480, 650, 900][R.T], 260); shells(RV.x, RV.y, RV.r, 0, COL[R.lk[0]], 1.5);
          if (R.kind !== 'SSR') { S.parts.push({ ty: 'lab', x: RV.x, y: RV.y, sx: RV.x, sy: RV.y, t: -0.55, val: LABEL[R.kind], big: 1 }); capChip(RV.x, BK.y0 + 30, R.kind); } else if (R.ovr) setTimeout(() => { if (S.reveal === R) { vib([30, 30, 30, 30, 160], true); snd.zap(); S.flash = 0.6; R.shake = 1; sparks(RV.x, RV.y, 70, '#bff8ff', 900, 0); } }, 420); } }
      else if (R.kind !== 'SSR' && R.t > 1.0) S.reveal = null;
    }
    function autoStep(dt) { // AUTO: 투입 → 레버 → 꺼내기 → 교환·개봉 → 보관 → 리필
      S.at -= dt; const R = S.reveal; S.autoLid = S.cup.length > 0 && !S.lev.auto;
      if (R) { if (R.ph === 'show' && R.kind === 'SSR' && R.t > 1.5 && !R.hide) { const nk = R.nk; endReveal(false); flyOrb(nk, 1, RV.x, RV.y); } return; }
      if (S.at > 0 || S.refill) return; S.at = 0.25;
      { const ch = S.bask.find((b) => b.kind === 'chip' && b.sl); if (ch) { chipTake(ch); S.at = 0.25; return; } }
      const orb = S.bask.find((b) => b.kind === 'orb' && b.sl); if (orb) { S.bask.splice(S.bask.indexOf(orb), 1); wake(S.bask); flyOrb(orb.res.nk, orb.res.count, orb.x, orb.y); return; }
      const busy = S.lev.auto > 0 || S.emerg.length || S.cup.length || S.dome.some((b) => b.exit) || S.pops.length;
      if (!busy) { const keep = (b) => b.kind === 'SSR' || (S.mode.random && b.res.dummy && b.kind !== 'orb'); const junk = S.bask.filter((b) => (b.kind === 'R' || b.kind === 'SR') && !keep(b) && !b.pop); if (junk.length) { popStart(junk); S.at = 0.6; return; }
        const y = S.bask.find((b) => keep(b) && !b.pop); if (y) { if (y.sl) { startReveal(y); if (S.reveal) S.reveal.bot = true; } return; } }
      if (allowed() > 0) { if (!S.lev.auto && !S.lev.drag) { S.lev.an = Math.min(10, allowed()); S.lev.q = S.lev.an; S.lev.wait = 0; } return; }
      if (S.ins.length || busy) return;
      if (!domeN() && (S.credN || S.pile.length)) { refill(); return; }
      if (!S.credN && room() >= 10) { const it = S.pile.filter((b) => b.k === 'pick').sort((a, b) => b.u - a.u)[0] || S.pile.filter((b) => b.k === 'jw').sort((a, b) => b.u - a.u)[0]; if (it) { S.pile.splice(S.pile.indexOf(it), 1); wake(S.pile); insert(it.k, [it], it.k === 'jw' ? HOLE.x + 150 : SLIT.x + 150, 300); S.at = 0.5; return; } }
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
        if (p.ty === 'shell') { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt; if (p.y > H + 160) S.parts.splice(i, 1); }
        else if (p.ty === 'spark') { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > p.max) S.parts.splice(i, 1); }
        else if (p.ty === 'lab') { p.t += dt; if (p.t < 0.38) { p.x = p.sx; p.y = p.sy - 34 * eout(Math.max(0, p.t) / 0.38); } else { const u = Math.min(1, (p.t - 0.38) / 0.5), k = u * u, mx = (p.sx + HUDP.x) / 2, my = Math.min(p.sy, HUDP.y) - 160; p.x = (1 - k) * (1 - k) * p.sx + 2 * (1 - k) * k * mx + k * k * HUDP.x; p.y = (1 - k) * (1 - k) * (p.sy - 34) + 2 * (1 - k) * k * my + k * k * HUDP.y; if (u >= 1) { S.parts.splice(i, 1); S.lab += p.val; labChips(); uiLab(true); snd.blip(); } } } }
      for (let i = S.ins.length - 1; i >= 0; i--) { const s = S.ins[i]; s.t += dt; if (!s.snd && s.t > (s.k === 'jw' ? 0.34 : 0.5)) { s.snd = true; if (s.k === 'jw') snd.coin(); else snd.bill(); } if (s.t > (s.k === 'jw' ? 0.8 : 1.15)) { S.ins.splice(i, 1); credit(s.k, s.u || 10); } }
      if (S.led > 0) S.led = Math.max(0, S.led - dt * 3);
      if (S.msg) { S.msg.life -= dt; if (S.msg.life <= 0 || !S.msg.t) S.msg = null; }
      if (S.reveal) updReveal(S.reveal, dt);
      if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.6);
    }

    /* ---------- 그리기 ---------- */
    function sticker(x) { // 볼록한 사각 표지: 네 변이 살짝 부풀고 모서리는 둥글게
      const path = (pad) => { const x0 = BAN.cx - BAN.w / 2 - pad, x1 = BAN.cx + BAN.w / 2 + pad, y0 = BAN.cy - BAN.h / 2 - pad, y1 = BAN.cy + BAN.h / 2 + pad, r = 18 + pad, bv = 0, bh = 10; x.beginPath(); x.moveTo(x0 + r, y0); x.quadraticCurveTo(BAN.cx, y0 - bv, x1 - r, y0); x.quadraticCurveTo(x1, y0, x1, y0 + r); x.quadraticCurveTo(x1 + bh, BAN.cy, x1, y1 - r); x.quadraticCurveTo(x1, y1, x1 - r, y1); x.quadraticCurveTo(BAN.cx, y1 + bv, x0 + r, y1); x.quadraticCurveTo(x0, y1, x0, y1 - r); x.quadraticCurveTo(x0 - bh, BAN.cy, x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath(); };
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
      plate(SLOT.coin, 'JEWEL'); { const s = HOLE.s; x.drawImage(tint(IM.jw, '#6fb6ff', 128), HOLE.x - s * 0.58, HOLE.y - s * 0.58, s * 1.16, s * 1.16); x.drawImage(tint(IM.jw, '#05060a', 128), HOLE.x - s * 0.52, HOLE.y - s * 0.52, s * 1.04, s * 1.04); }
      // 바구니 뒤
      x.fillStyle = 'rgba(8,10,16,.6)'; x.fillRect(0, BK.y0, W, H - BK.y0);
      
      [c, x] = mk(); stC = c;
      
      g = x.createLinearGradient(0, BK.y0, 0, BK.y0 + 8); g.addColorStop(0, '#eef1f6'); g.addColorStop(1, '#8e98aa'); x.fillStyle = g; x.fillRect(0, BK.y0, W, 6); { const rad = clamp(15 * W / Math.max(200, cvRect().width), 12, 48), l = 3, b = H - 3; x.strokeStyle = '#aab3c2'; x.lineWidth = 6; x.lineJoin = 'round'; x.beginPath(); x.moveTo(l, BK.y0); x.lineTo(l, b - rad); x.arcTo(l, b, l + rad, b, rad); x.lineTo(W - l - rad, b); x.arcTo(W - l, b, W - l, b - rad, rad); x.lineTo(W - l, BK.y0); x.stroke(); }
      stD = mkc(cv.width, cv.height); dirty = false;
    }
    function resize() { const r = cvRect(), d = Math.min(1.5, window.devicePixelRatio || 1); const w = Math.max(320, Math.round(r.width * d)); if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * H / W); } scale = cv.width / W; dirty = true; txs = clamp(800 / Math.max(1, r.width), 1, 2.4); rightEl.style.height = rightEl.offsetParent ? leftEl.offsetHeight + 'px' : ''; pileResize(); uiTray(); gDirty = true; }
    function drawBodyAny(c, b) { let x = b.x, y = b.y, a = b.a; const g = S.grab; if (g && g.b === b && !g.moved) { x += rnd(-1.8, 1.8); y += rnd(-1.8, 1.8); a += rnd(-0.08, 0.08); } if (b.kind === 'orb') { drawOrb(c, b.res.nk, x, y, OR, a); if (b.res.count > 1) badge(c, x + 14, y + 20, '×' + b.res.count); if (S.mode.tier) { const t = tierOf(b.res.nk); badge(c, x - 14, y - 20, t, TIERC[t]); } } else if (b.kind === 'chip') drawChip(c, b.res.chip, x, y, a); else drawCap(c, look(b), x, y, b.r, a); }
    function tkPersp(c, im, x, yFar, wFar, wNear, len, f0) { // 짧은 변부터 안쪽으로: 깊이 방향 띠로 그림
      const N = 18, iw = im.naturalWidth, ih = im.naturalHeight; for (let i = 0; i < N; i++) { const u0 = f0 + (1 - f0) * i / N, u1 = f0 + (1 - f0) * (i + 1) / N, k0 = i / N, k1 = (i + 1) / N, yd = yFar + len * k0 * (1 - f0), hd = len * (k1 - k0) * (1 - f0) + 0.6, wd = wFar + (wNear - wFar) * (k0 + k1) / 2 * (1 - f0), sx = u0 * iw, sw = (u1 - u0) * iw; if (sw <= 0) continue; c.save(); c.translate(x + wd / 2, yd); c.transform(0, hd / sw, -wd / ih, 0, 0, 0); c.drawImage(im, sx, 0, sw, ih, 0, 0, sw, ih); c.restore(); } }
    function drawIns(c, s) { const jw = s.k === 'jw', im = IM[s.k], w0 = jw ? HOLE.s : SLIT.w * 0.94 * TKR, h0 = jw ? HOLE.s : SLIT.w * 0.94;
      if (s.t < 0) { c.drawImage(im, s.x - w0 / 2, s.y - h0 / 2, w0, h0); return; }
      if (jw) { const f = ease(s.t / 0.34), u = clamp((s.t - 0.34) / 0.42, 0, 1), x = s.x + (HOLE.x - s.x) * f, y = s.y + (HOLE.y - s.y) * f - Math.sin(f * Math.PI) * 30, w = HOLE.s * (1 - 0.2 * ease(u)); c.save(); c.translate(x, y); c.rotate((1 - f) * 0.5); c.globalAlpha = 1 - u * u * u; c.drawImage(im, -w / 2, -w / 2, w, w); if (u > 0) { c.globalAlpha = u * 0.9; c.drawImage(tint(im, '#05060a', 128), -w / 2, -w / 2, w, w); } c.restore();
        if (u > 0 && u < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(120,190,255,' + (1 - u) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(HOLE.x, HOLE.y, 30 + 30 * u, 0, TAU); c.stroke(); c.restore(); } return; }
      const wS = SLIT.w * 0.94, L0 = wS * TKR; // 1) 날아와 세로로 서고 2) 눕혀지며 3) 슬릿 안쪽으로 두 번에 걸쳐 빨려 들어감
      if (s.t < 0.3) { const f = ease(s.t / 0.3), cy = SLIT.y + 20 + L0 / 2; c.save(); c.translate(s.x + (SLIT.x - s.x) * f, s.y + (cy - s.y) * f - Math.sin(f * Math.PI) * 24); c.rotate(f * Math.PI / 2); c.drawImage(im, -w0 / 2, -h0 / 2, w0, h0); c.restore(); return; }
      const p = ease((s.t - 0.3) / 0.2), u = clamp((s.t - 0.5) / 0.6, 0, 1), feed = u < 0.45 ? ease(u / 0.45) * 0.38 : 0.38 + ease((u - 0.45) / 0.55) * 0.62, len = L0 * (1 - 0.56 * p), yFar = SLIT.y + 20 * (1 - p);
      c.save(); c.beginPath(); c.rect(SLIT.x - 120, SLIT.y, 240, 260); c.clip(); c.globalAlpha = 1; tkPersp(c, im, SLIT.x, yFar, wS * (1 - 0.06 * p), wS * (1 + 0.24 * p), len, feed); c.restore();
    }
    function drawChute(c) { const hx = CH.x + 10, hy = CH.y + 10, hw = CH.w - 20, hh = CH.h - 20, Ld = S.lid; c.save(); rr(c, hx, hy, hw, hh, 12); c.clip();
      for (const b of S.cup) drawCap(c, look(b), b.x, b.y, b.r, b.a);
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
      for (const s of S.ins) { if (s.u === 1) { const px = s.k === 'jw' ? HOLE.x : SLIT.x, py = s.k === 'jw' ? HOLE.y : SLIT.y; c.save(); c.translate(px, py); c.scale(0.62, 0.62); c.translate(-px, -py); drawIns(c, s); c.restore(); } else drawIns(c, s); }
      const R = S.reveal; if (R) drawReveal(c, R);
      for (const p of S.parts) { if (p.ty === 'shell') { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; c.beginPath(); if (p.top) c.arc(0, 0, p.r, Math.PI, 0); else c.arc(0, 0, p.r, 0, Math.PI); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,30,.28)'; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.28, 0, 0, TAU); c.fill(); c.restore(); }
        else if (p.ty === 'lab' && p.t > (p.big ? -0.55 : 0)) { const bt = p.big ? 4.4 : 1.8, tt = Math.max(0, p.t), sc = (p.t < 0.38 ? 0.5 + 0.7 * eout(tt / 0.2) - 0.2 * ease((tt - 0.2) / 0.18) : 1 - 0.45 * Math.min(1, (p.t - 0.38) / 0.5)) * (p.t < 0.38 ? bt : 1 + (bt - 1) * (1 - Math.min(1, (p.t - 0.38) / 0.3))), w = 40 * sc; if (IM.label.complete) c.drawImage(IM.label, p.x - w / 2, p.y - w * 0.435, w, w * 0.87); } }
      if (S.streak) { const k = S.streak, t = k.t, col = k.k === 'SR' ? '#b06bff' : '#4f9bff', sc = t < 0.18 ? 0.3 + 1.0 * (t / 0.18) : t < 0.32 ? 1.3 - 0.3 * ((t - 0.18) / 0.14) : 1 + 0.03 * Math.sin(t * 14); c.save(); c.globalAlpha = Math.max(0, Math.min(1, (3.2 - t) * 5)); c.translate(480, 330); c.scale(sc, sc); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 34; c.font = '900 ' + Math.round(96 * txs) + 'px sans-serif'; c.lineWidth = 12; c.strokeStyle = 'rgba(8,10,18,.92)'; c.strokeText(k.p + '%!!', 0, 0); c.fillStyle = col; c.fillText(k.p + '%!!', 0, 0); c.shadowBlur = 0; c.font = '800 ' + Math.round(30 * txs) + 'px sans-serif'; c.lineWidth = 7; c.strokeText(k.k + ' 10연속', 0, 78 * txs); c.fillStyle = '#fff'; c.fillText(k.k + ' 10연속', 0, 78 * txs);
        { const y = 150 * txs, ck = k.k === 'SR' ? 's' : 'b', R2 = 34 * txs; /* 보상 칩은 확률표대로(대표 아이콘만 표시) */ c.font = '800 ' + Math.round(34 * txs) + 'px sans-serif'; c.textAlign = 'right'; c.lineWidth = 7; c.strokeText('보상:', -8 * txs, y); c.fillStyle = '#fff'; c.fillText('보상:', -8 * txs, y);
          const sp = chipSprite(ck); c.drawImage(sp.c, 6 * txs, y - R2, R2 * 2, R2 * 2); c.textAlign = 'left'; c.lineWidth = 7; c.strokeText(ck === 's' ? '실버칩' : '도로칩', R2 * 2 + 16 * txs, y); c.fillStyle = ck === 's' ? '#e3e8ef' : '#ffc45a'; c.fillText(ck === 's' ? '실버칩' : '도로칩', R2 * 2 + 16 * txs, y); }
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
      if (R.ph === 'in') { const m = ease(t / 0.42), x = R.x0 + (RV.x - R.x0) * m, y = R.y0 + (RV.y - R.y0) * m - Math.sin(m * Math.PI) * 60, r = R.r0 + (RV.r - R.r0) * m, sp = capSprite(R.lk[0], R.lk[1], RV.r), s = (r + 3 * r / RV.r) * 2, a = R.a0 * (1 - m); c.save(); c.translate(x, y); c.rotate(a); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.rotate(-a); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); return; }
      if (R.ph === 'open' || R.ph === 'hit') {
        rays(c, R, lv, 16, S.time * 0.8, 260 + 320 * pr, (0.08 + 0.5 * pr * pr) * flick, 0.06 + 0.06 * pr); if (lv === 3) rays(c, R, 3, 9, -S.time * 1.3, 640, 0.3 * flick, 0.045); if (lv === 3 && R.skin === 'ov') star4(c, 0.9 * flick, 1);
        for (const q of R.rings) { const u = q.t / 0.7; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = lvCol(R, q.lv, 1 - u); c.lineWidth = 16 * (1 - u) + 1; c.beginPath(); c.arc(RV.x, RV.y, RV.r + 360 * eout(u), 0, TAU); c.stroke(); c.restore(); }
        const r = RV.r * (1 + 0.07 * R.punch) * (R.method === 'hold' ? 1 + 0.085 * R.grow + (R.hold ? 0.012 * Math.sin(S.time * 60) : 0) : 1), sp = capSprite(R.lk[0], R.lk[1], RV.r), s = (r + 3 * r / RV.r) * 2, x = RV.x + ox, y = RV.y + oy, glow = lvCol(R, lv, 1);
        if (R.method === 'pull') { const gap = pr * RV.r * 1.05, up = gap * 0.78, dn = gap * 0.22; { c.save(); c.globalCompositeOperation = 'lighter'; const ga = c.createRadialGradient(x, y - up / 2, r * 0.7, x, y - up / 2, r + 90 + 110 * pr); ga.addColorStop(0, lvCol(R, lv, (0.3 + 0.4 * pr) * flick)); ga.addColorStop(1, lvCol(R, lv, 0)); c.fillStyle = ga; c.beginPath(); c.arc(x, y - up / 2, r + 90 + 110 * pr, 0, TAU); c.fill(); c.restore(); }
          if (gap > 1) { const cy2 = y - up / 2 + dn / 2, R2 = r * 0.8, k2 = Math.min(1, pr * 3) * flick; c.save(); c.globalCompositeOperation = 'lighter';
            let g = c.createRadialGradient(x, cy2, 0, x, cy2, R2 + 60 + 160 * pr); g.addColorStop(0, lvCol(R, lv, 0.5 * k2)); g.addColorStop(0.4, lvCol(R, lv, 0.18 * k2)); g.addColorStop(1, lvCol(R, lv, 0)); c.fillStyle = g; c.fillRect(x - 420, cy2 - 420, 840, 840);
            c.beginPath(); c.rect(x - r - 4, y - up - 1, 2 * r + 8, gap + 2); c.clip(); g = c.createRadialGradient(x, cy2, 0, x, cy2, R2); g.addColorStop(0, 'rgba(255,255,255,' + flick + ')'); g.addColorStop(0.5, lvCol(R, lv, 0.95 * flick)); g.addColorStop(1, lvCol(R, lv, 0.3 * flick)); c.fillStyle = g; c.beginPath(); c.arc(x, cy2, R2, 0, TAU); c.fill(); c.restore(); }
          for (let h = 0; h < 2; h++) { c.save(); c.translate(x, y + (h ? dn : -up)); c.rotate(h ? 0 : Math.sin(S.time * 30) * 0.015 * pr); c.beginPath(); c.rect(-s / 2, h ? 0 : -s / 2, s, s / 2); c.clip(); c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.restore(); }
        } else { c.save(); c.translate(x, y); c.shadowColor = glow; c.shadowBlur = 24 + 70 * pr; c.drawImage(sp.base, -s / 2, -s / 2, s, s); c.shadowBlur = 0; c.drawImage(sp.over, -s / 2, -s / 2, s, s); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = glow; c.shadowBlur = 16 + 30 * pr;
          if (R.method === 'tap') { c.strokeStyle = 'rgba(255,255,255,' + (0.9 * flick) + ')'; c.lineWidth = 2.5 + 3 * pr; for (const pts of R.cracks) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0] * r, q[1] * r) : c.moveTo(q[0] * r, q[1] * r))); c.stroke(); } c.strokeStyle = lvCol(R, lv, 0.8 * flick); c.lineWidth = 7 + 6 * pr; c.globalAlpha = 0.5; for (const pts of R.cracks) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0] * r, q[1] * r) : c.moveTo(q[0] * r, q[1] * r))); c.stroke(); } }
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
    function drawGraph() {
      gDirty = false; const r = gcv.getBoundingClientRect(); if (!r.width) return; const d = Math.min(2, window.devicePixelRatio || 1); gcv.width = Math.round(r.width * d); gcv.height = Math.round(r.height * d); const gk = r.width < 240 ? 0.7 : 1, c = gctx, w = r.width / gk, h = r.height / gk; c.setTransform(d * gk, 0, 0, d * gk, 0, 0); c.clearRect(0, 0, w, h);
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
    function frame(ts) { raf = requestAnimationFrame(frame); if (!root.isConnected) { cancelAnimationFrame(raf); return; } if (!cv.offsetParent) { lastT = ts; return; } const dt = Math.min(0.034, (ts - lastT) / 1000 || 0.016); lastT = ts; const want = Math.round(cvRect().width * Math.min(1.5, window.devicePixelRatio || 1)); if (Math.abs(want - cv.width) > 2) resize(); if (S.paused) { if (S.peek || dirty) draw(); return; } for (let k = 0; k < (S.auto || 1); k++) update(dt); draw(); drawPile(); if (gDirty) drawGraph(); }
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
