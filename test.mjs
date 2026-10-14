import assert from 'node:assert/strict';import {FactorySimulation} from './simulation.js';import fs from 'node:fs';
let count=0;const check=(name,f)=>{f();console.log('PASS',name);count++};
// --- 기존 검증 (동작 보존) ---
check('production drains and vehicle conservation',()=>{let s=new FactorySimulation({cycle:1,arrival:1,target:10});for(let i=0;i<4000;i++){s.step(.1);assert.equal(s.created,s.shipped+s.cars.length)}assert.equal(s.shipped,10)});
check('stopped station blocks upstream with bounded buffers',()=>{let s=new FactorySimulation({cycle:1,arrival:1,target:50});s.stopped=1;for(let i=0;i<1000;i++)s.step(.1);assert.equal(s.shipped,0);assert(s.queues.every(q=>q<=3));assert(s.queues[1]>0)});
check('resume drains stopped line',()=>{let s=new FactorySimulation({cycle:1,arrival:1,target:10});s.stopped=2;for(let i=0;i<200;i++)s.step(.1);s.stopped=-1;for(let i=0;i<2000;i++)s.step(.1);assert.equal(s.shipped,10)});
check('invalid settings',()=>{for(let cfg of [{cycle:0},{arrival:NaN},{target:0},{target:1.5}])assert.throws(()=>new FactorySimulation(cfg))});
check('invalid timestep',()=>{assert.throws(()=>new FactorySimulation().step(-1))});
check('synthetic telemetry and one sample per second',()=>{let s=new FactorySimulation();for(let i=0;i<100;i++)s.step(.1);assert(s.telemetry.every(r=>r.synthetic));assert.equal(new Set(s.telemetry.map(r=>r.time_s)).size,s.telemetry.length)});
check('deterministic repeat',()=>{let a=new FactorySimulation(),b=new FactorySimulation();for(let i=0;i<500;i++){a.step(.1);b.step(.1)}assert.deepEqual(a.cars,b.cars)});
check('four GLB containers valid',()=>{for(let n of ['car','robot','humanoid','amr']){let b=fs.readFileSync(n+'.glb');assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);let l=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+l).toString());assert(j.nodes.length>0)}});
// --- 확장 검증 ---
check('per-stage cycles override global cycle',()=>{
 let s=new FactorySimulation({cycle:8,arrival:1000,target:5,cycles:{2:2}});
 s.cars.push({id:1,stage:2,progress:0,t0:0});s.created=1;s.nextArrival=1e9;
 for(let i=0;i<25;i++)s.step(.1); // 2.5초 > 구역 cycle 2초
 assert.equal(s.cars[0].stage,3);
 let g=new FactorySimulation({cycle:8,arrival:1000,target:5});
 g.cars.push({id:1,stage:2,progress:0,t0:0});g.created=1;g.nextArrival=1e9;
 for(let i=0;i<25;i++)g.step(.1);
 assert.equal(g.cars[0].stage,2); // 전역 8초로는 아직
});
check('invalid stage cycles rejected',()=>{assert.throws(()=>new FactorySimulation({cycles:{2:0}}));assert.throws(()=>new FactorySimulation({cycles:{3:NaN}}))});
check('random fault engine stops and recovers',()=>{
 let s=new FactorySimulation({cycle:1,arrival:1,target:10,faultMode:'random',faultRate:3600,repairTime:0.5});
 for(let i=0;i<300;i++)s.step(.1); // 30초
 assert(s.faultCount>=1);assert(s.downtime>0);assert(s.availability<1);
 assert(s.events.some(e=>e.type==='fault'));assert(s.events.some(e=>e.type==='recovered'));
});
check('manualStop records stop events',()=>{
 let s=new FactorySimulation();s.manualStop(2);
 assert.equal(s.stopped,2);assert.equal(s.faultCount,1);
 assert(s.events.some(e=>e.type==='stop'&&e.stage===2));
 s.manualStop(-1);assert.equal(s.stopped,-1);
 assert.throws(()=>s.manualStop(9));
});
check('kpi getters',()=>{
 let s=new FactorySimulation({cycle:1,arrival:1,target:4});
 for(let i=0;i<2000;i++)s.step(.1);
 assert.equal(s.shipped,4);assert(s.throughputPerHour>0);assert(s.avgFlowTime>0);
 assert(s.availability<=1&&s.availability>=0);
});
console.log(count+' checks passed');
