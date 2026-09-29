# Team Manager — Project Vademecum

> **Documento normativo del progetto**
>
> Questo file è la baseline architetturale, funzionale e UI di Team Manager.
> **Ogni nuova modifica o commit deve essere verificata contro questo documento prima di essere applicata.**
> Se una richiesta futura entra in conflitto con una regola qui definita, il conflitto deve essere reso esplicito e la regola va modificata consapevolmente, non aggirata con patch locali.

---

## 1. Principio fondamentale

Team Manager separa nettamente due livelli.

### Struttura funzionale
Comprende database, autenticazione, ruoli, stagioni, competizioni, partite, rosa, formazione, eventi, statistiche e relazioni tra i dati.

### Presentation layer
Comprende markup generato, componenti visuali, CSS, responsive e interazioni puramente grafiche.

**Un redesign non deve modificare la logica applicativa o la struttura dati, salvo richiesta esplicita.**

---

## 2. Regola fondamentale della UI

L'intera applicazione usa **un solo design system**.

Il design system definisce centralmente:

- palette e branding;
- tipografia;
- scale dimensionali;
- spacing;
- border-radius;
- bordi e ombre;
- glassmorphism;
- card e panel;
- row item;
- input, select e textarea;
- pulsanti e icon button;
- badge e status;
- tab e segmented control;
- toolbar;
- tabelle e liste;
- drawer;
- modal;
- popover/fumetto;
- tooltip;
- empty state;
- scrollbar;
- navigazione;
- breakpoint e responsive.

Le pagine non devono inventare una propria versione di questi componenti.

### Regole non negoziabili

1. Non correggere una schermata aggiungendo una nuova cascata di override CSS.
2. Evitare l'uso di `!important` come strategia di layout.
3. Se un componente condiviso è sbagliato, correggere il componente condiviso.
4. Le varianti devono essere esplicite e limitate: ad esempio `compact`, `primary`, `danger`, `icon-only`.
5. Desktop e mobile sono adattamenti responsive dello stesso sistema, non due UI indipendenti.
6. Dimensioni, font, spacing, radius e altezze devono derivare da token globali.
7. Una modifica UI non deve rompere funzioni, bind, eventi o backend esistenti.
8. Prima di aggiungere nuovo CSS verificare che la stessa regola/componente non esista già.
9. Una nuova schermata deve essere composta dai componenti esistenti prima di crearne di nuovi.
10. La coerenza globale ha priorità sulla correzione cosmetica locale.

---

## 2A. Riferimento visivo ufficiale

Il riferimento visivo ufficiale corrente è costituito dai mockup approvati il **29/09/2026** per Home, Calendario, Rosa, Gestione Partita e Statistiche.

### Gerarchia delle fonti

1. **Struttura funzionale, dati e flussi di questo vademecum**.
2. **Design system unico condiviso**.
3. **Mockup approvati 29/09/2026**, che definiscono disposizione, densità, navigazione e linguaggio visivo.

Quando un mockup mostra dati non disponibili nel database, la UI deve mantenere la struttura prevista senza inventare valori.

### Linguaggio visivo ufficiale

- tema prevalentemente **nero / charcoal**;
- testo bianco e accenti **giallo acceso**;
- glassmorphism marcato, con superfici traslucide e blur evidente;
- bordi sottili chiari e highlight riflettenti;
- glow giallo discreto;
- card arrotondate con profondità e leggere micro-interazioni 3D/scroll;
- nessuna fotografia decorativa come background o dentro le card;
- stemmi squadra/avversari ammessi;
- nessuna dashboard enterprise chiara/azzurra come riferimento;
- niente KPI decorativi nella Home pubblica.

### Navigazione

Desktop:
- top navigation orizzontale;
- identità squadra a sinistra;
- profilo/azioni a destra;
- nessuna sidebar fissa.

Mobile:
- header ridotto;
- bottom navigation;
- stessi componenti e stesso design system del desktop.

### Home

La Home è una vetrina pubblica della squadra e deve mostrare in priorità:
- ultimo risultato;
- prossima partita;
- ultimi risultati;
- classifica, solo se esiste una fonte dati reale;
- migliori marcatori;
- prossimi incontri.

Non usare KPI amministrativi come contenuto principale.

### Calendario

- calendario mensile in alto;
- i giorni con partita sono evidenziati con colore legato alla competizione;
- lo stemma avversario appare nel giorno della partita;
- i colori competizione sono una legenda, non filtri duplicati;
- sotto il calendario appare l'intero programma stagionale, non soltanto il mese visualizzato.

### Rosa

- elenco giocatori compatto e leggibile;
- riepilogo per ruoli;
- dati di presenze, gol e assist dove disponibili;
- formazione tipo/campo come visualizzazione secondaria;
- stessa UI su desktop/mobile con adattamento responsive.

### Gestione Partita

- nessuna gestione della rosa avversaria;
- avversario usato soltanto come contesto, punteggio ed eventi generici;
- formazione Team Manager + campo + panchina;
- eventi registrabili anche da mobile;
- stessa schermata utilizzabile live e a posteriori;
- nessuna raccolta di possesso, tiri, corner o altre statistiche match non previste.

### Statistiche

Devono essere presenti:
- classifica ratings;
- classifica presenze con **presenze e minuti nella stessa vista**;
- classifica gol con Gol, Gol/partita e Gol/90';
- classifica assist con Assist, Assist/partita e Assist/90';
- distribuzione gol fatti/subiti per fasce:
  - 0–15'
  - 16–30'
  - 31–45+'
  - 46–60'
  - 61–75'
  - 76–90+'

### Divieti

- niente sidebar desktop;
- niente tema chiaro/azzurro come default;
- niente immagini decorative di background;
- niente layout enterprise generico per le pagine pubbliche;
- niente KPI Home non richiesti;
- niente override CSS stratificati come strategia;
- niente `!important` come soluzione di layout;
- niente dati inventati per riempire componenti grafici.

## 3. Struttura dell'app

La navigazione funzionale è organizzata in:

- **Home** — dashboard sintetica della squadra.
- **Calendario** — calendario delle partite e loro creazione/modifica.
- **Live / Partita** — gestione operativa della partita e livescore.
- **Rosa** — giocatori e schede individuali.
- **Statistiche** — analisi individuali e di squadra.
- **Profilo** — account dell'utente autenticato.
- **Amministrazione** — configurazione del sistema.

### Amministrazione

L'area amministrativa è separata dall'attività sportiva quotidiana e contiene principalmente:

- competizioni;
- avversari;
- utenti e ruoli;
- impostazioni generali;
- branding/configurazioni globali.

La gestione della rosa appartiene a **Rosa**.

La creazione/modifica delle partite appartiene a **Calendario**.

Formazione ed eventi appartengono alla **singola partita**.

---

## 4. Ruoli applicativi

I ruoli previsti sono:

- fan;
- player;
- coach;
- manager;
- admin.

Le operazioni di modifica sportiva sono consentite secondo i permessi già definiti dall'applicazione.

Il redesign non deve modificare la matrice dei permessi.

---

# GESTIONE PARTITA

## 5. La partita è modificabile anche a posteriori

Una partita deve poter essere gestita:

- prima del calcio d'inizio;
- durante il live;
- dopo la conclusione.

Una partita conclusa **non è automaticamente read-only per manager/admin**.

Deve essere possibile ricostruire successivamente:

- formazione iniziale;
- modulo;
- numeri di maglia;
- capitano;
- panchina;
- non convocati;
- sostituzioni;
- motivazioni;
- gol;
- assist;
- cartellini;
- cambi modulo;
- altri eventi.

Le statistiche derivano dagli eventi e dai dati partita.

---

## 6. Struttura della gestione partita

La gestione partita contiene due sezioni principali:

1. **Formazione**
2. **Eventi**

Non esiste una tab separata **Campo**: il campo è parte integrante della Formazione.

La Formazione non deve contenere una card/lista permanente degli eventi.

Gli eventi completi appartengono alla tab **Eventi**.

---

# FORMAZIONE

## 7. Vincolo del viewport

Su desktop la workspace Formazione deve essere progettata per stare **interamente nell'area visibile disponibile**.

Non deve essere necessario scorrere l'intera pagina per gestire la formazione.

Se il numero di elementi lo richiede, sono ammessi scroll **interni e indipendenti alle liste**.

Il campo e le aree principali devono rimanere visibili.

La densità dei componenti deve essere progettata a monte per questo vincolo.

---

## 8. Layout della Formazione

La struttura desktop è:

**Rosa + Non convocati / Campo / Panchina**

### Sinistra — Rosa

La rosa parte dalla squadra disponibile.

L'elenco sinistro mantiene visibili i titolari e li ordina **per primi**.

Dopo gli 11 titolari vengono gli eventuali giocatori ancora da assegnare.

Sotto la Rosa vengono mostrati i **Non convocati**, con relativa motivazione.

Quando un giocatore viene assegnato alla panchina, viene mostrato nell'area destra.

### Centro — Campo

Il campo rappresenta graficamente gli 11 titolari secondo il modulo.

Non è una seconda lista testuale.

### Destra — Panchina

Contiene esclusivamente i panchinari.

I **Non convocati** appartengono alla colonna sinistra, sotto la Rosa.

Non deve esistere una quarta colonna.

---

## 9. Row giocatore

Rosa, panchina e non convocati devono usare la **stessa famiglia di row item**.

Le row devono essere:

- snelle;
- compatte;
- leggibili;
- coerenti tra loro;
- adatte a mostrare molti giocatori nello stesso viewport.

Una row deve privilegiare:

**numero maglia · ruolo · nome · stato/azioni**

Le utility sono icon button compatte, non pulsanti testuali ingombranti.

### Ruoli

Codifica sintetica:

- **P** — Portiere
- **D** — Difensore
- **C** — Centrocampista
- **A** — Attaccante

Il colore associato al ruolo deve essere coerente in tutta l'app.

---

## 10. Assegnazione giocatori

Devono coesistere:

### Drag & drop
Permette di spostare rapidamente i giocatori tra gli stati previsti e sul campo.

### Azioni rapide
Dalla row del giocatore deve essere possibile assegnarlo come:

- Titolare
- Panchina

Se viene scelto come titolare, il sistema prova a inserirlo in uno slot coerente con il ruolo; se non disponibile, usa uno slot libero sensato.

La posizione può essere corretta successivamente.

---

## 11. Campo

Il campo deve essere graficamente leggero.

Il portiere si trova nella parte inferiore; l'attacco nella parte superiore.

Le posizioni dipendono dal modulo.

### Regola fondamentale

**Le card dei giocatori sul campo non devono mai sovrapporsi.**

Ogni modulo deve quindi definire coordinate compatibili con:

- dimensione effettiva del campo;
- dimensione effettiva delle player card;
- viewport supportati.

Le card sul campo mostrano principalmente:

- numero;
- cognome;
- ruolo;
- capitano;
- utility contestuali.

Non devono avere il peso visivo delle normali card applicative.

---

## 12. Modulo

Il modulo iniziale appartiene alla formazione.

Il modulo può cambiare durante la partita.

Un cambio modulo è un dato storico e deve registrare almeno:

- minuto/tempo;
- modulo precedente;
- nuovo modulo;
- posizioni dei giocatori.

Non deve semplicemente sovrascrivere il modulo precedente.

---

## 13. Capitano

Il capitano viene selezionato tra i titolari.

La scelta deve essere **persistita realmente**, non soltanto rappresentata nella UI.

Il capitano deve essere riconoscibile sul campo e nelle viste pertinenti.

Il controllo di selezione deve essere compatto e integrato nella Formazione.

---

## 14. Numeri di maglia

Il numero viene gestito direttamente nella Formazione.

Il selettore contiene i numeri **1–24**.

I numeri già assegnati sono visivamente attenuati.

Un numero già utilizzato resta selezionabile: scegliendolo si effettua uno **switch** con il giocatore che lo possiede.

---

## 15. Panchina

La panchina è una lista operativa.

Ogni row deve mantenere la stessa densità della Rosa.

Da ogni panchinaro devono essere disponibili shortcut contestuali per:

- **Cambio**
- **Gol**
- **Cartellino**

Le shortcut aprono un **popover/fumetto in sovrapposizione**.

Non devono espandere permanentemente la row.

---

## 16. Panchinaro non entrato

Non deve esistere una lista duplicata denominata “Non entrati”.

Il giocatore rimane nella Panchina.

Se non entra, la motivazione viene registrata direttamente sulla sua row.

Valori previsti:

- Scelta tecnica
- Motivo disciplinare
- Infortunio

Questi valori sono strutturati, non testo libero.

---

## 17. Non convocati

I non convocati sono mostrati **sotto la Rosa**, nella colonna sinistra.

Per ogni giocatore deve essere registrabile una motivazione strutturata.

Tra le motivazioni deve essere prevista:

- Scelta tecnica

La UI deve permettere di consultare e modificare la motivazione senza creare una nuova area indipendente.

---

# EVENTI

## 18. Eventi rapidi dalla Formazione

La tab Eventi è la gestione completa degli eventi.

La Formazione può però creare eventi contestuali attraverso shortcut sul giocatore.

Campo e Panchina possono quindi aprire un piccolo popover **Registra evento**.

Non deve comparire una colonna Eventi accanto al campo.

---

## 19. Cambio

Un cambio identifica esplicitamente:

- **Esce**
- **Entra**

Se il popover viene aperto dal panchinaro, **Entra** è preselezionato.

Se viene aperto dal giocatore in campo, **Esce** è preselezionato.

I selettori devono proporre giocatori coerenti con lo stato della formazione al minuto scelto.

Al salvataggio deve essere aggiornato anche lo stato temporale dei due giocatori.

### Motivazioni cambio

Valori previsti:

- Scelta tecnica
- Prevenzione infortunio
- Prevenzione disciplinare
- Infortunio
- Standing ovation
- Spazio ai compagni

---

## 20. Stato temporale della formazione

La formazione non è soltanto quella iniziale.

Dato un minuto della partita, il sistema deve poter determinare chi era effettivamente in campo.

Questo stato temporale viene utilizzato per:

- cambi;
- gol;
- assist;
- cartellini;
- cambi modulo;
- statistiche.

I selettori giocatore degli eventi devono rispettare questa informazione.

---

## 21. Tab Eventi

La tab Eventi è il luogo completo per:

- inserimento;
- consultazione;
- modifica;
- ricostruzione cronologica.

Il form deve essere **data-driven** in funzione del tipo evento.

Non utilizzare genericamente “Giocatore 1” e “Giocatore 2”.

Esempi:

- **Gol:** Marcatore / Assist
- **Cambio:** Esce / Entra
- **Cartellino:** Giocatore

Un evento individuale mostra un solo giocatore.

Un campo non pertinente al tipo evento non deve essere mostrato.

---

## 22. Tipologie e sottotipi evento

Per ogni tipo evento devono essere definiti:

- numero di giocatori coinvolti;
- ruolo semantico di ogni giocatore;
- sottotipi ammessi;
- motivazioni ammesse;
- campi visibili;
- eventuali effetti sulla formazione.

Esempio: un cartellino mostra la tipologia del cartellino, non la motivazione di una sostituzione.

---

## 23. Tempo partita

Configurazione attuale:

**80 minuti = 2 tempi da 40' + recupero**

Ogni evento deve identificare:

- **Tempo:** 1° / 2°
- **Minuto del tempo**

La UI deve rappresentare chiaramente anche il recupero.

La struttura deve rimanere estendibile a competizioni con durata differente.

---

# DESIGN SYSTEM E RESPONSIVE

## 24. Densità

La gestione partita è una schermata ad alta densità informativa.

Compatto non significa illeggibile.

Devono rimanere costanti:

- gerarchia tipografica;
- altezza delle row della stessa famiglia;
- dimensione delle icon button;
- padding;
- allineamenti;
- hit area utilizzabile.

Non sono accettabili, per esempio, row Panchina molto più alte delle row Rosa senza una ragione funzionale.

---

## 25. Responsive

Desktop e mobile usano gli stessi componenti.

Su desktop si privilegia la gestione simultanea delle informazioni.

Su mobile il layout può cambiare disposizione, ma:

- non cambia il significato dei componenti;
- non duplica la logica;
- non crea un secondo design system;
- mantiene le azioni essenziali raggiungibili.

---

# REGOLE DI SVILUPPO

## 26. Prima di ogni commit

Prima di applicare un commit occorre verificare:

- [ ] Ho letto questo vademecum?
- [ ] La modifica richiesta cambia UI o anche logica/dati?
- [ ] Se è solo UI, ho lasciato intatta la logica applicativa?
- [ ] Sto riutilizzando un componente esistente?
- [ ] Sto creando CSS duplicato?
- [ ] Sto aggiungendo un override solo per correggere un override precedente?
- [ ] Posso risolvere il problema nel componente/token condiviso?
- [ ] Le row equivalenti mantengono la stessa densità?
- [ ] Pulsanti, input, badge e tab rispettano il design system?
- [ ] Desktop e mobile restano coerenti?
- [ ] La modifica preserva i bind/event listener esistenti?
- [ ] La modifica preserva permessi e RLS?
- [ ] La modifica funziona anche sulle partite concluse quando previsto?
- [ ] Formazione ed eventi mantengono la corretta separazione?
- [ ] Non ho introdotto duplicazioni di dati nella UI?
- [ ] Non ho introdotto scroll dell'intera workspace dove è previsto scroll interno?
- [ ] Ho verificato che i giocatori sul campo non si sovrappongano?
- [ ] Ho verificato stati vuoti, liste lunghe e viewport ridotti?
- [ ] Ho verificato che i dati modificabili vengano realmente persistiti?
- [ ] Ho verificato la sintassi JavaScript prima del deploy?
- [ ] Ho aggiornato la cache degli asset solo dopo aver completato le modifiche?

Se una risposta è negativa, il commit non è pronto.

---

## 27. Regola per refactor UI

Quando una parte della UI è diventata stratificata o incoerente:

**non aggiungere un altro override.**

Procedura corretta:

1. identificare il componente responsabile;
2. eliminare le regole obsolete/duplicate;
3. ricostruire il componente sulla base del design system;
4. verificare tutte le schermate che lo utilizzano;
5. solo dopo procedere al commit.

---

## 28. Regola per richieste future

Una richiesta futura può naturalmente evolvere il progetto.

Quando una nuova decisione modifica una regola di questo documento:

1. aggiornare prima o contestualmente il vademecum;
2. modificare il codice in modo coerente;
3. evitare eccezioni nascoste nel CSS o nel JavaScript;
4. mantenere il documento allineato allo stato desiderato del progetto.

Il vademecum descrive il **TO-BE**, non gli eventuali bug o compromessi temporanei presenti nel codice.

---

## 29. Definizione di “commit integro”

Un commit è considerato coerente con Team Manager quando:

- soddisfa la richiesta funzionale;
- non rompe comportamenti esistenti non coinvolti;
- rispetta il design system;
- non aumenta inutilmente il debito CSS/JS;
- mantiene separati dati, logica e presentazione;
- mantiene consistenza desktop/mobile;
- lascia il progetto più semplice o almeno non più complesso da mantenere;
- è compatibile con le regole di questo documento.

---

**Questo documento è la pietra miliare del progetto. Consultarlo prima di ogni modifica sostanziale.**
