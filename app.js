const SUPABASE_URL="https://qxblxomcpepwavgvhtuk.supabase.co";
const SUPABASE_KEY="sb_publishable_mqNXt8rW96jH8JvCm24piA_SyAktT_m";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const grid=document.querySelector("#seasonGrid");
const empty=document.querySelector("#emptyState");
const state=document.querySelector("#connectionState");
const dialog=document.querySelector("#seasonDialog");
const form=document.querySelector("#seasonForm");
const errorBox=document.querySelector("#formError");
let seasons=[];

const fmt=d=>d?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00")):"—";
const statusLabel={active:"Attiva",future:"Futura",archived:"Archiviata"};

function render(){
  empty.classList.toggle("hidden",seasons.length>0);
  grid.innerHTML=seasons.map(s=>`
    <article class="season-card ${s.status==="active"?"active":""}">
      <div class="season-head"><div class="season-name">${escapeHtml(s.name)}</div><span class="badge ${s.status}">${statusLabel[s.status]||s.status}</span></div>
      <div class="season-dates">
        <div class="metric"><span>Inizio</span><strong>${fmt(s.start_date)}</strong></div>
        <div class="metric"><span>Fine</span><strong>${fmt(s.end_date)}</strong></div>
      </div>
      <div class="card-actions"><button class="text-btn" data-edit="${s.id}">Modifica</button></div>
    </article>`).join("");
  grid.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openEdit(b.dataset.edit)));
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function loadSeasons(){
  state.textContent="Connessione…"; state.className="status-pill";
  const {data,error}=await db.from("app_seasons").select("*").order("start_date",{ascending:false});
  if(error){state.textContent="Dati non accessibili";state.classList.add("error");console.error(error);return}
  seasons=data||[];state.textContent="Supabase connesso";state.classList.add("ok");render();
}
function resetForm(){form.reset();document.querySelector("#seasonId").value="";document.querySelector("#dialogTitle").textContent="Nuova stagione";errorBox.classList.add("hidden")}
function openNew(){resetForm();dialog.showModal()}
function openEdit(id){
  const s=seasons.find(x=>x.id===id);if(!s)return;
  resetForm();document.querySelector("#dialogTitle").textContent="Modifica stagione";
  document.querySelector("#seasonId").value=s.id;document.querySelector("#seasonName").value=s.name;
  document.querySelector("#startDate").value=s.start_date;document.querySelector("#endDate").value=s.end_date;
  document.querySelector("#seasonStatus").value=s.status;dialog.showModal();
}
function close(){dialog.close()}

form.addEventListener("submit",async e=>{
  e.preventDefault();errorBox.classList.add("hidden");
  const id=document.querySelector("#seasonId").value;
  const payload={name:document.querySelector("#seasonName").value.trim(),start_date:document.querySelector("#startDate").value,end_date:document.querySelector("#endDate").value,status:document.querySelector("#seasonStatus").value};
  if(payload.end_date<payload.start_date){errorBox.textContent="La data di fine deve essere successiva alla data di inizio.";errorBox.classList.remove("hidden");return}
  if(payload.status==="active"){
    const active=seasons.filter(s=>s.status==="active"&&s.id!==id);
    for(const s of active) await db.from("app_seasons").update({status:"archived"}).eq("id",s.id);
  }
  let result;
  if(id) result=await db.from("app_seasons").update(payload).eq("id",id);
  else{
    const teamId=seasons[0]?.team_id;
    if(!teamId){errorBox.textContent="Impossibile determinare la squadra principale.";errorBox.classList.remove("hidden");return}
    result=await db.from("app_seasons").insert({...payload,team_id:teamId});
  }
  if(result.error){errorBox.textContent="Salvataggio non riuscito: "+result.error.message;errorBox.classList.remove("hidden");return}
  close();await loadSeasons();
});
document.querySelector("#newSeasonBtn").addEventListener("click",openNew);
document.querySelector("#closeDialog").addEventListener("click",close);
document.querySelector("#cancelDialog").addEventListener("click",close);
loadSeasons();