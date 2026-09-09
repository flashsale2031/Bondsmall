/* Bonds Mall Platform Adapter Contract
 * Improvement 3: common validate/prepare/submit/verify/normalize/report interface for 10 platforms.
 */
(function(){'use strict';
 const PLATFORMS=['Craigslist','AdLandPro','ClassifiedAds','Facebook Marketplace','OfferUp','Mercari','Poshmark','Nextdoor','eBay','Etsy'];
 function named(platform){const camel=platform.replace(/[^A-Za-z0-9]/g,'');const root=window.BondsMall||{};return root['postMissionJob'+camel]||window['postMissionJob'+camel]||root.postMissionJob||null;}
 function validate(job){const missing=[];if(!job.product)missing.push('product');if(!job.location)missing.push('location');if(!job.platform)missing.push('platform');return {ok:!missing.length,missing};}
 async function prepare(job){const v=validate(job);if(!v.ok)throw new Error('Platform preflight missing: '+v.missing.join(', '));return Object.assign({},job,{preparedAt:new Date().toISOString()});}
 async function submit(platform,job){const fn=named(platform);if(typeof fn!=='function')return {integrationMissing:true,platform,message:'No authorized integration for '+platform};return fn(job,{});}
 async function verify(result){const url=result&&result.url?String(result.url).trim():'';return {ok:/^https?:\/\//i.test(url),url};}
 function normalize(url){try{const u=new URL(url);u.hash='';return u.toString();}catch(_){return '';}}
 function adapter(platform){return {platform,validate,prepare,submit:(job)=>submit(platform,job),verify,normalize,report:(result)=>({platform,result,reportedAt:new Date().toISOString()})};}
 const adapters={};PLATFORMS.forEach(p=>adapters[p]=adapter(p));
 window.BondsMallPlatformAdapters={platforms:PLATFORMS,adapters,get:platform=>adapters[platform]||null};
})();
