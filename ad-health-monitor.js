/* Bonds Mall Ad Health Monitor
 * Improvement 6: repeated URL health checks and automatic handoff of unhealthy ads to Resubmission.
 */
(function(){'use strict';
 const KEY='bondsMallAdHealth';let checks=[];const now=()=>new Date().toISOString();
 function save(){try{localStorage.setItem(KEY,JSON.stringify(checks));}catch(_){} }
 async function check(ad){const started=Date.now();let status=0,error='';try{const response=await fetch(ad.liveUrl,{method:'HEAD',cache:'no-store',redirect:'follow'});status=response.status;if(status===405||status===403){const fallback=await fetch(ad.liveUrl,{method:'GET',cache:'no-store',redirect:'follow'});status=fallback.status;}}catch(e){error=e&&e.message?e.message:String(e);}const healthy=status===200;const record={adId:ad.id,url:ad.liveUrl,status,healthy,error,checkedAt:now(),latencyMs:Date.now()-started};checks.push(record);if(checks.length>500)checks=checks.slice(-500);save();window.dispatchEvent(new CustomEvent('bonds:ad-health-result',{detail:record}));if(!healthy){window.dispatchEvent(new CustomEvent('bonds:resubmission-queue-request',{detail:{product:ad.product,location:ad.location,platform:ad.platform,sourceUrl:ad.liveUrl,reason:'Ad health check failed',health:record}}));}return record;}
 async function scan(ads){const results=[];for(const ad of (ads||[]))results.push(await check(ad));return results;}
 function history(){return checks.slice();}
 window.BondsMallAdHealthMonitor={check,scan,history};
})();
