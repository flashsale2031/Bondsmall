/* Bonds Mall Posting Safety Governor
 * Improvement 7: platform-isolated adaptive safety, rate control, circuit breaking and emergency stop.
 */
(function(){'use strict';
 const KEY='bondsMallPostingSafetyGovernor', WINDOW_MS=600000, MAX_EVENTS=2000;
 let state={global:'GREEN',platforms:{},events:[],emergency:false};
 const now=()=>new Date().toISOString();
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v)state=Object.assign(state,v);}catch(_){}return getState();}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){} }
 function ensure(platform){if(!state.platforms[platform])state.platforms[platform]={state:'GREEN',success:0,failure:0,challenge:0,authFailure:0,lastEvent:null,windowStart:now()};return state.platforms[platform];}
 function record(platform,type,detail){const p=ensure(platform);p[type]=(p[type]||0)+1;p.lastEvent=now();state.events.push({at:now(),platform,type,detail:detail||null});if(state.events.length>MAX_EVENTS)state.events=state.events.slice(-MAX_EVENTS);recompute(platform);save();window.dispatchEvent(new CustomEvent('bonds:posting-safety-state',{detail:getState()}));return get(platform);}
 function recompute(platform){const p=ensure(platform), failures=p.failure||0, challenges=p.challenge||0, auth=p.authFailure||0, success=p.success||0, total=failures+challenges+auth+success; if(state.emergency){p.state='BLACK';return;} if(auth>=3||failures>=8){p.state='RED';}else if(challenges>=3||failures>=4){p.state='ORANGE';}else if(total>=3&&success<failures*2){p.state='YELLOW';}else p.state='GREEN';}
 function allow(platform){if(state.emergency)return{ok:false,state:'BLACK',reason:'GLOBAL_EMERGENCY_STOP'};const p=ensure(platform);recompute(platform);if(p.state==='RED'||p.state==='BLACK')return{ok:false,state:p.state,reason:'PLATFORM_CIRCUIT_OPEN'};return{ok:true,state:p.state,concurrency:p.state==='YELLOW'?1:1};}
 function success(platform,detail){return record(platform,'success',detail);}
 function failure(platform,detail){return record(platform,'failure',detail);}
 function challenge(platform,detail){return record(platform,'challenge',detail);}
 function authFailure(platform,detail){return record(platform,'authFailure',detail);}
 function emergencyStop(reason){state.emergency=true;state.global='BLACK';Object.keys(state.platforms).forEach(p=>state.platforms[p].state='BLACK');save();window.dispatchEvent(new CustomEvent('bonds:posting-emergency-stop',{detail:{at:now(),reason:reason||'operator stop'}}));return getState();}
 function resume(){state.emergency=false;state.global='GREEN';Object.keys(state.platforms).forEach(p=>{state.platforms[p].state='GREEN';p.success=0;p.failure=0;p.challenge=0;p.authFailure=0;});save();window.dispatchEvent(new CustomEvent('bonds:posting-safety-resumed',{detail:getState()}));return getState();}
 function get(platform){return JSON.parse(JSON.stringify(state.platforms[platform]||null));}
 function getState(){return JSON.parse(JSON.stringify(state));}
 window.BondsMallPostingSafetyGovernor={load,allow,success,failure,challenge,authFailure,emergencyStop,resume,get,getState};load();
})();
