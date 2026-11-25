export const N=49, C=3, LO=-24, HI=24, WATER=.07;
export type Pos={x:number,z:number};
export const specs={road:{name:'Road',icon:'╋',cost:2,w:1,d:1,hint:'Drag a route. Roads turn into steps on slopes.'},bridge:{name:'Bridge',icon:'⌒',cost:5,w:1,d:1,hint:'Drag straight from bank to bank. Connect it to a road.'},home:{name:'House',icon:'⌂',cost:16,w:2,d:2,hint:'Room for 8 residents. Put a road next to the house.'},farm:{name:'Rice',icon:'≋',cost:22,w:3,d:2,hint:'Rice paddies need flat lowlands, road access and 4 workers.'},work:{name:'Workshop',icon:'⚒',cost:28,w:2,d:2,hint:'Produces timber with 4 workers. Keep it beside a road.'},market:{name:'Market',icon:'⛺',cost:32,w:3,d:2,hint:'Trades surplus rice and timber with 4 workers.'},inn:{name:'Inn',icon:'灯',cost:38,w:2,d:2,hint:'Lodges pilgrims along the route to a temple.'},temple:{name:'Temple',icon:'塔',cost:78,w:3,d:3,hint:'Build above the valley. Keep a connected inn and 16 residents.'},terrace:{name:'Terrace',icon:'▤',cost:24,w:3,d:3,hint:'Levels nine empty tiles for a hilltop temple or district.'},erase:{name:'Erase',icon:'×',cost:0,w:1,d:1,hint:'Remove a road, bridge or building; no refund.'}} as const;
export type Tool=keyof typeof specs;
export type Kind=Exclude<Tool,'road'|'bridge'|'terrace'|'erase'>;
export type Bld={kind:Kind,x:number,z:number,rot:number,id:number};
export type Route={kind:'road'|'bridge',y?:number,span?:number,axis?:'x'|'z'};
export type State={seed:number,roads:Record<string,Route>,terraces:Record<string,number>,buildings:Bld[],id:number,day:number,coin:number,rice:number,wood:number,pop:number};
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
export function connected(s:State,b:Bld, net=access(s)){return cells(b.kind,b.x,b.z,b.rot).some(p=>neighbors(p).some(n=>{const k=key(n.x,n.z),r=s.roads[k];return net.has(k)&&Math.abs(height(s,p.x,p.z)-(r.y??height(s,n.x,n.z)))<2.6}));}
export function check(s:State,kind:Tool,p:Pos[],rot=0){const occ=occupied(s);const cost=quote(s,kind,p);if(p.some(({x,z})=>!inside(x,z)))return 'Outside the province';if(kind==='erase')return '';
 if(cost>s.coin)return `Need ${cost} mon`;
 if(p.some(v=>occ.has(key(v.x,v.z))))return 'Building in the way';
 const h=p.map(v=>height(s,v.x,v.z));
 if(kind==='bridge'){if(p.length<3||p.length>15||!(p.every(v=>v.x===p[0].x)||p.every(v=>v.z===p[0].z)))return 'Drag a straight span, 3–15 tiles';if(h[0]<.25||h.at(-1)!<.25||h.slice(1,-1).every(y=>y>WATER))return 'Start and end on opposite banks';if(Math.abs(h[0]-h.at(-1)!)>2.4)return 'Banks are too far apart in height';if(p.slice(1,-1).some(({x,z})=>s.roads[key(x,z)]))return 'Existing road in the span';if([p[0],p.at(-1)!].some(({x,z})=>s.roads[key(x,z)]?.kind==='bridge'))return 'Existing bridge in the way';return '';}
 if(kind==='road'){if(h.some(y=>y<.23))return 'Deep water — use a bridge'; if(p.some((v,i)=>i>0&&Math.abs(h[i]-h[i-1])>=2.45))return 'Too steep — try a switchback';return '';}
 if(p.some(v=>s.roads[key(v.x,v.z)]))return 'Road in the way';
 const samples=corners(s,p),min=Math.min(...samples),max=Math.max(...samples);if(min<.22)return 'Too close to water';
 if(kind==='terrace')return max-min>8?'Slope is too steep to terrace':'';
 if(max-min>(kind==='farm'?1.15:kind==='temple'?1.65:1.85))return 'Uneven ground — build a terrace';
 if(kind==='farm'&&max>5.8)return 'Rice needs the lowlands';
 if(kind==='temple'&&min<4.2)return 'Temple needs higher ground';
 if(kind==='temple'&&s.wood<12)return 'Need 12 timber';
 return '';}
export function quote(s:State,kind:Tool,p:Pos[]){return specs[kind].cost*(kind==='road'?p.filter(v=>!s.roads[key(v.x,v.z)]).length:kind==='bridge'?p.length:1);}
export function apply(s:State,kind:Tool,p:Pos[],rot=0){if(check(s,kind,p,rot))return false;s.coin-=quote(s,kind,p);if(kind==='road')p.forEach(({x,z})=>{s.roads[key(x,z)]??={kind};});else if(kind==='bridge'){const y=Math.max(...p.map(v=>height(s,v.x,v.z)))+.19,id=++s.id,axis=p[0].x===p.at(-1)!.x?'z':'x';p.forEach(({x,z})=>{s.roads[key(x,z)]={kind,y,span:id,axis};});}else if(kind==='terrace'){const hs=p.map(v=>height(s,v.x,v.z)).sort((a,b)=>a-b);const y=Math.round(hs[Math.floor(hs.length/2)]*4)/4;p.forEach(v=>{s.terraces[key(v.x,v.z)]=y});}else if(kind==='erase'){const {x,z}=p[0],k=key(x,z),r=s.roads[k], b=occupied(s).get(k);if(x===-5&&z===24)return false;if(r?.span){for(const k in s.roads)if(s.roads[k].span===r.span)delete s.roads[k];}else if(r)delete s.roads[k];else if(b)s.buildings=s.buildings.filter(q=>q.id!==b.id);else return false;}else{if(kind==='temple')s.wood-=12;s.buildings.push({kind,x:p[0].x,z:p[0].z,rot,id:++s.id});}return true;}
export function stats(s:State){const net=access(s),live=s.buildings.filter(b=>connected(s,b,net));const count=(k:Kind)=>live.filter(b=>b.kind===k).length;
 let workers=s.pop;const staff=(k:Kind,n:number)=>{const m=Math.min(count(k),Math.floor(workers/n));workers-=n*m;return m;};
 const farms=staff('farm',4), workshops=staff('work',4), markets=staff('market',4), inns=staff('inn',3), halls=count('temple'); const pilgrims=s.pop>=16?Math.min(halls*14,inns*10):0;const food=farms*8-Math.ceil(s.pop/5)-Math.ceil(pilgrims/8);const soldRice=markets?Math.min(markets*3,Math.max(0,s.rice+food-12)):0;const soldWood=markets?Math.min(markets*2,Math.max(0,s.wood+workshops*3-14)):0;const income=Math.floor(s.pop/3)+soldRice*2+soldWood*3+pilgrims*2-Math.ceil(net.size/10)-halls*2-inns;
 return {net,live,count,cap:count('home')*8,food,wood:workshops*3-soldWood,rice:food-soldRice,income,pilgrims,farms,workshops,markets,inns,halls};}
export function tick(s:State){const q=stats(s);s.day++;s.rice=Math.min(999,Math.max(0,s.rice+q.rice));s.wood=Math.min(999,s.wood+q.wood);s.coin=Math.max(0,s.coin+q.income);s.pop=Math.min(q.cap,Math.max(0,s.pop+(s.rice>6?Math.min(3,q.cap-s.pop):s.rice===0?-2:0)));}
export function fresh(seed:number):State{const s:State={seed,roads:{},buildings:[],terraces:{},id:0,day:1,coin:250,rice:22,wood:16,pop:8};for(let z=13;z<=24;z++)s.roads[key(-5,z)]={kind:'road'};for(const [k,x,z,rot] of [['home',-7,17,1],['farm',-4,19,0],['home',-4,15,3]] as [Kind,number,number,number][])if(!check(s,k,cells(k,x,z,rot)))s.buildings.push({kind:k,x,z,rot,id:++s.id});if(!s.buildings.some(b=>b.kind==='farm')){for(const [x,z,rot] of [[-8,19,0],[-8,21,0],[-4,21,0],[-8,13,0],[-4,18,1]])if(!check(s,'farm',cells('farm',x,z,rot),rot)){s.buildings.push({kind:'farm',x,z,rot,id:++s.id});break;}}s.pop=Math.min(8,stats(s).cap);return s;}
export function line(a:Pos,b:Pos,straight=false){const p:Pos[]=[{...a}];let {x,z}=a;const dx=b.x-x,dz=b.z-z;if(straight){if(Math.abs(dx)>Math.abs(dz))b={x:b.x,z};else b={x,z:b.z};}while(x!==b.x||z!==b.z){if(x!==b.x&&(z===b.z||Math.abs(b.x-x)>=Math.abs(b.z-z)))x+=Math.sign(b.x-x);else z+=Math.sign(b.z-z);p.push({x,z});}return p;}
