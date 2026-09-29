import{useEffect,useState}from'react';import{supabase}from'./supabase.js';
export function useTeamData(){
 const[data,setData]=useState({loading:true,error:null,session:null,role:null,matches:[],players:[],opponents:[],competitions:[],seasons:[],scores:[],stats:[],settings:{}});
 useEffect(()=>{let live=true;
  async function load(){
   const{data:{session}}=await supabase.auth.getSession();
   const [players,seasons,competitions,opponents,matches,scores,settings]=await Promise.all([
    supabase.from('players').select('id,first_name,last_name,birth_date,preferred_foot,photo_url,nationality_code,generic_role_manual,height_cm').order('last_name'),
    supabase.from('app_seasons').select('*').order('start_date',{ascending:false}),
    supabase.from('app_competitions').select('*').order('name'),
    supabase.from('app_opponents').select('*').order('name'),
    supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
    supabase.from('app_match_score').select('*'),
    supabase.from('app_settings').select('*').eq('id',true).maybeSingle()
   ]);
   const firstError=[players,seasons,competitions,opponents,matches,scores,settings].find(x=>x.error)?.error;
   const season=(seasons.data||[]).find(x=>x.is_active)||(seasons.data||[])[0];
   const stats=season?await supabase.from('app_player_season_stats').select('*').eq('season_id',season.id):{data:[],error:null};
   let role=null;if(session){const r=await supabase.from('app_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();role=r.data?.role||'fan'}
   if(live)setData({loading:false,error:firstError?.message||stats.error?.message||null,session,role,players:players.data||[],seasons:seasons.data||[],competitions:competitions.data||[],opponents:opponents.data||[],matches:matches.data||[],scores:scores.data||[],settings:settings.data||{},stats:stats.data||[]});
  }
  load();const{data:listener}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0));return()=>{live=false;listener.subscription.unsubscribe()}
 },[]);return data;
}