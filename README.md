# Team Manager

Webapp **one-team based** per gestione squadra, calendario, formazione, eventi e statistiche.

## Architettura
- Squadra principale gestita in dettaglio.
- Gerarchia: `Stagione → Competizioni → Calendario/Partite → Eventi → Statistiche`.
- Fixture ufficiali = fonte di verità per calendario/risultati.
- `app_matches` = partita operativa del Caselle.
- Nessuna statistica inventata: si mostrano solo metriche presenti o derivabili dai dati reali.

## UI

L'intero progetto usa ora lo stesso linguaggio della Home editoriale:

- base chiara grigio-perla;
- superfici bianche / grigio chiarissimo con effetto vetro;
- rail laterale compatta con controlli iconici;
- bottoni e filtri piccoli e netti;
- tabelle, form, calendari, card, dialog, rosa, partite, eventi e statistiche con lo stesso sistema visivo;
- accenti neri, verde lime e blu solo dove servono;
- ombre morbide e poco invadenti;
- densità elevata e gerarchie tipografiche semplici.

La logica applicativa non cambia.

## Moduli
### Home
La dashboard segue la nuova composizione editoriale:
- grande Team KPIs a sinistra su due righe;
- ultima partita e forma recente integrate nella card squadra;
- Player Stats del giocatore associato all'utente autenticato tramite `app_user_roles.player_id`;
- Schedule mensile con matchday e prossima partita;
- classifica compatta centrata sul Caselle, con G/V/N/P, GF/GS, differenza reti e punti;
- Scores limitato esclusivamente alle partite della squadra principale, con contenuto match centrato e stato separato.

Se l'utente autenticato non è associato a un giocatore, la card Player Stats mostra un fallback neutro senza inventare dati.

### Competizioni
La vista competizione mostra classifica reale e calendario completo. La classifica include gli stemmi; nel calendario ogni risultato segue la composizione nome–stemma–punteggio–stemma–nome, con selettore competizione e toggle Tutte/Caselle allineati sopra le due card, punteggio senza contorno e griglia fixtures adattiva fino a 16 giornate prima di introdurre lo scroll. Sotto la classifica reale è presente una **Proiezione classifica** client-side:
- forza squadra = 30% rendimento stagione, 25% forma recente, 20% differenza reti, 10% attacco, 10% difesa, 5% rendimento casa/trasferta;
- forma recente ponderata con peso maggiore alle partite più vicine;
- calendario restante simulato 4.000 volte con RNG deterministico, quindi il risultato non cambia a ogni refresh;
- output: posizione prevista, variazione rispetto all'attuale, punti finali attesi e range 20°–80° percentile della posizione;
- indicatore di affidabilità euristico crescente con la quantità di stagione già disputata.

È una proiezione statistica descrittiva, non una previsione certa. Non viene salvata a DB: è derivata dai dati correnti.


Classifica a sinistra e calendario compatto completo a destra. Toggle Tutte/Caselle e click sul punteggio.

### Calendario
Solo partite del Caselle in ordine cronologico, filtri per competizione, dettaglio e modifica.

### Rosa
Dati da `app_roster`, `players`, `app_player_season_stats`. Filtri ruolo, ricerca, dettaglio e nuovo giocatore.

### Partite
Dati da `app_matches` e `app_match_players`. Selettore partita, Titolare/Panchina/Fuori, campo grafico, panchina e modulo.

### Eventi
Timeline e inserimento eventi su `app_match_events`: gol, sostituzioni, gialli, rossi.

### Statistiche
KPI squadra derivati dai fixture, tabella giocatori e marcatori da `app_player_season_stats`. Le statistiche illustrative non presenti nel DB vengono ignorate.

### Setup
Squadra, Stagioni, Competizioni, Avversarie, Calendari/import.

## Branding
- Squadra: `teams`, bucket `team-assets`.
- Avversarie: `app_opponents` con logo e 3 colori, bucket `opponent-assets`.

## Autenticazione
Modello invariato: `profiles.username → auth_aliases → auth-login → sessione Supabase`.
Le scritture rispettano RLS e permessi esistenti.

## Coerenza
- I fixture possono usare il nome storico `Calcio Caselle`; l'anagrafica è `Calcio Caselle '08`. Il frontend normalizza.
- `app_matches` si collega al fixture solo quando competizione, kickoff e avversaria coincidono.
- Le modifiche della partita dal Calendario sincronizzano fixture e `app_matches` quando collegati.

## Stato
1. Dashboard — operativo
2. Competizioni — operativo
3. Calendario — operativo
4. Rosa — operativo
5. Partite/formazione — operativo base
6. Eventi — operativo base
7. Statistiche — operative sui dati disponibili
8. Setup — operativo; import CSV/PDF da rifinire
9. Livescore avanzato — da completare
10. Rating/discipline avanzate — da completare
