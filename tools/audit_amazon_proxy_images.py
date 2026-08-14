import re,requests
from pathlib import Path
samples=['B08JPFJ4RV','B08FJ5V6C6','B07V4VD6PB','B002JP91UE','B07R15GGBL']
for asin in samples:
 r=requests.get(f'https://r.jina.ai/http://www.amazon.com/dp/{asin}',timeout=60)
 urls=re.findall(r'https://(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)/images/I/[^)\s]+',r.text)
 print('\nASIN',asin,'status',r.status_code,'bytes',len(r.text))
 print('\n'.join(dict.fromkeys(urls[:20])))
 print('title_line',next((x for x in r.text.splitlines() if x.startswith('Title:')),''))
