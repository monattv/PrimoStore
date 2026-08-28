/* =========================================================
   CASHIER SIMULATOR
   Mobile Edition
   ========================================================= */


/* -----------------------------
   GAME DATA
----------------------------- */

const products = [
    { name: "Latte", price: 2.40, icon: "☕" },
    { name: "Cappuccino", price: 1.80, icon: "☕" },
    { name: "Acqua", price: 0.80, icon: "💧" },
    { name: "Panino", price: 4.50, icon: "🥪" },
    { name: "Pizza", price: 3.20, icon: "🍕" },
    { name: "Patatine", price: 1.70, icon: "🍟" },
    { name: "Bibita", price: 2.20, icon: "🥤" },
    { name: "Succo", price: 1.90, icon: "🧃" },
    { name: "Cioccolato", price: 1.50, icon: "🍫" },
    { name: "Biscotti", price: 2.10, icon: "🍪" },
    { name: "Mela", price: 0.90, icon: "🍎" },
    { name: "Banana", price: 1.10, icon: "🍌" },
    { name: "Giornale", price: 1.80, icon: "📰" },
    { name: "Gelato", price: 2.80, icon: "🍦" }
];

const customers = [
    {
        name: "Marco",
        avatar: "👨",
        messages: [
            "Buongiorno!",
            "Ecco la spesa.",
            "Quanto devo?"
        ]
    },
    {
        name: "Giulia",
        avatar: "👩",
        messages: [
            "Ciao!",
            "Ho preso solo queste cose.",
            "Grazie!"
        ]
    },
    {
        name: "Luca",
        avatar: "👨‍🦱",
        messages: [
            "Buongiorno.",
            "Pago qui.",
            "Tutto qui."
        ]
    },
    {
        name: "Sara",
        avatar: "👩‍🦰",
        messages: [
            "Salve!",
            "Mi può fare il conto?",
            "Perfetto."
        ]
    },
    {
        name: "Alessandro",
        avatar: "👨‍🦳",
        messages: [
            "Buonasera.",
            "Ho fretta.",
            "Grazie mille."
        ]
    },
    {
        name: "Elena",
        avatar: "👩‍🦳",
        messages: [
            "Ciao!",
            "Ecco tutto.",
            "Arrivederci!"
        ]
    }
];


/* -----------------------------
   GAME STATE
----------------------------- */

let state = {
    money: Number(localStorage.getItem("cashier_money")) || 0,
    rating: Number(localStorage.getItem("cashier_rating")) || 100,
    customers: Number(localStorage.getItem("cashier_customers")) || 0,

    dark: localStorage.getItem("cashier_dark") === "true",
    animations: localStorage.getItem("cashier_animations") !== "false",
    sound: localStorage.getItem("cashier_sound") !== "false",

    currentCustomer: null,
    currentProducts: [],
    total: 0,

    paymentType: null,
    cashReceived: 0,
    changeRequired: 0,

    selectedCash: [],
    selectedAmount: 0,

    timer: 0,
    timerMax: 45,
    timerInterval: null,

    busy: false
};


/* -----------------------------
   DOM
----------------------------- */

const $ = id => document.getElementById(id);

const customerAvatar = $("customerAvatar");
const customerName = $("customerName");
const customerMessage = $("customerMessage");
const productsList = $("productsList");

const totalPrice = $("totalPrice");

const paymentArea = $("paymentArea");
const paymentInfo = $("paymentInfo");
const paymentAction = $("paymentAction");

const changeRequired = $("changeRequired");
const changeGiven = $("changeGiven");
const changeMessage = $("changeMessage");

const selectedItems = $("selectedItems");

const confirmChange = $("confirmChange");
const clearChange = $("clearChange");

const nextCustomer = $("nextCustomer");

const timerElement = $("timer");
const timerProgress = $("timerProgress");

const moneyStat = $("moneyStat");
const ratingStat = $("ratingStat");
const customersStat = $("customersStat");

const notification = $("notification");
const notificationTitle = $("notificationTitle");
const notificationText = $("notificationText");

const receiptOverlay = $("receiptOverlay");
const receiptProducts = $("receiptProducts");
const receiptTotal = $("receiptTotal");
const receiptPayment = $("receiptPayment");

const settingsOverlay = $("settingsOverlay");
const posOverlay = $("posOverlay");

const themeBtn = $("themeBtn");
const soundBtn = $("soundBtn");

const darkToggle = $("darkToggle");
const animationToggle = $("animationToggle");
const soundToggle = $("soundToggle");


/* -----------------------------
   HELPERS
----------------------------- */

function money(value) {
    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR"
    }).format(value);
}


function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}


function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}


function randomNumber(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function saveState() {
    localStorage.setItem("cashier_money", state.money);
    localStorage.setItem("cashier_rating", state.rating);
    localStorage.setItem("cashier_customers", state.customers);

    localStorage.setItem("cashier_dark", state.dark);
    localStorage.setItem("cashier_animations", state.animations);
    localStorage.setItem("cashier_sound", state.sound);
}


function playBeep(type = "normal") {

    if (!state.sound) return;

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) return;

        const ctx = new AudioContext();

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.type = "sine";

        if (type === "success") {
            oscillator.frequency.value = 720;
        } else if (type === "error") {
            oscillator.frequency.value = 180;
        } else {
            oscillator.frequency.value = 450;
        }

        gain.gain.setValueAtTime(.04, ctx.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            .001,
            ctx.currentTime + .12
        );

        oscillator.start();

        oscillator.stop(
            ctx.currentTime + .13
        );

    } catch (error) {
        // Audio non disponibile
    }
}


/* -----------------------------
   THEME
----------------------------- */

function applyTheme() {

    document.body.classList.toggle(
        "dark",
        state.dark
    );

    themeBtn.textContent =
        state.dark ? "☀️" : "🌙";

    darkToggle.classList.toggle(
        "active",
        state.dark
    );

    animationToggle.classList.toggle(
        "active",
        state.animations
    );

    soundToggle.classList.toggle(
        "active",
        state.sound
    );

    document.body.classList.toggle(
        "no-animations",
        !state.animations
    );

    saveState();
}


/* -----------------------------
   STATS
----------------------------- */

function updateStats() {

    moneyStat.textContent = money(state.money);

    ratingStat.textContent =
        Math.round(state.rating) + "%";

    customersStat.textContent =
        state.customers;
}


/* -----------------------------
   NOTIFICATION
----------------------------- */

let notificationTimeout;

function showNotification(title, text) {

    notificationTitle.textContent = title;
    notificationText.textContent = text;

    notification.classList.add("show");

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {
        notification.classList.remove("show");
    }, 3500);

    playBeep();
}


/* -----------------------------
   CUSTOMER GENERATION
----------------------------- */

function createCustomer() {

    clearTimer();

    state.busy = false;

    state.currentCustomer = random(customers);

    const numberOfProducts =
        randomNumber(2, 6);

    state.currentProducts = [];

    for (let i = 0; i < numberOfProducts; i++) {

        const product = random(products);

        const quantity =
            Math.random() < .25
                ? 2
                : 1;

        state.currentProducts.push({
            ...product,
            quantity
        });
    }

    state.total = roundMoney(
        state.currentProducts.reduce(
            (sum, product) =>
                sum +
                product.price *
                product.quantity,
            0
        )
    );

    /*
       Il cliente sceglie autonomamente
       come pagare.
    */

    state.paymentType =
        Math.random() < .48
            ? "pos"
            : "cash";

    state.cashReceived = 0;
    state.changeRequired = 0;

    state.selectedCash = [];
    state.selectedAmount = 0;

    renderCustomer();

    startTimer();

    showNotification(
        "Nuovo cliente",
        `${state.currentCustomer.name} sta aspettando alla cassa.`
    );
}


/* -----------------------------
   RENDER CUSTOMER
----------------------------- */

function renderCustomer() {

    const customer =
        state.currentCustomer;

    customerAvatar.textContent =
        customer.avatar;

    customerName.textContent =
        customer.name;

    customerMessage.textContent =
        random(customer.messages);

    totalPrice.textContent =
        money(state.total);

    productsList.innerHTML = "";

    state.currentProducts.forEach(product => {

        const row =
            document.createElement("div");

        row.className = "product-row";

        const productTotal =
            roundMoney(
                product.price *
                product.quantity
            );

        row.innerHTML = `
            <div class="product-icon">
                ${product.icon}
            </div>

            <div class="product-details">
                <div class="product-name">
                    ${product.name}
                </div>

                <div class="product-quantity">
                    ${product.quantity} × ${money(product.price)}
                </div>
            </div>

            <div class="product-price">
                ${money(productTotal)}
            </div>
        `;

        productsList.appendChild(row);
    });


    paymentArea.classList.remove("hidden");

    if (state.paymentType === "cash") {

        paymentInfo.innerHTML = `
            <strong>💶 Pagamento in contanti</strong>
            <br>
            <span>
                Il cliente ti darà il denaro.
                Tu dovrai calcolare e dare il resto.
            </span>
        `;

        paymentAction.textContent =
            "💶 IL CLIENTE PAGA IN CONTANTI";

        paymentAction.disabled = false;

        registerStatus.textContent =
            "Attesa contanti";

        changeMessage.textContent =
            "Il cliente deve ancora pagare.";

    } else {

        paymentInfo.innerHTML = `
            <strong>💳 Pagamento con POS</strong>
            <br>
            <span>
                Il cliente ha scelto di pagare con carta.
            </span>
        `;

        paymentAction.textContent =
            "💳 AVVIA PAGAMENTO POS";

        paymentAction.disabled = false;

        registerStatus.textContent =
            "Attesa POS";

        changeMessage.textContent =
            "Il cliente paga con carta.";

    }

    resetChangeUI();
}


/* -----------------------------
   CUSTOMER TIMER
----------------------------- */

function startTimer() {

    clearTimer();

    state.timer = state.timerMax;

    updateTimer();

    state.timerInterval =
        setInterval(() => {

            state.timer--;

            updateTimer();

            if (state.timer <= 0) {

                clearTimer();

                customerLeft();
            }

        }, 1000);
}


function updateTimer() {

    timerElement.textContent =
        state.timer + "s";

    const percentage =
        Math.max(
            0,
            state.timer /
            state.timerMax
        );

    timerProgress.style.transform =
        `scaleX(${percentage})`;

    if (state.timer <= 10) {
        timerProgress.style.background =
            "#dc2626";
    } else {
        timerProgress.style.background =
            "";
    }
}


function clearTimer() {

    if (state.timerInterval) {

        clearInterval(
            state.timerInterval
        );

        state.timerInterval = null;
    }
}


function customerLeft() {

    if (state.busy) return;

    state.busy = true;

    state.rating = Math.max(
        0,
        state.rating - 7
    );

    updateStats();
    saveState();

    showNotification(
        "Cliente andato via",
        "Il cliente ha aspettato troppo."
    );

    customerMessage.textContent =
        "Il cliente è andato via.";

    registerStatus.textContent =
        "Cliente perso";

    nextCustomer.classList.remove(
        "hidden"
    );

    paymentArea.classList.add("hidden");

    playBeep("error");
}


/* -----------------------------
   PAYMENT
----------------------------- */

paymentAction.addEventListener(
    "click",
    () => {

        if (state.busy) return;

        if (state.paymentType === "cash") {
            receiveCash();
        } else {
            startPOS();
        }

    }
);


/* -----------------------------
   CASH PAYMENT
----------------------------- */

function receiveCash() {

    /*
       Il cliente deve scegliere quanto
       dare. Il gioco genera una somma
       realistica superiore al totale.
    */

    const possiblePayments = [
        5,
        10,
        20,
        50,
        100
    ];

    let payment =
        random(
            possiblePayments.filter(
                value =>
                    value >= state.total
            )
        );

    if (!payment) {
        payment = 100;
    }

    state.cashReceived = payment;

    state.changeRequired =
        roundMoney(
            payment - state.total
        );

    paymentInfo.innerHTML = `
        <strong>💶 Il cliente ti dà ${money(payment)}</strong>
        <br>
        <span>
            Devi restituire il resto corretto.
        </span>
    `;

    paymentAction.classList.add("hidden");

    registerStatus.textContent =
        "Prepara il resto";

    changeRequired.textContent =
        money(state.changeRequired);

    changeGiven.textContent =
        money(0);

    changeMessage.textContent =
        "Componi il resto usando il cassetto.";

    confirmChange.disabled = true;

    showNotification(
        "Pagamento ricevuto",
        `Il cliente ti ha dato ${money(payment)}.`
    );

    playBeep("success");
}


/* -----------------------------
   POS
----------------------------- */

function startPOS() {

    state.busy = true;

    clearTimer();

    posOverlay.classList.remove(
        "hidden"
    );

    $("posAmount").textContent =
        money(state.total);

    $("posStatus").textContent =
        "Avvicina la carta...";

    registerStatus.textContent =
        "Pagamento POS";

    playBeep();

    setTimeout(() => {

        $("posStatus").textContent =
            "Pagamento autorizzato ✓";

        playBeep("success");

    }, 1700);

    setTimeout(() => {

        posOverlay.classList.add(
            "hidden"
        );

        finishPayment(
            "💳 Carta / POS"
        );

    }, 2700);
}


/* -----------------------------
   CASH DRAWER
----------------------------- */

document
    .querySelectorAll(".cash-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            () => {

                if (
                    state.paymentType !== "cash" ||
                    state.cashReceived <= 0 ||
                    state.busy
                ) {
                    return;
                }

                const value =
                    Number(
                        item.dataset.value
                    );

                addCash(value);
            }
        );
    });


function addCash(value) {

    if (
        state.selectedAmount +
        value >
        state.changeRequired + .001
    ) {

        showNotification(
            "Troppo resto",
            "Non puoi superare il resto richiesto."
        );

        playBeep("error");

        return;
    }

    state.selectedCash.push(value);

    state.selectedAmount =
        roundMoney(
            state.selectedAmount +
            value
        );

    renderSelectedCash();

    playBeep();

    if (
        Math.abs(
            state.selectedAmount -
            state.changeRequired
        ) < .001
    ) {

        confirmChange.disabled = false;

        changeMessage.textContent =
            "✓ Resto corretto. Puoi consegnarlo!";

        registerStatus.textContent =
            "Resto pronto";

        playBeep("success");
    }
}


function renderSelectedCash() {

    changeGiven.textContent =
        money(state.selectedAmount);

    selectedItems.innerHTML = "";

    if (
        state.selectedCash.length === 0
    ) {

        selectedItems.innerHTML = `
            <span class="no-selected">
                Tocca banconote o monete
            </span>
        `;

        return;
    }

    state.selectedCash.forEach(
        (value, index) => {

            const element =
                document.createElement("div");

            element.className =
                "selected-item";

            element.textContent =
                money(value);

            /*
               Toccando un elemento del resto
               lo rimuoviamo.
            */

            element.addEventListener(
                "click",
                () => {

                    state.selectedCash.splice(
                        index,
                        1
                    );

                    state.selectedAmount =
                        roundMoney(
                            state.selectedAmount -
                            value
                        );

                    renderSelectedCash();

                    confirmChange.disabled =
                        Math.abs(
                            state.selectedAmount -
                            state.changeRequired
                        ) >= .001;

                    if (
                        confirmChange.disabled
                    ) {
                        changeMessage.textContent =
                            "Continua a comporre il resto.";
                    }
                }
            );

            selectedItems.appendChild(
                element
            );
        }
    );
}


/* -----------------------------
   CLEAR CHANGE
----------------------------- */

clearChange.addEventListener(
    "click",
    () => {

        if (state.busy) return;

        state.selectedCash = [];
        state.selectedAmount = 0;

        renderSelectedCash();

        confirmChange.disabled = true;

        changeMessage.textContent =
            "Continua a comporre il resto.";

        playBeep();
    }
);


/* -----------------------------
   CONFIRM CHANGE
----------------------------- */

confirmChange.addEventListener(
    "click",
    () => {

        if (
            state.busy ||
            state.changeRequired <= 0
        ) {
            return;
        }

        const difference =
            Math.abs(
                state.selectedAmount -
                state.changeRequired
            );

        if (difference > .001) {

            showNotification(
                "Resto sbagliato",
                "Controlla le monete e le banconote."
            );

            state.rating =
                Math.max(
                    0,
                    state.rating - 5
                );

            updateStats();
            saveState();

            playBeep("error");

            return;
        }

        state.busy = true;

        clearTimer();

        finishPayment(
            `💶 Contanti: ${money(state.cashReceived)}`
        );
    }
);


/* -----------------------------
   FINISH PAYMENT
----------------------------- */

function finishPayment(paymentText) {

    clearTimer();

    state.money =
        roundMoney(
            state.money +
            state.total
        );

    state.customers++;

    state.rating =
        Math.min(
            100,
            state.rating + 1
        );

    updateStats();
    saveState();

    registerStatus.textContent =
        "Pagamento completato ✓";

    changeMessage.textContent =
        "Pagamento completato.";

    showReceipt(paymentText);

    playBeep("success");
}


/* -----------------------------
   RECEIPT
----------------------------- */

function showReceipt(paymentText) {

    receiptProducts.innerHTML = "";

    state.currentProducts.forEach(
        product => {

            const row =
                document.createElement("div");

            row.className =
                "receipt-product";

            row.innerHTML = `
                <span>
                    ${product.quantity}x ${product.name}
                </span>

                <span>
                    ${money(
                        product.price *
                        product.quantity
                    )}
                </span>
            `;

            receiptProducts.appendChild(row);
        }
    );

    receiptTotal.textContent =
        money(state.total);

    receiptPayment.innerHTML =
        paymentText;

    receiptOverlay.classList.remove(
        "hidden"
    );
}


/* -----------------------------
   CLOSE RECEIPT
----------------------------- */

$("closeReceipt").addEventListener(
    "click",
    () => {

        receiptOverlay.classList.add(
            "hidden"
        );

        nextCustomer.classList.remove(
            "hidden"
        );

        paymentArea.classList.add(
            "hidden"
        );

        registerStatus.textContent =
            "Pronto";

        showNotification(
            "Cassa pronta",
            "Puoi servire il prossimo cliente."
        );
    }
);


/* -----------------------------
   NEXT CUSTOMER
----------------------------- */

nextCustomer.addEventListener(
    "click",
    () => {

        nextCustomer.classList.add(
            "hidden"
        );

        createCustomer();
    }
);


/* -----------------------------
   SETTINGS
----------------------------- */

$("settingsBtn").addEventListener(
    "click",
    () => {

        settingsOverlay.classList.remove(
            "hidden"
        );
    }
);


$("closeSettings").addEventListener(
    "click",
    () => {

        settingsOverlay.classList.add(
            "hidden"
        );
    }
);


/* -----------------------------
   DARK MODE
----------------------------- */

themeBtn.addEventListener(
    "click",
    () => {

        state.dark = !state.dark;

        applyTheme();
    }
);


darkToggle.addEventListener(
    "click",
    () => {

        state.dark = !state.dark;

        applyTheme();
    }
);


/* -----------------------------
   ANIMATIONS
----------------------------- */

animationToggle.addEventListener(
    "click",
    () => {

        state.animations =
            !state.animations;

        applyTheme();
    }
);


/* -----------------------------
   SOUND
----------------------------- */

soundBtn.addEventListener(
    "click",
    () => {

        state.sound =
            !state.sound;

        applyTheme();
    }
);


soundToggle.addEventListener(
    "click",
    () => {

        state.sound =
            !state.sound;

        applyTheme();
    }
);


/* -----------------------------
   RESET
----------------------------- */

$("resetGame").addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Vuoi davvero cancellare tutti i progressi?"
            );

        if (!confirmed) return;

        state.money = 0;
        state.rating = 100;
        state.customers = 0;

        state.currentCustomer = null;
        state.currentProducts = [];

        state.total = 0;

        saveState();
        updateStats();

        settingsOverlay.classList.add(
            "hidden"
        );

        createCustomer();
    }
);


/* -----------------------------
   PREVENT DOUBLE TAP ZOOM
----------------------------- */

let lastTouchEnd = 0;

document.addEventListener(
    "touchend",
    event => {

        const now =
            Date.now();

        if (
            now - lastTouchEnd <= 300
        ) {
            event.preventDefault();
        }

        lastTouchEnd = now;
    },
    false
);


/* -----------------------------
   INITIALIZATION
----------------------------- */

function resetChangeUI() {

    state.selectedCash = [];
    state.selectedAmount = 0;

    changeRequired.textContent =
        "€0,00";

    changeGiven.textContent =
        "€0,00";

    selectedItems.innerHTML = `
        <span class="no-selected">
            Tocca banconote o monete
        </span>
    `;

    confirmChange.disabled = true;

    paymentAction.classList.remove(
        "hidden"
    );
}


function initialize() {

    applyTheme();

    updateStats();

    /*
       Piccolo ritardo per far percepire
       l'arrivo del cliente.
    */

    setTimeout(() => {

        createCustomer();

    }, 700);
}


initialize();