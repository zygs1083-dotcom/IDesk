const assert = require('node:assert/strict');
const {mkdirSync,writeFileSync} = require('node:fs');
const {chromium} = require('/data/tools/playwright/node_modules/playwright');
process.env.PLAYWRIGHT_BROWSERS_PATH = '/data/cache/ms-playwright';
(async()=>{
 const output='/tmp/office-w78-final'; mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true}); const samples=[]; const errors=[];
 for(const dpr of [1,2]) {
  const context=await browser.newContext({viewport:{width:1000,height:700},deviceScaleFactor:dpr});
  const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/bubbles.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/office/src/fonts.css"></head><body></body></html>'}));
  await page.goto('http://127.0.0.1:5178/office/bubbles.html');
  await page.evaluate(async()=>{await import('/office/@vite/client');const {bubbleStage}=await import('/office/tools/bubble-stage.mjs');window.scene=await bubbleStage();});
  await page.mouse.move(999,699);
  for(const [name,xs,messages] of [
   ['reports',[480,520],['心跳不会打断行程，完成后回座。','Heartbeat received. Back to my seat!']],
   ['three',[460,500,540],['心跳不会打断行程，完成后回座。','Heartbeat received. Back to my seat!','三个同事同时汇报进展。']],
  ]) {
   await page.evaluate(({xs,messages})=>{window.scene.place(xs.map(x=>({x,y:330})));messages.forEach((m,i)=>window.scene.people[i].bubble.show(m,Infinity));},{xs,messages});
   await page.waitForFunction(n=>window.scene.sample().filter(p=>p.visible).length===n,messages.length);
   const sample=await page.evaluate(()=>window.scene.sample());
   const visible=sample.filter(p=>p.visible); assert.equal(visible.length,messages.length);
   for(const p of visible) {
    const [a,b]=p.tail.slice(-2);assert.equal(a.x,b.x);assert.ok(b.y-a.y>=8);
    assert.ok(p.tailBounds.minX>=0 && p.tailBounds.minY>=0 && p.tailBounds.maxX<=1000 && p.tailBounds.maxY<=700);
   }
   const filename=`1000x700-dpr${dpr}-${name}.png`;
   await page.screenshot({path:`${output}/${filename}`});
   await page.emulateMedia({colorScheme:'dark'});
   await page.screenshot({path:`${output}/1000x700-dpr${dpr}-${name}-dark.png`});
   await page.emulateMedia({colorScheme:'light'});
   samples.push({filename,deferred:messages.length-visible.length,people:sample});
  }
  await context.close();
 }
 await browser.close();assert.deepEqual(errors,[]);
 writeFileSync(`${output}/samples.json`,JSON.stringify({samples,errors},null,2));
 process.stdout.write(JSON.stringify({scenes:samples.length,deferred:samples.map(s=>s.deferred),errors}));
})();
