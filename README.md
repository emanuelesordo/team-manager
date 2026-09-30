# Team Manager

Webapp **one-team based** per gestione squadra, calendario, formazione, eventi e statistiche.

## Architettura
- Squadra principale gestita in dettaglio.
- Gerarchia: `Stagione → Competizioni → Calendario/Partite → Eventi → Statistiche`.
- Fixture ufficiali = fonte di verità per calendario/risultati.
- `app_matches` = partita operativa del Caselle.
- Nessuna statistica inventata: si mostrano solo metriche presenti o derivabili dai dati reali.

## UI

L'interfaccia è stata ricostruita da zero con un sistema **minimal flat glass**.

Principi:
- pannelli come lastre di vetro piane, non card gonfie;
- angoli da 2–4 px;
- nessuna pill decorativa;
- profondità ottenuta con trasparenza, blur, bordi e stratificazione, non con curvature;
- navigazione attiva evidenziata da una barra lineare e da un riempimento leggero;
- tab e filtri come linguette piatte;
- CTA rettangolari compatte;
- stemmi senza contenitori tondeggianti;
- avatar circolari solo dove semanticamente corretto;
- gerarchie dense, tecniche e moderne.

La logica applicativa e il modello dati restano invariati.

## Moduli
### Home
Occupa il viewport desktop disponibile:
- ultima partita a sinistra e prossima partita a destra;
- countdown live al fischio d'inizio al posto del bottone dettagli;
- 6 KPI principali;
- ultime 4 partite;
- prossime 4 partite;
- classifica di 5 squadre centrata sulla squadra principale: 2 sopra e 2 sotto quando disponibili, recuperando righe dal lato opposto ai bordi della classifica.

### Competizioni
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
