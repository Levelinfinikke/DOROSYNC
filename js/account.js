/* DOROSYNC 계정: 로그인 · 회원가입 · 이메일 인증 · 비밀번호 재설정 · 구글 연동 · 클라우드 자동 저장
   - 인증: Firebase Auth (vendor/firebase, 필요할 때만 불러옴)
   - 저장: Firestore REST (users/{uid}, usernames/{아이디})
   - 아이디 로그인: Cloudflare 워커 /login 이 아이디→이메일 확인 후 커스텀 토큰 발급(이메일은 밖으로 나가지 않음) */
const FB = {
  apiKey: 'AIzaSyC8UPIEelNUmd4XSDTJ4aX4BgYq5YOOSK0',
  authDomain: 'dorosync-2b9f5.firebaseapp.com',
  projectId: 'dorosync-2b9f5',
  appId: '1:732298309175:web:1fb61b85590137ca93d9b2',
};
const WORKER = 'https://dorosync.bomullee88.workers.dev';
const DB = 'https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents';
const META = 'dsacct-meta'; /* {uid, ts(마지막 동기화 시각), h(마지막 동기화 해시)} — 동기화 대상 아님 */
const ID_RE = /^[a-z0-9_]{3,16}$/;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const meta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; } };
const setMeta = (m) => { try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) { /* 무시 */ } };

/* ---------- 로컬 데이터 스냅숏 (dorosync로 시작하는 키 전부) ---------- */
function snapshot() {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^dorosync/.test(k)) o[k] = localStorage.getItem(k); }
  return o;
}
function hashOf(o) {
  const s = JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

/* ---------- Firestore REST ---------- */
const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
};
const dec = (v) => {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return null;
};
async function rest(method, path, body, tok) {
  const h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok;
  const r = await fetch(DB + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return j;
}
const docFields = (d) => (d && d.fields ? dec({ mapValue: { fields: d.fields } }) : null);
const fieldsOf = (o) => enc(o).mapValue.fields;

/* ---------- Firebase Auth (지연 로딩) ---------- */
let A = null, auth = null, user = null, ready = null;
function boot() {
  if (ready) return ready;
  ready = (async () => {
    const [{ initializeApp }, m] = await Promise.all([import('../vendor/firebase/firebase-app.js'), import('../vendor/firebase/firebase-auth.js')]);
    A = m; auth = m.getAuth(initializeApp(FB)); auth.languageCode = 'ko';
    await new Promise((res) => { let first = true; m.onAuthStateChanged(auth, (u) => { user = u; onUser(u); if (first) { first = false; res(); } }); });
  })();
  return ready;
}
const tok = async () => (user ? user.getIdToken() : null);
const isGoogle = (u) => !!(u && u.providerData.some((p) => p.providerId === 'google.com'));
const hasPw = (u) => !!(u && u.providerData.some((p) => p.providerId === 'password'));

/* ---------- 오류 메시지 ---------- */
const ERR = {
  'auth/invalid-credential': '아이디(이메일) 또는 비밀번호가 맞지 않습니다.',
  'auth/wrong-password': '아이디(이메일) 또는 비밀번호가 맞지 않습니다.',
  'auth/user-not-found': '아이디(이메일) 또는 비밀번호가 맞지 않습니다.',
  'auth/invalid-email': '이메일 주소 형식이 올바르지 않습니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정하세요.',
  'auth/weak-password': '비밀번호는 8자 이상으로 정해 주세요.',
  'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도하세요.',
  'auth/popup-closed-by-user': '구글 창이 닫혀 취소됐습니다.',
  'auth/popup-blocked': '팝업이 차단됐습니다. 브라우저에서 팝업을 허용해 주세요.',
  'auth/credential-already-in-use': '이 구글 계정은 이미 다른 DOROSYNC 계정에 연동돼 있습니다.',
  'auth/provider-already-linked': '이미 구글이 연동돼 있습니다.',
  'auth/requires-recent-login': '보안을 위해 로그아웃 후 다시 로그인한 다음 시도해 주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
};
const errMsg = (e) => ERR[e && e.code] || (e && /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? '서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.' : (e && e.message)) || '알 수 없는 오류가 발생했습니다.';

/* ---------- 화면 ---------- */
const ICON = '<svg class="icb-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
const GLOGO = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

let view = 'login', profile = null;
function ui() {
  if ($('#acct-modal')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ghost upl'; b.id = 'btn-acct'; b.title = '로그인'; b.setAttribute('aria-label', '로그인'); b.innerHTML = ICON;
  const tb = document.querySelector('.top-btns'), bl = document.getElementById('btn-bl'); if (bl && bl.parentNode) bl.parentNode.insertBefore(b, bl.nextSibling); else if (tb) tb.appendChild(b);
  b.addEventListener('click', open);
  const m = document.createElement('div');
  m.className = 'blm'; m.id = 'acct-modal'; m.hidden = true; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', '계정');
  m.innerHTML = '<div class="blm-box acct-box"><div class="blm-hd"><h2 id="acct-ttl">로그인</h2><button type="button" class="blm-x" id="acct-x" aria-label="닫기">×</button></div><div id="acct-body"></div><p class="acct-msg" id="acct-msg" role="status" aria-live="polite"></p></div>';
  document.body.appendChild(m);
  m.addEventListener('click', (e) => { if (e.target === m) close(); });
  $('#acct-x').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) close(); });
  m.addEventListener('click', onClick); m.addEventListener('submit', onSubmit);
}
function open() { ui(); msg(''); $('#acct-modal').hidden = false; render(); boot().then(render).catch(() => msg('계정 기능을 불러오지 못했습니다. 새로고침해 주세요.', 1)); }
function close() { const m = $('#acct-modal'); if (m) m.hidden = true; }
function msg(t, bad) { const e = $('#acct-msg'); if (e) { e.textContent = t || ''; e.classList.toggle('bad', !!bad); } }
function busy(on) { const box = document.querySelector('.acct-box'); if (box) box.classList.toggle('busy', !!on); document.querySelectorAll('#acct-body button, #acct-body input').forEach((x) => { x.disabled = !!on; }); }

function render() {
  const body = $('#acct-body'); if (!body) return;
  const ttl = $('#acct-ttl');
  if (!auth) { ttl.textContent = '계정'; body.innerHTML = '<p class="muted">불러오는 중…</p>'; return; }
  if (user && profile) {
    ttl.textContent = '내 계정';
    const m = meta();
    body.innerHTML =
      '<div class="acct-row"><span class="acct-k">닉네임</span><span>' + (profile.nickname ? '<b>' + esc(profile.nickname) + '</b>' : '<span class="muted sm">BlaBla 연동하면 인게임 닉네임으로 표시돼요</span>') + '</span></div>' +
      '<div class="acct-row"><span class="acct-k">로그인 아이디</span><b>' + esc(profile.username) + '</b></div>' +
      (hasPw(user) ? '' : '<div class="acct-row"><span class="acct-k">비밀번호</span><span><input type="password" id="acct-newpw" class="acct-pwin" placeholder="8자 이상" autocomplete="new-password"><button type="button" class="ghost sm" data-a="setpw">설정</button></span></div><p class="muted sm acct-pwnote">비밀번호를 설정하면 아이디로도 로그인할 수 있어요. 설정하지 않으면 구글로만 로그인합니다.</p>') +
      '<div class="acct-row"><span class="acct-k">복구 이메일</span><span>' + esc(user.email || profile.email || '-') + ' ' + (user.emailVerified ? '<span class="acct-ok">인증됨</span>' : '<span class="acct-no">미인증</span> <button type="button" class="ghost sm" data-a="verify">인증 메일 보내기</button>') + '</span></div>' +
      '<div class="acct-row"><span class="acct-k">구글 연동</span><span>' + (isGoogle(user) ? '<span class="acct-ok">연동됨</span> ' + (hasPw(user) ? '<button type="button" class="ghost sm" data-a="unlink">연동 해제</button>' : '') : '<button type="button" class="ghost sm acct-g" data-a="link">' + GLOGO + ' 구글 계정 연동</button>') + '</span></div>' +
      '<div class="acct-row"><span class="acct-k">클라우드 저장</span><span>' + (m.ts ? '마지막 저장 ' + new Date(m.ts).toLocaleString('ko-KR') : '아직 저장 안 됨') + ' <button type="button" class="ghost sm" data-a="sync">지금 저장</button></span></div>' +
      '<div class="acct-acts">' + (hasPw(user) ? '<button type="button" class="ghost sm" data-a="pwreset">비밀번호 변경 메일</button>' : '') + (undoGet() ? '<button type="button" class="ghost sm" data-a="undo-pick">데이터 선택 되돌리기</button>' : '') + '<button type="button" class="ghost sm" data-a="pull">클라우드에서 다시 불러오기</button><button type="button" class="primary sm" data-a="logout">로그아웃</button></div>' +
      '<details class="acct-danger"><summary>계정 삭제</summary><p class="muted sm">아이디·이메일·저장된 모든 데이터가 서버에서 지워지고 되돌릴 수 없습니다. 이 기기에 있는 데이터는 남습니다.</p><button type="button" class="ghost sm acct-del" data-a="delete">계정 영구 삭제</button></details>';
    return;
  }
  if (user && !profile) { ttl.textContent = '계정'; body.innerHTML = '<p class="muted">계정 정보를 불러오는 중…</p>'; return; }
  ttl.textContent = view === 'signup' ? '회원가입' : view === 'reset' ? '비밀번호 재설정' : '로그인';
  const seg = '<div class="acct-seg"><button type="button" data-v="login" class="' + (view === 'login' ? 'on' : '') + '">로그인</button><button type="button" data-v="signup" class="' + (view === 'signup' ? 'on' : '') + '">회원가입</button></div>';
  if (view === 'signup') {
    body.innerHTML = seg + '<button type="button" class="ghost pad acct-g" data-a="google">' + GLOGO + ' 구글로 1초 만에 가입</button><div class="acct-or"><span>또는 아이디로 가입</span></div><form class="acct-f" data-f="signup" autocomplete="on">' +
      '<label>아이디<input name="id" required minlength="3" maxlength="16" pattern="[a-z0-9_]{3,16}" autocomplete="username" placeholder="영문 소문자·숫자·_ 3~16자" autocapitalize="off" spellcheck="false"></label>' +
      '<label>비밀번호<input name="pw" type="password" required minlength="8" autocomplete="new-password" placeholder="8자 이상"></label>' +
      '<label>비밀번호 확인<input name="pw2" type="password" required minlength="8" autocomplete="new-password"></label>' +
      '<label>복구 이메일<input name="email" type="email" required autocomplete="email" placeholder="비밀번호를 잊었을 때 쓰는 주소"></label>' +
      '<p class="muted sm">가입하면 아이디·이메일과 이 사이트의 설정·기록(싱크로 입력값, 티어표, 가챠 보관함 등)이 서버에 저장되고, 다른 기기에서 로그인하면 이어서 쓸 수 있습니다. 계정을 삭제하면 서버의 정보는 모두 지워집니다.</p>' +
      '<button type="submit" class="primary pad">가입하기</button></form>';
  } else if (view === 'reset') {
    body.innerHTML = '<form class="acct-f" data-f="reset"><label>복구 이메일<input name="email" type="email" required autocomplete="email"></label><p class="muted sm">가입할 때 등록한 이메일로 비밀번호 재설정 링크를 보냅니다.</p><button type="submit" class="primary pad">재설정 메일 보내기</button></form><p class="acct-sub"><button type="button" class="linkbtn" data-v="login">로그인으로 돌아가기</button></p>';
  } else {
    body.innerHTML = seg + '<form class="acct-f" data-f="login" autocomplete="on">' +
      '<label>아이디 또는 이메일<input name="id" required autocomplete="username" autocapitalize="off" spellcheck="false"></label>' +
      '<label>비밀번호<input name="pw" type="password" required autocomplete="current-password"></label>' +
      '<button type="submit" class="primary pad">로그인</button></form>' +
      '<div class="acct-or"><span>또는</span></div><button type="button" class="ghost pad acct-g" data-a="google">' + GLOGO + ' 구글로 시작하기</button>' +
      '<p class="muted sm acct-gnote">처음이면 바로 가입되고, 이미 가입했다면 로그인됩니다.</p>' +
      '<p class="acct-sub"><button type="button" class="linkbtn" data-v="reset">비밀번호를 잊으셨나요?</button></p>';
  }
}
function setBtn() {
  const b = $('#btn-acct'); if (!b) return;
  const on = !!(user && profile);
  b.classList.toggle('acct-on', on);
  b.title = on ? '내 계정 (' + shown() + ')' : '로그인'; b.setAttribute('aria-label', b.title);
}

const notify = () => { try { window.dispatchEvent(new CustomEvent('doroacct', { detail: { user: user && profile ? { uid: user.uid, username: profile.username } : null } })); } catch (e) { /* 무시 */ } };
/* ---------- 상태 변화 ---------- */
async function onUser(u) {
  profile = null;
  if (!u) { const m = meta(); if (m.uid) setMeta({}); setBtn(); render(); notify(); return; }
  try {
    const d = docFields(await rest('GET', '/users/' + u.uid, null, await u.getIdToken()));
    if (!d || !d.username) {
      /* 구글로 처음 들어온 계정 → 1클릭 자동 가입 (아이디 자동 지정, 닉네임은 BlaBla 연동 시 인게임 닉네임) */
      if (isGoogle(u) && !hasPw(u)) { profile = await googleSignup(u); setBtn(); render(); msg('구글 계정으로 가입했습니다. 아이디: ' + profile.username); return; }
      return; /* 아이디 회원가입 진행 중: signup()이 프로필을 만든 뒤 다시 부름 */
    }
    profile = d; setMeta(Object.assign(meta(), { uid: u.uid }));
    syncNick(); notify();
    if (Array.isArray(d.hist) && d.hist.length && window.doroHistMerge) window.doroHistMerge(d.hist); /* 서버 자동 기록 합치기 */
    setBtn(); render();
    await reconcile(d);
    undoBar();
    if (window.doroBLAutoSync) window.doroBLAutoSync(); /* 로그인 상태: 하루 1번 BlaBla 자동 재연동 */
  } catch (e) { msg('계정 정보를 불러오지 못했습니다: ' + errMsg(e), 1); }
}

/* ---------- 동기화 ---------- */
let pushT = 0, lastPush = 0, pushing = false;
async function push(force) {
  if (!user || !profile || pushing) return;
  const snap = snapshot(), h = hashOf(snap), m = meta();
  if (!force && h === m.h) return;
  pushing = true;
  try {
    const now = Date.now();
    await rest('PATCH', '/users/' + user.uid + '?updateMask.fieldPaths=data&updateMask.fieldPaths=updatedAt', { fields: fieldsOf({ data: snap, updatedAt: now }) }, await tok());
    setMeta(Object.assign(meta(), { uid: user.uid, ts: now, h })); lastPush = now;
    if (!$('#acct-modal') || !$('#acct-modal').hidden) render();
  } catch (e) { console.warn('[DOROSYNC] 클라우드 저장 실패', e); } finally { pushing = false; }
}
function schedule() {
  if (!user || !profile) return;
  clearTimeout(pushT);
  const wait = Math.max(4000, 15000 - (Date.now() - lastPush));
  pushT = setTimeout(() => push(false), wait);
}
function apply(data, ts) {
  Object.keys(snapshot()).forEach((k) => localStorage.removeItem(k));
  Object.entries(data || {}).forEach(([k, v]) => { if (/^dorosync/.test(k) && typeof v === 'string') localStorage.setItem(k, v); });
  setMeta(Object.assign(meta(), { uid: user.uid, ts, h: hashOf(data || {}) }));
  location.reload();
}
/* ---------- 데이터 선택 되돌리기 ----------
   '어느 데이터를 쓸까요?'에서 버린 쪽을 24시간 보관 → 되돌리면 그 데이터를 이 기기와 클라우드에 다시 씀 */
const UNDO_K = 'dsacct-undo', UNDO_MS = 24 * 3600 * 1000;
function undoSave(kind, data) { try { localStorage.setItem(UNDO_K, JSON.stringify({ at: Date.now(), kind, uid: user && user.uid, data: data || {} })); } catch (e) { /* 용량 초과 등 */ } }
function undoGet() { try { const u = JSON.parse(localStorage.getItem(UNDO_K) || 'null'); if (!u || Date.now() - u.at > UNDO_MS || (user && u.uid !== user.uid)) return null; return u; } catch (e) { return null; } }
function undoClear() { try { localStorage.removeItem(UNDO_K); } catch (e) { /* 무시 */ } const b = document.getElementById('acct-undo'); if (b) b.remove(); }
async function undoRun() {
  const u = undoGet(); if (!u) { undoClear(); return; }
  if (!confirm((u.kind === 'cloud' ? '클라우드 데이터를 고르기 전의 이 기기 데이터' : '덮어쓰기 전의 클라우드 데이터') + '로 되돌릴까요?\n지금 데이터는 그 데이터로 바뀌고, 클라우드에도 저장됩니다.')) return;
  Object.keys(snapshot()).forEach((k) => localStorage.removeItem(k));
  Object.entries(u.data || {}).forEach(([k, v]) => { if (/^dorosync/.test(k) && typeof v === 'string') localStorage.setItem(k, v); });
  undoClear(); await push(true); location.reload();
}
function undoBar() {
  const u = undoGet(); let b = document.getElementById('acct-undo'); if (!u) { if (b) b.remove(); return; }
  if (u.seen && Date.now() - u.seen > 60000) return; /* 안내 바는 처음 1분만, 이후엔 계정 창의 버튼으로 */
  if (!u.seen) { u.seen = Date.now(); try { localStorage.setItem(UNDO_K, JSON.stringify(u)); } catch (e) { /* 무시 */ } }
  if (!b) { b = document.createElement('div'); b.id = 'acct-undo'; b.className = 'acct-undo'; document.body.appendChild(b); }
  b.innerHTML = '<span>' + (u.kind === 'cloud' ? '클라우드 데이터로 바꿨습니다.' : '이 기기 데이터로 클라우드를 덮어썼습니다.') + '</span><button type="button" class="ghost sm" data-u="go">되돌리기</button><button type="button" class="icb sm" data-u="x" aria-label="닫기">×</button>';
  b.querySelector('[data-u="go"]').onclick = () => undoRun();
  b.querySelector('[data-u="x"]').onclick = () => b.remove();
  clearTimeout(undoBar.t); undoBar.t = setTimeout(() => { if (b.isConnected) b.remove(); }, 60000);
}
async function reconcile(d) {
  const cloud = d.data || {}, cts = d.updatedAt || 0, ch = hashOf(cloud);
  const snap = snapshot(), lh = hashOf(snap), m = meta();
  const cloudEmpty = !Object.keys(cloud).length, localEmpty = !Object.keys(snap).length;
  if (ch === lh) { setMeta(Object.assign(m, { uid: user.uid, ts: cts || m.ts, h: lh })); return; }
  if (cloudEmpty) return push(true);
  if (localEmpty) return apply(cloud, cts);
  const localChanged = !m.h || lh !== m.h, cloudNewer = !m.ts || cts > m.ts;
  if (!localChanged && cloudNewer) return apply(cloud, cts);
  if (localChanged && !cloudNewer) return push(true);
  /* 둘 다 바뀜(또는 이 기기 첫 로그인) → 사용자에게 선택 */
  ui(); $('#acct-modal').hidden = false;
  $('#acct-ttl').textContent = '어느 데이터를 쓸까요?';
  $('#acct-body').innerHTML = '<p>이 기기의 데이터와 클라우드에 저장된 데이터가 다릅니다.</p>' +
    '<div class="acct-pick"><button type="button" class="ghost pad" data-a="use-cloud"><b>클라우드 데이터</b><span class="muted sm">마지막 저장 ' + (cts ? new Date(cts).toLocaleString('ko-KR') : '-') + '</span></button>' +
    '<button type="button" class="ghost pad" data-a="use-local"><b>이 기기 데이터</b><span class="muted sm">지금 화면의 입력값으로 클라우드를 덮어씁니다</span></button></div>';
  reconcile.cloud = { cloud, cts };
}

/* ---------- 구글 1클릭 가입 · 닉네임 ---------- */
const blNickname = () => { try { const b = window.doroBL && window.doroBL.data; return (b && b.me && b.me.role) || ''; } catch (e) { return ''; } };
async function googleSignup(u) {
  const t = await u.getIdToken();
  let base = (u.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 11);
  if (base.length < 3) base = (base + 'user').slice(0, 11);
  let name = null;
  for (let i = 0; i < 8 && !name; i++) {
    const c = i === 0 ? base : base + '_' + Math.floor(1000 + Math.random() * 9000);
    try { await rest('POST', '/usernames?documentId=' + c, { fields: fieldsOf({ uid: u.uid }) }, t); name = c; } catch (e) { if (e.status !== 409) throw e; }
  }
  if (!name) throw new Error('아이디를 자동으로 정하지 못했습니다. 다시 시도해 주세요.');
  const now = Date.now(), snap = snapshot(), d = { username: name, email: u.email || '', nickname: blNickname(), createdAt: new Date(now), updatedAt: now, data: snap, wallet: {} };
  await rest('PATCH', '/users/' + u.uid, { fields: fieldsOf(d) }, t);
  setMeta({ uid: u.uid, ts: now, h: hashOf(snap) });
  return d;
}
/* BlaBla 연동으로 인게임 닉네임이 생기거나 바뀌면 계정 닉네임에 반영 */
async function syncNick() {
  if (!user || !profile) return;
  const nk = blNickname(); if (!nk || nk === profile.nickname) return;
  try { await rest('PATCH', '/users/' + user.uid + '?updateMask.fieldPaths=nickname', { fields: fieldsOf({ nickname: nk }) }, await tok()); profile.nickname = nk; setBtn(); render(); } catch (e) { /* 다음 기회에 */ }
}
const shown = () => (profile && (profile.nickname || profile.username)) || '';

/* ---------- 동작 ---------- */
async function signup(f) {
  const id = f.id.value.trim().toLowerCase(), pw = f.pw.value, email = f.email.value.trim();
  if (!ID_RE.test(id)) throw new Error('아이디는 영문 소문자·숫자·밑줄(_) 3~16자로 정해 주세요.');
  if (pw.length < 8) throw new Error('비밀번호는 8자 이상으로 정해 주세요.');
  if (pw !== f.pw2.value) throw new Error('비밀번호 확인이 일치하지 않습니다.');
  if (await rest('GET', '/usernames/' + id)) throw new Error('이미 사용 중인 아이디입니다.');
  const cred = await A.createUserWithEmailAndPassword(auth, email, pw);
  const u = cred.user, t = await u.getIdToken();
  try { await rest('POST', '/usernames?documentId=' + id, { fields: fieldsOf({ uid: u.uid }) }, t); }
  catch (e) { try { await u.delete(); } catch (er) { /* 무시 */ } throw new Error(e.status === 409 ? '이미 사용 중인 아이디입니다.' : '아이디 등록에 실패했습니다: ' + e.message); }
  const now = Date.now(), snap = snapshot();
  await rest('PATCH', '/users/' + u.uid, { fields: fieldsOf({ username: id, email, createdAt: new Date(now), updatedAt: now, data: snap, wallet: {} }) }, t);
  setMeta({ uid: u.uid, ts: now, h: hashOf(snap) });
  try { await A.sendEmailVerification(u); } catch (e) { /* 나중에 다시 보낼 수 있음 */ }
  await onUser(u);
  msg('가입했습니다! ' + email + '로 인증 메일을 보냈어요. 메일의 링크를 누르면 이메일 인증이 끝납니다.');
}
async function login(f) {
  const id = f.id.value.trim(), pw = f.pw.value;
  if (id.includes('@')) { await A.signInWithEmailAndPassword(auth, id, pw); return; }
  const name = id.toLowerCase();
  if (!ID_RE.test(name)) throw new Error('아이디 또는 비밀번호가 맞지 않습니다.');
  let r;
  try { r = await fetch(WORKER + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: name, pw }) }); }
  catch (e) { throw new Error('로그인 서버에 연결하지 못했습니다. 이메일로 로그인해 보세요.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) throw new Error(j.error === 'not_ready' ? '아이디 로그인을 준비 중입니다. 지금은 이메일로 로그인해 주세요.' : j.error === 'too_many' ? '시도가 너무 많습니다. 잠시 후 다시 시도하세요.' : '아이디 또는 비밀번호가 맞지 않습니다.');
  await A.signInWithCustomToken(auth, j.token);
}
async function onSubmit(e) {
  const f = e.target.closest('form.acct-f'); if (!f) return;
  e.preventDefault(); msg(''); busy(true);
  try {
    await boot();
    if (f.dataset.f === 'signup') await signup(f);
    else if (f.dataset.f === 'login') { await login(f); msg('로그인했습니다.'); }
    else if (f.dataset.f === 'reset') { await A.sendPasswordResetEmail(auth, f.email.value.trim()); msg('가입된 이메일이라면 재설정 메일이 곧 도착합니다. 스팸함도 확인해 주세요.'); }
  } catch (er) { msg(errMsg(er), 1); } finally { busy(false); }
}
async function onClick(e) {
  const v = e.target.closest('[data-v]'); if (v && v.closest('#acct-body')) { view = v.dataset.v; msg(''); render(); return; }
  const a = e.target.closest('[data-a]'); if (!a) return;
  const act = a.dataset.a; msg(''); busy(true);
  try {
    await boot();
    if (act === 'google') { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
    else if (act === 'link') { await A.linkWithPopup(user, new A.GoogleAuthProvider()); await user.reload(); msg('구글 계정을 연동했습니다. 이제 구글로도 로그인할 수 있어요.'); render(); }
    else if (act === 'unlink') { await A.unlink(user, 'google.com'); await user.reload(); msg('구글 연동을 해제했습니다.'); render(); }
    else if (act === 'verify') { await A.sendEmailVerification(user); msg('인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 새로고침하면 반영됩니다.'); }
    else if (act === 'setpw') {
      const pw = ($('#acct-newpw') || {}).value || '';
      if (pw.length < 8) throw new Error('비밀번호는 8자 이상으로 정해 주세요.');
      await A.linkWithCredential(user, A.EmailAuthProvider.credential(user.email, pw)); await user.reload();
      msg('비밀번호를 설정했습니다. 이제 아이디 ' + profile.username + ' + 비밀번호로도 로그인할 수 있어요.'); render();
    }
    else if (act === 'pwreset') { await A.sendPasswordResetEmail(auth, user.email); msg(user.email + '로 비밀번호 변경 링크를 보냈습니다.'); }
    else if (act === 'sync') { await push(true); msg('클라우드에 저장했습니다.'); }
    else if (act === 'pull') { const d = docFields(await rest('GET', '/users/' + user.uid, null, await tok())); if (d && d.data) apply(d.data, d.updatedAt || Date.now()); }
    else if (act === 'use-cloud') { const c = reconcile.cloud; if (c) { undoSave('cloud', snapshot()); apply(c.cloud, c.cts); } }
    else if (act === 'use-local') { const c = reconcile.cloud; if (c) undoSave('local', c.cloud); await push(true); close(); undoBar(); }
    else if (act === 'undo-pick') await undoRun();
    else if (act === 'logout') { await push(false); await A.signOut(auth); view = 'login'; msg('로그아웃했습니다. 이 기기의 데이터는 그대로 남아 있습니다.'); }
    else if (act === 'delete') {
      if (!confirm('정말 계정을 삭제할까요? 서버의 모든 정보가 지워지고 되돌릴 수 없습니다.')) return;
      const t = await tok(), name = profile.username;
      await rest('DELETE', '/usernames/' + name, null, t);
      await rest('DELETE', '/users/' + user.uid, null, t);
      await user.delete();
      setMeta({}); msg('계정을 삭제했습니다.');
    }
  } catch (er) { msg(errMsg(er), 1); } finally { busy(false); }
}

/* ---------- 시작 ---------- */
(function start() {
  ui();
  /* 로컬 저장이 바뀌면 잠시 뒤 클라우드에 저장 */
  const set = Storage.prototype.setItem, del = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage && /^dorosync/.test(k)) { schedule(); if (k === 'dorosync-bl-v1') setTimeout(syncNick, 500); } };
  Storage.prototype.removeItem = function (k) { del.call(this, k); if (this === localStorage && /^dorosync/.test(k)) schedule(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(false); });
  /* 로그인한 적이 있는 기기만 바로 인증 모듈을 불러옴 (처음 방문자는 버튼을 누를 때) */
  if (meta().uid) boot().catch(() => { /* 오프라인 등 */ });
  window.doroAccount = {
    open, boot,
    get user() { return user && profile ? { uid: user.uid, username: profile.username } : null; },
    get doc() { return profile; },
    token: () => tok(),
    /* 내 문서의 일부 필드 저장: patch({ auto: {...}, autoDue: '...' }) */
    async patch(obj) {
      if (!user || !profile) throw new Error('login');
      const q = Object.keys(obj).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
      await rest('PATCH', '/users/' + user.uid + '?' + q, { fields: fieldsOf(obj) }, await tok());
      Object.assign(profile, obj); notify();
    },
    async reload() { if (!user) return null; const d = docFields(await rest('GET', '/users/' + user.uid, null, await tok())); if (d) { profile = Object.assign(profile || {}, d); notify(); } return profile; },
  };
})();
