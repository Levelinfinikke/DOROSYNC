/* DOROSYNC 관리자 현황: 관리자 계정으로 로그인하면 상단에 [관리] 버튼이 생김.
   계정별 DORO칩 잔고·오늘 기록·싱크로 자동 기록 설정을 워커(/admin)에서 받아 표로 보여 줌. 이메일은 받지 않음 */
(function () {
  'use strict';
  const ADMIN = ['bAdQg5xtIsbCntzxuEjBoSB93T22', 'PdkjvEMLcaR76Ie7h13N6cnpDvT2'];
  const API = 'https://dorosync.bomullee88.workers.dev/admin';
  const fmt = (n) => Math.round(+n || 0).toLocaleString('ko-KR');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kst = (v) => { if (!v) return '-'; const d = new Date(typeof v === 'number' || /^\d+$/.test(v) ? +v : v); if (isNaN(d)) return '-'; const k = new Date(d.getTime() + 9 * 3600000); return (k.getUTCMonth() + 1) + '/' + k.getUTCDate() + ' ' + String(k.getUTCHours()).padStart(2, '0') + ':' + String(k.getUTCMinutes()).padStart(2, '0'); };
  const CSS = '#adm-btn{margin-left:6px}#adm-m{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}#adm-m[hidden]{display:none}'
    + '#adm-b{background:var(--card,#161a22);color:var(--ink,#e8edf6);border:1px solid var(--line,#2a3140);border-radius:14px;max-width:1100px;width:100%;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
    + '#adm-b h2{margin:0 0 10px;font-size:18px;display:flex;align-items:center;gap:8px}#adm-b h2 #adm-re{margin-left:auto}#adm-sum{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}#adm-sum div{padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.05);font-size:13px}#adm-sum b{display:block;font-size:18px}'
    + '#adm-t{width:100%;border-collapse:collapse;font-size:12.5px}#adm-t th,#adm-t td{padding:6px 8px;border-bottom:1px solid var(--line,#2a3140);text-align:right;white-space:nowrap}#adm-t th{cursor:pointer;color:var(--muted,#9aa5b8);position:sticky;top:0;background:var(--card,#161a22)}#adm-t td.l,#adm-t th.l{text-align:left}#adm-t tr.me td{opacity:.6}.adm-on{color:var(--ok,#1a9d55);font-weight:700}.adm-bad{color:var(--bad,#e0303a)}.adm-note{font-size:12px;color:var(--muted,#9aa5b8);margin-top:10px}';
  let data = null, sortK = 'chips', sortD = -1;
  function isAdmin() { const a = window.doroAccount, u = a && a.user; return !!(u && ADMIN.includes(u.uid)); }
  function button() {
    let b = document.getElementById('adm-btn'); const on = isAdmin();
    if (!on) { if (b) b.remove(); return; }
    if (b) return; const tb = document.querySelector('.top-btns'); if (!tb) return;
    if (!document.getElementById('adm-css')) { const st = document.createElement('style'); st.id = 'adm-css'; st.textContent = CSS; document.head.appendChild(st); }
    b = document.createElement('button'); b.type = 'button'; b.id = 'adm-btn'; b.className = 'ghost upl'; b.textContent = '관리'; b.title = '관리자 현황'; b.onclick = open; tb.appendChild(b);
  }
  async function open() {
    let m = document.getElementById('adm-m');
    if (!m) { m = document.createElement('div'); m.id = 'adm-m'; m.innerHTML = '<div id="adm-b"><h2>관리자 현황 <small id="adm-at" style="font-size:12px;color:var(--muted,#9aa5b8);font-weight:400"></small><button type="button" class="ghost sm" id="adm-re">새로고침</button><button type="button" class="ghost sm" id="adm-x">닫기</button></h2><div id="adm-body">불러오는 중…</div></div>'; document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m || e.target.id === 'adm-x') m.hidden = true; if (e.target.id === 'adm-re') load(); const th = e.target.closest('#adm-t th[data-k]'); if (th) { const k = th.dataset.k; sortD = sortK === k ? -sortD : -1; sortK = k; render(); } }); }
    m.hidden = false; load();
  }
  async function load() {
    const body = document.getElementById('adm-body'); body.textContent = '불러오는 중…';
    try {
      const t = await window.doroAccount.token(), r = await fetch(API, { headers: { Authorization: 'Bearer ' + t } }), j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { body.textContent = j.error === 'admin' ? '관리자 계정이 아닙니다.' : '불러오지 못했습니다 (' + (j.error || r.status) + '). 서버(워커)가 최신 버전인지 확인해 주세요.'; return; }
      data = j; document.getElementById('adm-at').textContent = kst(Date.now()) + ' 기준'; render();
    } catch (e) { body.textContent = '불러오지 못했습니다. 네트워크를 확인해 주세요.'; }
  }
  const val = (u, k) => (k === 'nick' ? u.nick : k === 'chips' ? (u.chips ? u.chips.d : -1) : k === 'r' ? (u.chips ? u.chips.r : -1) : k === 'today' ? (u.day ? u.day.n : -1) : k === 'auto' ? (u.auto && u.auto.on ? (u.auto.last ? 2 : 1) : 0) : k === 'created' ? Date.parse(u.created) || 0 : k === 'updated' ? (+u.updated || Date.parse(u.updated) || 0) : 0);
  function render() {
    const U = (data.users || []).slice(), others = U.filter((u) => !u.admin), withC = others.filter((u) => u.chips), sumD = withC.reduce((a, u) => a + (u.chips.d || 0), 0), sumR = withC.reduce((a, u) => a + (u.chips.r || 0), 0);
    const au = others.filter((u) => u.auto && u.auto.on), auOk = au.filter((u) => u.auto.last && u.auto.last.ok), auBad = au.filter((u) => u.auto.last && !u.auto.last.ok);
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), act = others.filter((u) => u.day && u.day.d === today);
    U.sort((a, b) => { const x = val(a, sortK), y = val(b, sortK); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortD; });
    const run = data.autoRun;
    let h = '<div id="adm-sum">'
      + '<div>계정<b>' + others.length + '</b></div><div>칩 보유<b>' + withC.length + '</b></div><div>DORO칩 합계<b>' + fmt(sumD) + '</b></div><div>무지개칩 합계<b>' + fmt(sumR) + '</b></div><div>오늘 칩 활동<b>' + act.length + '</b></div>'
      + '<div>자동 기록 켬<b>' + au.length + '</b></div><div>자동 기록 성공<b>' + auOk.length + '</b></div><div>자동 기록 실패<b class="' + (auBad.length ? 'adm-bad' : '') + '">' + auBad.length + '</b></div>'
      + (run ? '<div>마지막 자동 실행<b style="font-size:14px">' + kst(run.at || run.t) + '</b>' + esc(['n', 'ok', 'fail', 'stop'].filter((k) => run[k] != null && run[k] !== '').map((k) => k + ' ' + run[k]).join(' · ')) + '</div>' : '') + '</div>';
    const th = (k, t, l) => '<th' + (l ? ' class="l"' : '') + (k ? ' data-k="' + k + '"' : '') + '>' + t + (sortK === k ? (sortD < 0 ? ' ▼' : ' ▲') : '') + '</th>';
    h += '<div style="overflow:auto;max-height:65vh"><table id="adm-t"><thead><tr>' + th('nick', '닉네임', 1) + th('chips', 'DORO칩') + th('r', '무지개') + th('today', '오늘 지급') + th('', '오늘 사용') + th('', '출석') + th('auto', '자동 기록', 1) + th('', '다음 처리') + th('created', '가입') + th('updated', '마지막 저장') + '</tr></thead><tbody>';
    U.forEach((u) => {
      const d = u.day && u.day.d === today ? u.day : null, a = u.auto;
      const au2 = !a || !a.on ? '<span style="opacity:.5">꺼짐</span>' : '<span class="adm-on">켬</span> ' + (a.area ? '(' + esc(a.area) + ') ' : '') + (a.last ? (a.last.ok ? '최근 ' + kst(a.last.at) + ' · 싱크로 ' + a.last.s + ' · 전초기지 ' + a.last.o : '<span class="adm-bad">실패 ' + esc(a.last.code || '') + ' ' + kst(a.last.at) + '</span>') : '· 아직 실행 전 (' + kst(a.since) + '부터)');
      h += '<tr' + (u.admin ? ' class="me"' : '') + '><td class="l">' + esc(u.nick || '(이름 없음)') + (u.admin ? ' · 관리자' : '') + ' <small style="opacity:.5">' + esc(u.id) + '</small></td><td>' + (u.chips ? fmt(u.chips.d) : '-') + '</td><td>' + (u.chips ? fmt(u.chips.r) : '-') + '</td><td>' + (d ? fmt(d.n) : '-') + '</td><td>' + (d && d.s ? fmt(d.s) : '-') + '</td><td>' + (d && d.a ? '✓' : '-') + '</td><td class="l">' + au2 + '</td><td>' + esc(u.autoDue || '-') + '</td><td>' + kst(u.created) + '</td><td>' + kst(u.updated) + '</td></tr>';
    });
    h += '</tbody></table></div><p class="adm-note">로그인한 계정만 보입니다(비회원 칩은 각자 브라우저에만 있음). 이메일은 표시하지 않습니다. 관리자 계정은 합계에서 뺐습니다. 열 제목을 누르면 정렬됩니다.</p>';
    document.getElementById('adm-body').innerHTML = h;
  }
  window.addEventListener('doroacct', button); setTimeout(button, 1500); setInterval(button, 5000);
})();
