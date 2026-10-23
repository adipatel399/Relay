from pathlib import Path
import subprocess,os,json,concurrent.futures
r=Path(__file__).resolve().parents[2];v=r/'production/video/voice';(r/'artifacts').mkdir(exist_ok=True)
lines=[
'A notification is only the beginning. When you need help, someone has to answer.',
'Meet Relay. A companion that keeps you connected to your people, and your work.',
'The help flow is simple. Ask for support, see who acknowledges, then choose how to connect.',
'Start by inviting someone you trust. They accept the invitation and keep their contact dashboard open.',
'An armed session enables the exact help phrase. A button and a missed check-in offer separate paths.',
'This demo uses simulated Bee input. The browser workflow works; physical device validation is still ahead.',
'The contact receives an in-app request and acknowledges. Relay shows that response without assuming you are safe.',
'Both people enable their microphones. WebRTC connects the browsers, with audio permission required on each side.',
'Choose to share your browser location. Your contact sees its accuracy and age, instead of an inferred location.',
'Cancel or resolve the session explicitly. The audio workflow stops, and the server clears the shared location.',
'And when you are simply away from your desk, Relay helps keep focused work moving.',
'Prepare a coding investigation using text, browser dictation, or a Bee-compatible transcript event.',
'You review the transcribed request before starting. Background speech never directly executes a coding task.',
'This report comes from a real local Codex run. The hosted demo preserves its actual execution evidence.',
'Codex reproduced the discount bug: one hundred ninety instead of one hundred eighty. It proposed a percentage-based fix.',
'Twelve backend tests and eight browser checks passed, covering consent, escalation, persistence, audio, location, and cleanup.',
'Today, alerts are in-app only. There is no emergency dispatch, and real Bee data is still required.',
'This is Relay. Your people, your momentum. Stay close, keep moving, and keep the human in control.'
]
(v/'script.json').write_text(json.dumps(lines,indent=2))
env=dict(os.environ,HYPERFRAMES_PYTHON=os.environ.get('HYPERFRAMES_PYTHON','python3'))
def generate(item):
 i,text=item;p=v/f'{i:02}.txt';p.write_text(text);target=v/f'{i:02}.wav'
 if not target.exists():
  q=subprocess.run(['npx','--yes','hyperframes@0.8.186','tts',str(p),'--voice','af_heart','--speed','1.06','--output',str(target),'--json'],env=env,capture_output=True,text=True)
  if q.returncode:raise RuntimeError(q.stderr[-1200:])
 d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(target)]));print(i,round(d,2),flush=True);return {'scene':i,'duration':d,'text':text}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(generate,enumerate(lines)))
(v/'timings.json').write_text(json.dumps(results,indent=2))
args=['ffmpeg','-y','-i',str(r/'docs/media/relay-judges-demo.mp4')]
for i in range(18):args+=['-i',str(v/f'{i:02}.wav')]
filters=['[0:a]volume=0.23[bed]'];names=['[bed]']
for i,item in enumerate(results):
 speed=max(1,item['duration']/6.9);delay=round((i*7.5+.3)*1000)
 filters.append(f'[{i+1}:a]atempo={speed:.5f},loudnorm=I=-16:TP=-2:LRA=7,adelay={delay}|{delay}[v{i}]');names.append(f'[v{i}]')
filters.append(''.join(names)+'amix=inputs=19:duration=first:normalize=0,alimiter=limit=0.95[a]')
args+=['-filter_complex',';'.join(filters),'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t','135','-movflags','+faststart',str(r/'artifacts/relay-narrated-demo.mp4'),'-loglevel','error']
subprocess.run(args,check=True);print('NARRATED VIDEO READY',flush=True)
