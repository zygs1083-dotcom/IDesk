from PIL import Image, ImageDraw
import json
from pathlib import Path
root=Path('/data/browser-home/orca/workspaces/IDesk/wi-18-office-assets/apps/office/public')
out=Path('/tmp/w18-preview/w18')
im=Image.open(root/'sprites.png'); data=json.load(open(root/'sprites.json'))
report=[]
for k,kind in enumerate(['claude-code','codex','n8n','script','custom']):
 for mode,color,fg in [('light','#f7eddc','#33251c'),('dark','#262423','#f7eddc')]:
  preview=Image.new('RGBA',(640,1070),color); draw=ImageDraw.Draw(preview);draw.text((16,10),kind+' / '+mode,fill=fg)
  for i in range(19):
   f=data['frames'][list(data['frames'])[19*k+i]]['frame']
   frame=im.crop((f['x'],f['y'],f['x']+64,f['y']+96)).resize((128,192),Image.Resampling.NEAREST)
   preview.alpha_composite(frame,(16+(i%4)*156,40+(i//4)*204))
  preview.convert('RGB').save(out/f'{kind}-{mode}.png')
 for direction in ['down','left','right','up']:
  bottoms=[]
  for frame in data['animations'][f'{kind}/walk/{direction}']:
   f=data['frames'][frame]['frame']; a=im.crop((f['x'],f['y'],f['x']+64,f['y']+96)).getchannel('A')
   bottoms.append(a.getbbox()[3]-1)
  assert bottoms==[95]*4,(kind,direction,bottoms)
  report.append(f'{kind}/walk/{direction}: {bottoms} PASS')
print('\n'.join(report));(out/'baseline-check.txt').write_text('\n'.join(report)+'\n')
bg=Image.open(root/'background.png');bg.thumbnail((1000,563));bg.save(out/'background.png')
