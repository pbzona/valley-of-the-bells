import * as T from 'three';
import {C,height,pos,neighbors,key,roadSurface,roadTop,type Pos,type State,type PilgrimStop,type streetPlan,type stats} from './sim';

type Point={x:number,y:number,z:number};
type Step={a:Point,b:Point,duration:number,end:number,stop?:PilgrimStop['kind']|'local',edge?:[Pos,Pos]};
type Walker={steps:Step[],duration:number,offset:number,group:number,seat:number,pilgrim:boolean};
const size=68;
const fabrics=[0x866448,0x698078,0xa89575,0x796982,0x57594c,0x9a634a];
const travel=(x:Point,y:Point,speed=1.53)=>Math.max(.17,Math.hypot(x.x-y.x,x.z-y.z,(x.y-y.y)*1.4)/speed);
export class StreetPeople{
 private walkers:Walker[]=[];
 private state:State|undefined;
 private readonly body=this.mesh(new T.CylinderGeometry(.148,.216,.365,6),0xffffff);
 private readonly head=this.mesh(new T.IcosahedronGeometry(.112,1),0xcb986e);
 private readonly hat=this.mesh(new T.ConeGeometry(.234,.111,9),0xc9ae78);
 private readonly feet=this.mesh(new T.BoxGeometry(.094,.158,.12),0x665545,size*2);
 private readonly poles=this.mesh(new T.CylinderGeometry(.014,.019,.70,5),0x8b6945);
 private readonly packs=this.mesh(new T.BoxGeometry(.211,.219,.109),0x947c5a);
 private readonly m=new T.Matrix4();
 private readonly color=new T.Color();
 private readonly meshes=[this.body,this.head,this.hat,this.feet,this.poles,this.packs];
 debug={parties:0,visitors:0,stopKinds:[] as string[],activeStops:[] as string[]};
 constructor(target:T.Group){for(const m of this.meshes)target.add(m);}
 private mesh(g:T.BufferGeometry,color:number,n=size){const obj=new T.InstancedMesh(g,new T.MeshLambertMaterial({color}),n);obj.instanceMatrix.setUsage(T.DynamicDrawUsage);obj.count=0;obj.frustumCulled=false;return obj;}
 private point(s:State,k:string):Point{const p=pos(k);return {x:p.x*C,z:p.z*C,y:roadTop(s,p)};}
 private route(out:Step[],a:Point,b:Point,duration:number,stop?:Step['stop'],walk=false){const end=(out.at(-1)?.end??0)+duration,edge:Step['edge']=walk?[{x:a.x/C,z:a.z/C},{x:b.x/C,z:b.z/C}]:undefined;out.push({a,b,duration,end,stop,edge});}
 plan(s:State,q:ReturnType<typeof stats>,street:ReturnType<typeof streetPlan>){
  const out:Walker[]=[];this.state=s;
  let parties=0,allocated=0;const visitors=Math.min(47,Math.max(0,Math.ceil(q.pilgrims*.93)));
  for(let index=0;index<q.journeys.length;index++){
   const journey=q.journeys[index];if(journey.visits===0||journey.tiles.length<2)continue;
   const target=Math.min(visitors,allocated+Math.max(1,Math.round(journey.visits/q.pilgrims*visitors)));
   const route=journey.tiles.map(k=>this.point(s,k)),n=target-allocated;
   const groups=Math.ceil(n/2);
   for(let g=0;g<groups;g++){
    const steps:Step[]=[],pref=street.stops[index];
    // Alternate shoppers and lodgers; on a very short approach a group can do both.
    const shops=pref.filter(v=>v.kind==='shop'),inns=pref.filter(v=>v.kind==='inn');
    const picked=[...(shops.length&&(groups===1||g%3!==1)?[shops[g%shops.length]]:[]),...(inns.length&&(groups<=2||g%3!==0)?[inns[g%inns.length]]:[]),...pref.filter(v=>v.kind==='temple')];
    for(let tile=0;tile<route.length;tile++){
     const p=route[tile];if(tile>0)this.route(steps,route[tile-1],p,travel(route[tile-1],p),undefined,true);
     for(const stop of picked)if(stop.index===tile){
      const pull=stop.kind==='temple'?1.04:.98;
      const x=p.x+stop.sideX*pull,z=p.z+stop.sideZ*pull,a={x,z,y:height(s,x/C,z/C)+.06};
      this.route(steps,p,a,.69);this.route(steps,a,a,stop.kind==='temple'?7.6:stop.kind==='inn'?6.9:4.5,stop.kind);this.route(steps,a,p,.72);
     }
    }
    for(let tile=route.length-1;tile>0;tile--)this.route(steps,route[tile],route[tile-1],travel(route[tile],route[tile-1],1.79),undefined,true);
    const duration=steps.at(-1)!.end,offset=((g+.23)/groups)*duration,group=parties++;
    for(let seat=0;seat<2&&allocated<target;seat++,allocated++)out.push({steps,duration,offset:offset-seat*.355,group,seat,pilgrim:true});
   }
  }
  const trade=street.shops.filter(b=>b.base),net=[...q.net];
  const locals=Math.min(size-out.length,Math.floor(s.pop*.44));
  for(let i=0;i<locals&&net.length;i++){
   const vendor=i<trade.length*2?trade[Math.floor(i/2)]:undefined;
   const k=vendor?.road??net[(i*13)%net.length],a=this.point(s,k),p=pos(k);
   const adjacent=neighbors(p).filter(v=>q.net.has(key(v.x,v.z)));
   const adj=adjacent[(i*7)%adjacent.length]??p,b=this.point(s,key(adj.x,adj.z)),steps:Step[]=[];
   this.route(steps,b,a,travel(b,a,1.17),undefined,true);
   if(vendor){const x=a.x+vendor.sideX*1.09,z=a.z+vendor.sideZ*1.09,c={x,z,y:height(s,x/C,z/C)};
    this.route(steps,a,c,.75);this.route(steps,c,c,2.7+i%2*.9,'local');this.route(steps,c,a,.82);}
   this.route(steps,a,b,travel(a,b,1.33),undefined,true);
   out.push({steps,duration:steps.at(-1)!.end,offset:i*1.371,group:i+3,seat:i%2,pilgrim:false});
  }
  this.walkers=out;
  this.debug={parties,visitors:allocated,stopKinds:[...new Set(out.flatMap(v=>v.steps.flatMap(w=>w.stop?[w.stop]:[])))],activeStops:[]};
  for(let i=0;i<out.length;i++)this.body.setColorAt(i,this.color.setHex(fabrics[out[i].group%fabrics.length]));
  if(this.body.instanceColor)this.body.instanceColor.needsUpdate=true;
 }
 update(t:number){
  let h=0,p=0;const activeStops:string[]=[];
  for(let i=0;i<this.walkers.length;i++){
   const w=this.walkers[i],time=((t+w.offset)%w.duration+w.duration)%w.duration;
   const step=w.steps.find(k=>k.end>=time)??w.steps.at(-1)!;
   const f=Math.max(0,Math.min(1,1-(step.end-time)/step.duration)),dx=step.b.x-step.a.x,dz=step.b.z-step.a.z;
   if(step.stop)activeStops.push(step.stop);
   const yaw=Math.abs(dx)+Math.abs(dz)>.01?Math.atan2(dx,dz):(w.group*1.7+w.seat*.43),sin=Math.sin(yaw),cos=Math.cos(yaw);
   const side=(w.pilgrim?(w.seat===0?.21:-.22):.34*(w.seat===0?1:-1));
   const x=step.a.x+dx*f+cos*side,z=step.a.z+dz*f-sin*side,ground=step.edge?roadSurface(this.state!,step.edge[0],step.edge[1],f):step.a.y+(step.b.y-step.a.y)*f;
   const stride=step.stop?0:Math.sin(t*9+i*1.4)*.102,bob=Math.abs(stride)*.19,y=ground+bob;
   this.m.makeRotationY(yaw);this.m.setPosition(x,y+.332,z);this.body.setMatrixAt(i,this.m);
   this.m.makeTranslation(x,y+.586,z);this.head.setMatrixAt(i,this.m);
   for(let j=0;j<2;j++){
    const s=j===0?1:-1,F=stride*s;
    this.m.makeRotationY(yaw);this.m.setPosition(x+cos*s*.071+sin*F,y+.11+Math.max(0,F)*.31,z-sin*s*.071+cos*F);this.feet.setMatrixAt(i*2+j,this.m);
   }
   if(w.pilgrim){
    this.m.makeTranslation(x,y+.714,z);this.hat.setMatrixAt(h++,this.m);
    this.m.makeRotationY(yaw);this.m.setPosition(x-sin*.143,y+.384,z-cos*.143);this.packs.setMatrixAt(p,this.m);
    this.m.makeRotationZ(-.09);this.m.setPosition(x+cos*.246+sin*(stride+.09),y+.37,z-sin*.246+cos*(stride+.09));this.poles.setMatrixAt(p++,this.m);
   }
  }
  this.debug.activeStops=activeStops;
  this.body.count=this.head.count=this.walkers.length;this.feet.count=this.walkers.length*2;this.hat.count=h;this.poles.count=this.packs.count=p;
  for(const m of this.meshes)m.instanceMatrix.needsUpdate=true;
 }
}
