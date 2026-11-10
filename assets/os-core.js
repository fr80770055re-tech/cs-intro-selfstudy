// 作業系統的計算核心：CPU 排程與頁面置換。講義 ④ 的元件和練習頁的出題共用，確保兩邊的答案一致。
(function () {
  "use strict";
  // procs: [{name, at（抵達時間）, bt（執行時間）, pr（優先權，數字小的優先）}]
  // alg: "FCFS" | "SJF" | "SRTF" | "PRI" | "RR"；q：RR 的時間配額
  // 平手時：先比抵達時間，再比編號（P1 先於 P2）。RR 中，同一時間點新抵達的行程排在剛被換下來的行程前面。
  function schedule(procs, alg, q) {
    q = q || 2;
    const P = procs, n = P.length, rem = P.map(p => p.bt), ct = Array(n), first = Array(n).fill(null), segs = [];
    let t = 0, done = 0;
    const push = (i, s, e) => {
      const name = i === null ? null : P[i].name, L = segs[segs.length - 1];
      if (L && L.name === name && L.e === s) L.e = e; else segs.push({ name, i, s, e });
    };
    const nextArrival = () => Math.min(...P.map((p, i) => (rem[i] > 0 && p.at > t ? p.at : Infinity)));
    if (alg === "RR") {
      const order = P.map((_, i) => i).sort((a, b) => P[a].at - P[b].at || a - b), queue = [];
      let k = 0;
      const admit = (upTo) => { while (k < n && P[order[k]].at <= upTo) queue.push(order[k++]); };
      admit(t);
      while (done < n) {
        if (!queue.length) { const nt = P[order[k]].at; push(null, t, nt); t = nt; admit(t); continue; }
        const i = queue.shift();
        if (first[i] === null) first[i] = t;
        const run = Math.min(q, rem[i]);
        push(i, t, t + run); t += run; rem[i] -= run;
        admit(t);
        if (rem[i] > 0) queue.push(i); else { ct[i] = t; done++; }
      }
    } else if (alg === "SRTF") {
      while (done < n) {
        const ready = P.map((_, i) => i).filter(i => P[i].at <= t && rem[i] > 0);
        if (!ready.length) { const nt = nextArrival(); push(null, t, nt); t = nt; continue; }
        ready.sort((a, b) => rem[a] - rem[b] || P[a].at - P[b].at || a - b);
        const i = ready[0];
        if (first[i] === null) first[i] = t;
        push(i, t, t + 1); t++; rem[i]--;
        if (!rem[i]) { ct[i] = t; done++; }
      }
    } else {
      const key = { FCFS: (i) => [P[i].at, i], SJF: (i) => [P[i].bt, P[i].at, i], PRI: (i) => [P[i].pr, P[i].at, i] }[alg];
      const cmp = (a, b) => { const x = key(a), y = key(b); for (let j = 0; j < x.length; j++) if (x[j] !== y[j]) return x[j] - y[j]; return 0; };
      while (done < n) {
        const ready = P.map((_, i) => i).filter(i => P[i].at <= t && rem[i] > 0);
        if (!ready.length) { const nt = nextArrival(); push(null, t, nt); t = nt; continue; }
        ready.sort(cmp);
        const i = ready[0];
        first[i] = t; push(i, t, t + rem[i]); t += rem[i]; rem[i] = 0; ct[i] = t; done++;
      }
    }
    const res = P.map((p, i) => ({ name: p.name, at: p.at, bt: p.bt, pr: p.pr, st: first[i], ct: ct[i], tat: ct[i] - p.at, wt: ct[i] - p.at - p.bt, rt: first[i] - p.at }));
    const avg = (k) => res.reduce((s, r) => s + r[k], 0) / n;
    return { segs, res, avgW: avg("wt"), avgT: avg("tat"), avgR: avg("rt"), end: t };
  }

  // 頁面置換：refs 參考串、frames 頁框數、alg "FIFO" | "LRU" | "OPT"
  // 每一步回傳頁框內容（固定位置，被換掉的那格換成新頁）、是否命中、換掉哪一頁。
  function pageReplace(refs, frames, alg) {
    const slots = Array(frames).fill(null), loaded = Array(frames).fill(-1), used = Array(frames).fill(-1), steps = [];
    let faults = 0, clock = 0;
    refs.forEach((r, t) => {
      let j = slots.indexOf(r), hit = j >= 0, victim = null, slot = j;
      if (hit) { used[j] = t; }
      else {
        faults++;
        slot = slots.indexOf(null);
        if (slot < 0) {
          const idx = slots.map((_, k) => k);
          if (alg === "FIFO") slot = idx.sort((a, b) => loaded[a] - loaded[b])[0];
          else if (alg === "LRU") slot = idx.sort((a, b) => used[a] - used[b])[0];
          else {
            const nextUse = (p) => { const k = refs.indexOf(p, t + 1); return k < 0 ? Infinity : k; };
            slot = idx.sort((a, b) => (nextUse(slots[b]) - nextUse(slots[a])) || (loaded[a] - loaded[b]))[0];
          }
          victim = slots[slot];
        }
        slots[slot] = r; loaded[slot] = clock++; used[slot] = t;
      }
      steps.push({ ref: r, frames: slots.slice(), hit, victim, slot });
    });
    return { steps, faults, hits: refs.length - faults };
  }

  window.OS = { schedule, pageReplace, ALG_NAME: { FCFS: "先到先服務（FCFS）", SJF: "最短工作優先（SJF）", SRTF: "最短剩餘時間優先（SRTF）", PRI: "優先權排程", RR: "循環排程（RR）", FIFO: "先進先出（FIFO）", LRU: "最近最少使用（LRU）", OPT: "最佳置換（OPT）" } };
})();
