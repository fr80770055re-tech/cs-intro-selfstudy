// 首頁：依照學習進度產生「繼續學習」和學習路線
(function () {
  "use strict";
  const P = window.Progress, SK = window.SKILLS || [], CH = window.CHAPTERS || [], T = window.AUDIO_TRACKS || [];
  const I = (id) => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
  let au = {}; try { au = JSON.parse(localStorage.getItem("csintro.audio.v1")) || {}; } catch (e) {}
  const heard = (n) => { const t = T[n - 1]; return !!(t && au.done && au.done[t.id]); };
  const mastered = (s) => !!(P.data.skills[s.id] && P.data.skills[s.id].mastered);
  const due = SK.filter((s) => P.status(s.id) === "due");
  const next = SK.find((s) => !mastered(s));
  const started = SK.some((s) => P.data.skills[s.id] && P.data.skills[s.id].attempts) || T.some((t, i) => heard(i + 1));
  const m = SK.filter(mastered).length, d = T.filter((t, i) => heard(i + 1)).length;
  const curCh = next ? next.ch : null;
  const chOf = (n) => CH.find((c) => c.n === n);

  /* ---------- 繼續學習 ---------- */
  const R = document.getElementById("resume");
  let head, sub, acts;
  if (due.length) {
    R.classList.add("due");
    head = `今天有 ${due.length} 種題型該複習了`;
    sub = `先把快忘記的找回來，大約 5 分鐘：${due.slice(0, 3).map((s) => s.name).join("、")}${due.length > 3 ? " 等" : ""}。`;
    acts = `<a class="btn primary" href="practice.html#review">開始今日複習 ${I("arrow-right")}</a>`;
  } else if (!started) {
    head = "從第 0 章開始";
    sub = "先讀講義 0.1～0.4，大約 20 分鐘。讀完就可以做第一個練習「2 的次方」。";
    acts = `<a class="btn" href="practice.html#skill=pow2">先看看練習題</a><a class="btn primary" href="lesson.html#ch0">開始讀講義 ${I("arrow-right")}</a>`;
  } else if (next) {
    const c = chOf(next.ch), st = P.data.skills[next.id];
    head = `繼續：${c.n === 9 ? "綜合練習" : `第 ${c.n} 章　${c.title}`}`;
    sub = `下一個要練熟的題型是「${next.name}」${st && st.streak ? `，目前連續答對 ${Math.min(st.streak, P.GOAL)} / ${P.GOAL}` : ""}。忘記方法就先回講義看一下。`;
    acts = `<a class="btn" href="${next.lesson}">回講義</a><a class="btn primary" href="practice.html#skill=${next.id}">練習 ${I("arrow-right")}</a>`;
  } else {
    head = "全部題型都精熟了";
    sub = "記得照提醒回來複習。也可以用混合挑戰測試自己，或印一份紙筆練習卷。";
    acts = `<a class="btn" href="practice.html">練習頁</a><a class="btn primary" href="practice.html#challenge">混合挑戰 ${I("arrow-right")}</a>`;
  }
  R.innerHTML = `<div><p class="head">${head}</p><p class="sub">${sub}</p></div><div class="acts">${acts}</div>
    <div class="totals"><span>精熟 <b>${m} / ${SK.length}</b> 種題型<span class="meter ok"><i style="width:${SK.length ? (m / SK.length) * 100 : 0}%"></i></span></span>
    <span>聽完 <b>${d} / ${T.length}</b> 集音檔<span class="meter"><i style="width:${T.length ? (d / T.length) * 100 : 0}%"></i></span></span></div>`;

  /* ---------- 學習路線 ---------- */
  let h = "", lastPart = -1;
  for (const c of CH) {
    if (c.part && c.part !== lastPart) { h += `<li class="partrow"><span class="part">講義 ${c.part === 1 ? "①　整數" : "②　更多資料表示"}</span></li>`; lastPart = c.part; }
    const ss = SK.filter((s) => s.ch === c.n), mm = ss.filter(mastered).length, all = ss.length > 0 && mm === ss.length;
    const cls = all ? "done" : c.n === curCh ? "cur" : "";
    const firstOpen = ss.find((s) => !mastered(s)) || ss[0];
    const ah = c.audio.map((n) => `<a href="audio.html#${n}">${I("headphones")}第 ${n} 集${heard(n) ? ` <span class="ct ok">✓</span>` : ""}</a>`).join("");
    const lessonLink = c.n === 9 ? `<a href="practice.html#challenge">${I("shuffle")}混合挑戰</a>` : `<a href="${c.lesson}">${I("book")}讀講義</a>`;
    const practice = firstOpen ? `<a href="practice.html#skill=${firstOpen.id}" class="${all ? "ok" : ""}">${I("pencil")}練習 <span class="ct">${mm}/${ss.length}</span></a>` : "";
    h += `<li class="${cls} ${c.n === 9 ? "extra" : ""}">
      <div class="node" aria-hidden="true">${c.n === 9 ? "綜" : c.n}</div>
      <div class="body">
        <div class="top"><h3>${c.n === 9 ? "" : `<span class="sr">第 ${c.n} 章 </span>`}${c.title}</h3><span class="days">${c.days}${all ? "・已精熟" : ""}</span></div>
        <p>${c.sum}</p>
        <div class="links">${lessonLink}${practice}${ah}</div>
      </div></li>`;
  }
  document.getElementById("route").innerHTML = h;
})();
