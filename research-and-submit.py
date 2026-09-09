#!/usr/bin/env python3
import os,json,re,base64,urllib.request
from datetime import datetime,timezone
SEARCH=os.getenv('BONDS_MALL_RESEARCH_SEARCH_URL','');TOKEN=os.getenv('BONDS_MALL_GITHUB_TOKEN','');OWNER=os.getenv('BONDS_MALL_GITHUB_OWNER','flashsale2031');REPO=os.getenv('BONDS_MALL_GITHUB_REPO','Bondsmall');BRANCH=os.getenv('BONDS_MALL_GITHUB_BRANCH','main')
BLOCK=re.compile(r'(captcha\s*(solver|bypass)|anti[- ]?bot\s*(bypass|defeat)|credential\s*(steal|dump)|session\s*cookie\s*(steal|dump))',re.I)
def api(u,p,h):
 r=urllib.request.Request(u,data=json.dumps(p).encode(),headers=h,method='POST')
 with urllib.request.urlopen(r,timeout=60) as x:return json.loads(x.read().decode())
def slug(x):return re.sub(r'[^a-z0-9]+','-',str(x or '').lower()).strip('-')[:80] or 'solution'
def main():
 with open(os.getenv('BONDS_MALL_RESEARCH_REPORT','researchflow-report.json'),encoding='utf8') as f: report=json.load(f)
 results=[]
 for finding in report.get('findings',[]):
  if not SEARCH: results.append({'finding':finding,'status':'research-provider-not-configured'});continue
  q='programmatic remediation for '+finding.get('code','')+' '+finding.get('message','')+' '+finding.get('remediation','')
  r=api(SEARCH,{'query':q},{'Content-Type':'application/json','User-Agent':'BondsMall-Research'})
  sol=str(r.get('solution','')); item={'finding':finding,'research':r,'status':'not-submitted'}
  if sol and TOKEN and not BLOCK.search(sol):
   stamp=datetime.now(timezone.utc).isoformat().replace(':','-').replace('.','-'); path=f"research-submissions/research-solution-{slug(finding.get('code'))}-{stamp}.js"; u=f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}'
   h={'Accept':'application/vnd.github+json','Authorization':'Bearer '+TOKEN,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json','User-Agent':'BondsMall-Research'}
   z=api(u,{'message':'research: submit '+finding.get('code','failure'),'content':base64.b64encode(sol.encode()).decode(),'branch':BRANCH},h); item.update(status='submitted',path=path,url=z.get('content',{}).get('html_url',''),productionDeploy=False)
  results.append(item)
 with open('mission-research-submissions.json','w',encoding='utf8') as f:json.dump({'generatedAt':datetime.now(timezone.utc).isoformat(),'results':results},f,indent=2)
if __name__=='__main__':main()
