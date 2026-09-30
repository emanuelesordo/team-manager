const SUPABASE_URL="https://qxblxomcpepwavgvhtuk.supabase.co";
const SUPABASE_KEY="sb_publishable_mqNXt8rW96jH8JvCm24piA_SyAktT_m";
const PROJECT_REF="qxblxomcpepwavgvhtuk";
const AUTH_KEY="sb-"+PROJECT_REF+"-auth-token";

function readStoredSession(){
  try{
    const raw=localStorage.getItem(AUTH_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed?.currentSession||parsed?.session||parsed;
  }catch{return null}
}
function writeStoredSession(session){
  try{localStorage.setItem(AUTH_KEY,JSON.stringify(session))}catch{}
}
async function getValidSession(){
  let session=readStoredSession();
  if(!session?.access_token)return null;
  const now=Math.floor(Date.now()/1000);
  if(session.expires_at && session.expires_at-now<60 && session.refresh_token){
    try{
      const res=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token",{
        method:"POST",
        headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({refresh_token:session.refresh_token})
      });
      if(res.ok){
        session=await res.json();
        if(session.expires_in&&!session.expires_at)session.expires_at=now+session.expires_in;
        writeStoredSession(session);
      }
    }catch{}
  }
  return session;
}
async function apiHeaders(extra={}){
  const session=await getValidSession();
  return {"apikey":SUPABASE_KEY,"Authorization":"Bearer "+(session?.access_token||SUPABASE_KEY),...extra};
}
class Query{
  constructor(table){this.table=table;this.action="select";this.columns="*";this.filters=[];this.orderBy=null;this.body=null;this.singleMode=null}
  select(cols="*"){this.columns=cols;return this}
  insert(body){this.action="insert";this.body=body;return this}
  update(body){this.action="update";this.body=body;return this}
  delete(){this.action="delete";return this}
  eq(col,val){this.filters.push([col,val]);return this}
  order(col,{ascending=true}={}){this.orderBy=[col,ascending];return this}
  maybeSingle(){this.singleMode="maybe";return this}
  single(){this.singleMode="single";return this}
  then(resolve,reject){return this.execute().then(resolve,reject)}
  async execute(){
    const qs=new URLSearchParams();
    if(this.action==="select"||this.action==="insert"||this.action==="update")qs.set("select",this.columns||"*");
    for(const [c,v] of this.filters)qs.append(c,"eq."+v);
    if(this.orderBy)qs.set("order",this.orderBy[0]+"."+(this.orderBy[1]?"asc":"desc"));
    const url=SUPABASE_URL+"/rest/v1/"+this.table+(qs.toString()?"?"+qs.toString():"");
    const method=this.action==="select"?"GET":this.action==="insert"?"POST":this.action==="update"?"PATCH":"DELETE";
    const headers=await apiHeaders({"Content-Type":"application/json","Prefer":"return=representation"});
    const opts={method,headers};
    if(this.body!==null)opts.body=JSON.stringify(this.body);
    try{
      const res=await fetch(url,opts);
      const text=await res.text();
      let data=text?JSON.parse(text):[];
      if(!res.ok)return {data:null,error:new Error(data?.message||data?.error_description||("HTTP "+res.status))};
      if(this.singleMode){
        const row=Array.isArray(data)?data[0]:data;
        if(this.singleMode==="single"&&!row)return {data:null,error:new Error("Nessuna riga restituita")};
        return {data:row||null,error:null};
      }
      return {data,error:null};
    }catch(error){return {data:null,error}}
  }
}
const db={
  from:(table)=>new Query(table),
  auth:{
    async getSession(){
      const session=await getValidSession();
      return {data:{session},error:null};
    },
    async signInWithPassword({username,password}){
      try{
        const res=await fetch(SUPABASE_URL+"/functions/v1/auth-login",{
          method:"POST",
          headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
          body:JSON.stringify({username,password})
        });
        const payload=await res.json();
        if(!res.ok||!payload?.ok||!payload?.session){
          return {data:null,error:new Error(payload?.error||"Login non riuscito")};
        }
        const session={...payload.session,user:{id:payload.profile?.id}};
        writeStoredSession(session);
        return {data:{session,user:session.user,profile:payload.profile},error:null};
      }catch(error){return {data:null,error}}
    },
    async signOut(){
      const session=readStoredSession();
      try{
        if(session?.access_token){
          await fetch(SUPABASE_URL+"/auth/v1/logout",{
            method:"POST",
            headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+session.access_token}
          });
        }
      }catch{}
      try{localStorage.removeItem(AUTH_KEY)}catch{}
      return {error:null};
    }
  },
  storage:{
    from(bucket){return {
      async upload(path,blob,{contentType="application/octet-stream",upsert=false}={}){
        try{
          const headers=await apiHeaders({"Content-Type":contentType,"x-upsert":upsert?"true":"false"});
          const res=await fetch(SUPABASE_URL+"/storage/v1/object/"+bucket+"/"+path,{method:"POST",headers,body:blob});
          if(!res.ok){let d={};try{d=await res.json()}catch{};return {data:null,error:new Error(d.message||("Upload HTTP "+res.status))}}
          return {data:await res.json(),error:null};
        }catch(error){return {data:null,error}}
      },
      getPublicUrl(path){return {data:{publicUrl:SUPABASE_URL+"/storage/v1/object/public/"+bucket+"/"+path}}}
    }}
  }
};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
window.addEventListener("error",e=>{
  const box=document.querySelector("#connectionState");
  const auth=document.querySelector("#authState");
  if(box){box.textContent="Errore JS: "+(e.message||"avvio");box.className="status-pill error"}
  if(auth){auth.textContent="Errore JS";auth.className="auth-state error"}
  console.error(e.error||e.message);
});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=d=>d?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00")):"—";
const statusLabel={active:"Attiva",future:"Futura",archived:"Archiviata"};
let seasons=[],competitions=[],opponents=[],currentSeason=null,team=null,wizardStep=1,draftCompetitions=[],wizardOpponentIds=new Set(),sessionUser=null,competitionHubId=null,competitionFixtureFilter="all",calendarRows=[],teamMatches=[],calendarCompetitionIds=new Set(),players=[],rosterRows=[],playerStats=[],selectedPlayerId=null,selectedMatchId=null,rosterRole="ALL",dashboardStandingRows=[],dashboardCountdownTimer=null,loggedPlayer=null;

async function loadAuthState(){
  const {data:{session}}=await db.auth.getSession();
  sessionUser=session?.user||null;
  if(!sessionUser){
    $("#authState").textContent="Non autenticato";
    $("#authState").className="auth-state error";
    $("#authButton").textContent="Accedi";
    return;
  }
  const role=await db.from("app_user_roles").select("role").eq("user_id",sessionUser.id).maybeSingle();
  $("#authState").textContent=role.data?.role==="admin"?"Admin":"Autenticato";
  $("#authState").className="auth-state ok";
  $("#authButton").textContent="Esci";
}
function assertSaved(result,label){
  if(result.error) throw result.error;
  if(!result.data) throw new Error(label+" non salvato: la sessione non ha permessi di modifica o non è più valida.");
  return result.data;
}

function openAuth(){
  $("#authForm").reset();
  $("#authError").classList.add("hidden");
  $("#authDialog").showModal();
}
function closeAuth(){ $("#authDialog").close(); }

$("#authButton").onclick=async()=>{
  if(sessionUser){
    await db.auth.signOut();
    sessionUser=null;
    await loadAuthState();
    return;
  }
  openAuth();
};
$$("[data-close-auth]").forEach(b=>b.onclick=closeAuth);
$("#authForm").onsubmit=async e=>{
  e.preventDefault();
  $("#authError").classList.add("hidden");
  const result=await db.auth.signInWithPassword({
    username:$("#authUsername").value.trim(),
    password:$("#authPassword").value
  });
  if(result.error){
    $("#authError").textContent=result.error.message||String(result.error);
    $("#authError").classList.remove("hidden");
    return;
  }
  closeAuth();
  await loadAuthState();
};

function setAppView(name){
  const views=["home","setup","competitions","calendar","roster","matches","events","stats"];
  views.forEach(v=>$("#"+v+"View")?.classList.toggle("hidden",v!==name));
  $$(".side-link[data-app-view]").forEach(b=>b.classList.toggle("active",b.dataset.appView===name));
  document.title=(name==="home"?"Dashboard":name[0].toUpperCase()+name.slice(1))+" · "+(team?.name||"Team Manager");
  if(name!=="home"&&dashboardCountdownTimer){
    clearInterval(dashboardCountdownTimer);
    dashboardCountdownTimer=null;
  }
  if(name==="home")loadDashboard();
  if(name==="competitions")loadCompetitionHub();
  if(name==="calendar")loadCalendarHub();
  if(name==="roster")loadRosterView();
  if(name==="matches")loadMatchesView();
  if(name==="events")loadEventsView();
  if(name==="stats")loadStatsView();
}
$$(".side-link[data-app-view]").forEach(b=>b.onclick=()=>setAppView(b.dataset.appView));

function setPanel(name){
  $$(".setup-link").forEach(b=>b.classList.toggle("active",b.dataset.section===name));
  $$("[data-panel]").forEach(p=>p.classList.toggle("hidden",p.dataset.panel!==name));
  if(name==="competitions") loadCompetitions();
  if(name==="opponents") renderOpponents();
  if(name==="team") loadTeam();
  if(name==="calendars") refreshCalendarCompetition();
}
$$(".setup-link").forEach(b=>b.onclick=()=>setPanel(b.dataset.section));

async function loadAll(){
  const s=await db.from("app_seasons").select("*").order("start_date",{ascending:false});
  if(s.error){$("#connectionState").textContent="Errore dati";$("#connectionState").className="status-pill error";return}
  seasons=s.data||[];
  const today=new Date().toISOString().slice(0,10);
  currentSeason=seasons.find(x=>x.start_date<=today&&x.end_date>=today)||seasons[0]||null;
  $("#connectionState").textContent="Connesso";$("#connectionState").className="status-pill ok";
  renderSeasonSelector();renderSeasons();
  const o=await db.from("app_opponents").select("*").order("name");
  opponents=o.data||[];renderOpponents();
}
function renderSeasonSelector(){
  $("#seasonSelector").innerHTML=seasons.map(s=>`<option value="${s.id}" ${s.id===currentSeason?.id?"selected":""}>${esc(s.name)}</option>`).join("");
}
$("#seasonSelector").onchange=e=>{
  currentSeason=seasons.find(s=>s.id===e.target.value)||null;
  competitionHubId=null;
  calendarCompetitionIds=new Set();
  team=null;
  loadCompetitions();
  refreshCalendarCompetition();
  ensureMainTeam();
  const visible=["home","competitions","calendar","roster","matches","events","stats","setup"].find(v=>!$("#"+v+"View")?.classList.contains("hidden"));
  if(visible)setAppView(visible);
};
function renderSeasons(){
  $("#seasonGrid").innerHTML=seasons.map(s=>`<article class="card ${s.id===currentSeason?.id?"active":""}">
    <div class="card-head"><div class="card-title">${esc(s.name)}</div><span class="badge ${s.status}">${statusLabel[s.status]||s.status}</span></div>
    <div class="meta"><span>${fmt(s.start_date)}</span><span>→</span><span>${fmt(s.end_date)}</span></div>
    <div class="card-actions"><button class="text-btn" data-season-edit="${s.id}">Modifica</button></div></article>`).join("");
  $$("[data-season-edit]").forEach(b=>b.onclick=()=>openWizard(seasons.find(s=>s.id===b.dataset.seasonEdit)));
}

async function loadTeam(){
  if(!currentSeason)return;
  const r=await db.from("teams").select("id,name,short_name,logo_url,primary_color,secondary_color,accent_color").eq("id",currentSeason.team_id).maybeSingle();
  if(r.error){$("#teamMessage").textContent="Accedi come staff per modificare la squadra.";$("#teamMessage").classList.remove("hidden");return}
  team=r.data; if(!team)return; updateAppBrand();
  $("#teamName").value=team.name||"";$("#teamShort").value=(team.short_name||"").slice(0,3).toUpperCase();
  $("#teamColor1").value=team.primary_color||"#111827";$("#teamColor2").value=team.secondary_color||"#ffffff";$("#teamColor3").value=team.accent_color||"#2563eb";
  $("#teamLogoPreview").innerHTML=team.logo_url?`<img src="${esc(team.logo_url)}" alt="">`:"Logo";
}
$("#teamShort").oninput=e=>e.target.value=e.target.value.toUpperCase().slice(0,3);
$("#teamLogoFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;const colors=await extractColors(file);if(colors[0])$("#teamColor1").value=colors[0];if(colors[1])$("#teamColor2").value=colors[1];if(colors[2])$("#teamColor3").value=colors[2];$("#teamLogoPreview").innerHTML=`<img src="${URL.createObjectURL(file)}" alt="">`};
async function extractColors(file){return new Promise(resolve=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");x.drawImage(img,0,0,64,64);const d=x.getImageData(0,0,64,64).data,m=new Map();for(let i=0;i<d.length;i+=16){if(d[i+3]<180)continue;const r=Math.round(d[i]/32)*32,g=Math.round(d[i+1]/32)*32,b=Math.round(d[i+2]/32)*32;if(r>240&&g>240&&b>240)continue;const k=[Math.min(r,255),Math.min(g,255),Math.min(b,255)].join(",");m.set(k,(m.get(k)||0)+1)}const arr=[...m].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>"#"+k.split(",").map(n=>(+n).toString(16).padStart(2,"0")).join(""));resolve(arr)};img.src=URL.createObjectURL(file)})}
$("#teamForm").onsubmit=async e=>{e.preventDefault();if(!team)return;let logo=team.logo_url;const file=$("#teamLogoFile").files[0];if(file){const canvas=document.createElement("canvas"),img=new Image();await new Promise(res=>{img.onload=res;img.src=URL.createObjectURL(file)});const scale=Math.min(1,1200/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(res=>canvas.toBlob(res,"image/png"));const path=`${team.id}/logo.png`;const up=await db.storage.from("team-assets").upload(path,blob,{contentType:"image/png",upsert:true});if(up.error)return teamMsg(up.error.message,true);logo=db.storage.from("team-assets").getPublicUrl(path).data.publicUrl+"?t="+Date.now()}
  const payload={name:$("#teamName").value.trim(),short_name:$("#teamShort").value.trim().toUpperCase(),logo_url:logo,primary_color:$("#teamColor1").value,secondary_color:$("#teamColor2").value,accent_color:$("#teamColor3").value,inherit_organization_branding:false};
  try{
    const r=await db.from("teams").update(payload).eq("id",team.id).select("id,name,short_name,logo_url,primary_color,secondary_color,accent_color").maybeSingle();
    assertSaved(r,"Squadra");
    teamMsg("Salvato.");
    await loadTeam();
  }catch(err){teamMsg(err.message||String(err),true)}
}
function teamMsg(t,err=false){$("#teamMessage").textContent=t;$("#teamMessage").className="form-message"+(err?" form-error":"")}

async function loadCompetitions(){
  if(!currentSeason){$("#competitionList").innerHTML="";return}
  const r=await db.from("app_competitions").select("*").eq("season_id",currentSeason.id).order("created_at");
  competitions=r.data||[];renderCompetitions();
}
function renderCompetitions(){
  $("#competitionList").innerHTML=competitions.map(c=>`<article class="card"><div class="card-head"><div class="card-title">${esc(c.name)}</div><span class="badge">${c.kind==="league"?"Campionato":c.kind==="cup"?"Coppa":"Amichevoli"}</span></div><div class="meta"><span>${esc(c.format||"—")}</span><span>${c.periods}×${c.minutes_per_period}'</span></div><div class="card-actions"><button class="text-btn" data-comp-edit="${c.id}">Modifica</button></div></article>`).join("")||'<div class="muted">Nessuna competizione.</div>';
  $$("[data-comp-edit]").forEach(b=>b.onclick=()=>openCompetitionEdit(b.dataset.compEdit));
}
$("#addCompetitionBtn").onclick=()=>openWizard(currentSeason,true);

function renderOpponents(filter=""){
  const f=filter.toLowerCase();const list=opponents.filter(o=>o.name.toLowerCase().includes(f));
  $("#opponentList").innerHTML=list.map(o=>`<article class="card opponent-card">
    <div class="card-head">
      <div class="opponent-brand">
        <div class="opponent-card-logo">${o.logo_url?`<img src="${esc(o.logo_url)}" alt="">`:(esc(o.short_name||o.name.slice(0,3))).toUpperCase()}</div>
        <div><div class="card-title">${esc(o.name)}</div><span class="badge">${esc(o.short_name||"")}</span></div>
      </div>
      <div class="palette-dots" aria-label="Palette">
        <i style="--dot:${esc(o.primary_color||"#d0d5dd")}"></i>
        <i style="--dot:${esc(o.secondary_color||"#e4e7ec")}"></i>
        <i style="--dot:${esc(o.accent_color||"#98a2b3")}"></i>
      </div>
    </div>
    <div class="card-actions"><button class="text-btn" data-opp-edit="${o.id}">Modifica</button></div>
  </article>`).join("")||'<div class="muted">Nessuna avversaria.</div>';
  $$("[data-opp-edit]").forEach(b=>b.onclick=()=>openOpponent(opponents.find(o=>o.id===b.dataset.oppEdit)));
}
$("#opponentSearch").oninput=e=>renderOpponents(e.target.value);
$("#addOpponentBtn").onclick=()=>openOpponent();
function openOpponent(o=null){
  $("#opponentForm").reset();
  $("#opponentMessage").classList.add("hidden");
  $("#opponentId").value=o?.id||"";
  $("#opponentName").value=o?.name||"";
  $("#opponentShort").value=o?.short_name||"";
  $("#opponentColor1").value=o?.primary_color||"#111827";
  $("#opponentColor2").value=o?.secondary_color||"#ffffff";
  $("#opponentColor3").value=o?.accent_color||"#667085";
  $("#opponentLogoPreview").innerHTML=o?.logo_url?`<img src="${esc(o.logo_url)}" alt="">`:"Logo";
  $("#opponentDialog").showModal();
}
$$("[data-close-opponent]").forEach(b=>b.onclick=()=>$("#opponentDialog").close());
$("#opponentLogoFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const colors=await extractColors(file);
  if(colors[0])$("#opponentColor1").value=colors[0];
  if(colors[1])$("#opponentColor2").value=colors[1];
  if(colors[2])$("#opponentColor3").value=colors[2];
  $("#opponentLogoPreview").innerHTML=`<img src="${URL.createObjectURL(file)}" alt="">`;
};
async function imageToPngBlob(file,maxSize=1200){
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=URL.createObjectURL(file)});
  const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(img.width*scale));
  canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  return await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
}
function opponentMsg(text,error=false){
  $("#opponentMessage").textContent=text;
  $("#opponentMessage").className="form-message"+(error?" form-error":"");
}
$("#opponentForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const id=$("#opponentId").value||crypto.randomUUID();
    const existing=opponents.find(o=>o.id===id);
    let logoUrl=existing?.logo_url||null;
    const file=$("#opponentLogoFile").files[0];
    if(file){
      if(!currentSeason?.team_id)throw new Error("Squadra principale non disponibile.");
      const blob=await imageToPngBlob(file);
      const path=`${currentSeason.team_id}/opponents/${id}/logo.png`;
      const up=await db.storage.from("opponent-assets").upload(path,blob,{contentType:"image/png",upsert:true});
      if(up.error)throw up.error;
      logoUrl=db.storage.from("opponent-assets").getPublicUrl(path).data.publicUrl;
    }
    const payload={
      id,
      name:$("#opponentName").value.trim(),
      short_name:$("#opponentShort").value.trim()||null,
      logo_url:logoUrl,
      primary_color:$("#opponentColor1").value,
      secondary_color:$("#opponentColor2").value,
      accent_color:$("#opponentColor3").value
    };
    const r=existing
      ?await db.from("app_opponents").update(payload).eq("id",id).select("*").maybeSingle()
      :await db.from("app_opponents").insert(payload).select("*").single();
    assertSaved(r,"Avversaria");
    const fresh=await db.from("app_opponents").select("*").order("name");
    if(fresh.error)throw fresh.error;
    opponents=fresh.data||[];
    renderOpponents();
    $("#opponentDialog").close();
  }catch(err){opponentMsg(err.message||String(err),true)}
};


async function openCompetitionEdit(id){
  const c=competitions.find(x=>x.id===id);if(!c)return;
  $("#competitionForm").reset();$("#competitionId").value=c.id;$("#cName").value=c.name||"";$("#cKind").value=c.kind||"league";
  refreshCompetitionEditFormat(c.format);
  $("#cPeriods").value=c.periods||2;$("#cMinutes").value=c.minutes_per_period||35;
  $("#cWinPts").value=c.win_points??3;$("#cDrawPts").value=c.draw_points??1;$("#cLossPts").value=c.loss_points??0;
  $("#cPlayoff").checked=!!c.playoff_playout_enabled;$("#cTwoLegged").checked=!!c.knockout_two_legged;
  $("#cExtraTime").checked=!!c.extra_time_enabled;$("#cPenalties").checked=!!c.penalties_enabled;
  $("#cYellowThresholds").value=(c.discipline_rules?.yellow_thresholds||[5,4,3,2]).join(",");
  const links=await db.from("app_competition_opponents").select("opponent_id").eq("competition_id",id);
  const selected=new Set((links.data||[]).map(x=>x.opponent_id));
  $("#cOpponents").innerHTML=opponents.map(o=>`<label class="choice"><input type="checkbox" value="${o.id}" ${selected.has(o.id)?"checked":""}><span>${esc(o.name)}</span></label>`).join("");
  $("#competitionError").classList.add("hidden");$("#competitionDialog").showModal();
}
function refreshCompetitionEditFormat(selected=null){
  const kind=$("#cKind").value;
  $("#cFormat").innerHTML=competitionFormats(kind).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("");
  if(selected&&[...$("#cFormat").options].some(o=>o.value===selected))$("#cFormat").value=selected;
  $("#cLeagueRules").classList.toggle("hidden",kind!=="league");
  $("#cKnockoutRules").classList.toggle("hidden",kind==="friendly");
}
$("#cKind").onchange=()=>refreshCompetitionEditFormat();
$$("[data-close-competition]").forEach(b=>b.onclick=()=>$("#competitionDialog").close());
$("#competitionForm").onsubmit=async e=>{
  e.preventDefault();$("#competitionError").classList.add("hidden");
  const id=$("#competitionId").value;
  const payload={name:$("#cName").value.trim(),kind:$("#cKind").value,format:$("#cFormat").value,periods:+$("#cPeriods").value||2,minutes_per_period:+$("#cMinutes").value||45,win_points:+$("#cWinPts").value||0,draw_points:+$("#cDrawPts").value||0,loss_points:+$("#cLossPts").value||0,playoff_playout_enabled:$("#cPlayoff").checked,knockout_two_legged:$("#cTwoLegged").checked,extra_time_enabled:$("#cExtraTime").checked,penalties_enabled:$("#cPenalties").checked,discipline_rules:{yellow_thresholds:$("#cYellowThresholds").value.split(",").map(x=>+x.trim()).filter(Boolean),suspension_matches:1}};
  try{
    const r=await db.from("app_competitions").update(payload).eq("id",id).select("*").maybeSingle();assertSaved(r,"Competizione");
    const del=await db.from("app_competition_opponents").delete().eq("competition_id",id);if(del.error)throw del.error;
    const selected=[...$("#cOpponents").querySelectorAll("input:checked")].map(i=>({competition_id:id,opponent_id:i.value}));
    if(selected.length){const ins=await db.from("app_competition_opponents").insert(selected);if(ins.error)throw ins.error}
    $("#competitionDialog").close();await loadCompetitions();
  }catch(err){$("#competitionError").textContent=err.message||String(err);$("#competitionError").classList.remove("hidden")}
};

function competitionFormats(kind){
  return kind==="league"?[["league_double","Girone unico A/R"],["league_single","Girone unico solo andata"],["league_playoff","Girone + playoff/playout"]]:kind==="cup"?[["cup_groups_knockout","Girone + eliminazione"],["cup_knockout","Eliminazione diretta"],["cup_group","Solo girone"]]:[["friendly","Partite singole"]];
}
function refreshFormat(){
  const kind=$("#wCompetitionKind").value;$("#wCompetitionFormat").innerHTML=competitionFormats(kind).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("");
  $("#leagueRules").classList.toggle("hidden",kind!=="league");$("#knockoutRules").classList.toggle("hidden",kind==="friendly");
}
$("#wCompetitionKind").onchange=refreshFormat;
$("#addDraftCompetition").onclick=()=>{const name=$("#wCompetitionName").value.trim();if(!name)return;draftCompetitions.push(readCompetitionDraft());$("#wCompetitionName").value="";renderDrafts()};
function readCompetitionDraft(){return{name:$("#wCompetitionName").value.trim(),kind:$("#wCompetitionKind").value,format:$("#wCompetitionFormat").value,periods:+$("#wPeriods").value||2,minutes_per_period:+$("#wMinutes").value||35,win_points:+$("#wWinPts").value||0,draw_points:+$("#wDrawPts").value||0,loss_points:+$("#wLossPts").value||0,knockout_two_legged:$("#wTwoLegged").checked,extra_time_enabled:$("#wExtraTime").checked,penalties_enabled:$("#wPenalties").checked,playoff_playout_enabled:$("#wPlayoff").checked,discipline_rules:{yellow_thresholds:$("#wYellowThresholds").value.split(",").map(x=>+x.trim()).filter(Boolean),suspension_matches:1}}}
function renderDrafts(){$("#draftCompetitionList").innerHTML=draftCompetitions.map((c,i)=>`<div class="draft-item"><strong>${esc(c.name)}</strong> · ${c.kind==="league"?"Campionato":c.kind==="cup"?"Coppa":"Amichevoli"} · ${c.periods}×${c.minutes_per_period}' <button type="button" class="text-btn" data-rm-draft="${i}">rimuovi</button></div>`).join("");$$("[data-rm-draft]").forEach(b=>b.onclick=()=>{draftCompetitions.splice(+b.dataset.rmDraft,1);renderDrafts()})}
function renderWizardOpponents(){$("#wizardOpponents").innerHTML=opponents.map(o=>`<label class="choice"><input type="checkbox" value="${o.id}" ${wizardOpponentIds.has(o.id)?"checked":""}> <span>${esc(o.name)}</span></label>`).join("");$("#wizardOpponents").querySelectorAll("input").forEach(i=>i.onchange=()=>i.checked?wizardOpponentIds.add(i.value):wizardOpponentIds.delete(i.value))}
$("#quickOpponentBtn").onclick=()=>openOpponent();

function openWizard(existing=null,competitionOnly=false){
  wizardStep=competitionOnly?2:1;draftCompetitions=[];wizardOpponentIds=new Set();$("#wizardForm").reset();refreshFormat();renderDrafts();
  if(existing&&!competitionOnly){$("#wSeasonName").value=existing.name;$("#wSeasonStart").value=existing.start_date||"";$("#wSeasonEnd").value=existing.end_date||"";$("#wSeasonStatus").value=existing.status;$("#wizardForm").dataset.editId=existing.id}else delete $("#wizardForm").dataset.editId;
  $("#wizardForm").dataset.competitionOnly=competitionOnly?"1":"0";showWizardStep();$("#seasonWizard").showModal();
}
$("#newSeasonBtn").onclick=()=>openWizard();
$$("[data-close-wizard]").forEach(b=>b.onclick=()=>$("#seasonWizard").close());
$("#wizardBack").onclick=()=>{if(wizardStep>1){wizardStep--;showWizardStep()}};
$("#wizardNext").onclick=async()=>{if(!validateStep())return;if(wizardStep<5){wizardStep++;showWizardStep();return}await saveWizard()};
function validateStep(){
  $("#wizardError").classList.add("hidden");
  if(wizardStep===1){if(!$("#wSeasonName").value.trim()||!$("#wSeasonStart").value||!$("#wSeasonEnd").value)return wErr("Completa l'annata.");if($("#wSeasonEnd").value<$("#wSeasonStart").value)return wErr("La data di fine deve essere successiva.");}
  if(wizardStep===2&&draftCompetitions.length===0){const n=$("#wCompetitionName").value.trim();if(n){draftCompetitions.push(readCompetitionDraft());renderDrafts()}else return wErr("Aggiungi almeno una competizione.");}
  return true;
}
function wErr(t){$("#wizardError").textContent=t;$("#wizardError").classList.remove("hidden");return false}
function showWizardStep(){
  $$(".wizard-step").forEach(s=>s.classList.toggle("hidden",+s.dataset.step!==wizardStep));$$(".steps i").forEach((i,n)=>i.classList.toggle("on",n<wizardStep));
  const labels=["Annata","Competizioni","Avversarie","Calendario","Riepilogo"];$("#wizardStepLabel").textContent=`${wizardStep}/5 · ${labels[wizardStep-1]}`;
  $("#wizardBack").style.visibility=wizardStep===1?"hidden":"visible";$("#wizardNext").textContent=wizardStep===5?"Salva":"Avanti";
  if(wizardStep===3)renderWizardOpponents();if(wizardStep===5)renderSummary();
}
function renderSummary(){
  const season=$("#wizardForm").dataset.competitionOnly==="1"?currentSeason:{name:$("#wSeasonName").value,start_date:$("#wSeasonStart").value,end_date:$("#wSeasonEnd").value};
  $("#wizardSummary").innerHTML=`<div class="summary-block"><strong>${esc(season?.name||"")}</strong>${esc(season?.start_date||"")} → ${esc(season?.end_date||"")}</div><div class="summary-block"><strong>Competizioni</strong>${draftCompetitions.map(c=>esc(c.name)).join(" · ")}</div><div class="summary-block"><strong>Avversarie</strong>${wizardOpponentIds.size} selezionate</div>`;
}
async function saveWizard(){
  $("#wizardNext").disabled=true;
  try{
    let seasonId=$("#wizardForm").dataset.editId||($("#wizardForm").dataset.competitionOnly==="1"?currentSeason?.id:null);
    if($("#wizardForm").dataset.competitionOnly!=="1"){
      const p={name:$("#wSeasonName").value.trim(),start_date:$("#wSeasonStart").value,end_date:$("#wSeasonEnd").value,status:$("#wSeasonStatus").value,team_id:currentSeason?.team_id||seasons[0]?.team_id};
      let r;if(seasonId)r=await db.from("app_seasons").update(p).eq("id",seasonId).select().single();else r=await db.from("app_seasons").insert(p).select().single();if(r.error)throw r.error;seasonId=r.data.id;
    }
    for(const c of draftCompetitions){
      const r=await db.from("app_competitions").insert({...c,season_id:seasonId}).select().single();if(r.error)throw r.error;
      if(wizardOpponentIds.size){const rows=[...wizardOpponentIds].map(opponent_id=>({competition_id:r.data.id,opponent_id}));const j=await db.from("app_competition_opponents").insert(rows);if(j.error)throw j.error}
    }
    $("#seasonWizard").close();await loadAll();await loadCompetitions();
  }catch(e){wErr(e.message||String(e))}
  finally{$("#wizardNext").disabled=false}
}

function compKindLabel(kind){return kind==="league"?"Campionato":kind==="cup"?"Coppa":"Amichevoli"}
function compFormatLabel(format){
  const all=[...competitionFormats("league"),...competitionFormats("cup"),...competitionFormats("friendly")];
  return all.find(x=>x[0]===format)?.[1]||format||"—";
}
function localDateTime(v){
  if(!v)return "—";
  return new Intl.DateTimeFormat("it-IT",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
}
function isOwnTeamName(name){
  const n=String(name||"").toLowerCase().replace(/['’._-]/g," ").replace(/\s+/g," ").trim();
  const t=String(team?.name||"calcio caselle").toLowerCase().replace(/['’._-]/g," ").replace(/\s+/g," ").trim();
  return n.includes("calcio caselle")||t.includes(n)||n.includes(t);
}
function updateAppBrand(){
  if(!team)return;
  $("#sideTeamName").textContent=team.name||"Squadra";
  $("#sideTeamLogo").innerHTML=team.logo_url?`<img src="${esc(team.logo_url)}" alt="">`:(team.short_name||"TM");
}
async function ensureMainTeam(){
  if(team||!currentSeason)return;
  const r=await db.from("teams").select("id,name,short_name,logo_url,primary_color,secondary_color,accent_color").eq("id",currentSeason.team_id).maybeSingle();
  if(!r.error){team=r.data;updateAppBrand()}
}
function normalizeTeamName(value){
  return String(value||"").toLowerCase().replace(/['’._-]/g," ").replace(/\b(amatori|calcio|spd|d g|asd|a s d)\b/g," ").replace(/\s+/g," ").trim();
}
function fixtureOpponent(name){
  const n=normalizeTeamName(name);
  return opponents.find(o=>{
    const x=normalizeTeamName(o.name);
    return x===n||x.includes(n)||n.includes(x);
  })||null;
}
function teamVisual(name){
  if(isOwnTeamName(name))return {name:team?.name||name,short:(team?.short_name||"CAS").slice(0,3).toUpperCase(),logo:team?.logo_url||null};
  const o=fixtureOpponent(name);
  return {name:o?.name||name,short:(o?.short_name||String(name).slice(0,3)).toUpperCase(),logo:o?.logo_url||null};
}
function compactTeamHtml(name){
  const t=teamVisual(name);
  return `<span class="mini-team" title="${esc(t.name)}">${t.logo?`<img src="${esc(t.logo)}" alt="">`:`<i>${esc(t.short)}</i>`}<b>${esc(t.short)}</b></span>`;
}
async function loadCompetitionHub(){
  await loadCompetitions();
  await ensureMainTeam();
  const tabs=$("#competitionHubTabs");

  if(!competitions.length){
    tabs.innerHTML="";
    $("#competitionStandings").innerHTML='<div class="muted">Nessuna competizione.</div>';
    $("#competitionFixtures").innerHTML="";
    syncCompetitionViewportHeight();
    return;
  }

  competitionHubId=competitions.some(c=>c.id===competitionHubId)?competitionHubId:competitions[0].id;
  tabs.innerHTML=competitions.map(c=>`
    <button type="button"
      class="segment competition-tab ${c.id===competitionHubId?"active":""}"
      data-competition-hub="${c.id}"
      role="tab"
      aria-selected="${c.id===competitionHubId?"true":"false"}">${esc(c.name)}</button>
  `).join("");

  $$("[data-competition-hub]").forEach(b=>b.onclick=async()=>{
    if(b.dataset.competitionHub===competitionHubId)return;
    competitionHubId=b.dataset.competitionHub;
    $$("[data-competition-hub]").forEach(x=>{
      const active=x.dataset.competitionHub===competitionHubId;
      x.classList.toggle("active",active);
      x.setAttribute("aria-selected",active?"true":"false");
    });
    await renderCompetitionHub();
  });

  await renderCompetitionHub();
  syncCompetitionViewportHeight();
}
$$("[data-comp-fixture-filter]").forEach(b=>b.onclick=()=>{
  competitionFixtureFilter=b.dataset.compFixtureFilter;
  $$("[data-comp-fixture-filter]").forEach(x=>x.classList.toggle("active",x===b));
  renderCompetitionFixtures(window.__competitionFixtureRows||[]);
});
async function renderCompetitionHub(){
  const c=competitions.find(x=>x.id===competitionHubId);if(!c)return;
  const [st,fx]=await Promise.all([
    db.from("app_competition_standings").select("*").eq("season_id",currentSeason.id).eq("competition_id",c.id),
    db.from("app_competition_fixtures").select("*").eq("season_id",currentSeason.id).eq("competition_id",c.id).order("kickoff_at",{ascending:true})
  ]);
  if(st.error)$("#competitionStandings").innerHTML='<div class="form-error">Classifica non disponibile.</div>';
  else renderStandings(st.data||[]);
  if(fx.error)$("#competitionFixtures").innerHTML='<div class="form-error">Calendario non disponibile.</div>';
  else{
    window.__competitionFixtureRows=fx.data||[];
    renderCompetitionFixtures(window.__competitionFixtureRows);
  }
  if(!st.error&&!fx.error)renderCompetitionProjection(st.data||[],fx.data||[],c);
  else{
    $("#competitionProjection").innerHTML='<div class="muted">Proiezione non disponibile.</div>';
    $("#projectionReliability").textContent="";
    const meta=$("#projectionScenarioMeta");if(meta)meta.textContent="";
  }
  syncCompetitionViewportHeight();
}
function syncCompetitionViewportHeight(){
  const view=$("#competitionsView");
  const main=$(".main");
  if(!view||!main||view.classList.contains("hidden"))return;

  const viewTop=view.getBoundingClientRect().top;
  const mainBottom=main.getBoundingClientRect().bottom;
  const reservedBottom=10;
  const available=Math.max(420,Math.floor(mainBottom-viewTop-reservedBottom));

  view.style.setProperty("--competition-view-height",available+"px");
}
window.addEventListener("resize",syncCompetitionViewportHeight);

function renderStandings(rows){
  const sorted=[...rows].sort((a,b)=>b.points-a.points||b.goal_difference-a.goal_difference||b.goals_for-a.goals_for||String(a.team).localeCompare(String(b.team),"it"));
  $("#competitionStandings").innerHTML=sorted.length?`<div class="standings-wrap"><table class="standings-table">
    <thead><tr><th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Pt</th></tr></thead>
    <tbody>${sorted.map((r,i)=>`<tr class="${isOwnTeamName(r.team)?"own-team":""}">
      <td>${i+1}</td>
      <td><span class="standing-team">${dashboardTeamBadge(r.team)}<span>${esc(r.team)}</span></span></td>
      <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
      <td>${r.goals_for}</td><td>${r.goals_against}</td><td>${r.goal_difference>0?"+":""}${r.goal_difference}</td>
      <td><strong>${r.points}</strong></td>
    </tr>`).join("")}</tbody>
  </table></div>`:'<div class="muted">Classifica non disponibile.</div>';
}


function clamp01(v){return Math.max(0,Math.min(1,v))}
function normalizeRange(v,min,max){
  if(!Number.isFinite(v)||!Number.isFinite(min)||!Number.isFinite(max)||max===min)return .5;
  return clamp01((v-min)/(max-min));
}
function seededRandom(seed){
  let s=seed>>>0;
  return ()=>{
    s=(s+0x6D2B79F5)>>>0;
    let t=s;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function stableHash(text){
  let h=2166136261;
  for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function teamProjectionModel(standings,fixtures,competition){
  const teams=standings.map(r=>r.team);
  const rowByTeam=new Map(standings.map(r=>[r.team,r]));
  const finished=fixtures
    .filter(f=>f.status==="finished"&&Number.isFinite(Number(f.home_score))&&Number.isFinite(Number(f.away_score)))
    .sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
  const remaining=fixtures.filter(f=>f.status!=="finished");
  const winPts=Number(competition?.win_points??3),drawPts=Number(competition?.draw_points??1),lossPts=Number(competition?.loss_points??0);

  const stats=new Map(teams.map(t=>[t,{recent:[],home:{p:0,pts:0},away:{p:0,pts:0}}]));
  const pointsFor=(gf,ga)=>gf>ga?winPts:gf===ga?drawPts:lossPts;

  finished.forEach(f=>{
    const hg=Number(f.home_score),ag=Number(f.away_score);
    if(stats.has(f.home_team)){
      const s=stats.get(f.home_team),pts=pointsFor(hg,ag);
      s.recent.push({date:new Date(f.kickoff_at).getTime(),pts});
      s.home.p++;s.home.pts+=pts;
    }
    if(stats.has(f.away_team)){
      const s=stats.get(f.away_team),pts=pointsFor(ag,hg);
      s.recent.push({date:new Date(f.kickoff_at).getTime(),pts});
      s.away.p++;s.away.pts+=pts;
    }
  });

  const raw=teams.map(team=>{
    const r=rowByTeam.get(team)||{};
    const played=Math.max(0,Number(r.played||0));
    const seasonPPG=played?Number(r.points||0)/(played*Math.max(1,winPts)):0;

    const recent=(stats.get(team)?.recent||[]).sort((a,b)=>b.date-a.date).slice(0,5);
    let wsum=0,psum=0;
    recent.forEach((x,i)=>{const w=5-i;wsum+=w;psum+=w*(x.pts/Math.max(1,winPts))});
    const form=wsum?psum/wsum:seasonPPG;

    const gfpg=played?Number(r.goals_for||0)/played:0;
    const gapg=played?Number(r.goals_against||0)/played:0;
    const gdpg=played?Number(r.goal_difference||0)/played:0;
    const venue=stats.get(team)||{home:{p:0,pts:0},away:{p:0,pts:0}};
    const homePerf=venue.home.p?venue.home.pts/(venue.home.p*Math.max(1,winPts)):seasonPPG;
    const awayPerf=venue.away.p?venue.away.pts/(venue.away.p*Math.max(1,winPts)):seasonPPG;

    return {team,seasonPPG,form,gfpg,gapg,gdpg,homePerf,awayPerf,currentPoints:Number(r.points||0),currentRank:0,played};
  });

  const minsMaxes={};
  for(const key of ["gfpg","gapg","gdpg"]){
    const vals=raw.map(x=>x[key]);
    minsMaxes[key]=[Math.min(...vals),Math.max(...vals)];
  }

  raw.forEach(x=>{
    const attack=normalizeRange(x.gfpg,...minsMaxes.gfpg);
    const defense=1-normalizeRange(x.gapg,...minsMaxes.gapg);
    const gd=normalizeRange(x.gdpg,...minsMaxes.gdpg);
    const venue=(x.homePerf+x.awayPerf)/2;
    x.strength=clamp01(.30*x.seasonPPG+.25*x.form+.20*gd+.10*attack+.10*defense+.05*venue);
  });

  const sortedCurrent=[...standings].sort((a,b)=>b.points-a.points||b.goal_difference-a.goal_difference||b.goals_for-a.goals_for||String(a.team).localeCompare(String(b.team),"it"));
  sortedCurrent.forEach((r,i)=>{const x=raw.find(t=>t.team===r.team);if(x)x.currentRank=i+1});

  const modelByTeam=new Map(raw.map(x=>[x.team,x]));
  const simCount=4000;
  const rng=seededRandom(stableHash((competition?.id||"competition")+"|"+(currentSeason?.id||"season")));
  const rankSamples=new Map(teams.map(t=>[t,[]]));
  const pointSamples=new Map(teams.map(t=>[t,[]]));

  for(let sim=0;sim<simCount;sim++){
    const simRows=raw.map(x=>({team:x.team,points:x.currentPoints,strength:x.strength}));
    const simMap=new Map(simRows.map(x=>[x.team,x]));

    remaining.forEach(f=>{
      const home=modelByTeam.get(f.home_team),away=modelByTeam.get(f.away_team);
      if(!home||!away)return;

      const hs=clamp01(.95*home.strength+.05*home.homePerf);
      const as=clamp01(.95*away.strength+.05*away.awayPerf);
      const diff=hs-as+.035;
      const drawProb=Math.max(.16,Math.min(.30,.27-Math.abs(diff)*.14));
      const homeShare=1/(1+Math.exp(-4.2*diff));
      const homeProb=(1-drawProb)*homeShare;
      const roll=rng();

      if(roll<homeProb){
        simMap.get(f.home_team).points+=winPts;
        simMap.get(f.away_team).points+=lossPts;
      }else if(roll<homeProb+drawProb){
        simMap.get(f.home_team).points+=drawPts;
        simMap.get(f.away_team).points+=drawPts;
      }else{
        simMap.get(f.home_team).points+=lossPts;
        simMap.get(f.away_team).points+=winPts;
      }
    });

    simRows.sort((a,b)=>b.points-a.points||b.strength-a.strength||String(a.team).localeCompare(String(b.team),"it"));
    simRows.forEach((r,i)=>{rankSamples.get(r.team).push(i+1);pointSamples.get(r.team).push(r.points)});
  }

  const percentile=(arr,p)=>{
    const a=[...arr].sort((x,y)=>x-y);
    if(!a.length)return 0;
    return a[Math.max(0,Math.min(a.length-1,Math.round((a.length-1)*p)))];
  };

  const projected=raw.map(x=>{
    const ranks=rankSamples.get(x.team),pts=pointSamples.get(x.team);
    const avgRank=ranks.reduce((a,b)=>a+b,0)/ranks.length;
    const avgPts=pts.reduce((a,b)=>a+b,0)/pts.length;
    return {...x,avgRank,avgPts,rankLow:percentile(ranks,.2),rankHigh:percentile(ranks,.8)};
  }).sort((a,b)=>a.avgRank-b.avgRank||b.avgPts-a.avgPts);

  const totalTeamGames=Math.max(1,fixtures.length*2);
  const playedTeamGames=finished.length*2;
  const progress=clamp01(playedTeamGames/totalTeamGames);
  const avgPlayed=raw.length?raw.reduce((a,b)=>a+b.played,0)/raw.length:0;
  const depth=clamp01(avgPlayed/5);
  const reliability=Math.round(8+progress*62+depth*25);

  return {projected,reliability:Math.min(95,reliability),remaining:remaining.length,simCount};
}

function projectionWindow(rows,size=5){
  if(rows.length<=size)return rows;
  const own=rows.findIndex(r=>isOwnTeamName(r.team));
  if(own<0)return rows.slice(0,size);
  let start=own-2,end=own+3;
  if(start<0){end=Math.min(rows.length,end-start);start=0}
  if(end>rows.length){start=Math.max(0,start-(end-rows.length));end=rows.length}
  return rows.slice(start,end);
}

function renderCompetitionProjection(standings,fixtures,competition){
  const box=$("#competitionProjection"),rel=$("#projectionReliability"),meta=$("#projectionScenarioMeta");
  if(!box||!rel||!meta)return;
  if(!standings.length){
    box.innerHTML='<div class="muted">Dati insufficienti.</div>';
    rel.textContent="";
    meta.textContent="";
    return;
  }

  const model=teamProjectionModel(standings,fixtures,competition);
  const rows=projectionWindow(model.projected,5);
  const reliabilityLabel=model.reliability<25?"molto bassa":model.reliability<45?"bassa":model.reliability<65?"media":model.reliability<82?"buona":"alta";
  rel.textContent=`Affidabilità ${reliabilityLabel} · ${model.reliability}%`;
  meta.textContent=`${model.remaining} partite · ${model.simCount.toLocaleString("it-IT")} scenari`;

  box.innerHTML=`<table class="projection-table">
      <thead><tr><th>Prev.</th><th>Squadra</th><th>Δ</th><th>Pt</th><th>Range</th></tr></thead>
      <tbody>${rows.map((r,i)=>{
        const projectedRank=model.projected.indexOf(r)+1;
        const delta=r.currentRank-projectedRank;
        const arrow=delta>0?"↑":delta<0?"↓":"–";
        const cls=delta>0?"up":delta<0?"down":"flat";
        return `<tr class="${isOwnTeamName(r.team)?"own-team":""}">
          <td><strong>${projectedRank}</strong></td>
          <td><span class="projection-team">${dashboardTeamBadge(r.team)}<span>${esc(r.team)}</span></span></td>
          <td class="projection-delta ${cls}">${arrow}${delta?Math.abs(delta):""}</td>
          <td>${r.avgPts.toFixed(1)}</td>
          <td>${r.rankLow===r.rankHigh?r.rankLow+"°":r.rankLow+"°–"+r.rankHigh+"°"}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;

  const info=$("#projectionInfoBtn");
  if(info)info.onclick=()=>alert(
    "Proiezione statistica, non previsione certa.\n\n"+
    "Forza squadra: 30% rendimento stagione, 25% forma recente, 20% differenza reti, 10% attacco, 10% difesa, 5% rendimento casa/trasferta. "+
    "Le partite rimanenti vengono simulate 4.000 volte con probabilità derivate dalla forza relativa. "+
    "L'affidabilità è un indicatore euristico che cresce con il numero di partite disputate."
  );
}

function renderCompetitionFixtures(rows){
  const source=competitionFixtureFilter==="mine"?rows.filter(r=>isOwnTeamName(r.home_team)||isOwnTeamName(r.away_team)):rows;
  const grouped=new Map();
  source.forEach(r=>{if(!grouped.has(r.round_no))grouped.set(r.round_no,[]);grouped.get(r.round_no).push(r)});
  const rounds=[...grouped.entries()].sort((a,b)=>a[0]-b[0]);
  const roundCount=Math.max(1,rounds.length);
  const maxMatches=Math.max(1,...rounds.map(([,list])=>list.length));
  const grid=$("#competitionFixtures");
  grid.style.setProperty("--round-count",roundCount);grid.style.setProperty("--max-matches",maxMatches);
  grid.classList.toggle("dense-rounds",roundCount>10||maxMatches>6);grid.classList.toggle("overflow-rounds",roundCount>16);
  grid.innerHTML=`<div class="round-grid">${rounds.map(([round,list])=>`<section class="mini-round"><div class="mini-round-label">${round}</div>${list.map(r=>{
    const own=isOwnTeamName(r.home_team)||isOwnTeamName(r.away_team);
    const score=r.status==="finished"?esc(r.home_score)+"-"+esc(r.away_score):"–";
    return `<div class="mini-fixture ${own?"own-fixture mc-openable":""}" ${own?`data-match-center="${r.id}"`:""}>${compactTeamHtml(r.home_team)}<button type="button" class="score-link" ${own?`data-match-center-score="${r.id}"`:`data-fixture-score="${r.id}"`}>${score}</button>${compactTeamHtml(r.away_team)}</div>`;
  }).join("")}</section>`).join("")}</div>`||'<div class="muted">Calendario non disponibile.</div>';
  $$("[data-fixture-score]").forEach(b=>b.onclick=()=>openFixture(rows.find(r=>r.id===b.dataset.fixtureScore)));
  $$("[data-match-center-score]").forEach(b=>b.onclick=e=>{e.stopPropagation();openMatchDetail(rows.find(r=>r.id===b.dataset.matchCenterScore))});
  $$("[data-match-center]").forEach(row=>row.onclick=e=>{if(e.target.closest("button"))return;openMatchDetail(rows.find(r=>r.id===row.dataset.matchCenter))});
}

function toLocalInputValue(value){
  if(!value)return "";
  const d=new Date(value);
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fixtureStatusLabel(status){
  return status==="finished"?"Conclusa":status==="postponed"?"Rinviata":status==="cancelled"?"Annullata":"Programmata";
}
function linkedMatchForFixture(f){
  if(!f)return null;
  const fixtureTime=new Date(f.kickoff_at).getTime();
  const oppName=isOwnTeamName(f.home_team)?f.away_team:f.home_team;
  const opp=fixtureOpponent(oppName);
  return teamMatches.find(m=>
    m.competition_id===f.competition_id &&
    new Date(m.kickoff_at).getTime()===fixtureTime &&
    (!opp||m.opponent_id===opp.id)
  )||null;
}
async function loadCalendarHub(){
  await loadCompetitions();
  await ensureMainTeam();
  const [fx,matchesResult,playersResult]=await Promise.all([
    db.from("app_competition_fixtures").select("*").eq("season_id",currentSeason.id).order("kickoff_at",{ascending:true}),
    db.from("app_matches").select("*").eq("season_id",currentSeason.id).order("kickoff_at",{ascending:true}),
    db.from("players").select("id,first_name,last_name").eq("team_id",currentSeason.team_id).order("last_name",{ascending:true})
  ]);
  if(fx.error){
    $("#calendarHubMeta").textContent="Calendario non disponibile.";
    $("#calendarHubList").innerHTML="";
    return;
  }
  calendarRows=(fx.data||[]).filter(r=>isOwnTeamName(r.home_team)||isOwnTeamName(r.away_team));
  teamMatches=matchesResult.data||[];
  players=playersResult.data||[];
  if(!calendarCompetitionIds.size)competitions.forEach(c=>calendarCompetitionIds.add(c.id));
  renderCalendarCompetitionFilters();
  renderCalendarRows();
}
function renderCalendarCompetitionFilters(){
  $("#calendarCompetitionFilters").innerHTML=competitions.map(c=>`<label class="competition-filter"><input type="checkbox" value="${c.id}" ${calendarCompetitionIds.has(c.id)?"checked":""}><span>${esc(c.name)}</span></label>`).join("");
  $("#calendarCompetitionFilters").querySelectorAll("input").forEach(i=>i.onchange=()=>{
    if(i.checked)calendarCompetitionIds.add(i.value);else calendarCompetitionIds.delete(i.value);
    renderCalendarRows();
  });
}
function renderCalendarRows(){
  const rows=calendarRows.filter(r=>calendarCompetitionIds.has(r.competition_id));
  $("#calendarHubMeta").textContent=`${rows.length} partite del Caselle`;
  $("#calendarHubList").innerHTML=rows.map(r=>{
    const competition=competitions.find(c=>c.id===r.competition_id);
    const home=teamVisual(r.home_team);
    const away=teamVisual(r.away_team);
    const score=r.status==="finished"?`${r.home_score} - ${r.away_score}`:"–";
    const venue=(r.venue||"").trim();

    const homeLogo=home.logo
      ?`<img src="${esc(home.logo)}" alt="">`
      :`<i>${esc(home.short)}</i>`;
    const awayLogo=away.logo
      ?`<img src="${esc(away.logo)}" alt="">`
      :`<i>${esc(away.short)}</i>`;

    return `<article class="team-calendar-row mc-openable" data-match-center="${r.id}">
      <div class="team-calendar-meta">
        <span class="team-calendar-date">${localDateTime(r.kickoff_at)}</span>
        <span class="team-calendar-competition">${esc(competition?.name||"")}</span>
      </div>

      <div class="calendar-match-line">
        <strong class="calendar-team-name calendar-home-team">${esc(home.name)}</strong>
        <span class="calendar-team-logo">${homeLogo}</span>
        <button type="button" class="score-link calendar-score" data-match-score="${r.id}">${score}</button>
        <span class="calendar-team-logo">${awayLogo}</span>
        <strong class="calendar-team-name calendar-away-team">${esc(away.name)}</strong>
      </div>

      <div class="calendar-venue" title="${esc(venue||"Indirizzo non indicato")}">${esc(venue||"—")}</div>
    </article>`;
  }).join("")||'<div class="muted">Nessuna partita con i filtri selezionati.</div>';

  $("[data-match-score]").forEach(b=>b.onclick=e=>{e.stopPropagation();openMatchDetail(calendarRows.find(r=>r.id===b.dataset.matchScore))});
  $("#calendarHubList [data-match-center]").forEach(row=>row.onclick=e=>{if(e.target.closest("button"))return;openMatchDetail(calendarRows.find(r=>r.id===row.dataset.matchCenter))});
}

function playerOptions(selected){
  return '<option value="">—</option>'+players.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.last_name+" "+p.first_name)}</option>`).join("");
}
let matchCenterState={fixture:null,match:null,matchPlayers:[],events:[],injuries:[],suspensions:[],tab:"general"};
let matchCenterTimer=null;
function mcPlayer(id){return rosterRows.find(p=>p.player_id===id)||players.find(p=>p.id===id)||null}
function mcPlayerName(id){const p=mcPlayer(id);return p?(p.last_name+" "+p.first_name):"—"}
function mcMatchPlayer(id){return matchCenterState.matchPlayers.find(x=>x.player_id===id)||null}
function mcIsPost(){return matchCenterState.fixture?.status==="finished"||matchCenterState.match?.status==="finished"||!!matchCenterState.match?.finalized_at}
function mcIsLive(){const m=matchCenterState.match;return !!(m&&m.live_started_at&&!m.finalized_at&&m.status!=="finished")}
function mcSetTab(tab){matchCenterState.tab=tab;$$("[data-mc-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mcTab===tab));$$("[data-mc-panel]").forEach(p=>p.classList.toggle("hidden",p.dataset.mcPanel!==tab));if(tab==="events")mcRefreshComposer()}
function mcHeader(){
  const f=matchCenterState.fixture,m=matchCenterState.match,home=teamVisual(f.home_team),away=teamVisual(f.away_team),c=competitions.find(x=>x.id===f.competition_id);
  $("#mcHomeName").textContent=home.name;$("#mcAwayName").textContent=away.name;
  $("#mcHomeLogo").innerHTML=home.logo?`<img src="${esc(home.logo)}" alt="">`:`<span>${esc(home.short)}</span>`;
  $("#mcAwayLogo").innerHTML=away.logo?`<img src="${esc(away.logo)}" alt="">`:`<span>${esc(away.short)}</span>`;
  $("#mcScore").textContent=(f.home_score!=null||f.away_score!=null)?`${f.home_score??0} - ${f.away_score??0}`:"–";
  $("#mcMeta").textContent=[c?.name,localDateTime(f.kickoff_at),f.venue].filter(Boolean).join(" · ");
  $("#mcState").textContent=mcIsLive()?"LIVE":mcIsPost()?"FINALE":"PRE";$("#mcLiveControls").classList.toggle("hidden",!m||mcIsPost());
  clearInterval(matchCenterTimer);const timer=$("#mcTimer");
  if(mcIsLive()){timer.classList.remove("hidden");const tick=()=>{const sec=Math.max(0,Math.floor((Date.now()-new Date(m.live_started_at).getTime())/1000));timer.textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")};tick();matchCenterTimer=setInterval(tick,1000)}else timer.classList.add("hidden");
}
function mcInjury(id){const d=new Date(matchCenterState.fixture.kickoff_at).toISOString().slice(0,10);return matchCenterState.injuries.find(x=>x.player_id===id&&(!x.injury_date||x.injury_date<=d)&&(!x.actual_return||x.actual_return>=d)&&!["closed","resolved","recovered"].includes(String(x.status||"").toLowerCase()))||null}
function mcSuspension(id){const d=new Date(matchCenterState.fixture.kickoff_at).toISOString().slice(0,10),comp=matchCenterState.fixture.competition_id;return matchCenterState.suspensions.find(x=>x.player_id===id&&(!x.competition_id||x.competition_id===comp)&&!["served","closed","completed"].includes(String(x.status||"").toLowerCase())&&(!x.start_date||x.start_date<=d)&&(!x.end_date||x.end_date>=d)&&!(Number(x.matches_count||0)>0&&Number(x.matches_served||0)>=Number(x.matches_count||0)))||null}
function mcActiveIds(minute){
  if(minute===""||minute==null)return new Set(rosterRows.map(p=>p.player_id));
  const m=Number(minute),active=new Set(matchCenterState.matchPlayers.filter(x=>x.started).map(x=>x.player_id));
  matchCenterState.events.filter(e=>e.minute!=null&&Number(e.minute)<m).sort((a,b)=>Number(a.minute)-Number(b.minute)).forEach(e=>{if(e.team_side!=="team")return;if(e.event_type==="substitution"){if(e.player_id)active.delete(e.player_id);if(e.secondary_player_id)active.add(e.secondary_player_id)}if(e.event_type==="red_card"&&e.player_id)active.delete(e.player_id)});
  return active;
}
function mcEligible(kind,minute,side){
  if(side==="opponent")return [];if(minute==="")return rosterRows;
  if(kind==="card")return rosterRows.filter(p=>{const mp=mcMatchPlayer(p.player_id);return !!(mp&&(mp.started||mp.selection_status==="bench"))});
  const active=mcActiveIds(minute);
  if(kind==="incoming"){const exited=new Set(matchCenterState.events.filter(e=>e.team_side==="team"&&e.minute!=null&&Number(e.minute)<Number(minute)&&(e.event_type==="substitution"||e.event_type==="red_card")).map(e=>e.player_id));return rosterRows.filter(p=>{const mp=mcMatchPlayer(p.player_id);return mp?.selection_status==="bench"&&!active.has(p.player_id)&&!exited.has(p.player_id)})}
  return rosterRows.filter(p=>active.has(p.player_id));
}
function mcOptions(rows,empty){return `<option value="">${empty}</option>`+rows.map(p=>`<option value="${p.player_id}">${esc(p.last_name+" "+p.first_name)}</option>`).join("")}
function mcReasonOptions(v){return [["","Nessun motivo"],["work","Lavoro"],["travel","Viaggio"],["personal","Personale"],["technical","Scelta tecnica"],["other","Altro"]].map(([x,l])=>`<option value="${x}" ${x===(v||"")?"selected":""}>${l}</option>`).join("")}
function mcGoalInfo(){const f=matchCenterState.fixture,ownHome=isOwnTeamName(f.home_team),team=matchCenterState.events.filter(e=>e.event_type==="goal"&&e.team_side==="team").length,opp=matchCenterState.events.filter(e=>e.event_type==="goal"&&e.team_side==="opponent").length;return {team,opp,expectedTeam:Number(ownHome?f.home_score:f.away_score)||0,expectedOpp:Number(ownHome?f.away_score:f.home_score)||0}}
function mcPitch(target,rows,remove){const pos=[[50,90],[25,72],[42,72],[58,72],[75,72],[18,50],[39,50],[61,50],[82,50],[38,26],[62,26]];target.innerHTML=rows.slice(0,11).map((x,i)=>{const p=mcPlayer(x.player_id),q=pos[i]||[50,50];return `<div class="pitch-player" style="left:${q[0]}%;top:${q[1]}%"><span>${x.shirt_number??p?.shirt_number??"–"}</span><strong>${esc(p?.last_name||"—")}</strong>${remove?`<button type="button" data-mc-unassign="${x.player_id}">×</button>`:""}</div>`}).join("")}
function mcTimeline(target,limit){let rows=[...matchCenterState.events].sort((a,b)=>(a.minute??999)-(b.minute??999));if(limit)rows=rows.slice(-limit);$(target).innerHTML=rows.length?rows.map(e=>{let d=e.team_side==="opponent"?"Avversario":mcPlayerName(e.player_id);if(e.event_type==="substitution")d=`🔴 ${mcPlayerName(e.player_id)}${e.secondary_player_id?` · 🟢 ${mcPlayerName(e.secondary_player_id)}`:" · nessun ingresso"}`;if(e.event_type==="goal"&&e.secondary_player_id)d+=` · assist ${mcPlayerName(e.secondary_player_id)}`;if(e.event_type==="red_card"&&e.team_side==="opponent")d="Espulsione avversaria";const icon=e.event_type==="goal"?"⚽":e.event_type==="substitution"?"↔":e.event_type==="yellow_card"?"🟨":"🟥";return `<div class="mc-event-row"><time>${e.minute==null?"–":e.minute+(e.stoppage_minute?`+${e.stoppage_minute}`:"")+"'"}</time><span>${icon}</span><div><strong>${esc(e.event_type)}</strong><small>${esc(d)}</small></div></div>`}).join(""):'<div class="empty-state">Nessun evento</div>'}
function mcRenderGeneral(){const starters=matchCenterState.matchPlayers.filter(x=>x.started),bench=matchCenterState.matchPlayers.filter(x=>x.selection_status==="bench");$("#mcGeneralFormationMeta").textContent=(matchCenterState.match?.formation||"—")+" · "+starters.length+" XI";mcPitch($("#mcGeneralPitch"),starters,false);$("#mcGeneralBench").innerHTML=bench.length?bench.map(x=>`<span>${esc(mcPlayerName(x.player_id))}</span>`).join(""):'<span class="muted">Panchina vuota</span>';mcTimeline("#mcGeneralEvents",6);const g=mcGoalInfo();$("#mcGoalProgress").textContent=mcIsPost()?`CAS ${g.team}/${g.expectedTeam} · AVV ${g.opp}/${g.expectedOpp}`:`${g.team}-${g.opp}`;const checks=[];if(mcIsPost()){checks.push([g.team===g.expectedTeam,`Gol Caselle ${g.team}/${g.expectedTeam}`]);checks.push([g.opp===g.expectedOpp,`Gol avversari ${g.opp}/${g.expectedOpp}`])}checks.push([!matchCenterState.events.some(e=>e.event_type==="substitution"&&e.secondary_player_id&&!e.player_id),"Cambi coerenti"]);$("#mcIntegrity").innerHTML=checks.map(([ok,t])=>`<div class="${ok?"ok":"warn"}"><span>${ok?"✓":"!"}</span>${esc(t)}</div>`).join("")}
function mcRenderAvailability(){$("#mcAvailabilityList").innerHTML=rosterRows.map(p=>{const mp=mcMatchPlayer(p.player_id),inj=mcInjury(p.player_id),sus=mcSuspension(p.player_id);return `<div class="mc-availability-row" data-mc-avail="${p.player_id}"><div><strong>${esc(p.last_name+" "+p.first_name)}</strong><small>#${p.shirt_number??"–"} · ${roleLabel(p.generic_role_manual)}</small></div><div class="mc-badges">${inj?'<span class="inj">Infortunato</span>':""}${sus?'<span class="sus">Squalificato</span>':""}</div><select data-reason>${mcReasonOptions(mp?.unavailability_reason||"")}</select><input data-note value="${esc(mp?.unavailability_note||"")}" placeholder="Nota"><button type="button" class="secondary" data-save-avail="${p.player_id}">Salva</button></div>`}).join("");$$("[data-save-avail]").forEach(b=>b.onclick=()=>mcSaveAvailability(b.dataset.saveAvail))}
function mcRenderFormation(){const starters=matchCenterState.matchPlayers.filter(x=>x.started),bench=matchCenterState.matchPlayers.filter(x=>x.selection_status==="bench"),assigned=new Set([...starters,...bench].map(x=>x.player_id)),unavailable=new Set(matchCenterState.matchPlayers.filter(x=>x.selection_status==="unavailable"||x.unavailability_reason).map(x=>x.player_id)),pool=rosterRows.filter(p=>!assigned.has(p.player_id)&&!unavailable.has(p.player_id));$("#mcFormationSelect").value=matchCenterState.match?.formation||"4-4-2";$("#mcFormationPool").innerHTML=pool.map(p=>`<div class="mc-selection-row"><div><strong>${esc(p.last_name)}</strong><small>${mcInjury(p.player_id)?"Infortunato · ":""}${mcSuspension(p.player_id)?"Squalificato":roleLabel(p.generic_role_manual)}</small></div><div><button ${mcSuspension(p.player_id)?"disabled":""} data-mc-assign="${p.player_id}:starter">XI</button><button ${mcSuspension(p.player_id)?"disabled":""} data-mc-assign="${p.player_id}:bench">P</button></div></div>`).join("")||'<div class="empty-state">Nessun giocatore da assegnare</div>';$$("[data-mc-assign]").forEach(b=>b.onclick=()=>{const [id,state]=b.dataset.mcAssign.split(":");mcSetSelection(id,state)});mcPitch($("#mcFormationPitch"),starters,true);$("#mcFormationBench").innerHTML=bench.map(x=>`<div class="mc-bench-row"><strong>${esc(mcPlayerName(x.player_id))}</strong><button data-mc-unassign="${x.player_id}">×</button></div>`).join("")||'<div class="empty-state">Panchina vuota</div>';$$("[data-mc-unassign]").forEach(b=>b.onclick=()=>mcSetSelection(b.dataset.mcUnassign,"available"));const nc=rosterRows.filter(p=>!assigned.has(p.player_id));$("#mcNotCalled").innerHTML=nc.map(p=>{const mp=mcMatchPlayer(p.player_id);return `<div class="mc-not-called-row"><strong>${esc(p.last_name+" "+p.first_name)}</strong><select data-nc="${p.player_id}">${mcReasonOptions(mp?.unavailability_reason||"")}</select><button type="button" class="text-btn" data-save-nc="${p.player_id}">Salva</button></div>`}).join("");$$("[data-save-nc]").forEach(b=>b.onclick=()=>mcSaveNotCalled(b.dataset.saveNc))}
function mcRenderEvents(){mcTimeline("#mcEventsTimeline",0);$("#mcEventsCount").textContent=matchCenterState.events.length+" eventi";mcRefreshComposer()}
function mcRenderAll(){mcHeader();mcRenderGeneral();mcRenderAvailability();mcRenderFormation();mcRenderEvents()}
async function mcReload(){if(!matchCenterState.match){mcRenderAll();return}const [mp,ev]=await Promise.all([db.from("app_match_players").select("*").eq("match_id",matchCenterState.match.id),db.from("app_match_events").select("*").eq("match_id",matchCenterState.match.id).order("minute",{ascending:true})]);matchCenterState.matchPlayers=mp.data||[];matchCenterState.events=ev.data||[];mcRenderAll()}
async function openMatchDetail(fixture){if(!fixture||!(isOwnTeamName(fixture.home_team)||isOwnTeamName(fixture.away_team)))return;clearInterval(matchCenterTimer);await loadCoreSeasonData();await loadCompetitions();await ensureMainTeam();const match=linkedMatchForFixture(fixture);const [inj,sus]=await Promise.all([db.from("injuries").select("*").eq("season_id",currentSeason.id),db.from("suspensions").select("*").eq("season_id",currentSeason.id)]);matchCenterState={fixture,match,matchPlayers:[],events:[],injuries:inj.data||[],suspensions:sus.data||[],tab:"general"};$("#matchDetailFixtureId").value=fixture.id;$("#matchDetailMatchId").value=match?.id||"";$("#matchDetailDialog").showModal();$$("[data-mc-tab]").forEach(b=>b.onclick=()=>mcSetTab(b.dataset.mcTab));$("#mcSaveFormation").onclick=mcSaveFormation;$("#mcEventType").onchange=mcRefreshComposer;$("#mcEventMinute").oninput=mcRefreshComposer;$("#mcEventSide").onchange=mcRefreshComposer;$("#mcEventForm").onsubmit=mcSubmitEvent;$$("[data-mc-live]").forEach(b=>b.onclick=()=>mcLiveAction(b.dataset.mcLive));await mcReload();mcSetTab("general")}
$$( "[data-close-match-detail]" ).forEach(b=>b.onclick=()=>{clearInterval(matchCenterTimer);$("#matchDetailDialog").close()});
async function mcSaveAvailability(id){try{if(!matchCenterState.match)throw new Error("Partita operativa non collegata.");if(!sessionUser)throw new Error("Accedi per modificare.");const row=$(`[data-mc-avail="${id}"]`),reason=row.querySelector("[data-reason]").value,note=row.querySelector("[data-note]").value.trim(),old=mcMatchPlayer(id),p=reason?{selection_status:"unavailable",started:false,unavailability_reason:reason,unavailability_note:note||null}:{selection_status:"available",started:false,unavailability_reason:null,unavailability_note:null};const r=old?await db.from("app_match_players").update(p).eq("id",old.id).select("*").maybeSingle():await db.from("app_match_players").insert({match_id:matchCenterState.match.id,player_id:id,...p}).select("*").single();assertSaved(r,"Disponibilità");await mcReload()}catch(e){alert(e.message||String(e))}}
async function mcSaveNotCalled(id){const sel=$(`[data-nc="${id}"]`),row=$(`[data-mc-avail="${id}"]`);if(row){row.querySelector("[data-reason]").value=sel.value;return mcSaveAvailability(id)}}
async function mcSetSelection(id,state){try{if(!matchCenterState.match)throw new Error("Partita operativa non collegata.");if(!sessionUser)throw new Error("Accedi per modificare.");if((state==="starter"||state==="bench")&&mcSuspension(id))throw new Error("Giocatore squalificato: convocazione bloccata.");const old=mcMatchPlayer(id),p={selection_status:state,started:state==="starter",unavailability_reason:null,unavailability_note:null};const r=old?await db.from("app_match_players").update(p).eq("id",old.id).select("*").maybeSingle():await db.from("app_match_players").insert({match_id:matchCenterState.match.id,player_id:id,...p}).select("*").single();assertSaved(r,"Formazione");await mcReload()}catch(e){alert(e.message||String(e))}}
async function mcSaveFormation(){try{if(!matchCenterState.match)throw new Error("Partita operativa non collegata.");const r=await db.from("app_matches").update({formation:$("#mcFormationSelect").value}).eq("id",matchCenterState.match.id).select("*").maybeSingle();matchCenterState.match=assertSaved(r,"Modulo");await mcReload()}catch(e){alert(e.message||String(e))}}
function mcRefreshComposer(){const type=$("#mcEventType").value,side=$("#mcEventSide").value,minute=$("#mcEventMinute").value;let a=[],b=[],hint="";if(type==="goal"){a=mcEligible("active",minute,side);b=mcEligible("active",minute,side);$("#mcEventPlayerWrap").classList.toggle("hidden",side==="opponent");$("#mcEventSecondaryWrap").classList.toggle("hidden",side==="opponent");$("#mcEventSubtype").innerHTML='<option value="action">Azione</option><option value="penalty">Rigore</option><option value="free_kick">Punizione</option><option value="own_goal">Autogol</option>';hint=minute===""?"Inserimento libero":"Solo giocatori attivi"}else if(type==="substitution"){a=mcEligible("active",minute,side);b=mcEligible("incoming",minute,side);$("#mcEventPlayerWrap").classList.toggle("hidden",side==="opponent");$("#mcEventSecondaryWrap").classList.toggle("hidden",side==="opponent");$("#mcEventSubtype").innerHTML='<option value="tactical">Tattico</option><option value="injury">Infortunio</option><option value="technical">Tecnico</option><option value="other">Altro</option>';hint=minute===""?"Inserimento libero · ingresso facoltativo":"Esce: in campo · Entra: panchina"}else{a=mcEligible("card",minute,side);$("#mcEventPlayerWrap").classList.toggle("hidden",side==="opponent");$("#mcEventSecondaryWrap").classList.add("hidden");$("#mcEventSubtype").innerHTML=type==="red_card"?'<option value="direct">Diretto</option><option value="second_yellow">Secondo giallo</option>':'<option value="yellow">Ammonizione</option>';hint=side==="opponent"?"Evento avversario":"Campo + panchina"}$("#mcEventPlayer").innerHTML=mcOptions(a,type==="substitution"?"Giocatore che esce":"—");$("#mcEventSecondary").innerHTML=mcOptions(b,type==="substitution"?"Nessun ingresso":"Nessun assist");$("#mcEligibilityHint").textContent=hint}
async function mcSubmitEvent(e){e.preventDefault();$("#mcEventError").classList.add("hidden");try{if(!matchCenterState.match)throw new Error("Partita operativa non collegata.");if(!sessionUser)throw new Error("Accedi per inserire eventi.");const type=$("#mcEventType").value,side=$("#mcEventSide").value,min=$("#mcEventMinute").value,minute=min===""?null:Number(min),player=side==="team"?($("#mcEventPlayer").value||null):null,secondary=(type==="goal"||type==="substitution")?($("#mcEventSecondary").value||null):null,sub=$("#mcEventSubtype").value;if(type==="substitution"&&side==="opponent")throw new Error("Cambi avversari non gestiti nel prototipo.");if(type==="substitution"&&!player)throw new Error("Il giocatore che esce è obbligatorio; quello che entra è facoltativo.");if(type==="goal"&&side==="team"&&sub!=="own_goal"&&!player)throw new Error("Indica il marcatore.");if((type==="yellow_card"||type==="red_card")&&side==="team"&&!player)throw new Error("Indica il giocatore.");if(mcIsPost()&&type==="goal"){const g=mcGoalInfo(),max=side==="team"?g.expectedTeam:g.expectedOpp,cur=side==="team"?g.team:g.opp;if(cur>=max)throw new Error("Numero di gol già coerente con il risultato ufficiale.")}const payload=type==="goal"?{goal_type:sub}:(type==="yellow_card"||type==="red_card"?{card_type:sub}:{});const r=await db.from("app_match_events").insert({match_id:matchCenterState.match.id,event_type:type,minute,stoppage_minute:$("#mcEventStoppage").value===""?null:Number($("#mcEventStoppage").value),team_side:side,player_id:player,secondary_player_id:secondary,payload,substitution_reason:type==="substitution"?sub:null,proposed_by:sessionUser.id,validation_status:"proposed"}).select("*").single();assertSaved(r,"Evento");$("#mcEventForm").reset();await mcReload();mcSetTab("events")}catch(err){$("#mcEventError").textContent=err.message||String(err);$("#mcEventError").classList.remove("hidden")}}
async function mcLiveAction(action){try{if(!matchCenterState.match)throw new Error("Partita operativa non collegata.");if(!sessionUser)throw new Error("Accedi per gestire il live.");const u={},recovery=Number($("#mcRecoveryMinutes").value||0);if(action==="start_first"){u.status="live";u.live_started_at=matchCenterState.match.live_started_at||new Date().toISOString();u.live_period="first_half"}if(action==="end_first")u.live_period="halftime";if(action==="start_second"){u.status="live";u.live_period="second_half"}if(action==="end_match"){u.status="finished";u.live_period="full_time";u.finalized_at=new Date().toISOString()}const r=await db.from("app_matches").update(u).eq("id",matchCenterState.match.id).select("*").maybeSingle();matchCenterState.match=assertSaved(r,"Live");if((action==="end_first"||action==="end_match")&&recovery>0){await db.from("app_match_events").insert({match_id:matchCenterState.match.id,event_type:"period_end",minute:null,stoppage_minute:recovery,team_side:"team",payload:{period:action==="end_first"?"first_half":"second_half",recovery_minutes:recovery},proposed_by:sessionUser.id,validation_status:"proposed"})}await mcReload();mcSetTab("events")}catch(e){alert(e.message||String(e))}}

function openFixture(f=null){
  $("#fixtureForm").reset();
  $("#fixtureError").classList.add("hidden");
  $("#fixtureId").value=f?.id||"";
  $("#fixtureDialogTitle").textContent=f?"Modifica partita":"Nuova partita";
  $("#fixtureRound").value=f?.round_no||1;
  $("#fixtureKickoff").value=toLocalInputValue(f?.kickoff_at);
  $("#fixtureStatus").value=f?.status||"scheduled";
  $("#fixtureHome").value=f?.home_team||team?.name||"Calcio Caselle";
  $("#fixtureAway").value=f?.away_team||"";
  $("#fixtureVenue").value=f?.venue||"";
  $("#fixtureHomeScore").value=f?.home_score??"";
  $("#fixtureAwayScore").value=f?.away_score??"";
  $("#fixtureTeamNames").innerHTML=[team?.name,...opponents.map(o=>o.name)].filter(Boolean).map(n=>`<option value="${esc(n)}"></option>`).join("");
  $("#fixtureDialog").showModal();
}
$$("[data-close-fixture]").forEach(b=>b.onclick=()=>$("#fixtureDialog").close());
$("#fixtureStatus").onchange=()=>{
  const finished=$("#fixtureStatus").value==="finished";
  if(!finished){$("#fixtureHomeScore").value="";$("#fixtureAwayScore").value=""}
};
$("#fixtureForm").onsubmit=async e=>{
  e.preventDefault();
  $("#fixtureError").classList.add("hidden");
  try{
    if(!sessionUser)throw new Error("Accedi per modificare il calendario.");
    const id=$("#fixtureId").value;
    const status=$("#fixtureStatus").value;
    const homeScore=$("#fixtureHomeScore").value;
    const awayScore=$("#fixtureAwayScore").value;
    if(status==="finished"&&(homeScore===""||awayScore===""))throw new Error("Inserisci il risultato.");
    const existing=(window.__competitionFixtureRows||[]).find(x=>x.id===id);
    const payload={
      season_id:currentSeason.id,
      competition_id:competitionHubId,
      round_no:+$("#fixtureRound").value,
      kickoff_at:new Date($("#fixtureKickoff").value).toISOString(),
      home_team:$("#fixtureHome").value.trim(),
      away_team:$("#fixtureAway").value.trim(),
      venue:$("#fixtureVenue").value.trim()||null,
      status,
      home_score:status==="finished"?+homeScore:null,
      away_score:status==="finished"?+awayScore:null
    };
    const result=id
      ?await db.from("app_competition_fixtures").update(payload).eq("id",id).select("*").maybeSingle()
      :await db.from("app_competition_fixtures").insert({...payload,source:"manual"}).select("*").single();
    const saved=assertSaved(result,"Partita");
    if(existing&&(isOwnTeamName(existing.home_team)||isOwnTeamName(existing.away_team))){
      if(!teamMatches.length){
        const mr=await db.from("app_matches").select("*").eq("season_id",currentSeason.id);
        teamMatches=mr.data||[];
      }
      const linked=linkedMatchForFixture(existing);
      if(linked){
        await db.from("app_matches").update({
          kickoff_at:saved.kickoff_at,venue:saved.venue,status:saved.status,
          home_score:saved.status==="finished"?saved.home_score:0,
          away_score:saved.status==="finished"?saved.away_score:0
        }).eq("id",linked.id);
      }
    }
    $("#fixtureDialog").close();
    await renderCompetitionHub();
  }catch(err){
    $("#fixtureError").textContent=err.message||String(err);
    $("#fixtureError").classList.remove("hidden");
  }
};

function refreshCalendarCompetition(){
  $("#calendarCompetition").innerHTML=competitions.filter(c=>!currentSeason||c.season_id===currentSeason.id).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
$("#previewCalendarBtn").onclick=async()=>{const f=$("#calendarFile").files[0];if(!f)return;if(f.type==="application/pdf"||f.name.toLowerCase().endsWith(".pdf")){$("#calendarPreview").textContent="PDF selezionato: "+f.name+". Verrà interpretato e poi confermato prima del salvataggio.";return}const txt=await f.text();const rows=txt.split(/\r?\n/).filter(Boolean).slice(0,20).map(r=>r.split(/[;,]/));$("#calendarPreview").innerHTML=`<table>${rows.map(r=>"<tr>"+r.map(c=>"<td>"+esc(c.trim())+"</td>").join("")+"</tr>").join("")}</table>`};

window.TM={
  db,esc,assertSaved,
  loadAll,loadCompetitions,loadCompetitionHub,loadCalendarHub,ensureMainTeam,
  setPanel,localDateTime,isOwnTeamName,teamVisual,linkedMatchForFixture,openMatchDetail,openFixture,
  getState:()=>({
    seasons,competitions,opponents,currentSeason,team,sessionUser,
    competitionHubId,competitionFixtureFilter,calendarRows,teamMatches,calendarCompetitionIds,players
  })
};

function roleLabel(code){return code==="P"?"POR":code==="D"?"DIF":code==="C"?"CEN":"ATT"}
function roleClass(code){return code==="P"?"gk":code==="D"?"def":code==="C"?"mid":"att"}
function ageFromBirth(d){if(!d)return "—";const b=new Date(d+"T12:00:00"),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a}
function playerNameById(id){const p=rosterRows.find(x=>x.player_id===id)||players.find(x=>x.id===id);return p?(p.first_name+" "+p.last_name):"—"}
function opponentVisualById(id){return opponents.find(x=>x.id===id)||null}
function matchLabel(m){const o=opponentVisualById(m.opponent_id);return m.home_away==="home"?(team?.short_name||"CAS")+" - "+(o?.short_name||o?.name||"Avv."):(o?.short_name||o?.name||"Avv.")+" - "+(team?.short_name||"CAS")}
async function loadCoreSeasonData(){
  await ensureMainTeam();if(!currentSeason)return;
  const [roster,stats,matchesResult,allPlayers]=await Promise.all([
    db.from("app_roster").select("*").eq("season_id",currentSeason.id),
    db.from("app_player_season_stats").select("*").eq("season_id",currentSeason.id),
    db.from("app_matches").select("*").eq("season_id",currentSeason.id).order("kickoff_at",{ascending:true}),
    db.from("players").select("*").eq("team_id",currentSeason.team_id).order("last_name",{ascending:true})
  ]);
  const playerMap=new Map((allPlayers.data||[]).map(p=>[p.id,p]));
  rosterRows=(roster.data||[]).map(r=>({...r,...playerMap.get(r.player_id)}));
  playerStats=stats.data||[];teamMatches=matchesResult.data||[];players=allPlayers.data||[];
  if(!selectedPlayerId&&rosterRows[0])selectedPlayerId=rosterRows[0].player_id;
  if(!selectedMatchId&&teamMatches.length){const upcoming=teamMatches.find(m=>new Date(m.kickoff_at)>=new Date());selectedMatchId=(upcoming||teamMatches[teamMatches.length-1]).id}
}
async function ownFixtures(){const r=await db.from("app_competition_fixtures").select("*").eq("season_id",currentSeason.id).order("kickoff_at",{ascending:true});return (r.data||[]).filter(x=>isOwnTeamName(x.home_team)||isOwnTeamName(x.away_team))}
function fixtureOutcome(f){if(f.status!=="finished")return null;const ownHome=isOwnTeamName(f.home_team),gf=ownHome?f.home_score:f.away_score,ga=ownHome?f.away_score:f.home_score;return {gf,ga,result:gf>ga?"W":gf<ga?"L":"D"}}
function fixtureLogo(name){const v=teamVisual(name);return v.logo?`<img src="${esc(v.logo)}" alt="">`:`<span>${esc(v.short)}</span>`}
async function loadDashboard(){
  await loadCoreSeasonData();
  await loadCompetitions();

  const fixtures=await ownFixtures();
  const now=Date.now();
  const finished=fixtures.filter(f=>f.status==="finished"&&new Date(f.kickoff_at).getTime()<=now).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
  const upcoming=fixtures.filter(f=>f.status!=="finished"&&new Date(f.kickoff_at).getTime()>now).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
  const last=finished.at(-1)||null;
  const next=upcoming[0]||null;

  const totals=finished.reduce((a,f)=>{
    const o=fixtureOutcome(f);
    if(!o)return a;
    a.played++;
    a.gf+=o.gf;
    a.ga+=o.ga;
    if(o.result==="W")a.w++;
    else if(o.result==="D")a.d++;
    else a.l++;
    if(o.ga===0)a.clean++;
    return a;
  },{played:0,w:0,d:0,l:0,gf:0,ga:0,clean:0});

  $("#homeTeamOverview").innerHTML=renderHomeTeamIdentity();
  $("#homeTeamMetrics").innerHTML=renderHomeMetrics(totals);
  $("#homeLastMatch").innerHTML=last?renderHomeMatch(last,true):'<div class="home-empty">Nessuna partita conclusa</div>';
  $("#homeFormChart").innerHTML=renderHomeForm(finished.slice(-7));

  await loadLoggedPlayer();
  $("#homePlayerStats").innerHTML=renderLoggedPlayerCard();

  $("#homeMiniCalendar").innerHTML=renderHomeCalendar(next?.kickoff_at||new Date(),fixtures);
  $("#homeNextMatch").innerHTML=next?renderHomeNextMatch(next):'<div class="home-empty">Nessuna partita programmata</div>';

  const league=competitions.find(c=>c.kind==="league")||competitions[0];
  dashboardStandingRows=[];
  if(league){
    const st=await db.from("app_competition_standings").select("*").eq("season_id",currentSeason.id).eq("competition_id",league.id);
    dashboardStandingRows=(st.data||[]).sort((a,b)=>b.points-a.points||b.goal_difference-a.goal_difference||b.goals_for-a.goals_for||String(a.team).localeCompare(String(b.team),"it"));
  }
  renderDashboardStandings();

  const scoreRows=[...finished.slice(-2).reverse(),...upcoming.slice(0,3)].slice(0,5);
  $("#homeScores").innerHTML=scoreRows.length?scoreRows.map(renderHomeScoreRow).join(""):'<div class="home-empty">Nessuna partita disponibile</div>';

  $$("#homeView [data-go-calendar]").forEach(b=>b.onclick=()=>setAppView("calendar"));
  $$("#homeView [data-go-competition]").forEach(b=>b.onclick=()=>setAppView("competitions"));
  $$("#homeView [data-go-roster]").forEach(b=>b.onclick=()=>setAppView("roster"));
}

async function loadLoggedPlayer(){
  loggedPlayer=null;
  if(!sessionUser||!currentSeason)return;
  const role=await db.from("app_user_roles").select("player_id").eq("user_id",sessionUser.id).maybeSingle();
  const playerId=role.data?.player_id||null;
  if(!playerId)return;
  const p=players.find(x=>x.id===playerId)||null;
  if(!p)return;
  const roster=rosterRows.find(x=>x.player_id===playerId)||{};
  const stats=playerStats.find(x=>x.player_id===playerId)||{};
  loggedPlayer={...p,...roster,stats};
}

function renderHomeTeamIdentity(){
  const logo=team?.logo_url?`<img src="${esc(team.logo_url)}" alt="">`:`<span>${esc(team?.short_name||"CAS")}</span>`;
  return `<div class="home-team-identity"><div class="home-team-mark">${logo}</div><strong>${esc(team?.name||"Squadra")}</strong><small>${esc(currentSeason?.name||"")}</small></div>`;
}

function renderHomeMetrics(t){
  const ppg=t.played?((t.w*3+t.d)/t.played).toFixed(1):"0.0";
  return `<div class="home-metric-list">
    <div><span>Record</span><b>${t.w} W</b><i>${t.d} D</i><i>${t.l} L</i></div>
    <div><span>Points / Game</span><b>PPG ${ppg}</b></div>
    <div><span>Goals</span><b>GF ${t.gf}</b><i>GA ${t.ga}</i></div>
    <div><span>Clean Sheets</span><b>CS ${t.clean}</b></div>
  </div>`;
}

function renderHomeMatch(f,showScore){
  const home=teamVisual(f.home_team),away=teamVisual(f.away_team);
  return `<div class="home-match-strip">
    <div class="home-match-side">${fixtureLogo(f.home_team)}<span>${esc(home.short)}</span></div>
    <strong>${showScore?`${f.home_score} - ${f.away_score}`:"VS"}</strong>
    <div class="home-match-side">${fixtureLogo(f.away_team)}<span>${esc(away.short)}</span></div>
  </div>`;
}

function renderHomeForm(rows){
  if(!rows.length)return '<div class="home-empty">Nessun dato</div>';
  const pts=rows.map(f=>{const o=fixtureOutcome(f);return o?.result==="W"?3:o?.result==="D"?1:0});
  const gf=rows.map(f=>fixtureOutcome(f)?.gf||0);
  const width=320,height=90,pad=10;
  const max=Math.max(3,...gf,...pts);
  const path=arr=>arr.map((v,i)=>{const x=pad+(i*(width-pad*2)/Math.max(1,arr.length-1));const y=height-pad-(v/max)*(height-pad*2);return `${i?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`}).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" class="home-form-svg" aria-label="Forma recente">
    <path d="${path(pts)}" class="home-form-line points"/>
    <path d="${path(gf)}" class="home-form-line goals"/>
    ${rows.map((r,i)=>`<text x="${(pad+i*(width-pad*2)/Math.max(1,rows.length-1)).toFixed(1)}" y="${height-1}" text-anchor="middle">G${i+1}</text>`).join("")}
  </svg>
  <div class="home-form-legend"><span class="points">Punti</span><span class="goals">Gol fatti</span></div>`;
}

function renderLoggedPlayerCard(){
  if(!loggedPlayer){
    return `<div class="home-player-empty"><div class="home-player-placeholder">—</div><strong>Profilo non associato</strong><small>L'utente autenticato non è collegato a un giocatore.</small></div>`;
  }
  const p=loggedPlayer,s=p.stats||{};
  const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:`<span>${esc((p.first_name||"?")[0]+(p.last_name||"?")[0])}</span>`;
  return `<div class="home-player-card">
    <div class="home-player-photo">${photo}</div>
    <strong>${esc(p.first_name+" "+p.last_name)}</strong>
    <small>#${p.shirt_number??"—"} · ${roleLabel(p.generic_role_manual)}</small>
    <div class="home-player-stats">
      <div><span>Presenze</span><b>${s.appearances||0}</b></div>
      <div><span>Minuti</span><b>${s.minutes||0}</b></div>
      <div><span>Gol + Assist</span><b>${(s.goals||0)+(s.assists||0)}</b></div>
      <div><span>Rating</span><b>${s.avg_rating??"—"}</b></div>
    </div>
  </div>`;
}

function renderHomeCalendar(dateValue,fixtures){
  const focus=new Date(dateValue),year=focus.getFullYear(),month=focus.getMonth();
  const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),start=(first.getDay()+6)%7;
  const matchDays=new Map();

  fixtures
    .filter(f=>{const d=new Date(f.kickoff_at);return d.getFullYear()===year&&d.getMonth()===month})
    .forEach(f=>{
      const day=new Date(f.kickoff_at).getDate();
      const opponentName=isOwnTeamName(f.home_team)?f.away_team:f.home_team;
      matchDays.set(day,{fixture:f,opponent:teamVisual(opponentName)});
    });

  const cells=[];
  for(let i=0;i<start;i++)cells.push('<span class="calendar-empty"></span>');

  for(let d=1;d<=days;d++){
    const match=matchDays.get(d);
    if(!match){
      cells.push(`<span class="calendar-day">${d}</span>`);
      continue;
    }

    const title=esc(match.fixture.home_team+" - "+match.fixture.away_team);
    if(match.opponent?.logo){
      cells.push(`<span class="calendar-day match-day logo-day" title="${title}">
        <img src="${esc(match.opponent.logo)}" alt="${esc(match.opponent.name||"Avversaria")}">
        <i>${d}</i>
      </span>`);
    }else{
      cells.push(`<span class="calendar-day match-day compact-day" title="${title}">${d}</span>`);
    }
  }

  return `<div class="home-calendar-title">${new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(focus)}</div>
    <div class="home-calendar-week"><b>L</b><b>M</b><b>M</b><b>G</b><b>V</b><b>S</b><b>D</b></div>
    <div class="home-calendar-grid">${cells.join("")}</div>`;
}

function renderHomeNextMatch(f){
  const opponent=isOwnTeamName(f.home_team)?teamVisual(f.away_team):teamVisual(f.home_team);
  return `<div class="home-next-line"><div><span>Prossima partita</span><strong>${esc(opponent.name)}</strong></div><div><span>Data</span><strong>${localDateTime(f.kickoff_at)}</strong></div></div>`;
}

function dashboardStandingWindow(rows,size=5){
  if(rows.length<=size)return rows;
  const ownIndex=rows.findIndex(r=>isOwnTeamName(r.team));
  if(ownIndex<0)return rows.slice(0,size);
  let start=ownIndex-2,end=ownIndex+3;
  if(start<0){end=Math.min(rows.length,end-start);start=0}
  if(end>rows.length){start=Math.max(0,start-(end-rows.length));end=rows.length}
  return rows.slice(start,end);
}

function renderDashboardStandings(){
  const box=$("#dashboardStandings");
  if(!box)return;
  const rows=dashboardStandingWindow(dashboardStandingRows,5);
  box.innerHTML=rows.length?`<table>
    <thead><tr>
      <th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>Diff</th><th>Pt</th>
    </tr></thead>
    <tbody>${rows.map(r=>{
      const rank=dashboardStandingRows.indexOf(r)+1;
      const diff=Number(r.goal_difference||0);
      return `<tr class="${isOwnTeamName(r.team)?"me":""}">
        <td>${rank}</td>
        <td><span class="tn">${dashboardTeamBadge(r.team)}<span class="standing-team-name">${esc(r.team)}</span></span></td>
        <td>${r.played||0}</td>
        <td>${r.won||0}</td>
        <td>${r.drawn||0}</td>
        <td>${r.lost||0}</td>
        <td>${r.goals_for||0}</td>
        <td>${r.goals_against||0}</td>
        <td>${diff>0?"+":""}${diff}</td>
        <td><b>${r.points||0}</b></td>
      </tr>`;
    }).join("")}</tbody>
  </table>`:'<div class="home-empty">Nessuna classifica</div>';
}

function dashboardTeamBadge(name){
  const v=teamVisual(name);
  return v.logo?`<img class="crest" src="${esc(v.logo)}" alt="">`:`<span class="crest crest-fallback">${esc(v.short)}</span>`;
}

function renderHomeScoreRow(f){
  const home=teamVisual(f.home_team),away=teamVisual(f.away_team);
  const done=f.status==="finished";
  const value=done?`${f.home_score} - ${f.away_score}`:new Intl.DateTimeFormat("it-IT",{hour:"2-digit",minute:"2-digit"}).format(new Date(f.kickoff_at));

  const homeLogo=home.logo
    ?`<img src="${esc(home.logo)}" alt="">`
    :`<span class="score-crest-fallback">${esc(home.short)}</span>`;
  const awayLogo=away.logo
    ?`<img src="${esc(away.logo)}" alt="">`
    :`<span class="score-crest-fallback">${esc(away.short)}</span>`;

  return `<div class="home-score-row">
    <div class="score-core">
      <span class="score-team-name score-home-name">${esc(home.short||home.name)}</span>
      <span class="score-crest">${homeLogo}</span>
      <strong>${esc(value)}</strong>
      <span class="score-crest">${awayLogo}</span>
      <span class="score-team-name score-away-name">${esc(away.short||away.name)}</span>
    </div>
    <small>${done?"FIN":"PROSSIMA"}</small>
  </div>`;
}


async function loadRosterView(){await loadCoreSeasonData();renderRosterTabs();renderRosterTable();renderPlayerDetail()}
function renderRosterTabs(){const roles=[["ALL","Tutti"],["P","Portieri"],["D","Difensori"],["C","Centrocampisti"],["A","Attaccanti"]];$("#rosterRoleTabs").innerHTML=roles.map(([v,l])=>`<button class="${rosterRole===v?"active":""}" data-roster-role="${v}">${l}</button>`).join("");$$("[data-roster-role]").forEach(b=>b.onclick=()=>{rosterRole=b.dataset.rosterRole;renderRosterTabs();renderRosterTable()})}
function rosterStat(id){return playerStats.find(x=>x.player_id===id)||{}}
function renderRosterTable(){const q=$("#rosterSearch").value.trim().toLowerCase();const rows=rosterRows.filter(p=>(rosterRole==="ALL"||p.generic_role_manual===rosterRole)&&(!q||(p.first_name+" "+p.last_name).toLowerCase().includes(q)));$("#rosterTable").innerHTML=`<table class="data-table"><thead><tr><th>#</th><th>Giocatore</th><th>Ruolo</th><th>Età</th><th>Pres.</th><th>Gol</th><th>Stato</th></tr></thead><tbody>${rows.map(p=>{const s=rosterStat(p.player_id);return `<tr class="${selectedPlayerId===p.player_id?"selected":""}" data-player-row="${p.player_id}"><td>${p.shirt_number??"–"}</td><td><div class="player-cell"><span class="avatar">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:`${esc(p.first_name[0]||"")}${esc(p.last_name[0]||"")}`}</span><strong>${esc(p.last_name+" "+p.first_name)}</strong></div></td><td><span class="role-badge ${roleClass(p.generic_role_manual)}">${roleLabel(p.generic_role_manual)}</span></td><td>${ageFromBirth(p.birth_date)}</td><td>${s.appearances??0}</td><td>${s.goals??0}</td><td><span class="status-dot active"></span></td></tr>`}).join("")}</tbody></table>`;$$("[data-player-row]").forEach(r=>r.onclick=()=>{selectedPlayerId=r.dataset.playerRow;renderRosterTable();renderPlayerDetail()})}
$("#rosterSearch").oninput=renderRosterTable;
function renderPlayerDetail(){const p=rosterRows.find(x=>x.player_id===selectedPlayerId);if(!p){$("#playerDetail").innerHTML='<div class="empty-state">Seleziona un giocatore</div>';return}const s=rosterStat(p.player_id);$("#playerDetail").innerHTML=`<div class="detail-profile"><div class="detail-avatar">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:`${esc(p.first_name[0]||"")}${esc(p.last_name[0]||"")}`}</div><div><strong>${esc(p.first_name+" "+p.last_name)}</strong><span>${roleLabel(p.generic_role_manual)}</span></div><b>${p.shirt_number??"–"}</b></div><div class="detail-tabs"><span class="active">Dettagli</span><span>Statistiche</span><span>Stagioni</span></div><dl class="detail-list"><div><dt>Data di nascita</dt><dd>${p.birth_date?fmt(p.birth_date):"—"}</dd></div><div><dt>Nazionalità</dt><dd>${esc(p.nationality_code||"—")}</dd></div><div><dt>Altezza</dt><dd>${p.height_cm?p.height_cm+" cm":"—"}</dd></div><div><dt>Piede</dt><dd>${esc(p.preferred_foot||"—")}</dd></div></dl><div class="mini-stat-grid"><div><strong>${s.appearances??0}</strong><span>Presenze</span></div><div><strong>${s.goals??0}</strong><span>Gol</span></div><div><strong>${s.assists??0}</strong><span>Assist</span></div></div>`}
$("#addPlayerBtn").onclick=()=>{$("#playerForm").reset();$("#playerFormError").classList.add("hidden");$("#playerDialog").showModal()};
$$("[data-close-player]").forEach(b=>b.onclick=()=>$("#playerDialog").close());
$("#playerForm").onsubmit=async e=>{e.preventDefault();try{if(!sessionUser)throw new Error("Accedi per aggiungere un giocatore.");const p={team_id:currentSeason.team_id,first_name:$("#newPlayerFirst").value.trim(),last_name:$("#newPlayerLast").value.trim(),generic_role_manual:$("#newPlayerRole").value};const pr=await db.from("players").insert(p).select("*").single();assertSaved(pr,"Giocatore");const rr=await db.from("app_roster").insert({season_id:currentSeason.id,player_id:pr.data.id,shirt_number:$("#newPlayerNumber").value?+$("#newPlayerNumber").value:null,active:true}).select("*").single();assertSaved(rr,"Rosa");$("#playerDialog").close();await loadRosterView()}catch(err){$("#playerFormError").textContent=err.message||String(err);$("#playerFormError").classList.remove("hidden")}};
async function loadMatchesView(){await loadCoreSeasonData();if(!selectedMatchId&&teamMatches[0])selectedMatchId=teamMatches[0].id;const match=teamMatches.find(x=>x.id===selectedMatchId);if(!match){$("#matchManagerTop").innerHTML='<div class="empty-state">Nessuna partita</div>';return}renderMatchManagerTop(match);const mp=await db.from("app_match_players").select("*").eq("match_id",match.id);renderMatchSelection(match,mp.data||[])}
function renderMatchManagerTop(match){const o=opponentVisualById(match.opponent_id);$("#matchManagerTop").innerHTML=`<div class="match-select-wrap"><select id="matchManagerSelect">${teamMatches.map(m=>`<option value="${m.id}" ${m.id===match.id?"selected":""}>${localDateTime(m.kickoff_at)} · ${esc(matchLabel(m))}</option>`).join("")}</select></div><div class="match-score-head"><strong>${esc(team?.short_name||"CAS")}</strong><b>${match.home_score} : ${match.away_score}</b><strong>${esc(o?.short_name||o?.name||"AVV")}</strong></div>`;$("#matchManagerSelect").onchange=e=>{selectedMatchId=e.target.value;loadMatchesView()};$("#matchFormation").value=match.formation||"4-4-2"}
function renderMatchSelection(match,rows){const map=new Map(rows.map(x=>[x.player_id,x])),starters=rows.filter(x=>x.started).sort((a,b)=>(a.tactical_slot||99)-(b.tactical_slot||99)),bench=rows.filter(x=>x.selection_status==="bench");$("#matchRosterList").innerHTML=rosterRows.map(p=>{const x=map.get(p.player_id),state=x?.started?"starter":x?.selection_status==="bench"?"bench":"available";return `<div class="match-roster-row"><span class="num">${x?.shirt_number??p.shirt_number??"–"}</span><strong>${esc(p.last_name)}</strong><span class="role-badge ${roleClass(p.generic_role_manual)}">${roleLabel(p.generic_role_manual)}</span><div class="select-actions"><button data-set-selection="${p.player_id}:starter" class="${state==="starter"?"on":""}">T</button><button data-set-selection="${p.player_id}:bench" class="${state==="bench"?"on":""}">P</button><button data-set-selection="${p.player_id}:available" class="${state==="available"?"on":""}">F</button></div></div>`}).join("");$$("[data-set-selection]").forEach(b=>b.onclick=()=>setMatchSelection(match.id,b.dataset.setSelection,map));const positions=[[50,90],[25,72],[42,72],[58,72],[75,72],[18,50],[39,50],[61,50],[82,50],[38,26],[62,26]];$("#matchPitch").innerHTML=starters.slice(0,11).map((x,i)=>{const p=rosterRows.find(r=>r.player_id===x.player_id),pos=positions[i]||[50,50];return `<div class="pitch-player" style="left:${pos[0]}%;top:${pos[1]}%"><span>${x.shirt_number??p?.shirt_number??"–"}</span><strong>${esc(p?.last_name||playerNameById(x.player_id))}</strong></div>`}).join("");$("#matchBench").innerHTML=bench.map(x=>{const p=rosterRows.find(r=>r.player_id===x.player_id);return `<div class="bench-row"><span>${x.shirt_number??p?.shirt_number??"–"}</span><strong>${esc(p?.last_name||playerNameById(x.player_id))}</strong><small>${roleLabel(p?.generic_role_manual)}</small></div>`}).join("")||'<div class="empty-state">Panchina vuota</div>'}
async function setMatchSelection(matchId,spec,map){try{if(!sessionUser)throw new Error("Accedi per modificare la formazione.");const [playerId,state]=spec.split(":"),existing=map.get(playerId),payload={selection_status:state,started:state==="starter"};let r;if(existing)r=await db.from("app_match_players").update(payload).eq("id",existing.id).select("*").maybeSingle();else r=await db.from("app_match_players").insert({match_id:matchId,player_id:playerId,...payload}).select("*").single();assertSaved(r,"Convocazione");await loadMatchesView()}catch(err){alert(err.message||String(err))}}
$("#saveFormationBtn").onclick=async()=>{try{if(!sessionUser)throw new Error("Accedi per salvare il modulo.");const r=await db.from("app_matches").update({formation:$("#matchFormation").value}).eq("id",selectedMatchId).select("*").maybeSingle();assertSaved(r,"Modulo");await loadMatchesView()}catch(err){alert(err.message||String(err))}};
async function loadEventsView(){await loadCoreSeasonData();const match=teamMatches.find(x=>x.id===selectedMatchId)||teamMatches[0];if(!match){$("#eventsMatchTop").innerHTML='<div class="empty-state">Nessuna partita</div>';return}selectedMatchId=match.id;const o=opponentVisualById(match.opponent_id);$("#eventsMatchTop").innerHTML=`<div class="match-select-wrap"><select id="eventsMatchSelect">${teamMatches.map(m=>`<option value="${m.id}" ${m.id===match.id?"selected":""}>${localDateTime(m.kickoff_at)} · ${esc(matchLabel(m))}</option>`).join("")}</select></div><div class="match-score-head"><strong>${esc(team?.short_name||"CAS")}</strong><b>${match.home_score} : ${match.away_score}</b><strong>${esc(o?.short_name||o?.name||"AVV")}</strong></div>`;$("#eventsMatchSelect").onchange=e=>{selectedMatchId=e.target.value;loadEventsView()};const ev=await db.from("app_match_events").select("*").eq("match_id",match.id).order("minute",{ascending:true});renderEventsTimeline(ev.data||[]);const opts='<option value="">—</option>'+rosterRows.map(p=>`<option value="${p.player_id}">${esc(p.last_name+" "+p.first_name)}</option>`).join("");$("#newEventPlayer").innerHTML=opts;$("#newEventSecondary").innerHTML=opts;toggleNewEventSecondary()}
function renderEventsTimeline(events){$("#eventsTimeline").innerHTML=events.length?events.map(e=>`<div class="timeline-row"><time>${e.minute??"–"}'</time><span class="event-icon ${esc(e.event_type)}">${eventIcon(e.event_type)}</span><div><strong>${eventLabel(e.event_type)}</strong><small>${esc(playerNameById(e.player_id))}${e.secondary_player_id?" → "+esc(playerNameById(e.secondary_player_id)):""} · ${e.team_side==="team"?"Caselle":"Avversario"}</small></div></div>`).join(""):'<div class="empty-state">Nessun evento</div>'}
function eventIcon(t){return t==="goal"?"⚽":t==="yellow_card"?"▮":t==="red_card"?"▮":t==="substitution"?"↔":"•"}
function eventLabel(t){return t==="goal"?"Gol":t==="yellow_card"?"Cartellino giallo":t==="red_card"?"Cartellino rosso":t==="substitution"?"Sostituzione":t}
function toggleNewEventSecondary(){const t=document.querySelector('input[name="newEventType"]:checked')?.value;$("#newEventSecondaryWrap").classList.toggle("hidden",t!=="substitution")}
$$('input[name="newEventType"]').forEach(x=>x.onchange=toggleNewEventSecondary);
$("#eventComposeForm").onsubmit=async e=>{e.preventDefault();$("#eventComposeError").classList.add("hidden");try{if(!sessionUser)throw new Error("Accedi per aggiungere eventi.");const type=document.querySelector('input[name="newEventType"]:checked').value,p={match_id:selectedMatchId,event_type:type,minute:+$("#newEventMinute").value,player_id:$("#newEventPlayer").value||null,secondary_player_id:type==="substitution"?($("#newEventSecondary").value||null):null,payload:{},proposed_by:sessionUser.id,validation_status:"proposed",team_side:$("#newEventSide").value};const r=await db.from("app_match_events").insert(p).select("*").single();assertSaved(r,"Evento");$("#eventComposeForm").reset();await loadEventsView()}catch(err){$("#eventComposeError").textContent=err.message||String(err);$("#eventComposeError").classList.remove("hidden")}};
async function loadStatsView(){await loadCoreSeasonData();const fixtures=await ownFixtures(),finished=fixtures.filter(f=>f.status==="finished"),t=finished.reduce((a,f)=>{const o=fixtureOutcome(f);if(!o)return a;a.m++;a.gf+=o.gf;a.ga+=o.ga;if(o.result==="W")a.w++;else if(o.result==="D")a.d++;else a.l++;return a},{m:0,w:0,d:0,l:0,gf:0,ga:0});$("#statsKpis").innerHTML=[["Partite",t.m],["Vittorie",t.w],["Gol fatti",t.gf],["Gol subiti",t.ga]].map(([l,v])=>`<div class="kpi-card"><strong>${v}</strong><span>${l}</span></div>`).join("");const sorted=[...playerStats].sort((a,b)=>(b.appearances||0)-(a.appearances||0)||(b.goals||0)-(a.goals||0));$("#statsPlayers").innerHTML=`<table class="data-table"><thead><tr><th>Giocatore</th><th>Pres.</th><th>Tit.</th><th>Gol</th><th>Assist</th><th>Gialli</th><th>Rossi</th></tr></thead><tbody>${sorted.map(p=>`<tr><td><strong>${esc(p.last_name+" "+p.first_name)}</strong></td><td>${p.appearances||0}</td><td>${p.starts||0}</td><td>${p.goals||0}</td><td>${p.assists||0}</td><td>${p.yellow_cards||0}</td><td>${p.red_cards||0}</td></tr>`).join("")}</tbody></table>`;$("#statsScorers").innerHTML=[...playerStats].sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,8).map((p,i)=>`<div class="scorer-row"><span>${i+1}</span><strong>${esc(p.last_name+" "+p.first_name)}</strong><b>${p.goals||0}</b></div>`).join("")}

async function boot(){
  try{
    await Promise.all([loadAuthState(),loadAll()]);
    await loadCompetitions();
    await ensureMainTeam();
    setAppView("home");
  }catch(err){
    console.error("BOOT ERROR",err);
    const msg=err?.message||String(err);
    if($("#connectionState")){$("#connectionState").textContent="Errore: "+msg;$("#connectionState").className="status-pill error"}
    if($("#authState")&&$("#authState").textContent==="Sessione…"){$("#authState").textContent="Errore avvio";$("#authState").className="auth-state error"}
  }
}
boot();