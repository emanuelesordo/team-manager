export const ROLE={P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante',fan:'Fan',player:'Giocatore',coach:'Mister',manager:'Dirigente',admin:'Admin'};
export const EVENT_LABEL={goal:'Gol',assist:'Assist',yellow_card:'Giallo',red_card:'Rosso',substitution:'Cambio',own_goal:'Autogol',penalty_scored:'Rigore segnato',penalty_missed:'Rigore sbagliato',other:'Altro'};
export const FORMATIONS={'4-4-2':[[50,89],[12,70],[37,70],[63,70],[88,70],[12,44],[37,44],[63,44],[88,44],[35,18],[65,18]],'4-3-3':[[50,89],[12,70],[37,70],[63,70],[88,70],[24,46],[50,46],[76,46],[15,18],[50,14],[85,18]],'4-2-3-1':[[50,89],[12,70],[37,70],[63,70],[88,70],[35,50],[65,50],[15,31],[50,31],[85,31],[50,12]]};
export const n=v=>Number(v||0);
export const fmt=(d,opt={day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})=>d?new Intl.DateTimeFormat('it-IT',opt).format(new Date(d)):'—';
export const initials=(a='T',b='M')=>((String(a)[0]||'')+(String(b)[0]||'')).toUpperCase();
export const isStaff=d=>['manager','admin'].includes(d.role);
export const playerBy=(d,id)=>d.players.find(x=>x.id===id);
export const oppBy=(d,id)=>d.opponents.find(x=>x.id===id);
export const compBy=(d,id)=>d.competitions.find(x=>x.id===id);
export function score(d,m){const s=d.scores.find(x=>x.match_id===m?.id);if(!m)return null;if(s)return m.status==='finished'?[n(s.team_score_confirmed),n(s.opponent_score_confirmed)]:[n(s.team_score_live),n(s.opponent_score_live)];return m.home_away==='home'?[n(m.home_score),n(m.away_score)]:[n(m.away_score),n(m.home_score)]}
export function sideScore(d,m){const s=score(d,m);if(!s)return['—','—'];return m.home_away==='home'?s:[s[1],s[0]]}
