// ====== DASHBOARD (gestore) ======
// Schede: Prodotti (replica della home con ordine), Annunci, Sconti e coupon, Categorie, Info.
// Le bozze dei moduli stanno in S.d: così non si perde nulla quando il sito si aggiorna.

var TABS = [["prod", "Prodotti"], ["ads", "Annunci"], ["notifs", "Notifiche"], ["reviews", "Recensioni"], ["sales", "Sconti"], ["cats", "Categorie"], ["info", "Info"], ["clients", "Clienti"]];
var GRIP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="5" r="2"/><circle cx="16" cy="5" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/></svg>';

function admin() {
  var body = {prod:aProd, ads:aAds, notifs:aNotifs, reviews:aReviews, sales:aSales, cats:aCats, info:aInfo, clients:aClients}[S.tab] || aProd;
  return '<div class="bar"><button class="l" onclick="go(\'amenu\')">← Menu gestore</button> &nbsp;&nbsp; <button class="l" onclick="go(\'shop\')">Vai al negozio</button></div>' +
    '<div class="tabs">' + TABS.map(function (t) { return '<button class="' + (S.tab === t[0] ? "on" : "") + '" onclick="setTab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join("") + '</div>' + body();
}
function setTab(t) { S.tab = t; S.edit = null; S.d = {}; S.adEdit = S.slEdit = S.cpEdit = S.infEdit = S.nfEdit = S.revEdit = null; R(); window.scrollTo(0, 0); }

// ---------- piccoli attrezzi per i moduli ----------
function byId(a, id) { return a.filter(function (x) { return x.id === id; })[0]; }
function dset(f, k, v) { (S.d[f] = S.d[f] || {})[k] = v; }
function dtog(f, k, id, on) { var a = S.d[f][k] = S.d[f][k] || [], i = a.indexOf(id); if (on && i < 0) a.push(id); if (!on && i > -1) a.splice(i, 1); }
function dv(f, k) { var v = (S.d[f] || {})[k]; return v == null ? "" : v; }
function fi(f, k, label, o) {
  o = o || {};
  return (label ? '<label>' + label + '</label>' : '') + '<input ' + (o.type ? 'type="' + o.type + '" ' : '') + (o.step ? 'step="' + o.step + '" ' : '') + (o.ph ? 'placeholder="' + esc(o.ph) + '" ' : '') +
    (o.dis ? 'disabled ' : '') + 'value="' + esc(dv(f, k)) + '" oninput="dset(\'' + f + '\',\'' + k + '\',this.value)">';
}
function ft(f, k, label, rows) { return '<label>' + label + '</label><textarea rows="' + (rows || 3) + '" oninput="dset(\'' + f + '\',\'' + k + '\',this.value)">' + esc(dv(f, k)) + '</textarea>'; }
function fsel(f, k, label, opts, re) {
  return '<label>' + label + '</label><select onchange="dset(\'' + f + '\',\'' + k + '\',this.value)' + (re ? ';R()' : '') + '">' +
    opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(dv(f, k)) === String(o[0]) ? " selected" : "") + '>' + esc(o[1]) + '</option>'; }).join("") + '</select>';
}
function fchk(f, k, label) { return '<div class="chk"><input type="checkbox" ' + (dv(f, k) ? "checked" : "") + ' onchange="dset(\'' + f + '\',\'' + k + '\',this.checked)"><label style="margin:0">' + label + '</label></div>'; }
function fmtD(t) { return new Date(t).toLocaleString("it-IT", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}); }
function durOpts(until) {
  var o = [["0", "Sempre (finché non lo elimini)"], ["1", "1 giorno"], ["3", "3 giorni"], ["7", "1 settimana"], ["14", "2 settimane"], ["30", "1 mese"]];
  if (until) o.unshift(["keep", (until > Date.now() ? "Mantieni (scade il " : "Mantieni (scaduto il ") + fmtD(until) + ")"]);
  return o;
}
function untilOf(dur, old) { return dur === "keep" ? (old || 0) : (!dur || dur === "0") ? 0 : Date.now() + Number(dur) * 864e5; }
function stOf(x) { return x.on === false ? "disattivato" : x.until ? (x.until > Date.now() ? "attivo · scade il " + fmtD(x.until) : "scaduto il " + fmtD(x.until)) : "attivo · sempre"; }
function hd(t) { return '<div class="sh">' + t + '</div>'; }
function arow(img, title, sub, ed, tog, del, on, pre) {
  return '<div class="row ar"><div class="t">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + '</div><div class="i">' + esc(title) + '<div class="m">' + sub + '</div></div>' +
    '<div class="act">' + (pre || "") + '<button class="sm" onclick="' + ed + '">Modifica</button><button class="sm" onclick="' + tog + '">' + (on ? "Disattiva" : "Attiva") + '</button><button class="sm dg" onclick="' + del + '">Elimina</button></div></div>';
}
function formBtns(save, cancel, label, editing) {
  return '<button class="gr" onclick="' + save + '">' + label + '</button> ' + (editing ? '<button class="l" onclick="' + cancel + '">Annulla</button>' : '');
}
function shrink(file, max, q, cb) {
  var r = new FileReader();
  r.onerror = function () { cb(null); };
  r.onload = function () {
    var im = new Image();
    im.onerror = function () { cb(null); };
    im.onload = function () {
      var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = im.width * k; c.height = im.height * k; var x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", q));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

// ---------- scheda PRODOTTI: replica della home ----------
function aProd() {
  if (S.edit) return pForm();
  var l = ordered();
  return '<div class="bar"><button class="pri" onclick="pEdit(\'new\')">+ Nuovo prodotto</button></div>' +
    (l.length ? '<p class="m hint">Questa è la home «Tutto». Tieni premuto <b>⠿</b> e trascina un prodotto su un altro (oppure usa ‹ ›) per decidere chi viene prima: i clienti lo vedono subito. Tocca la foto per modificare.</p>' +
      '<div class="grid adm">' + l.map(function (s) {
        var n = photosOf(s).length, img = thumb(s, 0);
        return '<div class="card ac' + (s.avail ? '' : ' out') + '" data-id="' + s.id + '"><div class="ph" onclick="pEdit(\'' + s.id + '\')">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + (n > 1 ? '<span class="cnt">' + n + ' foto</span>' : '') + (s.avail ? '' : '<span class="cnt ex">Esaurito</span>') + '</div>' +
          '<div class="mvr"><button class="sm" onclick="pMove(\'' + s.id + '\',-1)" aria-label="Sposta prima">‹</button><span class="grip" title="Trascina">' + GRIP + '</span><button class="sm" onclick="pMove(\'' + s.id + '\',1)" aria-label="Sposta dopo">›</button></div>' +
          '<div class="tt">' + esc(s.name) + '</div><div class="pr">' + priceH(priceOf(s, 0)) + '</div>' +
          '<div class="act"><button class="sm" onclick="pEdit(\'' + s.id + '\')">Modifica</button><button class="sm" onclick="pTog(\'' + s.id + '\')">' + (s.avail ? 'Esaurito' : 'Disponibile') + '</button><button class="sm dg" onclick="pDel(\'' + s.id + '\')">Elimina</button></div></div>';
      }).join("") + '</div>' : '<p class="m">Nessun prodotto. Aggiungine uno.</p>');
}
function newPid() { return "p" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
function kbOf(src) { return Math.round(String(src || "").length * .75 / 1024); }
function pEdit(id) {
  S.edit = id; var s = id === "new" ? null : shoe(id);
  if (!s) { S.d = {p:{name:"", price:"", sizes:"", avail:true, desc:"", descPos:"bottom", vt:"colori", photos:[], orig:{}, loading:false}}; R(); window.scrollTo(0, 0); return; }
  var orig = {}, ph = photosOf(s).map(function (x, i) {
    var pid = x.id || newPid(); orig[pid] = x.src || !x.id ? "inline" : "sub";            // dove si trovava l'immagine: dentro il prodotto o nella sottoraccolta
    return {id:pid, name:x.name || "", price:x.price == null ? "" : x.price, src:photoSrc(s, i)};
  });
  var need = ph.some(function (p) { return !p.src; });
  S.d = {p:{name:s.name, price:s.price, sizes:s.sizes || "", avail:!!s.avail, desc:s.desc || "", descPos:s.descPos || "bottom", vt:s.vt || "colori", photos:ph, orig:orig, loading:need}};
  R(); window.scrollTo(0, 0);
  if (need) loadImgs(id, function (ok) {
    var d = S.d.p; if (!d || S.edit !== id) return;
    d.photos.forEach(function (p) { if (!p.src) p.src = ((S.pc[id] || {})[p.id]) || ""; });
    d.loading = false; d.loadErr = d.photos.some(function (p) { return !p.src; }); R();
  });
}
function pForm() {
  var d = S.d.p, n = d.photos.length, tot = d.photos.reduce(function (t, x) { return t + kbOf(x.src); }, 0);
  var ph = d.photos.map(function (p, i) {
    return '<div class="pho"><div class="t">' + (p.src ? '<img src="' + esc(p.src) + '" alt="">' : '<div class="skl" style="height:100%"></div>') + '</div><div class="pf">' + (i ? '' : '<span class="tag2">Principale</span>') + '<span class="kb">' + (p.src ? kbOf(p.src) + ' KB' : '…') + '</span>' +
      '<input placeholder="' + (d.vt === "stili" ? "Stile (es. Classico)" : "Colore (es. Nero)") + '" value="' + esc(p.name) + '" oninput="phset(' + i + ',\'name\',this.value)">' +
      '<input type="number" step="0.01" placeholder="Prezzo € (vuoto = prezzo base)" value="' + esc(p.price) + '" oninput="phset(' + i + ',\'price\',this.value)"></div>' +
      '<div class="act2"><button class="sm" onclick="phmv(' + i + ',-1)" aria-label="Prima">‹</button><button class="sm" onclick="phmv(' + i + ',1)" aria-label="Dopo">›</button><button class="sm dg" onclick="phdel(' + i + ')" aria-label="Rimuovi">✕</button></div></div>';
  }).join("");
  return '<div class="form"><div class="m" style="margin-bottom:10px">' + (S.edit === "new" ? "Nuovo prodotto" : "Modifica prodotto") + '</div>' +
    fi("p", "name", "Nome") +
    '<div class="two"><div>' + fi("p", "price", "Prezzo base (€)", {type:"number", step:"0.01"}) + '</div><div>' + fi("p", "sizes", "Taglie (es. 40, 41, 42)") + '</div></div>' +
    ft("p", "desc", "Descrizione (facoltativa)", 3) + fsel("p", "descPos", "Dove mostrarla nella scheda prodotto", [["bottom", "Sotto la foto"], ["top", "Sopra la foto"]]) +
    fsel("p", "vt", "Le foto sotto sono…", [["colori", "Colori"], ["stili", "Stili"]]) +
    '<label>Foto (' + n + ' · peso totale ' + tot + ' KB)</label><p class="m" style="margin:0 0 6px">Nessun limite: aggiungi quanti ' + (d.vt === "stili" ? "stili" : "colori") + ' vuoi. La prima è l’immagine principale; chi apre il prodotto scorre le altre con il dito. Se un colore/stile costa diverso, scrivi il suo prezzo.</p>' +
    (d.loading ? '<div class="skl" style="height:70px;margin:8px 0"></div><p class="m">Carico le foto del prodotto…</p>' : d.loadErr ? '<div class="pmw">⚠ Alcune foto non si sono caricate: controlla la connessione e riapri il prodotto prima di salvare.</div>' : '') + ph +
    '<input type="file" accept="image/png,image/webp,image/*" multiple onchange="pPick(this)" style="margin-top:8px"><p class="m" style="margin:-4px 0 10px">Carica foto PNG o WebP già senza sfondo: le centro, le converto in WebP leggero e ti mostro il peso prima di salvare.</p>' +
    fchk("p", "avail", "Disponibile") + formBtns("pSave()", "S.edit=null;S.d={};R()", "Salva", true) + '</div>';
}
function phset(i, k, v) { S.d.p.photos[i][k] = v; }
function phmv(i, d) { var a = S.d.p.photos, j = i + d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); R(); }
function phdel(i) { S.d.p.photos.splice(i, 1); R(); }

// ---------- foto prodotto: centratura e conversione in WebP leggero (tutto nel browser, nessun servizio esterno) ----------
// La foto (PNG o WebP) già senza sfondo viene ritagliata sul riquadro reale della scarpa, scalata senza deformarla, centrata
// in un quadrato trasparente e salvata in WebP con la qualità più bassa che resta bella. Si vede il peso e si decide se usarla.
var IMG_TARGET = 60000;                                          // peso obiettivo di una foto (≈ 45 KB)
function loadImg(file) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(file), im = new Image();
    im.onload = function () { URL.revokeObjectURL(u); res(im); };
    im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("formato immagine non leggibile")); };
    im.src = u;
  });
}
function encQ(canvas, q) { return canvas.toDataURL("image/webp", q); }
function plainResize(im, max, budget) {                         // l'originale, solo ridimensionato: nessun ritaglio, trasparenza mantenuta
  var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  var q = .85, u = encQ(c, q);
  while (u.indexOf("data:image/webp") === 0 && u.length > budget && q > .45) { q -= .08; u = encQ(c, q); }
  return u;
}
function drawBox(res, T) {                                       // quadrato T×T con la scarpa centrata, stessa grandezza visiva per tutte
  var s = Math.min(.86 * T / res.bw, .78 * T / res.bh), dw = Math.round(res.bw * s), dh = Math.round(res.bh * s), oc = document.createElement("canvas");
  oc.width = oc.height = T;
  var o = oc.getContext("2d"); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = "high";
  o.drawImage(res.im, res.bx, res.by, res.bw, res.bh, Math.round((T - dw) / 2), Math.round((T - dh) / 2), dw, dh);
  res.scale = s; return oc;
}
function autoEncode(res) {                                       // sceglie qualità (ed eventualmente 800 px) per stare sotto il peso obiettivo
  var sizes = [1000, 800], best = null;
  for (var k = 0; k < sizes.length; k++) {
    var c = drawBox(res, sizes[k]);
    for (var q = .85; q >= .449; q -= .05) {
      var u = encQ(c, q);
      if (u.indexOf("data:image/webp") !== 0) return {T:sizes[0], q:null, src:u, webp:false};   // il browser non sa creare WebP: PNG
      best = {T:sizes[k], q:Math.round(q * 100) / 100, src:u, webp:true};
      if (u.length <= IMG_TARGET) return best;
    }
  }
  return best;
}
function uniformize(file) {
  return loadImg(file).then(function (im) {
    var W = im.naturalWidth, H = im.naturalHeight, warn = [];
    if (!W || !H) throw new Error("immagine vuota");
    var k = Math.min(1, 1400 / Math.max(W, H)), aw = Math.max(1, Math.round(W * k)), ah = Math.max(1, Math.round(H * k)), ac = document.createElement("canvas");
    ac.width = aw; ac.height = ah;
    var actx = ac.getContext("2d", {willReadFrequently:true}); actx.drawImage(im, 0, 0, aw, ah);
    var d = actx.getImageData(0, 0, aw, ah).data, minX = aw, minY = ah, maxX = -1, maxY = -1, clear = 0, x, y;
    for (y = 0; y < ah; y++) for (x = 0; x < aw; x++) {         // riquadro dei pixel non trasparenti
      if (d[(y * aw + x) * 4 + 3] > 12) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } else clear++;
    }
    if (maxX < 0) throw new Error("l'immagine è completamente trasparente");
    if (clear / (aw * ah) < .02) warn.push("L'immagine non sembra avere uno sfondo trasparente: viene centrata e ridimensionata, ma lo sfondo resta.");
    if (!/webp|png/i.test(file.type)) warn.push("Il file è " + (file.type || "di formato sconosciuto") + ": un JPG non ha trasparenza, quindi lo sfondo resta.");
    var pad = Math.max(2, Math.round(.01 * Math.max(maxX - minX, maxY - minY) / k));
    var bx = Math.max(0, Math.floor(minX / k) - pad), by = Math.max(0, Math.floor(minY / k) - pad);
    var res = {im:im, bx:bx, by:by, bw:Math.min(W - bx, Math.ceil((maxX + 1) / k) + pad - bx), bh:Math.min(H - by, Math.ceil((maxY + 1) / k) + pad - by)};
    var enc = autoEncode(res);
    if (enc.T !== 1000) warn.push("Per tenerla leggera l'ho ridotta a " + enc.T + "×" + enc.T + " px.");
    if (!enc.webp) warn.push("Questo browser non crea WebP: l'immagine sarebbe salvata in PNG, molto più pesante. Usa Chrome o Edge.");
    if (res.scale > 2.5) warn.push("Risoluzione bassa: la scarpa viene ingrandita molto e potrebbe risultare poco nitida.");
    var orig = plainResize(im, 1000, 220000);
    return {res:res, T:enc.T, q:enc.q, src:enc.src, orig:orig, origKB:Math.round(file.size / 1024), origUpKB:kbOf(orig), warn:warn, name:file.name, dim:W + "×" + H};
  });
}
function pPick(inp) {                                            // nessun limite al numero di foto
  var fs = [].slice.call(inp.files); inp.value = ""; if (!fs.length) return;
  S.pq = {fs:fs, i:0, cur:null}; pqNext();
}
function pqNext() {
  var q = S.pq; if (!q) return;
  if (q.i >= q.fs.length) { S.pq = null; pmClose(); R(); return; }
  var f = q.fs[q.i];
  pmShow('<div class="pmb"><div class="pmh"><b>Elaboro la foto ' + (q.i + 1) + ' di ' + q.fs.length + '…</b></div><div class="skl"></div></div>');
  uniformize(f).then(function (r) { q.cur = r; pmPreview(r, q.i + 1, q.fs.length); }).catch(function (e) {
    loadImg(f).then(function (im) { q.cur = {orig:plainResize(im, 1000, 220000), name:f.name}; pmFail(f.name, e.message, true); }).catch(function () { q.cur = null; pmFail(f.name, e.message, false); });
  });
}
function pmShow(html) { var m = $("pm"); if (!m) { m = document.createElement("div"); m.id = "pm"; document.body.appendChild(m); } m.innerHTML = html; void m.offsetWidth; m.classList.add("on"); }
function pmClose() { var m = $("pm"); if (m) { m.classList.remove("on"); setTimeout(function () { if (!m.classList.contains("on")) m.innerHTML = ""; }, 300); } }
function pmWeight(r) {                                           // riga con il peso: è quello che serve per decidere
  var kb = kbOf(r.src), cls = kb <= 60 ? "ok" : kb <= 110 ? "mid" : "hi";
  return '<div class="pmk ' + cls + '"><b>' + kb + ' KB</b><span>' + r.T + '×' + r.T + ' px · WebP' + (r.q ? ' · qualità ' + Math.round(r.q * 100) + '%' : '') + '</span><span class="m">originale ' + r.origKB + ' KB' + (r.origKB > kb ? ' → ' + Math.min(99, Math.max(1, Math.round(100 - kb * 100 / r.origKB))) + '% in meno' : '') + '</span></div>';
}
function pmPreview(r, i, n) {
  pmShow('<div class="pmb"><div class="pmh"><b>Anteprima foto ' + i + ' di ' + n + '</b><span class="m">' + esc(r.name) + ' · ' + esc(r.dim) + '</span></div>' +
    '<div class="pmg"><div><div class="pml">Originale</div><div class="pmc"><img src="' + r.orig + '" alt=""></div></div><div><div class="pml">Centrata e alleggerita</div><div class="pmc"><img id="pmi" src="' + r.src + '" alt=""></div></div></div>' +
    '<div id="pmw">' + pmWeight(r) + '</div>' +
    '<div class="pmr"><label>Qualità <b id="pmqv">' + Math.round((r.q || .8) * 100) + '%</b></label><input id="pmq" type="range" min="40" max="95" step="1" value="' + Math.round((r.q || .8) * 100) + '" oninput="pmAdj()"' + (r.q ? '' : ' disabled') + '>' +
    '<label>Dimensione</label><select id="pmt" onchange="pmAdj()">' + [1000, 800, 600].map(function (t) { return '<option value="' + t + '"' + (t === r.T ? ' selected' : '') + '>' + t + '×' + t + ' px</option>'; }).join("") + '</select></div>' +
    '<div class="pml">Come appare nel negozio</div><div class="pms"><div class="ph"><img id="pms" src="' + r.src + '" alt=""></div></div>' +
    (r.warn.length ? '<div class="pmw">' + r.warn.map(function (w) { return '<div>⚠ ' + esc(w) + '</div>'; }).join("") + '</div>' : '') +
    '<div class="pma"><button class="gr" onclick="pmDone(\'ok\')">Usa questa foto</button><button onclick="pmDone(\'orig\')">Tieni l’originale (' + r.origUpKB + ' KB)</button><button class="l" onclick="pmDone(\'skip\')">Non usarla</button></div></div>');
}
function pmAdj() {                                               // rielabora con qualità/dimensione scelte e aggiorna il peso
  var q = S.pq, r = q && q.cur; if (!r || !r.res) return;
  var T = Number($("pmt").value), ql = Number($("pmq").value) / 100; $("pmqv").textContent = Math.round(ql * 100) + "%";
  clearTimeout(pmAdj.t); pmAdj.t = setTimeout(function () {
    var u = encQ(drawBox(r.res, T), ql); r.T = T; r.q = ql; r.src = u; $("pmi").src = u; $("pms").src = u; $("pmw").innerHTML = pmWeight(r);
  }, 90);
}
function pmFail(name, msg, canKeep) {
  pmShow('<div class="pmb"><div class="pmh"><b>Non riesco a elaborare la foto</b><span class="m">' + esc(name) + '</span></div><div class="pmw"><div>⚠ ' + esc(msg) + '</div></div>' +
    '<div class="pma">' + (canKeep ? '<button class="gr" onclick="pmDone(\'orig\')">Tieni quella originale</button>' : '') + '<button class="l" onclick="pmDone(\'skip\')">Non usarla</button></div></div>');
}
function pmDone(a) {                                            // nulla viene salvato finché non confermi
  var q = S.pq; if (!q) return;
  var add = function (src) { S.d.p.photos.push({id:newPid(), name:"", price:"", src:src}); };
  if (a === "ok" && q.cur && q.cur.src) add(q.cur.src);
  else if (a === "orig" && q.cur && q.cur.orig) add(q.cur.orig);
  q.i++; q.cur = null; snd("tap"); pqNext();
}
function pSave() {
  var d = S.d.p; if (d.loading || d.loadErr) { alert("Le foto del prodotto non sono ancora tutte caricate: aspetta o riapri il prodotto."); return; }
  var n = String(d.name || "").trim(), p = parseFloat(d.price);
  if (!n || isNaN(p)) { alert("Nome e prezzo obbligatori"); return; }
  var ph = [], subs = [];
  for (var i = 0; i < d.photos.length; i++) {
    var x = d.photos[i], pr = String(x.price == null ? "" : x.price).trim(), meta;
    if (pr !== "" && isNaN(parseFloat(pr))) { alert("Prezzo non valido nella foto " + (i + 1)); return; }
    if (!x.src) { alert("Manca l'immagine della foto " + (i + 1)); return; }
    meta = {id:x.id, name:String(x.name || "").trim(), price:pr === "" ? null : parseFloat(pr)};
    if (i === 0) { if (x.src.length > 700000) { alert("La foto principale pesa " + kbOf(x.src) + " KB: troppo per il database. Caricala di nuovo con qualità più bassa."); return; } meta.src = x.src; }
    else { if (x.src.length > 900000) { alert("La foto " + (i + 1) + " pesa " + kbOf(x.src) + " KB: troppo per il database. Caricala di nuovo con qualità più bassa."); return; } subs.push({id:x.id, src:x.src}); }
    ph.push(meta);
  }
  var o = {name:n, price:p, sizes:String(d.sizes || "").trim(), avail:!!d.avail, desc:String(d.desc || "").trim(), descPos:d.descPos === "top" ? "top" : "bottom", vt:d.vt === "stili" ? "stili" : "colori", photos:ph, photo:d.photos[0] ? d.photos[0].src : ""};
  var isNew = S.edit === "new", ref = isNew ? db.collection("shoes").doc() : db.collection("shoes").doc(S.edit), ops = [], keepSub = {};
  subs.forEach(function (u) { keepSub[u.id] = 1; if (d.orig[u.id] !== "sub") ops.push({id:u.id, src:u.src}); });         // scrive solo le immagini nuove o spostate
  Object.keys(d.orig).forEach(function (pid) { if (d.orig[pid] === "sub" && !keepSub[pid]) ops.push({id:pid, del:true}); });   // toglie quelle non più usate
  var run = function (i) {                                       // le immagini si scrivono prima, a gruppi piccoli; il prodotto per ultimo
    if (i >= ops.length) return Promise.resolve();
    var b = db.batch(), bytes = 0, j = i;
    while (j < ops.length && j - i < 20 && bytes < 3000000) { var op = ops[j++], r = ref.collection("imgs").doc(op.id); if (op.del) b.delete(r); else { b.set(r, {src:op.src}); bytes += op.src.length; } }
    return b.commit().then(function () { return run(j); });
  };
  run(0).then(function () {
    if (isNew) {                                                 // un prodotto nuovo compare per primo
      var min = Infinity; S.shoes.forEach(function (s) { if (typeof s.ord === "number") min = Math.min(min, s.ord); });
      return ref.set(Object.assign(o, {created:Date.now(), ord:(isFinite(min) ? min : 0) - 1}));
    }
    return ref.update(o);
  }).then(function () {
    var m = {}; d.photos.forEach(function (x) { m[x.id] = x.src; }); S.pc[ref.id] = m; if (loadImgs.t) delete loadImgs.t[ref.id];
    S.edit = null; S.d = {}; R(); toast("Salvato");
  }).catch(function (e) { alert("Errore: " + e.message); });
}
function pDel(id) {                                              // elimina il prodotto e anche le sue foto nella sottoraccolta
  if (!confirm("Eliminare questo prodotto?")) return;
  var ref = db.collection("shoes").doc(id);
  ref.collection("imgs").get().then(function (q) {
    var ids = q.docs.map(function (x) { return x.id; }), run = function (i) {
      if (i >= ids.length) return Promise.resolve();
      var b = db.batch(); ids.slice(i, i + 400).forEach(function (x) { b.delete(ref.collection("imgs").doc(x)); });
      return b.commit().then(function () { return run(i + 400); });
    };
    return run(0);
  }).then(function () { return ref.delete(); }).catch(function (e) { alert("Errore: " + e.message); });
}
function pTog(id) { db.collection("shoes").doc(id).update({avail:!shoe(id).avail}); }
function pMove(id, d) {
  var ids = ordered().map(function (x) { return x.id; }), i = ids.indexOf(id), j = i + d;
  if (i < 0 || j < 0 || j >= ids.length) return;
  ids.splice(i, 1); ids.splice(j, 0, id); saveOrder(ids);
}
function saveOrder(ids) {
  var b = db.batch(), n = 0;
  ids.forEach(function (id, i) { var s = shoe(id); if (s && s.ord !== i) { b.update(db.collection("shoes").doc(id), {ord:i}); s.ord = i; n++; } });
  if (n) b.commit().catch(function (e) { alert("Errore: " + e.message); });
  R();
}
// trascinamento: si prende la maniglia ⠿ e si lascia sul prodotto che deve venire dopo/prima
var drg = null;
document.addEventListener("pointerdown", function (e) {
  var g = e.target.closest ? e.target.closest(".grip") : null, card = g && g.closest(".card"); if (!card) return;
  e.preventDefault(); drg = {card:card, grid:card.parentNode, over:null}; S.drag = true; card.classList.add("drag");
});
document.addEventListener("pointermove", function (e) {
  if (!drg) return;
  var el = document.elementFromPoint(e.clientX, e.clientY), over = el && el.closest ? el.closest(".card.ac") : null;
  if (over === drg.card || (over && over.parentNode !== drg.grid)) over = null;
  if (over !== drg.over) { if (drg.over) drg.over.classList.remove("tg"); drg.over = over; if (over) over.classList.add("tg"); }
  if (e.clientY < 90) window.scrollBy(0, -14); else if (e.clientY > innerHeight - 90) window.scrollBy(0, 14);
});
function endDrag() {
  if (!drg) return; var d = drg; drg = null; S.drag = false;
  d.card.classList.remove("drag"); if (d.over) d.over.classList.remove("tg");
  if (!d.over) return;
  var ids = [].map.call(d.grid.children, function (c) { return c.getAttribute("data-id"); }), a = d.card.getAttribute("data-id"), to = ids.indexOf(d.over.getAttribute("data-id"));
  ids.splice(ids.indexOf(a), 1); ids.splice(to, 0, a);          // verso destra va dopo il bersaglio, verso sinistra prima
  saveOrder(ids);
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

// ---------- scheda ANNUNCI ----------
function aAds() {
  var e = S.adEdit ? byId(S.ads, S.adEdit) : null;
  if (!S.d.ad) S.d.ad = e ? {title:e.title || "", text:e.text || "", photo:e.photo || "", on:e.on !== false, dur:e.until ? "keep" : "0"} : {title:"", text:"", photo:"", on:true, dur:"0"};
  var d = S.d.ad;
  var f = '<div class="form"><div class="m" style="margin-bottom:10px">' + (e ? "Modifica annuncio" : "Nuovo annuncio in home (visibile a tutti)") + '</div>' +
    fi("ad", "title", "Titolo") + ft("ad", "text", "Testo", 3) +
    '<label>Foto (facoltativa)</label><input type="file" accept="image/*" onchange="pickAd(this)">' +
    (d.photo ? '<div class="row"><div class="t"><img src="' + esc(d.photo) + '" alt=""></div><button class="l" onclick="dset(\'ad\',\'photo\',\'\');R()">Rimuovi foto</button></div>' : '') +
    fsel("ad", "dur", "Durata (conta da quando premi " + (e ? "Salva" : "Pubblica") + ")", durOpts(e && e.until)) +
    fchk("ad", "on", "Visibile nella home") + formBtns("saveAd()", "S.adEdit=null;delete S.d.ad;R()", e ? "Salva" : "Pubblica", !!e) + '</div>';
  var l = S.ads.map(function (a) { return arow(a.photo, a.title || a.text || "(solo foto)", stOf(a), "adEd('" + a.id + "')", "adTog('" + a.id + "')", "adDel('" + a.id + "')", a.on !== false); }).join("");
  return f + (l ? '<div class="form">' + hd("Annunci pubblicati") + l + '</div>' : '');
}
function pickAd(inp) {
  var file = inp.files[0]; if (!file) return;
  shrink(file, 1000, .75, function (src) { if (src) { dset("ad", "photo", src); R(); } });
}
function saveAd() {
  var d = S.d.ad, t = String(d.title || "").trim(), x = String(d.text || "").trim(), old = S.adEdit ? byId(S.ads, S.adEdit) : null;
  if (!t && !x && !d.photo) { alert("Inserisci almeno un titolo, un testo o una foto"); return; }
  var o = {title:t, text:x, photo:d.photo || "", on:!!d.on, until:untilOf(d.dur, old && old.until)};
  var op = S.adEdit ? db.collection("ads").doc(S.adEdit).update(o) : db.collection("ads").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.adEdit = null; delete S.d.ad; R(); toast("Annuncio salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function adEd(id) { S.adEdit = id; delete S.d.ad; R(); window.scrollTo(0, 0); }
function adDel(id) { if (confirm("Eliminare questo annuncio?")) { if (S.adEdit === id) { S.adEdit = null; delete S.d.ad; } db.collection("ads").doc(id).delete(); } }
function adTog(id) { db.collection("ads").doc(id).update({on:byId(S.ads, id).on === false}); }

// ---------- scheda NOTIFICHE (appaiono a tutti con il numero rosso sulla campanella) ----------
function aNotifs() {
  var e = S.nfEdit ? byId(S.notifs, S.nfEdit) : null;
  if (!S.d.nf) S.d.nf = e ? {title:e.title || "", text:e.text || "", on:e.on !== false, dur:e.until ? "keep" : "0"} : {title:"", text:"", on:true, dur:"0"};
  var f = '<div class="form"><div class="m" style="margin-bottom:4px">' + (e ? "Modifica notifica" : "Nuova notifica per tutti i clienti") + '</div>' +
    '<p class="m" style="margin:0 0 10px">Appena la pubblichi, sulla campanella di ogni cliente compare un 1 rosso finché non la apre.</p>' +
    fi("nf", "title", "Titolo") + ft("nf", "text", "Testo", 3) +
    fsel("nf", "dur", "Per quanto resta visibile (conta da quando premi " + (e ? "Salva" : "Invia") + ")", durOpts(e && e.until)) +
    fchk("nf", "on", "Attiva") + formBtns("nfSave()", "S.nfEdit=null;delete S.d.nf;R()", e ? "Salva" : "Invia notifica", !!e) + '</div>';
  var l = S.notifs.map(function (n) { return arow("", n.title || n.text || "(vuota)", stOf(n), "nfEd('" + n.id + "')", "nfTog('" + n.id + "')", "nfDel('" + n.id + "')", n.on !== false); }).join("");
  return f + (l ? '<div class="form">' + hd("Notifiche inviate") + l + '</div>' : '');
}
function nfSave() {
  var d = S.d.nf, t = String(d.title || "").trim(), x = String(d.text || "").trim(), old = S.nfEdit ? byId(S.notifs, S.nfEdit) : null;
  if (!t) { alert("Scrivi il titolo della notifica"); return; }
  var o = {title:t, text:x, on:!!d.on, until:untilOf(d.dur, old && old.until)};
  var op = S.nfEdit ? db.collection("notifs").doc(S.nfEdit).update(o) : db.collection("notifs").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.nfEdit = null; delete S.d.nf; R(); toast("Notifica salvata"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function nfEd(id) { S.nfEdit = id; delete S.d.nf; R(); window.scrollTo(0, 0); }
function nfDel(id) { if (confirm("Eliminare questa notifica?")) { if (S.nfEdit === id) { S.nfEdit = null; delete S.d.nf; } db.collection("notifs").doc(id).delete(); } }
function nfTog(id) { db.collection("notifs").doc(id).update({on:byId(S.notifs, id).on === false}); }

// ---------- scheda RECENSIONI (foto e video dei prodotti arrivati) ----------
function aReviews() {
  var e = S.revEdit ? byId(S.reviews, S.revEdit) : null;
  if (!S.d.rv) S.d.rv = e ? {title:e.title || "", text:e.text || "", video:e.video || "", on:e.on !== false, photos:(e.photos || []).slice()} : {title:"", text:"", video:"", on:true, photos:[]};
  var d = S.d.rv, n = d.photos.length;
  var f = '<div class="form"><div class="m" style="margin-bottom:4px">' + (e ? "Modifica recensione" : "Nuova recensione") + '</div>' +
    '<p class="m" style="margin:0 0 10px">Compare nella stellina in alto, accanto al menu. Puoi mettere foto, un video o entrambi.</p>' +
    fi("rv", "title", "Titolo (es. nome del prodotto o del cliente)") + ft("rv", "text", "Testo (facoltativo)", 3) +
    '<label>Foto (' + n + '/4)</label>' + (n ? '<div class="chips" style="margin:0 0 8px">' + d.photos.map(function (p, i) {
      return '<div class="rpv"><img src="' + esc(p) + '" alt=""><button class="sm dg" onclick="rvPhDel(' + i + ')" aria-label="Rimuovi">✕</button></div>'; }).join("") + '</div>' : '') +
    (n < 4 ? '<input type="file" accept="image/*" multiple onchange="rvPick(this)">' : '') +
    fi("rv", "video", "Link del video (facoltativo)", {ph:"https://youtube.com/…  oppure  https://…/video.mp4"}) +
    '<p class="m" style="margin:-4px 0 12px">I video non si caricano direttamente (il database ha un limite): incolla il link di YouTube, di un file .mp4 oppure di Instagram/TikTok.</p>' +
    fchk("rv", "on", "Visibile") + formBtns("rvSave()", "S.revEdit=null;delete S.d.rv;R()", e ? "Salva" : "Pubblica", !!e) + '</div>';
  var l = S.reviews.map(function (r) {
    return arow((r.photos || [])[0] || "", r.title || r.text || (r.video ? "(video)" : "(foto)"), (r.on === false ? "nascosta" : "visibile") + ((r.photos || []).length ? " · " + r.photos.length + " foto" : "") + (r.video ? " · video" : ""), "rvEd('" + r.id + "')", "rvTog('" + r.id + "')", "rvDel('" + r.id + "')", r.on !== false);
  }).join("");
  return f + (l ? '<div class="form">' + hd("Recensioni pubblicate") + l + '</div>' : '');
}
function rvPick(inp) {
  var d = S.d.rv, fs = [].slice.call(inp.files).slice(0, 4 - d.photos.length); if (!fs.length) return;
  var out = [], left = fs.length;
  fs.forEach(function (f, i) { shrink(f, 900, .72, function (src) { out[i] = src; if (!--left) { out.forEach(function (s) { if (s) d.photos.push(s); }); R(); } }); });
}
function rvPhDel(i) { S.d.rv.photos.splice(i, 1); R(); }
function rvSave() {
  var d = S.d.rv, t = String(d.title || "").trim(), x = String(d.text || "").trim(), v = String(d.video || "").trim();
  if (v && !/^https?:\/\//i.test(v)) { alert("Il link del video deve iniziare con http:// o https://"); return; }
  if (!t && !x && !v && !d.photos.length) { alert("Aggiungi almeno una foto, un video o un testo"); return; }
  if (d.photos.reduce(function (s, p) { return s + p.length; }, 0) > 950000) { alert("Le foto sono troppo pesanti insieme: toglile o usane meno."); return; }
  var o = {title:t, text:x, video:v, photos:d.photos, on:!!d.on};
  var op = S.revEdit ? db.collection("reviews").doc(S.revEdit).update(o) : db.collection("reviews").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.revEdit = null; delete S.d.rv; R(); toast("Recensione salvata"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function rvEd(id) { S.revEdit = id; delete S.d.rv; R(); window.scrollTo(0, 0); }
function rvDel(id) { if (confirm("Eliminare questa recensione?")) { if (S.revEdit === id) { S.revEdit = null; delete S.d.rv; } db.collection("reviews").doc(id).delete(); } }
function rvTog(id) { db.collection("reviews").doc(id).update({on:byId(S.reviews, id).on === false}); }

// ---------- scheda CLIENTI (chi si è registrato e quando è entrato) ----------
function aClients() {
  var l = S.clients;
  return '<p class="m hint">' + l.length + ' client' + (l.length === 1 ? 'e' : 'i') + ' registrat' + (l.length === 1 ? 'o' : 'i') + '. Il numero di telefono è l’identificativo: chi accede con un numero già presente viene riconosciuto.</p>' +
    (l.length ? '<div class="form">' + l.map(function (c) {
      var wa = String(c.phone || c.id).replace(/\D/g, ""), nm = c.first || "(senza nome)";
      return '<div class="row ar"><div class="i"><b>' + esc(nm) + '</b> <span class="m">' + (c.gender === "donna" ? "· donna" : c.gender === "uomo" ? "· uomo" : "") + '</span><div class="m">' + esc(c.phone || c.id) +
        ' · registrato ' + (c.created ? fmtD(c.created) : "prima del nuovo accesso") + ' · ultimo accesso ' + (c.last_login ? fmtD(c.last_login) : "—") + (c.visits ? ' · ' + c.visits + ' access' + (c.visits === 1 ? 'o' : 'i') : '') + '</div></div>' +
        '<a class="sm" style="padding:8px 14px;border:1px solid #3a3a3a;border-radius:8px;font-size:13px" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a></div>';
    }).join("") + '</div>' : '<p class="m">Nessun cliente per ora.</p>');
}

// ---------- scheda SCONTI: offerte automatiche + coupon ----------
function aSales() { return rwBlock() + slBlock() + cpBlock(); }
function saleDesc(x) {
  var w = x.scope === "cat" ? "categoria " + ((catOf(x.cat) || {}).name || "?") : x.scope === "prod" ? (x.targets || []).length + " prodotti" : "tutto il negozio";
  return tagOf(x) + " su " + w;
}
function slBlock() {
  var e = S.slEdit ? byId(S.sales, S.slEdit) : null;
  if (!S.d.sl) S.d.sl = e ? {name:e.name || "", type:e.type, value:e.value, scope:e.scope, cat:e.cat || "", targets:(e.targets || []).slice(), on:e.on !== false, dur:e.until ? "keep" : "0"}
                          : {name:"", type:"pct", value:"", scope:"all", cat:"", targets:[], on:true, dur:"0"};
  var d = S.d.sl;
  var f = '<div class="form"><div class="m" style="margin-bottom:4px">' + (e ? "Modifica offerta" : "Nuova offerta automatica") + '</div><p class="m" style="margin:0 0 10px">Si applica da sola ai prezzi: i clienti vedono il vecchio prezzo barrato e quello scontato.</p>' +
    fi("sl", "name", "Nome (solo per te, es. Saldi estate)") +
    '<div class="two"><div>' + fsel("sl", "type", "Tipo", [["pct", "Percentuale (%)"], ["fix", "Importo fisso (€)"]]) + '</div><div>' + fi("sl", "value", "Valore", {type:"number", step:"0.01"}) + '</div></div>' +
    fsel("sl", "scope", "Si applica a", [["all", "Tutto il negozio"], ["cat", "Una categoria"], ["prod", "Prodotti scelti"]], true) +
    (d.scope === "cat" ? fsel("sl", "cat", "Categoria", [["", "Scegli…"]].concat(S.cats.map(function (c) { return [c.id, c.name]; }))) : "") +
    (d.scope === "prod" ? '<div class="chips" style="margin:0 0 12px">' + ordered().map(function (s) {
        return '<label class="chip"><input type="checkbox" ' + (d.targets.indexOf(s.id) > -1 ? "checked" : "") + ' onchange="dtog(\'sl\',\'targets\',\'' + s.id + '\',this.checked)">' + esc(s.name) + '</label>'; }).join("") + '</div>' : "") +
    fsel("sl", "dur", "Durata (conta da quando premi Salva)", durOpts(e && e.until)) +
    fchk("sl", "on", "Attiva") + formBtns("slSave()", "S.slEdit=null;delete S.d.sl;R()", e ? "Salva" : "Crea offerta", !!e) + '</div>';
  var l = S.sales.map(function (x) { return arow("", x.name || saleDesc(x), (x.name ? saleDesc(x) + " · " : "") + stOf(x), "slEd('" + x.id + "')", "slTog('" + x.id + "')", "slDel('" + x.id + "')", x.on !== false); }).join("");
  return hd("Offerte automatiche") + f + (l ? '<div class="form">' + l + '</div>' : '<p class="m">Nessuna offerta creata.</p>');
}
function slSave() {
  var d = S.d.sl, v = parseFloat(d.value), old = S.slEdit ? byId(S.sales, S.slEdit) : null;
  if (isNaN(v) || v <= 0) { alert("Inserisci il valore dello sconto"); return; }
  if (d.type === "pct" && v > 100) { alert("La percentuale non può superare 100"); return; }
  if (d.scope === "cat" && !d.cat) { alert("Scegli la categoria"); return; }
  if (d.scope === "prod" && !d.targets.length) { alert("Scegli almeno un prodotto"); return; }
  var o = {name:String(d.name || "").trim(), type:d.type, value:v, scope:d.scope, cat:d.scope === "cat" ? d.cat : "", targets:d.scope === "prod" ? d.targets : [], until:untilOf(d.dur, old && old.until), on:!!d.on};
  var op = S.slEdit ? db.collection("sales").doc(S.slEdit).update(o) : db.collection("sales").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.slEdit = null; delete S.d.sl; R(); toast("Offerta salvata"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function slEd(id) { S.slEdit = id; delete S.d.sl; R(); window.scrollTo(0, 0); }
function slDel(id) { if (confirm("Eliminare questa offerta?")) { if (S.slEdit === id) { S.slEdit = null; delete S.d.sl; } db.collection("sales").doc(id).delete(); } }
function slTog(id) { db.collection("sales").doc(id).update({on:byId(S.sales, id).on === false}); }

function cpBlock() {
  var e = S.cpEdit ? byId(S.coupons, S.cpEdit) : null;
  if (!S.d.cp) S.d.cp = e ? {code:e.id, type:e.type, value:e.value, min:e.min || "", on:e.on !== false, dur:e.until ? "keep" : "0"} : {code:"", type:"pct", value:"", min:"", on:true, dur:"0"};
  var f = '<div class="form"><div class="m" style="margin-bottom:4px">' + (e ? "Modifica coupon" : "Nuovo coupon") + '</div><p class="m" style="margin:0 0 10px">I clienti inseriscono il codice nel carrello e lo sconto si applica al totale.</p>' +
    fi("cp", "code", "Codice (es. PRIMO10)", {dis:!!e}) +
    '<div class="two"><div>' + fsel("cp", "type", "Tipo", [["pct", "Percentuale (%)"], ["fix", "Importo fisso (€)"]]) + '</div><div>' + fi("cp", "value", "Valore", {type:"number", step:"0.01"}) + '</div></div>' +
    fi("cp", "min", "Ordine minimo € (facoltativo)", {type:"number", step:"0.01"}) +
    fsel("cp", "dur", "Durata (conta da quando premi Salva)", durOpts(e && e.until)) +
    fchk("cp", "on", "Attivo") + formBtns("cpSave()", "S.cpEdit=null;delete S.d.cp;R()", e ? "Salva" : "Crea coupon", !!e) + '</div>';
  var l = S.coupons.map(function (x) {
    return arow("", x.id, tagOf(x) + (x.min ? " · min € " + Number(x.min).toFixed(2) : "") + " · " + stOf(x), "cpEd('" + x.id + "')", "cpTog('" + x.id + "')", "cpDel('" + x.id + "')", x.on !== false);
  }).join("");
  return hd("Codici coupon") + f + (l ? '<div class="form">' + l + '</div>' : '<p class="m">Nessun coupon creato.</p>');
}
function cpSave() {
  var d = S.d.cp, code = String(d.code || "").trim().toUpperCase(), v = parseFloat(d.value), mn = String(d.min == null ? "" : d.min).trim(), old = S.cpEdit ? byId(S.coupons, S.cpEdit) : null;
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) { alert("Il codice deve avere 3-20 caratteri: solo lettere, numeri, - o _"); return; }
  if (isNaN(v) || v <= 0) { alert("Inserisci il valore dello sconto"); return; }
  if (d.type === "pct" && v > 100) { alert("La percentuale non può superare 100"); return; }
  if (mn !== "" && isNaN(parseFloat(mn))) { alert("Ordine minimo non valido"); return; }
  var o = {type:d.type, value:v, min:mn === "" ? 0 : parseFloat(mn), until:untilOf(d.dur, old && old.until), on:!!d.on};
  var done = function () { S.cpEdit = null; delete S.d.cp; R(); toast("Coupon salvato"); }, fail = function (e) { alert("Errore: " + e.message); };
  if (S.cpEdit) db.collection("coupons").doc(S.cpEdit).update(o).then(done).catch(fail);
  else db.collection("coupons").doc(code).get().then(function (x) {
    if (x.exists) { alert("Esiste già un coupon con questo codice"); return; }
    return db.collection("coupons").doc(code).set(Object.assign(o, {created:Date.now()})).then(done);
  }).catch(fail);
}
function cpEd(id) { S.cpEdit = id; delete S.d.cp; R(); window.scrollTo(0, 0); }
function cpDel(id) { if (confirm("Eliminare il coupon " + id + "?")) { if (S.cpEdit === id) { S.cpEdit = null; delete S.d.cp; } db.collection("coupons").doc(id).delete(); } }
function cpTog(id) { db.collection("coupons").doc(id).update({on:byId(S.coupons, id).on === false}); }
// l'elenco dei coupon lo legge solo il gestore
var unCp = null;
var unCl = null;
function adminListen(on) {
  if (on && !unCp) unCp = db.collection("coupons").orderBy("created", "desc").onSnapshot(function (q) {
    S.coupons = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
    if (!busy()) R();
  }, function (e) { console.error(e); });
  if (typeof ordersListen === "function") ordersListen(on);
  if (on && !unCl) unCl = db.collection("clients").orderBy("last_login", "desc").limit(300).onSnapshot(function (q) {
    S.clients = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
    if (!busy()) R();
  }, function (e) { console.error(e); });
  if (!on && unCp) { unCp(); unCp = null; S.coupons = []; }
  if (!on && unCl) { unCl(); unCl = null; S.clients = []; }
}

// ---------- scheda CATEGORIE (menu laterale) ----------
function aCats() {
  return '<div class="form"><div class="two"><input id="cn" placeholder="Nuova categoria"><button onclick="addCat()" style="margin-bottom:10px">Aggiungi</button></div></div>' +
    (S.cats.length ? S.cats.map(function (c) {
      var n = ordered().filter(function (s) { return c.ids.indexOf(s.id) > -1; }).length;
      return '<details class="cat"' + (S.openCat === c.id ? " open" : "") + ' ontoggle="catOpen(\'' + c.id + '\',this.open)"><summary><b>' + esc(c.name) + '</b><span class="m">' + n + ' prodotti</span></summary>' +
        '<div class="act" style="margin:8px 0"><button class="sm" onclick="renCat(\'' + c.id + '\')">Rinomina</button><button class="sm dg" onclick="delCat(\'' + c.id + '\')">Elimina</button></div><div class="chips">' +
        ordered().map(function (s) { return '<label class="chip"><input type="checkbox" ' + (c.ids.indexOf(s.id) > -1 ? "checked" : "") + ' onchange="tcat(\'' + c.id + '\',\'' + s.id + '\',this.checked)">' + esc(s.name) + '</label>'; }).join("") + '</div></details>';
    }).join("") : '<p class="m">Nessuna categoria. Creane una sopra (es. Donna, Uomo).</p>');
}
function catOpen(id, open) { if (open) S.openCat = id; else if (S.openCat === id) S.openCat = null; }
function addCat() { var n = $("cn").value.trim(); if (n) db.collection("menu").add({name:n, ids:[], created:Date.now()}); }
function renCat(id) { var c = catOf(id), n = prompt("Nuovo nome", c.name); if (n && n.trim()) db.collection("menu").doc(id).update({name:n.trim()}); }
function delCat(id) { if (confirm("Eliminare la categoria?")) { if (S.cat === id) S.cat = "all"; db.collection("menu").doc(id).delete(); } }
function tcat(cid, sid, on) { db.collection("menu").doc(cid).update({ids: on ? FV.arrayUnion(sid) : FV.arrayRemove(sid)}); }

// ---------- scheda INFO (riquadri informativi in home) ----------
function aInfo() {
  var e = S.infEdit ? byId(S.infos, S.infEdit) : null;
  if (!S.d.inf) S.d.inf = e ? {title:e.title || "", text:e.text || "", on:e.on !== false, color:e.color || "#ffffff"} : {title:"", text:"", on:true, color:"#ffffff"};
  var cur = String(S.d.inf.color || "#ffffff").toLowerCase();
  var sw = ["#ffffff", "#e5484d", "#22b35e", "#f5b942", "#3b82f6", "#a855f7", "#f97316"].map(function (c) {
    return '<button class="cs' + (cur === c ? " on" : "") + '" style="background:' + c + '" aria-label="Colore ' + c + '" onclick="dset(\'inf\',\'color\',\'' + c + '\');R()"></button>';
  }).join("") + '<input type="color" class="cp" value="' + esc(cur) + '" aria-label="Colore personalizzato" oninput="dset(\'inf\',\'color\',this.value)" onchange="R()">';
  var f = '<div class="form"><div class="m" style="margin-bottom:10px">' + (e ? "Modifica informazione" : "Nuova informazione in home") + '</div>' +
    fi("inf", "title", "Titolo") + ft("inf", "text", "Testo", 5) +
    '<label>Colore della linea a sinistra</label><div class="sws">' + sw + '</div>' +
    '<div class="note" style="margin:0 0 12px;border-left-color:' + esc(cur) + '"><b>Anteprima</b>Così appare il riquadro nelle Info.</div>' +
    fchk("inf", "on", "Visibile nella home") +
    formBtns("infSave()", "S.infEdit=null;delete S.d.inf;R()", e ? "Salva" : "Aggiungi", !!e) + '</div>';
  var srt = infosSorted(), l = srt.map(function (x, i) {
    var mv = '<button class="sm" onclick="infMove(\'' + x.id + '\',-1)"' + (i ? "" : " disabled") + ' aria-label="Sposta su">▲</button><button class="sm" onclick="infMove(\'' + x.id + '\',1)"' + (i < srt.length - 1 ? "" : " disabled") + ' aria-label="Sposta giù">▼</button>';
    return arow("", (i + 1) + ". " + (x.title || x.text || "(vuoto)"), x.on === false ? "nascosta" : "visibile", "infEd('" + x.id + "')", "infTog('" + x.id + "')", "infDel('" + x.id + "')", x.on !== false, mv);
  }).join("");
  return f + (l ? '<div class="form">' + hd("Informazioni pubblicate (l’ordine è quello che vedono i clienti)") + l + '</div>'
    : '<div class="form"><p class="m" style="margin:0 0 10px">Ora in home compare il testo predefinito «' + esc(NOTE_T) + '». Per modificarlo o aggiungerne altri, parti dal testo attuale:</p><button class="sm" onclick="infSeed()">Personalizza il testo predefinito</button></div>');
}
function infSave() {
  var d = S.d.inf, t = String(d.title || "").trim(), x = String(d.text || "").trim();
  if (!t && !x) { alert("Scrivi almeno un titolo o un testo"); return; }
  var o = {title:t, text:x, on:!!d.on, color:d.color || "#ffffff"};
  var op = S.infEdit ? db.collection("info").doc(S.infEdit).update(o) : db.collection("info").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.infEdit = null; delete S.d.inf; R(); toast("Salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function infSeed() { db.collection("info").add({title:NOTE_T, text:NOTE_X, on:true, created:Date.now()}).catch(function (e) { alert("Errore: " + e.message); }); }
function infEd(id) { S.infEdit = id; delete S.d.inf; R(); window.scrollTo(0, 0); }
function infDel(id) { if (confirm("Eliminare questa informazione?")) { if (S.infEdit === id) { S.infEdit = null; delete S.d.inf; } db.collection("info").doc(id).delete(); } }
function infMove(id, d) {                                      // cambia la posizione: salva l'ordine di tutte le info
  var ids = infosSorted().map(function (x) { return x.id; }), i = ids.indexOf(id), j = i + d;
  if (i < 0 || j < 0 || j >= ids.length) return;
  ids.splice(i, 1); ids.splice(j, 0, id);
  var b = db.batch(); ids.forEach(function (x, k) { b.update(db.collection("info").doc(x), {ord:k}); byId(S.infos, x).ord = k; });
  b.commit().catch(function (e) { alert("Errore: " + e.message); }); R();
}
function infTog(id) { db.collection("info").doc(id).update({on:byId(S.infos, id).on === false}); }
