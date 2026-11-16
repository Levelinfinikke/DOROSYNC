/* 포커레이드 (관리자 전용·미공개)
   점수 = 칩 합계 × 배수 합계 × 버스트 보정
   칩(니케별): 티어 9~1 · 돌파 별당 +1, 풀코강 +2(최대 +5) · 적정 사거리 +2(RL +1) · 우월코드 +2(3버스트 니케는 +5)
   배수: 족보 1~8을 기업·우월코드에서 각각 계산해 더함 · 스트레이트 플러시(한쪽 플러시 + 다른 쪽 스트레이트) 13
   버스트 보정: 1·2·3버스트가 다 있으면 ×1, 아니면 ×0.8
   모드: 테스트 덱·내 도감 덱(이 브라우저가 카드를 뽑는 연습) / 실전(서버가 카드를 뽑고 점수·랭킹을 기록: server/dorosync-worker.js /raid) */
(function () {
  'use strict';
  const WORKER = 'https://dorosync.bomullee88.workers.dev';
  const ELN = { 작: '작열', 풍: '풍압', 철: '철갑', 전: '전격', 수: '수냉' };
  const CYC = ['작', '풍', '철', '전', '수']; /* 작열>풍압>철갑>전격>수냉>작열 */
  const supOf = (boss) => CYC[(CYC.indexOf(boss) + 4) % 5];
  const RNG = { NEAR: ['SG', 'SMG'], MID: ['AR', 'MG'], FAR: ['SR'] };
  const COS = ['엘리시온', '미실리스', '테트라', '필그림', '어브노멀'], COL = { 엘리시온: 'E', 미실리스: 'M', 테트라: 'T', 필그림: 'P', 어브노멀: 'A' };
  const TS = { SSS: 9, SS: 8, S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
  const HN = { 0: '-', 1: '하이카드', 2: '페어', 3: '투페어', 4: '트리플', 5: '스트레이트', 6: '풀하우스', 7: '포카드', 8: '플러시' };
  const BU = { 1: 'I', 2: 'II', 3: 'III', A: 'A' };
  const BACK = 'assets/img/raid-back.webp', BOSS_IMG = 'assets/img/raid-boss-1.webp', BOSS_NM = '승리의 여신', BOSS0 = { e: '풍', r: 'NEAR' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), slow = (ms) => sleep(ms * SLOW);
  const brkChip = (cnt) => Math.min(3, Math.max(0, cnt - 1)) + (cnt >= 11 ? 2 : 0);
  const BEST_K = 'dorosync-raid-sian', SND_K = 'dorosync-raid-snd';
  const SETS = [['5130', '5131'], ['5172', '5173'], ['5008', '5009'], ['5140', '5013'], ['5180', '5179']]; /* 세트 니케: 둘 다 편성하면 배수 +2 (서버와 같게) */
  const SLOW = 1 / 0.7; /* 정산 속도 */
  /* 효과음: 파일 없이 브라우저에서 바로 만듦. 칩이 오를수록 음이 높아짐 */
  let AC = null, sndOn = true; try { sndOn = localStorage.getItem(SND_K) !== '0'; } catch (e) { /* 무시 */ }
  const ac = () => { if (!sndOn) return null; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  function tone(f, dur, type, vol, f2, at) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); }
  function noise(dur, vol, at, lp) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp || 1800; src.buffer = b; g.gain.value = vol || 0.15; src.connect(fl); fl.connect(g); g.connect(c.destination); src.start(t); }
  const sfx = {
    deal: (i) => noise(0.05, 0.1, (i || 0) * 0.08, 3500), sel: () => tone(740, 0.06, 'triangle', 0.07), unsel: () => tone(520, 0.06, 'triangle', 0.06), put: () => { tone(300, 0.09, 'square', 0.05, 180); noise(0.04, 0.08, 0, 2500); },
    disc: () => tone(420, 0.16, 'triangle', 0.06, 160), go: () => { tone(196, 0.5, 'sawtooth', 0.07, 392); tone(294, 0.5, 'triangle', 0.06, 588); },
    chip: (i) => { const f = 440 * Math.pow(1.0595, Math.min(36, i)); tone(f, 0.09, 'square', 0.045); tone(f * 2, 0.07, 'triangle', 0.04); },
    mult: (i) => { const f = 330 * Math.pow(1.122, i); tone(f, 0.3, 'sawtooth', 0.06); tone(f * 1.5, 0.34, 'triangle', 0.07, 0, 0.05); tone(f * 2, 0.4, 'triangle', 0.06, 0, 0.1); },
    bad: () => tone(200, 0.35, 'sawtooth', 0.07, 90), ok: () => { tone(660, 0.12, 'triangle', 0.07); tone(990, 0.2, 'triangle', 0.07, 0, 0.1); },
    whoosh: () => noise(0.22, 0.06, 0, 900), hit: (k) => { noise(0.16 + 0.2 * k, 0.16 + 0.3 * k, 0, 700 + 900 * k); tone(150, 0.22 + 0.25 * k, 'sine', 0.2 + 0.3 * k, 42); tone(880 + 700 * k, 0.1, 'square', 0.03 + 0.04 * k); },
    fin: (nb) => (nb ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]).forEach((f, i) => { tone(f, 0.3, 'triangle', 0.09, 0, i * 0.1); tone(f / 2, 0.3, 'square', 0.03, 0, i * 0.1); })
  };
  const data = () => (window.doroRaidData ? window.doroRaidData() : { ok: false, list: [] });
  const acct = () => window.doroAccount || null;

  const CSS = `
/* ---- 카드 (포커레이드·도감 공용) ---- */
.pk{width:var(--cw);aspect-ratio:9/16;flex:none;position:relative;font-size:calc(var(--cw)/8.4);perspective:520px;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
.pk *{box-sizing:border-box}
.pk-in{position:absolute;inset:0;border-radius:.75em;overflow:hidden;background:#1a1e22;border:.24em solid var(--ec,#888);box-shadow:0 .3em 0 rgba(0,0,0,.35),0 .5em .9em rgba(0,0,0,.35);transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(var(--hs,1));transition:transform .12s,box-shadow .12s}
.pk-gl{position:absolute;inset:0;z-index:7;pointer-events:none;opacity:var(--go,0);background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.38),rgba(255,255,255,0) 55%);transition:opacity .15s}
.pk-pt{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%;pointer-events:none}
.pk-fx{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;display:none}
.pk.foil .pk-fx,.pk.poly .pk-fx{display:block}
.pk-fx:before{content:"";position:absolute;left:-150%;width:400%;top:-60%;height:220%;transform:rotate(24deg) translateX(0);animation:pkFx 3.6s linear infinite;will-change:transform}
.pk.foil .pk-fx{mix-blend-mode:overlay;opacity:.75}
.pk.foil .pk-fx:before{background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.85) 5%,rgba(190,215,255,.4) 8%,rgba(255,255,255,0) 13%,rgba(255,255,255,.45) 18%,rgba(255,255,255,0) 22%,rgba(255,255,255,0) 25%)}
.pk.poly .pk-fx{mix-blend-mode:color-dodge;opacity:.6}
.pk.poly .pk-fx:before{animation-duration:5s;background:repeating-linear-gradient(90deg,#ff5d8f 0,#ffb84d 4.17%,#f6f05a 8.33%,#5ef0a0 12.5%,#5ab8ff 16.67%,#b07aff 20.83%,#ff5d8f 25%)}
@keyframes pkFx{to{transform:rotate(24deg) translateX(-25%)}}
.pk-co{position:absolute;left:-.55em;bottom:-.5em;width:6.2em;height:6.2em;z-index:0;opacity:.42;pointer-events:none}
.pk-bt>.pk-lb,.pk-bt>.pk-nm{position:relative;z-index:1}
.pk-co img,.pk-co svg{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 .25em rgba(0,0,0,.7))}
.pk-ic{position:absolute;left:.28em;top:.3em;display:flex;flex-direction:column;align-items:center;gap:.14em;z-index:4;width:2em}
.pk-t{min-width:2em;text-align:center;border-radius:.35em;padding:.05em .2em;font-size:.95em;line-height:1.25;font-weight:900;color:#16181b;font-family:Arial,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.5)}
.pk-el{width:1.95em;height:auto;display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
.pk-hx{width:1.9em;height:2.1em;display:grid;place-items:center;background:#fff;color:#16181b;clip-path:polygon(50% 0,96% 25%,96% 75%,50% 100%,4% 75%,4% 25%);font-weight:900;font-family:Georgia,"Times New Roman",serif;font-size:1em}
.pk-hx img{width:1.42em;height:1.42em;display:block}
.pk-hw{filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
.pk-el.hl{animation:pkHl 1s ease-in-out infinite alternate;transform:scale(1.16)}
.pk-hw.hl .pk-hx{background:#ffd24a}.pk-hw.hl{animation:pkHl2 1s ease-in-out infinite alternate;transform:scale(1.12)}
.pk-hw.hl2 .pk-hx{background:#ffeeb5}.pk-hw.hl2{filter:drop-shadow(0 0 .2em #ffd24a)}
@keyframes pkHl{from{filter:drop-shadow(0 0 .12em var(--ec)) drop-shadow(0 0 .2em var(--ec))}to{filter:drop-shadow(0 0 .3em var(--ec)) drop-shadow(0 0 .65em var(--ec))}}
@keyframes pkHl2{from{filter:drop-shadow(0 0 .12em #ffd24a)}to{filter:drop-shadow(0 0 .3em #ffd24a) drop-shadow(0 0 .6em #ffb300)}}
.pk-sc{position:absolute;right:.3em;top:.3em;z-index:4;min-width:2.3em;display:flex;flex-direction:column;align-items:center;background:var(--tc,#0d8bf2);color:#15171a;border-radius:.5em;padding:.12em .25em .14em;line-height:1;font-weight:900;font-family:"Arial Black",Arial,sans-serif;box-shadow:0 .16em 0 rgba(0,0,0,.5),inset 0 0 0 .08em rgba(255,255,255,.45)}
.pk-sc b{font-size:1.5em}.pk-sc i{font-style:normal;font-size:.78em;margin-top:.12em;padding:.1em .3em 0;border-top:.1em solid rgba(0,0,0,.4);letter-spacing:.02em}
.pk-bt{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:1.8em .4em .35em;background:linear-gradient(transparent,rgba(8,10,12,.9) 50%);text-align:right}
.pk-lb{height:1.5em;width:auto;display:block;margin:0 0 .12em auto}
.pk-nm{display:block;font-size:.92em;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-bk{position:absolute;inset:0;z-index:9;border-radius:.75em;overflow:hidden;background:#111 url(${BACK}) center/cover;border:.2em solid #2c3136;transform:scaleX(-1)}
.pk-pop{position:absolute;left:50%;top:-1.2em;transform:translateX(-50%);z-index:12;font-size:1.3em;font-family:"Arial Black",Arial,sans-serif;color:#4db5ff;text-shadow:0 2px 0 #06335c,0 0 8px rgba(0,0,0,.6);white-space:nowrap;pointer-events:none;animation:pkPop .7s cubic-bezier(.2,1.6,.4,1) both}
@keyframes pkPop{0%{transform:translate(-50%,80%) scale(.3);opacity:0}25%{transform:translate(-50%,0) scale(1.3);opacity:1}70%{transform:translate(-50%,-70%) scale(1);opacity:1}100%{transform:translate(-50%,-150%) scale(.9);opacity:0}}
.pk-pop.big{font-size:1.7em;color:#ffd24a;text-shadow:0 2px 0 #6b4a00,0 0 10px rgba(0,0,0,.7)}
.pk-tg{position:absolute;left:0;right:0;bottom:0;z-index:6;display:flex;flex-wrap:wrap;justify-content:center;gap:.15em;padding:.3em .15em;background:rgba(8,10,12,.88);font-size:.8em;font-weight:800}
.pk-tg span{background:#0d8bf2;border-radius:.35em;padding:0 .3em;white-space:nowrap}
.pk-ghost{position:fixed;z-index:10050;pointer-events:none;margin:0}
/* ---- 게임 화면 ---- */
.rd{display:grid;grid-template-columns:236px minmax(0,1fr);border-radius:16px;overflow:hidden;border:3px solid #14161a;background:#15171b;font-family:"Arial Black","Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#fff;user-select:none;-webkit-user-select:none;position:relative}
.rd[hidden]{display:none}
.rd *{box-sizing:border-box}
.rd-side{background:#23262d;border-right:3px solid #14161a;padding:10px;display:flex;flex-direction:column;gap:8px;z-index:2;min-height:0}
.rd .pn{background:#16191e;border-radius:12px;padding:8px 10px;box-shadow:0 3px 0 #0c0e11}
.rd-boss{background:linear-gradient(160deg,#5b4a86,#3a2f5c)!important;box-shadow:0 3px 0 #231b3a!important;text-align:center}
.rd-bn{display:flex;align-items:center;justify-content:center;gap:8px;font-size:20px;margin:3px 0 5px;text-shadow:0 2px 0 rgba(0,0,0,.35)}
.rd-bn img{width:26px;height:auto}
.rd-bi{background:#16191e;border-radius:9px;padding:6px;font-size:12.5px;line-height:1.5;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.rd-bi b{font-size:14px}
.rd-hn{font-size:14px;text-align:center;min-height:44px;display:flex;flex-direction:column;justify-content:center;gap:2px;line-height:1.25;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.rd-hl{display:inline-flex;align-items:center;justify-content:center;gap:3px;flex-wrap:wrap}.rd-hl em{font-style:normal;margin-left:3px}.rd-hi{width:19px;height:19px;object-fit:contain}.rd-hl.dim{opacity:.55}
.rd-hn small{font-size:11px;opacity:.78;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.rd-cm{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;margin-top:5px}
.rd-cm b{display:block;border-radius:9px;padding:4px 8px;font-size:23px;line-height:1.1;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.rd-chips{background:#0d8bf2;text-align:right}.rd-mult{background:#f0483c;text-align:left}
.rd-cm i{font-style:normal;font-size:20px;color:#f0483c}
.rd-ex{display:flex;justify-content:space-between;align-items:baseline;margin-top:7px;font-size:11px}
.rd-ex b{font-size:22px;color:#ffb347;text-shadow:0 2px 0 #5a2a00}
.rd-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
.rd-row b{font-size:17px;background:#23262d;border-radius:8px;padding:2px 10px;min-width:86px;text-align:right}
.rd-st{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.rd-st div{background:#16191e;border-radius:10px;padding:5px;text-align:center;font-size:11px;box-shadow:0 3px 0 #0c0e11}
.rd-st .ch{display:grid;place-items:center;cursor:pointer}.rd-st .ch b{display:flex;align-items:center;justify-content:center;gap:5px}.rd-st .ch b svg,.rd-ctl .rb svg{width:18px;height:18px;flex:none}.rd-ctl .rb svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px}
.rd-st b{display:block;font-size:19px;line-height:1.2}
.rd-st .tr b{color:#4db5ff}.rd-st .rdw b{color:#ff6b5e}.rd-st .ch{grid-column:1/-1}.rd-st .ch b{color:#ffd24a}
.rd-sb{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
.rd button.rb{border:0;border-radius:10px;padding:8px;font:inherit;font-size:13px;color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.4);transition:transform .06s,filter .15s}
.rd button.rb[hidden]{display:none}
.rd button.rb:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
.rd button.rb:disabled{filter:grayscale(.8) brightness(.6);cursor:default}
.rd .rb.red{background:#f0483c}.rd .rb.blue{background:#0d8bf2}.rd .rb.org{background:#f59a0c}.rd .rb.grn{background:#35a36b}.rd .rb.gry{background:#56646b}.rd .rb.pur{background:#8a56d6}
.rd-main{position:relative;padding:12px 12px 10px;min-height:600px;display:flex;flex-direction:column;overflow:hidden;background:#0e1013}
.rd-bg{position:absolute;inset:0;z-index:0;background:url(${BOSS_IMG}) 50% 12%/cover;transform-origin:50% 30%}
.rd-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(14,16,20,.38),rgba(14,16,20,.5) 50%,rgba(14,16,20,.93) 82%)}
.rd-main.atk .rd-bg:after{background:linear-gradient(rgba(14,16,20,.12),rgba(14,16,20,.3) 50%,rgba(14,16,20,.93) 85%);transition:background .4s}
.rd-bg.hit{animation:rdHit .34s}
@keyframes rdHit{0%{transform:scale(1);filter:none}20%{transform:scale(calc(1 + .07*var(--hk,1))) translate(calc(8px*var(--hk,1)),calc(-5px*var(--hk,1)));filter:brightness(calc(1.2 + 1.3*var(--hk,1))) saturate(1.5)}50%{transform:scale(calc(1 + .04*var(--hk,1))) translate(calc(-6px*var(--hk,1)),calc(4px*var(--hk,1)));filter:brightness(1.3)}100%{transform:scale(1);filter:none}}
.rd-tgt{position:absolute;left:50%;top:27%;width:1px;height:1px;z-index:1}
.rd-burst{position:absolute;left:50%;top:27%;width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;z-index:4;pointer-events:none;background:radial-gradient(circle,#fff 0,rgba(255,210,74,.9) 22%,rgba(255,90,40,.55) 45%,rgba(255,90,40,0) 70%);animation:rdBurst .42s ease-out forwards}
@keyframes rdBurst{0%{transform:scale(.1);opacity:1}100%{transform:scale(calc(.5 + 1.6*var(--hk,1)));opacity:0}}
.rd-dmg{position:absolute;z-index:9;pointer-events:none;font-size:34px;color:#ffb347;text-shadow:0 3px 0 #7a2a00,0 0 12px rgba(0,0,0,.8);white-space:nowrap;animation:rdDmg 1s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes rdDmg{0%{transform:translate(-50%,-50%) scale(.2) rotate(-8deg);opacity:0}18%{transform:translate(-50%,-50%) scale(1.35) rotate(4deg);opacity:1}60%{transform:translate(-50%,-110%) scale(1);opacity:1}100%{transform:translate(-50%,-170%) scale(.9);opacity:0}}
.rd-ban{position:absolute;left:50%;top:30%;z-index:9;pointer-events:none;text-align:center;white-space:nowrap;animation:rdBan .9s cubic-bezier(.2,1.5,.4,1) forwards}
.rd-ban b{display:block;font-size:30px;text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 14px rgba(0,0,0,.8)}.rd-ban i{display:inline-block;font-style:normal;font-size:20px;margin-top:4px;padding:2px 12px;border-radius:9px;background:#f0483c;box-shadow:0 3px 0 rgba(0,0,0,.4)}
.rd-ban.c i{background:#0d8bf2}.rd-ban.bad i{background:#56646b}.rd-ban.big b{font-size:42px;color:#ffd24a}
@keyframes rdBan{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}20%{transform:translate(-50%,-50%) scale(1.15);opacity:1}75%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-80%) scale(.95);opacity:0}}
.rd-total{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:5;text-align:center;font-size:11px;letter-spacing:.12em;padding:4px 18px 6px;border-radius:14px;background:rgba(12,14,18,.6);pointer-events:none;opacity:0;transition:opacity .3s}
.rd-main.atk .rd-total{opacity:1}.rd-total b{display:block;font-size:40px;line-height:1.1;color:#ffb347;text-shadow:0 4px 0 #7a2a00,0 0 16px rgba(0,0,0,.8);letter-spacing:0}
.rd-main:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.07) 0 1px,transparent 1px 3px);pointer-events:none;z-index:6}
.rd-play,.rd-hand{position:relative;display:flex;justify-content:center;z-index:2}
.rd-play{gap:calc(var(--cw)*.12);padding-top:calc(var(--cw)*.2);min-height:calc(var(--cw)*1.98)}
.rd-slot{width:var(--cw);aspect-ratio:9/16;border-radius:calc(var(--cw)*.08);border:2px dashed rgba(255,255,255,.3);background:rgba(10,12,16,.38);flex:none;display:grid;place-items:center;font-size:calc(var(--cw)*.26);color:rgba(255,255,255,.22);font-family:"Arial Black",Arial,sans-serif;text-align:center}
.rd-play.over .rd-slot{border-color:#ffd24a;background:rgba(255,210,74,.12)}
.rd-msg{position:relative;z-index:3;align-self:center;text-align:center;font-size:13.5px;min-height:20px;margin:6px 0 2px;padding:2px 14px;border-radius:99px;background:rgba(12,14,18,.72)}
.rd-msg:empty{visibility:hidden}.rd-msg.bad{color:#ff8a80;background:rgba(60,12,10,.85)}.rd-msg.ok{color:#8df0b0}
.rd-msg{text-shadow:0 2px 0 rgba(0,0,0,.4);font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800}
.rd-hand{gap:calc(var(--cw)*.05);margin-top:auto;padding-top:calc(var(--cw)*.36);min-height:calc(var(--cw)*2.14)}
.rd .pk{cursor:grab;touch-action:none;transition:transform .16s cubic-bezier(.3,1.5,.5,1);transform:translateY(var(--ty,0)) rotate(var(--rz,0deg));z-index:1}
.rd .pk.sel{--ty:-18%;z-index:2}
.rd .pk.sel .pk-in{box-shadow:0 0 0 .18em #fff,0 .8em 1.1em rgba(0,0,0,.45)}
.rd .pk:hover{z-index:3}
.rd .pk.drag{opacity:.25}
.rd-ctl{position:relative;z-index:3;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:8px}
.rd-ctl .rb{min-width:100px;font-size:15px;padding:9px 12px}
.rd-ctl .rb small{font-size:11px}
.rd-sort{background:#16191e;border-radius:10px;padding:4px 6px;display:flex;align-items:center;gap:5px;font-size:11px}
.rd-sort .rb{min-width:0!important;padding:6px 9px!important;font-size:12px!important}
.rd-flt{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);z-index:7;width:min(660px,96%);background:rgba(18,20,25,.97);border:2px solid #ffd24a;border-radius:12px;padding:8px 10px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700;font-size:12px}
.rd-flt[hidden]{display:none}
.rd-fg{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:3px 0}
.rd-fgs{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}.rd-fg{gap:4px!important}
.rd-fg button{border:2px solid transparent;background:rgba(255,255,255,.07);color:#fff;border-radius:10px;padding:3px 5px;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:2px;font-size:13px;line-height:1}
.rd-fg button.on{border-color:#ffd24a;background:rgba(255,210,74,.28);box-shadow:0 0 8px rgba(255,210,74,.5)}
.rd-fg button small{font-size:10px;color:#ffd24a;margin-left:1px}
.rd-fg .fe{width:26px;height:auto;display:block}.rd-fg .pk-hx{font-size:13px}.rd-fg .fc{background:#2b3038}.rd-fg .fc img{width:1.3em;height:1.3em;object-fit:contain}
.rd-fg .fw{display:inline-flex;gap:1px;background:#fff;border-radius:7px;padding:2px 4px}.rd-fg .fw img{width:20px;height:20px}
.rd-pool{margin-top:6px;border-top:1px solid rgba(255,255,255,.12);padding-top:5px}.rd-ph{display:flex;justify-content:space-between;font-size:11.5px;opacity:.9;margin-bottom:4px}.rd-ph b{color:#ffd24a}
.rd-pl{display:flex;gap:4px;overflow-x:auto;padding:2px 0 6px;--cw:46px}.rd-pl .pk{cursor:default;touch-action:auto;transform:none}.rd-pl .pk-nm{display:none}
.rd-deck{position:relative;flex:none;align-self:center;z-index:1;width:calc(var(--cw)*.8);margin-left:calc(var(--cw)*.22);text-align:center;font-size:10.5px}
.rd-main.atk .rd-deck{display:none}
.rd-deck i{display:block;width:100%;aspect-ratio:9/16;border-radius:6px;border:2px solid #2c3136;background:#111 url(${BACK}) center/cover;box-shadow:3px 3px 0 #0c0e10,6px 6px 0 rgba(0,0,0,.3);margin-bottom:9px}
.rd-tag{display:none;position:absolute;left:10px;top:8px;z-index:7;font-size:10px;letter-spacing:.06em;background:rgba(0,0,0,.45);border-radius:6px;padding:2px 7px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.rd-x{position:absolute;right:8px;top:6px;z-index:9;width:30px;height:30px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:15px;cursor:pointer;display:none}
.rd.fs .rd-x{display:block}
.rd .punch{animation:rdPunch .32s cubic-bezier(.2,1.8,.4,1)}
@keyframes rdPunch{0%{transform:scale(1)}40%{transform:scale(1.28) rotate(-3deg)}100%{transform:scale(1)}}
.rd-main.shake{animation:rdShake .5s}
@keyframes rdShake{10%,50%,90%{transform:translate(calc(var(--sk,5px)*-1),calc(var(--sk,5px)*.4))}30%,70%{transform:translate(var(--sk,5px),calc(var(--sk,5px)*-.4))}}
.rd-ov{position:absolute;inset:0;z-index:8;display:grid;place-items:center;background:rgba(10,16,18,.72);animation:rdFade .25s;padding:10px}
.rd-ov[hidden]{display:none}
@keyframes rdFade{from{opacity:0}}
.rd-box{text-align:center;padding:16px 24px;border-radius:18px;background:#16191e;border:3px solid #ffd24a;box-shadow:0 8px 0 rgba(0,0,0,.4);animation:rdPunch .4s cubic-bezier(.2,1.8,.4,1);max-width:94%}
.rd-box h3{margin:0;font-size:14px;letter-spacing:.1em;color:#ffd24a}
.rd-fs{font-size:52px;line-height:1.15;text-shadow:0 4px 0 #7a2a00;color:#ffb347}
.rd-fs small{font-size:22px}
.rd-fd{font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700;font-size:13px;opacity:.92;margin:4px 0 12px;line-height:1.6}
.rd-rkl{font-size:17px;color:#fff;margin:-2px 0 4px}.rd-rkl:empty{display:none}.rd-rkl b{color:#ffd24a;font-size:22px}
.rd-fh{display:inline-flex;align-items:center;gap:4px;margin:2px 5px;padding:2px 9px;border-radius:9px;background:#23262d}.rd-fh>b{color:#ff6b5e}
.rd-box .rb{margin:3px 4px;min-width:110px;font-size:14px}
.rd-modal{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:rgba(10,16,18,.82);padding:10px}
.rd-modal[hidden]{display:none}
.rd-mb{background:#16191e;border-radius:16px;padding:12px 14px;max-width:640px;width:100%;max-height:100%;overflow:auto;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600;font-size:13px;line-height:1.6}
.rd-mb h3{margin:0 0 6px;font-size:16px}.rd-mb h4{margin:10px 0 2px;font-size:13px;color:#ffd24a}
.rd-mb table{width:100%;border-collapse:collapse}.rd-mb td{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.12)}.rd-mb td:last-child{text-align:right;font-weight:900;white-space:nowrap}
.rd-eq{text-align:center;font-size:15px;margin:2px 0 8px}.rd-eq b{display:inline-block;border-radius:7px;padding:1px 9px;margin:0 2px}.rd-eq .c{background:#0d8bf2}.rd-eq .m{background:#f0483c}.rd-eq .f{background:#56646b}
.rd-rg{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:560px){.rd-rg{grid-template-columns:1fr}}
.rd-w{border-radius:12px;padding:8px 10px 6px}.rd-w h4{margin:0 0 4px!important;color:#fff!important;font-size:14px!important}
.rd-w.c{background:#0b5fa8;box-shadow:0 3px 0 #06365f}.rd-w.m{background:#a52c24;box-shadow:0 3px 0 #5c1611}.rd-w.f{background:#3a444a;box-shadow:0 3px 0 #1f2529;grid-column:1/-1}
.rd-help li{margin:3px 0}.rd-help ol{margin:6px 0 0;padding-left:20px}
.rd-rk{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.08)}
.rd-rk.me{background:rgba(255,210,74,.12);border-radius:10px}
.rd-rk>b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#23262d;font-size:14px;border:3px solid #56646b}
.rd-rk.f1>b{border-color:#ffd24a;box-shadow:0 0 8px #ffd24a}.rd-rk.f2>b{border-color:#cfd6dc}
.rd-rk .nm{font-weight:900;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rd-rk .dk{display:flex;gap:3px;margin-top:3px;--cw:40px}
.rd-rk .dk .pk{cursor:default;touch-action:auto;transform:none}
.rd-rk .sc{text-align:right;font-size:18px;font-weight:900;color:#ffb347}.rd-rk .sc small{display:block;font-size:11px;color:#9fb0b8;font-weight:700}
.rd-launch{position:relative;overflow:hidden;border-radius:16px;min-height:440px;color:#fff;background:#0e1013 url(${BOSS_IMG}) 50% 8%/cover;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:16px 10px 20px;text-align:center;font-family:"Arial Black","Pretendard","Malgun Gothic",sans-serif}
.rd-launch[hidden]{display:none}
.rd-launch:before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(14,16,20,.15),rgba(14,16,20,.45) 45%,rgba(14,16,20,.95))}
.rd-launch>*{position:relative}
.rd-lt{font-size:26px;letter-spacing:.04em;text-shadow:0 3px 0 rgba(0,0,0,.6)}.rd-lt small{display:block;font-size:12px;opacity:.85;letter-spacing:.2em}
.rd-lc{display:flex;justify-content:center;--cw:17.5vw;margin:14px 0 4px}.rd-lc .pk{margin:0 -1.2vw;pointer-events:none}
.rd-lc .pk:nth-child(1){transform:rotate(-10deg) translateY(8%)}.rd-lc .pk:nth-child(2){transform:rotate(-5deg) translateY(2%)}.rd-lc .pk:nth-child(4){transform:rotate(5deg) translateY(2%)}.rd-lc .pk:nth-child(5){transform:rotate(10deg) translateY(8%)}
.rd-go{width:96px;height:96px;border-radius:50%;border:4px solid #fff;background:radial-gradient(circle at 35% 30%,#4db5ff,#0d6fd0);color:#fff;font-size:40px;line-height:1;padding-left:8px;margin-top:-34px;box-shadow:0 6px 0 #06365f,0 0 26px rgba(77,181,255,.7);animation:rdGo 1.4s ease-in-out infinite;cursor:pointer}
@keyframes rdGo{50%{transform:scale(1.08);box-shadow:0 6px 0 #06365f,0 0 40px rgba(77,181,255,1)}}
.rd-lp{font-size:12px;margin-top:8px;opacity:.85;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
/* 가로 전체 화면(모바일) */
.rd.fs{position:fixed;left:0;top:0;z-index:9990;border-radius:0;border:0;grid-template-columns:168px minmax(0,1fr)}
.rd.fs.rot{transform-origin:0 0;transform:rotate(90deg) translateY(-100%)}
.rd.fs .rd-side{padding:6px;gap:5px;overflow-y:auto}
.rd.fs .pn{padding:5px 7px;border-radius:9px}
.rd.fs .rd-bn{font-size:15px;margin:0 0 3px}.rd.fs .rd-bn img{width:20px}
.rd.fs .rd-bi{font-size:10.5px;padding:3px;line-height:1.4}.rd.fs .rd-bi b{font-size:12px}
.rd.fs .rd-cm b{font-size:17px;padding:3px 6px}.rd.fs .rd-cm i{font-size:15px}
.rd.fs .rd-ex{margin-top:4px;font-size:10px}.rd.fs .rd-ex b{font-size:17px}
.rd.fs .rd-row{font-size:10px}.rd.fs .rd-row b{font-size:13px;min-width:66px}
.rd.fs .rd-st{grid-template-columns:1fr 1fr 1.3fr;gap:4px}.rd.fs .rd-st .ch{grid-column:auto}
.rd.fs .rd-st div{font-size:9px;padding:3px 2px;border-radius:7px}.rd.fs .rd-st b{font-size:13px}
.rd.fs .rd-sb{gap:4px}.rd.fs .rd-sb .rb{font-size:10.5px;padding:6px 2px;border-radius:7px}
.rd.fs .rd-main{min-height:0;padding:6px 8px 6px}
.rd.fs .rd-msg{font-size:11px;min-height:16px;margin:2px 0 0}
.rd.fs .rd-ctl{margin-top:4px;gap:6px}.rd.fs .rd-ctl .rb{font-size:13px;padding:7px 10px;min-width:78px}
.rd.fs .rd-deck{font-size:8.5px}
.rd.fs .rd-pl{--cw:36px}.rd.fs .rd-fg .fe{width:21px}.rd.fs .rd-fg .pk-hx{font-size:10.5px}.rd.fs .rd-fg .fw img{width:15px;height:15px}.rd.fs .rd-hi{width:15px;height:15px}.rd.fs .rd-hn{font-size:11px;min-height:34px}
.rd.fs .rd-tag{display:none}
.rd.fs .rd-flt{bottom:46px;font-size:11px}
.rd.fs .rd-fs{font-size:38px}
.rd.fs .rd-total b{font-size:26px}.rd.fs .rd-total{top:4px;font-size:9px}.rd.fs .rd-dmg{font-size:24px}.rd.fs .rd-ban b{font-size:22px}.rd.fs .rd-ban.big b{font-size:30px}.rd.fs .rd-ban i{font-size:15px}.rd.fs .rd-st .ch b svg{width:13px;height:13px}
@media(prefers-reduced-motion:reduce){.pk-fx:before,.pk-el.hl,.pk-hw.hl{animation:none!important}}
`;

  let root = null, S = null, busy = false, DB = {}, els = {}, drag = null, L = { deck: [] };
  const $ = (q) => root.querySelector(q), $$ = (q) => Array.from(root.querySelectorAll(q));
  const best = () => { try { return +localStorage.getItem(BEST_K) || 0; } catch (e) { return 0; } };
  const isMobile = () => Math.min(window.innerWidth, window.innerHeight) < 600;
  const rd = () => root.querySelector('.rd');
  const addCss = () => { if (!document.getElementById('raid-css')) { const st = document.createElement('style'); st.id = 'raid-css'; st.textContent = CSS; document.head.appendChild(st); } };

  /* ---------- 점수 ---------- */
  function handRank(vals) {
    const n = vals.length; if (!n) return 0; const m = {}; vals.forEach((v) => { m[v] = (m[v] || 0) + 1; });
    const c = Object.values(m).sort((a, b) => b - a), a = c[0], b = c[1] || 0;
    if (a === 5) return 8; if (a === 4) return 7; if (a === 3 && b === 2) return 6; if (a === 3) return 4; if (a === 2 && b === 2) return 3; if (a === 2) return 2; return n === 5 ? 5 : 1;
  }
  const icoOf = (key, v) => { const d = data(), src = key === 'c' ? d.coIco && d.coIco[v] : d.elIco && d.elIco[v]; return src ? '<img class="rd-hi" alt="' + esc(key === 'c' ? v : ELN[v] || v) + '" title="' + esc(key === 'c' ? v : ELN[v] || v) + '" src="' + esc(src) + '">' : ''; };
  function handHtml(D, key, rank) { /* 족보를 이루는 기업·우월코드 아이콘 + 족보 이름 */
    const m = {}; D.forEach((x) => { m[x[key]] = (m[x[key]] || 0) + 1; }); let vs = Object.keys(m).sort((a, b) => m[b] - m[a]); if (rank !== 5 && rank !== 1) vs = vs.filter((v) => m[v] >= 2);
    return '<span class="rd-hl' + (rank === 1 ? ' dim' : '') + '">' + vs.map((v) => icoOf(key, v)).join('') + '<em>' + HN[rank] + '</em></span>';
  }
  function evalSquad(D, boss) { /* 1~5장: 5장 미만이면 그때까지의 족보(스트레이트·플러시는 5장부터) */
    const sp = supOf(boss.e); let chips = 0;
    const cards = D.map((x) => {
      const r = RNG[boss.r].includes(x.w) ? 2 : x.w === 'RL' ? 1 : 0, e = x.e === sp ? (x.b === 3 || x.b === 'A' ? 5 : 2) : 0, k = brkChip(x.cnt), v = x.tv + k + r + e;
      chips += v; return { v, parts: [['티어 ' + x.t, x.tv], ['돌파', k], [x.w === 'RL' ? '사거리(RL)' : '적정 사거리', r], [e === 5 ? '3버스트 우월코드' : '우월코드', e]] };
    });
    const hc = handRank(D.map((x) => x.c)), he = handRank(D.map((x) => x.e));
    const steps = (hc === 8 && he === 5) || (hc === 5 && he === 8) ? [{ l: '스트레이트 플러시!', v: 13, big: 1, h: '<span class="rd-hl"><em style="color:#ffd24a">스트레이트 플러시</em></span>' }] : [{ l: '기업 ' + HN[hc], v: hc, h: handHtml(D, 'c', hc) }, { l: '우월코드 ' + HN[he], v: he, h: handHtml(D, 'e', he) }];
    SETS.forEach((p) => { const a = D.find((x) => x.code === p[0]), b = D.find((x) => x.code === p[1]); if (a && b) steps.push({ l: '세트 니케', v: 2, h: '<span class="rd-hl"><em style="color:#8df0b0">세트</em> <small>' + esc(a.n.split(' : ')[0]) + ' + ' + esc(b.n.split(' : ')[0]) + '</small></span>' }); });
    const mult = D.length ? steps.reduce((a, s) => a + s.v, 0) : 0;
    const bs = new Set(D.map((x) => x.b)), n123 = [1, 2, 3].filter((b) => bs.has(b)).length, full = n123 === 3 || (bs.has('A') && n123 >= 2);
    const f = D.length === 5 && !full ? 0.8 : 1;
    return { cards, chips, hc, he, steps, mult, f, n: D.length, score: Math.round(chips * mult * f) };
  }

  /* ---------- 카드 ---------- */
  const coSvg = (c) => '<svg viewBox="0 0 48 48"><path d="M24 2l19 11v22L24 46 5 35V13z" fill="none" stroke="#fff" stroke-width="3"/><text x="24" y="33" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="25" fill="#fff">' + (COL[c] || '?') + '</text></svg>';
  function cardHtml(x, boss) {
    const d = data(), ec = (d.elCol && d.elCol[x.e] && d.elCol[x.e][1]) || '#888', cnt = x.cnt || 0, g = Math.min(3, Math.max(0, cnt - 1)), core = Math.max(0, Math.min(7, cnt - 4));
    const tv = TS[x.t] || 0, sp = boss ? supOf(boss.e) : '', inR = boss ? (RNG[boss.r].includes(x.w) ? ' hl' : x.w === 'RL' ? ' hl2' : '') : '';
    return '<div class="pk' + (cnt >= 11 ? ' poly' : cnt >= 4 ? ' foil' : '') + '" data-id="' + esc(x.id || x.code || x.n) + '" style="--ec:' + ec + '"><div class="pk-in">' +
      (x.img ? '<img class="pk-pt" alt="" loading="lazy" src="' + esc(x.img) + '" onerror="this.remove()">' : '') + '<div class="pk-fx"></div>' +
      '<div class="pk-gl"></div>' +
      '<div class="pk-ic">' + (d.elIco && d.elIco[x.e] ? '<img class="pk-el' + (sp && x.e === sp ? ' hl' : '') + '" alt="' + (ELN[x.e] || '') + '" title="' + (ELN[x.e] || '') + '" src="' + d.elIco[x.e] + '">' : '') +
      '<span class="pk-hw' + inR + '" title="' + esc(x.w) + '"><span class="pk-hx"><img alt="' + esc(x.w) + '" src="assets/img/wp-' + esc(x.w) + '.png"></span></span>' +
      '<span class="pk-hw" title="버스트"><span class="pk-hx">' + (BU[x.b] || '') + '</span></span></div>' +
      (tv ? '<div class="pk-sc" style="--tc:' + ((d.tierCol && d.tierCol[x.t]) || '#ccc') + '" title="티어 ' + tv + ' + 돌파 ' + brkChip(cnt) + '"><b>' + (tv + brkChip(cnt)) + '</b><i>' + esc(x.t) + '</i></div>' : '') +
      '<div class="pk-bt">' + '<div class="pk-co" title="' + esc(x.c) + '">' + (d.coIco && d.coIco[x.c] ? '<img alt="" src="' + esc(d.coIco[x.c]) + '">' : coSvg(x.c)) + '</div>' + (cnt && d.lb ? '<img class="pk-lb" alt="" src="' + d.lb(g, core) + '">' : '') + '<b class="pk-nm">' + esc(x.n) + '</b></div></div></div>';
  }
  const elOf = (id) => { if (!els[id]) { const t = document.createElement('div'); t.innerHTML = cardHtml(S.cards[id], S.boss); els[id] = t.firstChild; } return els[id]; };
  const C = (ids) => ids.map((id) => S.cards[id]);
  const sqIds = () => S.squad.filter(Boolean), EMPTY = () => [null, null, null, null, null];
  const picks = () => sqIds().concat(S.hand.filter((id) => S.sel.has(id)));
  const sortHand = () => { const k = S.sort, o = (c) => COS.indexOf(c); S.hand.sort((p, q) => { const a = S.cards[p], b = S.cards[q]; return (k === 'c' ? o(a.c) - o(b.c) || CYC.indexOf(a.e) - CYC.indexOf(b.e) : CYC.indexOf(a.e) - CYC.indexOf(b.e) || o(a.c) - o(b.c)) || b.tv - a.tv; }); };
  /* 화면이 90도 돌아가 있으면(세로로 든 휴대폰) 화면 좌표의 이동량을 게임 좌표로 바꿈 */
  const loc = (dx, dy) => (rd().classList.contains('rot') ? [dy, -dx] : [dx, dy]);
  const ctr = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  function place(newIds) { /* 상태대로 카드를 스쿼드 칸·손패에 놓고, 움직인 카드는 미끄러지듯 이동 */
    const before = {}; Object.keys(els).forEach((id) => { if (els[id].isConnected) before[id] = ctr(els[id]); });
    const pl = $('.rd-play'), hd = $('.rd-hand'), dkEl = $('.rd-deck'); $$('.rd-slot').forEach((e) => e.remove());
    const sq = sqIds(), live = new Set(sq.concat(S.hand).map(String));
    Object.keys(els).forEach((id) => { if (!live.has(String(id))) { els[id].remove(); delete els[id]; } });
    const atk = S.phase === 'score' || S.phase === 'done'; $('.rd-main').classList.toggle('atk', atk);
    const put = (id, host) => { const e = elOf(id); e.classList.remove('sel'); e.style.setProperty('--rz', '0deg'); host.appendChild(e); };
    if (atk) sq.forEach((id) => put(id, hd)); /* 출격 뒤에는 스쿼드가 아래 줄로 */
    else S.squad.forEach((id, i) => { if (id) put(id, pl); else { const sl = document.createElement('div'); sl.className = 'rd-slot'; sl.textContent = i + 1; pl.appendChild(sl); } });
    S.hand.forEach((id, i) => { const e = elOf(id); e.classList.toggle('sel', S.sel.has(id)); e.style.setProperty('--rz', ((i - (S.hand.length - 1) / 2) * 1.2).toFixed(1) + 'deg'); hd.appendChild(e); });
    hd.appendChild(dkEl); /* 덱은 손패 오른쪽 */
    const dc = dkEl.offsetParent ? ctr(dkEl) : null; let k = 0;
    sq.concat(S.hand).forEach((id) => { const e = els[id], n = ctr(e);
      if (newIds && newIds.indexOf(id) >= 0) { const d = loc(dc ? dc[0] - n[0] : 240, dc ? dc[1] - n[1] : 0), dl = k * 80, from = 'translate(' + d[0] + 'px,' + d[1] + 'px) rotate(12deg) scale(.8)'; sfx.deal(k++);
        const bk = document.createElement('div'); bk.className = 'pk-bk'; e.appendChild(bk);
        e.animate([{ transform: from, opacity: 0 }, { transform: from, opacity: 1, offset: 0.02 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: dl, easing: 'cubic-bezier(.25,1.2,.45,1)', fill: 'backwards' });
        e.querySelector('.pk-in').animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 420, delay: dl, easing: 'ease-out', fill: 'backwards' });
        bk.animate([{ opacity: 1, transform: 'rotateY(180deg) scaleX(-1)' }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.52 }, { opacity: 0, transform: 'rotateY(0deg) scaleX(-1)' }], { duration: 420, delay: dl, easing: 'ease-out', fill: 'both' }).onfinish = () => bk.remove();
        return; }
      const o = before[id]; if (!o) return; const d = loc(o[0] - n[0], o[1] - n[1]); if (Math.abs(d[0]) + Math.abs(d[1]) < 1) return;
      e.animate([{ transform: 'translate(' + d[0] + 'px,' + d[1] + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,1.35,.5,1)' }); });
  }
  function fltCost() { const n = Object.values(S.flt).filter(Boolean).length; return n ? 100 * Math.pow(2, n - 1) * (S.flt.c === '필그림' ? 2 : 1) : 0; } /* 조건마다 2배, 필그림 지정은 다시 2배 */
  const poolNow = () => (S.mode === 'live' ? S.pool || [] : L.deck);
  let poolKey = '';
  function poolUi() { /* 지금 고른 필터로 나올 수 있는 니케 */
    const any = Object.values(S.flt).some(Boolean), P0 = poolNow(), M = (any ? P0.filter(fltMatch) : P0).slice().sort((a, b) => (b.tv + brkChip(b.cnt)) - (a.tv + brkChip(a.cnt))), key = JSON.stringify(S.flt) + '|' + P0.length + '|' + S.mode;
    if (key === poolKey) return; poolKey = key;
    $('.rd-ph').innerHTML = '<span>' + (any ? '이 필터로 나올 수 있는 니케' : '덱에 남은 니케') + '</span><b>' + M.length + '명</b>';
    $('.rd-pl').innerHTML = M.length ? M.slice(0, 60).map((x) => cardHtml(x, S.boss)).join('') : '<span style="opacity:.7;padding:6px">해당하는 니케가 없습니다. 버리면 아무 니케나 받습니다.</span>';
  }
  const fltMatch = (x) => { const f = S.flt; return (!f.e || x.e === f.e) && (!f.c || x.c === f.c) && (!f.b || String(x.b) === f.b || x.b === 'A') && (!f.r || RNG[f.r].includes(x.w)); };

  /* ---------- 진행 엔진: 연습(이 브라우저) / 실전(서버) ---------- */
  async function api(a, body) {
    const ac = acct(); if (!ac || !ac.user) throw new Error('login');
    const r = await fetch(WORKER + '/raid', { method: 'POST', headers: { Authorization: 'Bearer ' + (await ac.token()), 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ a }, body || {})) });
    const j = await r.json().catch(() => ({})); if (!j.ok) { const e = new Error(j.error || ('http' + r.status)); e.j = j; throw e; } return j;
  }
  const liveCard = (p) => { const b = DB[p[0]]; return b ? Object.assign({}, b, { id: String(p[0]), cnt: p[1], tv: TS[b.t] || 1 }) : null; };
  const ERR = { login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)', inactive: '지금은 레이드 기간이 아닙니다.', tries: '오늘 핸드를 모두 썼습니다. 내일 다시 도전해 주세요.', link: '전초기지 탭에서 블라블라링크 프로필 주소로 먼저 연동해 주세요.', oid: '이번 레이드는 처음 도전한 게임 계정으로만 참여할 수 있습니다.', deck: '보유한 SSR 니케가 7명 이상이어야 합니다.', bla: '블라블라링크에서 보유 정보를 읽지 못했습니다. 프로필 공개 설정을 확인해 주세요.', chips: '싱크칩이 부족합니다.', busy: '잠시 후 다시 시도해 주세요.', nogame: '진행 중인 판이 없습니다.' };
  const errMsg = (e) => ERR[e && e.message] || '서버와 연결하지 못했습니다. (' + ((e && e.message) || e) + ')';
  const Local = {
    async start() {
      const d = data(), src = S.mode === 'mine' ? d.list.filter((x) => x.cnt > 0) : d.list;
      const tc = () => { const u = Math.random(); return u < 0.3 ? 1 : u < 0.5 ? 2 + Math.floor(Math.random() * 2) : u < 0.7 ? 4 : u < 0.88 ? 5 + Math.floor(Math.random() * 6) : 11; };
      const deck = src.map((x) => Object.assign({}, x, { id: String(x.code || x.n), tv: TS[x.t] || 1, cnt: S.mode === 'mine' ? x.cnt : tc() }));
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      if (deck.length < 7) throw new Error('deck');
      L.deck = deck; const total = deck.length;
      return { hand: L.deck.splice(0, 7), rd: S.mode === 'mine' ? 2 + Math.min(3, Math.floor(total / Math.max(1, d.list.length) * 4)) : 3, left: L.deck.length, total, tries: S.tries + 1, max: 3, chips: S.chips };
    },
    async discard(ids, flt, cost) { const got = []; for (let k = 0; k < ids.length && L.deck.length; k++) { let i = cost ? L.deck.findIndex(fltMatch) : 0; if (i < 0) i = 0; got.push(L.deck.splice(i, 1)[0]); } return { got, left: L.deck.length, chips: S.chips - cost }; },
    async play(ids) { const R = evalSquad(C(ids), S.boss), nb = R.score > best(); if (nb) { try { localStorage.setItem(BEST_K, String(R.score)); } catch (e) { /* 무시 */ } } return { score: R.score, newBest: nb, best: Math.max(best(), R.score) }; }
  };
  const Live = {
    async start() { const d = data(), j = await api('start', { openid: d.purl, area: +d.area || 0 }); return Live.view(j); },
    view(j) { S.pool = (j.game.pool || []).map(liveCard).filter(Boolean); return { hand: j.game.hand.map(liveCard).filter(Boolean), rd: j.game.rd, left: j.game.left, total: j.game.total, tries: j.tries, max: j.max, chips: j.chips }; },
    async discard(ids, flt) { const j = await api('discard', { codes: ids, flt }); S.pool = (j.game.pool || []).map(liveCard).filter(Boolean); return { got: j.got.map(liveCard).filter(Boolean), left: j.game.left, chips: j.chips }; },
    async play(ids) { const j = await api('play', { codes: ids }); return { score: j.result.score, newBest: j.newBest, best: j.best }; }
  };
  const E = () => (S.mode === 'live' ? Live : Local);

  /* ---------- 화면 ---------- */
  const chipIco = (px) => (window.doroChipSvg ? window.doroChipSvg('b', px, false, true) : '');
  function ui() {
    const P = picks(), n = P.length, cost = fltCost(), nsel = S.sel.size, live = S.mode === 'live', pick = S.phase === 'pick';
    $('.rd-best b').textContent = fmt(live ? S.liveBest : best()) + '억';
    $('.rd-st .tr b').textContent = S.tries + '/' + S.max;
    $('.rd-st .rdw b').textContent = S.redraws;
    $('.rd-st .ch b').innerHTML = chipIco(18) + '<span>' + fmt(S.chips) + '</span>';
    $('.rd-deck span').textContent = S.deckLeft + '/' + S.deckN;
    $('.rd-sb [data-r=mode]').textContent = ({ test: '연습 · 테스트 덱', mine: '연습 · 내 도감', live: '실전' }[S.mode]);
    $('[data-r=snd]').textContent = sndOn ? '🔊' : '🔇';
    const go = $('[data-r=go]'), dc = $('[data-r=disc]');
    go.disabled = busy || !pick || n !== 5;
    dc.disabled = busy || !pick || nsel < 1 || nsel > 5 || S.redraws < 1 || cost > S.chips || S.deckLeft < 1;
    dc.innerHTML = '버리기' + (cost ? ' <small>−' + fmt(cost) + '</small>' : '');
    $$('.rd-sort .rb').forEach((b) => { b.classList.toggle('org', b.dataset.s === S.sort); b.classList.toggle('gry', b.dataset.s !== S.sort); });
    $$('.rd-fg button').forEach((b) => b.classList.toggle('on', S.flt[b.dataset.k] === b.dataset.v));
    $('.rd-fc').innerHTML = cost ? chipIco(14) + ' ' + fmt(cost) : '';
    const fbn = $('[data-r=flt]'); fbn.classList.toggle('org', cost > 0); fbn.classList.toggle('gry', !cost); fbn.innerHTML = chipIco(15) + '필터' + (cost ? ' ✓' : '');
    if (!$('.rd-flt').hidden) poolUi();
    if (!pick) return;
    const hn = $('.rd-hn'), ex = $('.rd-ex b'), msg = $('.rd-msg'); msg.className = 'rd-msg'; msg.textContent = '';
    if (n >= 1 && n <= 5) { const R = evalSquad(C(P), S.boss); /* 고른 카드(배치한 카드 포함)의 칩·배수·점수를 바로 보여 줌 */
      hn.innerHTML = R.steps.map((s) => '<div>' + s.h + '</div>').join('');
      $('.rd-chips').textContent = R.chips; $('.rd-mult').textContent = R.mult; ex.textContent = fmt(R.score) + '억';
      if (n === 5 && R.f < 1) { msg.textContent = '버스트 단계 누락 ×0.8'; msg.classList.add('bad'); }
    } else { hn.innerHTML = n > 5 ? '5장 초과' : ''; $('.rd-chips').textContent = n > 5 ? '-' : '0'; $('.rd-mult').textContent = n > 5 ? '-' : '0'; ex.textContent = n > 5 ? '-' : '0억'; }
  }
  function setBoss(b) {
    S.boss = b; const d = data(), sp = supOf(b.e);
    $('.rd-bn').innerHTML = (d.elIco ? '<img alt="" src="' + d.elIco[b.e] + '">' : '') + BOSS_NM;
    $('.rd-bi').innerHTML = '우월코드 ' + (d.elIco ? '<img alt="" src="' + d.elIco[sp] + '" style="width:18px;vertical-align:-5px"> ' : '') + '<b style="color:' + ((d.elCol && d.elCol[sp][1]) || '#fff') + '">' + ELN[sp] + '</b><br>적정 사거리 <b>' + b.r + '</b> <small>(' + RNG[b.r].join('·') + ')</small>';
  }
  function clearTable() { Object.keys(els).forEach((id) => els[id].remove()); els = {}; S.cards = {}; S.hand = []; S.squad = EMPTY(); S.sel = new Set(); poolKey = ''; S.flt = { e: '', c: '', b: '', r: '' }; $('.rd-main').classList.remove('atk'); $('.rd-total b').textContent = '0억'; $$('.rd-dmg,.rd-ban,.rd-burst').forEach((e) => e.remove()); $('.rd-fin').hidden = true; $('.rd-flt').hidden = true; }
  function gate(html) { const g = $('.rd-gate'); g.hidden = !html; if (html) g.querySelector('.rd-box').innerHTML = html; }
  function applyGame(v, isNew) {
    clearTable(); S.phase = 'pick'; S.redraws = v.rd; S.deckLeft = v.left; S.deckN = v.total; S.tries = v.tries; S.max = v.max || 3; if (v.chips != null) S.chips = v.chips;
    v.hand.forEach((c) => { S.cards[c.id] = c; S.hand.push(c.id); }); sortHand(); gate('');
    place(isNew ? S.hand.slice() : null); ui();
  }
  async function deal(newBoss) { /* 새 판 */
    if (busy) return; busy = true;
    try {
      if (S.mode !== 'live' && (newBoss || !S.boss)) { setBoss(BOSS0); S.tries = 0; }
      if (S.mode !== 'live' && S.tries >= 3) S.tries = 0;
      const v = await E().start(); busy = false; applyGame(v, true);
    } catch (e) { busy = false; clearTable(); S.phase = 'idle'; place(); ui();
      gate('<h3>포커레이드</h3><div class="rd-fd">' + esc(S.mode === 'live' ? errMsg(e) : '내 도감에 SSR 카드가 7장 이상 필요합니다.') + '</div><button type="button" class="rb gry" data-r="mode">모드 바꾸기</button>'); }
  }
  async function enterLive() { /* 실전: 시즌·내 기록을 받아 와서 이어 하거나 시작 버튼을 보여 줌 */
    clearTable(); S.phase = 'idle'; place(); busy = true; ui(); gate('<h3>실전</h3><div class="rd-fd">서버에서 레이드 정보를 불러오는 중입니다…</div>');
    try {
      const j = await api('state'); busy = false; S.liveBest = j.best || 0; S.tries = j.tries || 0; S.max = j.max || 3; S.chips = j.chips || 0; S.redraws = 0; S.deckLeft = 0; S.deckN = 0;
      if (!j.season || !j.season.active) { ui(); gate('<h3>실전</h3><div class="rd-fd">' + (j.season ? '레이드 기간이 끝났습니다.' : '열려 있는 레이드가 없습니다.') + '</div>' + (j.admin ? '<button type="button" class="rb org" data-r="open">시즌 열기 (관리자 · 5일)</button>' : '') + '<button type="button" class="rb gry" data-r="mode">연습 모드로</button>'); return; }
      setBoss({ e: j.season.e, r: j.season.r }); S.end = j.season.end;
      if (j.game) { applyGame(Live.view(j), false); return; }
      ui(); const left = S.max - S.tries, dl = Math.max(0, Math.ceil((S.end - Date.now()) / 86400000));
      gate('<h3>RAID · ' + ELN[S.boss.e] + ' 보스</h3><div class="rd-fd">남은 기간 ' + dl + '일 · 오늘 핸드 ' + S.tries + '/' + S.max + ' · 내 최고 ' + fmt(S.liveBest) + '억</div>' + (left > 0 ? '<button type="button" class="rb blue" data-r="start">핸드 시작</button>' : '<div class="rd-fd">오늘 핸드를 모두 썼습니다.</div>') + '<button type="button" class="rb pur" data-r="rank">랭킹</button><button type="button" class="rb gry" data-r="mode">연습 모드로</button>');
    } catch (e) { busy = false; ui(); gate('<h3>실전</h3><div class="rd-fd">' + esc(errMsg(e)) + '</div><button type="button" class="rb gry" data-r="mode">연습 모드로</button>'); }
  }
  async function discard() {
    const ids = S.hand.filter((id) => S.sel.has(id)), cost = fltCost(); if (!ids.length || busy) return;
    busy = true; ui(); let r;
    try { r = await E().discard(ids, Object.assign({}, S.flt), cost); } catch (e) { busy = false; ui(); $('.rd-msg').textContent = errMsg(e); return; }
    sfx.disc(); ids.forEach((id, i) => { const d = loc(140 + i * 20, -260); els[id].animate([{ transform: 'translateY(-18%)', opacity: 1 }, { transform: 'translate(' + d[0] + 'px,' + d[1] + 'px) rotate(' + (25 + i * 8) + 'deg)', opacity: 0 }], { duration: 300, delay: i * 45, easing: 'ease-in', fill: 'forwards' }); });
    await sleep(320 + ids.length * 45);
    S.hand = S.hand.filter((id) => !S.sel.has(id)); ids.forEach((id) => { delete S.cards[id]; }); S.sel.clear();
    r.got.forEach((c) => { S.cards[c.id] = c; S.hand.push(c.id); }); sortHand();
    S.redraws--; S.deckLeft = r.left; if (r.chips != null) S.chips = r.chips; S.flt = { e: '', c: '', b: '', r: '' }; $('.rd-flt').hidden = true;
    place(r.got.map((c) => c.id)); await sleep(430 + r.got.length * 80);
    busy = false; ui();
  }
  function countTo(el, from, to, ms) { const t0 = performance.now(); return new Promise((res) => { (function f(t) { const p = Math.min(1, (t - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - p, 3)); el.textContent = fmt(v); if (p < 1) requestAnimationFrame(f); else res(); })(t0); }); }
  const punch = (el) => { el.classList.remove('punch'); void el.offsetWidth; el.classList.add('punch'); };
  const shake = () => { const m = $('.rd-main'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); };
  const pop = (card, txt, big) => { const p = document.createElement('div'); p.className = 'pk-pop' + (big ? ' big' : ''); p.textContent = txt; card.appendChild(p); setTimeout(() => p.remove(), 800); };
  const banner = (title, sub, cls) => { const m = $('.rd-main'), d = document.createElement('div'); d.className = 'rd-ban ' + (cls || ''); d.innerHTML = '<b>' + esc(title) + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : ''); m.appendChild(d); setTimeout(() => d.remove(), 950); };
  const hitBoss = (dmg, i, k) => { /* k: 이번 타격의 세기(0~1). 클수록 폭발·흔들림·숫자가 커짐 */
    const m = $('.rd-main'), bg = $('.rd-bg'); m.style.setProperty('--sk', (2 + 9 * k).toFixed(1) + 'px'); m.style.setProperty('--hk', (0.35 + 0.9 * k).toFixed(2));
    bg.classList.remove('hit'); void bg.offsetWidth; bg.classList.add('hit'); shake(); sfx.hit(k);
    const fx = document.createElement('div'); fx.className = 'rd-burst'; m.appendChild(fx); setTimeout(() => fx.remove(), 450);
    const d = document.createElement('div'); d.className = 'rd-dmg'; d.textContent = '-' + fmt(dmg) + '억'; d.style.fontSize = (20 + 36 * k).toFixed(0) + 'px'; d.style.left = (50 + (i - 2) * 7) + '%'; d.style.top = (27 + (i % 2 ? 6 : -3)) + '%'; m.appendChild(d); setTimeout(() => d.remove(), 1050); };
  async function play() {
    const ids = picks(); if (ids.length !== 5 || busy) return;
    busy = true; ui(); let res;
    try { res = await E().play(ids); } catch (e) { busy = false; ui(); $('.rd-msg').textContent = errMsg(e); return; }
    const rest = S.hand.filter((id) => !S.sel.has(id));
    rest.forEach((id, i) => els[id].animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(45%) scale(.8)' }], { duration: 220, delay: i * 30, fill: 'forwards' }));
    sfx.go(); await sleep(260);
    rest.forEach((id) => { delete S.cards[id]; });
    S.phase = 'score'; S.hand = []; S.squad = ids.slice(); S.sel.clear(); $('.rd-flt').hidden = true;
    const D = C(ids), R = evalSquad(D, S.boss), hn = $('.rd-hn'), cb = $('.rd-chips'), mb = $('.rd-mult'), msg = $('.rd-msg'), ex = $('.rd-ex b'), tot = $('.rd-total b');
    place(); /* 스쿼드가 아래 줄로 내려오고, 위에는 보스가 드러남 */
    hn.innerHTML = '출격!'; cb.textContent = '0'; mb.textContent = '0'; ex.textContent = '0억'; tot.textContent = '0억'; msg.className = 'rd-msg'; msg.textContent = '';
    banner('출격!', '', 'big'); await slow(700);
    let chips = 0, mult = 0, tick = 0;
    for (let i = 0; i < 5; i++) { /* 니케별 칩: 항목마다 하나씩 */
      const e = els[ids[i]], c = R.cards[i];
      e.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12%) scale(1.12) rotate(' + (i % 2 ? 4 : -4) + 'deg)' }, { transform: 'translateY(-6%) scale(1.06)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'forwards' });
      for (const p of c.parts) { if (!p[1]) continue;
        pop(e, p[0] + ' +' + p[1], p[1] >= 5 && p[0].indexOf('티어') < 0); msg.innerHTML = '<b>' + esc(D[i].n) + '</b> · ' + esc(p[0]) + ' <span style="color:#4db5ff">+' + p[1] + '</span>';
        chips += p[1]; cb.textContent = chips; punch(cb); sfx.chip(tick++); await slow(210); }
      e.animate([{ transform: 'translateY(-6%) scale(1.06)' }, { transform: 'none' }], { duration: 160, fill: 'forwards' });
      await slow(130);
    }
    await slow(200);
    let mi = 0;
    for (const st of R.steps) { /* 족보 배수 */
      hn.innerHTML = '<div>' + st.h + '</div>'; punch(hn); msg.innerHTML = st.h + ' <span style="color:#ff6b5e">배수 +' + st.v + '</span>';
      banner(st.l, '배수 +' + st.v, st.big ? 'big' : '');
      ids.forEach((id, i) => els[id].animate([{ transform: 'scale(1)' }, { transform: 'scale(' + (st.big ? 1.14 : 1.07) + ') translateY(-7%)' }, { transform: 'scale(1)' }], { duration: 300, delay: i * 40 }));
      mult += st.v; mb.textContent = mult; punch(mb); sfx.mult(mi++); if (st.big) { $('.rd-main').style.setProperty('--sk', '8px'); shake(); }
      await slow(st.big ? 1050 : 760);
    }
    if (R.f < 1) { msg.textContent = '버스트 단계 누락 ×0.8'; msg.classList.add('bad'); banner('버스트 단계 누락', '×0.8', 'bad'); sfx.bad(); await slow(800); }
    hn.innerHTML = fmt(chips) + ' × ' + mult + (R.f < 1 ? ' × 0.8' : ''); punch(hn); punch(cb); punch(mb);
    await slow(350);
    const score = res.score, tg = ctr($('.rd-tgt')), dmgs = [], mx = Math.max.apply(null, R.cards.map((c) => c.v)), mn = Math.min.apply(null, R.cards.map((c) => c.v)); let done = 0, acc = 0;
    for (let i = 0; i < 5; i++) { const v = i < 4 ? Math.round(score * R.cards[i].v / Math.max(1, R.chips)) : score - acc; acc += v; dmgs.push(v); }
    for (let i = 0; i < 5; i++) { /* 카드가 차례로 보스를 때림: 니케별 칩 비율만큼 피해, 피해가 클수록 크게 */
      const e = els[ids[i]], c0 = ctr(e), d = loc(tg[0] - c0[0], tg[1] - c0[1]), dmg = dmgs[i], k = mx > mn ? (R.cards[i].v - mn) / (mx - mn) : 0.6, sc = 0.55 + 0.6 * k;
      e.style.zIndex = 8; sfx.whoosh(); msg.className = 'rd-msg';
      e.animate([{ transform: 'none' }, { transform: 'translate(' + (-d[0] * 0.06) + 'px,' + (-d[1] * 0.06) + 'px) scale(' + (1.04 + 0.12 * k) + ') rotate(' + (i % 2 ? -8 : 8) + 'deg)', offset: 0.22 }, { transform: 'translate(' + (d[0] * 0.86) + 'px,' + (d[1] * 0.86) + 'px) scale(' + sc + ') rotate(' + (i % 2 ? 14 : -14) + 'deg)', offset: 0.5 }, { transform: 'none' }], { duration: 560 * SLOW, easing: 'cubic-bezier(.45,0,.3,1)' });
      await slow(285);
      hitBoss(dmg, i, k); msg.innerHTML = '<b>' + esc(D[i].n) + '</b> <span style="color:#ffb347">-' + fmt(dmg) + '억</span>';
      const from = done; done += dmg; const to = done; countTo(tot, from, to, 240).then(() => { tot.textContent = fmt(to) + '억'; }); ex.textContent = fmt(done) + '억'; punch(ex);
      await slow(330); e.style.zIndex = '';
    }
    await slow(450);
    ex.textContent = fmt(score) + '억'; tot.textContent = fmt(score) + '억'; S.phase = 'done'; if (S.mode === 'live') S.liveBest = res.best;
    const live = S.mode === 'live', left = S.max - S.tries, fin = $('.rd-fin'), ag = $('.rd-fin [data-r=again]'); fin.hidden = false; msg.textContent = '';
    fin.querySelector('h3').textContent = res.newBest ? 'NEW BEST!' : 'RAID SCORE';
    $('.rd-rkl').textContent = '';
    $('.rd-fin .rd-fd').innerHTML = R.steps.map((x) => '<span class="rd-fh">' + x.h + '<b>+' + x.v + '</b></span>').join('') + '<br>칩 ' + fmt(chips) + ' × 배수 ' + mult + (R.f < 1 ? ' × 0.8' : '');
    ag.hidden = live && left <= 0; ag.textContent = left > 0 ? '재도전 (남은 ' + left + '회)' : '재도전'; $('.rd-fin [data-r=rank]').hidden = !live;
    if (live) api('rank').then((j) => { const i = j.rows.findIndex((r) => r.me); if (i >= 0) $('.rd-rkl').innerHTML = '<b>' + (i + 1) + '위</b> / ' + j.rows.length + '명'; }).catch(() => {});
    $('.rd-main').style.setProperty('--sk', '7px'); shake(); sfx.fin(res.newBest); await countTo($('.rd-fs b'), 0, score, Math.min(1400, 500 + score));
    busy = false; ui();
  }
  async function showRank() {
    const m = $('.rd-rank'), box = m.querySelector('.rd-rl'); m.hidden = false;
    if (S.mode !== 'live') { box.innerHTML = '<p>랭킹은 실전 모드에서만 기록됩니다. 연습 최고 점수: ' + fmt(best()) + '억</p>'; return; }
    box.innerHTML = '<p>불러오는 중…</p>';
    try { const j = await api('rank'), N = j.rows.length, g1 = Math.max(3, Math.ceil(N * 0.03)), g2 = Math.max(10, Math.ceil(N * 0.1));
      box.innerHTML = N ? j.rows.map((r, i) => '<div class="rd-rk' + (r.me ? ' me' : '') + (i < g1 ? ' f1' : i < g2 ? ' f2' : '') + '"><b>' + (i + 1) + '</b><div><div class="nm">' + esc(r.nick || '지휘관') + '</div><div class="dk">' + String(r.deck).split(',').filter(Boolean).map((p) => { const c = liveCard([p.split(':')[0], +p.split(':')[1] || 1]); return c ? cardHtml(c, S.boss) : ''; }).join('') + '</div></div><div class="sc">' + fmt(r.sc) + '억<small>' + fmt(r.chips) + ' × ' + r.mult + (r.f < 1 ? ' × 0.8' : '') + '</small></div></div>').join('') + '<p style="opacity:.7;margin-top:8px">금색 테두리: 상위 3% 또는 3위까지 · 은색 테두리: 상위 10% 또는 10위까지 · 같은 점수는 먼저 낸 순서</p>' : '<p>아직 기록이 없습니다.</p>';
    } catch (e) { box.innerHTML = '<p>' + esc(errMsg(e)) + '</p>'; }
  }
  function setMode(m) { S.mode = m; S.boss = null; S.tries = 0; S.max = 3; if (m === 'live') enterLive(); else { S.chips = 10000; deal(true); } }
  function onClick(ev) {
    const t = ev.target, rb = t.closest('[data-r]'), fp = $('.rd-flt');
    if (!fp.hidden && !t.closest('.rd-flt') && !(rb && rb.dataset.r === 'flt')) { fp.hidden = true; } /* 아무 곳이나 누르면 지정 드로우 창만 닫힘(고른 조건은 버리기 전까지 유지) */
    if (rb) { const a = rb.dataset.r;
      if (a === 'rule') { $('.rd-rule').hidden = false; return; }
      if (a === 'help') { $('.rd-help').hidden = false; return; }
      if (a === 'snd') { sndOn = !sndOn; try { localStorage.setItem(SND_K, sndOn ? '1' : '0'); } catch (e) { /* 무시 */ } if (sndOn) sfx.sel(); ui(); return; }
      if (a === 'mx') { rb.closest('.rd-modal').hidden = true; return; }
      if (a === 'rank') { showRank(); return; }
      if (a === 'exit') { setFs(false); return; }
      if (busy) return;
      if (a === 'go') play(); else if (a === 'disc') discard();
      else if (a === 'again') { if (S.mode === 'live') enterLive(); else deal(false); }
      else if (a === 'start') deal(false);
      else if (a === 'boss') deal(true);
      else if (a === 'mode') { const ac = acct(), can = !!(ac && ac.user), order = can ? ['test', 'mine', 'live'] : ['test', 'mine']; setMode(order[(order.indexOf(S.mode) + 1) % order.length]); }
      else if (a === 'open') { busy = true; api('set', { days: 5 }).then(() => { busy = false; enterLive(); }).catch((e) => { busy = false; gate('<h3>실전</h3><div class="rd-fd">' + esc(errMsg(e)) + '</div><button type="button" class="rb gry" data-r="mode">연습 모드로</button>'); }); }
      else if (a === 'flt') { fp.hidden = !fp.hidden; poolKey = ''; ui(); }
      else if (a === 'chips' && S.mode !== 'live') { S.chips = 10000; ui(); }
      return; }
    const md = t.closest('.rd-modal'); if (md && !t.closest('.rd-mb')) { md.hidden = true; return; }
    if (busy) return;
    const sb = t.closest('[data-s]'); if (sb && S.phase === 'pick') { S.sort = sb.dataset.s; sortHand(); place(); ui(); return; }
    const fb = t.closest('.rd-fg button'); if (fb) { const k = fb.dataset.k; S.flt[k] = S.flt[k] === fb.dataset.v ? '' : fb.dataset.v; sfx.sel(); ui(); }
  }
  /* 카드 누르기·끌기: 누르면 고르기(스쿼드에 놓인 카드는 손패로), 끌어서 스쿼드↔손패로 옮기기 */
  function tap(id) {
    const si = S.squad.indexOf(id);
    if (si >= 0) { S.squad[si] = null; S.hand.push(id); sortHand(); place(); sfx.unsel(); }
    else if (S.sel.has(id)) { S.sel.delete(id); els[id].classList.remove('sel'); sfx.unsel(); }
    else if (S.sel.size < 5) { S.sel.add(id); els[id].classList.add('sel'); sfx.sel(); }
    else els[id].animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 });
    ui();
  }
  function onDown(ev) {
    ac(); if (busy || !S || S.phase !== 'pick' || (ev.button != null && ev.button > 0)) return;
    const c = ev.target.closest('.rd-hand .pk,.rd-play .pk'); if (!c) return;
    drag = { id: c.dataset.id, el: c, x: ev.clientX, y: ev.clientY, on: false, g: null }; ev.preventDefault();
  }
  function zoneAt(x, y) { const a = ctr($('.rd-play')), b = ctr($('.rd-hand')); return Math.hypot(x - a[0], y - a[1]) < Math.hypot(x - b[0], y - b[1]) ? 'play' : 'hand'; }
  function slotAt(x, y) { let bi = 0, bd = 1e9; Array.from($('.rd-play').children).forEach((e, i) => { const c = ctr(e), d = Math.hypot(x - c[0], y - c[1]); if (d < bd) { bd = d; bi = i; } }); return bi; } /* 가장 가까운 칸(0~4) */
  function toSquad(id, i) { /* 원하는 칸에 놓기: 스쿼드끼리는 자리 바꿈, 손패에서 오면 그 칸에 있던 카드는 손패로 */
    const from = S.squad.indexOf(id), occ = S.squad[i]; if (i < 0 || i > 4 || from === i) return;
    if (from >= 0) { S.squad[from] = occ || null; S.squad[i] = id; }
    else { S.hand = S.hand.filter((x) => x !== id); S.sel.delete(id); if (occ) S.hand.push(occ); S.squad[i] = id; sortHand(); }
    sfx.put(); place();
  }
  function onMoveDrag(ev) {
    if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.on) { if (Math.abs(dx) + Math.abs(dy) < 9) return; drag.on = true;
      const g = drag.el.cloneNode(true), w = drag.el.offsetWidth, h = drag.el.offsetHeight; g.className = drag.el.className.replace(/\bsel\b/, '') + ' pk-ghost'; g.removeAttribute('data-id');
      g.style.cssText += ';--cw:' + w + 'px;width:' + w + 'px;height:' + h + 'px;transform:' + (rd().classList.contains('rot') ? 'rotate(90deg)' : 'rotate(-4deg)') + ' scale(1.08)'; drag.w = w; drag.h = h;
      document.body.appendChild(g); drag.g = g; drag.el.classList.add('drag'); }
    drag.g.style.left = (ev.clientX - drag.w / 2) + 'px'; drag.g.style.top = (ev.clientY - drag.h / 2) + 'px';
    $('.rd-play').classList.toggle('over', zoneAt(ev.clientX, ev.clientY) === 'play');
  }
  function onUp(ev) {
    if (!drag) return; const d = drag; drag = null; $('.rd-play').classList.remove('over');
    if (!d.on) { if (ev.type !== 'pointercancel') tap(d.id); return; }
    d.g.remove(); d.el.classList.remove('drag'); if (ev.type === 'pointercancel') return;
    const z = zoneAt(ev.clientX, ev.clientY), si = S.squad.indexOf(d.id), g = loc(ev.clientX - d.x, ev.clientY - d.y), up = si < 0 && g[1] < -d.h * 0.3 && Math.abs(g[1]) > Math.abs(g[0]); /* 위로 쓸어 올리기 */
    if (z === 'play') toSquad(d.id, slotAt(ev.clientX, ev.clientY));
    else if (up) { const i = S.squad.indexOf(null); if (i >= 0) toSquad(d.id, i); }
    else if (si >= 0) { S.squad[si] = null; S.hand.push(d.id); sortHand(); sfx.unsel(); place(); }
    ui();
  }
  function onHover(ev) { /* 마우스를 따라 카드가 기울고 살짝 떠오르며 빛이 따라옴 */
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    const c = ev.target.closest && ev.target.closest('.rd-hand .pk,.rd-play .pk'); $$('.rd-hand .pk,.rd-play .pk').forEach((e) => { if (e !== c) ['--rx', '--ry', '--hs', '--go', '--gx', '--gy'].forEach((k) => e.style.removeProperty(k)); });
    if (!c || drag || busy) return; const r = c.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    c.style.setProperty('--ry', ((px - 0.5) * 34).toFixed(1) + 'deg'); c.style.setProperty('--rx', ((0.5 - py) * 24).toFixed(1) + 'deg'); c.style.setProperty('--hs', '1.08');
    c.style.setProperty('--go', '1'); c.style.setProperty('--gx', (px * 100).toFixed(0) + '%'); c.style.setProperty('--gy', (py * 100).toFixed(0) + '%');
  }
  /* 크기 맞추기: 카드 폭(--cw)을 테이블 크기에 맞춤. 전체 화면에서는 세로로 든 휴대폰이면 90도 돌려 가로 화면으로 */
  function fit() {
    const r = root && rd(); if (!r || r.hidden) return; const fs = r.classList.contains('fs');
    if (fs) { const rot = window.innerWidth < window.innerHeight; r.classList.toggle('rot', rot); r.style.width = (rot ? window.innerHeight : window.innerWidth) + 'px'; r.style.height = (rot ? window.innerWidth : window.innerHeight) + 'px'; } else { r.classList.remove('rot'); r.style.width = ''; r.style.height = ''; }
    const m = $('.rd-main'), w = m.clientWidth, h = m.clientHeight;
    const cw = fs ? Math.min(112, w * 0.108, (h - 96) / 4.14) : Math.min(112, w * 0.11);
    r.style.setProperty('--cw', Math.max(40, cw).toFixed(1) + 'px');
  }
  function setFs(on) {
    const r = rd(); if (!r) return; r.hidden = !on && isMobile(); r.classList.toggle('fs', !!on); document.documentElement.style.overflow = on ? 'hidden' : '';
    root.querySelector('.rd-launch').hidden = !!on || !isMobile();
    if (on) { try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 미지원 */ } fit(); }).catch(() => {}); } catch (e) { /* 미지원 */ } }
    else { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* 무시 */ } }
    fit(); setTimeout(fit, 350);
  }
  function build() {
    addCss();
    const fg = (lab, k, arr) => '<div class="rd-fg"><span>' + lab + '</span>' + arr.map((v) => '<button type="button" data-k="' + k + '" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';
    const d0 = data(), smp = d0.list.slice().sort((a, b) => (TS[b.t] || 0) - (TS[a.t] || 0)).slice(0, 5).map((x, i) => cardHtml(Object.assign({}, x, { cnt: [4, 11, 11, 7, 1][i] }), BOSS0)).join('');
    const hx = (inner, cls) => '<span class="pk-hx ' + (cls || '') + '">' + inner + '</span>', wpi = (w) => '<img alt="' + w + '" src="assets/img/wp-' + w + '.png">';
    root.innerHTML = '<div class="rd-launch" hidden><div class="rd-lt"><small>POKER RAID</small>' + BOSS_NM + '</div><div class="rd-lc">' + smp + '</div><button type="button" class="rd-go" data-fs="1" aria-label="플레이">▶</button><div class="rd-lp">가로 화면으로 시작</div></div>' +
      '<div class="rd"><aside class="rd-side">' +
      '<div class="pn rd-boss"><div class="rd-bn"></div><div class="rd-bi"></div></div>' +
      '<div class="pn rd-hp"><div class="rd-hn"></div><div class="rd-cm"><b class="rd-chips">0</b><i>×</i><b class="rd-mult">0</b></div><div class="rd-ex"><span>예상 점수</span><b>0억</b></div></div>' +
      '<div class="pn rd-row rd-best"><span>최고 점수</span><b>0</b></div>' +
      '<div class="rd-st"><div class="tr">핸드<b>0/3</b></div><div class="rdw">버리기<b>0</b></div><div class="ch" data-r="chips"><b>0</b></div></div>' +
      '<div class="rd-sb"><button type="button" class="rb org" data-r="rule">족보</button><button type="button" class="rb pur" data-r="rank">랭킹</button><button type="button" class="rb blue" data-r="help">? 도움말</button><button type="button" class="rb gry" data-r="snd" aria-label="효과음">🔊</button><button type="button" class="rb gry" data-r="mode" style="grid-column:span 2">모드</button></div>' +
      '</aside><main class="rd-main"><div class="rd-bg"></div><i class="rd-tgt"></i><div class="rd-total">누적 피해<b>0억</b></div><span class="rd-tag"></span><button type="button" class="rd-x" data-r="exit" aria-label="닫기">✕</button>' +
      '<div class="rd-play"></div><div class="rd-msg"></div><div class="rd-hand"><div class="rd-deck"><i></i><span></span></div></div>' +
      '<div class="rd-ctl"><button type="button" class="rb blue" data-r="go">출격</button><div class="rd-sort"><span>정렬</span><button type="button" class="rb org" data-s="c">기업</button><button type="button" class="rb gry" data-s="e">코드</button></div><button type="button" class="rb red" data-r="disc">버리기</button><button type="button" class="rb gry" data-r="flt" style="min-width:0;font-size:13px">필터</button></div>' +
      '<div class="rd-flt" hidden><div class="rd-fgs">' +
      '<div class="rd-fg">' + CYC.map((k) => '<button type="button" data-k="e" data-v="' + k + '" title="' + ELN[k] + '">' + (d0.elIco ? '<img class="fe" alt="' + ELN[k] + '" src="' + d0.elIco[k] + '">' : ELN[k]) + '</button>').join('') + '</div>' +
      '<div class="rd-fg">' + COS.map((k) => '<button type="button" data-k="c" data-v="' + k + '" title="' + k + '">' + hx(d0.coIco && d0.coIco[k] ? '<img alt="' + k + '" src="' + d0.coIco[k] + '">' : COL[k], 'fc') + (k === '필그림' ? '<small>×2</small>' : '') + '</button>').join('') + '</div>' +
      '<div class="rd-fg">' + [['1', 'I'], ['2', 'II'], ['3', 'III']].map((v) => '<button type="button" data-k="b" data-v="' + v[0] + '" title="버스트 ' + v[1] + '">' + hx(v[1]) + '</button>').join('') + '</div>' +
      '<div class="rd-fg">' + ['NEAR', 'MID', 'FAR'].map((k) => '<button type="button" data-k="r" data-v="' + k + '" title="' + k + '"><span class="fw">' + RNG[k].map(wpi).join('') + '</span></button>').join('') + '</div>' +
      '<div class="rd-fc" style="margin-left:auto;color:#ffd24a;font-size:14px;display:flex;align-items:center;gap:3px"></div></div>' +
      '<div class="rd-pool"><div class="rd-ph"></div><div class="rd-pl"></div></div></div>' +
      '<div class="rd-ov rd-gate" hidden><div class="rd-box"></div></div>' +
      '<div class="rd-ov rd-fin" hidden><div class="rd-box"><h3>RAID SCORE</h3><div class="rd-fs"><b>0</b><small>억</small></div><div class="rd-rkl"></div><div class="rd-fd"></div><button type="button" class="rb blue" data-r="again">재도전</button><button type="button" class="rb pur" data-r="rank">랭킹</button></div></div>' +
      '</main>' +
      '<div class="rd-modal rd-rule" hidden><div class="rd-mb"><h3>족보</h3><div class="rd-eq">점수 = <b class="c">칩</b> × <b class="m">배수</b> × <b class="f">버스트</b></div><div class="rd-rg">' +
      '<div class="rd-w c"><h4>칩 · 니케마다 더함</h4><table><tr><td>티어</td><td>SSS 9 → F 1</td></tr><tr><td>돌파 (별 1개당)</td><td>+1</td></tr><tr><td>풀코강</td><td>+2</td></tr><tr><td>적정 사거리</td><td>+2</td></tr><tr><td>런처(RL)</td><td>항상 +1</td></tr><tr><td>우월코드</td><td>+2</td></tr><tr><td>3버스트 우월코드</td><td>+5</td></tr></table><p style="margin:4px 0 0;opacity:.85;font-size:12px">카드 오른쪽 위 숫자 = 티어 + 돌파</p></div>' +
      '<div class="rd-w m"><h4>배수 · 기업과 우월코드 각각</h4><table>' + [1, 2, 3, 4, 5, 6, 7, 8].map((k) => '<tr><td>' + HN[k] + (k === 5 ? ' <small>(5종 모두 다름)</small>' : k === 8 ? ' <small>(5명 모두 같음)</small>' : '') + '</td><td>+' + k + '</td></tr>').join('') + '<tr><td>스트레이트 플러시 <small>(한쪽 플러시 + 다른 쪽 스트레이트)</small></td><td>13</td></tr><tr><td>세트 니케 <small>(둘 다 편성)</small></td><td>+2</td></tr></table><p style="margin:4px 0 0;opacity:.9;font-size:11.5px">세트: 마스트·앵커(메이드) / 민트·프리카 / 블랑·누아르 / 아르카나·이사벨 / 유키코·퀸(마코토)</p></div>' +
      '<div class="rd-w f"><h4>버스트</h4><table><tr><td>1·2·3버스트가 모두 있음</td><td>×1</td></tr><tr><td>하나라도 빠짐</td><td>×0.8</td></tr></table></div></div>' +
      '<div style="text-align:center;margin-top:12px"><button type="button" class="rb gry" data-r="mx">닫기</button></div></div></div>' +
      '<div class="rd-modal rd-help" hidden><div class="rd-mb"><h3>도움말</h3><ol>' +
      '<li>카드 7장을 받습니다. <b>5명</b>으로 스쿼드를 짜서 보스에게 최대한 큰 피해를 주세요.</li>' +
      '<li>카드를 <b>누르면 선택</b>, <b>위로 쓸어 올리거나 끌면 스쿼드에 미리 배치</b>됩니다. 원하는 칸에 놓을 수 있고, 스쿼드 안에서도 끌어서 자리를 바꿉니다.</li>' +
      '<li>마음에 안 드는 카드는 1~5장 골라 <b>버리기</b>로 새로 받습니다. <b>필터</b>는 싱크칩을 내고 원하는 조건의 니케만 받습니다.</li>' +
      '<li>점수 = <b style="color:#4db5ff">칩</b> × <b style="color:#ff6b5e">배수</b>. 칩은 강한 니케·우월코드·적정 사거리로, 배수는 같은 기업·같은 우월코드를 모으는 족보로 올립니다.</li>' +
      '<li>1·2·3버스트를 모두 넣지 않으면 점수가 20% 깎입니다.</li>' +
      '<li>빛나는 아이콘은 이번 보스의 우월코드·적정 사거리입니다. 자세한 수치는 <b>족보</b>에서 볼 수 있습니다.</li></ol>' +
      '<div style="text-align:center;margin-top:12px"><button type="button" class="rb gry" data-r="mx">닫기</button></div></div></div>' +
      '<div class="rd-modal rd-rank" hidden><div class="rd-mb"><h3>랭킹</h3><div class="rd-rl"></div><div style="text-align:center;margin-top:12px"><button type="button" class="rb gry" data-r="mx">닫기</button></div></div></div>' +
      '</div>';
    root.addEventListener('click', (ev) => { if (ev.target.closest('[data-fs]')) { setFs(true); return; } onClick(ev); });
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onHover);
    window.addEventListener('pointermove', onMoveDrag); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', fit); try { new ResizeObserver(fit).observe(root); } catch (e) { /* 미지원 */ }
  }
  window.doroRaid = {
    card: (x, boss) => { addCss(); return cardHtml(x, boss); },
    mount(el) {
      if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; }
      if (!d.list.length) { setTimeout(() => window.doroRaid.mount(el), 400); return; } /* 데이터 로딩 대기 */
      if (root === el && S) { fit(); return; }
      root = el; DB = {}; d.list.forEach((x) => { if (x.code) DB[x.code] = x; });
      S = { mode: 'test', boss: null, cards: {}, hand: [], squad: [null, null, null, null, null], sel: new Set(), redraws: 3, tries: 0, max: 3, phase: 'idle', chips: 10000, sort: 'c', flt: { e: '', c: '', b: '', r: '' }, deckLeft: 0, deckN: 0, liveBest: 0 };
      build(); if (isMobile()) { rd().hidden = true; root.querySelector('.rd-launch').hidden = false; }
      fit(); deal(true);
    },
    _eval: evalSquad
  };
})();
