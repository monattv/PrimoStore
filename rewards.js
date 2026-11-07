// ====== COUPON PERSONALE -10% ======
// Un indirizzo segreto (#premio-<40 caratteri>), sempre lo stesso, dà un coupon del 10% a chi ha almeno un ordine.
// - il coupon è legato all'account che ha fatto l'accesso (documento rewards/<chiave>_<telefono>);
// - se ne ha già uno non usato, la pagina mostra quello (non ne crea un altro);
// - si usa una volta sola, in automatico, sul prossimo ordine; poi, riaprendo la pagina e accedendo, ne arriva uno nuovo.
// La chiave del link sta nel documento config/reward (lo crei dal Dashboard → Sconti) e le regole Firestore la controllano.

S.pcp = lsJ("pcp"); S.cpHist = lsJ("cpHist") || []; S.rk = lsGet("rk") || ""; S.rkPending = null; S.rwBusy = false; S.rwk = undefined;
var RW_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function rndStr(n, chars) {
  var out = "", b = new Uint32Array(n);
  try { (window.crypto || window.msCrypto).getRandomValues(b); } catch (e) { for (var k = 0; k < n; k++) b[k] = Math.floor(Math.random() * 4294967295); }
  for (var i = 0; i < n; i++) out += chars.charAt(b[i] % chars.length);
  return out;
}
function genCode() { var c = rndStr(8, RW_CHARS); return c.slice(0, 4) + "-" + c.slice(4); }
function rwId(key, owner) { return key + "_" + owner; }
function savePcp() {
  if (S.pcp) lsSet("pcp", JSON.stringify(S.pcp)); else { try { localStorage.removeItem("pcp"); } catch (e) {} }
  lsSet("cpHist", JSON.stringify(S.cpHist.slice(0, 30)));
}
function histAdd(code, at) { if (!S.cpHist.some(function (h) { return h.code === code; })) S.cpHist.unshift({code:code, at:at, usedAt:null, order:""}); }
function histUsed(code, order) {
  var f = S.cpHist.filter(function (h) { return h.code === code; })[0];
  if (!f) { f = {code:code, at:Date.now(), usedAt:null, order:""}; S.cpHist.unshift(f); }
  if (!f.usedAt) f.usedAt = Date.now();
  var oc = S.mine && S.mine[order] ? S.mine[order].code : order;      // dall'id dell'ordine al suo codice PS-…
  if (oc && !f.order) f.order = oc;
}

// ---------- il cliente apre il link ----------
function handleRewardHash() {
  var m = /^#premio-([A-Za-z0-9]{40})$/.exec(location.hash || "");
  if (!m) return false;
  S.rkPending = m[1]; S.rwFetched = false; if (!S.user) R(); tryReward(); return true;
}
function rwFinish() { S.rkPending = null; S.rwBusy = false; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
function tryReward() {
  if (!S.rkPending || !S.user || S.admin || S.rwBusy) return;
  if (!S.mineReady) return;                                      // riparte da watchMine appena gli ordini sono caricati
  var key = S.rkPending, owner = S.user.phone, os = myList().filter(function (o) { return o.status !== "Annullato"; });
  if (!os.length) {
    if (!S.rwFetched) {                                          // magari gli ordini sono stati fatti da un altro dispositivo: li cerco nel profilo
      S.rwFetched = true; S.rwBusy = true;
      db.collection("clients").doc(owner).get().then(function (d) {
        S.rwBusy = false; var ids = (d.exists && d.data().orderIds) || [];
        if (ids.length) { S.mineReady = false; watchMine(ids); } else { rwFinish(); rewardSheet({err:"noorder"}); }
      }).catch(function () { S.rwBusy = false; rwFinish(); rewardSheet({err:"net"}); });
      return;
    }
    rwFinish(); rewardSheet({err:"noorder"}); return;
  }
  S.rwBusy = true;
  var ref = db.collection("rewards").doc(rwId(key, owner)), now = Date.now(), proof = os[0].id;
  ref.get().then(function (d) {
    var x = d.exists ? d.data() : null;
    if (x && !x.used) return {c:x, isNew:false};                 // ne ha già uno non usato: si mostra quello
    if (x) { histUsed(x.code, x.usedOrder || ""); }
    var c = {owner:owner, code:genCode(), type:"pct", value:10, used:false, cycle:x ? (Number(x.cycle) || 1) + 1 : 1, created:now, proof:proof};
    return ref.set(c).then(function () { return {c:c, isNew:true}; });
  }).then(function (r) {
    rwFinish(); S.rk = key; lsSet("rk", key);
    S.pcp = {id:rwId(key, owner), code:r.c.code, pct:Number(r.c.value) || 10, cycle:Number(r.c.cycle) || 1, used:false};
    histAdd(r.c.code, r.c.created || now); savePcp();
    cartR(); R(); rewardSheet({c:S.pcp, isNew:r.isNew}); snd(r.isNew ? "notif" : "ok");
  }).catch(function (e) {
    rwFinish(); console.error(e); rewardSheet({err:e && e.code === "permission-denied" ? "denied" : "net"}); snd("warn");
  });
}
var ICO_GIFT = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M12 8.5v12"/><path d="M12 8.5C10 8.5 7.5 8 7.5 6.2 7.5 4.8 9 4.3 10 5c1 .7 2 3.5 2 3.5s1-2.8 2-3.5c1-.7 2.5-.2 2.5 1.2 0 1.8-2.5 2.3-4.5 2.3z"/></svg>';
function rewardSheet(o) {                                        // scheda con il coupon (o con il motivo per cui non c'è)
  S.cur = null; S.ov = null;
  S.autoDone = true;                                              // non si sovrappone alla scheda Notifiche/Info automatica
  var msg = {noorder:["Pagina riservata", "Questa pagina è riservata a chi ha già effettuato almeno un ordine. Dopo il tuo primo ordine torna qui per ricevere il tuo coupon."],
    denied:["Link non valido", "Questo link non è valido o non è più attivo. Chiedi al negozio il link aggiornato."],
    net:["Non riesco a collegarmi", "Controlla la connessione e riapri il link."]};
  var h = '<div class="grab"></div><div class="shh"><b>' + (o.c ? "Il tuo coupon" : msg[o.err][0]) + '</b><button class="l" onclick="closeAll()">Chiudi</button></div>';
  if (o.c) h += '<div class="rwc"><div class="rwi">' + ICO_GIFT + '</div><p class="m" style="margin:0">' + (o.isNew ? "Ecco il tuo nuovo coupon" : "Hai già un coupon non ancora usato") + '</p>' +
    '<div class="rwcode">' + esc(o.c.code) + '</div><div class="rwpct">-' + (Number(o.c.pct) || 10) + '% sul prossimo ordine</div>' +
    '<p class="m" style="margin:10px 0 14px">Si applica da solo quando confermi l’ordine e vale una sola volta. Lo ritrovi sempre in «I miei coupon» nel tuo account. Per riceverne un altro, dopo averlo usato, riapri questo link e accedi.</p>' +
    '<button class="bsend" onclick="copyTxt(\'' + esc(o.c.code) + '\')">Copia il codice</button><button class="gr bsend" style="margin-top:8px" onclick="closeAll()">Vai al negozio</button></div>';
  else h += '<div class="cnote" style="margin-top:14px">' + msg[o.err][1] + '</div><button class="pri bsend" onclick="closeAll()">Ok</button>';
  $("sheet").innerHTML = h; document.body.classList.remove("mo", "co"); document.body.classList.add("so"); snd("open");
}

// ---------- coupon nel profilo ----------
function refreshPcp(cb) {                                        // controlla su Firestore che il coupon sia ancora valido (1 lettura)
  if (!S.pcp || !S.user || S.admin) { if (cb) cb(); return; }
  db.collection("rewards").doc(S.pcp.id).get().then(function (d) {
    var x = d.exists ? d.data() : null;
    if (!x) S.pcp = null;
    else if (x.used) { histUsed(x.code, x.usedOrder || ""); S.pcp = null; }
    else S.pcp = {id:S.pcp.id, code:x.code, pct:Number(x.value) || 10, cycle:Number(x.cycle) || 1, used:false};
    savePcp(); if (cb) cb();
  }).catch(function () { if (cb) cb(); });
}
function openMyCoupons() {
  S.cur = null; S.ov = null;
  var draw = function () {
    var pc = S.pcp && !S.pcp.used ? S.pcp : null, cp = S.coupon, hist = S.cpHist.filter(function (h) { return !pc || h.code !== pc.code; });
    $("sheet").innerHTML = '<div class="grab"></div><div class="shh"><b>I miei coupon</b><button class="l" onclick="closeAll()">Chiudi</button></div>' +
      '<div class="nlab">Disponibili</div>' +
      (pc ? '<div class="cpcard"><div class="cpt"><b>' + esc(pc.code) + '</b><span class="pill">-' + (Number(pc.pct) || 10) + '%</span></div><span class="m">Personale · una sola volta · si applica da solo al prossimo ordine</span></div>' : '') +
      (cp ? '<div class="cpcard"><div class="cpt"><b>' + esc(cp.code) + '</b><span class="pill">' + (cp.type === "fix" ? "-€ " + Number(cp.value).toFixed(2) : "-" + Number(cp.value) + "%") + '</span></div><span class="m">Inserito nel carrello</span></div>' : '') +
      (!pc && !cp ? '<p class="m">Nessun coupon disponibile al momento.</p>' : '') +
      (hist.length ? '<div class="nlab">Già usati</div>' + hist.map(function (h) {
        return '<div class="cpcard used"><div class="cpt"><b>' + esc(h.code) + '</b><span class="pill gray">' + (h.usedAt ? "usato" : "non risulta usato") + '</span></div><span class="m">' + (h.usedAt ? "Usato il " + fmtDT(h.usedAt) + (h.order ? " nell'ordine " + esc(h.order) : "") : "Ricevuto il " + fmtDT(h.at)) + '</span></div>';
      }).join("") : '') +
      '<p class="m" style="margin:16px 0 0">Il coupon personale del 10% vale una volta. Per riceverne uno nuovo, dopo averlo usato, riapri il link riservato del negozio e accedi.</p>';
  };
  draw(); document.body.classList.remove("mo", "co"); document.body.classList.add("so"); snd("open");
  refreshPcp(function () { if (document.body.classList.contains("so") && !S.cur && !S.ov && /I miei coupon/.test($("sheet").innerText)) draw(); });
}

// ---------- gestore: crea e mostra il link segreto ----------
function rwLoad() {
  if (S.rwLoading) return; S.rwLoading = true;
  db.collection("config").doc("reward").get().then(function (d) { S.rwLoading = false; S.rwk = d.exists ? String(d.data().key || "") : ""; R(); })
    .catch(function (e) { S.rwLoading = false; S.rwk = ""; console.error(e); R(); });
}
function rwLink() { return S.rwk ? location.origin + location.pathname + "#premio-" + S.rwk : ""; }
function rwBlock() {
  if (S.rwk === undefined) rwLoad();
  var k = S.rwk;
  return hd("Coupon fedeltà −10% (link segreto)") + '<div class="form"><p class="m" style="margin:0 0 10px">Chi ha almeno un ordine e apre questo link (dopo l’accesso) riceve un coupon personale del 10% per il prossimo ordine, usabile una sola volta. Il link resta sempre lo stesso: puoi darlo ai clienti. Il coupon si applica da solo all’ordine e lo vedi nel dettaglio dell’ordine.</p>' +
    (S.rwk === undefined ? '<div class="skl" style="height:60px"></div>' : k
      ? '<label>Link da dare ai clienti</label><input readonly value="' + esc(rwLink()) + '" onfocus="this.select()"><div class="act"><button class="gr" onclick="rwCopy()">Copia il link</button><button class="sm dg" onclick="rwNew()">Genera un nuovo link</button></div><p class="m" style="margin:10px 0 0">Se generi un nuovo link, quello vecchio smette di funzionare e i coupon già assegnati e non ancora usati non sono più utilizzabili.</p>'
      : '<button class="gr" onclick="rwNew()">Crea il link segreto</button>') + '</div>';
}
function rwCopy() { copyTxt(rwLink()); }
function rwNew() {
  if (S.rwk && !confirm("Il vecchio link smetterà di funzionare e i coupon non ancora usati non saranno più validi. Continuare?")) return;
  var key = rndStr(40, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
  db.collection("config").doc("reward").set({key:key, created:Date.now()}).then(function () { S.rwk = key; R(); toast("Link creato"); snd("ok"); }).catch(oErr);
}

window.addEventListener("hashchange", handleRewardHash);
if (S.user && S.user.phone) watchMine();                       // un cliente già entrato riprende ad ascoltare i suoi ordini
handleRewardHash();                                              // se il sito è stato aperto proprio dal link segreto
if (S.pcp && S.user && S.user.phone) refreshPcp(function () { cartR(); R(); });
