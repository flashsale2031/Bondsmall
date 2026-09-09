/* Bonds Mall Ad Health Monitor — continuous live-ad verification and recovery. */
(function(){'use strict';
 const KEY='bondsMallAdHealth';let checks=[];const now=()=>new Date().toISOString();
 function save(){try{localStorage.setItem(KEY,JSON.stringify(checks));}catch(_){} }
 function safeUrl(url){try{const u=new URL(String(url||''));return /^https?:$/.test(u.protocol)?u:null;}catch(_){return null;}}
 async function check(ad){const started=Date.now(),parsed=safeUrl(ad&&ad.liveUrl);let status=0,error='',finalUrl='';if(!parsed){const record={adId:ad&&ad.id,url:ad&&ad.liveUrl,status:0,healthy:false,error:'Invalid URL',checkedAt:now(),latencyMs:0};checks.push(record);save();emit(record);return record;}try{let response=await fetch(parsed.toString(),{method:'HEAD',cache:'no-store',redirect:'follow'});status=response.status;finalUrl=response.url||parsed.toString();if(status===405||status===403){response=await fetch(parsed.toString(),{method:'GET',cache:'no-store',redirect:'follow'});status=response.status;finalUrl=response.url||finalUrl;}}catch(e){error=e&&e.message?e.message:String(e);}const healthy=status===200,drift=!!finalUrl&&finalUrl!==parsed.toString();const record={adId:ad.id,url:ad.liveUrl,status,healthy,error,finalUrl,drift,checkedAt:now(),latencyMs:Date.now()-started};checks.push(record);if(checks.length>1000)checks=checks.slice(-1000);save();emit(record);if(!healthy||drift){window.dispatchEvent(new CustomEvent('bonds:resubmission-queue-request',{detail:{product:ad.product,location:ad.location,platform:ad.platform,sourceUrl:ad.liveUrl,reason:healthy?'Ad URL drift detected':'Ad health check failed',health:record}}));}return record;}
 function emit(record){window.dispatchEvent(new CustomEvent('bonds:ad-health-result',{detail:record}));}
 async function scan(ads){const results=[];for(const ad of(ads||[]))results.push(await check(ad));return results;}
 function history(){return checks.slice();}
 window.BondsMallAdHealthMonitor={check,scan,history};
})();
