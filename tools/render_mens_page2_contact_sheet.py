from pathlib import Path
import json,requests,io,math
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'mens-page2-image-audit.json').read_text())['records']; thumbs=[]
for rec in data:
    src=rec['image']
    try:
        if src.startswith('http'):
            raw=requests.get(src,headers={'User-Agent':'Mozilla/5.0'},timeout=30).content; im=Image.open(io.BytesIO(raw)).convert('RGB')
        else: im=Image.open(ROOT/src).convert('RGB')
        im.thumbnail((220,220)); c=Image.new('RGB',(240,280),'white'); c.paste(im,((240-im.width)//2,8)); d=ImageDraw.Draw(c); d.text((6,232),f"ID {rec['id']} / pos {rec['category_position']}",fill='black'); d.text((6,248),rec['name'][:34],fill='black'); d.text((6,264),rec.get('brand','')[:34],fill='black'); thumbs.append(c)
    except Exception as e:
        c=Image.new('RGB',(240,280),'#ffdddd'); ImageDraw.Draw(c).text((6,8),f"ID {rec['id']} load error\n{e}",fill='black'); thumbs.append(c)
cols=4; rows=math.ceil(len(thumbs)/cols); sheet=Image.new('RGB',(cols*240,rows*280),'#ddd')
for i,im in enumerate(thumbs): sheet.paste(im,((i%cols)*240,(i//cols)*280))
out=ROOT/'mens-page2-contact-sheet.jpg'; sheet.save(out,quality=92); print(out)
