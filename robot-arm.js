// 6축 관절 산업용 로봇팔 (절차적 모델)
// J1 베이스 요(yaw) → J2 숄더 피치 → J3 엘보 피치 → J4 손목 피치 → J5 손목 롤 → J6 용접 툴
// 반환: {root, group, joints, update(t, active, seed), HOME}
// - root: 씬에 배치하는 그룹 (userData.visual = group, GLB 교체 호환)
// - update(t, active, seed): 작업 중이면 용접 동작, 아니면 홈 포즈로 복귀
import * as THREE from 'three';

const ORANGE=0xf2a35d, ORANGE_D=0xd97f33, DARK=0x2b3d45, STEEL=0xb9cdd3, WHITE=0xeef3f4;

function M(color,rough=0.55,metal=0.35){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function part(parent,geo,material,x,y,z){
 const m=new THREE.Mesh(geo,material);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const CYL=(r,h,s=20)=>new THREE.CylinderGeometry(r,r,h,s);

export function createRobotArm(){
 const root=new THREE.Group();
 const group=new THREE.Group();root.add(group);root.userData.visual=group;

 // 페데스탈 + 턴테이블
 part(group,BOX(1.1,0.5,1.1),M(DARK,0.7,0.2),0,0.25,0);
 part(group,CYL(0.42,0.22),M(ORANGE_D),0,0.6,0);
 part(group,BOX(0.9,0.1,0.9),M(WHITE,0.5,0.2),0,0.06,0);

 // J1: 베이스 요
 const j1=new THREE.Group();j1.position.set(0,0.71,0);group.add(j1);
 part(j1,BOX(0.56,0.5,0.56),M(ORANGE),0,0.25,0);
 part(j1,BOX(0.6,0.1,0.6),M(DARK,0.6,0.3),0,0.03,0);

 // J2: 숄더 피치
 const j2=new THREE.Group();j2.position.set(0,0.5,0);j1.add(j2);
 const drum=part(j2,CYL(0.26,0.5),M(DARK),0,0,0);drum.rotation.x=Math.PI/2;
 part(j2,BOX(0.44,1.15,0.4),M(ORANGE),0,0.62,0);
 part(j2,BOX(0.46,0.28,0.42),M(WHITE,0.5,0.2),0,1.06,0);

 // J3: 엘보 피치
 const j3=new THREE.Group();j3.position.set(0,1.2,0);j2.add(j3);
 const drum2=part(j3,CYL(0.2,0.44),M(DARK),0,0,0);drum2.rotation.x=Math.PI/2;
 part(j3,BOX(0.34,1.0,0.32),M(ORANGE),0,0.5,0);
 part(j3,BOX(0.36,0.2,0.34),M(ORANGE_D),0,0.92,0);

 // J4: 손목 피치
 const j4=new THREE.Group();j4.position.set(0,1.02,0);j3.add(j4);
 part(j4,BOX(0.26,0.42,0.26),M(STEEL,0.4,0.6),0,0.21,0);

 // J5: 손목 롤
 const j5=new THREE.Group();j5.position.set(0,0.42,0);j4.add(j5);
 part(j5,CYL(0.13,0.16),M(DARK),0,0.05,0);

 // J6: 스폿 용접 툴
 const j6=new THREE.Group();j6.position.set(0,0.13,0);j5.add(j6);
 part(j6,BOX(0.1,0.22,0.3),M(DARK),0,0.11,0);
 part(j6,BOX(0.06,0.16,0.06),M(STEEL,0.35,0.7),0,0.26,0.1);
 part(j6,BOX(0.06,0.16,0.06),M(STEEL,0.35,0.7),0,0.26,-0.1);
 const tipMat=new THREE.MeshBasicMaterial({color:0x8a7a4a});
 const tip=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10),tipMat);
 tip.position.set(0,0.34,0);j6.add(tip);

 const joints={j1,j2,j3,j4,j5,j6};
 const HOME={j1:0,j2:-0.5,j3:0.9,j4:-0.55,j5:0};
 j1.rotation.y=HOME.j1;j2.rotation.z=HOME.j2;j3.rotation.z=HOME.j3;j4.rotation.z=HOME.j4;j5.rotation.y=HOME.j5;

 let spark=0;
 function update(t,active,seed=0){
  const s=seed*1.7;
  if(active){
   // 용접 작업: 6개 관절이 서로 다른 주기로 움직임
   j1.rotation.y=Math.sin(t*0.7+s)*0.65;
   j2.rotation.z=-0.5+Math.sin(t*1.15+s*2.0)*0.32;
   j3.rotation.z=0.9+Math.sin(t*1.6+s*1.3)*0.38;
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
 }
 return {root,group,joints,update,HOME};
}
