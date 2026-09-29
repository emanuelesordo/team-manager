# Team Manager

Webapp **one-team based** per gestione sportiva, calendario, formazione, eventi partita e statistiche derivate.

## Design system

Il riferimento visuale corrente è il mockup “Gestione Squadra” fornito nel progetto. La UI applica in modo coerente:
- palette chiara azzurro/bianco;
- card leggere e rounded;
- navigazione compatta;
- controlli coerenti tra i moduli;
- alta densità informativa su desktop e adattamento responsive.

La navigazione principale è:
**Home · Competizioni · Calendario · Rosa · Partite · Eventi · Statistiche · Amministrazione**.

## Architettura

L'app resta basata su una sola squadra principale. La gerarchia logica è:

`Stagione → Competizioni → Fixture/Partite → Convocazioni/Eventi → Statistiche`

Fonti dati principali:
- `teams`: squadra principale e branding;
- `app_seasons`: stagioni;
- `app_competitions`: competizioni e regole;
- `app_opponents`: avversarie, logo e palette;
- `app_competition_opponents`: relazione competizioni/avversarie;
- `app_competition_fixtures`: calendario ufficiale completo;
- `app_competition_standings`: classifica derivata;
- `app_matches`: partite operative del Caselle;
- `players`: anagrafica giocatori;
- `app_match_players`: convocazioni, titolarità e minuti;
- `app_match_events`: gol, cartellini, sostituzioni e altri eventi;
- `app_match_ratings`: valutazioni;
- `app_match_tactical_changes`: cambi tattici.

Le statistiche derivabili non vengono duplicate nel database.

## Moduli

### Home

Dashboard sintetica con:
- prossima partita;
- ultima partita;
- partite giocate;
- vittorie, pareggi e sconfitte;
- gol fatti e subiti;
- prossime partite;
- prime posizioni della classifica.

Tutti i valori sono calcolati dai dati reali della stagione.

### Competizioni

Sezione di consultazione:
- selettore competizione;
- classifica in card fissa a sinistra;
- calendario completo compatto a destra;
- giornate mostrate contemporaneamente quando lo spazio desktop lo consente;
- sigla/logo delle squadre;
- toggle `Tutte / Caselle`;
- click sul punteggio per modifica fixture.

### Calendario

Mostra esclusivamente le partite del Caselle, in ordine cronologico, attraversando tutte le competizioni selezionate.

`app_competition_fixtures` resta la fonte di verità per calendario e risultati ufficiali.
`app_matches` è l'entità operativa della squadra e viene collegata solo quando competizione, kickoff e avversaria coincidono in modo univoco.

### Rosa

Vista ispirata al mockup:
- tabella giocatori;
- ricerca;
- ruolo;
- età;
- presenze;
- gol;
- dettaglio laterale;
- informazioni anagrafiche disponibili;
- cartellini derivati dagli eventi.

### Partite

Workspace operativo per la singola gara:
- elenco partite;
- convocati;
- titolari/panchina;
- modulo;
- eventi già registrati;
- salvataggio su `app_match_players` e `app_matches.formation`.

La formazione grafica su campo resta un raffinamento successivo; la prima versione operativa usa la struttura dati reale già esistente.

### Eventi

Cronologia degli eventi della stagione con filtro per partita.

Inserimento autenticato di:
- gol;
- sostituzioni;
- cartellini gialli;
- cartellini rossi;
- autogol.

I nuovi eventi vengono salvati in `app_match_events`.

### Statistiche

Sono mostrate **solo statistiche realmente derivabili dai dati presenti**:
- partite;
- W/D/L;
- gol fatti/subiti;
- marcatori;
- disciplina;
- risultati partita per partita.

Le statistiche puramente illustrative del mockup, come possesso palla, tiri, passaggi riusciti o altri valori non presenti nel DB, vengono ignorate e non inventate.

### Amministrazione

Mantiene il Setup:
**Stagioni · Squadra · Competizioni · Avversarie · Calendari**.

Squadra e avversarie supportano logo e palette. Gli asset della squadra usano `team-assets`; quelli delle avversarie `opponent-assets`.

## Autenticazione

Il modello utenti esistente non viene modificato:

`profiles.username → auth_aliases → Edge Function auth-login → sessione Supabase`

L'accesso usa username e password. Le scritture restano protette dalle policy RLS esistenti.

## Coerenza fixture / partite

`app_competition_fixtures` contiene il calendario ufficiale completo.
`app_matches` contiene le partite operative del Caselle.

Il frontend evita collegamenti permanenti basati solo sul nome: usa l'associazione quando competizione, kickoff e avversaria permettono un match univoco.

## Frontend

File principali:
- `index.html`: struttura e bootstrap;
- `main.js`: core, autenticazione, Supabase wrapper, Setup, Competizioni e Calendario;
- `styles.css`: stile base;
- `product-ui.js`: Home, Rosa, Partite, Eventi, Statistiche e routing unificato;
- `product-ui.css`: design system ispirato al mockup.

Il bootstrap carica `main.js` e solo dopo `product-ui.js`, entrambi con `cache: "no-store"`.

## Roadmap

1. Amministrazione / Setup — operativo
2. Competizioni — operativo
3. Calendario — operativo
4. Home — prima versione operativa
5. Rosa — prima versione operativa
6. Partite / formazione — prima versione operativa
7. Eventi — prima versione operativa
8. Statistiche derivate — prima versione operativa
9. Formazione grafica su campo — da rifinire
10. Cambi tattici avanzati — da rifinire
11. Livescore avanzato — da rifinire
12. Import CSV/PDF calendario — da riprendere
