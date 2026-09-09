/* Bonds Mall Platform Emulator Flow
 * Human-assisted sign-in and posting path for every supported platform.
 * The Android emulator is the browser surface: credentials, CAPTCHA, MFA,
 * consent, and final submission remain human-controlled.
 */
(function(root){'use strict';
 const E=()=>root.BondsMallAndroidEmulator;
 const PATHS={
  Craigslist:{home:'https://www.craigslist.org/',signIn:'https://accounts.craigslist.org/login',post:'https://post.craigslist.org/'},
  AdLandPro:{home:'https://www.adlandpro.com/',signIn:'https://www.adlandpro.com/account/login.aspx',post:'https://www.adlandpro.com/post.aspx'},
  ClassifiedAds:{home:'https://www.classifiedads.com/',signIn:'https://www.classifiedads.com/login',post:'https://www.classifiedads.com/post.htm'},
  'Facebook Marketplace':{home:'https://www.facebook.com/marketplace/',signIn:'https://www.facebook.com/login/',post:'https://www.facebook.com/marketplace/create/item'},
  OfferUp:{home:'https://offerup.com/',signIn:'https://offerup.com/login',post:'https://offerup.com/post'},
  Mercari:{home:'https://www.mercari.com/',signIn:'https://www.mercari.com/login/',post:'https://www.mercari.com/sell/'},
  Poshmark:{home:'https://poshmark.com/',signIn:'https://poshmark.com/login',post:'https://poshmark.com/create-listing'},
  Nextdoor:{home:'https://nextdoor.com/',signIn:'https://nextdoor.com/login/',post:'https://nextdoor.com/for_sale_and_free/'},
  eBay:{home:'https://www.ebay.com/',signIn:'https://signin.ebay.com/',post:'https://www.ebay.com/sl/sell'},
  Etsy:{home:'https://www.etsy.com/',signIn:'https://www.etsy.com/signin',post:'https://www.etsy.com/your/shops/me/listing-editor'}
 };
 function path(platform){return PATHS[platform]||null;}
 function open(platform,kind,job){const p=path(platform);if(!p)throw Error('No emulator path registered for '+platform);const url=p[kind]||p.home;if(!E()||typeof E().open!=='function')return Promise.resolve({humanActionRequired:true,platform,kind,url,code:'EMULATOR_UNAVAILABLE'});E().open(url);window.dispatchEvent(new CustomEvent('bonds:platform-emulator-opened',{detail:{platform,kind,url,job:job||null,at:new Date().toISOString()}}));return Promise.resolve({humanActionRequired:true,platform,kind,url,message:`${platform} ${kind} opened in the Android emulator. Complete sign-in, CAPTCHA/MFA, and submission manually.`});}
 function signIn(platform,job){return open(platform,'signIn',job);}
 function post(platform,job){return open(platform,'post',job);}
 function home(platform,job){return open(platform,'home',job);}
 function all(){return JSON.parse(JSON.stringify(PATHS));}
 root.BondsMallPlatformEmulatorFlow={paths:all,open,signIn,post,home};
 Object.keys(PATHS).forEach(platform=>{const camel=platform.replace(/[^A-Za-z0-9]/g,'');root.BondsMall=root.BondsMall||{};root.BondsMall['postMissionJob'+camel]=function(job,options){return post(platform,job,options);};});
})(window);
