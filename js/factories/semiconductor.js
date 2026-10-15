// js/factories/semiconductor.js — 반도체 팹 (클린룸, 노광 옐로우룸)
// node-safe: THREE/DOM은 H 경유로만 사용 (top-level import 금지)
import {box,cyl,group,makeLabelSprite} from './common.js';

export default {
  id:'semiconductor',
  name:'반도체',
  enName:'SEMICONDUCTOR',
  title:'반도체 팹,<br>하나의 월드에서.',
  unit:'장',
  itemPrefix:'WFR',
  robotLabel:'이송 로봇',
  stages:[
    {key:'receive', label:'웨이퍼 입고', cycle:4},
    {key:'litho',   label:'노광',       cycle:12},
    {key:'etch',    label:'식각',       cycle:10},
    {key:'dep',     label:'증착',       cycle:10},
    {key:'cmp',     label:'CMP·세정',   cycle:8},
    {key:'ship',    label:'검사·출하',   cycle:4},
  ],
  theme:{
    bg:'#e4ebee',floor:'#c3ccd0',gridA:'#9aa7ad',gridB:'#b2bdc2',
    padA:'#6d8894',padB:'#77919c',accent:'#f2c94c',
  },
  stationXs:[-25,-15,-5,5,15,25],
  robots:{stages:[1,3],defaultCount:4,scale:.55},  // 웨이퍼 이송용 소형 로봇팔
  amr:{count:2,rect:{x0:-29,x1:29,z0:-8,z1:10}},
  humans:[
    {x:0,z:8,route:[[-10,7],[10,7],[10,12],[-10,12]]},
    {x:-20,z:-8,route:[[-27,-6],[-18,-6],[-18,-10],[-27,-10]]},
  ],
  itemY:.95,
  itemThreshold:2,   // stage<=2: 밀폐 FOUP, 이후: 오픈 카세트
  glb:{amr:'./amr.glb',humanoid:'./humanoid.glb'},
  followBtn:'웨이퍼 추적',
  desc:'웨이퍼 입고 → 노광 → 식각 → 증착 → CMP·세정 → 검사·출하',
  blurb:'노광기·식각/증착 챔버·천장 OHT 호이스트·FOUP으로 구성된 반도체 팹. 노광 구역은 옐로우룸 조명이며, 로봇 이동은 시각적 데모입니다.',

  buildStatic(H,g){
    const t=H.T;
    const animated=[];
    // FOUP 스태커 (웨이퍼 입고, x=-25)
    for(const dz of [-6,-9]){
      for(let lvl=0;lvl<3;lvl++){
        const y=.4+lvl*.9;
        box(g,-25,y,dz,4,.1,1.8,'#7d99a8');
        for(let n=0;n<3;n++)box(g,-26.2+n*1.2,y+.35,dz,.85,.6,1.3,n%2?'#e8912d':'#f0a63e');
      }
    }
    const fup=makeLabelSprite('FOUP / 웨이퍼 입고',0.8);
    fup.position.set(-25,4.6,-7.5);g.add(fup);
    // 노광기 (대형 박스 + 옐로우 윈도우 + 상태등, x=-15)
    box(g,-15,1.6,0,5,3.2,3.6,'#dfe7ea');
    box(g,-15,1.6,1.85,4,.9,.08,'#f2c94c');
    const lithoGlass=new t.MeshStandardMaterial({color:'#4a3d10',emissive:'#ffcf3f',emissiveIntensity:.7,roughness:.4});
    const win=new t.Mesh(new t.BoxGeometry(3.4,1.1,.1),lithoGlass);
    win.position.set(-15,2.2,1.82);g.add(win);
    box(g,-15,3.5,0,5.2,.4,3.8,'#9fb2b8');
    const towerM=new t.MeshStandardMaterial({color:'#332211',emissive:'#37e05a',emissiveIntensity:1.4,roughness:.4});
    const tower=new t.Mesh(new t.SphereGeometry(.16,12,12),towerM);
    tower.position.set(-13,3.9,1.5);g.add(tower);
    // 옐로우룸 조명 스트립 (노광 구역 천장)
    const yStrip=new t.MeshStandardMaterial({color:'#5a4a12',emissive:'#ffd94c',emissiveIntensity:1.1,roughness:.5});
    const strip=new t.Mesh(new t.BoxGeometry(9,.12,.6),yStrip);
    strip.position.set(-15,6.8,0);g.add(strip);
    const litho=makeLabelSprite('노광 / 옐로우룸',0.8);
    litho.position.set(-15,5.6,-4);g.add(litho);
    animated.push((tm)=>{towerM.emissiveIntensity=1.1+Math.sin(tm*3)*0.7;});
    // 식각 / 증착 챔버 (원통형, x=-5, x=5)
    for(const [x,label] of [[-5,'식각'],[5,'증착']]){
      const ch=new t.Mesh(new t.CylinderGeometry(1.5,1.6,2.6,20),
        new t.MeshStandardMaterial({color:'#b9cdd3',roughness:.35,metalness:.6}));
      ch.position.set(x,1.5,0);ch.castShadow=true;g.add(ch);
      const door=new t.Mesh(new t.BoxGeometry(1.2,1.4,.15),
        new t.MeshStandardMaterial({color:'#22333b',roughness:.3,metalness:.5}));
      door.position.set(x,1.3,1.58);g.add(door);
      box(g,x,3.1,0,1,.5,1,'#546e7e');
      const lb=makeLabelSprite(label+' 챔버',0.75);
      lb.position.set(x,4.4,2.6);g.add(lb);
    }
    // CMP·세정 (박스형 장비 + 파이프, x=15)
    box(g,15,1.2,0,4,2.4,3,'#cfd9de');
    for(const dx of [-1.2,1.2])cyl(g,15+dx,3,0,.14,1.6,'#7d99a8');
    const cmp=makeLabelSprite('CMP·세정',0.8);
    cmp.position.set(15,4.6,-3);g.add(cmp);
    // 천장 OHT 레일 + 이동 호이스트 2기
    box(g,0,6.6,2.8,58,.18,.4,'#8b9aa1');
    const hoists=[];
    for(let i=0;i<2;i++){
      const hg=new t.Group();hg.position.set(-18+i*36,6.6,2.8);g.add(hg);
      const cab=new t.Mesh(new t.BoxGeometry(1.1,.5,.7),
        new t.MeshStandardMaterial({color:'#e8eef0',roughness:.5,metalness:.3}));
      cab.position.y=-.35;cab.castShadow=true;hg.add(cab);
      const cable=new t.Mesh(new t.BoxGeometry(.06,1.6,.06),
        new t.MeshStandardMaterial({color:'#3a4a50'}));
      cable.position.y=-1.4;hg.add(cable);
      const foup=new t.Mesh(new t.BoxGeometry(.8,.55,.6),
        new t.MeshStandardMaterial({color:'#f0a63e',roughness:.5,metalness:.2}));
      foup.position.y=-2.4;foup.castShadow=true;hg.add(foup);
      hoists.push({g:hg,ph:i*Math.PI});
    }
    const oht=makeLabelSprite('OHT / 천장 반송',0.8);
    oht.position.set(8,7.6,2.8);g.add(oht);
    animated.push((tm)=>{for(const h of hoists)h.g.position.x=-18+36*(0.5+0.5*Math.sin(tm*0.22+h.ph));});
    // AMR 순환로 표시
    for(const z of [-8,10])box(g,0,.045,z,60,.02,.15,'#c1d46d');
    for(const x of [-29,29])box(g,x,.045,1,.15,.02,18,'#c1d46d');
    return {animated};
  },

  makeItem(H){
    const t=H.T;
    const root=new t.Group();
    const c=new t.Group();root.add(c);root.userData.visual=c;
    // early: 밀폐 FOUP / late: 오픈 카세트 (웨이퍼 보임)
    const early=new t.Group();
    const fb=new t.Mesh(new t.BoxGeometry(1.1,.8,.9),
      new t.MeshStandardMaterial({color:'#f0a63e',roughness:.5,metalness:.2}));
    fb.position.y=.75;fb.castShadow=true;early.add(fb);
    const late=new t.Group();
    const base=new t.Mesh(new t.BoxGeometry(1.1,.18,.9),
      new t.MeshStandardMaterial({color:'#8a9aa2',roughness:.5,metalness:.4}));
    base.position.y=.45;base.castShadow=true;late.add(base);
    const waferM=new t.MeshStandardMaterial({color:'#9fd8e8',roughness:.15,metalness:.8});
    for(let i=0;i<5;i++){
      const w=new t.Mesh(new t.CylinderGeometry(.3,.3,.03,20),waferM);
      w.position.set(-.32+i*.16,.62,0);late.add(w);
    }
    const handle=new t.Mesh(new t.BoxGeometry(.9,.12,.12),
      new t.MeshStandardMaterial({color:'#546e7e'}));
    handle.position.y=.95;late.add(handle);
    late.visible=false;
    c.add(early,late);
    return {
      root,
      setStage(stage){
        const isEarly=stage<=2;
        early.visible=isEarly;late.visible=!isEarly;
      },
    };
  },
};
