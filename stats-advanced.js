/* Grafici avanzati dei tabellini. Estensione non invasiva della dashboard. */
(function(){
  const parent=window.TeamStatsDashboard;
  if(!parent)return;
  const old=parent.render.bind(parent);
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const val=x=>Number(x)||0;
  const group=(title,rows)=>'<section class="ts-card ts-advanced"><h3>'+title+'</h3><div class="ts-advanced-rows">'+rows.map(([label,count,ratio])=>'<div class="ts-part"><div><span>'+esc(label)+'</span><b>'+esc(count)+'</b></div><div class="ts-bar-track"><i style="width:'+Math.max(0,Math.min(100,ratio||0))+'%"></i></div></div>').join("")+'</div></section>';
  const two=(title,a,b)=>'<section class="ts-card ts-advanced"><h3>'+title+'</h3><div class="ts-venue"><div><small>'+esc(a[0])+'</small><strong>'+esc(a[1])+'</strong><span>'+esc(a[2]||"")+'</span></div><div><small>'+esc(b[0])+'</small><strong>'+esc(b[1])+'</strong><span>'+esc(b[2]||"")+'</span></div></div></section>';
  function render(arg){
    old(arg);
    const root=arg.target?.querySelector(".ts-grid"),t=arg.team;
    if(!root||!t)return;
    const sum=xs=>xs.reduce((a,b)=>a+val(b),0);
    const bars=(map,denominator)=>Object.entries(map||{}).map(([k,n])=>[({leading:"In vantaggio",drawing:"In parità",trailing:"In svantaggio",superior:"In superiorità",equal:"In parità numerica",inferior:"In inferiorità"}[k]||k),val(n),denominator?100*val(n)/denominator:0]);
    const played=(t.players||[]).filter(p=>p.appearances).sort((a,b)=>val(b.plus_minus)-val(a.plus_minus)).slice(0,8);
    const impact='<section class="ts-card ts-advanced"><h3>Impatto individuale · +/−</h3><div class="ts-ratings">'+played.map(p=>'<div class="ts-grade"><strong>'+esc((p.last_name||"")+" "+(p.first_name||""))+'</strong><b>'+(val(p.plus_minus)>0?"+":"")+val(p.plus_minus)+'</b><small>'+val(p.on_field_gf)+' GF · '+val(p.on_field_ga)+' GS con il giocatore in campo</small></div>').join("")+'</div></section>';
    root.insertAdjacentHTML("beforeend",
      two("Gol titolari / subentrati",["Titolari",val(t.goalsStarters),"Gol segnati"],["Subentrati",val(t.goalsSubs),"Gol segnati"])+
      two("Gol nel recupero · totale "+(val(t.extraGoalsFor?.[0])+val(t.extraGoalsFor?.[1]))+" GF / "+(val(t.extraGoalsAgainst?.[0])+val(t.extraGoalsAgainst?.[1]))+" GS",["1° tempo",val(t.extraGoalsFor?.[0])+" / "+val(t.extraGoalsAgainst?.[0]),"Fatti / Subiti"],["2° tempo",val(t.extraGoalsFor?.[1])+" / "+val(t.extraGoalsAgainst?.[1]),"Fatti / Subiti"])+
      group("Gol segnati per situazione",bars(t.scoredWhile,sum(Object.values(t.scoredWhile||{}))))+
      group("Gol subiti per situazione",bars(t.concededWhile,sum(Object.values(t.concededWhile||{}))))+
      group("Gol fatti · numero di giocatori",bars(t.goalsForNumerical,sum(Object.values(t.goalsForNumerical||{}))))+
      group("Gol subiti · numero di giocatori",bars(t.goalsAgainstNumerical,sum(Object.values(t.goalsAgainstNumerical||{}))))+
      two("Rimonte",["Fatte",val(t.comebacksFor),val(t.comebackWins)+" concluse con vittoria"],["Subite",val(t.comebacksAgainst),val(t.comebackLosses)+" concluse con sconfitta"])+
      '<section class="ts-card ts-advanced"><h3>Rating medio ponderato</h3><div class="ts-weighted"><strong>'+(t.weightedRating==null?"—":Number(t.weightedRating).toFixed(2).replace(".",","))+'</strong><small>Media dei voti ponderata in base ai minuti effettivamente giocati</small></div></section>'+
      impact
    );
  }
  window.TeamStatsDashboard.render=render;
})();