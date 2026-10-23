import { createApp } from './app.js';
const instance=createApp();const port=Number(process.env.RELAY_PORT||4320),host=process.env.RELAY_HOST||'127.0.0.1';
const server=instance.app.listen(port,host,()=>console.log(`Relay running at http://${host}:${port}\nOwner access key is stored locally in .relay/owner-key. Run node scripts/open-link.js to open your private workspace.\nBee hardware has not been verified; built-in examples are labelled.`));
for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>{server.close();instance.close();process.exit(0)});
