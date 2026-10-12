export const STAGES=['입고','차체 용접','도장','최종 조립','품질 검사','출하'];
export class FactorySimulation{
 constructor({cycle=8,arrival=5,target=40}={}){if(![cycle,arrival].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(target)||target<1||target>500)throw Error('invalid settings');this.cycle=cycle;this.arrival=arrival;this.target=target;this.time=0;this.created=0;this.shipped=0;this.nextArrival=0;this.cars=[];this.stopped=-1;this.events=[];this.telemetry=[];this.lastSample=-1;}
 step(dt){if(!Number.isFinite(dt)||dt<=0||dt>1)throw Error('invalid timestep');this.time+=dt;
 if(this.created<this.target&&this.time>=this.nextArrival){let first=this.cars.filter(c=>c.stage===0).length;if(first<3){this.cars.push({id:++this.created,stage:0,progress:0});this.events.push({time:this.time,type:'arrival',id:this.created});this.nextArrival=this.time+this.arrival;}}
 for(let stage=5;stage>=0;stage--){let cars=this.cars.filter(c=>c.stage===stage).sort((a,b)=>a.id-b.id);if(!cars.length||stage===this.stopped)continue;let c=cars[0];c.progress=Math.min(1,c.progress+dt/(stage===0?this.cycle*.5:this.cycle));if(c.progress>=1){if(stage===5){this.cars=this.cars.filter(x=>x!==c);this.shipped++;this.events.push({time:this.time,type:'shipped',id:c.id});}else if(this.cars.filter(x=>x.stage===stage+1).length<3){c.stage++;c.progress=0;}}}
 if(Math.floor(this.time)!==this.lastSample){this.lastSample=Math.floor(this.time);this.telemetry.push({time_s:this.lastSample,wip:this.cars.length,shipped:this.shipped,temperature_c:35+8*Math.sin(this.time*.1),robot_current_a:this.stopped===1?0:4+Math.abs(Math.sin(this.time))*2,synthetic:true});if(this.telemetry.length>10000)this.telemetry.shift();}
 if(this.events.length>300)this.events.splice(0,this.events.length-300);
 }
 get queues(){return STAGES.map((_,i)=>this.cars.filter(c=>c.stage===i).length)}
}
