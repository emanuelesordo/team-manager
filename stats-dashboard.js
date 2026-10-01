window.TeamStatsDashboard=(function(){
"use strict";
var esc=function(x){return String(x==null?"":x).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});};
var number=function(v,d){return Number(v||0).toLocaleString("it-IT",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});};
var name=function(p){return String((p.last_name||"")+" "+(p.first_name||"")).trim();};
var card=function(title,content,cls){return '<section class="ts-card '+(cls||"")+'"><h3>'+title+'</h3>'+content+'</section>';};
function ranking(players,field,maxRows){
 var sorted=players.filter(function(p){return Number(p[field])>0;}).sort(function(a,b){return Number(b[field])-Number(a[field]);}).slice(0,maxRows||6);
 var peak=Math.max(1,...sorted.map(function(p){return Number(p[field]);}));
 return sorted.length?'<div class="ts-bars">'+sorted.map(function(p,i){var v=Number(p[field]);return '<div class="ts-bar-row"><small>'+(i+1)+'</small><span title="'+esc(name(p))+'">'+esc(name(p))+'</span><div class="ts-bar-track"><i style="width:'+(v/peak*100)+'%"></i></div><b>'+number(v)+'</b></div>';}).join("")+'</div>':'<p class="ts-empty">Nessun dato registrato</p>';
}
function timeline(matches){
 if(!matches.length)return '<p class="ts-empty">Nessuna partita conclusa</p>';
 var max=Math.max(2,...matches.map(function(m){return Math.max(m.goals,m.conceded);}));
 var coords=function(k){return matches.map(function(m,i){return [18+i*624/Math.max(1,matches.length-1),156-130*m[k]/max];});};
 var first=coords("goals"),second=coords("conceded");
 var path=function(p){return p.map(function(x,i){return (i?"L":"M")+x[0].toFixed(1)+" "+x[1].toFixed(1);}).join(" ");};
 return '<div class="ts-line"><svg viewBox="0 0 660 180" preserveAspectRatio="none" role="img" aria-label="Andamento reti segnate e subite"><path d="'+path(first)+'" stroke="#27815e"/><path d="'+path(second)+'" stroke="#ce856b"/>'+first.map(function(x){return '<circle cx="'+x[0]+'" cy="'+x[1]+'" r="5" fill="#27815e"/>';}).join("")+second.map(function(x){return '<circle cx="'+x[0]+'" cy="'+x[1]+'" r="4" fill="#ce856b"/>';}).join("")+'</svg><div class="ts-line-key"><span>● Gol fatti</span><span>● Gol subiti</span></div></div>';
}
function render(input){
 var target=input.target,team=input.team,players=team.players||input.playerStats||[],opponents=input.opponents||[];
 if(!target)return;
 var pct=function(v){return team.played?Math.round(100*v/team.played):0;};
 var kpis=[["Partite",team.played],["Gol fatti",team.goalsFor],["Gol subiti",team.goalsAgainst],["Diff. reti",(team.goalsFor-team.goalsAgainst>0?"+":"")+(team.goalsFor-team.goalsAgainst)],["Porta inviolata",team.cleanSheets],["Sostituzioni",team.substitutions]];
 var metrics='<div class="ts-kpis">'+kpis.map(function(x){return '<div class="ts-kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>';}).join("")+'</div>';
 var donut='<div class="ts-result"><div class="ts-ring" style="--w:'+pct(team.wins)+'%;--d:'+pct(team.wins+team.draws)+'%"><div><strong>'+team.played+'</strong><small>partite</small></div></div><div class="ts-legend"><span><i class="win"></i> Vittorie <b>'+team.wins+'</b></span><span><i class="draw"></i> Pareggi <b>'+team.draws+'</b></span><span><i class="loss"></i> Sconfitte <b>'+team.losses+'</b></span></div></div>';
 var results=team.matches.slice(-8).map(function(m){var o=opponents.find(function(p){return String(p.id)===String(m.opponent_id);});return '<div class="ts-score '+m.result+'" title="'+esc((o&&o.name)||"Avversaria")+' · '+esc(m.source)+'"><small>'+esc((o&&(o.short_name||o.name))||"AVV")+'</small><strong>'+m.goals+'–'+m.conceded+'</strong><b>'+({W:"V",D:"N",L:"P"}[m.result])+'</b></div>';}).join("");
 var goalTotal=team.goalsByPeriod.reduce(function(a,b){return a+b;},0);
 var parts=[["1° tempo",team.goalsByPeriod[0]],["2° tempo",team.goalsByPeriod[1]]];
 var timing=parts.map(function(p){return '<div class="ts-part"><div><span>'+p[0]+'</span><b>'+p[1]+'</b></div><div class="ts-bar-track"><i style="width:'+(goalTotal?100*p[1]/goalTotal:0)+'%"></i></div></div>';}).join("");
 timing+='<div class="ts-quartiles">'+team.goalIntervals.map(function(v,i){return '<div><b>'+v+'</b><span style="height:'+Math.max(6,goalTotal?v*100/goalTotal:6)+'%"></span><small>'+["1T I","1T II","2T I","2T II"][i]+'</small></div>';}).join("")+'</div>';
 var discipline='<div class="ts-cards"><span class="yellow"><b>'+team.yellows+'</b><small>Gialli</small></span><span class="blue"><b>'+team.blues+'</b><small>Blu</small></span><span class="red"><b>'+team.reds+'</b><small>Rossi</small></span></div>'+ranking(players,"disciplinary_cards",5);
 var rating=players.filter(function(p){return p.avg_rating!=null&&p.rated_matches;}).sort(function(a,b){return b.avg_rating-a.avg_rating;}).slice(0,6);
 var grades=rating.map(function(p){return '<div class="ts-grade"><strong>'+esc(name(p))+'</strong><b>'+number(p.avg_rating,2)+'</b><small>'+p.rated_matches+' valutazioni partita</small></div>';}).join("")||'<p class="ts-empty">Nessun voto valido</p>';
 var venue='<div class="ts-venue"><div><small>Casa</small><strong>'+team.home.played+'</strong><span>'+team.home.goals+' GF · '+team.home.conceded+' GS</span></div><div><small>Trasferta</small><strong>'+team.away.played+'</strong><span>'+team.away.goals+' GF · '+team.away.conceded+' GS</span></div></div>';
 target.innerHTML='<div class="ts-dashboard"><header class="ts-heading"><div><small>STAGIONE '+esc(input.seasonLabel||"")+'</small><h2>Statistiche</h2><p>Analisi visuale dei tabellini e degli eventi ufficializzati o registrati a partita conclusa.</p></div><span>DATI MATCH CENTER</span></header>'+metrics+'<div class="ts-grid">'+card("Bilancio risultati",donut)+card("Reti fatte e subite",timeline(team.matches),"wide")+card("Ultime partite",'<div class="ts-scores">'+(results||'<p class="ts-empty">Nessun risultato</p>')+'</div>',"wide")+card("Marcatori",ranking(players,"goals",6))+card("Assist",ranking(players,"assists",6))+card("Quando segniamo",timing)+card("Minuti giocati",ranking(players,"minutes",6))+card("Valutazioni medie",grades)+card("Disciplina",discipline)+card("Casa e trasferta",venue)+'</div><p class="ts-note">Fonte: tabellini delle partite concluse. Recuperi inclusi nei minuti; SV esclusi dai rating. Quando ci sono eventi gol, il risultato è ricostruito dal tabellino.</p></div>';
}
return {render:render};
})();