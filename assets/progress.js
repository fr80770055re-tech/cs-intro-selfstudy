// 學習進度：存在這台裝置的瀏覽器裡（localStorage）。首頁和練習頁共用。
(function () {
  "use strict";
  const KEY = "csintro.progress.v1";
  const DAY = 86400000;
  const GOAL = 5;                       // 連續答對幾題算精熟
  const INTERVAL = [0, 1, 3, 7, 14, 30]; // 精熟後第 n 次複習間隔（天）

  function blank() { return { skills: {}, days: {} }; }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.skills) return s; } catch (e) {}
    return blank();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function skill(id) {
    return S.skills[id] || (S.skills[id] = { attempts: 0, correct: 0, streak: 0, mastered: false, box: 0, due: 0, recent: [] });
  }
  function status(id) {
    const s = S.skills[id];
    if (!s || !s.attempts) return "new";
    if (s.mastered) return s.due <= Date.now() ? "due" : "mastered";
    return "learning";
  }
  function level(id) { const s = skill(id); return s.mastered || s.streak >= 2 ? 2 : 1; }
  // 記錄一次作答。hinted = 有用提示（答對也不列入連續答對）
  function record(id, ok, hinted) {
    const s = skill(id), now = Date.now(), d = S.days[today()] || (S.days[today()] = { n: 0, c: 0 });
    s.attempts++; d.n++;
    s.recent.push(ok ? 1 : 0); if (s.recent.length > 10) s.recent.shift();
    let event = null;
    if (ok) {
      s.correct++; d.c++;
      if (!hinted) {
        s.streak++;
        if (!s.mastered && s.streak >= GOAL) { s.mastered = true; s.box = 1; s.due = now + INTERVAL[1] * DAY; event = "mastered"; }
        else if (s.mastered && s.due <= now) { s.box = Math.min(s.box + 1, 5); s.due = now + INTERVAL[s.box] * DAY; event = "reviewed"; }
      }
    } else {
      s.streak = 0;
      if (s.mastered) { s.box = 1; s.due = now + INTERVAL[1] * DAY; event = "lapse"; }
    }
    save();
    return event;
  }
  function daysUntil(ts) { return Math.max(0, Math.ceil((ts - Date.now()) / DAY)); }
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function importCode(code) {
    const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!s || typeof s.skills !== "object") throw new Error("bad");
    S = s; save();
  }
  function reset() { S = blank(); save(); }
  window.Progress = { GOAL, INTERVAL, get data() { return S; }, skill, status, level, record, daysUntil, today, exportCode, importCode, reset };
})();
