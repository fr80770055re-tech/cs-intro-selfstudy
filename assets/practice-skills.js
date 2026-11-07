// 題型定義：每個題型會隨機出題、批改，並針對常見錯誤給出診斷。
// 每個 gen(level) 回傳：
//   { prompt, kind: "text" | "choice" | "bitsovf", mode, placeholder, choices,
//     answer（顯示用的正確答案）, check(ans) → {ok, invalid?, diag?}, steps: [解法步驟 html] }
(function () {
  "use strict";
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const bin = (v, w) => (w ? v.toString(2).padStart(w, "0") : v.toString(2));
  const hex = (v) => v.toString(16).toUpperCase();
  const inv = (s) => s.replace(/[01]/g, (c) => (c === "1" ? "0" : "1"));
  const rev = (s) => s.split("").reverse().join("");
  const N = (s, b) => `<code>${s}</code><sub>${b}</sub>`;
  const C = (s) => `<code>${s}</code>`;
  const minus = (n) => (n < 0 ? "−" + -n : String(n));
  const OK = { ok: true };
  const BAD = (diag) => ({ ok: false, diag });
  const INVALID = (diag) => ({ ok: false, invalid: true, diag });

  const clean = (s) => String(s).trim().toUpperCase().replace(/[\s_,，]/g, "");
  const intParse = (s) => {
    s = clean(s).replace(/^[−－–]/, "-").replace(/^＋/, "+");
    if (!/^[+-]?\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) ? n : null;
  };
  const stripZeros = (s) => s.replace(/^0+(?=.)/, "");
  const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;

  function divTable(n, b) {
    let rows = "", v = n; const rem = [];
    while (v > 0) { const q = Math.floor(v / b), r = v % b; rem.push(r); rows += `<tr><td>${v} ÷ ${b}</td><td>${q}</td><td><b>${hex(r)}</b>${r >= 10 ? ` <small>(=${r})</small>` : ""}</td></tr>`; v = q; }
    return { html: `<table class="calc"><tr><th>算式</th><th>商</th><th>餘數</th></tr>${rows}</table>`, rem };
  }
  function weightTable(s, b) {
    const L = s.length;
    const cells = s.split("").map((d, i) => { const e = L - 1 - i; return { d, e, w: b ** e, v: parseInt(d, 16) * b ** e }; });
    const html = `<table class="calc"><tr><th>數字</th>${cells.map((c) => `<td>${c.d}</td>`).join("")}</tr><tr><th>位權</th>${cells.map((c) => `<td>${b}<sup>${c.e}</sup>=${c.w}</td>`).join("")}</tr><tr><th>相乘</th>${cells.map((c) => `<td>${c.v}</td>`).join("")}</tr></table>`;
    return { html, terms: cells.filter((c) => c.v).map((c) => c.v) };
  }
  function groupHTML(s, g) {
    const pad = (g - (s.length % g)) % g, p = "0".repeat(pad) + s, out = [];
    for (let i = 0; i < p.length; i += g) out.push(p.slice(i, i + g));
    return { pad, groups: out, html: out.map((x) => `<span class="grpchip">${x}<small>→ ${hex(parseInt(x, 2))}</small></span>`).join(" ") };
  }

  const SKILLS = [];
  const add = (s) => SKILLS.push(s);

  /* ---------- 第 0 章 ---------- */
  add({
    id: "pow2", ch: 0, name: "2 的次方", lesson: "lesson.html#ch0-4",
    desc: "記熟 2⁰～2¹⁰，後面每一章都會用到。",
    gen() {
      const n = ri(0, 10), v = 2 ** n;
      return {
        prompt: `2<sup>${n}</sup> 等於多少？`, kind: "text", mode: "numeric", placeholder: "輸入十進位數字", answer: String(v),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入一個整數。");
          if (x === v) return OK;
          if (n === 0 && x === 0) return BAD("任何數的 0 次方都規定為 <b>1</b>，不是 0。");
          if (x === 2 * n) return BAD(`2<sup>${n}</sup> 是「${n} 個 2 相乘」，不是 2 × ${n}。`);
          if (x === 2 ** (n - 1) || x === 2 ** (n + 1)) return BAD("差了一次方。數一數，2 要乘幾次？");
          return BAD(`2<sup>${n}</sup> 是 ${n} 個 2 相乘。`);
        },
        steps: n === 0 ? ["規定：任何數的 0 次方都是 1。", `2<sup>0</sup> = <b>1</b>`]
          : [`2<sup>${n}</sup> 的意思是 ${n} 個 2 相乘。`, `${Array(n).fill(2).join(" × ")} = <b>${v}</b>`],
      };
    },
  });

  /* ---------- 第 1 章 ---------- */
  add({
    id: "bin2dec", ch: 1, name: "二進位 → 十進位", lesson: "lesson.html#ch1-2",
    desc: "位權相加：每一位的數字 × 位權，全部加起來。",
    gen(level) {
      const L = level === 1 ? 4 : ri(5, 8), v = ri(2 ** (L - 1), 2 ** L - 1), s = bin(v);
      const wt = weightTable(s, 2);
      return {
        prompt: `把 ${N(s, 2)} 轉成十進位。`, kind: "text", mode: "numeric", placeholder: "十進位答案", answer: String(v),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入十進位整數。");
          if (x === v) return OK;
          if (rev(s) !== s && x === parseInt(rev(s), 2)) return BAD("位權的方向弄反了：<b>最右邊</b>那一位的位權才是 1，往左依序是 2、4、8……");
          if (x === s.split("").filter((c) => c === "1").length) return BAD("你好像只數了有幾個 1。每個 1 要換成它所在位置的位權再相加。");
          const d = x - v;
          if (d < 0 && isPow2(-d) && s[s.length - 1 - Math.log2(-d)] === "1") return BAD(`漏加了 ${-d}：位權 ${-d} 的那一位是 1，也要加進去。`);
          if (d > 0 && isPow2(d) && s[s.length - 1 - Math.log2(d)] === "0") return BAD(`多加了 ${d}：位權 ${d} 的那一位是 0，不用加。`);
          return BAD("對照下面的位權表，檢查每一位的位權有沒有寫對。");
        },
        steps: ["從右邊開始，位權依序是 1、2、4、8、16……（每往左乘以 2）。", wt.html, `把是 1 的位置的位權加起來：${wt.terms.join(" + ")} = <b>${v}</b>`],
      };
    },
  });
  add({
    id: "dec2bin", ch: 1, name: "十進位 → 二進位", lesson: "lesson.html#ch1-3",
    desc: "除 2 取餘，餘數由下往上讀。",
    gen(level) {
      const n = level === 1 ? ri(5, 15) : ri(16, 255), s = bin(n), t = divTable(n, 2);
      return {
        prompt: `把 ${N(n, 10)} 轉成二進位。`, kind: "text", mode: "numeric", placeholder: "只用 0 和 1", answer: s,
        check(a) {
          a = clean(a); if (!/^[01]+$/.test(a)) return INVALID("二進位只能用 0 和 1。");
          a = stripZeros(a); if (a === s) return OK;
          if (rev(s) !== s && stripZeros(rev(s)) === a) return BAD("餘數讀反了！要<b>由下往上</b>讀：最後一個餘數是最左邊那一位。");
          return BAD(`你的答案 ${N(a, 2)} 換回十進位是 ${parseInt(a, 2)}，不是 ${n}。對照下面的除法過程找找看哪一步不同。`);
        },
        steps: [`一直除以 2，記下每次的餘數，直到商變成 0：`, t.html, `餘數<b>由下往上</b>讀：<b>${s}</b>`],
      };
    },
  });
  add({
    id: "hex2dec", ch: 1, name: "十六進位 → 十進位", lesson: "lesson.html#ch1-2",
    desc: "A～F 代表 10～15，位權是 1、16、256。",
    gen(level) {
      let v; do { v = level === 1 ? ri(16, 255) : ri(256, 4095); } while (level === 1 && !/[A-F]/.test(hex(v)));
      const s = hex(v), wt = weightTable(s, 16), digs = s.split("").map((c) => parseInt(c, 16));
      return {
        prompt: `把 ${N(s, 16)} 轉成十進位。`, kind: "text", mode: "numeric", placeholder: "十進位答案", answer: String(v),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入十進位整數。");
          if (x === v) return OK;
          if (x === digs.reduce((acc, d) => acc * 10 + d, 0)) return BAD("位權用錯了：十六進位每往左一位要乘以 <b>16</b>，不是 10。");
          if (String(x) === digs.join("")) return BAD("字母換成數字沒錯，但還要乘上位權再相加，不能直接接在一起。");
          return BAD("先把字母換成數字（A=10…F=15），再乘上 16 的次方相加。");
        },
        steps: ["字母先換成數字：A=10、B=11、C=12、D=13、E=14、F=15。位權從右邊開始是 1、16、256。", wt.html, `加起來：${wt.terms.join(" + ")} = <b>${v}</b>`],
      };
    },
  });
  add({
    id: "dec2hex", ch: 1, name: "十進位 → 十六進位", lesson: "lesson.html#ch1-3",
    desc: "除 16 取餘，10～15 寫成 A～F。",
    gen(level) {
      const n = level === 1 ? ri(26, 255) : ri(256, 4095), s = hex(n), t = divTable(n, 16);
      const decConcat = t.rem.slice().reverse().join("");
      return {
        prompt: `把 ${N(n, 10)} 轉成十六進位。`, kind: "text", mode: "text", placeholder: "可用 0-9、A-F", answer: s,
        check(a) {
          a = clean(a); if (!/^[0-9A-F]+$/.test(a)) return INVALID("十六進位只能用 0～9 和 A～F。");
          a = stripZeros(a); if (a === s) return OK;
          if (t.rem.some((r) => r >= 10) && a === decConcat) return BAD("餘數 10～15 要寫成 <b>A～F</b>，一個餘數只能佔一位。");
          if (rev(s) !== s && a === stripZeros(rev(s))) return BAD("餘數讀反了，要<b>由下往上</b>讀。");
          if (a === String(n)) return BAD("題目要的是十六進位，不是原本的十進位。");
          return BAD(`你的答案 ${N(a, 16)} 換回十進位是 ${parseInt(a, 16)}，不是 ${n}。`);
        },
        steps: ["一直除以 16，記下每次的餘數：", t.html, `餘數<b>由下往上</b>讀：<b>${s}</b>`],
      };
    },
  });
  add({
    id: "bin2hex", ch: 1, name: "二進位 → 十六進位（4 位一組）", lesson: "lesson.html#ch1-5",
    desc: "從右邊開始 4 個一組，每組換成一個十六進位數字。",
    gen(level) {
      let L, v; do { L = level === 1 ? ri(5, 8) : ri(9, 12); v = ri(2 ** (L - 1), 2 ** L - 1); } while (L % 4 === 0 && Math.random() < 0.6);
      const s = bin(v), ans = hex(v), g = groupHTML(s, 4);
      const leftGroups = []; for (let i = 0; i < s.length; i += 4) leftGroups.push(s.slice(i, i + 4));
      const leftAns = leftGroups.map((x) => hex(parseInt(x, 2))).join("");
      return {
        prompt: `把 ${N(s, 2)} 轉成十六進位。`, kind: "text", mode: "text", placeholder: "可用 0-9、A-F", answer: ans,
        check(a) {
          a = clean(a); if (!/^[0-9A-F]+$/.test(a)) return INVALID("十六進位只能用 0～9 和 A～F。");
          a = stripZeros(a); if (a === ans) return OK;
          if (s.length % 4 && stripZeros(leftAns) === a) return BAD("分組方向錯了：要從<b>右邊</b>開始 4 個一組，最左邊不夠的補 0。");
          if (a === String(v)) return BAD("這是十進位的答案。題目要十六進位：分組後每組換成 0～F。");
          return BAD("每組 4 個位元的位權是 8、4、2、1，算出 0～15 後換成 0～F。");
        },
        steps: [`從右邊開始 4 個一組${g.pad ? `，最左邊補 ${g.pad} 個 0` : ""}：`, g.html, `接起來：<b>${ans}</b>`],
      };
    },
  });
  add({
    id: "hex2bin", ch: 1, name: "十六進位 → 二進位", lesson: "lesson.html#ch1-5",
    desc: "每個十六進位數字展開成 4 個位元。",
    gen(level) {
      const v = level === 1 ? ri(17, 255) : ri(256, 4095), s = hex(v), ans = bin(v);
      const parts = s.split("").map((c) => bin(parseInt(c, 16), 4));
      const noPad = s.split("").map((c) => bin(parseInt(c, 16))).join("");
      return {
        prompt: `把 ${N(s, 16)} 轉成二進位。`, kind: "text", mode: "numeric", placeholder: "只用 0 和 1", answer: ans,
        check(a) {
          a = clean(a); if (!/^[01]+$/.test(a)) return INVALID("二進位只能用 0 和 1。");
          a = stripZeros(a); if (a === ans) return OK;
          if (stripZeros(noPad) === a && noPad !== parts.join("")) return BAD("每個十六進位數字都要展開成<b>剛好 4 位</b>，不夠要在左邊補 0（例如 3 → 0011）。");
          return BAD("把每個數字分別寫成 4 位二進位，再依序接起來。");
        },
        steps: ["每個數字展開成 4 位元（位權 8、4、2、1）：", s.split("").map((c, i) => `<span class="grpchip">${c}<small>→ ${parts[i]}</small></span>`).join(" "), `接起來，去掉最左邊多餘的 0：<b>${ans}</b>`],
      };
    },
  });
  add({
    id: "bin2oct", ch: 1, name: "二進位 → 八進位（3 位一組）", lesson: "lesson.html#ch1-5",
    desc: "從右邊開始 3 個一組，每組換成 0～7。",
    gen(level) {
      const L = level === 1 ? ri(4, 7) : ri(8, 12), v = ri(2 ** (L - 1), 2 ** L - 1), s = bin(v), ans = v.toString(8);
      const g = groupHTML(s, 3);
      const left = []; for (let i = 0; i < s.length; i += 3) left.push(s.slice(i, i + 3));
      const leftAns = left.map((x) => parseInt(x, 2).toString(8)).join("");
      return {
        prompt: `把 ${N(s, 2)} 轉成八進位。`, kind: "text", mode: "numeric", placeholder: "只用 0-7", answer: ans,
        check(a) {
          a = clean(a); if (!/^[0-7]+$/.test(a)) return INVALID("八進位只能用 0～7。");
          a = stripZeros(a); if (a === ans) return OK;
          if (s.length % 3 && stripZeros(leftAns) === a) return BAD("分組方向錯了：要從<b>右邊</b>開始 3 個一組。");
          if (a === hex(v)) return BAD("這是 4 個一組（十六進位）的結果。八進位要 <b>3 個一組</b>。");
          return BAD("每組 3 個位元的位權是 4、2、1。");
        },
        steps: [`從右邊開始 3 個一組${g.pad ? `，最左邊補 ${g.pad} 個 0` : ""}：`, g.html.replace(/→ ([0-9A-F])/g, "→ $1"), `接起來：<b>${ans}</b>`],
      };
    },
  });
  add({
    id: "frac2bin", ch: 1, name: "小數 → 二進位", lesson: "lesson.html#ch1-4",
    desc: "整數除 2 取餘、小數乘 2 取整，分開算再合起來。",
    gen(level) {
      const m = level === 1 ? ri(1, 3) : ri(2, 4); let k; do { k = ri(1, 2 ** m - 1); } while (k % 2 === 0);
      const ip = level === 1 ? 0 : ri(1, 15), frac = k / 2 ** m, dec = ip + frac;
      const fb = bin(k, m), ans = bin(ip) + "." + fb;
      const rows = []; let x = frac;
      while (x > 0) { const p = x * 2, d = Math.floor(p); rows.push(`<tr><td>${x} × 2 = ${p}</td><td><b>${d}</b></td><td>${p - d}</td></tr>`); x = p - d; }
      const steps = [];
      if (ip) { const t = divTable(ip, 2); steps.push(`整數和小數分開算。整數部分 ${ip}：除 2 取餘、由下往上讀 → <b>${bin(ip)}</b>`, t.html); }
      steps.push(`小數部分 ${frac}：一直乘以 2，拿出整數部分，直到剩下 0：`, `<table class="calc"><tr><th>算式</th><th>取出</th><th>剩下</th></tr>${rows.join("")}</table>`);
      steps.push(`取出的整數<b>由上往下</b>讀 → .${fb}，合起來：<b>${ans}</b>`);
      return {
        prompt: `把 ${N(dec, 10)} 轉成二進位。`, kind: "text", mode: "decimal", placeholder: "例如 101.01", answer: ans,
        check(a) {
          a = clean(a).replace(/。/g, "."); if (!/^[01]*\.?[01]*$/.test(a) || !/[01]/.test(a)) return INVALID("請用 0、1 和小數點作答，例如 101.01。");
          if (!a.includes(".")) return BAD("答案應該有小數點：小數部分也要轉換。");
          let [i, f] = a.split("."); i = stripZeros(i || "0"); f = (f || "").replace(/0+$/, "");
          const ok = i === bin(ip) && f === fb;
          if (ok) return OK;
          if (i === bin(ip) && f === rev(fb).replace(/0+$/, "") && fb !== rev(fb)) return BAD("小數部分讀反了！乘 2 取整要<b>由上往下</b>讀（和除法相反）。");
          if (i !== bin(ip) && f === fb) return BAD("小數部分對了，整數部分錯了：整數要用除 2 取餘、由下往上讀。");
          return BAD("小數部分要一直乘以 2，每次把整數部分（0 或 1）拿出來。");
        },
        steps,
      };
    },
  });

  /* ---------- 第 2 章 ---------- */
  const tcBits = (n, w) => bin(n < 0 ? 2 ** w + n : n, w);
  const tcVal = (s) => (s[0] === "1" ? parseInt(s, 2) - 2 ** s.length : parseInt(s, 2));
  add({
    id: "tcWrite", ch: 2, name: "寫出 2 補數", lesson: "lesson.html#ch2-2",
    desc: "負數：先寫正數 → 每位反轉 → 再加 1。",
    gen(level) {
      const w = level === 1 ? 4 : 8, n = ri(-(2 ** (w - 1)), -1), pos = bin(-n, w), ones = inv(pos), ans = tcBits(n, w), sm = "1" + bin(-n, w - 1);
      return {
        prompt: `用 <b>${w} 位元</b>的 2 補數表示 ${C(minus(n))}。`, kind: "text", mode: "numeric", placeholder: `${w} 個 0 或 1`, answer: ans,
        check(a) {
          a = clean(a); if (!/^[01]+$/.test(a)) return INVALID("請用 0 和 1 作答。");
          if (a === ans) return OK;
          if (a.length < w && a.padStart(w, "1") === ans) return BAD(`位數不夠：${w} 位元要寫滿 ${w} 位。負數左邊補的是 <b>1</b>。`);
          if (a.length !== w) return BAD(`答案要剛好 ${w} 位。`);
          if (a === ones) return BAD("反轉做對了，但<b>忘了加 1</b>。只反轉是 1 補數。");
          if (a === pos) return BAD(`這是 +${-n} 的寫法。負數要<b>反轉再加 1</b>。`);
          if (-n < 2 ** (w - 1) && a === sm) return BAD("這是「符號大小表示法」（只改最左邊）。2 補數要反轉再加 1。");
          return BAD(`你的答案用 2 補數讀回來是 ${minus(tcVal(a))}。`);
        },
        steps: [`① 先寫出 ${-n} 的二進位，補滿 ${w} 位：<b>${pos}</b>`, `② 每一位反轉（0↔1）：<b>${ones}</b>`, `③ 再加 1：${ones} + 1 = <b>${ans}</b>`],
      };
    },
  });
  add({
    id: "tcRead", ch: 2, name: "讀出 2 補數的值", lesson: "lesson.html#ch2-2",
    desc: "最高位元的位權當成負的，其餘照常加。",
    gen(level) {
      const w = level === 1 ? 4 : 8, v = Math.random() < 0.75 ? ri(2 ** (w - 1), 2 ** w - 1) : ri(1, 2 ** (w - 1) - 1);
      const s = bin(v, w), val = tcVal(s), rest = parseInt(s.slice(1), 2);
      return {
        prompt: `${w} 位元的 2 補數 ${C(s)} 代表十進位多少？`, kind: "text", mode: "text", placeholder: "可以是負數，例如 -5", answer: minus(val),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數，負數前面加 -。");
          if (x === val) return OK;
          if (s[0] === "1") {
            if (x === v) return BAD(`最高位元是 1，在 2 補數要當成 <b>−${2 ** (w - 1)}</b>，不是 +${2 ** (w - 1)}。`);
            if (x === -rest) return BAD("這是「符號大小」的讀法。2 補數要把最高位元當成負的位權再相加。");
            if (x === -(2 ** w - 1 - v)) return BAD("這是「1 補數」的讀法（只反轉、沒有加 1），差了 1。");
            if (x === -val) return BAD("正負號錯了。");
          }
          return BAD("把最高位元的位權當成負的，其餘位元照常相加。");
        },
        steps: s[0] === "1"
          ? [`最高位元是 1，位權當成 −${2 ** (w - 1)}。`, `其餘位元 ${C(s.slice(1))} = ${rest}`, `−${2 ** (w - 1)} + ${rest} = <b>${minus(val)}</b>`]
          : ["最高位元是 0，是正數，直接照二進位計算。", `${C(s)} = <b>${val}</b>`],
      };
    },
  });
  add({
    id: "reps", ch: 2, name: "符號大小與 1 補數", lesson: "lesson.html#ch2-2",
    desc: "符號大小：只改最左邊；1 補數：全部反轉。",
    gen(level) {
      const w = level === 1 ? 4 : 8, n = ri(-(2 ** (w - 1) - 1), -1), type = pick(["sm", "oc"]);
      const sm = "1" + bin(-n, w - 1), oc = inv(bin(-n, w)), tc = tcBits(n, w), ans = type === "sm" ? sm : oc;
      const name = type === "sm" ? "符號大小表示法" : "1 補數";
      return {
        prompt: `用 <b>${w} 位元</b>的<b>${name}</b>表示 ${C(minus(n))}。`, kind: "text", mode: "numeric", placeholder: `${w} 個 0 或 1`, answer: ans,
        check(a) {
          a = clean(a); if (!/^[01]+$/.test(a)) return INVALID("請用 0 和 1 作答。");
          if (a === ans) return OK;
          if (a.length !== w) return BAD(`答案要剛好 ${w} 位。`);
          if (a === tc) return BAD("這是 <b>2 補數</b>的寫法（反轉再加 1）。題目問的是" + name + "。");
          if (type === "sm" && a === oc) return BAD("這是 <b>1 補數</b>的寫法（全部反轉）。符號大小只要把最左邊改成 1。");
          if (type === "oc" && a === sm) return BAD("這是<b>符號大小</b>的寫法。1 補數要把<b>每一位</b>都反轉。");
          return BAD(type === "sm" ? "符號大小：最左邊 1 代表負，其餘位元寫數字的大小。" : "1 補數：先寫出正數，再把每一位反轉。");
        },
        steps: type === "sm"
          ? [`先寫出大小 ${-n}，用剩下的 ${w - 1} 位：${bin(-n, w - 1)}`, `最左邊放 1 表示負數：<b>${sm}</b>`]
          : [`先寫出 ${-n} 的二進位，補滿 ${w} 位：${bin(-n, w)}`, `每一位反轉：<b>${oc}</b>`],
      };
    },
  });
  add({
    id: "addsub", ch: 2, name: "2 補數加減與溢位", lesson: "lesson.html#ch2-3",
    desc: "減法改成加 2 補數；同號相加卻變號就是溢位。",
    gen(level) {
      const w = level === 1 ? 4 : 8, mn = -(2 ** (w - 1)), mx = 2 ** (w - 1) - 1, mask = 2 ** w - 1;
      const want = pick(["ovf", "carry", "plain"]);
      let A, B, op, r;
      for (let i = 0; i < 300; i++) {
        A = ri(mn, mx); B = ri(mn, mx); op = pick(["+", "-"]);
        if (op === "-" && B === mn) continue;
        const ua = A & mask, ub = B & mask, ub2 = op === "-" ? (~B) & mask : ub, cin = op === "-" ? 1 : 0;
        const sum = ua + ub2 + cin, trueV = op === "-" ? A - B : A + B;
        r = { ua, ub, ub2, cin, carry: sum >> w & 1, res: bin(sum & mask, w), trueV, ovf: trueV < mn || trueV > mx };
        const kind = r.ovf ? "ovf" : r.carry ? "carry" : "plain";
        if (kind === want) break;
      }
      const a = bin(r.ua, w), b = bin(r.ub, w), b2 = bin(r.ub2, w);
      const resV = tcVal(r.res);
      const plainSum = bin((r.ua + r.ub) & mask, w), noPlusOne = bin((r.ua + r.ub2) & mask, w);
      const opTxt = op === "-" ? "−" : "+", Btxt = B < 0 ? `(${minus(B)})` : B;
      const steps = [`A = ${minus(A)} → <b>${a}</b>，B = ${minus(B)} → <b>${b}</b>`];
      if (op === "-") steps.push(`減法改成加法：A − B = A + (−B)。B 反轉 → ${b2}，再加 1。`);
      steps.push(`直式相加：${a} + ${b2}${op === "-" ? " + 1" : ""} = ${r.carry ? `<s>1</s>` : ""}${r.res}${r.carry ? "（最左邊進位出去的 1 丟掉）" : ""}`);
      steps.push(`結果 ${r.res} 讀回來是 ${minus(resV)}。`);
      steps.push(r.ovf
        ? `正確答案 ${minus(A)} ${opTxt} ${Btxt} = ${minus(r.trueV)}，超出 ${minus(mn)}～${mx}，<b>溢位</b>。`
        : `正確答案 ${minus(r.trueV)} 在 ${minus(mn)}～${mx} 之內，<b>沒有溢位</b>${r.carry ? "（雖然有進位出去）" : ""}。`);
      return {
        prompt: `用 <b>${w} 位元</b> 2 補數計算 ${C(`${minus(A)} ${opTxt} ${Btxt}`)}。寫出結果的 ${w} 個位元，並判斷有沒有溢位。`,
        kind: "bitsovf", mode: "numeric", placeholder: `${w} 個 0 或 1`, answer: `${r.res}，${r.ovf ? "有溢位" : "沒有溢位"}`,
        check(ans) {
          const bits = clean(ans.bits || "");
          if (!/^[01]+$/.test(bits)) return INVALID("結果請用 0 和 1 作答。");
          if (!ans.ovf) return INVALID("請選擇「有溢位」或「沒有溢位」。");
          const bitsOk = bits === r.res, ovfOk = (ans.ovf === "yes") === r.ovf;
          if (bitsOk && ovfOk) return OK;
          const msgs = [];
          if (!bitsOk) {
            if (bits.length === w + 1 && bits.slice(1) === r.res) msgs.push(`最左邊進位出去的 1 要<b>丟掉</b>，結果只留 ${w} 位。`);
            else if (bits.length !== w) msgs.push(`結果要剛好 ${w} 位。`);
            else if (op === "-" && bits === plainSum) msgs.push("減法不能直接加 B：要加上 <b>B 的 2 補數</b>（反轉再加 1）。");
            else if (op === "-" && bits === noPlusOne) msgs.push("B 反轉之後<b>忘了加 1</b>。");
            else msgs.push("結果的位元不對，對照下面的步驟檢查進位。");
          }
          if (!ovfOk) {
            if (ans.ovf === "yes" && r.carry) msgs.push("有進位出去<b>不等於</b>溢位！判斷溢位要看正負號：答案 " + minus(r.trueV) + " 在範圍內。");
            else if (ans.ovf === "yes") msgs.push(`正確答案 ${minus(r.trueV)} 在 ${minus(mn)}～${mx} 之內，沒有溢位。`);
            else msgs.push(`正確答案 ${minus(r.trueV)} 超出 ${minus(mn)}～${mx}，有溢位。徵兆：${r.ovf && r.trueV > 0 ? "兩個正數相加，結果卻是負數" : "兩個負數相加，結果卻是正數"}。`);
          }
          return BAD(msgs.join("<br>"));
        },
        steps,
      };
    },
  });

  /* ---------- 觀念選擇題 ---------- */
  const CONCEPTS = [
    { q: "1 個位元組（byte）有幾個位元？", a: "8 個", o: ["4 個", "16 個", "2 個"], why: "8 個位元 = 1 個位元組。" },
    { q: "十六進位的 B 代表十進位多少？", a: "11", o: ["12", "13", "10"], why: "A=10、B=11、C=12、D=13、E=14、F=15。" },
    { q: "十進位整數轉二進位（除 2 取餘），餘數要怎麼讀？", a: "由下往上", o: ["由上往下", "從中間開始"], why: "最後得到的餘數是最左邊（位權最大）的那一位。" },
    { q: "十進位小數轉二進位（乘 2 取整），取出的整數要怎麼讀？", a: "由上往下", o: ["由下往上"], why: "第一次乘出來的是小數點後第一位，和除法相反。" },
    { q: "二進位轉十六進位要怎麼分組？", a: "4 個一組，從右邊開始", o: ["4 個一組，從左邊開始", "3 個一組，從右邊開始", "8 個一組，從右邊開始"], why: "16 = 2⁴，所以 4 個位元對應一個十六進位數字；從右邊（小數點）開始分。" },
    { q: "哪一種表示法，0 只有一種寫法？", a: "2 補數", o: ["符號大小", "1 補數"], why: "符號大小和 1 補數都有 +0 和 −0。" },
    { q: "8 位元 2 補數能表示的範圍是？", a: "−128 ～ 127", o: ["−127 ～ 127", "0 ～ 255", "−128 ～ 128"], why: "−2⁷ ～ 2⁷−1。−127～127 是符號大小和 1 補數的範圍；0～255 是無號整數。" },
    { q: "4 位元 2 補數能表示的範圍是？", a: "−8 ～ 7", o: ["−7 ～ 7", "0 ～ 15", "−8 ～ 8"], why: "−2³ ～ 2³−1。" },
    { q: "2 補數相加時，最左邊有進位出去，代表一定溢位嗎？", a: "不一定，要看正負號", o: ["是，一定溢位", "是，而且答案會變成 0"], why: "例如 −3 + (−4)：有進位出去，但結果 −7 正確，沒有溢位。" },
    { q: "一個正數加一個負數，有可能溢位嗎？", a: "不可能", o: ["有可能", "只有 8 位元時可能"], why: "結果一定落在兩數之間，不會超出範圍。" },
    { q: "十進位的 0.1 轉成二進位會怎樣？", a: "變成無限循環小數", o: ["剛好是 0.1", "剛好是 0.0001"], why: "0.1 = 0.0001100110011…₂，所以電腦只能存近似值。" },
    { q: "電腦怎麼計算 A − B？", a: "A + (B 的 2 補數)", o: ["用另一套減法電路", "A + B 之後再加負號"], why: "減法改成加法，所以只需要一套加法電路。" },
    { q: "八進位可以使用哪些數字？", a: "0 ～ 7", o: ["0 ～ 8", "1 ～ 8", "0 ～ 9"], why: "基數是多少，就只能用比它小的數字。" },
    { q: "「位權」是什麼意思？", a: "某個位置代表的大小", o: ["數字裡最大的那一位", "位元的總數"], why: "例如十進位百位的位權是 100；二進位從右邊數第 3 位的位權是 4。" },
    { q: "下面哪一個是 2 補數求負數的正確步驟？", a: "每位反轉，再加 1", o: ["只把最左邊改成 1", "每位反轉就好", "先加 1，再反轉"], why: "只改最左邊是符號大小；只反轉是 1 補數。" },
  ];
  add({
    id: "concepts", ch: 2, name: "觀念選擇題（綜合）", lesson: "lesson.html",
    desc: "名詞與觀念的快速檢查，涵蓋全部章節。",
    gen() {
      const c = pick(CONCEPTS), choices = shuffle([c.a, ...c.o]);
      return {
        prompt: c.q, kind: "choice", choices, answer: c.a,
        check(a) { return a === c.a ? OK : BAD(c.why); },
        steps: [c.why],
      };
    },
  });

  window.SKILLS = SKILLS;
})();
