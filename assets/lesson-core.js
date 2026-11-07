// 講義頁共用：小工具、逐步播放器、例題「丟進元件」、目錄行為
"use strict";
const $ = (s) => document.querySelector(s);
const SUP = {"-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹"};
const sup = (n) => String(n).split("").map(c => SUP[c]).join("");
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const msg = (html) => `<div class="step-msg">${html}</div>`;
const minus = (n) => (n < 0 ? "−" + (-n) : String(n));
// 把 "0101" 畫成位元方塊；opts.sign 標出最高位元，opts.cls(i) 可以替個別位元加 class
function bitsHTML(s, opts = {}){
  return `<span class="bits">${s.split("").map((c, i) => `<span class="bit ${c === "1" ? "one" : ""} ${opts.sign && i === 0 ? "sign" : ""} ${opts.cls ? opts.cls(i) : ""}">${c}</span>`).join("")}</span>`;
}

/* ---------- 逐步播放器 ---------- */
function stepper(el, steps){
  let i = 0;
  el.innerHTML = `<div class="step-body" aria-live="polite"></div>
    <div class="step-ctrl">
      <button data-a="first">從頭</button>
      <button data-a="prev">← 上一步</button>
      <span class="step-count"></span>
      <button data-a="next" class="primary">下一步 →</button>
      <button data-a="all" class="ghost">直接看結果</button>
    </div>`;
  const body = el.querySelector(".step-body"), cnt = el.querySelector(".step-count");
  const bPrev = el.querySelector('[data-a="prev"]'), bNext = el.querySelector('[data-a="next"]');
  function show(){
    body.innerHTML = steps[i];
    cnt.textContent = `第 ${i+1} / ${steps.length} 步`;
    bPrev.disabled = i === 0; bNext.disabled = i === steps.length - 1;
  }
  el.onclick = (e) => {
    const a = e.target.closest("button")?.dataset.a; if(!a) return;
    if(a === "prev" && i > 0) i--;
    if(a === "next" && i < steps.length - 1) i++;
    if(a === "all") i = steps.length - 1;
    if(a === "first") i = 0;
    show();
  };
  show();
}

/* ---------- 例題：丟進元件 ---------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".loadbtn"); if(!btn || !btn.dataset.load) return;
  const pairs = JSON.parse(btn.dataset.load);
  for(const [id, val] of pairs){
    const el = document.getElementById(id);
    if(!el) continue;
    el.value = val;
    el.dispatchEvent(new Event(el.tagName === "SELECT" || el.type === "range" ? "change" : "input"));
    if(el.type === "range") el.dispatchEvent(new Event("input"));
  }
  const w = document.getElementById(btn.dataset.goto);
  w.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  w.classList.remove("flash"); void w.offsetWidth; w.classList.add("flash");
});

/* ---------- 目錄：桌機展開、手機收合；標出目前讀到的段落 ---------- */
(function(){
  const toc = document.querySelector("nav.toc"); if(!toc) return;
  const det = toc.querySelector("details"), cur = toc.querySelector("summary .cur");
  const wide = matchMedia("(min-width: 901px)");
  const sync = () => { det.open = wide.matches; };
  sync(); wide.addEventListener("change", sync);
  toc.addEventListener("click", (e) => { if(e.target.closest("a") && !wide.matches) det.open = false; });
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const targets = [...map.keys()].map(id => document.getElementById(id)).filter(Boolean);
  function update(){
    const y = window.scrollY + 130;
    let best = targets[0];
    for(const t of targets){ if(t.getBoundingClientRect().top + window.scrollY <= y) best = t; }
    links.forEach(a => a.classList.remove("active"));
    const a = best && map.get(best.id);
    if(a){
      a.classList.add("active");
      if(cur) cur.textContent = a.textContent.replace(/\s+/g, " ");
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => { if(!ticking){ ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, {passive: true});
  update();
})();
