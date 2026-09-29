# Team Manager

Webapp **one-team based** per livescore e trasformazione degli eventi di gara in statistiche.

## Principi architetturali

- Una sola squadra principale è gestita in dettaglio.
- Le avversarie sono anagrafiche globali riutilizzabili tra stagioni e competizioni.
- La stagione è il contenitore principale: `Stagione → Competizioni → Calendario/Partite → Eventi → Statistiche`.
- La stagione mostrata di default è quella in cui ricade la data corrente; le altre restano consultabili dal selettore.
- Le statistiche derivabili non vanno duplicate nel database.

## Regole UI / UX

- Navigazione principale orizzontale in alto.
- Setup raccolto in un'area dedicata con sotto-sezioni compatte.
- Header, titoli e descrizioni ridondanti vanno evitati.
- Privilegiare dati e azioni rispetto a elementi introduttivi.

## Setup

Sezioni previste: **Squadra · Stagioni · Competizioni · Avversarie · Calendari**.

### Squadra

Dati globali e modificabili:
- nome;
- sigla di 3 lettere;
- logo;
- 3 colori sociali.

Il caricamento del logo usa il bucket Supabase `team-assets`. I tre colori vengono proposti automaticamente dall'immagine tramite campionamento client-side, ma restano sempre modificabili.

### Stagioni

Tabella: `public.app_seasons`.

Campi usati:
- `id`, `team_id`, `name`;
- `start_date`, `end_date`;
- `status`.

Il wizard di creazione segue:
`Annata → Competizioni → Avversarie → Calendario/import → Riepilogo`.

### Competizioni

Tabella: `public.app_competitions`.

Tipi supportati:
- `league` = Campionato;
- `cup` = Coppa;
- `friendly` = Amichevoli.

Configurazione salvata:
- formula;
- numero tempi e minuti per tempo;
- punti vittoria/pareggio/sconfitta;
- eventuali playoff/playout;
- gara secca o A/R;
- supplementari;
- rigori;
- regole progressive di diffida.

Formule iniziali:
- Campionato: girone unico A/R, solo andata, girone + playoff/playout;
- Coppa: girone + eliminazione, eliminazione diretta, solo girone;
- Amichevoli: partite singole, con possibilità futura di override regole sulla singola partita.

### Avversarie

Tabella globale: `public.app_opponents`.

La relazione N:N tra competizione e avversarie è salvata in:
`public.app_competition_opponents`.

La stessa avversaria può quindi partecipare a più competizioni e più stagioni senza duplicazioni.

### Calendari

Tabella esistente: `public.app_competition_fixtures`.

Il Setup prevede:
- inserimento/modifica manuale;
- import CSV;
- import PDF con fase di interpretazione e conferma prima del salvataggio.

## Supabase

Progetto: `team-manager` (`qxblxomcpepwavgvhtuk`).

Il frontend usa solo la publishable key. Le scritture di Setup restano protette dalle policy staff già esistenti; non vengono aperte scritture anonime.

### Estensioni schema introdotte

`app_competitions` è stato esteso con configurazione di formula, durata gara, punteggi, playoff/playout, A/R, supplementari, rigori e regole disciplina.

Creata `app_competition_opponents` con RLS:
- lettura pubblica coerente con le anagrafiche già esposte;
- scrittura solo utenti autenticati che soddisfano `private.is_staff()`.

### Autenticazione

L'header integra login/logout usando il modello utenti già esistente: `profiles.username` + `auth_aliases` + Edge Function `auth-login`. L'utente inserisce username e password; la funzione risolve l'alias interno e restituisce la sessione Supabase. Dopo il login viene letto `app_user_roles` per mostrare lo stato `Admin` quando applicabile.

### Persistenza Setup

Le modifiche di Squadra, Avversarie e Competizioni verificano ora esplicitamente che Supabase restituisca la riga modificata. Un'operazione bloccata da RLS/sessione non viene più mostrata come salvata. L'header mostra inoltre lo stato della sessione (`Admin / Autenticato / Non autenticato`).

Le competizioni sono modificabili integralmente dal Setup, incluse formula, durata, punteggio, playoff/playout, A/R, supplementari, rigori, diffide e avversarie associate.

## Roadmap

1. Setup e creazione guidata — in sviluppo
2. Competizioni operative
3. Calendario
4. Giocatori
5. Rosa
6. Partite
7. Livescore
8. Eventi
9. Statistiche
10. Classifica
11. Home / dashboard finale
