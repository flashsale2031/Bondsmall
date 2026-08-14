import json, requests
ids=[28272,28404,28409,28439,28460]
for off in ids:
 u='https://datasets-server.huggingface.co/rows'
 params={'dataset':'UniqueData/asos-e-commerce-dataset','config':'default','split':'train','offset':off,'length':1}
 r=requests.get(u,params=params,timeout=30)
 print('offset',off,'status',r.status_code)
 if r.ok:
  d=r.json(); row=d.get('rows',[{}])[0].get('row',{})
  print(json.dumps({k:row.get(k) for k in ['url','name','images']},ensure_ascii=False))
 else: print(r.text[:300])
