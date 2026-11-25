export const N=49, C=3, LO=-24, HI=24, WATER=.07;
export type Pos={x:number,z:number};
export const specs={road:{name:'Road',icon:'╋',cost:2,w:1,d:1,hint:'Drag a route. Roads turn into steps on slopes.'},bridge:{name:'Bridge',icon:'⌒',cost:5,w:1,d:1,hint:'Drag straight from bank to bank. Connect it to a road.'},home:{name:'House',icon:'⌂',cost:16,w:2,d:2,hint:'Room for 8 residents. Put a road next to the house.'},farm:{name:'Rice',icon:'≋',cost:22,w:3,d:2,hint:'Rice paddies need flat lowlands, road access and 4 workers.'},work:{name:'Workshop',icon:'⚒',cost:28,w:2,d:2,hint:'Produces timber with 4 workers. Keep it beside a road.'},market:{name:'Market',icon:'⛺',cost:32,w:3,d:2,hint:'Trades surplus rice and timber with 4 workers.'},inn:{name:'Inn',icon:'灯',cost:38,w:2,d:2,hint:'Lodges pilgrims along the route to a temple.'},temple:{name:'Temple',icon:'塔',cost:78,w:3,d:3,hint:'Build above the valley. Keep a connected inn and 16 residents.'},terrace:{name:'Terrace',icon:'▤',cost:24,w:3,d:3,hint:'Levels nine empty tiles for a hilltop temple or district.'},erase:{name:'Erase',icon:'×',cost:0,w:1,d:1,hint:'Remove a road, bridge, building or prop; no refund.'},
 rowhouse:{name:'Rowhouse',cost:9,w:1,d:2,hint:'Narrow home for 4 residents. Needs road access.'},
 stall:{name:'Stall',cost:12,w:1,d:1,hint:'Sells surplus rice and timber. Needs a road and 2 workers.'},
 lantern:{name:'Lantern',cost:3,w:1,d:1,hint:'Stone lantern. Glows at dusk; no road needed.'},
 garden:{name:'Garden',cost:5,w:1,d:1,hint:'Pocket maple garden. No road needed.'},
 plot:{name:'Grow plot',cost:2,w:1,d:1,hint:'Drag along a street. Households or traders build here when there is demand.'}} as const;
export type Tool=keyof typeof specs;
export type Kind=Exclude<Tool,'road'|'bridge'|'terrace'|'erase'|'plot'>;
export const isProp=(kind:Kind)=>kind==='lantern'||kind==='garden';
export function isKind(kind:unknown):kind is Kind{return typeof kind==='string'&&Object.hasOwn(specs,kind)&&!['road','bridge','terrace','erase','plot'].includes(kind);}
export type Bld={kind:Kind,x:number,z:number,rot:number,id:number,grown?:boolean,style?:number};
export type Route={kind:'road'|'bridge',y?:number,span?:number,axis?:'x'|'z'};
export type State={seed:number,roads:Record<string,Route>,terraces:Record<string,number>,plots?:Record<string,boolean>,trial?:true,buildings:Bld[],id:number,day:number,coin:number,rice:number,wood:number,pop:number};
export const key=(x:number,z:number)=>`${x},${z}`;
export const pos=(k:string):Pos=>{const [x,z]=k.split(',').map(Number);return {x,z}};
export const inside=(x:number,z:number)=>x>=LO&&x<=HI&&z>=LO&&z<=HI;
export const neighbors=({x,z}:Pos)=>[{x:x+1,z},{x:x-1,z},{x,z:z+1},{x,z:z-1}];
export function rand(x:number,z:number,s=1){const i=Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(s,1446647); const t=Math.imul(i^(i>>>13),1274126177);return ((t^(t>>>16))>>>0)/4294967296;}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function smooth(t:number){return t*t*(3-2*t)}
export function noise(x:number,z:number,s:number){const X=Math.floor(x),Z=Math.floor(z),u=smooth(x-X),v=smooth(z-Z);return lerp(lerp(rand(X,Z,s),rand(X+1,Z,s),u),lerp(rand(X,Z+1,s),rand(X+1,Z+1,s),u),v);}
export function river(z:number,seed:number){return 7.5+3.8*Math.sin(z*.149+.88+(seed%19)*.035)+1.5*Math.sin(z*.29-.3)}
export function natural(x:number,z:number,seed:number){const d=Math.abs(x-river(z,seed));const bank=1.4+noise(x*.22,z*.23,seed)*1.2;const ridge=(xx:number,zz:number,sx:number,sz:number,h:number)=>h*Math.exp(-(((x-xx)/sx)**2+((z-zz)/sz)**2));const offset=(seed%9)-4;
 const hills=ridge(-20,-13+offset,8.2,12,27)+ridge(-8,-23,8,10,17)+ridge(-23,10,8,12,16)+ridge(21,-10,9,14,20)+ridge(24,18,8,9,8)+ridge(-6,-7,7,8,6);
 const variation=noise(x*.18,z*.18,seed+38)*1.25+noise(x*.5,z*.5,seed+51)*.37;
 if(d<bank)return -.52-.93*(1-d/bank);
 const shore=Math.min(1,(d-bank)/3.3);return lerp(-.52,.66+variation+hills,shore);
}
export function height(s:State,x:number,z:number){const y=natural(x,z,s.seed),a=Math.round(x),b=Math.round(z),t=s.terraces[key(a,b)];return t===undefined?y:t;}
export function dims(kind:Tool,rot=0){const {w,d}=specs[kind];return rot%2?{w:d,d:w}:{w,d};}
export function cells(kind:Tool,x:number,z:number,rot=0):Pos[]{const {w,d}=dims(kind,rot);return Array.from({length:w*d},(_,i)=>({x:x+i%w,z:z+Math.floor(i/w)}));}
export function corners(s:State,p:Pos[]){return p.flatMap(({x,z})=>[height(s,x,z),height(s,x-.44,z-.44),height(s,x+.44,z-.44),height(s,x+.44,z+.44),height(s,x-.44,z+.44)]);}
export const occupied=(s:State)=>new Map(s.buildings.flatMap(b=>cells(b.kind,b.x,b.z,b.rot).map(p=>[key(p.x,p.z),b] as const)));
export function access(s:State){const seen=new Set<string>(), q=[{x:-5,z:24}]; for(let i=0;i<q.length;i++){const p=q[i], k=key(p.x,p.z);if(seen.has(k)||!s.roads[k])continue;seen.add(k);for(const n of neighbors(p)){const t=key(n.x,n.z),r=s.roads[t];if(!r)continue;const a=s.roads[k];const dy=Math.abs((r.y??height(s,n.x,n.z))-(a.y??height(s,p.x,p.z)));if(dy<2.45)q.push(n);}}
 return seen;}
const GATE=key(-5,24);
export function frontage(s:State,lot:Pos[],net:Set<string>){
 const result=new Map<string,number>();
 for(const p of lot)for(const n of neighbors(p)){const k=key(n.x,n.z);if(!net.has(k))continue;
  if(Math.abs(height(s,p.x,p.z)-roadY(s,k))>=2.6)continue;
  result.set(k,n.z>p.z?0:n.x>p.x?1:n.z<p.z?2:3);
 }
 return result;
}
export function connected(s:State,b:Bld, net=access(s)){return frontage(s,cells(b.kind,b.x,b.z,b.rot),net).size>0;}
function roadY(s:State,k:string){const p=pos(k);return s.roads[k].y??height(s,p.x,p.z);}
function travel(s:State,net:Set<string>){
 const cost=new Map<string,number>([[GATE,0]]),prev=new Map<string,string>(),open:Array<[string,number]>=[[GATE,0]];
 const push=(v:[string,number])=>{let i=open.length;open.push(v);while(i>0){const p=(i-1)>>1;if(open[p][1]<=v[1])break;open[i]=open[p];i=p;}open[i]=v;};
 const pop=()=>{const first=open[0],last=open.pop()!;if(open.length){let i=0;while(i*2+1<open.length){let j=i*2+1;if(j+1<open.length&&open[j+1][1]<open[j][1])j++;if(open[j][1]>=last[1])break;open[i]=open[j];i=j;}open[i]=last;}return first;};
 const elevations=new Map([...net].map(k=>[k,roadY(s,k)]));
 while(open.length){const [k,d]=pop();if(cost.get(k)!==d)continue;
  for(const n of neighbors(pos(k))){const j=key(n.x,n.z);if(!net.has(j))continue;
   const grade=Math.abs(elevations.get(k)!-elevations.get(j)!);if(grade>=2.45)continue;
   const w=d+1+.23*grade+.29*grade*grade;if(w<(cost.get(j)??Infinity)){cost.set(j,w);prev.set(j,k);push([j,w]);}
  }
 }
 return {cost,prev};
}

export function check(s:State,kind:Tool,p:Pos[],rot=0){const occ=occupied(s);const cost=quote(s,kind,p);if(p.some(({x,z})=>!inside(x,z)))return 'Outside the province';if(kind==='erase')return '';
 if(cost>s.coin)return `Need ${cost} mon`;
 if(p.some(v=>occ.has(key(v.x,v.z))))return 'Building in the way';
 const h=p.map(v=>height(s,v.x,v.z));
 if(kind==='bridge'){if(p.length<3||p.length>15||!(p.every(v=>v.x===p[0].x)||p.every(v=>v.z===p[0].z)))return 'Drag a straight span, 3–15 tiles';if(h[0]<.25||h.at(-1)!<.25||h.slice(1,-1).every(y=>y>WATER))return 'Start and end on opposite banks';if(Math.abs(h[0]-h.at(-1)!)>2.4)return 'Banks are too far apart in height';if(p.slice(1,-1).some(({x,z})=>s.roads[key(x,z)]))return 'Existing road in the span';if([p[0],p.at(-1)!].some(({x,z})=>s.roads[key(x,z)]?.kind==='bridge'))return 'Existing bridge in the way';return '';}
 if(kind==='road'){if(h.some(y=>y<.23))return 'Deep water — use a bridge'; if(p.some((v,i)=>i>0&&Math.abs(h[i]-h[i-1])>=2.45))return 'Too steep — try a switchback';return '';}
 if(p.some(v=>s.roads[key(v.x,v.z)]))return 'Road in the way';
 if(kind==='plot')return h.some(y=>y<.28)?'Plots need dry land':'';
 const samples=corners(s,p),min=Math.min(...samples),max=Math.max(...samples);if(min<.22)return 'Too close to water';
 if(kind==='terrace')return max-min>8?'Slope is too steep to terrace':'';
 if(max-min>(kind==='farm'?1.15:kind==='temple'?1.65:1.85))return 'Uneven ground — build a terrace';
 if(kind==='farm'&&max>5.8)return 'Rice needs the lowlands';
 if(kind==='temple'&&min<4.2)return 'Temple needs higher ground';
 if(kind==='temple'&&s.wood<12)return 'Need 12 timber';
 return '';}
export function quote(s:State,kind:Tool,p:Pos[]){return specs[kind].cost*(kind==='road'?p.filter(v=>!s.roads[key(v.x,v.z)]).length:kind==='plot'?p.filter(v=>!s.plots?.[key(v.x,v.z)]).length:kind==='bridge'?p.length:1);}
export function apply(s:State,kind:Tool,p:Pos[],rot=0){if(check(s,kind,p,rot))return false;s.coin-=quote(s,kind,p);if(kind==='plot'){s.plots??={};for(const {x,z} of p)s.plots[key(x,z)]=true;}else if(kind==='road')p.forEach(({x,z})=>{s.roads[key(x,z)]??={kind};if(s.plots)delete s.plots[key(x,z)];});else if(kind==='bridge'){const y=Math.max(...p.map(v=>height(s,v.x,v.z)))+.19,id=++s.id,axis=p[0].x===p.at(-1)!.x?'z':'x';p.forEach(({x,z})=>{s.roads[key(x,z)]={kind,y,span:id,axis};if(s.plots)delete s.plots[key(x,z)];});}else if(kind==='terrace'){const hs=p.map(v=>height(s,v.x,v.z)).sort((a,b)=>a-b);const y=Math.round(hs[Math.floor(hs.length/2)]*4)/4;p.forEach(v=>{s.terraces[key(v.x,v.z)]=y});}else if(kind==='erase'){const {x,z}=p[0],k=key(x,z),r=s.roads[k], b=occupied(s).get(k);if(x===-5&&z===24)return false;if(r?.span){for(const k in s.roads)if(s.roads[k].span===r.span)delete s.roads[k];}else if(r)delete s.roads[k];else if(b)s.buildings=s.buildings.filter(q=>q.id!==b.id);else if(s.plots?.[k])delete s.plots[k];else return false;}else{if(kind==='temple')s.wood-=12;s.buildings.push({kind,x:p[0].x,z:p[0].z,rot,id:++s.id});if(s.plots)for(const v of p)delete s.plots[key(v.x,v.z)];}return true;}
export type Journey={temple:number,tiles:string[],effort:number,visits:number,bookings:Map<number,number>};
export function stats(s:State){
 const net=access(s),front=new Map<number,Map<string,number>>();
 for(const b of s.buildings)if(!isProp(b.kind))front.set(b.id,frontage(s,cells(b.kind,b.x,b.z,b.rot),net));
 const live=s.buildings.filter(b=>front.get(b.id)?.size),byKind=(k:Kind)=>live.filter(b=>b.kind===k),count=(k:Kind)=>byKind(k).length;
 const halls=count('temple'),cap=count('home')*8+count('rowhouse')*4;
 let workers=s.pop;const staff=(kind:Kind,n:number)=>{const group=byKind(kind),staffed=group.slice(0,Math.floor(workers/n));workers-=staffed.length*n;return staffed;};
 const farms=staff('farm',4).length,workshops=staff('work',4).length,innBuildings=staff('inn',3),inns=innBuildings.length;
 const journeys:Journey[]=[],flow=new Map<string,number>(),lodging=new Map<number,number>();
 if(halls){
  const {cost,prev}=travel(s,net);
  const remaining=new Map(innBuildings.map(b=>[b.id,10]));
  for(const temple of byKind('temple')){
   const end=[...front.get(temple.id)!.keys()].sort((a,b)=>(cost.get(a)??Infinity)-(cost.get(b)??Infinity))[0];
   const effort=cost.get(end);if(effort===undefined)continue;
   const tiles:string[]=[];for(let k:string|undefined=end;k!==undefined;k=prev.get(k))tiles.push(k);tiles.reverse();
   const on=new Set(tiles),demand=s.pop<16?0:Math.max(5,Math.min(22,22-Math.floor(effort/9)));
   let visits=0;const bookings=new Map<number,number>();
   const lodge=(near:boolean)=>{for(const inn of innBuildings){
     const direct=[...front.get(inn.id)!.keys()].some(k=>on.has(k));if(direct!==near)continue;
     const available=remaining.get(inn.id)!;const served=Math.min(demand-visits,available,direct?10:4);
     remaining.set(inn.id,available-served);visits+=served;if(served){bookings.set(inn.id,served);lodging.set(inn.id,(lodging.get(inn.id)??0)+served);}
   }};
   lodge(true);lodge(false);
   if(s.pop>=16&&visits===0)visits=Math.min(demand,3); // A few day pilgrims can visit without a bed.
   journeys.push({temple:temple.id,tiles,effort,visits,bookings});
   for(const k of tiles)flow.set(k,(flow.get(k)??0)+visits);
  }
 }
 const pilgrims=journeys.reduce((sum,j)=>sum+j.visits,0);
 const passing=(id:number)=>Math.max(0,...[...(front.get(id)?.keys()??[])].map(k=>flow.get(k)??0));
 const staffByTraffic=(kind:Kind,n:number)=>{const group=byKind(kind).sort((a,b)=>passing(b.id)-passing(a.id));const staffed=group.slice(0,Math.floor(workers/n));workers-=staffed.length*n;return staffed;};
 const marketBuildings=staffByTraffic('market',4),stallBuildings=staffByTraffic('stall',2),markets=marketBuildings.length,stalls=stallBuildings.length;
 const trade=new Map<number,number>();let spend=pilgrims*2;
 for(const b of [...marketBuildings,...stallBuildings].sort((a,b)=>passing(b.id)-passing(a.id))){
  const bonus=Math.min(spend,Math.floor(passing(b.id)/(b.kind==='market'?2:3)));trade.set(b.id,bonus);spend-=bonus;
 }
 const touristTrade=[...trade.values()].reduce((a,b)=>a+b,0);
 const food=farms*8-Math.ceil(s.pop/5)-Math.ceil(pilgrims/8);
 const soldRice=Math.min(markets*3+stalls,Math.max(0,s.rice+food-12)), soldWood=Math.min(markets*2+stalls,Math.max(0,s.wood+workshops*3-14));
 const income=Math.floor(s.pop/3)+soldRice*2+soldWood*3+pilgrims*2+touristTrade-Math.ceil(net.size/10)-halls*2-inns;
 return {net,front,live,cap,food,wood:workshops*3-soldWood,rice:food-soldRice,income,pilgrims,farms,workshops,markets,stalls,inns,halls,journeys,flow,passing,trade,lodging,touristTrade,workers};
}
function grow(s:State,q:ReturnType<typeof stats>){
 const plots=s.plots;if(!plots)return 0;
 let built=0,capacity=q.cap,free=q.workers;
 const filled=occupied(s);
 const terrainOK=(kind:Kind,p:Pos[])=>{
  if(p.some(v=>!inside(v.x,v.z)||!plots[key(v.x,v.z)]||filled.has(key(v.x,v.z))))return false;
  const hs=corners(s,p);return Math.min(...hs)>=.25&&Math.max(...hs)-Math.min(...hs)<(kind==='home'?1.55:1.85);
 };
 const scored=Object.keys(plots).flatMap(k=>{const p=pos(k),front=frontage(s,[p],q.net);if(!front.size)return [];
  const traffic=Math.max(0,...[...front.keys()].map(k=>q.flow.get(k)??0));
  const dist=(b:Bld)=>Math.abs(b.x-p.x)+Math.abs(b.z-p.z);
  const nearWork=q.live.some(b=>b.kind==='work'&&dist(b)<7),nearFood=q.live.some(b=>(b.kind==='farm'||b.kind==='market')&&dist(b)<7);
  return [{p,front,traffic,score:Number(nearFood)*2+Number(nearWork)+traffic*.55+Math.random()*.95}];
 }).sort((a,b)=>b.score-a.score);
 for(const {p,front,traffic} of scored){if(built>=2||!plots[key(p.x,p.z)])continue;
  const fronts=[...front].sort((a,b)=>(q.flow.get(b[0])??0)-(q.flow.get(a[0])??0));const crowded=s.buildings.some(b=>b.kind==='stall'&&Math.abs(b.x-p.x)+Math.abs(b.z-p.z)<=2);
  let kind:Kind|undefined;let x=p.x,z=p.z,rot=fronts[0][1];
  if(free>=2&&traffic>=4&&!crowded){kind='stall';}
  else if(s.rice>9&&s.pop>=capacity-5){
   for(const [,facing] of fronts){const dx=facing===1?-1:facing===3?1:0,dz=facing===0?-1:facing===2?1:0;
    const X=Math.min(p.x,p.x+dx),Z=Math.min(p.z,p.z+dz);
    const lot=cells('rowhouse',X,Z,facing);if(!terrainOK('rowhouse',lot))continue;
    for(const offset of (Math.random()<.5?[-1,1]:[1,-1])){
     const xx=X+Math.min(0,dz*offset),zz=Z+Math.min(0,dx*offset);
     if(s.pop>=capacity-3&&terrainOK('home',cells('home',xx,zz,facing))){kind='home';x=xx;z=zz;break;}
    }
    if(!kind){kind='rowhouse';x=X;z=Z;}
    rot=facing;break;
   }
   if(kind)capacity+=kind==='home'?8:4;
  }
  if(!kind)continue;
  const lot=cells(kind,x,z,rot);if(!terrainOK(kind,lot))continue;
  if(kind==='stall')free-=2;
  const b:Bld={kind,x,z,rot,id:++s.id,grown:true,style:Math.random()};s.buildings.push(b);
  for(const v of lot){const k=key(v.x,v.z);delete plots[k];filled.set(k,b);}
  built++;
 }
 return built;
}
export function tick(s:State){const q=stats(s);s.day++;s.rice=Math.min(999,Math.max(0,s.rice+q.rice));s.wood=Math.min(999,s.wood+q.wood);s.coin=Math.max(0,s.coin+q.income);s.pop=Math.min(q.cap,Math.max(0,s.pop+(s.rice>6?Math.min(3,q.cap-s.pop):s.rice===0?-2:0)));return grow(s,q);}
export function fresh(seed:number):State{const s:State={seed,roads:{},buildings:[],terraces:{},id:0,day:1,coin:250,rice:22,wood:16,pop:8};for(let z=13;z<=24;z++)s.roads[key(-5,z)]={kind:'road'};for(const [k,x,z,rot] of [['home',-7,17,1],['farm',-4,19,0],['home',-4,15,3]] as [Kind,number,number,number][])if(!check(s,k,cells(k,x,z,rot)))s.buildings.push({kind:k,x,z,rot,id:++s.id});if(!s.buildings.some(b=>b.kind==='farm')){for(const [x,z,rot] of [[-8,19,0],[-8,21,0],[-4,21,0],[-8,13,0],[-4,18,1]])if(!check(s,'farm',cells('farm',x,z,rot),rot)){s.buildings.push({kind:'farm',x,z,rot,id:++s.id});break;}}s.pop=Math.min(8,stats(s).cap);return s;}
export function line(a:Pos,b:Pos,straight=false){const p:Pos[]=[{...a}];let {x,z}=a;const dx=b.x-x,dz=b.z-z;if(straight){if(Math.abs(dx)>Math.abs(dz))b={x:b.x,z};else b={x,z:b.z};}while(x!==b.x||z!==b.z){if(x!==b.x&&(z===b.z||Math.abs(b.x-x)>=Math.abs(b.z-z)))x+=Math.sign(b.x-x);else z+=Math.sign(b.z-z);p.push({x,z});}return p;}

// Deliberately includes an almost-built shortcut so the trade-off is one drag away.
export function routeTrial(){
 const s=fresh(1748);s.trial=true;s.coin=1100;
 const road=(x:number,z:number,a:number,b:number)=>apply(s,'road',line({x,z},{x:a,z:b}));
 for(const [x,z,a,b] of [[-5,13,-5,5],[-5,5,-11,5],[-11,5,-11,13]])road(x,z,a,b);
 for(const [k,x,z,r] of [['terrace',-14,6,0],['temple',-14,6,1],['inn',-4,11,3],['market',-9,3,0],['stall',-7,6,0],['stall',-8,14,0],['work',-7,15,1],['home',-4,17,3],['farm',-8,21,0],['lantern',-10,4,0],['garden',-6,4,0]] as [Tool,number,number,number][]){apply(s,k,cells(k,x,z,r),r);}
 s.pop=stats(s).cap;s.day=12;s.coin=175;s.rice=34;s.wood=18;
 return s;
}

// These scene cues are derived from the economy; none of them occupy a construction tile.
export type Shopfront={b:Bld,road:string,sideX:number,sideZ:number,base:boolean,busy:number};
export type LanternSpan={road:string,a:Bld,b:Bld,axis:'x'|'z'};
export type PilgrimStop={kind:'inn'|'shop'|'temple',building:number,index:number,sideX:number,sideZ:number,weight:number};
export function streetPlan(s:State,q=stats(s)){
 const shops:Shopfront[]=[],shopsByRoad=new Map<string,Shopfront[]>();
 const frontOn=(b:Bld,k:string)=>{
  const direction=q.front.get(b.id)?.get(k);if(direction===undefined)return null;
  return {sideX:direction===1?-1:direction===3?1:0,sideZ:direction===0?-1:direction===2?1:0};
 };
 const served=(b:Bld)=>b.kind==='inn'?(q.lodging.get(b.id)??0):(q.trade.get(b.id)??0);
 for(const b of q.live){
  if(b.kind!=='market'&&b.kind!=='stall'&&b.kind!=='inn')continue;
  const f=q.front.get(b.id)!;
  const road=[...f.keys()].sort((a,c)=>(q.flow.get(c)??0)-(q.flow.get(a)??0))[0];
  const side=frontOn(b,road)!;
  const item={b,road,...side,base:q.trade.has(b.id),busy:served(b)};shops.push(item);
  if(item.busy)for(const k of f.keys()){const row=shopsByRoad.get(k)??[];row.push(item);shopsByRoad.set(k,row);}
 }
 const stops=q.journeys.map(j=>{
  const list:PilgrimStop[]=[],seen=new Set<number>();
  for(let index=0;index<j.tiles.length-1;index++){
   const k=j.tiles[index];
   for(const {b,busy} of (shopsByRoad.get(k)??[])){
    if(!busy||seen.has(b.id))continue;
    const side=frontOn(b,k);if(!side)continue;
    const weight=b.kind==='inn'?j.bookings.get(b.id)??0:Math.min(busy,j.visits);if(!weight)continue;
    list.push({kind:b.kind==='inn'?'inn':'shop',building:b.id,index,...side,weight});seen.add(b.id);
   }
  }
  const index=j.tiles.length-1,temple=s.buildings.find(b=>b.id===j.temple);
  if(temple){const side=frontOn(temple,j.tiles[index])??{sideX:0,sideZ:0};list.push({kind:'temple',building:temple.id,index,...side,weight:j.visits});}
  return list;
 });
 const spans:LanternSpan[]=[],lots=occupied(s),paired=new Set<string>(),fixed=new Set(['home','rowhouse','inn']);
 const prosperity=new Set<string>();if(s.pop>=14&&s.rice>=10)for(const {road,base} of shops)if(base){const p=pos(road);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)+Math.abs(dz)<=2)prosperity.add(key(p.x+dx,p.z+dz));}
 for(const k of q.net){
  if(s.roads[k].kind==='bridge')continue;
  const p=pos(k),passing=q.flow.get(k)??0;
  if(passing<6&&!prosperity.has(k))continue;
  for(const [dx,dz,axis] of [[1,0,'x'],[0,1,'z']] as const){
   const a=lots.get(key(p.x-dx,p.z-dz)),b=lots.get(key(p.x+dx,p.z+dz));
   if(!a||!b||!fixed.has(a.kind)||!fixed.has(b.kind)||paired.has(`${a.id}/${b.id}`)||!q.front.get(a.id)?.has(k)||!q.front.get(b.id)?.has(k))continue;
   if(Math.abs(height(s,p.x+dx,p.z+dz)-height(s,p.x-dx,p.z-dz))>1.65)continue;
   spans.push({road:k,a,b,axis});paired.add(`${a.id}/${b.id}`);break;
  }
 }
 return {shops,stops,spans};
}
