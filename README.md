# Team Manager

App mobile-first per la gestione della squadra.

> ## Regola obbligatoria per ogni modifica
>
> **Prima di sviluppare o applicare qualsiasi commit leggere [PROJECT_VADEMECUM.md](./PROJECT_VADEMECUM.md).**
>
> Il vademecum è la baseline architetturale, funzionale e UI del progetto. Ogni commit deve mantenerne l'integrità. Se una nuova richiesta modifica una regola esistente, il vademecum deve essere aggiornato contestualmente: non sono ammesse eccezioni implicite, patch CSS locali o deviazioni non documentate.

## Stack

- HTML/CSS/JavaScript
- Supabase Auth + PostgreSQL + Realtime
- GitHub Pages

## Moduli

- Home
- Calendario
- Live / gestione partita
- Rosa
- Statistiche
- Profilo
- Amministrazione

Backend: progetto Supabase `team-manager`.

## Sviluppo

La struttura dati e la logica applicativa sono separate dal presentation layer. La UI utilizza un unico design system condiviso tra tutte le schermate.

La checklist obbligatoria pre-commit, le regole della gestione partita/formazione, le convenzioni UI e i criteri di integrità sono definiti in **[PROJECT_VADEMECUM.md](./PROJECT_VADEMECUM.md)**.
