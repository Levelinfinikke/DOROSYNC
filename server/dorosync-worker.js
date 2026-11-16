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
    if (url.pathname === '/raid') {
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      if (!okOrigin) return out(403, { ok: false, error: 'origin' });
      return raid(req, env, out);
    }
    if (url.pathname === '/feedback') { if (req.method !== 'POST') return out(405, { ok: false, error: 'method' }); if (!okOrigin) return out(403, { ok: false, error: 'origin' }); return feedback(req, env, out); }
    if (url.pathname === '/config') { if (req.method !== 'GET') return out(405, { ok: false, error: 'method' }); return siteConfig(env, out); }
    if (url.pathname.startsWith('/img/')) { if (req.method !== 'GET') return out(405, { ok: false, error: 'method' }); return siteImg(url.pathname.slice(5), env, out); }
    if (url.pathname === '/admin') { if (!okOrigin) return out(403, { ok: false, error: '허용되지 않은 사이트입니다.' }); return adminView(req, env, out); }
    if (req.method !== 'GET') return out(405, { ok: false, error: 'method' });
    if (url.pathname === '/' || url.pathname === '/health') {
      let auto = null; /* 마지막 자동 기록(AUTO) 실행 결과: 성공·실패 수와 오류 코드 */
      try { if (env.FIREBASE_SA) { const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore'); const d = await (await fetch(FS + '/meta/autoRun', { headers: { Authorization: 'Bearer ' + at } })).json(); auto = d && d.fields ? dec({ mapValue: { fields: d.fields } }) : null; } } catch (e) { auto = { err: 'read' }; }
      return out(200, { ok: true, cookie: !!env.BLA_COOKIE, login: !!env.FIREBASE_SA, auto });
    }
    if (!okOrigin) return out(403, { ok: false, error: '허용되지 않은 사이트입니다.' });
    if (url.pathname === '/check') { /* 자동 기록 설정 전 확인: 서버별 닉네임·레벨 (닉네임 비공개여도 레벨만 나오면 기록 가능) */
      const id = toIntlId(url.searchParams.get('openid'));
      if (!id) return out(400, { ok: false, error: 'OPENID' });
      if (!env.BLA_COOKIE) return out(500, { ok: false, error: 'CFG' });
      const res = [];
      for (const ar of AREAS) {
        const q = { intl_open_id: id, nikke_area_id: ar };
        try {
          const oi = (await post('GetUserProfileOutpostInfo', q, env.BLA_COOKIE)).outpost_info || {}, s = Number(oi.synchro_level) || 0;
          if (!s) continue;
          let role = ''; try { const bi = (await post('GetUserProfileBasicInfo', q, env.BLA_COOKIE)).basic_info || {}; role = String(bi.nickname || bi.role_name || ''); } catch (e) { /* 닉네임 없음 */ }
          res.push({ area: ar, role, s, o: Number(oi.outpost_battle_level) || 0 });
        } catch (e) { if (/^LOGIN/.test(String(e && e.message))) return out(503, { ok: false, error: 'LOGIN' }); }
      }
      return out(200, { ok: true, res });
    }
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
    let last, entry = null, fixArea = 0;
    try {
      if (!(au.on && au.on.booleanValue) || !AREAS.includes(area)) throw new Error('CFG');
      if (!id) throw new Error('OPENID'); /* 저장된 프로필 주소가 공유 링크·계정 ID 형식이 아님 (닉네임 등) */
      const lv = async (ar) => { const oi = (await post('GetUserProfileOutpostInfo', { intl_open_id: id, nikke_area_id: ar }, env.BLA_COOKIE)).outpost_info || {}; return [Number(oi.synchro_level) || 0, Number(oi.outpost_battle_level) || 0]; };
      let s = 0, o = 0;
      try { [s, o] = await lv(area); } catch (e1) { if (!/^(114002|1302125)\s/.test(String(e1 && e1.message))) throw e1; }
      if (!s) { /* 서버를 잘못 고른 경우(기본값 한국 그대로 등): 다른 서버에서 찾으면 서버 설정도 바로잡음 */
        for (const ar of AREAS) { if (ar === area) continue; try { const [s2, o2] = await lv(ar); if (s2 > s) { s = s2; o = o2; fixArea = ar; } } catch (e2) { /* 다음 서버 */ } } /* 빈 계정(레벨 1)보다 실제로 키운 서버 우선 */
      }
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
    const af = { last: fsv(last) }; if (fixArea) af.area = { stringValue: String(fixArea) };
    const w = { update: { name: doc.name, fields: { autoDue: fsv(tomorrow), auto: { mapValue: { fields: af } } } }, updateMask: { fieldPaths: ['autoDue', 'auto.last'].concat(fixArea ? ['auto.area'] : []) } };
    if (entry) w.updateTransforms = [{ fieldPath: 'hist', appendMissingElements: { values: [fsv(entry)] } }];
    await fetch(FS.replace(/\/documents$/, '/documents:commit'), { method: 'POST', headers: H, body: JSON.stringify({ writes: [w] }) });
  }
  if (rows.length || run.stop) { /* 실행 결과를 meta/autoRun에 남김 → /health 에서 확인 */
    const fields = { at: fsv(run.at), n: fsv(run.n), ok: fsv(run.ok), fail: fsv(run.fail), stop: fsv(run.stop), codes: fsv(run.codes) };
    await fetch(FS + '/meta/autoRun', { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) }).catch(() => {});
  }
}
/* 오류 코드(파악용): E_LOGIN 쿠키 만료 · E_PRIVATE 비공개/없는 계정 · E_BUSY 요청 과다 · E_HTTP_### 블라블라 응답 오류 · E_API_### 블라블라 오류 코드 · E_NET 연결 실패 · E_CFG 설정 없음 · E_OPENID 프로필 주소 형식 오류 · E_NOLEVEL 레벨 정보 없음 */
const ERR_TXT = { E_LOGIN: '중계 서버 로그인 만료', E_PRIVATE: '비공개 또는 없는 계정', E_BUSY: '요청 과다', E_CFG: 'AUTO 설정 없음', E_OPENID: '프로필 주소 형식 오류 (공유 링크를 다시 넣어 주세요)', E_NOLEVEL: '레벨 정보 없음', E_NET: '블라블라링크 연결 실패' };
function errCode(m) {
  if (m === 'LOGIN') return 'E_LOGIN'; if (m === 'PRIVATE') return 'E_PRIVATE'; if (m === 'BUSY') return 'E_BUSY'; if (m === 'CFG') return 'E_CFG'; if (m === 'OPENID') return 'E_OPENID'; if (m === 'NOLEVEL') return 'E_NOLEVEL';
  let x = m.match(/^HTTP (\d+)/); if (x) return 'E_HTTP_' + x[1];
  x = m.match(/^(\d{3,})\s/); if (x) return 'E_API_' + x[1];
  if (/fetch|network|connect/i.test(m)) return 'E_NET';
  return 'E_OTHER';
}
const dec = (v) => {
  if (!v) return null; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = dec(x); }); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); return null;
};

/* ================= 싱크칩 지급 검증 =================
 * 사이트가 칩을 얻을 때마다 기록(source·종류·개수·시각)을 모아 보냄 → 서버가 검사 후 계정의 chipsV에 더함.
 * 계정 문서의 chipsV(검증된 잔고)·chipDay(하루 사용량)는 서버만 쓸 수 있음(Firestore 규칙).
 * 검사: 로그인 토큰 확인 · 출처별 허용 종류 · 1회 요청 최대 건수 · 시각이 미래/너무 과거면 거절
 * 하루 지급 상한 없음(비회원 칩 옮기기만 상한). daily(출석 100)는 하루(한국 시간) 한 번. spend(DORO MODE 뽑기)는 잔고에서 뺌(0 아래로는 안 내려감) */
const CHIP_VAL = { b: 1, s: 5, g: 10 }, CHIP_SRC = { ssr: 'bsgr', label: 'b', cap: 'bsgr', streak: 'bsgr', guest: 'bsgr', daily: 'b', spend: 'b' };
const MAX_EV = 300, GUEST_CAP_D = 3000, GUEST_CAP_R = 5, DAILY_D = 100;
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
    let day = dec(f.chipDay) || {}; if (day.d !== today) day = { d: today, n: 0, r: 0, g: 0, a: 0 };
    let okD = 0, okR = 0, rej = 0; const now = Date.now(); let idleT = +dec(f.idleT) || 0, idleSet = false;
    for (const e of evs) {
      const k = String(e && e.k || ''), n = Math.floor(+(e && e.n) || 0), src = String(e && e.src || ''), t = +(e && e.t) || 0;
      if (src === 'idle') { /* 싱크칩 상자: 1분에 1개, 최대 10,000. 보낸 수량은 믿지 않고 마지막 수령 시각으로 계산(첫 수령만 최대 1,000까지 인정) */
        if (idleSet) { rej++; continue; } const m = idleT ? Math.min(10000, Math.floor((now - idleT) / 60000)) : Math.max(0, Math.min(1000, n)); if (idleT && m < 1) { rej++; continue; } okD += m; idleT = now; idleSet = true; continue; }
      const allow = CHIP_SRC[src] || ''; if (!allow.includes(k) || n < 1 || n > 500 || t > now + 120000 || t < now - 3 * 86400000) { rej++; continue; }
      if (src === 'spend') { const m = Math.min(n, cv.d + okD); okD -= m; day.s = (day.s || 0) + m; continue; } /* 뽑기에 쓴 칩 */
      if (src === 'daily') { if (day.a) { rej++; continue; } day.a = 1; okD += DAILY_D; continue; } /* 출석: 하루 한 번 100 */
      if (k === 'r') { const m = src === 'guest' ? Math.max(0, Math.min(n, GUEST_CAP_R - (day.gr || 0))) : n; if (src === 'guest') day.gr = (day.gr || 0) + m; else day.r += m; okR += m; if (m < n) rej++; continue; }
      const v = CHIP_VAL[k] * n, m = src === 'guest' ? Math.min(v, Math.max(0, GUEST_CAP_D - (day.g || 0))) : v;
      if (src === 'guest') day.g = (day.g || 0) + m; else day.n += m; okD += m; if (m < v) rej++;
    }
    const nv = { d: Math.max(0, cv.d + okD), r: cv.r + okR };
    const w = { update: { name: doc.name, fields: Object.assign({ chipsV: fsv(nv), chipDay: fsv(day) }, idleSet ? { idleT: fsv(idleT) } : {}) }, updateMask: { fieldPaths: ['chipsV', 'chipDay'].concat(idleSet ? ['idleT'] : []) }, currentDocument: { updateTime: doc.updateTime } };
    const cr = await fetch(FS.replace(/\/documents$/, '/documents:commit'), { method: 'POST', headers: H, body: JSON.stringify({ writes: [w] }) });
    if (cr.ok) return out(200, { ok: true, chips: nv, added: { d: okD, r: okR }, rejected: rej, day: { used: day.n, spent: day.s || 0, r: day.r, att: !!day.a } });
    if (cr.status !== 400 && cr.status !== 409) return out(502, { ok: false, error: 'write' }); /* 400/409: 그 사이 문서가 바뀜 → 다시 */
  }
  return out(409, { ok: false, error: 'busy' });
}

/* ================= 포커레이드 =================
 * 카드는 서버가 뽑음: 덱 순서·손패는 서버 문서(raid_시즌/계정)에만 있고, 사이트는 고른 카드 코드만 보냄.
 * 덱 = 블라블라링크에서 서버가 직접 읽은 보유 SSR(명함 1 + 돌파 + 코강) + 계정 문서 dex(웹에서 얻은 카드), 니케당 최대 11장.
 * 점수 = 칩 합계 × 배수 합계 × 버스트 보정(우월코드 칩 +2, 3버스트 우월코드 +5). 하루(한국 시간) 3회, 시작하는 순간 1회 차감. 진행 중인 판은 다시 들어와도 그대로 이어짐.
 * RAID_OPEN이 false면 관리자만 사용할 수 있음(미공개). */
const RAID_OPEN = true, RAID_TRIES = 3;
const RAID_NK0 = {"1007":["엘리시온","풍","SMG",3,3],"1010":["미실리스","철","RL",3,6],"1012":["테트라","작","SR",1,5],"1019":["미실리스","풍","AR",3,5],"1020":["미실리스","철","RL",1,2],"1021":["테트라","전","AR",1,8],"1022":["테트라","수","SG",2,5],"3004":["테트라","작","RL",1,3],"5001":["미실리스","철","SR",3,6],"5002":["테트라","철","SG",3,7],"5003":["테트라","전","SR",1,5],"5004":["테트라","작","SR",3,7],"5005":["엘리시온","작","MG",1,1],"5006":["미실리스","작","RL",2,1],"5007":["엘리시온","수","AR",3,8],"5008":["테트라","풍","AR",2,6],"5009":["테트라","풍","SG",3,5],"5010":["테트라","철","SR",1,4],"5011":["미실리스","철","SMG",1,7],"5012":["필그림","철","AR",3,7],"5013":["필그림","전","SG",3,7],"5014":["미실리스","철","AR",3,5],"5015":["엘리시온","작","SMG",2,1],"5016":["엘리시온","수","SG",2,4],"5017":["엘리시온","작","SMG",1,7],"5018":["엘리시온","수","AR",3,1],"5019":["엘리시온","철","SMG",3,4],"5020":["엘리시온","풍","MG",2,4],"5021":["미실리스","철","RL",2,6],"5022":["엘리시온","수","RL",3,2],"5023":["엘리시온","작","SR",2,1],"5024":["미실리스","작","SG",3,7],"5025":["미실리스","작","SMG",3,2],"5026":["테트라","수","SG",1,1],"5027":["미실리스","풍","SG",1,3],"5028":["테트라","수","SR",1,3],"5029":["테트라","작","SR",3,4],"5030":["미실리스","풍","SR",2,3],"5031":["엘리시온","전","MG",3,4],"5032":["엘리시온","전","SG",3,3],"5033":["테트라","수","SMG",1,2],"5034":["테트라","철","AR",2,3],"5035":["테트라","작","RL",1,2],"5036":["테트라","풍","SR",2,5],"5037":["테트라","철","SMG",2,4],"5038":["미실리스","풍","SMG",3,3],"5039":["테트라","수","AR",2,3],"5040":["필그림","철","RL",1,5],"5041":["필그림","전","AR",3,5],"5042":["필그림","전","SR",3,1],"5043":["필그림","풍","RL",2,3],"5044":["필그림","작","MG",3,5],"5045":["테트라","전","MG",1,6],"5046":["테트라","풍","AR",2,3],"5048":["엘리시온","철","SG",2,5],"5049":["테트라","전","SR",1,7],"5050":["테트라","작","SR",1,3],"5051":["테트라","작","MG",1,2],"5053":["미실리스","작","MG",3,1],"5054":["테트라","전","RL",2,4],"5055":["미실리스","풍","SG",2,5],"5056":["필그림","작","SR",2,2],"5059":["미실리스","전","AR",2,2],"5061":["필그림","수","AR",1,5],"5064":["테트라","수","SR",1,4],"5065":["필그림","철","MG",2,9],"5066":["엘리시온","수","SR",3,7],"5068":["테트라","작","SMG",2,2],"5069":["테트라","수","SMG",1,1],"5070":["테트라","수","MG",2,3],"5071":["엘리시온","수","MG",3,2],"5074":["테트라","전","RL",1,5],"5075":["테트라","풍","SMG",1,6],"5077":["미실리스","전","SR",3,6],"5078":["미실리스","전","SMG",2,3],"5079":["엘리시온","전","SMG",2,4],"5081":["미실리스","수","AR",1,7],"5082":["엘리시온","풍","RL",3,2],"5085":["미실리스","풍","RL",2,3],"5087":["테트라","전","AR",1,2],"5088":["엘리시온","전","SG",1,7],"5089":["어브노멀","수","SMG",2,2],"5090":["어브노멀","작","RL",3,3],"5092":["테트라","수","SG",2,5],"5094":["어브노멀","작","AR",3,4],"5095":["어브노멀","작","RL",3,4],"5097":["테트라","전","SG",3,7],"5098":["엘리시온","철","AR",2,6],"5099":["미실리스","전","SG",2,6],"5100":["미실리스","철","RL",1,6],"5101":["필그림","철","SR","A",7],"5102":["필그림","철","AR",3,4],"5103":["테트라","수","MG",3,7],"5104":["테트라","철","SMG",1,5],"5105":["필그림","풍","RL",3,8],"5106":["엘리시온","전","SG",3,5],"5107":["미실리스","전","MG",2,4],"5108":["어브노멀","수","MG",2,5],"5109":["어브노멀","수","RL",3,4],"5110":["엘리시온","작","SR",1,6],"5111":["테트라","작","RL",2,3],"5112":["미실리스","작","SR",3,3],"5113":["테트라","철","SG",3,6],"5114":["테트라","수","SMG",1,5],"5115":["테트라","전","SMG",2,5],"5116":["테트라","풍","AR",2,6],"5117":["테트라","풍","AR",3,5],"5118":["어브노멀","작","AR",3,5],"5119":["어브노멀","작","MG",3,6],"5120":["어브노멀","전","SR",2,6],"5121":["미실리스","수","SMG",3,6],"5122":["엘리시온","수","AR",3,6],"5123":["필그림","철","SR",1,3],"5124":["필그림","전","RL",3,8],"5125":["필그림","작","AR",2,7],"5126":["미실리스","전","MG",2,8],"5127":["엘리시온","전","RL",3,7],"5128":["엘리시온","수","AR",3,6],"5129":["엘리시온","작","MG",3,9],"5130":["엘리시온","수","MG",2,8],"5131":["엘리시온","수","RL",2,7],"5132":["어브노멀","풍","AR",3,6],"5133":["어브노멀","풍","MG",3,7],"5134":["미실리스","전","RL",2,5],"5135":["테트라","수","SR",3,6],"5136":["테트라","수","RL",2,5],"5137":["필그림","풍","SMG",1,8],"5138":["미실리스","작","MG",3,8],"5139":["미실리스","풍","AR",2,2],"5140":["엘리시온","전","RL",2,7],"5141":["엘리시온","전","SMG",3,4],"5142":["어브노멀","철","AR",3,6],"5143":["어브노멀","철","RL",3,7],"5144":["엘리시온","풍","RL",1,3],"5145":["필그림","수","SG",3,8],"5146":["미실리스","수","MG",3,7],"5147":["엘리시온","작","MG",1,6],"5148":["엘리시온","작","RL",3,5],"5149":["엘리시온","작","SR",2,6],"5150":["테트라","철","SR",3,7],"5151":["테트라","철","SR",2,7],"5152":["어브노멀","전","RL",3,7],"5153":["어브노멀","전","AR",3,5],"5154":["엘리시온","수","MG",2,5],"5155":["필그림","풍","SMG",2,8],"5156":["필그림","풍","SR",3,8],"5157":["필그림","철","SMG",2,5],"5158":["엘리시온","수","SG",1,6],"5159":["엘리시온","작","RL",3,8],"5160":["엘리시온","작","SG",2,7],"5161":["필그림","수","SR",3,9],"5162":["엘리시온","철","AR",1,5],"5163":["테트라","풍","SR",2,7],"5164":["어브노멀","철","SMG",3,6],"5165":["어브노멀","철","SR",2,6],"5166":["엘리시온","풍","SMG",3,5],"5167":["엘리시온","작","SG",2,7],"5168":["미실리스","수","SR",2,3],"5169":["테트라","전","RL",1,9],"5170":["미실리스","전","RL",3,8],"5171":["엘리시온","전","MG",1,4],"5172":["테트라","철","RL",2,8],"5173":["테트라","수","SR",2,8],"5174":["테트라","풍","AR",3,6],"5175":["필그림","철","MG",3,9],"5176":["엘리시온","철","AR",3,6],"5177":["미실리스","풍","RL",3,7],"5178":["미실리스","풍","SR",2,6],"5179":["어브노멀","작","SG",3,6],"5180":["어브노멀","작","MG",3,7],"5181":["미실리스","풍","SG",3,7],"5182":["미실리스","수","SR",3,6],"5183":["미실리스","수","SR",3,6],"5184":["테트라","수","RL",2,6],"5185":["필그림","작","MG",3,9],"5186":["필그림","작","AR",3,9],"5187":["필그림","작","RL",2,6]}; /* 코드: [기업, 우월코드, 총기, 버스트, 티어 점수] (js/app.js 기본 솔레 티어에서 생성) */
const TABS_OUT = (() => { const o = []; [['S', 5], ['SS', 2], ['SSS', 1], ['r', 1], ['g20', 1], ['g10', 1], ['g3', 4], ['g1', 10]].forEach((x) => { for (let i = 0; i < x[1]; i++) o.push(x[0]); }); while (o.length < 100) o.push(''); return o; })(); /* 한 상자 100장: SSS 1 · SS 2 · S 5 · DORO칩 1 · 골드칩 20·10·3×4·1×10 */
const tabsRng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const tabsOrder = (seed) => { const r = tabsRng(seed), a = TABS_OUT.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
let RAID_NK = RAID_NK0, RAID_TVK = ''; /* 실제로 쓰는 표: 관리 탭의 절대 티어표(meta/site의 tv: 코드→등급 1~9)가 있으면 등급만 덮어씀 */
const RAID_SETS = []; /* 세트 니케(둘 다 편성하면 배수 +2): 지금은 끔. 예: [['5130', '5131'], ['5172', '5173'], ['5008', '5009'], ['5140', '5013'], ['5180', '5179']] */
const R_CYC = ['작', '풍', '철', '전', '수'], R_RNG = { NEAR: ['SG', 'SMG'], MID: ['AR', 'MG'], FAR: ['SR'] };
const rSup = (e) => R_CYC[(R_CYC.indexOf(e) + 4) % 5];
const rBrk = (cnt) => Math.min(3, Math.max(0, cnt - 1)) + (cnt >= 11 ? 2 : 0);
function rHand(vals) {
  const n = vals.length; if (!n) return 0; const m = {}; vals.forEach((v) => { m[v] = (m[v] || 0) + 1; });
  const c = Object.values(m).sort((a, b) => b - a), a = c[0], b = c[1] || 0;
  if (a === 5) return 8; if (a === 4) return 7; if (a === 3 && b === 2) return 6; if (a === 3) return 4; if (a === 2 && b === 2) return 3; if (a === 2) return 2; return n === 5 ? 5 : 1;
}
function rEval(codes, cnt, boss) {
  const sp = rSup(boss.e); let chips = 0; const bs = new Set();
  const D = codes.map((k) => RAID_NK[k]);
  D.forEach((x, i) => { chips += x[4] + rBrk(cnt[codes[i]] || 1) + (R_RNG[boss.r].includes(x[2]) ? 2 : x[2] === 'RL' ? 1 : 0) + (x[1] === sp ? (x[3] === 3 || x[3] === 'A' ? 5 : 2) : 0); bs.add(x[3]); }); /* 우월코드 +2, 3버스트 우월코드 +5 */
  const hc = rHand(D.map((x) => x[0])), he = rHand(D.map((x) => x[1]));
  const mult = ((hc === 8 && he === 5) || (hc === 5 && he === 8) ? 13 : hc + he) + 2 * RAID_SETS.filter((p) => codes.includes(p[0]) && codes.includes(p[1])).length;
  const n123 = [1, 2, 3].filter((b) => bs.has(b)).length, f = n123 === 3 || (bs.has('A') && n123 >= 2) ? 1 : 0.8;
  return { chips, mult, f, score: Math.round(chips * mult * f) };
}
const rShuffle = (a) => { const r = new Uint32Array(a.length); crypto.getRandomValues(r); for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const rList = (s) => (s ? String(s).split(',').filter(Boolean) : []);
async function raid(req, env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  const idt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idt) return out(401, { ok: false, error: 'auth' });
  const lk = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idt }) })).json();
  const uid = lk && lk.users && lk.users[0] && lk.users[0].localId; if (!uid) return out(401, { ok: false, error: 'auth' });
  const admin = ADMIN_UIDS.includes(uid); if (!RAID_OPEN && !admin) return out(403, { ok: false, error: 'closed' });
  let B; try { B = await req.json(); } catch (e) { return out(400, { ok: false, error: 'bad' }); }
  const a = String(B.a || 'state');
  let SITE = null; /* 관리 탭 설정: 절대 티어표의 등급(tv), 신규 니케 카드(nk), 부스터팩(packs) */
  try { SITE = await siteTv(env); const tv = SITE && SITE.tv, key = JSON.stringify([tv || {}, (SITE && SITE.nk) || []]); if (key !== RAID_TVK) { const nk = {};
      ((SITE && SITE.nk) || []).forEach((x) => { const k = String(x.code); if (/^\d{3,6}$/.test(k) && !RAID_NK0[k]) nk[k] = [x.corp || '', x.el || '', x.wp || '', x.bu === 'A' ? 'A' : +x.bu || 3, 9]; }); /* 신규 니케: 등급은 티어표에 없으면 SSS(★) */
      Object.keys(RAID_NK0).forEach((k) => { nk[k] = RAID_NK0[k].slice(); }); Object.keys(nk).forEach((k) => { const v = tv && +tv[k]; if (v >= 1 && v <= 9) nk[k][4] = Math.floor(v); }); RAID_NK = nk; RAID_TVK = key; } } catch (e) { /* 설정을 못 읽으면 직전 표 그대로 */ }
  const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore'), H = { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' };
  const getDoc = async (path) => { const r = await fetch(FS + '/' + path, { headers: H }); if (r.status === 404) return null; const d = await r.json(); const o = {}; Object.entries(d.fields || {}).forEach(([k, v]) => { o[k] = dec(v); }); return { name: d.name, updateTime: d.updateTime, f: o }; };
  const commit = async (writes) => (await fetch(FS.replace(/\/documents$/, '/documents:commit'), { method: 'POST', headers: H, body: JSON.stringify({ writes }) })).ok;
  const docName = (path) => 'projects/' + FB_PROJECT + '/databases/(default)/documents/' + path;
  const now = Date.now(), today = kstDay(now);
  /* 순위: 점수 높은 순, 같은 점수는 먼저 낸 순 */
  const rankOf = async (colId) => { const q = await (await fetch(FS + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: colId }], where: { fieldFilter: { field: { fieldPath: 'sc' }, op: 'GREATER_THAN', value: { integerValue: '0' } } }, orderBy: [{ field: { fieldPath: 'sc' }, direction: 'DESCENDING' }], limit: 1000 } }) })).json();
    const rows = (Array.isArray(q) ? q : []).filter((x) => x.document).map((x) => { const f = {}; Object.entries(x.document.fields || {}).forEach(([k, v]) => { f[k] = dec(v); }); return { uid: x.document.name.split('/').pop(), nick: f.nick || '', sc: f.sc || 0, at: f.at || 0, deck: f.bd || '', chips: f.bc || 0, mult: f.bm || 0, f: f.bf || 1, pf: f.pf || '', fr: f.fr || 0 }; });
    rows.sort((x, y) => y.sc - x.sc || x.at - y.at); return rows; };
  const tierOf = (i, N) => (i < 0 ? 0 : i < Math.max(3, Math.ceil(N * 0.03)) ? 1 : i < Math.max(10, Math.ceil(N * 0.1)) ? 2 : i < Math.max(30, Math.ceil(N * 0.3)) ? 3 : 0); /* 테두리: 3%·3위 / 10%·10위 / 30%·30위 */
  const maskNick = (v) => { const c = Array.from(String(v || '지휘관')); return c.length <= 2 ? c[0] + '*' : c[0] + '*'.repeat(c.length - 2) + c[c.length - 1]; };
  if (a === 'set') { /* 관리자: 시즌 열기·닫기 { e, r, days } / { off: true } */
    if (!admin) return out(403, { ok: false, error: 'admin' });
    const e = R_CYC.includes(B.e) ? B.e : R_CYC[now % 5], r = R_RNG[B.r] ? B.r : ['NEAR', 'MID', 'FAR'][now % 3], days = Math.max(1, Math.min(31, Math.floor(+B.days || 5)));
    const sn = B.off ? { on: false } : { id: String(B.id || today.slice(0, 7) + '-' + String(now).slice(-5)).replace(/[^0-9a-zA-Z-]/g, '').slice(0, 20), e, r, start: now, end: now + days * 86400000, on: true };
    const old = await getDoc('meta/raid'); /* 직전 시즌을 기억해 두었다가 끝난 뒤 테두리를 줌 */
    const prev = old && old.f.id && old.f.on ? { id: old.f.id, end: Math.min(old.f.end || now, now) } : (old && old.f.prev) || null; if (prev) sn.prev = prev;
    const ok = await commit([{ update: { name: docName('meta/raid'), fields: fsv(sn).mapValue.fields } }]);
    return out(ok ? 200 : 502, { ok, season: sn });
  }
  if (a === 'pack') { /* 카드팩: 서버가 뽑아 계정에 기록. 1팩 5장 · 박스 30팩 · 일반/기업 100싱크칩(일반 박스 2,700) · 필그림 1 DORO칩 · 풀코강 초과분은 골드칩(싱크칩 10) */
    const kind = String(B.kind || 'std'), pil = kind === 'pil', co = kind.startsWith('co:') ? kind.slice(3) : '';
    const bo = kind.startsWith('bo:') ? ((SITE && SITE.packs) || []).find((x) => x && 'bo:' + x.id === kind) : null, boCode = bo ? String(bo.code || '') : ''; /* 픽업 부스터팩: 픽업 카드 1장 확정 + 일반팩 4장. 1팩 100 · 하프박스(20팩) 1,500 */
    if (kind.startsWith('bo:') && (!bo || !RAID_NK[boCode])) return out(400, { ok: false, error: 'bad' });
    const n = bo ? (+B.n === 20 ? 20 : 1) : +B.n === 30 ? 30 : 1;
    if (!bo && !pil && kind !== 'std' && !['엘리시온', '미실리스', '테트라', '어브노멀'].includes(co)) return out(400, { ok: false, error: 'bad' });
    const price = bo ? (n === 20 ? 1500 : 75) : pil ? n : kind === 'std' && n === 30 ? 2700 : 100 * n, TW = { 9: 2, 8: 5, 7: 10, 6: 16, 5: 20, 4: 18, 3: 14, 2: 9, 1: 6 }, by = {};
    Object.keys(RAID_NK).forEach((k) => { const x = RAID_NK[k]; if (pil ? x[0] !== '필그림' : co ? x[0] !== co : x[0] === '필그림') return; const tv = Math.max(1, Math.min(9, +x[4] || 1)); (by[tv] = by[tv] || []).push(k); });
    const tvs = Object.keys(by), tot = tvs.reduce((s2, t) => s2 + TW[t], 0); if (!tvs.length) return out(400, { ok: false, error: 'bad' });
    const one = () => { let u = Math.random() * tot; for (const t of tvs) { u -= TW[t]; if (u <= 0) return by[t][Math.floor(Math.random() * by[t].length)]; } return by[tvs[0]][0]; };
    for (let attempt = 0; attempt < 3; attempt++) {
      const ud = await getDoc('users/' + uid); if (!ud) return out(404, { ok: false, error: 'nouser' });
      const cv = ud.f.chipsV || { d: 0, r: 0 }; if ((pil ? cv.r || 0 : cv.d || 0) < price) return out(409, { ok: false, error: 'chips' });
      const dex = Object.assign({}, ud.f.dex || {}), LK = ud.f.dexL || {}, packs = []; let gold = 0;
      const puP = bo ? (+bo.rate === 1 ? 0.01 : 0.02) : 0, draw = []; for (let q = 0; q < n * 5; q++) draw.push(bo && Math.random() < puP ? boCode : one()); /* 부스터팩: 카드마다 픽업 확률(일반 2% · 필그림/오버스펙 1%) */
      if (bo && n === 20 && !draw.includes(boCode)) draw[Math.floor(Math.random() * draw.length)] = boCode; /* 하프박스: 픽업 최소 1장 */
      for (let p = 0; p < n; p++) { const cards = []; for (let i = 0; i < 5; i++) { const k = draw[p * 5 + i], have = Math.min(11, (+LK[k] || 0) + (+dex[k] || 0)), dup = have >= 11; if (dup) gold++; else dex[k] = (+dex[k] || 0) + 1; cards.push([k, dup ? 1 : 0, dup ? 11 : have + 1]); } packs.push(cards); }
      const chips = { d: (cv.d || 0) - (pil ? 0 : price) + gold * 10, r: (cv.r || 0) - (pil ? price : 0) };
      if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv(chips), dex: fsv(dex) } }, updateMask: { fieldPaths: ['chipsV', 'dex'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, packs, chips, gold, dex });
    }
    return out(409, { ok: false, error: 'busy' });
  }
  if (a === 'tabs') { /* DORO TABS(풀탭): 한 상자 1,000장의 당첨 수와 순서가 미리 정해져 있음(씨앗으로 섞은 순서). 1장 = 싱크칩 10. n = 0 이면 상자 상태만 */
    const TB = TABS_OUT.length, want = B.reset ? 0 : [0, 1, 5, 10].includes(+B.n) ? +B.n : 1, TVT = { S: 7, SS: 8, SSS: 9 }, DUPG = { 7: 5, 8: 15, 9: 50 };
    for (let attempt = 0; attempt < 3; attempt++) {
      const ud = await getDoc('users/' + uid); if (!ud) return out(404, { ok: false, error: 'nouser' });
      const cv = ud.f.chipsV || { d: 0, r: 0 }; let pt = !B.reset && ud.f.pt && ud.f.pt.s && ud.f.pt.i < TB ? ud.f.pt : { s: crypto.getRandomValues(new Uint32Array(1))[0], i: 0 }; /* reset: 새 상자로 바꿈 */
      const ord = tabsOrder(pt.s), n = Math.min(want, TB - pt.i), leftOf = (i0) => { const L = { n: TB - i0 }; for (let q = i0; q < TB; q++) { const k = TABS_OUT[ord[q]]; if (k) L[k] = (L[k] || 0) + 1; } return L; };
      if (!n) { if (B.reset && !(await commit([{ update: { name: ud.name, fields: { pt: fsv(pt) } }, updateMask: { fieldPaths: ['pt'] }, currentDocument: { updateTime: ud.updateTime } }]))) continue; return out(200, { ok: true, tix: [], left: leftOf(pt.i), chips: { d: cv.d || 0, r: cv.r || 0 } }); }
      if ((cv.d || 0) < 10 * n) return out(409, { ok: false, error: 'chips' });
      const dex = Object.assign({}, ud.f.dex || {}), LK = ud.f.dexL || {}, tix = []; let d = (cv.d || 0) - 10 * n, r = cv.r || 0;
      for (let j = 0; j < n; j++) { const idx = ord[pt.i + j], k = TABS_OUT[idx];
        if (!k) tix.push(['']); else if (k === 'r') { r++; tix.push(['r']); } else if (k[0] === 'g') { d += 10 * +k.slice(1); tix.push([k]); }
        else { const tv = TVT[k]; let pool = Object.keys(RAID_NK).filter((c) => +RAID_NK[c][4] === tv); if (!pool.length) pool = Object.keys(RAID_NK); const rr = tabsRng(pt.s ^ Math.imul(idx + 1, 2654435761)), code = pool[Math.floor(rr() * pool.length)], have = Math.min(11, (+LK[code] || 0) + (+dex[code] || 0)), dup = have >= 11;
          if (dup) d += 10 * DUPG[tv]; else dex[code] = (+dex[code] || 0) + 1; tix.push([k, code, dup ? 1 : 0, dup ? 11 : have + 1]); } }
      pt = { s: pt.s, i: pt.i + n }; const chips = { d, r };
      if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv(chips), dex: fsv(dex), pt: fsv(pt) } }, updateMask: { fieldPaths: ['chipsV', 'dex', 'pt'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, tix, chips, dex, left: leftOf(pt.i) });
    }
    return out(409, { ok: false, error: 'busy' });
  }
  if (a === 'g2048') { /* 2048: 시작할 때 씨앗을 주고(입장 싱크칩 10), 정산 때 움직인 기록을 같은 규칙으로 다시 돌려 가장 큰 타일을 확인 */
    const REW = { 6: [5, 0], 7: [10, 0], 8: [20, 0], 9: [50, 0], 10: [120, 0], 11: [300, 1], 12: [800, 3], 13: [2000, 10] };
    for (let attempt = 0; attempt < 3; attempt++) {
      const ud = await getDoc('users/' + uid); if (!ud) return out(404, { ok: false, error: 'nouser' }); const cv = ud.f.chipsV || { d: 0, r: 0 };
      if (B.start) { if ((cv.d || 0) < 10) return out(409, { ok: false, error: 'chips' }); const seed = crypto.getRandomValues(new Uint32Array(1))[0], chips = { d: cv.d - 10, r: cv.r || 0 };
        if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv(chips), g48: fsv({ s: seed, t: now }) } }, updateMask: { fieldPaths: ['chipsV', 'g48'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, seed, chips }); continue; }
      const gm = ud.f.g48; if (!gm || gm.s == null) return out(409, { ok: false, error: 'nogame' });
      const rr = tabsRng(gm.s), c = Array(16).fill(0), sp = () => { const e = []; for (let i = 0; i < 16; i++) if (!c[i]) e.push(i); if (!e.length) return; const i = e[Math.floor(rr() * e.length)]; c[i] = rr() < 0.9 ? 1 : 2; };
      const LN = { L: [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((q) => r * 4 + q)), R: [0, 1, 2, 3].map((r) => [3, 2, 1, 0].map((q) => r * 4 + q)), U: [0, 1, 2, 3].map((q) => [0, 1, 2, 3].map((r) => r * 4 + q)), D: [0, 1, 2, 3].map((q) => [3, 2, 1, 0].map((r) => r * 4 + q)) };
      sp(); sp(); const mv = String(B.moves || '').slice(0, 30000);
      for (const ch of mv) { const L = LN[ch]; if (!L) continue; let moved = false; L.forEach((ln) => { const t = ln.map((i) => c[i]).filter(Boolean), o = []; for (let i = 0; i < t.length; i++) { if (i + 1 < t.length && t[i] === t[i + 1]) { o.push(t[i] + 1); i++; } else o.push(t[i]); } ln.forEach((ci, k) => { const nv = o[k] || 0; if (nv !== c[ci]) moved = true; c[ci] = nv; }); }); if (moved) sp(); }
      const mx = Math.max.apply(null, c); let rw = [0, 0]; Object.keys(REW).forEach((k) => { if (mx >= +k) rw = REW[k]; });
      const chips = { d: (cv.d || 0) + rw[0], r: (cv.r || 0) + rw[1] };
      if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv(chips), g48: fsv(null) } }, updateMask: { fieldPaths: ['chipsV', 'g48'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, max: mx, d: rw[0], r: rw[1], chips });
    }
    return out(409, { ok: false, error: 'busy' });
  }
  if (a === 'plinko') { /* 플링코: 서버가 결과를 정함. 환수율 약 95%, 양 끝 칸은 DORO칩 반드시 지급 */
    const rows = Math.floor(+B.rows), risk = Math.floor(+B.risk), val = { b: 1, s: 5, g: 10 }[B.bet], n = Math.max(1, Math.min(50, Math.floor(+B.n) || 1));
    if (rows !== 12 || !(risk >= 0 && risk <= 2) || !val) return out(400, { ok: false, error: 'bad' });
    const m0 = [0.5, 0.35, 0.2][risk], cc = [1.42, 1.85, 2.7][risk], raw = []; let bb = 1, sum = 0;
    for (let k = 0; k <= rows; k++) { const pk = bb / Math.pow(2, rows); bb = bb * (rows - k) / (k + 1); raw.push(m0 * Math.pow(cc, Math.abs(k - rows / 2))); sum += pk * raw[k]; }
    const tb = raw.map((v) => { v *= 0.95 / sum; return v < 10 ? Math.max(0.1, Math.round(v * 10) / 10) : v < 100 ? Math.round(v) : Math.round(v / 10) * 10; }), cost = val * n;
    for (let attempt = 0; attempt < 3; attempt++) {
      const ud = await getDoc('users/' + uid); if (!ud) return out(404, { ok: false, error: 'nouser' });
      const cv = ud.f.chipsV || { d: 0, r: 0 }; if ((cv.d || 0) < cost) return out(409, { ok: false, error: 'chips' });
      const balls = []; let win = 0, wr = 0;
      for (let i = 0; i < n; i++) { let k = 0; for (let q = 0; q < rows; q++) if (Math.random() < 0.5) k++; const x = val * tb[k], pay = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0); const dr = k === 0 || k === rows ? Math.max(1, Math.round(val * Math.pow(2, rows - 1) / 1000)) : 0; /* 끝 칸: DORO칩 반드시 지급(1,000당 1개꼴, 최소 1) */ win += pay; wr += dr; balls.push([k, pay, dr]); }
      const chips = { d: (cv.d || 0) - cost + win, r: (cv.r || 0) + wr };
      if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv(chips) } }, updateMask: { fieldPaths: ['chipsV'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, balls, chips });
    }
    return out(409, { ok: false, error: 'busy' });
  }
  const md = await getDoc('meta/raid'), sn = md && md.f.on && md.f.id ? md.f : null, active = !!(sn && now >= sn.start && now < sn.end);
  const season = sn ? { id: sn.id, e: sn.e, r: sn.r, start: sn.start, end: sn.end, active } : null;
  if (a === 'g48') { /* 2048에서 합성한 단계를 이번(또는 곧 시작할) 시즌의 픽업 니케 카드 수로 인정. 보낸 씨앗·움직임을 같은 규칙으로 다시 돌려 확인 */
    if (!sn || now >= sn.end) return out(409, { ok: false, error: 'noseason' });
    const GL = ((SITE && SITE.gacha) || []).filter((x) => x && x.n); let code = '';
    if (GL.length) { const pin = GL.find((x) => x.pin), act = GL.filter((x) => (x.s || x.e) && (!x.s || now >= x.s) && (!x.e || now < x.e)).sort((x, y) => (y.s || 0) - (x.s || 0)), nx = GL.filter((x) => x.s && now < x.s).sort((x, y) => x.s - y.s); code = String((pin || act[0] || nx[0] || GL[0]).code || ''); const want = String(B.code || '').replace(/\D/g, ''); if (want && act.some((x) => String(x.code || '') === want)) code = want; } /* 지금 픽업 중인 니케 가운데 고른 것 */
    if (!code) code = String(B.code || '').replace(/\D/g, '').slice(0, 6); /* 가챠 머신 목록을 서버에 저장하기 전: 사이트가 보낸 대표 픽업 */
    if (!RAID_NK[code]) return out(409, { ok: false, error: 'nopick' });
    const rr = tabsRng(+B.seed >>> 0), c = Array(16).fill(0), sp = () => { const e = []; for (let i = 0; i < 16; i++) if (!c[i]) e.push(i); if (!e.length) return; const i = e[Math.floor(rr() * e.length)]; c[i] = rr() < 0.9 ? 1 : 2; };
    const LN = { L: [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((q) => r * 4 + q)), R: [0, 1, 2, 3].map((r) => [3, 2, 1, 0].map((q) => r * 4 + q)), U: [0, 1, 2, 3].map((q) => [0, 1, 2, 3].map((r) => r * 4 + q)), D: [0, 1, 2, 3].map((q) => [3, 2, 1, 0].map((r) => r * 4 + q)) };
    sp(); sp(); let mx = 0;
    for (const ch of String(B.moves || '').slice(0, 30000)) { const L = LN[ch]; if (!L || mx >= 11) continue; let moved = false; L.forEach((ln) => { const t = ln.map((i) => c[i]).filter(Boolean), o = []; for (let i = 0; i < t.length; i++) { if (i + 1 < t.length && t[i] === t[i + 1]) { o.push(t[i] + 1); i++; } else o.push(t[i]); } ln.forEach((ci, k) => { const nv = o[k] || 0; if (nv !== c[ci]) moved = true; c[ci] = nv; }); }); if (moved) { mx = Math.max(mx, Math.max.apply(null, c)); sp(); } }
    mx = Math.min(11, Math.max(mx, Math.max.apply(null, c)));
    for (let attempt = 0; attempt < 3; attempt++) { const ud = await getDoc('users/' + uid); if (!ud) return out(404, { ok: false, error: 'nouser' }); const old = ud.f.g48b, m = old && old.sid === sn.id ? Object.assign({}, old.m || (old.code ? { [old.code]: +old.v || 0 } : {})) : {}, v = Math.max(+m[code] || 0, mx); /* 시즌마다 니케별 최고 단계 */
      if (+m[code] >= v && old && old.sid === sn.id && old.m) return out(200, { ok: true, v, code, sid: sn.id });
      m[code] = v;
      if (await commit([{ update: { name: ud.name, fields: { g48b: fsv({ sid: sn.id, m }) } }, updateMask: { fieldPaths: ['g48b'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, v, code, sid: sn.id }); }
    return out(409, { ok: false, error: 'busy' });
  }
  if (!sn) return out(200, { ok: true, season: null, admin });
  const col = 'raid_' + sn.id;
  if (a === 'rank') {
    const all = await rankOf(col), N = all.length, pub = (x, k) => ({ rank: k + 1, me: x.uid === uid, nick: maskNick(x.nick), sc: x.sc, deck: x.deck, chips: x.chips, mult: x.mult, f: x.f, pf: x.pf, fr: x.fr });
    const mi = all.findIndex((x) => x.uid === uid);
    return out(200, { ok: true, season, total: N, cut: [Math.max(3, Math.ceil(N * 0.03)), Math.max(10, Math.ceil(N * 0.1)), Math.max(30, Math.ceil(N * 0.3))], rows: all.slice(0, 100).map(pub), mine: mi >= 0 ? pub(all[mi], mi) : null });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const my = await getDoc(col + '/' + uid), f = my ? my.f : {};
    const n = f.day === today ? (f.n || 0) : 0, g = f.g && f.g.hand ? f.g : null;
    const mx = RAID_TRIES + (f.x1 ? 1 : 0); /* 도감 100%: 하루 핸드 +1 */
    const view = (g2, extra) => Object.assign({ ok: true, season, admin, tries: n, max: mx, best: f.sc || 0, game: g2 ? { hand: rList(g2.hand).map((k) => [k, g2.cnt[k] || 1]), rd: g2.rd, left: rList(g2.deck).length, pool: rList(g2.deck).sort().map((k) => [k, g2.cnt[k] || 1]), total: g2.total } : null }, extra || {});
    const pre = my ? { updateTime: my.updateTime } : { exists: false };
    const save = (fields, mask) => ({ update: { name: docName(col + '/' + uid), fields: fsv(fields).mapValue.fields }, updateMask: { fieldPaths: mask }, currentDocument: pre });
    if (a === 'state') { const ud = await getDoc('users/' + uid); let fr = (ud && ud.f.raidFrames) || {}, newFrame = 0;
      const ended = now >= sn.end ? sn : (sn.prev && sn.prev.id ? sn.prev : null); /* 끝난 시즌의 순위로 프로필 테두리 지급(한 번만) */
      if (ended && ud && fr[ended.id] == null) { const all = await rankOf('raid_' + ended.id), t = tierOf(all.findIndex((x) => x.uid === uid), all.length); fr = Object.assign({}, fr, { [ended.id]: t });
        if (await commit([{ update: { name: ud.name, fields: { raidFrames: fsv(fr) } }, updateMask: { fieldPaths: ['raidFrames'] } }])) newFrame = t; }
      return out(200, view(g, { chips: (ud && ud.f.chipsV && ud.f.chipsV.d) || 0, frames: Array.from(new Set(Object.values(fr).map(Number).filter((t) => t > 0))), newFrame })); }
    if (a === 'giveup') { /* 진행 중인 판 포기: 쓴 횟수는 돌아오지 않고 기록도 남지 않음 */
      if (!g) return out(200, view(null));
      if (await commit([save({ g: null }, ['g'])])) return out(200, view(null));
      continue;
    }
    if (!active) return out(409, { ok: false, error: 'inactive' });
    if (a === 'start') {
      if (g) return out(200, view(g)); /* 진행 중인 판이 있으면 그 판을 이어감 */
      if (n >= mx) return out(409, { ok: false, error: 'tries' });
      const id = toIntlId(B.openid), area = Number(B.area);
      if (!id || !AREAS.includes(area)) return out(400, { ok: false, error: 'link' });
      if (f.oid && (f.oid !== id || f.area !== area)) return out(409, { ok: false, error: 'oid' }); /* 시즌 중에는 처음 쓴 게임 계정으로 고정 */
      let chars; try { chars = (await post('GetUserCharacters', { intl_open_id: id, nikke_area_id: area }, env.BLA_COOKIE)).characters || []; } catch (e) { return out(502, { ok: false, error: 'bla', msg: String((e && e.message) || e).slice(0, 80) }); }
      const ud = await getDoc('users/' + uid), web = (ud && ud.f.dex) || {}, cnt = {};
      chars.forEach((c) => { const k = String(c.name_code); if (RAID_NK[k]) cnt[k] = 1 + Math.min(3, Number(c.grade) || 0) + Math.min(7, Number(c.core) || 0); }); const dexL = Object.assign({}, cnt); /* 연동 보유 수: 카드팩의 풀코강 초과 판정에 씀 */
      Object.keys(web).forEach((k) => { if (RAID_NK[k]) cnt[k] = Math.min(11, (cnt[k] || 0) + Math.max(0, Math.floor(+web[k] || 0))); });
      { const gb = ud && ud.f.g48b, gm = gb && gb.sid === sn.id ? gb.m || (gb.code ? { [gb.code]: gb.v } : {}) : {}; Object.keys(gm).forEach((k) => { if (RAID_NK[k]) cnt[k] = Math.max(cnt[k] || 0, Math.min(11, Math.floor(+gm[k] || 0))); }); } /* 2048에서 합성한 픽업 니케 단계(이번 시즌만) */
      const codes = Object.keys(cnt).filter((k) => cnt[k] > 0); if (codes.length < 7) return out(409, { ok: false, error: 'deck', have: codes.length });
      rShuffle(codes);
      const NKN = Object.keys(RAID_NK).length, x1 = codes.length >= NKN ? 1 : 0, rd = 1 + Math.min(3, Math.floor(codes.length / NKN * 4)); /* 버리기: 기본 1, 도감 25%마다 +1(최대 4). 100%는 하루 핸드 +1 */
      const g2 = { hand: codes.slice(0, 7).join(','), deck: codes.slice(7).join(','), cnt, rd, total: codes.length, t: now };
      const nick = String((ud && (ud.f.nickname || ud.f.username)) || '').slice(0, 24);
      const pf = String(B.pf || '').replace(/\D/g, '').slice(0, 6), rf = (ud && ud.f.raidFrames) || {}, fm = String(B.fr || '').match(/^([0-9a-zA-Z-]{1,20}):([123])$/), fr = fm ? (+rf[fm[1]] === +fm[2] ? fm[0] : 0) : [1, 2, 3].includes(+B.fr) && Object.values(rf).map(Number).includes(+B.fr) ? +B.fr : 0; /* 랭킹에 보일 프로필 니케·테두리(가진 테두리만) */
      if (await commit([save({ uid, nick, oid: id, area, day: today, n: n + 1, g: g2, pf, fr, x1 }, ['uid', 'nick', 'oid', 'area', 'day', 'n', 'g', 'pf', 'fr', 'x1'])].concat(ud ? [{ update: { name: ud.name, fields: { dexL: fsv(dexL) } }, updateMask: { fieldPaths: ['dexL'] } }] : []))) { const v = view(g2); v.tries = n + 1; v.max = RAID_TRIES + x1; return out(200, v); }
      continue;
    }
    if (!g) return out(409, { ok: false, error: 'nogame' });
    const hand = rList(g.hand), pick = Array.from(new Set((Array.isArray(B.codes) ? B.codes : []).map(String))).filter((k) => hand.includes(k));
    if (a === 'hint') { /* 추천 보기: 싱크칩 100 */
      const ud = await getDoc('users/' + uid), cv = (ud && ud.f.chipsV) || { d: 0, r: 0 }; if (!ud || (cv.d || 0) < 100) return out(409, { ok: false, error: 'chips' });
      const chips = cv.d - 100;
      if (await commit([{ update: { name: ud.name, fields: { chipsV: fsv({ d: chips, r: cv.r || 0 }) } }, updateMask: { fieldPaths: ['chipsV'] }, currentDocument: { updateTime: ud.updateTime } }])) return out(200, { ok: true, chips });
      continue;
    }
    if (a === 'discard') {
      if (pick.length < 1 || pick.length > 5 || g.rd < 1) return out(400, { ok: false, error: 'bad' });
      const fl = B.flt || {}, conds = ['e', 'c', 'b', 'r'].filter((k) => fl[k]), cost = conds.length ? 100 * Math.pow(2, conds.length - 1) * (fl.c === '필그림' ? 2 : 1) : 0; /* 필그림 지정은 2배 */
      const match = (k) => { const x = RAID_NK[k]; return (!fl.e || x[1] === fl.e) && (!fl.c || x[0] === fl.c) && (!fl.b || String(x[3]) === String(fl.b) || x[3] === 'A') && (!fl.r || (R_RNG[fl.r] || []).includes(x[2])); };
      const deck = rList(g.deck), got = [];
      for (let i = 0; i < pick.length && deck.length; i++) { let j = cost ? deck.findIndex(match) : 0; if (j < 0) j = 0; got.push(deck.splice(j, 1)[0]); }
      const g2 = Object.assign({}, g, { hand: hand.filter((k) => !pick.includes(k)).concat(got).join(','), deck: deck.join(','), rd: g.rd - 1 });
      const writes = [save({ g: g2 }, ['g'])]; let chips;
      if (cost) { const ud = await getDoc('users/' + uid), cv = (ud && ud.f.chipsV) || { d: 0, r: 0 }; if ((cv.d || 0) < cost) return out(409, { ok: false, error: 'chips' });
        chips = cv.d - cost; writes.push({ update: { name: ud.name, fields: { chipsV: fsv({ d: chips, r: cv.r || 0 }) } }, updateMask: { fieldPaths: ['chipsV'] }, currentDocument: { updateTime: ud.updateTime } }); }
      if (await commit(writes)) return out(200, view(g2, { got: got.map((k) => [k, g.cnt[k] || 1]), chips }));
      continue;
    }
    if (a === 'play') {
      if (pick.length !== 5) return out(400, { ok: false, error: 'bad' });
      const R = rEval(pick, g.cnt, sn), up = R.score > (f.sc || 0);
      const fields = { g: null }, mask = ['g'];
      if (up) { Object.assign(fields, { sc: R.score, at: now, bd: pick.map((k) => k + ':' + (g.cnt[k] || 1)).join(','), bc: R.chips, bm: R.mult, bf: R.f }); mask.push('sc', 'at', 'bd', 'bc', 'bm', 'bf'); }
      if (await commit([save(fields, mask)])) return out(200, { ok: true, season, tries: n, max: mx, best: up ? R.score : (f.sc || 0), result: R, newBest: up, game: null });
      continue;
    }
    return out(400, { ok: false, error: 'bad' });
  }
  return out(409, { ok: false, error: 'busy' });
}

/* ================= 관리자 현황 =================
 * 관리자(아래 UID)만: 계정별 싱크칩 잔고·오늘 기록·싱크로 자동 기록 설정. 이메일·연동 상세는 보내지 않음 */
const ADMIN_UIDS = ['bAdQg5xtIsbCntzxuEjBoSB93T22', 'PdkjvEMLcaR76Ie7h13N6cnpDvT2'];
async function adminView(req, env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  const idt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idt) return out(401, { ok: false, error: 'auth' });
  const lk = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idt }) })).json();
  const uid = lk && lk.users && lk.users[0] && lk.users[0].localId; if (!uid || !ADMIN_UIDS.includes(uid)) return out(403, { ok: false, error: 'admin' });
  const sa = JSON.parse(env.FIREBASE_SA), at = await saToken(sa, 'https://www.googleapis.com/auth/datastore'), H = { Authorization: 'Bearer ' + at };
  if (req.method === 'POST') { /* 관리자 대리 수정: 자동 기록 프로필 주소·서버만 고침 { fix: { id: 문서ID 앞 6자, openid, area } } */
    let b = {}; try { b = await req.json(); } catch (e) { /* 빈 요청 */ }
    if (b.cfg || b.img || b.imgDel || b.raid || b.grant || b.fb || b.fbDel) return adminSite(b, H, out);
    const fx = b.fix || b.probe || {}, area = Number(fx.area), raw = String(fx.openid || '').trim();
    if (!/^[A-Za-z0-9]{6,40}$/.test(String(fx.id || '')) || (b.fix && ((raw && !toIntlId(raw)) || !AREAS.includes(area)))) return out(400, { ok: false, error: 'bad' });
    const ids = []; let p2 = '';
    for (let i = 0; i < 20; i++) { const r = await (await fetch(FS + '/users?pageSize=300&mask.fieldPaths=auto' + (p2 ? '&pageToken=' + encodeURIComponent(p2) : ''), { headers: H })).json(); (r.documents || []).forEach((d) => { if (d.name.split('/').pop().startsWith(fx.id)) ids.push(d); }); p2 = r.nextPageToken; if (!p2) break; }
    if (ids.length !== 1) return out(404, { ok: false, error: ids.length ? 'ambiguous' : 'notfound' });
    const d = ids[0], au = (d.fields && d.fields.auto && d.fields.auto.mapValue && d.fields.auto.mapValue.fields) || {};
    if (!(au.on && au.on.booleanValue)) return out(409, { ok: false, error: 'auto_off' }); /* 자동 기록을 켠 계정만 */
    if (b.probe) { /* 저장된 주소로 서버별 조회: 주소는 돌려주지 않고 서버별 레벨·오류만 */
      const sid = toIntlId(au.openid && au.openid.stringValue); if (!sid) return out(200, { ok: true, openid: false });
      const res = {}; for (const ar of AREAS) { try { const oi = (await post('GetUserProfileOutpostInfo', { intl_open_id: sid, nikke_area_id: ar }, env.BLA_COOKIE)).outpost_info || {}; res[ar] = { s: Number(oi.synchro_level) || 0, o: Number(oi.outpost_battle_level) || 0 }; } catch (e) { res[ar] = { err: String((e && e.message) || e).slice(0, 80) }; } }
      return out(200, { ok: true, openid: true, area: au.area && au.area.stringValue, res });
    }
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const q = (raw ? ['auto.openid', 'auto.area', 'autoDue'] : ['auto.area', 'autoDue']).map((f) => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const w = await fetch('https://firestore.googleapis.com/v1/' + d.name + '?' + q, { method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify({ fields: { autoDue: { stringValue: today }, auto: { mapValue: { fields: Object.assign(raw ? { openid: { stringValue: raw } } : {}, { area: { stringValue: String(area) } }) } } } }) });
    return out(w.ok ? 200 : 502, { ok: w.ok, error: w.ok ? undefined : 'write_' + w.status });
  }
  const mask = ['nickname', 'username', 'chipsV', 'chipDay', 'createdAt', 'updatedAt', 'auto', 'autoDue'].map((f) => 'mask.fieldPaths=' + f).join('&');
  const users = []; let pt = '';
  for (let i = 0; i < 20; i++) {
    const r = await (await fetch(FS + '/users?pageSize=300&' + mask + (pt ? '&pageToken=' + encodeURIComponent(pt) : ''), { headers: H })).json();
    (r.documents || []).forEach((d) => { const f = {}; Object.entries(d.fields || {}).forEach(([k, v]) => { f[k] = dec(v); }); const au = f.auto || null;
      users.push({ id: d.name.split('/').pop().slice(0, 6), nick: f.nickname || f.username || '', created: f.createdAt || d.createTime, updated: f.updatedAt || d.updateTime, chips: f.chipsV || null, day: f.chipDay || null,
        auto: au ? { on: !!au.on, area: au.area || '', since: au.since || 0, last: au.last ? { at: au.last.at || 0, ok: !!au.last.ok, s: au.last.s || 0, o: au.last.o || 0, code: au.last.code || '' } : null } : null, autoDue: f.autoDue || '', admin: ADMIN_UIDS.includes(d.name.split('/').pop()) }); });
    pt = r.nextPageToken; if (!pt) break;
  }
  let run = null; try { const d = await (await fetch(FS + '/meta/autoRun', { headers: H })).json(); if (d && d.fields) { run = {}; Object.entries(d.fields).forEach(([k, v]) => { run[k] = dec(v); }); } } catch (e) { /* 무시 */ }
  return out(200, { ok: true, users, autoRun: run });
}

/* ================= 사이트 설정(관리 탭) =================
 * meta/site: 가챠 머신 목록·보스 이름/이미지·공지(JSON 문자열 j). img/<id>: 관리자가 올린 이미지(base64).
 * GET /config, GET /img/<id>는 누구나 읽음. 쓰기는 /admin(POST, 관리자만). */
let CFG_MEM = null;
const FS_COMMIT = FS.replace(/\/documents$/, '/documents:commit'), FS_DOC = (path) => 'projects/' + FB_PROJECT + '/databases/(default)/documents/' + path;
async function saHead(env) { const sa = JSON.parse(env.FIREBASE_SA); return { Authorization: 'Bearer ' + await saToken(sa, 'https://www.googleapis.com/auth/datastore') }; }
async function fsGet(path, H) { const r = await fetch(FS + '/' + path, { headers: H }); if (!r.ok) return null; const d = await r.json(), o = {}; Object.entries(d.fields || {}).forEach(([k, v]) => { o[k] = dec(v); }); return { name: d.name, updateTime: d.updateTime, f: o }; }
async function siteConfig(env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  const now = Date.now();
  if (!CFG_MEM || now - CFG_MEM.t > 30000) {
    const H = await saHead(env), [st, rd] = await Promise.all([fsGet('meta/site', H), fsGet('meta/raid', H)]);
    let cfg = null; try { cfg = st && st.f.j ? JSON.parse(st.f.j) : null; if (cfg) delete cfg.tv; } catch (e) { cfg = null; }
    const f = rd && rd.f, season = f && f.on && f.id ? { id: f.id, e: f.e, r: f.r, start: f.start, end: f.end } : null;
    CFG_MEM = { t: now, body: { cfg, season } };
  }
  return out(200, Object.assign({ ok: true, now }, CFG_MEM.body), { 'Cache-Control': 'public, max-age=30' });
}
let TV_MEM = null;
async function siteTv(env) { const now = Date.now(); if (TV_MEM && now - TV_MEM.t < 30000) return TV_MEM.tv; const st = await fsGet('meta/site', await saHead(env)); let tv = null; try { const c = st && st.f.j ? JSON.parse(st.f.j) : null; tv = c ? { tv: c.tv || null, nk: c.nk || [], packs: c.packs || [], gacha: c.gacha || [] } : null; } catch (e) { tv = null; } TV_MEM = { t: now, tv }; return tv; }
async function siteImg(id, env, out) {
  if (!/^[a-z0-9]{8,24}$/.test(id) || !env.FIREBASE_SA) return out(404, { ok: false, error: 'not found' });
  const d = await fsGet('img/' + id, await saHead(env)); if (!d || !d.f.b) return out(404, { ok: false, error: 'not found' });
  const bin = atob(d.f.b), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Response(u8, { status: 200, headers: { 'Content-Type': /^image\/(webp|jpeg|png)$/.test(d.f.t) ? d.f.t : 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } });
}
async function adminSite(b, H0, out) {
  const H = Object.assign({ 'Content-Type': 'application/json' }, H0), now = Date.now();
  const commit = async (writes) => (await fetch(FS_COMMIT, { method: 'POST', headers: H, body: JSON.stringify({ writes }) })).ok;
  const str = (v, n) => String(v == null ? '' : v).replace(/[<>\u0000-\u001f]/g, '').slice(0, n), ref = (v) => (/^(img:[a-z0-9]{8,24}|assets\/img\/[A-Za-z0-9._-]{1,80})$/.test(String(v || '')) ? String(v) : ''), ms = (v) => { const n = Math.floor(+v || 0); return n > 1e12 && n < 5e12 ? n : 0; };
  if (b.img) { /* 이미지 올리기 { img: { data: base64, type } } → { id } */
    const data = String(b.img.data || ''), type = String(b.img.type || 'image/webp');
    if (!/^image\/(webp|jpeg|png)$/.test(type) || data.length < 100 || data.length > 940000 || !/^[A-Za-z0-9+/]+=*$/.test(data)) return out(400, { ok: false, error: 'img' });
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((x) => x.toString(16).padStart(2, '0')).join('');
    const ok = await commit([{ update: { name: FS_DOC('img/' + id), fields: { t: fsv(type), b: fsv(data), at: fsv(now) } } }]);
    return out(ok ? 200 : 502, { ok, id });
  }
  if (b.imgDel) { const id = String(b.imgDel); if (!/^[a-z0-9]{8,24}$/.test(id)) return out(400, { ok: false, error: 'bad' }); const ok = await commit([{ delete: FS_DOC('img/' + id) }]); return out(ok ? 200 : 502, { ok }); }
  if (b.cfg) { /* 가챠 머신 목록·보스 이름/이미지·공지 */
    const nmL = (L) => (Array.isArray(L) ? L : []).slice(0, 400).map((v) => str(v, 40)).filter(Boolean);
    const c = b.cfg, g = (Array.isArray(c.gacha) ? c.gacha : []).slice(0, 12).map((x) => ({ id: str(x.id, 20).replace(/[^0-9a-zA-Z_-]/g, '') || String(now), n: str(x.n, 40), rate: +x.rate === 2 ? 2 : 1, corp: ['엘리시온', '미실리스', '테트라', '필그림', '어브노멀'].includes(x.corp) ? x.corp : '', cover: ref(x.cover), face: ref(x.face), s: ms(x.s), e: ms(x.e), pin: x.pin ? 1 : 0, code: String(x.code || '').replace(/\D/g, '').slice(0, 6), el: R_CYC.includes(x.el) ? x.el : '', wp: ['AR', 'SMG', 'SG', 'SR', 'RL', 'MG'].includes(x.wp) ? x.wp : '', cls: ['화력형', '방어형', '지원형'].includes(x.cls) ? x.cls : '', pool: { out: nmL(x.pool && x.pool.out), inc: nmL(x.pool && x.pool.inc) } })).filter((x) => x.n && x.cover);
    const cfg = { gacha: g, raid: { nm: str(c.raid && c.raid.nm, 30), img: ref(c.raid && c.raid.img) }, notice: str(c.notice, 200), frames: {}, at: now };
    Object.keys(c.frames && typeof c.frames === 'object' ? c.frames : {}).slice(0, 40).forEach((sid) => { if (!/^[0-9a-zA-Z-]{1,20}$/.test(sid)) return; const o = {}; [1, 2, 3].forEach((t) => { const v = ref(c.frames[sid] && c.frames[sid][t]); if (v) o[t] = v; }); if (Object.keys(o).length) cfg.frames[sid] = o; }); /* 시즌별 순위 보상 테두리(1 = 상위 3%, 2 = 10%, 3 = 30%) */
    cfg.nk = (Array.isArray(c.nk) ? c.nk : []).slice(0, 40).map((x) => ({ n: str(x.n, 40), code: String(x.code || '').replace(/\D/g, '').slice(0, 6), corp: ['엘리시온', '미실리스', '테트라', '필그림', '어브노멀'].includes(x.corp) ? x.corp : '', el: R_CYC.includes(x.el) ? x.el : '', wp: ['AR', 'SMG', 'SG', 'SR', 'RL', 'MG'].includes(x.wp) ? x.wp : '', bu: x.bu === 'A' ? 'A' : [1, 2, 3].includes(+x.bu) ? +x.bu : 3, img: ref(x.img) })).filter((x) => x.n && x.code.length >= 3 && x.corp && x.el && x.wp && !RAID_NK0[x.code]); /* 도감에 없는 신규 니케의 카드 정보 */
    cfg.packs = (Array.isArray(c.packs) ? c.packs : []).slice(0, 12).map((x) => ({ id: str(x.id, 20).replace(/[^0-9a-zA-Z_-]/g, ''), n: str(x.n, 40), code: String(x.code || '').replace(/\D/g, '').slice(0, 6), cover: ref(x.cover), c2: /^#[0-9a-fA-F]{6}$/.test(x.c2) ? x.c2 : '#ffcf5a', rate: +x.rate === 1 ? 1 : 2 })).filter((x) => x.id && x.n && x.code && x.cover); /* 픽업 부스터팩 */
    if (c.tiers && typeof c.tiers === 'object') { /* 절대 티어표: 이름→티어(솔레·PvP), 픽업(★) 목록, 서버용 코드→등급 */
      const LV = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E', 'F'], tm = (m) => { const o = {}; Object.keys(m && typeof m === 'object' ? m : {}).slice(0, 600).forEach((n) => { const k = str(n, 40); if (k && LV.includes(m[n])) o[k] = m[n]; }); return o; };
      cfg.tiers = { boss: tm(c.tiers.boss), pvp: tm(c.tiers.pvp), pu: (Array.isArray(c.tiers.pu) ? c.tiers.pu : []).slice(0, 60).map((n) => str(n, 40)).filter(Boolean) };
      cfg.tv = {}; Object.keys(c.tv && typeof c.tv === 'object' ? c.tv : {}).slice(0, 800).forEach((k) => { const v = Math.floor(+c.tv[k]); if (/^\d{1,6}$/.test(k) && v >= 1 && v <= 9) cfg.tv[k] = v; });
    }
    const ok = await commit([{ update: { name: FS_DOC('meta/site'), fields: { j: fsv(JSON.stringify(cfg)), at: fsv(now) } } }]); CFG_MEM = null; TV_MEM = null;
    return out(ok ? 200 : 502, { ok, cfg });
  }
  if (b.raid) { /* 시즌 일정·약점: 같은 id면 수정, 다른 id면 새 시즌(순위 새로 시작), off면 닫기 */
    const q = b.raid, old = await fsGet('meta/raid', H0), of = (old && old.f) || {};
    let sn;
    if (q.off) { sn = { on: false }; const prev = of.id && of.on ? { id: of.id, end: Math.min(of.end || now, now) } : of.prev || null; if (prev) sn.prev = prev; }
    else {
      const id = str(q.id, 20).replace(/[^0-9a-zA-Z-]/g, ''), start = ms(q.start), end = ms(q.end);
      if (!id || !R_CYC.includes(q.e) || !R_RNG[q.r] || !start || end <= start) return out(400, { ok: false, error: 'bad' });
      sn = { id, e: q.e, r: q.r, start, end, on: true };
      const prev = of.id && of.on && of.id !== id ? { id: of.id, end: Math.min(of.end || now, now) } : of.prev || null; if (prev) sn.prev = prev;
    }
    const ok = await commit([{ update: { name: FS_DOC('meta/raid'), fields: fsv(sn).mapValue.fields } }]); CFG_MEM = null;
    return out(ok ? 200 : 502, { ok, season: sn });
  }
  if (b.fb) { /* 피드백 목록(최근 100개) */
    const q = await (await fetch(FS + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'feedback' }], orderBy: [{ field: { fieldPath: 't' }, direction: 'DESCENDING' }], limit: 100 } }) })).json();
    const rows = (Array.isArray(q) ? q : []).filter((x) => x.document).map((x) => { const f = {}; Object.entries(x.document.fields || {}).forEach(([k, v]) => { f[k] = dec(v); }); return { id: x.document.name.split('/').pop(), t: f.t || 0, text: f.text || '', page: f.page || '', nick: f.nick || '', uid: String(f.uid || '').slice(0, 6) }; });
    return out(200, { ok: true, rows });
  }
  if (b.fbDel) { const id = String(b.fbDel); if (!/^[a-z0-9]{8,24}$/.test(id)) return out(400, { ok: false, error: 'bad' }); const ok = await commit([{ delete: FS_DOC('feedback/' + id) }]); return out(ok ? 200 : 502, { ok }); }
  if (b.grant) { /* 칩 지급·회수 { grant: { id: 문서ID 앞 6자, d, r } } */
    const gid = String(b.grant.id || ''), dd = Math.floor(+b.grant.d || 0), dr = Math.floor(+b.grant.r || 0);
    if (!/^[A-Za-z0-9]{6,40}$/.test(gid) || (!dd && !dr) || Math.abs(dd) > 1000000 || Math.abs(dr) > 10000) return out(400, { ok: false, error: 'bad' });
    const ids = []; let p2 = '';
    for (let i = 0; i < 20; i++) { const r = await (await fetch(FS + '/users?pageSize=300&mask.fieldPaths=chipsV&mask.fieldPaths=chips' + (p2 ? '&pageToken=' + encodeURIComponent(p2) : ''), { headers: H0 })).json(); (r.documents || []).forEach((d) => { if (d.name.split('/').pop().startsWith(gid)) ids.push(d); }); p2 = r.nextPageToken; if (!p2) break; }
    if (ids.length !== 1) return out(404, { ok: false, error: ids.length ? 'ambiguous' : 'notfound' });
    const d = ids[0], f = d.fields || {}, old = dec(f.chips) || {}, cv = dec(f.chipsV) || { d: Math.max(0, Math.floor(+old.d || 0)), r: Math.max(0, Math.floor(+old.r || 0)) };
    const nv = { d: Math.max(0, (cv.d || 0) + dd), r: Math.max(0, (cv.r || 0) + dr) };
    const ok = await commit([{ update: { name: d.name, fields: { chipsV: fsv(nv) } }, updateMask: { fieldPaths: ['chipsV'] }, currentDocument: { updateTime: d.updateTime } }]);
    return out(ok ? 200 : 409, { ok, chips: nv, error: ok ? undefined : 'busy' });
  }
  return out(400, { ok: false, error: 'bad' });
}

/* ================= 피드백 · 버그 제보 =================
 * 누구나 보낼 수 있음(로그인하면 닉네임이 함께 남음). feedback/<id>에 저장하고 관리 탭에서 읽음. 같은 주소에서 1분에 3건까지 */
const FB_RATE = new Map();
async function feedback(req, env, out) {
  if (!env.FIREBASE_SA) return out(503, { ok: false, error: 'not_ready' });
  let b = {}; try { b = await req.json(); } catch (e) { return out(400, { ok: false, error: 'bad' }); }
  const text = String(b.text || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 1000); if (text.length < 5) return out(400, { ok: false, error: 'short' });
  const ip = req.headers.get('CF-Connecting-IP') || '?', now = Date.now(), L = (FB_RATE.get(ip) || []).filter((t) => now - t < 60000); if (L.length >= 3) return out(429, { ok: false, error: 'too_many' }); L.push(now); FB_RATE.set(ip, L); if (FB_RATE.size > 5000) FB_RATE.clear();
  let uid = '', nick = ''; const H0 = await saHead(env);
  const idt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (idt) { try { const lk = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idt }) })).json(); uid = (lk && lk.users && lk.users[0] && lk.users[0].localId) || ''; if (uid) { const ud = await fsGet('users/' + uid, H0); nick = String((ud && (ud.f.nickname || ud.f.username)) || '').slice(0, 24); } } catch (e) { /* 비로그인으로 처리 */ } }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((x) => x.toString(16).padStart(2, '0')).join('');
  const r = await fetch(FS_COMMIT, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H0), body: JSON.stringify({ writes: [{ update: { name: FS_DOC('feedback/' + id), fields: { t: fsv(now), text: fsv(text), page: fsv(String(b.page || '').replace(/[^a-z0-9]/gi, '').slice(0, 20)), uid: fsv(uid), nick: fsv(nick) } } }] }) });
  return out(r.ok ? 200 : 502, { ok: r.ok });
}
