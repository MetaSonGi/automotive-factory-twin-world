// js/factories/battery.js — 배터리 셀 공장 (클린룸)
// node-safe: THREE/DOM은 H 경유로만 사용 (top-level import 금지)
import {box,cyl,group,makeLabelSprite} from './common.js';

export default {
  id:'battery',
  name:'배터리',
  enName:'BATTERY',
  title:'배터리 셀 생산,<br>하나의 월드에서.',
  unit:'셀',
  itemPrefix:'CELL',
  robotLabel:'공정 로봇',
  stages:[
    {key:'receive',  label:'원료 입고',   cycle:4},
    {key:'electrode',label:'전극 공정',   cycle:10},
    {key:'assembly', label:'조립',        cycle:8},
    {key:'fill',     label:'전해액 주입', cycle:6},
    {key:'formation',label:'화성',        cycle:14},
    {key:'ship',     label:'검사·출하',   cycle:4},
  ],
  theme:{
    bg:'#dde8ee',floor:'#a9b6bc',gridA:'#8b9aa1',gridB:'#a5b4ba',
    padA:'#5e7c8c',padB:'#688695',accent:'#3fa7ff',
  },
  stationXs:[-25,-15,-5,5,15,25],
  robots:{stages:[1,2],defaultCount:6,scale:.9},
  amr:{count:3,rect:{x0:-29,x1:29,z0:-8,z1:10}},
  humans:[
    {x:0,z:8,route:[[-8,7],[8,7],[8,12],[-8,12]]},
    {x:-24,z:-8,route:[[-27,-5],[-21,-5],[-21,-11],[-27,-11]]},
  ],
  itemY:.95,
  itemThreshold:1,   // stage<=1: 원료 트레이, 이후: 셀 적재 트레이
  glb:{amr:'./amr.glb',humanoid:'./humanoid.glb'},
  followBtn:'셀 추적',
  desc:'원료 입고 → 전극 공정 → 조립 → 전해액 주입 → 화성 → 검사·출하',
  blurb:'전극 롤·와인딩 머신·전해액 주입기·화성 랙(충전 LED 점멸)으로 구성된 배터리 셀 라인. 트레이 단위로 셀이 이동하며, 로봇 이동은 시각적 데모입니다.',

  buildStatic(H,g){
    const t=H.T;
    const animated=[];
    // 클린룸 파티션 (전극~조립 구역)
    for(const x of [-20,-10,0]){
      box(g,x,1.5,-4.5,10,.12,1,'#e8f1f4');
      box(g,x,1.5,4.5,10,.12,1,'#e8f1f4');
    }
    // 전극 롤 (대형 롤 2기, x=-15 = 전극 공정)
    for(const [dx,dz] of [[-1.5,0],[1.5,0]]){
      const roll=new t.Mesh(new t.CylinderGeometry(.9,.9,2.6,20),
        new t.MeshStandardMaterial({color:'#cfd9de',roughness:.4,metalness:.5}));
      roll.geometry.rotateX(Math.PI/2);
      roll.position.set(-15+dx,1.1,dz);roll.castShadow=true;g.add(roll);
      box(g,-15+dx,.35,dz,2.2,.5,3,'#5e7c8c');
    }
    const mxr=makeLabelSprite('전극 / 믹서·코터',0.8);
    mxr.position.set(-15,4.6,-5);g.add(mxr);
    // 와인딩 머신 (박스 + 회전 드럼, x=-5 = 조립 스테이션 옆)
    box(g,-5,1.1,-4.2,3.4,2.2,2,'#7d99a8');
    const drum=new t.Mesh(new t.CylinderGeometry(.55,.55,1.6,18),
      new t.MeshStandardMaterial({color:'#8fb6c9',roughness:.35,metalness:.6}));
    drum.geometry.rotateX(Math.PI/2);
    drum.position.set(-5,1.4,-4.2);drum.castShadow=true;g.add(drum);
    box(g,-5,2.6,-4.2,3.4,.5,2,'#546e7e');
    const wnd=makeLabelSprite('조립 / 와인딩',0.8);
    wnd.position.set(-5,4.6,-5.5);g.add(wnd);
    animated.push((tm,dt)=>{drum.rotation.z+=dt*2.2;});
    // 전해액 주입기 (갠트리 + 노즐 3개, x=5 = 전해액 주입 스테이션)
    box(g,5,3.1,0,2.2,.5,4.4,'#6b8a9c');                       // 갠트리
    for(const dz of [-1.2,0,1.2]){
      cyl(g,5,2.4,dz,.09,.9,'#3d5a6b');
      cyl(g,5,1.85,dz,.16,.25,'#2f6fb2');
    }
    const fil=makeLabelSprite('전해액 주입',0.8);
    fil.position.set(5,4.9,3.4);g.add(fil);
    // 화성 랙 (격자 랙 + 셀 박스 + 충전 LED 점멸, x=15)
    const leds=[];
    for(const rz of [-7.5,-10.5]){
      for(let lvl=0;lvl<3;lvl++){
        const y=.5+lvl*1.1;
        box(g,15,y,rz,6,.1,1.6,'#5e7c8c');
        for(let n=0;n<5;n++){
          box(g,12.9+n*1.05,y+.32,rz,.8,.55,1.1,n%2?'#3f6fb5':'#4c86c9');
          if((n+lvl)%2===0){
            const lm=new t.MeshStandardMaterial({color:'#123322',emissive:'#2aff7a',emissiveIntensity:.4,roughness:.4});
            const led=new t.Mesh(new t.BoxGeometry(.12,.12,.12),lm);
            led.position.set(12.9+n*1.05,y+.62,rz+.62);g.add(led);
            leds.push({m:lm,ph:(n*1.3+lvl*2.1)});
          }
        }
      }
      for(const dx of [-3.2,3.2])box(g,15+dx,1.7,rz,.18,3.4,.18,'#d79047');
    }
    const frm=makeLabelSprite('화성 / 충·방전',0.8);
    frm.position.set(15,5.4,-9);g.add(frm);
    animated.push((tm)=>{for(const l of leds)l.m.emissiveIntensity=(Math.sin(tm*4+l.ph)>0)?2.4:0.25;});
    // AGV 순환로 표시
    for(const z of [-8,10])box(g,0,.045,z,60,.02,.15,'#7fd4a8');
    for(const x of [-29,29])box(g,x,.045,1,.15,.02,18,'#7fd4a8');
    const agv=makeLabelSprite('AGV / 트레이 순환로',0.85);
    agv.position.set(-2,4.6,11.8);g.add(agv);
    return {animated};
  },

  makeItem(H){
    const t=H.T;
    const root=new t.Group();
    const c=new t.Group();root.add(c);root.userData.visual=c;
    // 공용: 트레이
    const tray=new t.Mesh(new t.BoxGeometry(2.6,.18,1.8),
      new t.MeshStandardMaterial({color:'#8a9aa2',roughness:.5,metalness:.4}));
    tray.position.y=.35;tray.castShadow=true;c.add(tray);
    // early: 원료 롤 박스 / late: 셀 6개 적재
    const early=new t.Group();
    const rollBox=new t.Mesh(new t.BoxGeometry(1.6,.7,1.1),
      new t.MeshStandardMaterial({color:'#c9d4d8',roughness:.5,metalness:.3}));
    rollBox.position.y=.8;rollBox.castShadow=true;early.add(rollBox);
    const late=new t.Group();
    const cellMat=new t.MeshStandardMaterial({color:'#2f6fb2',roughness:.35,metalness:.6});
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){
      const cell=new t.Mesh(new t.CylinderGeometry(.22,.22,.55,14),cellMat);
      cell.position.set(-.7+i*.7,.72,-.4+j*.8);cell.castShadow=true;late.add(cell);
    }
    late.visible=false;
    c.add(early,late);
    return {
      root,
      setStage(stage){
        const isEarly=stage<=1;
        early.visible=isEarly;late.visible=!isEarly;
      },
    };
  },
};
