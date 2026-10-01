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
    const impact='<section class="ts-card ts-advanced"><h3>Impatto sul risultato · +/−</h3><div class="ts-ratings">'+played.map(p=>'<div class="ts-grade"><strong>'+esc((p.last_name||"")+" "+(p.first_name||""))+'</strong><b>'+(val(p.plus_minus)>0?"+":"")+val(p.plus_minus)+'</b><small>'+val(p.on_field_gf)+' GF · '+val(p.on_field_ga)+' GS · '+val(p.comebacks_positive)+' rimonte positive · '+val(p.comebacks_negative)+' rimonte subite · '+val(p.results_maintained)+' risultati mantenuti</small></div>').join("")+'</div></section>';
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

  // Un solo carosello per gruppi tematici: nessuna tabella né scroll
  // orizzontale della pagina. Tutti i widget preesistenti sono riutilizzati.
  function organize(target){
    const dashboard=target?.querySelector(".ts-dashboard");
    const grid=dashboard?.querySelector(".ts-grid");
    const metrics=dashboard?.querySelector(".ts-kpis");
    if(!dashboard||!grid||!metrics)return;
    const widgets=[...grid.children];
    if(widgets.length!==19)return; // non perdere contenuti se il modello cambia
    const chapters=[
      {title:"Riepilogo",icon:"◉",items:[0,1,2,9],includeMetrics:true},
      {title:"Gol",icon:"⚽",items:[3,4,5,10,11]},
      {title:"Voti",icon:"★",items:[7,17,6]},
      {title:"Impatto",icon:"↗",items:[18,16]},
      {title:"Situazioni",icon:"▥",items:[12,13,14,15]},
      {title:"Disciplina",icon:"▣",items:[8]}
    ];
    const nav=document.createElement("nav");
    nav.className="ts-nav";
    nav.setAttribute("aria-label","Categorie statistiche");
    const stage=document.createElement("div");
    stage.className="ts-stage";
    const slides=document.createElement("div");
    slides.className="ts-track-slides";
    slides.setAttribute("aria-live","polite");
    const elements=[];
    chapters.forEach((chapter,i)=>{
      const btn=document.createElement("button");
      btn.type="button";btn.className="ts-nav-btn";
      btn.innerHTML='<span class="ts-nav-icon" aria-hidden="true">'+chapter.icon+'</span><span>'+chapter.title+'</span>';
      btn.setAttribute("aria-controls","ts-stat-slide-"+i);
      nav.appendChild(btn);
      const section=document.createElement("section");
      section.className="ts-slide";
      section.id="ts-stat-slide-"+i;
      section.setAttribute("aria-label",chapter.title);
      const body=document.createElement("div");
      body.className="ts-chapter-grid";
      if(chapter.includeMetrics)body.appendChild(metrics);
      for(const index of chapter.items){
        const widget=widgets[index];if(!widget)continue;
        widget.classList.remove("wide");
        body.appendChild(widget);
      }
      section.appendChild(body);
      slides.appendChild(section);
      elements.push({btn,section});
    });
    stage.appendChild(slides);
    const footer=document.createElement("div");
    footer.className="ts-page-controls";
    footer.innerHTML='<button class="ts-page-prev" type="button" aria-label="Statistiche precedenti">‹</button><div class="ts-page-dots" aria-hidden="true"></div><button class="ts-page-next" type="button" aria-label="Statistiche successive">›</button>';
    const dots=footer.querySelector(".ts-page-dots");
    chapters.forEach(()=>{const dot=document.createElement("span");dots.appendChild(dot)});
    grid.replaceWith(stage);
    dashboard.insertBefore(nav,stage);
    stage.after(footer);
    let current=0,startX=null,startY=null;
    function go(index){
      current=(index+chapters.length)%chapters.length;
      slides.style.transform="translateX(-"+(current*100)+"%)";
      elements.forEach(({btn,section},i)=>{
        const on=i===current;
        btn.classList.toggle("active",on);
        btn.setAttribute("aria-current",on?"page":"false");
        section.setAttribute("aria-hidden",String(!on));
        section.inert=!on;
      });
      [...dots.children].forEach((dot,i)=>dot.classList.toggle("active",i===current));
      footer.querySelector(".ts-page-prev").disabled=current===0;
      footer.querySelector(".ts-page-next").disabled=current===chapters.length-1;
      const syncHeight=()=>{
        const active=elements[current]?.section;
        if(active)stage.style.height=Math.ceil(active.scrollHeight)+"px";
      };
      syncHeight();
      requestAnimationFrame(syncHeight);
      const first=elements[current].btn;
      if(first&&nav.scrollWidth>nav.clientWidth)first.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
    }
    elements.forEach(({btn},i)=>btn.addEventListener("click",()=>go(i)));
    footer.querySelector(".ts-page-prev").onclick=()=>go(Math.max(0,current-1));
    footer.querySelector(".ts-page-next").onclick=()=>go(Math.min(chapters.length-1,current+1));
    stage.addEventListener("touchstart",e=>{
      if(e.touches.length!==1)return;
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;
    },{passive:true});
    stage.addEventListener("touchend",e=>{
      if(startX==null||!e.changedTouches.length)return;
      const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
      startX=startY=null;
      if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4)go(Math.max(0,Math.min(chapters.length-1,current+(dx<0?1:-1))));
    },{passive:true});
    // Non forzare un'altezza fissa: soltanto il gruppo attivo occupa spazio.
    if(typeof ResizeObserver!=="undefined"){
      const observer=new ResizeObserver(()=>{
        const active=elements[current]?.section;
        if(active)stage.style.height=Math.ceil(active.scrollHeight)+"px";
      });
      elements.forEach(({section})=>observer.observe(section));
    }else{
      window.addEventListener("resize",()=>{
        const active=elements[current]?.section;
        if(active)stage.style.height=Math.ceil(active.scrollHeight)+"px";
      },{passive:true});
    }
    go(0);
  }
  const groupRender=window.TeamStatsDashboard.render;
  window.TeamStatsDashboard.render=function(input){
    groupRender(input);
    organize(input?.target);
  };

})();