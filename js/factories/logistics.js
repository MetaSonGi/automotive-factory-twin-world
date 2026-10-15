// js/factories/logistics.js — 물류창고 (웜그레이)
// node-safe: THREE/DOM은 H 경유로만 사용 (top-level import 금지)
import {box,cyl,group,makeLabelSprite} from './common.js';

const BOX_COLORS=['#b18c58','#7fa8c9','#c97f8a','#9a8ac9','#8ac9a8','#d4a24a'];

export default {
  id:'logistics',
  name:'물류',
  enName:'LOGISTICS',
  title:'물류센터 운영,<br>하나의 월드에서.',
  unit:'박스',
  itemPrefix:'BOX',
  robotLabel:'피킹 로봇',
  stages:[
    {key:'receive', label:'입고', cycle:4},
    {key:'inspect', label:'검수', cycle:4},
    {key:'store',   label:'보관', cycle:6},
    {key:'pick',    label:'피킹', cycle:8},
    {key:'pack',    label:'포장', cycle:6},
    {key:'ship',    label:'출하', cycle:4},
  ],
  theme:{
    bg:'#d8d4cc',floor:'#9a938a',gridA:'#7d766d',gridB:'#948d83',
    padA:'#5f6b66',padB:'#68736d',accent:'#e8a13c',
  },
  stationXs:[-25,-15,-5,5,15,25],
  robots:{stages:[3,4],defaultCount:4,scale:.9},  // 피킹·포장
  amr:{count:4,rect:{x0:-29,x1:29,z0:-8,z1:10},forklift:true},
  humans:[
    {x:-10,z:6,route:[[-14,5],[-6,5],[-6,9],[-14,9]]},
    {x:14,z:-6,route:[[10,-5],[18,-5],[18,-9],[10,-9]]},
  ],
  itemY:.95,
  itemThreshold:2,   // stage<=2: 파렛트 박스, 이후: 포장 박스(라벨)
  glb:{amr:'./amr.glb',humanoid:'./humanoid.glb'},
  followBtn:'박스 추적',
  desc:'입고 → 검수 → 보관 → 피킹 → 포장 → 출하',
  blurb:'고층 랙 행렬·소터 분기 컨베이어·도크 도어·포장대로 구성된 물류센터. 지게차형 AMR이 박스를 나르며, 로봇 이동은 시각적 데모입니다.',

  buildStatic(H,g){
    const t=H.T;
    // 고층 랙 행렬 (라인 양옆, z=±12)
    for(const rz of [-12,12]){
      for(const rx of [-20,-10,0,10,20]){
        for(let lvl=0;lvl<4;lvl++){
          const y=.4+lvl*1.15;
          box(g,rx,y,rz,4.4,.12,1.8,'#6b7a72');
          for(let n=0;n<3;n++){
            if((n+lvl+rx)%3!==0){
              const ci=(((n+lvl*2+rx)%BOX_COLORS.length)+BOX_COLORS.length)%BOX_COLORS.length;
              box(g,rx-1.4+n*1.4,y+.45,rz,1.15,.8,1.4,BOX_COLORS[ci]);
            }
          }
        }
        for(const dx of [-2.2,2.2])box(g,rx+dx,2.3,rz,.18,4.6,.18,'#c98f2d');
      }
    }
    const rk=makeLabelSprite('고층 랙 / 보관',0.85);
    rk.position.set(0,6.2,-12);g.add(rk);
    // 소터 분기 컨베이어 (피킹 x=5 → z=8 방향)
    box(g,5,.55,6,1.2,.4,6,'#3d4a50');
    for(let n=0;n<8;n++){const r=cyl(g,5,.84,3.6+n*.65,.13,1.1,'#a2b0b3');r.rotation.x=Math.PI/2;}
    box(g,5,1.1,9.4,1.6,.9,1.2,'#b18c58');  // 분기된 박스
    box(g,3.2,1.3,6,.18,1.4,.18,'#e8a13c'); // 디버터 암
    const st=makeLabelSprite('소터 / 분기',0.75);
    st.position.set(5,3.4,8);g.add(st);
    // 도크 도어 + 트럭 (후면 벽 z=-16)
    box(g,0,3,-16.5,64,6,.6,'#8d867c');
    for(let i=0;i<4;i++){
      const dx=-22.5+i*15;
      box(g,dx,2.2,-16.1,5,4.4,.2,'#5d574f');       // 도어 프레임
      box(g,dx,2.2,-16.0,4.2,3.6,.12,'#a89f92');   // 셔터
      if(i<2){
        box(g,dx,1.1,-13.4,2.2,2.2,2.4,'#7fa8c9');  // 트럭 캡
        box(g,dx,1.5,-10.2,2.6,3,4.2,'#dfe3e6');   // 트레일러
      }
    }
    const dk=makeLabelSprite('출하 도크',0.85);
    dk.position.set(0,7.6,-14);g.add(dk);
    // 포장대 (x=15 = 포장 스테이션 옆)
    for(const dz of [-4.5,4.5]){
      box(g,15,.85,dz,3,.14,1.6,'#8d867c');
      for(const dx of [-1.3,1.3])for(const ddz of [-.7,.7])box(g,15+dx,.4,dz+ddz,.12,.8,.12,'#5d574f');
      box(g,14.4,1.25,dz,1,.6,.9,'#b18c58');
      box(g,15.6,1.2,dz,.7,.5,.7,'#c97f8a');
    }
    const pk=makeLabelSprite('포장대',0.75);
    pk.position.set(15,3.2,5.5);g.add(pk);
    // AMR(지게차) 순환로 표시
    for(const z of [-8,10])box(g,0,.045,z,60,.02,.15,'#e8c93c');
    for(const x of [-29,29])box(g,x,.045,1,.15,.02,18,'#e8c93c');
    const amrL=makeLabelSprite('지게차 AMR 순환로',0.85);
    amrL.position.set(-2,4.6,11.8);g.add(amrL);
    return {animated:[]};
  },

  makeItem(H){
    const t=H.T;
    const root=new t.Group();
    const c=new t.Group();root.add(c);root.userData.visual=c;
    // 공용: 파렛트
    const pal=new t.Mesh(new t.BoxGeometry(1.6,.16,1.3),
      new t.MeshStandardMaterial({color:'#a8845c',roughness:.8,metalness:.05}));
    pal.position.y=.3;pal.castShadow=true;c.add(pal);
    // early: 미개봉 박스 / late: 포장 박스(흰 라벨)
    const early=new t.Group();
    const b1=new t.Mesh(new t.BoxGeometry(1.2,.8,1),
      new t.MeshStandardMaterial({color:'#b18c58',roughness:.85,metalness:0}));
    b1.position.y=.78;b1.castShadow=true;early.add(b1);
    const late=new t.Group();
    const b2=b1.clone();late.add(b2);
    const label=new t.Mesh(new t.BoxGeometry(.5,.3,.02),
      new t.MeshStandardMaterial({color:'#f2f4f4',roughness:.6}));
    label.position.set(0,.8,.51);late.add(label);
    const tape=new t.Mesh(new t.BoxGeometry(1.22,.06,1.02),
      new t.MeshStandardMaterial({color:'#e8a13c',roughness:.6}));
    tape.position.y=1.16;late.add(tape);
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
