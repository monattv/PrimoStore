const products = [
  {id:1,name:"Air Pulse Red",category:"Lifestyle",price:119.90,tag:"BESTSELLER",color:"Red / White",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"},
  {id:2,name:"Court Classic",category:"Lifestyle",price:94.90,tag:"ESSENTIAL",color:"White / Neutral",image:"https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85"},
  {id:3,name:"Urban Runner",category:"Running",price:129.00,tag:"NEW DROP",color:"Grey / Silver",image:"https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=700&q=85"},
  {id:4,name:"Retro Street 92",category:"Streetwear",price:109.90,tag:"LIMITED",color:"Black / Cream",image:"https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85"},
  {id:5,name:"Cloud Step",category:"Running",price:139.90,tag:"COMFORT",color:"Sand / White",image:"https://images.unsplash.com/photo-1460353581641-37barg1e?auto=format&fit=crop&w=700&q=85"},
  {id:6,name:"Mono Low",category:"Lifestyle",price:89.90,tag:"EVERYDAY",color:"White / Black",image:"https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85"},
  {id:7,name:"Track Form",category:"Streetwear",price:124.90,tag:"SELECTED",color:"Olive / Cream",image:"https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=700&q=85"},
  {id:8,name:"Motion 01",category:"Running",price:114.90,tag:"NEW",color:"White / Grey",image:"https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=700&q=85"}
];

const $ = (selector) => document.querySelector(selector);
const money = (amount) => new Intl.NumberFormat("it-IT", {style:"currency",currency:"EUR"}).format(amount);
let activeFilter = "Tutti";
let cart = loadCart();
let toastTimer;

function loadCart() {
  try { return JSON.parse(localStorage.getItem("primostore_cart") || "[]"); }
  catch { return []; }
}
function saveCart() {
  localStorage.setItem("primostore_cart", JSON.stringify(cart));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderProducts() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const filtered = products.filter(p => (activeFilter === "Tutti" || p.category === activeFilter) &&
    `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(query));
  $("#productGrid").innerHTML = filtered.length ? filtered.map(p => `
    <article class="product-card">
      <div class="product-image-wrap">
        <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.opacity='.25';this.alt='Immagine non disponibile'">
        <span class="product-tag">${escapeHTML(p.tag)}</span>
        <button class="quick-add" data-add="${p.id}" aria-label="Aggiungi ${escapeHTML(p.name)} al carrello"><span>Aggiungi al carrello</span><span>＋</span></button>
      </div>
      <div class="product-info"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.category)} · ${escapeHTML(p.color)}</p></div><span class="product-price">${money(p.price)}</span></div>
    </article>`).join("") : `<p>Nessuna sneaker trovata. Prova un'altra ricerca.</p>`;
}
function addToCart(id) {
  const item = cart.find(entry => entry.id === id);
  if (item) item.quantity += 1;
  else cart.push({id,quantity:1});
  saveCart(); renderCart();
  const product = products.find(p => p.id === id);
  showToast(`${product.name} aggiunta al carrello`);
}
function changeQuantity(id, amount) {
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
  saveCart(); renderCart();
}
function renderCart() {
  const count = cart.reduce((sum,item) => sum + item.quantity, 0);
  const total = cart.reduce((sum,item) => sum + products.find(p=>p.id===item.id).price*item.quantity, 0);
  $("#cartCount").textContent = count;
  $("#cartTitleCount").textContent = `(${count})`;
  $("#cartSubtotal").textContent = money(total);
  $("#cartItems").innerHTML = cart.length ? cart.map(item => {
    const p = products.find(product => product.id === item.id);
    return `<article class="cart-item"><img src="${p.image}" alt="${escapeHTML(p.name)}"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.color)}</p><div class="quantity-controls"><button data-qty="${p.id}" data-delta="-1" aria-label="Riduci quantità">−</button><span>${item.quantity}</span><button data-qty="${p.id}" data-delta="1" aria-label="Aumenta quantità">＋</button></div><button class="remove-item" data-remove="${p.id}">Rimuovi</button></div><span class="cart-item-price">${money(p.price*item.quantity)}</span></article>`;
  }).join("") : `<div class="empty-cart"><strong>Il tuo carrello è vuoto.</strong><p>La tua prossima sneaker potrebbe essere qui.<br>Esplora la selezione e trova il tuo paio.</p></div>`;
  $("#checkoutButton").disabled = !cart.length;
  $("#checkoutButton").style.opacity = cart.length ? "1" : ".45";
  $("#checkoutMessage").textContent = "";
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>toast.classList.remove("show"),2400);
}
function openOverlay(id) {
  const overlay = $(id); overlay.classList.add("open"); overlay.setAttribute("aria-hidden","false"); document.body.classList.add("no-scroll");
}
function closeOverlay(id) {
  const overlay = $(id); overlay.classList.remove("open"); overlay.setAttribute("aria-hidden","true");
  if (!document.querySelector(".overlay.open") && !$("#cartDrawer").classList.contains("open")) document.body.classList.remove("no-scroll");
}
function openCart() {
  $("#cartDrawer").classList.add("open"); $("#cartBackdrop").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden","false"); document.body.classList.add("no-scroll");
}
function closeCart() {
  $("#cartDrawer").classList.remove("open"); $("#cartBackdrop").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden","true");
  if (!document.querySelector(".overlay.open")) document.body.classList.remove("no-scroll");
}
function currentName() { return localStorage.getItem("primostore_name") || ""; }
function updateAccount() {
  const name = currentName();
  $("#accountLabel").textContent = name ? name : "Accedi";
}
function greet(name) {
  $("#welcomeName").textContent = name;
  openOverlay("#welcomeOverlay");
}
$("#productGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(Number(button.dataset.add));
});
$("#cartItems").addEventListener("click", event => {
  const qty = event.target.closest("[data-qty]");
  const remove = event.target.closest("[data-remove]");
  if (qty) changeQuantity(Number(qty.dataset.qty), Number(qty.dataset.delta));
  if (remove) { cart = cart.filter(item => item.id !== Number(remove.dataset.remove)); saveCart(); renderCart(); }
});
document.querySelectorAll(".filter-tab").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  renderProducts();
}));
$("#searchInput").addEventListener("input", renderProducts);
$("#openCart").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#continueShopping").addEventListener("click", closeCart);
$("#cartBackdrop").addEventListener("click", closeCart);
$("#checkoutButton").addEventListener("click", () => {
  if (!cart.length) return;
  $("#checkoutMessage").textContent = "Checkout dimostrativo: per ricevere pagamenti reali serve integrare un servizio sicuro (es. Stripe) e un backend.";
});
$("#accountButton").addEventListener("click", () => {
  const name = currentName();
  if (name) greet(name);
  else openOverlay("#loginOverlay");
});
$("#closeLogin").addEventListener("click", () => closeOverlay("#loginOverlay"));
$("#closeWelcome").addEventListener("click", () => closeOverlay("#welcomeOverlay"));
$("#enterStore").addEventListener("click", () => closeOverlay("#welcomeOverlay"));
$("#loginOverlay").addEventListener("click", event => { if (event.target.id === "loginOverlay") closeOverlay("#loginOverlay"); });
$("#welcomeOverlay").addEventListener("click", event => { if (event.target.id === "welcomeOverlay") closeOverlay("#welcomeOverlay"); });
$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#nameInput").value.trim();
  if (!name) return;
  localStorage.setItem("primostore_name", name);
  updateAccount(); closeOverlay("#loginOverlay"); greet(name);
});
$("#newsletterForm").addEventListener("submit", event => {
  event.preventDefault();
  $("#newsletterMessage").textContent = "Grazie! Iscrizione dimostrativa completata.";
  $("#newsletterEmail").value = "";
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") { closeCart(); closeOverlay("#loginOverlay"); closeOverlay("#welcomeOverlay"); }
});
$("#year").textContent = new Date().getFullYear();
renderProducts(); renderCart(); updateAccount();
// Prima visita: chiedi il nome; gli accessi successivi mostrano subito il saluto personalizzato.
if (!currentName()) setTimeout(() => openOverlay("#loginOverlay"), 500);
