// 자동차 스마트팩토리 디지털트윈 월드 (확장판)
// - 6축 관절 로봇팔(robot-arm.js), 차체→완성차 외형 전환
// - AMR 물류(대수 조절·적재·센서 감속), 휴머노이드 웨이포인트 보행
// - 랜덤 고장 시나리오, 확장 KPI, 구역별 카메라 프리셋·차량 추적
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {FactorySimulation,STAGES} from './simulation.js';
import {createRobotArm} from './robot-arm.js';

const $=s=>document.querySelector(s);
const view=$('#viewport');
let sim=new FactorySimulation();
let paused=false,speed=1,followCar=false,lastSimTime=0;

// ---------- 렌더러 / 씬 ----------
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

// ---------- 머티리얼/지오메트리 헬퍼 ----------
const mats={};
function mat(color){return mats[color]??=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.25});}
function box(parent,x,y,z,w,h,d,color){
 let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function cyl(parent,x,y,z,r,h,color){
 let m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));
 m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
}
function group(parent,x=0,y=0,z=0){let g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}

// ---------- 바닥 / 스테이션 ----------
box(scene,0,-.15,0,66,.3,34,'#798c8c');
const grid=new THREE.GridHelper(64,32,'#677c7f','#829698');
grid.position.y=.02;scene.add(grid);

const xs=[-25,-15,-5,5,15,25];

// 떠 있는 한글 구역 라벨 (항상 카메라를 향하는 스프라이트)
function makeLabelSprite(text,scale=1){
 let can=document.createElement('canvas');can.width=512;can.height=128;
 let c=can.getContext('2d');
 c.fillStyle='rgba(16,42,50,0.85)';
 if(c.roundRect){c.beginPath();c.roundRect(8,16,496,96,20);c.fill();}
 else c.fillRect(0,0,512,128);
 c.fillStyle='#fff';c.font='bold 46px system-ui,sans-serif';
 c.textAlign='center';c.textBaseline='middle';
 c.fillText(text,256,66);
 let tex=new THREE.CanvasTexture(can);tex.anisotropy=4;
 let sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
 sp.scale.set(9*scale,2.25*scale,1);sp.renderOrder=5;
 return sp;
}

for(let [i,x] of xs.entries()){
 box(scene,x,.18,0,8,.25,5,i%2?'#4c6269':'#526d73');       // 스테이션 패드
 box(scene,x,.55,0,8,.4,2.7,'#23383e');                    // 컨베이어 프레임
 for(let n=0;n<12;n++){let r=cyl(scene,x-3.6+n*.65,.84,0,.13,2.7,'#a2b0b3');r.rotation.x=Math.PI/2;}
 let lb=makeLabelSprite(String(i+1).padStart(2,'0')+' · '+STAGES[i]);
 lb.position.set(x,6.4,0);scene.add(lb);
 for(let z of [-3.1,3.1]){box(scene,x,.2,z,8,.03,.08,'#ebc35e');} // 안전 라인
}

// ---------- 건물 골조 / 조명 ----------
for(let x of [-31,-10,10,31])for(let z of [-15,15]){
 box(scene,x,4.5,z,.4,9,.4,'#c5d2d4');
 box(scene,x,8.8,0,.25,.3,30,'#d5e0e2');
 box(scene,x,8.3,-2,.3,.18,24,'#778d97');
}
for(let z of [-15,15])box(scene,0,9,z,63,.3,.3,'#b7c7cb');
for(let x of [-20,0,20])box(scene,x,7,0,9,.1,.5,'#e9f4e9');

// ---------- 부품 랙 (창고) ----------
for(let x of [-27,-21])for(let z of [-10,-13]){
 for(let y of [.3,1.8,3.3]){
  box(scene,x,y,z,4,.12,2,'#687982');
  for(let n=0;n<3;n++)box(scene,x-1.3+n*1.3,y+.5,z,1,.9,1.3,'#b18c58');
 }
 for(let dx of [-2,2])box(scene,x+dx,2,z,.15,4,.15,'#d79047');
}
let whLabel=makeLabelSprite('부품 입고 / WAREHOUSE',0.85);
whLabel.position.set(-24,5.2,-7);scene.add(whLabel);

// ---------- 도장 부스 (반투명 터널) ----------
const boothMat=new THREE.MeshStandardMaterial({color:'#cfe0da',transparent:true,opacity:.35,roughness:.2,metalness:.1});
for(let dx of [-4,4]){
 let wall=new THREE.Mesh(new THREE.BoxGeometry(.3,4,5),boothMat);
 wall.position.set(-5+dx,2,-.5);wall.castShadow=true;scene.add(wall);
}
box(scene,-5,4,0,8,.25,5,'#dfebe5');
box(scene,-5,2,-2.5,8,4,.2,'#9db4b6');
for(let x of [-7,-3]){box(scene,x,2.2,-2.2,1,2.5,.3,'#5ba9b9');box(scene,x,4.7,-1,1,1.3,1,'#7b8f92');}

// ---------- 안전 펜스 ----------
for(let x of [-15,5]){
 for(let z of [-5.5,5.5])for(let dx=-4;dx<=4;dx+=2){
  box(scene,x+dx,1,z,.08,2,.08,'#dca842');
  box(scene,x+dx+.8,1,z,1.7,1.7,.04,'#7b8581');
 }
 box(scene,x,1,-5.5,8,.08,.08,'#e3b44a');
}

// ---------- 검사 게이트 아치 ----------
for(let x of [14,16]){box(scene,x,2.2,0,.2,3,3.7,'#5bb8b7');}
box(scene,15,3.8,0,2.5,.2,3.7,'#7cbfbe');

// ---------- AMR 순환로 표시 ----------
for(let z of [-8,10]){box(scene,0,.045,z,60,.02,.15,'#c1d46d');}
for(let x of [-29,29])box(scene,x,.045,1,.15,.02,18,'#c1d46d');
let amrLabel=makeLabelSprite('AMR / 물류 순환로',0.85);
amrLabel.position.set(-2,4.6,11.8);scene.add(amrLabel);

// ---------- 정지 경광등 (작업 구역 1~4) ----------
const beacons=[];
for(let s=1;s<=4;s++){
 let g=new THREE.Group();g.position.set(xs[s],0,4.6);scene.add(g);
 cyl(g,0,1.4,0,.07,2.8,'#3a4a50');
 let bm=new THREE.MeshStandardMaterial({color:'#5a2020',emissive:'#ff2a1a',emissiveIntensity:.12,roughness:.4});
 let bulb=new THREE.Mesh(new THREE.SphereGeometry(.22,14,14),bm);
 bulb.position.y=2.95;g.add(bulb);
 beacons.push({mat:bm,stage:s});
}

// ---------- 6축 로봇팔 플릿 ----------
const arms=[];            // {arm, stage, seed}
const robotRoots=[];
const humanRoots=[];
const amrRoots=[];
const roots={car:[],robot:robotRoots,humanoid:humanRoots,amr:amrRoots};

function buildRobots(n){
 for(const a of arms)scene.remove(a.arm.root);
 arms.length=0;robotRoots.length=0;
 const weldN=Math.ceil(n/2),asmN=n-weldN;
 let idx=0;
 const place=(count,cx,stage)=>{
  for(let i=0;i<count;i++,idx++){
   const x=cx+(i-(count-1)/2)*3.4;
   const z=(i%2===0)?-3.8:3.8;
   const arm=createRobotArm();
   arm.root.position.set(x,0,z);
   arm.root.rotation.y=(z<0?-Math.PI/2:Math.PI/2)+(((idx*0.37)%1)-0.5)*0.3; // 라인 방향
   scene.add(arm.root);
   robotRoots.push(arm.root);
   replace(arm.root,'robot');
   arms.push({arm,stage,seed:idx});
  }
 };
 place(weldN,-15,1);   // 차체 용접
 place(asmN,5,3);      // 최종 조립
 const lg=$('#legendRobot');if(lg)lg.textContent='● 산업용 로봇 '+n;
}

// ---------- 휴머노이드 (웨이포인트 보행) ----------
const humans=[]; // {root, visual, legs, arms, route, wp}
function buildHumanoid(x,z,route){
 let root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
 let v=new THREE.Group();root.add(v);root.userData.visual=v;
 box(v,0,1.1,0,.55,.75,.35,'#b3d4d7');
 box(v,0,1.7,0,.4,.35,.35,'#d8e9e7');
 box(v,0,1.73,.18,.3,.09,.02,'#173541');
 let legs=[],armsA=[];
 for(let side of [-1,1]){
  let leg=new THREE.Group();leg.position.set(side*.18,.72,0);v.add(leg);
  box(leg,0,-.3,0,.19,.6,.2,'#b1c6cc');box(leg,0,-.63,.09,.24,.12,.4,'#405563');
  legs.push(leg);
  let ar=new THREE.Group();ar.position.set(side*.4,1.4,0);v.add(ar);
  box(ar,0,-.35,0,.18,.7,.18,'#c5dcdb');ar.rotation.z=side*.15;
  armsA.push(ar);
 }
 const h={root,visual:v,legs,arms:armsA,route,wp:1};
 humans.push(h);humanRoots.push(root);
 // 주의: GLB 자동 교체는 아래 fetch 루프의 applyModel이 roots.humanoid를 순회하며 처리
 return h;
}
buildHumanoid(8,8,[[2,7],[18,7],[18,12],[2,12]]);          // 조립 구역 순찰
buildHumanoid(-24,-8,[[-27,-5],[-21,-5],[-21,-11],[-27,-11]]); // 창고 순찰

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
const AMR_X0=-29,AMR_X1=29,AMR_Z0=-8,AMR_Z1=10;
const AMR_PERIM=2*((AMR_X1-AMR_X0)+(AMR_Z1-AMR_Z0));
function amrPose(s){
 s=((s%AMR_PERIM)+AMR_PERIM)%AMR_PERIM;
 const w=AMR_X1-AMR_X0,h=AMR_Z1-AMR_Z0;
 if(s<w)return{x:AMR_X0+s,z:AMR_Z0,ry:0,dx:1,dz:0};
 s-=w;if(s<h)return{x:AMR_X1,z:AMR_Z0+s,ry:-Math.PI/2,dx:0,dz:1};
 s-=h;if(s<w)return{x:AMR_X1-s,z:AMR_Z1,ry:Math.PI,dx:-1,dz:0};
 s-=w;return{x:AMR_X0,z:AMR_Z1-s,ry:Math.PI/2,dx:0,dz:-1};
}
const amrs=[]; // {root, s, speed, ring, beaconMat, seed}
const CARGO_COLORS=['#b69265','#7fa8c9','#c97f8a','#9a8ac9','#8ac9a8'];
const ringGeo=new THREE.RingGeometry(0.94,1.0,48);
function buildAMRs(n){
 for(const a of amrs)scene.remove(a.root);
 amrs.length=0;amrRoots.length=0;
 for(let i=0;i<n;i++){
  const root=new THREE.Group();scene.add(root);
  const v=new THREE.Group();root.add(v);root.userData.visual=v;
  box(v,0,.3,0,1.5,.5,1.1,'#a8c765');
  box(v,0,.62,0,1.2,.15,.85,'#30464a');
  box(v,0,1.0,0,.9,.65,.65,CARGO_COLORS[i%CARGO_COLORS.length]); // 적재 박스
  cyl(v,.5,.82,0,.09,.2,'#20343a');                            // 라이다
  for(const wx of [-.7,.7])for(const wz of [-.4,.4]){
   const w=cyl(v,wx,.23,wz,.2,.13,'#20343a');w.rotation.x=Math.PI/2;
  }
  const bm=new THREE.MeshStandardMaterial({color:'#5a2a10',emissive:'#ff9a1a',emissiveIntensity:.3,roughness:.4});
  const bc=new THREE.Mesh(new THREE.SphereGeometry(.07,10,10),bm);
  bc.position.set(-0.55,0.86,0);root.add(bc);                  // 경고등
  const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#7fe08a',transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;root.add(ring); // 센서 범위
  const p=amrPose(i*AMR_PERIM/n);
  root.position.set(p.x,0,p.z);root.rotation.y=p.ry;
  amrs.push({root,s:i*AMR_PERIM/n,speed:3.2,ring,beaconMat:bm,seed:i});
  amrRoots.push(root);
  replace(root,'amr');
 }
 const lg=$('#legendAmr');if(lg)lg.textContent='● AMR '+n;
}
function updateAMRs(dSim){
 const sensorRange=Number($('#sensor').value);
 for(const a of amrs){
  const p=amrPose(a.s);
  const ax=p.x+p.dx*1.4,az=p.z+p.dz*1.4; // 전방 감지점
  let nearest=Infinity;
  const consider=(x,z)=>{const d=Math.hypot(x-ax,z-az);if(d<nearest)nearest=d;};
  for(const r of carGroups.values())consider(r.position.x,r.position.z);
  for(const h of humans)consider(h.root.position.x,h.root.position.z);
  for(const b of amrs)if(b!==a)consider(b.root.position.x,b.root.position.z);
  const want=nearest<sensorRange?Math.max(0,(nearest-1.2)/Math.max(sensorRange-1.2,0.1)):1;
  a.speed+=(3.2*want-a.speed)*Math.min(1,dSim*3);
  if(dSim>0)a.s+=a.speed*dSim;
  const p2=amrPose(a.s);
  a.root.position.set(p2.x,0,p2.z);a.root.rotation.y=p2.ry;
  a.ring.scale.setScalar(Math.max(sensorRange,0.5));
  a.beaconMat.emissiveIntensity=(Math.sin(sim.time*6+a.seed*2)>0)?2.2:0.25;
 }
}

// ---------- 차량 (차체 → 완성차 외형 전환) ----------
const carGroups=new Map();
const finishBlue=new THREE.MeshStandardMaterial({color:'#2f6fb2',roughness:.32,metalness:.75});
const glassMat=new THREE.MeshStandardMaterial({color:'#10181d',roughness:.15,metalness:.6});
function variantMesh(geo,mt,x,y,z,parent){
 const m=new THREE.Mesh(geo,mt);m.position.set(x,y,z);
 m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function buildBodyVariant(){ // body-in-white: 흰색, 바퀴 없음
 const g=new THREE.Group();
 const white=new THREE.MeshStandardMaterial({color:'#e9edef',roughness:.5,metalness:.3});
 const winB=new THREE.MeshStandardMaterial({color:'#9fb2b8',roughness:.5,metalness:.3});
 variantMesh(new THREE.BoxGeometry(3.5,.62,1.55),white,0,.42,0,g);
 variantMesh(new THREE.BoxGeometry(1.9,.62,1.35),white,.1,.92,0,g);
 variantMesh(new THREE.BoxGeometry(1.4,.36,.04),winB,.13,.98,.69,g);
 variantMesh(new THREE.BoxGeometry(1.4,.36,.04),winB,.13,.98,-.69,g);
 return g;
}
function buildFinishedVariant(){ // 완성차: 메탈릭 블루 + 바퀴 + 윈도우
 const g=new THREE.Group();
 variantMesh(new THREE.BoxGeometry(3.5,.6,1.55),finishBlue,0,.4,0,g);
 variantMesh(new THREE.BoxGeometry(1.9,.65,1.35),finishBlue,.1,.9,0,g);
 variantMesh(new THREE.BoxGeometry(1.4,.4,.04),glassMat,.13,.96,.69,g);
 variantMesh(new THREE.BoxGeometry(1.4,.4,.04),glassMat,.13,.96,-.69,g);
 const wg=new THREE.CylinderGeometry(.32,.32,.18,16);
 const wm=new THREE.MeshStandardMaterial({color:'#253137',roughness:.8,metalness:.2});
 for(const x of [-1.1,1.1])for(const z of [-.8,.8]){
  const w=variantMesh(wg,wm,x,.2,z,g);w.rotation.x=Math.PI/2;
 }
 return g;
}
function buildCar(){
 const r=new THREE.Group();
 const c=new THREE.Group();r.add(c);r.userData.visual=c;
 const body=buildBodyVariant();body.name='body';
 const fin=buildFinishedVariant();fin.name='finished';fin.visible=false;
 c.add(body,fin);
 r.userData.body=body;r.userData.finished=fin;r.userData.stageShown=-1;
 return r;
}
function setCarVariant(r,stage){
 const isBody=stage<=1; // 입고·차체용접 = 차체, 도장 이후 = 완성차
 r.userData.body.visible=isBody;
 r.userData.finished.visible=!isBody;
 r.userData.stageShown=stage;
}
function syncCars(){
 const ids=new Set(sim.cars.map(c=>c.id));
 for(const [id,r] of [...carGroups]){
  if(!ids.has(id)){scene.remove(r);carGroups.delete(id);roots.car=roots.car.filter(v=>v!==r);}
 }
 for(const c of sim.cars){
  let r=carGroups.get(c.id);
  if(!r){r=buildCar();scene.add(r);carGroups.set(c.id,r);roots.car.push(r);replace(r,'car');}
  if(r.userData.stageShown!==c.stage)setCarVariant(r,c.stage);
  const qlist=sim.cars.filter(x=>x.stage===c.stage).sort((a,b)=>a.id-b.id);
  const queue=qlist.findIndex(v=>v===c);
  r.position.set(xs[c.stage]-queue*2.1+c.progress*1.1,.95,queue>0?1.5:0);
 }
}

// ---------- GLB 모델 교체 ----------
// 기본 제공 GLB(car/amr/humanoid/robot.glb)는 직접 작성한 절차적 자산이며 Tripo 생성이 아님.
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
  // 차량은 '완성차' variant만 교체 — 차체 variant와 스테이지 전환 유지
  const c=root.userData.visual;
  const old=c.getObjectByName('finished');if(old)c.remove(old);
  const v=templates[type].clone(true);v.name='finished';
  v.visible=!root.userData.body.visible;c.add(v);
  root.userData.finished=v;return;
 }
 if(root.userData.visual)root.remove(root.userData.visual);
 const v=templates[type].clone(true);root.add(v);root.userData.visual=v;
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
for(let type of ['car','amr','humanoid']){
 fetch('./'+type+'.glb')
  .then(r=>{if(!r.ok)throw Error('missing asset');return r.arrayBuffer();})
  .then(b=>applyModel(type,b)).catch(()=>{});
}

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
$('#camAll').onclick=()=>goCam(.8,.78,64,0,0,0);
$('#camWeld').onclick=()=>goCam(.9,.45,26,-15,1,0);
$('#camPaint').onclick=()=>goCam(.9,.45,26,-5,1,0);
$('#camAsm').onclick=()=>goCam(.9,.45,26,5,1,0);
$('#camInsp').onclick=()=>goCam(.9,.45,32,20,1,0);
$('#camFollow').onclick=e=>{followCar=!followCar;e.target.classList.toggle('on',followCar);};
new ResizeObserver(()=>{
 let w=view.clientWidth,h=view.clientHeight;
 renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}).observe(view);
updateCam();

// ---------- UI 배선 ----------
$('#reset').onclick=()=>{
 try{
  const cycle=Number($('#cycle').value),arrival=Number($('#arrival').value),tgt=Number($('#target').value);
  if(cycle<1||cycle>120||arrival<1||arrival>120)throw Error('작업 시간과 투입 간격은 1~120초입니다.');
  const cycles={};
  for(let s=1;s<=4;s++){const v=Number($('#cycle'+s).value);if(!(v>=1&&v<=120))throw Error('구역별 공정시간은 1~120초입니다.');cycles[s]=v;}
  const faultOn=$('#fault').checked;
  sim=new FactorySimulation({cycle,arrival,target:tgt,cycles,
   faultMode:faultOn?'random':'manual',faultRate:Number($('#faultrate').value),repairTime:45});
  sim.manualStop(Number($('#stop').value));
  $('#stop').disabled=faultOn;
  buildRobots(Number($('#robotcount').value));
  buildAMRs(Number($('#amrcount').value));
  followCar=false;$('#camFollow').classList.remove('on');
  lastSimTime=0;
  $('#error').textContent='';
 }catch(e){$('#error').textContent=e.message;}
};
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

// 초기 플릿
buildRobots(8);
buildAMRs(3);

// ---------- 이벤트 / KPI ----------
const p3=id=>String(id).padStart(3,'0');
function evText(e){
 if(e.type==='arrival')return `${e.time.toFixed(1)}s · CAR-${p3(e.id)} · 생산 투입`;
 if(e.type==='shipped')return `${e.time.toFixed(1)}s · CAR-${p3(e.id)} · 출하 완료`;
 if(e.type==='fault')return `${e.time.toFixed(1)}s · ⚠ ${STAGES[e.stage]} 고장 정지`;
 if(e.type==='recovered')return `${e.time.toFixed(1)}s · ✔ ${STAGES[e.stage]} 복구·가동 재개`;
 if(e.type==='stop')return `${e.time.toFixed(1)}s · ■ ${STAGES[e.stage]} 수동 정지`;
 return `${e.time.toFixed(1)}s · ${e.type}`;
}
function updateUI(){
 $('#shipped').textContent=sim.shipped;
 $('#wip').textContent=sim.cars.length;
 $('#created').textContent=sim.created;
 $('#clock').textContent=sim.time.toFixed(0)+' s';
 $('#tput').textContent=sim.throughputPerHour.toFixed(1);
 $('#flowt').textContent=sim.avgFlowTime.toFixed(0)+' s';
 $('#avail').textContent=(sim.availability*100).toFixed(1)+'%';
 $('#faults').textContent=sim.faultCount;
 $('#queues').innerHTML=STAGES.map((s,i)=>
  `<div class="queue ${i===sim.stopped?'stopped':''}">${s}<strong>${sim.queues[i]} 대 ${i===sim.stopped?'· 정지':''}</strong></div>`
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

 syncCars();

 // 6축 로봇팔 작업 애니메이션
 for(let i=0;i<arms.length;i++){
  const a=arms[i];
  if(a.arm.group.parent!==a.arm.root)continue; // GLB로 교체된 경우 스킵
  const active=!paused&&sim.stopped!==a.stage&&sim.queues[a.stage]>0;
  a.arm.update(sim.time,active,a.seed);
 }

 // 경광등
 for(const b of beacons){
  b.mat.emissiveIntensity=sim.stopped===b.stage?1.6+Math.sin(sim.time*9)*1.2:0.12;
 }

 updateAMRs(dSim);
 updateHumans(dSim);

 // 차량 추적 카메라
 if(followCar&&sim.cars.length){
  const lead=[...sim.cars].sort((a,b)=>b.stage-a.stage||b.progress-a.progress||a.id-b.id)[0];
  const r=carGroups.get(lead.id);
  if(r){_v.set(r.position.x,1,r.position.z);target.lerp(_v,0.08);updateCam();}
 }

 if(ts-ui>250){ui=ts;updateUI();}
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}
$('#loading').remove();
requestAnimationFrame(frame);
