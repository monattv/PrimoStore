// ====== CONFIGURAZIONE ======
var firebaseConfig = {
  apiKey: "AIzaSyA2Om3z06tECooXjlhxv1OlAcyAlIQvWkA",
  authDomain: "mio-catalogo-prodotti.firebaseapp.com",
  projectId: "mio-catalogo-prodotti",
  appId: "1:1042772614624:web:c347db6e68aa33fcd75f85"
};
var SHOP_PHONE = "393518521113"; // WhatsApp per gli ordini (prefisso senza +)
var SHOP_NAME = "Primo-Store";
// ============================

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth(), db = firebase.firestore(), FV = firebase.firestore.FieldValue;
var S = {user:null, admin:false, shoes:[], cats:[], cat:"all", view:"shop", edit:null, photo:"", cart:[], ready:false, sel:{}};
try { S.user = JSON.parse(localStorage.getItem("user")); S.cart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) {}
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
var busy = function () { var t = document.activeElement && document.activeElement.tagName; return t === "INPUT" || t === "SELECT"; };
var shoe = function (id) { return S.shoes.filter(function (s) { return s.id === id; })[0]; };

// dati condivisi in tempo reale
db.collection("shoes").orderBy("created", "desc").onSnapshot(function (q) {
  S.shoes = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
  S.ready = true; if (!busy()) R(); cartR();
}, function (e) { console.error(e); });
db.collection("menu").orderBy("created").onSnapshot(function (q) {
  S.cats = q.docs.map(function (d) { var x = d.data(); x.id = d.id; x.ids = x.ids || []; return x; });
  menuR(); if (!busy()) R();
}, function (e) { console.error(e); });
auth.onAuthStateChanged(function (u) {
  S.admin = !!u; if (u && !S.user) S.user = {first:"Admin", last:"", phone:""};
  R(); menuR(); cartR();
});

var VAN = '<svg class="van" viewBox="0 0 30 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M1 3h16v11H1zM17 7h6l5 4v3H17z"/><circle cx="7" cy="16" r="2.4" fill="currentColor"/><circle cx="23" cy="16" r="2.4" fill="currentColor"/></svg>';
var NOTE = '<div class="note"><b>Informazioni importanti</b>I prodotti presentati in questo sito sono indicati esclusivamente con il nome del modello e hanno finalità puramente espositiva. Ciascun modello è disponibile in numerosi colori e varianti, non tutti raffigurati o elencati. Per conoscere colori, taglie e disponibilità effettive, vi invitiamo a contattarci direttamente su WhatsApp prima di completare l’ordine. Il sito non gestisce pagamenti: ogni ordine viene confermato e concordato in chat.</div>';

// ---------- schermate ----------
function R() {
  var a = $("app"); document.body.classList.toggle("in", !!S.user);
  if (!S.user) {
    var ad = location.hash === "#admin";
    a.innerHTML = '<div class="bg"><i></i><i></i><i></i></div><div class="box"><div class="logo">' + SHOP_NAME + '</div>' +
      '<p class="m">' + (ad ? "Accesso gestore" : "Entra nel negozio") + '</p>' +
      (ad ? '<label>Email</label><input id="em" type="email"><label>Password</label><input id="pw" type="password"><button onclick="alogin()">Entra</button>'
          : '<label>Nome</label><input id="fn" autocomplete="given-name"><label>Cognome</label><input id="ln" autocomplete="family-name"><label>Numero di telefono</label><input id="ph" type="tel" autocomplete="tel"><button onclick="login()">Entra</button>') + '</div>';
    return;
  }
  var n = S.cart.reduce(function (t, c) { return t + c.q; }, 0);
  var top = '<header><button class="ic" onclick="openM()">☰</button><h1>' + SHOP_NAME + '</h1><span class="hello">Ciao, ' + esc(S.user.first) + '</span><span class="sp"></span>' +
    (S.admin ? '<button class="l" onclick="go(\'' + (S.view === "shop" ? "admin" : "shop") + '\')">' + (S.view === "shop" ? "Dashboard" : "Negozio") + '</button>' : '') +
    '<button class="ic" id="cbtn" onclick="openC()">Carrello<b id="bd">' + n + '</b></button><button class="l" onclick="logout()">Esci</button></header>';
  a.innerHTML = top + (S.view === "admin" && S.admin ? admin() : shopH());
}

function shopH() {
  if (!S.ready) return '<p class="m">Caricamento…</p>';
  var c = S.cats.filter(function (x) { return x.id === S.cat; })[0];
  var list = c ? S.shoes.filter(function (s) { return c.ids.indexOf(s.id) > -1; }) : S.shoes;
  var h = '<div class="ct">' + (c ? esc(c.name) : "Tutto") + '</div>' + NOTE;
  if (!list.length) return h + '<p class="m">Nessuna scarpa qui per ora.</p>';
  return h + '<div class="grid">' + list.map(function (s, i) {
    var sz = (s.sizes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    return '<div class="card ' + (s.avail ? "" : "out") + '" style="animation-delay:' + (i * 70) + 'ms"><div class="ph">' + (s.photo ? '<img src="' + s.photo + '" alt="">' : "nessuna foto") + '</div>' +
      '<div class="n"><span>' + esc(s.name) + '</span><span>€ ' + Number(s.price).toFixed(2) + '</span></div>' +
      (s.avail ? (sz.length ? '<div class="sizes" id="sz_' + s.id + '">' + sz.map(function (x) { return '<button class="sq ' + (S.sel[s.id] === x ? "on" : "") + '" onclick="selSz(\'' + s.id + '\',this,\'' + esc(x) + '\')">' + esc(x) + '</button>'; }).join("") + '</div>' : '<div style="height:8px"></div>') +
        '<button class="go" onclick="add(\'' + s.id + '\',this)"><span class="lb">Aggiungi al carrello</span>' + VAN + '</button>' : '<div class="m">Non disponibile</div>') + '</div>';
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
  return f + m + (l || '<p class="m">Nessuna scarpa. Aggiungine una sopra.</p>');
}

// ---------- menu laterale e carrello ----------
function menuR() {
  var items = [{id:"all", name:"Tutto"}].concat(S.cats);
  $("menu").innerHTML = '<div class="logo" style="text-align:left;font-size:18px;margin-bottom:18px">' + SHOP_NAME + '</div>' +
    items.map(function (c) { return '<button class="mi ' + (S.cat === c.id ? "on" : "") + '" onclick="pickCat(\'' + c.id + '\')">' + esc(c.name) + '</button>'; }).join("");
}
function pickCat(id) { S.cat = id; S.view = "shop"; closeAll(); menuR(); R(); window.scrollTo(0, 0); }
function openM() { document.body.classList.add("mo"); }
function openC() { document.body.classList.add("co"); }
function closeAll() { document.body.classList.remove("mo", "co"); }

function cartR() {
  var tot = 0, lines = [], rows = "";
  S.cart = S.cart.filter(function (c) { return shoe(c.id); });
  S.cart.forEach(function (c, i) {
    var s = shoe(c.id), p = Number(s.price) * c.q; tot += p;
    lines.push("- " + s.name + (c.size ? " (taglia " + c.size + ")" : "") + " x" + c.q + " = € " + p.toFixed(2));
    rows += '<div class="ci"><div class="t">' + (s.photo ? '<img src="' + s.photo + '" alt="">' : "") + '</div><div style="flex:1">' + esc(s.name) +
      '<div class="m">' + (c.size ? "Taglia " + esc(c.size) + " · " : "") + '€ ' + Number(s.price).toFixed(2) + '</div>' +
      '<div class="q"><button onclick="qty(' + i + ',-1)">−</button>' + c.q + '<button onclick="qty(' + i + ',1)">+</button></div></div></div>';
  });
  var u = S.user || {first:"", last:"", phone:""};
  var msg = encodeURIComponent("Ciao, sono " + u.first + " " + u.last + " (" + u.phone + "). Vorrei ordinare:\n" + lines.join("\n") + "\nTotale: € " + tot.toFixed(2));
  $("cart").innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b>Carrello</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (rows || '<p class="m">Il carrello è vuoto.</p>') +
    (rows ? '<div class="tot"><span>Totale</span><b>€ ' + tot.toFixed(2) + '</b></div><a class="wa" href="https://wa.me/' + SHOP_PHONE + '?text=' + msg + '" target="_blank" rel="noopener">Ordina su WhatsApp</a><p class="m" style="text-align:center">Colori, varianti e pagamento si concordano in chat.</p>' : '');
  try { localStorage.setItem("cart", JSON.stringify(S.cart)); } catch (e) {}
  var b = $("bd"); if (b) b.textContent = S.cart.reduce(function (t, c) { return t + c.q; }, 0);
}
function selSz(id, el, v) { S.sel[id] = v; var p = el.parentNode.children; for (var i = 0; i < p.length; i++) p[i].classList.remove("on"); el.classList.add("on"); }
function add(id, btn) {
  var size = S.sel[id] || "";
  if ($("sz_" + id) && !size) { toast("Scegli la taglia"); return; }
  var f = S.cart.filter(function (c) { return c.id === id && c.size === size; })[0];
  if (f) f.q++; else S.cart.push({id:id, size:size, q:1});
  cartR(); toast("Aggiunto al carrello"); fly(btn);
}
function fly(b) {
  b.classList.remove("run"); void b.offsetWidth; b.classList.add("run");
  var t = $("cbtn"); if (!t) return;
  var a = b.getBoundingClientRect(), c = t.getBoundingClientRect(), p = document.createElement("div");
  p.className = "pk"; p.style.left = (a.left + a.width / 2 - 9) + "px"; p.style.top = a.top + "px"; document.body.appendChild(p);
  var dx = c.left + c.width / 2 - a.left - a.width / 2, dy = c.top + c.height / 2 - a.top - 9;
  p.animate([{transform:"translate(0,0) scale(1)", opacity:0, offset:0}, {transform:"translate(0,-14px) scale(1)", opacity:1, offset:.2},
    {transform:"translate(" + dx + "px," + dy + "px) scale(.3)", opacity:.3, offset:1}], {duration:900, delay:700, easing:"ease-in", fill:"both"}).onfinish = function () {
    p.remove(); t.animate([{transform:"scale(1)"}, {transform:"scale(1.12)"}, {transform:"scale(1)"}], {duration:350});
    var g = $("bd"); if (g) { g.classList.remove("b"); void g.offsetWidth; g.classList.add("b"); } };
}
function qty(i, d) { S.cart[i].q += d; if (S.cart[i].q < 1) S.cart.splice(i, 1); cartR(); R(); }
function toast(t) { var e = $("toast"); e.textContent = t; e.className = "s"; clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ""; }, 1800); }

// ---------- accesso ----------
function hi() { var h = $("hi"); h.innerHTML = '<span>Ciao, ' + esc(S.user.first) + '</span>'; h.className = ""; void h.offsetWidth; h.className = "show"; setTimeout(function () { h.className = ""; }, 2700); }
function login() {
  var f = $("fn").value.trim(), l = $("ln").value.trim(), p = $("ph").value.replace(/[\s\-+]/g, "");
  if (!f || !l || p.length < 8) { alert("Inserisci nome, cognome e un numero valido"); return; }
  S.user = {first:f, last:l, phone:p};
  try { localStorage.setItem("user", JSON.stringify(S.user)); } catch (e) {}
  db.collection("clients").doc(p).set({first:f, last:l, phone:p, last_login:Date.now()}).catch(function () {});
  S.view = "shop"; R(); cartR(); hi();
}
function alogin() {
  auth.signInWithEmailAndPassword($("em").value.trim(), $("pw").value).then(function () { S.view = "admin"; location.hash = ""; hi(); }).catch(function () { alert("Credenziali non valide"); });
}
function logout() { S.user = null; S.admin = false; S.view = "shop"; try { localStorage.removeItem("user"); } catch (e) {} auth.signOut(); closeAll(); R(); }
function go(v) { S.view = v; S.edit = null; S.photo = ""; R(); }

// ---------- dashboard: prodotti ----------
function pick(inp) {
  var file = inp.files[0]; if (!file) return;
  var r = new FileReader();
  r.onload = function () { var im = new Image(); im.onload = function () {
    var k = Math.min(1, 700 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
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
R();
