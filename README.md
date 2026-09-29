# Team Manager

Webapp **one-team based** per livescore e trasformazione degli eventi di gara in statistiche.

## Principi architetturali

- L'app gestisce in dettaglio una sola squadra principale.
- Le squadre avversarie sono entità di supporto: servono per competizioni, calendario, risultati e classifiche, ma non hanno una propria area di consultazione dettagliata.
- Il contenitore principale dei dati è la **stagione**.
- Gerarchia logica: `Stagione → Competizioni → Calendario/Partite → Eventi → Statistiche`.
- I dati statistici derivabili devono essere calcolati dai fatti/eventi quando possibile, evitando duplicazioni persistenti.
- Supabase esistente viene mantenuto come scheletro dati.
- Lo sviluppo procede una sezione alla volta; questo README viene aggiornato insieme al codice.

## Roadmap funzionale

1. Configurazione / Stagioni — in sviluppo
2. Competizioni
3. Calendario
4. Giocatori
5. Rosa
6. Partite
7. Livescore
8. Eventi
9. Statistiche
10. Classifica
11. Home / dashboard finale

## Modulo 1 — Configurazione / Stagioni

### Obiettivo

La stagione rappresenta l'annata sportiva e determina il contesto di tutti i moduli successivi.

### Tabella utilizzata

`public.app_seasons`

Campi attualmente utilizzati dal frontend:

- `id`: UUID stagione
- `team_id`: squadra principale
- `name`: nome leggibile, es. `2026/27`
- `start_date`
- `end_date`
- `status`: `future | active | archived`
- `created_at`

Stagione esistente rilevata al 29/09/2026: **2026/27**, stato **active**.

### Funzioni implementate

- lettura delle stagioni da Supabase;
- visualizzazione annate;
- evidenza della stagione attiva;
- creazione di una nuova stagione;
- modifica di nome, date e stato;
- controllo date inizio/fine;
- una sola stagione attiva: quando una nuova stagione viene impostata come attiva, la precedente viene archiviata;
- layout responsive desktop/mobile.

### Decisioni

La rosa sarà stagionale. Le competizioni saranno figlie della stagione. Le avversarie saranno anagrafiche globali richiamabili dalle singole competizioni.

## Supabase

Progetto utilizzato: `team-manager` (`qxblxomcpepwavgvhtuk`).

Il frontend usa esclusivamente la publishable key pubblica. Nessuna service-role key deve essere inserita nel repository.

## Frontend

Prima base volutamente minimale, senza framework:

- `index.html`
- `styles.css`
- `app.js`

L'interfaccia verrà estesa progressivamente senza implementare in anticipo moduli non ancora definiti.
