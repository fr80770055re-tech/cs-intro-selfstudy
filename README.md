# 計概自學・數字系統

給非本科系學生的計算機概論自學網站，涵蓋「資料表示」單元的前半段：進位轉換、負數表示法（符號大小／1 補數／2 補數）、2 補數加減法與溢位。

- **互動講義**（`lesson.html`）：從零開始的完整講義，搭配可動手操作的元件與逐步手算過程。
- **練習與精熟**（`practice.html`）：14 種題型隨機出題、針對常見錯誤給出診斷；連續答對 5 題算精熟，之後依 1／3／7／14／30 天間隔提醒複習。也可以列印紙筆練習卷。
- **通勤音檔**（`audio.html`）：8 集語音複習（觀念講解、心算問答、口訣總整理），附逐字稿，可下載離線收聽。

練習進度與播放位置只存在使用者自己的瀏覽器（localStorage）。

## 本機預覽

```bash
node tools/serve.js
```

然後打開 http://localhost:8765 。

## 重新產生音檔

講稿在 `tools/audio-src/*.txt`。需要 Windows（內建中文語音 Microsoft Yating／Zhiwei）與 Node.js：

```bash
cd tools
npm install
node build-audio.js        # 全部重建
node build-audio.js 03     # 只重建第 3 集
```

會輸出 `audio/*.mp3` 和 `assets/audio-tracks.js`（音檔頁的清單與逐字稿）。
