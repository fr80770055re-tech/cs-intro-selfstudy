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
  /* ---------- 第 3 章 ---------- */
  const uv = (s) => parseInt(s, 2);
  const randBits = (w, hiProb) => { let s = ""; for (let i = 0; i < w; i++) s += Math.random() < 0.5 ? "1" : "0"; if (hiProb !== undefined) s = (Math.random() < hiProb ? "1" : "0") + s.slice(1); return s; };
  const bitsOnly = (a) => { a = clean(a); return /^[01]+$/.test(a) ? a : null; };
  add({
    id: "unsRead", ch: 3, name: "無號數與有號數", lesson: "lesson-2.html#ch3-1",
    desc: "同一串位元，無號數照常加；有號數的最高位元當負的。",
    gen(level) {
      const w = level === 1 ? 4 : 8, s = randBits(w, 0.75), type = pick(["u", "s"]);
      const u = uv(s), sv = tcVal(s), ans = type === "u" ? u : sv, H = 2 ** (w - 1);
      return {
        prompt: `${w} 位元的 ${C(s)}，當作<b>${type === "u" ? "無號數" : "有號數（2 補數）"}</b>是十進位多少？`, kind: "text", mode: "text", placeholder: "十進位整數", answer: minus(ans),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數，負數前面加 -。");
          if (x === ans) return OK;
          if (s[0] === "1" && type === "u" && x === sv) return BAD(`這是有號數的讀法。無號數沒有正負號，最高位元照常是 <b>＋${H}</b>。`);
          if (s[0] === "1" && type === "s" && x === u) return BAD(`這是無號數的讀法。有號數（2 補數）的最高位元要當成 <b>−${H}</b>。`);
          return BAD(type === "u" ? "每一位的數字 × 位權，全部加起來。" : "最高位元的位權當成負的，其餘照常加。");
        },
        steps: type === "u"
          ? [`無號數：每一位都照一般位權。`, `${C(s)} = <b>${u}</b>`]
          : s[0] === "1" ? [`有號數：最高位元是 1，位權當成 −${H}。`, `其餘位元 ${C(s.slice(1))} = ${uv(s.slice(1))}`, `−${H} + ${uv(s.slice(1))} = <b>${minus(sv)}</b>`]
            : [`有號數：最高位元是 0，是正數，和無號數讀法一樣。`, `${C(s)} = <b>${sv}</b>`],
      };
    },
  });
  add({
    id: "signExt", ch: 3, name: "零延伸與符號延伸", lesson: "lesson-2.html#ch3-2",
    desc: "無號數左邊補 0；有號數左邊補最高位元。",
    gen(level) {
      const w = level === 1 ? 4 : 8, W = w * 2, s = randBits(w, 0.7), type = pick(["u", "s", "s"]);
      const zx = "0".repeat(w) + s, sx = s[0].repeat(w) + s, ans = type === "u" ? zx : sx;
      return {
        prompt: `把 ${w} 位元的<b>${type === "u" ? "無號數" : "有號數"}</b> ${C(s)} 擴充成 <b>${W} 位元</b>，值不能改變。`, kind: "text", mode: "numeric", placeholder: `${W} 個 0 或 1`, answer: ans,
        check(a) {
          a = bitsOnly(a); if (!a) return INVALID("請用 0 和 1 作答。");
          if (a === ans) return OK;
          if (a.length !== W) return BAD(`答案要剛好 ${W} 位：原本的 ${w} 位，左邊再加 ${w} 位。`);
          if (a === s + "0".repeat(w)) return BAD("補錯邊了：延伸是在<b>左邊</b>補位元。右邊補 0 等於左移，值會變大。");
          if (type === "s" && a === zx) return BAD("這是零延伸。有號數要用<b>符號延伸</b>：左邊補最高位元（這裡是 1），否則負數會變成正數。");
          if (type === "u" && a === sx) return BAD("這是符號延伸。無號數沒有正負號，左邊要補 <b>0</b>。");
          return BAD(type === "u" ? "無號數：左邊全部補 0，原本的位元照抄。" : "有號數：左邊全部補原本的最高位元，原本的位元照抄。");
        },
        steps: [type === "u" ? "無號數用零延伸：左邊補 0。" : `有號數用符號延伸：最高位元是 <b>${s[0]}</b>，左邊補 ${w} 個 ${s[0]}。`, `${C(s)} → <b>${ans}</b>`,
          type === "u" ? `值不變：${uv(s)}。` : `讀回來還是 ${minus(tcVal(s))}。`],
      };
    },
  });
  const LOGIC = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b };
  const LRULE = { AND: "兩個都是 1 才是 1", OR: "至少一個是 1 就是 1", XOR: "兩個不一樣才是 1", NOT: "0 變 1、1 變 0" };
  add({
    id: "bitwise", ch: 3, name: "AND／OR／XOR／NOT", lesson: "lesson-2.html#ch3-3",
    desc: "每一欄各算各的，不進位。",
    gen(level) {
      const w = level === 1 ? 4 : 8, op = level === 1 ? pick(["AND", "OR", "XOR"]) : pick(["AND", "OR", "XOR", "XOR", "NOT"]);
      const A = randBits(w), B = randBits(w);
      const calc = (o) => o === "NOT" ? inv(A) : A.split("").map((x, i) => LOGIC[o](+x, +B[i])).join("");
      const ans = calc(op);
      const table = op === "NOT"
        ? `<table class="calc"><tr><th>A</th>${A.split("").map(x => `<td>${x}</td>`).join("")}</tr><tr><th>NOT A</th>${ans.split("").map(x => `<td><b>${x}</b></td>`).join("")}</tr></table>`
        : `<table class="calc"><tr><th>A</th>${A.split("").map(x => `<td>${x}</td>`).join("")}</tr><tr><th>B</th>${B.split("").map(x => `<td>${x}</td>`).join("")}</tr><tr><th>${op}</th>${ans.split("").map(x => `<td><b>${x}</b></td>`).join("")}</tr></table>`;
      return {
        prompt: op === "NOT" ? `計算 <b>NOT</b> ${C(A)}。` : `計算 ${C(A)} <b>${op}</b> ${C(B)}。`, kind: "text", mode: "numeric", placeholder: `${w} 個 0 或 1`, answer: ans,
        check(a) {
          a = bitsOnly(a); if (!a) return INVALID("請用 0 和 1 作答。");
          if (a === ans) return OK;
          if (a.length !== w) return BAD(`答案要剛好 ${w} 位，和題目一樣長。`);
          if (op !== "NOT") for (const o of ["AND", "OR", "XOR"]) if (o !== op && a === calc(o)) return BAD(`這是 <b>${o}</b> 的結果。${op} 的規則是：${LRULE[op]}。`);
          const wrong = a.split("").filter((x, i) => x !== ans[i]).length;
          return BAD(`有 ${wrong} 欄算錯。${op} 的規則：${LRULE[op]}。一欄一欄對照著算。`);
        },
        steps: [`${op} 的規則：${LRULE[op]}。每一欄各算各的。`, table + `結果：<b>${ans}</b>`],
      };
    },
  });
  add({
    id: "shift", ch: 3, name: "移位", lesson: "lesson-2.html#ch3-4",
    desc: "左移補 0；邏輯右移補 0；算術右移補最高位元。",
    gen(level) {
      const ops = level === 1 ? ["L", "LR", "AR"] : ["L", "LR", "AR", "AR"];
      const op = pick(ops), k = level === 1 ? 1 : pick([1, 2]), s = randBits(8, op === "L" ? 0.3 : 0.75);
      const doShift = (o, n) => { let x = s; for (let i = 0; i < n; i++) x = o === "L" ? x.slice(1) + "0" : o === "LR" ? "0" + x.slice(0, 7) : x[0] + x.slice(0, 7); return x; };
      const ans = doShift(op, k), NAME = { L: "左移", LR: "邏輯右移", AR: "算術右移" };
      const fillTxt = op === "L" ? "右邊補 0" : op === "LR" ? "左邊補 0" : `左邊補最高位元 <b>${s[0]}</b>`;
      return {
        prompt: `8 位元 ${C(s)} <b>${NAME[op]} ${k} 位</b>，結果的 8 個位元是？`, kind: "text", mode: "numeric", placeholder: "8 個 0 或 1", answer: ans,
        check(a) {
          a = bitsOnly(a); if (!a) return INVALID("請用 0 和 1 作答，寫出 8 個位元。");
          if (a === ans) return OK;
          if (a.length !== 8) return BAD("移位後位元數不變，答案要剛好 8 位：一邊擠出去幾位，另一邊就補幾位。");
          if (op === "AR" && a === doShift("LR", k)) return BAD("這是邏輯右移（補 0）。算術右移要補<b>原本的最高位元</b>，這樣負數才會保持負數。");
          if (op === "LR" && a === doShift("AR", k)) return BAD("這是算術右移。邏輯右移左邊一律補 <b>0</b>。");
          if (op === "L" && (a === doShift("LR", k) || a === doShift("AR", k))) return BAD("方向反了：左移是整串往<b>左</b>推，右邊補 0。");
          if (op !== "L" && a === doShift("L", k)) return BAD("方向反了：右移是整串往<b>右</b>推，最右邊的位元被擠掉。");
          if (a === doShift(op, k === 1 ? 2 : 1)) return BAD(`移的格數不對，要移 ${k} 位。`);
          return BAD(`${NAME[op]}：整串往${op === "L" ? "左" : "右"}推 ${k} 格，${fillTxt}。`);
        },
        steps: [`${NAME[op]} ${k} 位：整串往${op === "L" ? "左" : "右"}推 ${k} 格，${op === "L" ? "最左邊" : "最右邊"}的 ${k} 位被擠掉，${fillTxt}。`, `${C(s)} → <b>${ans}</b>`,
          op === "L" ? `無號數：${uv(s)} → ${uv(ans)}${uv(s) * 2 ** k === uv(ans) ? `（剛好 ×${2 ** k}）` : "（有 1 被擠掉，所以不是剛好乘）"}` : op === "LR" ? `無號數：${uv(s)} → ${uv(ans)}（÷${2 ** k} 捨去餘數）` : `有號數：${minus(tcVal(s))} → ${minus(tcVal(ans))}（÷${2 ** k} 往下取整）`],
      };
    },
  });

  /* ---------- 第 4 章 ---------- */
  // 產生可以用少數位元精確表示的小數，回傳 {v, num, f}：v = num / 2^f
  function niceReal(level, allowNeg) {
    let num, f;
    if (Math.random() < 0.25) { f = pick([1, 2, 3]); num = ri(1, 2 ** f - 1); } // 小於 1
    else { f = level === 1 ? pick([0, 1, 2]) : pick([0, 1, 2, 3]); num = ri(level === 1 ? 2 : 4, level === 1 ? 31 : 127) * 2 ** f + ri(0, 2 ** f - 1); }
    let v = num / 2 ** f; if (v === 0) v = 0.5;
    const neg = allowNeg && Math.random() < 0.5;
    return neg ? -v : v;
  }
  function realToBin(v) { // 正數 → "110.01"
    let ip = Math.floor(v), fp = v - ip, s = ip.toString(2), fs = "";
    while (fp > 0 && fs.length < 30) { fp *= 2; if (fp >= 1) { fs += "1"; fp -= 1; } else fs += "0"; }
    return fs ? `${s}.${fs}` : s;
  }
  function normInfo(v) { // |v| 的正規化：{e, m（1. 後面，去尾 0）, bin}
    const a = Math.abs(v), b = realToBin(a), e = Math.floor(Math.log2(a));
    const digits = b.replace(".", "").replace(/^0+/, ""), m = digits.slice(1).replace(/0+$/, "");
    return { e, m, bin: b };
  }
  const f32 = (() => { const dv = new DataView(new ArrayBuffer(4)); return { bits(x) { dv.setFloat32(0, x); return dv.getUint32(0).toString(2).padStart(32, "0"); }, val(b) { dv.setUint32(0, parseInt(b, 2)); return dv.getFloat32(0); } }; })();
  const bitsToHex = (b) => parseInt(b, 2).toString(16).toUpperCase().padStart(8, "0");
  const decParse = (s) => { s = clean(s).replace(/^[−－–]/, "-"); return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null; };
  const fmtReal = (v) => (v < 0 ? "−" : "") + String(Math.abs(v));
  add({
    id: "bias", ch: 4, name: "偏移表示法", lesson: "lesson-2.html#ch4-3",
    desc: "存的值 ＝ 實際值 ＋ 偏移量；讀回來再減掉。",
    gen(level) {
      const n = level === 1 ? 4 : 8, K = level === 1 ? 8 : 127, type = pick(["enc", "dec"]);
      const e = level === 1 ? ri(-8, 7) : ri(-20, 20), stored = e + K, s = bin(stored, n);
      const label = level === 1 ? "excess-8（4 位元，偏移量 8）" : "偏移量 127 的 8 位元（IEEE 754 單精度的指數）";
      if (type === "enc") return {
        prompt: `用${label}表示 ${C(minus(e))}，要存成哪些位元？`, kind: "text", mode: "numeric", placeholder: `${n} 個 0 或 1`, answer: s,
        check(a) {
          a = bitsOnly(a); if (!a) return INVALID("請用 0 和 1 作答。");
          if (a === s) return OK;
          if (a.length !== n) return BAD(`答案要剛好 ${n} 位。`);
          if (e >= 0 && a === bin(e, n)) return BAD(`忘了加偏移量：要存 ${e} ＋ ${K} ＝ ${stored}。`);
          if (e < 0 && a === tcBits(e, n)) return BAD(`這是 2 補數。偏移表示法是先<b>加上 ${K}</b>，再用無號數存。`);
          if (K - e >= 0 && K - e < 2 ** n && a === bin(K - e, n)) return BAD(`方向反了：是「實際值 ＋ 偏移量」＝ ${minus(e)} ＋ ${K}。`);
          return BAD(`${minus(e)} ＋ ${K} ＝ ${stored}，再把 ${stored} 寫成 ${n} 位元二進位。`);
        },
        steps: [`存的值 ＝ 實際值 ＋ 偏移量 ＝ ${minus(e)} ＋ ${K} ＝ ${stored}`, `${stored} 寫成 ${n} 位元：<b>${s}</b>`],
      };
      return {
        prompt: `用${label}存的位元 ${C(s)}，代表實際的值是多少？`, kind: "text", mode: "text", placeholder: "十進位整數，可以是負數", answer: minus(e),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數，負數前面加 -。");
          if (x === e) return OK;
          if (x === stored) return BAD(`這是位元的無號數值。還要<b>減掉偏移量 ${K}</b>：${stored} − ${K}。`);
          if (x === K - stored) return BAD(`方向反了：是「存的值 − 偏移量」＝ ${stored} − ${K}。`);
          if (x === tcVal(s)) return BAD(`這是 2 補數的讀法。偏移表示法要先當無號數讀出 ${stored}，再減 ${K}。`);
          return BAD(`先當無號數讀出 ${stored}，再減掉 ${K}。`);
        },
        steps: [`${C(s)} 當無號數 ＝ ${stored}`, `實際值 ＝ ${stored} − ${K} ＝ <b>${minus(e)}</b>`],
      };
    },
  });
  add({
    id: "normalize", ch: 4, name: "正規化（1.xxx × 2ᵉ）", lesson: "lesson-2.html#ch4-2",
    desc: "小數點移到最左邊的 1 後面；往左移幾格 e 就是正幾。",
    gen(level) {
      const v = Math.abs(niceReal(level, false)), N = normInfo(v), ask = level === 1 ? "e" : pick(["e", "m"]);
      const mShow = N.m || "0";
      const steps = [`${fmtReal(v)} 轉成二進位：${C(N.bin)}`, `小數點移到最左邊的 1 後面：<b>1.${mShow} × 2<sup>${N.e}</sup></b>（${N.e >= 0 ? `往左移 ${N.e} 格` : `往右移 ${-N.e} 格`}）`];
      if (ask === "e") return {
        prompt: `把 ${C(fmtReal(v))} 寫成二進位的 1.xxx × 2<sup>e</sup>，<b>e</b> 是多少？`, kind: "text", mode: "text", placeholder: "整數，可以是負數", answer: minus(N.e),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數，負數前面加 -。");
          if (x === N.e) return OK;
          if (x === N.e + 127) return BAD("這是加了偏移量 127 之後的 E。題目問的是正規化的實際指數 e。");
          if (x === -N.e) return BAD("方向反了：小數點往<b>左</b>移，e 是正的；往<b>右</b>移，e 是負的。");
          if (x === N.e + 1 || x === N.e - 1) return BAD("差了 1。數的是「小數點移了幾格」，移到最左邊那個 1 的<b>後面</b>。");
          return BAD("先把數轉成二進位，再數小數點要移幾格才會停在最左邊的 1 後面。");
        },
        steps: [...steps, `e ＝ <b>${N.e}</b>`],
      };
      return {
        prompt: `把 ${C(fmtReal(v))} 寫成二進位的 1.xxx × 2<sup>e</sup>，「1.」後面的 <b>xxx</b> 是什麼？（尾數，最後面的 0 可以省略）`, kind: "text", mode: "numeric", placeholder: "0 和 1", answer: mShow,
        check(a) {
          let t = clean(a);
          if (/^1\.[01]*$/.test(t)) return (t.slice(2).replace(/0+$/, "") || "0") === mShow ? BAD("只要寫「1.」<b>後面</b>的部分，前面的 1 不用寫（它就是隱藏位元）。") : BAD("只要寫「1.」後面的部分，而且數字也不對，先重新轉二進位。");
          t = t.replace(/^\./, "");
          if (!/^[01]+$/.test(t)) return INVALID("請用 0 和 1 作答。");
          const r = t.replace(/0+$/, "") || "0";
          if (r === mShow) return OK;
          if (("1" + mShow).replace(/0+$/, "") === r) return BAD("把小數點前的 1 也寫進去了。只要寫「1.」<b>後面</b>的部分。");
          return BAD("先轉二進位，把最左邊那個 1 後面的所有位元依序寫下來。");
        },
        steps: [...steps, `尾數 ＝ <b>${mShow}</b>`],
      };
    },
  });
  function fpSteps(v) {
    const b = f32.bits(v), S = b[0], E = b.slice(1, 9), M = b.slice(9), N = normInfo(v);
    return [`符號：${v < 0 ? "負" : "正"}數，S ＝ <b>${S}</b>`, `${fmtReal(Math.abs(v))} 轉二進位：${C(N.bin)}`, `正規化：1.${N.m || "0"} × 2<sup>${N.e}</sup>`,
      `指數 E ＝ ${N.e} ＋ 127 ＝ ${N.e + 127} ＝ <b>${E}</b>`, `尾數 M：「1.」後面的 ${N.m || "0"}，右邊補 0 到 23 位 ＝ <b>${M}</b>`,
      `組合：${C(`${S} ${E} ${M}`)}，4 位一組換成十六進位：<b>${bitsToHex(b)}</b>`];
  }
  add({
    id: "fpEncode", ch: 4, name: "十進位 → IEEE 754", lesson: "lesson-2.html#ch4-4",
    desc: "符號 → 二進位 → 正規化 → 指數加 127 → 尾數補到 23 位。",
    gen(level) {
      const v = niceReal(level, true), b = f32.bits(v), ans = bitsToHex(b), N = normInfo(v);
      return {
        prompt: `把 ${C(fmtReal(v))} 用 IEEE 754 單精度表示。寫成 <b>8 位十六進位</b>（也可以寫 32 個位元）。`, kind: "text", mode: "text", placeholder: "例如 C0C80000", answer: ans,
        check(a) {
          a = clean(a).replace(/^0X/, "");
          let ub;
          if (/^[01]{32}$/.test(a)) ub = a; else if (/^[0-9A-F]{8}$/.test(a)) ub = parseInt(a, 16).toString(2).padStart(32, "0");
          else return INVALID("請寫 8 位十六進位（例如 C0C80000），或 32 個 0／1。");
          if (ub === b) return OK;
          const S = ub[0], E = ub.slice(1, 9), M = ub.slice(9), rs = b[0], rE = b.slice(1, 9), rM = b.slice(9);
          if (E === rE && M === rM && S !== rs) return BAD("只有符號位元錯了：正數 S ＝ 0，負數 S ＝ 1。");
          if (S === rs && M === rM && N.e >= 0 && E === bin(N.e, 8)) return BAD(`指數忘了加偏移量 127：E ＝ ${N.e} ＋ 127 ＝ ${N.e + 127}。`);
          if (S === rs && M === rM && Math.abs(parseInt(E, 2) - parseInt(rE, 2)) === 1) return BAD("指數差了 1。重新數一次正規化時小數點移了幾格。");
          if (S === rs && E === rE && M === ("1" + (N.m || "")).padEnd(23, "0").slice(0, 23)) return BAD("尾數把「1.」前面的 1 也存進去了。那個 1 是隱藏位元，<b>不存</b>。");
          const bad = [S !== rs && "符號", E !== rE && "指數", M !== rM && "尾數"].filter(Boolean);
          return BAD(`${bad.join("、")}這${bad.length > 1 ? "幾" : "一"}段不對。照步驟一段一段檢查。`);
        },
        steps: fpSteps(v),
      };
    },
  });
  add({
    id: "fpDecode", ch: 4, name: "IEEE 754 → 十進位", lesson: "lesson-2.html#ch4-4",
    desc: "拆出 S、E、M → e ＝ E − 127 → 補回 1. → 轉十進位。",
    gen(level) {
      const v = niceReal(level, true), b = f32.bits(v), hx = bitsToHex(b), S = b[0], E = b.slice(1, 9), M = b.slice(9), N = normInfo(v), e = parseInt(E, 2) - 127;
      const noHidden = (v < 0 ? -1 : 1) * parseInt(M, 2) / 2 ** 23 * 2 ** e;
      return {
        prompt: `IEEE 754 單精度 ${C(hx)} 代表哪個十進位數？`, kind: "text", mode: "decimal", placeholder: "例如 -6.25", answer: fmtReal(v),
        check(a) {
          const x = decParse(a); if (x === null) return INVALID("請輸入十進位數，例如 -6.25。");
          if (x === v) return OK;
          if (x === -v) return BAD(`正負號錯了：S ＝ ${S}，${S === "1" ? "是負數" : "是正數"}。`);
          if (Math.abs(x) === Math.abs(noHidden)) return BAD("忘了在尾數前面補回隱藏的「1.」。");
          if (Math.abs(x) === Math.abs(v) * 2 || Math.abs(x) === Math.abs(v) / 2) return BAD("差了 2 倍，指數差了 1。實際指數 ＝ E − 127。");
          return BAD("先把十六進位展開成 32 個位元，切成 1／8／23 三段，再照公式算。");
        },
        steps: [`展開：${C(`${b.slice(0, 1)} ${E} ${M}`)}`, `S ＝ ${S}（${S === "1" ? "負" : "正"}）；E ＝ ${E} ＝ ${parseInt(E, 2)}，實際指數 ${parseInt(E, 2)} − 127 ＝ ${e}`,
          `補回隱藏位元：1.${N.m || "0"} × 2<sup>${e}</sup> ＝ ${C(N.bin)}`, `轉十進位，加上正負號：<b>${fmtReal(v)}</b>`],
      };
    },
  });

  /* ---------- 第 5 章 ---------- */
  add({
    id: "units", ch: 5, name: "容量單位", lesson: "lesson-2.html#ch5-1",
    desc: "1 B ＝ 8 b；KB ＝ 1000 B，KiB ＝ 1024 B。",
    gen(level) {
      const t = level === 1 ? pick(["kib", "kb", "b2bit", "bit2b"]) : pick(["kib", "kb", "mib", "b2bit", "bit2b", "mbps"]);
      const n = ri(2, 16);
      const Q = {
        kib: [`${n} KiB 是幾個位元組（B）？`, n * 1024, [[n * 1000, "這是 KB（1000 倍）。KiB 是 <b>1024</b> 倍。"]], [`1 KiB ＝ 2<sup>10</sup> ＝ 1024 B`, `${n} × 1024 ＝ <b>${n * 1024}</b>`]],
        kb: [`${n} KB 是幾個位元組（B）？（KB 是十進位的 1000 倍）`, n * 1000, [[n * 1024, "這是 KiB（1024 倍）。KB 是 <b>1000</b> 倍。"]], [`1 KB ＝ 1000 B`, `${n} × 1000 ＝ <b>${n * 1000}</b>`]],
        mib: [`${n} MiB 是幾個 KiB？`, n * 1024, [[n * 1000, "MiB 和 KiB 之間是 <b>1024</b> 倍。"], [n * 1024 * 1024, "題目問的是 KiB，不是位元組。"]], [`1 MiB ＝ 1024 KiB`, `${n} × 1024 ＝ <b>${n * 1024}</b>`]],
        b2bit: [`${n} 個位元組（B）是幾個位元（b）？`, n * 8, [[n / 8, "方向反了：1 個位元組有 8 個位元，所以要<b>乘</b> 8。"]], [`1 B ＝ 8 b`, `${n} × 8 ＝ <b>${n * 8}</b>`]],
        bit2b: [`${n * 8} 個位元（b）是幾個位元組（B）？`, n, [[n * 64, "方向反了：8 個位元才是 1 個位元組，所以要<b>除以</b> 8。"]], [`8 b ＝ 1 B`, `${n * 8} ÷ 8 ＝ <b>${n}</b>`]],
        mbps: [`網路速度 ${n * 8} Mbps（每秒百萬位元），每秒最多傳幾 MB（百萬位元組）？`, n, [[n * 64, "b 是位元、B 是位元組。位元換成位元組要<b>除以</b> 8。"], [n * 8, "Mbps 的 b 是<b>位元</b>，要除以 8 才是位元組。"]], [`小寫 b 是位元，大寫 B 是位元組；8 b ＝ 1 B`, `${n * 8} ÷ 8 ＝ <b>${n}</b> MB／秒`]],
      }[t];
      const [prompt, ans, traps, steps] = Q;
      return {
        prompt, kind: "text", mode: "numeric", placeholder: "數字", answer: String(ans),
        check(a) {
          const x = decParse(a); if (x === null) return INVALID("請輸入數字。");
          if (x === ans) return OK;
          for (const [v, d] of traps) if (x === v) return BAD(d);
          return BAD("先確定是乘還是除，以及倍數是 8、1000 還是 1024。");
        },
        steps,
      };
    },
  });
  add({
    id: "ascii", ch: 5, name: "ASCII 編碼", lesson: "lesson-2.html#ch5-2",
    desc: "記住 'A' ＝ 65、'a' ＝ 97、'0' ＝ 48，其他用推的。",
    gen(level) {
      const kind = pick(["upper", "lower", "digit"]), t = level === 1 ? pick(["c2d", "c2d", "d2c"]) : pick(["c2d", "c2h", "d2c"]);
      const off = kind === "digit" ? ri(1, 9) : ri(1, 25), base = { upper: 65, lower: 97, digit: 48 }[kind], code = base + off, ch = String.fromCharCode(code);
      const hint = `（已知 'A' ＝ 65、'a' ＝ 97、'0' ＝ 48）`;
      const why = kind === "digit" ? `'0' 是 48，'${ch}' 是 48 ＋ ${off} ＝ ${code}` : `'${kind === "upper" ? "A" : "a"}' 是 ${base}，'${ch}' 往後數 ${off} 個 ＝ ${base} ＋ ${off} ＝ ${code}`;
      if (t === "d2c") return {
        prompt: `ASCII 碼 ${C(code)} 是哪個字元？${hint}`, kind: "text", mode: "text", placeholder: "一個字元", answer: ch,
        check(a) {
          a = String(a).trim().replace(/^['"「]|['"」]$/g, "");
          if (a.length !== 1) return INVALID("請輸入一個字元。");
          if (a === ch) return OK;
          if (a.toLowerCase() === ch.toLowerCase()) return BAD(`大小寫錯了：65～90 是大寫，97～122 是小寫。`);
          const got = a.charCodeAt(0);
          if (Math.abs(got - code) === 1) return BAD("差了一個字母：'A' 本身就是 65，B 才是 66。");
          return BAD(`先判斷是大寫、小寫還是數字，再從起點往後數。`);
        },
        steps: [kind === "digit" ? `48～57 是數字字元。` : kind === "upper" ? `65～90 是大寫字母。` : `97～122 是小寫字母。`, `${why}，所以是 <b>'${ch}'</b>`],
      };
      const hexMode = t === "c2h", ans = hexMode ? hex(code) : String(code);
      return {
        prompt: `字元 ${C(`'${ch}'`)} 的 ASCII 碼是多少？請寫${hexMode ? "<b>十六進位</b>" : "十進位"}。${hint}`, kind: "text", mode: hexMode ? "text" : "numeric", placeholder: hexMode ? "十六進位，例如 41" : "十進位數字", answer: ans,
        check(a) {
          a = clean(a).replace(/^0X/, "");
          if (hexMode ? !/^[0-9A-F]+$/.test(a) : !/^\d+$/.test(a)) return INVALID(hexMode ? "請用十六進位作答（0～9、A～F）。" : "請輸入十進位整數。");
          const x = hexMode ? parseInt(a, 16) : Number(a);
          if (x === code) return OK;
          if (hexMode && a === String(code)) return BAD(`${code} 是十進位。題目要十六進位：${code} ÷ 16 取餘。`);
          if (Math.abs(x - code) === 32) return BAD("差了 32：這是另一種大小寫的編碼。大寫從 65 開始，小寫從 97 開始。");
          if (Math.abs(x - code) === 1) return BAD("差了 1：起點的字母本身就是 65（或 97、48），往後數幾個就加幾。");
          if (kind === "digit" && x === off) return BAD(`字元 '${ch}' 不等於數字 ${off}。字元 '0' 存的是 48，所以要加 48。`);
          return BAD(`從起點往後數。`);
        },
        steps: hexMode ? [why, `${code} 轉十六進位：${code} ＝ ${Math.floor(code / 16)} × 16 ＋ ${code % 16} → <b>${ans}</b>`] : [why],
      };
    },
  });
  const ZH = "資料位元組電腦計算機概論二進位編碼文字圖片聲音浮點數記憶體網路程式中台灣學".split("");
  const EN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
  add({
    id: "utf8", ch: 5, name: "UTF-8 位元組數", lesson: "lesson-2.html#ch5-2",
    desc: "英文、數字 1 個位元組，中文 3 個，表情符號 4 個。",
    gen(level) {
      const parts = []; const nz = ri(1, level === 1 ? 3 : 4), ne = ri(1, level === 1 ? 4 : 5);
      for (let i = 0; i < nz; i++) parts.push(pick(ZH));
      for (let i = 0; i < ne; i++) parts.push(pick(EN));
      if (Math.random() < 0.4) parts.push(" ");
      if (level === 2 && Math.random() < 0.4) parts.push(pick(["😀", "👍", "🎧"]));
      const str = shuffle(parts).join("").replace(/^ | $/g, "") || "A中";
      const chars = Array.from(str), sizes = chars.map(c => new TextEncoder().encode(c).length), total = sizes.reduce((x, y) => x + y, 0);
      const big5ish = chars.reduce((s, c) => s + (c.codePointAt(0) < 128 ? 1 : 2), 0);
      return {
        prompt: `字串 ${C(`「${str}」`)} 用 UTF-8 存，需要幾個位元組？（引號不算）`, kind: "text", mode: "numeric", placeholder: "位元組數", answer: String(total),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
          if (x === total) return OK;
          if (x === chars.length) return BAD("這是字元數。UTF-8 的中文字每個要 <b>3</b> 個位元組。");
          if (x === big5ish) return BAD("中文字算成 2 個位元組了（那是 Big5）。UTF-8 的中文字是 <b>3</b> 個位元組。");
          if (x === chars.length * 3) return BAD("英文、數字和空白在 UTF-8 只要 <b>1</b> 個位元組。");
          return BAD("一個字一個字數：英文、數字、空白 1 個，中文 3 個，表情符號 4 個。");
        },
        steps: [chars.map((c, i) => `${c === " " ? "空白" : c}＝${sizes[i]}`).join("、"), `合計 <b>${total}</b> 個位元組`],
      };
    },
  });
  add({
    id: "hexColor", ch: 5, name: "RGB 與顏色碼", lesson: "lesson-2.html#ch5-3",
    desc: "#RRGGBB：兩位十六進位一組，依序是紅、綠、藍。",
    gen(level) {
      const ch = () => level === 1 ? pick([0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255, 128]) : ri(0, 255);
      const rgb = [ch(), ch(), ch()], h2 = (n) => hex(n).padStart(2, "0"), code = "#" + rgb.map(h2).join(""), t = pick(["toHex", "toRgb"]);
      const conv = rgb.map((n, i) => `${"RGB"[i]} ${n} ＝ ${Math.floor(n / 16)} × 16 ＋ ${n % 16} → ${h2(n)}`);
      if (t === "toHex") return {
        prompt: `R ＝ ${rgb[0]}、G ＝ ${rgb[1]}、B ＝ ${rgb[2]} 的顏色碼是什麼？`, kind: "text", mode: "text", placeholder: "例如 #FF8800", answer: code,
        check(a) {
          a = clean(a).replace(/^#/, ""); if (!/^[0-9A-F]{6}$/.test(a)) return INVALID("請寫 6 位十六進位，例如 #FF8800。");
          if ("#" + a === code) return OK;
          const g = [a.slice(0, 2), a.slice(2, 4), a.slice(4, 6)];
          if (g[0] === h2(rgb[2]) && g[2] === h2(rgb[0])) return BAD("順序反了：顏色碼依序是 <b>R、G、B</b>。");
          const bad = g.map((x, i) => x !== h2(rgb[i]) ? "RGB"[i] : null).filter(Boolean);
          if (bad.some(c => { const i = "RGB".indexOf(c); return g[i] === rev(h2(rgb[i])); })) return BAD("有一組的兩個數字順序反了：十位數（÷16 的商）寫在前面，餘數寫在後面。");
          return BAD(`${bad.join("、")} 這${bad.length > 1 ? "幾" : ""}組換算錯了。每個 0～255 的數換成兩位十六進位。`);
        },
        steps: [...conv, `合起來：<b>${code}</b>`],
      };
      return {
        prompt: `顏色碼 ${C(code)} 的 R、G、B 各是多少？（用逗號隔開，例如 255, 136, 0）`, kind: "text", mode: "text", placeholder: "R, G, B", answer: rgb.join(", "),
        check(a) {
          const m = String(a).match(/\d+/g); if (!m || m.length !== 3) return INVALID("請輸入三個十進位數，用逗號隔開。");
          const x = m.map(Number);
          if (x.every((v, i) => v === rgb[i])) return OK;
          if (x[0] === rgb[2] && x[2] === rgb[0] && x[1] === rgb[1]) return BAD("順序反了：顏色碼依序是 <b>R、G、B</b>。");
          const bad = x.map((v, i) => v !== rgb[i] ? "RGB"[i] : null).filter(Boolean);
          if (x.some((v, i) => v !== rgb[i] && v === parseInt(rev(h2(rgb[i])), 16))) return BAD("有一組讀反了：兩位十六進位的<b>左邊</b>那位要乘 16。");
          return BAD(`${bad.join("、")} 換算錯了。左邊那位 × 16 ＋ 右邊那位。`);
        },
        steps: [...rgb.map((n, i) => `${"RGB"[i]}：${h2(n)} ＝ ${Math.floor(n / 16)} × 16 ＋ ${n % 16} ＝ <b>${n}</b>`)],
      };
    },
  });
  add({
    id: "mediaSize", ch: 5, name: "圖片與聲音的大小", lesson: "lesson-2.html#ch5-4",
    desc: "圖片：寬 × 高 × 深度 ÷ 8；聲音：頻率 × 深度 × 聲道 × 秒 ÷ 8。",
    gen() {
      if (Math.random() < 0.5) {
        const [w, h] = pick([[320, 240], [640, 480], [800, 600], [1024, 768], [100, 100], [200, 150], [1280, 720]]), d = pick([1, 8, 24]);
        const bits = w * h * d, ans = bits / 8;
        return {
          prompt: `一張 ${w} × ${h} 像素、色彩深度 ${d} 位元的圖片，不壓縮需要幾個<b>位元組</b>？`, kind: "text", mode: "numeric", placeholder: "位元組數（可加逗號）", answer: ans.toLocaleString("en-US"),
          check(a) {
            const x = intParse(a); if (x === null) return INVALID("請輸入整數，可以用逗號分隔。");
            if (x === ans) return OK;
            if (x === bits) return BAD("這是<b>位元</b>數。題目問位元組，要再除以 8。");
            if (x === w * h) return BAD("這是像素數。還要乘上色彩深度、再除以 8。");
            return BAD("寬 × 高 × 色彩深度（位元）÷ 8。");
          },
          steps: [`寬 × 高 × 色彩深度 ＝ ${w} × ${h} × ${d} ＝ ${bits.toLocaleString("en-US")} 位元`, `÷ 8 ＝ <b>${ans.toLocaleString("en-US")}</b> 位元組`],
        };
      }
      const r = pick([8000, 11025, 22050, 44100]), d = pick([8, 16]), c = pick([1, 2]), s = pick([1, 2, 5, 10]);
      const bits = r * d * c * s, ans = bits / 8;
      return {
        prompt: `取樣頻率 ${r.toLocaleString("en-US")} Hz、${d} 位元、${c === 1 ? "單聲道" : "立體聲（2 聲道）"}的聲音錄 ${s} 秒，不壓縮需要幾個<b>位元組</b>？`, kind: "text", mode: "numeric", placeholder: "位元組數（可加逗號）", answer: ans.toLocaleString("en-US"),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數，可以用逗號分隔。");
          if (x === ans) return OK;
          if (x === bits) return BAD("這是<b>位元</b>數。題目問位元組，要再除以 8。");
          if (c === 2 && x === ans / 2) return BAD("忘了乘聲道數：立體聲是 2 個聲道。");
          if (x === r * d * c / 8) return BAD(`這是 1 秒的大小，還要乘 ${s} 秒。`);
          return BAD("取樣頻率 × 位元深度 × 聲道數 × 秒數 ÷ 8。");
        },
        steps: [`${r} × ${d} × ${c} × ${s} ＝ ${bits.toLocaleString("en-US")} 位元`, `÷ 8 ＝ <b>${ans.toLocaleString("en-US")}</b> 位元組`],
      };
    },
  });

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
    { q: "8 位元的 11111111，當作無號數和有號數（2 補數）各是多少？", a: "255 和 −1", o: ["255 和 −127", "−1 和 255", "127 和 −128"], why: "無號數：全部位權相加 = 255。有號數：−128 + 127 = −1。" },
    { q: "把有號數從 4 位元擴充成 8 位元，左邊要補什麼？", a: "原本的最高位元", o: ["一律補 0", "一律補 1", "右邊補 0"], why: "這叫符號延伸：正數補 0、負數補 1，值才不會變。" },
    { q: "想把一個位元組的「右邊 4 位」保留、左邊 4 位清成 0，要用哪個運算？", a: "AND 00001111", o: ["OR 00001111", "XOR 00001111", "AND 11110000"], why: "AND 1 保留原值、AND 0 變成 0。" },
    { q: "無號數左移 1 位（沒有 1 被擠掉），值會怎麼變？", a: "變成 2 倍", o: ["變成一半", "加 1", "不變"], why: "二進位往左移一位，每一位的位權都變成兩倍。" },
    { q: "有號數（2 補數）要除以 2，應該用哪一種右移？", a: "算術右移", o: ["邏輯右移", "左移"], why: "算術右移左邊補最高位元，負數才會保持負數。" },
    { q: "IEEE 754 單精度浮點數的三個欄位，各有幾個位元？", a: "符號 1、指數 8、尾數 23", o: ["符號 1、指數 7、尾數 24", "符號 1、指數 11、尾數 52", "符號 2、指數 8、尾數 22"], why: "32 = 1 + 8 + 23。1、11、52 是 64 位元的倍精度。" },
    { q: "IEEE 754 單精度的指數用什麼方法存？", a: "偏移表示法，偏移量 127", o: ["2 補數", "符號大小表示法", "偏移表示法，偏移量 128"], why: "存的值 = 實際指數 + 127。" },
    { q: "為什麼 IEEE 754 的尾數不用存「1.」前面的 1？", a: "正規化後它一定是 1", o: ["它一定是 0", "為了表示負數", "為了讓指數變小"], why: "正規化後小數點前一定是 1，不存可以省下一個位元，叫做隱藏位元。" },
    { q: "為什麼 0.1 + 0.2 在電腦裡不會剛好等於 0.3？", a: "0.1 換成二進位是無限循環小數，只能存近似值", o: ["電腦的加法電路有錯", "因為用了 2 補數", "因為位元組不夠 8 個位元"], why: "尾數位數有限，無限循環的小數只能捨入成最接近的值。" },
    { q: "ASCII 的大寫 'A' 和小寫 'a' 相差多少？", a: "32", o: ["26", "1", "64"], why: "'A' = 65、'a' = 97，差 32，剛好只差一個位元。" },
    { q: "UTF-8 中，一個常用中文字通常占幾個位元組？", a: "3 個", o: ["1 個", "2 個", "4 個"], why: "U+0800～FFFF 用 3 個位元組。2 個是 Big5。" },
    { q: "1 KiB 是幾個位元組？", a: "1024", o: ["1000", "8", "1048576"], why: "KiB 是二進位前綴，2¹⁰ = 1024。KB 是 1000。" },
    { q: "24 位元全彩，每個像素的 R、G、B 各用幾個位元？", a: "各 8 個", o: ["各 24 個", "各 3 個", "R 8 個，其他 16 個"], why: "8 + 8 + 8 = 24，每種顏色 0～255。" },
    { q: "聲音的「取樣頻率」是指什麼？", a: "每秒量幾次聲波的高度", o: ["每次量測用幾個位元", "聲音有幾個聲道", "檔案每秒幾個位元組"], why: "每秒量幾次是取樣頻率；每次用幾個位元是位元深度。" },
    { q: "下面哪一種是無失真壓縮？", a: "PNG", o: ["JPEG", "MP3", "MP4"], why: "PNG、ZIP、FLAC 解壓縮後和原本一模一樣；JPEG、MP3、MP4 會丟掉部分細節。" },
    /* 第 6 章 */
    { ch: 6, q: "電腦的五大單元中，負責真正做加減和 AND／OR 運算的是？", a: "算術邏輯單元（ALU）", o: ["控制單元", "記憶單元", "輸入單元"], why: "ALU 負責運算，控制單元負責指揮。兩者合起來就是 CPU。" },
    { ch: 6, q: "CPU 由哪兩個單元組成？", a: "算術邏輯單元與控制單元", o: ["記憶單元與控制單元", "輸入單元與輸出單元", "算術邏輯單元與記憶單元"], why: "CPU ＝ ALU ＋ CU（＋暫存器）。記憶體不算在 CPU 裡。" },
    { ch: 6, q: "半加器用哪兩個邏輯閘做出「和」與「進位」？", a: "XOR 算和，AND 算進位", o: ["AND 算和，OR 算進位", "OR 算和，XOR 算進位", "NOT 算和，AND 算進位"], why: "1＋1 的個位是 0（兩個一樣 → XOR 是 0），進位是 1（兩個都是 1 → AND 是 1）。" },
    { ch: 6, q: "程式計數器（PC）裡放的是什麼？", a: "下一條指令在記憶體的位址", o: ["目前的運算結果", "剛抓進來的那條指令", "時脈的次數"], why: "PC 指著下一條指令的位址；IR 放抓進來的指令；ACC 放運算結果。" },
    { ch: 6, q: "指令週期的三個步驟，正確順序是？", a: "擷取 → 解碼 → 執行", o: ["解碼 → 擷取 → 執行", "執行 → 擷取 → 解碼", "擷取 → 執行 → 解碼"], why: "先從記憶體抓指令（擷取），弄懂它是什麼（解碼），再做（執行）。" },
    { ch: 6, q: "一顆 2 GHz 的 CPU，一個時脈週期是多久？", a: "0.5 奈秒", o: ["2 奈秒", "0.5 秒", "2 毫秒"], why: "週期 ＝ 1 ÷ 頻率 ＝ 1 ÷ (2 × 10⁹) 秒 ＝ 0.5 ns。1 GHz 剛好是 1 ns。" },
    { ch: 6, q: "下面哪一種記憶體斷電後資料會消失（揮發性）？", a: "RAM", o: ["SSD", "硬碟", "ROM"], why: "暫存器、快取、RAM 都是揮發性；SSD、硬碟、ROM 是非揮發性。" },
    { ch: 6, q: "記憶體階層由快到慢的順序是？", a: "暫存器 → 快取 → RAM → SSD", o: ["RAM → 快取 → 暫存器 → SSD", "快取 → 暫存器 → SSD → RAM", "SSD → RAM → 快取 → 暫存器"], why: "愈靠近 CPU 愈快、愈小、愈貴。" },
    { ch: 6, q: "快取（cache）的作用是什麼？", a: "把常用的資料放在離 CPU 更近、更快的地方", o: ["長期保存檔案", "把資料壓縮以節省空間", "提供螢幕顯示用的記憶體"], why: "快取用來緩和 CPU 和 RAM 之間的速度差（馮紐曼瓶頸）。" },
    { ch: 6, q: "32 位元的位址最多能定址多少記憶體？", a: "4 GiB", o: ["32 GiB", "2 GiB", "4 MiB"], why: "2³² ＝ 4,294,967,296 位元組 ＝ 4 GiB。這是舊 32 位元系統的記憶體上限。" },
    { ch: 6, q: "「64 位元電腦」的 64 通常指什麼？", a: "CPU 一次能處理、資料匯流排一次能傳的位元數", o: ["記憶體有 64 GB", "時脈 64 GHz", "有 64 個核心"], why: "位元數指 CPU 一次能處理的資料寬度，也連帶決定位址寬度。" },
    /* 第 7 章 */
    { ch: 7, q: "什麼是演算法？", a: "解決問題的一組有限、明確、可以照做的步驟", o: ["一種程式語言", "電腦的硬體零件", "一串 0 和 1"], why: "演算法是步驟，不限定用哪種語言寫；程式是演算法的某一種實作。" },
    { ch: 7, q: "圖靈機有哪些零件？", a: "磁帶、讀寫頭、狀態、規則表", o: ["CPU、記憶體、硬碟、螢幕", "ALU、控制單元、暫存器", "鍵盤、磁帶、印表機"], why: "圖靈機是想像的機器，只有這四個抽象零件，卻能算所有可計算的東西。" },
    { ch: 7, q: "圖靈機的理論意義是什麼？", a: "精確定義了「可計算」：任何演算法能算的，它都能算", o: ["它是第一台實際做出來的電腦", "它比現代電腦快", "它發明了二進位"], why: "圖靈機從未真的被當成電腦製造，它的價值在於定義計算的極限。" },
    { ch: 7, q: "「停機問題」告訴我們什麼？", a: "有些問題沒有任何演算法能解", o: ["電腦跑太久會當機", "所有程式最後都會停", "電腦只要夠快什麼都能算"], why: "圖靈證明寫不出一個程式能判斷任意程式會不會停。這是邏輯上的限制，不是速度問題。" },
    { ch: 7, q: "馮紐曼模型最核心的想法是？", a: "程式和資料用同樣的形式存在同一塊記憶體（儲存程式概念）", o: ["用十進位運算", "程式寫在硬體線路上", "每個程式用一台專門的電腦"], why: "儲存程式概念讓換程式只要載入不同的 0 和 1，不用改硬體。" },
    { ch: 7, q: "馮紐曼模型的四個子系統是？", a: "記憶體、算術邏輯單元、控制單元、輸入輸出", o: ["鍵盤、螢幕、硬碟、CPU", "磁帶、讀寫頭、狀態、規則表", "快取、RAM、SSD、硬碟"], why: "這就是五大單元的另一種講法（輸入和輸出合在一起）。" },
    { ch: 7, q: "「馮紐曼瓶頸」指的是什麼？", a: "CPU 和記憶體之間只有一條通道，速度受限", o: ["CPU 的核心數不夠", "硬碟容量太小", "程式語言太慢"], why: "指令和資料都要走同一條匯流排，CPU 再快也得等記憶體。快取就是為此而生。" },
    { ch: 7, q: "在儲存程式的電腦出現之前（例如 ENIAC），要換一個計算任務得怎麼做？", a: "重新接線", o: ["重新開機", "換一片磁碟", "下載新程式"], why: "ENIAC 的「程式」是用線路和開關設定的，換任務要人工重接好幾天。" },
    { ch: 7, q: "電腦的第一代到第四代，核心零件的演進順序是？", a: "真空管 → 電晶體 → 積體電路 → 微處理器", o: ["電晶體 → 真空管 → 微處理器 → 積體電路", "積體電路 → 真空管 → 電晶體 → 微處理器", "真空管 → 積體電路 → 電晶體 → 微處理器"], why: "每一代都把同樣的功能做得更小、更省電、更便宜。" },
    { ch: 7, q: "摩爾定律大致是說？", a: "晶片上的電晶體數量約每兩年翻一倍", o: ["電腦價格每年漲一倍", "網路速度每月翻一倍", "程式長度每年減半"], why: "這是對製程進步的觀察，不是物理定律；近年已明顯放慢。" },
    /* 第 8 章 */
    { ch: 8, q: "Internet 和 WWW（全球資訊網）的關係是？", a: "WWW 是跑在 Internet 上的其中一種服務", o: ["兩者是同一個東西", "Internet 是跑在 WWW 上的服務", "WWW 是 Internet 的硬體"], why: "Internet 是網路的網路（基礎建設）；WWW、電子郵件、線上遊戲都是跑在上面的服務。" },
    { ch: 8, q: "封包交換的特點是？", a: "資料切成小塊，各自找路，到了再組回來", o: ["通話期間獨占一條線路", "資料一次整個送過去", "只能在同一棟建築內使用"], why: "獨占線路是電路交換（傳統電話）。封包交換讓線路可以共用、壞一條能繞路。" },
    { ch: 8, q: "路由器（router）的工作是？", a: "看封包的目的地址，決定往哪個方向轉送", o: ["把資料加密", "把網域名稱翻成 IP", "儲存網頁"], why: "路由器在網路層工作，靠 IP 位址為每個封包選路。" },
    { ch: 8, q: "TCP/IP 四層由上到下的順序是？", a: "應用層 → 傳輸層 → 網路層 → 連結層", o: ["網路層 → 傳輸層 → 應用層 → 連結層", "連結層 → 應用層 → 傳輸層 → 網路層", "傳輸層 → 應用層 → 網路層 → 連結層"], why: "應用（HTTP）→ 傳輸（TCP）→ 網路（IP）→ 連結（Wi-Fi）。" },
    { ch: 8, q: "HTTP 屬於哪一層？", a: "應用層", o: ["傳輸層", "網路層", "連結層"], why: "HTTP、HTTPS、DNS、SMTP 都是應用層協定；TCP／UDP 是傳輸層；IP 是網路層。" },
    { ch: 8, q: "TCP 和 UDP 的主要差別是？", a: "TCP 保證封包到齊、順序正確；UDP 不保證但比較快", o: ["TCP 用在區域網路，UDP 用在網際網路", "TCP 是加密的，UDP 不是", "兩者沒有差別"], why: "網頁、檔案用 TCP；視訊通話、遊戲常用 UDP，掉一兩個封包沒關係但不能等。" },
    { ch: 8, q: "IPv4 位址是幾個位元？", a: "32", o: ["8", "64", "128"], why: "4 段 × 8 位元 ＝ 32 位元。IPv6 是 128 位元。" },
    { ch: 8, q: "IP 位址 192.168.1.37 配遮罩 255.255.255.0，網路位址是？", a: "192.168.1.0", o: ["192.168.1.37", "192.168.1.255", "192.168.0.0"], why: "IP AND 遮罩：前三段保留、最後一段清成 0。192.168.1.255 是廣播位址。" },
    { ch: 8, q: "一個 /24 的子網路最多可以給幾台裝置用？", a: "254", o: ["256", "255", "24"], why: "主機部分 8 位元 ＝ 256 個組合，扣掉網路位址（全 0）和廣播位址（全 1）。" },
    { ch: 8, q: "192.168.x.x 這類位址是？", a: "私有位址，只在內部網路使用", o: ["公有位址，全球唯一", "IPv6 位址", "網域名稱"], why: "10.x.x.x、172.16～31.x.x、192.168.x.x 是私有位址，透過 NAT 共用一個公有位址上網。" },
    { ch: 8, q: "DNS 的工作是？", a: "把網域名稱翻譯成 IP 位址", o: ["把封包加密", "分配 Wi-Fi 頻道", "儲存網頁的備份"], why: "人記名字、機器用 IP，DNS 是中間的電話簿。" },
    { ch: 8, q: "HTTPS 比 HTTP 多了什麼？", a: "加密（TLS），中間的人看不到內容", o: ["更高的下載速度", "更多的埠號", "圖片支援"], why: "HTTPS ＝ HTTP ＋ TLS 加密，瀏覽器顯示鎖頭。預設埠號 443（HTTP 是 80）。" },
    { ch: 8, q: "100 Mbps 的網路，理論上每秒最多傳多少位元組？", a: "12.5 MB", o: ["100 MB", "800 MB", "1.25 MB"], why: "Mbps 的 b 是位元。100 × 10⁶ 位元 ÷ 8 ＝ 12.5 × 10⁶ 位元組。" },
    { ch: 8, q: "「延遲」（latency）和「頻寬」（bandwidth）的差別是？", a: "延遲是封包單程要多久，頻寬是每秒能傳多少", o: ["兩者是同一件事", "延遲是每秒能傳多少，頻寬是要多久", "延遲只有有線網路才有"], why: "下載大檔看頻寬（水管粗細）；遊戲、視訊看延遲（水管長度）。" },
    /* 第 9 章 */
    { ch: 9, q: "CPU 能直接執行的是哪一種語言？", a: "機器語言", o: ["組合語言", "高階語言", "虛擬碼"], why: "只有 0 和 1 的機器語言能直接執行；其他都要先翻譯。" },
    { ch: 9, q: "組合語言和機器語言的關係是？", a: "一條組合語言指令對應一條機器指令，只是換成助憶碼", o: ["一行組合語言對應幾十條機器指令", "兩者沒有關係", "組合語言比機器語言更接近人類語言，和 Python 一樣"], why: "組合語言是機器語言的「可讀版」，一對一；高階語言才是一對多。" },
    { ch: 9, q: "編譯器（compiler）做什麼？", a: "把整份原始碼一次翻成機器語言的執行檔", o: ["一邊讀原始碼一邊執行", "檢查網路連線", "把機器語言翻回高階語言"], why: "編譯先翻好再跑（快）；直譯邊讀邊跑（方便）。" },
    { ch: 9, q: "下面哪一個語言通常是直譯執行？", a: "Python", o: ["C", "C++", "Rust"], why: "Python、JavaScript、Ruby 是直譯型；C、C++、Go、Rust 是編譯型。" },
    { ch: 9, q: "程式裡 n = n + 1 的意思是？", a: "把 n 原本的值加 1，放回 n", o: ["n 等於 n 加 1，這在數學上不成立", "宣告一個新變數 n", "比較 n 和 n + 1"], why: "程式裡的 ＝ 是「指派」（把右邊放進左邊），不是數學的等於。" },
    { ch: 9, q: "整數型別的變數為什麼有最大值？", a: "它用固定位元數的 2 補數存，超過就溢位", o: ["程式語言規定的", "記憶體不夠大", "鍵盤打不出更大的數"], why: "32 位元 int 的範圍是 −2³¹～2³¹−1，這正是第 2 章的 2 補數範圍。" },
    { ch: 9, q: "整數運算 17 / 5 的結果是？", a: "3", o: ["3.4", "4", "2"], why: "整數除法捨去小數。餘數 17 % 5 ＝ 2。" },
    { ch: 9, q: "任何程式都可以只用哪三種流程結構寫出來？", a: "順序、選擇、重複", o: ["輸入、處理、輸出", "變數、函式、物件", "編譯、連結、執行"], why: "順序（一行接一行）、選擇（if）、重複（迴圈）。" },
    { ch: 9, q: "while 迴圈最需要小心什麼？", a: "有沒有終止條件，否則變成無窮迴圈", o: ["變數名稱太長", "縮排用空白還是 Tab", "一次只能跑 10 圈"], why: "條件永遠成立的迴圈不會停，程式就卡住了。" },
    { ch: 9, q: "函式的「參數」和「回傳值」分別是？", a: "參數是傳進去的輸入，回傳值是算完給回來的結果", o: ["參數是結果，回傳值是輸入", "兩者都是函式的名字", "參數是變數的型別"], why: "area = circle_area(5)：5 是參數，算出的面積是回傳值。" },
    { ch: 9, q: "在 1,000,000 筆已排序的資料裡用二分搜尋找一筆，最多約比較幾次？", a: "20 次", o: ["1,000,000 次", "500,000 次", "1,000 次"], why: "2²⁰ ≈ 1,048,576 ≥ 1,000,000，所以最多 20 次。線性搜尋最差要 100 萬次。" },
    { ch: 9, q: "HTML 為什麼通常不被算作程式語言？", a: "它只描述內容和結構，沒有流程控制（if、迴圈）", o: ["因為它太簡單", "因為它只能在 Windows 上用", "因為它是編譯型語言"], why: "HTML 是標記語言。網頁的互動邏輯要靠 JavaScript。" },
    /* 第 10 章 */
    { ch: 10, q: "DBMS（資料庫管理系統）是什麼？", a: "負責存取、查詢、保護資料庫的軟體", o: ["一張資料表", "一種程式語言", "電腦的儲存硬體"], why: "MySQL、PostgreSQL、SQLite 都是 DBMS。資料庫是資料本身，DBMS 是管它的軟體。" },
    { ch: 10, q: "「資料」和「資訊」的差別是？", a: "資料是原始事實，資訊是處理後有意義的結果", o: ["兩者是同義詞", "資訊是數字，資料是文字", "資料存在雲端，資訊存在本機"], why: "「85」是資料；「小明數學 85 分，高於平均 7 分」是資訊。" },
    { ch: 10, q: "關聯式資料庫裡，一張資料表的一「列」代表什麼？", a: "一筆紀錄，例如一個學生", o: ["一種性質，例如姓名", "一張表", "一個資料庫"], why: "列 ＝ 紀錄（record）；欄 ＝ 欄位／屬性（field）。" },
    { ch: 10, q: "主鍵（primary key）必須滿足什麼？", a: "每一列的值唯一，而且不能是空的", o: ["必須是數字", "必須是姓名", "可以重複，方便查詢"], why: "主鍵用來唯一辨識每一列，所以不能重複、不能 NULL。" },
    { ch: 10, q: "外來鍵（foreign key）是什麼？", a: "一張表裡存著另一張表主鍵的欄位，用來建立關聯", o: ["從國外匯入的資料", "資料表的密碼", "第二個主鍵"], why: "學生表的「系所代碼」是外來鍵，指向系所表的主鍵。" },
    { ch: 10, q: "一個系有很多學生、每個學生只屬於一個系，這是哪一種關係？", a: "一對多", o: ["一對一", "多對多", "沒有關係"], why: "一對多用外來鍵就能表示；多對多要多一張中間表。" },
    { ch: 10, q: "SQL 裡用來篩選符合條件的「列」的子句是？", a: "WHERE", o: ["SELECT", "FROM", "ORDER BY"], why: "SELECT 選欄、FROM 選表、WHERE 篩列、ORDER BY 排序。" },
    { ch: 10, q: "SELECT COUNT(*) FROM 學生 WHERE 成績 >= 80 會回傳什麼？", a: "成績大於等於 80 的學生有幾人", o: ["所有學生的成績總和", "成績最高的學生姓名", "全部學生的人數"], why: "WHERE 先留下符合的列，COUNT(*) 數剩下幾列。" },
    { ch: 10, q: "UPDATE 或 DELETE 忘了寫 WHERE 會怎樣？", a: "整張表的每一列都會被改掉或刪掉", o: ["會出現錯誤訊息，不會執行", "只會影響第一列", "沒有任何影響"], why: "沒有 WHERE 就是「全部」。這是最常見的資料庫災難之一，所以備份不能省。" },
    { ch: 10, q: "為什麼系所名稱不直接存在學生表，而是另外開一張系所表？", a: "避免重複存同一件事（正規化），改名只要改一處", o: ["因為學生表放不下", "因為系所名稱是數字", "SQL 規定每張表只能有三欄"], why: "重複存會造成不一致（「資管系」vs「資訊管理系」）；正規化把它拆開，用外來鍵連回來。" },
    { ch: 10, q: "交易（transaction）的「原子性」是指？", a: "一組操作要嘛全部完成，要嘛全部沒發生", o: ["每次只能改一個位元", "資料存在很小的空間", "交易要在一秒內完成"], why: "轉帳扣了 A 還沒加 B 時當機，整個交易會被撤銷，錢不會憑空消失。" },
    { ch: 10, q: "ACID 四個字母分別代表？", a: "原子性、一致性、隔離性、持久性", o: ["存取、建立、索引、刪除", "原子性、快取、索引、資料", "可用性、一致性、隔離性、分散性"], why: "Atomicity、Consistency、Isolation、Durability。" },
    { ch: 10, q: "資料庫的「索引」（index）像什麼？", a: "書後面的索引：另外建一份排好順序的對照表，加快查詢", o: ["書的封面", "書的頁數", "書的作者"], why: "有索引就能用二分搜尋，不用整張表從頭掃到尾；代價是占空間、寫入變慢。" },
  ];

  // 每章一個觀念選擇題題型；綜合（ch 99）抽全部。
  const conceptSkill = (ch, name, lesson, desc) => add({
    id: ch === 99 ? "concepts" : "concepts" + ch, ch, name, lesson, desc,
    gen() {
      const pool = ch === 99 ? CONCEPTS : CONCEPTS.filter(c => c.ch === ch);
      const c = pick(pool), choices = shuffle([c.a, ...c.o]);
      return { prompt: c.q, kind: "choice", choices, answer: c.a, check(a) { return a === c.a ? OK : BAD(c.why); }, steps: [c.why] };
    },
  });

  /* ---------- 第 6 章 ---------- */
  add({
    id: "clock", ch: 6, name: "時脈與週期", lesson: "lesson-3.html#ch6-3",
    desc: "週期時間 ＝ 1 ÷ 頻率。1 GHz ＝ 1 ns，2 GHz ＝ 0.5 ns。",
    gen(level) {
      const f = level === 1 ? pick([1, 2, 4, 5, 10]) : pick([1.25, 2.5, 3.2, 0.5, 0.8, 1.6, 0.25]);
      const ns = +(1 / f).toFixed(3);
      if (Math.random() < 0.5) return {
        prompt: `一顆 ${f} GHz 的 CPU，一個時脈週期是多少<b>奈秒</b>（ns）？`, kind: "text", mode: "decimal", placeholder: "奈秒", answer: String(ns),
        check(a) {
          const x = parseFloat(String(a).replace(/[^\d.]/g, "")); if (Number.isNaN(x)) return INVALID("請輸入數字。");
          if (Math.abs(x - ns) < 1e-6) return OK;
          if (Math.abs(x - f) < 1e-6) return BAD("這是頻率本身。週期是頻率的<b>倒數</b>：1 ÷ 頻率。");
          if (Math.abs(x - ns * 1000) < 1e-3) return BAD("差 1000 倍：1 GHz 的週期是 1 ns，不是 1 ps 也不是 1 µs。");
          return BAD(`1 GHz ＝ 每秒 10<sup>9</sup> 次，週期 1 ns。${f} GHz 就是 1 ÷ ${f} ns。`);
        },
        steps: [`${f} GHz ＝ 每秒 ${f} × 10<sup>9</sup> 次。`, `週期 ＝ 1 ÷ (${f} × 10<sup>9</sup>) 秒 ＝ ${ns} × 10<sup>−9</sup> 秒 ＝ <b>${ns} ns</b>`],
      };
      const cycles = f * 1e9;
      return {
        prompt: `一顆 ${f} GHz 的 CPU，每秒打幾拍（幾個時脈週期）？用<b>科學記號</b>作答，例如 2.5e9。`, kind: "text", mode: "text", placeholder: "例如 2.5e9", answer: `${f}e9`,
        check(a) {
          const x = parseFloat(String(a).replace(/[×x]\s*10\^?/i, "e").replace(/\s|,/g, "")); if (Number.isNaN(x)) return INVALID("請用數字作答，例如 2.5e9 或 2500000000。");
          if (Math.abs(x - cycles) / cycles < 1e-6) return OK;
          if (Math.abs(x - f * 1e6) / (f * 1e6) < 1e-6) return BAD("這是 MHz 的量級。G ＝ 10<sup>9</sup>，M ＝ 10<sup>6</sup>。");
          return BAD(`G（giga）＝ 10<sup>9</sup>。${f} GHz ＝ ${f} × 10<sup>9</sup> 次／秒。`);
        },
        steps: [`G ＝ 10<sup>9</sup>（十億）。`, `${f} GHz ＝ <b>${f} × 10<sup>9</sup></b> 次／秒 ＝ ${cycles.toLocaleString("en-US")}`],
      };
    },
  });
  const OPS6 = ["HLT", "LOAD", "ADD", "SUB", "STORE", "JMP", "JZ", "OUT"];
  add({
    id: "decode", ch: 6, name: "指令解碼", lesson: "lesson-3.html#ch6-4",
    desc: "8 位元指令：前 4 位是操作碼，後 4 位是位址。",
    gen() {
      const op = ri(1, 6), a = ri(0, 15), code = bin(op, 4) + bin(a, 4);
      const t = Math.random() < 0.5 ? "name" : "addr";
      const table = `<table class="calc"><tr><th>操作碼</th>${OPS6.map((_, i) => `<td>${bin(i, 4)}</td>`).join("")}</tr><tr><th>助憶碼</th>${OPS6.map(o => `<td>${o}</td>`).join("")}</tr></table>`;
      if (t === "name") return {
        prompt: `迷你電腦收到指令 ${C(code.slice(0, 4) + " " + code.slice(4))}。它是哪一種指令？`, kind: "choice", choices: shuffle([OPS6[op], ...shuffle(OPS6.filter((_, i) => i !== op && i !== 0)).slice(0, 3)]), answer: OPS6[op],
        check(x) { if (x === OPS6[op]) return OK; if (x === OPS6[a] && a < 8) return BAD("你查的是<b>後</b> 4 位。操作碼在<b>前</b> 4 位。"); return BAD(`前 4 位 ${C(code.slice(0, 4))} ＝ ${op}，查表是 ${OPS6[op]}。`); },
        steps: [`把指令切成兩半：前 4 位 ${C(code.slice(0, 4))} 是操作碼，後 4 位 ${C(code.slice(4))} 是位址。`, table, `${C(code.slice(0, 4))} ＝ ${op} → <b>${OPS6[op]}</b>${op !== 7 ? `，位址 ${a}` : ""}`],
      };
      return {
        prompt: `迷你電腦收到指令 ${C(code.slice(0, 4) + " " + code.slice(4))}。它操作的記憶體<b>位址</b>是多少（十進位）？`, kind: "text", mode: "numeric", placeholder: "位址", answer: String(a),
        check(x) {
          const v = intParse(x); if (v === null) return INVALID("請輸入 0～15 的整數。");
          if (v === a) return OK;
          if (v === op) return BAD("這是前 4 位（操作碼）。位址在<b>後</b> 4 位。");
          if (v === parseInt(code, 2)) return BAD("你把整條指令當成一個數了。要切成前 4 位（操作碼）和後 4 位（位址）。");
          return BAD(`後 4 位是 ${C(code.slice(4))}，照位權 8、4、2、1 相加。`);
        },
        steps: [`後 4 位 ${C(code.slice(4))} 是位址。`, weightTable(code.slice(4), 2).html, `＝ <b>${a}</b>（指令是 ${OPS6[op]} ${a}）`],
      };
    },
  });
  add({
    id: "addrSpace", ch: 6, name: "位址空間", lesson: "lesson-3.html#ch6-5",
    desc: "n 位元的位址可以定址 2ⁿ 個位元組。",
    gen(level) {
      const n = level === 1 ? pick([4, 8, 10, 16]) : pick([12, 20, 24, 30, 32]);
      const total = 2 ** n;
      const unit = n >= 30 ? ["GiB", 30] : n >= 20 ? ["MiB", 20] : n >= 10 ? ["KiB", 10] : null;
      if (unit) return {
        prompt: `一台電腦的位址有 ${n} 個位元，最多能定址多少記憶體？用 <b>${unit[0]}</b> 作答。`, kind: "text", mode: "numeric", placeholder: unit[0], answer: String(2 ** (n - unit[1])),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
          if (x === 2 ** (n - unit[1])) return OK;
          if (x === n) return BAD(`${n} 個位元不是 ${n} 個位址。n 個位元有 2<sup>n</sup> 種組合。`);
          if (x === 2 * n) return BAD("是 2 的 n 次方，不是 2 × n。");
          if (x === total) return BAD(`這是位元組數。題目要的是 ${unit[0]}：1 ${unit[0]} ＝ 2<sup>${unit[1]}</sup> 位元組。`);
          return BAD(`2<sup>${n}</sup> 位元組 ÷ 2<sup>${unit[1]}</sup> ＝ 2<sup>${n - unit[1]}</sup> ${unit[0]}。`);
        },
        steps: [`${n} 個位元有 2<sup>${n}</sup> ＝ ${total.toLocaleString("en-US")} 種組合，每一種是一個位址。`, `1 ${unit[0]} ＝ 2<sup>${unit[1]}</sup> 位元組，所以 2<sup>${n}</sup> ÷ 2<sup>${unit[1]}</sup> ＝ 2<sup>${n - unit[1]}</sup> ＝ <b>${2 ** (n - unit[1])} ${unit[0]}</b>`],
      };
      return {
        prompt: `迷你電腦的位址有 ${n} 個位元，記憶體最多有幾格？`, kind: "text", mode: "numeric", placeholder: "格數", answer: String(total),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
          if (x === total) return OK;
          if (x === n) return BAD(`${n} 個位元不是 ${n} 格。n 個位元有 2<sup>n</sup> 種組合。`);
          if (x === 2 * n) return BAD("是 2 的 n 次方，不是 2 × n。");
          if (x === total - 1) return BAD(`位址從 0 到 ${total - 1}，一共 ${total} 格（別忘了 0 也算一格）。`);
          return BAD(`n 個位元有 2<sup>n</sup> 種組合。`);
        },
        steps: [`${n} 個位元，每個位元 0 或 1，共 2<sup>${n}</sup> 種組合。`, `2<sup>${n}</sup> ＝ <b>${total}</b> 格，位址 0～${total - 1}`],
      };
    },
  });

  conceptSkill(6, "第 6 章觀念題", "lesson-3.html#ch6", "五大單元、CPU、指令週期、記憶體階層的名詞與觀念。");
  conceptSkill(7, "第 7 章觀念題", "lesson-3.html#ch7", "演算法、圖靈機、停機問題、馮紐曼模型、電腦世代。");

  /* ---------- 第 8 章 ---------- */
  const dotted = (o) => o.join(".");
  add({
    id: "ipBin", ch: 8, name: "IP 位址與二進位", lesson: "lesson-3.html#ch8-3",
    desc: "IPv4 的每一段是一個 8 位元無號數（0～255）。",
    gen(level) {
      const oct = [pick([10, 172, 192]), ri(0, 255), ri(0, 255), ri(1, 254)];
      if (oct[0] === 192) oct[1] = 168; if (oct[0] === 172) oct[1] = ri(16, 31);
      const k = level === 1 ? 3 : ri(1, 3), v = oct[k], s = bin(v, 8);
      if (Math.random() < 0.5) return {
        prompt: `IP 位址 ${C(dotted(oct))} 的第 ${k + 1} 段（${v}）寫成 8 位元二進位是什麼？`, kind: "text", mode: "numeric", placeholder: "8 個 0 或 1", answer: s,
        check(a) {
          a = clean(a); if (!/^[01]+$/.test(a)) return INVALID("只能用 0 和 1。");
          if (a === s) return OK;
          if (stripZeros(a) === stripZeros(s)) return BAD("值是對的，但 IP 的每一段固定是 <b>8 位元</b>，左邊要補 0。");
          if (a.length > 8) return BAD("一段只有 8 位元（0～255）。");
          if (stripZeros(rev(s)) === stripZeros(a)) return BAD("餘數讀反了：除 2 取餘要<b>由下往上</b>讀。");
          return BAD(`${C(a)} 換回十進位是 ${parseInt(a, 2)}，不是 ${v}。`);
        },
        steps: [`每一段是 0～255 的無號數，用 8 位元表示。`, divTable(v, 2).html, `餘數由下往上讀，不足 8 位左邊補 0：<b>${s}</b>`],
      };
      const shown = oct.map((o, i) => i === k ? bin(o, 8) : o);
      return {
        prompt: `IP 位址 ${C(shown.join("."))} 有一段寫成了二進位。它的十進位是多少？`, kind: "text", mode: "numeric", placeholder: "0～255", answer: String(v),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入 0～255 的整數。");
          if (x === v) return OK;
          if (x === parseInt(rev(s), 2)) return BAD("位權的方向反了：最右邊是 1，往左 2、4、8……128。");
          if (x > 255) return BAD("一段最多 255（8 個 1）。");
          return BAD("把是 1 的位置的位權（128、64、32、16、8、4、2、1）加起來。");
        },
        steps: [weightTable(s, 2).html, `${weightTable(s, 2).terms.join(" + ") || 0} ＝ <b>${v}</b>`],
      };
    },
  });
  add({
    id: "subnet", ch: 8, name: "子網路：網路位址與主機數", lesson: "lesson-3.html#ch8-3",
    desc: "網路位址 ＝ IP AND 遮罩；/n 可用主機數 ＝ 2^(32−n) − 2。",
    gen(level) {
      const n = level === 1 ? pick([8, 16, 24]) : pick([25, 26, 27, 28, 29, 30]);
      const oct = [pick([10, 172, 192]), ri(0, 255), ri(0, 255), ri(1, 254)];
      if (oct[0] === 192) oct[1] = 168; if (oct[0] === 172) oct[1] = ri(16, 31);
      const maskBits = "1".repeat(n) + "0".repeat(32 - n), mask = [0, 1, 2, 3].map(i => parseInt(maskBits.slice(i * 8, i * 8 + 8), 2));
      const net = oct.map((o, i) => o & mask[i]), h = 32 - n, hosts = 2 ** h - 2;
      if (Math.random() < 0.55) return {
        prompt: `IP 位址 ${C(dotted(oct))}，遮罩 ${C("/" + n)}（${dotted(mask)}）。<b>網路位址</b>是什麼？`, kind: "text", mode: "text", placeholder: "例如 192.168.1.0", answer: dotted(net),
        check(a) {
          const m = String(a).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); if (!m) return INVALID("請寫四段點分十進位，例如 192.168.1.0。");
          const x = m.slice(1).map(Number);
          if (x.every((v, i) => v === net[i])) return OK;
          if (x.every((v, i) => v === oct[i])) return BAD("這是 IP 位址本身。網路位址要把<b>主機部分清成 0</b>（IP AND 遮罩）。");
          if (x.every((v, i) => v === ((oct[i] & mask[i]) | (255 - mask[i])))) return BAD("這是<b>廣播位址</b>（主機部分全 1）。網路位址是主機部分全 0。");
          if (n % 8 && x[3] === 0 && x.slice(0, 3).every((v, i) => v === net[i])) return BAD(`/${n} 不是整段：最後一段的前 ${n % 8} 位也屬於網路部分，要保留。把 ${oct[3]} 寫成二進位，只留前 ${n % 8} 位。`);
          return BAD("把 IP 和遮罩每一段做 AND：遮罩是 255 的段照抄，是 0 的段變 0，其他段要用二進位算。");
        },
        steps: [`遮罩 /${n}：前 ${n} 位是網路部分，後 ${h} 位是主機部分。遮罩寫成點分十進位是 ${dotted(mask)}。`,
          `每一段做 AND：${oct.map((o, i) => `${o} AND ${mask[i]} ＝ ${net[i]}`).join("；")}。${n % 8 ? `其中最後一段：${bin(oct[3], 8)} AND ${bin(mask[3], 8)} ＝ ${bin(net[3], 8)}。` : ""}`,
          `網路位址 ＝ <b>${dotted(net)}</b>`],
      };
      return {
        prompt: `一個 ${C("/" + n)} 的子網路（遮罩 ${dotted(mask)}），最多可以分配給幾台裝置（可用主機數）？`, kind: "text", mode: "numeric", placeholder: "主機數（可加逗號）", answer: hosts.toLocaleString("en-US"),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
          if (x === hosts) return OK;
          if (x === hosts + 2) return BAD("要扣掉 2 個：主機部分全 0 是網路位址、全 1 是廣播位址，不能給裝置用。");
          if (x === hosts + 1) return BAD("要扣 2 個，不是 1 個：網路位址和廣播位址都不能用。");
          if (x === 2 ** n - 2 || x === 2 ** n) return BAD(`主機部分是 32 − ${n} ＝ ${h} 位，不是 ${n} 位。`);
          if (x === h) return BAD(`${h} 是主機部分的位元數。可用主機數是 2<sup>${h}</sup> − 2。`);
          return BAD(`主機部分 ${h} 個位元，2<sup>${h}</sup> 個組合，扣掉網路位址和廣播位址。`);
        },
        steps: [`主機部分 ＝ 32 − ${n} ＝ ${h} 個位元。`, `2<sup>${h}</sup> ＝ ${(2 ** h).toLocaleString("en-US")} 個組合，扣掉全 0（網路位址）和全 1（廣播位址）：`, `${(2 ** h).toLocaleString("en-US")} − 2 ＝ <b>${hosts.toLocaleString("en-US")}</b>`],
      };
    },
  });
  add({
    id: "xferTime", ch: 8, name: "下載時間", lesson: "lesson-3.html#ch8-5",
    desc: "時間 ＝ 檔案大小 × 8 ÷ 速度。大 B 位元組、小 b 位元。",
    gen(level) {
      const combos = level === 1
        ? [[10, "MB", 8, "Mbps"], [50, "MB", 100, "Mbps"], [100, "MB", 20, "Mbps"], [25, "MB", 10, "Mbps"], [1, "GB", 80, "Mbps"], [2, "GB", 100, "Mbps"]]
        : [[1.5, "GB", 100, "Mbps"], [600, "MB", 16, "Mbps"], [4, "GB", 400, "Mbps"], [750, "MB", 300, "Mbps"], [3, "GB", 1, "Gbps"], [45, "MB", 12, "Mbps"], [250, "MB", 20, "Mbps"]];
      const [sz, su, sp, pu] = pick(combos);
      const bytes = sz * (su === "GB" ? 1e9 : 1e6), bits = bytes * 8, bps = sp * (pu === "Gbps" ? 1e9 : 1e6), sec = bits / bps;
      return {
        prompt: `一個 ${sz} ${su} 的檔案，用 ${sp} ${pu} 的網路下載，理論上要幾<b>秒</b>？（1 ${su} ＝ 10<sup>${su === "GB" ? 9 : 6}</sup> 位元組）`, kind: "text", mode: "decimal", placeholder: "秒", answer: String(+sec.toFixed(2)),
        check(a) {
          const x = parseFloat(String(a).replace(/[^\d.]/g, "")); if (Number.isNaN(x)) return INVALID("請輸入數字。");
          if (Math.abs(x - sec) < 0.05 + sec * 0.002) return OK;
          if (Math.abs(x - sec / 8) < 0.05 + sec * 0.002) return BAD("忘了乘 8：檔案大小是<b>位元組</b>（B），速度是每秒幾個<b>位元</b>（b）。1 位元組 ＝ 8 位元。");
          if (Math.abs(x - sec * 8) < 0.05 + sec * 0.002) return BAD("多乘了 8 或除錯邊。應該是：大小（位元組）× 8 ＝ 位元，再 ÷ 每秒位元數。");
          if (su === "GB" && Math.abs(x - sec / 1000) < 0.01) return BAD("GB 和 Mbps 差了 1000 倍：1 GB ＝ 1000 MB。");
          if (pu === "Gbps" && Math.abs(x - sec * 1000) < 0.5) return BAD("Gbps 和 MB 差了 1000 倍：1 Gbps ＝ 1000 Mbps。");
          return BAD(`${sz} ${su} 先換成位元（× 8），再除以每秒的位元數。`);
        },
        steps: [`檔案：${sz} ${su} ＝ ${sz} × 10<sup>${su === "GB" ? 9 : 6}</sup> 位元組 × 8 ＝ ${bits.toLocaleString("en-US")} 位元。`, `速度：${sp} ${pu} ＝ ${bps.toLocaleString("en-US")} 位元／秒。`, `時間 ＝ ${bits.toLocaleString("en-US")} ÷ ${bps.toLocaleString("en-US")} ＝ <b>${+sec.toFixed(2)} 秒</b>${sec >= 60 ? `（約 ${Math.floor(sec / 60)} 分 ${Math.round(sec % 60)} 秒）` : ""}`],
      };
    },
  });

  conceptSkill(8, "第 8 章觀念題", "lesson-3.html#ch8", "Internet 與 WWW、封包、TCP/IP 分層、IP、DNS、HTTPS、頻寬與延遲。");

  /* ---------- 第 9 章 ---------- */
  add({
    id: "intOps", ch: 9, name: "整數除法與餘數", lesson: "lesson-3.html#ch9-2",
    desc: "整數 / 整數 捨去小數；% 取餘數。先乘除後加減。",
    gen(level) {
      const b = ri(2, 9), q = ri(1, 9), r = ri(0, b - 1), a = b * q + r;
      if (level === 1 || Math.random() < 0.5) {
        const t = pick(["div", "mod"]), ans = t === "div" ? q : r;
        return {
          prompt: `整數運算：${C(`${a} ${t === "div" ? "/" : "%"} ${b}`)} 的結果是多少？`, kind: "text", mode: "decimal", placeholder: "整數", answer: String(ans),
          check(x) {
            const s = String(x).trim(); const v = parseFloat(s); if (Number.isNaN(v)) return INVALID("請輸入數字。");
            if (v === ans) return OK;
            if (t === "div" && Math.abs(v - a / b) < 1e-9) return BAD("兩個整數相除，結果也是整數，<b>小數直接捨去</b>（不是四捨五入）。");
            if (t === "div" && v === r) return BAD("這是餘數（%）。/ 要的是商。");
            if (t === "mod" && v === q) return BAD("這是商（/）。% 要的是餘數。");
            if (t === "div" && v === q + 1) return BAD("整數除法是<b>捨去</b>，不是四捨五入或進位。");
            return BAD(`${a} ÷ ${b} ＝ ${q} 餘 ${r}。/ 給商、% 給餘數。`);
          },
          steps: [`${a} ÷ ${b} ＝ ${q} 餘 ${r}（${b} × ${q} ＝ ${b * q}，${a} − ${b * q} ＝ ${r}）。`, t === "div" ? `整數除法捨去小數：<b>${q}</b>` : `% 取餘數：<b>${r}</b>`],
        };
      }
      const c = ri(2, 9), d = ri(1, 9), form = pick([0, 1, 2]);
      const exprs = [[`${d} + ${a} / ${b}`, d + q, "先算 / 再算 +", `${a} / ${b} ＝ ${q}（捨去小數），再 ＋ ${d}`, (d + a) / b], [`${a} % ${b} * ${c}`, r * c, "先算 %（和 × 同級，由左到右）", `${a} % ${b} ＝ ${r}，再 × ${c}`, a % (b * c)], [`(${d} + ${a}) % ${b}`, (d + a) % b, "有括號先算括號", `${d} ＋ ${a} ＝ ${d + a}，再 % ${b}`, d + r]];
      const [e, ans, rule, how, wrong] = exprs[form];
      return {
        prompt: `整數運算：${C(e)} 的結果是多少？`, kind: "text", mode: "decimal", placeholder: "整數", answer: String(ans),
        check(x) {
          const v = parseFloat(String(x).trim()); if (Number.isNaN(v)) return INVALID("請輸入數字。");
          if (v === ans) return OK;
          if (Math.abs(v - wrong) < 1e-9 || v === Math.floor(wrong)) return BAD(`運算順序錯了：${rule}。`);
          if (form === 0 && Math.abs(v - (d + a / b)) < 1e-9) return BAD("整數除法要<b>捨去小數</b>再加。");
          return BAD(`${rule}。${how}。`);
        },
        steps: [rule + "。", `${how} ＝ <b>${ans}</b>`],
      };
    },
  });
  add({
    id: "trace", ch: 9, name: "追蹤程式的變數", lesson: "lesson-3.html#ch9-3",
    desc: "一行一行跑，記下每個變數的值，別用直覺猜。",
    gen(level) {
      const code = (lines) => `<pre class="qcode">${lines.join("\n")}</pre>`;
      const kinds = level === 1 ? ["seq", "sum", "if"] : ["sum", "while", "count", "swap"];
      const k = pick(kinds);
      if (k === "seq") {
        const a = ri(2, 9), b = ri(2, 9);
        const lines = [`x = ${a}`, `y = ${b}`, `x = x + y`, `y = x - y`], X = a + b, Y = X - b;
        return { prompt: `執行完下面的程式，${C("y")} 是多少？${code(lines)}`, kind: "text", mode: "decimal", placeholder: "y 的值", answer: String(Y),
          check(v) { const n = intParse(v); if (n === null) return INVALID("請輸入整數。"); if (n === Y) return OK; if (n === a - b || n === b - a) return BAD(`第 3 行已經把 x 改成 ${X} 了，第 4 行要用<b>新的</b> x。`); if (n === b) return BAD("y 在第 4 行被改掉了。"); return BAD("一行一行追：每一行用的是變數<b>當時</b>的值。"); },
          steps: [`第 1 行 x ＝ ${a}；第 2 行 y ＝ ${b}。`, `第 3 行 x ＝ ${a} ＋ ${b} ＝ ${X}。`, `第 4 行 y ＝ x − y ＝ ${X} − ${b} ＝ <b>${Y}</b>`] };
      }
      if (k === "if") {
        const a = ri(1, 20), b = ri(1, 20), lines = [`a = ${a}`, `b = ${b}`, `if a > b:`, `    m = a`, `else:`, `    m = b`, `m = m * 2`], m = Math.max(a, b) * 2;
        return { prompt: `執行完下面的程式，${C("m")} 是多少？${code(lines)}`, kind: "text", mode: "decimal", placeholder: "m 的值", answer: String(m),
          check(v) { const n = intParse(v); if (n === null) return INVALID("請輸入整數。"); if (n === m) return OK; if (n === m / 2) return BAD("最後一行 m ＝ m × 2 不在 if 裡面，<b>一定會執行</b>。"); if (n === Math.min(a, b) * 2) return BAD(`${a} > ${b} 是${a > b ? "成立" : "不成立"}的，所以走${a > b ? " if" : " else"} 那邊。`); return BAD("先判斷 a > b 成不成立，決定 m 是 a 還是 b，最後再乘 2。"); },
          steps: [`a ＝ ${a}、b ＝ ${b}。a > b ${a > b ? "成立，m ＝ a ＝ " + a : "不成立，m ＝ b ＝ " + b}。`, `最後一行不在 if 裡，一定執行：m ＝ ${Math.max(a, b)} × 2 ＝ <b>${m}</b>`] };
      }
      if (k === "sum") {
        const n = ri(3, 7), st = pick([0, 1, 10]), lines = [`s = ${st}`, `for i in 1..${n}:`, `    s = s + i`], s = st + n * (n + 1) / 2;
        return { prompt: `執行完下面的程式，${C("s")} 是多少？（for i in 1..${n} 表示 i 依序是 1、2、…、${n}）${code(lines)}`, kind: "text", mode: "decimal", placeholder: "s 的值", answer: String(s),
          check(v) { const x = intParse(v); if (x === null) return INVALID("請輸入整數。"); if (x === s) return OK; if (x === s - st) return BAD(`s 一開始是 ${st}，不是 0。`); if (x === s - n) return BAD(`迴圈從 1 跑到 ${n}，<b>包含</b> ${n}。`); if (x === st + n) return BAD("每一圈都要把 i 加進 s，不是只加最後一次。"); return BAD(`一圈一圈追：s 依序是 ${Array.from({length: n}, (_, i) => st + (i + 1) * (i + 2) / 2).join("、")}。`); },
          steps: [`s 一開始是 ${st}。`, `i ＝ 1 到 ${n}，每圈 s 加上 i：${Array.from({length: n}, (_, i) => `i＝${i + 1} 時 s＝${st + (i + 1) * (i + 2) / 2}`).join("；")}。`, `結束時 s ＝ <b>${s}</b>`] };
      }
      if (k === "count") {
        const n = ri(5, 12), m = pick([2, 3]), lines = [`c = 0`, `for i in 1..${n}:`, `    if i % ${m} == 0:`, `        c = c + 1`], c = Math.floor(n / m);
        return { prompt: `執行完下面的程式，${C("c")} 是多少？${code(lines)}`, kind: "text", mode: "decimal", placeholder: "c 的值", answer: String(c),
          check(v) { const x = intParse(v); if (x === null) return INVALID("請輸入整數。"); if (x === c) return OK; if (x === n) return BAD(`只有 i 是 ${m} 的倍數時才會加 1。`); if (x === n - c) return BAD(`條件是 i % ${m} == 0，也就是 i 是 ${m} 的倍數時才算。你算的是不是倍數的。`); return BAD(`1～${n} 之間有幾個 ${m} 的倍數？`); },
          steps: [`i % ${m} == 0 的意思是 i 是 ${m} 的倍數。`, `1～${n} 之間 ${m} 的倍數：${Array.from({length: c}, (_, i) => (i + 1) * m).join("、")}，共 ${c} 個。`, `c ＝ <b>${c}</b>`] };
      }
      if (k === "swap") {
        const a = ri(1, 9), b = ri(1, 9), lines = [`a = ${a}`, `b = ${b}`, `t = a`, `a = b`, `b = t`, `print(a, b)`];
        return { prompt: `下面的程式會印出什麼？（兩個數用空白隔開）${code(lines)}`, kind: "text", mode: "text", placeholder: "例如 3 5", answer: `${b} ${a}`,
          check(v) { const m = String(v).match(/-?\d+/g); if (!m || m.length !== 2) return INVALID("請輸入兩個整數。"); const [x, y] = m.map(Number); if (x === b && y === a) return OK; if (x === a && y === b) return BAD("這是交換<b>前</b>的值。t 暫存 a 的舊值，所以最後 a、b 互換了。"); if (x === b && y === b) return BAD("第 5 行 b ＝ t，而 t 存的是 a <b>原本</b>的值。"); return BAD("這是經典的交換：t 先暫存 a，a 拿 b 的值，b 再拿 t（舊的 a）。"); },
          steps: [`t ＝ a ＝ ${a}（先把 a 存起來）。`, `a ＝ b ＝ ${b}。`, `b ＝ t ＝ ${a}。印出 <b>${b} ${a}</b>：兩個數交換了。`] };
      }
      const n = ri(2, 6), lines = [`x = 1`, `k = 0`, `while x < ${2 ** n}:`, `    x = x * 2`, `    k = k + 1`], ans = n;
      return { prompt: `執行完下面的程式，${C("k")} 是多少？${code(lines)}`, kind: "text", mode: "decimal", placeholder: "k 的值", answer: String(ans),
        check(v) { const x = intParse(v); if (x === null) return INVALID("請輸入整數。"); if (x === ans) return OK; if (x === ans + 1) return BAD(`x 變成 ${2 ** n} 時，條件 x < ${2 ** n} 就<b>不成立</b>了，不會再多跑一圈。`); if (x === ans - 1) return BAD(`x ＝ ${2 ** (n - 1)} 時 ${2 ** (n - 1)} < ${2 ** n} 還成立，還要再跑一圈。`); if (x === 2 ** n) return BAD("這是 x 的值。題目問 k（跑了幾圈）。"); return BAD(`x 每圈翻倍：1、2、4、8……到 ${2 ** n} 時停。數數看翻了幾次。`); },
        steps: [`x 從 1 開始每圈 × 2，k 數圈數。`, `x 依序：${Array.from({length: n + 1}, (_, i) => 2 ** i).join(" → ")}。到 ${2 ** n} 時 x < ${2 ** n} 不成立，停。`, `翻了 ${n} 次，k ＝ <b>${n}</b>（也就是 log<sub>2</sub> ${2 ** n}）`] };
    },
  });
  add({
    id: "binSearch", ch: 9, name: "二分搜尋的次數", lesson: "lesson-3.html#ch9-5",
    desc: "n 筆排好的資料，二分搜尋最多比較 ⌈log₂ n⌉ 次。",
    gen(level) {
      const n = level === 1 ? pick([8, 16, 64, 128, 1024]) : pick([100, 1000, 500, 4096, 10000, 1000000, 50, 65536]);
      const k = Math.ceil(Math.log2(n));
      return {
        prompt: `有 ${n.toLocaleString("en-US")} 筆<b>已排序</b>的資料，用二分搜尋找一筆，<b>最多</b>要比較幾次？`, kind: "text", mode: "numeric", placeholder: "次數", answer: String(k),
        check(a) {
          const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
          if (x === k) return OK;
          if (x === n) return BAD("這是線性搜尋最差的次數。二分搜尋每比一次就把範圍<b>砍一半</b>。");
          if (x === n / 2) return BAD("不是砍一次就找到。每次砍一半，一直砍到剩 1 筆。");
          if (x === k - 1 && !isPow2(n)) return BAD(`2<sup>${k - 1}</sup> ＝ ${2 ** (k - 1)} 比 ${n} 小，${k - 1} 次砍不完，要無條件進位到 ${k} 次。`);
          if (x === k + 1) return BAD(`2<sup>${k}</sup> ＝ ${(2 ** k).toLocaleString("en-US")} 已經 ≥ ${n}，${k} 次就夠了。`);
          return BAD(`找最小的 k 使得 2<sup>k</sup> ≥ ${n}。`);
        },
        steps: [`每比較一次，剩下的範圔砍一半。要找最小的 k 讓 2<sup>k</sup> ≥ ${n.toLocaleString("en-US")}。`, `2<sup>${k - 1}</sup> ＝ ${(2 ** (k - 1)).toLocaleString("en-US")}${isPow2(n) ? "" : ` < ${n.toLocaleString("en-US")}`}，2<sup>${k}</sup> ＝ ${(2 ** k).toLocaleString("en-US")} ≥ ${n.toLocaleString("en-US")}。`, `最多 <b>${k}</b> 次（線性搜尋最差要 ${n.toLocaleString("en-US")} 次）`],
      };
    },
  });

  conceptSkill(9, "第 9 章觀念題", "lesson-3.html#ch9", "機器語言到高階語言、編譯與直譯、變數與型別、三種流程、函式、演算法。");

  /* ---------- 第 10 章 ---------- */
  const NAMES = ["陳大明", "林美華", "張雅婷", "李志豪", "黃小玲", "吳佩珊", "王建宏", "劉家豪", "蔡怡君", "郭俊宏"];
  add({
    id: "sqlRead", ch: 10, name: "讀 SQL 查詢結果", lesson: "lesson-3.html#ch10-3",
    desc: "WHERE 篩選列、SELECT 選欄、ORDER BY 排序、COUNT 數列數。",
    gen(level) {
      const n = 5, rows = shuffle(NAMES).slice(0, n).map(nm => [nm, pick(["IM", "CS", "BA"]), ri(1, 4), ri(55, 99)]);
      while (new Set(rows.map(r => r[3])).size < n) rows[ri(0, n - 1)][3] = ri(55, 99);
      const table = `<table class="calc dbq"><tr><th>姓名</th><th>系所</th><th>年級</th><th>成績</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table>`;
      const th = pick([70, 75, 80, 85]), dept = pick(["IM", "CS", "BA"]), yr = pick([1, 2, 3]);
      const conds = level === 1
        ? [[`成績 >= ${th}`, r => r[3] >= th], [`系所 = '${dept}'`, r => r[1] === dept], [`年級 = ${yr}`, r => r[2] === yr]]
        : [[`成績 >= ${th} AND 系所 = '${dept}'`, r => r[3] >= th && r[1] === dept], [`年級 = ${yr} OR 成績 < ${th}`, r => r[2] === yr || r[3] < th], [`系所 <> '${dept}' AND 年級 >= ${yr}`, r => r[1] !== dept && r[2] >= yr], [`成績 < ${th}`, r => r[3] < th]];
      const [cs, fn] = pick(conds), hit = rows.filter(fn);
      const t = pick(["count", "count", "first"]);
      if (t === "count" || !hit.length) {
        const sql = `SELECT COUNT(*) FROM 學生 WHERE ${cs}`;
        return {
          prompt: `學生表如下。${C(sql)} 會得到多少？${table}`, kind: "text", mode: "numeric", placeholder: "列數", answer: String(hit.length),
          check(a) {
            const x = intParse(a); if (x === null) return INVALID("請輸入整數。");
            if (x === hit.length) return OK;
            if (x === n - hit.length) return BAD("你數的是<b>不</b>符合條件的。WHERE 留下的是符合條件的列。");
            if (x === n) return BAD("COUNT(*) 數的是 WHERE 之後<b>剩下</b>的列，不是整張表。");
            if (/AND/.test(cs) && x > hit.length) return BAD("AND 要<b>兩個條件都</b>成立才算。");
            if (/OR/.test(cs) && x < hit.length) return BAD("OR 只要<b>其中一個</b>條件成立就算。");
            return BAD("一列一列檢查 WHERE 的條件，數符合的有幾列。");
          },
          steps: [`WHERE ${cs}：一列一列檢查。`, hit.length ? `符合的：${hit.map(r => `${r[0]}（${r[1]}、${r[2]} 年級、${r[3]} 分）`).join("、")}。` : "沒有任何一列符合。", `COUNT(*) ＝ <b>${hit.length}</b>`],
        };
      }
      const desc = Math.random() < 0.5, sorted = hit.slice().sort((a, b) => desc ? b[3] - a[3] : a[3] - b[3]);
      const sql = `SELECT 姓名 FROM 學生 WHERE ${cs} ORDER BY 成績${desc ? " DESC" : ""}`;
      return {
        prompt: `學生表如下。${C(sql)} 的結果，<b>第一列</b>是誰？${table}`, kind: "choice", choices: shuffle(rows.map(r => r[0])).slice(0, 4).includes(sorted[0][0]) ? shuffle(rows.map(r => r[0])).filter(x => x === sorted[0][0] || true).slice(0, 5) : rows.map(r => r[0]), answer: sorted[0][0],
        check(a) {
          if (a === sorted[0][0]) return OK;
          if (sorted.length > 1 && a === sorted[sorted.length - 1][0]) return BAD(`排序方向反了：${desc ? "DESC 是由大到小，第一列是成績最高的" : "沒寫 DESC 就是由小到大，第一列是成績最低的"}。`);
          if (!hit.some(r => r[0] === a)) return BAD(`${a} 不符合 WHERE ${cs}，根本不會出現在結果裡。`);
          return BAD(`先用 WHERE 留下符合的列，再照成績${desc ? "由大到小" : "由小到大"}排。`);
        },
        steps: [`WHERE ${cs} 留下：${hit.map(r => `${r[0]}（${r[3]} 分）`).join("、")}。`, `ORDER BY 成績${desc ? " DESC：由大到小" : "：由小到大"}：${sorted.map(r => r[0]).join(" → ")}。`, `第一列是 <b>${sorted[0][0]}</b>`],
      };
    },
  });
  conceptSkill(10, "第 10 章觀念題", "lesson-3.html#ch10", "DBMS、資料表、主鍵與外來鍵、SQL、正規化、交易與 ACID、索引。");

  conceptSkill(99, "觀念選擇題（綜合）", "lesson.html", "名詞與觀念的快速檢查，涵蓋全部章節。");


  window.SKILLS = SKILLS;
})();
