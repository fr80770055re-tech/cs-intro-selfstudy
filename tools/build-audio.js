// 把 tools/audio-src/*.txt 講稿轉成 audio/*.mp3，並產生 assets/audio-tracks.js（給音檔頁顯示逐字稿）。
// 需要：Windows（內建中文語音 Yating / Zhiwei）、Node.js、`npm install`（lamejs）。
// 用法：node tools/build-audio.js            → 全部重建
//       node tools/build-audio.js 03         → 只重建檔名以 03 開頭的講稿
//
// 講稿語法：
//   # 標題              第一行
//   > 說明              第二行
//   一般文字             旁白（女聲 Yating）
//   Q: 問題             提問（男聲 Zhiwei），之後自動停 5 秒讓聽眾作答
//   A: 答案             答案（女聲）
//   [停 2]              停頓 2 秒
//   {1101|一、一、零、一}  逐字稿顯示左邊，語音念右邊
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
// lamejs 1.2.1 的 CommonJS 入口在 Node 下有 MPEGMode 未定義的已知問題，改載入它內附的單檔版本。
const lamejs = new Function(fs.readFileSync(path.join(__dirname, "node_modules", "lamejs", "lame.all.js"), "utf8") + "\nreturn lamejs;")();

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(__dirname, "audio-src");
const OUT = path.join(ROOT, "audio");
const RATE = 16000;
const VOICE = { narr: "Microsoft Yating", q: "Microsoft Zhiwei" };
const PAUSE = { afterLine: 0.55, afterQ: 5, afterA: 1.0 };

const only = process.argv[2];
const files = fs.readdirSync(SRC).filter(f => f.endsWith(".txt")).sort();

const xml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const spoken = s => s.replace(/\{([^|}]*)\|([^}]*)\}/g, "$2");
const shown = s => s.replace(/\{([^|}]*)\|([^}]*)\}/g, "$1");
const ssml = (voice, text) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="${voice}"><prosody rate="0.93">${xml(spoken(text))}</prosody></voice></speak>`;

function parse(file) {
  const lines = fs.readFileSync(path.join(SRC, file), "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const title = lines[0].replace(/^#\s*/, "");
  const desc = lines[1].replace(/^>\s*/, "");
  const items = [];
  for (const l of lines.slice(2)) {
    let m;
    if ((m = l.match(/^\[停\s*([\d.]+)\]$/))) items.push({ type: "pause", sec: +m[1] });
    else if ((m = l.match(/^Q[:：]\s*(.*)$/))) items.push({ type: "q", text: m[1] });
    else if ((m = l.match(/^A[:：]\s*(.*)$/))) items.push({ type: "a", text: m[1] });
    else items.push({ type: "p", text: l });
  }
  return { id: file.replace(/\.txt$/, ""), title, desc, items };
}

function readWavPcm(file) {
  const b = fs.readFileSync(file);
  let p = 12, rate = 0, data = null;
  while (p < b.length - 8) {
    const id = b.toString("ascii", p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === "fmt ") rate = b.readUInt32LE(p + 12);
    if (id === "data") { data = b.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size % 2);
  }
  if (rate !== RATE) throw new Error(`unexpected sample rate ${rate} in ${file}`);
  return new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length));
}

const tracks = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cs-audio-"));
for (const f of files) {
  const t = parse(f);
  const outMp3 = path.join(OUT, t.id + ".mp3");
  const spokenItems = t.items.filter(i => i.type !== "pause");
  if (!only || t.id.startsWith(only)) {
    const jobs = spokenItems.map((it, k) => ({ ssml: ssml(it.type === "q" ? VOICE.q : VOICE.narr, it.text), out: path.join(tmp, `${t.id}-${k}.wav`) }));
    const jobsFile = path.join(tmp, t.id + ".json");
    fs.writeFileSync(jobsFile, JSON.stringify(jobs), "utf8");
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "tts.ps1"), jobsFile], { stdio: "inherit" });
    const chunks = [], silence = s => new Int16Array(Math.round(s * RATE));
    chunks.push(silence(0.4));
    let k = 0;
    for (const it of t.items) {
      if (it.type === "pause") { chunks.push(silence(it.sec)); continue; }
      chunks.push(readWavPcm(jobs[k++].out));
      chunks.push(silence(it.type === "q" ? PAUSE.afterQ : it.type === "a" ? PAUSE.afterA : PAUSE.afterLine));
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Int16Array(total); let o = 0;
    for (const c of chunks) { pcm.set(c, o); o += c.length; }
    const enc = new lamejs.Mp3Encoder(1, RATE, 32), parts = [];
    for (let i = 0; i < pcm.length; i += 1152) { const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (buf.length) parts.push(Buffer.from(buf)); }
    const end = enc.flush(); if (end.length) parts.push(Buffer.from(end));
    fs.writeFileSync(outMp3, Buffer.concat(parts));
    fs.writeFileSync(path.join(OUT, t.id + ".duration"), String(Math.round(total / RATE)));
    console.log(`${t.id}: ${Math.round(total / RATE)}s`);
  }
  const durFile = path.join(OUT, t.id + ".duration");
  tracks.push({
    id: t.id, file: `audio/${t.id}.mp3`, title: t.title, desc: t.desc,
    duration: fs.existsSync(durFile) ? +fs.readFileSync(durFile, "utf8") : 0,
    lines: t.items.filter(i => i.type !== "pause").map(i => ({ type: i.type, text: shown(i.text) })),
  });
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, "assets", "audio-tracks.js"),
  "// 由 tools/build-audio.js 自動產生，請勿手動修改。\nwindow.AUDIO_TRACKS = " + JSON.stringify(tracks, null, 1) + ";\n", "utf8");
console.log("tracks:", tracks.length);
