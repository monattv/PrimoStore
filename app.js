// Controlli di sicurezza: mostrano un messaggio invece della pagina bianca
window.onerror = function (m) {
  var a = document.getElementById("app");
  if (a && !a.innerHTML) a.innerHTML = '<p style="padding:30px;font-family:sans-serif;text-align:center">Errore: ' + m + '</p>';
};
if (typeof firebase === "undefined") { document.getElementById("app").innerHTML = '<p style="padding:30px;font-family:sans-serif;text-align:center">Impossibile caricare Firebase. Controlla la connessione.</p>'; throw new Error("firebase mancante"); }
if (typeof firebaseConfig === "undefined" || firebaseConfig.apiKey === "INCOLLA_QUI") {
  document.getElementById("app").innerHTML = '<p style="padding:30px;font-family:sans-serif;text-align:center"><b>Configurazione mancante</b><br>Carica il file config.js e inserisci i dati di Firebase.</p>';
  throw new Error("config mancante");
}

// La configurazione (Firebase, WhatsApp, nome negozio) è nel file config.js

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth(), db = firebase.firestore(), FV = firebase.firestore.FieldValue;
var S = {user:null, admin:false, shoes:[], cats:[], cat:"all", view:"shop", edit:null, photo:"", cart:[], ready:false, intro:false, pend:null, ads:[], adEdit:null, adf:null, g:"", catSet:false, catsReady:false};
try { S.user = JSON.parse(localStorage.getItem("user")); S.cart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) {}
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
var busy = function () { var t = document.activeElement && document.activeElement.tagName; return t === "INPUT" || t === "SELECT" || t === "TEXTAREA"; };
var shoe = function (id) { return S.shoes.filter(function (s) { return s.id === id; })[0]; };

// dati condivisi in tempo reale
db.collection("shoes").orderBy("created", "desc").onSnapshot(function (q) {
  S.shoes = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  S.ready = true; if (!busy()) R(); cartR();
}, function (e) { console.error(e); });
db.collection("menu").orderBy("created").onSnapshot(function (q) {
  S.cats = q.docs.map(function (d) { var x = d.data(); x.id = d.id; x.ids = x.ids || []; return x; });
  S.catsReady = true; applyGender();
  menuR(); if (!busy()) R();
}, function (e) { console.error(e); });
db.collection("ads").orderBy("created", "desc").onSnapshot(function (q) {
  S.ads = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  if (!busy()) R();
}, function (e) { console.error(e); });
auth.onAuthStateChanged(function (u) {
  S.admin = !!u; if (u) S.intro = false; if (u && !S.user) S.user = {first:"Admin", last:"", phone:""};
  R(); menuR(); cartR();
});

var ICO_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#000" style="fill:#000"><rect x="3" y="5.2" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="18" height="2.4" rx="1.2"/><rect x="3" y="16.4" width="11" height="2.4" rx="1.2"/></svg>';
var ICO_IG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/><path d="M16.5 7.5v.01"/></svg>';
var ICO_WA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>';
var ICO_BAG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></svg>';
var ICO_USER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6"/></svg>';
$("mbtn").innerHTML = ICO_MENU + '<span>Menu</span>';
var VAN ='<svg class="van" viewBox="0 0 30 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M1 3h16v11H1zM17 7h6l5 4v3H17z"/><circle cx="7" cy="16" r="2.4" fill="currentColor"/><circle cx="23" cy="16" r="2.4" fill="currentColor"/></svg>';
var NOTE = '<div class="note"><b>Informazioni importanti</b>I prodotti presentati in questo sito sono indicati esclusivamente con il nome del modello e hanno finalità puramente espositiva. Ciascun modello è disponibile in numerosi colori e varianti, non tutti raffigurati o elencati. Per conoscere colori, taglie e disponibilità effettive, vi invitiamo a contattarci direttamente su WhatsApp prima di completare l’ordine. Il sito non gestisce pagamenti: ogni ordine viene confermato e concordato in chat.</div>';

// ---------- schermate ----------
function R() {
  var a = $("app"); document.body.classList.toggle("in", !!S.user && !S.intro);
  if (S.intro) {
    if (!a.querySelector(".intro")) a.innerHTML = '<div class="intro" onclick="endIntro()"><div class="wrap"></div></div>';
    return;
  }
  if (!S.user) {
    var ad = location.hash === "#admin", bx = a.querySelector(".box");
    if (bx && bx.getAttribute("data-ad") === (ad ? "1" : "0")) return;   // non cancellare quello che sta scrivendo
    a.innerHTML = '<div class="box" data-ad="' + (ad ? 1 : 0) + '"><div class="logo">' + esc(SHOP_NAME) + '</div>' +
      '<p class="m">' + (ad ? "Accesso gestore" : "Entra nel negozio") + '</p>' +
      (ad ? '<label>Email</label><input id="em" type="email"><label>Password</label><input id="pw" type="password"><button onclick="alogin()">Entra</button>'
          : '<label>Nome</label><input id="fn" autocomplete="given-name"><label>Numero di telefono</label><input id="ph" type="tel" autocomplete="tel">' + genH("gn", S.g, "S.g=this.value") + '<button onclick="login()">Entra</button>') + '</div>';
    return;
  }
  a.innerHTML = '<header><div class="hl"></div><h1>' + esc(SHOP_NAME) + '</h1>' +
    '<div class="hr">' + (S.admin ? '' : '<button class="ic" onclick="openAccount()" aria-label="Account">' + ICO_USER + '</button>') + '</div></header>' +
    (S.view === "admin" && S.admin ? admin() : shopH());
}
function startIntro() {
  var fl = function () { try { return Promise.all([document.fonts.load('60px "Great Vibes"'), document.fonts.load('italic 600 20px "Cormorant Garamond"')]); } catch (e) { return Promise.resolve(); } };
  var loaded = new Promise(function (r) { if (document.readyState === "complete") r(); else window.addEventListener("load", r); });
  var fonts = Promise.race([fl(), new Promise(function (r) { setTimeout(r, 3500); })]);
  Promise.all([loaded, fonts]).then(function () { setTimeout(function () {
    var w = document.querySelector(".intro .wrap"); if (!S.intro || !w) return;
    var step = .17, n = SHOP_NAME.replace(/ /g, "").length;
    var I = function () { var i = document.querySelector(".intro"); return S.intro && i ? i : null; };
    var t1 = ((n - 1) * step + .9 + .6) * 1000;                // fine scrittura + pausa
    var t2 = t1 + 700 + (.1 + 1.7 + .4 + .4 + 1.0) * 1000;             // fine occhiolino + pausa
    w.innerHTML = writeSVG(SHOP_NAME, step);                   // 1) "Primo Store" a penna
    setTimeout(function () { var i = I(); if (i) i.classList.add("out"); }, t1);
    setTimeout(function () {                                   // 2) la scritta sparisce, spunta l'occhiolino
      var i = I(); if (!i) return;
      w.innerHTML = '<svg class="wr eo" viewBox="-45 -90 168 160" xmlns="http://www.w3.org/2000/svg">' + eyeSVG(0, 0, .1) + '</svg>';
      i.style.transition = "none"; i.classList.remove("out"); void i.offsetWidth; i.style.transition = "";
    }, t1 + 700);
    setTimeout(function () { var i = I(); if (i) i.classList.add("out"); }, t2);
    setTimeout(endIntro, t2 + 600); }, 500); });                // 3) schermata di accesso
}
function endIntro() { if (!S.intro) return; S.intro = false; R(); }

function shopH() {
  if (!S.ready) return '<p class="m" style="text-align:center">Caricamento…</p>';
  var c = S.cats.filter(function (x) { return x.id === S.cat; })[0];
  var list = c ? S.shoes.filter(function (s) { return c.ids.indexOf(s.id) > -1; }) : S.shoes;
  var h = adsH() + '<div class="ct">' + (c ? esc(c.name) : "Tutto") + '</div>' + NOTE;
  if (!list.length) return h + '<p class="m" style="text-align:center">Nessuna scarpa qui per ora.</p>';
  return h + '<div class="grid">' + list.map(function (s, i) {
    return '<div class="card ' + (s.avail ? "" : "out") + '" style="animation-delay:' + (i * 40) + 'ms"><div class="ph" onclick="this.parentNode.classList.toggle(\'ex\')">' + (s.photo ? '<img src="' + s.photo + '" alt="">' : "") + '</div>' +
      '<div class="tt">' + esc(s.name) + '</div><div class="pr">€ ' + Number(s.price).toFixed(2) + '</div>' +
      (s.avail ? '<button class="go" onclick="add(\'' + s.id + '\',this)"><span class="lb"><span class="d">Aggiungi al carrello</span><span class="mb">Aggiungi</span></span>' + VAN + '</button>' : '<div class="m">Non disponibile</div>') + '</div>';
  }).join("") + '</div>';
}

function admin() {
  var e = S.edit ? shoe(S.edit) : null; e = e || {name:"", price:"", sizes:"", avail:true};
  var f = '<div class="form"><div class="m" style="margin-bottom:10px">' + (S.edit ? "Modifica scarpa" : "Nuova scarpa") + '</div>' +
    '<label>Nome</label><input id="nm" value="' + esc(e.name) + '">' +
    '<div class="two"><div><label>Prezzo (€)</label><input id="pr" type="number" step="0.01" value="' + esc(e.price) + '"></div>' +
    '<div><label>Taglie (es. 40, 41, 42)</label><input id="sz" value="' + esc(e.sizes) + '"></div></div>' +
    '<label>Foto</label><input id="fo" type="file" accept="image/*" onchange="pick(this)">' +
    (S.photo ? '<div class="row"><div class="t"><img src="' + S.photo + '" alt=""></div><button class="l" onclick="S.photo=\'\';R()">Rimuovi foto</button></div>' : '') +
    '<div class="chk"><input id="av" type="checkbox" ' + (e.avail ? "checked" : "") + '><label style="margin:0">Disponibile</label></div>' +
    '<button onclick="save()">Salva</button> ' + (S.edit ? '<button class="l" onclick="S.edit=null;S.photo=\'\';R()">Annulla</button>' : '') + '</div>';
  var m = '<div class="form"><div class="m" style="margin-bottom:10px">Menu laterale</div><div class="two"><input id="cn" placeholder="Nuova categoria"><button onclick="addCat()" style="margin-bottom:10px">Aggiungi</button></div>' +
    S.cats.map(function (c) {
      return '<div class="cat"><b>' + esc(c.name) + '</b> &nbsp;<button class="l" onclick="renCat(\'' + c.id + '\')">Rinomina</button> <button class="l" onclick="delCat(\'' + c.id + '\')">Elimina</button><div class="chips">' +
        S.shoes.map(function (s) { return '<label class="chip"><input type="checkbox" ' + (c.ids.indexOf(s.id) > -1 ? "checked" : "") + ' onchange="tcat(\'' + c.id + '\',\'' + s.id + '\',this.checked)">' + esc(s.name) + '</label>'; }).join("") + '</div></div>';
    }).join("") + '</div>';
  var l = S.shoes.map(function (s) {
    return '<div class="row"><div class="t">' + (s.photo ? '<img src="' + s.photo + '" alt="">' : "") + '</div><div class="i">' + esc(s.name) + '<div class="m">€ ' + Number(s.price).toFixed(2) + ' · ' + (s.avail ? "disponibile" : "esaurita") + '</div></div>' +
      '<button class="l" onclick="tog(\'' + s.id + '\')">' + (s.avail ? "Esaurita" : "Disponibile") + '</button> <button class="l" onclick="ed(\'' + s.id + '\')">Modifica</button> <button class="l" onclick="del(\'' + s.id + '\')">Elimina</button></div>';
  }).join("");
  return adAdmin() + f + m + (l || '<p class="m">Nessuna scarpa. Aggiungine una sopra.</p>');
}

// ---------- annunci in home ----------
function adsH() {
  var l = S.ads.filter(adLive);
  return l.map(function (a, i) {
    return '<div class="ad" style="animation-delay:' + (i * 40) + 'ms">' + (a.photo ? '<img src="' + esc(a.photo) + '" alt="">' : '') +
      (a.title || a.text ? '<div class="adb">' + (a.title ? '<b>' + esc(a.title) + '</b>' : '') + (a.text ? '<p>' + esc(a.text).replace(/\n/g, "<br>") + '</p>' : '') + '</div>' : '') + '</div>';
  }).join("");
}
var FIG = {   // omino e donnina come sulle porte dei bagni
  uomo: '<svg viewBox="0 0 24 48" fill="currentColor"><circle cx="12" cy="6" r="4"/><rect x="7" y="12" width="10" height="17" rx="2"/><rect x="3" y="12" width="3" height="15" rx="1.5"/><rect x="18" y="12" width="3" height="15" rx="1.5"/><rect x="8" y="27" width="3.4" height="17" rx="1.7"/><rect x="12.6" y="27" width="3.4" height="17" rx="1.7"/></svg>',
  donna: '<svg viewBox="0 0 24 48" fill="currentColor"><circle cx="12" cy="6" r="4"/><path d="M9 12h6l5 17H4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><rect x="4.4" y="12.6" width="2.6" height="11" rx="1.3" transform="rotate(12 5.7 12.6)"/><rect x="17" y="12.6" width="2.6" height="11" rx="1.3" transform="rotate(-12 18.3 12.6)"/><rect x="8.8" y="29" width="3" height="15" rx="1.5"/><rect x="12.2" y="29" width="3" height="15" rx="1.5"/></svg>'
};
function genH(nm, v, on) {
  return '<label>Sono</label><div class="gen">' + [["uomo", "Uomo"], ["donna", "Donna"]].map(function (x) {
    return '<label class="gp"><input type="radio" name="' + nm + '" value="' + x[0] + '"' + (v === x[0] ? " checked" : "") + (on ? ' onchange="' + on + '"' : "") + '><span>' + FIG[x[0]] + '<em>' + x[1] + '</em></span></label>';
  }).join("") + '</div>';
}
function adOf(id) { return S.ads.filter(function (a) { return a.id === id; })[0]; }
function adDraft() {
  if (!S.adf) { var a = S.adEdit ? adOf(S.adEdit) : null; S.adf = a ? {title:a.title || "", text:a.text || "", photo:a.photo || "", on:a.on !== false, dur:a.until ? "keep" : "0"} : {title:"", text:"", photo:"", on:true, dur:"0"}; }
  return S.adf;
}
function adSync() { var d = S.adf; if (d && $("adt")) { d.title = $("adt").value; d.text = $("adx").value; d.on = $("adv").checked; d.dur = $("adu").value; } return d; }
function adLive(a) { return a.on !== false && (!a.until || a.until > Date.now()); }
function fmtD(t) { return new Date(t).toLocaleString("it-IT", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}); }
function adAdmin() {
  adSync(); var d = adDraft(), ea = S.adEdit ? adOf(S.adEdit) : null;
  var opts = [["0", "Sempre (finché non lo elimini)"], ["1", "1 giorno"], ["3", "3 giorni"], ["7", "1 settimana"], ["14", "2 settimane"], ["30", "1 mese"]];
  if (ea && ea.until) opts.unshift(["keep", (ea.until > Date.now() ? "Mantieni (scade il " : "Mantieni (scaduto il ") + fmtD(ea.until) + ")"]);
  var f ='<div class="form"><div class="m" style="margin-bottom:10px">' + (S.adEdit ? "Modifica annuncio" : "Nuovo annuncio in home (visibile a tutti)") + '</div>' +
    '<label>Titolo</label><input id="adt" value="' + esc(d.title) + '">' +
    '<label>Testo</label><textarea id="adx" rows="3">' + esc(d.text) + '</textarea>' +
    '<label>Foto (facoltativa)</label><input id="adp" type="file" accept="image/*" onchange="pickAd(this)">' +
    (d.photo ? '<div class="row"><div class="t"><img src="' + esc(d.photo) + '" alt=""></div><button class="l" onclick="adDraft().photo=\'\';R()">Rimuovi foto</button></div>' : '') +
    '<label>Durata (conta da quando premi ' + (S.adEdit ? "Salva" : "Pubblica") + ')</label><select id="adu">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (d.dur === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>' +
    '<div class="chk"><input id="adv" type="checkbox" ' + (d.on ? "checked" : "") + '><label style="margin:0">Visibile nella home</label></div>' +
    '<button onclick="saveAd()">' + (S.adEdit ? "Salva" : "Pubblica") + '</button> ' + (S.adEdit ? '<button class="l" onclick="S.adEdit=null;S.adf=null;R()">Annulla</button>' : '') + '</div>';
  var l = S.ads.map(function (a) {
    var on = a.on !== false, st = !on ? "nascosto" : a.until ? (a.until > Date.now() ? "visibile · scade il " + fmtD(a.until) : "scaduto il " + fmtD(a.until)) : "visibile · sempre";
    return '<div class="row ar"><div class="t">' + (a.photo ? '<img src="' + esc(a.photo) + '" alt="">' : "") + '</div><div class="i">' + esc(a.title || a.text || "(solo foto)") + '<div class="m">' + st + '</div></div>' +
      '<div class="act"><button class="sm" onclick="adEd(\'' + a.id + '\')">Modifica</button><button class="sm" onclick="adTog(\'' + a.id + '\')">' + (on ? "Nascondi" : "Mostra") + '</button><button class="sm dg" onclick="adDel(\'' + a.id + '\')">Elimina</button></div></div>';
  }).join("");
  return f + (l ? '<div class="form"><div class="m" style="margin-bottom:6px">Annunci pubblicati</div>' + l + '</div>' : '');
}
function pickAd(inp) {
  var file = inp.files[0]; if (!file) return;
  var d = adDraft(); adSync();
  var r = new FileReader();
  r.onload = function () { var im = new Image(); im.onload = function () {
    var k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = im.width * k; c.height = im.height * k; var x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    d.photo = c.toDataURL("image/jpeg", .75); R(); }; im.src = r.result; };
  r.readAsDataURL(file);
}
function saveAd() {
  var d = adDraft(); adSync();
  var t = d.title.trim(), x = d.text.trim();
  if (!t && !x && !d.photo) { alert("Inserisci almeno un titolo, un testo o una foto"); return; }
  var until = d.dur === "keep" ? ((adOf(S.adEdit) || {}).until || 0) : d.dur === "0" ? 0 : Date.now() + Number(d.dur) * 864e5;
  var o = {title:t, text:x, photo:d.photo || "", on:d.on, until:until};
  var op = S.adEdit ? db.collection("ads").doc(S.adEdit).update(o) : db.collection("ads").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.adEdit = null; S.adf = null; R(); toast("Annuncio salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function adEd(id) { S.adEdit = id; S.adf = null; R(); window.scrollTo(0, 0); }
function adDel(id) { if (confirm("Eliminare questo annuncio?")) { if (S.adEdit === id) { S.adEdit = null; S.adf = null; } db.collection("ads").doc(id).delete(); } }
function adTog(id) { db.collection("ads").doc(id).update({on:adOf(id).on === false}); }

// ---------- menu laterale e carrello ----------
function menuR() {
  var items = [{id:"all", name:"Tutto"}].concat(S.cats);
  $("menu").innerHTML = '<div class="logo">' + esc(SHOP_NAME) + '</div>' +
    items.map(function (c) { return '<button class="mi ' + (S.cat === c.id && S.view === "shop" ? "on" : "") + '" onclick="pickCat(\'' + c.id + '\')">' + esc(c.name) + '</button>'; }).join("") +
    '<div class="mf">' + (S.admin ? '<button class="mi" onclick="go(\'' + (S.view === "shop" ? "admin" : "shop") + '\')">' + (S.view === "shop" ? "Dashboard" : "Torna al negozio") + '</button>' : '') +
    '<button class="mi" onclick="logout()">Esci</button></div>' +
    '<div class="soc"><a href="https://instagram.com/' + encodeURIComponent(typeof SHOP_INSTAGRAM === "string" ? SHOP_INSTAGRAM : "") + '" target="_blank" rel="noopener" aria-label="Instagram">' + ICO_IG + '</a>' +
    '<a href="https://wa.me/' + SHOP_PHONE + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICO_WA + '</a></div>';
}
function pickCat(id) { S.cat = id; S.view = "shop"; closeAll(); menuR(); R(); window.scrollTo(0, 0); }
function openM() { document.body.classList.add("mo"); }
function openC() { document.body.classList.add("co"); }
function closeAll() { document.body.classList.remove("mo", "co", "so"); }

function cartR() {
  var tot = 0, lines = [], rows = "";
  if (S.ready) S.cart = S.cart.filter(function (c) { return shoe(c.id); });
  S.cart.forEach(function (c, i) {
    var s = shoe(c.id); if (!s) return; var p = Number(s.price) * c.q; tot += p;
    lines.push("- " + s.name + (c.size ? " (taglia " + c.size + ")" : "") + " x" + c.q + " = € " + p.toFixed(2));
    rows += '<div class="ci"><div class="t">' + (s.photo ? '<img src="' + s.photo + '" alt="">' : "") + '</div><div style="flex:1">' + esc(s.name) +
      '<div class="m">' + (c.size ? "Taglia " + esc(c.size) + " · " : "") + '€ ' + Number(s.price).toFixed(2) + '</div>' +
      '<div class="q"><button onclick="qty(' + i + ',-1)">−</button>' + c.q + '<button onclick="qty(' + i + ',1)">+</button></div></div></div>';
  });
  var u = S.user || {first:"", last:"", phone:""};
  var msg = encodeURIComponent("Ciao, sono " + (u.first + " " + u.last).trim() + " (" + u.phone + "). Vorrei ordinare:\n" + lines.join("\n") + "\nTotale: € " + tot.toFixed(2));
  $("cart").innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b>Carrello</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (rows || '<p class="m">Il carrello è vuoto.</p>') +
    (rows ? '<div class="tot"><span>Totale</span><b>€ ' + tot.toFixed(2) + '</b></div><a class="wa" href="https://wa.me/' + SHOP_PHONE + '?text=' + msg + '" target="_blank" rel="noopener">Ordina su WhatsApp</a><p class="m" style="text-align:center">Colori, varianti e pagamento si concordano in chat.</p>' : '');
  try { localStorage.setItem("cart", JSON.stringify(S.cart)); } catch (e) {}
  var fb = $("cbtn"); if (fb && !fb.firstChild) fb.innerHTML = ICO_BAG + '<span>Carrello</span><b id="bd" style="display:none"></b>';
  var b = $("bd"), nn = S.cart.reduce(function (t, c) { return t + c.q; }, 0); if (b) { b.textContent = nn; b.style.display = nn ? "" : "none"; }
}
function sizesOf(s) { return (s.sizes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
function add(id, btn) {
  var sz = sizesOf(shoe(id));
  if (sz.length) { openSheet(id, sz); return; }
  addItem(id, ""); fly(btn, id);
}
function addItem(id, size) {
  var f = S.cart.filter(function (c) { return c.id === id && c.size === size; })[0];
  if (f) f.q++; else S.cart.push({id:id, size:size, q:1});
  cartR(); toast("Aggiunto al carrello");
}
function openSheet(id, sz) {
  S.pend = {id:id, size:""};
  $("sheet").innerHTML = '<div class="shh"><b>' + esc(shoe(id).name) + '</b><button class="l" onclick="closeAll()">Chiudi</button></div><div class="m">Scegli la taglia</div>' +
    '<div class="sizes">' + sz.map(function (x) { return '<button class="sq" onclick="pickSz(this,\'' + esc(x) + '\')">' + esc(x) + '</button>'; }).join("") + '</div>' +
    '<button class="go pri" id="sgo" disabled onclick="confirmAdd(this)"><span class="lb">Aggiungi al carrello</span>' + VAN + '</button>';
  document.body.classList.add("so");
}
function pickSz(el, v) {
  S.pend.size = v; var p = el.parentNode.children;
  for (var i = 0; i < p.length; i++) p[i].classList.remove("on");
  el.classList.add("on"); $("sgo").disabled = false;
}
function confirmAdd(btn) {
  if (!S.pend || !S.pend.size) return;
  addItem(S.pend.id, S.pend.size); fly(btn, S.pend.id); setTimeout(closeAll, 800);
}
function fly(b, id) {
  b.classList.remove("run"); void b.offsetWidth; b.classList.add("run");
  var t = $("cbtn"); if (!t) return;
  var s = id ? shoe(id) : null, a = b.getBoundingClientRect(), c = t.getBoundingClientRect(), p = document.createElement("div");
  p.className = "pk"; p.style.left = (a.left + a.width / 2 - 17) + "px"; p.style.top = a.top + "px";   // pallino, o foto del prodotto
  if (s && s.photo) { p.classList.add("im"); p.style.backgroundImage = 'url("' + s.photo + '")'; }
  document.body.appendChild(p);
  var dx = c.left + c.width / 2 - a.left - a.width / 2, dy = c.top + c.height / 2 - a.top - 17;
  p.animate([{transform:"translate(0,0) scale(1)", opacity:0, offset:0}, {transform:"translate(0,-14px) scale(1)", opacity:1, offset:.2},
    {transform:"translate(" + dx + "px," + dy + "px) scale(.3)", opacity:.3, offset:1}], {duration:650, delay:350, easing:"ease-in", fill:"both"}).onfinish = function () {
    p.remove(); t.animate([{transform:"scale(1)"}, {transform:"scale(1.12)"}, {transform:"scale(1)"}], {duration:350});
    var g = $("bd"); if (g) { g.classList.remove("b"); void g.offsetWidth; g.classList.add("b"); } };
}
function qty(i, d) { S.cart[i].q += d; if (S.cart[i].q < 1) S.cart.splice(i, 1); cartR(); R(); }
function toast(t) { var e = $("toast"); e.textContent = t; e.className = "s"; clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ""; }, 1800); }

// ---------- account ----------
function openAccount() {
  $("sheet").innerHTML = '<div class="shh"><b>Il tuo account</b><button class="l" onclick="closeAll()">Chiudi</button></div><div class="m" style="margin-bottom:14px">Modifica i tuoi dati</div>' +
    '<label>Nome</label><input id="an" value="' + esc(S.user.first) + '"><label>Numero di telefono</label><input id="ap" type="tel" value="' + esc(S.user.phone) + '">' + genH("ag", S.user.gender, "") +
    '<button class="pri" style="width:100%" onclick="saveAccount()">Salva</button>';
  document.body.classList.add("so");
}
function saveAccount() {
  var f = $("an").value.trim(), p = $("ap").value.replace(/[\s\-+]/g, ""), g = (document.querySelector('input[name="ag"]:checked') || {}).value || S.user.gender || "";
  if (!f || p.length < 8) { alert("Inserisci nome e un numero valido"); return; }
  S.user = {first:f, last:"", phone:p, gender:g};
  try { localStorage.setItem("user", JSON.stringify(S.user)); } catch (e) {}
  db.collection("clients").doc(p).set({first:f, last:"", phone:p, gender:g, last_login:Date.now()}).catch(function () {});
  closeAll(); R(); cartR(); toast("Dati aggiornati");
}

// ---------- accesso ----------
var LASH = ["M11 -10.5q-5-5-10-5.5", "M22 -15q-3-7-8-9.5", "M33 -18.5q-1-8-4-11.5", "M44 -19.4q1-8 1-12.5", "M55 -17.3q3-8 7-11", "M66 -12.5q6-7 12-8", "M75 -5.7q7-4 13-3"];
function eyeSVG(ex, ey, f) {
  var d = function (v) { return 'style="--d:' + (f + v).toFixed(2) + 's"'; };
  var P = function (c, dd, v) { return '<path class="fs ' + c + '" pathLength="1" d="' + dd + '" ' + d(v) + '/>'; };
  return '<g transform="translate(' + ex + ' ' + ey + ')"><g class="face" style="--p:' + f.toFixed(2) + 's;--w:' + (f + 1.7).toFixed(2) + 's"><g class="mv">' +
    P("brow", "M2 -38C24 -56 60 -56 86 -38", .9) +
    '<g class="open">' +
      P("", "M-16 8C-8 5-4 2 0 0C20-26 60-26 80 0Q86 4 94 2", 0) +
      P("th", "M6 4C28 22 56 22 76 3", .35) +
      '<circle class="fs" pathLength="1" cx="40" cy="-2" r="14" ' + d(.55) + '/>' +
      '<circle class="fs dot" pathLength="1" cx="40" cy="-2" r="8.5" ' + d(.8) + '/>' +
      '<circle class="hl" cx="45" cy="-7" r="1.3" ' + d(1.15) + '/>' +
      LASH.map(function (l, i) { return P("th", l, 1 + i * .04); }).join("") +
      '<g class="refl"><circle class="mw" cx="40" cy="1" r="4"/><circle class="mw t" cx="40" cy="1" r="2.8"/><path class="mw" d="M38.2 -2.6L36.6 -7M41.8 -2.6L43.4 -7"/><text class="mt" x="40" y="2.9" text-anchor="middle">1</text></g>' +
    '</g>' +
    '<g class="closed"><path d="M2 2C24 20 56 20 78 2"/><path d="M18 11q-3 7-6 10"/><path d="M40 17v11"/><path d="M62 11q3 7 6 10"/></g>' +
    '</g>' +
    '<g transform="translate(104 -46)"><path class="star" d="M0-9L2.4-2.4 9 0 2.4 2.4 0 9-2.4 2.4-9 0-2.4-2.4Z"/></g>' +
    '<g transform="translate(90 -64)"><path class="star s2" d="M0-5L1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4Z"/></g></g></g>';
}
function writeSVG(t, step, f0) {
  var pos = [], len = 0, k, ch;
  try {   // misura le lettere con lo stesso motore che le disegna
    var ns = "http://www.w3.org/2000/svg", ms = document.createElementNS(ns, "svg"), tx = document.createElementNS(ns, "text");
    ms.setAttribute("width", "2000"); ms.setAttribute("height", "300"); ms.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden";
    tx.setAttribute("y", "125"); tx.style.cssText = 'font:100px "Great Vibes",cursive'; tx.textContent = t;
    ms.appendChild(tx); document.body.appendChild(ms);
    for (k = 0; k < t.length; k++) pos.push(tx.getStartPositionOfChar(k).x);
    len = tx.getComputedTextLength(); document.body.removeChild(ms);
  } catch (e) { pos = []; len = 0; }
  if (!len || pos.length !== t.length) { pos = []; for (k = 0; k < t.length; k++) pos.push(k * 40); len = t.length * 40; }
  var o = "", n = 0, x = 30 + len, fw = 0;
  for (k = 0; k < t.length; k++) {
    ch = t.charAt(k);
    if (ch !== " ") { o += '<text x="' + (30 + pos[k]).toFixed(1) + '" y="125" style="--d:' + (n * step).toFixed(2) + 's">' + esc(ch) + '</text>'; n++; }
  }
  if (f0 !== undefined) { fw = 170; o += eyeSVG(x + 40, 96, f0); }
  return '<svg class="wr" viewBox="0 0 ' + (x + 30 + fw).toFixed(1) + ' 200" xmlns="http://www.w3.org/2000/svg">' + o + '</svg>';
}
function hi() {
  var u = S.user || {}, firstName = u.first ? u.first.trim() : "", welcomeText;
  // genere scelto all'accesso; se manca (vecchi accessi) si deduce dal nome
  if (u.gender === "donna") welcomeText = "Benvenuta";
  else if (u.gender === "uomo") welcomeText = "Benvenuto";
  else welcomeText = firstName.slice(-1).toLowerCase() === "a" ? "Benvenuta" : "Benvenuto";

  var h = $("hi"), t = welcomeText + ", " + firstName, k = hi.k = (hi.k || 0) + 1;
  clearTimeout(hi.t);
  var go = function () {
    if (k !== hi.k) return;                                    // saltato prima ancora di partire
    var dur = t.length * 90 + 2400;
    h.style.transition = h.style.opacity = "";
    h.innerHTML = writeSVG(t, .09); h.style.animationDuration = dur + "ms"; h.className = ""; void h.offsetWidth; h.className = "show";
    hi.t = setTimeout(function () { h.className = ""; }, dur + 100);
  };
  h.onclick = skipHi;
  try { Promise.race([document.fonts.load('100px "Great Vibes"'), new Promise(function (r) { setTimeout(r, 1500); })]).then(go); } catch (e) { go(); }
}
function skipHi() {                                            // un tocco chiude il benvenuto, come l'intro
  var h = $("hi"); hi.k = (hi.k || 0) + 1; clearTimeout(hi.t);
  if (h.className !== "show") return;
  var o = getComputedStyle(h).opacity;
  h.className = ""; h.style.transition = "none"; h.style.opacity = o; void h.offsetWidth;
  h.style.transition = "opacity .2s"; h.style.opacity = 0;
  hi.t = setTimeout(function () { h.style.transition = h.style.opacity = ""; }, 250);
}
// le clienti donna aprono il negozio nella categoria "Donna" (se esiste nel menu)
function applyGender() {
  if (S.catSet || !S.user || S.user.gender !== "donna") return;
  var c = S.cats.filter(function (x) { return /^donn[ae]$/i.test(String(x.name).trim()); })[0];
  if (c) S.cat = c.id;
  if (c || S.catsReady) S.catSet = true;
}
function login() {
  var f = $("fn").value.trim(), l = "", p = $("ph").value.replace(/[\s\-+]/g, ""), g = S.g || (document.querySelector('input[name="gn"]:checked') || {}).value || "";
  if (!f || p.length < 8) { alert("Inserisci nome e un numero valido"); return; }
  if (!g) { alert("Seleziona uomo o donna"); return; }
  S.user = {first:f, last:l, phone:p, gender:g};
  try { localStorage.setItem("user", JSON.stringify(S.user)); } catch (e) {}
  db.collection("clients").doc(p).set({first:f, last:l, phone:p, gender:g, last_login:Date.now()}).catch(function () {});
  S.view = "shop"; S.cat = "all"; S.catSet = false; applyGender(); menuR(); R(); cartR(); hi();
}
function alogin() {
  auth.signInWithEmailAndPassword($("em").value.trim(), $("pw").value).then(function () { S.view = "admin"; location.hash = ""; hi(); }).catch(function () { alert("Credenziali non valide"); });
}
function logout() { S.user = null; S.admin = false; S.view = "shop"; S.cat = "all"; S.catSet = false; S.g = ""; try { localStorage.removeItem("user"); } catch (e) {} auth.signOut(); closeAll(); R(); }
function go(v) { S.view = v; S.edit = null; S.photo = ""; S.adEdit = null; S.adf = null; closeAll(); menuR(); R(); window.scrollTo(0, 0); }

// ---------- dashboard: prodotti ----------
function pick(inp) {
  var file = inp.files[0]; if (!file) return;
  var r = new FileReader();
  r.onload = function () { var im = new Image(); im.onload = function () {
    var k = Math.min(1, 700 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = im.width * k; c.height = im.height * k; var x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    S.photo = c.toDataURL("image/jpeg", .75); R(); }; im.src = r.result; };
  r.readAsDataURL(file);
}
function save() {
  var n = $("nm").value.trim(), p = parseFloat($("pr").value);
  if (!n || isNaN(p)) { alert("Nome e prezzo obbligatori"); return; }
  var o = {name:n, price:p, sizes:$("sz").value.trim(), avail:$("av").checked, photo:S.photo};
  var op = S.edit ? db.collection("shoes").doc(S.edit).update(o) : db.collection("shoes").add(Object.assign(o, {created:Date.now()}));
  op.then(function () { S.edit = null; S.photo = ""; R(); toast("Salvato"); }).catch(function (e) { alert("Errore: " + e.message); });
}
function ed(id) { S.edit = id; S.photo = shoe(id).photo || ""; R(); window.scrollTo(0, 0); }
function del(id) { if (confirm("Eliminare questa scarpa?")) db.collection("shoes").doc(id).delete(); }
function tog(id) { db.collection("shoes").doc(id).update({avail:!shoe(id).avail}); }

// ---------- dashboard: menu laterale ----------
function addCat() { var n = $("cn").value.trim(); if (n) db.collection("menu").add({name:n, ids:[], created:Date.now()}); }
function renCat(id) { var c = S.cats.filter(function (x) { return x.id === id; })[0], n = prompt("Nuovo nome", c.name); if (n && n.trim()) db.collection("menu").doc(id).update({name:n.trim()}); }
function delCat(id) { if (confirm("Eliminare la categoria?")) { if (S.cat === id) S.cat = "all"; db.collection("menu").doc(id).delete(); } }
function tcat(cid, sid, on) { db.collection("menu").doc(cid).update({ids: on ? FV.arrayUnion(sid) : FV.arrayRemove(sid)}); }

window.addEventListener("hashchange", R);
S.intro = !S.user;
R();
if (S.intro) startIntro();
