/* Bonds Mall Persistent Mission Job Queue
 * Improvement 2: resumable, deduplicated, retry-aware product/location/platform jobs.
 */
(function(){'use strict';
 const KEY='bondsMallMissionJobQueue', TERMINAL=['published','cancelled'];
 let jobs=[];
 const now=()=>new Date().toISOString();
 function save(){try{localStorage.setItem(KEY,JSON.stringify(jobs));}catch(_){} }
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');jobs=Array.isArray(v)?v:[];}catch(_){jobs=[];}return list();}
 function keyOf(x){return [x.missionId||'',x.productId||x.product?.id||x.product?.name||'',x.locationId||x.location?.id||x.location?.name||'',x.platform||''].join('|').toLowerCase();}
 function enqueue(input){const k=keyOf(input), existing=jobs.find(j=>j.uniqueKey===k&&!TERMINAL.includes(j.status)); if(existing)return existing; const job=Object.assign({id:'JOB-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7),status:'queued',attempts:0,maxAttempts:3,priority:2,nextAttemptAt:null,createdAt:now(),updatedAt:now(),lastError:'',uniqueKey:k},input);jobs.push(job);save();emit('job.queued',job);return job;}
 function claim(id){const j=jobs.find(x=>x.id===id);if(!j)return null;j.status='processing';j.attempts++;j.updatedAt=now();save();emit('job.claimed',j);return j;}
 function succeed(id,patch){const j=jobs.find(x=>x.id===id);if(!j)return null;Object.assign(j,patch||{}, {status:'published',updatedAt:now(),lastError:''});save();emit('job.published',j);return j;}
 function fail(id,error){const j=jobs.find(x=>x.id===id);if(!j)return null;j.lastError=String(error||'Unknown error');j.status=j.attempts<j.maxAttempts?'retry-wait':'failed';j.nextAttemptAt=j.status==='retry-wait'?new Date(Date.now()+Math.min(3600000,Math.pow(2,j.attempts)*60000)).toISOString():null;j.updatedAt=now();save();emit('job.failed',j);return j;}
 function ready(){const t=Date.now();return jobs.filter(j=>!TERMINAL.includes(j.status)&&['queued','retry-wait'].includes(j.status)&&(!j.nextAttemptAt||Date.parse(j.nextAttemptAt)<=t)).sort((a,b)=>(a.priority||2)-(b.priority||2)||Date.parse(a.createdAt)-Date.parse(b.createdAt));}
 function remove(id){jobs=jobs.filter(j=>j.id!==id);save();}
 function list(){return JSON.parse(JSON.stringify(jobs));}
 function emit(type,job){window.dispatchEvent(new CustomEvent('bonds:mission-job',{detail:{type,job:JSON.parse(JSON.stringify(job))}}));}
 window.BondsMallMissionJobQueue={load,enqueue,claim,succeed,fail,ready,remove,list}; load();
})();
