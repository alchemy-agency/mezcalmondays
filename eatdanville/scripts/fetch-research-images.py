import json, io, urllib.request, hashlib
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
items={}
def add(key, imgs, logo=None):
    items.setdefault(key, {'imgs':[], 'logo':logo})
    for m in imgs:
        if not m.get('http_ok'): continue
        u=m.get('url','')
        if not u.startswith('http'): continue
        if any(u==x['url'] for x in items[key]['imgs']): continue
        items[key]['imgs'].append(m)
    if logo and not items[key]['logo']: items[key]['logo']=logo
for fn in ['data/research/r2-images-1.json','data/research/r2-images-2.json']:
    r=json.load(open(fn,encoding='utf-8'))
    for x in r['restaurants']: add(x['key'], x.get('images',[]), x.get('logo_url'))
inc=json.load(open('data/research/r2-incontro.json',encoding='utf-8'))
add('incontro', inc.get('images',[]), inc.get('logo_url'))
manifest=[]
for key,v in items.items():
    print(key, len(v['imgs']), 'logo:', (v['logo'] or '')[:70])
    outdir=Path('src/assets/img')/key/'raw'; outdir.mkdir(parents=True, exist_ok=True)
    n=0
    for i,m in enumerate(v['imgs']):
        u=m['url']
        try:
            req=urllib.request.Request(u, headers={'User-Agent':UA,'Accept':'image/*,*/*'})
            data=urllib.request.urlopen(req, timeout=30).read()
            im=ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
            w,h=im.size
            if w<600 or h<400: continue
            h8=hashlib.md5(data).hexdigest()[:8]
            name=f"{i:02d}-{(m.get('kind') or 'img').replace('/','-')}-{h8}.jpg"
            im.convert('RGB').save(outdir/name, quality=93)
            manifest.append({'slug':key,'file':(outdir/name).as_posix(),'w':w,'h':h,'kind':m.get('kind'),'desc':(m.get('description') or '')[:140],'own':m.get('is_own_site'),'hero':m.get('hero_candidate'),'url':u})
            n+=1
        except Exception as e:
            print('  fail', u[:80], str(e)[:60])
    print('  saved', n)
json.dump(manifest, open('data/research/images-manifest.json','w',encoding='utf-8'), indent=1)
try: font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
except Exception: font=ImageFont.load_default()
for key in items:
    ms=[m for m in manifest if m['slug']==key]
    if not ms: continue
    cols=5; tw,th=300,200; rows=(len(ms)+cols-1)//cols
    sheet=Image.new('RGB',(cols*tw, rows*(th+34)),(20,23,29)); d=ImageDraw.Draw(sheet)
    for idx,m in enumerate(ms):
        im=ImageOps.fit(Image.open(m['file']),(tw-6,th-6))
        x=(idx%cols)*tw+3; y=(idx//cols)*(th+34)+3
        sheet.paste(im,(x,y))
        d.text((x,y+th-2), f"#{idx} {m['kind']} {m['w']}x{m['h']} {'own' if m['own'] else 'ext'}", fill=(244,245,247), font=font)
        d.text((x,y+th+14), m['desc'][:44], fill=(166,173,184), font=font)
    Path('qa').mkdir(exist_ok=True)
    sheet.save(f'qa/sheet-{key}.jpg', quality=85); print('sheet', key, len(ms))
