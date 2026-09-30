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
La vista competizione mostra classifica reale e calendario completo. La classifica include gli stemmi; nel calendario ogni risultato segue la composizione nome–stemma–punteggio–stemma–nome, con toggle delle competizioni della stagione e toggle Tutte/Caselle allineati sulla stessa riga sopra le due card, punteggio senza contorno e griglia fixtures adattiva fino a 16 giornate prima di introdurre lo scroll. Sotto la classifica reale è presente una **Proiezione classifica** client-side:
- forza squadra = 30% rendimento stagione, 25% forma recente, 20% differenza reti, 10% attacco, 10% difesa, 5% rendimento casa/trasferta;
- forma recente ponderata con peso maggiore alle partite più vicine;
- calendario restante simulato 4.000 volte con RNG deterministico, quindi il risultato non cambia a ogni refresh;
- output: posizione prevista, variazione rispetto all'attuale, punti finali attesi e range 20°–80° percentile della posizione;
- indicatore di affidabilità euristico crescente con la quantità di stagione già disputata.

È una proiezione statistica descrittiva, non una previsione certa. Non viene salvata a DB: è derivata dai dati correnti.


Classifica a sinistra e calendario compatto completo a destra. Toggle Tutte/Caselle e click sul punteggio.

### Calendario
La lista partite della squadra principale usa nomi completi per entrambe le squadre e il formato centrale **Squadra casa | logo | risultato | logo | squadra ospite**, con venue/indirizzo a destra; data e competizione restano metadati secondari.


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


### Match Center
Il dettaglio di una partita del Caselle si apre dalle Fixtures della competizione o dal Calendario/programma partite. Le vecchie voci dirette Partite ed Eventi non sono più punti di ingresso.

Il prototipo usa un unico dettaglio per pre, live e post:
- header comune con squadre, stemmi, risultato e metadati;
- in live compare il timer;
- tab Generale: formazione, panchina, riepilogo eventi e controlli di congruità;
- tab Disponibilità: infortuni, squalifiche e indisponibilità specifiche della gara;
- tab Formazione: rosa da assegnare, XI, panchina e non convocati;
- tab Eventi: timeline e console di inserimento.

Regole già implementate:
- la squalifica blocca XI/Panchina; l'infortunio viene segnalato ma non blocca;
- titolari eleggibili dal minuto 1 fino a uscita o rosso;
- panchinari eleggibili dal minuto d'ingresso fino a uscita/rosso;
- con minuto valorizzato, gol/assist/uscente propongono solo giocatori attivi;
- cartellini possono essere assegnati anche alla panchina;
- con minuto vuoto la selezione resta libera;
- nel cambio l'uscente è obbligatorio, l'entrante facoltativo: è ammessa l'uscita senza ingresso;
- espulsione avversaria supportata senza anagrafica avversaria;
- in post i gol inseriti non possono superare il risultato ufficiale della fixture.


### Divisa Match Center
La squadra principale dispone di una configurazione divisa persistita su `teams`:
- `kit_style`: tinta unita, bande verticali/orizzontali, metà/metà o diagonale;
- `kit_primary_color`;
- `kit_secondary_color`;
- `kit_number_color`.

Il Setup Squadra consente di modificare e vedere in anteprima la divisa. Nel Match Center i giocatori sono rappresentati da maglia e numero, con rating medio da `app_match_ratings` e indicatori per gol, assist, entrata/uscita e cartellini. La vista Generale usa la composizione effettivamente in campo dopo aver applicato sostituzioni ed espulsioni.

Lo storico eventi usa un layout match-report: eventi casa/ospite sui due lati, minuto centrale, parziale sui gol e separatori di fine partita/recupero.


#### Refactor UI Match Center
Il Match Center usa un unico blocco CSS dedicato, senza override progressivi. La Generale è organizzata in tre aree: storico eventi, campo e panchina/non convocati. Lo storico usa spaziatura e blocchi evento senza separatori orizzontali ripetuti; il campo isola completamente le regole delle maglie dalle vecchie regole globali `.pitch-player`.
