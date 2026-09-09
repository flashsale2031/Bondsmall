#!/usr/bin/env python3
import os,json,re,base64,urllib.request,urllib.parse
from http.server import BaseHTTPRequestHandler,HTTPServer
OWNER=os.getenv('BONDS_MALL_GITHUB_OWNER','flashsale2031'); REPO=os.getenv('BONDS_MALL_GITHUB_REPO','Bondsmall'); BRANCH=os.getenv('BONDS_MALL_GITHUB_BRANCH','main'); TOKEN=os.getenv('BONDS_MALL_GITHUB_TOKEN',''); SEARCH=os.getenv('BONDS_MALL_RESEARCH_SEARCH_URL','')
BLOCK=re.compile(r'(captcha\s*(solver|bypass|crack)|anti[- ]?bot\s*(bypass|defeat|evade)|credential\s*(steal|dump)|session\s*cookie\s*(steal|dump))',re.I)
def slug(x): return re.sub(r'[^a-zA-Z0-9]+','-',str(x or '').strip()).strip('-').lower()[:80] or 'solution'
def name(f):
 e=os.path.splitext(str(f.get('target_file','solution.js')))[1].lower(); e=e if e in {'.html','.htm','.js','.py'} else '.js'
 from datetime import datetime,timezone
 return f"research-solution-{slug(f.get('failure_code'))}-{slug(f.get('target_file'))}-{datetime.now(timezone.utc).isoformat().replace(':','-').replace('.','-')}{e}"
def call(url,obj,headers):
 req=urllib.request.Request(url,data=json.dumps(obj).encode(),headers=headers,method='POST')
 with urllib.request.urlopen(req,timeout=60) as r:return json.loads(r.read().decode())
def research(f):
 if not SEARCH:return {'solution':'','source_url':'','message':'Set BONDS_MALL_RESEARCH_SEARCH_URL.'}
 q=f"Bonds Mall programmatic solution {f.get('failure_code','')} {f.get('failure_description','')} {f.get('target_file','')}"
 return call(SEARCH,{'query':q},{'Content-Type':'application/json','User-Agent':'BondsMall-Research'})
def submit(f):
 content=str(f.get('solution',''))
 if not content.strip(): raise ValueError('solution required')
 if BLOCK.search(content) or BLOCK.search(f.get('failure_description','')): raise ValueError('unsafe solution category')
 if not TOKEN: raise ValueError('BONDS_MALL_GITHUB_TOKEN is not configured')
 path='research-submissions/'+name(f)
 url=f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{urllib.parse.quote(path)}'
 headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+TOKEN,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json','User-Agent':'BondsMall-Research'}
 r=call(url,{'message':'research: submit '+str(f.get('failure_code','failure')),'content':base64.b64encode(content.encode()).decode(),'branch':BRANCH},headers)
 return {'filename':path,'url':r.get('content',{}).get('html_url',''),'commit':r.get('commit',{}).get('sha',''),'productionDeploy':False}
class H(BaseHTTPRequestHandler):
 def out(self,c,x):
  b=json.dumps(x).encode();self.send_response(c);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_POST(self):
  try:
   d=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
   if self.path=='/research':return self.out(200,research(d))
   if self.path=='/submit':return self.out(201,submit(d))
   self.out(404,{'error':'not found'})
  except Exception as e:self.out(400,{'error':str(e)})
if __name__=='__main__': HTTPServer(('0.0.0.0',int(os.getenv('PORT','8787'))),H).serve_forever()
