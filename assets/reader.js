/* 公开栏目列表按期号日期分组，并在本机记下点开过的稿。
 * 不改期号 HTML。栏目 index 由 pub.py 重建，须在模板 </body> 前保留本脚本。
 * 图鉴 / 周末是密文，这里不请求、不解析。首页不加载本脚本。 */
(function () {
  var KEY = "daily-read:v1";
  var ISSUE = /(?:^|\/)(wubao|wanbao|blog)\/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var REL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var COLS = { wubao: "午报", wanbao: "晚报", blog: "每日博客" };
  var off = false;

  function padPath(href) {
    if (!href) return "";
    var clean = href.split("#")[0].split("?")[0];
    var abs = ISSUE.exec(clean);
    if (abs) return abs[1] + "/" + abs[2] + "-" + abs[3] + "-" + abs[4] + "T" + abs[5] + abs[6] + "-" + abs[7] + ".html";
    var rel = REL.exec(clean);
    if (!rel) return "";
    var col = document.body.getAttribute("data-col") || "";
    if (!COLS[col]) return "";
    return col + "/" + clean;
  }

  function beijing(now) {
    var t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }

  function dayText(y, m, d, today) {
    if (y === today.y) return m + "月" + d + "日";
    return y + "年" + m + "月" + d + "日";
  }

  function readMap() {
    if (off) return null;
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
      return obj;
    } catch (e) {
      off = true;
      return null;
    }
  }

  function writeMap(map) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map));
      return true;
    } catch (e) {
      off = true;
      return false;
    }
  }

  function css() {
    if (document.getElementById("reader-css")) return;
    var s = document.createElement("style");
    s.id = "reader-css";
    s.textContent = [
      ".day { margin: 22px 0 8px; font-size: 15px; font-weight: 600; color: #c8c5bc; letter-spacing: 0; }",
      ".day-row { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 6px; }",
      "@media (min-width: 640px) { .day-row { grid-template-columns: 1fr 1fr; } }",
      ".entry .item { margin-bottom: 0; min-width: 0; }",
      ".entry .item h2, .entry .item h2::after { white-space: nowrap; }",
      ".entry.is-read .item h2 { color: #c8c5bc; }"
    ].join("\n");
    document.head.appendChild(s);
  }

  function paint(entry, path) {
    var map = readMap();
    entry.classList.toggle("is-read", !!(map && map[path]));
  }

  function markRead(path) {
    var map = readMap();
    if (!map || map[path]) return;
    map[path] = 1;
    if (!writeMap(map)) return;
    var nodes = document.querySelectorAll(".entry");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-issue") === path) paint(nodes[i], path);
    }
  }

  function groupColumn() {
    var wrap = document.querySelector(".wrap");
    if (!wrap || wrap.getAttribute("data-reader") === "1") return;
    var items = [].slice.call(wrap.querySelectorAll("a.item"));
    if (!items.length) return;
    var groups = [];
    var by = {};
    items.forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
      var m = REL.exec(href);
      if (!m) return;
      var key = m[1] + m[2] + m[3];
      if (!by[key]) {
        by[key] = { y: +m[1], m: +m[2], d: +m[3], items: [] };
        groups.push(by[key]);
      }
      by[key].items.push(a);
    });
    if (!groups.length) return;
    wrap.setAttribute("data-reader", "1");
    var col = document.body.getAttribute("data-col") || "";
    var parent = items[0].parentNode;
    var marker = document.createComment("reader");
    parent.insertBefore(marker, items[0]);
    var today = beijing(new Date());
    groups.sort(function (a, b) { return (b.y * 10000 + b.m * 100 + b.d) - (a.y * 10000 + a.m * 100 + a.d); });
    groups.forEach(function (g) {
      var h = document.createElement("h2");
      h.className = "day";
      h.textContent = dayText(g.y, g.m, g.d, today);
      var row = document.createElement("div");
      row.className = "day-row";
      parent.insertBefore(h, marker);
      parent.insertBefore(row, marker);
      g.items.forEach(function (a) {
        var href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
        var path = col ? col + "/" + href : "";
        var entry = document.createElement("div");
        entry.className = "entry";
        if (path) entry.setAttribute("data-issue", path);
        row.appendChild(entry);
        entry.appendChild(a);
        if (path) paint(entry, path);
      });
    });
    parent.removeChild(marker);
  }

  function knownCol() {
    var m = /\/(wubao|wanbao|blog)(?:\/|$)/.exec(location.pathname);
    if (m) document.body.setAttribute("data-col", m[1]);
  }

  function onActivate(e) {
    if (e.button != null && e.button !== 0 && e.button !== 1) return;
    var node = e.target;
    if (!node || !node.closest) return;
    var a = node.closest("a[href]");
    if (!a) return;
    var path = padPath(a.getAttribute("href"));
    if (path) markRead(path);
  }

  function repaint() {
    if (off) return;
    var nodes = document.querySelectorAll(".entry");
    for (var i = 0; i < nodes.length; i++) {
      var path = nodes[i].getAttribute("data-issue");
      if (path) paint(nodes[i], path);
    }
  }

  css();
  knownCol();
  groupColumn();
  document.addEventListener("click", onActivate, true);
  document.addEventListener("auxclick", onActivate, true);
  window.addEventListener("pageshow", repaint);
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    repaint();
  });
})();
