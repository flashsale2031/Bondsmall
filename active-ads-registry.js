/* Bonds Mall Active Ads Registry — canonical verified publication registry. */
(function(){'use strict';
 const KEY='bondsMallActiveAdsRegistry';let ads=[];const now=()=>new Date().toISOString();
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');ads=Array.isArray(v)?v:[];}catch(_){ads=[];}return list();}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(ads));}catch(_){}window.dispatchEvent(new CustomEvent('bonds:active-ads-updated',{detail:list()}));}
 function validUrl(url){try{const u=new URL(String(url||''));return /^https?:$/.test(u.protocol)&&!!u.hostname;}catch(_){return false;}}
 function upsert(ad){if(!ad||!validUrl(ad.liveUrl)||ad.verificationStatus!=='verified')return null;const id=ad.id||('AD-'+Date.now().toString(36).toUpperCase());const existing=ads.find(x=>x.id===id);const record=Object.assign(existing||{id,createdAt:now()},ad,{liveUrl:String(ad.liveUrl).trim(),updatedAt:now(),status:'live'});if(existing)Object.assign(existing,record);else ads.push(record);save();return clone(record);}
 function mark(id,status,extra){const a=ads.find(x=>x.id===id);if(!a)return null;Object.assign(a,extra||{},{status,updatedAt:now()});save();return clone(a);}
 function remove(id){ads=ads.filter(a=>a.id!==id);save();}
 function list(filter){const out=filter?ads.filter(a=>Object.keys(filter).every(k=>a[k]===filter[k])):ads;return clone(out);}
 window.BondsMallActiveAdsRegistry={load,upsert,mark,remove,list,validUrl};load();
})();
