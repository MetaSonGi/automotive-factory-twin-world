// 6축 관절 산업용 로봇팔 (절차적 모델 — 디테일 강화판)
// J1 베이스 요(yaw) → J2 숄더 피치 → J3 엘보 피치 → J4 손목 피치 → J5 손목 롤 → J6 스폿 용접건
// 반환: {root, group, joints, update(t, active, seed), HOME}
// - root: 씬에 배치하는 그룹 (userData.visual = group, GLB 교체 호환)
// - update(t, active, seed): 작업 중이면 용접 동작, 아니면 홈 포즈로 복귀
import * as THREE from 'three';

const ORANGE=0xf2a35d, ORANGE_D=0xd97f33, DARK=0x2b3d45, STEEL=0xb9cdd3, WHITE=0xeef3f4,
      COPPER=0xc87f4a, YELLOW=0xe8c93c, BLACK=0x1c2226;

function M(color,rough=0.55,metal=0.35){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function part(parent,geo,material,x,y,z){
 const m=new THREE.Mesh(geo,material);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const CYL=(r,h,s=20)=>new THREE.CylinderGeometry(r,r,h,s);
const TORUS=(r,t,rs=10,ts=24)=>new THREE.TorusGeometry(r,t,rs,ts);

function boltCircle(parent,r,y,n,br,bh,material){
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2;
  part(parent,CYL(br,bh,8),material,Math.cos(a)*r,y,Math.sin(a)*r);
 }
}
function cable(parent,pts,radius){
 const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
 const m=new THREE.Mesh(new THREE.TubeGeometry(curve,16,radius,6),M(BLACK,0.85,0.05));
 m.castShadow=true;parent.add(m);return m;
}

export function createRobotArm(){
 const root=new THREE.Group();
 const group=new THREE.Group();root.add(group);root.userData.visual=group;

 // ===== 페데스탈 + 턴테이블 =====
 part(group,BOX(1.2,0.12,1.2),M(DARK,0.7,0.2),0,0.06,0);            // 베이스 플레이트
 boltCircle(group,0.48,0.14,4,0.045,0.07,M(STEEL,0.4,0.7));         // 앵커 볼트
 part(group,BOX(1.0,0.44,1.0),M(DARK,0.7,0.2),0,0.34,0);            // 페데스탈
 for(let i=0;i<4;i++)                                               // 경고 스트라이프
  part(group,BOX(0.16,0.1,0.02),M(i%2?BLACK:YELLOW,0.6,0.1),-0.24+i*0.16,0.34,0.51);
 part(group,CYL(0.42,0.22),M(ORANGE_D),0,0.67,0);                   // 턴테이블
 const gear=part(group,TORUS(0.42,0.045),M(DARK,0.5,0.5),0,0.58,0);gear.rotation.x=Math.PI/2;
 part(group,BOX(0.34,0.5,0.22),M(WHITE,0.5,0.2),0.62,0.42,0);        // 컨트롤 박스
 part(group,BOX(0.36,0.06,0.24),M(DARK,0.6,0.3),0.62,0.7,0);
 const ledMat=new THREE.MeshStandardMaterial({color:'#39d353',emissive:'#39d353',emissiveIntensity:0.8});
 part(group,new THREE.SphereGeometry(0.035,8,8),ledMat,0.62,0.6,0.12); // 상태 LED

 // ===== J1: 베이스 요 =====
 const j1=new THREE.Group();j1.position.set(0,0.78,0);group.add(j1);
 part(j1,BOX(0.56,0.5,0.56),M(ORANGE),0,0.25,0);
 part(j1,BOX(0.6,0.1,0.6),M(DARK,0.6,0.3),0,0.03,0);
 const j1ring=part(j1,TORUS(0.3,0.035),M(DARK,0.5,0.5),0,0.07,0);j1ring.rotation.x=Math.PI/2;
 boltCircle(j1,0.2,0.09,6,0.025,0.03,M(STEEL,0.4,0.7));

 // ===== J2: 숄더 피치 =====
 const j2=new THREE.Group();j2.position.set(0,0.5,0);j1.add(j2);
 const drum=part(j2,CYL(0.26,0.5),M(DARK),0,0,0);drum.rotation.x=Math.PI/2;
 part(j2,TORUS(0.27,0.03),M(ORANGE_D),0,0,0);                       // 조인트 링
 for(const s of [-1,1])for(let i=0;i<6;i++){                       // 드럼 볼트 서클
  const a=i/6*Math.PI*2;
  part(j2,CYL(0.03,0.035,6),M(STEEL,0.4,0.7),Math.cos(a)*0.17,Math.sin(a)*0.17,s*0.26);
 }
 part(j2,BOX(0.44,1.15,0.4),M(ORANGE),0,0.62,0);                    // 어퍼암
 part(j2,BOX(0.46,0.28,0.42),M(WHITE,0.5,0.2),0,1.06,0);            // 숄더 커버
 part(j2,BOX(0.48,0.1,0.44),M(DARK,0.6,0.3),0,0.12,0);              // 암 루트 칼라
 cable(j2,[[0,0.08,-0.25],[0,0.55,-0.3],[0,1.05,-0.25]],0.035);     // 외부 케이블
 for(const y of [0.4,0.85]){const cl=part(j2,TORUS(0.25,0.018),M(DARK,0.6,0.3),0,y,-0.03);cl.rotation.x=Math.PI/2;}

 // ===== J3: 엘보 피치 =====
 const j3=new THREE.Group();j3.position.set(0,1.2,0);j2.add(j3);
 const drum2=part(j3,CYL(0.2,0.44),M(DARK),0,0,0);drum2.rotation.x=Math.PI/2;
 part(j3,TORUS(0.21,0.025),M(ORANGE_D),0,0,0);
 for(const s of [-1,1])for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2;
  part(j3,CYL(0.025,0.03,6),M(STEEL,0.4,0.7),Math.cos(a)*0.13,Math.sin(a)*0.13,s*0.23);
 }
 part(j3,BOX(0.34,1.0,0.32),M(ORANGE),0,0.5,0);                     // 포어암
 part(j3,BOX(0.36,0.2,0.34),M(ORANGE_D),0,0.92,0);                  // 엘보 커버
 cable(j3,[[0,0.05,-0.21],[0,0.5,-0.25],[0,0.95,-0.2]],0.03);

 // ===== J4: 손목 피치 =====
 const j4=new THREE.Group();j4.position.set(0,1.02,0);j3.add(j4);
 part(j4,BOX(0.26,0.42,0.26),M(STEEL,0.4,0.6),0,0.21,0);
 const j4ring=part(j4,TORUS(0.15,0.025),M(DARK,0.5,0.5),0,0.03,0);j4ring.rotation.x=Math.PI/2;

 // ===== J5: 손목 롤 =====
 const j5=new THREE.Group();j5.position.set(0,0.42,0);j4.add(j5);
 part(j5,CYL(0.13,0.16),M(DARK),0,0.05,0);
 boltCircle(j5,0.09,0.14,4,0.02,0.025,M(STEEL,0.4,0.7));

 // ===== J6: 스폿 용접건 (C-프레임, 차체 방향 +X로 개방) =====
 const j6=new THREE.Group();j6.position.set(0,0.13,0);j5.add(j6);
 part(j6,BOX(0.14,0.34,0.14),M(DARK),0,0.17,0);                     // 건 홀더
 part(j6,BOX(0.08,0.36,0.12),M(ORANGE_D),-0.1,0.17,0);              // C-프레임 등판
 part(j6,BOX(0.3,0.07,0.12),M(ORANGE_D),0.02,0.33,0);               // 상부 조
 part(j6,BOX(0.3,0.07,0.12),M(ORANGE_D),0.02,0.01,0);               // 하부 조
 part(j6,CYL(0.028,0.09,8),M(COPPER,0.35,0.8),0.13,0.27,0);         // 상부 전극팁
 part(j6,CYL(0.028,0.09,8),M(COPPER,0.35,0.8),0.13,0.07,0);         // 하부 전극팁
 const tipMat=new THREE.MeshBasicMaterial({color:0x8a7a4a});
 const tip=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,10),tipMat);
 tip.position.set(0.13,0.17,0);j6.add(tip);                        // 용접점

 const joints={j1,j2,j3,j4,j5,j6};
 const HOME={j1:0,j2:-0.58,j3:0.95,j4:-0.55,j5:0};
 j1.rotation.y=HOME.j1;j2.rotation.z=HOME.j2;j3.rotation.z=HOME.j3;j4.rotation.z=HOME.j4;j5.rotation.y=HOME.j5;

 let spark=0;
 function update(t,active,seed=0){
  const s=seed*1.7;
  if(active){
   // 용접 작업: 차체 쪽으로 뻗으며 6개 관절이 서로 다른 주기로 움직임
   j1.rotation.y=Math.sin(t*0.7+s)*0.65;
   j2.rotation.z=-0.58+Math.sin(t*1.15+s*2.0)*0.35;
   j3.rotation.z=0.95+Math.sin(t*1.6+s*1.3)*0.42;
   j4.rotation.z=-0.55+Math.sin(t*2.2+s*0.7)*0.3;
   j5.rotation.y=Math.sin(t*0.9+s)*1.1;
   j6.rotation.y+=0.02;
   spark=Math.max(0,Math.sin(t*7+s*3)-0.55)/0.45; // 용접 스파크 점멸 0..1
  }else{
   // 홈 포즈로 부드럽게 복귀
   const k=0.06;
   j1.rotation.y+=(HOME.j1-j1.rotation.y)*k;
   j2.rotation.z+=(HOME.j2-j2.rotation.z)*k;
   j3.rotation.z+=(HOME.j3-j3.rotation.z)*k;
   j4.rotation.z+=(HOME.j4-j4.rotation.z)*k;
   j5.rotation.y+=(HOME.j5-j5.rotation.y)*k;
   spark=Math.max(0,spark-0.2);
  }
  tipMat.color.setHex(spark>0?0xfff6c8:0x8a7a4a);
  tip.scale.setScalar(1+spark*1.6);
  ledMat.emissiveIntensity=active?(Math.sin(t*5+s)>0?2.4:0.4):0.8;
 }
 return {root,group,joints,update,HOME};
}
