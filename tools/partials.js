// 各頁共用的 <head> 片段、頂部導覽列與講義目錄。執行 `node tools/partials.js` 會把三份講義裡的
// <!--TOPBAR--> / <!--TOC--> 標記，或既有的 <header class="topbar"> / <nav class="toc"> 區塊，換成最新版本。
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Noto+Serif+TC:wght@700;900&display=swap">`;
const ICON = (id) => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
const LESSONS = ["lesson.html", "lesson-2.html", "lesson-3.html"];
function topbar(cur){
  const items = [["index.html", "首頁", null], ["lesson.html", "講義", "book"], ["practice.html", "練習", "pencil"], ["audio.html", "音檔", "headphones"]];
  const isCur = (h) => h === cur || (LESSONS.includes(cur) && h === "lesson.html");
  return `<header class="topbar">
  <a class="logo" href="index.html" aria-label="計概自學 首頁"><span class="logo-mark" aria-hidden="true"><i class="on"></i><i></i><i class="on"></i><i class="on"></i></span><span class="logo-text">計概自學</span></a>
  <nav aria-label="主選單">${items.map(([h, t, ic]) => `<a href="${h}"${isCur(h) ? ' aria-current="page"' : ""}>${ic ? ICON(ic) : ""}${t}</a>`).join("")}</nav>
</header>`;
}
const PAGES = [
  { file: "lesson.html", part: "講義 ①　整數", toc: [["start","怎麼使用這份講義","ch"],["ch0","第 0 章　開始之前","ch"],["ch0-1","0.1 電腦只認得 0 和 1"],["ch0-2","0.2 位元與位元組"],["ch0-3","0.3 重新認識十進位"],["ch0-4","0.4 次方的寫法"],
    ["ch1","第 1 章　進位轉換","ch"],["ch1-1","1.1 什麼是「進位制」"],["ch1-2","1.2 任何進位 → 十進位"],["ch1-3","1.3 十進位 → 其他進位"],["ch1-4","1.4 小數的轉換"],["ch1-5","1.5 分組捷徑"],["ch1-ex","例題"],
    ["ch2","第 2 章　負數與溢位","ch"],["ch2-1","2.1 沒有負號可用"],["ch2-2","2.2 三種表示負數的方法"],["ch2-3","2.3 用 2 補數做加減法"],["ch2-4","2.4 溢位"],["ch2-ex","例題"]] },
  { file: "lesson-2.html", part: "講義 ②　更多資料表示", toc: [["start","這份講義要學什麼","ch"],["ch3","第 3 章　位元寬度與位元運算","ch"],["ch3-1","3.1 無號數與有號數"],["ch3-2","3.2 擴充位元寬度"],["ch3-3","3.3 邏輯運算"],["ch3-4","3.4 移位"],["ch3-ex","例題"],
    ["ch4","第 4 章　浮點數","ch"],["ch4-1","4.1 為什麼需要浮點數"],["ch4-2","4.2 二進位的科學記號"],["ch4-3","4.3 偏移表示法"],["ch4-4","4.4 IEEE 754 單精度"],["ch4-5","4.5 浮點數的極限"],["ch4-ex","例題"],
    ["ch5","第 5 章　文字、圖片與聲音","ch"],["ch5-1","5.1 容量單位"],["ch5-2","5.2 文字"],["ch5-3","5.3 圖片"],["ch5-4","5.4 聲音"],["ch5-5","5.5 壓縮"],["ch5-ex","例題"]] },
  { file: "lesson-3.html", part: "講義 ③　電腦、網路與軟體", toc: [["start","這份講義要學什麼","ch"],
    ["ch6","第 6 章　電腦的構成","ch"],["ch6-1","6.1 五大單元"],["ch6-2","6.2 從邏輯閘到加法器"],["ch6-3","6.3 CPU 裡面有什麼"],["ch6-4","6.4 指令週期"],["ch6-5","6.5 記憶體階層"],["ch6-6","6.6 匯流排與周邊"],["ch6-ex","例題"],
    ["ch7","第 7 章　圖靈機與馮紐曼模型","ch"],["ch7-1","7.1 什麼是「計算」"],["ch7-2","7.2 圖靈機"],["ch7-3","7.3 馮紐曼模型"],["ch7-4","7.4 電腦的世代"],["ch7-ex","例題"],
    ["ch8","第 8 章　電腦網路","ch"],["ch8-1","8.1 網路是什麼"],["ch8-2","8.2 封包與分層"],["ch8-3","8.3 IP 位址"],["ch8-4","8.4 名字與網址"],["ch8-5","8.5 速度與時間"],["ch8-ex","例題"],
    ["ch9","第 9 章　程式語言","ch"],["ch9-1","9.1 機器語言到高階語言"],["ch9-2","9.2 變數與型別"],["ch9-3","9.3 三種流程"],["ch9-4","9.4 函式與程式庫"],["ch9-5","9.5 演算法的好壞"],["ch9-6","9.6 語言地圖"],["ch9-ex","例題"],
    ["ch10","第 10 章　資料庫","ch"],["ch10-1","10.1 為什麼需要資料庫"],["ch10-2","10.2 關聯式模型"],["ch10-3","10.3 SQL"],["ch10-4","10.4 交易與 ACID"],["ch10-5","10.5 索引、備份與 NoSQL"],["ch10-ex","例題"]] },
];
function toc(page){
  const blocks = PAGES.map((p, i) => {
    const links = i === page - 1
      ? p.toc.map(([id, t, c]) => `<a href="#${id}" class="${c || "sub"}">${t}</a>`)
      : p.toc.filter(([id, , c]) => c && id !== "start").map(([id, t]) => `<a href="${p.file}#${id}" class="ch other">${t}</a>`);
    return `<div class="part">${p.part}</div>\n  ${links.join("\n  ")}`;
  });
  return `<nav class="toc" aria-label="目錄"><details open><summary>目錄<span class="cur"></span></summary><div class="links">
  ${blocks.join("\n  ")}
  </div></details></nav>`;
}
if (require.main === module) {
  const fs = require("fs"), path = require("path");
  PAGES.forEach((p, i) => {
    const f = path.join(__dirname, "..", p.file);
    let s = fs.readFileSync(f, "utf8");
    s = s.replace(/<!--TOPBAR-->|<header class="topbar">[\s\S]*?<\/header>/, topbar(p.file));
    s = s.replace(/<!--TOC-->|<nav class="toc"[\s\S]*?<\/nav>/, toc(i + 1));
    fs.writeFileSync(f, s);
    console.log("updated", p.file);
  });
}
module.exports = { FONTS, ICON, topbar, toc };
