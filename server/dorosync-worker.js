/**
 * DOROSYNC 중계 서버 (Cloudflare Worker)
 *
 * 사용: GET /sync?openid=<블라블라링크 프로필 openid 또는 공유 링크>&area=<서버 번호>
 *   서버 번호: 83 한국 · 81 일본 · 84 글로벌 · 82 북미 · 85 동남아
 * 응답: DOROSYNC 연동 데이터 { area, me, clear, nikkes }
 *
 * 필요한 설정 (Cloudflare 대시보드 → Worker → 설정 → 변수 및 비밀):
 *   BLA_COOKIE    (비밀/Secret) 운영자 블라블라링크 로그인 쿠키. 만료되면 다시 넣어야 합니다.
 *   FIREBASE_SA   (비밀/Secret) Firebase 서비스 계정 키(JSON 전체). 아이디 로그인(/login)에 사용.
 *   ALLOW_ORIGINS (텍스트, 선택) 호출을 허용할 사이트 주소. 쉼표로 구분.
 *
 * 예약 실행(Cron, 트리거 이벤트에 등록): 매 2분, UTC 20시대 = 한국 오전 5시~6시
*   cron "매 2분, 20시(UTC)" → 매일 자동 기록(AUTO)을 켠 유저의 싱크로·전초기지 레벨을 계정 기록(hist)에 추가
 *                 비워 두면 기본값(아래 DEFAULT_ORIGINS)만 허용합니다.
 *
 * 다른 사람의 정보는 그 사람이 블라블라링크에서 "공개"로 설정했을 때만 받을 수 있습니다.
 */

const API = 'https://api.blablalink.com/api/game/proxy/Game/';
const DEFAULT_ORIGINS = ['https://levelinfinikke.github.io'];
const CACHE_SEC = 300; // 같은 계정을 5분 안에 다시 요청하면 저장해 둔 결과를 돌려줌
const AREAS = [81, 82, 83, 84, 85];

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(autoRecord(env)); },
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    const allow = (env.ALLOW_ORIGINS ? env.ALLOW_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ORIGINS);
    const okOrigin = allow.includes(origin) || /^https:\/\/[0-9a-f-]+\.frame\.claudeusercontent\.com$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allow[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const out = (status, body, extra) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...(extra || {}) },
    });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (url.pathname === '/chips') {
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      if (!okOrigin) return out(403, { ok: false, error: 'origin' });
      return chipsClaim(req, env, out);
    }
    if (url.pathname === '/login') {
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      if (!okOrigin) return out(403, { ok: false, error: 'origin' });
      return idLogin(req, env, out);
    }
    if (req.method !== 'GET') return out(405, { ok: false, error: 'method' });
    if (url.pathname === '/' || url.pathname === '/health') {
      let auto = null; /* 마지막 자동 기록(AUTO) 실행 결과: 성공·실패 수와 오류 코드 */
      try { if (env.FIREBASE_SA) { const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore'); const d = await (await fetch(FS + '/meta/autoRun', { headers: { Authorization: 'Bearer ' + at } })).json(); auto = d && d.fields ? dec({ mapValue: { fields: d.fields } }) : null; } } catch (e) { auto = { err: 'read' }; }
      return out(200, { ok: true, cookie: !!env.BLA_COOKIE, login: !!env.FIREBASE_SA, auto });
    }
    if (!okOrigin) return out(403, { ok: false, error: '허용되지 않은 사이트입니다.' });
    if (url.pathname !== '/sync') return out(404, { ok: false, error: 'not found' });

    const area = Number(url.searchParams.get('area'));
    if (!AREAS.includes(area)) return out(400, { ok: false, error: '서버(area)를 확인해 주세요.' });
    const id = toIntlId(url.searchParams.get('openid'));
    if (!id) return out(400, { ok: false, error: '프로필 링크 또는 계정 ID를 확인해 주세요.' });
    if (!env.BLA_COOKIE) return out(500, { ok: false, error: '서버에 로그인 쿠키(BLA_COOKIE)가 설정되지 않았습니다.' });

    // 캐시: 같은 계정·서버는 5분 동안 저장된 결과 사용 (블라블라링크 호출 수 절약)
    const cache = caches.default;
    const key = new Request('https://cache.dorosync/sync/' + area + '/' + id);
    const hit = await cache.match(key);
    if (hit) { const b = await hit.text(); return new Response(b, { headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, 'X-Cache': 'HIT' } }); }

    try {
      const data = await sync(id, area, env.BLA_COOKIE);
      const body = JSON.stringify({ ok: true, ...data });
      ctx.waitUntil(cache.put(key, new Response(body, { headers: { 'Cache-Control': 'max-age=' + CACHE_SEC } })));
      return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, 'X-Cache': 'MISS' } });
    } catch (e) {
      const m = String((e && e.message) || e);
      const st = m === 'LOGIN' ? 503 : m === 'PRIVATE' ? 403 : m === 'BUSY' ? 429 : 502;
      const msg = m === 'LOGIN' ? '중계 서버의 로그인 정보가 만료되었습니다. 운영자에게 알려 주세요.'
        : m === 'PRIVATE' ? '정보를 찾지 못했습니다. 서버 선택, 프로필 주소, 블라블라링크 공개 설정을 확인해 주세요.'
        : m === 'BUSY' ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
        : '블라블라링크에서 정보를 받지 못했습니다. (' + m + ')';
      return out(st, { ok: false, code: m, error: msg });
    }
  },
};

/* 프로필 openid(base64 "게임ID-계정번호") 또는 공유 링크 → 계정번호(intl_open_id) */
function toIntlId(v) {
  v = String(v || '').trim();
  if (!v) return '';
  const m = v.match(/[?&]openid=([^&#\s]+)/i);
  if (m) v = m[1];
  try { v = decodeURIComponent(v); } catch (e) { /* 그대로 */ }
  if (/^\d{6,25}$/.test(v)) return v;
  try {
    const s = atob(v.replace(/-/g, '+').replace(/_/g, '/'));
    const n = s.split('-').pop();
    if (/^\d{6,25}$/.test(n)) return n;
  } catch (e) { /* 잘못된 값 */ }
  return '';
}

async function post(name, body, cookie) {
  for (let t = 0; t < 3; t++) {
    const r = await fetch(API + name, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/',
        'User-Agent': 'Mozilla/5.0 (DOROSYNC relay)',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const code = String(j && j.code);
    if (code === '0') return j.data || {};
    if (code === '1300015') { await new Promise((ok) => setTimeout(ok, 1500)); continue; } // 요청 과다
    if (code === '300001') throw new Error('LOGIN');            // game not login
    if (code === '1303002') throw new Error('PRIVATE');         // 비공개 또는 없는 계정
    throw new Error(code + ' ' + ((j && (j.msg || j.message)) || ''));
  }
  throw new Error('BUSY');
}

async function sync(id, area, cookie) {
  const q = { intl_open_id: id, nikke_area_id: area };
  const [basic, outpost, chars] = await Promise.all([
    post('GetUserProfileBasicInfo', q, cookie),
    post('GetUserProfileOutpostInfo', q, cookie),
    post('GetUserCharacters', q, cookie),
  ]);
  const base = {};
  (chars.characters || []).forEach((c) => { base[String(c.name_code)] = c; });
  const codes = Object.keys(base);
  if (!codes.length) throw new Error('PRIVATE');

  // 장비 상세: 40명씩 (요청 1회당 하위 요청 50개 제한 안쪽)
  const groups = [];
  for (let i = 0; i < codes.length; i += 40) groups.push(codes.slice(i, i + 40).map(Number));
  const details = [];
  for (const g of groups) {
    const d = await post('GetUserCharacterDetails', { ...q, name_codes: g }, cookie);
    (d.character_details || []).forEach((x) => details.push(x));
  }

  const slots = ['head', 'torso', 'arm', 'leg'];
  const nikkes = details.map((c) => {
    const b0 = base[String(c.name_code)] || {};
    const n = (k) => Number(c[k]) || Number(b0[k]) || 0;
    const parts = {}, eq = {};
    slots.forEach((s) => {
      parts[s] = [1, 2, 3].map((i) => Number(c[s + '_equip_option' + i + '_id']) || 0);
      eq[s] = n(s + '_equip_lv');
    });
    return {
      code: String(c.name_code), name: '', combat: n('combat'), lv: n('lv'), core: n('core'), grade: n('grade'),
      sk: [n('skill1_lv'), n('skill2_lv'), n('ulti_skill_lv')], eq,
      fav: { tid: n('favorite_item_tid'), lv: n('favorite_item_lv') }, parts,
    };
  });

  const bi = basic.basic_info || {}, oi = outpost.outpost_info || {};
  // 1군 전투력: 연동 스크립트와 같게 전투력 상위 5명 합산
  const top5 = nikkes.map((x) => x.combat).sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
  return {
    area,
    me: { role: String(bi.nickname || bi.role_name || ''), synchro: Number(oi.synchro_level) || 0, outpost: Number(oi.outpost_battle_level) || 0, top5 },
    clear: null, // 클리어 덱(GetMainQuestClearLineup)은 로그인 본인 것만 조회 가능 → 진행도만 전달
    progress: { normal: Number(bi.progress_normal_campaign) || 0, hard: Number(bi.progress_hard_campaign) || 0 },
    src: 'relay',
    nikkes,
  };
}


/* ================= 아이디 로그인 (Firebase) =================
 * 1) usernames/{아이디} → uid (공개 문서)
 * 2) users/{uid}.email  (서비스 계정 권한으로 읽음 — 이메일은 응답에 넣지 않음)
 * 3) 이메일+비밀번호를 Firebase에 확인
 * 4) 맞으면 그 uid의 커스텀 토큰을 발급 → 사이트가 signInWithCustomToken으로 로그인
 */
const FB_PROJECT = 'dorosync-2b9f5';
const FB_API_KEY = 'AIzaSyC8UPIEelNUmd4XSDTJ4aX4BgYq5YOOSK0'; // 웹 공개용 키(비밀 아님)
const FS = 'https://firestore.googleapis.com/v1/projects/' + FB_PROJECT + '/databases/(default)/documents';
const ID_RE = /^[a-z0-9_]{3,16}$/;
const tries = new Map(); // 같은 작업 단위 안에서의 간단한 시도 제한(IP별 1분 10회)

async function idLogin(req, env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  const ip = req.headers.get('CF-Connecting-IP') || '?', now = Date.now();
  const t = (tries.get(ip) || []).filter((x) => now - x < 60000); t.push(now); tries.set(ip, t);
  if (t.length > 10) return out(429, { ok: false, error: 'too_many' });
  let body; try { body = await req.json(); } catch (e) { return out(400, { ok: false, error: 'bad' }); }
  const id = String(body.id || '').toLowerCase(), pw = String(body.pw || '');
  const fail = () => out(401, { ok: false, error: 'invalid' });
  if (!ID_RE.test(id) || !pw) return fail();
  try {
    const sa = JSON.parse(env.FIREBASE_SA);
    const un = await (await fetch(FS + '/usernames/' + id)).json();
    const uid = un && un.fields && un.fields.uid && un.fields.uid.stringValue; if (!uid) return fail();
    const at = await saToken(sa, 'https://www.googleapis.com/auth/datastore');
    const ud = await (await fetch(FS + '/users/' + uid, { headers: { Authorization: 'Bearer ' + at } })).json();
    const email = ud && ud.fields && ud.fields.email && ud.fields.email.stringValue; if (!email) return fail();
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FB_API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: false }),
    });
    const j = await r.json();
    if (!r.ok) return (j.error && /TOO_MANY/.test(j.error.message || '')) ? out(429, { ok: false, error: 'too_many' }) : fail();
    if (j.localId !== uid) return fail();
    return out(200, { ok: true, token: await customToken(sa, uid) });
  } catch (e) {
    return out(500, { ok: false, error: 'server' });
  }
}

/* ---- 서비스 계정 JWT (RS256) ---- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
let keyCache = null;
async function signJwt(sa, payload) {
  if (!keyCache || keyCache.id !== sa.private_key_id) {
    const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    keyCache = { id: sa.private_key_id, key: await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']) };
  }
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id }));
  const data = head + '.' + b64uStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyCache.key, new TextEncoder().encode(data));
  return data + '.' + b64u(sig);
}
let atCache = null;
async function saToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  if (atCache && atCache.exp - 60 > now) return atCache.token;
  const jwt = await signJwt(sa, { iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  const j = await r.json(); if (!j.access_token) throw new Error('sa token');
  atCache = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return atCache.token;
}
function customToken(sa, uid) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(sa, { iss: sa.client_email, sub: sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid });
}


/* ================= 매일 자동 기록 (AUTO) =================
 * users 문서: auto {on, area, openid, since, last}, autoDue "YYYY-MM-DD"(한국 날짜, 이 날짜 이하면 처리 대상), hist [{d,s,o}]
 * 한 번 실행에 최대 BATCH명. 무료 요금제의 외부 요청 한도(50) 안: 조회 2 + 1명당 2(블라블라 1 + 저장 1) */
const BATCH = 20;
const kstDay = (ms) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
const fsv = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsv(x)])) } };
};
async function autoRecord(env) {
  if (!env.FIREBASE_SA || !env.BLA_COOKIE) return;
  const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore');
  const H = { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' };
  const today = kstDay(Date.now()), tomorrow = kstDay(Date.now() + 86400000);
  const q = await fetch(FS + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'autoDue' }, op: 'GREATER_THAN', value: { stringValue: '' } } },
      { fieldFilter: { field: { fieldPath: 'autoDue' }, op: 'LESS_THAN_OR_EQUAL', value: { stringValue: today } } },
    ] } },
    limit: BATCH,
  } }) });
  const rows = (await q.json()).filter((r) => r.document);
  const run = { at: Date.now(), n: rows.length, ok: 0, fail: 0, codes: {}, stop: '' };
  for (const r of rows) {
    const doc = r.document, f = doc.fields || {}, au = (f.auto && f.auto.mapValue && f.auto.mapValue.fields) || {};
    const area = Number(au.area && au.area.stringValue), id = toIntlId(au.openid && au.openid.stringValue);
    let last, entry = null;
    try {
      if (!(au.on && au.on.booleanValue) || !AREAS.includes(area) || !id) throw new Error('CFG');
      const oi = (await post('GetUserProfileOutpostInfo', { intl_open_id: id, nikke_area_id: area }, env.BLA_COOKIE)).outpost_info || {};
      const s = Number(oi.synchro_level) || 0, o = Number(oi.outpost_battle_level) || 0;
      if (!s) throw new Error('NOLEVEL');
      entry = { d: today, s, o }; last = { at: Date.now(), ok: true, s, o };
    } catch (e) {
      const m = String((e && e.message) || e), code = errCode(m);
      last = { at: Date.now(), ok: false, code, err: ERR_TXT[code] || m.slice(0, 80) };
      run.fail++; run.codes[code] = (run.codes[code] || 0) + 1;
      if (code === 'E_LOGIN') { run.stop = code; break; } /* 운영자 쿠키 만료: 오늘은 중단 (autoDue 그대로 → 쿠키 갱신 후 다시 처리) */
      /* 같은 서버 오류가 연달아 나면 개인 문제가 아니라 전체 장애 → 중단하고 다음 실행에서 다시 */
      if (/^E_(HTTP|API|NET)/.test(code) && run.codes[code] >= 3 && run.ok === 0) { run.stop = code; break; }
    }
    if (entry) run.ok++;
    const w = { update: { name: doc.name, fields: { autoDue: fsv(tomorrow), auto: { mapValue: { fields: { last: fsv(last) } } } } }, updateMask: { fieldPaths: ['autoDue', 'auto.last'] } };
    if (entry) w.updateTransforms = [{ fieldPath: 'hist', appendMissingElements: { values: [fsv(entry)] } }];
    await fetch(FS.replace(/\/documents$/, '/documents:commit'), { method: 'POST', headers: H, body: JSON.stringify({ writes: [w] }) });
  }
  if (rows.length || run.stop) { /* 실행 결과를 meta/autoRun에 남김 → /health 에서 확인 */
    const fields = { at: fsv(run.at), n: fsv(run.n), ok: fsv(run.ok), fail: fsv(run.fail), stop: fsv(run.stop), codes: fsv(run.codes) };
    await fetch(FS + '/meta/autoRun', { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) }).catch(() => {});
  }
}
/* 오류 코드(파악용): E_LOGIN 쿠키 만료 · E_PRIVATE 비공개/없는 계정 · E_BUSY 요청 과다 · E_HTTP_### 블라블라 응답 오류 · E_API_### 블라블라 오류 코드 · E_NET 연결 실패 · E_CFG 설정 없음 · E_NOLEVEL 레벨 정보 없음 */
const ERR_TXT = { E_LOGIN: '중계 서버 로그인 만료', E_PRIVATE: '비공개 또는 없는 계정', E_BUSY: '요청 과다', E_CFG: 'AUTO 설정 없음', E_NOLEVEL: '레벨 정보 없음', E_NET: '블라블라링크 연결 실패' };
function errCode(m) {
  if (m === 'LOGIN') return 'E_LOGIN'; if (m === 'PRIVATE') return 'E_PRIVATE'; if (m === 'BUSY') return 'E_BUSY'; if (m === 'CFG') return 'E_CFG'; if (m === 'NOLEVEL') return 'E_NOLEVEL';
  let x = m.match(/^HTTP (\d+)/); if (x) return 'E_HTTP_' + x[1];
  x = m.match(/^(\d{3,})\s/); if (x) return 'E_API_' + x[1];
  if (/fetch|network|connect/i.test(m)) return 'E_NET';
  return 'E_OTHER';
}
const dec = (v) => {
  if (!v) return null; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = dec(x); }); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); return null;
};

/* ================= 도로칩 지급 검증 =================
 * 사이트가 칩을 얻을 때마다 기록(source·종류·개수·시각)을 모아 보냄 → 서버가 검사 후 계정의 chipsV에 더함.
 * 계정 문서의 chipsV(검증된 잔고)·chipDay(하루 사용량)는 서버만 쓸 수 있음(Firestore 규칙).
 * 검사: 로그인 토큰 확인 · 출처별 허용 종류 · 1회 요청 최대 건수 · 하루 상한(도로칩 환산 · 무지개 따로) · 시각이 미래/너무 과거면 거절 */
const CHIP_VAL = { b: 1, s: 5, g: 10 }, CHIP_SRC = { ssr: 'bsgr', label: 'b', cap: 'bsg', streak: 'bs', guest: 'bsgr' };
const DAY_CAP_D = 3000, DAY_CAP_R = 20, MAX_EV = 300, GUEST_CAP_D = 3000, GUEST_CAP_R = 20;
async function chipsClaim(req, env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  const idt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idt) return out(401, { ok: false, error: 'auth' });
  const lk = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idt }) })).json();
  const uid = lk && lk.users && lk.users[0] && lk.users[0].localId; if (!uid) return out(401, { ok: false, error: 'auth' });
  let body; try { body = await req.json(); } catch (e) { return out(400, { ok: false, error: 'bad' }); }
  const evs = Array.isArray(body.events) ? body.events.slice(0, MAX_EV) : [];
  const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore'), H = { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const dr = await fetch(FS + '/users/' + uid, { headers: H }); if (dr.status === 404) return out(404, { ok: false, error: 'nouser' });
    const doc = await dr.json(), f = doc.fields || {}, today = kstDay(Date.now());
    let cv = dec(f.chipsV) || null; const old = dec(f.chips) || {};
    if (!cv) cv = { d: Math.max(0, Math.floor(+old.d || 0)), r: Math.max(0, Math.floor(+old.r || 0)) }; /* 처음 1회: 검증 전에 모아 둔 계정 잔고는 그대로 옮김 */
    let day = dec(f.chipDay) || {}; if (day.d !== today) day = { d: today, n: 0, r: 0, g: 0 };
    let okD = 0, okR = 0, rej = 0; const now = Date.now();
    for (const e of evs) {
      const k = String(e && e.k || ''), n = Math.floor(+(e && e.n) || 0), src = String(e && e.src || ''), t = +(e && e.t) || 0;
      const allow = CHIP_SRC[src] || ''; if (!allow.includes(k) || n < 1 || n > 500 || t > now + 120000 || t < now - 3 * 86400000) { rej++; continue; }
      if (k === 'r') { const cap = src === 'guest' ? GUEST_CAP_R : DAY_CAP_R; const room = (src === 'guest' ? cap : cap - day.r); const m = Math.max(0, Math.min(n, room)); if (src !== 'guest') day.r += m; okR += m; if (m < n) rej++; continue; }
      const v = CHIP_VAL[k] * n, room = src === 'guest' ? Math.max(0, GUEST_CAP_D - (day.g || 0)) : Math.max(0, DAY_CAP_D - day.n), m = Math.min(v, room);
      if (src === 'guest') day.g = (day.g || 0) + m; else day.n += m; okD += m; if (m < v) rej++;
    }
    const nv = { d: cv.d + okD, r: cv.r + okR };
    const w = { update: { name: doc.name, fields: { chipsV: fsv(nv), chipDay: fsv(day) } }, updateMask: { fieldPaths: ['chipsV', 'chipDay'] }, currentDocument: { updateTime: doc.updateTime } };
    const cr = await fetch(FS.replace(/\/documents$/, '/documents:commit'), { method: 'POST', headers: H, body: JSON.stringify({ writes: [w] }) });
    if (cr.ok) return out(200, { ok: true, chips: nv, added: { d: okD, r: okR }, rejected: rej, day: { used: day.n, cap: DAY_CAP_D, r: day.r, capR: DAY_CAP_R } });
    if (cr.status !== 400 && cr.status !== 409) return out(502, { ok: false, error: 'write' }); /* 400/409: 그 사이 문서가 바뀜 → 다시 */
  }
  return out(409, { ok: false, error: 'busy' });
}
