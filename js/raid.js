/* 포커레이드 (관리자 전용·미공개)
   점수 = 칩 합계 × 배수 합계 × 버스트 보정
   칩(니케별): 티어 9~1 · 돌파·코강 한 장당 +1(풀코강 +10) · 적정 사거리 +2(RL +1) · 우월코드 +2(3버스트 니케는 +5)
   배수: 족보(하이카드 1 · 페어 2 · 투페어 3 · 스트레이트 3 · 트리플 4 · 풀하우스 6 · 포카드 8 · 플러시 11)를 기업·우월코드에서 각각 계산해 더함
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
  const BACK = 'assets/img/raid-back.webp', BOSS_IMG = 'assets/img/raid-boss-1.webp', BOSS0 = { e: '풍', r: 'NEAR' };
  const bossNm = () => { let n = ''; try { n = window.doroCfg.get().raid.nm; } catch (e) { /* 설정 전 */ } return String(n || '승리의 여신').replace(/[&<>"]/g, ''); }; /* 보스 이름·배경은 관리 탭에서 바꿈(배경 = CSS 변수 --rd-boss) */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), slow = (ms) => sleep(ms * SLOW);
  const brkChip = (cnt) => Math.min(10, Math.max(0, cnt - 1)); /* 돌파·코강 한 장당 +1 */
  const HM = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 3, 6: 6, 7: 8, 8: 11 }, HORD = [1, 2, 3, 5, 4, 6, 7, 8]; /* 족보 번호 → 배수, 표에 적는 순서 */
  const BEST_K = 'dorosync-raid-sian', SND_K = 'dorosync-raid-snd', PROD = /github\.io$/.test(location.hostname); /* 배포 사이트: 효과음 버튼 없이 항상 켬 */
  const SETS0 = [['5130', '5131'], ['5172', '5173'], ['5008', '5009'], ['5140', '5013'], ['5180', '5179']], setsNow = () => { const d = data(); return Array.isArray(d.sets) ? d.sets : SETS0; }; /* 세트 니케(숨은 규칙, 족보 창에 없음): 둘 다 편성하면 각각 칩 +2. 서버와 같은 목록 */
  const CRIT = { base: 0.15, rng: 0.5, rl: 0.25, dmg: 0.5 }, CORE = [0, 0.1, 0.25, 0.5], ZN = ['MISS', '1존', '2존', '3존']; /* 크리티컬 확률(기본·추천 총기·RL)과 대미지, 코어 판정별 대미지. 서버와 같은 값 */
  const SLOW = 1 / 0.7 / 1.2; /* 정산 속도 */
  /* 효과음: 파일 없이 브라우저에서 바로 만듦. 칩이 오를수록 음이 높아짐 */
  let AC = null, sndMode = 1; try { const v = localStorage.getItem(SND_K); sndMode = 1; void v; } catch (e) { /* 무시 */ } /* 효과음 버튼은 없앰: 항상 켬 */ /* 1 전장(사슬·총·탄피) · 2 아케이드 · 0 끔 */
  const ac = () => { if (!sndMode) return null; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  function tone(f, dur, type, vol, f2, at) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); }
  function noise(dur, vol, at, lp) { const c = ac(); if (!c) return; const t = c.currentTime + (at || 0), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp || 1800; src.buffer = b; g.gain.value = vol || 0.15; src.connect(fl); fl.connect(g); g.connect(c.destination); src.start(t); }
  const PA = { /* 아케이드 */
    deal: (i) => noise(0.05, 0.1, (i || 0) * 0.08, 3500), sel: () => tone(740, 0.06, 'triangle', 0.07), unsel: () => tone(520, 0.06, 'triangle', 0.06), put: () => { tone(300, 0.09, 'square', 0.05, 180); noise(0.04, 0.08, 0, 2500); },
    disc: () => tone(420, 0.16, 'triangle', 0.06, 160), go: () => { tone(196, 0.5, 'sawtooth', 0.07, 392); tone(294, 0.5, 'triangle', 0.06, 588); },
    chip: (i) => { const f = 440 * Math.pow(1.0595, Math.min(36, i)); tone(f, 0.09, 'square', 0.045); tone(f * 2, 0.07, 'triangle', 0.04); },
    mult: (i) => { const f = 330 * Math.pow(1.122, i); tone(f, 0.3, 'sawtooth', 0.06); tone(f * 1.5, 0.34, 'triangle', 0.07, 0, 0.05); tone(f * 2, 0.4, 'triangle', 0.06, 0, 0.1); },
    bad: () => tone(200, 0.35, 'sawtooth', 0.07, 90), ok: () => { tone(660, 0.12, 'triangle', 0.07); tone(990, 0.2, 'triangle', 0.07, 0, 0.1); },
    whoosh: () => noise(0.22, 0.06, 0, 900), hit: (k) => { noise(0.16 + 0.2 * k, 0.09 + 0.16 * k, 0, 700 + 900 * k); tone(150, 0.22 + 0.25 * k, 'sine', 0.1 + 0.16 * k, 42); tone(880 + 700 * k, 0.1, 'square', 0.02 + 0.02 * k); },
    fin: (nb) => (nb ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]).forEach((f, i) => { tone(f, 0.3, 'triangle', 0.09, 0, i * 0.1); tone(f / 2, 0.3, 'square', 0.03, 0, i * 0.1); }),
    tap: () => tone(600, 0.04, 'square', 0.03), open: () => tone(500, 0.08, 'triangle', 0.05, 800), count: (i) => tone(880 + i * 12, 0.03, 'square', 0.02), ban: () => tone(262, 0.2, 'sawtooth', 0.04, 523)
  };
  /* 전장: 금속성 소리(사슬·노리쇠·탄창·탄피)와 총성 */
  const metal = (f, dur, vol, at) => { [1, 1.483, 2.371, 3.12].forEach((r, i) => tone(f * r, dur * (1 - i * 0.15), i ? 'square' : 'triangle', vol / (1 + i * 0.8), 0, at)); };
  const clack = (vol, at, lp) => { noise(0.035, vol, at, lp || 3800); tone(1500, 0.03, 'square', vol * 0.25, 600, at); };
  const HV = 0.5; /* 총성 볼륨 */
  const chain = (dur, f0, vol, at) => { for (let t = 0; t < dur; t += 0.042) metal(f0 + Math.random() * 500, 0.05, vol, (at || 0) + t); }; /* 사슬 */
  const PW = {
    deal: (i) => { const t = (i || 0) * 0.08; noise(0.03, 0.11, t, 5200); tone(950, 0.03, 'triangle', 0.05, 320, t); }, /* 플라스틱 카드가 튕기는 소리 */
    sel: () => { metal(3100, 0.06, 0.028, 0); noise(0.015, 0.07, 0, 6000); }, unsel: () => { metal(1250, 0.09, 0.03, 0); clack(0.07, 0, 1500); }, /* 스틸 틱 / 걸쇠 풀림 */
    put: () => { noise(0.05, 0.15, 0, 2200); tone(240, 0.06, 'sine', 0.12, 120); metal(2300, 0.05, 0.014, 0.012); }, /* 스틸 판 위에 카드를 탁 */
    disc: () => { noise(0.22, 0.12, 0, 3000); tone(1800, 0.2, 'sawtooth', 0.02, 500); chain(0.2, 2400, 0.02, 0); }, /* 철판 위를 미끄러지는 소리 + 사슬 */
    go: () => { chain(0.55, 1000, 0.03, 0); noise(0.35, 0.3, 0.55, 350); tone(58, 0.5, 'sine', 0.3, 30, 0.55); metal(300, 0.6, 0.05, 0.55); }, /* 사슬 감기 → 철문 쾅 */
    reload: () => { clack(0.13, 0, 2000); clack(0.15, 0.11, 3200); metal(2100, 0.05, 0.02, 0.2); }, /* 탄창 교체 + 노리쇠 */
    chip: (i) => { metal(1500 * Math.pow(1.0595, Math.min(34, i)), 0.13, 0.04, 0); noise(0.02, 0.05, 0, 6000); }, /* 탄피가 튀는 소리, 점점 높아짐 */
    mult: (i) => { const f = 440 * Math.pow(1.122, i); metal(f, 0.55, 0.08, 0); noise(0.03, 0.2, 0, 5000); tone(f / 4, 0.25, 'sine', 0.2, f / 8); }, /* 모루를 내리치는 소리, 점점 높아짐 */
    bad: () => { clack(0.12, 0, 1500); tone(140, 0.4, 'sawtooth', 0.08, 70, 0.05); }, ok: () => { metal(1800, 0.2, 0.05, 0); metal(2700, 0.25, 0.05, 0.1); },
    charge: (w) => { let t = 0, g = 0.13, n = 0; while (t < 0.98) { metal((w === 'RL' ? 800 : 1300) + n * 70, 0.04, 0.024, t); t += g; g = Math.max(0.028, g * 0.86); n++; } tone(w === 'RL' ? 70 : 110, 1, 'sawtooth', 0.03, w === 'RL' ? 280 : 440); }, /* 1초: 래칫이 점점 빨리 감김 */
    gun: (w, k) => { const v = HV * (0.7 + 0.3 * k); /* 총기별 총성 */
      if (w === 'SMG') { noise(0.05, 0.3 * v, 0, 4600); tone(260, 0.05, 'sine', 0.22 * v, 90); }
      else if (w === 'MG') { noise(0.08, 0.46 * v, 0, 2200); tone(120, 0.09, 'sine', 0.45 * v, 45); }
      else if (w === 'SG') { noise(0.3, 0.75 * v, 0, 1800); noise(0.5, 0.3 * v, 0.02, 400); tone(90, 0.3, 'sine', 0.6 * v, 35); clack(0.14 * v, 0.32, 1800); clack(0.14 * v, 0.42, 2800); }
      else if (w === 'SR') { noise(0.35, 0.75 * v, 0, 3800); noise(0.8, 0.25 * v, 0.03, 500); tone(110, 0.4, 'sine', 0.6 * v, 30); metal(3600, 0.16, 0.03, 0.35); }
      else if (w === 'RL') { noise(0.3, 0.25 * v, 0, 900); tone(200, 0.2, 'sawtooth', 0.08 * v, 90); }
      else { noise(0.09, 0.42 * v, 0, 3200); tone(180, 0.08, 'sine', 0.35 * v, 60); } },
    boom: (k) => { const v = HV * (0.8 + 0.4 * k); noise(0.7, 0.8 * v, 0, 900); noise(1, 0.3 * v, 0.05, 250); tone(60, 0.7, 'sine', 0.8 * v, 24); },
    fin: (nb) => { [0, 0.14, 0.28].forEach((d) => { noise(0.2, 0.2, d, 420); tone(65, 0.22, 'sine', 0.3, 40, d); }); (nb ? [196, 247, 294, 392, 494] : [196, 247, 294, 392]).forEach((f, i) => { tone(f, 0.45, 'sawtooth', 0.06, 0, 0.42 + i * 0.09); tone(f * 1.5, 0.45, 'sawtooth', 0.035, 0, 0.42 + i * 0.09); }); },
    tap: () => { tone(900, 0.025, 'triangle', 0.04, 400); noise(0.015, 0.05, 0, 4000); }, open: () => { clack(0.1, 0, 2000); metal(1400, 0.08, 0.02, 0.03); }, count: (i) => metal(2400 + i * 18, 0.04, 0.015, 0), ban: () => { noise(0.18, 0.1, 0, 500); tone(90, 0.25, 'sine', 0.2, 50); }
  };
  PA.reload = () => PA.tap(); PA.gun = (w, k) => PA.hit(0.2 + 0.3 * k); PA.boom = (k) => PA.hit(0.5 + 0.3 * k); PA.charge = () => tone(300, 0.3, 'triangle', 0.04, 900);
  /* 출격 중 배경음: 낮은 맥박 + 초침 소리(작게) */
  let bgmT = 0, bgmN = 0;
  const bgm = { stop() { clearInterval(bgmT); bgmT = 0; }, start() { this.stop(); if (!ac()) return; bgmN = 0;
    const step = () => { const i = bgmN++, f = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49][i % 8]; tone(f, 0.17, 'sawtooth', 0.03); tone(f * 2, 0.1, 'square', 0.01); if (i % 2 === 0) noise(0.025, 0.018, 0, 7000); if (i % 8 === 4) noise(0.09, 0.03, 0, 1200); if (i % 16 === 15) metal(660, 0.2, 0.012, 0); };
    step(); bgmT = setInterval(step, 185); } };
  const sfx = new Proxy({}, { get: (_, k) => (...a) => { const pk = sndMode === 2 ? PA : PW; try { (pk[k] || PA[k] || (() => {}))(...a); } catch (e) { /* 소리 실패는 무시 */ } } });
  const data = () => (window.doroRaidData ? window.doroRaidData() : { ok: false, list: [] });
  const acct = () => window.doroAccount || null;

  const CSS = `
/* ---- 입장 연출: 승강기 게이트가 위아래로 닫히고, 톱니 장치가 내려와 박힌 뒤 모의전/도전 선택 → 보스가 올라오고 게이트가 열림 ---- */
.rd-in{position:absolute;inset:0;z-index:60;overflow:hidden;font-family:"Arial Black","Pretendard","Malgun Gothic",sans-serif;container-type:size}.rd-in[hidden]{display:none}
.rd-in-g{position:absolute;left:0;right:0;height:50.2%;background:radial-gradient(ellipse 22% 30% at 12% 30%,rgba(0,0,0,.42),transparent 70%),radial-gradient(ellipse 30% 22% at 78% 64%,rgba(0,0,0,.36),transparent 70%),radial-gradient(ellipse 14% 40% at 58% 18%,rgba(70,38,14,.3),transparent 72%),radial-gradient(ellipse 18% 26% at 33% 82%,rgba(84,46,16,.26),transparent 70%),radial-gradient(ellipse 9% 55% at 91% 30%,rgba(0,0,0,.3),transparent 75%),linear-gradient(90deg,transparent 21.6%,rgba(0,0,0,.34) 21.8% 22.3%,transparent 22.6%,transparent 67.2%,rgba(60,32,12,.36) 67.4% 67.9%,transparent 68.2%),linear-gradient(101deg,transparent 43%,rgba(255,255,255,.035) 43.2% 43.5%,transparent 43.8%),linear-gradient(90deg,rgba(0,0,0,.6),transparent 14%,transparent 86%,rgba(0,0,0,.6)),linear-gradient(#2a2c31,#1b1c20);box-shadow:inset 0 0 70px rgba(0,0,0,.75)}
.rd-in-g.t{top:0;transform:translateY(-101%);border-bottom:3px solid #050506}.rd-in-g.b{bottom:0;transform:translateY(101%);border-top:2px solid #474a50}
.rd-in-g:before{content:"";position:absolute;left:0;right:0;height:27%;background:radial-gradient(ellipse 16% 70% at 24% 40%,rgba(0,0,0,.5),transparent 70%),radial-gradient(ellipse 22% 60% at 70% 70%,rgba(0,0,0,.42),transparent 70%),radial-gradient(ellipse 10% 80% at 47% 20%,rgba(96,52,18,.34),transparent 72%),radial-gradient(ellipse 12% 50% at 88% 30%,rgba(0,0,0,.4),transparent 70%),linear-gradient(90deg,transparent 35.4%,rgba(0,0,0,.5) 35.6% 35.9%,transparent 36.1%,transparent 80.2%,rgba(0,0,0,.4) 80.4% 80.7%,transparent 80.9%),repeating-linear-gradient(-55deg,#141517 0 44px,#665f3c 44px 88px);opacity:.82;box-shadow:inset 0 0 34px rgba(0,0,0,.6),0 -12px 0 #17181b,0 -13px 0 #474a51,0 -16px 0 #060607,0 12px 0 #17181b,0 13px 0 #2e3035,0 16px 0 #060607} /* 낡은 경고 줄무늬 판 + 위아래 어두운 스틸 테두리 */
.rd-in-g.t:before{bottom:5%}.rd-in-g.b:before{top:5%} /* 경고 줄무늬 두 줄: 가운데 이음매(= 톱니바퀴 중심)를 사이에 두고 위아래로 */
.rd-in-g:after{content:"";position:absolute;left:0;right:0;height:5%;background:linear-gradient(#0c0d0f,#25272c 45%,#0c0d0f)}.rd-in-g.t:after{bottom:0}.rd-in-g.b:after{top:0}
.rd-in-sh,.rd-in-sil{position:absolute;inset:0;-webkit-mask-image:radial-gradient(circle,#000 1.7px,transparent 2.3px),linear-gradient(#000 0 33.9%,transparent 33.9% 66.1%,#000 66.1%);mask-image:radial-gradient(circle,#000 1.7px,transparent 2.3px),linear-gradient(#000 0 33.9%,transparent 33.9% 66.1%,#000 66.1%);-webkit-mask-size:7px 7px,100% 100%;mask-size:7px 7px,100% 100%;-webkit-mask-composite:source-in;mask-composite:intersect} /* 타공 철판의 구멍으로만 뒤가 보임. 가운데 경고 줄무늬 판은 구멍 없는 별도 철판 */
.rd-in-sh{opacity:0;overflow:hidden;background:#040506}.rd-in-sh i{position:absolute;left:0;right:0;top:-100%;height:200%}
.rd-in-sh .f{background:linear-gradient(90deg,transparent 0 2.2%,#e4e9f0 2.2% 2.7%,transparent 2.7% 4.4%,#b9c0cb 4.4% 4.8%,transparent 4.8% 95.2%,#b9c0cb 95.2% 95.6%,transparent 95.6% 97.3%,#e4e9f0 97.3% 97.8%,transparent 97.8%),
 repeating-linear-gradient(180deg,transparent 0 96px,rgba(150,160,176,.85) 96px 106px,rgba(20,22,26,.9) 106px 110px,transparent 110px 240px),
 repeating-linear-gradient(55deg,transparent 0 58px,rgba(96,104,118,.55) 58px 63px,transparent 63px 120px),repeating-linear-gradient(-55deg,transparent 0 58px,rgba(96,104,118,.55) 58px 63px,transparent 63px 120px),
 linear-gradient(90deg,#3d4350,#23262e 22%,#15171c 50%,#23262e 78%,#3d4350)} /* 빠르게 흘러가는 통로 벽: 가장자리 은색 두 줄 · 가로 보 · X자 보강재 */
.rd-in-sh .s{left:29%;right:auto;width:14%;background:radial-gradient(circle,#ffb648 0 2.6px,rgba(255,150,40,.5) 3px 6px,transparent 7px) 6% 0/100% 360px repeat-y,radial-gradient(circle,#ffb648 0 2.6px,rgba(255,150,40,.5) 3px 6px,transparent 7px) 94% 180px/100% 360px repeat-y,
 repeating-linear-gradient(180deg,transparent 0 52px,rgba(15,17,20,.9) 52px 58px,transparent 58px 120px),
 linear-gradient(90deg,transparent 0 18%,#5f6775 18% 21%,#c9d0da 21% 30%,#5f6775 30% 34%,transparent 34% 66%,#5f6775 66% 70%,#c9d0da 70% 79%,#5f6775 79% 82%,transparent 82%)}.rd-in-sh .s.b{left:57%} /* 천천히 흘러가는 레일 한 세트(레일 두 줄 + 표시등). 가운데를 비우고 좌우에 한 세트씩 */
.rd-in-sh .fl{background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(210,225,255,.55),transparent 75%);top:0;height:100%;opacity:0;mix-blend-mode:screen} /* 빠르게 지나가는 벽등: 번쩍임 */
.rd-in-sil{opacity:0;background:var(--rd-boss,url(${BOSS_IMG})) 50% 12%/cover;filter:grayscale(1) contrast(1.6) brightness(.8)}
.rd-in-gear{position:absolute;left:50%;top:50%;height:min(60cqh,72cqw);aspect-ratio:1;transform:translate(-50%,-260%);filter:drop-shadow(0 14px 18px rgba(0,0,0,.75))}
.rd-in-gear svg{position:absolute;inset:0;width:100%;height:100%;will-change:transform}
.rd-in-grime{position:absolute;inset:0;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse 30% 22% at 24% 22%,rgba(0,0,0,.4),transparent 70%),radial-gradient(ellipse 24% 30% at 80% 74%,rgba(0,0,0,.42),transparent 70%),radial-gradient(ellipse 16% 26% at 74% 20%,rgba(96,50,16,.3),transparent 72%),radial-gradient(ellipse 22% 14% at 30% 86%,rgba(90,48,16,.28),transparent 70%),radial-gradient(ellipse 8% 30% at 9% 56%,rgba(0,0,0,.34),transparent 72%),linear-gradient(112deg,transparent 57%,rgba(255,255,255,.05) 57.3% 57.7%,transparent 58%)} /* 낡은 금속의 때와 녹 */
.rd-in-scr{position:absolute;inset:19.4%;border-radius:50%;overflow:hidden;background:repeating-linear-gradient(98deg,rgba(0,0,0,.2) 0 2px,transparent 2px 9px),repeating-linear-gradient(84deg,rgba(255,60,40,.05) 0 5px,transparent 5px 17px),radial-gradient(circle at 50% 45%,#2a0505,#0a0202 75%);box-shadow:inset 0 0 30px #000,inset 0 0 0 2px #000;display:grid;place-items:center;text-align:center;color:#ff2a22;container-type:inline-size}
.rd-in-scr:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 4px);pointer-events:none}
.rd-in-scr>div{grid-area:1/1;opacity:0}
.rd-in-scr .es{font-size:15cqw;line-height:1.05;font-style:italic;letter-spacing:-.02em;transform:rotate(-7deg);text-shadow:0 0 14px #ff1a12;border-top:.5cqw dashed #ff2a22;border-bottom:.5cqw dashed #ff2a22;padding:3cqw 0}
.rd-in-scr.on{background:repeating-linear-gradient(98deg,rgba(0,0,0,.2) 0 2px,transparent 2px 9px),repeating-linear-gradient(84deg,rgba(255,90,60,.06) 0 5px,transparent 5px 17px),radial-gradient(circle at 50% 45%,#8c0d0a,#3a0504 55%,#120202 85%)}.rd-in-scr.on .es{animation:rdInFl .9s steps(1) forwards}.rd-in-scr.nm .es{animation:none;opacity:0}
@keyframes rdInFl{0%{opacity:0}8%{opacity:1}16%{opacity:.2}24%{opacity:1}100%{opacity:1}}
.rd-in-scr .bn{display:flex;flex-direction:column;align-items:center;gap:2cqw;transition:opacity .35s}.rd-in-scr.nm .bn{opacity:1}
.rd-in-scr .bn small{font-size:5cqw;letter-spacing:.3em;color:#ff7a6e;opacity:.8}.rd-in-scr .bn b{font-size:15cqw;line-height:1.1;text-shadow:0 0 16px #ff1a12;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:900;word-break:keep-all;max-width:88cqw}.rd-in-scr .bn span{font-size:5.4cqw;color:#ffb3a8;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.rd-in-p{position:absolute;left:0;right:0;bottom:0;padding:12px 14px 16px;text-align:center;color:#fff;background:repeating-linear-gradient(-55deg,rgba(255,255,255,.035) 0 22px,transparent 22px 44px),#26282d;border-top:2px dashed #b9a24a;box-shadow:0 -10px 30px rgba(0,0,0,.6);transform:translateY(105%)}
.rd-in-p em{display:block;font-style:italic;font-size:12px;letter-spacing:.2em;color:#ff4a3d}.rd-in-p p{margin:4px 0 10px;font:700 12.5px/1.5 "Pretendard","Malgun Gothic",sans-serif;color:#d7dbe2}
.rd-in-p>div{display:flex;gap:10px;justify-content:center;align-items:stretch;flex-wrap:wrap}
.rd-in-b{min-width:150px;padding:10px 18px;border-radius:8px;color:#fff;cursor:pointer;font:inherit;font-size:17px;border:3px solid #0a4f8c;background:#0d8bf2;box-shadow:0 4px 0 rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,255,255,.18);transition:transform .06s}.rd-in-b:active{transform:translateY(3px)}
.rd-in-b.red{border-color:#7a1a12;background:repeating-linear-gradient(55deg,rgba(255,255,255,0) 0 14px,rgba(255,255,255,.07) 14px 28px),#e33a2c}.rd-in-b small{display:block;font:700 11.5px "Pretendard","Malgun Gothic",sans-serif;opacity:.9;margin-top:2px}
/* ---- 카드 (포커레이드·도감 공용) ---- */
.pk{width:var(--cw);aspect-ratio:9/16;flex:none;position:relative;font-size:calc(var(--cw)/8.4);perspective:520px;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
.pk *{box-sizing:border-box}
.pk-in{position:absolute;inset:0;border-radius:.75em;overflow:hidden;border:.26em solid transparent;background:linear-gradient(#1a1e22,#1a1e22) padding-box,linear-gradient(150deg,#f4f6f8 0,#8a929a 16%,#e8ecef 30%,#59616a 48%,#d3d9de 64%,#737b83 80%,#eef1f3 100%) border-box;box-shadow:0 .3em 0 rgba(0,0,0,.35),0 .5em .9em rgba(0,0,0,.35);transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(var(--hs,1));transition:transform .12s,box-shadow .12s}
.pk-in:after{content:"";position:absolute;inset:0;z-index:8;pointer-events:none;border-radius:.5em;box-shadow:inset 0 0 0 .13em var(--ec,#888),inset 0 0 .55em var(--ec,#888)}
.pk-gg{position:absolute;left:8%;right:8%;top:-1.1em;height:.55em;z-index:12;border-radius:.3em;background:rgba(10,12,16,.8);border:1px solid #cfd5da;overflow:hidden}.pk-gg i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd24a,#ff6b3d);animation:pkGg 1s linear forwards}@keyframes pkGg{to{width:100%}}
.pk-gl{position:absolute;inset:0;z-index:7;pointer-events:none;opacity:var(--go,0);background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.38),rgba(255,255,255,0) 55%);transition:opacity .15s}
.pk-pt{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%;pointer-events:none}
.pk-fx{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;display:none}
.pk.foil .pk-fx,.pk.poly .pk-fx{display:block}
.pk-fx:before{content:"";position:absolute;left:-150%;width:400%;top:-60%;height:220%;transform:rotate(24deg) translateX(0);animation:pkFx 3.6s linear infinite;will-change:transform}
.pk.foil .pk-fx{mix-blend-mode:overlay;opacity:.82;-webkit-mask-image:radial-gradient(ellipse 62% 40% at 55% 36%,rgba(0,0,0,.12) 35%,#000 100%);mask-image:radial-gradient(ellipse 62% 40% at 55% 36%,rgba(0,0,0,.12) 35%,#000 100%)}.pk.foil .pk-in{box-shadow:0 .3em 0 rgba(0,0,0,.35),0 .5em .9em rgba(0,0,0,.35),0 0 .5em rgba(200,225,255,.35)}.pk.foil .pk-fx:after{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.95) 0,rgba(255,255,255,0) 1.4px) 0 0/11px 13px,radial-gradient(circle,rgba(210,230,255,.9) 0,rgba(255,255,255,0) 1.2px) 5px 7px/17px 15px;animation:pkTw 2.2s ease-in-out infinite alternate}@keyframes pkTw{from{opacity:.1}to{opacity:.6}}
.pk.foil .pk-fx:before{animation-duration:2.8s;background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.9) 4.5%,rgba(255,255,255,.9) 6.5%,rgba(170,205,255,.55) 9.5%,rgba(255,255,255,0) 13.5%,rgba(255,255,255,.55) 18%,rgba(255,255,255,0) 21%,rgba(255,255,255,0) 25%)}
.pk.poly .pk-fx{mix-blend-mode:color-dodge;opacity:.5;-webkit-mask-image:radial-gradient(ellipse 62% 40% at 55% 36%,rgba(0,0,0,.18) 35%,#000 100%);mask-image:radial-gradient(ellipse 62% 40% at 55% 36%,rgba(0,0,0,.18) 35%,#000 100%)}
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
.pk-bk{position:absolute;inset:0;z-index:9;border-radius:.75em;overflow:hidden;background:url(${BACK}) center/cover padding-box,linear-gradient(150deg,#f4f6f8 0,#8a929a 16%,#e8ecef 30%,#59616a 48%,#d3d9de 64%,#737b83 80%,#eef1f3 100%) border-box;border:.26em solid transparent;transform:scaleX(-1)}
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
.rd-bi{display:flex;align-items:center;justify-content:center;gap:10px}.rd-rc{display:flex;flex-direction:row;align-items:center;gap:8px}.rd-rc>img{width:24px;height:auto}
.rd-bi b{font-size:14px}
.rd-wps{display:inline-flex;gap:2px;background:#fff;border-radius:7px;padding:2px 5px;vertical-align:middle}.rd-wps img{width:19px;height:19px;display:block}
.rd-hn{font-size:14px;text-align:center;min-height:44px;display:flex;flex-direction:column;justify-content:center;gap:2px;line-height:1.25;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.rd-hl{display:inline-flex;align-items:center;justify-content:center;gap:3px;flex-wrap:wrap}.rd-hl em{font-style:normal;margin-left:3px}.rd-hi{width:19px;height:19px;object-fit:contain}.rd-hl.dim{opacity:.55}
.rd-hn small{font-size:11px;opacity:.78;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.rd-cm{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;margin-top:5px}
.rd-cm b{display:block;border-radius:9px;padding:4px 8px;font-size:23px;line-height:1.1;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.rd-chips{background:#0d8bf2;text-align:right}.rd-mult{background:#f0483c;text-align:left}
.rd-cm i{font-style:normal;font-size:20px;color:#f0483c}
.rd-ex{display:flex;justify-content:space-between;align-items:baseline;margin-top:7px;font-size:11px}
.rd-ex b{font-size:22px;color:#ffb347;text-shadow:0 2px 0 #5a2a00}.rd-ex b.rg{font-size:16px;white-space:nowrap}.rd-ex b small{opacity:.7;margin:0 2px;font-size:.85em}
.rd-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
.rd-row b{font-size:17px;background:#23262d;border-radius:8px;padding:2px 10px;min-width:86px;text-align:right}
.rd-st{display:grid;grid-template-columns:1fr 1.5fr;gap:6px}
.rd-st div{background:#16191e;border-radius:10px;padding:5px;text-align:center;font-size:11px;box-shadow:0 3px 0 #0c0e11}
.rd-st .ch{display:grid;place-items:center;cursor:pointer}.rd-st .ch b{display:flex;align-items:center;justify-content:center;gap:5px}.rd-st .ch b svg,.rd-ctl .rb svg{width:18px;height:18px;flex:none}.rd-ctl .rb svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px}
.rd-st b{display:block;font-size:19px;line-height:1.2}
.rd-st .rdw b{color:#ff6b5e}.rd-st .ch b{color:#ffd24a}
.rd-sb{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
.rd-half{display:flex;gap:5px;position:relative}.rd-half [data-r=hint]{transition:flex-grow .28s cubic-bezier(.3,1.3,.5,1),transform .06s,filter .15s;white-space:nowrap}.rd-half [data-r=hint] em{display:inline-flex;align-items:center;gap:2px;font-style:normal;max-width:0;opacity:0;overflow:hidden;vertical-align:-3px;transition:max-width .28s,opacity .28s,margin .28s}
.rd-half.arm [data-r=hint]{flex-grow:3.2}.rd-half.arm [data-r=hint] em{max-width:70px;opacity:1;margin-left:4px}
.rd-hb{position:absolute;left:0;bottom:calc(100% + 10px);z-index:9;white-space:nowrap;display:flex;align-items:center;gap:3px;background:#fff;color:#14161c;border-radius:11px;padding:6px 11px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800;font-size:12.5px;box-shadow:0 5px 14px rgba(0,0,0,.45);pointer-events:none;opacity:0;transform:translateY(10px) scale(.5);transform-origin:55% 100%;transition:opacity .3s ease,transform .42s cubic-bezier(.2,1.5,.4,1)}
.rd-hb:after{content:"";position:absolute;left:52%;top:100%;border:7px solid transparent;border-top-color:#fff;border-bottom:0}
.rd-half.arm .rd-hb{opacity:1;transform:none}.rd-half .rb{flex:1;padding:8px 0!important;font-size:14px!important}
.rd-chal{grid-column:1/-1;position:relative;overflow:hidden;border:3px solid #7a1a12;border-radius:8px;padding:9px 6px 8px;color:#fff;cursor:pointer;font:inherit;text-align:center;background:#e33a2c;box-shadow:0 4px 0 rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,255,255,.18);transition:transform .06s}
.rd-chal:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(55deg,rgba(255,255,255,0) 0 14px,rgba(255,120,90,.55) 14px 28px);background-size:68.4px 100%;animation:rdStripe 2.6s linear infinite}
@keyframes rdStripe{to{background-position:68.4px 0}}
.rd-chal.gv{background:#4a4f58;border-color:#22252b}.rd-chal.gv:before{opacity:.25}.rd-chal:active{transform:translateY(3px)}.rd-chal:disabled{filter:grayscale(.7) brightness(.7);cursor:default}
.rd-chal b,.rd-chal span{position:relative;display:block;text-shadow:0 2px 0 rgba(0,0,0,.45)}.rd-chal b{font-size:20px;letter-spacing:.06em}.rd-chal span{font-size:11.5px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800;margin-top:2px}
.rd-rem{grid-column:1/-1;margin:-3px 34px 0;text-align:center;font-size:11.5px;padding:3px 6px;background:#3a3f47;border:2px solid #23262d;border-top:0;border-radius:0 0 8px 8px;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:800}.rd-rem b{color:#ffd24a;margin-left:6px;font-family:"Arial Black",Arial,sans-serif}
.rd-fsb{position:absolute;right:8px;top:6px;z-index:9;width:32px;height:32px;border-radius:9px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:17px;cursor:pointer}.rd.fs .rd-fsb{display:none}
.rd:fullscreen{width:100vw;height:100vh;border:0;border-radius:0;grid-template-columns:300px minmax(0,1fr)}.rd:fullscreen .rd-side{zoom:1.25}.rd:fullscreen .rd-main{min-height:0}.rd:fullscreen .rd-ctl{zoom:1.2}
.rd .pk.rec .pk-in{box-shadow:0 0 0 .2em #8df0b0,0 0 1.2em #3fd68b}.rd .pk.recx .pk-in{box-shadow:0 0 0 .2em #ff6b5e,0 0 1.2em #f0483c}
.rd .pk.rec:after,.rd .pk.recx:after{content:"출격";position:absolute;left:50%;top:-1.5em;transform:translateX(-50%);z-index:9;font-size:1em;font-weight:900;padding:.05em .5em;border-radius:.5em;background:#35a36b;white-space:nowrap;font-family:"Pretendard","Malgun Gothic",sans-serif}.rd .pk.recx:after{content:"버리기";background:#f0483c}
.rd button.rb{border:0;border-radius:10px;padding:8px;font:inherit;font-size:13px;color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.4);transition:transform .06s,filter .15s}
.rd button.rb[hidden]{display:none}
.rd button.rb:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
.rd button.rb:disabled{filter:grayscale(.8) brightness(.6);cursor:default}
.rd .rb.red{background:#f0483c}.rd .rb.blue{background:#0d8bf2}.rd .rb.org{background:#f59a0c}.rd .rb.grn{background:#35a36b}.rd .rb.gry{background:#56646b}.rd .rb.pur{background:#8a56d6}
.rd-main{position:relative;padding:12px 12px 10px;min-height:600px;display:flex;flex-direction:column;overflow:hidden;background:#0e1013}
.rd-bg{position:absolute;inset:0;z-index:0;background:var(--rd-boss,url(${BOSS_IMG})) 50% 12%/cover;transform-origin:50% 30%}
.rd-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(14,16,20,.38),rgba(14,16,20,.5) 50%,rgba(14,16,20,.93) 82%)}
.rd-main.atk .rd-bg:after{background:linear-gradient(rgba(14,16,20,.12),rgba(14,16,20,.3) 50%,rgba(14,16,20,.93) 85%);transition:background .4s}
.rd-bg.hit{animation:rdHit .34s}
@keyframes rdHit{0%{transform:scale(1);filter:none}20%{transform:scale(calc(1 + .07*var(--hk,1))) translate(calc(8px*var(--hk,1)),calc(-5px*var(--hk,1)));filter:brightness(calc(1.2 + 1.3*var(--hk,1))) saturate(1.5)}50%{transform:scale(calc(1 + .04*var(--hk,1))) translate(calc(-6px*var(--hk,1)),calc(4px*var(--hk,1)));filter:brightness(1.3)}100%{transform:scale(1);filter:none}}
.rd-pt{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.rd-pt i{position:absolute;bottom:-12px;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:#ffc46b;box-shadow:0 0 6px 2px rgba(255,130,40,.75);opacity:0;animation:rdEmb var(--t) linear var(--d) infinite}
@keyframes rdEmb{0%{transform:translate(0,0) scale(1);opacity:0}8%{opacity:.95}60%{opacity:.7}100%{transform:translate(var(--dx),-85vh) scale(.3);opacity:0}}
.rd-pt b{position:absolute;bottom:-25%;left:var(--x);width:70%;height:70%;background:radial-gradient(closest-side,rgba(30,33,40,.6),rgba(30,33,40,0));filter:blur(18px);animation:rdSmk var(--t) linear var(--d) infinite}
@keyframes rdSmk{0%{transform:translate(-30%,10%) scale(.9);opacity:0}20%{opacity:.9}100%{transform:translate(60%,-45%) scale(1.5);opacity:0}}
.rd-pt u{position:absolute;inset:0;background:radial-gradient(circle at var(--x) 72%,rgba(255,205,130,.38),rgba(255,160,80,0) 26%);opacity:0;animation:rdFar 9s linear var(--d) infinite}
@keyframes rdFar{0%,100%{opacity:0}1.5%{opacity:1}3%{opacity:.2}4.5%{opacity:.8}8%{opacity:0}}
.rd-pt s{position:absolute;top:-8px;left:var(--x);width:2px;height:2px;border-radius:50%;background:rgba(210,214,220,.7);animation:rdAsh var(--t) linear var(--d) infinite}
@keyframes rdAsh{0%{transform:translate(0,0);opacity:0}10%{opacity:.8}100%{transform:translate(var(--dx),95vh);opacity:0}}
.rd-tgt{position:absolute;left:50%;top:27%;width:1px;height:1px;z-index:1}
.rd-burst{position:absolute;left:50%;top:27%;width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;z-index:4;pointer-events:none;background:radial-gradient(circle,#fff 0,rgba(255,210,74,.9) 22%,rgba(255,90,40,.55) 45%,rgba(255,90,40,0) 70%);animation:rdBurst .42s ease-out forwards}
@keyframes rdBurst{0%{transform:scale(.1);opacity:1}100%{transform:scale(calc(.5 + 1.6*var(--hk,1)));opacity:0}}
.rd-dmg{position:absolute;z-index:9;pointer-events:none;font-size:34px;white-space:nowrap;animation:rdDmg 1.2s cubic-bezier(.2,1.5,.4,1) forwards;font-family:"Anton","Arial Narrow","Arial Black",Arial,sans-serif;font-stretch:condensed;line-height:1;display:grid;justify-items:center}
.rd-dmg b{font-weight:900;letter-spacing:.01em;color:#fff;-webkit-text-stroke:.055em #1c1c20;paint-order:stroke fill;text-shadow:0 .06em 0 #1c1c20,0 0 .35em rgba(0,0,0,.75)}
.rd-dmg em{font-style:normal;font-size:.4em;font-weight:900;letter-spacing:.04em;margin-bottom:-.08em;color:#ffb3ae;-webkit-text-stroke:.09em #7a1512;paint-order:stroke fill}
.rd-dmg svg{position:absolute;left:-.62em;top:-.3em;width:.62em;height:.62em;fill:#ffb21c;stroke:#fff;stroke-width:1.6;paint-order:stroke fill;filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.rd-dmg.t1 b{color:#ffb21c;-webkit-text-stroke-color:#5a3200;text-shadow:0 .06em 0 #5a3200,0 0 .4em rgba(255,150,20,.6)}
.rd-dmg.t2 b{color:#f6a6a2;-webkit-text-stroke-color:#8c1d1a;text-shadow:0 .06em 0 #8c1d1a,0 0 .4em rgba(230,60,50,.55)}
.rd-dmg.t3 b{color:#ee4a47;-webkit-text-stroke-color:#5c0b0b;text-shadow:0 .06em 0 #5c0b0b,0 0 .45em rgba(255,40,40,.7)}.rd-dmg.t3 em{color:#ff8a84}.rd-dmg.t3 svg{fill:#141416;stroke:#ffb21c}
.rd-aim{position:absolute;inset:0;z-index:12;display:grid;place-items:center;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;font-family:"Pretendard","Malgun Gothic",sans-serif}
.rd-aim.end{pointer-events:none}.rd-aim.end .ra-box{transition:opacity .3s,transform .3s;opacity:0;transform:scale(1.06)}
.ra-box{margin-top:-9%;padding:8px 14px 10px;border-radius:16px;background:radial-gradient(ellipse at 50% 0,rgba(40,44,54,.94),rgba(8,9,12,.94));border:1px solid rgba(255,255,255,.22);box-shadow:0 14px 34px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.12);animation:raIn .14s ease-out}@keyframes raIn{from{transform:scale(.88);opacity:0}}
.ra-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;color:#fff;max-width:300px}.ra-top b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
.ra-top em{font-style:normal;font-weight:900;font-size:12px;letter-spacing:.06em;padding:2px 9px;border-radius:9px;color:#1a1205;background:#ffb84d;flex:none}.rd-aim.C .ra-top em{background:#6fc3ff;color:#06182a}.rd-aim.R .ra-top em{background:#5ef0a0;color:#062313}
.ra-dial{display:block;width:300px;max-width:74vw}.ra-dial .rz3{filter:drop-shadow(0 0 6px #ffd24a)}.rd-aim.T.end.z3 .rz3{fill:#fff}
.ra-col{display:flex;align-items:center;gap:16px;padding:4px 6px 2px}.ra-v{position:relative;width:46px;height:190px;border-radius:10px;background:#0b1622;box-shadow:inset 0 0 0 3px #05060a,0 0 0 1px rgba(255,255,255,.15);overflow:hidden}
.ra-v i{position:absolute;left:0;right:0}.ra-v .z1{background:#1d4a73}.ra-v .z2{background:#3f9be0}.ra-v .z3{background:#e6f6ff;box-shadow:0 0 10px #8fd3ff}
.ra-v .ra-fill{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,rgba(111,195,255,.2),rgba(111,195,255,.55));text-decoration:none}.ra-v .ra-nd{position:absolute;left:-3px;right:-3px;height:4px;margin-bottom:-2px;bottom:0;background:#fff;box-shadow:0 0 7px #fff,0 0 0 1px #000;text-decoration:none}
.ra-hint{display:grid;gap:5px;color:#c9d2e0;font-size:12px;line-height:1.45;text-align:left}.ra-hint b{font:italic 900 26px/1 "Arial Black",Arial,sans-serif;color:#6fc3ff;letter-spacing:.02em}.ra-hint u{text-decoration:none;color:#fff;font-weight:900}
.rd-aim.C.hold .ra-hint b{color:#fff;text-shadow:0 0 12px #6fc3ff}.rd-aim.C:not(.hold) .ra-hint b{animation:raPulse .7s ease-in-out infinite}@keyframes raPulse{50%{transform:scale(1.08);opacity:.75}}
.ra-tap{position:relative;display:grid;grid-template-columns:120px auto;align-items:center;gap:4px 16px;padding:4px 6px 2px}.ra-tap svg{width:120px;height:120px;grid-row:1/3}.ra-cnt{position:absolute;left:6px;top:4px;width:120px;height:120px;display:grid;place-items:center;font:900 46px/1 "Anton","Arial Black",Arial,sans-serif;color:#fff}
.ra-tap .ra-hint b{color:#5ef0a0;animation:raPulse .32s linear infinite}.ra-pips{display:flex;gap:5px;align-self:end}.ra-pips i{font-style:normal;font-weight:900;font-size:12px;min-width:26px;text-align:center;padding:2px 0;border-radius:7px;background:#1b2028;color:#7d8798}.ra-pips i.on{background:#5ef0a0;color:#062313;box-shadow:0 0 8px rgba(94,240,160,.7)}.ra-tap .ra-hint{align-self:start}
@keyframes rdDmg{0%{transform:translate(-50%,-50%) scale(.2) rotate(-8deg);opacity:0}18%{transform:translate(-50%,-50%) scale(1.35) rotate(4deg);opacity:1}60%{transform:translate(-50%,-110%) scale(1);opacity:1}100%{transform:translate(-50%,-170%) scale(.9);opacity:0}}
.rd-ban{position:absolute;left:50%;top:30%;z-index:9;pointer-events:none;text-align:center;white-space:nowrap;animation:rdBan .9s cubic-bezier(.2,1.5,.4,1) forwards}
.rd-ban b{display:block;font-size:30px;text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 14px rgba(0,0,0,.8)}.rd-ban i{display:inline-block;font-style:normal;font-size:20px;margin-top:4px;padding:2px 12px;border-radius:9px;background:#f0483c;box-shadow:0 3px 0 rgba(0,0,0,.4)}
.rd-ban.c i{background:#0d8bf2}.rd-ban.bad i{background:#56646b}.rd-ban.big b{font-size:42px;color:#ffd24a}
@keyframes rdBan{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}20%{transform:translate(-50%,-50%) scale(1.15);opacity:1}75%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-80%) scale(.95);opacity:0}}
.rd-mz{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;z-index:9;pointer-events:none;background:radial-gradient(circle,#fff 0,#ffe27a 35%,rgba(255,140,40,0) 70%);animation:rdMz .12s ease-out forwards}
@keyframes rdMz{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}
.rd-trc{position:absolute;height:2px;margin-top:-1px;z-index:5;pointer-events:none;transform-origin:0 50%;background:linear-gradient(90deg,rgba(255,226,122,0),#fff 60%,#ffe27a);animation:rdTr .14s linear forwards}
.rd-trc.rk{height:6px;margin-top:-3px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,160,60,.8) 70%,#fff);animation-duration:.2s}
@keyframes rdTr{0%{opacity:1;clip-path:inset(0 100% 0 0)}60%{opacity:1;clip-path:inset(0 0 0 0)}100%{opacity:0;clip-path:inset(0 0 0 60%)}}
.rd-imp{position:absolute;z-index:4;pointer-events:none;border-radius:50%;width:var(--sz,14px);height:var(--sz,14px);margin:calc(var(--sz,14px)/-2) 0 0 calc(var(--sz,14px)/-2);background:radial-gradient(circle,#fff 0,#ffe27a 30%,rgba(255,120,40,.7) 55%,rgba(255,90,40,0) 72%);animation:rdImp 2.6s ease-out forwards}
@keyframes rdImp{0%{transform:scale(.3);opacity:1;filter:brightness(2)}6%{transform:scale(1.7);opacity:1;filter:brightness(2)}16%{transform:scale(1);opacity:.9;filter:none}100%{transform:scale(.9);opacity:0}}
.rd-imp.ex{background:radial-gradient(circle,#fff 0,#ffd24a 22%,rgba(255,90,40,.85) 45%,rgba(120,40,20,.4) 62%,rgba(0,0,0,0) 74%)}
.rd .pk.chg{z-index:8}.rd .pk.chg .pk-in{animation:rdChg .32s ease-in forwards}
@keyframes rdChg{from{box-shadow:0 0 0 0 #ffd24a;filter:none}to{box-shadow:0 0 0 .3em #ffd24a,0 0 2em .6em #ffb300;filter:brightness(1.5)}}
.rd .pk.chg .pk-in{animation-duration:1s}
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
.rd-fgs{display:flex;flex-direction:column;gap:2px}.rd-fr{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}.rd-fg{gap:4px!important}
.rd-fg button{border:2px solid transparent;background:rgba(255,255,255,.07);color:#fff;border-radius:10px;padding:3px 5px;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:2px;font-size:13px;line-height:1}
.rd-fg button.on{border-color:#ffd24a;background:rgba(255,210,74,.28);box-shadow:0 0 8px rgba(255,210,74,.5)}
.rd-fg button small{font-size:10px;color:#ffd24a;margin-left:1px}
.rd-fg .fe{width:26px;height:auto;display:block}.rd-fg .pk-hx{font-size:13px}.rd-fg .fc{background:#2b3038}.rd-fg .fc img{width:1.3em;height:1.3em;object-fit:contain}
.rd-fg .fw{display:inline-flex;gap:1px;background:#fff;border-radius:7px;padding:2px 4px}.rd-fg .fw img{width:20px;height:20px}
.rd-pool{margin-top:6px;border-top:1px solid rgba(255,255,255,.12);padding-top:5px}.rd-ph{display:flex;justify-content:space-between;font-size:11.5px;opacity:.9;margin-bottom:4px}.rd-ph b{color:#ffd24a}
.rd-pl{display:flex;gap:4px;overflow-x:auto;padding:2px 0 6px;--cw:46px}.rd-pl .pk{cursor:default;touch-action:auto;transform:none}.rd-pl .pk-nm{display:none}
.rd-deck{position:relative;flex:none;align-self:center;z-index:1;width:calc(var(--cw)*.8);margin-left:calc(var(--cw)*.22);text-align:center;font-size:10.5px}
.rd-main.atk .rd-deck{display:none}
.rd-deck i{display:block;width:100%;aspect-ratio:9/16;border-radius:6px;border:3px solid transparent;background:url(${BACK}) center/cover padding-box,linear-gradient(150deg,#f4f6f8 0,#8a929a 16%,#e8ecef 30%,#59616a 48%,#d3d9de 64%,#737b83 80%,#eef1f3 100%) border-box;box-shadow:3px 3px 0 #0c0e10,6px 6px 0 rgba(0,0,0,.3);margin-bottom:9px}
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
.rd-help .rd-mb{max-width:520px;padding:0;overflow:hidden}
.hv-st{position:relative;height:250px;background:#0e1013 var(--rd-boss,url(${BOSS_IMG})) 50% 10%/cover;overflow:hidden;--cw:52px}
.hv-st:before{content:"";position:absolute;inset:0;background:rgba(14,16,20,.62)}
.hv-st .pk{cursor:default;touch-action:auto;position:absolute;bottom:22px;transform:none}
.hv-slot{position:absolute;top:18px;width:52px;height:92px;border-radius:5px;border:2px dashed rgba(255,255,255,.35);background:rgba(0,0,0,.3)}
.hv-n{position:absolute;left:12px;top:10px;z-index:3;font-family:"Arial Black",Arial,sans-serif;font-size:13px;background:#0d8bf2;border-radius:99px;padding:2px 10px}
.hv-big{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;display:flex;align-items:center;gap:8px;font-family:"Arial Black",Arial,sans-serif;font-size:26px;white-space:nowrap}
.hv-big b{border-radius:10px;padding:4px 12px;box-shadow:0 4px 0 rgba(0,0,0,.4)}.hv-big .c{background:#0d8bf2}.hv-big .m{background:#f0483c}.hv-big .s{color:#ffb347;text-shadow:0 3px 0 #7a2a00}
.hv-big>*{opacity:0;animation:hvIn .45s cubic-bezier(.2,1.6,.4,1) forwards}.hv-big>*:nth-child(2){animation-delay:.5s}.hv-big>*:nth-child(3){animation-delay:1s}.hv-big>*:nth-child(4){animation-delay:1.6s}.hv-big>*:nth-child(5){animation-delay:2.1s}
@keyframes hvIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
.hv-sub{position:absolute;left:0;right:0;bottom:14px;z-index:3;text-align:center;font-size:12.5px;font-weight:800;line-height:1.7}.hv-sub i{font-style:normal;border-radius:6px;padding:1px 7px;margin:0 2px}
.hv-pick{animation:hvPick 3.6s ease-in-out both}@keyframes hvPick{0%,12%{transform:none}22%,100%{transform:translateY(-22px)}}
.hv-up{animation:hvUp 3.6s cubic-bezier(.3,1.2,.5,1) both}@keyframes hvUp{0%,18%{transform:none}45%,100%{transform:translate(var(--dx,0),-118px)}}
.hv-out{animation:hvOut 3.6s ease-in both}@keyframes hvOut{0%,22%{transform:none;opacity:1}42%,100%{transform:translate(120px,-150px) rotate(40deg);opacity:0}}
.hv-in{animation:hvNew 3.6s cubic-bezier(.3,1.2,.5,1) both}@keyframes hvNew{0%,48%{transform:translate(220px,0) rotate(20deg);opacity:0}70%,100%{transform:none;opacity:1}}
.hv-atk{animation:hvAtk 3.6s cubic-bezier(.45,0,.3,1) both}@keyframes hvAtk{0%,20%{transform:none}38%{transform:translate(var(--dx,0),-120px) scale(.7) rotate(12deg)}55%,100%{transform:none}}
.hv-dmg{position:absolute;left:50%;top:26%;z-index:4;font-family:"Arial Black",Arial,sans-serif;font-size:34px;color:#ffb347;text-shadow:0 3px 0 #7a2a00;opacity:0;animation:hvDmg 3.6s both}@keyframes hvDmg{0%,36%{opacity:0;transform:translate(-50%,0) scale(.3)}42%{opacity:1;transform:translate(-50%,0) scale(1.3)}80%{opacity:1;transform:translate(-50%,-30px) scale(1)}100%{opacity:0;transform:translate(-50%,-50px)}}
.hv-bx{display:flex;gap:8px;position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:3}.hv-bx .pk-hx{font-size:26px}.hv-bx .x{animation:hvGone 3.6s both}@keyframes hvGone{0%,35%{opacity:1}50%,100%{opacity:.15}}
.hv-pen{position:absolute;left:50%;top:66%;transform:translateX(-50%);z-index:3;font-family:"Arial Black",Arial,sans-serif;font-size:24px;color:#ff8a80;opacity:0;animation:hvIn .45s 1.9s cubic-bezier(.2,1.6,.4,1) forwards}
.hv-fb{position:absolute;top:26px;left:0;right:0;display:flex;justify-content:center;gap:8px;z-index:3}.hv-fb img{width:40px;height:auto;border-radius:10px;padding:3px;border:2px solid transparent;background:rgba(255,255,255,.08)}
.hv-fb img.on{animation:hvOn 3.6s both}@keyframes hvOn{0%,24%{border-color:transparent;transform:none}30%{transform:scale(.85)}36%,100%{border-color:#ffd24a;background:rgba(255,210,74,.3);transform:none;box-shadow:0 0 10px rgba(255,210,74,.6)}}
.hv-cur{position:absolute;z-index:5;left:50%;top:48px;width:22px;height:22px;margin-left:-70px;border-radius:50%;border:3px solid #fff;background:rgba(255,255,255,.35);animation:hvCur 3.6s both}@keyframes hvCur{0%{transform:translate(120px,90px);opacity:0}10%{opacity:1}24%{transform:none}30%{transform:scale(.7)}36%{transform:none;opacity:1}50%,100%{opacity:0}}
.hv-fade{animation:hvFade 3.6s both}@keyframes hvFade{0%,40%{opacity:1;filter:none}55%,100%{opacity:.18;filter:grayscale(1)}}
.hv-tr{position:absolute;top:134px;height:2px;margin-top:-1px;width:var(--l);transform-origin:0 50%;transform:rotate(var(--a));background:linear-gradient(90deg,rgba(255,226,122,0),#fff 60%,#ffe27a);opacity:0;z-index:4;animation:hvTr 3.6s var(--d) both}@keyframes hvTr{0%,.5%{opacity:0}1%,3%{opacity:1}5%,100%{opacity:0}}
.hv-im{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;z-index:4;background:radial-gradient(circle,#fff 0,#ffe27a 30%,rgba(255,120,40,.7) 55%,rgba(255,90,40,0) 72%);opacity:0;animation:hvIm 3.6s var(--d) both}@keyframes hvIm{0%,.5%{opacity:0;transform:scale(.3)}1.5%{opacity:1;transform:scale(1.8)}6%{opacity:.9;transform:scale(1)}45%,100%{opacity:0}}
.hv-mz{position:absolute;left:260px;top:134px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;z-index:5;background:radial-gradient(circle,#fff 0,#ffe27a 40%,rgba(255,140,40,0) 70%);opacity:0;animation:hvMz 3.6s both}@keyframes hvMz{0%,26%{opacity:0}27%,29%,31%,33%,35%,37%,39%,41%,43%,45%,47%,49%,51%{opacity:1}28%,30%,32%,34%,36%,38%,40%,42%,44%,46%,48%,50%,52%,100%{opacity:0}}
.hv-rc{animation:hvRc 3.6s both}@keyframes hvRc{0%,14%,37%,100%{transform:none}16%,20%,24%,28%,32%,36%{transform:translateY(3px)}18%,22%,26%,30%,34%{transform:none}}.hv-rc2{animation:hvRc2 3.6s both}@keyframes hvRc2{0%,48%,54%,60%,66%,72%,78%,100%{transform:none}49%,61%,73%{transform:translateY(7px)}}
.hv-tot{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:5;font-family:"Arial Black",Arial,sans-serif;font-size:30px;color:#ffb347;text-shadow:0 3px 0 #7a2a00;background:rgba(12,14,18,.6);border-radius:12px;padding:2px 16px}
.hv-cap{padding:10px 14px 2px;font-size:14px;font-weight:800;text-align:center;min-height:54px;line-height:1.5}
.hv-bar{height:4px;background:rgba(255,255,255,.12)}.hv-bar i{display:block;height:100%;width:0;background:#0d8bf2}.hv-bar i.run{animation:hvBar 3.8s linear forwards}@keyframes hvBar{to{width:100%}}
.hv-ft{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 10px 12px}.hv-dots{display:flex;gap:5px}.hv-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.hv-dots i.on{background:#0d8bf2}
.hv-ft .rb{padding:6px 12px!important;font-size:13px!important}
.rd-rank .rd-mb{display:flex;flex-direction:column;padding:0;overflow:hidden;max-width:560px;background:#eef1f5;color:#20252b}
.rd-rkh{background:linear-gradient(#2f8cff,#1667d9);color:#fff;text-align:center;font-size:17px;font-weight:900;padding:9px 44px;position:relative}.rd-rkh small{display:block;font-size:12px;font-weight:700;opacity:.92;min-height:15px}.rd-rkh button{position:absolute;right:8px;top:6px;width:32px;height:32px;border:0;background:none;color:#fff;font-size:20px;cursor:pointer}
.rd-rl{flex:1;overflow:auto;padding:8px 10px;min-height:120px}
.rd-rk{display:grid;grid-template-columns:44px 52px minmax(0,1fr) auto 40px;gap:8px;align-items:center;padding:6px 8px;margin:6px 0;border-radius:12px;background:#fff;box-shadow:0 2px 0 #cfd6de,0 0 0 1px #dfe4ea}
.rd-rk.t1{border-left:8px solid #f5c21b}.rd-rk.t2{border-left:8px solid #c3ccd6}.rd-rk.t3{border-left:8px solid #e9a05b}
.rd-rk.me{box-shadow:0 0 0 2px #1667d9}
.rk-n{font-family:"Arial Black",Arial,sans-serif;font-size:21px;color:#6d7783;text-align:center;line-height:1}.rk-n small{font-size:9px;vertical-align:top}.t1 .rk-n{color:#d9a400}.t2 .rk-n{color:#8793a0}.t3 .rk-n{color:#c9772b}
.rk-pf{position:relative;width:44px;height:44px;border-radius:50%;background:#cfd6de;margin:4px}.rk-pf>img:first-child{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 15%;display:block}.rk-pf .ff{position:absolute;left:50%;top:50%;width:150%;height:150%;transform:translate(-50%,-50%);pointer-events:none}
.rk-nm{font-weight:900;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-sc{font-family:"Arial Black",Arial,sans-serif;font-size:16px;background:#e3e7ec;border-radius:9px;padding:5px 10px;white-space:nowrap}
.rk-dk{width:38px;height:38px;border-radius:10px;border:0;background:#e3e7ec;box-shadow:0 2px 0 #b9c2cc;cursor:pointer;font-size:16px}
.rk-deck{grid-column:1/-1;display:flex;gap:4px;justify-content:center;--cw:58px;padding:4px 0 2px}.rk-deck[hidden]{display:none}.rk-deck .pk{cursor:default;touch-action:auto;transform:none}.rk-deck small{align-self:center;margin-left:8px;font-weight:800;color:#56646b}
.rk-cut{display:flex;align-items:center;gap:8px;margin:8px 2px;font-size:12px;font-weight:900;color:#1667d9}.rk-cut:before,.rk-cut:after{content:"";flex:1;height:2px;background:repeating-linear-gradient(90deg,#1667d9 0 6px,transparent 6px 10px)}.rk-cut img{width:26px;height:26px}
.rk-me{background:#2a2f37;color:#fff;padding:8px 10px}.rk-me .rd-rk{margin:0;background:#fff;color:#20252b}.rk-me .rk-n{font-size:14px;color:#fff;background:#1e9bff;border-radius:8px;padding:8px 2px}
.rd-launch{position:relative;overflow:hidden;border-radius:16px;min-height:440px;color:#fff;background:#0e1013 var(--rd-boss,url(${BOSS_IMG})) 50% 8%/cover;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:16px 10px 20px;text-align:center;font-family:"Arial Black","Pretendard","Malgun Gothic",sans-serif}
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
.rd.fs .rd-st{gap:4px}.rd.fs .rd-chal{padding:5px 4px;border-width:2px}.rd.fs .rd-chal b{font-size:14px}.rd.fs .rd-chal span{font-size:9px}.rd.fs .rd-rem{font-size:9px;padding:2px;margin:-3px 20px 0}
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
.rd.fs .rk-deck{--cw:44px}.rd.fs .rd-half .rb{padding:6px 0!important;font-size:11px!important}
.rd.fs .rd-total b{font-size:26px}.rd.fs .rd-total{top:4px;font-size:9px}.rd.fs .rd-dmg{font-size:24px}.rd.fs .rd-ban b{font-size:22px}.rd.fs .rd-ban.big b{font-size:30px}.rd.fs .rd-ban i{font-size:15px}.rd.fs .rd-st .ch b svg{width:13px;height:13px}
@media(prefers-reduced-motion:reduce){.rd-pt{display:none}.pk-fx:before,.pk-el.hl,.pk-hw.hl{animation:none!important}}
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
  function evalSquad(D, boss) { /* 1~5장: 5장 미만이면 그때까지의 족보(스트레이트·플러시는 5장부터). score = 크리티컬·코어 없는 기본 점수 */
    const sp = supOf(boss.e); let chips = 0; const inSet = {}, sets = [];
    setsNow().forEach((p) => { const a = D.find((x) => String(x.code) === p[0]), b = D.find((x) => String(x.code) === p[1]); if (a && b) { inSet[a.id] = 1; inSet[b.id] = 1; sets.push([a, b]); } });
    const cards = D.map((x) => {
      const e = x.e === sp ? (x.b === 3 || x.b === 'A' ? 5 : 2) : 0, k = brkChip(x.cnt), st = inSet[x.id] ? 2 : 0, v = x.tv + k + e + st;
      chips += v; return { v, pc: Math.min(1, CRIT.base + (RNG[boss.r].includes(x.w) ? CRIT.rng : x.w === 'RL' ? CRIT.rl : 0)), parts: [['티어 ' + x.t, x.tv], ['돌파', k], [e === 5 ? '3버스트 우월코드' : '우월코드', e], ['세트', st]] };
    });
    const hc = handRank(D.map((x) => x.c)), he = handRank(D.map((x) => x.e));
    const steps = (hc === 8 && he === 5) || (hc === 5 && he === 8) ? [{ l: '스트레이트 플러시!', v: HM[8] + HM[5], big: 1, h: '<span class="rd-hl"><em style="color:#ffd24a">스트레이트 플러시</em></span>' }] /* 한쪽 플러시 + 다른 쪽 스트레이트: 배수는 둘의 합(14) 그대로, 이름만 따로 */
      : [{ l: '기업 ' + HN[hc], v: HM[hc], big: hc === 8 ? 1 : 0, h: handHtml(D, 'c', hc) }, { l: '우월코드 ' + HN[he], v: HM[he], big: he === 8 ? 1 : 0, h: handHtml(D, 'e', he) }];
    const mult = D.length ? steps.reduce((a, s2) => a + s2.v, 0) : 0;
    const bs = new Set(D.map((x) => x.b)), n123 = [1, 2, 3].filter((b) => bs.has(b)).length, full = n123 === 3 || (bs.has('A') && n123 >= 2);
    const f = D.length === 5 && !full ? 0.8 : 1;
    return { cards, chips, hc, he, steps, sets, mult, f, n: D.length, score: Math.round(chips * mult * f) };
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
  const FLT_C = 500; function fltCost() { const n = Object.values(S.flt).filter(Boolean).length; return n && !S.fltUsed ? FLT_C * Math.max(1, S.sel.size) * (S.flt.c === '필그림' ? 2 : 1) : 0; } /* 필터: 한 판에 한 번, 조건 1개. 버리는 카드 한 장당 500(필그림 지정 1,000) */
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
      return { hand: L.deck.splice(0, 7), rd: S.mode === 'mine' ? Math.min(3, Math.floor(total / Math.max(1, d.list.length) * 4)) : 3, left: L.deck.length, total, tries: S.tries + 1, max: 3, chips: S.chips };
    },
    async discard(ids, flt, cost) { const got = []; for (let k = 0; k < ids.length && L.deck.length; k++) { let i = cost ? L.deck.findIndex(fltMatch) : 0; if (i < 0) i = 0; got.push(L.deck.splice(i, 1)[0]); } return { got, left: L.deck.length, chips: PROD ? S.chips : S.chips - cost }; }, /* 모의전은 실제 싱크칩을 쓰지 않음 */
    async lock(ids) { const R = evalSquad(C(ids), S.boss); L.crit = R.cards.map((c) => (Math.random() < c.pc ? 1 : 0)); return { sq: ids.slice(), crit: L.crit }; },
    async play(ids, zones) { const R = evalSquad(C(ids), S.boss), crit = L.crit || R.cards.map(() => 0), dmg = R.cards.map((c, i) => Math.round(c.v * R.mult * R.f * (1 + CRIT.dmg * crit[i] + CORE[zones[i] || 0]))), score = dmg.reduce((a, v) => a + v, 0), nb = score > best(); if (nb) { try { localStorage.setItem(BEST_K, String(score)); } catch (e) { /* 무시 */ } } return { score, crit, dmg, newBest: nb, best: Math.max(best(), score) }; }
  };
  const Live = {
    async start() { const d = data(), j = await api('start', { openid: d.purl, area: +d.area || 0, pf: d.pf || '', fr: d.fr || 0 }); return Live.view(j); },
    view(j) { S.pool = (j.game.pool || []).map(liveCard).filter(Boolean); return { hand: j.game.hand.map(liveCard).filter(Boolean), rd: j.game.rd, fu: j.game.fu, locked: j.game.sq ? { sq: j.game.sq.map(String), crit: j.game.cr || [] } : null, left: j.game.left, total: j.game.total, tries: j.tries, max: j.max, chips: j.chips }; },
    async lock(ids) { const j = await api('lock', { codes: ids }); return { sq: (j.sq || ids).map(String), crit: j.crit || [] }; },
    async discard(ids, flt) { const j = await api('discard', { codes: ids, flt }); S.pool = (j.game.pool || []).map(liveCard).filter(Boolean); return { got: j.got.map(liveCard).filter(Boolean), left: j.game.left, chips: j.chips }; },
    async play(ids, zones) { const j = await api('play', { codes: ids, core: zones }), r = j.result; return { score: r.score, crit: r.crit || [], dmg: r.dmg || null, newBest: j.newBest, best: j.best }; }
  };
  const E = () => (S.mode === 'live' ? Live : Local);

  /* ---------- 화면 ---------- */
  const chipIco = (px) => (window.doroChipSvg ? window.doroChipSvg('b', px, false, true) : '');
  function ui() {
    const P = picks(), n = P.length, cost = fltCost(), nsel = S.sel.size, live = S.mode === 'live', pick = S.phase === 'pick';
    $('.rd-best b').textContent = fmt(live ? S.liveBest : best()) + '억';
    $('.rd-st .rdw b').textContent = S.redraws;
    $('.rd-st .ch b').innerHTML = chipIco(18) + '<span>' + fmt(S.chips) + '</span>';
    $('.rd-deck span').textContent = S.deckLeft + '/' + S.deckN;
    const li = S.info || { tries: 0, max: 3 }, used = live ? S.tries : li.tries, mxx = live ? S.max : li.max, ms = (Math.floor((Date.now() + 9 * 3600000) / 86400000) + 1) * 86400000 - (Date.now() + 9 * 3600000);
    $('.rd-chal span').textContent = '갱신 시간 ▶ ' + Math.floor(ms / 3600000) + '시간 ' + Math.floor(ms % 3600000 / 60000) + '분 남음'; $('.rd-rem b').textContent = Math.max(0, mxx - used) + '/' + mxx;
    { const gv = live && pick, arm = gv && S.giveArm && Date.now() - S.giveArm < 3500; $('.rd-chal b').textContent = arm ? '한 번 더: 포기' : gv ? '포기하기' : '도전하기'; $('.rd-chal').classList.toggle('gv', gv); }
    $('.rd-chal').classList.toggle('on', live); $('[data-r=prac]').classList.toggle('org', !live); $('[data-r=prac]').classList.toggle('blue', live);
    const sb = $('[data-r=snd]'); if (sb) sb.textContent = sndMode === 1 ? '🔊1' : sndMode === 2 ? '🔊2' : '🔇'; $('[data-r=hint]').disabled = busy || !pick;
    const go = $('[data-r=go]'), dc = $('[data-r=disc]');
    go.disabled = busy || !pick || n !== 5;
    dc.disabled = busy || !pick || nsel < 1 || nsel > 5 || S.redraws < 1 || cost > S.chips || S.deckLeft < 1;
    dc.innerHTML = '버리기' + (cost ? ' <small>−' + fmt(cost) + '</small>' : '');
    $$('.rd-sort .rb').forEach((b) => { b.classList.toggle('org', b.dataset.s === S.sort); b.classList.toggle('gry', b.dataset.s !== S.sort); });
    $$('.rd-fg button').forEach((b) => b.classList.toggle('on', S.flt[b.dataset.k] === b.dataset.v));
    $('.rd-fc').innerHTML = S.fltUsed ? '<span style="color:#ff8a7a">이번 판에 이미 사용</span>' : cost ? chipIco(14) + ' ' + fmt(cost) + ' <small style="opacity:.75;font-weight:700">(' + Math.max(1, nsel) + '장 × ' + fmt(FLT_C * (S.flt.c === '필그림' ? 2 : 1)) + ')</small>' : '<small style="opacity:.75;font-weight:700">한 판에 한 번 · 조건 1개 · 장당 ' + fmt(FLT_C) + '</small>';
    const fbn = $('[data-r=flt]'); fbn.classList.toggle('org', cost > 0); fbn.classList.toggle('gry', !cost); fbn.innerHTML = chipIco(15) + '필터' + (S.fltUsed ? ' <small>사용함</small>' : cost ? ' ✓' : ''); fbn.style.opacity = S.fltUsed ? '.5' : '';
    if (!$('.rd-flt').hidden) poolUi();
    if (!pick) return;
    const hn = $('.rd-hn'), ex = $('.rd-ex b'), msg = $('.rd-msg'); msg.className = 'rd-msg'; msg.textContent = '';
    if (n >= 1 && n <= 5) { const R = evalSquad(C(P), S.boss); /* 고른 카드(배치한 카드 포함)의 칩·배수·점수를 바로 보여 줌 */
      hn.innerHTML = R.steps.map((s) => '<div>' + s.h + '</div>').join('');
      $('.rd-chips').textContent = R.chips; $('.rd-mult').textContent = R.mult; { const q = n === 5 ? exRange(R) : null; if (q) { ex.innerHTML = fmt(q[0]) + '<small>~</small>' + fmt(q[1]) + '억'; ex.title = '크리티컬과 코어 판정을 넣어 600번 돌려 본 점수의 하위 25% ~ 상위 25% (코어는 보통 실력 기준)'; ex.classList.add('rg'); } else { ex.textContent = fmt(R.score) + '억'; ex.title = ''; ex.classList.remove('rg'); } }
      if (n === 5 && R.f < 1) { msg.textContent = '버스트 단계 누락 ×0.8'; msg.classList.add('bad'); }
    } else { hn.innerHTML = n > 5 ? '5장 초과' : ''; $('.rd-chips').textContent = n > 5 ? '-' : '0'; $('.rd-mult').textContent = n > 5 ? '-' : '0'; ex.textContent = n > 5 ? '-' : '0억'; }
  }
  /* 예상 점수 범위: 크리티컬(확률대로)과 코어 판정(보통 실력: MISS 15 · 1존 30 · 2존 35 · 3존 20%)을 넣어 600번 돌려 본 하위 25% ~ 상위 25%. 같은 편성이면 늘 같은 값이 나오도록 정해진 난수를 씀 */
  function exRange(R) { let sd = 12345; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }, N = 600, out = new Array(N), k = R.mult * R.f;
    for (let t = 0; t < N; t++) { let v = 0; for (const c of R.cards) { const u = rnd(), z = u < 0.15 ? 0 : u < 0.45 ? 1 : u < 0.8 ? 2 : 3; v += Math.round(c.v * k * (1 + (rnd() < c.pc ? CRIT.dmg : 0) + CORE[z])); } out[t] = v; }
    out.sort((a, b) => a - b); return [out[Math.floor(N * 0.25)], out[Math.floor(N * 0.75)]]; }
  function setBoss(b) {
    S.boss = b; const d = data(), sp = supOf(b.e);
    $('.rd-bn').innerHTML = (d.elIco ? '<img alt="" src="' + d.elIco[b.e] + '">' : '') + bossNm();
    $('.rd-bi').innerHTML = '<span>추천</span><span class="rd-rc">' + (d.elIco ? '<img alt="' + ELN[sp] + '" title="우월코드 ' + ELN[sp] + '" src="' + d.elIco[sp] + '">' : ELN[sp]) + '<span class="rd-wps" title="추천 총기 ' + RNG[b.r].join('·') + '">' + RNG[b.r].map((w) => '<img alt="' + w + '" src="assets/img/wp-' + w + '.png">').join('') + '</span></span>';
  }
  function clearTable() { bgm.stop(); Object.keys(els).forEach((id) => els[id].remove()); els = {}; S.cards = {}; S.hand = []; S.squad = EMPTY(); S.sel = new Set(); poolKey = ''; S.flt = { e: '', c: '', b: '', r: '' }; $('.rd-main').classList.remove('atk'); $('.rd-total b').textContent = '0억'; $$('.rd-dmg,.rd-ban,.rd-burst').forEach((e) => e.remove()); $('.rd-fin').hidden = true; $('.rd-flt').hidden = true; }
  function gate(html) { const g = $('.rd-gate'); g.hidden = !html; if (html) g.querySelector('.rd-box').innerHTML = html; }
  function applyGame(v, isNew) {
    clearTable(); S.phase = 'pick'; S.fltUsed = !!v.fu; S.redraws = v.rd; S.deckLeft = v.left; S.deckN = v.total; S.tries = v.tries; S.max = v.max || 3; if (v.chips != null) S.chips = v.chips;
    v.hand.forEach((c) => { S.cards[c.id] = c; S.hand.push(c.id); }); sortHand(); gate('');
    place(isNew ? S.hand.slice() : null); ui();
    S.locked = v.locked || null; if (S.locked && S.locked.sq.every((id) => S.cards[id])) { S.locked.sq.forEach((id, i) => { S.hand = S.hand.filter((x) => x !== id); S.squad[i] = id; }); place(); ui(); setTimeout(() => { if (S.phase === 'pick' && !busy) play(); }, 900); } /* 편성을 확정해 둔 판: 그 편성으로 바로 이어서 출격 */
  }
  async function deal(newBoss) { /* 새 판 */
    if (busy) return; busy = true;
    try {
      if (S.mode !== 'live' && (newBoss || !S.boss)) { setBoss(BOSS0); S.tries = 0; }
      if (S.mode !== 'live' && S.tries >= 3) S.tries = 0;
      const v = await E().start(); busy = false; applyGame(v, true);
    } catch (e) { busy = false; clearTable(); S.phase = 'idle'; place(); ui();
      gate('<h3>포커레이드</h3><div class="rd-fd">' + esc(S.mode === 'live' ? errMsg(e) : '내 도감에 SSR 카드가 7장 이상 필요합니다.') + '</div><button type="button" class="rb blue" data-r="prac">모의전</button>'); }
  }
  async function enterLive() { /* 실전: 시즌·내 기록을 받아 와서 이어 하거나 시작 버튼을 보여 줌 */
    clearTable(); S.phase = 'idle'; place(); busy = true; ui(); gate('<h3>실전</h3><div class="rd-fd">서버에서 레이드 정보를 불러오는 중입니다…</div>');
    try {
      const j = await api('state'); busy = false; S.newFrame = j.newFrame || 0; S.liveBest = j.best || 0; S.tries = j.tries || 0; S.max = j.max || 3; S.chips = j.chips || 0; S.redraws = 0; S.deckLeft = 0; S.deckN = 0;
      if (!j.season || !j.season.active) { ui(); gate('<h3>실전</h3><div class="rd-fd">' + (j.season ? '레이드 기간이 끝났습니다.' : '열려 있는 레이드가 없습니다.') + '</div>' + (j.admin ? '<button type="button" class="rb org" data-r="open">시즌 열기 (관리자 · 5일)</button>' : '') + '<button type="button" class="rb blue" data-r="prac">모의전</button>'); return; }
      setBoss({ e: j.season.e, r: j.season.r }); S.end = j.season.end;
      if (j.game) { applyGame(Live.view(j), false); return; }
      S.info = { tries: S.tries, max: S.max }; const left = S.max - S.tries, dl = Math.max(0, Math.ceil((S.end - Date.now()) / 86400000));
      if (left > 0) { deal(false); return; } /* 도전하기: 남은 횟수가 있으면 바로 시작 */
      ui();
      gate('<h3>RAID · ' + ELN[S.boss.e] + ' 보스</h3><div class="rd-fd">' + (S.newFrame ? '<b style="color:#8df0b0">지난 레이드 보상: 새 프로필 테두리 획득!</b><br>' : '') + '남은 기간 ' + dl + '일 · 오늘 핸드 ' + S.tries + '/' + S.max + ' · 내 최고 ' + fmt(S.liveBest) + '억</div>' + (left > 0 ? '<button type="button" class="rb blue" data-r="start">핸드 시작</button>' : '<div class="rd-fd">오늘 핸드를 모두 썼습니다.</div>') + '<button type="button" class="rb pur" data-r="rank">랭킹</button><button type="button" class="rb blue" data-r="prac">모의전</button>');
    } catch (e) { busy = false; ui(); gate('<h3>실전</h3><div class="rd-fd">' + esc(errMsg(e)) + '</div><button type="button" class="rb blue" data-r="prac">모의전</button>'); }
  }
  async function discard() {
    const ids = S.hand.filter((id) => S.sel.has(id)), cost = fltCost(); if (!ids.length || busy) return;
    busy = true; ui(); let r;
    try { r = await E().discard(ids, Object.assign({}, S.flt), cost); } catch (e) { busy = false; ui(); $('.rd-msg').textContent = errMsg(e); return; }
    if (cost) { chipFx($('[data-r=disc]'), cost); S.fltUsed = true; }
    sfx.disc(); const mr = $('.rd-main').getBoundingClientRect(), rot = rd().classList.contains('rot'); /* 발라트로처럼: 살짝 움찔한 뒤 비스듬히 누워서 화면 오른쪽 가운데로 날아감(흐려지지 않음) */
    ids.forEach((id, i) => { const c = ctr(els[id]), t = rot ? loc(mr.left + mr.width / 2 - c[0], mr.bottom + 160 - c[1]) : [mr.right + 160 - c[0], mr.top + mr.height / 2 - c[1]], P = 'perspective(800px) ';
      els[id].style.zIndex = 9; els[id].animate([{ transform: P + 'translate(0px,-18%) rotateX(0deg) rotateZ(0deg) scale(1)' }, { transform: P + 'translate(-16px,-24%) rotateX(18deg) rotateZ(-6deg) scale(1.04)', offset: 0.22 }, { transform: P + 'translate(' + (t[0] * 0.55).toFixed(0) + 'px,' + (t[1] * 0.8).toFixed(0) + 'px) rotateX(58deg) rotateZ(48deg) scale(.7)', offset: 0.66 }, { transform: P + 'translate(' + t[0].toFixed(0) + 'px,' + t[1].toFixed(0) + 'px) rotateX(66deg) rotateZ(78deg) scale(.42)' }], { duration: 400, delay: i * 55, easing: 'cubic-bezier(.5,0,.85,.6)', fill: 'forwards' }); });
    await sleep(410 + ids.length * 55);
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
  const bossFlash = (k) => { /* k: 세기(0~1) */
    const m = $('.rd-main'), bg = $('.rd-bg'); m.style.setProperty('--sk', (1 + 9 * k).toFixed(1) + 'px'); m.style.setProperty('--hk', (0.15 + 1.1 * k).toFixed(2));
    bg.classList.remove('hit'); void bg.offsetWidth; bg.classList.add('hit'); if (k > 0.3) shake(); };
  const SHARD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3l9 4 2-6 2 8 8-2-6 6 5 6-8-3-3 7-1-9-9 1 6-5z"/></svg>';
  const dmgNum = (dmg, i, k, ty) => { /* ty: 0 일반(흰색) · 1 크리티컬(노랑 + 파편) · 2 코어(빨강) · 3 크리티컬 코어(짙은 빨강 + 검은 파편) */
    const m = $('.rd-main'), d = document.createElement('div'); d.className = 'rd-dmg t' + (ty || 0); d.innerHTML = (ty & 1 ? SHARD : '') + (ty & 2 ? '<em>CORE HIT</em>' : '') + '<b>' + fmt(dmg) + '</b>'; d.style.fontSize = ((28 + 30 * k) * (ty ? 1.12 : 1)).toFixed(0) + 'px'; d.style.left = (50 + (i - 2) * 7) + '%'; d.style.top = (27 + (i % 2 ? 6 : -3)) + '%'; m.appendChild(d); setTimeout(() => d.remove(), 1250); };
  /* ---------- 사격 판정(코어 히트): 총기마다 조작이 다름. AR·SG 타이밍(원형 계기) · SR·RL 차지(세로 게이지, 꾹 눌렀다 놓기) · MG·SMG 연타(누를 때마다 한 발). 결과 0(MISS)~3존 ---------- */
  const AIM = { sweep: [430, 520], zT: [15, 7, 2.6], chg: 880, zC: [9, 4, 1.6], tapN: [9, 12, 15], tapMs: 1800 }; /* 타이밍: 한 번 훑는 시간(ms)과 존 반폭(도). 차지: 차는 시간과 존 반폭(%). 연타: 존별 횟수와 제한 시간 */
  function aimOne(x, card, onTap) { return new Promise((done) => {
    const main = $('.rd-main'), ty = x.w === 'SR' || x.w === 'RL' ? 'C' : x.w === 'MG' || x.w === 'SMG' ? 'R' : 'T', el = document.createElement('div'); el.className = 'rd-aim ' + ty;
    const pol = (a, r) => { const q = (a - 90) * Math.PI / 180; return (150 + Math.cos(q) * r).toFixed(1) + ' ' + (150 + Math.sin(q) * r).toFixed(1); }, sec = (a0, a1, r0, r1) => 'M' + pol(a0, r1) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + pol(a1, r1) + 'L' + pol(a1, r0) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + pol(a0, r0) + 'Z';
    const ctr = ty === 'T' ? (Math.random() * 2 - 1) * 26 : 70 + Math.random() * 18, per = AIM.sweep[0] + Math.random() * (AIM.sweep[1] - AIM.sweep[0]), ph = Math.random() * 2;
    let body = '';
    if (ty === 'T') body = '<svg class="ra-dial" viewBox="0 0 300 172"><defs><linearGradient id="raG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a3f4a"/><stop offset="1" stop-color="#14161b"/></linearGradient></defs>' +
      '<path d="' + sec(-66, 66, 84, 140) + '" fill="url(#raG)" stroke="#05060a" stroke-width="3"/><path d="' + sec(-62, 62, 92, 132) + '" fill="#1b0d06"/>' +
      [['#6b3210', 0], ['#c96a22', 1], ['#ffe2a0', 2]].map((q) => '<path class="rz' + (q[1] + 1) + '" d="' + sec(ctr - AIM.zT[q[1]], ctr + AIM.zT[q[1]], 92, 132) + '" fill="' + q[0] + '"/>').join('') +
      '<path d="' + sec(ctr - 4, ctr + 4, 135, 139) + '" fill="#ffe9b0"/>' + [-62, -31, 0, 31, 62].map((a) => '<path d="M' + pol(a, 84) + 'L' + pol(a, 90) + '" stroke="#8a93a5" stroke-width="2"/>').join('') +
      '<g class="ra-ndl"><path d="M150 150L150 14" stroke="#ff5a2a" stroke-width="3.2" stroke-linecap="round"/><path d="M150 150L150 14" stroke="#ffd9a0" stroke-width="1"/></g><circle cx="150" cy="150" r="13" fill="#23262e" stroke="#05060a" stroke-width="3"/><circle cx="150" cy="150" r="4" fill="#ff5a2a"/></svg>';
    else if (ty === 'C') body = '<div class="ra-col"><div class="ra-v">' + AIM.zC.map((h, q) => '<i class="z' + (q + 1) + '" style="bottom:' + (ctr - h) + '%;height:' + (h * 2) + '%"></i>').join('') + '<u class="ra-fill"></u><s class="ra-nd"></s></div><div class="ra-hint"><b>HOLD</b><span>꾹 누르고 있다가<br>밝은 칸에서 <u>놓기</u></span></div></div>';
    else body = '<div class="ra-tap"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="#14161b" stroke="#05060a" stroke-width="4"/><circle class="ra-ring" cx="60" cy="60" r="52" fill="none" stroke="#5ef0a0" stroke-width="7" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg><b class="ra-cnt">0</b><div class="ra-pips">' + AIM.tapN.map((n, q) => '<i data-n="' + n + '">' + n + '</i>').join('') + '</div><div class="ra-hint"><b>TAP!</b><span><u>빠르게 연타</u><br>누를 때마다 한 발</span></div></div>';
    el.innerHTML = '<div class="ra-box"><div class="ra-top"><em>' + (ty === 'T' ? '타이밍' : ty === 'C' ? '차지' : '연타') + '</em><b>' + esc(x.n) + '</b></div>' + body + '</div>';
    main.appendChild(el); const nd = el.querySelector('.ra-nd'), fill = el.querySelector('.ra-fill'), ndl = el.querySelector('.ra-ndl'), ring = el.querySelector('.ra-ring'), cnt = el.querySelector('.ra-cnt');
    let t0 = performance.now(), raf = 0, over = false, hold = 0, taps = 0, tapT = 0, pos = 0;
    const end = (z) => { if (over) return; over = true; cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); el.classList.add('end', 'z' + z); try { z ? sfx.ok() : sfx.bad(); } catch (e) { /* 무시 */ } setTimeout(() => el.remove(), 320); done(z); }; /* 판정이 나면 바로 사격으로 넘어감(판정판은 뒤에서 사라짐) */
    const zoneC = (v, hw) => { const d = Math.abs(v - ctr); return d <= hw[2] ? 3 : d <= hw[1] ? 2 : d <= hw[0] ? 1 : 0; }, tapZone = () => (taps >= AIM.tapN[2] ? 3 : taps >= AIM.tapN[1] ? 2 : taps >= AIM.tapN[0] ? 1 : 0);
    const frame = (now) => { if (over) return; const t = now - t0;
      if (ty === 'T') { const u = (t / per + ph) % 2; pos = ((u <= 1 ? u : 2 - u) * 2 - 1) * 62; ndl.setAttribute('transform', 'rotate(' + pos.toFixed(2) + ' 150 150)'); if (t > 6000) return end(0); }
      else if (ty === 'C') { if (hold) { pos = Math.min(100, Math.pow((now - hold) / AIM.chg, 1.5) * 100); fill.style.height = pos + '%'; nd.style.bottom = pos + '%'; if (pos >= 100) return end(0); } else if (t > 5000) return end(0); }
      else { if (tapT) { const left = Math.max(0, 1 - (now - tapT) / AIM.tapMs); ring.setAttribute('stroke-dashoffset', (326.7 * (1 - left)).toFixed(1)); if (left <= 0) return end(tapZone()); } else if (t > 5000) return end(0); }
      raf = requestAnimationFrame(frame); };
    const down = () => { if (over) return; if (ty === 'T') end(zoneC(pos, AIM.zT)); else if (ty === 'C') { if (!hold) { hold = performance.now(); el.classList.add('hold'); try { sfx.charge(x.w); } catch (e) { /* 무시 */ } } }
      else { if (!tapT) tapT = performance.now(); taps++; cnt.textContent = taps; cnt.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 90 }); el.querySelectorAll('.ra-pips i').forEach((p2) => p2.classList.toggle('on', taps >= +p2.dataset.n)); if (onTap && taps <= AIM.tapN[2]) onTap(taps); if (taps >= AIM.tapN[2]) end(3); } };
    const up = () => { if (!over && ty === 'C' && hold) end(zoneC(pos, AIM.zC)); };
    const kd = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) down(); } }, ku = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); up(); } };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); }); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); raf = requestAnimationFrame(frame);
  }); }
  async function play() {
    const ids = picks(); if (ids.length !== 5 || busy) return;
    recClear(); busy = true; ui(); let res;
    const rest = S.hand.filter((id) => !S.sel.has(id));
    rest.forEach((id, i) => els[id].animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(45%) scale(.8)' }], { duration: 220, delay: i * 30, fill: 'forwards' }));
    sfx.go(); setTimeout(() => bgm.start(), 700); await sleep(260);
    rest.forEach((id) => { delete S.cards[id]; });
    S.phase = 'score'; S.hand = []; S.squad = ids.slice(); S.sel.clear(); $('.rd-flt').hidden = true;
    const D = C(ids), R = evalSquad(D, S.boss), hn = $('.rd-hn'), cb = $('.rd-chips'), mb = $('.rd-mult'), msg = $('.rd-msg'), ex = $('.rd-ex b'), tot = $('.rd-total b');
    place(); /* 스쿼드가 아래 줄로 내려오고, 위에는 보스가 드러남 */
    hn.innerHTML = '출격!'; cb.textContent = '0'; mb.textContent = '0'; ex.classList.remove('rg'); ex.textContent = '0억'; tot.textContent = '0억'; msg.className = 'rd-msg'; msg.textContent = '';
    banner('출격!', '', 'big'); await slow(700); sfx.ban();
    for (const st of R.sets) { banner('세트 니케', st[0].n.split(' : ')[0] + ' + ' + st[1].n.split(' : ')[0], ''); [st[0].id, st[1].id].forEach((id) => { if (els[id]) els[id].animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.7) drop-shadow(0 0 10px #8df0b0)' }, { filter: 'brightness(1)' }], { duration: 700 }); }); sfx.ok(); await slow(850); } /* 숨은 규칙: 세트 니케 */
    let chips = 0, mult = 0, tick = 0;
    for (let i = 0; i < 5; i++) { /* 니케별 칩: 항목마다 하나씩 */
      const e = els[ids[i]], c = R.cards[i];
      e.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12%) scale(1.12) rotate(' + (i % 2 ? 4 : -4) + 'deg)' }, { transform: 'translateY(-6%) scale(1.06)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'forwards' });
      for (const p of c.parts) { if (!p[1]) continue;
        pop(e, p[0] + ' +' + p[1], (p[1] >= 5 && p[0].indexOf('티어') < 0) || p[0] === '세트');
        chips += p[1]; cb.textContent = chips; punch(cb); sfx.chip(tick++); await slow(210); }
      e.animate([{ transform: 'translateY(-6%) scale(1.06)' }, { transform: 'none' }], { duration: 160, fill: 'forwards' });
      await slow(130);
    }
    await slow(200);
    let mi = 0;
    for (const st of R.steps) { /* 족보 배수 */
      hn.innerHTML = '<div>' + st.h + '</div>'; punch(hn);
      banner(st.l, '배수 +' + st.v, st.big ? 'big' : '');
      ids.forEach((id, i) => els[id].animate([{ transform: 'scale(1)' }, { transform: 'scale(' + (st.big ? 1.14 : 1.07) + ') translateY(-7%)' }, { transform: 'scale(1)' }], { duration: 300, delay: i * 40 }));
      mult += st.v; mb.textContent = mult; punch(mb); sfx.mult(mi++); if (st.big) { $('.rd-main').style.setProperty('--sk', '8px'); shake(); }
      await slow(st.big ? 1050 : 760);
    }
    if (R.f < 1) { banner('1 2 3버스트 누락', '0.8x', 'bad'); sfx.bad(); await slow(800); }
    hn.innerHTML = fmt(chips) + ' × ' + mult + (R.f < 1 ? ' × 0.8' : ''); punch(hn); punch(cb); punch(mb);
    await slow(350);
    /* 편성 확정(크리티컬은 서버가 이때 굴려 고정) → 니케마다 사격 판정 → 판정이 나는 즉시 사격 → 끝나면 판정을 서버에 제출 */
    let lock = S.locked && S.locked.sq.join() === ids.join() ? S.locked : null;
    for (let t = 0; t < 3 && !lock; t++) { try { lock = await E().lock(ids); } catch (e) { msg.textContent = errMsg(e); if (t < 2) await sleep(1500); } }
    const fail = () => { msg.className = 'rd-msg warn'; msg.textContent = '서버에 닿지 못했습니다. 새로고침하면 이 판을 이어서 할 수 있습니다.'; bgm.stop(); busy = false; S.phase = 'done'; ui(); };
    if (!lock) { fail(); return; } msg.textContent = '';
    const crit = lock.crit || [], zones = [], dmgs = [], mx = Math.max.apply(null, R.cards.map((c) => c.v)), mn = Math.min.apply(null, R.cards.map((c) => c.v)); let done = 0;
    /* 제자리에서 총기별로 사격: 총구 불꽃 → 예광탄 → 탄착군(반짝하고 천천히 흐려짐) */
    const mainEl = $('.rd-main'), lp = (el) => { let x = el.offsetWidth / 2, y = el.offsetHeight * 0.12, n = el; while (n && n !== mainEl) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y]; };
    const fx = (cls, x, y, css, ttl) => { const d = document.createElement('div'); d.className = cls; d.style.cssText = 'left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;' + (css || ''); mainEl.appendChild(d); setTimeout(() => d.remove(), ttl); };
    const GUN = { AR: [3, 110], SMG: [1, 0], MG: [1, 0], SG: [1, 0], SR: [1, 0], RL: [1, 0] }, rnd = () => Math.random() * 2 - 1;
    const addDmg = (v, pn) => { done += v; tot.textContent = fmt(done) + '억'; ex.textContent = fmt(done) + '억'; if (pn) punch(ex); };
    const shot = (x, e, k, big) => { const T0 = [mainEl.clientWidth * 0.5, mainEl.clientHeight * 0.27], src = lp(e), sp = big ? (x.w === 'SG' ? 0 : 8) : 54, tx = T0[0] + rnd() * sp, ty = T0[1] + rnd() * sp * 0.8, len = Math.hypot(tx - src[0], ty - src[1]), ang = Math.atan2(ty - src[1], tx - src[0]);
      fx('rd-mz', src[0], src[1], '', 150); fx('rd-trc' + (x.w === 'RL' ? ' rk' : ''), src[0], src[1], 'width:' + len.toFixed(0) + 'px;transform:rotate(' + ang.toFixed(3) + 'rad)', 240);
      e.animate([{ transform: 'translateY(-5%) scale(1.05)' }, { transform: 'translateY(' + (big ? 3 : -2) + '%) scale(' + (big ? 1 : 1.04) + ')' }, { transform: 'translateY(-5%) scale(1.05)' }], { duration: big ? 240 : 66 });
      sfx.gun(x.w, k); if (x.w === 'RL') setTimeout(() => sfx.boom(k), 190);
      if (x.w === 'SG') for (let q = 0; q < 9; q++) fx('rd-imp', tx + rnd() * 74, ty + rnd() * 58, '--sz:' + (10 + Math.random() * 9).toFixed(0) + 'px', 2700);
      else fx('rd-imp' + (x.w === 'RL' ? ' ex' : ''), tx, ty, '--sz:' + (({ SMG: 12, AR: 16, MG: 18, SR: 42, RL: 130 }[x.w] || 15) * (0.8 + 0.5 * k)).toFixed(0) + 'px', 2700);
      bossFlash(big ? 0.45 + 0.55 * k : 0.1 + 0.15 * k); };
    banner('사격 준비', '코어를 노리세요', ''); await slow(650);
    for (let i = 0; i < 5; i++) {
      const x = D[i], e = els[ids[i]], c = R.cards[i], k = mx > mn ? (c.v - mn) / (mx - mn) : 0.6, rapid = x.w === 'MG' || x.w === 'SMG', base = c.v * R.mult * R.f * (1 + CRIT.dmg * (crit[i] ? 1 : 0));
      e.style.zIndex = 8; sfx.reload(); e.animate([{ transform: 'none' }, { transform: 'translateY(-5%) scale(1.05)' }], { duration: 180, fill: 'forwards', easing: 'cubic-bezier(.3,1.6,.5,1)' });
      let shown = 0; /* 연타(MG·SMG): 누를 때마다 한 발씩 나가고 대미지가 조금씩 들어감 */
      const z = window.__rdAuto != null ? window.__rdAuto : await aimOne(x, e, rapid ? () => { const v = Math.round(base / AIM.tapN[2]); shown += v; shot(x, e, k, false); addDmg(v); } : null);
      const dmg = Math.round(c.v * R.mult * R.f * (1 + CRIT.dmg * (crit[i] ? 1 : 0) + CORE[z])), g = rapid ? [1, 0] : GUN[x.w] || GUN.AR, n = g[0], rest = Math.max(0, dmg - shown); zones.push(z); dmgs.push(dmg);
      pop(e, z ? 'CORE ' + ZN[z] : 'MISS', z === 3); let part = 0;
      for (let h = 0; h < n; h++) { shot(x, e, k, n === 1); const v = h < n - 1 ? Math.round(rest / n) : rest - part; part += v; addDmg(v, n === 1 || h === n - 1); if (h < n - 1) await sleep(g[1]); }
      dmgNum(dmg, i, k, (crit[i] ? 1 : 0) + (z > 0 ? 2 : 0)); if (x.w === 'RL') await sleep(200);
      e.animate([{ transform: 'translateY(-5%) scale(1.05)' }, { transform: 'none' }], { duration: 180, fill: 'forwards' }); await slow(n === 1 ? 420 : 300); e.style.zIndex = '';
    }
    for (let t = 0; t < 3 && !res; t++) { try { res = await E().play(ids, zones); } catch (e) { msg.textContent = errMsg(e); if (t < 2) await sleep(1500); } }
    if (!res) { fail(); return; } msg.textContent = ''; S.locked = null;
    const score = res.score;
    await slow(450);
    ex.textContent = fmt(score) + '억'; tot.textContent = fmt(score) + '억'; S.phase = 'done'; if (S.mode === 'live') { api('rank').then((j) => { if (j.mine && window.doroStat) window.doroStat.raid(j.season && j.season.id, j.mine.rank, j.total || 0, j.mine.sc || 0); }).catch(() => {}); /* 통합 기록: 최고 등수 */ S.liveBest = res.best; S.info = { tries: S.tries, max: S.max }; }
    const live = S.mode === 'live', left = S.max - S.tries, fin = $('.rd-fin'), ag = $('.rd-fin [data-r=again]'); bgm.stop(); fin.hidden = false; msg.textContent = '';
    fin.querySelector('h3').textContent = res.newBest ? 'NEW BEST!' : 'RAID SCORE';
    $('.rd-rkl').textContent = '';
    $('.rd-fin .rd-fd').innerHTML = R.steps.map((x) => '<span class="rd-fh">' + x.h + '<b>+' + x.v + '</b></span>').join('') + '<br>칩 ' + fmt(chips) + ' × 배수 ' + mult + (R.f < 1 ? ' × 0.8' : '') + '<br><small>크리티컬 ' + crit.filter(Boolean).length + '회 · 코어 히트 ' + zones.map((z) => (z ? z + '존' : 'MISS')).join(' ') + '</small>';
    ag.hidden = live && left <= 0; ag.textContent = left > 0 ? '재도전 (남은 ' + left + '회)' : '재도전'; $('.rd-fin [data-r=rank]').hidden = !live;
    if (live) api('rank').then((j) => { const i = j.rows.findIndex((r) => r.me); if (i >= 0) $('.rd-rkl').innerHTML = '<b>' + (i + 1) + '위</b> / ' + j.rows.length + '명'; }).catch(() => {});
    $('.rd-main').style.setProperty('--sk', '7px'); shake(); sfx.fin(res.newBest); let ci = 0; const ct = setInterval(() => sfx.count(ci++), 70); await countTo($('.rd-fs b'), 0, score, Math.min(1400, 500 + score)); clearInterval(ct);
    busy = false; ui();
  }
  const pfHtml = (r) => { const d = data(); return '<div class="rk-pf">' + (r.pf && d.pfImg ? '<img alt="" src="' + esc(d.pfImg(r.pf)) + '" onerror="this.style.visibility=\'hidden\'">' : '<img alt="" style="visibility:hidden">') + (r.fr && d.frImg ? '<img class="ff" alt="" src="' + esc(d.frImg(r.fr)) + '">' : '') + '</div>'; };
  const rkRow = (r, total, bottom) => { const t = r.rank <= 3 ? ' t' + r.rank : '', pct = total ? r.rank / total * 100 : 0;
    const no = bottom ? (r.rank <= 100 ? r.rank + '위' : pct.toFixed(pct < 10 ? 2 : 1) + '%') : r.rank + (r.rank <= 3 ? '<small>' + ['ST', 'ND', 'RD'][r.rank - 1] + '</small>' : '');
    return '<div class="rd-rk' + t + (r.me && !bottom ? ' me' : '') + '"><div class="rk-n">' + no + '</div>' + pfHtml(r) + '<div class="rk-nm">' + esc(r.nick) + '</div><div class="rk-sc">' + fmt(r.sc) + '억</div><button type="button" class="rk-dk" data-r="dk" title="덱 보기" aria-label="덱 보기">☰</button>' +
      '<div class="rk-deck" hidden>' + String(r.deck).split(',').filter(Boolean).map((p) => { const c = liveCard([p.split(':')[0], +p.split(':')[1] || 1]); return c ? cardHtml(c, S.boss) : ''; }).join('') + '<small>' + fmt(r.chips) + ' × ' + r.mult + (r.f < 1 ? ' × 0.8' : '') + '</small></div></div>'; };
  async function showRank() {
    const m = $('.rd-rank'), box = m.querySelector('.rd-rl'), me = m.querySelector('.rk-me'); m.hidden = false; me.innerHTML = ''; sfx.open();
    const tl = m.querySelector('.rk-left'), tick = () => { if (m.hidden || !root.isConnected) { clearInterval(S.rkT); return; } const ms = (S.end || 0) - Date.now(); if (S.mode !== 'live' || !S.end) { tl.textContent = ''; return; } if (ms <= 0) { tl.textContent = '종료'; return; } const z = (n) => String(n).padStart(2, '0'); tl.textContent = '남은 시간 ' + Math.floor(ms / 86400000) + '일 ' + z(Math.floor(ms % 86400000 / 3600000)) + '시간 ' + z(Math.floor(ms % 3600000 / 60000)) + '분 ' + z(Math.floor(ms % 60000 / 1000)) + '초'; };
    clearInterval(S.rkT); S.rkT = setInterval(tick, 1000); tick();
    if (S.mode !== 'live') { box.innerHTML = '<p style="padding:14px">랭킹은 실전 모드에서만 기록됩니다.</p>'; return; }
    box.innerHTML = '<p style="padding:14px">불러오는 중…</p>';
    try { const j = await api('rank'); if (j.season && j.season.end) { S.end = j.season.end; tick(); } try { if (j.mine && window.doroStat) window.doroStat.raid(j.season && j.season.id, j.mine.rank, j.total || 0, j.mine.sc || 0); } catch (e2) { /* 무시 */ } const N = j.total || j.rows.length, cut = j.cut || [], d = data(), CL = ['상위 3%', '상위 10%', '상위 30%'];
      let h = ''; j.rows.forEach((r, i) => { h += rkRow(r, N); cut.forEach((c, k) => { if (r.rank === c && (i < j.rows.length - 1 || N > j.rows.length)) h += '<div class="rk-cut">' + (d.frImg ? '<img alt="" src="' + esc(d.frImg((j.season && j.season.id ? j.season.id + ':' : '') + (k + 1))) + '">' : '') + CL[k] + ' 선</div>'; }); });
      box.innerHTML = h || '<p style="padding:14px">아직 기록이 없습니다.</p>';
      me.innerHTML = j.mine ? rkRow(j.mine, N, true) : '';
    } catch (e) { box.innerHTML = '<p style="padding:14px">' + esc(errMsg(e)) + '</p>'; }
  }
  /* ---------- 추천: 지금 바로 낼 수 있는 최고 스쿼드와, 버리고 새로 받을 때의 기대 점수를 견줌 ---------- */
  /* 추천 계산은 수만 번 돌기 때문에 가볍게: 카드마다 값(칩 × 크리티컬 기대)과 기업·코드 번호를 한 번만 구해 두고, 배열을 새로 만들지 않고 셈 */
  const CI = {}, EI = {}; COS.forEach((c, i) => { CI[c] = i; }); CYC.forEach((c, i) => { EI[c] = i; });
  let fsKey = '', fsSet = null; const cnt5 = [0, 0, 0, 0, 0];
  const rank5 = (a, b, c, d, e) => { cnt5[0] = cnt5[1] = cnt5[2] = cnt5[3] = cnt5[4] = 0; cnt5[a]++; cnt5[b]++; cnt5[c]++; cnt5[d]++; cnt5[e]++; let mx = 0, pairs = 0, kinds = 0; for (let i = 0; i < 5; i++) { const v = cnt5[i]; if (v) { kinds++; if (v > mx) mx = v; if (v === 2) pairs++; } }
    return mx === 5 ? 8 : mx === 4 ? 7 : mx === 3 ? (pairs ? 6 : 4) : mx === 2 ? (pairs === 2 ? 3 : 2) : kinds === 5 ? 5 : 1; };
  function fsPrep(x, boss) { const key = boss.e + boss.r; if (x._fk === key) return; x._fk = key; const sp = supOf(boss.e);
    x._fv = (x.tv + brkChip(x.cnt) + (x.e === sp ? (x.b === 3 || x.b === 'A' ? 5 : 2) : 0)) ; x._fp = 1 + CRIT.dmg * Math.min(1, CRIT.base + (RNG[boss.r].includes(x.w) ? CRIT.rng : x.w === 'RL' ? CRIT.rl : 0)); x._ci = CI[x.c] || 0; x._ei = EI[x.e] || 0; x._bb = x.b === 'A' ? 8 : x.b === 1 ? 1 : x.b === 2 ? 2 : 4; }
  function fsSets() { const L0 = setsNow(), key = L0.length + ':' + (L0[0] || []).join(); if (key !== fsKey || !fsSet) { fsKey = key; fsSet = {}; L0.forEach((q) => { fsSet[q[0]] = q[1]; fsSet[q[1]] = q[0]; }); } return fsSet; }
  function score5(a, b, c, d, e, SM) { /* 준비(fsPrep)된 카드 5장의 기대 점수 */
    let chips = a._fv * a._fp + b._fv * b._fp + c._fv * c._fp + d._fv * d._fp + e._fv * e._fp;
    if (SM) { const P = [a, b, c, d, e]; for (let i = 0; i < 5; i++) { const m = SM[P[i].code]; if (m) for (let k = 0; k < 5; k++) if (String(P[k].code) === m) { chips += 2 * P[i]._fp; break; } } }
    const bb = a._bb | b._bb | c._bb | d._bb | e._bb, full = (bb & 7) === 7 || ((bb & 8) && (((bb & 1) ? 1 : 0) + ((bb & 2) ? 1 : 0) + ((bb & 4) ? 1 : 0)) >= 2);
    return chips * (HM[rank5(a._ci, b._ci, c._ci, d._ci, e._ci)] + HM[rank5(a._ei, b._ei, c._ei, d._ei, e._ei)]) * (full ? 1 : 0.8); }
  function fastScore(D, boss) { for (const x of D) fsPrep(x, boss); const SM = fsSets(); return Math.round(D.length === 5 ? score5(D[0], D[1], D[2], D[3], D[4], Object.keys(SM).length ? SM : null) : 0); }
  const combos = (arr, k) => { const out = []; (function f(st, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); f(i + 1, cur); cur.pop(); } })(0, []); return out; };
  const IX5 = {}; const ix5 = (n) => IX5[n] || (IX5[n] = combos(Array.from({ length: n }, (_, i) => i), 5));
  const best5 = (cards, boss) => { for (const x of cards) fsPrep(x, boss); const S0 = fsSets(), SM = Object.keys(S0).length ? S0 : null, IX = ix5(cards.length); let bs = -1, bi = null; for (let q = 0; q < IX.length; q++) { const ix = IX[q], v = score5(cards[ix[0]], cards[ix[1]], cards[ix[2]], cards[ix[3]], cards[ix[4]], SM); if (v > bs) { bs = v; bi = ix; } } return { score: Math.round(bs), cards: bi ? bi.map((i) => cards[i]) : null }; };
  const FOPT = CYC.map((v) => ({ e: v })).concat(COS.map((v) => ({ c: v })), ['1', '2', '3'].map((v) => ({ b: v })), ['NEAR', 'MID', 'FAR'].map((v) => ({ r: v })));
  const matchF = (x, f) => (!f.e || x.e === f.e) && (!f.c || x.c === f.c) && (!f.b || String(x.b) === f.b || x.b === 'A') && (!f.r || RNG[f.r].includes(x.w));
  const costF = (f, k) => (Object.keys(f).length ? FLT_C * Math.max(1, k || 1) * (f.c === '필그림' ? 2 : 1) : 0);
  const nameF = (f) => (f.e ? ELN[f.e] : f.c ? f.c : f.b ? 'I'.repeat(+f.b) + '버스트' : f.r ? RNG[f.r].join('·') : '');
  const aimOf = (cards) => { const hc = handRank(cards.map((x) => x.c)), he = handRank(cards.map((x) => x.e)); return (hc === 8 && he === 5) || (hc === 5 && he === 8) ? '스트레이트 플러시' : HM[hc] >= HM[he] ? '기업 ' + HN[hc] : '우월코드 ' + HN[he]; };
  function simEV(keep, k, pool, T, f, boss) { boss = boss || S.boss; /* k장을 새로 받는 경우를 T번 뽑아 보고 평균 점수와 가장 자주 나오는 족보를 냄 */
    const P1 = f ? pool.filter((x) => matchF(x, f)) : pool, tally = {}; let sum = 0;
    for (let t = 0; t < T; t++) { const got = [], used = new Set();
      while (got.length < k) { const src = P1.length - got.filter((x) => P1.indexOf(x) >= 0).length > 0 && got.length < P1.length ? P1 : pool; const c = src[Math.floor(Math.random() * src.length)]; if (!used.has(c)) { used.add(c); got.push(c); } }
      const b = best5(keep.concat(got), boss); sum += b.score; const a = aimOf(b.cards); tally[a] = (tally[a] || 0) + 1; }
    const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0]; return { ev: sum / T, aim: top, p: tally[top] / T };
  }
  function hintPlan(all, pool, redraws, chips, boss, noFilter) { /* 지금 최고 스쿼드(now)와 가장 좋은 버리기(bd, 없으면 null) */
    const now = best5(all, boss); let bd = null;
    if (redraws > 0 && pool.length >= 5) {
      const cand = []; for (let k = 1; k <= 5; k++) combos(all, k).forEach((out) => { const keep = all.filter((x) => out.indexOf(x) < 0); cand.push({ out, keep, ev: simEV(keep, k, pool, 6, null, boss).ev }); });
      cand.sort((a, b) => b.ev - a.ev);
      cand.slice(0, 4).forEach((c) => { /* 유망한 버리기 조합만 더 정밀하게: 필터 없이 / 필터 1개씩 */
        const base = simEV(c.keep, c.out.length, pool, 28, null, boss); if (!bd || base.ev > bd.ev) bd = Object.assign({ out: c.out, f: null, base: base.ev }, base);
        if (!noFilter) FOPT.forEach((f) => { if (costF(f, c.out.length) > chips || pool.filter((x) => matchF(x, f)).length < 1) return; const r = simEV(c.keep, c.out.length, pool, 12, f, boss); if (r.ev > base.ev * 1.05 && r.ev > bd.ev) bd = Object.assign({ out: c.out, f, base: base.ev }, r); });
      });
    }
    return { now, bd: bd && bd.ev > now.score * 1.04 ? bd : null, alt: bd };
  }
  const chipFx = (to, n) => { try { if (window.doroChipFly) window.doroChipFly($('.rd-st .ch'), to, n, { size: 18, max: 10, stag: 55 }); } catch (e) { /* 무시 */ } }; /* 잔고에서 싱크칩이 퍼져 나와 버튼으로 빨려 들어감 */
  const HINT_COST = 100;
  async function payHint() { /* 싱크칩 100을 내고 추천을 봄(모의전은 미리보기 서버에서만 차감, 실전은 서버가 차감) */
    const msg = $('.rd-msg'); if (S.chips < HINT_COST) { msg.className = 'rd-msg warn'; msg.textContent = '싱크칩이 부족합니다'; return; }
    if (S.mode === 'live') { busy = true; ui(); try { const j = await api('hint'); if (j && j.chips != null) S.chips = j.chips; } catch (e) { busy = false; ui(); $('.rd-msg').textContent = errMsg(e); return; } busy = false; }
    else if (!PROD) S.chips -= HINT_COST;
    chipFx($('[data-r=hint]'), HINT_COST); ui(); hint();
  }
  function hint() {
    if (S.phase !== 'pick') return; recClear(); sfx.ok();
    const all = C(sqIds().concat(S.hand)), pl = hintPlan(all, poolNow(), S.redraws, S.chips, S.boss, !!S.fltUsed), now = pl.now; let bd = pl.bd;
    const msg = $('.rd-msg'), toHand = (ids) => { ids.forEach((id) => { const i = S.squad.indexOf(id); if (i >= 0) { S.squad[i] = null; S.hand.push(id); } }); };
    if (bd) { const ids = bd.out.map((x) => x.id); toHand(ids); sortHand(); S.sel = new Set(ids); S.flt = Object.assign({ e: '', c: '', b: '', r: '' }, bd.f || {}); poolKey = ''; place(); ui();
      ids.forEach((id) => els[id].classList.add('recx')); msg.className = 'rd-msg ok';
      msg.innerHTML = '💡 ' + ids.length + '장 버리기' + (bd.f ? ' + 필터 <b>' + esc(nameF(bd.f)) + '</b>' : '') + ' → <b>' + esc(bd.aim) + '</b> ' + Math.round(bd.p * 100) + '% · 기대 ' + fmt(bd.ev) + '억 (지금 ' + fmt(now.score) + '억)'; }
    else { const ids = now.cards.map((x) => x.id); toHand(sqIds().filter((id) => ids.indexOf(id) < 0)); sortHand(); S.sel = new Set(ids.filter((id) => S.squad.indexOf(id) < 0)); S.flt = { e: '', c: '', b: '', r: '' }; place(); ui();
      ids.forEach((id) => els[id].classList.add('rec')); msg.className = 'rd-msg ok'; msg.innerHTML = '💡 지금 출격 · <b>' + esc(aimOf(now.cards)) + '</b> ' + fmt(now.score) + '억' + (pl.alt ? ' (버리면 기대 ' + fmt(pl.alt.ev) + '억)' : ''); }
  }
  /* ---------- 도움말: 짧은 장면이 자동으로 넘어가는 영상 형식 ---------- */
  let hvI = 0, hvT = 0;
  function hvShow(i) {
    const d = data(), L0 = d.list.slice().sort((a, b) => (TS[b.t] || 0) - (TS[a.t] || 0)), smp = (k, cnt) => Object.assign({}, L0[k % L0.length], { cnt: cnt || 4 });
    const card = (k, x, cls, extra) => cardHtml(smp(k, [4, 11, 1, 7, 4, 2, 11][k % 7]), BOSS0).replace('class="pk', 'class="pk ' + (cls || '')).replace('style="--ec:', 'style="left:' + x + 'px;' + (extra ? extra + ';' : '') + '--ec:');
    const row = (fn) => [0, 1, 2, 3, 4, 5, 6].map((k) => fn(k, 44 + k * 62)).join(''), slots = [0, 1, 2, 3, 4].map((k) => '<i class="hv-slot" style="left:' + (106 + k * 62) + 'px"></i>').join('');
    const fe = smp(0).e; /* 필터 장면에서 누르는 우월코드 */
    const hxs = (a) => a.map((t, k) => '<span class="pk-hx' + (k === 2 ? ' x' : '') + '">' + t + '</span>').join('');
    const SC = [
      ['카드 7장 중 <b>5명</b>을 골라 스쿼드를 짭니다. 카드를 누르면 선택됩니다.', row((k, x) => card(k, x, [0, 2, 3, 4, 6].indexOf(k) >= 0 ? 'hv-pick' : '', 'animation-delay:' + (k * 0.12) + 's'))],
      ['<b>위로 쓸어 올리거나 끌어서</b> 원하는 칸에 미리 배치할 수 있습니다.', slots + row((k, x) => card(k, x, k === 1 ? 'hv-up' : k === 4 ? 'hv-up' : '', k === 1 ? '--dx:62px' : k === 4 ? '--dx:0px;animation-delay:.5s' : ''))],
      ['마음에 안 드는 카드는 골라서 <b>버리기</b>. 버린 만큼 새로 받습니다.', row((k, x) => card(k, x, k === 5 || k === 6 ? 'hv-out' : '')) + card(8, 44 + 5 * 62, 'hv-in') + card(9, 44 + 6 * 62, 'hv-in', 'animation-delay:.15s')],
      ['<b>필터</b>에서 조건 하나를 누르면 버릴 때 <b>그 조건의 니케만</b> 새로 받습니다. 한 판에 한 번, 버리는 카드 한 장당 싱크칩 500입니다.', '<div class="hv-fb">' + CYC.map((e2) => '<img alt="" class="' + (e2 === fe ? 'on' : '') + '" src="' + (d.elIco ? d.elIco[e2] : '') + '">').join('') + '</div><i class="hv-cur" style="margin-left:' + (-131 + CYC.indexOf(fe) * 60) + 'px"></i>' + row((k, x) => card(k, x, smp(k).e === fe ? '' : 'hv-fade'))],
      ['점수는 <b style="color:#4db5ff">칩</b> × <b style="color:#ff6b5e">배수</b> 입니다.', '<div class="hv-big"><b class="c">칩 42</b><span>×</span><b class="m">배수 7</b><span>=</span><span class="s">294억</span></div><div class="hv-sub"><i style="background:#0d8bf2">칩</i> 높은 티어 · 돌파 · 우월코드<br><i style="background:#f0483c">배수</i> 같은 기업 · 같은 우월코드를 모은 족보</div>'],
      ['<b>1·2·3버스트</b>를 모두 넣으세요. 하나라도 빠지면 점수가 20% 깎입니다.', '<div class="hv-bx">' + hxs(['I', 'II', 'III']) + '</div><div class="hv-pen">×0.8</div>'],
      ['<b>출격</b>하면 스쿼드가 차례로 사격합니다. 맞을 때마다 피해가 쌓이고, 가장 높은 점수가 랭킹에 기록됩니다.', (() => { const cr = d.list.find((x) => x.n === '크라운') || L0[0], rest = L0.filter((x) => x !== cr), s2 = rest.find((x) => x.w === 'SR' || x.w === 'RL') || rest[0], oth = rest.filter((x) => x !== s2).slice(0, 3);
        const sq5 = [oth[0], cr, oth[1], s2, oth[2]], cx = (k) => 106 + k * 62 + 26; let h = '<div class="hv-tot">0억</div>';
        sq5.forEach((x, k) => { h += cardHtml(Object.assign({}, x, { cnt: k === 1 ? 11 : [4, 0, 7, 4, 1][k] }), BOSS0).replace('class="pk', 'class="pk' + (k === 1 ? ' hv-rc' : k === 3 ? ' hv-rc2' : '')).replace('style="--ec:', 'style="left:' + (106 + k * 62) + 'px;--ec:'); });
        const shot = (ox, dl, big) => { const tx = 260 + (Math.random() * 2 - 1) * 46, ty = 78 + (Math.random() * 2 - 1) * 22; return '<i class="hv-tr" style="left:' + ox + 'px;--l:' + Math.hypot(tx - ox, ty - 134).toFixed(0) + 'px;--a:' + Math.atan2(ty - 134, tx - ox).toFixed(3) + 'rad;--d:' + dl + 's' + (big ? ';height:4px' : '') + '"></i><i class="hv-im" style="left:' + ox + 'px;top:134px;--d:' + dl + 's"></i><i class="hv-im" style="left:' + tx.toFixed(0) + 'px;top:' + ty.toFixed(0) + 'px;--d:' + dl + 's' + (big ? ';width:44px;height:44px;margin:-22px 0 0 -22px' : '') + '"></i>'; };
        for (let q = 0; q < 10; q++) h += shot(cx(1), (0.55 + q * 0.075).toFixed(3), 0); /* 크라운: MG 연사 */
        for (let q = 0; q < 3; q++) h += shot(cx(3), (1.75 + q * 0.42).toFixed(3), 1); /* 다음 니케: 묵직한 단발 */
        return h; })()]
    ];
    hvI = ((i % SC.length) + SC.length) % SC.length; clearTimeout(hvT);
    $('.hv-st').innerHTML = '<span class="hv-n">' + (hvI + 1) + ' / ' + SC.length + '</span>' + SC[hvI][1]; $('.hv-cap').innerHTML = SC[hvI][0];
    $('.hv-dots').innerHTML = SC.map((x, k) => '<i class="' + (k === hvI ? 'on' : '') + '"></i>').join('');
    const bar = $('.hv-bar i'); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    if (hvI === SC.length - 1) { const tt = $('.hv-tot'), me = hvI, hit = (ms, v) => setTimeout(() => { if (tt.isConnected && hvI === me) tt.textContent = v + '억'; }, ms); for (let q = 0; q < 10; q++) hit(560 + q * 75, Math.round(150 * (q + 1) / 10)); for (let q = 0; q < 3; q++) hit(1760 + q * 420, 150 + 48 * (q + 1)); } /* 두 니케가 차례로 사격: 맞을 때마다 피해가 오름 */
    hvT = setTimeout(() => { if (!$('.rd-help').hidden && root.isConnected) hvShow(hvI + 1); }, 3800);
  }
  const pracMode = () => (data().list.filter((x) => x.cnt > 0).length >= 7 ? 'mine' : 'test');
  const realChips = () => { try { return window.doroChips ? window.doroChips.total() : 0; } catch (e) { return 0; } };
  function setMode(m) { S.mode = m; S.boss = null; S.tries = 0; S.max = 3; if (m === 'live') enterLive(); else { S.chips = PROD ? realChips() : 10000; deal(true); } }
  /* 도전 중인 판 포기: 한 번 더 눌러야 실행. 쓴 횟수는 돌아오지 않음 */
  async function giveUp() {
    if (!(S.giveArm && Date.now() - S.giveArm < 3500)) { S.giveArm = Date.now(); ui(); setTimeout(() => { if (root && root.isConnected && !busy) ui(); }, 3600); return; }
    S.giveArm = 0; busy = true; ui();
    try { const j = await api('giveup'); busy = false; S.tries = j.tries || S.tries; S.max = j.max || S.max; S.info = { tries: S.tries, max: S.max, game: false }; clearTable(); S.phase = 'idle'; place(); ui(); const left = S.max - S.tries;
      gate('<h3>포기했습니다</h3><div class="rd-fd">이번 판은 기록되지 않습니다 · 오늘 핸드 ' + S.tries + '/' + S.max + '</div>' + (left > 0 ? '<button type="button" class="rb org" data-r="chal">다시 도전하기</button>' : '<div class="rd-fd">오늘 핸드를 모두 썼습니다.</div>') + '<button type="button" class="rb pur" data-r="rank">랭킹</button><button type="button" class="rb blue" data-r="prac">모의전</button>');
    } catch (e) { busy = false; ui(); $('.rd-msg').textContent = errMsg(e); }
  }
  function goChal() { const ac2 = acct(); if (ac2 && ac2.user) setMode('live'); else { if (window.doroNeedLogin) window.doroNeedLogin('도전하기는 로그인이 필요합니다'); S.mode = 'live'; clearTable(); S.phase = 'idle'; place(); ui(); gate('<h3>도전하기</h3><div class="rd-fd" style="font-size:16px;font-weight:900;color:#ffd24a">로그인이 필요합니다.</div><button type="button" class="rb blue" data-r="prac">모의전</button>'); } }
  /* 입장 연출(솔로레이드 입장처럼): 게이트 닫힘 → 톱니 장치 하강 → 모의전/도전 선택 → 보스 실루엣이 올라오고 장치 상승 → 게이트 열리며 시작 */
  let introPick = null;
  const liveOn = () => !!(S && S.mode === 'live' && S.phase === 'pick'); /* 도전 중인 판이 깔려 있음 */
  function introRem() { const e = $('.rd-in-rem'); if (!e || !S) return; const a0 = acct(), i = S.info || {}; $('.rd-in-cl').textContent = liveOn() || i.game ? '이어서 도전하기' : '도전하기'; e.textContent = a0 && a0.user ? '남은 기록 횟수 ' + Math.max(0, (i.max || 3) - (i.tries || 0)) + '/' + (i.max || 3) : '로그인 필요'; }
  async function intro() {
    const I = $('.rd-in'); if (!I || S.introOn) return; S.introOn = true; I.querySelectorAll('*').forEach((e) => e.getAnimations().forEach((x) => x.cancel())); I.hidden = false;
    const gt = $('.rd-in-g.t'), gb = $('.rd-in-g.b'), gear = $('.rd-in-gear'), sh = $('.rd-in-sh'), scr = $('.rd-in-scr'), pnl = $('.rd-in-p'), sil = $('.rd-in-sil'), A = (el, kf, ms, ez) => el.animate(kf, { duration: ms, fill: 'forwards', easing: ez || 'ease-in' }).finished.catch(() => {});
    scr.classList.remove('on', 'nm'); scr.querySelector('.bn b').textContent = bossNm(); introRem();
    { const a0 = acct(); if (a0 && a0.user && !liveOn()) api('state').then((j) => { S.info = { tries: j.tries || 0, max: j.max || 3, game: !!j.game }; introRem(); }).catch(() => {}); }
    { let t = ''; try { const sn = window.doroCfg.get().season, now = Date.now(); if (sn && now >= sn.start && now < sn.end) { const h = Math.floor((sn.end - now) / 3600000); t = '시즌 종료까지 ' + (h >= 24 ? Math.floor(h / 24) + '일 ' : '') + (h % 24) + '시간'; } else if (sn && now < sn.start) t = '시즌 준비 중'; } catch (e) { /* 설정 전 */ } scr.querySelector('.bn span').textContent = t; }
    const snd = (f) => { try { if (sndMode) f(); } catch (e) { /* 소리 실패는 무시 */ } };
    snd(() => { noise(0.38, 0.12, 0, 600); tone(70, 0.4, 'sawtooth', 0.05, 45); });
    A(gt, [{ transform: 'translateY(-101%)' }, { transform: 'translateY(0)' }], 380, 'cubic-bezier(.6,0,.9,.5)'); await A(gb, [{ transform: 'translateY(101%)' }, { transform: 'translateY(0)' }], 380, 'cubic-bezier(.6,0,.9,.5)');
    snd(() => { noise(0.3, 0.5, 0, 300); tone(55, 0.45, 'sine', 0.6, 28); metal(420, 0.25, 0.05, 0.02); });
    I.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 200 });
    /* 승강기가 올라가는 중: 구멍 사이로 통로의 골조가 아래로 흘러가고, 조명이 가끔 스쳐 지나감 */
    const run = [sh.querySelector('.f').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(240px)' }], { duration: 260, iterations: Infinity, easing: 'linear' }), /* 벽은 빠르게 */
      sh.querySelector('.fl').animate([0, 0, .9, 0, 0, 0, .55, 0, 0, 0, 0, .8, .1, 0, 0, .6, 0, 0, 0, 0].map((o) => ({ opacity: o })), { duration: 1900, iterations: Infinity, easing: 'steps(1)' })]; /* 벽등이 스쳐 지나가는 번쩍임 */
    sh.querySelectorAll('.s').forEach((e) => run.push(e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(360px)' }], { duration: 3600, iterations: Infinity, easing: 'linear' }))); /* 레일은 천천히 */
    let live = true; const rs = $('.rd-in-rs'), gw = $('.rd-in-gw');
    const spin = async (el, dir, step, ms, w0, w1) => { let a = 0; while (live) { await sleep(w0 + Math.random() * (w1 - w0)); if (!live) break; const b = a + dir * step; await A(el, [{ transform: 'rotate(' + a + 'deg)' }, { transform: 'rotate(' + b + 'deg)' }], ms, 'cubic-bezier(.45,0,.55,1)'); a = b; } }; /* 가끔, 부드럽게 가속·감속하며 돎 */
    spin(gw, 1, 45, 3200, 1400, 3600); spin(rs, -1, 30, 3800, 2400, 5200); /* 톱니바퀴는 오른쪽, 회전 세트는 왼쪽 */
    (async () => { while (live) { await sleep(1800 + Math.random() * 5200); if (!live) break; const k = 0.7 + Math.random() * 0.6;
      I.animate([0, 11, -9, 7, -6, 4.5, -3.5, 2.5, -1.8, 1.2, -0.7, 0.3, 0].map((y, q) => ({ transform: 'translate(' + ((q % 2 ? 1 : -1) * Math.abs(y) * 0.22 * k).toFixed(1) + 'px,' + (y * k).toFixed(1) + 'px)', easing: 'ease-in-out' })), { duration: 1500 }); } })(); /* 덜컹거림: 세게 한 번 친 뒤 천천히 잦아듦. 주기는 무작위, 소리 없음 */
    A(sh, [{ opacity: 0 }, { opacity: 1 }], 320, 'ease-out'); await sleep(260);
    snd(() => { for (let q = 0; q < 7; q++) { noise(0.03, 0.12, q * 0.06, 2400); tone(160, 0.04, 'square', 0.03, 120, q * 0.06); } });
    await A(gear, [{ transform: 'translate(-50%,-260%) rotate(-150deg)' }, { transform: 'translate(-50%,-50%) rotate(0deg)' }], 520, 'cubic-bezier(.3,.9,.4,1)');
    gear.style.transform = 'translate(-50%,-50%)'; snd(() => { noise(0.22, 0.45, 0, 500); tone(80, 0.3, 'sine', 0.5, 40); metal(900, 0.18, 0.06, 0.01); });
    gear.animate([{ transform: 'translate(-50%,-50%) scale(1.04)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 180 }); scr.classList.add('on'); snd(() => { [0, 0.22, 0.44].forEach((d) => tone(520, 0.12, 'square', 0.035, 0, d)); });
    await sleep(1000); scr.classList.add('nm'); await sleep(200);
    snd(() => { noise(0.18, 0.1, 0, 1500); }); await A(pnl, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], 300, 'cubic-bezier(.2,.9,.3,1)');
    const pick = await new Promise((res) => { introPick = res; }); introPick = null; live = false; sfx.tap();
    await A(pnl, [{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], 220);
    snd(() => { tone(60, 0.9, 'sawtooth', 0.04, 110); noise(0.8, 0.06, 0, 400); });
    { let r = 1; const dec = setInterval(() => { r = Math.max(0, r - 0.09); run.forEach((a) => { try { a.updatePlaybackRate(r); } catch (e) { /* 무시 */ } }); if (r <= 0) clearInterval(dec); }, 70); } /* 승강기가 느려지며 멈춤 */
    A(sh, [{ opacity: 1 }, { opacity: 0.35 }], 800, 'ease-out');
    await A(sil, [{ opacity: 0, transform: 'translateY(34%)' }, { opacity: 0.62, transform: 'translateY(0)' }], 900, 'cubic-bezier(.2,.7,.3,1)'); /* 보스가 구멍 사이로 떠오름 */
    snd(() => { noise(0.2, 0.4, 0, 500); tone(70, 0.3, 'sine', 0.5, 40); metal(700, 0.16, 0.05, 0.01); }); I.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 160 }); await sleep(220);
    snd(() => { for (let q = 0; q < 4; q++) noise(0.03, 0.1, q * 0.06, 2400); });
    await A(gear, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-57%) scale(1.035)' }], 300, 'cubic-bezier(.3,1.5,.5,1)'); await sleep(140); /* 톱니바퀴가 먼저 들려 올라감 */
    snd(() => { for (let q = 0; q < 6; q++) noise(0.03, 0.1, q * 0.06, 2400); });
    await A(gear, [{ transform: 'translate(-50%,-57%) scale(1.035) rotate(0deg)' }, { transform: 'translate(-50%,-320%) scale(1.035) rotate(150deg)' }], 460, 'cubic-bezier(.6,0,.8,.4)'); await sleep(120);
    if (pick === 'chal') { if (!liveOn()) goChal(); } else setMode(pracMode()); /* 이어서 도전: 깔려 있는 판 그대로 */ /* 게이트가 열리는 동안 판이 깔림 */
    snd(() => { noise(0.5, 0.3, 0, 350); tone(50, 0.5, 'sine', 0.4, 90); });
    A(sil, [{ opacity: 0.62 }, { opacity: 0 }], 300); A(sh, [{ opacity: 0.35 }, { opacity: 0 }], 200); A(gt, [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], 560, 'cubic-bezier(.5,0,.6,1)'); await A(gb, [{ transform: 'translateY(0)' }, { transform: 'translateY(101%)' }], 560, 'cubic-bezier(.5,0,.6,1)');
    run.forEach((a) => a.cancel()); I.hidden = true; gear.style.transform = ''; I.querySelectorAll('*').forEach((e) => e.getAnimations().forEach((x) => x.cancel())); S.introOn = false;
  }
  function onClick(ev) {
    { const ib = ev.target.closest('[data-in]'); if (ib) { if (introPick) introPick(ib.dataset.in); return; } if (S && S.introOn) return; }
    const t = ev.target, rb = t.closest('[data-r]'), fp = $('.rd-flt');
    if (!fp.hidden && !t.closest('.rd-flt') && !(rb && rb.dataset.r === 'flt')) { fp.hidden = true; } /* 아무 곳이나 누르면 지정 드로우 창만 닫힘(고른 조건은 버리기 전까지 유지) */
    const hh = $('.rd-half'), armed = hh.classList.contains('arm'); if (armed) hh.classList.remove('arm'); /* 다른 곳을 누르면 말풍선이 들어감 */
    if (rb) { const a = rb.dataset.r;
      if (a === 'rule') { $('.rd-rule').hidden = false; return; }
      if (a === 'help') { $('.rd-help').hidden = false; hvShow(0); return; }
      if (a === 'snd') { sndMode = sndMode === 1 ? 2 : sndMode === 2 ? 0 : 1; try { localStorage.setItem(SND_K, String(sndMode)); } catch (e) { /* 무시 */ } if (sndMode) { sfx.deal(0); setTimeout(() => sfx.hit(0.6), 260); } ui(); return; } /* 전장 → 아케이드 → 끔 */
      if (a === 'full') { const r = rd(); try { if (document.fullscreenElement) document.exitFullscreen(); else if (r.requestFullscreen) r.requestFullscreen(); } catch (e) { /* 미지원 */ } return; }
      if (a === 'hv') { hvShow(hvI + (+rb.dataset.d || 1)); return; }
      if (a === 'dk') { const dk = rb.closest('.rd-rk').querySelector('.rk-deck'); dk.hidden = !dk.hidden; sfx.tap(); return; }
      if (a === 'hint') { if (busy) return; if (!armed) { hh.classList.add('arm'); sfx.sel && sfx.sel(); } else payHint(); return; }
      sfx.tap();
      if (a === 'mx') { rb.closest('.rd-modal').hidden = true; clearTimeout(hvT); return; }
      if (a === 'rank') { showRank(); return; }
      if (a === 'exit') { setFs(false); return; }
      if (busy) return;
      if (a === 'go') play(); else if (a === 'disc') discard();
      else if (a === 'again') { if (S.mode === 'live') enterLive(); else deal(false); }
      else if (a === 'start') deal(false);
      else if (a === 'boss') deal(true);
      else if (a === 'prac') { setMode(pracMode()); } /* 모의전: 내 도감 덱(7장 이상일 때), 아니면 테스트 덱. 기록·싱크칩 차감 없음 */
      else if (a === 'chal') { if (liveOn()) giveUp(); else goChal(); }
      else if (a === 'open') { busy = true; api('set', { days: 5 }).then(() => { busy = false; enterLive(); }).catch((e) => { busy = false; gate('<h3>실전</h3><div class="rd-fd">' + esc(errMsg(e)) + '</div><button type="button" class="rb blue" data-r="prac">모의전</button>'); }); }
      else if (a === 'flt') { fp.hidden = !fp.hidden; poolKey = ''; sfx.open(); ui(); }
      else if (a === 'chips' && S.mode !== 'live' && !PROD) { S.chips = 10000; ui(); }
      return; }
    const md = t.closest('.rd-modal'); if (md && !t.closest('.rd-mb')) { md.hidden = true; clearTimeout(hvT); return; }
    if (busy) return;
    const sb = t.closest('[data-s]'); if (sb && S.phase === 'pick') { S.sort = sb.dataset.s; sortHand(); place(); ui(); return; }
    const fb = t.closest('.rd-fg button'); if (fb) { const k = fb.dataset.k, on = S.flt[k] === fb.dataset.v; S.flt = { e: '', c: '', b: '', r: '' }; if (!on && !S.fltUsed) S.flt[k] = fb.dataset.v; sfx.sel(); ui(); } /* 조건은 하나만 */
  }
  /* 카드 누르기·끌기: 누르면 고르기(스쿼드에 놓인 카드는 손패로), 끌어서 스쿼드↔손패로 옮기기 */
  const recClear = () => $$('.pk.rec,.pk.recx').forEach((e) => e.classList.remove('rec', 'recx'));
  function tap(id) {
    recClear(); const si = S.squad.indexOf(id);
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
    recClear(); const from = S.squad.indexOf(id), occ = S.squad[i]; if (i < 0 || i > 4 || from === i) return;
    if (from >= 0) { S.squad[from] = occ || null; S.squad[i] = id; }
    else { S.hand = S.hand.filter((x) => x !== id); S.sel.delete(id); if (occ) S.hand.push(occ); S.squad[i] = id; sortHand(); }
    sfx.put(); place();
  }
  function onMoveDrag(ev) {
    if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.on) { if (Math.abs(dx) + Math.abs(dy) < 9) return; drag.on = true;
      const g = drag.el.cloneNode(true), w = drag.el.offsetWidth, h = drag.el.offsetHeight; g.className = drag.el.className.replace(/\bsel\b/, '') + ' pk-ghost'; g.removeAttribute('data-id');
      g.style.cssText += ';--cw:' + w + 'px;width:' + w + 'px;height:' + h + 'px;transform:' + (rd().classList.contains('rot') ? 'rotate(90deg)' : 'rotate(-4deg)') + ' scale(1.08)'; drag.w = w; drag.h = h;
      (document.fullscreenElement === rd() ? rd() : document.body).appendChild(g); drag.g = g; drag.el.classList.add('drag'); }
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
    const full = document.fullscreenElement === r, cw = fs ? Math.min(112, w * 0.108, (h - 96) / 4.14) : full ? Math.min(190, w * 0.105, (h - 150) / 4.2) : Math.min(112, w * 0.11);
    const fb = $('.rd-fsb'); if (fb) fb.textContent = full ? '✕' : '⛶';
    r.style.setProperty('--cw', Math.max(40, cw).toFixed(1) + 'px');
    /* 왼쪽 패널이 화면 높이를 넘으면 그만큼 통째로 줄여서 스크롤 없이 다 보이게(모바일 가로 화면) */
    const sd = $('.rd-side'); if (sd) { sd.style.zoom = ''; if (fs) { const need = sd.scrollHeight, have = sd.clientHeight; if (need > have + 1 && have > 0) sd.style.zoom = Math.max(0.6, have / need * 0.985).toFixed(3); } }
  }
  function setFs(on) {
    const r = rd(); if (!r) return; r.hidden = !on && isMobile(); r.classList.toggle('fs', !!on); document.documentElement.style.overflow = on ? 'hidden' : '';
    root.querySelector('.rd-launch').hidden = !!on || !isMobile();
    if (on) { try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 미지원 */ } fit(); }).catch(() => {}); } catch (e) { /* 미지원 */ } }
    else { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* 무시 */ } }
    fit(); setTimeout(fit, 350);
    if (on && S && S.needIntro) { S.needIntro = 0; setTimeout(intro, 250); }
  }
  function build() {
    addCss();
    const fg = (lab, k, arr) => '<div class="rd-fg"><span>' + lab + '</span>' + arr.map((v) => '<button type="button" data-k="' + k + '" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';
    const d0 = data(), smp = d0.list.slice().sort((a, b) => (TS[b.t] || 0) - (TS[a.t] || 0)).slice(0, 5).map((x, i) => cardHtml(Object.assign({}, x, { cnt: [4, 11, 11, 7, 1][i] }), BOSS0)).join('');
    const hx = (inner, cls) => '<span class="pk-hx ' + (cls || '') + '">' + inner + '</span>', wpi = (w) => '<img alt="' + w + '" src="assets/img/wp-' + w + '.png">';
    root.innerHTML = '<div class="rd-launch" hidden><div class="rd-lt"><small>POKER RAID</small>' + bossNm() + '</div><div class="rd-lc">' + smp + '</div><button type="button" class="rd-go" data-fs="1" aria-label="플레이">▶</button><div class="rd-lp">가로 화면으로 시작</div></div>' +
      '<div class="rd"><div class="rd-in" hidden><div class="rd-in-g t"></div><div class="rd-in-g b"></div><div class="rd-in-sh"><i class="f"></i><i class="s"></i><i class="s b"></i><i class="fl"></i></div><div class="rd-in-sil"></div><div class="rd-in-gear"><svg class="rd-in-rs" viewBox="-104 -104 208 208" aria-hidden="true"><defs><linearGradient id="rdGo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#666b74"/><stop offset="1" stop-color="#2c2f35"/></linearGradient></defs>' + /* 회전 세트: 가장 바깥 테두리 + 접합부 3개 + 원형 경고 줄무늬(한 몸, 왼쪽으로 돎). 톱니바퀴 뒤에 깔림 */
        '<circle r="103" fill="#121315"/><circle r="98.5" fill="none" stroke="url(#rdGo)" stroke-width="8"/><circle r="102.5" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/><circle r="94" fill="#1c1e22" stroke="#0b0c0d" stroke-width="1.5"/>' +
        [48, 132, 268].map((a) => '<g transform="rotate(' + a + ')"><rect x="-9.5" y="-99.5" width="19" height="27" rx="2" fill="#1d1f23" stroke="#060707" stroke-width="1.2"/><rect x="-8" y="-98" width="16" height="24" rx="1.2" fill="#3a3e45"/><rect x="-8" y="-98" width="16" height="2.2" fill="#6e737c"/><rect x="-6.6" y="-94.6" width="13.2" height="12.6" fill="#0c0d0f"/>' +
          [[-6, -94], [0.4, -94], [-6, -88], [0.4, -88]].map((q) => '<rect x="' + q[0] + '" y="' + q[1] + '" width="5.6" height="5.4" fill="#2a2d33" stroke="#787d86" stroke-width=".7"/><rect x="' + (q[0] + 0.9) + '" y="' + (q[1] + 0.9) + '" width="3.8" height="1.3" fill="rgba(255,255,255,.2)"/>').join('') +
          '<rect x="-6.6" y="-80.6" width="13.2" height="2.4" fill="#787d86"/><rect x="-6.6" y="-77.4" width="13.2" height="1.6" fill="#15171a"/><circle cx="-6.4" cy="-96.3" r=".8" fill="#0a0b0c"/><circle cx="6.4" cy="-96.3" r=".8" fill="#0a0b0c"/></g>').join('') +
        '<circle r="74" fill="#0b0c0d"/><g fill="#e3b82f"><path d="M0.00 -73.20L7.65 -72.80L12.29 -63.22L5.61 -64.15Z"/><path d="M15.22 -71.60L22.62 -69.62L25.16 -59.28L18.83 -61.59Z"/><path d="M29.77 -66.87L36.60 -63.39L36.94 -52.75L31.22 -56.33Z"/><path d="M43.03 -59.22L48.98 -54.40L47.10 -43.92L42.25 -48.60Z"/><path d="M54.40 -48.98L59.22 -43.03L55.20 -33.17L51.43 -38.76Z"/><path d="M63.39 -36.60L66.87 -29.77L60.89 -20.97L58.37 -27.22Z"/><path d="M69.62 -22.62L71.60 -15.22L63.92 -7.85L62.75 -14.49Z"/><path d="M72.80 -7.65L73.20 0.00L64.15 5.61L64.39 -1.12Z"/><path d="M72.80 7.65L71.60 15.22L61.59 18.83L63.22 12.29Z"/><path d="M69.62 22.62L66.87 29.77L56.33 31.22L59.28 25.16Z"/><path d="M63.39 36.60L59.22 43.03L48.60 42.25L52.75 36.94Z"/><path d="M54.40 48.98L48.98 54.40L38.76 51.43L43.92 47.10Z"/><path d="M43.03 59.22L36.60 63.39L27.22 58.37L33.17 55.20Z"/><path d="M29.77 66.87L22.62 69.62L14.49 62.75L20.97 60.89Z"/><path d="M15.22 71.60L7.65 72.80L1.12 64.39L7.85 63.92Z"/><path d="M0.00 73.20L-7.65 72.80L-12.29 63.22L-5.61 64.15Z"/><path d="M-15.22 71.60L-22.62 69.62L-25.16 59.28L-18.83 61.59Z"/><path d="M-29.77 66.87L-36.60 63.39L-36.94 52.75L-31.22 56.33Z"/><path d="M-43.03 59.22L-48.98 54.40L-47.10 43.92L-42.25 48.60Z"/><path d="M-54.40 48.98L-59.22 43.03L-55.20 33.17L-51.43 38.76Z"/><path d="M-63.39 36.60L-66.87 29.77L-60.89 20.97L-58.37 27.22Z"/><path d="M-69.62 22.62L-71.60 15.22L-63.92 7.85L-62.75 14.49Z"/><path d="M-72.80 7.65L-73.20 0.00L-64.15 -5.61L-64.39 1.12Z"/><path d="M-72.80 -7.65L-71.60 -15.22L-61.59 -18.83L-63.22 -12.29Z"/><path d="M-69.62 -22.62L-66.87 -29.77L-56.33 -31.22L-59.28 -25.16Z"/><path d="M-63.39 -36.60L-59.22 -43.03L-48.60 -42.25L-52.75 -36.94Z"/><path d="M-54.40 -48.98L-48.98 -54.40L-38.76 -51.43L-43.92 -47.10Z"/><path d="M-43.03 -59.22L-36.60 -63.39L-27.22 -58.37L-33.17 -55.20Z"/><path d="M-29.77 -66.87L-22.62 -69.62L-14.49 -62.75L-20.97 -60.89Z"/><path d="M-15.22 -71.60L-7.65 -72.80L-1.12 -64.39L-7.85 -63.92Z"/></g><circle r="73.6" fill="none" stroke="#000" stroke-width="1.2" opacity=".7"/><circle r="63.8" fill="none" stroke="#1a1b1e" stroke-width="2"/></svg>' +
        '<svg class="rd-in-gw" viewBox="-104 -104 208 208" aria-hidden="true"><defs><linearGradient id="rdGm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcd9cf"/><stop offset=".5" stop-color="#aaa79d"/><stop offset="1" stop-color="#77756d"/></linearGradient></defs>' + /* 톱니바퀴: 톱니 16개 + 리벳 박힌 스틸 테두리(오른쪽으로 돎) */
        Array.from({ length: 16 }, (_, i) => '<path d="M-9.5 -79L9.5 -79L5.5 -91.5L-5.5 -91.5Z" fill="#5a5f67" stroke="#24262a" stroke-width="1.2" transform="rotate(' + (i * 22.5 + 11.25) + ')"/><path d="M-5 -90.5L5 -90.5" stroke="rgba(255,255,255,.3)" stroke-width="1" transform="rotate(' + (i * 22.5 + 11.25) + ')"/>').join('') +
        '<circle r="77.4" fill="none" stroke="url(#rdGm)" stroke-width="7"/><circle r="81" fill="none" stroke="#55534c" stroke-width="1.1"/><circle r="73.9" fill="none" stroke="#55534c" stroke-width="1.1"/>' + Array.from({ length: 16 }, (_, i) => '<circle cx="0" cy="-77.4" r="1.5" fill="#6d6a62" stroke="#3c3a35" stroke-width=".5" transform="rotate(' + i * 22.5 + ')"/>').join('') + '</svg><i class="rd-in-grime"></i><div class="rd-in-scr"><div class="es">EMERGENCY<br>SCRAMBLE</div><div class="bn"><small>POKER RAID</small><b></b><span></span></div></div></div>' +
      '<div class="rd-in-p"><em>CHALLENGE MODE</em><p>도전하기는 기록이 순위에 남습니다 · 모의전은 기록과 싱크칩 차감 없이 연습합니다</p><div><button type="button" class="rd-in-b" data-in="prac">모의전</button><button type="button" class="rd-in-b red" data-in="chal"><span class="rd-in-cl">도전하기</span><small class="rd-in-rem"></small></button></div></div></div><aside class="rd-side">' +
      '<div class="pn rd-boss"><div class="rd-bn"></div><div class="rd-bi"></div></div>' +
      '<div class="pn rd-hp"><div class="rd-hn"></div><div class="rd-cm"><b class="rd-chips">0</b><i>×</i><b class="rd-mult">0</b></div><div class="rd-ex"><span>예상 점수</span><b>0억</b></div></div>' +
      '<div class="pn rd-row rd-best"><span>최고 점수</span><b>0</b></div>' +
      '<div class="rd-st"><div class="rdw">버리기<b>0</b></div><div class="ch" data-r="chips"><b>0</b></div></div>' +
      '<div class="rd-sb"><button type="button" class="rb org" data-r="rule">족보</button><button type="button" class="rb pur" data-r="rank"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-2px;margin-right:4px" fill="#ffd24a" aria-hidden="true"><path d="M3 18h18v2.5H3zM3 7l4.5 4L12 4l4.5 7L21 7l-1.6 9.5H4.6z"/></svg>랭킹</button>' +
      '<div class="rd-half"><button type="button" class="rb gry" data-r="help" title="도움말" aria-label="도움말">?</button><button type="button" class="rb grn" data-r="hint" title="추천" aria-label="추천">💡<em></em></button><div class="rd-hb"></div></div><button type="button" class="rb blue" data-r="prac">모의전</button>' +
      '<button type="button" class="rd-chal" data-r="chal"><b>도전하기</b><span></span></button><div class="rd-rem">남은 기록 횟수<b>3/3</b></div></div>' +
      '</aside><main class="rd-main"><div class="rd-bg"></div><div class="rd-pt">' + (() => { let h = '', r = Math.random; for (let q = 0; q < 3; q++) h += '<b style="--x:' + (q * 34 - 12) + '%;--t:' + (22 + q * 7) + 's;--d:-' + (q * 9) + 's"></b>'; for (let q = 0; q < 3; q++) h += '<u style="--x:' + (12 + q * 38) + '%;--d:-' + (q * 3.1).toFixed(1) + 's"></u>'; for (let q = 0; q < 22; q++) h += '<i style="--x:' + (r() * 100).toFixed(1) + '%;--s:' + (2 + r() * 3).toFixed(1) + 'px;--dx:' + ((r() * 2 - 1) * 140).toFixed(0) + 'px;--t:' + (5 + r() * 7).toFixed(1) + 's;--d:-' + (r() * 12).toFixed(1) + 's"></i>'; for (let q = 0; q < 14; q++) h += '<s style="--x:' + (r() * 100).toFixed(1) + '%;--dx:' + (40 + r() * 120).toFixed(0) + 'px;--t:' + (9 + r() * 8).toFixed(1) + 's;--d:-' + (r() * 16).toFixed(1) + 's"></s>'; return h; })() + '</div><i class="rd-tgt"></i><div class="rd-total">누적 피해<b>0억</b></div><span class="rd-tag"></span><button type="button" class="rd-x" data-r="exit" aria-label="닫기">✕</button><button type="button" class="rd-fsb" data-r="full" title="전체 화면" aria-label="전체 화면">⛶</button>' +
      '<div class="rd-play"></div><div class="rd-msg"></div><div class="rd-hand"><div class="rd-deck"><i></i><span></span></div></div>' +
      '<div class="rd-ctl"><button type="button" class="rb blue" data-r="go">출격</button><div class="rd-sort"><span>정렬</span><button type="button" class="rb org" data-s="c">기업</button><button type="button" class="rb gry" data-s="e">코드</button></div><button type="button" class="rb red" data-r="disc">버리기</button><button type="button" class="rb gry" data-r="flt" style="min-width:0;font-size:13px">필터</button></div>' +
      '<div class="rd-flt" hidden><div class="rd-fgs"><div class="rd-fr">' +
      '<div class="rd-fg">' + CYC.map((k) => '<button type="button" data-k="e" data-v="' + k + '" title="' + ELN[k] + '">' + (d0.elIco ? '<img class="fe" alt="' + ELN[k] + '" src="' + d0.elIco[k] + '">' : ELN[k]) + '</button>').join('') + '</div>' +
      '<div class="rd-fg">' + COS.map((k) => '<button type="button" data-k="c" data-v="' + k + '" title="' + k + '">' + hx(d0.coIco && d0.coIco[k] ? '<img alt="' + k + '" src="' + d0.coIco[k] + '">' : COL[k], 'fc') + (k === '필그림' ? '<small>×2</small>' : '') + '</button>').join('') + '</div></div><div class="rd-fr">' +
      '<div class="rd-fg">' + [['1', 'I'], ['2', 'II'], ['3', 'III']].map((v) => '<button type="button" data-k="b" data-v="' + v[0] + '" title="버스트 ' + v[1] + '">' + hx(v[1]) + '</button>').join('') + '</div>' +
      '<div class="rd-fg">' + ['NEAR', 'MID', 'FAR'].map((k) => '<button type="button" data-k="r" data-v="' + k + '" title="' + k + '"><span class="fw">' + RNG[k].map(wpi).join('') + '</span></button>').join('') + '</div>' +
      '<div class="rd-fc" style="margin-left:auto;color:#ffd24a;font-size:14px;display:flex;align-items:center;gap:3px"></div></div></div>' +
      '<div class="rd-pool"><div class="rd-ph"></div><div class="rd-pl"></div></div></div>' +
      '<div class="rd-ov rd-gate" hidden><div class="rd-box"></div></div>' +
      '<div class="rd-ov rd-fin" hidden><div class="rd-box"><h3>RAID SCORE</h3><div class="rd-fs"><b>0</b><small>억</small></div><div class="rd-rkl"></div><div class="rd-fd"></div><button type="button" class="rb blue" data-r="again">재도전</button><button type="button" class="rb pur" data-r="rank">랭킹</button></div></div>' +
      '</main>' +
      '<div class="rd-modal rd-rule" hidden><div class="rd-mb"><h3>족보</h3><div class="rd-eq">점수 = <b class="c">칩</b> × <b class="m">배수</b> × <b class="f">버스트</b></div><div class="rd-rg">' +
      '<div class="rd-w c"><h4>칩</h4><table><tr><td>티어</td><td>SSS 9 → F 1</td></tr><tr><td>돌파 · 코강 (1장당)</td><td>+1</td></tr>' +
      '<tr><td>우월코드</td><td>+2 <small style="font-weight:700;opacity:.85">(<span class="pk-hx" style="font-size:8px;display:inline-grid;vertical-align:middle">III</span> +5)</small></td></tr></table><p style="margin:4px 0 0;opacity:.85;font-size:12px">카드 오른쪽 위 숫자 = 티어 + 돌파</p></div>' +
      '<div class="rd-w m"><h4>배수</h4><table>' + HORD.map((k) => '<tr><td>' + HN[k] + '</td><td>+' + HM[k] + '</td></tr>').join('') + '</table><p style="margin:4px 0 0;opacity:.85;font-size:12px">기업과 우월코드에서 각각 계산해 더합니다</p></div>' +
      '<div class="rd-w f"><table><tr><td>1 2 3버스트 누락</td><td>0.8x</td></tr></table></div>' +
      '<div class="rd-w f" style="grid-column:1/-1"><h4 style="margin:0 0 4px">크리티컬 · 코어 히트 <small style="font-weight:700;opacity:.8">니케마다 따로 판정 · 둘은 더합니다(둘 다 = 최대 2배)</small></h4><table><tr><td>크리티컬 대미지</td><td>+50%</td></tr><tr><td>크리티컬 확률</td><td>기본 15% · 추천 총기 +50% · RL +25%</td></tr><tr><td>코어 히트 (출격 때 사격 판정)</td><td>1존 +10% · 2존 +25% · 3존 +50%</td></tr></table></div></div>' +
      '<div style="text-align:center;margin-top:12px"><button type="button" class="rb gry" data-r="mx">닫기</button></div></div></div>' +
      '<div class="rd-modal rd-help" hidden><div class="rd-mb"><div class="hv-st"></div><div class="hv-bar"><i></i></div><div class="hv-cap"></div>' +
      '<div class="hv-ft"><button type="button" class="rb gry" data-r="hv" data-d="-1">◀</button><div class="hv-dots"></div><button type="button" class="rb gry" data-r="hv" data-d="1">▶</button><button type="button" class="rb blue" data-r="mx">닫기</button></div></div></div>' +
      '<div class="rd-modal rd-rank" hidden><div class="rd-mb"><div class="rd-rkh">랭킹 정보<small class="rk-left"></small><button type="button" data-r="mx" aria-label="닫기">✕</button></div><div class="rd-rl"></div><div class="rk-me"></div></div></div>' +
      '</div>';
    $('.rd-half [data-r=hint] em').innerHTML = chipIco(14) + '100'; $('.rd-hb').innerHTML = chipIco(15) + '100으로 힌트 보기';
    document.addEventListener('click', (ev) => { if (!root.contains(ev.target)) { const h = $('.rd-half'); if (h) h.classList.remove('arm'); } });
    root.addEventListener('click', (ev) => { if (ev.target.closest('[data-fs]')) { setFs(true); return; } onClick(ev); });
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onHover);
    window.addEventListener('pointermove', onMoveDrag); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', fit); document.addEventListener('fullscreenchange', () => { fit(); setTimeout(fit, 200); }); try { new ResizeObserver(fit).observe(root); } catch (e) { /* 미지원 */ }
  }
  window.doroRaid = {
    api: (a, body) => api(a, body),
    card: (x, boss) => { addCss(); return cardHtml(x, boss); },
    mount(el) {
      if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; }
      if (!d.list.length) { setTimeout(() => window.doroRaid.mount(el), 400); return; } /* 데이터 로딩 대기 */
      if (root === el && S) { fit(); if (!S.introOn && !busy) { if (rd().hidden) S.needIntro = 1; else intro(); } return; } /* 들어올 때마다 입장 연출(하던 판은 그대로) */
      root = el; DB = {}; d.list.forEach((x) => { if (x.code) DB[x.code] = x; });
      S = { mode: 'test', boss: null, cards: {}, hand: [], squad: [null, null, null, null, null], sel: new Set(), redraws: 3, tries: 0, max: 3, phase: 'idle', chips: 10000, sort: 'c', flt: { e: '', c: '', b: '', r: '' }, deckLeft: 0, deckN: 0, liveBest: 0 };
      S.mode = pracMode(); if (PROD) S.chips = realChips(); S.info = { tries: 0, max: 3 };
      build(); setInterval(() => { if (root && root.isConnected && S && !busy) ui(); }, 30000);
      { const a0 = acct(); if (a0 && a0.user) api('state').then((j) => { S.info = { tries: j.tries || 0, max: j.max || 3, game: !!j.game }; if (S.mode !== 'live') ui(); introRem(); }).catch(() => {}); } /* 남은 기록 횟수 */
      if (isMobile()) { rd().hidden = true; root.querySelector('.rd-launch').hidden = false; }
      fit(); setBoss(BOSS0); S.phase = 'idle'; place(); ui(); /* 판은 입장 연출에서 모의전/도전을 고른 뒤에 깔림 */
      if (isMobile()) S.needIntro = 1; else intro();
    },
    _eval: evalSquad,
    /* 추천 효율 측정(로컬 전용): 같은 패로 ① 안 버림 ② 추천(필터 없이) ③ 추천(필터 포함)을 n판씩 */
    _sim(n) { if (PROD) return null; const d = data(), tc = () => { const u = Math.random(); return u < 0.3 ? 1 : u < 0.5 ? 2 + Math.floor(Math.random() * 2) : u < 0.7 ? 4 : u < 0.88 ? 5 + Math.floor(Math.random() * 6) : 11; }, sum = [0, 0, 0], chipsUsed = [0, 0, 0], disc = [0, 0, 0];
      for (let g = 0; g < n; g++) { const deck0 = d.list.map((x) => Object.assign({}, x, { id: String(x.code || x.n), tv: TS[x.t] || 1, cnt: tc() })); for (let i = deck0.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck0[i]; deck0[i] = deck0[j]; deck0[j] = t; }
        for (let p = 0; p < 3; p++) { const deck = deck0.slice(), hand = deck.splice(0, 7); let rd2 = p ? 3 : 0, chips = 10000, fu = false;
          while (rd2 > 0) { const pl = hintPlan(hand, deck, rd2, chips, BOSS0, p === 1 || fu); if (!pl.bd) break; const f = pl.bd.f, cost = f ? costF(f, pl.bd.out.length) : 0; if (f) fu = true;
            pl.bd.out.forEach((x) => { hand.splice(hand.indexOf(x), 1); let i = f ? deck.findIndex((y) => matchF(y, f)) : 0; if (i < 0) i = 0; hand.push(deck.splice(i, 1)[0]); }); chips -= cost; chipsUsed[p] += cost; disc[p]++; rd2--; }
          sum[p] += best5(hand, BOSS0).score; } }
      return { n, none: Math.round(sum[0] / n), hint: Math.round(sum[1] / n), hintFilter: Math.round(sum[2] / n), chipsPerGame: Math.round(chipsUsed[2] / n), discardsPerGame: [disc[1] / n, disc[2] / n] }; }
  };
})();
