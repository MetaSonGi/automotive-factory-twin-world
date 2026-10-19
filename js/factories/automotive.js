// js/factories/automotive.js — 자동차 공장 (기존 구현 그대로)
// node-safe: THREE/DOM은 H 경유로만 사용 (top-level import 금지)
import {box,cyl,group,makeLabelSprite} from './common.js';

const finishBlue=()=>({color:'#2f6fb2',roughness:.32,metalness:.75});
function variantMesh(H,geo,mt,x,y,z,parent){
  const m=new H.T.Mesh(geo,mt);m.position.set(x,y,z);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function buildBodyVariant(H){
  // 차체(body-in-white): 하단이 그룹 y=0에 닿도록 (컨베이어 벨트 위에 안착)
  const t=H.T;
  const g=new t.Group();
  const white=new t.MeshStandardMaterial({color:'#e9edef',roughness:.5,metalness:.3});
  const winB=new t.MeshStandardMaterial({color:'#9fb2b8',roughness:.5,metalness:.3});
  variantMesh(H,new t.BoxGeometry(3.5,.62,1.55),white,0,.31,0,g);
  variantMesh(H,new t.BoxGeometry(1.9,.62,1.35),white,.1,.81,0,g);
  variantMesh(H,new t.BoxGeometry(1.4,.36,.04),winB,.13,.87,.69,g);
  variantMesh(H,new t.BoxGeometry(1.4,.36,.04),winB,.13,.87,-.69,g);
  return g;
}
function buildFinishedVariant(H){
  // 완성차: 바퀴 하단이 그룹 y=0에 닿도록 (컨베이어 벨트 위에 안착)
  const t=H.T;
  const g=new t.Group();
  const blue=new t.MeshStandardMaterial(finishBlue());
  const glass=new t.MeshStandardMaterial({color:'#10181d',roughness:.15,metalness:.6});
  variantMesh(H,new t.BoxGeometry(3.5,.6,1.55),blue,0,.52,0,g);
  variantMesh(H,new t.BoxGeometry(1.9,.65,1.35),blue,.1,1.02,0,g);
  variantMesh(H,new t.BoxGeometry(1.4,.4,.04),glass,.13,1.08,.69,g);
  variantMesh(H,new t.BoxGeometry(1.4,.4,.04),glass,.13,1.08,-.69,g);
  const wg=new t.CylinderGeometry(.32,.32,.18,16);
  const wm=new t.MeshStandardMaterial({color:'#253137',roughness:.8,metalness:.2});
  for(const x of [-1.1,1.1])for(const z of [-.8,.8]){
    const w=variantMesh(H,wg,wm,x,.32,z,g);w.rotation.x=Math.PI/2;
  }
  return g;
}

export default {
  id:'automotive',
  name:'자동차',
  enName:'AUTOMOTIVE',
  title:'자동차 생산,<br>하나의 월드에서.',
  unit:'대',
  itemPrefix:'CAR',
  robotLabel:'산업용 로봇',
  stages:[
    {key:'receive', label:'입고',      cycle:4},
    {key:'weld',    label:'차체 용접', cycle:8},
    {key:'paint',   label:'도장',      cycle:8},
    {key:'assembly',label:'최종 조립', cycle:8},
    {key:'inspect', label:'품질 검사', cycle:8},
    {key:'ship',    label:'출하',      cycle:4},
  ],
  theme:{
    bg:'#c4d5da',floor:'#798c8c',gridA:'#677c7f',gridB:'#829698',
    padA:'#4c6269',padB:'#526d73',accent:'#ebc35e',
  },
  stationXs:[-25,-15,-5,5,15,25],
  robots:{stages:[1,3],defaultCount:8,scale:1},
  amr:{count:3,rect:{x0:-29,x1:29,z0:-8,z1:10}},
  humans:[
    {x:8,z:8,route:[[2,7],[18,7],[18,12],[2,12]]},
    {x:-24,z:-8,route:[[-27,-5],[-21,-5],[-21,-11],[-27,-11]]},
  ],
  itemY:.95,
  itemThreshold:1,   // stage<=1: 차체, 이후: 완성차
  glb:{car:'./car.glb',amr:'./amr.glb',humanoid:'./humanoid.glb'},
  followBtn:'차량 추적',
  desc:'입고 → 차체 용접 → 도장 → 최종 조립 → 검사 → 출하',
  blurb:'6축 관절 로봇팔의 용접 동작, 차체→완성차 외형 전환, AMR 순환 물류(센서 감속), 휴머노이드 웨이포인트 보행, 랜덤 고장 시나리오를 포함합니다. 로봇 이동은 시각적 데모이며 충돌 회피·실제 제조·로봇 제어 검증은 포함하지 않습니다.',

  buildStatic(H,g){
    // 컨베이어 라인 (차량 이동 경로 — 차체보다 넓고 묵직하게, 벨트 상단 y=0.95)
    const beltTop=0.95, beltW=3.0;
    box(g,0,beltTop-0.07,0,60,0.14,beltW,'#26292b');                    // 벨트
    for(const sz of [-1,1]){
      box(g,0,beltTop-0.2,sz*(beltW/2+0.1),60,0.34,0.14,'#7d8a8c');     // 사이드 프레임
      box(g,0,beltTop+0.005,sz*(beltW/2-0.2),60,0.02,0.2,'#e8c93c');    // 엣지 스트라이프
    }
    for(let x=-29;x<=29;x+=2){                                          // 롤러
      const r=cyl(g,x,beltTop-0.17,0,0.085,beltW+0.24,'#9fb0b0',10);r.rotation.x=Math.PI/2;
    }
    for(let x=-27.5;x<=27.5;x+=5){                                      // 지지 다리
      for(const sz of [-1,1])box(g,x,(beltTop-0.35)/2,sz*(beltW/2-0.2),0.16,beltTop-0.35,0.16,'#546062');
      box(g,x,(beltTop-0.35)/2,0,0.14,beltTop-0.35,0.14,'#546062');
    }
    const cv=makeLabelSprite('컨베이어 라인',0.85);
    cv.position.set(0,2.7,3.2);g.add(cv);
    // 부품 랙 (창고)
    for(const x of [-27,-21])for(const z of [-10,-13]){
      for(const y of [.3,1.8,3.3]){
        box(g,x,y,z,4,.12,2,'#687982');
        for(let n=0;n<3;n++)box(g,x-1.3+n*1.3,y+.5,z,1,.9,1.3,'#b18c58');
      }
      for(const dx of [-2,2])box(g,x+dx,2,z,.15,4,.15,'#d79047');
    }
    const wh=makeLabelSprite('부품 입고 / WAREHOUSE',0.85);
    wh.position.set(-24,5.2,-7);g.add(wh);
    // 도장 부스 (반투명 터널, x=-5 = 도장 스테이션)
    const t=H.T;
    const boothMat=new t.MeshStandardMaterial({color:'#cfe0da',transparent:true,opacity:.35,roughness:.2,metalness:.1});
    for(const dx of [-4,4]){
      const wall=new t.Mesh(new t.BoxGeometry(.3,4,5),boothMat);
      wall.position.set(-5+dx,2,-.5);wall.castShadow=true;g.add(wall);
    }
    box(g,-5,4,0,8,.25,5,'#dfebe5');
    box(g,-5,2,-2.5,8,4,.2,'#9db4b6');
    for(const x of [-7,-3]){box(g,x,2.2,-2.2,1,2.5,.3,'#5ba9b9');box(g,x,4.7,-1,1,1.3,1,'#7b8f92');}
    // 안전 펜스
    for(const x of [-15,5]){
      for(const z of [-5.5,5.5])for(let dx=-4;dx<=4;dx+=2){
        box(g,x+dx,1,z,.08,2,.08,'#dca842');
        box(g,x+dx+.8,1,z,1.7,1.7,.04,'#7b8581');
      }
      box(g,x,1,-5.5,8,.08,.08,'#e3b44a');
    }
    // 검사 게이트 아치 (x=15 = 검사 스테이션)
    for(const x of [14,16])box(g,x,2.2,0,.2,3,3.7,'#5bb8b7');
    box(g,15,3.8,0,2.5,.2,3.7,'#7cbfbe');
    // AMR 순환로 표시
    for(const z of [-8,10])box(g,0,.045,z,60,.02,.15,'#c1d46d');
    for(const x of [-29,29])box(g,x,.045,1,.15,.02,18,'#c1d46d');
    const amrL=makeLabelSprite('AMR / 물류 순환로',0.85);
    amrL.position.set(-2,4.6,11.8);g.add(amrL);
    return {animated:[]};
  },

  makeItem(H){
    const t=H.T;
    const root=new t.Group();
    const c=new t.Group();root.add(c);root.userData.visual=c;
    const body=buildBodyVariant(H);body.name='body';
    const fin=buildFinishedVariant(H);fin.name='finished';fin.visible=false;
    c.add(body,fin);
    root.userData.body=body;root.userData.finished=fin;
    return {
      root,
      setStage(stage){
        const isBody=stage<=1;
        body.visible=isBody;fin.visible=!isBody;
      },
    };
  },
};
