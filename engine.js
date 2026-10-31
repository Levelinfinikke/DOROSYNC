/* DOROSYNC 계산 엔진 (엑셀 V2.1 시뮬레이션 시트의 규칙을 그대로 옮긴 것)
 * 브라우저 / Web Worker / Node 어디서나 동작합니다. */
(function (root) {
  'use strict';
  const RES = ['코더', '배데', '크레딧'];
  const BOXH = [24, 12, 8, 4, 2, 1];
  const MAXD = 1500;

  function periodOf(name) {
    if (name.indexOf('(월정액)') >= 0) return '월정액';
    if (name.slice(0, 4) === '(기간)') return '기간';
    return name.slice(0, 2); // 일일 / 주간 / 월간
  }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }

  /** inp -> 계산 모델 */
  function buildModel(inp, D) {
    const m = {};
    m.S0 = Math.round(inp.S0);
    m.T = Math.round(inp.T);
    m.L0 = inp.L0 >= 1 ? Math.min(800, Math.round(inp.L0)) : 0;
    m.G = inp.G;
    m.cfg = Object.assign({}, D.cfg, inp.cfg || {});
    const t0 = parseDate(inp.start);
    m.startMs = t0;
    m.Wd = new Int8Array(MAXD + 2);
    m.Dm = new Int8Array(MAXD + 2);
    for (let t = 1; t <= MAXD; t++) {
      const d = new Date(t0 + (t - 1) * 86400000);
      let wd = d.getUTCDay();
      if (wd === 0) wd = 7;
      m.Wd[t] = wd;
      m.Dm[t] = d.getUTCDate();
    }
    // 레벨별 1h 값 [코더,배데,크레딧]
    m.Boxes = D.boxes;
    m.cps = D.cps;
    // 투력 보정계수
    const cps = (s) => D.cps[Math.max(1, Math.min(1000, s)) - 1];
    m.cpsAt = cps;
    m.fac = inp.power > 0 ? inp.power / cps(m.S0) : 1;
    m.boss = D.boss; m.qt = D.qt; m._tot = new Map();
    m.autoL = !(m.L0 >= 1);
    m.avgL = lupd(m, m.S0, 1);
    if (m.autoL) m.L0 = m.avgL;
    // 레벨업 비용 누적표
    const brs = D.brk.map((b) => ({
      cnt: Math.max(0, Math.min(m.T, b[1]) - Math.max(m.S0, b[0] - 1)),
      cost: [b[2], b[3], b[4]],
    }));
    const nmax = Math.max(0, m.T - m.S0);
    m.nmax = nmax;
    m.Ct = [0, 1, 2].map((k) => {
      const a = new Float64Array(nmax + 1);
      for (let n = 0; n <= nmax; n++) {
        let tot = 0, prior = 0;
        for (const x of brs) {
          tot += Math.min(x.cnt, Math.max(0, n - prior)) * x.cost[k];
          prior += x.cnt;
        }
        a[n] = tot;
      }
      return a;
    });
    // 보유 재화
    m.Uh0 = [0, 0, 0];
    m.Stock = [0, 0, 0];
    m.Need = [0, 0, 0];
    m.Total = [0, 0, 0];
    const b1 = D.boxes[m.L0 - 1];
    m.v1h0 = b1;
    for (let k = 0; k < 3; k++) {
      let u = 0;
      for (let i = 0; i < 6; i++) u += (inp.boxes[k][i] || 0) * BOXH[i];
      m.Uh0[k] = u;
      const loose = inp.loose[k] || 0;
      m.Total[k] = m.Ct[k][nmax];
      m.Stock[k] = Math.min(m.Total[k], loose);
      m.Need[k] = m.Total[k] - m.Stock[k];
    }
    // 일일 수급
    m.Hc = [0, 0, 0];
    m.Fc = [0, 0, 0];
    for (const r of inp.inc) {
      if (!r.use) continue;
      const cyc = r.cyc > 0 ? r.cyc : 1;
      for (let k = 0; k < 3; k++) {
        const h = r.sortie ? 2 * inp.sortie : r.h[k];
        m.Hc[k] += h / cyc;
        m.Fc[k] += r.fx[k] / cyc;
      }
    }
    // 패키지
    const ratio = m.cfg.ratio;
    m.Pk = inp.pk.map((p) => {
      const H = [p.h[0] || 0, p.h[1] || 0, p.h[2] || 0];
      if (p.sel) {
        const k = RES.indexOf(p.sel);
        if (k >= 0) H[k] = (p.base || 0) * ratio[k];
      }
      return {
        name: p.name, per: periodOf(p.name), price: p.price, use: !!p.use,
        H, Fl: [p.fx[0] || 0, p.fx[1] || 0, p.fx[2] || 0],
        cap: p.max > 0 ? p.max : Infinity,
      };
    });
    // 보스 판정용
    m.boss = D.boss;
    m.qt = D.qt;
    m._tot = new Map();
    return m;
  }

  /** 스테이지 클리어 합(전초기지 계산용) : 클리어 가능한 노말/하드 스테이지 수의 합 */
  function totAt(m, s) {
    let v = m._tot.get(s);
    if (v !== undefined) return v;
    const c = (m.fac * m.cpsAt(s)) / (1 + m.G);
    let tot = 0;
    for (const mo of ['노말', '하드']) {
      let mn = Infinity;
      for (const r of m.boss) {
        if (r[1] === mo && r[4] > c && r[5] < mn) mn = r[5];
      }
      tot += mn === Infinity ? m.qt[mo] : mn;
    }
    v = Math.trunc(tot);
    m._tot.set(s, v);
    return v;
  }

  function lupd(m, s, l) {
    let v = 1 + Math.floor(totAt(m, s) / 5);
    if (l > v) v = l;
    return v > 800 ? 800 : v;
  }

  function levOf(ct, x) {
    // ct[i] <= x 를 만족하는 가장 큰 i
    let lo = 0, hi = ct.length; // ct[i] > x+eps 인 첫 i
    const y = x + 1e-9;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ct[mid] > y) hi = mid; else lo = mid + 1;
    }
    return lo - 1;
  }

  /** 시뮬레이션 실행
   * use[j] : j번 패키지 구매 여부 (null 이면 모델에서 지정한 use 사용)
   * trace  : true 이면 일자별 기록을 반환 */
  function simulate(m, use, trace) {
    const np = m.Pk.length;
    if (!use) use = m.Pk.map((p) => p.use);
    let L = m.L0, S = m.S0;
    const Uh = m.Uh0.slice();
    const Fx = [0, 0, 0], O = [0, 0, 0], done = [0, 0, 0];
    let bill = 0;
    const cum = new Array(np);
    for (let j = 0; j < np; j++) { cum[j] = new Int32Array(MAXD + 2); }
    const app = new Float64Array(np);
    const cnt = new Int32Array(np);
    const tr = trace ? { rows: [], first: [0, 0, 0], S0: m.S0, L0: m.L0, p0: m.fac * m.cpsAt(m.S0) } : null;
    const cfg = m.cfg;
    let reached = 0;
    const T = m.T, S0 = m.S0, nmax = m.nmax;
    if (S0 >= T) {
      return trace ? Object.assign(tr, { days: 1, bill: 0, reachedAll: 1 }) : { days: 1, bill: 0 };
    }
    for (let t = 1; t <= MAXD; t++) {
      let dayBill = 0;
      const fl = trace ? new Array(np).fill(0) : null;
      for (let j = 0; j < np; j++) {
        const pk = m.Pk[j];
        let f = 0;
        if (use[j] && cnt[j] < pk.cap) {
          let any = false;
          for (let k = 0; k < 3; k++) {
            if (pk.H[k] + pk.Fl[k] > 0 && done[k] === 0) any = true;
          }
          if (any) {
            switch (pk.per) {
              case '일일': f = 1; break;
              case '주간': if (m.Wd[t] === cfg.wk) f = 1; break;
              case '월간': if (m.Dm[t] === cfg.mday) f = 1; break;
              case '기간': if ((t - 1) % cfg.per === 0) f = 1; break;
              case '월정액': if ((t - 1) % cfg.mlen === 0) f = 1; break;
            }
          }
        }
        cum[j][t] = cum[j][t - 1] + f;
        cnt[j] += f;
        dayBill += f * pk.price;
        if (fl) fl[j] = f;
        if (pk.per === '월정액') {
          const lo = Math.max(0, t - cfg.mlen);
          app[j] = cum[j][t] - cum[j][lo];
        } else app[j] = f;
      }
      bill += dayBill;
      const bx = m.Boxes[L - 1];
      const acq = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        let h = m.Hc[k], fx = m.Fc[k];
        for (let j = 0; j < np; j++) {
          const a = app[j];
          if (a !== 0) { h += a * m.Pk[j].H[k]; fx += a * m.Pk[j].Fl[k]; }
        }
        acq[k] = fx + h * bx[k];
        Fx[k] += acq[k];
      }
      let n = 1 << 30;
      for (let k = 0; k < 3; k++) {
        const tt = Fx[k] + O[k] + Uh[k] * bx[k];
        const v = levOf(m.Ct[k], tt + m.Stock[k]);
        if (v < n) n = v;
      }
      if (n > nmax) n = nmax;
      const open = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        let nd = m.Ct[k][n] - m.Stock[k] - Fx[k] - O[k];
        if (nd < 0) nd = 0;
        Uh[k] = Math.max(0, Uh[k] - nd / bx[k]);
        O[k] += nd;
        open[k] = nd;
      }
      if (S0 + n > S) {
        S = S0 + n;
        L = lupd(m, S, L);
      }
      const bx2 = m.Boxes[L - 1];
      for (let k = 0; k < 3; k++) {
        done[k] = Fx[k] + O[k] + Uh[k] * bx2[k] >= m.Need[k] ? 1 : 0;
      }
      if (tr) {
        for (let k = 0; k < 3; k++) if (done[k] && !tr.first[k]) tr.first[k] = t;
        tr.rows.push({
          t, flags: fl, bill: dayBill, billCum: bill, acq, cum: Fx.slice(), open, opened: O.slice(),
          hold: Uh.slice(), S, L, power: m.fac * m.cpsAt(S), done: done.slice(),
        });
      }
      if (S >= T) {
        reached = t;
        break;
      }
    }
    if (trace) {
      tr.days = reached || 9999;
      tr.bill = bill;
      return tr;
    }
    return { days: reached || 9999, bill };
  }

  /** 효율 순위 (코더:배데:크레딧 비율 반영, 고정 재화 제외, 월정액은 적용일수 배) */
  function rankPackages(m, inp, useSlots, allow) {
    const ratio = m.cfg.ratio;
    const arr = m.Pk.map((p, j) => ({ p, j })).filter((x) => !allow || allow(x.j)).map(({ p, j }) => {
      const mult = p.per === '월정액' ? m.cfg.mlen : 1;
      let v = 0;
      const sp = inp && inp.pk[j];
      if (useSlots && sp && sp.sel && sp.base > 0) v = sp.base * mult; // 선택재화형: 어느 재화를 골라도 효율 동일
      else for (let k = 0; k < 3; k++) v += (p.H[k] * mult) / ratio[k];
      return { j, e: (v / p.price) * 10000 };
    });
    arr.sort((a, b) => b.e - a.e || a.j - b.j);
    return arr;
  }

  /** 보스 표 : 일자 trace 로부터 클리어 예상 날짜 */
  function bossTable(m, tr) {
    const out = [];
    const rows = tr.rows;
    for (const r of m.boss) {
      const thr = r[4] * (1 + m.G);
      let day = null;
      if (tr.p0 >= thr) day = 0;
      else {
        for (const x of rows) { if (x.power >= thr) { day = x.t; break; } }
      }
      let S = null, P = null;
      if (day === 0) { S = tr.S0; P = tr.p0; }
      else if (day !== null) { const x = rows[day - 1]; S = x.S; P = x.power; }
      out.push({ no: r[0], mode: r[1], name: r[2], base: r[3], judge: r[4], stages: r[5], day, S, P, K: r[6] });
    }
    return out;
  }


  /** 최적 조합 탐색 설정 : 후보 슬롯(켜기/끄기, 선택재화형은 없음/코더/배데/크레딧)을 혼합 진법으로 열거
   * useSlots=false 이면 선택재화형도 현재 설정 그대로 켜기/끄기만 탐색 */
  function optSetup(m, cand, inp, useSlots, forced) {
    forced = forced || [];
    const slots = cand.map((j) => {
      const p = inp.pk[j];
      const sel = !!useSlots && !!p.sel && p.base > 0;
      let H = null;
      if (sel) H = [0, 1, 2].map((k) => { const h = [0, 0, 0]; h[k] = p.base * m.cfg.ratio[k]; return h; });
      return { j, sel, H };
    });
    const bases = slots.map((s) => (s.sel ? 4 : 2));
    let total = 1;
    bases.forEach((b) => (total *= b));
    return {
      slots, bases, total,
      /** idx 번째 조합을 use[] 에 적용하고 모델의 선택재화를 바꿈 */
      apply(idx, use) {
        use.fill(false);
        for (const f of forced) use[f] = true;
        let x = idx;
        for (let i = 0; i < slots.length; i++) {
          const b = bases[i], d = x % b;
          x = (x - d) / b;
          const s = slots[i];
          if (s.sel) { if (d > 0) { use[s.j] = true; m.Pk[s.j].H = s.H[d - 1]; } }
          else use[s.j] = d === 1;
        }
      },
      /** idx 의 구성 : [{j, k}] (k = 선택 재화 번호, 없으면 -1) */
      decode(idx) {
        const out = forced.map((j) => ({ j, k: -1, forced: true }));
        let x = idx;
        for (let i = 0; i < slots.length; i++) {
          const b = bases[i], d = x % b;
          x = (x - d) / b;
          const s = slots[i];
          if (s.sel) { if (d > 0) out.push({ j: s.j, k: d - 1 }); }
          else if (d === 1) out.push({ j: s.j, k: -1 });
        }
        return out;
      },
    };
  }

  const api = { optSetup, RES, BOXH, MAXD, periodOf, buildModel, simulate, rankPackages, bossTable, totAt, lupd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DoroEngine = api;
})(typeof self !== 'undefined' ? self : this);
