/* 포커레이드 시안 (관리자 전용·미공개). 화면·연출 확인용: 카드는 이 브라우저가 뽑고, 싱크칩은 시안용 가짜 잔고를 씀.
   점수 = 칩 합계 × 배수 합계 × 버스트 보정
   칩(니케별): 티어 9~1 · 돌파 별당 +1, 풀코강 +2(최대 +5) · 적정 사거리 +2(RL +1) · 우월코드 +2
   배수: 족보 1~8을 기업·우월코드에서 각각 계산해 더함 · 스트레이트 플러시 +5 · 꿈의 족보 +8 · 3버스트 우월코드 +2
   버스트 보정: 1·2·3버스트가 다 있으면 ×1, 아니면 ×0.8 */
(function () {
  'use strict';
  const EL = { 작: ['작열', '#ef4444', 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z'], 풍: ['풍압', '#3fd68b', 'M3 8h11a3 3 0 1 0-3-3h-2a1 1 0 1 1 1 1H3zm0 5h15a3 3 0 1 1-3 3h2a1 1 0 1 0-1-1H3zm3 5h6v2H6z'], 철: ['철갑', '#ffb02e', 'M12 2l8 4.5v9L12 20l-8-4.5v-9z'], 전: ['전격', '#c070ff', 'M13 2L4 14h6l-1 8 9-12h-6z'], 수: ['수냉', '#4da3ff', 'M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z'] };
  const CYC = ['작', '풍', '철', '전', '수']; /* 작열>풍압>철갑>전격>수냉>작열 */
  const supOf = (boss) => CYC[(CYC.indexOf(boss) + 4) % 5];
  const RNG = { NEAR: ['SG', 'SMG'], MID: ['AR', 'MG'], FAR: ['SR'] };
  const CO = { 엘리시온: '#4d8dff', 미실리스: '#ef4444', 테트라: '#f5b301', 필그림: '#d9dde3', 어브노멀: '#b05cff' };
  const TS = { SSS: 9, SS: 8, S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
  const HN = { 1: '하이카드', 2: '페어', 3: '투페어', 4: '트리플', 5: '스트레이트', 6: '풀하우스', 7: '포카드', 8: '플러시' };
  const HM = { '11111': 5, '2111': 2, '221': 3, '311': 4, '32': 6, '41': 7, '5': 8 };
  const BU = { 1: 'I', 2: 'II', 3: 'III', A: 'A' };
  /* 총기 아이콘: 검은 선, 하얀 육각형 안 가운데 */
  const WP = {
    AR: '<circle cx="12" cy="12" r="5.6"/><path d="M12 3.6v5M12 15.4v5M3.6 12h5M15.4 12h5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    SMG: '<circle cx="12" cy="12" r="7"/><path d="M12 5v6"/><circle cx="12" cy="13.6" r="1.5" fill="currentColor"/>',
    RL: '<path d="M8 5H5v14h3M16 5h3v14h-3"/><circle cx="12" cy="8.4" r="1.1" fill="currentColor"/><circle cx="12" cy="15.6" r="1.1" fill="currentColor"/><path d="M9.6 12h4.8"/>',
    SR: '<circle cx="12" cy="12" r="4.6"/><path d="M12 7.4v9.2M7.4 12h9.2"/><path d="M6.4 5.4a8.6 8.6 0 0 0 0 13.2M17.6 5.4a8.6 8.6 0 0 1 0 13.2"/>',
    MG: '<circle cx="12" cy="12" r="7.2"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/>',
    SG: '<circle cx="12" cy="12" r="7.2" stroke-dasharray="6.2 5.1" stroke-dashoffset="3.1"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const brkChip = (cnt) => Math.min(3, Math.max(0, cnt - 1)) + (cnt >= 11 ? 2 : 0);
  const BEST_K = 'dorosync-raid-sian';

  const CSS = `
#tab-raid .rd{display:grid;grid-template-columns:236px minmax(0,1fr);gap:0;border-radius:16px;overflow:hidden;border:3px solid #1d2a2a;background:#274b41;font-family:"Arial Black","Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#fff;user-select:none;-webkit-user-select:none;position:relative}
#tab-raid .rd *{box-sizing:border-box}
#tab-raid .rd-side{background:#2f3b40;border-right:3px solid #1d2a2a;padding:10px;display:flex;flex-direction:column;gap:9px;z-index:2}
#tab-raid .pn{background:#1e282c;border-radius:12px;padding:9px 10px;box-shadow:0 3px 0 #141b1e}
#tab-raid .rd-boss{background:#8a5a12;box-shadow:0 3px 0 #5a3a08;text-align:center}
#tab-raid .rd-bt{font-size:11px;letter-spacing:.14em;opacity:.85}
#tab-raid .rd-bn{display:flex;align-items:center;justify-content:center;gap:8px;font-size:21px;margin:4px 0 6px;text-shadow:0 2px 0 rgba(0,0,0,.35)}
#tab-raid .rd-bi{background:#1e282c;border-radius:9px;padding:7px 6px;font-size:12.5px;line-height:1.55;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
#tab-raid .rd-bi b{font-size:14px}
#tab-raid .rd-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
#tab-raid .rd-row b{font-size:19px;background:#2f3b40;border-radius:8px;padding:3px 10px;min-width:92px;text-align:right}
#tab-raid .rd-hn{font-size:15px;text-align:center;min-height:40px;display:flex;flex-direction:column;justify-content:center;line-height:1.3;text-shadow:0 2px 0 rgba(0,0,0,.4)}
#tab-raid .rd-hn small{font-size:11px;opacity:.75;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
#tab-raid .rd-cm{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;margin-top:6px}
#tab-raid .rd-cm b{display:block;border-radius:9px;padding:5px 8px;font-size:24px;line-height:1.1;box-shadow:0 3px 0 rgba(0,0,0,.35)}
#tab-raid .rd-chips{background:#0d8bf2;text-align:right}#tab-raid .rd-mult{background:#f0483c;text-align:left}
#tab-raid .rd-cm i{font-style:normal;font-size:20px;color:#f0483c}
#tab-raid .rd-bf{font-size:12px;text-align:center;margin-top:6px;min-height:17px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800}
#tab-raid .rd-bf.bad{color:#ff8a80}#tab-raid .rd-bf.ok{color:#8df0b0}
#tab-raid .rd-st{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#tab-raid .rd-st div{background:#1e282c;border-radius:10px;padding:6px;text-align:center;font-size:11px;box-shadow:0 3px 0 #141b1e}
#tab-raid .rd-st b{display:block;font-size:20px;line-height:1.2}
#tab-raid .rd-st .tr b{color:#4db5ff}#tab-raid .rd-st .rdw b{color:#ff6b5e}#tab-raid .rd-st .ch{grid-column:1/-1}#tab-raid .rd-st .ch b{color:#ffd24a}
#tab-raid .rd-sb{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto}
#tab-raid button.rb{border:0;border-radius:10px;padding:9px 8px;font:inherit;font-size:13px;color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.4);transition:transform .06s,filter .15s}
#tab-raid button.rb:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
#tab-raid button.rb:disabled{filter:grayscale(.8) brightness(.6);cursor:default}
#tab-raid .rb.red{background:#f0483c}#tab-raid .rb.blue{background:#0d8bf2}#tab-raid .rb.org{background:#f59a0c}#tab-raid .rb.grn{background:#35a36b}#tab-raid .rb.gry{background:#56646b}
#tab-raid .rd-main{position:relative;padding:12px 12px 10px;min-height:590px;display:flex;flex-direction:column;container-type:inline-size;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,#3f7a64 0,#2c5a4b 45%,#234539 100%)}
#tab-raid .rd-main:before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,.05),rgba(0,0,0,.08),rgba(255,255,255,.05),rgba(0,0,0,.08),rgba(255,255,255,.05));filter:blur(40px);animation:rdSwirl 38s linear infinite;pointer-events:none}
#tab-raid .rd-main:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.07) 0 1px,transparent 1px 3px);pointer-events:none;z-index:6}
@keyframes rdSwirl{to{transform:rotate(360deg)}}
#tab-raid .rd-play,#tab-raid .rd-hand{--cw:min(112px,12.6cqw);position:relative;display:flex;justify-content:center;z-index:2}
#tab-raid .rd-play{gap:calc(var(--cw)*.12);min-height:calc(var(--cw)*1.78 + 42px);align-items:flex-start;padding-top:22px;margin-top:4px;padding-bottom:calc(var(--cw)*.5)}
#tab-raid .rd-slot{width:var(--cw);aspect-ratio:9/16;border-radius:calc(var(--cw)*.08);border:2px dashed rgba(255,255,255,.16);background:rgba(0,0,0,.12)}
#tab-raid .rd-play.on .rd-slot{display:none}
#tab-raid .rd-msg{position:relative;z-index:3;text-align:center;font-size:14px;min-height:24px;margin:8px 0 6px;text-shadow:0 2px 0 rgba(0,0,0,.4);font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800}
#tab-raid .rd-hand{gap:calc(var(--cw)*.05);margin-top:auto;padding-top:26px;min-height:calc(var(--cw)*1.78 + 30px)}
#tab-raid .rd-hand.dim .rc{filter:brightness(.45) saturate(.6)}
#tab-raid .rd-ctl{position:relative;z-index:3;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:10px}
#tab-raid .rd-ctl .rb{min-width:104px;font-size:15px;padding:10px 12px}
#tab-raid .rd-sort{background:#1e282c;border-radius:10px;padding:5px 7px;display:flex;align-items:center;gap:5px;font-size:11px}
#tab-raid .rd-sort .rb{min-width:0;padding:6px 9px;font-size:12px}
#tab-raid .rd-flt{position:relative;z-index:3;margin:8px auto 0;max-width:640px;background:rgba(20,28,31,.85);border-radius:12px;padding:8px 10px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700;font-size:12px}
#tab-raid .rd-flt[hidden]{display:none}
#tab-raid .rd-fg{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:3px 0}
#tab-raid .rd-fg>span{width:54px;opacity:.75}
#tab-raid .rd-fg button{border:1px solid rgba(255,255,255,.2);background:none;color:#fff;border-radius:8px;padding:4px 8px;font:inherit;cursor:pointer}
#tab-raid .rd-fg button.on{background:#ffd24a;color:#1b1b1b;border-color:#ffd24a}
#tab-raid .rd-deck{position:absolute;right:14px;top:40px;z-index:1;width:54px;text-align:center;font-size:10.5px}
#tab-raid .rd-deck i{display:block;width:54px;aspect-ratio:9/16;border-radius:6px;border:2px solid #e9edf0;background:repeating-linear-gradient(45deg,#c33b34 0 5px,#a82d27 5px 10px);box-shadow:3px 3px 0 #7c1f1b,6px 6px 0 rgba(0,0,0,.25);margin-bottom:9px}
/* 카드 */
#tab-raid .rc{width:var(--cw);aspect-ratio:9/16;flex:none;position:relative;cursor:pointer;font-size:calc(var(--cw)/8.4);transition:transform .16s cubic-bezier(.3,1.5,.5,1);transform:translateY(var(--ty,0)) rotate(var(--rz,0deg));perspective:500px;z-index:1}
#tab-raid .rc.sel{--ty:-18%;z-index:2}
#tab-raid .rc-in{position:absolute;inset:0;border-radius:.75em;overflow:hidden;background:#20262b;border:.22em solid var(--cc,#888);box-shadow:0 .3em 0 rgba(0,0,0,.35),0 .5em .9em rgba(0,0,0,.35);transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .12s}
#tab-raid .rc.sel .rc-in{box-shadow:0 0 0 .18em #fff,0 .8em 1.1em rgba(0,0,0,.45)}
#tab-raid .rc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%;pointer-events:none}
#tab-raid .rc-ic{position:absolute;left:.3em;top:.35em;display:flex;flex-direction:column;gap:.18em;z-index:3}
#tab-raid .hx{width:1.9em;height:2.1em;display:grid;place-items:center;background:#fff;color:#16181b;clip-path:polygon(50% 0,96% 25%,96% 75%,50% 100%,4% 75%,4% 25%);font-size:1em;font-weight:900;font-family:Georgia,"Times New Roman",serif;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
#tab-raid .hx svg{width:1.35em;height:1.35em}
#tab-raid .hx.wp svg{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}
#tab-raid .hx.el{color:#fff}#tab-raid .hx.el svg{fill:currentColor}
#tab-raid .rc-tr{position:absolute;right:.3em;top:.35em;z-index:3;background:rgba(15,18,22,.85);border-radius:.4em;padding:.1em .4em;font-size:1em;line-height:1.3}
#tab-raid .rc-tr.t9{background:linear-gradient(135deg,#ff5d6c,#c42ed2)}#tab-raid .rc-tr.t8{background:#e7832b}#tab-raid .rc-tr.t7{background:#b8930f}
#tab-raid .rc-bt{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:1.6em .4em .35em;background:linear-gradient(transparent,rgba(8,10,12,.92) 45%);text-align:right;font-family:"Pretendard","Malgun Gothic",sans-serif}
#tab-raid .rc-co{display:block;font-size:.78em;font-weight:800;color:var(--cc);text-shadow:0 1px 2px #000}
#tab-raid .rc-st{display:flex;justify-content:flex-end;align-items:center;gap:.08em;font-size:1.05em;line-height:1;margin:.1em 0}
#tab-raid .rc-st s{text-decoration:none;color:#5b6168;-webkit-text-stroke:.5px #222}#tab-raid .rc-st s.on{color:#fbc72a}
#tab-raid .rc-st u{text-decoration:none;display:inline-grid;place-items:center;min-width:1.5em;height:1.5em;margin-left:.15em;border-radius:.35em;background:#c42ed2;font-size:.78em;font-weight:900;font-family:Arial,sans-serif}
#tab-raid .rc-nm{display:block;font-size:.92em;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tab-raid .rc-fx{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0}
#tab-raid .rc.foil .rc-fx{opacity:.5;background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.75) 34%,rgba(170,200,255,.35) 42%,transparent 54%,rgba(255,255,255,.5) 68%,transparent 80%) 0 0/250% 250%;mix-blend-mode:overlay;animation:rdFoil 3.2s linear infinite}
#tab-raid .rc.holo .rc-fx{opacity:.62;background:linear-gradient(115deg,#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f,#ffb84d) 0 0/300% 300%;mix-blend-mode:color-dodge;animation:rdFoil 4s linear infinite}
#tab-raid .rc.holo .rc-in{border-color:transparent;background:linear-gradient(#20262b,#20262b) padding-box,linear-gradient(135deg,#ff7aa8,#ffc76a,#f8f27a,#7af0b5,#7ac8ff,#c39aff) border-box}
@keyframes rdFoil{to{background-position:250% 250%}}
#tab-raid .rc-pop{position:absolute;left:50%;top:-1.5em;transform:translateX(-50%);z-index:5;font-size:1.9em;color:#4db5ff;text-shadow:0 2px 0 #06335c,0 0 8px rgba(0,0,0,.6);white-space:nowrap;pointer-events:none;animation:rdPop .7s cubic-bezier(.2,1.6,.4,1) both}
#tab-raid .rc-pop.m{color:#ff6b5e;text-shadow:0 2px 0 #5c0d06,0 0 8px rgba(0,0,0,.6)}
@keyframes rdPop{0%{transform:translate(-50%,60%) scale(.3);opacity:0}35%{transform:translate(-50%,0) scale(1.25);opacity:1}100%{transform:translate(-50%,-15%) scale(1);opacity:1}}
#tab-raid .rc-tg{position:absolute;left:-6%;right:-6%;top:calc(100% + .45em);display:flex;flex-wrap:wrap;justify-content:center;gap:.2em;font-size:.82em;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800;z-index:4}
#tab-raid .rc-tg span{background:#0d8bf2;border-radius:.4em;padding:.05em .35em;white-space:nowrap}
#tab-raid .rc-tg span.z{background:#3a464c;color:#9fb0b8}
#tab-raid .punch{animation:rdPunch .32s cubic-bezier(.2,1.8,.4,1)}
@keyframes rdPunch{0%{transform:scale(1)}40%{transform:scale(1.28) rotate(-3deg)}100%{transform:scale(1)}}
#tab-raid .rd.shake{animation:rdShake .5s}
@keyframes rdShake{10%,50%,90%{transform:translate(-5px,2px)}30%,70%{transform:translate(5px,-2px)}}
#tab-raid .rd-fin{position:absolute;inset:0;z-index:8;display:grid;place-items:center;background:rgba(10,16,18,.72);animation:rdFade .25s}
#tab-raid .rd-fin[hidden]{display:none}
@keyframes rdFade{from{opacity:0}}
#tab-raid .rd-finb{text-align:center;padding:18px 26px;border-radius:18px;background:#1e282c;border:3px solid #ffd24a;box-shadow:0 8px 0 rgba(0,0,0,.4);animation:rdPunch .4s cubic-bezier(.2,1.8,.4,1);max-width:92%}
#tab-raid .rd-finb h3{margin:0;font-size:14px;letter-spacing:.1em;color:#ffd24a}
#tab-raid .rd-fs{font-size:54px;line-height:1.15;text-shadow:0 4px 0 #7a2a00;color:#ffb347}
#tab-raid .rd-fs small{font-size:22px}
#tab-raid .rd-fd{font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700;font-size:13px;opacity:.9;margin:4px 0 12px;line-height:1.6}
#tab-raid .rd-finb .rb{margin:0 4px;min-width:110px;font-size:14px}
#tab-raid .rd-rule{position:absolute;inset:0;z-index:9;display:grid;place-items:center;background:rgba(10,16,18,.8);padding:12px}
#tab-raid .rd-rule[hidden]{display:none}
#tab-raid .rd-rb{background:#1e282c;border-radius:16px;padding:14px 16px;max-width:560px;width:100%;max-height:100%;overflow:auto;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600;font-size:13px;line-height:1.6}
#tab-raid .rd-rb h3{margin:0 0 6px;font-size:16px}#tab-raid .rd-rb h4{margin:10px 0 2px;font-size:13px;color:#ffd24a}
#tab-raid .rd-rb table{width:100%;border-collapse:collapse}#tab-raid .rd-rb td{padding:2px 6px;border-bottom:1px solid rgba(255,255,255,.08)}#tab-raid .rd-rb td:last-child{text-align:right;color:#ff8a80;font-weight:900}
#tab-raid .rd-tag{position:absolute;left:10px;top:8px;z-index:7;font-size:10px;letter-spacing:.08em;background:rgba(0,0,0,.45);border-radius:6px;padding:2px 7px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
@media(max-width:820px){
#tab-raid .rd{grid-template-columns:1fr}
#tab-raid .rd-side{border-right:0;border-bottom:3px solid #1d2a2a;display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:8px}
#tab-raid .rd-bn{font-size:17px;margin:2px 0 4px}#tab-raid .rd-bi{font-size:11.5px;padding:5px 4px}
#tab-raid .rd-best{grid-column:1/-1;order:5}#tab-raid .rd-st{grid-column:1/-1;grid-template-columns:1fr 1fr 1.4fr;order:6}#tab-raid .rd-st .ch{grid-column:auto}
#tab-raid .rd-sb{grid-column:1/-1;grid-template-columns:repeat(4,1fr);order:7}#tab-raid .rd-sb .rb{font-size:11.5px;padding:8px 4px}
#tab-raid .rd-cm b{font-size:20px}#tab-raid .rd-hn{font-size:13px;min-height:36px}
#tab-raid .rd-main{min-height:0;padding:8px 6px 10px}
#tab-raid .rd-play,#tab-raid .rd-hand{--cw:13.4cqw}
#tab-raid .rd-play{--cw:17cqw;gap:1.6cqw}
#tab-raid .rd-hand{gap:.6cqw}
#tab-raid .rd-deck{display:none}
#tab-raid .rd-ctl .rb{min-width:86px}
#tab-raid .rd-fs{font-size:40px}
}
@media(prefers-reduced-motion:reduce){#tab-raid .rd-main:before,#tab-raid .rc-fx{animation:none!important}}
`;

  let root = null, S = null, uid = 0, busy = false;
  const $ = (q) => root.querySelector(q), $$ = (q) => Array.from(root.querySelectorAll(q));
  const data = () => (window.doroRaidData ? window.doroRaidData() : { ok: false, list: [] });
  const best = () => { try { return +localStorage.getItem(BEST_K) || 0; } catch (e) { return 0; } };

  function testCnt() { const u = Math.random(); return u < 0.3 ? 1 : u < 0.5 ? 2 + Math.floor(Math.random() * 2) : u < 0.7 ? 4 : u < 0.88 ? 5 + Math.floor(Math.random() * 6) : 11; }
  function buildDeck(mode) {
    const L = data().list, own = L.filter((x) => x.cnt > 0);
    const src = mode === 'mine' ? own : L;
    const deck = src.map((x) => ({ id: ++uid, n: x.n, c: x.c, e: x.e, w: x.w, b: x.b, t: x.t, tv: TS[x.t] || 1, img: x.img, cnt: mode === 'mine' ? x.cnt : testCnt() }));
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    return { deck, total: L.length, own: own.length };
  }
  function hand5(vals) { const m = {}; vals.forEach((v) => { m[v] = (m[v] || 0) + 1; }); return HM[Object.values(m).sort((a, b) => b - a).join('')] || 1; }
  function evalSquad(D, boss) {
    const sp = supOf(boss.e); let chips = 0;
    const cards = D.map((x) => {
      const r = RNG[boss.r].includes(x.w) ? 2 : x.w === 'RL' ? 1 : 0, e = x.e === sp ? 2 : 0, k = brkChip(x.cnt), v = x.tv + k + r + e;
      chips += v; return { v, parts: [['티어 ' + x.t, x.tv], ['돌파', k], [x.w === 'RL' ? 'RL' : '사거리', r], ['코드', e]] };
    });
    const hc = hand5(D.map((x) => x.c)), he = hand5(D.map((x) => x.e));
    const steps = [{ l: '기업 ' + HN[hc], v: hc }, { l: '우월코드 ' + HN[he], v: he }];
    if (hc === 8 && he === 5) steps.push({ l: '스트레이트 플러시!', v: 5 });
    if (hc === 5 && he === 8) steps.push({ l: '꿈의 족보!!', v: 8 });
    if (D.some((x) => (x.b === 3 || x.b === 'A') && x.e === sp)) steps.push({ l: '3버스트 우월코드', v: 2 });
    const mult = steps.reduce((a, s) => a + s.v, 0);
    const bs = new Set(D.map((x) => x.b)), n123 = [1, 2, 3].filter((b) => bs.has(b)).length, full = n123 === 3 || (bs.has('A') && n123 >= 2);
    const f = full ? 1 : 0.8;
    return { cards, chips, hc, he, steps, mult, f, score: Math.round(chips * mult * f) };
  }
  function cardHtml(x) {
    const el = EL[x.e], g = Math.min(3, Math.max(0, x.cnt - 1)), core = Math.max(0, x.cnt - 4);
    let st = ''; for (let i = 0; i < 3; i++) st += '<s' + (i < g ? ' class="on"' : '') + '>★</s>';
    return '<div class="rc' + (x.cnt >= 11 ? ' holo' : x.cnt >= 4 ? ' foil' : '') + '" data-id="' + x.id + '" style="--cc:' + (CO[x.c] || '#888') + '"><div class="rc-in">' +
      (x.img ? '<img alt="" src="' + esc(x.img) + '" onerror="this.remove()">' : '') +
      '<div class="rc-ic"><span class="hx el" style="background:' + el[1] + '" title="' + el[0] + '"><svg viewBox="0 0 24 24"><path d="' + el[2] + '"/></svg></span><span class="hx wp" title="' + x.w + '"><svg viewBox="0 0 24 24">' + (WP[x.w] || '') + '</svg></span><span class="hx" title="버스트">' + (BU[x.b] || '') + '</span></div>' +
      '<div class="rc-tr t' + x.tv + '">' + esc(x.t) + '</div><div class="rc-fx"></div>' +
      '<div class="rc-bt"><span class="rc-co">' + esc(x.c) + '</span><span class="rc-st">' + st + (core ? '<u>' + String(core).padStart(2, '0') + '</u>' : '') + '</span><b class="rc-nm">' + esc(x.n) + '</b></div></div></div>';
  }
  const sortHand = () => { const k = S.sort; S.hand.sort((a, b) => (k === 'c' ? a.c.localeCompare(b.c) || a.e.localeCompare(b.e) : a.e.localeCompare(b.e) || a.c.localeCompare(b.c)) || b.tv - a.tv); };
  const cardEl = (id) => root.querySelector('.rc[data-id="' + id + '"]');
  /* FLIP: 카드가 제자리로 미끄러져 감 */
  function flip(mutate) {
    const before = {}; $$('.rc').forEach((e) => { before[e.dataset.id] = e.getBoundingClientRect(); });
    mutate();
    $$('.rc').forEach((e) => { const o = before[e.dataset.id]; if (!o) return; const n = e.getBoundingClientRect(), dx = o.left - n.left, dy = o.top - n.top, sc = o.width / n.width;
      if (Math.abs(dx) + Math.abs(dy) < 1 && Math.abs(sc - 1) < 0.01) return;
      e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,1.35,.5,1)' }); });
  }
  function renderHand(newIds) {
    const h = $('.rd-hand'); h.innerHTML = S.hand.map(cardHtml).join('');
    S.hand.forEach((x, i) => { const e = cardEl(x.id); e.style.setProperty('--rz', ((i - (S.hand.length - 1) / 2) * 1.2).toFixed(1) + 'deg'); if (S.sel.has(x.id)) e.classList.add('sel'); });
    if (newIds && newIds.length) { const dk = $('.rd-deck i'), dr = dk && dk.offsetParent ? dk.getBoundingClientRect() : null;
      newIds.forEach((id, i) => { const e = cardEl(id); if (!e) return; const r = e.getBoundingClientRect(), dx = dr ? dr.left - r.left : 260, dy = dr ? dr.top - r.top : 120;
        e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(25deg) scale(.5)', opacity: 0 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(25deg) scale(.5)', opacity: 1, offset: 0.01 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: i * 75, easing: 'cubic-bezier(.25,1.3,.45,1)', fill: 'backwards' }); }); }
  }
  function fltCost() { const n = Object.values(S.flt).filter(Boolean).length; return n ? 100 * Math.pow(2, n - 1) : 0; }
  function fltMatch(x) { const f = S.flt; return (!f.e || x.e === f.e) && (!f.c || x.c === f.c) && (!f.b || String(x.b) === f.b || x.b === 'A') && (!f.r || RNG[f.r].includes(x.w)); }
  function ui() {
    const n = S.sel.size, cost = fltCost(), sp = supOf(S.boss.e);
    $('.rd-best b').textContent = fmt(best()) + '억';
    $('.rd-st .tr b').textContent = (S.tries + (S.phase === 'done' ? 0 : 1)) + '/3';
    $('.rd-st .rdw b').textContent = S.redraws;
    $('.rd-st .ch b').textContent = fmt(S.chips);
    $('.rd-deck span').textContent = S.deck.length + '/' + S.deckN;
    const go = $('[data-r=go]'), dc = $('[data-r=disc]');
    go.disabled = busy || S.phase !== 'pick' || n !== 5;
    dc.disabled = busy || S.phase !== 'pick' || n < 1 || S.redraws < 1 || cost > S.chips || S.deck.length < n;
    dc.innerHTML = '버리기' + (cost ? ' <small>−' + fmt(cost) + '칩</small>' : '');
    $$('.rd-sort .rb').forEach((b) => { b.classList.toggle('org', b.dataset.s === S.sort); b.classList.toggle('gry', b.dataset.s !== S.sort); });
    $$('.rd-fg button').forEach((b) => b.classList.toggle('on', S.flt[b.dataset.k] === b.dataset.v));
    $('.rd-fc').textContent = cost ? '조건 ' + Object.values(S.flt).filter(Boolean).length + '개 · 싱크칩 ' + fmt(cost) + '개 (조건마다 2배)' : '조건을 고르면 그 조건에 맞는 니케만 새로 받습니다. 조건 1개 100칩, 추가할 때마다 2배.';
    if (S.phase !== 'pick') return;
    const hn = $('.rd-hn'), bf = $('.rd-bf'); bf.className = 'rd-bf'; bf.textContent = '';
    if (n === 5) { const r = evalSquad(S.hand.filter((x) => S.sel.has(x.id)), S.boss);
      hn.innerHTML = r.steps.slice(2).length && r.steps[2].v >= 5 ? esc(r.steps[2].l) + '<small>' + esc(r.steps[0].l + ' + ' + r.steps[1].l) + '</small>' : esc(r.steps[0].l) + '<small>+ ' + esc(r.steps[1].l) + '</small>';
      $('.rd-chips').textContent = '?'; $('.rd-mult').textContent = r.mult;
      bf.textContent = r.f < 1 ? '버스트 단계 누락 ×0.8' : '버스트 1·2·3 완비'; bf.classList.add(r.f < 1 ? 'bad' : 'ok');
      $('.rd-msg').textContent = '출격하면 니케별 칩이 공개됩니다.';
    } else { hn.innerHTML = '스쿼드 선택 ' + n + '/5<small>카드를 눌러 고르세요</small>'; $('.rd-chips').textContent = '0'; $('.rd-mult').textContent = '0';
      $('.rd-msg').textContent = S.redraws > 0 ? '5명을 골라 출격하거나, 1~5장을 골라 버리고 새로 받으세요. (우월코드 ' + EL[sp][0] + ' · ' + S.boss.r + ')' : '리드로우를 다 썼습니다. 5명을 골라 출격하세요.'; }
  }
  function deal(resetBoss) {
    if (resetBoss || !S.boss) { S.boss = { e: CYC[Math.floor(Math.random() * 5)], r: ['NEAR', 'MID', 'FAR'][Math.floor(Math.random() * 3)] }; S.tries = 0; }
    const B = buildDeck(S.mode);
    S.deck = B.deck; S.deckN = B.deck.length; S.sel = new Set(); S.phase = 'pick';
    S.redraws = S.mode === 'mine' ? 2 + Math.floor((B.total ? B.own / B.total : 0) * 4) : 3;
    S.hand = S.deck.splice(0, 7); sortHand();
    const sp = supOf(S.boss.e), be = EL[S.boss.e], se = EL[sp];
    $('.rd-bn').innerHTML = '<span class="hx el" style="background:' + be[1] + ';font-size:15px"><svg viewBox="0 0 24 24"><path d="' + be[2] + '"/></svg></span>' + be[0] + ' 보스';
    $('.rd-bi').innerHTML = '우월코드 <b style="color:' + se[1] + '">' + se[0] + '</b><br>적정 사거리 <b>' + S.boss.r + '</b> <small>(' + RNG[S.boss.r].join('·') + ')</small>';
    $('.rd-play').classList.remove('on'); $('.rd-play').innerHTML = '<div class="rd-slot"></div>'.repeat(5);
    $('.rd-hand').classList.remove('dim'); $('.rd-fin').hidden = true;
    $('[data-r=mode]').textContent = S.mode === 'mine' ? '덱: 내 도감' : '덱: 테스트';
    if (S.hand.length < 7) { $('.rd-hand').innerHTML = ''; S.phase = 'empty'; ui(); $('.rd-hn').innerHTML = '덱이 부족합니다<small>도감 SSR 7명 이상 필요</small>'; $('.rd-msg').textContent = '내 도감에 SSR 카드가 7장 이상 있어야 합니다. 도감 탭에서 카드를 늘리거나 테스트 덱으로 바꿔 주세요.'; return; }
    renderHand(S.hand.map((x) => x.id)); ui();
  }
  async function discard() {
    const ids = S.hand.filter((x) => S.sel.has(x.id)).map((x) => x.id), cost = fltCost(); if (!ids.length) return;
    busy = true; ui(); S.chips -= cost; S.redraws--;
    ids.forEach((id, i) => { const e = cardEl(id); if (e) e.animate([{ transform: 'translateY(-18%)', opacity: 1 }, { transform: 'translate(' + (140 + i * 20) + 'px,-160%) rotate(' + (25 + i * 8) + 'deg)', opacity: 0 }], { duration: 300, delay: i * 45, easing: 'ease-in', fill: 'forwards' }); });
    await sleep(320 + ids.length * 45);
    S.hand = S.hand.filter((x) => !S.sel.has(x.id)); S.sel.clear();
    const got = [];
    for (let k = 0; k < ids.length; k++) { let i = cost ? S.deck.findIndex(fltMatch) : 0; if (i < 0) i = 0; if (!S.deck.length) break; got.push(S.deck.splice(i, 1)[0]); }
    S.hand = S.hand.concat(got); sortHand();
    S.flt = { e: '', c: '', b: '', r: '' };
    renderHand(got.map((x) => x.id)); await sleep(380 + got.length * 75);
    busy = false; ui();
  }
  function countTo(el, from, to, ms, suf) { const t0 = performance.now(); return new Promise((res) => { (function f(t) { const p = Math.min(1, (t - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - p, 3)); el.textContent = fmt(v) + (suf || ''); if (p < 1) requestAnimationFrame(f); else res(); })(t0); }); }
  const punch = (el) => { el.classList.remove('punch'); void el.offsetWidth; el.classList.add('punch'); };
  const pop = (card, txt, m) => { const p = document.createElement('div'); p.className = 'rc-pop' + (m ? ' m' : ''); p.textContent = txt; card.appendChild(p); setTimeout(() => p.remove(), 900); };
  async function play() {
    const D = S.hand.filter((x) => S.sel.has(x.id)); if (D.length !== 5) return;
    busy = true; S.phase = 'score'; ui();
    const R = evalSquad(D, S.boss), pl = $('.rd-play'), hn = $('.rd-hn'), cb = $('.rd-chips'), mb = $('.rd-mult'), bf = $('.rd-bf'), msg = $('.rd-msg');
    flip(() => { pl.classList.add('on'); D.forEach((x) => { const e = cardEl(x.id); e.classList.remove('sel'); e.style.setProperty('--rz', '0deg'); pl.appendChild(e); }); $('.rd-hand').classList.add('dim'); });
    hn.innerHTML = '출격!'; cb.textContent = '0'; mb.textContent = '0'; bf.textContent = ''; bf.className = 'rd-bf'; msg.textContent = '';
    await sleep(520);
    let chips = 0, mult = 0;
    for (let i = 0; i < D.length; i++) { /* 니케별 칩 */
      const e = cardEl(D[i].id), c = R.cards[i];
      e.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-9%) scale(1.09) rotate(' + (i % 2 ? 3 : -3) + 'deg)' }, { transform: 'translateY(0) scale(1)' }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      pop(e, '+' + c.v);
      const tg = document.createElement('div'); tg.className = 'rc-tg'; tg.innerHTML = c.parts.map((p, k) => '<span class="' + (p[1] ? '' : 'z') + '">' + esc(p[0]) + (k ? ' +' + p[1] : '') + '</span>').join(''); e.appendChild(tg);
      msg.textContent = D[i].n + '  +' + c.v + '칩';
      chips += c.v; cb.textContent = chips; punch(cb);
      await sleep(430);
    }
    await sleep(250);
    for (const s of R.steps) { /* 족보 배수 */
      const big = s.v >= 5 && (s.l.indexOf('!') >= 0 || s.v === 8);
      hn.innerHTML = esc(s.l) + '<small>배수 +' + s.v + '</small>'; punch(hn); msg.textContent = s.l + '  배수 +' + s.v;
      $$('.rd-play .rc').forEach((e, i) => e.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + (big ? 1.12 : 1.05) + ') translateY(-5%)' }, { transform: 'scale(1)' }], { duration: 280, delay: i * 30 }));
      mult += s.v; mb.textContent = mult; punch(mb);
      if (big) { root.querySelector('.rd').classList.remove('shake'); void root.offsetWidth; root.querySelector('.rd').classList.add('shake'); }
      await sleep(big ? 900 : 620);
    }
    bf.textContent = R.f < 1 ? '버스트 단계 누락 ×0.8' : '버스트 1·2·3 완비 ×1'; bf.classList.add(R.f < 1 ? 'bad' : 'ok'); punch(bf);
    await sleep(600);
    hn.innerHTML = fmt(chips) + ' × ' + mult + (R.f < 1 ? ' × 0.8' : ''); punch(hn); punch(cb); punch(mb);
    await sleep(500);
    const prev = best(), nb = R.score > prev; if (nb) { try { localStorage.setItem(BEST_K, String(R.score)); } catch (e) { /* 무시 */ } }
    S.tries++; S.phase = 'done';
    const fin = $('.rd-fin'); fin.hidden = false;
    $('.rd-finb h3').textContent = nb ? 'NEW BEST!' : 'RAID SCORE';
    $('.rd-fd').innerHTML = esc(R.steps.map((s) => s.l.replace(/!+$/, '')).join(' · ')) + '<br>칩 ' + fmt(chips) + ' × 배수 ' + mult + (R.f < 1 ? ' × 0.8' : '') + ' · 오늘 도전 ' + S.tries + '/3';
    $('[data-r=again]').hidden = S.tries >= 3;
    const rd = root.querySelector('.rd'); rd.classList.remove('shake'); void rd.offsetWidth; rd.classList.add('shake');
    await countTo($('.rd-fs b'), 0, R.score, Math.min(1600, 500 + R.score), '');
    busy = false; ui();
  }
  function onClick(ev) {
    const t = ev.target;
    const rb = t.closest('[data-r]');
    if (rb) { const a = rb.dataset.r;
      if (a === 'rule') { $('.rd-rule').hidden = false; return; }
      if (a === 'rulex') { $('.rd-rule').hidden = true; return; }
      if (busy) return;
      if (a === 'go') play(); else if (a === 'disc') discard();
      else if (a === 'again') deal(false); else if (a === 'boss') deal(true);
      else if (a === 'mode') { S.mode = S.mode === 'mine' ? 'test' : 'mine'; deal(false); }
      else if (a === 'flt') { const f = $('.rd-flt'); f.hidden = !f.hidden; if (f.hidden) { S.flt = { e: '', c: '', b: '', r: '' }; } ui(); }
      else if (a === 'chips') { S.chips = 10000; ui(); }
      return; }
    if (t.closest('.rd-rule') && !t.closest('.rd-rb')) { $('.rd-rule').hidden = true; return; }
    if (busy) return;
    const sb = t.closest('[data-s]'); if (sb && S.phase === 'pick') { S.sort = sb.dataset.s; flip(() => { sortHand(); const h = $('.rd-hand'); S.hand.forEach((x, i) => { const e = cardEl(x.id); e.style.setProperty('--rz', ((i - 3) * 1.2).toFixed(1) + 'deg'); h.appendChild(e); }); }); ui(); return; }
    const fb = t.closest('.rd-fg button'); if (fb) { const k = fb.dataset.k; S.flt[k] = S.flt[k] === fb.dataset.v ? '' : fb.dataset.v; ui(); return; }
    const c = t.closest('.rd-hand .rc'); if (c && S.phase === 'pick') { const id = +c.dataset.id;
      if (S.sel.has(id)) { S.sel.delete(id); c.classList.remove('sel'); } else if (S.sel.size < 5) { S.sel.add(id); c.classList.add('sel'); } else { c.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 }); }
      ui(); }
  }
  function onMove(ev) { /* 마우스를 따라 카드가 살짝 기울어짐 */
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    const c = ev.target.closest && ev.target.closest('.rc'); $$('.rc').forEach((e) => { if (e !== c) { e.style.removeProperty('--rx'); e.style.removeProperty('--ry'); } });
    if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--ry', (((ev.clientX - r.left) / r.width - 0.5) * 22).toFixed(1) + 'deg'); c.style.setProperty('--rx', ((0.5 - (ev.clientY - r.top) / r.height) * 16).toFixed(1) + 'deg');
  }
  function build() {
    if (!document.getElementById('raid-css')) { const st = document.createElement('style'); st.id = 'raid-css'; st.textContent = CSS; document.head.appendChild(st); }
    const fg = (lab, k, arr) => '<div class="rd-fg"><span>' + lab + '</span>' + arr.map((v) => '<button type="button" data-k="' + k + '" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';
    root.innerHTML = '<div class="rd"><aside class="rd-side">' +
      '<div class="pn rd-boss"><div class="rd-bt">POKER RAID · 시안</div><div class="rd-bn"></div><div class="rd-bi"></div></div>' +
      '<div class="pn rd-hp"><div class="rd-hn"></div><div class="rd-cm"><b class="rd-chips">0</b><i>×</i><b class="rd-mult">0</b></div><div class="rd-bf"></div></div>' +
      '<div class="pn rd-row rd-best"><span>최고 점수</span><b>0</b></div>' +
      '<div class="rd-st"><div class="tr">도전<b>1/3</b></div><div class="rdw">리드로우<b>3</b></div><div class="ch" data-r="chips" title="누르면 시안용 칩을 다시 채움">싱크칩 (시안용)<b>0</b></div></div>' +
      '<div class="rd-sb"><button type="button" class="rb org" data-r="rule">족보표</button><button type="button" class="rb grn" data-r="boss">새 보스</button><button type="button" class="rb gry" data-r="mode" style="grid-column:span 2">덱: 테스트</button></div>' +
      '</aside><main class="rd-main"><span class="rd-tag">관리자 전용 · 시안</span>' +
      '<div class="rd-play"></div><div class="rd-msg"></div><div class="rd-hand"></div>' +
      '<div class="rd-ctl"><button type="button" class="rb blue" data-r="go">출격</button><div class="rd-sort"><span>정렬</span><button type="button" class="rb org" data-s="c">기업</button><button type="button" class="rb gry" data-s="e">코드</button></div><button type="button" class="rb red" data-r="disc">버리기</button><button type="button" class="rb gry" data-r="flt" style="min-width:0;font-size:12px">지정 드로우</button></div>' +
      '<div class="rd-flt" hidden>' + fg('우월코드', 'e', CYC.map((k) => [k, EL[k][0]])) + fg('기업', 'c', Object.keys(CO).map((k) => [k, k])) + fg('버스트', 'b', [['1', 'I'], ['2', 'II'], ['3', 'III']]) + fg('사거리', 'r', [['NEAR', 'NEAR'], ['MID', 'MID'], ['FAR', 'FAR']]) + '<div class="rd-fc" style="opacity:.8;margin-top:4px"></div></div>' +
      '<div class="rd-deck"><i></i><span></span></div>' +
      '<div class="rd-fin" hidden><div class="rd-finb"><h3>RAID SCORE</h3><div class="rd-fs"><b>0</b><small>억</small></div><div class="rd-fd"></div><button type="button" class="rb blue" data-r="again">다시 도전</button><button type="button" class="rb grn" data-r="boss">새 보스</button></div></div>' +
      '<div class="rd-rule" hidden><div class="rd-rb"><h3>포커레이드 규칙</h3>점수 = <b style="color:#4db5ff">칩 합계</b> × <b style="color:#ff6b5e">배수 합계</b> × 버스트 보정' +
      '<h4>칩 (니케 1명당)</h4><table><tr><td>티어</td><td>SSS 9 · SS 8 · S 7 · A 6 · B 5 · C 4 · D 3 · E 2 · F 1</td></tr><tr><td>돌파</td><td>별 1개당 +1 · 풀코강 +2</td></tr><tr><td>적정 사거리</td><td>+2 (RL은 항상 +1)</td></tr><tr><td>우월코드</td><td>+2</td></tr></table>' +
      '<h4>배수 (기업·우월코드에서 각각 계산해 더함)</h4><table>' + [1, 2, 3, 4, 5, 6, 7, 8].map((k) => '<tr><td>' + HN[k] + (k === 5 ? ' (5종 모두 다름)' : k === 8 ? ' (5명 모두 같음)' : '') + '</td><td>+' + k + '</td></tr>').join('') +
      '<tr><td>스트레이트 플러시 (기업 플러시 + 코드 스트레이트)</td><td>+5</td></tr><tr><td>꿈의 족보 (코드 플러시 + 기업 스트레이트)</td><td>+8</td></tr><tr><td>3버스트 니케가 우월코드</td><td>+2</td></tr></table>' +
      '<h4>버스트 보정</h4>1·2·3버스트가 모두 있으면 ×1, 하나라도 빠지면 ×0.8<h4>우월코드</h4>작열 › 풍압 › 철갑 › 전격 › 수냉 › 작열 (철갑 보스에겐 풍압이 우월)' +
      '<div style="text-align:center;margin-top:12px"><button type="button" class="rb gry" data-r="rulex">닫기</button></div></div></div>' +
      '</main></div>';
    root.addEventListener('click', onClick); root.addEventListener('pointermove', onMove);
  }
  window.doroRaid = {
    mount(el) {
      if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; }
      if (!d.list.length) { setTimeout(() => window.doroRaid.mount(el), 400); return; } /* 데이터 로딩 대기 */
      if (root === el && S) return;
      root = el; S = { mode: 'test', boss: null, deck: [], hand: [], sel: new Set(), redraws: 3, tries: 0, phase: 'pick', chips: 10000, sort: 'c', flt: { e: '', c: '', b: '', r: '' } };
      build(); deal(true);
    },
    _eval: evalSquad
  };
})();
