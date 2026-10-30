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
// La dashboard (gestione prodotti, annunci, sconti, ecc.) è nel file admin.js

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth(), db = firebase.firestore(), FV = firebase.firestore.FieldValue;
var S = {user:null, admin:false, shoes:[], cats:[], ads:[], infos:[], notifs:[], sales:[], coupons:[], clients:[], cat:"all", view:"shop", tab:"prod", edit:null, d:{},
  adEdit:null, slEdit:null, cpEdit:null, infEdit:null, nfEdit:null, revEdit:null, reviews:[], notReady:false, autoDone:false, openCat:null, drag:false, mode:"",
  cart:[], coupon:null, ready:false, infoReady:false, intro:false, cur:null, g:"", catSet:false, catsReady:false};
try { S.user = JSON.parse(localStorage.getItem("user")); S.cart = JSON.parse(localStorage.getItem("cart")) || []; S.coupon = JSON.parse(localStorage.getItem("coupon")); } catch (e) {}
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
var busy = function () { var t = document.activeElement && document.activeElement.tagName; return S.drag || t === "INPUT" || t === "SELECT" || t === "TEXTAREA"; };
var r2 = function (x) { return Math.round(x * 100) / 100; };
var shoe = function (id) { return S.shoes.filter(function (s) { return s.id === id; })[0]; };
var catOf = function (id) { return S.cats.filter(function (c) { return c.id === id; })[0]; };

// ---------- suoni di navigazione (generati al volo, nessun file) ----------
var SND = lsGet("snd") !== "0", AC = null;
function tone(f, at, d, type, v) {
  var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || .06, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
}
function snd(k) {
  snd.t = Date.now(); if (!SND) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
    if (k === "tap") tone(1050, 0, .045, "triangle", .05);
    else if (k === "tick") tone(760, 0, .03, "triangle", .035);
    else if (k === "open") { tone(330, 0, .12, "sine", .06); tone(495, .05, .14, "sine", .05); }
    else if (k === "close") { tone(495, 0, .1, "sine", .05); tone(330, .05, .12, "sine", .05); }
    else if (k === "add") { tone(660, 0, .1, "sine", .07); tone(880, .09, .1, "sine", .07); tone(1320, .18, .2, "sine", .06); }
    else if (k === "ok") { tone(523, 0, .1, "sine", .07); tone(784, .1, .22, "sine", .07); }
    else if (k === "warn") tone(200, 0, .18, "sawtooth", .035);
  } catch (e) {}
}
snd.t = 0;
function setSnd(on) { SND = !!on; lsSet("snd", on ? "1" : "0"); if (on) snd("ok"); }
document.addEventListener("click", function (e) {              // ogni tocco su un tasto fa un piccolo "tic" (se non ha già un suono suo)
  if (Date.now() - snd.t > 90 && e.target.closest && e.target.closest("button,a,.card,.gp,.chip,summary,.dots i")) snd("tap");
});

// dati condivisi in tempo reale
db.collection("shoes").orderBy("created", "desc").onSnapshot(function (q) {
  S.shoes = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  S.ready = true; if (!busy()) R(); cartR();
}, function (e) { console.error(e); });
db.collection("menu").orderBy("created").onSnapshot(function (q) {
  S.cats = q.docs.map(function (d) { var x = d.data(); x.id = d.id; x.ids = x.ids || []; return x; });
  S.catsReady = true; applyGender();
  menuR(); if (!busy()) R(); cartR();
}, function (e) { console.error(e); });
db.collection("ads").orderBy("created", "desc").onSnapshot(function (q) {
  S.ads = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  if (!busy()) R();
}, function (e) { console.error(e); });
db.collection("info").orderBy("created").onSnapshot(function (q) {
  S.infos = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  S.infoReady = true; if (!busy()) R(); tryAuto();
}, function (e) { S.infoReady = true; console.error(e); if (!busy()) R(); tryAuto(); });
db.collection("notifs").orderBy("created", "desc").onSnapshot(function (q) {
  S.notifs = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  S.notReady = true; if (!busy()) R(); tryAuto();
}, function (e) { S.notReady = true; console.error(e); tryAuto(); });
db.collection("reviews").orderBy("created", "desc").onSnapshot(function (q) {
  S.reviews = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
}, function (e) { console.error(e); });
db.collection("sales").orderBy("created", "desc").onSnapshot(function (q) {
  S.sales = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  if (!busy()) R(); cartR();
}, function (e) { console.error(e); });
auth.onAuthStateChanged(function (u) {
  S.admin = !!u; if (u) S.intro = false; if (u && !S.user) S.user = {first:"Admin", last:"", phone:""};
  if (typeof adminListen === "function") adminListen(!!u);
  R(); menuR(); cartR();
});

var ICO_BELL = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17h12l-1.6-2.4V10a4.4 4.4 0 0 0-8.8 0v4.6L6 17z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
var ICO_INFO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.01"/></svg>';
var ICO_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5.2" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="18" height="2.4" rx="1.2"/><rect x="3" y="16.4" width="11" height="2.4" rx="1.2"/></svg>';
var ICO_IG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/><path d="M16.5 7.5v.01"/></svg>';
var ICO_STAR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5z"/></svg>';
var ICO_BAG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></svg>';
var ICO_USER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6"/></svg>';
$("mbtn").innerHTML = ICO_MENU; $("abtn").innerHTML = ICO_USER; $("rbtn").innerHTML = ICO_STAR;
var VAN = '<svg class="van" viewBox="0 0 30 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M1 3h16v11H1zM17 7h6l5 4v3H17z"/><circle cx="7" cy="16" r="2.4" fill="currentColor"/><circle cx="23" cy="16" r="2.4" fill="currentColor"/></svg>';
var NOTE_T = "Informazioni importanti";
var NOTE_X = "I prodotti presentati in questo sito sono indicati esclusivamente con il nome del modello e hanno finalità puramente espositiva. Ciascun modello è disponibile in numerosi colori e varianti, non tutti raffigurati o elencati. Per conoscere colori, taglie e disponibilità effettive, vi invitiamo a contattarci direttamente su WhatsApp prima di completare l’ordine. Il sito non gestisce pagamenti: ogni ordine viene confermato e concordato in chat.";
var NOTE = '<div class="note"><b>' + NOTE_T + '</b>' + NOTE_X + '</div>';

// ---------- prezzi, foto e sconti ----------
function photosOf(s) { return s.photos && s.photos.length ? s.photos : (s.photo ? [{src:s.photo, name:"", price:null}] : []); }
function thumb(s, v) { var p = photosOf(s); return (p[v || 0] || p[0] || {}).src || ""; }
function vPrice(s, v) { var p = photosOf(s)[v || 0], x = p ? p.price : null; return x != null && x !== "" && !isNaN(x) ? Number(x) : Number(s.price); }
function sLive(x) { return x.on !== false && (!x.until || x.until > Date.now()); }
function saleApplies(sl, s) {
  if (sl.scope === "cat") { var c = catOf(sl.cat); return !!c && c.ids.indexOf(s.id) > -1; }
  if (sl.scope === "prod") return (sl.targets || []).indexOf(s.id) > -1;
  return true;
}
function priceOf(s, v) {                                       // prezzo base, prezzo scontato e offerta applicata
  var b = vPrice(s, v), fin = b, best = null;
  S.sales.forEach(function (sl) {
    if (!sLive(sl) || !saleApplies(sl, s)) return;
    var f = r2(sl.type === "fix" ? Math.max(0, b - Number(sl.value)) : b * (1 - Number(sl.value) / 100));
    if (f < fin) { fin = f; best = sl; }
  });
  return {base:b, final:fin, sale:best};
}
function tagOf(sl) { return sl.type === "fix" ? "-€ " + Number(sl.value).toFixed(2).replace(/\.00$/, "") : "-" + Number(sl.value) + "%"; }
function priceH(pr) { return pr.sale ? '<s>€ ' + pr.base.toFixed(2) + '</s> <b>€ ' + pr.final.toFixed(2) + '</b> <span class="tag">' + tagOf(pr.sale) + '</span>' : '<b>€ ' + pr.base.toFixed(2) + '</b>'; }
function ordered() {                                           // ordine deciso dalla dashboard; i prodotti mai spostati vanno in fondo
  var a = [], b = [];
  S.shoes.forEach(function (s) { (typeof s.ord === "number" ? a : b).push(s); });
  a.sort(function (x, y) { return x.ord - y.ord; });
  return a.concat(b);
}

// ---------- schermate ----------
function R() {
  var a = $("app"); document.body.classList.toggle("in", !!S.user && !S.intro);
  if (S.intro) {
    if (!a.querySelector(".intro")) a.innerHTML = '<div class="intro" onclick="endIntro()"><div class="wrap"></div></div>';
    return;
  }
  if (!S.user) {
    var ad = location.hash === "#admin", key = ad ? "a" : (S.mode || "c"), bx = a.querySelector(".box"), h;
    if (bx && bx.getAttribute("data-k") === key) return;       // non cancellare quello che sta scrivendo
    if (key === "a") h = '<p class="m">Accesso gestore</p><label>Email</label><input id="em" type="email"><label>Password</label><input id="pw" type="password"><button class="pri" onclick="alogin()">Entra</button>';
    else if (key === "l") h = '<p class="m">Inserisci il numero con cui ti sei registrato</p><label>Numero di telefono</label><input id="ph" type="tel" autocomplete="tel"><button class="pri" onclick="login()">Accedi</button>' +
      '<button class="l" onclick="setMode(\'r\')">Non hai un account? Registrati</button><button class="l" onclick="setMode(\'\')">Indietro</button>';
    else if (key === "r") h = '<p class="m">Crea il tuo account</p><label>Nome</label><input id="fn" autocomplete="given-name"><label>Numero di telefono</label><input id="ph" type="tel" autocomplete="tel">' + genH("gn", S.g, "S.g=this.value") +
      '<button class="pri" onclick="register()">Registrati</button><button class="l" onclick="setMode(\'l\')">Hai già un account? Accedi</button><button class="l" onclick="setMode(\'\')">Indietro</button>';
    else h = '<p class="m">Benvenuto/a. Come vuoi entrare?</p><button class="pri" onclick="setMode(\'l\')">Accedi</button><button onclick="setMode(\'r\')">Registrati</button>';
    a.innerHTML = '<div class="box" data-k="' + key + '"><div class="logo">' + esc(SHOP_NAME) + '</div>' + h + '</div>';
    return;
  }
  a.innerHTML = '<header><div class="hl"></div><h1>' + esc(SHOP_NAME) + '</h1><div class="hr"></div></header>' +
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
  var qk = '<div class="qk"><button class="qb" onclick="openNotifs()"><span class="ib">' + ICO_BELL + (unreadN() ? '<b class="nb">' + unreadN() + '</b>' : '') + '</span>Notifiche</button>' +
    '<button class="qb" onclick="openInfo()"><span class="ib">' + ICO_INFO + (infoDot() ? '<i class="dt"></i>' : '') + '</span>Info</button>' +
    (S.admin ? '<button class="qb dsh" onclick="go(\'admin\')">Dashboard</button>' : '') + '</div>';
  if (!S.ready) return qk + '<p class="m" style="text-align:center">Caricamento…</p>';
  var c = catOf(S.cat), all = ordered();
  var list = c ? all.filter(function (s) { return c.ids.indexOf(s.id) > -1; }) : all;
  var h = qk + adsH() + '<div class="ct">' + (c ? esc(c.name) : "Tutto") + '</div>';
  if (!list.length) return h + '<p class="m" style="text-align:center">Nessuna scarpa qui per ora.</p>';
  return h + '<div class="grid">' + list.map(function (s, i) {
    var n = photosOf(s).length, img = thumb(s, 0);
    return '<div class="card ' + (s.avail ? "" : "out") + '" onclick="openP(\'' + s.id + '\')" style="animation-delay:' + (i * 40) + 'ms"><div class="ph">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + (n > 1 ? '<span class="cnt">' + n + ' ' + (s.vt === "stili" ? "stili" : "colori") + '</span>' : '') + '</div>' +
      '<div class="tt">' + esc(s.name) + '</div><div class="pr">' + priceH(priceOf(s, 0)) + '</div>' + (s.avail ? '' : '<div class="m">Non disponibile</div>') + '</div>';
  }).join("") + '</div>';
}

// ---------- annunci e info in home ----------
function adsH() {
  var l = S.ads.filter(sLive);
  return l.map(function (a, i) {
    return '<div class="ad" style="animation-delay:' + (i * 40) + 'ms">' + (a.photo ? '<img src="' + esc(a.photo) + '" alt="">' : '') +
      (a.title || a.text ? '<div class="adb">' + (a.title ? '<b>' + esc(a.title) + '</b>' : '') + (a.text ? '<p>' + esc(a.text).replace(/\n/g, "<br>") + '</p>' : '') + '</div>' : '') + '</div>';
  }).join("");
}
// ---------- notifiche e info (due pulsanti sotto il titolo) ----------
function infosSorted() {                                       // ordine deciso dalla dashboard; le nuove vanno in fondo
  var a = [], b = [];
  S.infos.forEach(function (i) { (typeof i.ord === "number" ? a : b).push(i); });
  a.sort(function (x, y) { return x.ord - y.ord; });
  return a.concat(b);
}
function infoList() {
  if (!S.infoReady) return [];
  if (!S.infos.length) return [{title:NOTE_T, text:NOTE_X}];   // testo predefinito finché non ne crei di tuoi dalla dashboard
  return infosSorted().filter(function (i) { return i.on !== false; });
}
function hashS(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h); }
function infoSig() { return hashS(JSON.stringify(infoList().map(function (i) { return [i.title, i.text]; }))); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function infoDot() { var l = infoList(); return l.length > 0 && lsGet("seenI") !== infoSig(); }
function seenN() { try { return JSON.parse(lsGet("seenN")) || []; } catch (e) { return []; } }
function unreadN() { var s = seenN(); return S.notifs.filter(function (n) { return sLive(n) && s.indexOf(n.id) < 0; }).length; }
function openNotifs() {
  var l = S.notifs.filter(sLive); S.cur = null;
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>Notifiche</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (l.length ? l.map(function (n) {
      return '<div class="nt"><b>' + esc(n.title) + '</b><p>' + esc(n.text || "").replace(/\n/g, "<br>") + '</p><span class="m">' + new Date(n.created || Date.now()).toLocaleDateString("it-IT", {day:"numeric", month:"long"}) + '</span></div>';
    }).join("") : '<p class="m" style="margin-top:14px">Nessuna notifica per ora.</p>');
  document.body.classList.add("so"); snd("open");
  lsSet("seenN", JSON.stringify(l.map(function (n) { return n.id; }))); R();
}
function openInfo() {
  var l = infoList(); S.cur = null;
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>Info</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (l.length ? l.map(function (i) { return '<div class="note" style="border-left-color:' + esc(i.color || "#ffffff") + '">' + (i.title ? '<b>' + esc(i.title) + '</b>' : '') + esc(i.text || "").replace(/\n/g, "<br>") + '</div>'; }).join("") : '<p class="m" style="margin-top:14px">Nessuna informazione.</p>');
  document.body.classList.add("so"); snd("open");
  lsSet("seenI", infoSig()); R();
}
// ---------- recensioni: foto e video dei prodotti arrivati ----------
function embedH(u) {
  u = String(u || "").trim();
  var yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return '<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] + '" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
  if (/^https?:\/\//i.test(u) && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return '<div class="vid"><video src="' + esc(u) + '" controls playsinline preload="metadata"></video></div>';
  if (/^https?:\/\//i.test(u)) return '<a class="vl" href="' + esc(u) + '" target="_blank" rel="noopener">▶ Guarda il video</a>';
  return "";
}
function openReviews() {
  var l = S.reviews.filter(function (r) { return r.on !== false; }); S.cur = null;
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>Recensioni</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    '<p class="m" style="margin:6px 0 4px">Foto e video dei prodotti arrivati ai nostri clienti.</p>' +
    (l.length ? l.map(function (r) {
      var ph = r.photos || [];
      return '<div class="rv">' + (ph.length ? '<div class="rph">' + ph.map(function (p) { return '<img src="' + esc(p) + '" alt="" loading="lazy">'; }).join("") + '</div>' : '') + embedH(r.video) +
        (r.title ? '<b>' + esc(r.title) + '</b>' : '') + (r.text ? '<p>' + esc(r.text).replace(/\n/g, "<br>") + '</p>' : '') + '</div>';
    }).join("") : '<p class="m" style="margin-top:14px">Le recensioni arriveranno presto.</p>');
  document.body.classList.add("so"); snd("open");
}
// quando ci sono notifiche o info nuove, la sezione si apre da sola appena il cliente entra (una volta sola)
function tryAuto() {
  if (S.autoDone || !S.user || S.admin || S.intro || document.body.classList.contains("hiw")) return;
  if (!S.infoReady || !S.notReady) return;
  S.autoDone = true;
  if (unreadN()) openNotifs(); else if (infoDot()) openInfo();
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

// ---------- menu laterale ----------
function menuR() {
  var items = [{id:"all", name:"Tutto"}].concat(S.cats);
  $("menu").innerHTML = '<div class="mh"><button class="mx" onclick="closeAll()" aria-label="Chiudi">✕</button><div class="mlogo">' + esc(SHOP_NAME) + '</div></div>' +
    '<div class="mlist"><div class="mlab">Categorie</div>' +
    items.map(function (c, i) { return '<button class="mi ' + (S.cat === c.id && S.view === "shop" ? "on" : "") + '" style="--i:' + i + '" onclick="pickCat(\'' + c.id + '\')"><i>' + (i < 9 ? "0" : "") + (i + 1) + '</i>' + esc(c.name) + '</button>'; }).join("") + '</div>' +
    '<div class="soc"><a class="sb" href="https://instagram.com/' + encodeURIComponent(IG()) + '" target="_blank" rel="noopener" aria-label="Instagram">' + ICO_IG + 'Instagram</a></div>';
}
function IG() { return typeof SHOP_INSTAGRAM === "string" && SHOP_INSTAGRAM ? SHOP_INSTAGRAM : "primostore.terrasini"; }
function pickCat(id) { S.cat = id; S.view = "shop"; closeAll(); menuR(); R(); window.scrollTo(0, 0); }
function openM() { document.body.classList.add("mo"); snd("open"); }
function openC() { document.body.classList.add("co"); snd("open"); }
function closeAll() { var b = document.body.classList; if (b.contains("mo") || b.contains("co") || b.contains("so")) snd("close"); b.remove("mo", "co", "so"); }

// ---------- scheda prodotto: foto da sfogliare, taglia, aggiungi ----------
function sizesOf(s) { return (s.sizes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
function openP(id) {
  var s = shoe(id); if (!s) return;
  S.cur = {id:id, v:0, size:""};
  var ph = photosOf(s), sz = sizesOf(s), ds = s.desc ? '<div class="pd">' + esc(s.desc).replace(/\n/g, "<br>") + '</div>' : "", top = s.descPos === "top";
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>' + esc(s.name) + '</b><button class="l" onclick="closeAll()">Chiudi</button></div>' + (top ? ds : "") +
    '<div class="galw"><div class="gal" id="gal" onscroll="galScroll(this)">' +
      (ph.length ? ph.map(function (p) { return '<div class="sl"><img src="' + esc(p.src) + '" alt=""></div>'; }).join("") : '<div class="sl"></div>') + '</div>' +
      (ph.length > 1 ? '<button class="gn l2" onclick="galGo(-1)" aria-label="Precedente">‹</button><button class="gn r2" onclick="galGo(1)" aria-label="Successiva">›</button>' +
        '<div class="dots" id="dots">' + ph.map(function (p, i) { return '<i class="' + (i ? "" : "on") + '" onclick="galTo(' + i + ')"></i>'; }).join("") + '</div>' : '') + '</div>' +
    '<div class="vn" id="vn"></div><div class="pp" id="pp"></div>' + (top ? "" : ds) +
    (sz.length ? '<div class="m">Scegli la taglia</div><div class="sizes">' + sz.map(function (x) { return '<button class="sq" onclick="pickSz(this,\'' + esc(x) + '\')">' + esc(x) + '</button>'; }).join("") + '</div>' : '') +
    '<button class="go add" id="sgo" disabled onclick="confirmAdd(this)"><span class="lb" id="slb"></span>' + VAN + '</button>';
  pUpd(); document.body.classList.add("so"); snd("open");
}
function pUpd() {                                              // aggiorna modello, prezzo e tasto in base a foto e taglia scelte
  var s = shoe(S.cur.id), v = S.cur.v, p = photosOf(s)[v], b = $("sgo"), ok = s.avail && (!sizesOf(s).length || !!S.cur.size);
  $("vn").textContent = p && p.name ? p.name : "";
  $("pp").innerHTML = priceH(priceOf(s, v));
  b.disabled = !ok; b.classList.toggle("ok", ok);
  $("slb").textContent = !s.avail ? "Non disponibile" : ok ? "Aggiungi al carrello" : "Scegli la taglia";
}
function galScroll(g) {
  var i = Math.round(g.scrollLeft / (g.clientWidth || 1));
  if (!S.cur || i === S.cur.v) return;
  S.cur.v = i; snd("tick"); var d = $("dots");
  if (d) [].forEach.call(d.children, function (x, k) { x.classList.toggle("on", k === i); });
  pUpd();
}
function galTo(i) { var g = $("gal"); g.scrollTo({left:i * g.clientWidth, behavior:"smooth"}); }
function galGo(d) { var g = $("gal"); galTo(Math.max(0, Math.min(g.children.length - 1, S.cur.v + d))); }
function pickSz(el, v) {
  S.cur.size = v; var p = el.parentNode.children;
  for (var i = 0; i < p.length; i++) p[i].classList.remove("on");
  el.classList.add("on"); pUpd();
}
function confirmAdd(btn) {
  var c = S.cur; if (!c) return; var s = shoe(c.id);
  if (!s || !s.avail || (sizesOf(s).length && !c.size)) return;
  addItem(c.id, c.size, c.v); fly(btn, c.id, c.v); setTimeout(closeAll, 800);
}
function addItem(id, size, v) {
  v = v || 0;
  var f = S.cart.filter(function (c) { return c.id === id && c.size === size && (c.v || 0) === v; })[0];
  if (f) f.q++; else S.cart.push({id:id, size:size, v:v, q:1});
  cartR(); toast("Aggiunto al carrello"); snd("add");
}
function fly(b, id, v) {
  b.classList.remove("run"); void b.offsetWidth; b.classList.add("run");
  var t = $("cbtn"); if (!t) return;
  var s = id ? shoe(id) : null, img = s ? thumb(s, v) : "", a = b.getBoundingClientRect(), c = t.getBoundingClientRect(), p = document.createElement("div");
  p.className = "pk"; p.style.left = (a.left + a.width / 2 - 17) + "px"; p.style.top = a.top + "px";   // pallino, o foto del prodotto
  if (img) { p.classList.add("im"); p.style.backgroundImage = 'url("' + img + '")'; }
  document.body.appendChild(p);
  var dx = c.left + c.width / 2 - a.left - a.width / 2, dy = c.top + c.height / 2 - a.top - 17;
  p.animate([{transform:"translate(0,0) scale(1)", opacity:0, offset:0}, {transform:"translate(0,-14px) scale(1)", opacity:1, offset:.2},
    {transform:"translate(" + dx + "px," + dy + "px) scale(.3)", opacity:.3, offset:1}], {duration:650, delay:350, easing:"ease-in", fill:"both"}).onfinish = function () {
    p.remove(); t.animate([{transform:"scale(1)"}, {transform:"scale(1.12)"}, {transform:"scale(1)"}], {duration:350});
    var g = $("bd"); if (g) { g.classList.remove("b"); void g.offsetWidth; g.classList.add("b"); } };
}

// ---------- carrello e coupon ----------
function couponDisc(sub) {
  var c = S.coupon; if (!c || !sLive(c) || sub < Number(c.min || 0)) return 0;
  return r2(c.type === "fix" ? Math.min(Number(c.value), sub) : sub * Number(c.value) / 100);
}
function saveCoupon() { try { if (S.coupon) localStorage.setItem("coupon", JSON.stringify(S.coupon)); else localStorage.removeItem("coupon"); } catch (e) {} }
function applyCoupon() {
  var code = ($("cpn").value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ""); if (!code) return;
  db.collection("coupons").doc(code).get().then(function (d) {
    var c = d.exists ? d.data() : null;
    if (!c) { toast("Codice non valido"); snd("warn"); return; }
    if (!sLive(c)) { toast("Coupon scaduto o non attivo"); snd("warn"); return; }
    c.code = d.id; S.coupon = c; saveCoupon(); cartR(); toast("Coupon applicato"); snd("ok");
  }).catch(function () { toast("Impossibile verificare il coupon"); });
}
function rmCoupon() { S.coupon = null; saveCoupon(); cartR(); }
function checkCoupon() {                                       // all'avvio controlla che il coupon salvato valga ancora
  if (!S.coupon || !S.coupon.code) { S.coupon = null; return; }
  db.collection("coupons").doc(S.coupon.code).get().then(function (d) {
    S.coupon = d.exists && sLive(d.data()) ? Object.assign(d.data(), {code:d.id}) : null; saveCoupon(); cartR();
  }).catch(function () {});
}
function cartR() {
  var sub = 0, lines = [], rows = "", typing = document.activeElement && document.activeElement.id === "cpn";
  if (S.ready) S.cart = S.cart.filter(function (c) { return shoe(c.id); });
  S.cart.forEach(function (c, i) {
    var s = shoe(c.id); if (!s) return;
    var v = c.v || 0, pr = priceOf(s, v), p = r2(pr.final * c.q), ph = photosOf(s)[v], vn = ph && ph.name ? ph.name : "", im = thumb(s, v); sub += p;
    lines.push("- " + s.name + (vn ? " (" + vn + ")" : "") + (c.size ? " taglia " + c.size : "") + " x" + c.q + " = € " + p.toFixed(2));
    rows += '<div class="ci"><div class="t">' + (im ? '<img src="' + esc(im) + '" alt="">' : "") + '</div><div style="flex:1">' + esc(s.name) +
      '<div class="m">' + [vn ? esc(vn) : "", c.size ? "Taglia " + esc(c.size) : ""].filter(Boolean).join(" · ") + '</div><div class="pr2">' + priceH(pr) + '</div>' +
      '<div class="q"><button onclick="qty(' + i + ',-1)">−</button>' + c.q + '<button onclick="qty(' + i + ',1)">+</button></div></div></div>';
  });
  sub = r2(sub);
  var cd = couponDisc(sub), tot = r2(sub - cd), cp = S.coupon;
  var u = S.user || {first:"", last:"", phone:""};
  var msg = "Ciao, sono " + (u.first + " " + u.last).trim() + " (" + u.phone + "). Vorrei ordinare:\n" + lines.join("\n") +
    (cd ? "\nCoupon " + cp.code + ": -€ " + cd.toFixed(2) : "") + "\nTotale: € " + tot.toFixed(2);
  S.orderMsg = rows ? msg : "";
  if (!typing) $("cart").innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b>Carrello</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (rows || '<p class="m">Il carrello è vuoto.</p>') +
    (rows ? (cp ? '<div class="cpa"><span>Coupon <b>' + esc(cp.code) + '</b>' + (cd ? ' · -€ ' + cd.toFixed(2) : ' · ordine minimo € ' + Number(cp.min || 0).toFixed(2)) + '</span><button class="l" onclick="rmCoupon()">Rimuovi</button></div>'
        : '<div class="cpn"><input id="cpn" placeholder="Hai un coupon?" autocapitalize="characters" autocomplete="off"><button class="sm" onclick="applyCoupon()">Applica</button></div>') +
      (cd ? '<div class="tr"><span>Subtotale</span><span>€ ' + sub.toFixed(2) + '</span></div><div class="tr"><span>Sconto coupon</span><span>-€ ' + cd.toFixed(2) + '</span></div>' : '') +
      '<div class="tot"><span>Totale</span><b>€ ' + tot.toFixed(2) + '</b></div><button class="wa" onclick="orderIG()">Ordina su Instagram</button>' +
      '<p class="m" style="text-align:center;margin:10px 0 6px">Si apre la chat di Instagram: il messaggio è già copiato, incollalo e invialo. Colori, varianti e pagamento si concordano lì.</p>' +
      '<details class="om"><summary class="m">Vedi il messaggio dell’ordine</summary><textarea readonly rows="6" onfocus="this.select()">' + esc(msg) + '</textarea></details>' : '');
  try { localStorage.setItem("cart", JSON.stringify(S.cart)); } catch (e) {}
  var fb = $("cbtn"); if (fb && !fb.firstChild) fb.innerHTML = ICO_BAG + '<span>Carrello</span><b id="bd" style="display:none"></b>';
  var b = $("bd"), nn = S.cart.reduce(function (t, c) { return t + c.q; }, 0); if (b) { b.textContent = nn; b.style.display = nn ? "" : "none"; }
}
function orderIG() {                                           // copia il messaggio e apre la chat Instagram del negozio
  var msg = S.orderMsg; if (!msg) return;
  var done = function (ok) { toast(ok ? "Messaggio copiato: incollalo nella chat e invia" : "Apri «Vedi il messaggio», copialo e incollalo nella chat"); snd(ok ? "ok" : "warn"); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(function () { done(true); }, function () { done(false); });
    else {
      var t = document.createElement("textarea"); t.value = msg; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select();
      var ok = document.execCommand("copy"); document.body.removeChild(t); done(ok);
    }
  } catch (e) { done(false); }
  window.open("https://ig.me/m/" + encodeURIComponent(IG()), "_blank");
}
function qty(i, d) { S.cart[i].q += d; if (S.cart[i].q < 1) S.cart.splice(i, 1); cartR(); }
function toast(t) { var e = $("toast"); e.textContent = t; e.className = "s"; clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ""; }, 1800); }

// ---------- account ----------
function openAccount() {
  S.cur = null;
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>' + (S.admin ? "Account gestore" : "Il tuo account") + '</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (S.admin ? '<p class="m" style="margin:10px 0 18px">Sei collegato come gestore del negozio.</p>'
      : '<div class="m" style="margin:10px 0 14px">Modifica i tuoi dati</div><label>Nome</label><input id="an" value="' + esc(S.user.first) + '"><label>Numero di telefono</label><input id="ap" type="tel" value="' + esc(S.user.phone) + '">' + genH("ag", S.user.gender, "") +
        '<button class="pri" style="width:100%;margin-bottom:10px" onclick="saveAccount()">Salva</button>') +
    '<div class="chk" style="margin:6px 0 14px"><input type="checkbox" ' + (SND ? "checked" : "") + ' onchange="setSnd(this.checked)"><label style="margin:0">Suoni di navigazione</label></div>' +
    '<button class="rd" style="width:100%;min-height:50px" onclick="logout()">Esci dall’account</button>';
  document.body.classList.add("so"); snd("open");
}
function saveAccount() {
  var f = $("an").value.trim(), p = normPh($("ap").value), g = (document.querySelector('input[name="ag"]:checked') || {}).value || S.user.gender || "";
  if (!f || p.length < 8) { alert("Inserisci nome e un numero valido"); return; }
  S.user = {first:f, last:"", phone:p, gender:g};
  lsSet("user", JSON.stringify(S.user));
  db.collection("clients").doc(p).set({first:f, last:"", phone:p, gender:g, last_login:Date.now()}, {merge:true}).catch(function () {});
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
  document.body.classList.add("hiw"); h.innerHTML = ""; h.classList.add("on");   // subito sfondo nero pieno: la home sotto resta sfocata
  var go = function () {
    if (k !== hi.k) return;                                    // saltato prima ancora di partire
    var dur = ((t.replace(/ /g, "").length - 1) * .09 + .9 + .8) * 1000;
    h.innerHTML = writeSVG(t, .09);
    hi.t = setTimeout(hiEnd, dur);
  };
  h.onclick = hiEnd;
  try { Promise.race([document.fonts.load('100px "Great Vibes"'), new Promise(function (r) { setTimeout(r, 1500); })]).then(go); } catch (e) { go(); }
}
function hiEnd() {                                             // fine (o tocco per saltare): il nero si dissolve e la home si mette a fuoco
  var h = $("hi"); hi.k = (hi.k || 0) + 1; clearTimeout(hi.t);
  if (!h.classList.contains("on")) return;
  h.classList.remove("on"); document.body.classList.remove("hiw");
  setTimeout(function () { if (!h.classList.contains("on")) h.innerHTML = ""; }, 500);
  tryAuto();
}
// le clienti donna aprono il negozio nella categoria "Donna" (se esiste nel menu)
function applyGender() {
  if (S.catSet || !S.user || S.user.gender !== "donna") return;
  var c = S.cats.filter(function (x) { return /^donn[ae]$/i.test(String(x.name).trim()); })[0];
  if (c) S.cat = c.id;
  if (c || S.catsReady) S.catSet = true;
}
// ---------- registrazione e accesso (il numero di telefono identifica il cliente) ----------
function normPh(v) {                                           // solo cifre, senza prefisso italiano
  var d = String(v || "").replace(/\D/g, "");
  if (d.indexOf("0039") === 0) d = d.slice(4);
  if (d.length > 10 && d.indexOf("39") === 0) d = d.slice(2);
  return d;
}
function setMode(m) { S.mode = m; R(); }
function findClient(raw, ok, fail) {                           // cerca il numero tra i clienti già registrati
  var p = normPh(raw), r = String(raw || "").replace(/\D/g, ""), ids = r !== p ? [p, r] : [p];
  (function next(i) {
    if (i >= ids.length) { ok(null, p); return; }
    db.collection("clients").doc(ids[i]).get().then(function (d) { if (d.exists) ok(d.data(), ids[i]); else next(i + 1); }).catch(fail);
  })(0);
}
function enter(u) {
  S.user = u; lsSet("user", JSON.stringify(u)); S.mode = ""; S.autoDone = false;
  S.view = "shop"; S.cat = "all"; S.catSet = false; applyGender(); menuR(); R(); cartR(); hi(); checkCoupon(); snd("ok");
}
function login() {
  var raw = $("ph").value, p = normPh(raw);
  if (p.length < 8) { alert("Inserisci un numero di telefono valido"); return; }
  findClient(raw, function (c, id) {
    if (!c) { alert("Non trovo questo numero: registrati per entrare."); setMode("r"); return; }
    db.collection("clients").doc(id).update({last_login:Date.now(), visits:FV.increment(1)}).catch(function () {});
    enter({first:c.first || "", last:"", phone:id, gender:c.gender || ""});
  }, function () { alert("Non riesco a controllare il numero. Verifica la connessione e riprova."); });
}
function register() {
  var f = $("fn").value.trim(), raw = $("ph").value, p = normPh(raw), g = S.g || (document.querySelector('input[name="gn"]:checked') || {}).value || "";
  if (!f || p.length < 8) { alert("Inserisci nome e un numero valido"); return; }
  if (!g) { alert("Seleziona uomo o donna"); return; }
  var create = function () {
    var now = Date.now();
    db.collection("clients").doc(p).set({first:f, last:"", phone:p, gender:g, created:now, last_login:now, visits:1}).catch(function () {});
    enter({first:f, last:"", phone:p, gender:g});
  };
  findClient(raw, function (c) {
    if (c) { alert("Questo numero è già registrato: accedi."); setMode("l"); return; }
    create();
  }, create);
}
function alogin() {
  auth.signInWithEmailAndPassword($("em").value.trim(), $("pw").value).then(function () { S.view = "admin"; location.hash = ""; hi(); }).catch(function () { alert("Credenziali non valide"); });
}
function logout() { S.user = null; S.admin = false; S.view = "shop"; S.cat = "all"; S.catSet = false; S.g = ""; S.mode = ""; try { localStorage.removeItem("user"); } catch (e) {} auth.signOut(); closeAll(); R(); }
function go(v) { S.view = v; S.edit = null; S.d = {}; S.adEdit = S.slEdit = S.cpEdit = S.infEdit = S.nfEdit = S.revEdit = null; closeAll(); menuR(); R(); window.scrollTo(0, 0); }

// ---------- gesti: trascina per chiudere i pannelli, dal bordo per aprirli ----------
(function () {
  var g = null, B = document.body;
  document.addEventListener("touchstart", function (e) {
    g = null; if (e.touches.length !== 1 || !B.classList.contains("in")) return;
    var t = e.touches[0], c = B.classList, k = null;
    if (c.contains("mo")) k = "menu"; else if (c.contains("co")) k = "cart"; else if (c.contains("so")) k = "sheet";
    else if (t.clientX <= 24) k = "openM"; else if (t.clientX >= innerWidth - 24) k = "openC";
    if (!k) return;
    var el = k === "menu" ? $("menu") : k === "cart" ? $("cart") : k === "sheet" ? $("sheet") : null;
    g = {k:k, el:el, x:t.clientX, y:t.clientY, dx:0, dy:0, lock:null, on:false, t:Date.now(), top:el ? el.scrollTop : 0};
  }, {passive:true});
  document.addEventListener("touchmove", function (e) {
    if (!g) return; var t = e.touches[0]; g.dx = t.clientX - g.x; g.dy = t.clientY - g.y;
    if (!g.lock) { if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) return; g.lock = Math.abs(g.dx) > Math.abs(g.dy) ? "x" : "y"; }
    var tr = "";
    if (g.k === "menu" && g.lock === "x" && g.dx < 0) tr = "translateX(" + g.dx + "px)";
    else if (g.k === "cart" && g.lock === "x" && g.dx > 0) tr = "translateX(" + g.dx + "px)";
    else if (g.k === "sheet" && g.lock === "y" && g.dy > 0 && g.top <= 0 && g.el.scrollTop <= 0) tr = "translateY(" + g.dy + "px)";
    if (tr) { g.on = true; g.el.style.transition = "none"; g.el.style.transform = tr; if (e.cancelable) e.preventDefault(); }
  }, {passive:false});
  document.addEventListener("touchend", function () {
    if (!g) return; var x = g; g = null;
    if (x.on) {
      var d = x.k === "sheet" ? x.dy : Math.abs(x.dx), v = d / Math.max(1, Date.now() - x.t);
      x.el.style.transition = ""; x.el.style.transform = "";
      if (d > 90 || (d > 40 && v > .5)) closeAll();
    } else if (x.lock === "x") {
      if (x.k === "openM" && x.dx > 60) openM(); else if (x.k === "openC" && x.dx < -60) openC();
    }
  }, {passive:true});
  document.addEventListener("touchcancel", function () { if (g && g.on) { g.el.style.transition = ""; g.el.style.transform = ""; } g = null; }, {passive:true});
})();

window.addEventListener("hashchange", R);
S.intro = !S.user;
R();
if (S.intro) startIntro();
checkCoupon();
