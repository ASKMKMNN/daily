/* 公开栏目列表按期号日期分组，并在本机记下点开过的稿。
 * 不改期号 HTML。栏目 index 由 pub.py 重建，须在模板 </body> 前保留本脚本。
 * 图鉴 / 周末是密文，这里不请求、不解析。首页不加载本脚本。
 * /daily/read.html 也加载本脚本：正文用 iframe 打开原期号页，「往期」列出该栏目全部期号。 */
(function () {
  var KEY = "daily-read:v1";
  var ISSUE = /(?:^|\/)(wubao|wanbao|blog)\/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var REL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})-([a-z]{2})\.html$/;
  var PATH = /^(wubao|wanbao|blog)\/(\d{4}-\d{2}-\d{2}T\d{4}-[a-z]{2}\.html)$/;
  var COLS = { wubao: "午报", wanbao: "晚报", blog: "每日博客" };
  var NARROW = "(max-width: 759px)";
  var off = false;
  var currentCol = "";
  var currentFile = "";
  var archiveToken = 0;

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

  function readerRoot() {
    return document.getElementById("reader-app");
  }

  function hashPath() {
    var raw = location.hash ? location.hash.slice(1) : "";
    if (!raw) return "";
    try { raw = decodeURIComponent(raw); } catch (e) { return ""; }
    return PATH.test(raw) ? raw : "";
  }

  function narrow() {
    return window.matchMedia(NARROW).matches;
  }

  function setOpen(open) {
    var side = document.getElementById("reader-side");
    var btn = document.getElementById("reader-toggle");
    var backdrop = document.getElementById("reader-backdrop");
    if (!side || !btn) return;
    side.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) backdrop.hidden = !open || !narrow();
    if (!open) return;
    var cur = side.querySelector("[aria-current='page']");
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  }

  function highlight(path) {
    var nodes = document.querySelectorAll("#reader-list .entry");
    for (var i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute("data-issue") === path;
      var a = nodes[i].querySelector("a.item");
      if (!a) continue;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function note(list, text) {
    clearNode(list);
    var p = document.createElement("p");
    p.className = "reader-note";
    p.textContent = text;
    list.appendChild(p);
  }

  function renderSide(items, col, activePath) {
    var list = document.getElementById("reader-list");
    if (!list) return;
    clearNode(list);
    if (!items.length) {
      note(list, "这一栏还没有期号");
      return;
    }
    var today = beijing(new Date());
    var groups = [];
    var by = {};
    items.forEach(function (it) {
      var key = it.y * 10000 + it.m * 100 + it.d;
      if (!by[key]) {
        by[key] = { y: it.y, m: it.m, d: it.d, key: key, items: [] };
        groups.push(by[key]);
      }
      by[key].items.push(it);
    });
    groups.sort(function (a, b) { return b.key - a.key; });
    groups.forEach(function (g) {
      var h = document.createElement("h2");
      h.className = "day";
      h.textContent = dayText(g.y, g.m, g.d, today);
      list.appendChild(h);
      g.items.forEach(function (it) {
        var path = col + "/" + it.file;
        var entry = document.createElement("div");
        entry.className = "entry";
        entry.setAttribute("data-issue", path);
        var a = document.createElement("a");
        a.className = "item";
        a.href = "/daily/" + path;
        var h2 = document.createElement("h2");
        h2.textContent = it.label;
        a.appendChild(h2);
        if (it.title) a.setAttribute("title", it.title);
        entry.appendChild(a);
        list.appendChild(entry);
        paint(entry, path);
      });
    });
    highlight(activePath);
  }

  function parseItems(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var links = doc.querySelectorAll("a.item[href]");
    var out = [];
    for (var i = 0; i < links.length; i++) {
      var href = (links[i].getAttribute("href") || "").split("#")[0].split("?")[0];
      if (href.indexOf("./") === 0) href = href.slice(2);
      var m = REL.exec(href);
      if (!m) continue;
      var hh = +m[4];
      var mm = +m[5];
      if (hh > 23 || mm > 59) continue;
      var span = links[i].querySelector("span");
      var h2 = links[i].querySelector("h2");
      var label = span ? span.textContent.replace(/\s+/g, " ").trim() : "";
      if (!label) label = m[4] + ":" + m[5];
      out.push({
        file: href,
        y: +m[1],
        m: +m[2],
        d: +m[3],
        label: label,
        title: h2 ? h2.textContent.replace(/\s+/g, " ").trim() : ""
      });
    }
    return out;
  }

  function loadArchive(col) {
    var list = document.getElementById("reader-list");
    var token = ++archiveToken;
    if (list) note(list, "正在载入…");
    fetch("/daily/" + col + "/", { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("bad");
        return res.text();
      })
      .then(function (html) {
        if (token !== archiveToken || col !== currentCol) return;
        if (!html || html.length > 500000) throw new Error("bad");
        renderSide(parseItems(html), col, currentCol + "/" + currentFile);
      })
      .catch(function () {
        if (token !== archiveToken || col !== currentCol || !list) return;
        note(list, "往期暂时打不开");
      });
  }

  function syncFrame(url) {
    var frame = document.getElementById("reader-frame");
    if (!frame) return;
    if (frame.getAttribute("data-on") === "1") {
      try {
        frame.contentWindow.location.replace(url);
        return;
      } catch (e) {}
    }
    frame.setAttribute("data-on", "1");
    frame.src = url;
  }

  function showEmpty() {
    var frame = document.getElementById("reader-frame");
    var empty = document.getElementById("reader-empty");
    var label = document.getElementById("reader-col");
    if (label) label.textContent = "每日情报";
    if (frame) frame.hidden = true;
    if (empty) empty.hidden = false;
    var list = document.getElementById("reader-list");
    if (list) note(list, "从首页打开一期");
  }

  function showIssue(path) {
    var m = PATH.exec(path);
    if (!m) return;
    var col = m[1];
    var file = m[2];
    var colChanged = col !== currentCol;
    currentCol = col;
    currentFile = file;
    var label = document.getElementById("reader-col");
    if (label) label.textContent = COLS[col];
    var all = document.getElementById("reader-all");
    if (all) all.setAttribute("href", "/daily/" + col + "/");
    var frame = document.getElementById("reader-frame");
    var empty = document.getElementById("reader-empty");
    if (frame) frame.hidden = false;
    if (empty) empty.hidden = true;
    var app = readerRoot();
    if (app) app.setAttribute("data-reading", path);
    markRead(path);
    if (colChanged) loadArchive(col);
    else highlight(path);
    syncFrame("/daily/" + path);
  }

  function bootReader() {
    if (!readerRoot()) return;
    var toggle = document.getElementById("reader-toggle");
    var closeBtn = document.getElementById("reader-close");
    var backdrop = document.getElementById("reader-backdrop");
    var frame = document.getElementById("reader-frame");
    if (toggle) {
      toggle.addEventListener("click", function () {
        setOpen(toggle.getAttribute("aria-expanded") !== "true");
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setOpen(false);
        if (toggle) toggle.focus();
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setOpen(false);
        if (toggle) toggle.focus();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var side = document.getElementById("reader-side");
      if (!side || side.hidden) return;
      setOpen(false);
      if (toggle) toggle.focus();
    });
    if (frame) {
      frame.addEventListener("load", function () {
        try {
          var t = frame.contentDocument && frame.contentDocument.title;
          if (t) {
            document.title = t;
            frame.title = t;
          }
        } catch (err) {}
      });
    }
    var mq = window.matchMedia(NARROW);
    var onMq = function () {
      var side = document.getElementById("reader-side");
      if (!side || side.hidden) return;
      setOpen(true);
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
    setOpen(false);
    var path = hashPath();
    if (!path) {
      showEmpty();
      return;
    }
    showIssue(path);
    window.addEventListener("hashchange", function () {
      var next = hashPath();
      if (!next || next === currentCol + "/" + currentFile) return;
      showIssue(next);
    });
  }

  function onOpen(e) {
    if (e.defaultPrevented) return;
    if (e.button != null && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var node = e.target;
    if (!node || !node.closest) return;
    var a = node.closest("a.item");
    if (!a) return;
    var path = padPath(a.getAttribute("href"));
    if (!PATH.test(path)) return;
    e.preventDefault();
    if (readerRoot()) {
      if (hashPath() !== path) location.hash = path;
      if (narrow()) setOpen(false);
      return;
    }
    location.href = "/daily/read.html#" + path;
  }

  css();
  knownCol();
  groupColumn();
  bootReader();
  document.addEventListener("click", onActivate, true);
  document.addEventListener("auxclick", onActivate, true);
  document.addEventListener("click", onOpen);
  window.addEventListener("pageshow", repaint);
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    repaint();
  });
})();
