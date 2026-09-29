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

const $=s=>document.querySelector(s), $=s=>[...document.querySelectorAll(s)];
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
let seasons=[],competitions=[],opponents=[],currentSeason=null,team=null,wizardStep=1,draftCompetitions=[],wizardOpponentIds=new Set(),sessionUser=null;

async function loadAuthState(){
  const {data:{session}}=await db.auth.getSession();
  sessionUser=session?.user||null;
  if(!sessionUser){$("#authState").textContent="Non autenticato";$("#authState").className="auth-state error";return}
  const role=await db.from("app_user_roles").select("role").eq("user_id",sessionUser.id).maybeSingle();
  $("#authState").textContent=role.data?.role==="admin"?"Admin":"Autenticato";
  $("#authState").className="auth-state ok";
}
function assertSaved(result,label){
  if(result.error) throw result.error;
  if(!result.data) throw new Error(label+" non salvato: la sessione non ha permessi di modifica o non è più valida.");
  return result.data;
}

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
$("#seasonSelector").onchange=e=>{currentSeason=seasons.find(s=>s.id===e.target.value)||null;loadCompetitions();refreshCalendarCompetition()};
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
  team=r.data; if(!team)return;
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
  $("[data-comp-edit]").forEach(b=>b.onclick=()=>openCompetitionEdit(b.dataset.compEdit));
}
$("#addCompetitionBtn").onclick=()=>openWizard(currentSeason,true);

function renderOpponents(filter=""){
  const f=filter.toLowerCase();const list=opponents.filter(o=>o.name.toLowerCase().includes(f));
  $("#opponentList").innerHTML=list.map(o=>`<article class="card"><div class="card-head"><div class="card-title">${esc(o.name)}</div><span class="badge">${esc(o.short_name||"")}</span></div><div class="card-actions"><button class="text-btn" data-opp-edit="${o.id}">Modifica</button></div></article>`).join("")||'<div class="muted">Nessuna avversaria.</div>';
  $$("[data-opp-edit]").forEach(b=>b.onclick=()=>openOpponent(opponents.find(o=>o.id===b.dataset.oppEdit)));
}
$("#opponentSearch").oninput=e=>renderOpponents(e.target.value);
$("#addOpponentBtn").onclick=()=>openOpponent();
function openOpponent(o=null){$("#opponentForm").reset();$("#opponentId").value=o?.id||"";$("#opponentName").value=o?.name||"";$("#opponentShort").value=o?.short_name||"";$("#opponentDialog").showModal()}
$$("[data-close-opponent]").forEach(b=>b.onclick=()=>$("#opponentDialog").close());
$("#opponentForm").onsubmit=async e=>{e.preventDefault();const id=$("#opponentId").value,p={name:$("#opponentName").value.trim(),short_name:$("#opponentShort").value.trim()||null};try{const r=id?await db.from("app_opponents").update(p).eq("id",id).select("*").maybeSingle():await db.from("app_opponents").insert(p).select("*").single();assertSaved(r,"Avversaria");$("#opponentDialog").close();const o=await db.from("app_opponents").select("*").order("name");opponents=o.data||[];renderOpponents()}catch(err){alert(err.message||String(err))}};


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
$("[data-close-competition]").forEach(b=>b.onclick=()=>$("#competitionDialog").close());
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

function refreshCalendarCompetition(){
  $("#calendarCompetition").innerHTML=competitions.filter(c=>!currentSeason||c.season_id===currentSeason.id).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
$("#previewCalendarBtn").onclick=async()=>{const f=$("#calendarFile").files[0];if(!f)return;if(f.type==="application/pdf"||f.name.toLowerCase().endsWith(".pdf")){$("#calendarPreview").textContent="PDF selezionato: "+f.name+". Verrà interpretato e poi confermato prima del salvataggio.";return}const txt=await f.text();const rows=txt.split(/\r?\n/).filter(Boolean).slice(0,20).map(r=>r.split(/[;,]/));$("#calendarPreview").innerHTML=`<table>${rows.map(r=>"<tr>"+r.map(c=>"<td>"+esc(c.trim())+"</td>").join("")+"</tr>").join("")}</table>`};

async function boot(){
  try{
    await Promise.all([loadAuthState(),loadAll()]);
    await loadCompetitions();
  }catch(err){
    console.error("BOOT ERROR",err);
    const msg=err?.message||String(err);
    if($("#connectionState")){$("#connectionState").textContent="Errore: "+msg;$("#connectionState").className="status-pill error"}
    if($("#authState")&&$("#authState").textContent==="Sessione…"){$("#authState").textContent="Errore avvio";$("#authState").className="auth-state error"}
  }
}
boot();