// ==UserScript==
// @name         DOROSYNC 블라블라링크 연동
// @namespace    dorosync
// @version      2.2.1
// @description  도로싱크에서 요청하면, 로그인된 블라블라링크 세션의 싱크로·전초기지 레벨·니케 장비(오버로드)·최근 보스 클리어 기록을 도로싱크로 전달합니다.
// @match        https://*.blablalink.com/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/levelinfinikke/DOROSYNC/main/dorosync-blablalink.user.js
// @updateURL    https://raw.githubusercontent.com/levelinfinikke/DOROSYNC/main/dorosync-blablalink.user.js
// ==/UserScript==
(function () {
  'use strict';
  if (window.__doroBL) return;
  window.__doroBL = true;

  // 정보를 받을 수 있는 도로싱크 주소 (그 외 주소에는 아무것도 보내지 않습니다)
  var ORIGIN_OK = /^(https:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.frame\.claudeusercontent\.com|https:\/\/levelinfinikke\.github\.io)$/;
  var API = 'https://api.blablalink.com/api/';
  // 챕터별 보스 스테이지 번호 (스테이지 ID 끝 3자리). 인덱스 = 챕터
  var CHAP = [3,4,12,16,18,20,30,34,27,27,27,27,28,29,35,37,33,38,40,42,41,42,43,42,44,40,42,44,43,42,42,44,45,42,46,44,45,44,45,44,44,44,44,44,44,44,44,44,44,44,44];
  var busy = false;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(n, w) { return String(n).padStart(w, '0'); }

  // 요청이 너무 잦으면(1300015) 잠시 쉬었다가 다시 시도
  async function post(path, body) {
    for (var t = 0; t < 6; t++) {
      var r = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var j = await r.json();
      if (String(j && j.code) === '1300015') { await sleep(2500); continue; }
      return j;
    }
    throw new Error('요청이 너무 잦아 잠시 후 다시 시도해 주세요.');
  }

  // 가장 멀리 클리어한 스테이지(progress)에서 마지막으로 클리어한 보스 기록을 찾는다.
  // 진행 스테이지가 보스가 아니면 이전 챕터 보스 기록을 다시 요청한다.
  async function findClear(modeDigit, progress, area) {
    progress = Number(progress) || 0;
    if (!progress) return null;
    var ch = Math.floor(progress / 1000) % 1000, idx = progress % 1000;
    var boss = CHAP[ch];
    var c = (boss != null && idx >= boss) ? ch : Math.min(ch - 1, CHAP.length - 1);
    for (var tries = 0; tries < 6 && c >= 0; tries++, c--) {
      var id = Number(modeDigit + pad(c, 3) + pad(CHAP[c], 3));
      var r = await post('game/proxy/Game/GetMainQuestClearLineup', { stage_id: id, area_id: area });
      await sleep(350);
      var d = r && r.data;
      if (String(r && r.code) === '0' && d && d.list && d.list.length) {
        var lv = 0, sum = 0;
        d.list.forEach(function (x) { lv = Math.max(lv, Number(x.lv) || 0); sum += Number(x.combat) || 0; });
        return { mode: modeDigit === '7' ? 'hard' : 'normal', chapter: c, stageId: id, lv: lv, power: sum, clearedAt: Number(d.cleared_at) || 0, progress: progress };
      }
    }
    return { mode: modeDigit === '7' ? 'hard' : 'normal', chapter: null, stageId: null, lv: 0, power: 0, clearedAt: 0, progress: progress };
  }

  async function sync(report) {
    report = report || function () {};
    report('info', '유저 정보를 확인하는 중…');
    var p = await post('ugc/direct/standalonesite/User/GetUserGamePlayerInfo', {});
    var d = (p && p.data) || {};
    var area = Number(d.area_id);
    if (!area) throw new Error('로그인 또는 서버 정보를 확인하지 못했습니다. 블라블라링크에 로그인했는지 확인해 주세요.');
    var id = '';

    // 싱크로 · 전초기지 레벨
    report('outpost', '싱크로·전초기지 레벨을 불러오는 중…');
    var o = await post('game/proxy/Game/GetUserProfileOutpostInfo', { intl_open_id: id, nikke_area_id: area });
    var oi = (o && o.data && o.data.outpost_info) || {};

    // 니케 목록 · 장비
    report('chars', '니케 목록과 오버로드 장비를 불러오는 중…');
    var ch = await post('game/proxy/Game/GetUserCharacters', { intl_open_id: id, nikke_area_id: area });
    if (String(ch && ch.code) !== '0') throw new Error((ch && (ch.message || ch.msg)) || '니케 목록을 불러오지 못했습니다.');
    var base = {};
    ((ch.data && ch.data.characters) || []).forEach(function (c) { base[String(c.name_code)] = c; });
    var codes = Object.keys(base);
    var list = [];
    for (var i = 0; i < codes.length; i += 40) {
      var j = await post('game/proxy/Game/GetUserCharacterDetails', { intl_open_id: id, nikke_area_id: area, name_codes: codes.slice(i, i + 40) });
      if (String(j && j.code) !== '0') throw new Error((j && (j.message || j.msg)) || '장비 정보를 불러오지 못했습니다.');
      list = list.concat((j.data && j.data.character_details) || []);
      await sleep(250);
    }
    var slots = ['head', 'torso', 'arm', 'leg'];
    var nikkes = list.map(function (c) {
      var parts = {};
      slots.forEach(function (s) {
        parts[s] = [1, 2, 3].map(function (n) { return Number(c[s + '_equip_option' + n + '_id']) || 0; });
      });
      // 돌파(grade)·코강(core)·전투력은 니케 목록(GetUserCharacters)에 있으므로 상세 정보에 없으면 목록 값을 사용
      var b0 = base[String(c.name_code)] || {};
      var n = function (k) { return Number(c[k]) || Number(b0[k]) || 0; };
      return {
        code: String(c.name_code), name: '', combat: n('combat'), lv: n('lv'),
        core: n('core'), grade: n('grade'),
        sk: [n('skill1_lv'), n('skill2_lv'), n('ulti_skill_lv')],
        eq: { head: n('head_equip_lv'), torso: n('torso_equip_lv'), arm: n('arm_equip_lv'), leg: n('leg_equip_lv') },
        fav: { tid: n('favorite_item_tid'), lv: n('favorite_item_lv') },
        parts: parts
      };
    });
    var top5 = nikkes.map(function (n) { return n.combat; }).sort(function (a, b) { return b - a; }).slice(0, 5)
      .reduce(function (a, b) { return a + b; }, 0);

    // 최근 보스 클리어 기록 (노멀 / 하드)
    report('normal', '노멀 클리어 기록을 찾는 중…');
    var normal = await findClear('6', d.normal_progress, area);
    report('hard', '하드 클리어 기록을 찾는 중…');
    var hard = await findClear('7', d.hard_progress, area);

    return {
      area: area,
      me: {
        role: String(d.role_name || ''),
        synchro: Number(oi.synchro_level) || 0,
        outpost: Number(oi.outpost_battle_level) || 0,
        top5: top5
      },
      clear: { normal: normal, hard: hard },
      nikkes: nikkes
    };
  }

  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d || d.type !== 'DORO_BL_HELLO' || !ORIGIN_OK.test(e.origin) || !e.source) return;
    if (busy) return;
    busy = true;
    var src = e.source, origin = e.origin, token = String(d.token || '');
    var report = function (step, text) { try { src.postMessage({ type: 'DORO_BL_PROGRESS', token: token, step: step, text: text }, origin); } catch (e) { /* ignore */ } };
    sync(report).then(function (r) {
      src.postMessage({ type: 'DORO_BL_RESULT', token: token, ok: true, area: r.area, me: r.me, clear: r.clear, nikkes: r.nikkes }, origin);
    }).catch(function (err) {
      src.postMessage({ type: 'DORO_BL_RESULT', token: token, ok: false, error: String((err && err.message) || err) }, origin);
    }).then(function () { busy = false; });
  });

  function ready() {
    try { if (window.opener && window.opener !== window) window.opener.postMessage({ type: 'DORO_BL_READY' }, '*'); } catch (e) { /* ignore */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
