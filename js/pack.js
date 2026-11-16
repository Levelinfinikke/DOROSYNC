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
  /* ---------- 소리 ---------- */
  const ac = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  const tone = (f, d, v, t, type) => { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (t || 0); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02); };
  const noise = (d, v, hp) => { const a = ac(); if (!a) return; const b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length); const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 2500; g.gain.value = v || 0.1; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(); };
  const sfx = { tear: () => noise(0.05, 0.07, 3500), rip: () => { noise(0.3, 0.2, 1800); tone(180, 0.2, 0.06, 0, 'sawtooth'); }, card: () => noise(0.09, 0.09, 4200),
    tier: (tv) => { if (tv >= 9) [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.4, 0.09, i * 0.07)); else if (tv >= 6) [523, 659, 784].slice(0, tv - 5 + 1).forEach((f, i) => tone(f * (tv >= 8 ? 1.26 : 1), 0.3, 0.08, i * 0.07)); else tone(330, 0.08, 0.04); }, up: () => { tone(880, 0.12, 0.09); tone(1320, 0.25, 0.09, 0.08); } };
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
  const CSS = `
#tab-pack{--pw:min(230px,56vw)}
.pp-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px 14px;margin-top:14px}
.pp-it{display:flex;flex-direction:column;align-items:center;gap:8px}.pp-it .pp{--pw:118px;cursor:default}
.pp-it b{font-size:14px}.pp-it small{color:var(--muted);font-size:12px;margin-top:-6px}
.pp-buy{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.pp-buy button{display:inline-flex;align-items:center;gap:3px;padding:6px 9px;font-size:12.5px;font-weight:800;border-radius:10px}
.pp-bal{display:flex;gap:14px;align-items:center;font-weight:800}.pp-bal span{display:inline-flex;align-items:center;gap:4px}
.pp{position:relative;width:var(--pw);aspect-ratio:9/14;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.3,1.3,.5,1);touch-action:none;user-select:none;-webkit-user-select:none}
.pp.flip{transform:rotateY(180deg)}
.pp-f,.pp-b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}.pp-b{transform:rotateY(180deg);display:flex}
.pp-skin{background:linear-gradient(115deg,rgba(255,255,255,.0) 20%,rgba(255,255,255,.38) 34%,rgba(255,255,255,0) 46%,rgba(255,255,255,.18) 62%,rgba(255,255,255,0) 74%),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 2px,rgba(0,0,0,.05) 2px 4px),linear-gradient(160deg,var(--c1),var(--c2) 55%,var(--c1));box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 10px 22px rgba(0,0,0,.45)}
.pp-top{position:absolute;left:0;right:0;top:0;height:11%;transform-origin:100% 100%;clip-path:polygon(0 12%,4% 0,8% 12%,12% 0,16% 12%,20% 0,24% 12%,28% 0,32% 12%,36% 0,40% 12%,44% 0,48% 12%,52% 0,56% 12%,60% 0,64% 12%,68% 0,72% 12%,76% 0,80% 12%,84% 0,88% 12%,92% 0,96% 12%,100% 0,100% 100%,0 100%);z-index:2}
.pp-top:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.45) 0 4px,transparent 4px 7px)}
.pp-body{position:absolute;left:0;right:0;top:11%;bottom:0;overflow:hidden;clip-path:polygon(0 0,100% 0,100% 96%,96% 100%,92% 96%,88% 100%,84% 96%,80% 100%,76% 96%,72% 100%,68% 96%,64% 100%,60% 96%,56% 100%,52% 96%,48% 100%,44% 96%,40% 100%,36% 96%,32% 100%,28% 96%,24% 100%,20% 96%,16% 100%,12% 96%,8% 100%,4% 96%,0 100%)}
.pp-ttl{position:absolute;left:0;right:0;top:9%;text-align:center;font-family:"Arial Black",Arial,sans-serif;font-style:italic;color:#fff;font-size:calc(var(--pw)*.105);line-height:1.05;text-shadow:0 2px 0 rgba(0,0,0,.45)}
.pp-ttl small{display:block;font-size:.5em;letter-spacing:.18em;opacity:.85;font-style:normal}
.pp-ring{position:absolute;left:50%;top:50%;width:52%;aspect-ratio:1;transform:translate(-50%,-46%);border-radius:50%;border:calc(var(--pw)*.02) solid rgba(255,255,255,.75);box-shadow:0 0 0 calc(var(--pw)*.012) rgba(0,0,0,.35),inset 0 0 calc(var(--pw)*.08) rgba(0,0,0,.5);display:grid;place-items:center;background:radial-gradient(circle,rgba(0,0,0,.15),rgba(0,0,0,.5))}
.pp-ring b{font-family:"Arial Black",Arial,sans-serif;font-size:calc(var(--pw)*.2);color:#fff;text-shadow:0 0 calc(var(--pw)*.06) var(--c2)}
.pp-co{position:absolute;left:5%;bottom:6%;width:44%;aspect-ratio:1;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 3px 2px rgba(0,0,0,.5));opacity:.95}
.pp-n{position:absolute;right:7%;bottom:7%;font-family:"Arial Black",Arial,sans-serif;color:#fff;font-size:calc(var(--pw)*.07);text-align:right;line-height:1.1;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.pp.pil .pp-skin{background:linear-gradient(115deg,rgba(255,255,255,0) 20%,rgba(255,240,180,.5) 34%,rgba(255,255,255,0) 46%,rgba(120,220,255,.25) 60%,rgba(255,120,220,.22) 68%,rgba(255,255,255,0) 78%),repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 2px,rgba(0,0,0,.08) 2px 4px),linear-gradient(160deg,#0f0c06,#4a3a12 50%,#0f0c06)}
.pp-h{flex:1;position:relative;transform-origin:50% 50%}.pp-h.l{clip-path:polygon(0 3%,8% 0,16% 3%,24% 0,32% 3%,40% 0,48% 3%,56% 0,64% 3%,72% 0,80% 3%,88% 0,100% 3%,100% 97%,88% 100%,80% 97%,72% 100%,64% 97%,56% 100%,48% 97%,40% 100%,32% 97%,24% 100%,16% 97%,8% 100%,0 97%)}.pp-h.r{clip-path:polygon(0 3%,12% 0,20% 3%,28% 0,36% 3%,44% 0,52% 3%,60% 0,68% 3%,76% 0,84% 3%,92% 0,100% 3%,100% 97%,92% 100%,84% 97%,76% 100%,68% 97%,60% 100%,52% 97%,44% 100%,36% 97%,28% 100%,20% 97%,12% 100%,0 97%)}
.pp-h.l{box-shadow:inset -6px 0 8px rgba(0,0,0,.35)}.pp-h.r{box-shadow:inset 6px 0 8px rgba(0,0,0,.35)}
.pp-tab{position:absolute;left:50%;top:50%;width:26%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,255,255,.92);color:#14161c;display:grid;place-items:center;font-weight:900;font-size:calc(var(--pw)*.05);box-shadow:0 3px 8px rgba(0,0,0,.5);z-index:3;animation:ppPulse 1.2s ease-in-out infinite}
@keyframes ppPulse{50%{transform:translate(-50%,-50%) scale(1.1)}}
.pp-ov{position:fixed;inset:0;z-index:8000;background:radial-gradient(circle at 50% 45%,#1d2330,#07090d 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;overflow:hidden;font-family:"Pretendard","Malgun Gothic",sans-serif}
.pp-ov[hidden]{display:none}
.pp-skip{position:absolute;right:14px;top:14px;border:0;border-radius:10px;padding:8px 14px;font-weight:900;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;z-index:5}
.pp-left{position:absolute;left:14px;top:16px;font-weight:800;font-size:13px;opacity:.85}
.pp-tip{font-size:13px;font-weight:700;opacity:.8;min-height:20px;text-align:center}
.pp-st{position:relative;width:var(--pw);aspect-ratio:9/16;display:grid;place-items:center;margin-bottom:30px}
.pp-st .pp{position:absolute;left:0;top:6%}
.pp-hint{position:absolute;left:0;right:0;top:calc(6% + 1%);height:9%;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;letter-spacing:.2em;color:rgba(255,255,255,.9);animation:ppSw 1.4s ease-in-out infinite}@keyframes ppSw{0%{transform:translateX(-18%);opacity:0}30%{opacity:1}100%{transform:translateX(18%);opacity:0}}
.pp-fl{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;pointer-events:none;z-index:6;opacity:0}
.pp-cards{position:absolute;inset:0}
.pp-cards .pk{--cw:var(--pw);position:absolute;left:0;top:0;width:100%;cursor:grab;touch-action:none;transform:translate(var(--sx,0),var(--sy,0)) rotate(var(--sr,0deg))}
.pp-cards .pk.back .pk-in>*{visibility:hidden}.pp-cards .pk.back .pk-in{background:#111 url(assets/img/raid-back.webp) center/cover}
.pp-glow{position:absolute;inset:-3%;border-radius:8%;pointer-events:none;opacity:calc(.12 + .88*var(--gi,0));filter:blur(calc(8px + 20px*var(--gi,0)));transform:scale(calc(1 + .1*var(--gi,0)));background:var(--gc,transparent);transition:background .12s}
.pp-glow.rb{background:conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f);animation:ppRb 1.6s linear infinite}@keyframes ppRb{to{filter:blur(calc(8px + 20px*var(--gi,0))) hue-rotate(360deg)}}
.pp-tag{position:absolute;left:50%;bottom:-34px;transform:translateX(-50%);white-space:nowrap;font-weight:900;font-size:14px;padding:3px 12px;border-radius:99px;background:rgba(12,14,18,.8)}
.pp-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;width:min(640px,94vw);max-height:62vh;overflow:auto;padding:6px}
.pp-sum>div{container-type:inline-size;text-align:center;font-size:11.5px;font-weight:800}.pp-sum .pk{--cw:100cqw;width:100%;cursor:default}
.pp-sum em{display:block;margin-top:4px;font-style:normal;color:#ffd24a}.pp-sum em.n{color:#5ef0a0}
.pp-fb{display:flex;gap:10px}.pp-fb button{border:0;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;cursor:pointer;color:#fff;background:#0d8bf2}.pp-fb button.g{background:#3a3f47}
@media(max-width:560px){.pp-sum{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}}
`;
  const packHtml = (k) => { const d = data(), ico = k.co && d.coIco && d.coIco[k.co];
    const face = '<div class="pp-ttl"><small>DOROSYNC</small>' + (k.r ? 'PILGRIM' : k.co ? 'CORP' : 'NIKKE') + '<br>CARD PACK</div><div class="pp-ring"><b>' + (k.r ? 'P' : 'N') + '</b></div>' + (ico ? '<img class="pp-co" alt="" src="' + ico + '">' : '') + '<div class="pp-n">5 CARDS<br>' + esc(k.nm) + '</div>';
    return '<div class="pp' + (k.r ? ' pil' : '') + '" style="--c1:' + k.c1 + ';--c2:' + k.c2 + '"><div class="pp-f"><div class="pp-top pp-skin"></div><div class="pp-body pp-skin">' + face + '</div></div><div class="pp-b"><div class="pp-h l pp-skin"></div><div class="pp-h r pp-skin"></div><div class="pp-tab">뜯기</div></div></div>'; };
  function shop() {
    const o = window.doroChips ? window.doroChips.get() : { d: 0, r: 0 }, bal = window.doroChips ? window.doroChips.total() : 0;
    root.innerHTML = '<div class="card"><div class="row-ctl sp"><h2 class="inline">카드팩</h2><div class="pp-bal"><span>' + chip('b', 20) + fmt(bal) + '</span><span>' + chip('r', 20) + fmt((o && o.r) || 0) + '</span></div></div>' +
      '<p class="muted sm">1팩 5장 · 1박스 30팩 · 풀코강을 넘는 카드는 골드칩으로 돌려받습니다.' + (PROD ? '' : ' (미리보기: 이 기기에서만 뽑는 연습용, 필그림 팩은 차감 없음)') + '</p>' +
      '<div class="pp-shop">' + KINDS.map((k) => '<div class="pp-it">' + packHtml(k) + '<b>' + esc(k.nm) + '</b><small>' + esc(k.sub) + '</small><div class="pp-buy"><button type="button" class="primary" data-buy="' + esc(k.k) + '" data-n="1">' + chip(k.r ? 'r' : 'b', 14) + fmt(k.price) + '</button><button type="button" class="ghost" data-buy="' + esc(k.k) + '" data-n="30">박스 ' + chip(k.r ? 'r' : 'b', 14) + fmt(k.box) + '</button></div></div>').join('') + '</div><p class="muted sm pp-msg" style="margin-top:12px"></p></div>' +
      '<div class="pp-ov" hidden></div>';
  }
  const DBc = () => { const m = {}; data().list.forEach((x) => { m[String(x.code)] = x; }); return m; };
  const ERR = { chips: '싱크칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' };
  async function onBuy(kind, n) {
    if (busy) return; busy = true; const msg = $('.pp-msg', root); msg.textContent = '';
    try { const packs = await buy(kind, n), DB = DBc(); Q = packs.map((p) => ({ k: KINDS.find((x) => x.k === kind), cards: p.map((c) => ({ x: DB[String(c[0])], dup: !!c[1], cnt: c[2] || 1 })).filter((c) => c.x) })); got = []; busy = false; nextPack(); }
    catch (e) { busy = false; msg.textContent = ERR[e && e.message] || '카드팩을 열지 못했습니다. (' + ((e && e.message) || e) + ')'; }
  }
  const tvOf = (c) => TS[c.x.t] || 1;
  function nextPack() {
    cur = Q.shift(); const ov = $('.pp-ov', root); if (!cur) { ov.hidden = true; shop(); return; }
    const best = Math.max.apply(null, cur.cards.map(tvOf)); cur.best = best; cur.fake = best >= 7 && Math.random() < 0.3 ? best - 1 - (Math.random() < 0.4 ? 1 : 0) : best; /* 페이크: 뜯을 때는 한두 단계 낮은 빛 */
    ov.hidden = false; ov.innerHTML = '<span class="pp-left">' + (Q.length ? '남은 팩 ' + Q.length : '') + '</span><button type="button" class="pp-skip" data-pp="skip">SKIP</button><div class="pp-st">' + packHtml(cur.k) + '<div class="pp-hint">→ 뜯기 →</div></div><div class="pp-tip">윗부분을 옆으로 끌어 뜯거나, 뒤집어서 가운데를 잡아 뜯으세요</div><div class="pp-fb"><button type="button" class="g" data-pp="flip">↻ 뒤집기</button></div>';
    tearInit(ov);
  }
  function burst(st, tv, big) { const col = glOf(tv), f = document.createElement('i'); f.className = 'pp-fl'; f.style.background = col === 'rb' ? 'conic-gradient(#ff5d8f,#ffb84d,#f6f05a,#5ef0a0,#5ab8ff,#b07aff,#ff5d8f)' : (col || '#fff'); st.appendChild(f);
    f.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.95, filter: 'blur(6px)' }, { transform: 'translate(-50%,-50%) scale(' + (big ? 70 : 38) + ')', opacity: 0, filter: 'blur(14px)' }], { duration: big ? 900 : 600, easing: 'ease-out' }).onfinish = () => f.remove(); }
  function tearInit(ov) {
    const st = $('.pp-st', ov), pk = $('.pp', st), top = $('.pp-top', pk), hl = $('.pp-h.l', pk), hr = $('.pp-h.r', pk); let dn = null, done = false, lastS = 0;
    const open = (back) => { if (done) return; done = true; sfx.rip(); const hi = $('.pp-hint', st); if (hi) hi.remove(); $('.pp-fb', ov).innerHTML = ''; burst(st, cur.fake, false); setTimeout(() => sfx.tier(cur.fake), 120);
      if (back) { hl.animate([{ transform: hl.style.transform || 'none' }, { transform: 'translate(-160%,10%) rotate(-28deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }); hr.animate([{ transform: hr.style.transform || 'none' }, { transform: 'translate(160%,10%) rotate(28deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }); $('.pp-tab', pk).remove(); }
      else { top.animate([{ transform: top.style.transform || 'none' }, { transform: 'translate(60%,-260%) rotate(50deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }); $('.pp-body', pk).animate([{ transform: 'none' }, { transform: 'translateY(130%)' }], { duration: 520, delay: 260, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }); }
      setTimeout(() => cardsInit(ov), back ? 380 : 620); };
    pk.addEventListener('pointerdown', (e) => { if (done) return; const r = pk.getBoundingClientRect(), back = pk.classList.contains('flip'); if (!back && (e.clientY - r.top) / r.height > 0.3) return; dn = { x: e.clientX, y: e.clientY, back, w: r.width }; try { pk.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    pk.addEventListener('pointermove', (e) => { if (!dn || done) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y;
      if (dn.back) { const p = Math.min(1, Math.hypot(dx, dy) / (dn.w * 0.55)); hl.style.transform = 'translateX(' + (-p * 14) + '%) rotate(' + (-p * 5) + 'deg)'; hr.style.transform = 'translateX(' + (p * 14) + '%) rotate(' + (p * 5) + 'deg)'; if (p - lastS > 0.12) { lastS = p; sfx.tear(); } if (p >= 1) open(true); }
      else { const p = Math.min(1, Math.abs(dx) / (dn.w * 0.85)); top.style.transformOrigin = dx > 0 ? '100% 100%' : '0 100%'; top.style.transform = 'rotate(' + (dx > 0 ? -1 : 1) * p * 16 + 'deg) translateY(' + (-p * 20) + '%)'; if (p - lastS > 0.1) { lastS = p; sfx.tear(); } if (p >= 0.95) open(false); } });
    const up = () => { if (!dn || done) { dn = null; return; } dn = null; lastS = 0; top.style.transform = ''; hl.style.transform = ''; hr.style.transform = ''; };
    pk.addEventListener('pointerup', up); pk.addEventListener('pointercancel', up);
  }
  function cardsInit(ov) {
    const st = $('.pp-st', ov); st.innerHTML = '<div class="pp-glow"></div><div class="pp-cards"></div><div class="pp-tag"></div>'; const host = $('.pp-cards', st), gl = $('.pp-glow', st), tag = $('.pp-tag', st), C = cur.cards;
    $('.pp-tip', ov).textContent = '끌면 천천히, 누르면 빠르게 넘깁니다';
    /* 맨 위는 카드 뒷면(표지). 넘기면 다음 카드가 드러남 */
    const els = C.map((c, i) => { const w = document.createElement('div'); w.innerHTML = window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })); const e = w.firstElementChild; e.style.zIndex = String(20 - i); e.style.setProperty('--sx', (i * 0.6) + '%'); e.style.setProperty('--sy', (i * 0.5) + '%'); return e; });
    const cover = document.createElement('div'); cover.innerHTML = window.doroRaid.card(Object.assign({}, C[0].x, { cnt: 1 })); const cv = cover.firstElementChild; cv.classList.add('back'); cv.classList.remove('foil', 'poly'); cv.style.zIndex = '30';
    els.slice().reverse().forEach((e) => host.appendChild(e)); host.appendChild(cv);
    let i = -1, top = cv, dn = null, fk = null; /* i: 지금 보이는 카드(-1 = 표지) */
    const setGlow = (tv, p) => { const col = glOf(tv); gl.classList.toggle('rb', col === 'rb'); if (col === 'rb') gl.style.removeProperty('--gc'); else gl.style.setProperty('--gc', col || 'rgba(255,255,255,.35)'); gl.style.setProperty('--gi', String(p)); };
    const plan = () => { const nx = C[i + 1]; if (!nx) { fk = null; return; } const tv = tvOf(nx), u = Math.random(); fk = tv >= 7 && u < 0.3 ? { a: tv - 1, b: tv, up: 1 } : tv <= 5 && u < 0.12 ? { a: 6 + (Math.random() < 0.3 ? 1 : 0), b: tv } : { a: tv, b: tv }; fk.said = 0; setGlow(fk.a, 0.08); };
    const show = (p) => { if (!fk) return; const late = p > 0.55, tv = late ? fk.b : fk.a; if (late && fk.up && !fk.said) { fk.said = 1; sfx.up(); burst(st, fk.b, false); } setGlow(tv, late && !fk.up && fk.a !== fk.b ? p * 0.4 : p); };
    const label = () => { const c = C[i]; if (!c) { tag.textContent = ''; return; } tag.innerHTML = esc(c.x.n) + ' · <span style="color:' + ((data().tierCol || {})[c.x.t] || '#fff') + '">' + esc(c.x.t) + '</span> ' + (c.dup ? '<span style="color:#ffd24a">→ 골드칩</span>' : c.cnt === 1 ? '<span style="color:#5ef0a0">NEW</span>' : c.cnt + '장'); };
    const leave = (dx, dy, fast) => { const el = top; if (!el) return; sfx.card(); const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; el.style.pointerEvents = 'none';
      el.animate([{ transform: getComputedStyle(el).transform }, { transform: 'translate(' + (ux * 900) + 'px,' + (uy * 900 - 60) + 'px) rotate(' + (ux * 40) + 'deg)' }], { duration: fast ? 240 : 380, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove();
      i++; top = els[i] || null; label(); if (!C[i]) { setTimeout(() => summary([cur]), 200); return; } if (C[i]) { const tv = tvOf(C[i]); setGlow(tv, tv >= 6 ? 1 : 0.15); sfx.tier(tv); if (tv >= 8) burst(st, tv, tv >= 9); got.push(C[i]); }
      if (i >= C.length - 1) { fk = null; $('.pp-tip', ov).textContent = '한 번 더 넘기면 결과를 봅니다'; return; } setTimeout(plan, 350); };
    host.addEventListener('pointerdown', (e) => { if (!top || !e.target.closest('.pk')) return; dn = { x: e.clientX, y: e.clientY, m: 0 }; try { host.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
    host.addEventListener('pointermove', (e) => { if (!dn || !top) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y, d = Math.hypot(dx, dy); dn.m = Math.max(dn.m, d); dn.dx = dx; dn.dy = dy; top.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.06) + 'deg)'; show(Math.min(1, d / 170)); });
    const up = () => { if (!dn || !top) { dn = null; return; } const d = dn; dn = null; if (d.m < 8) { show(1); leave(1, -0.15, true); } else if (d.m > 95) leave(d.dx || 1, d.dy || 0, false); else { top.style.transform = ''; if (fk) setGlow(fk.a, 0.08); } };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    plan();
  }
  function summary(packs) {
    const ov = $('.pp-ov', root), all = []; packs.forEach((p) => p.cards.forEach((c) => all.push(c))); all.sort((a, b) => tvOf(b) - tvOf(a));
    const gold = all.filter((c) => c.dup).length;
    ov.innerHTML = '<span class="pp-left">' + (Q.length ? '남은 팩 ' + Q.length : '') + '</span><div class="pp-tip">' + all.length + '장' + (gold ? ' · 골드칩 ' + gold + '개 반환' : '') + '</div><div class="pp-sum">' + all.map((c) => '<div>' + window.doroRaid.card(Object.assign({}, c.x, { cnt: c.cnt })) + (c.dup ? '<em>골드칩</em>' : c.cnt === 1 ? '<em class="n">NEW</em>' : '<em>' + c.cnt + '장</em>') + '</div>').join('') + '</div>' +
      '<div class="pp-fb">' + (Q.length ? '<button type="button" data-pp="next">다음 팩 (' + Q.length + ')</button><button type="button" class="g" data-pp="all">모두 열기</button>' : '<button type="button" data-pp="close">확인</button>') + '</div>';
  }
  function onClick(e) {
    const b = e.target.closest('[data-buy]'); if (b) { onBuy(b.dataset.buy, +b.dataset.n === 30 ? 30 : 1); return; }
    const p = e.target.closest('[data-pp]'); if (!p) return; const a = p.dataset.pp;
    if (a === 'flip') { const pk = $('.pp-st .pp', root); if (pk) { pk.classList.toggle('flip'); const h = $('.pp-hint', root); if (h) h.style.display = pk.classList.contains('flip') ? 'none' : ''; } }
    else if (a === 'skip') { if (cur) summary([cur]); }
    else if (a === 'next') nextPack();
    else if (a === 'all') { const rest = Q.splice(0); summary(rest); }
    else if (a === 'close') { cur = null; $('.pp-ov', root).hidden = true; shop(); }
  }
  window.doroPack = { mount(el) {
    if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; } if (!d.list.length || !window.doroRaid) { setTimeout(() => window.doroPack.mount(el), 400); return; }
    if (!document.getElementById('pack-css')) { const s = document.createElement('style'); s.id = 'pack-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (root !== el) { root = el; el.addEventListener('click', onClick); window.addEventListener('dorochips', () => { if (root && root.isConnected && !cur && $('.pp-ov', root) && $('.pp-ov', root).hidden && !busy) shop(); }); }
    if (!cur) shop();
  } };
})();
