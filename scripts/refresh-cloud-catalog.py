"""Refresh public provider snapshots, without reading profiles or calling Steam.
Run from the project root: python3 scripts/refresh-cloud-catalog.py
Writes only after both catalogues finish; HTTP/shape failures preserve existing data.
"""
import json,re,urllib.request,time
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
def fetch(url,query=None):
 req=urllib.request.Request(url,data=query.encode() if query else None,headers={'User-Agent':'Mozilla/5.0','Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
boost=[];page=1
while True:
 d=fetch('https://cloud.boosteroid.com/api/v1/public/applications?page='+str(page))
 assert isinstance(d['data'],list) and d['meta']['current_page']==page
 boost+=d['data']
 if page>=d['meta']['last_page']:break
 page+=1;time.sleep(.15)
assert len(boost)==d['meta']['total'] and len(boost)>1000
byid={}
for g in boost:
 url=(g.get('stores') or {}).get('steam','');m=re.fullmatch(r'https://store\.steampowered\.com/app/(\d+)/?(?:\?.*)?',url)
 if not m:continue
 appid=m[1];entry={'collection':g['collection'],'maintenance':bool(g['maintenance'])}
 old=byid.get(appid)
 if old is None or (old['maintenance'] and not entry['maintenance']):byid[appid]=entry
gfn=[];cursor='';seen=set()
while True:
 q='{ apps(country:"US" language:"en_US" orderBy:"sortName:ASC" after:"'+cursor+'") { numberReturned pageInfo { endCursor hasNextPage } items { title gfn { playType minimumMembershipTierLabel } variants { appStore publisherName } } } }'
 d=fetch('https://api-prod.nvidia.com/services/gfngames/v1/gameList',q)['data']['apps'];assert d['numberReturned']==len(d['items'])
 gfn+=d['items']
 if not d['pageInfo']['hasNextPage']:break
 cursor=d['pageInfo']['endCursor'];assert cursor and cursor not in seen;seen.add(cursor);time.sleep(.15)
assert len(gfn)>2000
steam=[{'title':g['title'],'playType':g['gfn']['playType'],'tier':g['gfn']['minimumMembershipTierLabel']} for g in gfn if any(v['appStore']=='STEAM' for v in g['variants'])]
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'boosteroid':{'source':'https://boosteroid.com/games/','total':len(boost),'games':byid},'gfn':{'source':'https://www.nvidia.com/en-us/geforce-now/games/','region':'US','total':len(gfn),'games':steam}}
path=ROOT/'docs/cloud-catalog-data.mjs';path.write_text('// Public provider catalogue snapshots. Refresh with scripts/refresh-cloud-catalog.py.\nexport default '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print('Boosteroid:',len(byid),'Steam IDs;',len(boost),'total listings. GFN:',len(steam),'Steam titles;',len(gfn),'total. Checked:',result['checkedAt'])
