// Renders Mistborn.xml (TEI) as an annotated reading edition.
(function () {
  "use strict";

  const TEI = "http://www.tei-c.org/ns/1.0";
  const $ = (id) => document.getElementById(id);
  const LABELS = { name: "Names", title: "Titles", place: "Places", org: "Organizations" };
  const TYPES = { persName: "name", roleName: "title", placeName: "place", orgName: "org" };

  function entityType(node) {
    const n = node.localName;
    if (TYPES[n]) return TYPES[n];
    if (n === "rs") return { person: "name", place: "place", org: "org" }[node.getAttribute("type")] || null;
    if (n === "seg") return node.getAttribute("ana") || null;
    return null;
  }

  const notes = [];          // { n, html, refId }
  const terms = {};          // type -> Map(key -> { label, ids: [] })
  const links = new Map();   // href -> label
  let entCount = 0;

  fetch("Mistborn.xml")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then((xml) => {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("The XML could not be parsed.");
      render(doc);
    })
    .catch((err) => {
      $("status").textContent = "Couldn't load the text (" + err.message + "). ";
      const a = document.createElement("a");
      a.href = "Mistborn.xml";
      a.textContent = "Open the source XML instead.";
      $("status").appendChild(a);
    });

  function first(doc, name) {
    return doc.getElementsByTagNameNS(TEI, name)[0];
  }
  function text(el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function render(doc) {
    // Header metadata
    const title = text(first(doc, "title")) || "Untitled";
    const author = text(first(doc, "author"));
    const publisher = text(first(doc, "publisher"));
    const editor = text(first(doc, "editor"));
    const date = text(first(doc, "date"));
    $("doc-title").textContent = title;
    document.title = title + " · Digital Edition";
    const parts = [];
    if (author) parts.push("by " + author);
    if (publisher) parts.push(publisher + (date ? ", " + formatDate(date) : ""));
    if (editor) parts.push("edited by " + editor);
    $("doc-byline").textContent = parts.join(" · ");

    // Body
    const body = first(doc, "body");
    const article = $("body");
    let words = 0;
    const paras = body.getElementsByTagNameNS(TEI, "p");
    for (const p of paras) {
      article.appendChild(convert(p));
      words += countWords(p);
    }
    $("status").remove();

    renderNotes();
    renderIndex();
    renderLinks();
    renderStats({ Paragraphs: paras.length, Words: words, Notes: notes.length, "Tagged terms": entCount });
    wireControls();
    if (window.matchMedia("(max-width: 52rem)").matches) $("index").closest("details").open = false;

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) { target.scrollIntoView(); flash(target); }
    }
  }

  // Word count of the reading text, excluding notes.
  function countWords(p) {
    const clone = p.cloneNode(true);
    for (const n of Array.from(clone.getElementsByTagNameNS(TEI, "note"))) n.remove();
    return clone.textContent.split(/\s+/).filter((w) => /\w/.test(w)).length;
  }

  function convert(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode("");

    const kids = (el) => { for (const c of node.childNodes) el.appendChild(convert(c)); return el; };

    switch (node.localName) {
      case "p": {
        const n = node.getAttribute("n");
        const el = document.createElement("p");
        el.className = "para";
        if (n) {
          el.id = "p-" + n;
          const a = document.createElement("a");
          a.className = "pnum";
          a.href = "#p-" + n;
          a.textContent = n;
          a.setAttribute("aria-label", "Paragraph " + n);
          el.appendChild(a);
        }
        return kids(el);
      }
      case "persName":
      case "roleName":
      case "placeName":
      case "orgName":
      case "rs":
      case "seg": {
        const type = entityType(node);
        if (!type) return kids(document.createElement("span"));
        const el = document.createElement("span");
        el.className = "ent ent-" + type;
        el.id = "t-" + (++entCount);
        // @key groups variant forms (e.g. "obligators", "Inquisitor") under one index entry.
        const label = node.getAttribute("key") || text(node);
        if (!terms[type]) terms[type] = new Map();
        const k = label.toLowerCase();
        if (!terms[type].has(k)) terms[type].set(k, { label, ids: [] });
        terms[type].get(k).ids.push(el.id);
        return kids(el);
      }
      case "ref": {
        const href = node.getAttribute("target");
        const el = document.createElement("a");
        el.className = "ext";
        if (href && /^https?:/.test(href)) {
          el.href = href;
          el.target = "_blank";
          el.rel = "noopener";
          if (!links.has(href)) links.set(href, text(node));
        }
        return kids(el);
      }
      case "note": {
        const n = notes.length + 1;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "noteref";
        btn.id = "nref-" + n;
        btn.textContent = n;
        btn.dataset.note = n;
        btn.setAttribute("aria-label", "Note " + n);
        const holder = document.createElement("span");
        kids(holder);
        notes.push({ n, html: holder.innerHTML });
        return btn;
      }
      default:
        return kids(document.createElement("span"));
    }
  }

  function renderNotes() {
    if (!notes.length) return;
    const ol = $("notes");
    for (const note of notes) {
      const li = document.createElement("li");
      li.id = "note-" + note.n;
      li.innerHTML = note.html;
      const back = document.createElement("a");
      back.href = "#nref-" + note.n;
      back.className = "back";
      back.textContent = "↩";
      back.setAttribute("aria-label", "Back to text");
      li.appendChild(back);
      ol.appendChild(li);
    }
    ol.parentElement.hidden = false;
  }

  function renderIndex() {
    const box = $("index");
    for (const type of Object.keys(LABELS).concat(Object.keys(terms).filter((t) => !LABELS[t]))) {
      const map = terms[type];
      if (!map) continue;
      const group = document.createElement("div");
      group.className = "idx-group";
      const h = document.createElement("h3");
      const sw = document.createElement("span");
      sw.className = "swatch ent-" + type;
      sw.textContent = LABELS[type] || type;
      h.appendChild(sw);
      group.appendChild(h);
      const ul = document.createElement("ul");
      const items = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
      for (const item of items) {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = item.label;
        let i = 0;
        b.addEventListener("click", () => {
          const el = $(item.ids[i % item.ids.length]);
          i++;
          el.scrollIntoView({ block: "center" });
          flash(el);
        });
        li.appendChild(b);
        if (item.ids.length > 1) {
          const c = document.createElement("span");
          c.className = "count";
          c.textContent = " ×" + item.ids.length;
          li.appendChild(c);
        }
        ul.appendChild(li);
      }
      group.appendChild(ul);
      box.appendChild(group);
    }
    if (!box.children.length) box.textContent = "No tagged terms.";
  }

  function renderLinks() {
    const ul = $("links");
    for (const [href, label] of links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      li.appendChild(a);
      ul.appendChild(li);
    }
    if (!links.size) ul.closest("details").hidden = true;
  }

  function renderStats(stats) {
    const dl = $("stats");
    for (const [k, v] of Object.entries(stats)) {
      const div = document.createElement("div");
      div.innerHTML = "<dt></dt><dd></dd>";
      div.firstChild.textContent = k;
      div.lastChild.textContent = v.toLocaleString();
      dl.appendChild(div);
    }
  }

  function wireControls() {
    const article = $("body");
    for (const box of document.querySelectorAll("#toggles input")) {
      box.addEventListener("change", () => article.classList.toggle("off-" + box.value, !box.checked));
    }
    $("toggle-pnum").addEventListener("change", (e) => article.classList.toggle("hide-pnum", !e.target.checked));

    // Footnote popovers
    const pop = $("popover");
    let openBtn = null;
    const close = () => {
      pop.hidden = true;
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      openBtn = null;
    };
    article.addEventListener("click", (e) => {
      const btn = e.target.closest(".noteref");
      if (!btn) return;
      if (openBtn === btn) { close(); return; }
      close();
      const note = notes[btn.dataset.note - 1];
      pop.innerHTML = '<span class="pop-n">' + note.n + ".</span>" + note.html;
      pop.hidden = false;
      openBtn = btn;
      btn.setAttribute("aria-expanded", "true");
      position(pop, btn);
    });
    document.addEventListener("click", (e) => {
      if (openBtn && !e.target.closest(".noteref") && !pop.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openBtn) { const b = openBtn; close(); b.focus(); }
    });
    window.addEventListener("resize", () => openBtn && position(pop, openBtn));
  }

  function position(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    const margin = 16;
    let left = r.left + window.scrollX + r.width / 2 - w / 2;
    left = Math.max(margin + window.scrollX, Math.min(left, window.scrollX + document.documentElement.clientWidth - w - margin));
    pop.style.left = left + "px";
    pop.style.top = r.bottom + window.scrollY + 8 + "px";
  }

  function flash(el) {
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1400);
  }

  function formatDate(s) {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return s;
    const d = new Date(+m[3], +m[1] - 1, +m[2]);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
})();
