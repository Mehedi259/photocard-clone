import os
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor

os.makedirs('/Users/mehedihasanmridul/website/photocard-clone/assets/templates/bg', exist_ok=True)
os.makedirs('/Users/mehedihasanmridul/website/photocard-clone/assets/templates/thumb', exist_ok=True)

with open('/Users/mehedihasanmridul/website/photocard-clone/data/photocards.json') as f:
    data = json.load(f)

def download_item(item):
    tid = item['id']
    bg_url = item.get('bg')
    thumb_url = item.get('thumb')
    
    bg_ext = os.path.splitext(bg_url)[1] or '.png'
    thumb_ext = os.path.splitext(thumb_url)[1] or '.jpg'
    
    bg_local_path = f'/Users/mehedihasanmridul/website/photocard-clone/assets/templates/bg/{tid}{bg_ext}'
    thumb_local_path = f'/Users/mehedihasanmridul/website/photocard-clone/assets/templates/thumb/{tid}{thumb_ext}'
    
    bg_web_path = f'/assets/templates/bg/{tid}{bg_ext}'
    thumb_web_path = f'/assets/templates/thumb/{tid}{thumb_ext}'
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # Download BG if not exists or 0 bytes
    if not os.path.exists(bg_local_path) or os.path.getsize(bg_local_path) == 0:
        try:
            req = urllib.request.Request(bg_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r, open(bg_local_path, 'wb') as out:
                out.write(r.read())
        except Exception as e:
            print(f'Error downloading BG {tid}: {e}')
            bg_web_path = bg_url # fallback

    # Download Thumb if not exists or 0 bytes
    if not os.path.exists(thumb_local_path) or os.path.getsize(thumb_local_path) == 0:
        try:
            req = urllib.request.Request(thumb_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r, open(thumb_local_path, 'wb') as out:
                out.write(r.read())
        except Exception as e:
            print(f'Error downloading Thumb {tid}: {e}')
            thumb_web_path = thumb_url # fallback

    item['bg'] = bg_web_path
    item['thumb'] = thumb_web_path
    return item

print(f'Starting parallel download of 208 backgrounds & thumbnails...')
results = []
with ThreadPoolExecutor(max_workers=16) as ex:
    for res in ex.map(download_item, data):
        results.append(res)
        if len(results) % 30 == 0 or len(results) == len(data):
            print(f'Downloaded {len(results)}/{len(data)}...')

# Save updated photocards.json & photocards.js
with open('/Users/mehedihasanmridul/website/photocard-clone/data/photocards.json', 'w') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

with open('/Users/mehedihasanmridul/website/photocard-clone/data/photocards.js', 'w') as f:
    f.write('window.PS_PHOTOCARDS = ' + json.dumps(results, ensure_ascii=False) + ';')

print('All 208 templates localized successfully!')
