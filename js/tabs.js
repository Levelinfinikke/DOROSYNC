/* DOROSYNC 도로록(풀탭) (관리자 전용 · 미공개)
   1장 = 골드칩 1개(싱크칩 10) · 탭 3줄을 뜯어 같은 무늬 3개가 나오면 당첨
   한 상자 100장: 당첨 수와 순서가 미리 정해져 있음(서버가 정함) · 당첨은 골드칩 · DORO칩 · S~SSS 카드뿐
   상자 구성: SSS 1 · SS 2 · S 5 · DORO칩 1 · 골드칩 20×1, 10×1, 3×4, 1×10 (나머지 75장은 꽝) · 칩 환수율 52% */
(() => {
  'use strict';
  const PROD = /github\.io$/.test(location.hostname), BOX = 100, K = 'dorosync-tabs2';
  const SPEC = [['S', 5], ['SS', 2], ['SSS', 1], ['r', 1], ['g20', 1], ['g10', 1], ['g3', 4], ['g1', 10]], TV = { S: 7, SS: 8, SSS: 9 }, DUP = { 7: 5, 8: 15, 9: 50 };
  const OUT = (() => { const o = []; SPEC.forEach((x) => { for (let i = 0; i < x[1]; i++) o.push(x[0]); }); while (o.length < BOX) o.push(''); return o; })();
  const mulb = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const order = (seed) => { const r = mulb(seed), a = OUT.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const $ = (s, r) => (r || document).querySelector(s), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR'), chip = (k, px) => (window.doroChipSvg ? window.doroChipSvg(k, px, false, true) : ''), data = () => window.doroRaidData();
  const cardQ = []; let inMc = 0, link = false, root = null, Q = [], cur = null, left = null, busy = false, auto = false, AC = null, pendG = 0, pendR = 0;
  /* ---------- 소리: 절취선이 '드르륵' 뜯기는 소리 = 아주 짧은 종이 파열음이 10ms 안팎 간격으로 이어짐 ---------- */
  const ac = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  let NB = null; const nbuf = (a) => { if (!NB) { NB = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } return NB; };
  const burst = (t, d, v, f, q, type) => { const a = ac(); if (!a) return; const s = a.createBufferSource(), g = a.createGain(), bq = a.createBiquadFilter(), t0 = a.currentTime + t; s.buffer = nbuf(a); bq.type = type || 'bandpass'; bq.frequency.value = f; bq.Q.value = q || 1; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.0006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); s.connect(bq).connect(g).connect(a.destination); s.start(t0, Math.random() * 0.4, d + 0.01); };
  const perf = (t, v) => { burst(t, 0.006, 0.5 * v, 2600 + Math.random() * 1500, 0.8); burst(t, 0.004, 0.22 * v, 6500 + Math.random() * 2500, 0.7, 'highpass'); burst(t + 0.001, 0.012, 0.1 * v, 900 + Math.random() * 300, 1.2); }; /* 구멍 하나가 터지는 소리: 2~4kHz가 중심, 위로 바스락, 아래로 종이 울림 */
  const motor = (t, d, v, f0, f1, lpf) => { const a = ac(); if (!a) return; const t0 = a.currentTime + t, g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf || 760; lp.Q.value = 0.7; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); lp.connect(g).connect(a.destination);
    [['sawtooth', 1, 1], ['square', 2, 0.5], ['sawtooth', 4, 0.35]].forEach((x) => { const o = a.createOscillator(), og = a.createGain(); o.type = x[0]; o.frequency.setValueAtTime(f0 * x[1], t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1 * x[1], t0 + d); og.gain.value = x[2]; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + d + 0.02); }); };
  const sweepN = (t, d, v, f0, f1) => { const a = ac(); if (!a) return; const s2 = a.createBufferSource(), g = a.createGain(), bq = a.createBiquadFilter(), t0 = a.currentTime + t; s2.buffer = nbuf(a); bq.type = 'bandpass'; bq.Q.value = 3; bq.frequency.setValueAtTime(f0, t0); bq.frequency.exponentialRampToValueAtTime(f1, t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); s2.connect(bq).connect(g).connect(a.destination); s2.start(t0, Math.random() * 0.2, d + 0.02); };
  const sfx = { perf: (v) => perf(0, v == null ? 1 : v),
    rip: (n, t0) => { let t = t0 || 0; for (let i = 0; i < n; i++) { perf(t, 0.75 + Math.random() * 0.35); t += 0.0085 + Math.random() * 0.0045; } burst(t0 || 0, t - (t0 || 0) + 0.02, 0.05, 4800, 0.5); burst(t, 0.03, 0.3, 1700, 0.9); return t; }, /* 드르륵 + 끝에서 '탁' 떨어짐 */
    /* 사출: 모터 맥동(140Hz, 높은 소리 없이) + 종이가 '슉' 튀어나오는 소리 */
    out: (t) => { motor(t, 0.055, 0.15, 140, 0, 1100); sweepN(t + 0.005, 0.045, 0.18, 2400, 5200); burst(t + 0.032, 0.02, 0.12, 320, 0.9, 'lowpass'); },
    outEnd: (t) => { motor(t, 0.12, 0.07, 140, 90, 1100); },
    btn: () => { burst(0, 0.009, 0.6, 2800, 2.5); burst(0.001, 0.02, 0.2, 500, 1, 'lowpass'); burst(0.065, 0.008, 0.45, 4200, 2.5); }, /* 스위치가 눌렸다 올라옴(딸-깍) */
    /* 카드 투입: 지폐 투입기처럼 — 물리는 '칙' → 모터가 '위이잉' 끌어당기며 종이 스치는 소리 → 끝에서 '탁' */
    cardIn: () => { const a = ac(); if (!a) return; burst(0, 0.02, 0.12, 3000, 1.5); const t0 = a.currentTime + 0.03, d = 0.46, g = a.createGain(), lp = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1500; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.042, t0 + 0.04); g.gain.setValueAtTime(0.042, t0 + d - 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); lp.connect(g).connect(a.destination); lfo.frequency.value = 31; lg.gain.value = 7; lfo.connect(lg); lfo.start(t0); lfo.stop(t0 + d + 0.02);
      [[1, 1, 'sawtooth'], [2, 0.45, 'square'], [3.01, 0.3, 'sawtooth']].forEach((x) => { const o = a.createOscillator(), og = a.createGain(); o.type = x[2]; o.frequency.setValueAtTime(150 * x[0], t0); o.frequency.linearRampToValueAtTime(205 * x[0], t0 + 0.09); o.frequency.setValueAtTime(205 * x[0], t0 + d - 0.1); o.frequency.linearRampToValueAtTime(120 * x[0], t0 + d); lg.connect(o.frequency); og.gain.value = x[1]; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + d + 0.02); });
      sweepN(0.05, 0.4, 0.035, 3600, 2600); burst(0.5, 0.012, 0.15, 2400, 2); burst(0.5, 0.04, 0.15, 380, 0.8, 'lowpass'); /* 전체 음량 절반 */ },
    coin: () => { [1900, 2850].forEach((f, i) => { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.05; o.frequency.value = f; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.27); }); },
    tidy: () => { for (let i = 0; i < 5; i++) burst(i * 0.05, 0.03, 0.14, 2200, 0.6); burst(0.3, 0.05, 0.35, 500, 0.8, 'lowpass'); }, flip: () => burst(0, 0.07, 0.16, 3500, 0.6),
    win: (lv) => { const a = ac(); if (!a) return; [0, 4, 7, 12, 16, 19].slice(0, 2 + lv * 2).forEach((st, i) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.075; o.type = 'triangle'; o.frequency.value = 660 * Math.pow(2, st / 12); g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.42); }); } };
  /* ---------- 뽑기 ---------- */
  const leftOf = (ord, i0) => { const L = { n: BOX - i0 }; for (let q = i0; q < BOX; q++) { const k = OUT[ord[q]]; if (k) L[k] = (L[k] || 0) + 1; } return L; };
  function local(n, reset) { /* 미리보기 전용: 이 기기에 상자 상태를 둠 */
    let st = null; try { st = reset ? null : JSON.parse(localStorage.getItem(K)); } catch (e) { /* 무시 */ } if (!st || !st.s || st.i >= BOX) st = { s: (Math.random() * 4294967296) >>> 0, i: 0 };
    const ord = order(st.s); n = Math.min(n, BOX - st.i); if (!n) { if (reset) { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) { /* 무시 */ } } return { tix: [], left: leftOf(ord, st.i) }; } if (!window.doroChips.spend(10 * n)) throw new Error('chips');
    const L = data().list, tix = []; let g = 0, r = 0;
    for (let j = 0; j < n; j++) { const idx = ord[st.i + j], k = OUT[idx]; if (!k) tix.push(['']); else if (k === 'r') { r++; tix.push(['r']); } else if (k[0] === 'g') { g += +k.slice(1); tix.push([k]); }
      else { const pool = L.filter((x) => x.t === k), rr = mulb(st.s ^ Math.imul(idx + 1, 2654435761)), x = pool[Math.floor(rr() * pool.length)] || L[0], dup = window.doroDex.count(x.n) >= 11; if (dup) g += DUP[TV[k]]; else window.doroDex.add(x.n, 1); tix.push([k, x.code, dup ? 1 : 0, dup ? 11 : window.doroDex.count(x.n)]); } }
    st.i += n; try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) { /* 무시 */ } const add = {}; if (g) add.g = g; if (r) add.r = r; if (g || r) window.doroChips.add(add, 'cap');
    return { tix, left: leftOf(ord, st.i) };
  }
  async function fetchTix(n, reset) {
    if (!PROD || !(window.doroAccount && window.doroAccount.user)) return local(n, reset); /* 로그인하지 않았으면 이 기기에서 뽑음 */
    const j = await window.doroRaid.api('tabs', reset ? { n: 0, reset: 1 } : { n }); const a = window.doroAccount; if (a && a.doc && j.dex) a.doc.dex = j.dex; if (n && window.doroChips.sync) window.doroChips.sync(j.chips); return { tix: j.tix || [], left: j.left };
  }
  /* ---------- 표 한 장 ---------- */
  const CO = { E: '엘리시온', M: '미실리스', T: '테트라', A: '어브노멀', P: '필그림' };
  const symHtml = (s) => { const d = data(); if (CO[s]) return '<i class="tb-s co"><img alt="" src="' + ((d.coIco || {})[CO[s]] || '') + '"></i>'; if ('bsgr'.indexOf(s) >= 0 && s.length === 1) return '<i class="tb-s ch">' + chip(s, 40) + '</i>'; const x = d.list.find((y) => String(y.code) === s.slice(2)); return '<i class="tb-s pt" style="background-image:url(' + (x ? x.img : '') + ')"></i>'; };
  function compose(t) { /* 당첨 줄 하나 + 꽝 줄(가끔 두 개만 맞는 아슬아슬한 줄) */
    const d = data(), hi = d.list.filter((x) => TV[x.t]), base = ['E', 'M', 'T', 'A', 'P', 'b', 's', 'g', 'r'], rp = () => 'n:' + hi[Math.floor(Math.random() * hi.length)].code, any = () => (Math.random() < 0.3 ? rp() : base[Math.floor(Math.random() * base.length)]);
    const k = t[0], ws = !k ? '' : k === 'r' ? 'r' : k === 'g1' ? 'b' : k === 'g3' ? 's' : k === 'g10' ? 'g' : k === 'g20' ? 'EMTA'[Math.floor(Math.random() * 4)] : k === 'g50' ? 'P' : 'n:' + t[1];
    const lose = () => { const a = any(); let b = Math.random() < 0.4 ? a : any(), c = any(); while (c === a && b === a) c = any(); const r = [a, b, c]; for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), z = r[i]; r[i] = r[j]; r[j] = z; } return r; };
    const rows = [lose(), lose(), lose()], wi = ws ? Math.floor(Math.random() * 3) : -1; if (ws) rows[wi] = [ws, ws, ws]; return { t, rows, wi, open: [0, 0, 0] };
  }
  const prizeTxt = (t) => { const k = t[0]; if (!k) return '꽝'; if (k === 'r') return chip('r', 20) + ' DORO칩 +1'; if (k[0] === 'g') return chip('g', 20) + ' 골드칩 +' + k.slice(1); const x = data().list.find((y) => String(y.code) === String(t[1])); return '<b style="color:' + ((data().tierCol || {})[k] || '#fff') + '">' + k + '</b> ' + esc(x ? x.n : '') + (t[2] ? ' → ' + chip('g', 18) + ' +' + DUP[TV[k]] : t[3] === 1 ? ' NEW' : ''); };
  const PAPER = (() => { let rows = ''; for (let y = 0; y < 6; y++) { let t = ''; while (t.length < 46) t += 'DO' + 'RO'.repeat(1 + Math.floor(Math.random() * 5)) + 'C'; rows += '<text x="' + (-Math.floor(Math.random() * 30)) + '" y="' + (13 + y * 14) + '">' + t + '</text>'; }
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="84"><g font-family="Arial Black,Arial,sans-serif" font-size="12" font-style="italic" fill="#7a1418" fill-opacity=".13">' + rows + '</g></svg>') + '")'; })(); /* DOROROC… 길이가 제각각인 글자를 한 번 정해 모든 덮개에 */
  const PAPER_URI = PAPER.slice(5, -2); let cvN = 0;
  const cover = (p) => { /* 덮개 모양: 뜯긴 쪽이 휘어 올라가 오른쪽으로 젖혀짐(말리지 않음). 앞면 a · 안쪽 얇은 테두리 c · 뒷면 b */
    const W = 240, H = 76, R = 44 - 34 * p, TM = 1.15 + 1.85 * Math.pow(p, 1.4), xf = p * W, xb = TM > Math.PI / 2 ? xf - R * Math.PI / 2 : -1, pt = (x, top, ins) => { let X = x, z = 0; if (x < xf) { const s2 = xf - x, th = Math.min(s2 / R, TM), e = Math.max(0, s2 - R * TM); X = xf - R * Math.sin(th) - Math.cos(TM) * e; z = R * (1 - Math.cos(th)) + Math.sin(TM) * e; } /* 처음엔 들려 올라가고, 당길수록 더 젖혀져 끝까지 당기면 반대편 끝 너머로 완전히 넘어감(오른쪽 변은 붙어 있음) */
      const tp = x < 20 ? (20 - x) / 20 * 17 : 0, y = top ? ins + tp : H - ins - tp, k = 1 + z / 420; return X.toFixed(1) + ' ' + (H / 2 + (y - H / 2) * k - z * 0.2).toFixed(1); };
    const poly = (x0, x1, ins) => { if (x1 - x0 < 0.5) return ''; const T = [], B = [], n = Math.max(2, Math.ceil((x1 - x0) / 5)); for (let i = 0; i <= n; i++) { const x = x1 - (x1 - x0) * i / n; T.push(pt(x, 1, ins)); B.push(pt(x, 0, ins)); } return 'M' + T.join('L') + 'L' + B.reverse().join('L') + 'Z'; };
    return { a: poly(Math.max(0, xb), W, 0), c: p < 0.02 ? poly(6, W - 5, 5) : '', b: xb > 0 ? poly(0, xb, 0) : '' }; };
  const coverSvg = (p) => { const id = 'tbp' + (++cvN), d = cover(p); return '<svg class="tb-cv" viewBox="0 0 240 76" preserveAspectRatio="none"><defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="260" height="84"><rect width="260" height="84" fill="#efe6cd"/><image href="' + PAPER_URI + '" width="260" height="84"/></pattern></defs><path class="a" fill="url(#' + id + ')" d="' + d.a + '"/><path class="c" d="' + d.c + '"/><path class="b" d="' + d.b + '"/><text x="130" y="44" text-anchor="middle">PULL ▶▶▶</text></svg>'; };
  const setP = (row, p) => { row.dataset.p = String(p); const d = cover(p), sv = $('.tb-cv', row); $('.a', sv).setAttribute('d', d.a); $('.b', sv).setAttribute('d', d.b); $('.c', sv).setAttribute('d', d.c); };
  const CSS = `/* 뿌리 클래스는 .tbx: 예전 이름 .tb는 가챠 머신 컷인의 글자 층(.tb)과 겹쳐 검은 판이 생겼음 */
.tbx{display:grid;grid-template-columns:290px 1fr;border-radius:16px;overflow:hidden;background:#141018;color:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;border:1px solid #3a2a2a;min-height:620px}
.tb-mc{position:relative;z-index:1;background:linear-gradient(180deg,#7a1418,#4a0c10);padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:inset -6px 0 12px rgba(0,0,0,.35)}
.tb-ttl{font-family:"Arial Black",Arial,sans-serif;font-style:italic;font-size:30px;line-height:.95;text-align:center;color:#ffe58a;text-shadow:0 3px 0 #5a2a00,0 0 16px rgba(255,200,80,.6);border:3px solid #ffd24a;border-radius:12px;padding:8px 4px;background:#2a0608}
.tb-ttl small{display:block;font-size:.4em;letter-spacing:.3em;color:#fff;font-style:normal;margin-top:4px}
.tb-win{background:#0d0d10;border:3px solid #1c1c22;border-radius:10px;padding:8px;font-size:12px;line-height:1.7}.tb-win b{color:#ffd24a}.tb-win .n{font:900 22px "Arial Black",Arial,sans-serif;color:#5ef0a0}
.tb-bal{display:flex;justify-content:center;gap:16px;background:#1a0608;border-radius:10px;padding:8px 10px;font-weight:800}.tb-bal span{display:inline-flex;align-items:center;gap:5px}
.tb-btn{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tb-btn button{border:0;border-radius:12px;padding:12px 2px 9px;font:inherit;font-weight:900;font-size:15px;color:#14161c;cursor:pointer;background:linear-gradient(180deg,#fff3b0,#ffb21c 60%,#d98600);box-shadow:0 5px 0 #6a3d00;display:flex;flex-direction:column;align-items:center;gap:2px}
.tb-btn button:active{transform:translateY(4px);box-shadow:0 1px 0 #6a3d00}.tb-btn button:disabled{filter:grayscale(.7);opacity:.6;cursor:default}.tb-btn small{display:inline-flex;align-items:center;gap:2px;font-size:11px}
.tb-slot{height:16px;border-radius:5px;background:#000;box-shadow:inset 0 3px 5px #000,0 1px 0 rgba(255,255,255,.2);margin:6px 18px 0}.tb-msg{min-height:16px;font-size:12px;color:#ffd0c0;font-weight:700;text-align:center}
.tb-st{position:relative;z-index:2;background:radial-gradient(ellipse at 50% 40%,#3a2a22,#17110f 75%);overflow:visible;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px;user-select:none;-webkit-user-select:none}
.tb-pile{position:relative;width:260px;height:340px}
.tb-tk{position:absolute;left:0;top:0;width:260px;border-radius:5px;background:#f6efdc;color:#7a1418;box-shadow:0 2px 0 #cfc5a8,0 6px 14px rgba(0,0,0,.5);padding:8px 10px 9px;font-family:"Arial Black",Arial,sans-serif}
.tb-tk.bk{height:330px;background:repeating-linear-gradient(45deg,#b3161c 0 9px,#9a1016 9px 18px);border:5px solid #f6efdc}
.tb-hd{display:flex;justify-content:space-between;align-items:center;font-style:italic;font-size:17px;border-bottom:2px solid #7a1418;padding-bottom:4px;margin-bottom:7px}.tb-hd small{font-style:normal;font-size:10px;display:inline-flex;align-items:center;gap:2px}
.tb-row{position:relative;height:76px;margin-bottom:7px;border-radius:4px;background:#fff;box-shadow:inset 0 0 0 1.5px #7a1418;display:flex;align-items:center;justify-content:space-around;padding:0 8px;overflow:hidden}
.tb-row.win{background:#fff3b0;box-shadow:inset 0 0 0 3px #f59e0b,0 0 16px rgba(255,190,60,.9);overflow:visible;z-index:2}.tb-row.win .tb-s{animation:tbHop .5s cubic-bezier(.2,1.8,.4,1)}@keyframes tbHop{40%{transform:translateY(-10px) scale(1.15)}}
.tb-s{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#22252c center 12%/cover;box-shadow:inset 0 0 0 2px #7a1418,0 1px 2px rgba(0,0,0,.4);overflow:hidden;flex:none}.tb-s.co img{width:62%;height:62%;object-fit:contain}.tb-s.ch{background:#fff8e0}.tb-s.ch svg{width:82%;height:82%}
.tb-row{overflow:visible;background:none!important;box-shadow:none!important}.tb-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible}.tb-bg path{fill:#fff;stroke:#7a1418;stroke-width:2;stroke-dasharray:1.5 4;stroke-linecap:round}.tb-row.win .tb-bg path{fill:#fff3b0}.tb-row .tb-s{position:relative;z-index:1}.tb-row.win{filter:drop-shadow(0 0 8px rgba(255,190,60,.9))}
svg.tb-cv{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:3;cursor:grab;touch-action:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}
.tb-cv .a{stroke:#7a1418;stroke-width:3;stroke-linejoin:round}.tb-cv .b{fill:#ddd2b4;stroke:#7a1418;stroke-width:3;stroke-linejoin:round}.tb-cv .c{fill:none;stroke:#7a1418;stroke-width:1;opacity:.75;pointer-events:none}
.tb-cv text{font:900 15px "Arial Black",Arial,sans-serif;letter-spacing:.2em;fill:#7a1418;pointer-events:none}.tb-row.pull .tb-cv text,.tb-row.done .tb-cv text{display:none}
.tb-row.pull svg.tb-cv,.tb-row.done svg.tb-cv{filter:drop-shadow(-3px 4px 4px rgba(0,0,0,.4))}.tb-row.done svg.tb-cv{pointer-events:none}
.tb-row.win{z-index:1}
.tb-ft{font:800 10.5px "Pretendard",sans-serif;text-align:center;color:#7a1418;opacity:.8}
.tb-res{min-height:30px;font-weight:900;font-size:17px;display:flex;align-items:center;gap:6px}.tb-res.w{color:#ffe58a;text-shadow:0 0 14px rgba(255,200,80,.8);animation:tbRes .4s cubic-bezier(.2,1.7,.4,1)}@keyframes tbRes{from{transform:scale(.4);opacity:0}}
.tb-ctl{display:flex;gap:8px;align-items:center;min-height:38px}.tb-ctl button{border:0;border-radius:10px;padding:9px 16px;font:inherit;font-weight:900;font-size:13.5px;color:#fff;background:#3a3f47;cursor:pointer}.tb-ctl button.p{background:#0d8bf2}.tb-ctl span{font-weight:800;font-size:13px;opacity:.85}
.tb-card{position:absolute;left:50%;top:44%;z-index:5;width:150px;transform:translate(-50%,-50%);pointer-events:none;animation:tbCard 1.6s cubic-bezier(.2,1.3,.4,1) forwards;filter:drop-shadow(0 0 24px var(--gc,#fff))}.tb-card .pk{--cw:150px;width:150px;position:relative}
@keyframes tbCard{0%{transform:translate(-50%,-50%) scale(.2) rotate(-20deg);opacity:0}25%,80%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-90%) scale(.9);opacity:0}}
.tb-view{position:relative;height:74px;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.02)),#0a0a0d;box-shadow:inset 0 0 0 3px #2a0608,inset 0 6px 10px rgba(0,0,0,.8);display:flex;align-items:flex-end;gap:5px;padding:6px 8px;overflow:hidden}
.tb-view i{flex:1;height:calc(var(--h)*1%);min-height:0;border-radius:2px 2px 0 0;background:repeating-linear-gradient(0deg,#f6efdc 0 1.6px,#b9ae90 1.6px 2.4px);box-shadow:0 0 0 1px rgba(0,0,0,.4);transition:height .4s}.tb-view:after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.14) 48%,transparent 56%);pointer-events:none}
.tb-rs{float:right;border:0;border-radius:8px;padding:5px 9px;font:inherit;font-size:11.5px;font-weight:800;color:#ffd9c9;background:#3a0a0e;cursor:pointer;margin-left:6px}.tb-opt{display:flex;gap:6px}.tb-opt button{flex:1;border:0;border-radius:9px;padding:7px 4px;font:inherit;font-size:12px;font-weight:800;color:#ffd9c9;background:#2a0608;cursor:pointer}.tb-opt button.on{background:#ffb21c;color:#14161c}
.tb-odds{font-size:11.5px;line-height:1.75;background:#0d0d10;border-radius:10px;padding:8px 10px}.tb-odds[hidden]{display:none}.tb-odds table{width:100%;border-collapse:collapse}.tb-odds td{padding:0 2px}.tb-odds td:last-child{text-align:right;color:#ffd24a;font-weight:800}
.tb-out{position:absolute;height:300px;clip-path:inset(0 -120px -200px -120px);perspective:620px;perspective-origin:50% 0;z-index:8;pointer-events:none}.tb-out.in i{border:0;background:none;box-shadow:none;aspect-ratio:auto}.tb-out.in .pk{--cw:100cqw;width:100%;position:relative;display:block}.tb-out.in{container-type:inline-size}
.tb-cin{position:relative;z-index:7;height:14px;width:132px;margin:2px auto 0;border-radius:5px;background:#000;box-shadow:inset 0 3px 5px #000,0 1px 0 rgba(255,255,255,.2)}.tb-cl{font:800 10px "Arial Black",Arial,sans-serif;letter-spacing:.2em;text-align:center;color:#ffd9c9;opacity:.7;margin-top:6px}
.tb-out i{display:block;width:100%;aspect-ratio:260/330;transform-origin:50% 0;border-radius:4px;border:5px solid #f6efdc;box-sizing:border-box;background:repeating-linear-gradient(45deg,#b3161c 0 9px,#9a1016 9px 18px);box-shadow:0 0 0 1px rgba(0,0,0,.35)}
.tb-slot{position:relative;z-index:7}
.tb-pz{position:absolute;z-index:4;transform:translate(-50%,-50%) rotate(var(--rot,0deg));cursor:grab;touch-action:none;filter:drop-shadow(0 6px 8px rgba(0,0,0,.55))}.tb-pz:hover{filter:drop-shadow(0 6px 8px rgba(0,0,0,.55)) brightness(1.15)}
.tb-pz.nk{width:96px;filter:drop-shadow(0 0 10px var(--gc,#fff)) drop-shadow(0 6px 8px rgba(0,0,0,.55))}.tb-pz.nk .pk{--cw:96px;width:96px;position:relative;pointer-events:none;display:block}.tb-pz.nk em{right:-8px;bottom:8px;transform:none}
.tb-pz.g,.tb-pz.r{width:60px;height:60px}.tb-pz.g i,.tb-pz.r i{position:absolute;left:calc(8px + var(--i)*5px);top:calc(14px - var(--i)*6px);display:block}.tb-pz i svg{display:block}
.tb-pz em{position:absolute;right:-10px;bottom:-8px;font:900 13px "Arial Black",Arial,sans-serif;font-style:normal;color:#14161c;background:#ffd24a;border-radius:99px;padding:1px 7px;display:inline-flex;align-items:center;gap:2px;transform:rotate(calc(var(--rot,0deg)*-1))}
.tb-empty{opacity:.6;font-weight:700;font-size:14px;text-align:center;line-height:1.7}
@media(max-width:760px){.tbx{grid-template-columns:1fr}.tb-st{order:-1;min-height:480px}}
`;
  const tkHtml = (T, z, ps) => '<div class="tb-tk" style="z-index:' + z + '"><div class="tb-hd"><span>DOROROC</span><small>' + chip('b', 13) + '10</small></div>' + T.rows.map((r, i) => '<div class="tb-row' + (ps && ps[i] ? ' pull' : '') + '" data-i="' + i + '"><svg class="tb-bg" viewBox="0 0 240 76" preserveAspectRatio="none" aria-hidden="true"><path d="M1 17.5L20.5 1H239V75H20.5L1 58.5Z"/></svg>' + r.map(symHtml).join('') + coverSvg(ps ? ps[i] : 0) + '</div>').join('') + '<div class="tb-ft">같은 무늬 3개 = 당첨</div></div>';
  function ui() {
    if (!root) return; const o = window.doroChips.get();
    $('.tb-bal', root).innerHTML = '<span>' + chip('b', 18) + fmt(Math.max(0, window.doroChips.total() - pendG * 10)) + '</span><span>' + chip('r', 18) + fmt(Math.max(0, ((o && o.r) || 0) - pendR)) + '</span>';
    root.querySelectorAll('.tb-btn button').forEach((b) => { b.disabled = busy || !!cur || Q.length > 0; });
    const L = left; $('.tb-win', root).innerHTML = L ? '<button type="button" class="tb-rs" data-tb="reset">상자 교체</button>이 상자에 남은 표 <span class="n">' + fmt(L.n) + '</span> / ' + fmt(BOX) + '<br><b>SSS</b> ' + (L.SSS || 0) + ' · <b>SS</b> ' + (L.SS || 0) + ' · <b>S</b> ' + (L.S || 0) + '<br>' + chip('r', 14) + ' ' + (L.r || 0) + ' · ' + chip('g', 14) + ' 20×' + (L.g20 || 0) + ' 10×' + (L.g10 || 0) + ' 3×' + (L.g3 || 0) : '상자를 확인하는 중…';
    { const v = $('.tb-view', root), n = L ? L.n + inMc : 0; if (v) v.innerHTML = [0, 1, 2, 3, 4].map((q) => '<i style="--h:' + Math.max(0, Math.min(100, (n - q * BOX / 5) / (BOX / 5) * 100)).toFixed(0) + '"></i>').join(''); } /* 200장씩 다섯 더미: 남은 만큼만 쌓여 있음 */
    root.querySelectorAll('.tb-opt [data-tb=link]').forEach((b) => b.classList.toggle('on', link));
    const ct = $('.tb-ctl', root); if (ct) ct.innerHTML = (cur || Q.length ? '<span>남은 표 ' + (Q.length + (cur ? 1 : 0)) + '장</span><button type="button" data-tb="all">모두 뜯기</button>' : '') + (root.querySelector('.tb-pz') ? '<button type="button" class="p" data-tb="take">모두 회수</button>' : '');
  }
  /* 자판기에서 표가 빠르게 튀어나와 쌓임 → 가지런히 모음 → 맨 위부터 뜯기 */
  async function buyN(n) {
    if (busy || cur || Q.length) return; sfx.btn(); const msg = $('.tb-msg', root); msg.textContent = ''; busy = true; ui(); let res;
    try { const bal = root.querySelectorAll('.tb-bal span')[0], slot = $('.tb-slot', root); res = await fetchTix(n); left = res.left; sfx.coin(); if (window.doroChipFly && res.tix.length) window.doroChipFly(bal, slot, res.tix.length * 10, { size: 18 }); }
    catch (e) { busy = false; ui(); msg.textContent = ({ chips: '싱크칩이 부족합니다.', login: '로그인이 필요합니다.', closed: '아직 공개 전입니다. (관리자 전용)' })[e && e.message] || '서버와 연결하지 못했습니다. (' + ((e && e.message) || e) + ')'; return; }
    if (!res.tix.length) { busy = false; ui(); return; }
    res.tix.forEach((t) => { if (t[0] === 'r') pendR++; else if (t[0] && t[0][0] === 'g') pendG += +t[0].slice(1); else if (t[2]) pendG += DUP[TV[t[0]]]; }); ui();
    Q = res.tix.map(compose); inMc = Q.length; ui(); Q.forEach((T0, i0) => setTimeout(() => { inMc = Math.max(0, inMc - 1); ui(); }, 350 + i0 * (Q.length > 5 ? 70 : 110))); const pile = $('.tb-pile', root), e0 = $('.tb-empty', root); if (e0) e0.remove(); pile.innerHTML = ''; const sl = $('.tb-slot', root).getBoundingClientRect(), pr = pile.getBoundingClientRect(), N = Q.length, gap = N > 5 ? 70 : 110;
    const mc = $('.tb-mc', root), mr = mc.getBoundingClientRect(); sfx.outEnd((350 + N * gap) / 1000);
    Q.forEach((T, i) => { const t0 = 350 + i * gap; /* ① 사출구에서 정면으로 쑥 나와 사라짐 */
      const o = document.createElement('div'); o.className = 'tb-out'; o.style.left = (sl.left - mr.left + 4) + 'px'; o.style.top = (sl.top + sl.height / 2 - mr.top) + 'px'; o.style.width = (sl.width - 8) + 'px'; o.innerHTML = '<i></i>'; mc.appendChild(o); /* 사출구 너비 그대로, 사출구 선에서 잘려 보임 */
      o.firstChild.animate([{ transform: 'rotateX(58deg) translateY(-100%)', opacity: 1 }, { transform: 'rotateX(58deg) translateY(-4%)', opacity: 1, offset: 0.6, easing: 'ease-in' }, { transform: 'rotateX(58deg) translateY(-4%)', opacity: 1, offset: 0.72, easing: 'ease-in' }, { transform: 'rotateX(64deg) translateY(55%)', opacity: 0 }], { duration: 420, delay: t0, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' }).onfinish = () => o.remove(); sfx.out(t0 / 1000); /* 눕혀진 표가 앞으로 미끄러져 나옴: 가까운 변이 더 길게 보임 */
      /* ② 아래에서 테이블 가운데로 던져짐 */
      const d = document.createElement('div'); d.className = 'tb-tk bk'; const rx = (Math.random() * 2 - 1) * 46, ry = (Math.random() * 2 - 1) * 30, rr = (Math.random() * 2 - 1) * 24; d.style.zIndex = String(i + 1); d.dataset.r = rx + ',' + ry + ',' + rr; pile.appendChild(d);
      d.animate([{ transform: 'translate(' + ((Math.random() * 2 - 1) * 60) + 'px,' + (innerHeight - pr.top + 40) + 'px) rotate(' + (rr * 4) + 'deg) scale(1.25)' }, { transform: 'translate(' + rx + 'px,' + ry + 'px) rotate(' + rr + 'deg)' }], { duration: 300, delay: t0 + 380, easing: 'cubic-bezier(.15,.8,.3,1)', fill: 'both' }); setTimeout(() => burst(0, 0.03, 0.22, 800, 0.8, 'lowpass'), t0 + 670); });
    setTimeout(() => { if (N > 1) sfx.tidy(); [...pile.querySelectorAll('.tb-tk.bk')].forEach((d, i) => { const r = d.dataset.r.split(','); d.animate([{ transform: 'translate(' + r[0] + 'px,' + r[1] + 'px) rotate(' + r[2] + 'deg)' }, { transform: 'translate(0,' + (-i * 1.5) + 'px) rotate(0deg)' }], { duration: 320, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' }); }); }, 350 + N * gap + 730); /* 다 던진 뒤 탁탁 가지런히 */
    setTimeout(() => { busy = false; next(); }, 350 + N * gap + 730 + (N > 1 ? 420 : 60));
  }
  function next() {
    const pile = $('.tb-pile', root), res = $('.tb-res', root); res.className = 'tb-res'; res.innerHTML = ''; cur = Q.shift() || null;
    if (!cur) { pile.innerHTML = ''; auto = false; ui(); return; }
    const backs = [...pile.querySelectorAll('.tb-tk.bk')]; if (backs.length) backs[backs.length - 1].remove(); pile.querySelectorAll('.tb-tk:not(.bk)').forEach((e) => e.remove());
    pile.insertAdjacentHTML('beforeend', tkHtml(cur, 50)); const tk = pile.lastElementChild; tk.animate([{ transform: 'rotateY(90deg) scale(.96)' }, { transform: 'none' }], { duration: auto ? 70 : 170 }); sfx.flip(); ui(); bind(tk);
    if (auto) autoRip(tk);
  }
  function openRow(row, i, fast) { if (row.classList.contains('done')) return; row.classList.add('done'); cur.open[i] = 1; if (cur.open.every(Boolean)) setTimeout(finish, fast ? 120 : 260); }
  function quick(row, i, t0) { /* 눌러서 한 번에: 덮개가 0.1초쯤에 드르륵 뜯김 */
    if (row.classList.contains('done') || row.dataset.q) return; row.dataset.q = '1'; row.classList.add('pull'); const p0 = +row.dataset.p || 0, D = Math.max(30, (auto ? 75 : 120) * (1 - p0)), s0 = performance.now() + (t0 || 0) * 1000; sfx.rip(Math.max(2, Math.round(11 * (1 - p0))), t0 || 0);
    const f = (now) => { const p = p0 + (1 - p0) * Math.max(0, Math.min(1, (now - s0) / D)); setP(row, p); if (p < 1) requestAnimationFrame(f); else openRow(row, i, true); }; requestAnimationFrame(f);
  }
  function bind(tk) {
    tk.querySelectorAll('.tb-row').forEach((row) => { const i = +row.dataset.i, cv = $('.tb-cv', row); let dn = null;
      cv.addEventListener('pointerdown', (e) => { if (auto || row.classList.contains('done')) return; dn = { x: e.clientX, w: row.getBoundingClientRect().width, last: 0 }; row.classList.add('pull'); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } });
      cv.addEventListener('pointermove', (e) => { if (!dn) return; const dx = Math.max(0, e.clientX - dn.x), p = Math.min(1, dx / (dn.w * 0.92)); setP(row, p);
        if (link) tk.querySelectorAll('.tb-row:not(.done)').forEach((r2) => { if (r2 === row) return; r2.classList.add('pull'); setP(r2, p); if (p >= 0.97) { setP(r2, 1); openRow(r2, +r2.dataset.i, false); } }); /* 동시 뜯기 */
        const st = Math.floor(dx / 7); if (st > dn.last) { for (let q = dn.last; q < st && q < dn.last + 4; q++) perf((q - dn.last) * 0.006, 0.8 + Math.random() * 0.3); dn.last = st; } /* 구멍 하나(7px)를 지날 때마다 '드륵' */ if (p >= 0.97) { dn = null; setP(row, 1); burst(0, 0.03, 0.3, 1700, 0.9); openRow(row, i, false); } });
      const up = () => { if (!dn) return; dn = null; quick(row, i, 0); if (link) tk.querySelectorAll('.tb-row:not(.done)').forEach((r2) => { if (r2 !== row) quick(r2, +r2.dataset.i, 0.02); }); }; /* 놓으면 남은 부분이 마저 뜯김 */
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); });
  }
  function autoRip(tk) { tk.querySelectorAll('.tb-row').forEach((row, i) => setTimeout(() => quick(row, +row.dataset.i, 0), 20 + i * 55)); } /* 모두 뜯기: 세 줄을 빠르게 잇달아 */
  /* 당첨품(칩·카드)을 테이블에 던져 둠: 누르면 잔고로 빨려 들어가고, 끌어서 옮길 수 있음 */
  function toss(kind, o, fromEl) {
    const st = $('.tb-st', root), sr = st.getBoundingClientRect(), fr = (fromEl || st).getBoundingClientRect(), e = document.createElement('div'); e.className = 'tb-pz ' + (kind === 'card' ? 'nk' : kind); e.pz = o;
    if (kind === 'card') { e.style.setProperty('--gc', (data().tierCol || {})[o.k] || '#fff'); e.innerHTML = window.doroRaid.card(Object.assign({}, o.x, { cnt: o.cnt || 1 })) + (o.dup ? '<em>' + chip('g', 14) + '+' + o.gold + '</em>' : ''); }
    else { const n = Math.min(6, kind === 'r' ? 1 : o.g); let h = ''; for (let i = 0; i < n; i++) h += '<i style="--i:' + i + '">' + chip(kind === 'r' ? 'r' : 'g', kind === 'r' ? 46 : 34) + '</i>'; e.innerHTML = h + (kind !== 'r' && o.g > 1 ? '<em>×' + o.g + '</em>' : ''); }
    const side = Math.random() < 0.5 ? -1 : 1, tx = sr.width / 2 + side * (190 + Math.random() * Math.max(20, sr.width / 2 - 290)), ty = 90 + Math.random() * Math.max(60, sr.height - 260), x0 = fr.left + fr.width / 2 - sr.left, y0 = fr.top + fr.height / 2 - sr.top, rot = (Math.random() * 2 - 1) * 22;
    e.style.left = tx + 'px'; e.style.top = ty + 'px'; e.style.setProperty('--rot', rot + 'deg'); st.appendChild(e);
    e.animate([{ transform: 'translate(calc(-50% + ' + (x0 - tx) + 'px),calc(-50% + ' + (y0 - ty) + 'px)) rotate(0deg) scale(.4)' }, { transform: 'translate(calc(-50% + ' + (x0 - tx) * 0.4 + 'px),calc(-50% + ' + ((y0 - ty) * 0.4 - 70) + 'px)) rotate(' + rot * 3 + 'deg) scale(1.1)', offset: 0.55 }, { transform: 'translate(-50%,-50%) rotate(' + rot + 'deg) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => { burst(0, 0.04, 0.3, kind === 'card' ? 900 : 2600, 0.8); };
    let dn = null; e.addEventListener('pointerdown', (ev) => { dn = { x: ev.clientX, y: ev.clientY, l: parseFloat(e.style.left), t: parseFloat(e.style.top), m: 0 }; e.style.zIndex = '9'; try { e.setPointerCapture(ev.pointerId); } catch (er) { /* 무시 */ } });
    e.addEventListener('pointermove', (ev) => { if (!dn) return; const dx = ev.clientX - dn.x, dy = ev.clientY - dn.y; dn.m = Math.max(dn.m, Math.hypot(dx, dy)); e.style.left = (dn.l + dx) + 'px'; e.style.top = (dn.t + dy) + 'px'; });
    const up = () => { if (!dn) return; const d = dn; dn = null; e.style.zIndex = ''; if (d.m < 6) collect(e); }; e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); ui();
  }
  function collect(e) { if (!e.isConnected || e.pzGone) return; e.pzGone = 1; /* data-go 는 사이트의 탭 이동 표시라 쓰지 않음 */ const o = e.pz, bal = root.querySelectorAll('.tb-bal span'), card = e.classList.contains('nk'), isR = e.classList.contains('r'), to = bal[isR ? 1 : 0], a = e.getBoundingClientRect(), b = to.getBoundingClientRect();
    const done = () => { if (isR) pendR = Math.max(0, pendR - 1); else pendG = Math.max(0, pendG - (card ? (o.dup ? o.gold : 0) : o.g)); ui(); };
    if (card && !e.pzTurn) { cardQ.push(e); if (cardQ.length === 1) { e.pzTurn = 1; e.pzGone = 0; collect(e); } return; } /* 카드는 한 장씩 차례로 투입 */
    if (card) { /* 카드는 기계의 카드 투입구로: 투입구 앞으로 날아간 뒤, 표가 나올 때의 역순으로 빨려 들어감 */
      const cin = $('.tb-cin', root), mc = $('.tb-mc', root), cr = cin.getBoundingClientRect(), mr = mc.getBoundingClientRect(), html = e.innerHTML; burst(0, 0.06, 0.14, 3800, 0.7);
      e.animate([{ transform: 'translate(-50%,-50%) rotate(var(--rot)) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + (cr.left + cr.width / 2 - a.left - a.width / 2) + 'px),calc(-50% + ' + (cr.top + 130 - a.top - a.height / 2) + 'px)) rotate(0deg) scale(1.2)', opacity: 1, offset: 0.85 }, { transform: 'translate(calc(-50% + ' + (cr.left + cr.width / 2 - a.left - a.width / 2) + 'px),calc(-50% + ' + (cr.top + 130 - a.top - a.height / 2) + 'px)) rotate(0deg) scale(1.2)', opacity: 0 }], { duration: 330, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' }).onfinish = () => { e.remove();
        const o = document.createElement('div'); o.className = 'tb-out in'; o.style.left = (cr.left - mr.left + 4) + 'px'; o.style.top = (cr.top + cr.height / 2 - mr.top) + 'px'; o.style.width = (cr.width - 8) + 'px'; o.innerHTML = '<i>' + html + '</i>'; mc.appendChild(o);
        o.firstChild.animate([{ transform: 'rotateX(64deg) translateY(55%)', opacity: 0 }, { transform: 'rotateX(58deg) translateY(-4%)', opacity: 1, offset: 0.3 }, { transform: 'rotateX(58deg) translateY(-4%)', opacity: 1, offset: 0.42, easing: 'ease-in' }, { transform: 'rotateX(58deg) translateY(-100%)', opacity: 1 }], { duration: 420, fill: 'both' }).onfinish = () => { o.remove(); done(); cardQ.shift(); const nx = cardQ[0]; if (nx) { nx.pzTurn = 1; nx.pzGone = 0; collect(nx); } }; sfx.cardIn(); }; }
    else { let ms = 0; try { ms = window.doroChipFly ? window.doroChipFly(e, to, isR ? 1 : o.g * 10, { size: isR ? 24 : 20, k: isR ? 'r' : 'g', single: isR ? 1 : 0 }) : 0; } catch (er) { /* 무시 */ } e.remove(); setTimeout(done, Math.min(1200, ms || 0)); } }
  function finish() {
    const T = cur; if (!T || T.fin) return; T.fin = 1; const t = T.t, k = t[0], res = $('.tb-res', root), tk = $('.tb-pile .tb-tk:not(.bk)', root); let hold = auto ? 90 : 650;
    if (k) { const row = tk && tk.querySelector('.tb-row[data-i="' + T.wi + '"]'); if (row) row.classList.add('win'); res.className = 'tb-res w'; res.innerHTML = prizeTxt(t);
      if (k === 'r') { sfx.win(3); toss('r', {}, row); if (window.doroCutin) setTimeout(() => window.doroCutin(1), 250); /* DORO칩은 언제나 컷인 */ hold = auto ? 350 : 1300; }
      else if (k[0] === 'g') { const g = +k.slice(1); sfx.win(g >= 10 ? 2 : 1); toss('g', { g }, row); hold = auto ? 220 : 900; }
      else { sfx.win(TV[k] - 6); const x = data().list.find((y) => String(y.code) === String(t[1])); if (x) toss('card', { k, x, cnt: t[3], dup: !!t[2], gold: DUP[TV[k]] }, row); hold = auto ? 420 : 1300; } }
    else { res.innerHTML = '<span style="opacity:.55">꽝</span>'; T.lose = 1; }
    setTimeout(() => { if (cur !== T) return; if (tk) tk.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (k ? 240 : -240) + 'px,60px) rotate(' + (k ? 24 : -24) + 'deg)', opacity: 0 }], { duration: auto ? 90 : 200, easing: 'ease-in', fill: 'forwards' }); setTimeout(() => { if (cur === T) next(); }, auto ? 80 : 190); }, hold);
  }
  function build() {
    root.innerHTML = '<div class="tbx" style=\'--paper:' + PAPER + '\'><aside class="tb-mc"><div class="tb-ttl">도로록<small>DOROROC</small></div><div class="tb-view"></div><div class="tb-win"></div><div class="tb-bal"></div>' +
      '<div class="tb-btn">' + [1, 5, 10].map((n) => '<button type="button" data-n="' + n + '">' + n + '장<small>' + chip('b', 13) + n * 10 + '</small></button>').join('') + '</div><div class="tb-slot"></div><div class="tb-msg"></div><div class="tb-cl">CARD IN</div><div class="tb-cin"></div>' +
      '<div class="tb-opt"><button type="button" data-tb="link">동시 뜯기</button><button type="button" data-tb="odds">확률표</button></div><div class="tb-odds" hidden><table>' + SPEC.map((x) => '<tr><td>' + (TV[x[0]] ? x[0] + ' 카드' : x[0] === 'r' ? 'DORO칩 1' : '골드칩 ' + x[0].slice(1)) + '</td><td>' + x[1] + '장</td><td>' + (x[1] / BOX * 100).toFixed(0) + '%</td></tr>').join('') + '<tr><td>꽝</td><td>' + (BOX - SPEC.reduce((a, x) => a + x[1], 0)) + '장</td><td>' + ((BOX - SPEC.reduce((a, x) => a + x[1], 0)) / BOX * 100).toFixed(0) + '%</td></tr></table></div></aside>' +
      '<main class="tb-st"><div class="tb-res"></div><div class="tb-pile"><div class="tb-empty">표를 뽑으세요<br>덮개를 오른쪽으로 끌거나 누르면 뜯깁니다</div></div><div class="tb-ctl"></div></main></div>';
    ui(); if (!left) fetchTix(0).then((r) => { left = r.left; ui(); }).catch(() => { /* 다음에 */ });
  }
  function onClick(e) {
    const b = e.target.closest('.tb-btn button'); if (b) { buyN(+b.dataset.n); return; } const a = e.target.closest('[data-tb]'); if (!a) { if (cur && cur.fin && cur.lose && e.target.closest('.tb-st') && !e.target.closest('.tb-pz')) next(); /* 꽝: 누르면 기다리지 않고 바로 다음 */ return; }
    if (a.dataset.tb === 'link') { link = !link; ui(); return; }
    if (a.dataset.tb === 'take') { root.querySelectorAll('.tb-pz').forEach((e2, i) => setTimeout(() => collect(e2), i * 70)); setTimeout(ui, 200); return; }
    if (a.dataset.tb === 'odds') { const o = $('.tb-odds', root); o.hidden = !o.hidden; return; }
    if (a.dataset.tb === 'reset') { if (busy || cur || Q.length) return; if (a.dataset.ok !== '1') { a.dataset.ok = '1'; a.textContent = '한 번 더 누르면 교체'; setTimeout(() => { a.dataset.ok = ''; a.textContent = '상자 교체'; }, 2500); return; } a.dataset.ok = ''; a.textContent = '상자 교체'; busy = true; fetchTix(0, true).then((r) => { left = r.left; busy = false; sfx.tidy(); ui(); }).catch(() => { busy = false; ui(); }); return; }
    if (a.dataset.tb === 'all') { auto = true; const tk = $('.tb-pile .tb-tk:not(.bk)', root); if (tk && cur && !cur.fin) autoRip(tk); } }
  window.doroTabs = { art() { if (!document.getElementById('tabs-css')) { const s0 = document.createElement('style'); s0.id = 'tabs-css'; s0.textContent = CSS; document.head.appendChild(s0); } return '<span class="tb-artw" style=\'--paper:' + PAPER + '\'>' + tkHtml({ rows: [['r', 'r', 'r'], ['g', 'P', 'g'], ['E', 'b', 's']] }, 1, [1, 0.5, 0]) + '</span>'; }, mount(el) {
    if (!el) return; const d = data(); if (!d.ok) { el.innerHTML = ''; return; } if (!d.list.length || !window.doroRaid) { setTimeout(() => window.doroTabs.mount(el), 400); return; }
    if (!document.getElementById('tabs-css')) { const s = document.createElement('style'); s.id = 'tabs-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (root !== el) { root = el; el.addEventListener('click', onClick); window.addEventListener('dorochips', () => { if (root && root.isConnected) ui(); }); }
    if (!cur && !Q.length) build();
  } };
})();
