# Team Manager

App mobile-first per la gestione della squadra di calcio.

> ## Regola obbligatoria per ogni modifica
>
> Prima di sviluppare o applicare qualsiasi commit leggere [PROJECT_VADEMECUM.md](./PROJECT_VADEMECUM.md).

## Stack

- React 18 + Vite
- React Router
- Supabase Auth + PostgreSQL + Storage + Edge Functions
- GitHub Pages
- Capacitor previsto come fase successiva per packaging iOS/Android

## Moduli

- Home pubblica
- Calendario
- Live / gestione partita
- Rosa
- Statistiche
- Profilo
- Amministrazione

Backend: progetto Supabase `team-manager`.

## UI

Il frontend usa un unico design system responsive nero/charcoal, bianco e giallo con glassmorphism. Desktop usa top navigation; mobile usa bottom navigation. I mockup approvati del 29/09/2026 sono il riferimento visuale ufficiale insieme al vademecum.

## Sviluppo

`npm install`
`npm run dev`
`npm run build`

La pubblicazione su GitHub Pages avviene tramite `.github/workflows/deploy-pages.yml`.
