// 講義 ② 的互動元件：第 3 章（延伸、邏輯運算、移位）、第 4 章（IEEE 754）、第 5 章（UTF-8、RGB、取樣、檔案大小）
"use strict";
const uval = (s) => parseInt(s, 2);
const sval = (s) => uval(s) - (s[0] === "1" ? 2 ** s.length : 0);
const fmtN = (n) => n.toLocaleString("en-US");
const clickBits = (s, id, opts = {}) => `<span class="bits">${s.split("").map((c, i) => `<button class="bit ${c === "1" ? "one" : ""} ${opts.sign && i === 0 ? "sign" : ""} ${opts.cls ? opts.cls(i) : ""}" data-i="${i}" data-for="${id}" aria-label="第 ${i + 1} 位，目前是 ${c}">${c}</button>`).join("")}</span>`;
const group4 = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

/* ---------- 3.1–3.2 兩種讀法與延伸 ---------- */
(function(){
  const wSel = $("#ext-w"), inp = $("#ext-in"), bitsEl = $("#ext-bits"), out = $("#ext-out");
  let bits = "1011";
  function draw(){
    const w = +wSel.value, W = w * 2;
    bitsEl.innerHTML = clickBits(bits, "ext", {sign: true});
    const u = uval(bits), s = sval(bits), hi = bits[0] === "1";
    const zx = "0".repeat(W - w) + bits, sx = bits[0].repeat(W - w) + bits;
    const tag = (str, n) => bitsHTML(str, {cls: (i) => i < n ? "fill" : ""});
    out.innerHTML = `<div class="results" style="margin-top:14px">
      <div class="rcard"><div class="rlabel">當作無號數</div><div class="rval">${u}</div></div>
      <div class="rcard"><div class="rlabel">當作有號數（2 補數）</div><div class="rval">${minus(s)}</div></div></div>
      <p class="small" style="margin:0 0 12px">${hi ? `最高位元是 1：無號數把它當 ＋${2 ** (w - 1)}，有號數當 −${2 ** (w - 1)}，兩者差 ${2 ** w}。` : "最高位元是 0：兩種讀法的值一樣。"}</p>
      <div class="repsrow"><div class="repsname">零延伸到 ${W} 位元<small>無號數用：左邊補 0</small></div><div>${tag(zx, W - w)} <span class="mono small muted">無號數 ＝ ${uval(zx)}</span></div></div>
      <div class="repsrow"><div class="repsname">符號延伸到 ${W} 位元<small>有號數用：左邊補最高位元</small></div><div>${tag(sx, W - w)} <span class="mono small muted">有號數 ＝ ${minus(sval(sx))}</span></div></div>
      <div class="legend"><span><span class="sw"></span>橘色外框：最高位元</span><span>金色框：延伸時補進來的位元</span></div>`;
  }
  function fromInput(){
    const w = +wSel.value, v = inp.value.replace(/\s/g, "");
    if (/^[01]+$/.test(v) && v.length <= w) { bits = v.padStart(w, "0"); draw(); }
  }
  bitsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i; bits = bits.slice(0, i) + (bits[i] === "1" ? "0" : "1") + bits.slice(i + 1);
    inp.value = bits; draw();
  });
  wSel.addEventListener("change", () => { const w = +wSel.value; bits = bits.length > w ? bits.slice(-w) : (bits[0] === "1" && bits.length < w ? bits[0].repeat(w - bits.length) + bits : bits.padStart(w, "0")); inp.value = bits; fromInput(); draw(); });
  inp.addEventListener("input", fromInput);
  draw();
})();

/* ---------- 3.3 邏輯運算 ---------- */
(function(){
  let A = "01101100", B = "00001111", op = "AND";
  const grid = $("#logic-grid"), msgEl = $("#logic-msg");
  const f = {AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NOT: (a) => 1 - a};
  const RULE = {AND: "兩個都是 1 才是 1", OR: "至少一個是 1 就是 1", XOR: "兩個不一樣才是 1", NOT: "0 變 1、1 變 0"};
  function draw(){
    const R = A.split("").map((a, i) => f[op](+a, +B[i])).join("");
    const row = (lab, s, id) => `<div class="bitrow ${id ? "" : "res"}"><span class="lab">${lab}</span>${id ? clickBits(s, id) : bitsHTML(s)}<span class="val">${group4(s)}　＝ ${uval(s)}</span></div>`;
    grid.innerHTML = row("A", A, "A") + (op === "NOT" ? "" : row("B", B, "B")) + row(op === "NOT" ? "NOT A" : `A ${op} B`, R);
    msgEl.innerHTML = `<b>${op}</b>：${RULE[op]}。每一欄各算各的，不會進位。${op === "AND" ? "B 是 1 的位置保留 A，B 是 0 的位置清成 0。" : op === "OR" ? "B 是 1 的位置變成 1，其他位置照抄 A。" : op === "XOR" ? "B 是 1 的位置把 A 反轉，其他位置照抄 A。" : "NOT 就是第 2 章的 1 補數。"}`;
    $("#logic-ops").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.op === op));
  }
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i, flip = (s) => s.slice(0, i) + (s[i] === "1" ? "0" : "1") + s.slice(i + 1);
    if (b.dataset.for === "A") A = flip(A); else B = flip(B);
    draw();
  });
  $("#logic-ops").addEventListener("click", (e) => { const b = e.target.closest("[data-op]"); if (b) { op = b.dataset.op; draw(); } });
  document.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", (e) => {
    const p = btn.dataset.preset;
    if (p === "mask") { A = "10110110"; B = "00001111"; op = "AND"; }
    if (p === "set") { A = "10110110"; B = "00000001"; op = "OR"; }
    if (p === "flip") { A = "10110110"; B = "11111111"; op = "XOR"; }
    draw();
  }));
  draw();
})();

/* ---------- 3.4 移位 ---------- */
(function(){
  const inp = $("#shift-in"), el = $("#shift-bits"), log = $("#shift-log");
  let bits = "00010110", start = bits, lastFill = -1, lost = null, dir = "", lines = [];
  const desc = (s) => `<span class="mono">${s}</span>（無號 ${uval(s)}／有號 ${minus(sval(s))}）`;
  function draw(){
    const ghost = lost === null ? "" : `<span class="falloff">擠出去：<span class="bit ghost">${lost}</span></span>`;
    el.innerHTML = `<div class="row">${dir === "L" ? ghost : ""}${clickBits(bits, "sh", {cls: (i) => i === lastFill ? "fill" : ""})}${dir !== "L" ? ghost : ""}</div>`;
    const bx = el.querySelector(".bits");
    if (dir && !matchMedia("(prefers-reduced-motion: reduce)").matches) bx.classList.add(dir === "L" ? "animL" : "animR");
    log.innerHTML = lines.length ? lines.slice(-4).join("<br>") : `目前：${desc(bits)}。按上面的按鈕移位。`;
  }
  function act(k){
    if (k === "reset") { bits = start; lastFill = -1; lost = null; dir = ""; lines = []; inp.value = bits; return draw(); }
    const before = bits; let name;
    if (k === "L") { lost = bits[0]; bits = bits.slice(1) + "0"; lastFill = 7; dir = "L"; name = "左移"; }
    if (k === "LR") { lost = bits[7]; bits = "0" + bits.slice(0, 7); lastFill = 0; dir = "R"; name = "邏輯右移（補 0）"; }
    if (k === "AR") { lost = bits[7]; bits = bits[0] + bits.slice(0, 7); lastFill = 0; dir = "R"; name = `算術右移（補最高位元 ${before[0]}）`; }
    let note = "";
    if (k === "L") note = uval(before) * 2 === uval(bits) ? `無號數剛好 ×2` : `最左邊的 1 被擠掉了，無號數不再是 ×2`;
    if (k === "LR") note = `無號數 ÷2：${uval(before)} → ${uval(bits)}`;
    if (k === "AR") note = `有號數 ÷2（往下取整）：${minus(sval(before))} → ${minus(sval(bits))}`;
    lines.push(`${desc(before)} <b>${name}</b> → ${desc(bits)}　<span class="muted">${note}</span>`);
    inp.value = bits; draw();
  }
  document.querySelectorAll("[data-sh]").forEach(b => b.addEventListener("click", () => act(b.dataset.sh)));
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i; bits = bits.slice(0, i) + (bits[i] === "1" ? "0" : "1") + bits.slice(i + 1);
    start = bits; lastFill = -1; lost = null; dir = ""; lines = []; inp.value = bits; draw();
  });
  inp.addEventListener("input", () => { const v = inp.value.replace(/\s/g, ""); if (/^[01]{1,8}$/.test(v)) { bits = start = v.padStart(8, "0"); lastFill = -1; lost = null; dir = ""; lines = []; draw(); } });
  draw();
})();

/* ---------- 4.4 IEEE 754 單精度 ---------- */
const FP = (function(){
  const buf = new DataView(new ArrayBuffer(4));
  function toBits(x){ buf.setFloat32(0, x); return buf.getUint32(0).toString(2).padStart(32, "0"); }
  function fromBits(b){ buf.setUint32(0, parseInt(b, 2)); return buf.getFloat32(0); }
  const hexOf = (b) => parseInt(b, 2).toString(16).toUpperCase().padStart(8, "0");
  // 浮點數實際存下的精確十進位值（用 BigInt 展開，不會有誤差）
  function exact(b){
    const S = b[0], E = parseInt(b.slice(1, 9), 2), M = b.slice(9);
    if (E === 255) return M.includes("1") ? "NaN" : (S === "1" ? "−∞" : "+∞");
    let sig = BigInt("0b" + (E === 0 ? "0" : "1") + M), e2 = (E === 0 ? -126 : E - 127) - 23;
    let s;
    if (sig === 0n) s = "0";
    else if (e2 >= 0) s = (sig << BigInt(e2)).toString();
    else {
      const k = -e2, digits = (sig * 5n ** BigInt(k)).toString().padStart(k + 1, "0");
      s = (digits.slice(0, -k) + "." + digits.slice(-k)).replace(/0+$/, "").replace(/\.$/, "");
    }
    return (S === "1" ? "−" : "") + s;
  }
  return {toBits, fromBits, hexOf, exact};
})();
(function(){
  const inp = $("#fp-in"), bitsEl = $("#fp-bits"), read = $("#fp-read"), st = $("#fp-steps");
  let bits = FP.toBits(-6.25);
  function field(cls, label, s, off){
    return `<div class="field ${cls}"><span class="bits">${s.split("").map((c, i) => `<button class="bit ${c === "1" ? "one" : ""}" data-i="${off + i}" aria-label="第 ${off + i + 1} 位，目前是 ${c}">${c}</button>`).join("")}</span><span class="fl">${label}</span></div>`;
  }
  function draw(fromUser){
    const S = bits[0], Eb = bits.slice(1, 9), M = bits.slice(9), E = parseInt(Eb, 2);
    bitsEl.innerHTML = `<div class="fp">${field("s", "S", S, 0)}${field("e", "指數 E（8）", Eb, 1)}${field("m", "尾數 M（23）", M, 9)}</div>`;
    const ex = FP.exact(bits), v = FP.fromBits(bits);
    const special = E === 255 || E === 0;
    read.innerHTML = `<div class="fpread">
      <div class="rcard"><div class="rlabel">十六進位</div><div class="rval">${FP.hexOf(bits)}</div></div>
      <div class="rcard"><div class="rlabel">實際存下的值</div><div class="rval">${ex}</div></div></div>
      ${special ? "" : `<div class="formula" style="margin-top:10px">(−1)<sup class="s">${S}</sup> × <span class="m">1.${M.replace(/0+$/, "") || "0"}</span><sub>2</sub> × 2<sup class="e">${E} − 127</sup> ＝ ${S === "1" ? "−" : ""}1.${M.replace(/0+$/, "") || "0"}<sub>2</sub> × 2<sup>${E - 127}</sup></div>`}`;
    // 步驟
    const steps = [];
    const raw = inp.value.trim();
    if (E === 0 && !M.includes("1")) steps.push(msg(`指數和尾數全是 0，這是 IEEE 754 規定的 <b>0</b>（符號位元是 ${S}，所以是 ${S === "1" ? "−0" : "+0"}）。0 沒辦法正規化成 1.xxx，所以用特殊規則表示。`));
    else if (E === 255) steps.push(msg(`指數全是 1，是保留給特殊值的：尾數${M.includes("1") ? "不是全 0，代表 <b>NaN</b>（不是數字）" : `全是 0，代表 <b>${S === "1" ? "−" : "+"}∞</b>（數字太大，超出範圍）`}。`));
    else if (E === 0) steps.push(msg(`指數全是 0 但尾數不是 0：這是非常接近 0 的「次正規數」（subnormal），規則比較特殊，這份講義不深入。`));
    else {
      const e = E - 127, sig = "1" + M;
      let bin;
      if (e >= 0) { const ip = sig.slice(0, e + 1).padEnd(e + 1, "0"), fp = sig.slice(e + 1).replace(/0+$/, ""); bin = ip + (fp ? "." + fp : ""); }
      else bin = "0." + "0".repeat(-e - 1) + sig.replace(/0+$/, "");
      const absTxt = ex.replace("−", ""), rounded = !fromUser && raw !== "" && Math.abs(Number(raw.replace(/^−/, "-"))) !== Number(absTxt);
      steps.push(msg(`<b>步驟 1　符號：</b>這個數是${S === "1" ? "負" : "正"}的，所以 S ＝ <b class="mono">${S}</b>。`));
      steps.push(msg(`<b>步驟 2　轉二進位：</b>${absTxt} ＝ <b class="mono">${bin}</b><sub>2</sub>${rounded ? `<br><span class="muted">注意：${raw.replace(/^-/, "")} 換成二進位是無限位數，只能存最接近的值，所以實際存下的是 ${absTxt}。</span>` : ""}`));
      steps.push(msg(`<b>步驟 3　正規化：</b>把小數點移到最左邊的 1 後面：<b class="mono">1.${M.replace(/0+$/, "") || "0"} × 2<sup>${e}</sup></b>。小數點往${e >= 0 ? `左移了 ${e} 格` : `右移了 ${-e} 格`}，所以實際指數 e ＝ ${e}。`));
      steps.push(msg(`<b>步驟 4　指數加偏移量：</b>E ＝ ${e} ＋ 127 ＝ ${E} ＝ <b class="mono" style="color:var(--exp)">${Eb}</b>（8 位元）。`));
      steps.push(msg(`<b>步驟 5　尾數：</b>取「1.」後面的部分（前面的 1 不存，是隱藏位元），右邊補 0 到 23 位：<b class="mono" style="color:var(--accent)">${M}</b>。`));
      steps.push(msg(`<b>步驟 6　組合：</b><span class="mono"><span style="color:var(--sign)">${S}</span> <span style="color:var(--exp)">${Eb}</span> <span style="color:var(--accent)">${M}</span></span><br>每 4 位一組：<span class="mono">${group4(bits)}</span> → 十六進位 <b class="mono">${FP.hexOf(bits)}</b>`));
    }
    stepper(st, steps);
  }
  inp.addEventListener("input", () => {
    const raw = inp.value.trim().replace(/^−/, "-");
    if (raw === "" || isNaN(Number(raw))) { read.innerHTML = `<div class="err">請輸入一個十進位數，例如 -6.25 或 0.1。</div>`; return; }
    bits = FP.toBits(Number(raw)); draw(false);
  });
  bitsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i; bits = bits.slice(0, i) + (bits[i] === "1" ? "0" : "1") + bits.slice(i + 1);
    const ex = FP.exact(bits); inp.value = ex.replace("−", "-").replace("+∞", "Infinity").replace("-∞", "-Infinity"); draw(true);
  });
  draw(false);
})();

/* ---------- 5.2 UTF-8 ---------- */
(function(){
  const inp = $("#utf-in"), out = $("#utf-chars"), tally = $("#utf-tally"), enc = new TextEncoder();
  function draw(){
    const chars = Array.from(inp.value).slice(0, 24);
    let total = 0;
    out.innerHTML = chars.map(ch => {
      const cp = ch.codePointAt(0), bytes = [...enc.encode(ch)]; total += bytes.length;
      const shown = ch === " " ? "␠" : esc(ch);
      return `<div class="chr" title="${bytes.map(b => b.toString(2).padStart(8, "0")).join(" ")}"><div class="g">${shown}</div><div class="cp">U+${cp.toString(16).toUpperCase().padStart(4, "0")}${cp < 128 ? `<br>ASCII ${cp}` : ""}</div><div class="bytes">${bytes.map(b => `<span class="byte">${b.toString(16).toUpperCase().padStart(2, "0")}</span>`).join("")}</div></div>`;
    }).join("") || `<p class="small muted">輸入一些文字試試看。</p>`;
    const n = chars.length;
    tally.innerHTML = n ? `共 <b>${n}</b> 個字元，UTF-8 需要 <b>${total}</b> 個位元組。${Array.from(inp.value).length > 24 ? "（只顯示前 24 個字）" : ""}<br><span class="small muted">每個方塊下面是 UTF-8 的位元組（十六進位）。滑鼠移到方塊上可以看二進位。</span>` : "";
  }
  inp.addEventListener("input", draw); draw();
})();

/* ---------- 5.3 RGB ---------- */
(function(){
  const r = $("#rgb-r"), g = $("#rgb-g"), b = $("#rgb-b"), hx = $("#rgb-hex");
  const h2 = (n) => (+n).toString(16).toUpperCase().padStart(2, "0"), b8 = (n) => (+n).toString(2).padStart(8, "0");
  function draw(skipHex){
    const code = "#" + h2(r.value) + h2(g.value) + h2(b.value);
    $("#rgb-rv").textContent = r.value; $("#rgb-gv").textContent = g.value; $("#rgb-bv").textContent = b.value;
    $("#rgb-sw").style.background = code; $("#rgb-swl").textContent = code;
    if (!skipHex) hx.value = code;
    $("#rgb-bits").innerHTML = `<span class="r">R ${r.value} ＝ ${h2(r.value)} ＝ ${group4(b8(r.value))}</span><br><span class="g">G ${g.value} ＝ ${h2(g.value)} ＝ ${group4(b8(g.value))}</span><br><span class="b">B ${b.value} ＝ ${h2(b.value)} ＝ ${group4(b8(b.value))}</span><br><span class="muted">合起來共 24 個位元。</span>`;
  }
  [r, g, b].forEach(el => { el.addEventListener("input", () => draw()); el.addEventListener("change", () => draw()); });
  hx.addEventListener("input", () => {
    const m = hx.value.trim().replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (m) { r.value = parseInt(m[1], 16); g.value = parseInt(m[2], 16); b.value = parseInt(m[3], 16); draw(true); }
  });
  draw();
})();

/* ---------- 5.4 取樣與量化 ---------- */
(function(){
  const svg = $("#wave-svg"), nEl = $("#wave-n"), bEl = $("#wave-b");
  const W = 640, H = 220, pad = 16;
  const wave = (t) => 0.62 * Math.sin(2 * Math.PI * 1.5 * t) + 0.3 * Math.sin(2 * Math.PI * 4 * t + 0.6);
  const X = (t) => pad + t * (W - 2 * pad), Y = (v) => H / 2 - v * (H / 2 - pad);
  function draw(){
    const n = +nEl.value, bits = +bEl.value, L = 2 ** bits;
    const q = (v) => { const k = Math.round((v + 1) / 2 * (L - 1)); return k / (L - 1) * 2 - 1; };
    let grid = "";
    if (L <= 64) for (let k = 0; k < L; k++) { const y = Y(k / (L - 1) * 2 - 1); grid += `<line class="grid" x1="${pad}" x2="${W - pad}" y1="${y}" y2="${y}"/>`; }
    let orig = ""; for (let i = 0; i <= 200; i++) { const t = i / 200; orig += `${i ? "L" : "M"}${X(t).toFixed(1)},${Y(wave(t)).toFixed(1)}`; }
    let stair = "", dots = "";
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, v = q(wave(t0));
      stair += `${i ? "L" : "M"}${X(t0).toFixed(1)},${Y(v).toFixed(1)}L${X(t1).toFixed(1)},${Y(v).toFixed(1)}`;
      dots += `<circle class="dot" cx="${X(t0).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4"/>`;
    }
    svg.innerHTML = `${grid}<path class="orig" d="${orig}"/><path class="q" d="${stair}"/>${dots}`;
    $("#wave-msg").innerHTML = `這段時間取樣 <b>${n}</b> 次；每次用 <b>${bits}</b> 個位元記錄高度，所以只有 2<sup>${bits}</sup> ＝ <b>${L}</b> 種高度可以選（灰色橫線），量到的值會被「拉」到最近的一條線上。總共需要 ${n} × ${bits} ＝ <b>${n * bits}</b> 個位元。`;
  }
  [nEl, bEl].forEach(el => el.addEventListener("input", draw)); draw();
})();

/* ---------- 5.3–5.4 檔案大小 ---------- */
(function(){
  const ids = ["size-w", "size-h", "size-d", "size-r", "size-b", "size-c", "size-s"];
  const num = (id) => { const v = Number(String($("#" + id).value).replace(/[,\s]/g, "")); return Number.isFinite(v) && v >= 0 ? v : NaN; };
  const human = (B) => `≈ ${(B / 1e6).toLocaleString("en-US", {maximumFractionDigits: 2})} MB　／　${(B / 2 ** 20).toLocaleString("en-US", {maximumFractionDigits: 2})} MiB`;
  function draw(){
    const w = num("size-w"), h = num("size-h"), d = num("size-d");
    $("#size-img").innerHTML = isNaN(w * h) ? `<span class="muted">請輸入寬和高（整數）。</span>` :
      `圖片：${fmtN(w)} × ${fmtN(h)} × ${d} 位元 ÷ 8 ＝ <b>${fmtN(w * h * d / 8)}</b> 位元組　<span class="muted">${human(w * h * d / 8)}</span>`;
    const r = num("size-r"), b = num("size-b"), c = num("size-c"), s = num("size-s");
    $("#size-aud").innerHTML = isNaN(s) ? `<span class="muted">請輸入秒數。</span>` :
      `聲音：${fmtN(r)} × ${b} × ${c} × ${fmtN(s)} ÷ 8 ＝ <b>${fmtN(r * b * c * s / 8)}</b> 位元組　<span class="muted">${human(r * b * c * s / 8)}</span>`;
  }
  ids.forEach(id => { $("#" + id).addEventListener("input", draw); $("#" + id).addEventListener("change", draw); });
  draw();
})();
