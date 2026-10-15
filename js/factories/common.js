// js/factories/common.js — 공장 모듈 공용 헬퍼
// node-safe: THREE를 top-level import 하지 않고 initThree()로 주입받는다.
// (test.mjs가 factory 설정 모듈을 import 해도 THREE 없이 동작해야 함)
let T=null;
export function initThree(threeNS){T=threeNS;}
function needT(){if(!T)throw Error('initThree() must be called before using builders');return T;}

const mats={};
export function mat(color){
  const t=needT();
  if(!mats[color]){
    const m=new t.MeshStandardMaterial({color,roughness:.65,metalness:.25});
    m.userData.shared=true;
    mats[color]=m;
  }
  return mats[color];
}
export function box(parent,x,y,z,w,h,d,color){
  const t=needT();
  const m=new t.Mesh(new t.BoxGeometry(w,h,d),mat(color));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function cyl(parent,x,y,z,r,h,color,seg=12){
  const t=needT();
  const m=new t.Mesh(new t.CylinderGeometry(r,r,h,seg),mat(color));
  m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
}
export function group(parent,x=0,y=0,z=0){
  const t=needT();
  const g=new t.Group();g.position.set(x,y,z);parent.add(g);return g;
}

// 떠 있는 한글 라벨 (항상 카메라를 향하는 스프라이트)
export function makeLabelSprite(text,scale=1){
  const t=needT();
  const can=document.createElement('canvas');can.width=512;can.height=128;
  const c=can.getContext('2d');
  c.fillStyle='rgba(16,42,50,0.85)';
  if(c.roundRect){c.beginPath();c.roundRect(8,16,496,96,20);c.fill();}
  else c.fillRect(0,0,512,128);
  c.fillStyle='#fff';c.font='bold 46px system-ui,sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  c.fillText(text,256,66);
  const tex=new t.CanvasTexture(can);tex.anisotropy=4;
  const sp=new t.Sprite(new t.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sp.scale.set(9*scale,2.25*scale,1);sp.renderOrder=5;
  return sp;
}

// 공장 그룹 제거 시 지오메트리/비공유 머티리얼 정리 (공유 mat 캐시는 유지)
export function clearGroup(gr){
  gr.traverse(o=>{
    if(o.isMesh||o.isSprite||o.isLine){
      if(o.geometry)o.geometry.dispose();
      const ms=Array.isArray(o.material)?o.material:[o.material];
      for(const m of ms){
        if(m&&!m.userData.shared){
          if(m.map&&!m.map.userData.shared)m.map.dispose();
          m.dispose();
        }
      }
    }
  });
  gr.clear();
}

// 6스테이션 공통 라인: 바닥·그리드·스테이션 패드·컨베이어·안전라인·라벨·경광등
export function buildBase(H,g,def){
  const t=H.T;
  box(g,0,-.15,0,66,.3,34,def.theme.floor);
  const grid=new t.GridHelper(64,32,def.theme.gridA,def.theme.gridB);
  grid.position.y=.02;g.add(grid);
  const xs=def.stationXs;
  for(let i=0;i<6;i++){
    const x=xs[i];
    box(g,x,.18,0,8,.25,5,i%2?def.theme.padA:def.theme.padB);   // 스테이션 패드
    box(g,x,.55,0,8,.4,2.7,'#23383e');                          // 컨베이어 프레임
    for(let n=0;n<12;n++){const r=cyl(g,x-3.6+n*.65,.84,0,.13,2.7,'#a2b0b3');r.rotation.x=Math.PI/2;}
    const lb=makeLabelSprite(String(i+1).padStart(2,'0')+' · '+def.stages[i].label);
    lb.position.set(x,6.4,0);g.add(lb);
    for(const z of [-3.1,3.1])box(g,x,.2,z,8,.03,.08,def.theme.accent); // 안전 라인
  }
  const beacons=[];
  for(let s=1;s<=4;s++){
    const bg=group(g,xs[s],0,4.6);
    cyl(bg,0,1.4,0,.07,2.8,'#3a4a50');
    const bm=new t.MeshStandardMaterial({color:'#5a2020',emissive:'#ff2a1a',emissiveIntensity:.12,roughness:.4});
    const bulb=new t.Mesh(new t.SphereGeometry(.22,14,14),bm);
    bulb.position.y=2.95;bg.add(bulb);
    beacons.push({mat:bm,stage:s});
  }
  return {beacons};
}

// 휴머노이드 피규어 (보행 로직은 world.js가 담당)
export function humanoidFigure(H){
  const t=H.T;
  const root=new t.Group();
  const v=new t.Group();root.add(v);root.userData.visual=v;
  box(v,0,1.1,0,.55,.75,.35,'#b3d4d7');
  box(v,0,1.7,0,.4,.35,.35,'#d8e9e7');
  box(v,0,1.73,.18,.3,.09,.02,'#173541');
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=new t.Group();leg.position.set(side*.18,.72,0);v.add(leg);
    box(leg,0,-.3,0,.19,.6,.2,'#b1c6cc');box(leg,0,-.63,.09,.24,.12,.4,'#405563');
    legs.push(leg);
    const ar=new t.Group();ar.position.set(side*.4,1.4,0);v.add(ar);
    box(ar,0,-.35,0,.18,.7,.18,'#c5dcdb');ar.rotation.z=side*.15;
    arms.push(ar);
  }
  return {root,visual:v,legs,arms};
}

// AMR 비주얼 (순환·센서 로직은 world.js가 담당)
export function amrVisual(H,cargoColor,opts={}){
  const t=H.T;
  const root=new t.Group();
  const v=new t.Group();root.add(v);root.userData.visual=v;
  box(v,0,.3,0,1.5,.5,1.1,'#a8c765');
  box(v,0,.62,0,1.2,.15,.85,'#30464a');
  box(v,0,1.0,0,.9,.65,.65,cargoColor);   // 적재 박스
  cyl(v,.5,.82,0,.09,.2,'#20343a');       // 라이다
  for(const wx of [-.7,.7])for(const wz of [-.4,.4]){
    const w=cyl(v,wx,.23,wz,.2,.13,'#20343a');w.rotation.x=Math.PI/2;
  }
  if(opts.forklift){
    // 지게차형: 전방 포크 2개 + 마스트
    box(v,0,.75,.75,.12,1.1,.12,'#3a4a50');
    for(const fx of [-.35,.35])box(v,fx,.12,1.15,.12,.08,1.3,'#c8a24a');
  }
  const bm=new t.MeshStandardMaterial({color:'#5a2a10',emissive:'#ff9a1a',emissiveIntensity:.3,roughness:.4});
  const bc=new t.Mesh(new t.SphereGeometry(.07,10,10),bm);
  bc.position.set(-0.55,0.86,0);root.add(bc);
  const ring=new t.Mesh(
    new t.RingGeometry(0.94,1.0,48),
    new t.MeshBasicMaterial({color:'#7fe08a',transparent:true,opacity:.3,side:t.DoubleSide,depthWrite:false})
  );
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;root.add(ring);
  return {root,visual:v,beaconMat:bm,ring};
}
