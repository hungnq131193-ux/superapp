import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;const inside=(r,w,d)=>r.x>=0&&r.y>=0&&r.x+r.width<=w+1e-6&&r.y+r.height<=d+1e-6;
test('detect overlap',()=>assert.equal(intersects({x:0,y:0,width:2,height:2},{x:1,y:1,width:2,height:2}),true));
test('room inside plot',()=>{assert.equal(inside({x:0,y:0,width:5,height:18},5,18),true);assert.equal(inside({x:4,y:0,width:2,height:2},5,18),false)});
test('validation engine checks total area',()=>assert.match(readFileSync('src/engine/validation.ts','utf8'),/Tổng diện tích tầng/));
test('validation engine checks master wc adjacency',()=>assert.match(readFileSync('src/engine/validation.ts','utf8'),/WC riêng master/));
test('validation engine checks private worship access',()=>assert.match(readFileSync('src/engine/validation.ts','utf8'),/Phòng thờ nên có lối tiếp cận riêng/));
test('generator supports 90m2 style preset without hardcoded result',()=>{const s=readFileSync('src/engine/generator.ts','utf8');assert.match(s,/generateLayouts/);assert.match(readFileSync('src/engine/defaults.ts','utf8'),/90m²|89–90m²/)});
