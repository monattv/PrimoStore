// ====== ORDINI ======
// Cliente: conferma ordine dal carrello, "I miei ordini", notifiche di stato, annullamento.
// Gestore: menu, lista con ricerca e filtri, dettaglio, stati, spedizione, note, storico, CSV.
// Tutto è salvato su Firestore (raccolta "orders"; contatore dei codici in "counters/orders").

var ST = ["Da Pagare", "Pagato", "Ordinato", "Spedito", "In Italia", "In Consegna", "Consegnato"];
var ST_FIN = ["Consegnato", "Annullato"];
var ST_MSG = {
  "Da Pagare":["Stato aggiornato", "Il tuo ordine è in attesa di pagamento."],
  "Pagato":["Pagamento registrato", "Abbiamo registrato il tuo pagamento. Grazie!"],
  "Ordinato":["Prodotto ordinato", "Il tuo prodotto è stato ordinato."],
  "Spedito":["Il tuo ordine è stato spedito!", "Il pacco è in viaggio verso di te."],
  "In Italia":["Il pacco è arrivato in Italia", "Aggiornamento: il tuo ordine è in Italia."],
  "In Consegna":["Il pacco è in consegna", "Il corriere sta consegnando il tuo ordine."],
  "Consegnato":["Ordine consegnato", "Il tuo ordine è stato consegnato. Grazie per aver scelto Primo Store!"],
  "Annullato":["Ordine annullato", "Il tuo ordine è stato annullato."]
};
S.of = {q:"", st:"", from:"", to:"", sort:"desc"};

var ICO_DASH = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="8" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.8"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.8"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.8"/></svg>';
var ICO_BOX = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4"/><path d="M12 11.5v9"/></svg>';
var ICO_CHECK = '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="ckp" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- attrezzi ----------
function stCls(s) { return "st-" + String(s).toLowerCase().replace(/\s+/g, "-"); }
function stB(s) { return '<span class="stb ' + stCls(s) + '">' + esc(s) + '</span>'; }
function fmtDT(t) { return t ? new Date(t).toLocaleString("it-IT", {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"}) : "—"; }
function eur(x) { return "€ " + Number(x || 0).toFixed(2); }
function lsJ(k) { try { return JSON.parse(lsGet(k)); } catch (e) { return null; } }
function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\/\S+$/i.test(u) ? u : ""; }
function oErr(e) {
  console.error(e);
  var off = e && (e.code === "unavailable" || e.code === "deadline-exceeded");
  alert(off ? "Connessione assente o instabile: l'operazione non è stata salvata. Controlla internet e riprova." : "Operazione non riuscita: " + ((e && e.message) || e));
  snd("warn");
}
function histOf(o) { return Array.isArray(o.history) ? o.history : []; }

// ---------- creazione ordine: codice univoco con transazione (sicuro anche con ordini contemporanei) ----------
function placeOrder(id, data) {
  var oref = db.collection("orders").doc(id), cref = db.collection("counters").doc("orders");
  return db.runTransaction(function (tx) {
    return tx.get(oref).then(function (o) {
      if (o.exists) { var x = o.data(); x.id = id; return x; }          // stesso invio ripetuto: nessun duplicato
      return tx.get(cref).then(function (c) {
        var n = (c.exists ? Number(c.data().n) || 0 : 0) + 1;
        if (c.exists) tx.update(cref, {n:n}); else tx.set(cref, {n:n});
        var order = Object.assign({}, data, {num:n, code:"PS-" + ("000000" + n).slice(-6)});
        tx.set(oref, order); order.id = id; return order;
      });
    });
  });
}
function thumbData(src) {                                       // miniatura piccola da salvare nell'ordine
  return new Promise(function (res) {
    if (!src) { res(""); return; }
    var im = new Image();
    im.onload = function () {
      try {
        var k = Math.min(1, 140 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        var u = c.toDataURL("image/webp", .6); res(u.length < 16000 ? u : "");
      } catch (e) { res(""); }
    };
    im.onerror = function () { res(""); };
    im.src = src;
  });
}

// =====================================================================
//  CLIENTE
// =====================================================================
var myUn = {};
function myIdsGet() { return lsJ("myOrders") || []; }
function myIdsAdd(id) { var a = myIdsGet(); if (a.indexOf(id) < 0) { a.unshift(id); lsSet("myOrders", JSON.stringify(a.slice(0, 40))); } }
function watchMine(extra) {                                     // ascolta in tempo reale i propri ordini (1 lettura per ordine)
  if (!S.user || S.admin) return;
  (extra || []).forEach(myIdsAdd);
  var pend = 0;
  var one = function () { if (--pend <= 0 && !S.mineReady) { S.mineReady = true; tryAuto(); } };
  myIdsGet().slice(0, 30).forEach(function (id) {
    if (myUn[id]) return; pend++;
    var first = true;
    myUn[id] = db.collection("orders").doc(id).onSnapshot(function (d) {
      var old = S.mine[id];
      if (d.exists && !d.data().deleted) { var x = d.data(); x.id = id; S.mine[id] = x; if (old) liveFx(old, x); } else delete S.mine[id];
      if (first) { first = false; one(); }
      ordersChanged();                                          // un ascolto costa una lettura all'apertura e una a ogni modifica, nient'altro
    }, function (e) { console.error(e); if (first) { first = false; one(); } });
  });
  if (!pend) { S.mineReady = true; tryAuto(); }
}
function unwatchMine() { Object.keys(myUn).forEach(function (k) { try { myUn[k](); } catch (e) {} }); myUn = {}; S.mine = {}; S.mineReady = false; }
function ordersChanged() {                                      // aggiorna in diretta la scheda aperta e la home
  if (S.ov && document.body.classList.contains("so") && !S.cur) { var sh = $("sheet"), top = sh.scrollTop; if (S.ov === "list") myOrdersSheet(); else orderSheet(S.ov); sh.scrollTop = top; }
  if (!busy()) R();
}
function liveFx(old, x) {                                       // nuova notifica d'ordine mentre il sito è aperto
  var fresh = histOf(x).slice(histOf(old).length).filter(function (h) { return h.by === "admin" && h.notify !== false; });
  if (fresh.length) { var h = fresh[fresh.length - 1]; notifFx((x.code || "Ordine") + " · " + (h.msg || (ST_MSG[h.to] || [""])[0])); }
}
function orderNotifs() {                                        // le notifiche del cliente sono gli aggiornamenti dello storico fatti dal gestore
  var out = [];
  Object.keys(S.mine).forEach(function (id) {
    var o = S.mine[id];
    histOf(o).forEach(function (h) { if (h.by === "admin" && h.notify !== false) out.push({oid:id, code:o.code, at:h.at, msg:h.msg || (ST_MSG[h.to] || [""])[0]}); });
  });
  return out.sort(function (a, b) { return b.at - a.at; }).slice(0, 40);
}
function unreadO() { var s = Number(lsGet("seenOT") || 0); return orderNotifs().filter(function (n) { return n.at > s; }).length; }
function unreadAll() { return unreadN() + unreadO(); }
function myList() { return Object.keys(S.mine).map(function (k) { return S.mine[k]; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); }
function activeMine() { return myList().filter(function (o) { return ST_FIN.indexOf(o.status) < 0; }).length; }

// ---------- conferma ordine dal carrello ----------
function startCheckout() {
  if (!S.cart.length) return;
  var u = S.user || {}, ad = lsJ("addr") || {};
  S.ck = {first:u.first || "", last:u.last || "", phone:u.phone || "", street:ad.street || "", zip:ad.zip || "", city:ad.city || "", prov:ad.prov || "", note:ad.note || ""};
  S.chk = true; S.ckErr = ""; S.done = null; cartR(); snd("open");
}
function ckSet(k, v) { S.ck[k] = v; }
function ckBack() { S.chk = false; S.ckErr = ""; cartR(); }
function ckField(k, label, o) {
  o = o || {};
  return '<label>' + label + '</label><input ' + (o.type ? 'type="' + o.type + '" ' : '') + (o.mode ? 'inputmode="' + o.mode + '" ' : '') + (o.ac ? 'autocomplete="' + o.ac + '" ' : '') + 'value="' + esc(S.ck[k]) + '" oninput="ckSet(\'' + k + '\',this.value)">';
}
function ckH(c) {                                               // schermata "Conferma ordine" dentro il carrello
  return '<div class="ckh"><button class="l" onclick="ckBack()">← Carrello</button><b>Conferma ordine</b></div>' +
    '<div class="cks">' + c.items.map(function (it) { return '<div class="m">' + esc(it.name) + (it.vn ? ' · ' + esc(it.vn) : '') + (it.size ? ' · tg ' + esc(it.size) : '') + ' ×' + it.q + '</div>'; }).join("") +
    '<div class="tot" style="margin:8px 0 0"><span>Totale</span><b>' + eur(c.total) + '</b></div></div>' +
    '<div class="cnote">Il pagamento avviene <b>in contanti</b> direttamente con noi. Non devi pagare nulla online.</div>' +
    '<div class="two">' + '<div>' + ckField("first", "Nome", {ac:"given-name"}) + '</div><div>' + ckField("last", "Cognome", {ac:"family-name"}) + '</div></div>' +
    ckField("phone", "Telefono", {type:"tel", ac:"tel"}) + ckField("street", "Via e numero civico", {ac:"street-address"}) +
    '<div class="two"><div>' + ckField("zip", "CAP", {mode:"numeric", ac:"postal-code"}) + '</div><div>' + ckField("prov", "Provincia", {ac:"address-level1"}) + '</div></div>' +
    ckField("city", "Città", {ac:"address-level2"}) + ckField("note", "Note per la consegna (facoltative)") +
    (S.ckErr ? '<div class="cerr">' + esc(S.ckErr) + '</div>' : '') +
    '<button class="gr bsend" onclick="submitOrder()"' + (S.placing ? ' disabled' : '') + '>' + (S.placing ? '<span class="spin"></span>Invio in corso…' : 'Invia ordine') + '</button>';
}
function doneH(o) {                                             // ordine registrato
  return '<div class="okb"><div class="okc">' + ICO_CHECK + '</div><b>Ordine ricevuto!</b><p class="m">Il tuo codice ordine è</p><div class="ocode">' + esc(o.code) + '</div>' +
    '<p class="m">Stato: ' + stB(o.status) + '<br>Ti avviseremo qui con una notifica a ogni aggiornamento. Paghi in contanti direttamente con noi.</p></div>' +
    '<button class="pri bsend" onclick="closeAll();openOrderFromCart(\'' + o.id + '\')">Vedi il mio ordine</button>' +
    '<button class="bsend" style="margin-top:8px" onclick="orderIG()">Invia anche il riepilogo su Instagram</button>' +
    '<p class="m" style="text-align:center;margin:8px 0 0">Facoltativo: apre la chat con il messaggio già copiato.</p>';
}
function openOrderFromCart(id) { setTimeout(function () { openOrder(id); }, 320); }
function submitOrder() {
  if (S.placing) return;                                        // protezione contro doppio tocco
  var d = S.ck, c = cartCalc(), p = normPh(d.phone), zip = String(d.zip || "").replace(/\D/g, "");
  var err = !String(d.first).trim() ? "Inserisci il nome." : !String(d.last).trim() ? "Inserisci il cognome." : p.length < 8 ? "Inserisci un numero di telefono valido." :
    !String(d.street).trim() ? "Inserisci via e numero civico." : zip.length !== 5 ? "Il CAP deve avere 5 cifre." : !String(d.city).trim() ? "Inserisci la città." : !c.items.length ? "Il carrello è vuoto." : "";
  if (err) { S.ckErr = err; cartR(); snd("warn"); return; }
  S.placing = true; S.ckErr = ""; cartR();
  if (!S.chkId) S.chkId = db.collection("orders").doc().id;     // stesso id a ogni nuovo tentativo: un solo ordine anche se si preme più volte
  var id = S.chkId, now = Date.now(), u = S.user;
  Promise.all(c.items.map(function (it) { return thumbData(it.src); })).then(function (imgs) {
    var items = c.items.map(function (it, i) { return {id:it.id, name:it.name, size:it.size, v:it.v, vn:it.vn, q:it.q, price:it.price, base:it.base, img:imgs[i] || ""}; });
    return placeOrder(id, {
      clientId:u.phone || p, first:String(d.first).trim(), last:String(d.last).trim(), phone:p,
      address:{street:String(d.street).trim(), zip:zip, city:String(d.city).trim(), prov:String(d.prov || "").trim().toUpperCase(), note:String(d.note || "").trim()},
      items:items, subtotal:c.sub, couponCode:c.cp ? c.cp.code : "", couponDisc:c.cd, total:c.total,
      status:"Da Pagare", createdAt:now, updatedAt:now, notes:"", shipping:{courier:"", tracking:"", url:"", notes:""}, cancel:null, deleted:false, manual:false,
      history:[{at:now, from:"", to:"Da Pagare", by:"cliente", msg:"Ordine ricevuto", notify:false}]
    });
  }).then(function (o) {
    S.placing = false; S.chkId = null; S.chk = false; S.done = o;
    lsSet("addr", JSON.stringify({street:o.address.street, zip:o.address.zip, city:o.address.city, prov:o.address.prov, note:o.address.note}));
    S.user = Object.assign({}, S.user, {first:o.first, last:o.last}); lsSet("user", JSON.stringify(S.user));
    S.orderMsg = "Ciao, sono " + o.first + " " + o.last + " (" + o.phone + "). Ho appena inviato l'ordine " + o.code + " dal sito:\n" + o.items.map(function (it) { return "- " + it.name + (it.vn ? " (" + it.vn + ")" : "") + (it.size ? " taglia " + it.size : "") + " x" + it.q + " = " + eur(it.price * it.q); }).join("\n") + "\nTotale: " + eur(o.total);
    S.cart = []; S.coupon = null; saveCoupon();
    S.mine[o.id] = o; myIdsAdd(o.id);
    db.collection("clients").doc(o.clientId).set({first:o.first, last:o.last, phone:o.phone, orderIds:FV.arrayUnion(o.id)}, {merge:true}).catch(function () {});
    watchMine(); cartR(); snd("add");
  }).catch(function (e) {
    S.placing = false; console.error(e);
    S.ckErr = "Non sono riuscito a salvare l'ordine" + (e && e.code === "unavailable" ? ": connessione assente." : " (" + ((e && (e.code || e.message)) || "errore") + ").") + " Il carrello è intatto: riprova tra poco.";
    cartR(); snd("warn");
  });
}

// ---------- notifiche (broadcast + aggiornamenti d'ordine) ----------
function openNotifs() {
  var l = S.notifs.filter(sLive), on = orderNotifs(); S.cur = null; S.ov = null;
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>Notifiche</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (on.length ? '<div class="nlab">I tuoi ordini</div>' + on.map(function (n, i) {
      return '<button class="nt on" style="--i:' + i + '" onclick="openOrder(\'' + n.oid + '\')"><span class="ndot"></span><span><b>' + esc(n.msg) + '</b><span class="m">' + esc(n.code || "") + ' · ' + fmtDT(n.at) + '</span></span><span class="chev">›</span></button>';
    }).join("") : '') +
    (l.length ? (on.length ? '<div class="nlab">Dal negozio</div>' : '') + l.map(function (n) {
      return '<div class="nt"><b>' + esc(n.title) + '</b><p>' + esc(n.text || "").replace(/\n/g, "<br>") + '</p><span class="m">' + new Date(n.created || Date.now()).toLocaleDateString("it-IT", {day:"numeric", month:"long"}) + '</span></div>';
    }).join("") : '') +
    (!on.length && !l.length ? '<p class="m" style="margin-top:14px">Nessuna notifica per ora.</p>' : '');
  document.body.classList.add("so"); snd("open");
  lsSet("seenN", JSON.stringify(l.map(function (n) { return n.id; })));
  if (on.length) lsSet("seenOT", String(Math.max.apply(null, on.map(function (n) { return n.at; }))));
  R();
}

// ---------- I miei ordini ----------
function openMyOrders() { myOrdersSheet(); document.body.classList.remove("mo", "co"); document.body.classList.add("so"); snd("open"); }
function myOrdersSheet() {
  S.cur = null; S.ov = "list"; var l = myList();
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>I miei ordini</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    (l.length ? l.map(function (o, i) {
      var n = (o.items || []).reduce(function (t, it) { return t + it.q; }, 0);
      return '<button class="omy" style="--i:' + i + '" onclick="openOrder(\'' + o.id + '\')"><span class="omt"><b>' + esc(o.code) + '</b>' + stB(o.status) + '</span><span class="m">' + fmtDT(o.createdAt) + ' · ' + n + ' ' + (n === 1 ? 'articolo' : 'articoli') + ' · ' + eur(o.total) + '</span></button>';
    }).join("") : '<p class="m" style="margin-top:14px">Non hai ancora effettuato ordini.</p>');
}
function openOrder(id) { S.cur = null; orderSheet(id); document.body.classList.remove("mo", "co"); document.body.classList.add("so"); snd("open"); }
function stepperH(o) {
  var at = {}, reached = -1, canc = o.status === "Annullato";
  histOf(o).forEach(function (h) { if (h.to && ST.indexOf(h.to) > -1) { at[h.to] = h.at; reached = Math.max(reached, ST.indexOf(h.to)); } });
  if (!canc) reached = Math.max(reached, ST.indexOf(o.status));
  return '<div class="tl">' + ST.map(function (s, i) {
    var cls = i < reached || (i === reached && (o.status === "Consegnato" || canc)) ? "done" : i === reached ? "now" : "";
    return '<div class="ts ' + cls + '" style="--i:' + i + '"><i></i><div><b>' + s + '</b><span class="m">' + (at[s] ? fmtDT(at[s]) : (cls ? "" : "In attesa")) + '</span></div></div>';
  }).join("") + (canc ? '<div class="ts bad"><i></i><div><b>Annullato</b><span class="m">' + fmtDT((o.cancel && o.cancel.cancelledAt) || o.updatedAt) + '</span></div></div>' : '') + '</div>';
}
function shipBox(o) {
  var s = o.shipping || {}, url = safeUrl(s.url);
  if (!s.courier && !s.tracking && !url && !s.notes) return "";
  return '<div class="osec"><div class="oh">Spedizione</div>' + (s.courier ? '<div class="kv"><span>Corriere</span><b>' + esc(s.courier) + '</b></div>' : '') +
    (s.tracking ? '<div class="kv"><span>Tracciamento</span><b>' + esc(s.tracking) + ' <button class="l" onclick="copyTxt(\'' + esc(s.tracking).replace(/'/g, "") + '\')">copia</button></b></div>' : '') +
    (s.notes ? '<p class="m" style="margin:6px 0 0">' + esc(s.notes).replace(/\n/g, "<br>") + '</p>' : '') +
    (url ? '<a class="pri lnk" href="' + esc(url) + '" target="_blank" rel="noopener">Segui la spedizione</a>' : '') + '</div>';
}
function copyTxt(t) { try { navigator.clipboard.writeText(t).then(function () { toast("Copiato"); }); } catch (e) {} }
function orderSheet(id) {
  var o = S.mine[id]; S.ov = id;
  if (!o) { $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>Ordine</b><button class="l" onclick="closeAll()">Chiudi</button></div><p class="m" style="margin-top:14px">Ordine non disponibile.</p>'; return; }
  var cancel = o.cancel || {}, act = "";
  if (o.status === "Da Pagare") act = '<button class="rd bsend" onclick="cCancel(\'' + id + '\')">Annulla ordine</button>';
  else if (o.status === "Pagato" || o.status === "Ordinato") act = cancel.requested ? '<div class="cnote">Richiesta di annullamento inviata: attendi la risposta del negozio.</div>' : '<button class="bsend dgb" onclick="cReq(\'' + id + '\')">Richiedi annullamento</button>';
  else if (o.status !== "Annullato") act = '<div class="cnote">Per annullare un ordine già spedito contatta il negozio.</div><a class="bsend lnk" href="https://ig.me/m/' + encodeURIComponent(IG()) + '" target="_blank" rel="noopener">Contatta il negozio su Instagram</a>';
  var a = o.address || {};
  $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><button class="l" onclick="openMyOrders()">← Ordini</button><button class="l" onclick="closeAll()">Chiudi</button></div>' +
    '<div class="ohd"><div class="ocode">' + esc(o.code) + '</div>' + stB(o.status) + '</div><div class="m">Ordinato il ' + fmtDT(o.createdAt) + '</div>' +
    (cancel.rejected ? '<div class="cnote">La richiesta di annullamento non è stata accettata.</div>' : '') +
    stepperH(o) + shipBox(o) +
    '<div class="osec"><div class="oh">Prodotti</div>' + (o.items || []).map(function (it) {
      return '<div class="ci"><div class="t">' + (it.img ? '<img src="' + esc(it.img) + '" alt="">' : '') + '</div><div style="flex:1">' + esc(it.name) + '<div class="m">' + [it.vn ? esc(it.vn) : "", it.size ? "Taglia " + esc(it.size) : "", "Quantità " + it.q].filter(Boolean).join(" · ") + '</div><div class="pr2"><b>' + eur(it.price) + '</b></div></div></div>';
    }).join("") + (o.couponDisc ? '<div class="tr"><span>Sconto coupon' + (o.couponCode ? ' ' + esc(o.couponCode) : '') + '</span><span>-' + eur(o.couponDisc) + '</span></div>' : '') +
    '<div class="tot"><span>Totale</span><b>' + eur(o.total) + '</b></div><div class="m">Pagamento in contanti.</div></div>' +
    '<div class="osec"><div class="oh">Consegna a</div><div>' + esc(o.first + " " + o.last) + '</div><div class="m">' + esc(a.street) + ', ' + esc(a.zip) + ' ' + esc(a.city) + (a.prov ? ' (' + esc(a.prov) + ')' : '') + '</div></div>' +
    '<div class="osec"><div class="oh">Cronologia</div>' + histOf(o).slice().reverse().map(function (h) {
      return '<div class="hl2"><span class="hdot"></span><div><b>' + esc(h.msg || (h.to ? h.to : "Aggiornamento")) + '</b><span class="m">' + fmtDT(h.at) + '</span></div></div>';
    }).join("") + '</div>' + act;
}
function cCancel(id) {
  var o = S.mine[id]; if (!o || o.status !== "Da Pagare") return;
  if (!confirm("Vuoi annullare l'ordine " + o.code + "?")) return;
  var now = Date.now();
  db.collection("orders").doc(id).update({status:"Annullato", updatedAt:now, cancel:{requested:false, cancelledAt:now, by:"cliente"},
    history:FV.arrayUnion({at:now, from:"Da Pagare", to:"Annullato", by:"cliente", msg:"Annullato dal cliente", notify:false})}).then(function () { toast("Ordine annullato"); snd("ok"); }).catch(oErr);
}
function cReq(id) {
  var o = S.mine[id]; if (!o || (o.status !== "Pagato" && o.status !== "Ordinato")) return;
  if (!confirm("Inviare al negozio la richiesta di annullamento dell'ordine " + o.code + "? Dovrà essere approvata.")) return;
  var now = Date.now();
  db.collection("orders").doc(id).update({updatedAt:now, cancel:{requested:true, requestedAt:now, by:"cliente", rejected:false},
    history:FV.arrayUnion({at:now, type:"cancelreq", by:"cliente", msg:"Richiesta di annullamento inviata", notify:false})}).then(function () { toast("Richiesta inviata"); snd("ok"); }).catch(oErr);
}

// =====================================================================
//  GESTORE
// =====================================================================
function amenuH() {
  var nw = unseenOrders(), pay = S.aorders.filter(function (o) { return !o.deleted && o.status === "Da Pagare"; }).length;
  return '<div class="am"><div class="amh">Area gestore</div><div class="amg">' +
    '<button class="acard" style="--i:0" onclick="go(\'admin\')"><span class="aic">' + ICO_DASH + '</span><b>Dashboard / Sito</b><span class="m">Prodotti, categorie, annunci, sconti, info…</span></button>' +
    '<button class="acard" style="--i:1" onclick="go(\'orders\')"><span class="aic">' + ICO_BOX + (nw ? '<i class="nb">' + nw + '</i>' : '') + '</span><b>Ordini</b><span class="m">' + (nw ? nw + ' nuov' + (nw === 1 ? 'o' : 'i') + ' · ' : '') + (pay ? pay + ' da pagare' : 'Gestione ordini') + '</span></button></div>' +
    '<button class="l amv" onclick="go(\'shop\')">Vai al negozio →</button></div>';
}
var unOr = null;
function ordersListen(on) {                                     // ordini in tempo reale (ultimi 300): solo per il gestore
  if (on && !unOr) unOr = db.collection("orders").orderBy("createdAt", "desc").limit(300).onSnapshot(function (q) {
    var first = !S.aoReady;
    S.aorders = q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
    if (first && lsGet("seenO") === null) lsSet("seenO", JSON.stringify(S.aorders.map(function (o) { return o.id; })));   // al primo avvio gli ordini esistenti non sono "nuovi"
    if (!first) q.docChanges().forEach(function (ch) { if (ch.type === "added" && !ch.doc.metadata.hasPendingWrites) { var x = ch.doc.data(); toast("Nuovo ordine " + x.code); snd("notif"); } });
    S.aoReady = true; if (!busy()) R();
  }, function (e) { console.error(e); });
  if (!on && unOr) { unOr(); unOr = null; S.aorders = []; S.aoReady = false; }
}
function seenO() { return lsJ("seenO") || []; }
function unseenOrders() { var s = seenO(); return S.aorders.filter(function (o) { return !o.deleted && s.indexOf(o.id) < 0; }).length; }
function markSeen(id) { var s = seenO(); if (s.indexOf(id) < 0) { s.push(id); lsSet("seenO", JSON.stringify(s.slice(-600))); } }

function ordersH() { return S.oid ? oDetailH() : oListH(); }
function norm(t) { return String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function hay(o) {
  var a = o.address || {}, s = o.shipping || {};
  return norm([o.code, o.num, o.first, o.last, o.first + " " + o.last, o.last + " " + o.first, String(o.phone || "").replace(/\D/g, ""), a.street, a.city, a.zip, a.prov, a.note, a.street + " " + a.city, o.status, s.tracking, s.courier, o.notes]
    .concat((o.items || []).map(function (i) { return i.name + " " + (i.vn || ""); })).join(" | "));
}
function oFiltered(trash) {
  var f = S.of, toks = norm(f.q).split(/\s+/).filter(Boolean), from = f.from ? new Date(f.from + "T00:00:00").getTime() : 0, to = f.to ? new Date(f.to + "T23:59:59").getTime() : 0;
  var l = S.aorders.filter(function (o) {
    if (!!o.deleted !== !!trash) return false;
    if (f.st && o.status !== f.st) return false;
    if (from && (o.createdAt || 0) < from) return false;
    if (to && (o.createdAt || 0) > to) return false;
    if (toks.length) { var h = hay(o); for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false; }
    return true;
  });
  l.sort(function (a, b) { return f.sort === "asc" ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0); });
  return l;
}
function oRows() {
  var l = oFiltered(S.of.trash), seen = seenO();
  if (!l.length) return '<p class="m" style="text-align:center;margin:26px 0">' + (S.aoReady ? 'Nessun ordine trovato.' : 'Caricamento ordini…') + '</p>';
  return l.map(function (o, i) {
    var n = (o.items || []).reduce(function (t, it) { return t + (Number(it.q) || 0); }, 0), a = o.address || {}, fl = "";
    if (o.cancel && o.cancel.requested && o.status !== "Annullato") fl += '<span class="fl bad">Richiesta annullamento</span>';
    if (o.status === "Da Pagare") fl += '<span class="fl warn">Da pagare</span>';
    if (o.status === "Pagato" || o.status === "Ordinato") fl += '<span class="fl">Da spedire</span>';
    return '<button class="oc" style="--i:' + Math.min(i, 12) + '" onclick="oOpen(\'' + o.id + '\')"><span class="ocl"><b>' + esc(o.code) + '</b>' + (seen.indexOf(o.id) < 0 ? '<i class="nw">NUOVO</i>' : '') + stB(o.status) + '</span>' +
      '<span class="ocm">' + esc(o.first + " " + o.last) + ' · ' + esc(o.phone) + (a.city ? ' · ' + esc(a.city) : '') + '</span>' +
      '<span class="ocm">' + n + ' ' + (n === 1 ? 'articolo' : 'articoli') + ' · <b>' + eur(o.total) + '</b> · ' + fmtDT(o.createdAt) + '</span>' + (fl ? '<span class="ocf">' + fl + '</span>' : '') + '</button>';
  }).join("");
}
function oListH() {
  var all = S.aorders.filter(function (o) { return !o.deleted; }), cnt = {};
  all.forEach(function (o) { cnt[o.status] = (cnt[o.status] || 0) + 1; });
  var pay = cnt["Da Pagare"] || 0, ship = (cnt["Pagato"] || 0) + (cnt["Ordinato"] || 0), trash = S.aorders.length - all.length, f = S.of;
  var chips = [["", "Tutti", all.length]].concat(ST.concat(["Annullato"]).map(function (s) { return [s, s, cnt[s] || 0]; })).map(function (c) {
    return '<button class="fc' + (!S.of.trash && f.st === c[0] ? " on" : "") + '" onclick="oSt(\'' + c[0] + '\')">' + c[1] + ' <b>' + c[2] + '</b></button>';
  }).join("") + (trash ? '<button class="fc' + (f.trash ? " on" : "") + '" onclick="oTrash()">Eliminati <b>' + trash + '</b></button>' : '');
  return '<div class="bar"><button class="l" onclick="go(\'amenu\')">← Menu gestore</button></div>' +
    '<div class="oth"><h2>Ordini</h2><button class="gr" onclick="oNew()">+ Nuovo ordine</button></div>' +
    '<div class="ostat"><div class="sbx warn"><b>' + pay + '</b><span>da pagare</span></div><div class="sbx"><b>' + ship + '</b><span>da spedire</span></div><div class="sbx"><b>' + unseenOrders() + '</b><span>nuovi</span></div></div>' +
    '<div class="osearch"><input id="oq" type="search" placeholder="Cerca codice, nome, telefono, via, città, prodotto, tracking…" value="' + esc(f.q) + '" oninput="oQ(this.value)"></div>' +
    '<div class="ofil"><div><label>Dal</label><input type="date" value="' + esc(f.from) + '" onchange="oD(\'from\',this.value)"></div><div><label>Al</label><input type="date" value="' + esc(f.to) + '" onchange="oD(\'to\',this.value)"></div>' +
    '<div><label>Ordine</label><select onchange="oSort(this.value)"><option value="desc"' + (f.sort === "desc" ? " selected" : "") + '>Più recenti</option><option value="asc"' + (f.sort === "asc" ? " selected" : "") + '>Meno recenti</option></select></div></div>' +
    '<div class="fcs">' + chips + '</div>' +
    '<div class="orow"><span class="m" id="ocnt"></span><button class="sm" onclick="oCsv()">Esporta CSV</button></div>' +
    '<div id="olist">' + oRows() + '</div>';
}
function oRefreshList() { var l = $("olist"); if (l) { l.innerHTML = oRows(); var n = oFiltered(S.of.trash).length; if ($("ocnt")) $("ocnt").textContent = n + " ordin" + (n === 1 ? "e" : "i"); } }
function oQ(v) { S.of.q = v; oRefreshList(); }
function oD(k, v) { S.of[k] = v; oRefreshList(); }
function oSort(v) { S.of.sort = v; oRefreshList(); }
function oSt(s) { S.of.st = s; S.of.trash = false; R(); }
function oTrash() { S.of.trash = !S.of.trash; S.of.st = ""; R(); }
function oOpen(id) { S.oid = id; S.d.o = null; markSeen(id); R(); window.scrollTo(0, 0); snd("tap"); }
function oBack() { S.oid = null; S.d.o = null; R(); window.scrollTo(0, 0); }
function oCsv() {
  var q = function (v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  var rows = [["Codice", "Data", "Stato", "Nome", "Cognome", "Telefono", "Via", "CAP", "Città", "Provincia", "Prodotti", "Totale", "Corriere", "Tracciamento", "Note"]];
  oFiltered(S.of.trash).forEach(function (o) {
    var a = o.address || {}, s = o.shipping || {};
    rows.push([o.code, fmtDT(o.createdAt), o.status, o.first, o.last, o.phone, a.street, a.zip, a.city, a.prov,
      (o.items || []).map(function (i) { return i.q + "x " + i.name + (i.vn ? " (" + i.vn + ")" : "") + (i.size ? " tg " + i.size : ""); }).join(" | "), Number(o.total || 0).toFixed(2).replace(".", ","), s.courier, s.tracking, o.notes]);
  });
  var csv = "﻿" + rows.map(function (r) { return r.map(q).join(";"); }).join("\r\n"), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})); a.download = "ordini-primostore-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast("CSV esportato");
}

// ---------- dettaglio ordine (gestore) ----------
function draftOf(o) {
  var a = o.address || {}, s = o.shipping || {};
  return {_id:o.id, first:o.first || "", last:o.last || "", phone:o.phone || "", street:a.street || "", zip:a.zip || "", city:a.city || "", prov:a.prov || "", anote:a.note || "",
    courier:s.courier || "", tracking:s.tracking || "", url:s.url || "", snotes:s.notes || "", notes:o.notes || "", cdisc:o.couponDisc || 0,
    items:(o.items || []).map(function (i) { return {id:i.id || "", name:i.name || "", size:i.size || "", v:i.v || 0, vn:i.vn || "", q:i.q || 1, price:i.price, base:i.base, img:i.img || ""}; })};
}
function oSum(items, cd) { var s = r2(items.reduce(function (t, i) { return t + (Number(i.q) || 0) * (Number(i.price) || 0); }, 0)); return {sub:s, total:r2(Math.max(0, s - (Number(cd) || 0)))}; }
function itemsEd(d) {
  var t = oSum(d.items, d.cdisc);
  return d.items.map(function (it, i) {
    return '<div class="oi"><div class="oit">' + (it.img ? '<img src="' + esc(it.img) + '" alt="">' : '') + '</div><div class="oif"><input placeholder="Prodotto" value="' + esc(it.name) + '" oninput="oiSet(' + i + ',\'name\',this.value)">' +
      '<div class="three"><input placeholder="Taglia" value="' + esc(it.size) + '" oninput="oiSet(' + i + ',\'size\',this.value)"><input type="number" min="1" step="1" placeholder="Qtà" value="' + esc(it.q) + '" oninput="oiSet(' + i + ',\'q\',this.value)"><input type="number" min="0" step="0.01" placeholder="Prezzo €" value="' + esc(it.price == null ? "" : it.price) + '" oninput="oiSet(' + i + ',\'price\',this.value)"></div></div>' +
      '<button class="sm dg" onclick="oiDel(' + i + ')" aria-label="Rimuovi">✕</button></div>';
  }).join("") + '<button class="sm" onclick="oiAdd()">+ Aggiungi prodotto</button>' +
    '<div class="two" style="margin-top:10px"><div>' + fi("o", "cdisc", "Sconto € (facoltativo)", {type:"number", step:"0.01"}) + '</div><div class="otot"><span class="m">Totale</span><b id="otot">' + eur(t.total) + '</b></div></div>';
}
function oiSet(i, k, v) { S.d.o.items[i][k] = v; var t = oSum(S.d.o.items, S.d.o.cdisc); if ($("otot")) $("otot").textContent = eur(t.total); }
function oiAdd() { S.d.o.items.push({id:"", name:"", size:"", v:0, vn:"", q:1, price:"", base:"", img:""}); R(); }
function oiDel(i) { S.d.o.items.splice(i, 1); R(); }
function oiClean(d) {
  var out = [];
  for (var i = 0; i < d.items.length; i++) {
    var it = d.items[i], q = parseInt(it.q, 10), p = parseFloat(it.price);
    if (!String(it.name).trim()) return {err:"Scrivi il nome del prodotto nella riga " + (i + 1) + "."};
    if (!(q >= 1)) return {err:"Quantità non valida nella riga " + (i + 1) + "."};
    if (isNaN(p) || p < 0) return {err:"Prezzo non valido nella riga " + (i + 1) + "."};
    out.push({id:it.id || "", name:String(it.name).trim(), size:String(it.size || "").trim(), v:it.v || 0, vn:it.vn || "", q:q, price:p, base:it.base == null || it.base === "" ? p : it.base, img:it.img || ""});
  }
  if (!out.length) return {err:"Aggiungi almeno un prodotto."};
  return {items:out};
}
function osec(title, body) { return '<div class="osec"><div class="oh">' + title + '</div>' + body + '</div>'; }
function custEd() {
  return '<div class="two"><div>' + fi("o", "first", "Nome") + '</div><div>' + fi("o", "last", "Cognome") + '</div></div>' + fi("o", "phone", "Telefono", {type:"tel"}) +
    fi("o", "street", "Via e numero civico") + '<div class="two"><div>' + fi("o", "zip", "CAP") + '</div><div>' + fi("o", "prov", "Provincia") + '</div></div>' + fi("o", "city", "Città") + fi("o", "anote", "Note per la consegna");
}
function oDetailH() {
  var back = '<div class="bar"><button class="l" onclick="oBack()">← Tutti gli ordini</button></div>';
  if (S.oid === "new") {
    if (!S.d.o) S.d.o = {_id:"new", rid:db.collection("orders").doc().id, first:"", last:"", phone:"", street:"", zip:"", city:"", prov:"", anote:"", courier:"", tracking:"", url:"", snotes:"", notes:"", cdisc:0, items:[{id:"", name:"", size:"", v:0, vn:"", q:1, price:"", base:"", img:""}]};
    return back + '<div class="oth"><h2>Nuovo ordine</h2></div><p class="m" style="margin:0 0 12px">Inserimento manuale: lo stato iniziale è «Da Pagare».</p>' +
      osec("Cliente e indirizzo", custEd()) + osec("Prodotti", itemsEd(S.d.o)) + osec("Note amministrative", ft("o", "notes", "Note (visibili solo a te)", 3)) +
      '<button class="gr bsend" onclick="oCreate()">Crea ordine</button>';
  }
  var o = byId(S.aorders, S.oid);
  if (!o) return back + '<p class="m">Ordine non trovato.</p>';
  if (!S.d.o || S.d.o._id !== o.id) S.d.o = draftOf(o);
  var c = o.cancel || {}, pend = c.requested && o.status !== "Annullato";
  var steps = ST.map(function (s) { return '<button class="stp ' + stCls(s) + (o.status === s ? " on" : "") + '" onclick="oStatus(\'' + o.id + '\',\'' + s + '\')">' + s + '</button>'; }).join("");
  var next = ST[ST.indexOf(o.status) + 1];
  return back + '<div class="ohd"><div class="ocode">' + esc(o.code) + '</div>' + stB(o.status) + (o.deleted ? '<span class="fl bad">Eliminato</span>' : '') + '</div>' +
    '<div class="m" style="margin-bottom:12px">' + fmtDT(o.createdAt) + (o.manual ? ' · inserito a mano' : '') + ' · ultimo aggiornamento ' + fmtDT(o.updatedAt) + '</div>' +
    (pend ? '<div class="osec warnb"><div class="oh">Richiesta di annullamento</div><p class="m" style="margin:0 0 10px">Il cliente ha chiesto di annullare questo ordine (' + fmtDT(c.requestedAt) + ').</p><div class="act"><button class="rd" onclick="oCancelReq(\'' + o.id + '\',true)">Approva annullamento</button><button onclick="oCancelReq(\'' + o.id + '\',false)">Rifiuta</button></div></div>' : '') +
    (o.status === "Annullato" ? '<div class="osec badb"><div class="oh">Annullato</div><p class="m" style="margin:0">Annullato il ' + fmtDT(c.cancelledAt || o.updatedAt) + (c.by ? ' da ' + esc(c.by) : '') + '. Lo storico è conservato.</p></div>' : '') +
    osec("Stato dell'ordine", '<div class="stps">' + steps + '</div>' + (next && o.status !== "Annullato" ? '<button class="gr bsend" style="margin-top:10px" onclick="oStatus(\'' + o.id + '\',\'' + next + '\')">Segna come «' + next + '»</button>' : '') +
      (o.status !== "Annullato" ? '<button class="sm dg" style="margin-top:10px" onclick="oStatus(\'' + o.id + '\',\'Annullato\')">Annulla ordine</button>' : '')) +
    osec("Cliente e indirizzo", custEd() + '<div class="act"><button class="gr" onclick="oSaveCust(\'' + o.id + '\')">Salva dati</button><a class="sm lnk" href="https://wa.me/' + esc(String(o.phone || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">WhatsApp</a></div>') +
    osec("Prodotti", itemsEd(S.d.o) + '<button class="gr" style="margin-top:12px" onclick="oSaveItems(\'' + o.id + '\')">Salva prodotti</button>') +
    osec("Spedizione", fi("o", "courier", "Corriere") + fi("o", "tracking", "Codice di tracciamento") + fi("o", "url", "Link per seguire la spedizione", {type:"url", ph:"https://…"}) + ft("o", "snotes", "Note sulla spedizione", 2) +
      '<p class="m" style="margin:-2px 0 10px">Il cliente vede queste informazioni nei suoi ordini.</p><button class="gr" onclick="oSaveShip(\'' + o.id + '\')">Salva spedizione</button>') +
    osec("Note amministrative", ft("o", "notes", "Visibili solo a te", 3) + '<button class="gr" onclick="oSaveNotes(\'' + o.id + '\')">Salva note</button>') +
    osec("Storico", histOf(o).slice().reverse().map(function (h) {
      return '<div class="hl2"><span class="hdot' + (h.by === "cliente" ? " cl" : "") + '"></span><div><b>' + (h.from && h.to ? esc(h.from) + ' → ' + esc(h.to) : esc(h.msg || h.to || "Aggiornamento")) + '</b><span class="m">' + fmtDT(h.at) + ' · ' + esc(h.by || "") + (h.from && h.to && h.msg ? ' · ' + esc(h.msg) : '') + '</span></div></div>';
    }).join("")) +
    '<div class="osec dz"><div class="oh">Zona delicata</div>' + (o.deleted
      ? '<div class="act"><button onclick="oRestore(\'' + o.id + '\')">Ripristina ordine</button><button class="rd" onclick="oPurge(\'' + o.id + '\')">Elimina definitivamente</button></div>'
      : '<button class="sm dg" onclick="oDelete(\'' + o.id + '\')">Elimina ordine</button><p class="m" style="margin:8px 0 0">L\'ordine viene nascosto ma conservato: lo ritrovi nel filtro «Eliminati».</p>') + '</div>';
}
function oUpd(id, up, hist, okMsg, after) {
  var now = Date.now(); up.updatedAt = now; if (hist) up.history = FV.arrayUnion(Object.assign({at:now, by:"admin"}, hist));
  return db.collection("orders").doc(id).update(up).then(function () { toast(okMsg || "Salvato"); snd("ok"); if (after) after(); }).catch(oErr);
}
function oStatus(id, to) {                                      // il cambio stato si salva subito e avvisa il cliente
  var o = byId(S.aorders, id); if (!o || o.status === to) return;
  if (to === "Annullato" && !confirm("Annullare l'ordine " + o.code + "? Il cliente riceverà una notifica e lo storico resta conservato.")) return;
  var up = {status:to}, m = ST_MSG[to] || [to];
  if (to === "Annullato") up.cancel = Object.assign({}, o.cancel || {}, {requested:false, cancelledAt:Date.now(), by:"gestore"});
  oUpd(id, up, {from:o.status, to:to, msg:m[0], notify:true}, "Stato: " + to);
}
function oCancelReq(id, yes) {
  var o = byId(S.aorders, id); if (!o) return;
  if (yes) { oStatus(id, "Annullato"); return; }
  oUpd(id, {cancel:Object.assign({}, o.cancel || {}, {requested:false, rejected:true})}, {type:"cancelrej", msg:"Richiesta di annullamento non accettata", notify:true}, "Richiesta rifiutata");
}
function oSaveCust(id) {
  var d = S.d.o, p = normPh(d.phone), zip = String(d.zip || "").replace(/\D/g, "");
  if (!String(d.first).trim() || !String(d.last).trim()) { alert("Nome e cognome sono obbligatori."); return; }
  if (p.length < 8) { alert("Telefono non valido."); return; }
  if (!String(d.street).trim() || zip.length !== 5 || !String(d.city).trim()) { alert("Indirizzo incompleto: servono via, CAP (5 cifre) e città."); return; }
  oUpd(id, {first:String(d.first).trim(), last:String(d.last).trim(), phone:p, address:{street:String(d.street).trim(), zip:zip, city:String(d.city).trim(), prov:String(d.prov || "").trim().toUpperCase(), note:String(d.anote || "").trim()}}, {type:"edit", msg:"Dati cliente modificati", notify:false}, "Dati salvati");
}
function oSaveItems(id) {
  var d = S.d.o, c = oiClean(d); if (c.err) { alert(c.err); return; }
  var t = oSum(c.items, d.cdisc);
  oUpd(id, {items:c.items, subtotal:t.sub, couponDisc:Number(d.cdisc) || 0, total:t.total}, {type:"edit", msg:"Prodotti o totale modificati", notify:false}, "Prodotti salvati");
}
function oSaveShip(id) {
  var d = S.d.o, o = byId(S.aorders, id), old = o.shipping || {}, url = String(d.url || "").trim();
  if (url && !safeUrl(url)) { alert("Il link deve iniziare con http:// o https://"); return; }
  var ship = {courier:String(d.courier || "").trim(), tracking:String(d.tracking || "").trim(), url:url, notes:String(d.snotes || "").trim()};
  var changed = (ship.tracking || ship.url) && (ship.tracking !== (old.tracking || "") || ship.url !== (old.url || ""));
  oUpd(id, {shipping:ship}, changed ? {type:"ship", msg:"Informazioni di spedizione aggiornate", notify:true} : null, "Spedizione salvata");
}
function oSaveNotes(id) { oUpd(id, {notes:String(S.d.o.notes || "").trim()}, null, "Note salvate"); }
function oDelete(id) {
  var o = byId(S.aorders, id);
  if (!confirm("Eliminare l'ordine " + o.code + "?\n\nVerrà nascosto dalla lista ma conservato: potrai ripristinarlo dal filtro «Eliminati».")) return;
  oUpd(id, {deleted:true, deletedAt:Date.now()}, {type:"delete", msg:"Ordine eliminato", notify:false}, "Ordine eliminato", function () { S.oid = null; S.d.o = null; R(); });
}
function oRestore(id) { oUpd(id, {deleted:false, deletedAt:null}, {type:"restore", msg:"Ordine ripristinato", notify:false}, "Ordine ripristinato"); }
function oPurge(id) {
  var o = byId(S.aorders, id);
  if (!confirm("ELIMINARE DEFINITIVAMENTE l'ordine " + o.code + "?\nQuesta azione non si può annullare.")) return;
  if (!confirm("Ultima conferma: cancellare per sempre " + o.code + "?")) return;
  db.collection("orders").doc(id).delete().then(function () { toast("Eliminato definitivamente"); S.oid = null; S.d.o = null; R(); }).catch(oErr);
}
function oNew() { S.oid = "new"; S.d.o = null; R(); window.scrollTo(0, 0); snd("open"); }
function oCreate() {
  var d = S.d.o, p = normPh(d.phone), zip = String(d.zip || "").replace(/\D/g, ""), c = oiClean(d);
  if (!String(d.first).trim() || !String(d.last).trim()) { alert("Nome e cognome sono obbligatori."); return; }
  if (p.length < 8) { alert("Telefono non valido."); return; }
  if (!String(d.street).trim() || zip.length !== 5 || !String(d.city).trim()) { alert("Indirizzo incompleto: servono via, CAP (5 cifre) e città."); return; }
  if (c.err) { alert(c.err); return; }
  if (S.placing) return; S.placing = true;
  var t = oSum(c.items, d.cdisc), now = Date.now(), cl = S.clients.filter(function (x) { return x.id === p; })[0];
  placeOrder(d.rid, {clientId:p, first:String(d.first).trim(), last:String(d.last).trim(), phone:p,
    address:{street:String(d.street).trim(), zip:zip, city:String(d.city).trim(), prov:String(d.prov || "").trim().toUpperCase(), note:String(d.anote || "").trim()},
    items:c.items, subtotal:t.sub, couponCode:"", couponDisc:Number(d.cdisc) || 0, total:t.total, status:"Da Pagare", createdAt:now, updatedAt:now,
    notes:String(d.notes || "").trim(), shipping:{courier:"", tracking:"", url:"", notes:""}, cancel:null, deleted:false, manual:true,
    history:[{at:now, from:"", to:"Da Pagare", by:"admin", msg:"Ordine inserito a mano", notify:false}]
  }).then(function (o) {
    S.placing = false; markSeen(o.id); S.oid = o.id; S.d.o = null; toast("Creato " + o.code); snd("ok"); R(); window.scrollTo(0, 0);
    if (cl) db.collection("clients").doc(p).update({orderIds:FV.arrayUnion(o.id)}).catch(function () {});   // se il cliente è registrato, lo vede tra i suoi ordini
  }).catch(function (e) { S.placing = false; oErr(e); });
}

// all'apertura del sito, un cliente già entrato riprende ad ascoltare i suoi ordini
if (S.user && S.user.phone) watchMine();
