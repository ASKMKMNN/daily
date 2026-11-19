/* 首页今日聚合、栏目日期分组、本机已读。
 * 不改期号 HTML。栏目 index 由 pub.py 重建，须在模板 </body> 前保留本脚本。
 * 图鉴 / 周末是密文，这里不请求、不解析。 */
(function () {
  var KEY = "daily-read:v1";
  var ISSUE = /(?:^|\/)(wubao|wanbao|blog)\/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var REL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var COLS = { wubao: "午报", wanbao: "晚报", blog: "每日博客" };
  var WHO = { lg: "灵光", wb: "WB", gb: "Grok" };
  var PUBLIC = ["wubao/", "wanbao/", "blog/"];
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

  function dropMarks() {
    var btns = document.querySelectorAll(".mark");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].parentNode) btns[i].parentNode.removeChild(btns[i]);
    }
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
      dropMarks();
      return null;
    }
  }

  function writeMap(map) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map));
      return true;
    } catch (e) {
      off = true;
      dropMarks();
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
      ".entry { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; min-width: 0; }",
      ".entry .item { margin-bottom: 0; min-width: 0; }",
      ".entry .item h2, .entry .item h2::after { white-space: nowrap; }",
      ".mark { margin: 0; padding: 4px 8px; font: 12.5px/1.3 -apple-system, \"PingFang SC\", \"Microsoft YaHei\", sans-serif; color: #c8c5bc; background: transparent; border: 1px solid #3d3c35; border-radius: 999px; cursor: pointer; }",
      ".mark:focus-visible { outline: 2px solid #c8c5bc; outline-offset: 3px; }",
      ".entry.is-read .item h2 { color: #c8c5bc; }",
      ".today { max-width: 1080px; margin: 28px auto 0; }",
      ".today h2 { font-size: 16px; font-weight: 600; letter-spacing: 0; margin: 0 0 10px; }",
      ".today-list { list-style: none; display: grid; gap: 8px; }",
      "@media (min-width: 760px) { .today-list { grid-template-columns: 1fr 1fr; } }",
      ".today-entry { min-width: 0; }",
      ".today-link { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; min-width: 0; padding: 12px 14px; background: #22221f; border: 1px solid #33322e; border-radius: 14px; color: inherit; text-decoration: none; }",
      ".today-link b { font-size: 16px; font-weight: 600; }",
      ".today-link .who, .today-link .when { font-size: 14px; color: #c8c5bc; }",
      ".today-link:focus-visible { outline: 2px solid #c8c5bc; outline-offset: 3px; }",
      ".today-empty { color: #b7b3a8; font-size: 14px; line-height: 1.6; }",
      ".today-entry.is-read .today-link b { color: #c8c5bc; }"
    ].join("\n");
    document.head.appendChild(s);
  }

  function paint(entry, path) {
    var map = readMap();
    var on = !!(map && map[path]);
    entry.classList.toggle("is-read", on);
    var btn = entry.querySelector(".mark");
    if (!btn) return;
    btn.textContent = on ? "已读" : "未读";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function addMark(entry, path) {
    if (!path || !readMap()) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mark";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var map = readMap();
      if (!map) return;
      if (map[path]) delete map[path];
      else map[path] = 1;
      if (!writeMap(map)) return;
      paint(entry, path);
    });
    entry.appendChild(btn);
    paint(entry, path);
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
        if (path) addMark(entry, path);
      });
    });
    parent.removeChild(marker);
  }

  function knownCol() {
    var m = /\/(wubao|wanbao|blog)(?:\/|$)/.exec(location.pathname);
    if (m) document.body.setAttribute("data-col", m[1]);
  }

  function parseList(html, col) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var out = [];
    var links = doc.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = REL.exec(href.split("#")[0].split("?")[0]);
      if (!m) continue;
      var y = +m[1], mo = +m[2], d = +m[3];
      var dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) continue;
      out.push({
        col: col,
        y: y, m: mo, d: d,
        hh: m[4], mm: m[5], author: m[6],
        path: col + "/" + m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + m[5] + "-" + m[6] + ".html"
      });
    }
    return out;
  }

  function fillToday(sec, rows, failed) {
    sec.textContent = "";
    var h = document.createElement("h2");
    h.textContent = "今天";
    sec.appendChild(h);
    if (!rows) {
      var bad = document.createElement("p");
      bad.className = "today-empty";
      bad.textContent = "公开列表暂时没取到。";
      sec.appendChild(bad);
      return;
    }
    if (!rows.length) {
      var none = document.createElement("p");
      none.className = "today-empty";
      none.textContent = failed ? "公开列表暂时没取到。" : "今天还没有公开稿。";
      sec.appendChild(none);
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "today-list";
    rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "today-entry entry";
      li.setAttribute("data-issue", row.path);
      var a = document.createElement("a");
      a.className = "today-link";
      a.href = row.path;
      var b = document.createElement("b");
      b.textContent = COLS[row.col];
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = WHO[row.author] || row.author;
      var when = document.createElement("span");
      when.className = "when";
      when.textContent = row.hh + ":" + row.mm;
      a.appendChild(b);
      a.appendChild(who);
      a.appendChild(when);
      li.appendChild(a);
      ul.appendChild(li);
      addMark(li, row.path);
    });
    sec.appendChild(ul);
  }

  function loadToday() {
    if (!document.querySelector("main.grid")) return;
    var footer = document.querySelector("footer");
    if (!footer || document.querySelector(".today")) return;
    var sec = document.createElement("section");
    sec.className = "today";
    sec.setAttribute("aria-label", "今天的公开稿");
    footer.parentNode.insertBefore(sec, footer);
    var today = beijing(new Date());
    var pending = PUBLIC.length;
    var rows = [];
    var failed = 0;
    PUBLIC.forEach(function (feed) {
      var col = feed.slice(0, -1);
      fetch(feed, { credentials: "same-origin", cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("bad");
          return res.text();
        })
        .then(function (html) {
          if (!html || html.length > 500000) throw new Error("bad");
          parseList(html, col).forEach(function (row) {
            if (row.y === today.y && row.m === today.m && row.d === today.d) rows.push(row);
          });
        })
        .catch(function () { failed += 1; })
        .then(function () {
          pending -= 1;
          if (pending) return;
          rows.sort(function (a, b) {
            var ta = a.hh + a.mm;
            var tb = b.hh + b.mm;
            if (ta !== tb) return ta < tb ? 1 : -1;
            if (a.col !== b.col) return a.col < b.col ? -1 : 1;
            if (a.author === b.author) return 0;
            return a.author < b.author ? -1 : 1;
          });
          fillToday(sec, failed === PUBLIC.length ? null : rows, failed > 0 && !rows.length);
        });
    });
  }

  function onActivate(e) {
    if (e.button != null && e.button !== 0 && e.button !== 1) return;
    var node = e.target;
    if (!node || !node.closest) return;
    if (node.closest("button")) return;
    var a = node.closest("a[href]");
    if (!a) return;
    var path = padPath(a.getAttribute("href"));
    if (path) markRead(path);
  }

  css();
  knownCol();
  groupColumn();
  loadToday();
  document.addEventListener("click", onActivate, true);
  document.addEventListener("auxclick", onActivate, true);
  function repaint() {
    if (off) {
      dropMarks();
      return;
    }
    var nodes = document.querySelectorAll(".entry");
    for (var i = 0; i < nodes.length; i++) {
      var path = nodes[i].getAttribute("data-issue");
      if (path) paint(nodes[i], path);
    }
  }

  window.addEventListener("pageshow", repaint);
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    repaint();
  });
})();
