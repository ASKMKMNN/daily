/* 每日情报站 · 分享模式（2026-11-25）
   目的：把站点链接发给家人 / 同事时，看不到加密两栏（每日图鉴、周末推荐）。
   默认就是分享模式；页脚 2.5 秒内连点 5 下切到完整模式，再连点 5 下切回。
   应急：?full=1 开完整模式，?share=1 复位（仅自己用，不对外宣传）。
   注意：这是「看不见」，不是「拿不到」——加密两栏仍有密码门。 */
(function () {
  var KEY = "daily-mode";
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function mode() {
    return stored() === "full" ? "full" : "share";   // 没存过 = 分享模式
  }
  function apply(m) { root.setAttribute("data-mode", m); }
  function save(m) {
    try { localStorage.setItem(KEY, m); } catch (e) {}
    apply(m);
  }

  // 1) 先落属性：CSS 用 html:not([data-mode="full"]) 藏，脚本失败也不会露出
  apply(mode());

  // 2) 应急开关
  var q = location.search;
  if (/[?&]full=1\b/.test(q)) save("full");
  if (/[?&]share=1\b/.test(q)) save("share");

  // 3) 分享模式：直链进加密栏目、或用阅读器打开加密栏 → 回首页
  if (mode() !== "full") {
    var p = location.pathname;
    if (/\/daily\/(tujian|weekly)(\/|$)/.test(p)) { location.replace("/daily/"); return; }
    if (/\/daily\/read\.html$/.test(p) && /[?&]c=(tujian|weekly)\b/.test(location.search)) {
      location.replace("/daily/"); return;
    }
  }

  // 4) 切换手势：页脚连点 5 下
  function style() {
    var s = document.createElement("style");
    s.textContent =
      ".mode-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);" +
      "background:#22221f;color:#e8e6e1;border:1px solid #33322e;border-radius:999px;" +
      "padding:9px 16px;font:14px/1.4 -apple-system,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;" +
      "z-index:99;opacity:1;transition:opacity .4s;pointer-events:none;max-width:86vw;text-align:center}" +
      ".mode-toast.is-out{opacity:0}";
    document.head.appendChild(s);
  }
  function toast(text) {
    style();
    var d = document.createElement("div");
    d.className = "mode-toast";
    d.setAttribute("role", "status");
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(function () { d.className = "mode-toast is-out"; }, 1300);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1800);
  }
  function toggle() {
    var next = mode() === "full" ? "share" : "full";
    save(next);
    toast(next === "full" ? "完整模式：含图鉴、周末推荐" : "分享模式：私密栏目已隐藏");
  }

  var host = document.querySelector("footer");
  if (host) {
    var hits = [];
    host.addEventListener("click", function () {
      var now = Date.now();
      hits = hits.filter(function (t) { return now - t < 2500; });
      hits.push(now);
      if (hits.length >= 5) { hits = []; toggle(); }
    }, { passive: true });
  }
})();
