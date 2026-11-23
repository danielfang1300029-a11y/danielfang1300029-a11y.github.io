/* Hidden finds: small surprise pop-ups shared by every pack on this site.
   Nothing is listed anywhere; a find only shows itself when it pops up.
   Chance is the main limit: each day starts at full chance and every pop-up halves it
   for the rest of that day (across all packs). A hard limit of 3 a day is only a backstop.
   Progress lives in this browser (localStorage). If it is cleared, the worst case is a repeat.
   Test mode: add ?finds=test to a page URL (every roll succeeds, no waiting),
   ?finds=all (shows every find in turn), ?finds=reset (forgets everything). */
(function () {
  "use strict";
  var KEY = "packs-finds-v1";
  var PACKS = ["mech2413", "mech2407", "mech1350", "mech2423", "math1851", "math1853", "fina1310", "econ1210"];
  var MATHS = ["math1851", "math1853", "mech2407"];
  // exam dates (local time), 2026/27 Sem 1
  var EXAMS = { mech2423: "2026-11-30", fina1310: "2026-12-07", mech2407: "2026-12-08", mech1350: "2026-12-16", mech2413: "2026-12-18" };
  var SEASON = ["2026-11-30", "2026-12-18"];
  var BASE = 0.2, CAP = 3, GAP = 20 * 60 * 1000;

  // id: [emoji, title, line, chance]   chance 1 = sure (still halves the day's chance)
  var FINDS = {
    warmup: ["☕", "Warm-up", "Fifteen minutes in. The hardest part is starting.", BASE],
    focus: ["🔥", "Deep focus", "A full hour of real reading.", BASE],
    marathon: ["🏃", "Marathon", "Three hours today. Stretch your legs.", BASE],
    water: ["💧", "Still here?", "Five hours today. Go drink some water.", BASE],
    owl: ["🦉", "Night owl", "The quiet hours. Don't forget to sleep.", BASE],
    bird: ["🐦", "Early bird", "Up before the city.", BASE],
    weekend: ["🛋️", "Weekend warrior", "An hour of study on a weekend.", BASE],
    lunch: ["🍱", "Lunch-break scholar", "Revision with a side of lunch.", BASE],
    back: ["🔁", "Back again", "Two days in a row.", BASE],
    streak3: ["📅", "Three-day streak", "Three days running. Keep the chain going.", BASE],
    streak7: ["🗓️", "One-week streak", "Seven days in a row.", BASE],
    streak14: ["🏅", "Fortnight streak", "Fourteen days without a gap.", BASE],
    comeback: ["👋", "Welcome back", "Good to see you again.", BASE],
    endnote: ["📜", "Cover to cover", "You reached the end of a note.", BASE],
    noteguide: ["🔗", "Straight to practice", "From the note to its exam guide.", BASE],
    spot: ["🔍", "Spot the error", "Found the find-the-mistake section.", BASE],
    common: ["⚠️", "Forewarned", "Reading the common mistakes before making them.", BASE],
    checklist: ["✅", "Last-minute hero", "The checklist. Nearly there.", BASE],
    speed: ["⚡", "Speed reader", "That was quick... did you skim? 👀", BASE],
    longway: ["🐢", "The long way", "Took your time with that one. Thorough!", BASE],
    dark: ["🌙", "Dark side", "An hour in dark mode.", BASE],
    tabs: ["🗂️", "Tab hoarder", "The same page open twice.", BASE],
    commuter: ["🚇", "Commuter", "Three short sessions today.", BASE],
    firsttick: ["☑️", "First tick", "Your first concept ticked off.", BASE],
    chapter: ["🧩", "Chapter cleared", "Every concept in a chapter learned.", BASE],
    practised: ["🎯", "Practice makes perfect", "A concept marked as practised.", BASE],
    branch: ["🌳", "Branch master", "A whole section of a course learned.", BASE],
    rebel: ["🎲", "Rebel", "Ticked something before what it needs.", BASE],
    cartographer: ["🗺️", "Cartographer", "Zoomed out to see the whole map.", BASE],
    thread: ["🧵", "Follow the thread", "Followed a link into another chapter.", BASE],
    hopper: ["🐇", "Course hopper", "Three courses in one day.", BASE],
    speedrun: ["🚀", "Syllabus speedrun", "Five courses in one day. That's a lot of tabs.", BASE],
    grandtour: ["🌏", "Grand tour", "Every pack in a single day.", BASE],
    explorer: ["🧭", "Explorer", "You've opened every pack.", BASE],
    rounded: ["⚖️", "Well-rounded", "Maths and something else on the same day.", BASE],
    collector: ["🏆", "Collector", "Chapters cleared in three different courses.", BASE],
    doubleclear: ["✌️", "Double clear", "Chapters cleared in two courses today.", BASE],
    h10: ["⏱️", "Ten hours", "Ten hours of reading across the packs.", BASE],
    h25: ["⏳", "Twenty-five hours", "A full day's worth of study, all added up.", BASE],
    h50: ["🌟", "Fifty hours", "Fifty hours. That's dedication.", BASE],
    h100: ["👑", "A hundred hours", "One hundred hours. Legendary.", BASE],
    best: ["📈", "Personal best", "Your longest study day yet.", BASE],
    spread: ["🧱", "Steady builder", "Seven study days within two weeks.", BASE],
    season: ["🎓", "Exam season", "Five study days in the exam period.", BASE],
    gauntlet: ["🛡️", "Exam gauntlet", "Every exam course opened this season.", BASE],
    eve: ["🌆", "Exam eve", "Exam tomorrow. Early night tonight.", BASE],
    examday: ["🍀", "Exam day", "Good luck today. You've got this.", 1],
    storm: ["🌈", "After the storm", "That exam's over. Go rest.", BASE],
    detour: ["↪️", "Detour", "Hopped from one course to another.", BASE]
  };

  // ---------- storage ----------
  var S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { S = {}; }
    S.got = S.got || {}; S.days = S.days || {}; S.rolled = S.rolled || {}; S.packs = S.packs || [];
    S.total = S.total || 0; S.best = S.best || 0; S.clears = S.clears || {}; S.ticks = S.ticks || {};
    S.pending = S.pending || [];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  load();

  var params = new URLSearchParams(location.search), mode = params.get("finds") || window.FINDS_DEMO || null;
  if (mode === "reset") { S = {}; save(); load(); }
  var TEST = mode === "test" || mode === "all";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dstr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function day() {
    var t = today();
    if (!S.days[t]) S.days[t] = { sec: 0, courses: [], shown: 0, mult: 1, sessions: 0, dark: 0, clears: [] };
    // keep about two months of days
    var keys = Object.keys(S.days).sort();
    while (keys.length > 70) delete S.days[keys.shift()];
    return S.days[t];
  }
  var seg = location.pathname.split("/").filter(Boolean);
  var COURSE = seg.length && PACKS.indexOf(seg[0].toLowerCase()) >= 0 ? seg[0].toLowerCase() : null;
  var FILE = (seg[seg.length - 1] || "index.html").toLowerCase();
  var KIND = /^note-/.test(FILE) ? "note" : /^guide-/.test(FILE) ? "guide" : FILE === "tree.html" ? "tree" : "other";
  var CHAP = (FILE.match(/^(?:note|guide)-([a-z0-9]+)\.html$/) || [])[1] || null;
  var opened = Date.now();

  // ---------- the roll ----------
  var queue = [];
  function trigger(id) {
    var f = FINDS[id]; if (!f || S.got[id]) return;
    var t = today(), k = id + "@" + t;
    if (!TEST && S.rolled[k]) return;           // one roll per find per day
    S.rolled[k] = 1;
    var dd = day();
    var p = TEST ? 1 : Math.min(1, f[3] * dd.mult);
    if (f[3] >= 1) p = 1;
    if (Math.random() < p && (TEST || dd.shown + queue.length < CAP)) {
      if (queue.indexOf(id) < 0) queue.push(id);
      dd.mult /= 2;                              // halve the chance for the rest of the day
    }
    // tidy old roll marks
    var ks = Object.keys(S.rolled);
    if (ks.length > 400) ks.forEach(function (x) { if (x.split("@")[1] !== t) delete S.rolled[x]; });
    save(); pump();
  }

  // ---------- the pop-up ----------
  var lastScroll = 0, shownAt = S.lastShown || 0, box = null;
  addEventListener("scroll", function () { lastScroll = Date.now(); }, { passive: true });
  function css() {
    if (document.getElementById("finds-css")) return;
    var st = document.createElement("style"); st.id = "finds-css";
    st.textContent =
      ".finds{position:fixed;left:50%;top:max(12px,env(safe-area-inset-top,0px));transform:translate(-50%,-140%);z-index:2147483000;" +
      "display:flex;gap:12px;align-items:center;width:min(92vw,380px);box-sizing:border-box;padding:12px 16px 12px 14px;border-radius:16px;" +
      "background:linear-gradient(135deg,#fff7ec,#fdebd8);color:#3b2410;border:1px solid #f1c79c;box-shadow:0 10px 30px rgba(120,60,10,.22);" +
      "font:500 14px/1.35 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;transition:transform .45s cubic-bezier(.2,1.4,.4,1);cursor:pointer;touch-action:pan-y}" +
      ".finds.in{transform:translate(-50%,0)}" +
      ".finds .e{font-size:30px;line-height:1;animation:findsPop .6s ease .15s both}" +
      ".finds b{display:block;font:600 15px/1.25 'Space Grotesk',Inter,system-ui,sans-serif}" +
      ".finds small{display:block;font:500 10px/1.2 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#b0601f;margin-bottom:2px}" +
      "@keyframes findsPop{0%{transform:scale(.3) rotate(-20deg);opacity:0}70%{transform:scale(1.2) rotate(6deg);opacity:1}100%{transform:none}}" +
      "@media (prefers-color-scheme:dark){.finds{background:linear-gradient(135deg,#3a2616,#2c1d12);color:#f7e6d4;border-color:#6b4423;box-shadow:0 10px 30px rgba(0,0,0,.5)}.finds small{color:#f0a868}}" +
      "@media (prefers-reduced-motion:reduce){.finds{transition:none}.finds .e{animation:none}}";
    document.head.appendChild(st);
  }
  function show(id, after) {
    var f = FINDS[id]; css();
    box = document.createElement("div"); box.className = "finds"; box.setAttribute("role", "status");
    box.innerHTML = '<span class="e" aria-hidden="true">' + f[0] + '</span><span><small>Hidden find</small><b>' + f[1] + "</b>" + f[2] + "</span>";
    document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box && box.classList.add("in"); }); });
    var gone = false, b = box;
    function hide() { if (gone) return; gone = true; b.classList.remove("in"); setTimeout(function () { b.remove(); if (box === b) box = null; after && after(); }, 450); }
    b.addEventListener("click", hide);
    var y0 = null;
    b.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    b.addEventListener("touchmove", function (e) { if (y0 !== null && e.touches[0].clientY - y0 < -20) hide(); }, { passive: true });
    setTimeout(hide, 4500);
  }
  function pump() {
    if (!queue.length && !S.pending.length) return;
    // carry finds won on a page that closed before they showed
    S.pending.forEach(function (id) { if (queue.indexOf(id) < 0 && !S.got[id]) queue.push(id); });
    S.pending = queue.slice(); save();
    if (box || document.hidden) return;
    var now = Date.now();
    var ok = TEST || (now - opened > 60000 && now - lastScroll > 2000 && now - shownAt > GAP && day().shown < CAP);
    if (!ok) return;
    var id = queue.shift(); if (!id) return;
    S.got[id] = today(); S.lastShown = shownAt = now; day().shown++;
    S.pending = queue.slice(); save();
    show(id, function () { if (TEST && queue.length) setTimeout(pump, 400); });
  }
  setInterval(pump, 3000);

  // ---------- facts about today and the visit ----------
  function visit() {
    var dd = day(), t = today();
    var dates = Object.keys(S.days).filter(function (x) { return S.days[x].sec > 0 || x === t; }).sort();
    // gap since the last study day
    var prev = dates.filter(function (x) { return x < t; }).pop();
    if (prev) {
      var gap = (new Date(t) - new Date(prev)) / 864e5;
      if (gap >= 5) trigger("comeback");
    }
    // streak
    var run = 1, d = new Date();
    for (;;) { d.setDate(d.getDate() - 1); var s = S.days[dstr(d)]; if (s && s.sec > 60) run++; else break; }
    if (run >= 2) trigger("back");
    if (run >= 3) trigger("streak3");
    if (run >= 7) trigger("streak7");
    if (run >= 14) trigger("streak14");
    // spread: 7 study days in the last 14
    var c = 0; d = new Date();
    for (var i = 0; i < 14; i++) { var s2 = S.days[dstr(d)]; if (s2 && s2.sec > 600) c++; d.setDate(d.getDate() - 1); }
    if (c >= 7) trigger("spread");
    // courses today
    if (COURSE) {
      if (dd.courses.indexOf(COURSE) < 0) dd.courses.push(COURSE);
      if (S.packs.indexOf(COURSE) < 0) S.packs.push(COURSE);
      if (S.lastCourse && S.lastCourse !== COURSE && Date.now() - (S.lastCourseAt || 0) < 5 * 60000) trigger("detour");
      S.lastCourse = COURSE; S.lastCourseAt = Date.now();
    }
    if (dd.courses.length >= 3) trigger("hopper");
    if (dd.courses.length >= 5) trigger("speedrun");
    if (PACKS.every(function (p) { return dd.courses.indexOf(p) >= 0; })) trigger("grandtour");
    if (PACKS.every(function (p) { return S.packs.indexOf(p) >= 0; })) trigger("explorer");
    var maths = dd.courses.some(function (p) { return MATHS.indexOf(p) >= 0; });
    var other = dd.courses.some(function (p) { return MATHS.indexOf(p) < 0; });
    if (maths && other) trigger("rounded");
    // exams
    if (COURSE && EXAMS[COURSE]) {
      var ex = EXAMS[COURSE], eve = new Date(ex); eve.setDate(eve.getDate() - 1);
      if (t === dstr(eve)) trigger("eve");
      if (t === ex) trigger("examday");
      if (t > ex) trigger("storm");
    }
    if (t >= SEASON[0] && t <= SEASON[1]) {
      var sd = Object.keys(S.days).filter(function (x) { return x >= SEASON[0] && x <= SEASON[1] && S.days[x].sec > 600; }).length;
      if (sd >= 5) trigger("season");
      S.seasonPacks = S.seasonPacks || [];
      if (COURSE && EXAMS[COURSE] && S.seasonPacks.indexOf(COURSE) < 0) S.seasonPacks.push(COURSE);
      if (Object.keys(EXAMS).every(function (p) { return S.seasonPacks.indexOf(p) >= 0; })) trigger("gauntlet");
    }
    // sessions: a new one after 30 minutes away
    if (Date.now() - (S.lastActive || 0) > 30 * 60000) { dd.sessions++; dd.sessionStart = Date.now(); }
    save();
  }

  // ---------- active time ----------
  var lastAct = Date.now(), pageSec = 0;
  ["scroll", "pointerdown", "keydown", "touchstart", "wheel"].forEach(function (ev) {
    addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true });
  });
  var dark = matchMedia && matchMedia("(prefers-color-scheme: dark)");
  var TICK = 15;
  setInterval(function () {
    if (document.hidden || Date.now() - lastAct > 120000) return;
    var dd = day(), h = new Date().getHours(), wd = new Date().getDay();
    load(); dd = day();                     // pick up changes from other tabs
    dd.sec += TICK; S.total += TICK; pageSec += TICK; S.lastActive = Date.now();
    if (dark && dark.matches) dd.dark += TICK;
    if (COURSE) { S.ctime = S.ctime || {}; S.ctime[COURSE] = (S.ctime[COURSE] || 0) + TICK; }
    var cs = COURSE && S.ctime[COURSE];
    if (cs >= 15 * 60) trigger("warmup");
    // every full hour of the day gets its own roll
    if (dd.sec >= 3600 && Math.floor(dd.sec / 3600) > Math.floor((dd.sec - TICK) / 3600)) {
      delete S.rolled["focus@" + today()];
      trigger("focus");
    }
    if (dd.sec >= 3 * 3600) trigger("marathon");
    if (dd.sec >= 5 * 3600) trigger("water");
    if (h >= 0 && h < 4 && dd.sec > 600) trigger("owl");
    if (h >= 5 && h < 7 && dd.sec > 600) trigger("bird");
    if ((wd === 0 || wd === 6) && dd.sec >= 3600) trigger("weekend");
    if (wd > 0 && wd < 6 && h >= 12 && h < 14 && dd.sec >= 1200) trigger("lunch");
    if (dd.dark >= 3600) trigger("dark");
    if (dd.sessions >= 3) trigger("commuter");
    [[10, "h10"], [25, "h25"], [50, "h50"], [100, "h100"]].forEach(function (x) { if (S.total >= x[0] * 3600) trigger(x[1]); });
    var prevBest = Object.keys(S.days).filter(function (x) { return x !== today(); }).reduce(function (m, x) { return Math.max(m, S.days[x].sec); }, 0);
    if (prevBest >= 3600 && dd.sec > prevBest) trigger("best");
    save();
  }, TICK * 1000);

  // ---------- reading: sections, end of note, pace ----------
  function readingMinutes() {
    var m = 0; (document.body.innerText.match(/~\s*(\d+)\s*min/g) || []).forEach(function (x) { m += parseInt(x.replace(/\D/g, ""), 10); });
    return m;
  }
  function watch(el, fn) {
    if (!el || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { threshold: .2 });
    io.observe(el);
  }
  function onReady() {
    visit();
    var hs = Array.prototype.slice.call(document.querySelectorAll("h2"));
    hs.forEach(function (h) {
      var tx = h.textContent.toLowerCase();
      if (/find the mistake/.test(tx)) watch(h, function () { trigger("spot"); });
      if (/common mistakes/.test(tx)) watch(h, function () { trigger("common"); });
      if (/last-minute checklist|before the exam/.test(tx)) watch(h, function () { trigger("checklist"); });
    });
    if (KIND === "note") {
      var end = document.querySelector("nav.packnav") || hs[hs.length - 1];
      watch(end, function () {
        if (pageSec < 60 && !TEST) return;
        trigger("endnote");
        S.noteDone = S.noteDone || {}; S.noteDone[COURSE + "/" + CHAP] = Date.now(); save();
        var rm = readingMinutes();
        if (rm >= 15 && pageSec < rm * 60 * 0.25) trigger("speed");
        if (rm >= 10 && pageSec > rm * 60 * 3) trigger("longway");
      });
    }
    if (KIND === "guide" && S.noteDone) {
      var key = Object.keys(S.noteDone).filter(function (k) { return k.indexOf(COURSE + "/") === 0 && CHAP && CHAP.indexOf(k.split("/")[1]) === 0; })[0];
      if (key && Date.now() - S.noteDone[key] < 30 * 60000) trigger("noteguide");
    }
    // the same page open in two tabs
    if ("BroadcastChannel" in window) {
      var bc = new BroadcastChannel("packs-finds");
      bc.onmessage = function (e) { if (e.data && e.data.page === location.pathname) { if (e.data.hi) bc.postMessage({ page: location.pathname, here: 1 }); trigger("tabs"); } };
      bc.postMessage({ page: location.pathname, hi: 1 });
    }
    if (KIND === "tree") treeHooks();
    if (mode === "all") Object.keys(FINDS).forEach(function (id) { queue.push(id); });
    setTimeout(pump, TEST ? 800 : 61000);
  }

  // ---------- tech tree ----------
  function treeHooks() {
    var D; try { D = DATA; } catch (e) { return; }   // the tree page's own data
    var tkey = D.course && D.course.key;
    function st() { try { return JSON.parse(localStorage.getItem(tkey) || "{}") || {}; } catch (e) { return {}; } }
    var before = st();
    var byId = {}; D.nodes.forEach(function (n) { byId[n.id] = n; });
    setInterval(function () {
      var now = st(), changed = false;
      Object.keys(now).forEach(function (id) {
        var was = before[id] || 0, is = now[id] || 0;
        if (is > was) {
          changed = true;
          if (is >= 1 && was < 1) {
            trigger("firsttick");
            var n = byId[id];
            if (n && n.pre.some(function (p) { return (now[p] || 0) < 1; })) trigger("rebel");
            if (n) {
              var inCh = D.nodes.filter(function (x) { return x.ch === n.ch && !x.optional; });
              if (inCh.every(function (x) { return (now[x.id] || 0) >= 1; })) {
                trigger("chapter");
                S.clears[COURSE] = S.clears[COURSE] || [];
                if (S.clears[COURSE].indexOf(n.ch) < 0) S.clears[COURSE].push(n.ch);
                var dd = day(); if (dd.clears.indexOf(COURSE) < 0) dd.clears.push(COURSE);
                if (Object.keys(S.clears).length >= 3) trigger("collector");
                if (dd.clears.length >= 2) trigger("doubleclear");
                save();
              }
              var inB = D.nodes.filter(function (x) { return x.b === n.b && !x.optional && !x.excluded; });
              if (D.branches.length > 1 && inB.every(function (x) { return (now[x.id] || 0) >= 1; })) trigger("branch");
            }
          }
          if (is === 2 && was < 2) trigger("practised");
        }
      });
      if (changed) before = now;
    }, 1500);
    // zoomed right out, then back in
    var wasFit = false;
    setInterval(function () {
      try {
        if (typeof scale === "number" && typeof minScale === "number") {
          if (scale <= minScale + 0.01) wasFit = true;
          else if (wasFit && scale >= 0.9) { wasFit = false; trigger("cartographer"); }
        }
      } catch (e) {}
    }, 1000);
    // a link from a concept into another chapter
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("#sheetIn [data-go]");
      if (!b) return;
      var to = byId[b.getAttribute("data-go")], from = document.querySelector(".node.sel");
      var fromN = from && byId[from.getAttribute("data-id")];
      if (to && fromN && to.ch !== fromN.ch) trigger("thread");
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady); else onReady();
})();
