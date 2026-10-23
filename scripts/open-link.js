import {readFileSync} from 'node:fs';import {spawn} from 'node:child_process';
const key=readFileSync('.relay/owner-key','utf8').trim();const url=`http://localhost:${process.env.RELAY_PORT||4320}/#key=${key}`;
if(process.platform==='darwin')spawn('open',[url]);else console.log(url);
