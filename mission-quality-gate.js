/* Bonds Mall Mission Quality Gate
 * Improvement 4: block incomplete or unsafe jobs before they consume posting attempts.
 */
(function(){'use strict';
 const RULES=['product','location','platform','title','description'];
 function check(job,platformRules){const failures=[];RULES.forEach(k=>{if(job[k]==null&&!(job.product&&k==='product')&&!(job.location&&k==='location')&&!(job.platform&&k==='platform'))failures.push(k);});if(job.destinationUrl&&!/^https?:\/\//i.test(job.destinationUrl))failures.push('destinationUrl');if(job.media&&(!Array.isArray(job.media)||!job.media.length))failures.push('media');if(platformRules&&typeof platformRules==='function'){const extra=platformRules(job)||[];extra.forEach(x=>failures.push(String(x)));}return {passed:failures.length===0,failures,checkedAt:new Date().toISOString()};}
 function gate(job,platformRules){const result=check(job,platformRules);window.dispatchEvent(new CustomEvent('bonds:quality-gate',{detail:{jobId:job&&job.id,result}}));return result;}
 window.BondsMallMissionQualityGate={check,gate};
})();
