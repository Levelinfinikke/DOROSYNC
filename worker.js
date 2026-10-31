/* 최적 조합 탐색 워커: 조합 공간을 나눠 전수 계산한 뒤 지역 파레토 프런티어를 돌려줍니다. */
importScripts('data.js', 'engine.js');
onmessage = function (e) {
  const { inp, cand, w, nw, useSlots, forced } = e.data;
  const E = self.DoroEngine, D = self.DATA;
  const m = E.buildModel(inp, D);
  const op = E.optSetup(m, cand, inp, useSlots, forced);
  const use = new Array(m.Pk.length).fill(false);
  const R = [];
  let n = 0;
  for (let i = w; i < op.total; i += nw) {
    op.apply(i, use);
    const r = E.simulate(m, use, false);
    if (r.days < 9999) R.push([r.bill, r.days, i]);
    if ((++n & 1023) === 0) postMessage({ type: 'progress', n: 1024 });
  }
  postMessage({ type: 'progress', n: n & 1023 });
  R.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const P = [];
  let bd = 1e9;
  for (const r of R) if (r[1] < bd) { P.push(r); bd = r[1]; }
  postMessage({ type: 'done', pareto: P, valid: R.length });
};
