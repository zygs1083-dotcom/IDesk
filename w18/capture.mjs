import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'/data/cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:960,height:1250},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const mode of ['light','dark']){
 await page.goto('http://127.0.0.1:5188/'+(mode==='dark'?'?dark':''));
 await page.waitForFunction(()=>window.ready);
 console.log(mode,await page.evaluate(()=>window.ready));
 let phase=await page.evaluate(()=>window.phase);
 for(let i=0;i<8;i++){
  await page.waitForFunction(previous=>window.phase>previous,phase);
  phase=await page.evaluate(()=>window.phase);
  await page.screenshot({path:`/tmp/w18-preview/w18/motion-${mode}-${i}.png`});
  console.log(mode,i,phase);
 }
}
if(errors.length)throw new Error(errors.join('\n'));
await browser.close();
