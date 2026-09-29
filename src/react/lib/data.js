import{useCallback,useEffect,useState}from'react';import{supabase}from'./supabase.js';
export const TEAM_ID='d0c3210b-6a8a-4a1b-93c8-e2400029006e';
const empty={loading:true,error:null,session:null,role:null,matches:[],players:[],roster:[],opponents:[],competitions:[],seasons:[],scores:[],stats:[],ratings:[],events:[],profiles:[],userRoles:[],settings:{}};
export function useTeamData(){
 const[data,setData]=useState(empty),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{let live=true;
  async function load(){
   setData(x=>({...x,loading:true,error:null}));
   const{data:{session}}=await supabase.auth.getSession();
   let role=null;
   if(session){const r=await supabase.from('app_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();role=r.data?.role||'fan'}
   const [players,seasons,competitions,opponents,matches,scores,settings,events,ratings,roster]=await Promise.all([
    supabase.from('players').select('id,team_id,first_name,last_name,birth_date,preferred_foot,photo_url,nationality_code,generic_role_manual,height_cm').eq('team_id',TEAM_ID).order('last_name'),
    supabase.from('app_seasons').select('*').eq('team_id',TEAM_ID).order('start_date',{ascending:false}),
    supabase.from('app_competitions').select('*').order('name'),
    supabase.from('app_opponents').select('*').order('name'),
    supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
    supabase.from('app_match_score').select('*'),
    supabase.from('app_settings').select('*').eq('id',true).maybeSingle(),
    supabase.from('app_match_events').select('*').order('minute',{ascending:true}),
    supabase.from('app_match_ratings').select('*'),
    supabase.from('app_roster').select('*')
   ]);
   const season=(seasons.data||[]).find(x=>x.status==='active')||(seasons.data||[])[0]||null;
   const stats=season?await supabase.from('app_player_season_stats').select('*').eq('season_id',season.id):{data:[],error:null};
   let profiles=[],userRoles=[];
   if(session&&role==='admin'){const p=await supabase.from('profiles').select('id,username,display_name,is_active').order('display_name');const ur=await supabase.from('app_user_roles').select('*');profiles=p.data||[];userRoles=ur.data||[]}
   const sources=[players,seasons,competitions,opponents,matches,scores,settings,events,ratings,roster,stats],firstError=sources.find(x=>x.error)?.error;
   if(live)setData({loading:false,error:firstError?.message||null,session,role,players:players.data||[],seasons:seasons.data||[],competitions:competitions.data||[],opponents:opponents.data||[],matches:matches.data||[],scores:scores.data||[],settings:settings.data||{},events:events.data||[],ratings:ratings.data||[],roster:roster.data||[],stats:stats.data||[],profiles,userRoles});
  }
  load();
  const{data:listener}=supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));
  return()=>{live=false;listener.subscription.unsubscribe()}
 },[version,refresh]);
 return{...data,refresh,season:data.seasons.find(x=>x.status==='active')||data.seasons[0]||null};
}