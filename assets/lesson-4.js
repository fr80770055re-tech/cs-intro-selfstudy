// 講義 ④ 的互動元件：行程狀態圖、CPU 排程、分頁位址轉換、頁面置換、檔案權限
"use strict";
const fmt2 = (x) => String(+x.toFixed(2));

/* ---------- 11.3 行程狀態圖 ---------- */
(function(){
  const out = $("#pstate-out"); if (!out) return;
  const N = { new: ["新建", 90, 50], ready: ["就緒", 210, 150], running: ["執行", 430, 150], waiting: ["等待", 320, 250], done: ["結束", 550, 50] };
  const E = [
    { id: "admit", from: "new", to: "ready", label: "允許進入", d: "M120,70 L180,130", lx: 128, ly: 112, why: "作業系統配好記憶體、建好 PCB，行程進入就緒佇列排隊。" },
    { id: "dispatch", from: "ready", to: "running", label: "排程器選中", d: "M260,135 Q320,98 380,135", lx: 320, ly: 102, why: "排程器從就緒佇列挑中它，內容切換後開始在 CPU 上跑。" },
    { id: "timeout", from: "running", to: "ready", label: "時間到／被搶先", d: "M380,165 Q320,202 260,165", lx: 320, ly: 212, why: "時間配額用完（RR）或來了更優先的行程，被換下來，回就緒佇列重新排隊。" },
    { id: "wait", from: "running", to: "waiting", label: "等 I/O", d: "M425,172 L360,232", lx: 430, ly: 212, why: "要讀硬碟或等使用者輸入，給它 CPU 也沒用，所以讓出 CPU 去等待。" },
    { id: "io", from: "waiting", to: "ready", label: "I/O 完成", d: "M280,232 L225,172", lx: 200, ly: 212, why: "等的事情完成了（中斷通知），回到就緒佇列，不是直接回到執行。" },
    { id: "exit", from: "running", to: "done", label: "執行完畢", d: "M465,130 L520,72", lx: 505, ly: 112, why: "程式跑完或被終止，作業系統回收它的記憶體和資源。" },
  ];
  let cur = "new", last = null, log = [];
  function draw(){
    const node = (k) => { const [t, x, y] = N[k]; return `<g class="pnode ${k === cur ? "cur" : ""}"><rect x="${x - 50}" y="${y - 20}" width="100" height="40" rx="10"/><text x="${x}" y="${y + 6}">${t}</text></g>`; };
    const edge = (e) => `<path class="pedge ${last === e.id ? "hot" : ""}" d="${e.d}" marker-end="url(#arr${last === e.id ? "h" : ""})"/><text class="plabel ${last === e.id ? "hot" : ""}" x="${e.lx}" y="${e.ly}">${e.label}</text>`;
    out.innerHTML = `<div class="pscroll"><svg class="pstate" viewBox="0 0 640 290" role="img" aria-label="行程狀態圖，目前狀態：${N[cur][0]}">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahead"/></marker>
      <marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahead hot"/></marker></defs>
      ${E.map(edge).join("")}${Object.keys(N).map(node).join("")}</svg></div>
      <div class="row pbtns">${E.map(e => `<button data-ev="${e.id}" ${e.from === cur ? "" : "disabled"}>${e.label}</button>`).join("")}<button class="ghost" data-ev="reset">重來</button></div>
      <div class="step-msg" aria-live="polite">${last ? `<b>${N[E.find(e => e.id === last).from][0]} → ${N[cur][0]}</b>：${E.find(e => e.id === last).why}` : "行程剛被建立，在<b>新建</b>狀態。按「允許進入」開始。"}${cur === "done" ? "　行程結束了，按「重來」再跑一次。" : ""}</div>
      <p class="small muted" style="margin:6px 0 0">走過的路：${["新建", ...log].join(" → ")}</p>`;
  }
  out.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ev]"); if (!b) return;
    if (b.dataset.ev === "reset") { cur = "new"; last = null; log = []; draw(); return; }
    const ed = E.find(x => x.id === b.dataset.ev); if (!ed || ed.from !== cur) return;
    cur = ed.to; last = ed.id; log.push(N[cur][0]); draw();
  });
  draw();
})();

/* ---------- 11.4 CPU 排程模擬器 ---------- */
(function(){
  const out = $("#sch-out"); if (!out) return;
  const ids = []; for (let i = 1; i <= 4; i++) ids.push("sch-a" + i, "sch-b" + i, "sch-p" + i);
  const COLORS = 4;
  function read(){
    const P = [];
    for (let i = 1; i <= 4; i++) {
      const b = $("#sch-b" + i).value.trim(); if (b === "") continue;
      const at = +$("#sch-a" + i).value, bt = +b, pr = +($("#sch-p" + i).value || 0);
      if (![at, bt, pr].every(Number.isInteger) || at < 0 || at > 50 || bt < 1 || bt > 30 || pr < 0) return { err: `P${i} 的數字不對：抵達時間 0～50、執行時間 1～30，都要是整數。` };
      P.push({ name: "P" + i, at, bt, pr, c: i - 1 });
    }
    if (!P.length) return { err: "至少要有一個行程（填執行時間）。" };
    return { P };
  }
  function draw(){
    const alg = $("#sch-alg").value, q = +$("#sch-q").value;
    $("#sch-qwrap").style.display = alg === "RR" ? "" : "none";
    const r = read(); if (r.err) { out.innerHTML = `<div class="err">${r.err}</div>`; return; }
    const P = r.P, S = OS.schedule(P, alg, q), T = S.end;
    const segs = S.segs.map(s => `<div class="gseg ${s.name ? "c" + (P[s.i].c % COLORS) : "idle"}" style="flex:${s.e - s.s}" title="${s.name || "閒置"} ${s.s}～${s.e}"><span>${s.name || "閒置"}</span></div>`).join("");
    const ticks = [...new Set(S.segs.flatMap(s => [s.s, s.e]))].map(t => `<span style="left:${t / T * 100}%">${t}</span>`).join("");
    const rows = S.res.map(x => `<tr><td><b>${x.name}</b></td><td>${x.at}</td><td>${x.bt}</td>${alg === "PRI" ? `<td>${x.pr}</td>` : ""}<td>${x.ct}</td><td>${x.ct} − ${x.at} ＝ <b>${x.tat}</b></td><td>${x.tat} − ${x.bt} ＝ <b>${x.wt}</b></td><td>${x.rt}</td></tr>`).join("");
    const all = ["FCFS", "SJF", "SRTF", "PRI", "RR"].map(a => [a, OS.schedule(P, a, q).avgW]);
    const best = Math.min(...all.map(a => a[1]));
    out.innerHTML = `<div class="gname" style="margin-top:4px">甘特圖：${OS.ALG_NAME[alg]}${alg === "RR" ? `，時間配額 ${q}` : ""}</div>
      <div class="gantt">${segs}</div><div class="gticks">${ticks}</div>
      <div class="tablewrap"><table class="plain sres"><tr><th>行程</th><th>抵達</th><th>執行</th>${alg === "PRI" ? "<th>優先權</th>" : ""}<th>完成</th><th>週轉 ＝ 完成 − 抵達</th><th>等待 ＝ 週轉 − 執行</th><th>回應</th></tr>${rows}</table></div>
      <div class="results"><div class="rcard src"><div class="rlabel">平均等待時間</div><div class="rval">${S.res.map(x => x.wt).join(" ＋ ")} ÷ ${P.length} ＝ ${fmt2(S.avgW)}</div></div>
        <div class="rcard"><div class="rlabel">平均週轉時間</div><div class="rval">${fmt2(S.avgT)}</div></div>
        <div class="rcard"><div class="rlabel">平均回應時間</div><div class="rval">${fmt2(S.avgR)}</div></div></div>
      <p class="small muted" style="margin:0">同一組資料，五種方法的平均等待時間：${all.map(([a, v]) => `${a === "PRI" ? "優先權" : a} ${v === best ? `<b>${fmt2(v)}</b>` : fmt2(v)}`).join("、")}${alg === "RR" ? "" : `（RR 用配額 ${q}）`}。粗體是最小的。</p>`;
  }
  ids.forEach(id => $("#" + id).addEventListener("input", draw));
  ["sch-alg", "sch-q"].forEach(id => $("#" + id).addEventListener("change", draw));
  draw();
})();

/* ---------- 12.2 分頁位址轉換 ---------- */
(function(){
  const out = $("#pg-out"); if (!out) return;
  const TABLE = [5, 2, 7, null, 0, 3, null, 6];
  function draw(){
    const size = +$("#pg-size").value, d = Math.log2(size), raw = $("#pg-addr").value.trim();
    const tbl = (hl) => `<table class="plain ptable"><tr><th>頁碼</th><th>頁框</th></tr>${TABLE.map((f, i) => `<tr class="${i === hl ? "cur" : ""}"><td>${i}</td><td>${f === null ? "—（不在記憶體）" : f}</td></tr>`).join("")}</table>`;
    if (!/^\d+$/.test(raw)) { out.innerHTML = `<div class="err">請輸入非負整數。</div>`; return; }
    const a = +raw, max = TABLE.length * size;
    if (a >= max) { out.innerHTML = `<div class="err">超出這個行程的位址空間：8 頁 × ${size} ＝ ${max}，邏輯位址只能是 0～${max - 1}。</div>`; return; }
    const p = Math.floor(a / size), off = a % size, f = TABLE[p];
    const bits = (v, n) => v.toString(2).padStart(n, "0");
    const lb = `<span class="pbits"><span class="pp">${bits(p, 3)}</span><span class="po">${bits(off, d)}</span></span>`;
    let body;
    if (f === null) body = `<div class="warnbox" style="margin:10px 0 0"><b>分頁錯誤</b>：第 ${p} 頁不在記憶體裡。CPU 發出中斷，作業系統從硬碟把這一頁載入一個空頁框、更新分頁表，再重新執行這條指令（12.3 節）。</div>`;
    else {
      const pa = f * size + off;
      body = `<div class="calcout">③ 查分頁表：第 <b>${p}</b> 頁 → 頁框 <b>${f}</b><br>④ 實體位址 ＝ ${f} × ${size} ＋ ${off} ＝ <b>${pa}</b></div>
        <div class="pgbin"><div><span class="lab">邏輯位址 ${a}</span>${lb}</div><div class="arrow">↓ 左邊的頁碼換成頁框，右邊的位移照抄</div><div><span class="lab">實體位址 ${pa}</span><span class="pbits"><span class="pf">${bits(f, 3)}</span><span class="po">${bits(off, d)}</span></span></div></div>`;
    }
    out.innerHTML = `<div class="pgwrap"><div>
      <div class="calcout">① 頁碼 ＝ ${a} ÷ ${size} 的商 ＝ <b>${p}</b><br>② 位移 ＝ ${a} ÷ ${size} 的餘數 ＝ <b>${off}</b></div>${body}
      <div class="legend"><span><span class="sw pp"></span>頁碼（左 3 位）</span><span><span class="sw pf"></span>頁框號碼</span><span><span class="sw po"></span>位移（右 ${d} 位，因為 ${size} ＝ 2<sup>${d}</sup>）</span></div>
    </div><div><div class="gname">分頁表</div>${tbl(p)}</div></div>`;
  }
  $("#pg-size").addEventListener("change", draw); $("#pg-addr").addEventListener("input", draw); draw();
})();

/* ---------- 12.4 頁面置換 ---------- */
(function(){
  const out = $("#pr-out"); if (!out) return;
  function draw(){
    const refs = $("#pr-refs").value.trim().split(/[\s,，]+/).filter(Boolean);
    if (!refs.length || refs.some(x => !/^\d{1,2}$/.test(x))) { out.innerHTML = `<div class="err">參考串請輸入 0～99 的頁碼，用空白隔開。</div>`; return; }
    if (refs.length > 30) { out.innerHTML = `<div class="err">參考串最多 30 個。</div>`; return; }
    const R = refs.map(Number), n = +$("#pr-frames").value, alg = $("#pr-alg").value;
    const S = OS.pageReplace(R, n, alg);
    const head = `<tr><th>存取</th>${S.steps.map(s => `<th>${s.ref}</th>`).join("")}</tr>`;
    const rows = Array.from({ length: n }, (_, k) => `<tr><th>頁框 ${k + 1}</th>${S.steps.map(s => `<td class="${!s.hit && s.slot === k ? "new" : ""}">${s.frames[k] === null ? "" : s.frames[k]}</td>`).join("")}</tr>`).join("");
    const res = `<tr><th>結果</th>${S.steps.map(s => `<td class="${s.hit ? "hit" : "miss"}">${s.hit ? "✓" : "F"}</td>`).join("")}</tr>`;
    const vic = `<tr><th>踢掉</th>${S.steps.map(s => `<td class="vic">${s.victim === null ? "" : s.victim}</td>`).join("")}</tr>`;
    const cmp = ["FIFO", "LRU", "OPT"].map(a => [a, OS.pageReplace(R, n, a).faults]);
    const fifoMore = n > 1 && OS.pageReplace(R, n + 1, "FIFO").faults > OS.pageReplace(R, n, "FIFO").faults;
    out.innerHTML = `<div class="tablewrap"><table class="prgrid">${head}${rows}${res}${vic}</table></div>
      <div class="results" style="margin-top:12px"><div class="rcard src"><div class="rlabel">${OS.ALG_NAME[alg]}</div><div class="rval">${S.faults} 次錯誤、${S.hits} 次命中</div></div>
      ${cmp.filter(([a]) => a !== alg).map(([a, f]) => `<div class="rcard"><div class="rlabel">${OS.ALG_NAME[a]}</div><div class="rval">${f} 次錯誤</div></div>`).join("")}</div>
      <p class="small muted" style="margin:0">F ＝ 分頁錯誤（前 ${Math.min(n, new Set(R).size)} 次是填空頁框，也算）；✓ ＝ 命中。${fifoMore ? `<b>注意：這串用 FIFO 時，${n + 1} 個頁框的錯誤反而比 ${n} 個多，這就是 Belady 異常。</b>` : ""}</p>`;
  }
  $("#pr-refs").addEventListener("input", draw); ["pr-frames", "pr-alg"].forEach(id => $("#" + id).addEventListener("change", draw)); draw();
})();

/* ---------- 12.5 檔案權限 ---------- */
(function(){
  const out = $("#perm-out"); if (!out) return;
  const inp = $("#perm-oct"); let bits = [1, 1, 1, 1, 0, 1, 1, 0, 0];
  const WHO = ["擁有者", "同群組", "其他人"], P = ["r", "w", "x"], W = [4, 2, 1], PN = ["讀", "寫", "執行"];
  function fromOct(){ const v = inp.value.trim(); if (/^[0-7]{3}$/.test(v)) { bits = v.split("").flatMap(d => [4, 2, 1].map(w => (+d & w) ? 1 : 0)); draw(false); } else draw(false, true); }
  function draw(syncInput, bad){
    const oct = [0, 1, 2].map(g => bits[g * 3] * 4 + bits[g * 3 + 1] * 2 + bits[g * 3 + 2]).join("");
    if (syncInput) inp.value = oct;
    const str = bits.map((b, i) => b ? P[i % 3] : "-").join("");
    out.innerHTML = `${bad ? `<div class="err">請輸入三位 0～7 的數字，例如 755。</div>` : ""}<div class="permgrid">${WHO.map((w, g) => `<div class="pgroup"><div class="gname">${w}</div><div class="pcells">${[0, 1, 2].map(k => { const i = g * 3 + k; return `<button class="pcell ${bits[i] ? "on" : ""}" data-i="${i}" aria-pressed="${!!bits[i]}" aria-label="${w}${PN[k]}"><b>${bits[i] ? P[k] : "-"}</b><small>${W[k]}</small></button>`; }).join("")}</div>
      <div class="psum mono">${bits.slice(g * 3, g * 3 + 3).join("")}<sub>2</sub> ＝ ${[0, 1, 2].map(k => bits[g * 3 + k] ? W[k] : 0).join("＋")} ＝ <b>${oct[g]}</b></div></div>`).join("")}</div>
      <div class="calcout"><span class="mono"><b>${str}</b></span>　＝　<span class="mono">chmod <b>${oct}</b></span>　→　${WHO.map((w, g) => `${w}${bits.slice(g * 3, g * 3 + 3).some(Boolean) ? "可" + PN.filter((_, k) => bits[g * 3 + k]).join("、") : "沒有權限"}`).join("；")}</div>`;
  }
  out.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; bits[+b.dataset.i] ^= 1; draw(true); });
  inp.addEventListener("input", fromOct); draw(true);
})();
