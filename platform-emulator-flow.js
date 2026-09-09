/* Bonds Mall Platform Emulator Flow
 * Human-assisted sign-in and posting path for every supported platform.
 * The Android emulator is the browser surface: credentials, CAPTCHA, MFA,
 * consent, and final submission remain human-controlled.
 * Seller account numbers select the emulator browser profile:
 * 1 Firefox, 2 Samsung Internet, 3 Chrome, 4 Opera, 5 Safari,
 * 6 Brave, 7 Internet Explorer, 8 Edge, 9 Tor, 10 Dolphin.
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
 function accountProfile(accountNumber){const api=root.BondsMallSellerBrowserAccounts;if(api&&typeof api.profile==='function'){return api.profile(accountNumber)||api.get&&api.get();}const n=Number(accountNumber)||1;const browsers=['Firefox','Samsung Internet','Chrome','Opera','Safari','Brave Browser','Internet Explorer','Edge','Tor','Dolphin'];return{accountNumber:n,browserType:browsers[n-1]||browsers[0]};}
 function resolveAccount(job,options){const explicit=options&&options.accountNumber!=null?options.accountNumber:job&&job.accountNumber;const api=root.BondsMallSellerBrowserAccounts;if(explicit!=null)return accountProfile(explicit);if(api&&typeof api.get==='function')return api.get();return accountProfile(1);}
 function path(platform){return PATHS[platform]||null;}
 function open(platform,kind,job,options){const p=path(platform);if(!p)throw Error('No emulator path registered for '+platform);const url=p[kind]||p.home;const account=resolveAccount(job,options);if(!E()||typeof E().open!=='function')return Promise.resolve({humanActionRequired:true,platform,kind,url,accountNumber:account.accountNumber,browserType:account.browserType,code:'EMULATOR_UNAVAILABLE'});E().open(url,{accountNumber:account.accountNumber,browserType:account.browserType,engine:account.engine,nativeCandidates:account.nativeCandidates});window.dispatchEvent(new CustomEvent('bonds:platform-emulator-opened',{detail:{platform,kind,url,accountNumber:account.accountNumber,browserType:account.browserType,engine:account.engine,job:job||null,at:new Date().toISOString()}}));return Promise.resolve({humanActionRequired:true,platform,kind,url,accountNumber:account.accountNumber,browserType:account.browserType,engine:account.engine,message:`${platform} ${kind} opened in Seller account ${account.accountNumber} using the ${account.browserType} emulator profile. Complete sign-in, CAPTCHA/MFA, and submission manually.`});}
 function signIn(platform,job,options){return open(platform,'signIn',job,options);}
 function post(platform,job,options){return open(platform,'post',job,options);}
 function home(platform,job,options){return open(platform,'home',job,options);}
 function all(){return JSON.parse(JSON.stringify(PATHS));}
 root.BondsMallPlatformEmulatorFlow={paths:all,open,signIn,post,home,accountProfile,resolveAccount};
 Object.keys(PATHS).forEach(platform=>{const camel=platform.replace(/[^A-Za-z0-9]/g,'');root.BondsMall=root.BondsMall||{};root.BondsMall['postMissionJob'+camel]=function(job,options){return post(platform,job,options);};});
})(window);
