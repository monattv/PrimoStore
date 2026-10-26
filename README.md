# PrimoStore — sito demo sneakers

Un progetto front-end responsive per un negozio di sneakers, realizzato con HTML, CSS e JavaScript vanilla.

## File
- `index.html` — struttura delle pagine, finestre di accesso/benvenuto e carrello.
- `styles.css` — stile responsive, layout, animazioni e bagliore del nome.
- `app.js` — catalogo demo, ricerca, filtri, carrello, quantità, login locale e newsletter demo.

## Avvio
Apri `index.html` in un browser. Per un'esperienza più affidabile puoi avviare un server locale dalla cartella del progetto, ad esempio con l'estensione **Live Server** di Visual Studio Code.

## Funzioni incluse
- Schermata iniziale per inserire il nome.
- Schermata “Ciao, Nome” con effetto glow e pulsante per entrare nel sito.
- Nome e carrello conservati nel browser con `localStorage`.
- Catalogo con ricerca e filtri per categoria.
- Aggiunta/rimozione articoli e modifica quantità.
- Totale carrello aggiornato automaticamente.
- Layout adattabile a smartphone e desktop.
- Newsletter dimostrativa.

## Prima di pubblicarlo davvero
Questa è una demo front-end, non ancora un e-commerce pronto a ricevere ordini o pagamenti. Il login è solo locale e non verifica l'identità dell'utente; il checkout non incassa pagamenti e il form newsletter non invia dati. Per la produzione servono almeno un backend, autenticazione sicura, database, gestione inventario/ordini, pagamenti tramite provider certificato, policy privacy/cookie e condizioni di vendita. Sostituisci anche prodotti, prezzi, immagini e contatti dimostrativi con informazioni autorizzate e reali.

Le immagini sono caricate da Unsplash tramite URL remoti, quindi richiedono una connessione Internet. Cambia i prodotti modificando l'array `products` in `app.js`.
