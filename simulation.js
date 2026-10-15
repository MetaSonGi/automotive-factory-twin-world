// 자동차 스마트팩토리 공정 시뮬레이션 (헤드리스 로직)
// - 스테이지별 처리 서버 1개, 버퍼 3대, 결정적 순서
// - 구역별 공정시간(cycles), 랜덤 고장 엔진, KPI(처리량/사이클타임/가동률/정지횟수) 지원
// - stages 주입 가능: [{key,label,cycle}, ...] (기본 6 스테이지 = 자동차 공장)
// - 기본 설정에서는 기존 동작과 완전히 동일 (결정적 테스트 보장)
export const STAGES=['입고','차체 용접','도장','최종 조립','품질 검사','출하'];
export class FactorySimulation{
 constructor({cycle=8,arrival=5,target=40,cycles={},faultMode='manual',faultRate=2,repairTime=45,stages=null}={}){
  if(![cycle,arrival].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(target)||target<1||target>500)throw Error('invalid settings');
  for(let [k,v] of Object.entries(cycles))if(!Number.isFinite(v)||v<=0)throw Error('invalid stage cycle');
  if(!['manual','random'].includes(faultMode))throw Error('invalid fault mode');
  if(!(faultRate>0)||!(repairTime>0))throw Error('invalid fault settings');
  if(stages!==null){
   if(!Array.isArray(stages)||stages.length<2)throw Error('invalid stages');
   this.stageLabels=stages.map(s=>{
    const label=typeof s==='string'?s:(s&&s.label);
    if(!label||typeof label!=='string')throw Error('invalid stages');
    return label;
   });
  }else{
   this.stageLabels=[...STAGES];
  }
  this.cycle=cycle;this.arrival=arrival;this.target=target;
  this.cycles={...cycles};this.faultMode=faultMode;this.faultRate=faultRate;this.repairTime=repairTime;
  this.time=0;this.created=0;this.shipped=0;this.nextArrival=0;this.cars=[];
  this.stopped=-1;this.events=[];this.telemetry=[];this.lastSample=-1;
  this.faultCount=0;this.downtime=0;this.flowTimes=[];
  this.faultTimer=0;this.repairTimer=0;this.nextFaultAt=this._drawFaultInterval();
 }
 get stageCount(){return this.stageLabels.length;}
 _cycleFor(stage){return stage===0?this.cycle*.5:(this.cycles[stage]??this.cycle);}
 _drawFaultInterval(){const mean=3600/Math.max(this.faultRate,1e-3);return -Math.log(1-Math.random())*mean;}
 _triggerFault(){
  const stage=1+Math.floor(Math.random()*(this.stageCount-2));
  this.stopped=stage;this.faultCount++;
  this.repairTimer=this.repairTime*(0.7+0.6*Math.random());
  this.faultTimer=0;this.nextFaultAt=this._drawFaultInterval();
  this.events.push({time:this.time,type:'fault',stage});
 }
 _recover(){const s=this.stopped;this.stopped=-1;this.events.push({time:this.time,type:'recovered',stage:s});}
 manualStop(stage){
  if(!Number.isInteger(stage)||stage<-1||stage>=this.stageCount)throw Error('invalid stop stage');
  if(this.stopped===-1&&stage>=0){this.faultCount++;this.events.push({time:this.time,type:'stop',stage});}
  this.stopped=stage;
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<=0||dt>1)throw Error('invalid timestep');this.time+=dt;
  if(this.faultMode==='random'){
   if(this.stopped===-1){this.faultTimer+=dt;if(this.faultTimer>=this.nextFaultAt)this._triggerFault();}
   else{this.repairTimer-=dt;if(this.repairTimer<=0)this._recover();}
  }
  if(this.stopped>=0)this.downtime+=dt;
  if(this.created<this.target&&this.time>=this.nextArrival){let first=this.cars.filter(c=>c.stage===0).length;if(first<3){this.cars.push({id:++this.created,stage:0,progress:0,t0:this.time});this.events.push({time:this.time,type:'arrival',id:this.created});this.nextArrival=this.time+this.arrival;}}
  const last=this.stageCount-1;
  for(let stage=last;stage>=0;stage--){let cars=this.cars.filter(c=>c.stage===stage).sort((a,b)=>a.id-b.id);if(!cars.length||stage===this.stopped)continue;let c=cars[0];c.progress=Math.min(1,c.progress+dt/this._cycleFor(stage));if(c.progress>=1){if(stage===last){this.cars=this.cars.filter(x=>x!==c);this.shipped++;this.flowTimes.push(this.time-c.t0);if(this.flowTimes.length>500)this.flowTimes.shift();this.events.push({time:this.time,type:'shipped',id:c.id});}else if(this.cars.filter(x=>x.stage===stage+1).length<3){c.stage++;c.progress=0;}}}
  if(Math.floor(this.time)!==this.lastSample){this.lastSample=Math.floor(this.time);this.telemetry.push({time_s:this.lastSample,wip:this.cars.length,shipped:this.shipped,temperature_c:35+8*Math.sin(this.time*.1),robot_current_a:this.stopped===1?0:4+Math.abs(Math.sin(this.time))*2,synthetic:true});if(this.telemetry.length>10000)this.telemetry.shift();}
  if(this.events.length>300)this.events.splice(0,this.events.length-300);
 }
 get queues(){return this.stageLabels.map((_,i)=>this.cars.filter(c=>c.stage===i).length)}
 get throughputPerHour(){return this.time>1?this.shipped/(this.time/3600):0;}
 get avgFlowTime(){return this.flowTimes.length?this.flowTimes.reduce((a,b)=>a+b,0)/this.flowTimes.length:0;}
 get availability(){return this.time>0?Math.max(0,1-this.downtime/this.time):1;}
}
