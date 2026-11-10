// 講義 ③ 的互動元件：第 6 章（邏輯閘、迷你電腦）、第 7 章（圖靈機）、第 8 章（IP、下載時間）、第 9 章（程式追蹤）、第 10 章（SQL）
"use strict";
const fmtN = (n) => n.toLocaleString("en-US");
const bin8 = (n) => n.toString(2).padStart(8, "0");

/* ---------- 6.2 邏輯閘與半加器 ---------- */
(function(){
  const out = $("#gates-out"); if (!out) return;
  let A = 1, B = 1;
  const lamp = (v) => `<span class="lamp ${v ? "on" : ""}">${v}</span>`;
  function draw(){
    const g = {AND: A & B, OR: A | B, XOR: A ^ B, NOT: 1 - A};
    out.innerHTML = `<div class="gates">
      <div class="gin"><button class="swbtn ${A ? "on" : ""}" data-sw="A" aria-pressed="${!!A}"><span class="lamp">${A}</span><span class="w">A</span></button>
        <button class="swbtn ${B ? "on" : ""}" data-sw="B" aria-pressed="${!!B}"><span class="lamp">${B}</span><span class="w">B</span></button></div>
      <div class="gout">${["AND", "OR", "XOR", "NOT"].map(k => `<div class="gate"><div class="gname">${k === "NOT" ? "NOT A" : `A ${k} B`}</div>${lamp(g[k])}</div>`).join("")}</div>
      <div class="hadder"><div class="gname">半加器：A ＋ B</div>
        <div class="harow"><span>和（XOR）</span>${lamp(g.XOR)}<span>進位（AND）</span>${lamp(g.AND)}</div>
        <div class="small muted">${A} ＋ ${B} ＝ 二進位 <b class="mono">${g.AND}${g.XOR}</b>（十進位 ${A + B}）</div></div>
    </div>`;
  }
  out.addEventListener("click", (e) => { const b = e.target.closest("[data-sw]"); if (!b) return; if (b.dataset.sw === "A") A = 1 - A; else B = 1 - B; draw(); });
  draw();
})();

/* ---------- 6.4 迷你電腦 ---------- */
(function(){
  const out = $("#cpu-out"); if (!out) return;
  const OPS = ["HLT", "LOAD", "ADD", "SUB", "STORE", "JMP", "JZ", "OUT"];
  const PROGS = {
    add: { mem: [0x18, 0x29, 0x4A, 0x70, 0x00, 0, 0, 0, 5, 7, 0, 0, 0, 0, 0, 0], note: "位址 8 放 5、位址 9 放 7，結果會存到位址 10。" },
    count: { mem: [0x18, 0x70, 0x66, 0x39, 0x51, 0x00, 0x00, 0, 3, 1, 0, 0, 0, 0, 0, 0], note: "位址 8 是起點 3，位址 9 是每次要減的 1。JZ 和 JMP 合起來就是一個迴圈：印出來、是 0 就停、不是就減 1 再跳回去。" },
    mul: { mem: [0x18, 0x6B, 0x3A, 0x48, 0x1E, 0x29, 0x4E, 0x50, 4, 3, 1, 0x1E, 0x70, 0x00, 0, 0], note: "3 × 4 ＝ 把 3 加 4 次。位址 8 是計數器 4，位址 9 是 3，位址 10 是 1，位址 14 累計結果。計數器減到 0 時 JZ 跳到位址 11：載入結果、輸出、停機。" },
  };
  let st;
  function reset(){
    const p = PROGS[$("#cpu-prog").value];
    st = { mem: p.mem.slice(), pc: 0, ir: null, acc: 0, phase: 0, out: [], halted: false, log: "按「下一步」開始。", note: p.note, ticks: 0, last: null };
    draw();
  }
  function step(){
    if (st.halted) return;
    st.ticks++;
    if (st.phase === 0) {
      st.ir = st.mem[st.pc]; st.last = st.pc;
      st.log = `<b>擷取</b>：PC ＝ ${st.pc}，把位址 ${st.pc} 的內容 <code>${bin8(st.ir).slice(0, 4)} ${bin8(st.ir).slice(4)}</code> 抓進 IR，PC 加 1 變成 ${st.pc + 1}。`;
      st.pc++; st.phase = 1;
    } else if (st.phase === 1) {
      const op = st.ir >> 4, a = st.ir & 15;
      st.log = `<b>解碼</b>：前 4 位 <code>${bin8(st.ir).slice(0, 4)}</code> ＝ ${op} → <b>${OPS[op] || "？"}</b>${op && op !== 7 ? `；後 4 位 <code>${bin8(st.ir).slice(4)}</code> ＝ 位址 <b>${a}</b>` : ""}。`;
      st.phase = 2;
    } else {
      const op = st.ir >> 4, a = st.ir & 15, M = st.mem;
      let t = "";
      switch (op) {
        case 0: st.halted = true; t = "HLT：停機。"; break;
        case 1: st.acc = M[a]; t = `LOAD ${a}：把位址 ${a} 的 ${M[a]} 放進 ACC。`; break;
        case 2: st.acc = (st.acc + M[a]) & 255; t = `ADD ${a}：ACC ＋ ${M[a]} ＝ ${st.acc}。`; break;
        case 3: st.acc = (st.acc - M[a] + 256) & 255; t = `SUB ${a}：ACC − ${M[a]} ＝ ${st.acc}。`; break;
        case 4: M[a] = st.acc; t = `STORE ${a}：把 ACC 的 ${st.acc} 寫到位址 ${a}。`; break;
        case 5: st.pc = a; t = `JMP ${a}：PC 改成 ${a}，下一條從那裡抓。`; break;
        case 6: if (st.acc === 0) { st.pc = a; t = `JZ ${a}：ACC 是 0，跳到 ${a}。`; } else t = `JZ ${a}：ACC 是 ${st.acc} 不是 0，不跳，繼續往下。`; break;
        case 7: st.out.push(st.acc); t = `OUT：輸出 ACC 的值 ${st.acc}。`; break;
        default: st.halted = true; t = "不認得的操作碼，停機。";
      }
      st.log = `<b>執行</b>：${t}`;
      st.phase = 0;
      if (st.ticks > 600) { st.halted = true; st.log += " （步數太多，強制停止）"; }
    }
    draw();
  }
  function draw(){
    const PH = ["擷取", "解碼", "執行"];
    const cells = st.mem.map((v, i) => {
      const isCode = i === st.last && st.ir !== null;
      return `<div class="mcell ${i === st.pc && !st.halted ? "pc" : ""} ${isCode ? "cur" : ""}"><div class="ma">${i}</div><div class="mv mono">${bin8(v).slice(0, 4)} ${bin8(v).slice(4)}</div><div class="mi">${v >> 4 < 8 && (v >> 4) ? `${OPS[v >> 4]} ${v >> 4 === 7 ? "" : v & 15}` : v === 0 ? "HLT／0" : ""}<span class="muted">${v}</span></div></div>`;
    }).join("");
    out.innerHTML = `<div class="cpuwrap">
      <div class="cpubox"><div class="gname">CPU</div>
        <div class="regs"><div class="reg"><span>PC</span><b class="mono">${st.pc}</b></div><div class="reg"><span>IR</span><b class="mono">${st.ir === null ? "—" : bin8(st.ir).slice(0, 4) + " " + bin8(st.ir).slice(4)}</b></div><div class="reg"><span>ACC</span><b class="mono">${st.acc}</b></div></div>
        <div class="phases">${PH.map((p, i) => `<span class="${!st.halted && st.phase === i ? "on" : ""}">${p}</span>`).join("<i>→</i>")}</div>
        <div class="screen"><span class="muted small">螢幕</span> <b class="mono">${st.out.length ? st.out.join("　") : "（還沒有輸出）"}</b></div>
      </div>
      <div class="membox"><div class="gname">記憶體（16 格，每格 8 位元）</div><div class="memgrid">${cells}</div></div>
    </div>
    <div class="step-msg" aria-live="polite">${st.halted ? `<b>已停機。</b> ${st.log}` : st.log}</div>
    <p class="small muted" style="margin:6px 0 0">${st.note}　藍框 ＝ PC 指著的下一條；黃底 ＝ 正在處理的那條。</p>`;
    $("#cpu-step").disabled = st.halted; $("#cpu-run").disabled = st.halted;
  }
  $("#cpu-prog").addEventListener("change", reset);
  $("#cpu-reset").addEventListener("click", reset);
  $("#cpu-step").addEventListener("click", step);
  $("#cpu-run").addEventListener("click", () => { let n = 0; while (!st.halted && n++ < 2000) step(); });
  reset();
})();

/* ---------- 7.2 圖靈機 ---------- */
(function(){
  const out = $("#tm-out"); if (!out) return;
  const RULES = [
    { s: "找右端", r: "0", w: "0", m: "R", n: "找右端" },
    { s: "找右端", r: "1", w: "1", m: "R", n: "找右端" },
    { s: "找右端", r: "□", w: "□", m: "L", n: "加一" },
    { s: "加一", r: "1", w: "0", m: "L", n: "加一" },
    { s: "加一", r: "0", w: "1", m: "S", n: "停機" },
    { s: "加一", r: "□", w: "1", m: "S", n: "停機" },
  ];
  let tape, head, state, steps, used, orig;
  function reset(){
    const v = $("#tm-in").value.replace(/[^01]/g, "") || "0";
    orig = v; tape = ["□", ...v.split(""), "□"]; head = 1; state = "找右端"; steps = 0; used = -1;
    draw();
  }
  function step(){
    if (state === "停機") return;
    const sym = tape[head];
    const i = RULES.findIndex(r => r.s === state && r.r === sym);
    const r = RULES[i]; used = i;
    tape[head] = r.w;
    if (r.m === "R") head++; else if (r.m === "L") head--;
    if (head < 0) { tape.unshift("□"); head = 0; }
    if (head >= tape.length) tape.push("□");
    state = r.n; steps++;
    draw();
  }
  function draw(){
    const val = tape.join("").replace(/□/g, "");
    out.innerHTML = `<div class="tape" aria-label="磁帶">${tape.map((c, i) => `<span class="cell ${i === head ? "head" : ""} ${c === "□" ? "blank" : ""}">${c}</span>`).join("")}</div>
    <div class="tmstate">目前狀態：<b>${state}</b>　已走 ${steps} 步${state === "停機" ? `　<span class="mono">${orig}</span>（${parseInt(orig, 2)}）＋ 1 ＝ <b class="mono">${val}</b>（${parseInt(val, 2)}）` : ""}</div>
    <div class="tablewrap"><table class="plain rules"><tr><th>目前狀態</th><th>看到</th><th>寫入</th><th>移動</th><th>變成</th></tr>
    ${RULES.map((r, i) => `<tr class="${i === used ? "cur" : ""} ${state !== "停機" && r.s === state && r.r === tape[head] ? "next" : ""}"><td>${r.s}</td><td class="mono">${r.r}</td><td class="mono">${r.w}</td><td>${r.m === "R" ? "右" : r.m === "L" ? "左" : "不動"}</td><td>${r.n}</td></tr>`).join("")}</table></div>
    <p class="small muted" style="margin:6px 0 0">黃底 ＝ 剛剛用過的規則；藍框 ＝ 下一步會用的規則。□ 是空白格。</p>`;
    $("#tm-step").disabled = state === "停機"; $("#tm-run").disabled = state === "停機";
  }
  $("#tm-in").addEventListener("input", reset);
  $("#tm-reset").addEventListener("click", reset);
  $("#tm-step").addEventListener("click", step);
  $("#tm-run").addEventListener("click", () => { let n = 0; while (state !== "停機" && n++ < 200) step(); });
  reset();
})();

/* ---------- 8.3 IP 位址 ---------- */
(function(){
  const inp = $("#ip-in"), sel = $("#ip-mask"), out = $("#ip-out"); if (!out) return;
  function draw(){
    const parts = inp.value.trim().split(".");
    const ok = parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && +p <= 255);
    if (!ok) { out.innerHTML = `<div class="err">請輸入四段 0～255 的數字，用點隔開，例如 192.168.1.37。</div>`; return; }
    const oct = parts.map(Number), n = +sel.value;
    const maskBits = "1".repeat(n) + "0".repeat(32 - n);
    const mask = [0, 1, 2, 3].map(i => parseInt(maskBits.slice(i * 8, i * 8 + 8), 2));
    const net = oct.map((o, i) => o & mask[i]);
    const bc = oct.map((o, i) => (o & mask[i]) | (255 - mask[i]));
    const h = 32 - n, hosts = 2 ** h - 2;
    const row = (lab, arr, cls) => `<div class="iprow ${cls || ""}"><span class="lab">${lab}</span><span class="dec mono">${arr.join(".")}</span><span class="binrow">${arr.map((o, i) => `<span class="oct">${bin8(o).split("").map((b, j) => `<i class="${i * 8 + j < n ? "netpart" : "hostpart"} ${b === "1" ? "one" : ""}">${b}</i>`).join("")}</span>`).join("")}</span></div>`;
    out.innerHTML = `<div class="ipgrid">${row("IP 位址", oct)}${row("遮罩 /" + n, mask)}${row("AND ＝ 網路位址", net, "res")}</div>
      <div class="legend"><span><span class="sw netpart"></span>網路部分（前 ${n} 位）</span><span><span class="sw hostpart"></span>主機部分（後 ${h} 位）</span></div>
      <div class="results" style="margin-top:12px">
        <div class="rcard"><div class="rlabel">網路位址（主機部分全 0）</div><div class="rval">${net.join(".")}</div></div>
        <div class="rcard"><div class="rlabel">廣播位址（主機部分全 1）</div><div class="rval">${bc.join(".")}</div></div>
        <div class="rcard"><div class="rlabel">可用主機數 2<sup>${h}</sup> − 2</div><div class="rval">${fmtN(hosts)}</div></div>
      </div>
      <p class="small muted" style="margin:0">${oct[0] === 10 || (oct[0] === 192 && oct[1] === 168) || (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) ? "這是私有位址，只在內部網路使用。" : oct[0] === 127 ? "127.x.x.x 是本機位址，指自己這台電腦。" : "這看起來是公有位址。"}</p>`;
  }
  inp.addEventListener("input", draw); sel.addEventListener("change", draw); draw();
})();

/* ---------- 8.5 下載時間 ---------- */
(function(){
  const out = $("#xfer-out"); if (!out) return;
  const ids = ["xfer-size", "xfer-unit", "xfer-speed", "xfer-su"];
  const fmtT = (s) => s < 1 ? `${(s * 1000).toFixed(0)} 毫秒` : s < 60 ? `${+s.toFixed(1)} 秒` : s < 3600 ? `${Math.floor(s / 60)} 分 ${Math.round(s % 60)} 秒` : `${Math.floor(s / 3600)} 小時 ${Math.round((s % 3600) / 60)} 分`;
  const sci = (n) => { const e = Math.floor(Math.log10(n)), m = n / 10 ** e; return `${+m.toFixed(3)} × 10<sup>${e}</sup>`; };
  function draw(){
    const size = parseFloat($("#xfer-size").value), sp = parseFloat($("#xfer-speed").value);
    if (!(size > 0) || !(sp > 0)) { out.innerHTML = `<span class="err">請輸入大於 0 的數字。</span>`; return; }
    const ue = +$("#xfer-unit").value, se = +$("#xfer-su").value;
    const bytes = size * 10 ** ue, bits = bytes * 8, bps = sp * 10 ** se, sec = bits / bps;
    const uName = ue === 9 ? "GB" : "MB", sName = ["Kbps", "Mbps", "Gbps"][se / 3 - 1];
    out.innerHTML = `檔案：${size} ${uName} ＝ ${sci(bytes)} 位元組 × 8 ＝ <b>${sci(bits)} 位元</b><br>
      速度：${sp} ${sName} ＝ <b>${sci(bps)} 位元／秒</b>（＝ ${fmtN(+(bps / 8 / 10 ** 6).toFixed(3))} MB/s）<br>
      時間 ＝ ${sci(bits)} ÷ ${sci(bps)} ＝ <b>${fmtT(sec)}</b>${sec >= 1 ? `（${fmtN(Math.round(sec))} 秒）` : ""}<br>
      <span class="small muted">忘記乘 8 會算成 ${fmtT(sec / 8)}，差 8 倍。實際下載通常比理論值慢一些。</span>`;
  }
  ids.forEach(id => { $("#" + id).addEventListener("input", draw); $("#" + id).addEventListener("change", draw); });
  draw();
})();

/* ---------- 9.3 逐行追蹤程式 ---------- */
(function(){
  const out = $("#trace-out"); if (!out) return;
  // 每個程式：lines（顯示的虛擬碼）、run(n) 產生器，每次 yield {line, vars, out?}
  const PROGS = {
    sum: { title: "把 1 加到 n", lines: ["s = 0", "i = 1", "while i <= n:", "    s = s + i", "    i = i + 1", "print(s)"],
      *run(n){ const v = {n}; v.s = 0; yield {line: 0, vars: {...v}}; v.i = 1; yield {line: 1, vars: {...v}};
        while (true) { yield {line: 2, vars: {...v}, note: `${v.i} <= ${n}？${v.i <= n ? "成立，進迴圈" : "不成立，離開迴圈"}`}; if (!(v.i <= n)) break; v.s += v.i; yield {line: 3, vars: {...v}}; v.i++; yield {line: 4, vars: {...v}}; }
        yield {line: 5, vars: {...v}, out: String(v.s)}; } },
    max: { title: "找出最大值", lines: ["a = [3, 9, 2, 7]", "m = a[0]", "for x in a:", "    if x > m:", "        m = x", "print(m)"],
      *run(){ const a = [3, 9, 2, 7], v = {}; yield {line: 0, vars: {a: "[3, 9, 2, 7]"}}; v.m = a[0]; yield {line: 1, vars: {a: "[3, 9, 2, 7]", m: v.m}};
        for (const x of a) { v.x = x; yield {line: 2, vars: {a: "[3, 9, 2, 7]", m: v.m, x}}; yield {line: 3, vars: {a: "[3, 9, 2, 7]", m: v.m, x}, note: `${x} > ${v.m}？${x > v.m ? "成立" : "不成立，跳過"}`}; if (x > v.m) { v.m = x; yield {line: 4, vars: {a: "[3, 9, 2, 7]", m: v.m, x}}; } }
        yield {line: 5, vars: {a: "[3, 9, 2, 7]", m: v.m, x: v.x}, out: String(v.m)}; } },
    even: { title: "數 1～n 有幾個偶數", lines: ["c = 0", "for i in 1..n:", "    if i % 2 == 0:", "        c = c + 1", "print(c)"],
      *run(n){ const v = {n, c: 0}; yield {line: 0, vars: {...v}};
        for (let i = 1; i <= n; i++) { v.i = i; yield {line: 1, vars: {...v}}; yield {line: 2, vars: {...v}, note: `${i} % 2 ＝ ${i % 2}，${i % 2 === 0 ? "等於 0，是偶數" : "不等於 0，跳過"}`}; if (i % 2 === 0) { v.c++; yield {line: 3, vars: {...v}}; } }
        yield {line: 4, vars: {...v}, out: String(v.c)}; } },
    bin: { title: "十進位 n 轉二進位（除 2 取餘）", lines: ["r = \"\"", "while n > 0:", "    r = str(n % 2) + r", "    n = n / 2   # 整數除法", "print(r)"],
      *run(n){ const v = {n, r: '""'}; let r = ""; yield {line: 0, vars: {...v}};
        while (true) { yield {line: 1, vars: {...v}, note: `${v.n} > 0？${v.n > 0 ? "成立" : "不成立，離開"}`}; if (!(v.n > 0)) break; r = String(v.n % 2) + r; v.r = `"${r}"`; yield {line: 2, vars: {...v}, note: `${v.n} % 2 ＝ ${v.n % 2}，接在最前面`}; v.n = Math.floor(v.n / 2); yield {line: 3, vars: {...v}, note: "整數除法，捨去小數"}; }
        yield {line: 4, vars: {...v}, out: r || "0"}; } },
  };
  let gen, cur, prog, done, outv;
  function reset(){
    prog = PROGS[$("#trace-prog").value];
    let n = parseInt($("#trace-n").value, 10); if (!(n >= 0) || n > 50) { n = 4; $("#trace-n").value = "4"; }
    $("#trace-n").disabled = prog === PROGS.max;
    gen = prog.run(n); cur = null; done = false; outv = null; draw();
  }
  function step(){ if (done) return; const r = gen.next(); if (r.done) { done = true; } else { cur = r.value; if (cur.out !== undefined) { outv = cur.out; done = true; } } draw(); }
  function draw(){
    const vars = cur ? cur.vars : {};
    out.innerHTML = `<div class="tracewrap">
      <pre class="code" aria-label="虛擬碼">${prog.lines.map((l, i) => `<span class="ln ${cur && cur.line === i ? "cur" : ""}"><span class="no">${i + 1}</span>${l.replace(/</g, "&lt;")}</span>`).join("\n")}</pre>
      <div class="vars"><div class="gname">變數</div>${Object.keys(vars).length ? `<table class="plain"><tr><th>名字</th><th>目前的值</th></tr>${Object.entries(vars).map(([k, v]) => `<tr><td class="mono">${k}</td><td class="mono">${v}</td></tr>`).join("")}</table>` : `<p class="small muted">還沒開始。</p>`}
        <div class="screen" style="margin-top:8px"><span class="muted small">輸出</span> <b class="mono">${outv === null ? "—" : outv}</b></div></div>
    </div>
    <div class="step-msg">${!cur ? "按「下一步」執行第 1 行。" : `執行第 ${cur.line + 1} 行：<code>${prog.lines[cur.line].trim().replace(/</g, "&lt;")}</code>${cur.note ? `　→ ${cur.note}` : ""}${done ? "　<b>程式結束。</b>" : ""}`}</div>`;
    $("#trace-step").disabled = done; $("#trace-run").disabled = done;
  }
  $("#trace-prog").addEventListener("change", reset); $("#trace-n").addEventListener("input", reset);
  $("#trace-reset").addEventListener("click", reset); $("#trace-step").addEventListener("click", step);
  $("#trace-run").addEventListener("click", () => { let k = 0; while (!done && k++ < 1000) step(); });
  reset();
})();

/* ---------- 10.2–10.3 資料表與 SQL 查詢器 ---------- */
(function(){
  const out = $("#sql-out"); if (!out) return;
  const DEPT = { name: "系所", cols: ["代碼", "系名"], key: "代碼", rows: [["IM", "資訊管理系"], ["CS", "資訊工程系"], ["BA", "企業管理系"]] };
  const STU = { name: "學生", cols: ["學號", "姓名", "系所", "年級", "成績"], key: "學號", fk: "系所",
    rows: [["S101", "陳大明", "IM", 2, 85], ["S102", "林美華", "CS", 3, 72], ["S103", "張雅婷", "BA", 2, 92], ["S104", "李志豪", "IM", 1, 68], ["S105", "黃小玲", "IM", 2, 79], ["S106", "吳佩珊", "CS", 1, 88]] };
  const tbl = (t, rows, cols) => `<table class="plain db"><caption>${t.name}${rows === t.rows ? `　<span class="small muted">${t.rows.length} 列</span>` : ""}</caption><tr>${(cols || t.cols).map(c => `<th>${c}${c === t.key && !cols ? ' <span class="keytag">主鍵</span>' : c === t.fk && !cols ? ' <span class="keytag fk">外來鍵</span>' : ""}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(v => `<td class="${typeof v === "number" ? "num" : ""}">${v}</td>`).join("")}</tr>`).join("")}</table>`;
  $("#sql-tables").innerHTML = `<div class="dbpair">${tbl(DEPT, DEPT.rows)}${tbl(STU, STU.rows)}</div>`;

  const PRESETS = [
    ["全部", "SELECT * FROM 學生"],
    ["80 分以上", "SELECT 姓名, 成績 FROM 學生 WHERE 成績 >= 80 ORDER BY 成績 DESC"],
    ["資管系", "SELECT 姓名, 年級 FROM 學生 WHERE 系所 = 'IM'"],
    ["AND", "SELECT 姓名 FROM 學生 WHERE 系所 = 'IM' AND 年級 = 2"],
    ["平均", "SELECT AVG(成績) FROM 學生"],
    ["幾個人", "SELECT COUNT(*) FROM 學生 WHERE 年級 <> 2"],
  ];
  $("#sql-presets").innerHTML = PRESETS.map(([l, q], i) => `<button class="ghost" data-q="${i}">${l}</button>`).join("");
  $("#sql-presets").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; $("#sql-in").value = PRESETS[+b.dataset.q][1]; run(); });

  const COLS = STU.cols, idx = (c) => COLS.indexOf(c);
  function fail(m){ throw new Error(m); }
  function tokenize(s){
    const re = /\s*(?:('[^']*')|(>=|<=|<>|!=|=|>|<)|(\(|\)|,|\*)|([^\s(),*<>=!']+))/gy;
    const t = []; let m, last = 0;
    while ((m = re.exec(s)) !== null) { if (m.index !== last && !/^\s*$/.test(s.slice(last, m.index))) break; last = re.lastIndex; if (m[1] !== undefined) t.push({k: "str", v: m[1].slice(1, -1)}); else if (m[2]) t.push({k: "op", v: m[2]}); else if (m[3]) t.push({k: "p", v: m[3]}); else t.push({k: "w", v: m[4]}); if (last >= s.length) break; }
    if (last < s.length && !/^\s*$/.test(s.slice(last))) fail(`看不懂這裡：「${s.slice(last, last + 12)}」`);
    return t;
  }
  function parse(s){
    const T = tokenize(s); let i = 0;
    const peek = () => T[i], next = () => T[i++], kw = (w) => peek() && peek().k === "w" && peek().v.toUpperCase() === w;
    if (!kw("SELECT")) fail("查詢要從 SELECT 開始。"); next();
    const sel = [];
    for (;;) {
      const t = next(); if (!t) fail("SELECT 後面要寫欄位名稱或 *。");
      if (t.k === "p" && t.v === "*") sel.push({all: true});
      else if (t.k === "w" && /^(COUNT|AVG|MAX|MIN|SUM)$/i.test(t.v)) { const fn = t.v.toUpperCase(); if (!(peek() && peek().v === "(")) fail(`${fn} 後面要有括號。`); next(); const a = next(); if (!(peek() && peek().v === ")")) fail(`${fn}( 後面要用 ) 關起來。`); next(); if (a.v === "*" && fn !== "COUNT") fail(`${fn} 要指定一個欄位，例如 ${fn}(成績)。`); if (a.v !== "*" && idx(a.v) < 0) fail(`學生表沒有「${a.v}」這一欄。`); sel.push({fn, col: a.v}); }
      else if (t.k === "w") { if (idx(t.v) < 0) fail(`學生表沒有「${t.v}」這一欄。欄位有：${COLS.join("、")}。`); sel.push({col: t.v}); }
      else fail(`SELECT 後面不該出現「${t.v}」。`);
      if (peek() && peek().v === ",") { next(); continue; } break;
    }
    if (!kw("FROM")) fail("接下來要寫 FROM 學生。"); next();
    const tb = next(); if (!tb || tb.v !== "學生") fail(tb && tb.v === "系所" ? "這個查詢器只能查學生表（JOIN 的部分請看講義說明）。" : `沒有「${tb ? tb.v : ""}」這張表，這裡只有「學生」。`);
    let where = null;
    if (kw("WHERE")) { next(); where = parseOr(); }
    let order = null;
    if (kw("ORDER")) { next(); if (!kw("BY")) fail("ORDER 後面要接 BY。"); next(); const c = next(); if (!c || idx(c.v) < 0) fail(`ORDER BY 後面要寫欄位名稱。`); let desc = false; if (kw("DESC")) { next(); desc = true; } else if (kw("ASC")) next(); order = {col: c.v, desc}; }
    if (peek()) fail(`多了看不懂的東西：「${peek().v}」。`);
    return {sel, where, order};
    function parseOr(){ let L = parseAnd(); while (kw("OR")) { next(); const R = parseAnd(), l = L; L = (r) => l(r) || R(r); } return L; }
    function parseAnd(){ let L = parseCond(); while (kw("AND")) { next(); const R = parseCond(), l = L; L = (r) => l(r) && R(r); } return L; }
    function parseCond(){
      if (peek() && peek().v === "(") { next(); const e = parseOr(); if (!(peek() && peek().v === ")")) fail("括號沒關。"); next(); return e; }
      const c = next(); if (!c || c.k !== "w" || idx(c.v) < 0) fail(`WHERE 的條件要從欄位名稱開始，例如 成績 >= 80。${c && c.k === "str" ? "（欄位名稱不用引號）" : ""}`);
      const op = next(); if (!op || op.k !== "op") fail(`「${c.v}」後面要接比較符號（=、<>、>、>=、<、<=）。`);
      const val = next(); if (!val || val.k === "op" || val.k === "p") fail("比較符號後面要接一個值。");
      const ci = idx(c.v), isNum = typeof STU.rows[0][ci] === "number";
      if (isNum && val.k === "str") fail(`「${c.v}」是數字欄，比較時不用引號：${c.v} ${op.v} ${val.v}。`);
      if (!isNum && val.k === "w") fail(`「${c.v}」是文字欄，值要加單引號：${c.v} ${op.v} '${val.v}'。`);
      const v = isNum ? Number(val.v) : val.v; if (isNum && Number.isNaN(v)) fail(`「${val.v}」不是數字。`);
      const F = {"=": (a, b) => a === b, "<>": (a, b) => a !== b, "!=": (a, b) => a !== b, ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b}[op.v];
      return (r) => F(r[ci], v);
    }
  }
  function run(){
    const q = $("#sql-in").value.trim();
    try {
      const {sel, where, order} = parse(q);
      let rows = STU.rows.filter(r => !where || where(r));
      if (order) { const ci = idx(order.col); rows = rows.slice().sort((a, b) => (a[ci] > b[ci] ? 1 : a[ci] < b[ci] ? -1 : 0) * (order.desc ? -1 : 1)); }
      const aggs = sel.filter(s => s.fn);
      if (aggs.length && sel.some(s => !s.fn)) fail("COUNT／AVG 這類統計不能和一般欄位混在一起（這個查詢器不支援 GROUP BY）。");
      let cols, outRows, note;
      if (aggs.length) {
        cols = aggs.map(a => `${a.fn}(${a.col})`);
        outRows = [aggs.map(a => { const ci = idx(a.col), vs = rows.map(r => r[ci]); if (a.fn === "COUNT") return rows.length; if (!vs.length) return "NULL"; if (a.fn === "SUM") return vs.reduce((x, y) => x + y, 0); if (a.fn === "AVG") return +(vs.reduce((x, y) => x + y, 0) / vs.length).toFixed(2); if (a.fn === "MAX") return Math.max(...vs); return Math.min(...vs); })];
        note = `${where ? `WHERE 留下 ${rows.length} 列，` : `全部 ${rows.length} 列，`}再做統計。`;
      } else {
        const ci = sel.some(s => s.all) ? COLS.map((_, i) => i) : sel.map(s => idx(s.col));
        cols = ci.map(i => COLS[i]); outRows = rows.map(r => ci.map(i => r[i]));
        note = `${where ? `WHERE 從 ${STU.rows.length} 列留下 ${rows.length} 列` : `沒有 WHERE，全部 ${rows.length} 列`}${order ? `，照「${order.col}」${order.desc ? "由大到小" : "由小到大"}排` : ""}，SELECT 取出 ${cols.length} 欄。`;
      }
      out.innerHTML = `<p class="small muted" style="margin:0 0 6px">${note}</p>${outRows.length ? tbl({name: "查詢結果", cols, rows: []}, outRows, cols) : `<div class="note" style="margin:0">沒有任何一列符合條件（結果是空的）。</div>`}`;
    } catch (e) { out.innerHTML = `<div class="err">${e.message}</div>`; }
  }
  $("#sql-run").addEventListener("click", run);
  $("#sql-in").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
  document.addEventListener("click", (e) => { const b = e.target.closest(".loadbtn[data-run]"); if (b) setTimeout(() => $("#" + b.dataset.run).click(), 0); });
  run();
})();
