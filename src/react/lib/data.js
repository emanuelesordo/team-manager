import{useCallback,useEffect,useState}from'react';import{supabase}from'./supabase.js';
export const TEAM_ID='d0c3210b-6a8a-4a1b-93c8-e2400029006e';
const blank={loading:true,error:null,session:null,role:null,matches:[],players:[],roster:[],opponents:[],competitions:[],seasons:[],scores:[],stats:[],ratings:[],teamStats:null,settings:{}};
export function useTeamData(){
 const[data,setData]=useState(blank);
 const load=useCallback(async()=>{
  setData(x=>({...x,loading:true,error:null}));
  const{data:{session}}=await supabase.auth.getSession();
  const [players,seasons,competitions,opponents,matches,scores,settings]=await Promise.all([
   supabase.from('players').select('id,team_id,first_name,last_name,birth_date,preferred_foot,photo_url,nationality_code,generic_role_manual,height_cm').eq('team_id',TEAM_ID).order('last_name'),
   supabase.from('app_seasons').select('*').eq('team_id',TEAM_ID).order('start_date',{ascending:false}),
   supabase.from('app_competitions').select('*').order('name'),
   supabase.from('app_opponents').select('*').order('name'),
   supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
   supabase.from('app_match_score').select('*'),
   supabase.from('app_settings').select('*').eq('id',true).maybeSingle()
  ]);
  const err=[players,seasons,competitions,opponents,matches,scores,settings].find(x=>x.error)?.error;
  const season=(seasons.data||[]).find(x=>x.status==='active')||(seasons.data||[])[0]||null;
  const [stats,roster,ratings,teamStats,seasonEvents]=season?await Promise.all([
   supabase.from('app_player_season_stats').select('*').eq('season_id',season.id),
   supabase.from('app_roster').select('*').eq('season_id',season.id),
   supabase.from('v_player_rating_stats').select('*').eq('team_id',TEAM_ID).eq('season_id',season.id),
   supabase.from('v_team_season_stats').select('*').eq('team_id',TEAM_ID).eq('season_id',season.id).maybeSingle(),
   supabase.from('app_match_events').select('*').in('match_id',(matches.data||[]).filter(m=>m.season_id===season.id).map(m=>m.id).length?(matches.data||[]).filter(m=>m.season_id===season.id).map(m=>m.id):['00000000-0000-0000-0000-000000000000'])
  ]):[{data:[]},{data:[]},{data:[]},{data:null},{data:[]}];
  let role=null;if(session){const r=await supabase.from('app_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();role=r.data?.role||'fan'}
  setData({loading:false,error:err?.message||stats.error?.message||null,session,role,players:players.data||[],seasons:seasons.data||[],competitions:competitions.data||[],opponents:opponents.data||[],matches:matches.data||[],scores:scores.data||[],settings:settings.data||{},stats:stats.data||[],roster:roster.data||[],ratings:ratings.data||[],teamStats:teamStats.data||null,seasonEvents:seasonEvents.data||[]});
 },[]);
 useEffect(()=>{load();const{data:l}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0));return()=>l.subscription.unsubscribe()},[load]);
 return{...data,reload:load};
}
export async function signIn(username,password){const{data,error}=await supabase.functions.invoke('auth-login',{body:{username,password}});if(error||!data?.session)return{error:error||new Error(data?.error||'Accesso fallito')};const set=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});return{data:set.data,error:set.error}}
export async function signOut(){return supabase.auth.signOut()}
export async function getMatchDetail(matchId){
 const[players,events,tactical]=await Promise.all([
  supabase.from('app_match_players').select('*').eq('match_id',matchId),
  supabase.from('app_match_events').select('*').eq('match_id',matchId).order('minute'),
  supabase.from('app_match_tactical_changes').select('*').eq('match_id',matchId).order('minute')
 ]);
 return{players:players.data||[],events:events.data||[],tactical:tactical.data||[],error:players.error||events.error||tactical.error};
}
export async function saveMatchPlayer(row){return supabase.from('app_match_players').upsert(row,{onConflict:'match_id,player_id'})}
export async function saveMatchPlayers(rows){return supabase.from('app_match_players').upsert(rows,{onConflict:'match_id,player_id'})}
export async function saveFormation(matchId,formation){return supabase.from('app_matches').update({formation}).eq('id',matchId)}
export async function addMatchEvent(row){return supabase.from('app_match_events').insert(row)}
export async function removeMatchEvent(id){return supabase.from('app_match_events').delete().eq('id',id)}
export async function addTacticalChange(row){return supabase.from('app_match_tactical_changes').insert(row)}
