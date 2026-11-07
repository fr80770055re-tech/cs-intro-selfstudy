// 各頁共用的 <head> 片段與頂部導覽列。refactor 時用來產生一致的 HTML。
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Noto+Serif+TC:wght@700;900&display=swap">`;
const ICON = (id) => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
function topbar(cur){
  const items = [["index.html", "首頁", null], ["lesson.html", "講義", "book"], ["practice.html", "練習", "pencil"], ["audio.html", "音檔", "headphones"]];
  const isCur = (h) => h === cur || (cur === "lesson-2.html" && h === "lesson.html");
  return `<header class="topbar">
  <a class="logo" href="index.html" aria-label="計概自學・資料表示 首頁"><span class="logo-mark" aria-hidden="true"><i class="on"></i><i></i><i class="on"></i><i class="on"></i></span><span class="logo-text">計概自學・資料表示</span></a>
  <nav aria-label="主選單">${items.map(([h, t, ic]) => `<a href="${h}"${isCur(h) ? ' aria-current="page"' : ""}>${ic ? ICON(ic) : ""}${t}</a>`).join("")}</nav>
</header>`;
}
const PAGE1 = [["start","怎麼使用這份講義","ch"],["ch0","第 0 章　開始之前","ch"],["ch0-1","0.1 電腦只認得 0 和 1"],["ch0-2","0.2 位元與位元組"],["ch0-3","0.3 重新認識十進位"],["ch0-4","0.4 次方的寫法"],
["ch1","第 1 章　進位轉換","ch"],["ch1-1","1.1 什麼是「進位制」"],["ch1-2","1.2 任何進位 → 十進位"],["ch1-3","1.3 十進位 → 其他進位"],["ch1-4","1.4 小數的轉換"],["ch1-5","1.5 分組捷徑"],["ch1-ex","例題"],
["ch2","第 2 章　負數與溢位","ch"],["ch2-1","2.1 沒有負號可用"],["ch2-2","2.2 三種表示負數的方法"],["ch2-3","2.3 用 2 補數做加減法"],["ch2-4","2.4 溢位"],["ch2-ex","例題"]];
const PAGE2 = [["start","這份講義要學什麼","ch"],["ch3","第 3 章　位元寬度與位元運算","ch"],["ch3-1","3.1 無號數與有號數"],["ch3-2","3.2 擴充位元寬度"],["ch3-3","3.3 邏輯運算"],["ch3-4","3.4 移位"],["ch3-ex","例題"],
["ch4","第 4 章　浮點數","ch"],["ch4-1","4.1 為什麼需要浮點數"],["ch4-2","4.2 二進位的科學記號"],["ch4-3","4.3 偏移表示法"],["ch4-4","4.4 IEEE 754 單精度"],["ch4-5","4.5 浮點數的極限"],["ch4-ex","例題"],
["ch5","第 5 章　文字、圖片與聲音","ch"],["ch5-1","5.1 容量單位"],["ch5-2","5.2 文字"],["ch5-3","5.3 圖片"],["ch5-4","5.4 聲音"],["ch5-5","5.5 壓縮"],["ch5-ex","例題"]];
function toc(page){
  const here = page === 1 ? PAGE1 : PAGE2, other = page === 1 ? PAGE2 : PAGE1, otherFile = page === 1 ? "lesson-2.html" : "lesson.html";
  const local = here.map(([id, t, c]) => `<a href="#${id}" class="${c || "sub"}">${t}</a>`).join("\n  ");
  const far = other.filter(([id, , c]) => c && id !== "start").map(([id, t]) => `<a href="${otherFile}#${id}" class="ch other">${t}</a>`).join("\n  ");
  const p1 = `<div class="part">講義 ①　整數</div>`, p2 = `<div class="part">講義 ②　更多資料表示</div>`;
  return `<nav class="toc" aria-label="目錄"><details open><summary>目錄<span class="cur"></span></summary><div class="links">
  ${page === 1 ? `${p1}\n  ${local}\n  ${p2}\n  ${far}` : `${p1}\n  ${far}\n  ${p2}\n  ${local}`}
  </div></details></nav>`;
}
module.exports = { FONTS, ICON, topbar, toc };
