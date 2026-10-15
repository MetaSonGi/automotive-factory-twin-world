// 자동차 스마트팩토리 디지털트윈 월드 — 멀티 팩토리 오케스트레이터
// - js/factories/ 의 공장 모듈(automotive/battery/semiconductor/logistics)을 전환 로드
// - 시뮬레이션(FactorySimulation)에 공장별 stages 주입, UI(라벨·단위·카메라·정지옵션) 동적 구성
// - 한 번에 하나의 공장만 씬에 로드 (전환 시 이전 공장 그룹 제거·리소스 정리)
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {FactorySimulation} from './simulation.js';
import {createRobotArm} from './robot-arm.js';
import {initThree,box,cyl,group,mat,makeLabelSprite,clearGroup,buildBase,humanoidFigure,amrVisual} from './js/factories/common.js';
import {FACTORIES,FACTORY_MAP} from './js/factories/index.js';

initThree(THREE);
const H={T:THREE,box,cyl,group,mat,makeLabelSprite};

const $=s=>document.querySelector(s);
const view=$('#viewport');
let sim=new FactorySimulation();
let paused=false,speed=1,followCar=false,lastSimTime=0;
let F=null;                 // 현재 공장 런타임 {def,group,xs,beacons,animated}
let factorySeq=0;           // 비동기 GLB 로드 경합 방지

// ---------- 렌더러 / 씬 (공장 공용) ----------
const scene=new THREE.Scene();
scene.background=new THREE.Color('#c4d5da');
scene.fog=new THREE.Fog('#c4d5da',65,140);
const camera=new THREE.PerspectiveCamera(48,1,.1,250);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
view.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe0f5ff,0x596057,2));
const sun=new THREE.DirectionalLight(0xffffff,3);
sun.position.set(15,32,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-45;sun.shadow.camera.right=45;
sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;
scene.add(sun);

// ---------- 건물 골조 (공장 공용, 중립 색상) ----------
for(let x of [-31,-10,10,31])for(let z of [-15,15]){
 box(scene,x,4.5,z,.4,9,.4,'#c5d2d4');
 box(scene,x,8.8,0,.25,.3,30,'#d5e0e2');
 box(scene,x,8.3,-2,.3,.18,24,'#778d97');
}
for(let z of [-15,15])box(scene,0,9,z,63,.3,.3,'#b7c7cb');
for(let x of [-20,0,20])box(scene,x,7,0,9,.1,.5,'#e9f4e9');

// ---------- 공장별 동적 엔티티 ----------
const arms=[];            // {arm, stage, seed}
const humans=[];          // {root, visual, legs, arms, route, wp}
const amrs=[];            // {root, s, speed, ring, beaconMat, seed}
const items=new Map();    // id -> {root, setStage, stageShown}
const robotRoots=[],humanRoots=[],amrRoots=[];
let roots={car:[],robot:robotRoots,humanoid:humanRoots,amr:amrRoots};

function buildRobots(n){
 for(const a of arms)F.group.remove(a.arm.root);
 arms.length=0;robotRoots.length=0;
 const stgs=F.def.robots.stages;
 const counts=stgs.length>1?[Math.ceil(n/2),n-Math.ceil(n/2)]:[n];
 let idx=0;
 stgs.forEach((stage,si)=>{
  const count=counts[si]||0,cx=F.xs[stage];
  for(let i=0;i<count;i++,idx++){
   const x=cx+(i-(count-1)/2)*3.4;
   const z=(i%2===0)?-3.8:3.8;
   const arm=createRobotArm();
   arm.root.position.set(x,0,z);
   arm.root.scale.setScalar(F.def.robots.scale||1);
   arm.root.rotation.y=(z<0?-Math.PI/2:Math.PI/2)+(((idx*0.37)%1)-0.5)*0.3; // 라인 방향
   F.group.add(arm.root);
   robotRoots.push(arm.root);
   replace(arm.root,'robot');
   arms.push({arm,stage,seed:idx});
  }
 });
 const lg=$('#legendRobot');if(lg)lg.textContent='● '+F.def.robotLabel+' '+n;
}

function buildHumanoid(x,z,route){
 const {root,visual,legs,arms:armsA}=humanoidFigure(H);
 root.position.set(x,0,z);F.group.add(root);
 const h={root,visual,legs,arms:armsA,route,wp:1};
 humans.push(h);humanRoots.push(root);
 return h;
}
function buildHumans(){
 for(const h of humans)F.group.remove(h.root);
 humans.length=0;humanRoots.length=0;
 for(const cfg of F.def.humans)buildHumanoid(cfg.x,cfg.z,cfg.route);
}
function updateHumans(dSim){
 for(let i=0;i<humans.length;i++){
  const h=humans[i];
  const t=h.route[h.wp];
  const dx=t[0]-h.root.position.x,dz=t[1]-h.root.position.z;
  const d=Math.hypot(dx,dz);
  if(d<0.3){h.wp=(h.wp+1)%h.route.length;continue;}
  if(dSim>0){
   const step=Math.min(d,1.1*dSim); // 1.1 m/s
   h.root.position.x+=dx/d*step;h.root.position.z+=dz/d*step;
   h.root.rotation.y=Math.atan2(dx,dz);
  }
  if(h.root.userData.visual===h.visual){
   const sw=Math.sin(sim.time*7+i*2)*0.42;
   h.legs[0].rotation.x=sw;h.legs[1].rotation.x=-sw;
   h.arms[0].rotation.x=-sw*0.7;h.arms[1].rotation.x=sw*0.7;
  }
 }
}

// ---------- AMR (속도 기반 순환 + 센서 감속) ----------
const CARGO_COLORS=['#b69265','#7fa8c9','#c97f8a','#9a8ac9','#8ac9a8'];
function amrPose(s,rect){
 const w=rect.x1-rect.x0,h=rect.z1-rect.z0,per=2*(w+h);
 s=((s%per)+per)%per;
 if(s<w)return{x:rect.x0+s,z:rect.z0,ry:0,dx:1,dz:0};
 s-=w;if(s<h)return{x:rect.x1,z:rect.z0+s,ry:-Math.PI/2,dx:0,dz:1};
 s-=h;if(s<w)return{x:rect.x1-s,z:rect.z1,ry:Math.PI,dx:-1,dz:0};
 s-=w;return{x:rect.x0,z:rect.z1-s,ry:Math.PI/2,dx:0,dz:-1};
}
function buildAMRs(n){
 for(const a of amrs)F.group.remove(a.root);
 amrs.length=0;amrRoots.length=0;
 const rect=F.def.amr.rect;
 const per=2*((rect.x1-rect.x0)+(rect.z1-rect.z0));
 for(let i=0;i<n;i++){
  const {root,beaconMat,ring}=amrVisual(H,CARGO_COLORS[i%CARGO_COLORS.length],{forklift:!!F.def.amr.forklift});
  F.group.add(root);
  const p=amrPose(i*per/n,rect);
  root.position.set(p.x,0,p.z);root.rotation.y=p.ry;
  amrs.push({root,s:i*per/n,speed:3.2,ring,beaconMat,seed:i});
  amrRoots.push(root);
  replace(root,'amr');
 }
 const lg=$('#legendAmr');if(lg)lg.textContent='● AMR '+n;
}
function updateAMRs(dSim){
 const sensorRange=Number($('#sensor').value);
 const rect=F.def.amr.rect;
 for(const a of amrs){
  const p=amrPose(a.s,rect);
  const ax=p.x+p.dx*1.4,az=p.z+p.dz*1.4; // 전방 감지점
  let nearest=Infinity;
  const consider=(x,z)=>{const d=Math.hypot(x-ax,z-az);if(d<nearest)nearest=d;};
  for(const it of items.values())consider(it.root.position.x,it.root.position.z);
  for(const h of humans)consider(h.root.position.x,h.root.position.z);
  for(const b of amrs)if(b!==a)consider(b.root.position.x,b.root.position.z);
  const want=nearest<sensorRange?Math.max(0,(nearest-1.2)/Math.max(sensorRange-1.2,0.1)):1;
  a.speed+=(3.2*want-a.speed)*Math.min(1,dSim*3);
  if(dSim>0)a.s+=a.speed*dSim;
  const p2=amrPose(a.s,rect);
  a.root.position.set(p2.x,0,p2.z);a.root.rotation.y=p2.ry;
  a.ring.scale.setScalar(Math.max(sensorRange,0.5));
  a.beaconMat.emissiveIntensity=(Math.sin(sim.time*6+a.seed*2)>0)?2.2:0.25;
 }
}

// ---------- 공정 아이템 (공장별 makeItem) ----------
function syncItems(){
 const ids=new Set(sim.cars.map(c=>c.id));
 for(const [id,it] of [...items]){
  if(!ids.has(id)){F.group.remove(it.root);items.delete(id);roots.car=roots.car.filter(v=>v!==it.root);}
 }
 for(const c of sim.cars){
  let it=items.get(c.id);
  if(!it){
   it=F.def.makeItem(H);it.stageShown=-1;
   F.group.add(it.root);items.set(c.id,it);roots.car.push(it.root);replace(it.root,'car');
  }
  if(it.stageShown!==c.stage){it.setStage(c.stage);it.stageShown=c.stage;}
  const qlist=sim.cars.filter(x=>x.stage===c.stage).sort((a,b)=>a.id-b.id);
  const queue=qlist.findIndex(v=>v===c);
  it.root.position.set(F.xs[c.stage]-queue*2.1+c.progress*1.1,F.def.itemY,queue>0?1.5:0);
 }
}

// ---------- GLB 모델 교체 (공장 전환 시 기본값 재적용) ----------
const loader=new GLTFLoader();
const templates={};
async function applyModel(type,buffer){
 let loaded=await loader.parseAsync(buffer,'');
 let model=loaded.scene;
 let bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.length())||size.length()<1e-6)throw Error('모델 크기를 확인할 수 없습니다.');
 let desired={car:3.5,robot:3.6,humanoid:1.9,amr:1.5}[type];
 let factor=desired/Math.max(size.x,size.y,size.z);
 model.scale.setScalar(factor);
 bounds.setFromObject(model);
 let center=bounds.getCenter(new THREE.Vector3());
 model.position.set(-center.x,-bounds.min.y,-center.z);
 model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 templates[type]=model;
 for(let root of roots[type])replace(root,type);
 return model;
}
function replace(root,type){
 if(!templates[type])return;
 if(type==='car'&&root.userData.finished){
  // 자동차 공장 아이템은 '완성차' variant만 교체 — 차체 variant와 스테이지 전환 유지
  const c=root.userData.visual;
  const old=c.getObjectByName('finished');if(old)c.remove(old);
  const v=templates[type].clone(true);v.name='finished';
  v.visible=!root.userData.body.visible;c.add(v);
  root.userData.finished=v;return;
 }
 if(root.userData.visual)root.remove(root.userData.visual);
 const v=templates[type].clone(true);root.add(v);root.userData.visual=v;
}
async function applyDefaultGLBs(){
 const seq=factorySeq;
 const defs=F.def.glb||{};
 for(let type of ['car','amr','humanoid']){
  if(!defs[type])continue;
  try{
   const r=await fetch(defs[type]);
   if(seq!==factorySeq)return;      // 전환 중이면 중단
   if(!r.ok)throw Error('missing asset');
   await applyModel(type,await r.arrayBuffer());
   if(seq!==factorySeq)return;
  }catch(e){/* 기본 에셋 없음 — 절차적 모델 유지 */}
 }
}
$('#model').onchange=async e=>{
 let f=e.target.files[0];if(!f)return;
 try{
  if(f.size>30*1024*1024)throw Error('30MB 이하 모델을 선택하세요.');
  if(!f.name.toLowerCase().endsWith('.glb'))throw Error('GLB 파일만 지원합니다.');
  $('#modelstatus').textContent='모델 읽는 중…';
  let type=$('#assettype').value;
  await applyModel(type,await f.arrayBuffer());
  $('#modelstatus').textContent=f.name+' 적용됨 · 현재 브라우저 세션';
 }catch(err){$('#modelstatus').textContent='적용 실패: '+err.message;}
};

// ---------- 카메라 ----------
let yaw=.8,pitch=.78,distance=64;
const target=new THREE.Vector3(0,0,0);
const _v=new THREE.Vector3();
function updateCam(){
 camera.position.set(
  target.x+Math.cos(yaw)*Math.cos(pitch)*distance,
  target.y+Math.sin(pitch)*distance,
  target.z+Math.sin(yaw)*Math.cos(pitch)*distance);
 camera.lookAt(target);
}
let drag=null;
renderer.domElement.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointermove=e=>{
 if(!drag)return;
 yaw-=(e.clientX-drag.x)*.005;
 pitch=Math.max(.12,Math.min(1.5,pitch+(e.clientY-drag.y)*.005));
 drag={x:e.clientX,y:e.clientY};updateCam();
};
renderer.domElement.onpointerup=()=>{drag=null;};
renderer.domElement.onwheel=e=>{e.preventDefault();distance=Math.max(12,Math.min(120,distance+e.deltaY*.04));updateCam();};
function goCam(y,p,d,tx,ty,tz){
 yaw=y;pitch=p;distance=d;target.set(tx,ty,tz);
 followCar=false;const f=$('#camFollow');if(f)f.classList.remove('on');
 updateCam();
}
new ResizeObserver(()=>{
 let w=view.clientWidth,h=view.clientHeight;
 renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}).observe(view);
updateCam();

// ---------- 공장별 UI 구성 ----------
function buildFactoryUI(def){
 $('#factoryTitle').innerHTML=def.title;
 $('#factoryEn').textContent=def.enName+' FACTORY TWIN WORLD';
 $('#factoryDesc').textContent=def.desc;
 $('#factoryBlurb').textContent=def.blurb;
 $('#kL1').textContent='공정 내 '+def.unit;
 $('#kL2').textContent='투입 '+def.unit;
 $('#kL3').textContent=`시간당 생산 (${def.unit}/h)`;
 const arrT=$('#arrivalText');
 if(arrT)arrT.textContent=def.unit+' 투입 간격 (초)';
 const tgtT=$('#targetText');
 if(tgtT)tgtT.textContent='생산 목표 ('+def.unit+')';
 // 구역별 공정시간 입력 (스테이지 1~4)
 const sc=$('#stageCycles');sc.innerHTML='';
 for(let s=1;s<=4;s++){
  const lab=document.createElement('label');
  lab.textContent=def.stages[s].label;
  const inp=document.createElement('input');
  inp.id='cycle'+s;inp.type='number';inp.min='1';inp.max='120';inp.value=def.stages[s].cycle;
  lab.appendChild(inp);sc.appendChild(lab);
 }
 // 공정 정지 옵션
 const st=$('#stop');st.innerHTML='';
 const o0=document.createElement('option');o0.value='-1';o0.textContent='전체 정상 가동';st.appendChild(o0);
 for(let s=1;s<=4;s++){
  const o=document.createElement('option');o.value=String(s);o.textContent=def.stages[s].label+' 정지';st.appendChild(o);
 }
 // 카메라 프리셋
 const cams=$('#cams');cams.innerHTML='';
 const mkBtn=(id,text,fn)=>{const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=fn;cams.appendChild(b);return b;};
 mkBtn('camAll','전체보기',()=>goCam(.8,.78,64,0,0,0));
 for(let s=1;s<=4;s++){
  const i=s;
  mkBtn('camS'+s,def.stages[s].label,()=>goCam(.9,.45,26,F.xs[i],1,0));
 }
 mkBtn('camFollow',def.followBtn,e=>{followCar=!followCar;e.target.classList.toggle('on',followCar);});
 // 로봇/AMR 기본 대수
 $('#robotcount').value=String(def.robots.defaultCount);
 $('#amrcount').value=String(def.amr.count);
}

// ---------- 시뮬레이션 리셋 ----------
function doReset(){
 try{
  const cycle=Number($('#cycle').value),arrival=Number($('#arrival').value),tgt=Number($('#target').value);
  if(cycle<1||cycle>120||arrival<1||arrival>120)throw Error('작업 시간과 투입 간격은 1~120초입니다.');
  const cycles={};
  for(let s=1;s<=4;s++){const v=Number($('#cycle'+s).value);if(!(v>=1&&v<=120))throw Error('구역별 공정시간은 1~120초입니다.');cycles[s]=v;}
  const faultOn=$('#fault').checked;
  sim=new FactorySimulation({cycle,arrival,target:tgt,cycles,
   faultMode:faultOn?'random':'manual',faultRate:Number($('#faultrate').value),repairTime:45,
   stages:F.def.stages});
  sim.manualStop(Number($('#stop').value));
  $('#stop').disabled=faultOn;
  buildRobots(Number($('#robotcount').value));
  buildAMRs(Number($('#amrcount').value));
  buildHumans();
  followCar=false;const cf=$('#camFollow');if(cf)cf.classList.remove('on');
  lastSimTime=0;
  $('#error').textContent='';
 }catch(e){$('#error').textContent=e.message;}
}

// ---------- 공장 전환 ----------
function loadFactory(id){
 const def=FACTORY_MAP[id]||FACTORIES[0];
 factorySeq++;
 // 이전 공장 정리
 if(F){scene.remove(F.group);clearGroup(F.group);}
 for(const k of Object.keys(templates))delete templates[k];
 arms.length=0;humans.length=0;amrs.length=0;items.clear();
 robotRoots.length=0;humanRoots.length=0;amrRoots.length=0;
 roots={car:[],robot:robotRoots,humanoid:humanRoots,amr:amrRoots};
 paused=false;$('#pause').textContent='일시정지';
 // 테마
 scene.background.set(def.theme.bg);
 scene.fog.color.set(def.theme.bg);
 // 새 공장 구성
 const g=new THREE.Group();scene.add(g);
 const base=buildBase(H,g,def);
 const extra=def.buildStatic(H,g)||{};
 F={def,group:g,xs:def.stationXs,beacons:base.beacons,animated:extra.animated||[]};
 buildFactoryUI(def);
 doReset();
 goCam(.8,.78,64,0,0,0);
 applyDefaultGLBs();
 updateUI();
}

// ---------- UI 배선 ----------
$('#factory').onchange=e=>loadFactory(e.target.value);
$('#reset').onclick=()=>doReset();
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'재생':'일시정지';};
$('#speed').onchange=e=>{speed=Number(e.target.value);};
$('#stop').onchange=e=>{sim.manualStop(Number(e.target.value));};
$('#fault').onchange=e=>{
 const on=e.target.checked;
 sim.faultMode=on?'random':'manual';
 if(on){sim.manualStop(-1);$('#stop').value='-1';}
 $('#stop').disabled=on;
};
$('#faultrate').oninput=e=>{sim.faultRate=Number(e.target.value);$('#faultrateval').textContent=e.target.value+'회/시간';};
$('#sensor').oninput=e=>{$('#sensorval').textContent=e.target.value+' m';};
$('#cycle').onchange=e=>{const v=e.target.value;for(let s=1;s<=4;s++)$('#cycle'+s).value=v;};
$('#robotcount').onchange=e=>{buildRobots(Number(e.target.value));};
$('#amrcount').onchange=e=>{buildAMRs(Number(e.target.value));};
$('#export').onclick=()=>{
 let fields=['time_s','wip','shipped','temperature_c','robot_current_a','synthetic'];
 let text=fields.join(',')+'\n'+sim.telemetry.map(r=>fields.map(k=>r[k]).join(',')).join('\n');
 let u=URL.createObjectURL(new Blob([text],{type:'text/csv'}));
 let a=document.createElement('a');a.href=u;a.download='factory-synthetic-telemetry.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
};

// ---------- 이벤트 / KPI ----------
const p3=id=>String(id).padStart(3,'0');
function evText(e){
 const def=F.def;
 if(e.type==='arrival')return `${e.time.toFixed(1)}s · ${def.itemPrefix}-${p3(e.id)} · 생산 투입`;
 if(e.type==='shipped')return `${e.time.toFixed(1)}s · ${def.itemPrefix}-${p3(e.id)} · 출하 완료`;
 if(e.type==='fault')return `${e.time.toFixed(1)}s · ⚠ ${def.stages[e.stage].label} 고장 정지`;
 if(e.type==='recovered')return `${e.time.toFixed(1)}s · ✔ ${def.stages[e.stage].label} 복구·가동 재개`;
 if(e.type==='stop')return `${e.time.toFixed(1)}s · ■ ${def.stages[e.stage].label} 수동 정지`;
 return `${e.time.toFixed(1)}s · ${e.type}`;
}
function updateUI(){
 const def=F.def;
 $('#shipped').textContent=sim.shipped;
 $('#wip').textContent=sim.cars.length;
 $('#created').textContent=sim.created;
 $('#clock').textContent=sim.time.toFixed(0)+' s';
 $('#tput').textContent=sim.throughputPerHour.toFixed(1);
 $('#flowt').textContent=sim.avgFlowTime.toFixed(0)+' s';
 $('#avail').textContent=(sim.availability*100).toFixed(1)+'%';
 $('#faults').textContent=sim.faultCount;
 $('#queues').innerHTML=def.stages.map((s,i)=>
  `<div class="queue ${i===sim.stopped?'stopped':''}">${s.label}<strong>${sim.queues[i]} ${def.unit} ${i===sim.stopped?'· 정지':''}</strong></div>`
 ).join('');
 const ev=$('#events');
 ev.textContent=sim.events.slice(-6).reverse().map(evText).join('\n');
 ev.style.whiteSpace='pre-line';
}

// ---------- 메인 루프 ----------
let last=0,ui=0;
function frame(ts){
 const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
 if(!paused){
  let rem=dt*speed;
  while(rem>0){const s=Math.min(.1,rem);sim.step(s);rem-=s;}
 }
 const dSim=sim.time-lastSimTime;lastSimTime=sim.time;

 syncItems();

 // 6축 로봇팔 작업 애니메이션
 for(let i=0;i<arms.length;i++){
  const a=arms[i];
  if(a.arm.group.parent!==a.arm.root)continue; // GLB로 교체된 경우 스킵
  const active=!paused&&sim.stopped!==a.stage&&sim.queues[a.stage]>0;
  a.arm.update(sim.time,active,a.seed);
 }

 // 경광등
 for(const b of F.beacons){
  b.mat.emissiveIntensity=sim.stopped===b.stage?1.6+Math.sin(sim.time*9)*1.2:0.12;
 }

 // 공장별 특수 애니메이션 (와인딩 드럼, 화성 LED, OHT 호이스트 등)
 for(const fn of F.animated)fn(sim.time,dSim);

 updateAMRs(dSim);
 updateHumans(dSim);

 // 아이템 추적 카메라
 if(followCar&&sim.cars.length){
  const lead=[...sim.cars].sort((a,b)=>b.stage-a.stage||b.progress-a.progress||a.id-b.id)[0];
  const it=items.get(lead.id);
  if(it){_v.set(it.root.position.x,1,it.root.position.z);target.lerp(_v,0.08);updateCam();}
 }

 if(ts-ui>250){ui=ts;updateUI();}
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}

// ---------- 시작 ----------
loadFactory('automotive');
$('#loading').remove();
requestAnimationFrame(frame);
