// 章節清單：首頁的學習路線和練習頁的分組共用
// part：1＝講義 ①、2＝講義 ②、3＝講義 ③、0＝綜合（n 用 99，避免和章號衝突）
window.PARTS = { 1: "講義 ①　整數", 2: "講義 ②　更多資料表示", 3: "講義 ③　電腦、網路與軟體" };
window.CHAPTERS = [
  { n: 0, title: "開始之前", sum: "位元、位元組、位權、次方。完全沒基礎從這裡開始。", lesson: "lesson.html#ch0", audio: [1], days: "第 1 天", part: 1 },
  { n: 1, title: "進位轉換", sum: "二、八、十、十六進位互相轉換，包含小數和分組捷徑。", lesson: "lesson.html#ch1", audio: [2, 3, 6, 7], days: "第 2～4 天", part: 1 },
  { n: 2, title: "負數與溢位", sum: "符號大小、1 補數、2 補數，以及加減法和溢位判斷。", lesson: "lesson.html#ch2", audio: [4, 5, 8], days: "第 5～6 天", part: 1 },
  { n: 3, title: "位元寬度與位元運算", sum: "無號數與有號數、符號延伸、AND／OR／XOR／NOT、移位。", lesson: "lesson-2.html#ch3", audio: [9], days: "第 7～8 天", part: 2 },
  { n: 4, title: "浮點數", sum: "正規化、偏移表示法、IEEE 754 單精度，以及浮點數的誤差。", lesson: "lesson-2.html#ch4", audio: [10], days: "第 9～11 天", part: 2 },
  { n: 5, title: "文字、圖片與聲音", sum: "容量單位、ASCII 與 UTF-8、RGB 顏色、取樣與檔案大小、壓縮。", lesson: "lesson-2.html#ch5", audio: [11, 12], days: "第 12～13 天", part: 2 },
  { n: 6, title: "電腦的構成", sum: "五大單元、邏輯閘與半加器、CPU 與時脈、指令週期、記憶體階層。", lesson: "lesson-3.html#ch6", audio: [13], days: "第 14～15 天", part: 3 },
  { n: 7, title: "圖靈機與馮紐曼模型", sum: "演算法、圖靈機、停機問題、儲存程式概念、電腦的世代。", lesson: "lesson-3.html#ch7", audio: [14], days: "第 16 天", part: 3 },
  { n: 8, title: "電腦網路", sum: "封包與分層、IP 位址與子網路、DNS 與網址、頻寬與下載時間。", lesson: "lesson-3.html#ch8", audio: [15], days: "第 17～18 天", part: 3 },
  { n: 9, title: "程式語言", sum: "編譯與直譯、變數與型別、三種流程、函式、演算法的好壞。", lesson: "lesson-3.html#ch9", audio: [16], days: "第 19～20 天", part: 3 },
  { n: 10, title: "資料庫", sum: "資料表、主鍵與外來鍵、SQL 查詢、交易與 ACID。", lesson: "lesson-3.html#ch10", audio: [17, 18], days: "第 21～22 天", part: 3 },
  { n: 99, title: "綜合", sum: "全部章節的觀念選擇題。", lesson: "lesson.html", audio: [], days: "第 23 天", part: 0 },
];
