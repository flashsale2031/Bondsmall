/* Bonds Mall Mission Job Queue — durable, deduplicated, lease-aware execution. */
(function(){'use strict';
 const KEY='bondsMallMissionJobQueue', TERMINAL=['published','cancelled'];
 let jobs=[]; const now=()=>new Date().toISOString();
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(jobs));}catch(_){} }
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');jobs=Array.isArray(v)?v:[];}catch(_){jobs=[];}return list();}
 function keyOf(x){return [x.missionId||'',x.productId||x.product?.id||x.product?.name||'',x.locationId||x.location?.id||x.location?.name||'',x.platform||'',x.contentVersion||'1'].join('|').toLowerCase();}
 function enqueue(input){const k=keyOf(input),existing=jobs.find(j=>j.uniqueKey===k&&!TERMINAL.includes(j.status));if(existing)return clone(existing);const job=Object.assign({id:'JOB-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7),status:'queued',attempts:0,maxAttempts:3,priority:'P2',nextAttemptAt:null,leaseUntil:null,createdAt:now(),updatedAt:now(),lastError:'',uniqueKey:k},input,{uniqueKey:k});jobs.push(job);save();emit('job.queued',job);return clone(job);}
 function claim(id,leaseMs){const j=jobs.find(x=>x.id===id);if(!j)return null;if(j.status==='processing'&&j.leaseUntil&&Date.parse(j.leaseUntil)>Date.now())return null;j.status='processing';j.attempts++;j.leaseUntil=new Date(Date.now()+(leaseMs||300000)).toISOString();j.updatedAt=now();save();emit('job.claimed',j);return clone(j);}
 function succeed(id,patch){const j=jobs.find(x=>x.id===id);if(!j)return null;Object.assign(j,patch||{},{status:'published',leaseUntil:null,updatedAt:now(),lastError:''});save();emit('job.published',j);return clone(j);}
 function fail(id,error,opts){const j=jobs.find(x=>x.id===id);if(!j)return null;j.lastError=String(error||'Unknown error');j.leaseUntil=null;const retryable=!opts||opts.retryable!==false;j.status=retryable&&j.attempts<j.maxAttempts?'retry-wait':'failed';j.nextAttemptAt=j.status==='retry-wait'?new Date(Date.now()+Math.min(3600000,Math.pow(2,j.attempts)*60000)).toISOString():null;j.updatedAt=now();save();emit('job.failed',j);return clone(j);}
 function releaseExpired(){const t=Date.now();jobs.forEach(j=>{if(j.status==='processing'&&j.leaseUntil&&Date.parse(j.leaseUntil)<=t){j.status='retry-wait';j.nextAttemptAt=now();j.leaseUntil=null;j.updatedAt=now();emit('job.lease-expired',j);}});save();return ready();}
 function ready(){releaseExpiredNoSave();const t=Date.now();return jobs.filter(j=>!TERMINAL.includes(j.status)&&['queued','retry-wait'].includes(j.status)&&(!j.nextAttemptAt||Date.parse(j.nextAttemptAt)<=t)).sort((a,b)=>priority(a)-priority(b)||Date.parse(a.createdAt)-Date.parse(b.createdAt)).map(clone);}
 function releaseExpiredNoSave(){const t=Date.now();jobs.forEach(j=>{if(j.status==='processing'&&j.leaseUntil&&Date.parse(j.leaseUntil)<=t){j.status='retry-wait';j.nextAttemptAt=now();j.leaseUntil=null;j.updatedAt=now();}});}
 function priority(j){return ({P0:0,P1:1,P2:2,P3:3,P4:4})[j.priority]??2;}
 function cancel(id,reason){const j=jobs.find(x=>x.id===id);if(!j)return null;j.status='cancelled';j.cancelReason=String(reason||'Cancelled');j.leaseUntil=null;j.updatedAt=now();save();emit('job.cancelled',j);return clone(j);}
 function list(){return clone(jobs);}
 function emit(type,job){window.dispatchEvent(new CustomEvent('bonds:mission-job',{detail:{type,job:clone(job)}}));}
 window.BondsMallMissionJobQueue={load,enqueue,claim,succeed,fail,cancel,releaseExpired,ready,list};load();
})();
