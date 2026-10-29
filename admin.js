// ====== DASHBOARD (gestore) ======
// Schede: Prodotti (replica della home con ordine), Annunci, Sconti e coupon, Categorie, Info.
// Le bozze dei moduli stanno in S.d: così non si perde nulla quando il sito si aggiorna.

var TABS = [["prod", "Prodotti"], ["ads", "Annunci"], ["notifs", "Notifiche"], ["sales", "Sconti"], ["cats", "Categorie"], ["info", "Info"], ["clients", "Clienti"]];
var GRIP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="5" r="2"/><circle cx="16" cy="5" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/></svg>';

function admin() {
  var body = {prod:aProd, ads:aAds, notifs:aNotifs, sales:aSales, cats:aCats, info:aInfo, clients:aClients}[S.tab] || aProd;
  return '<div class="bar"><button class="l" onclick="go(\'shop\')">← Torna al negozio</button></div>' +
    '<div class="tabs">' + TABS.map(function (t) { return '<button class="' + (S.tab === t[0] ? "on" : "") + '" onclick="setTab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join("") + '</div>' + body();
}
function setTab(t) { S.tab = t; S.edit = null; S.d = {}; S.adEdit = S.slEdit = S.cpEdit = S.infEdit = S.nfEdit = null; R(); window.scrollTo(0, 0); }

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
function arow(img, title, sub, ed, tog, del, on) {
  return '<div class="row ar"><div class="t">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + '</div><div class="i">' + esc(title) + '<div class="m">' + sub + '</div></div>' +
    '<div class="act"><button class="sm" onclick="' + ed + '">Modifica</button><button class="sm" onclick="' + tog + '">' + (on ? "Disattiva" : "Attiva") + '</button><button class="sm dg" onclick="' + del + '">Elimina</button></div></div>';
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
function pEdit(id) {
  S.edit = id; var s = id === "new" ? null : shoe(id);
  S.d = {p: s ? {name:s.name, price:s.price, sizes:s.sizes || "", avail:!!s.avail, photos:photosOf(s).map(function (x) { return {src:x.src, name:x.name || "", price:x.price == null ? "" : x.price}; })}
              : {name:"", price:"", sizes:"", avail:true, photos:[]}};
  R(); window.scrollTo(0, 0);
}
function pForm() {
  var d = S.d.p, n = d.photos.length;
  var ph = d.photos.map(function (p, i) {
    return '<div class="pho"><div class="t"><img src="' + esc(p.src) + '" alt=""></div><div class="pf">' + (i ? '' : '<span class="tag2">Principale</span>') +
      '<input placeholder="Modello / colore (es. Nero)" value="' + esc(p.name) + '" oninput="phset(' + i + ',\'name\',this.value)">' +
      '<input type="number" step="0.01" placeholder="Prezzo € (vuoto = prezzo base)" value="' + esc(p.price) + '" oninput="phset(' + i + ',\'price\',this.value)"></div>' +
      '<div class="act2"><button class="sm" onclick="phmv(' + i + ',-1)" aria-label="Prima">‹</button><button class="sm" onclick="phmv(' + i + ',1)" aria-label="Dopo">›</button><button class="sm dg" onclick="phdel(' + i + ')" aria-label="Rimuovi">✕</button></div></div>';
  }).join("");
  return '<div class="form"><div class="m" style="margin-bottom:10px">' + (S.edit === "new" ? "Nuovo prodotto" : "Modifica prodotto") + '</div>' +
    fi("p", "name", "Nome") +
    '<div class="two"><div>' + fi("p", "price", "Prezzo base (€)", {type:"number", step:"0.01"}) + '</div><div>' + fi("p", "sizes", "Taglie (es. 40, 41, 42)") + '</div></div>' +
    '<label>Foto e modelli (' + n + '/6)</label><p class="m" style="margin:0 0 6px">La prima è l’immagine principale. Chi apre il prodotto scorre le altre con il dito. Se un modello/colore costa diverso, scrivi il suo prezzo.</p>' +
    ph + (n < 6 ? '<input type="file" accept="image/*" multiple onchange="pPick(this)" style="margin-top:8px">' : '') +
    fchk("p", "avail", "Disponibile") + formBtns("pSave()", "S.edit=null;S.d={};R()", "Salva", true) + '</div>';
}
function phset(i, k, v) { S.d.p.photos[i][k] = v; }
function phmv(i, d) { var a = S.d.p.photos, j = i + d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); R(); }
function phdel(i) { S.d.p.photos.splice(i, 1); R(); }
function pPick(inp) {
  var d = S.d.p, fs = [].slice.call(inp.files).slice(0, 6 - d.photos.length); if (!fs.length) return;
  var out = [], left = fs.length;
  fs.forEach(function (f, i) {
    shrink(f, 800, .72, function (src) {
      out[i] = src;
      if (!--left) { out.forEach(function (s) { if (s) d.photos.push({src:s, name:"", price:""}); }); R(); }
    });
  });
}
function pSave() {
  var d = S.d.p, n = String(d.name || "").trim(), p = parseFloat(d.price);
  if (!n || isNaN(p)) { alert("Nome e prezzo obbligatori"); return; }
  var ph = [];
  for (var i = 0; i < d.photos.length; i++) {
    var x = d.photos[i], pr = String(x.price == null ? "" : x.price).trim();
    if (pr !== "" && isNaN(parseFloat(pr))) { alert("Prezzo non valido nella foto " + (i + 1)); return; }
    ph.push({src:x.src, name:String(x.name || "").trim(), price:pr === "" ? null : parseFloat(pr)});
  }
  var tot = ph.reduce(function (t, x) { return t + x.src.length; }, 0);
  if (tot > 950000) { alert("Le foto sono troppo pesanti insieme: togline qualcuna o usa immagini più semplici."); return; }
  var o = {name:n, price:p, sizes:String(d.sizes || "").trim(), avail:!!d.avail, photos:ph, photo:ph[0] ? ph[0].src : ""}, op;
  if (S.edit === "new") {                                      // un prodotto nuovo compare per primo
    var min = Infinity; S.shoes.forEach(function (s) { if (typeof s.ord === "number") min = Math.min(min, s.ord); });
    op = db.collection("shoes").add(Object.assign(o, {created:Date.now(), ord:(isFinite(min) ? min : 0) - 1}));
  } else op = db.collection("shoes").doc(S.edit).update(o);
  op.then(function () { S.edit = null; S.d = {}; R(); toast("Salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function pDel(id) { if (confirm("Eliminare questo prodotto?")) db.collection("shoes").doc(id).delete(); }
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
function aSales() { return slBlock() + cpBlock(); }
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
  if (!S.d.inf) S.d.inf = e ? {title:e.title || "", text:e.text || "", on:e.on !== false} : {title:"", text:"", on:true};
  var f = '<div class="form"><div class="m" style="margin-bottom:10px">' + (e ? "Modifica informazione" : "Nuova informazione in home") + '</div>' +
    fi("inf", "title", "Titolo") + ft("inf", "text", "Testo", 5) + fchk("inf", "on", "Visibile nella home") +
    formBtns("infSave()", "S.infEdit=null;delete S.d.inf;R()", e ? "Salva" : "Aggiungi", !!e) + '</div>';
  var l = S.infos.map(function (x) { return arow("", x.title || x.text || "(vuoto)", x.on === false ? "nascosta" : "visibile", "infEd('" + x.id + "')", "infTog('" + x.id + "')", "infDel('" + x.id + "')", x.on !== false); }).join("");
  return f + (l ? '<div class="form">' + hd("Informazioni pubblicate") + l + '</div>'
    : '<div class="form"><p class="m" style="margin:0 0 10px">Ora in home compare il testo predefinito «' + esc(NOTE_T) + '». Per modificarlo o aggiungerne altri, parti dal testo attuale:</p><button class="sm" onclick="infSeed()">Personalizza il testo predefinito</button></div>');
}
function infSave() {
  var d = S.d.inf, t = String(d.title || "").trim(), x = String(d.text || "").trim();
  if (!t && !x) { alert("Scrivi almeno un titolo o un testo"); return; }
  var o = {title:t, text:x, on:!!d.on};
  var op = S.infEdit ? db.collection("info").doc(S.infEdit).update(o) : db.collection("info").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.infEdit = null; delete S.d.inf; R(); toast("Salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function infSeed() { db.collection("info").add({title:NOTE_T, text:NOTE_X, on:true, created:Date.now()}).catch(function (e) { alert("Errore: " + e.message); }); }
function infEd(id) { S.infEdit = id; delete S.d.inf; R(); window.scrollTo(0, 0); }
function infDel(id) { if (confirm("Eliminare questa informazione?")) { if (S.infEdit === id) { S.infEdit = null; delete S.d.inf; } db.collection("info").doc(id).delete(); } }
function infTog(id) { db.collection("info").doc(id).update({on:byId(S.infos, id).on === false}); }
