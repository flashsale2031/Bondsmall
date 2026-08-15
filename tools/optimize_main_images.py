from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'assets'/'main-images'; changed=0; before=0; after=0
for f in root.glob('*.jpg'):
 before+=f.stat().st_size
 try:
  im=Image.open(f).convert('RGB'); im.thumbnail((640,640),Image.Resampling.LANCZOS); tmp=f.with_suffix('.tmp.jpg'); im.save(tmp,'JPEG',quality=78,optimize=True,progressive=True); tmp.replace(f); changed+=1
 except Exception as e: print('ERROR',f,e)
 after+=f.stat().st_size
print({'optimized':changed,'before_bytes':before,'after_bytes':after})
