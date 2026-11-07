# 計概自學・資料表示

給非本科系學生的計算機概論自學網站，完整涵蓋「資料表示」單元：進位轉換、負數與溢位、位元運算、浮點數（IEEE 754）、文字／圖片／聲音的表示方式。

- **互動講義**
  - `lesson.html`（講義 ①，第 0～2 章）：位元、進位轉換、2 補數與溢位。
  - `lesson-2.html`（講義 ②，第 3～5 章）：無號／有號數與符號延伸、AND／OR／XOR／NOT、移位、偏移表示法、IEEE 754、容量單位、ASCII／UTF-8、RGB、聲音取樣、壓縮。
- **練習與精熟**（`practice.html`）：26 種計算題型加觀念選擇題，隨機出題，並針對常見錯誤給出診斷。連續答對 5 題算精熟，之後依 1／3／7／14／30 天間隔提醒複習。也可以列印紙筆練習卷。
- **通勤音檔**（`audio.html`）：12 集語音複習，約 60 分鐘，附逐字稿，可下載離線收聽。

練習進度與播放位置只存在使用者自己的瀏覽器（localStorage）。

## 本機預覽

```bash
node tools/serve.js
```

然後打開 http://localhost:8765 。

## 檔案結構

- `assets/site.css`：全站共用的色彩、字型與元件（亮色／暗色）。
- `assets/lesson.css`、`assets/lesson-core.js`：講義頁共用的版面、逐步播放器和目錄。
- `assets/lesson-2.js`：講義 ② 的互動元件。
- `assets/practice-skills.js`：所有題型的出題、批改與錯誤診斷。
- `assets/chapters.js`：章節清單（首頁學習路線和練習頁分組共用）。
- `assets/icons.svg`：線條圖示。
- `tools/partials.js`：產生各頁頂部導覽列和講義目錄的 HTML 片段。

## 重新產生音檔

講稿在 `tools/audio-src/*.txt`。需要 Windows（內建中文語音 Microsoft Yating／Zhiwei）與 Node.js：

```bash
cd tools
npm install
node build-audio.js        # 全部重建
node build-audio.js 03     # 只重建第 3 集
```

會輸出 `audio/*.mp3` 和 `assets/audio-tracks.js`（音檔頁的清單與逐字稿）。
