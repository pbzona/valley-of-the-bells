import * as T from 'three';
import './style.css';
import {StreetPeople} from './street-people';
import {shopfront,hangingLanterns,contactShadows,lanternPools} from './street-art';
import {icon} from './icons';
import {LO,HI,C, specs, key, pos, height, inside, cells, check, apply, fresh, routeTrial, stats, streetPlan, tick, line, quote, rand, neighbors, occupied, dims, isProp, isKind, frontage, type State, type Tool, type Pos, type Kind} from './sim';
import {Batch,ground,scenery,terrace,building,path,gate,waterMesh,solid,lamps} from './art';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const SAVE='valley-of-bells-v1';
const test=new URLSearchParams(location.search).has('test');
function restore():State{try{const s=JSON.parse(localStorage.getItem(SAVE)??'null');if(s&&typeof s.seed==='number'&&s.roads&&s.terraces&&Array.isArray(s.buildings))return s;}catch{}return fresh(1748);}
let s=test?fresh(1748):restore(), rate=test?0:1, night=false, tool:Tool|null=null, rot=0, dirty=true, isHidden=false;
let noteTimer=0, chosen:number|undefined, inspected:string|undefined, showTraffic=false;
const isStroke=(k:Tool|null)=>k==='road'||k==='bridge'||k==='plot';
const own=new Set<string>();
function notify(msg:string,bad=false){const el=$('notice');el.textContent=msg;el.classList.toggle('bad',bad);clearTimeout(noteTimer);noteTimer=window.setTimeout(()=>el.textContent='',3200);}
function save(){if(test)return;try{localStorage.setItem(SAVE,JSON.stringify(s));}catch{}}
let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true, powerPreference:'low-power', preserveDrawingBuffer:test});}catch(e){$('world').textContent='This game needs WebGL 2. Try a browser with hardware acceleration enabled.';throw e;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.45));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;$('world').appendChild(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.16,310), sky=new T.Color(), mist=new T.Fog(0xb8c3ad,43,167);scene.background=sky;scene.fog=mist;
const hemi=new T.HemisphereLight(0xe4e7cd,0x4c503e,2.0),sun=new T.DirectionalLight(0xffe2ae,2.25);sun.position.set(-48,34,18);scene.add(hemi,sun);
const world=new T.Group(),decor=new T.Group(),ghost=new T.Group(),agents=new T.Group(),traffic=new T.Group(),street=new T.Group(),streetPools=new T.Group();scene.add(world,decor,ghost,agents,traffic,street,streetPools);
let surface=ground(s),water=waterMesh(s);world.add(surface,water);
let q=stats(s), streetData=streetPlan(s,q), streetStamp='', peopleStamp='', streetWorld:State|undefined;
const walkers=new StreetPeople(agents);
const dayPalette={sky:0xbfc9b7,mist:0xb6c5b1},nightPalette={sky:0x354054,mist:0x394757};
function setLight(){streetPools.visible=night;const p=night?nightPalette:dayPalette;sky.setHex(p.sky);mist.color.setHex(p.mist);sun.color.setHex(night?0xb1b8f0:0xffdeae);hemi.color.setHex(night?0x9cafe6:0xe8ebd7);hemi.groundColor.setHex(night?0x3e344c:0x685343);sun.intensity=night?.88:2.15;hemi.intensity=night?1.07:1.78;lamps.color.setHex(night?0xffae54:0xc8ac80);water.material.uniforms.night.value=+night;water.material.uniforms.mist.value.setHex(p.mist);$('light').classList.toggle('active',night);$('light').textContent=night?'☀':'☾';dirty=true;}
function clear(g:T.Group){for(const o of [...g.children]){g.remove(o);if(o instanceof T.Mesh||o instanceof T.LineLoop)o.geometry.dispose();}}
function plotMark(b:Batch,{x,z}:Pos){
 const c=0x938357;
 for(const dx of [-.40,.40])for(const dz of [-.40,.40]){const px=x+dx,pz=z+dz,y=height(s,px,pz);b.box(px*C,y+.13,pz*C,.09,.39,.09,c);b.box((px-dx*.18)*C,y+.018,pz*C,.25,.052,.10,c);b.box(px*C,y+.018,(pz-dz*.18)*C,.10,.052,.25,c);}
}
const trailMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide});
const missingCut=()=>s.trial&&[-10,-9,-8,-7,-6].some(x=>!s.roads[key(x,13)]);
function updateTraffic(){
 const paths=q.journeys.filter(j=>j.visits>0);
 clear(traffic);if(!showTraffic){updateTrialLabel();return;}
 const b=new Batch();const drawn=new Set<string>();
 for(const j of paths)for(let i=1;i<j.tiles.length;i++){
  const a=j.tiles[i-1],c=j.tiles[i],token=[a,c].sort().join('/');if(drawn.has(token))continue;drawn.add(token);
  const u=pos(a),v=pos(c),dx=v.x-u.x,dz=v.z-u.z,w=Math.min(.36,.12+(q.flow.get(c)??0)*.012);
  for(let n=1;n<=3;n++){
   const f=n*.25,x=u.x+dx*f,z=u.z+dz*f,land=height(s,x,z);
   const y=Math.max(land,((s.roads[a].y??height(s,u.x,u.z))*(1-f)+(s.roads[c].y??height(s,v.x,v.z))*f))+.21;
   b.box(x*C,y,z*C,dx?.40:w,.04,dz?.40:w,0xf1c781);
  }
 }
 if(missingCut())for(let i=1;i<18;i++){const x=-5-i/3,z=13;b.box(x*C,height(s,x,z)+.13,z*C,.38,.043,.11,0x9aced0);}
 if(b.p.length)traffic.add(b.mesh(trailMaterial));updateTrialLabel();dirty=true;
}
function updateStreet(force=false){
 if(streetWorld!==s||force){streetWorld=s;streetStamp='';peopleStamp='';}
 streetData=streetPlan(s,q);
 const stamp=JSON.stringify([streetData.shops.map(v=>[v.b.id,v.road,v.base,v.busy]),streetData.spans.map(v=>[v.road,v.a.id,v.b.id])]);
 if(stamp!==streetStamp){
  streetStamp=stamp;clear(street);clear(streetPools);
  const b=new Batch(),l=new Batch();for(const f of streetData.shops)shopfront(s,f,b,l);for(const span of streetData.spans)hangingLanterns(s,span,b,l);
  if(b.p.length)street.add(b.mesh(solid));if(l.p.length)street.add(l.mesh(lamps));if(streetData.spans.length)streetPools.add(lanternPools(s,streetData.spans));streetPools.visible=night;dirty=true;
 }
 const p=JSON.stringify([s.pop,[...q.net],q.journeys.map(j=>[j.visits,j.tiles]),streetData.stops,stamp]);
 if(p!==peopleStamp){peopleStamp=p;walkers.plan(s,q,streetData);dirty=true;}
}
function rebuild(terrain=false){streetStamp='';peopleStamp='';if(terrain){surface.geometry.dispose();world.remove(surface);surface=ground(s);world.add(surface);}clear(decor);own.clear();for(const k of occupied(s).keys())own.add(k);for(const k in s.roads)own.add(k);for(const k in s.plots)own.add(k);paint();const b=new Batch(),l=new Batch();for(const [k,y] of Object.entries(s.terraces))terrace(b,s,pos(k),y);for(const [k,r] of Object.entries(s.roads))path(b,s,pos(k),r,q.net.has(k));for(const h of s.buildings)building(b,l,s,h);for(const k in s.plots)plotMark(b,pos(k));gate(b,s);decor.add(scenery(s,own),b.mesh(solid),contactShadows(s));if(l.p.length)decor.add(l.mesh(lamps));dirty=true;}
document.querySelector('.seal')!.innerHTML=icon('bell');
const names=Object.keys(specs) as Tool[];const keys='1234567890zxcvb';
const groups:{label:string,glyph:Tool,tools:Tool[]}[]=[
 {label:'Routes',glyph:'road',tools:['road','bridge']},
 {label:'Housing',glyph:'home',tools:['home','rowhouse','plot']},
 {label:'Economy',glyph:'market',tools:['farm','work','market','stall','inn']},
 {label:'Temple & land',glyph:'temple',tools:['temple','terrace']},
 {label:'Decor',glyph:'garden',tools:['lantern','garden']},
];
let group=-1;
function toolbar(){
 const toolButton=(k:Tool,classes='')=>`<button class="${classes}${tool===k?' active':''}" data-tool="${k}" aria-pressed="${tool===k}" title="${specs[k].hint}"><span class="hotkey">${keys[names.indexOf(k)].toUpperCase()}</span><span class="icon">${icon(k)}</span><span class="label">${specs[k].name}</span></button>`;
 const categories=$('categories');if(!categories.firstChild)categories.innerHTML=groups.map((g,i)=>`<button data-group="${i}" aria-controls="subtools" aria-expanded="false"><span class="icon">${icon(g.glyph)}</span><span class="label">${g.label}</span></button>`).join('')+toolButton('erase');
 for(const b of categories.querySelectorAll<HTMLButtonElement>('button')){
  if(b.dataset.group!==undefined){const on=+b.dataset.group===group;b.classList.toggle('active',on);b.setAttribute('aria-expanded',String(on));}
  else {b.classList.toggle('active',tool==='erase');b.setAttribute('aria-pressed',String(tool==='erase'));}
 }
 const sub=$('subtools');if(sub.dataset.group!==String(group)){sub.dataset.group=String(group);sub.hidden=group<0;sub.innerHTML=group<0?'':groups[group].tools.map(k=>toolButton(k)).join('');}
 for(const b of sub.querySelectorAll<HTMLButtonElement>('button')){const on=b.dataset.tool===tool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
}
function setTool(k:Tool|null,next=k===null?-1:groups.findIndex(g=>g.tools.includes(k))){tool=k;group=next;chosen=undefined;inspected=undefined;rot=0;dragStart=null;toolbar();paint();describe();preview();}
$('tools').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(!b)return;if(b.dataset.group!==undefined){const i=+b.dataset.group;setTool(null,group===i?-1:i);return;}const k=b.dataset.tool as Tool|undefined;if(k)setTool(k===tool?null:k,k===tool?group:undefined);});
toolbar();
const signed=(v:number)=>`${v<0?'−':'+'}${Math.abs(v)}`;
function paint(){q=stats(s);updateTraffic();updateStreet();const selected=s.buildings.find(b=>b.id===chosen);const m=[[Math.floor(s.coin),'Treasury'],[s.rice,'Rice'],[s.wood,'Timber'],[`${s.pop} / ${q.cap}`,'Residents'],[q.pilgrims,'Pilgrims']];$('metrics').innerHTML=m.map(([val,label])=>`<div class="metric"><strong>${val}</strong><small>${label}</small></div>`).join(''); const day=(s.day-1)%120, season=['Spring','Summer','Autumn','Winter'][Math.floor(day/30)];$('date').textContent=`${season} · Day ${day%30+1}`;$('report').innerHTML=[['Treasury / day',q.income],['Rice / day',q.rice],['Timber / day',q.wood]].map(([k,v])=>`<span>${k}</span><b class="${Number(v)<0?'loss':'gain'}">${signed(Number(v))}</b>`).join('')+(q.touristTrade?`<span>Pilgrim trade included</span><b class="gain">+${q.touristTrade}</b>`:'');
 const goal=q.pilgrims?[s.trial?'Two Approaches':'Pilgrimage open',missingCut()?'The market road works. Try connecting the two ends of the dashed shortcut.':'Toggle the route view or select a stall to see where visitors spend.']:q.halls===0?['Open a pilgrimage','Build a mountain temple and connect it to the South Gate.']:['Welcome the pilgrims','Grow to 16 residents. Inns along the approach bring more visitors.'];
 const live=selected&&q.live.includes(selected), journey=q.journeys.find(j=>j.temple===selected?.id);
 const label=selected?`${selected.grown?'Grown · ':''}${specs[selected.kind].name}`:inspected&&s.plots?.[inspected]?'Reserved frontage':inspected&&s.roads[inspected]?'Street traffic':goal[0];
 const detail=selected?(isProp(selected.kind)?'Decoration · no road needed':!live?'No road to the South Gate':journey?`${journey.visits} pilgrims/day · ${journey.tiles.length-1} road tiles from gate`:selected.kind==='inn'?`${q.lodging.get(selected.id)??0} guests lodge each day · ${q.passing(selected.id)} pilgrims pass`:['market','stall'].includes(selected.kind)?`${q.passing(selected.id)} pilgrims pass each day${q.trade.get(selected.id)?` · +${q.trade.get(selected.id)} mon` : ''}`:'Connected to the South Gate'):inspected&&s.plots?.[inspected]?(frontage(s,[pos(inspected)],q.net).size?'Waiting for demand. Homes need two reserved tiles deep; stalls need passing pilgrims.':'No connected road frontage yet.'):inspected&&s.roads[inspected]?`${q.flow.get(inspected)??0} pilgrims pass each day`:goal[1];
 $('goal').innerHTML=`<strong>${label}</strong>${detail}`;for(const b of $('speed').querySelectorAll('button'))b.classList.toggle('active',Number(b.dataset.rate)===rate);}
$('speed').addEventListener('click',e=>{const x=(e.target as HTMLElement).closest('button')?.dataset.rate;if(x!==undefined){rate=+x;paint();}});
let focus=new T.Vector3(-12,1,38),radius=63, az=.66, el=.49;
const ray=new T.Raycaster(),ndc=new T.Vector2(),proj=new T.Vector3();let hit:Pos|null=null,dragStart:Pos|null=null,pointer=[0,0],over=false;
function updateCamera(){const r=Math.cos(el)*radius;camera.position.set(focus.x+Math.sin(az)*r,focus.y+Math.sin(el)*radius,focus.z+Math.cos(az)*r);camera.position.y=Math.max(camera.position.y,.65,height(s,camera.position.x/C,camera.position.z/C)+1.15);camera.lookAt(focus);camera.updateMatrixWorld(true);proj.set(-5*C,height(s,-5,24)+4.1,24*C).project(camera);const label=$('landmark');label.style.left=`${(proj.x*.5+.5)*100}%`;label.style.top=`${(.5-proj.y*.5)*100}%`;label.classList.toggle('hidden',Math.abs(proj.x)>.94||Math.abs(proj.y)>.88||proj.z>1||radius>115);updateTrialLabel();dirty=true;}
function updateTrialLabel(){const label=$('trial-label');if(!missingCut()||!showTraffic){label.classList.add('hidden');return;}
 proj.set(-8*C,height(s,-8,13)+1.0,13*C).project(camera);label.style.left=`${(proj.x*.5+.5)*100}%`;label.style.top=`${(.5-proj.y*.5)*100}%`;label.classList.toggle('hidden',Math.abs(proj.x)>.94||Math.abs(proj.y)>.82||proj.z>1);
}
function cast(x:number,y:number){ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);const a=ray.intersectObjects([surface,water],false);return a[0]?.point;}
function position(x:number,y:number){const p=cast(x,y);if(!p){hit=null;return;}const X=Math.round(p.x/C),Z=Math.round(p.z/C);hit=inside(X,Z)?{x:X,z:Z}:null;}
const good=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.59,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),bad=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.63,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
const goodLine=new T.LineBasicMaterial({color:0xdaf6a3,depthTest:false}),badLine=new T.LineBasicMaterial({color:0xff8964,depthTest:false});
function footprint(p:Pos,isBad:boolean,y?:number){const vals=[];for(const [dx,dz] of [[-.49,-.49],[.49,-.49],[.49,.49],[-.49,.49]])vals.push((p.x+dx)*C,(y??height(s,p.x+dx*.88,p.z+dz*.88))+.14,(p.z+dz)*C);const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vals,3));const l=new T.LineLoop(g,isBad?badLine:goodLine);l.renderOrder=4;ghost.add(l);}
function candidates(){if(!hit||!tool)return [];if(isStroke(tool))return dragStart?line(dragStart,hit,tool==='bridge'):[hit];return cells(tool,hit.x,hit.z,rot);}
function describe(p:Pos[]=[],err=''){const ele=$('toolinfo');if(!tool){ele.textContent='';return;}const spec=specs[tool];const fee=p.length?quote(s,tool,p):spec.cost;const d=dims(tool,rot), size=isKind(tool)||tool==='terrace'?` · ${d.w}×${d.d}`:'';ele.innerHTML=`<strong>${spec.name}${size}${fee?` · ${fee} mon`:''}</strong> ${err||spec.hint}${['home','work','market','inn','temple','farm','rowhouse','stall'].includes(tool)?' · R rotate':''}`;ele.style.color=err?'#f0a88a':'';}
let prev='';
function preview(force=false){const p=candidates(),k=`${tool}/${p.map(v=>key(v.x,v.z)).join(';')}/${rot}`;if(k===prev&&!force)return;prev=k;clear(ghost);dirty=true;if(!tool||!p.length){describe();return;}const err=check(s,tool,p,rot), b=new Batch(err?0xe47763:0xa8d482),l=new Batch(err?0xe47763:0xa8d482);describe(p,tool==='bridge'&&!dragStart?'':err);const ys=p.map(v=>height(s,v.x,v.z)), max=Math.max(...ys)+.14;
 if(tool==='erase'){const picked=occupied(s).get(key(p[0].x,p[0].z));const road=s.roads[key(p[0].x,p[0].z)];if(picked)cells(picked.kind,picked.x,picked.z,picked.rot).forEach(v=>footprint(v,true));else if(road?.span)Object.entries(s.roads).filter(([,r])=>r.span===road.span).forEach(([k,r])=>footprint(pos(k),true,r.y));else footprint(p[0],true);return;}
 if(tool==='road'){const set=new Set(p.map(v=>key(v.x,v.z)));p.forEach(v=>path(b,s,v,{kind:'road'},true,set));}else if(tool==='bridge')p.forEach(v=>path(b,s,v,{kind:'bridge',y:max+.05,axis:p[0].x===p.at(-1)!.x?'z':'x'}));else if(tool==='plot'){p.forEach(v=>plotMark(b,v));}else if(tool==='terrace'){const median=ys.slice().sort((a,b)=>a-b)[Math.floor(ys.length/2)];for(const v of p)b.box(v.x*C,median+.02,v.z*C,2.96,.14,2.96,0x9dbf7c);}else building(b,l,s,{kind:tool as Kind,x:p[0].x,z:p[0].z,rot,id:s.id+1});
 if(b.p.length)ghost.add(b.mesh(err?bad:good));if(l.p.length)ghost.add(l.mesh(err?bad:good));p.forEach(v=>footprint(v,!!err,tool==='bridge'?max+.05:undefined));}
function place(){if(!tool||!hit)return;const p=candidates();const reason=check(s,tool,p,rot);if(reason){notify(reason,true);return;}if(apply(s,tool,p,rot)){save();rebuild(tool==='terrace');preview(true);if(tool==='temple')notify('Temple raised. Connect it to the South Gate.');}else if(tool==='erase')notify('Nothing removable here',true);}
const canvas=renderer.domElement;canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});let down:{x:number,y:number,b:number,id:number,moved:boolean,grabY:number}|null=null;const touches=new Map<number,[number,number]>();let pinch=0;
function pan(dx:number,dy:number){const speed=radius*.0018;focus.x-=dx*Math.cos(az)*speed;focus.z+=dx*Math.sin(az)*speed;focus.x+=dy*Math.sin(az)*speed;focus.z+=dy*Math.cos(az)*speed;focus.x=T.MathUtils.clamp(focus.x,-78,78);focus.z=T.MathUtils.clamp(focus.z,-78,78);focus.y=height(s,focus.x/C,focus.z/C)+.72;updateCamera();}
// Keep the point on a horizontal plane at the grabbed terrain's height under the cursor.
// Keeping focus.y fixed makes the camera translate without pitching as it crosses a slope.
const dragPlane=new T.Plane(new T.Vector3(0,1,0)),dragFrom=new T.Vector3(),dragTo=new T.Vector3();
function dragPoint(x:number,y:number,out:T.Vector3){
 ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);
 return ray.ray.intersectPlane(dragPlane,out)!==null&&out.distanceToSquared(camera.position)<radius*radius*9;
}
function dragPan(x:number,y:number,dx:number,dy:number,grabY:number){
 if(!dx&&!dy)return;
 dragPlane.constant=-grabY;
 if(dragPoint(x-dx,y-dy,dragFrom)&&dragPoint(x,y,dragTo)){
  focus.x+=dragFrom.x-dragTo.x;focus.z+=dragFrom.z-dragTo.z;
 }else{
  // Near or above the horizon, limit perspective amplification and preserve drag direction.
  const scale=2*radius*Math.tan(T.MathUtils.degToRad(camera.fov/2))/innerHeight;
  const dz=-dy*scale/Math.max(.45,Math.sin(el));
  focus.x+=-dx*scale*Math.cos(az)+dz*Math.sin(az);
  focus.z+=dx*scale*Math.sin(az)+dz*Math.cos(az);
 }
 focus.x=T.MathUtils.clamp(focus.x,-78,78);focus.z=T.MathUtils.clamp(focus.z,-78,78);updateCamera();
}
canvas.addEventListener('pointerdown',e=>{if(e.button===1)e.preventDefault();over=true;canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===2){const [a,b]=[...touches.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);down=null;dragStart=null;return;}}down={x:e.clientX,y:e.clientY,b:e.button,id:e.pointerId,moved:false,grabY:e.button===1||e.button===2||e.pointerType==='touch'?cast(e.clientX,e.clientY)?.y??focus.y:focus.y};pointer=[e.clientX,e.clientY];position(...pointer as [number,number]);if(e.button===0&&isStroke(tool))dragStart=hit;preview();});
canvas.addEventListener('pointermove',e=>{over=true;pointer=[e.clientX,e.clientY];if(touches.has(e.pointerId)){touches.set(e.pointerId,pointer as [number,number]);if(touches.size===2){const [a,b]=[...touches.values()];const next=Math.hypot(a[0]-b[0],a[1]-b[1]);radius=T.MathUtils.clamp(radius*pinch/Math.max(next,1),8,143);pinch=next;updateCamera();return;}}if(down?.id===e.pointerId){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>3)down.moved=true;down.x=e.clientX;down.y=e.clientY;if(down.b===2&&!e.shiftKey){az-=dx*.0065;el=T.MathUtils.clamp(el+dy*.0065,-.39,1.51);updateCamera();}else if(down.b===1||(down.b===2&&e.shiftKey)||(e.pointerType==='touch'&&!dragStart&&down.moved))dragPan(e.clientX,e.clientY,dx,dy,down.grabY);}position(e.clientX,e.clientY);preview();});
canvas.addEventListener('pointerleave',()=>{if(!down){over=false;hit=null;preview();}});
canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);down=null;dragStart=null;preview(true);});
canvas.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(!down||down.id!==e.pointerId)return;position(e.clientX,e.clientY);if(down.b===0){if(tool&&(dragStart||!down.moved))place();else if(!tool&&!down.moved){const b=hit&&occupied(s).get(key(hit.x,hit.z));chosen=b?b.id:undefined;inspected=hit?key(hit.x,hit.z):undefined;paint();}}dragStart=null;down=null;if(e.pointerType==='touch'){hit=null;over=false;}preview(true);});
canvas.addEventListener('wheel',e=>{e.preventDefault();const a=cast(e.clientX,e.clientY),prevRadius=radius;radius=T.MathUtils.clamp(radius*Math.exp(T.MathUtils.clamp(e.deltaY,-130,130)*.00125),7,142);if(a){const mix=1-radius/prevRadius;focus.lerp(a,mix);focus.y=Math.max(height(s,focus.x/C,focus.z/C)+.62,focus.y);}updateCamera();position(e.clientX,e.clientY);preview();},{passive:false});
const panel=$<HTMLDialogElement>('panel');
function show(mode:'help'|'menu'){if(panel.open)return;panKeys.clear();panel.innerHTML=mode==='help'?`<div class="kicker">FIELD GUIDE</div><h2>Build up from the river</h2><ol><li>Roads must lead back to the South Gate. Houses need road frontage to accept residents.</li><li>Feed them with rice paddies on flat lowland. Workshops make timber; markets sell surplus. The ledger shows your daily balance.</li><li>Pilgrims favor shorter, gentler walks. Inns on the approach lodge more visitors; passing pilgrims also spend at markets and stalls. Press T to see routes.</li><li>In Housing, reserve Grow plots along a connected street. Zone at least two tiles deep for homes, or one tile by a pilgrim route for a stall.</li><li>Rotate with R, toggle dusk with N, pause with Space, hide the UI with H, and cancel with Esc.</li></ol><button data-act="close">Back to the valley</button>`:`<div class="kicker">VALLEY SETTINGS</div><h2>Province records</h2><p>Your valley is saved automatically in this browser.</p><button data-act="export">Export save</button><button data-act="import">Import save</button><input type="file" id="importfile" accept=".json,application/json" hidden><p>Generate terrain with a different seed. This replaces the valley in this browser; export first to keep it.</p><input id="seed" type="number" min="1" max="2147483647" value="${s.seed}"><button data-act="roll">Roll seed</button><div class="end"><button data-act="close">Cancel</button><button class="accent" data-act="new">Replace valley</button></div><div class="trial-settings"><strong>Two Approaches</strong><p>Start with a working temple town and an unfinished shortcut. See who gains and who loses when you connect it. This replaces the current valley.</p><button class="accent" data-act="trial">Load route trial</button></div>`;panel.showModal();}
function replace(n:State){s=n;focus.set(-12,1,38);radius=63;az=.66;el=.49;world.remove(water);water.geometry.dispose();water.material.dispose();water=waterMesh(s);world.add(water);setLight();rebuild(true);updateCamera();setTool(null);save();}
panel.addEventListener('click',e=>{const action=(e.target as HTMLElement).closest('button')?.dataset.act;if(action==='close')panel.close();if(action==='trial'){rate=0;replace(routeTrial());focus.set(-24,4,31);radius=78;az=.64;el=.54;if(!showTraffic)toggleTraffic();updateCamera();panel.close();notify('Trial paused · Follow the gold route, or build the dashed shortcut.');}if(action==='roll')$<HTMLInputElement>('seed').value=String(1+Math.floor(Math.random()*999999));if(action==='new'){const n=$<HTMLInputElement>('seed').valueAsNumber;if(Number.isSafeInteger(n)&&n>0&&n<=2147483647){replace(fresh(n));panel.close();notify('A new valley');}}if(action==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`valley-${s.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}if(action==='import')$<HTMLInputElement>('importfile').click();});
panel.addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;try{const n=JSON.parse(await f.text());if(!validSave(n))throw Error('bad save');replace(n);panel.close();notify('Valley restored');}catch{panel.close();notify('Invalid valley save',true);}});
function validSave(n:any):n is State{const num=(v:any)=>Number.isFinite(v)&&v>=0;const k=(v:string)=>/^-?\d+,-?\d+$/.test(v)&&inside(pos(v).x,pos(v).z);return n&&Number.isInteger(n.seed)&&n.seed>0&&(n.trial===undefined||n.trial===true)&&[n.id,n.day,n.coin,n.rice,n.wood,n.pop].every(num)&&n.roads&&typeof n.roads==='object'&&Object.entries(n.roads).every(([a,r]:[string,any])=>k(a)&&r&&['road','bridge'].includes(r.kind)&&(r.kind==='road'||(Number.isFinite(r.y)&&num(r.span)&&['x','z'].includes(r.axis))))&&n.terraces&&typeof n.terraces==='object'&&Object.entries(n.terraces).every(([a,y])=>k(a)&&Number.isFinite(y))&&(n.plots===undefined||(n.plots&&typeof n.plots==='object'&&!Array.isArray(n.plots)&&Object.entries(n.plots).every(([a,v])=>k(a)&&v===true)))&&Array.isArray(n.buildings)&&n.buildings.length<=500&&n.buildings.every((b:any)=>b&&isKind(b.kind)&&Number.isInteger(b.x)&&Number.isInteger(b.z)&&Number.isInteger(b.rot)&&b.rot>=0&&b.rot<=3&&num(b.id)&&(b.style===undefined||(Number.isFinite(b.style)&&b.style>=0&&b.style<1))&&cells(b.kind,b.x,b.z,b.rot).every(v=>inside(v.x,v.z)));}
function toggleTraffic(){showTraffic=!showTraffic;$('traffic').classList.toggle('active',showTraffic);$('traffic').setAttribute('aria-pressed',String(showTraffic));updateTraffic();dirty=true;if(showTraffic&&!q.pilgrims)notify('Active pilgrim routes will appear here.');}
$('traffic').onclick=toggleTraffic;
$('light').onclick=()=>{night=!night;setLight();};$('help').onclick=()=>show('help');$('menu').onclick=()=>show('menu');
const panKeys=new Set<string>();
const panBindings=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
function isHeld(a:string,b:string){return Number(panKeys.has(a)||panKeys.has(b));}
function panHeld(dt:number){
 const dx=isHeld('a','arrowleft')-isHeld('d','arrowright');
 const dy=isHeld('s','arrowdown')-isHeld('w','arrowup');
 if(!dx&&!dy)return;
 const speed=.39*dt/Math.hypot(dx,dy);
 pan(dx*speed,dy*speed);
 if(tool&&over){position(pointer[0],pointer[1]);preview();}
}
window.addEventListener('keyup',e=>panKeys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>panKeys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)panKeys.clear();});
window.addEventListener('keydown',e=>{if(panel.open||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(panBindings.has(k)){e.preventDefault();panKeys.add(k);return;}if(e.repeat)return;if(keys.includes(k)&&k.length===1)setTool(names[keys.indexOf(k)]);else if(k==='r'){rot=(rot+1)%4;preview(true);}else if(k==='escape')setTool(null);else if(k==='n'){night=!night;setLight();}else if(k==='t')toggleTraffic();else if(k===' '&&e.target===document.body){e.preventDefault();rate=rate?0:1;paint();}else if(k==='h'){isHidden=!isHidden;$('hud').classList.toggle('hidden',isHidden);}else if(k==='?')show('help');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);updateCamera();});
let lastT=0,clock=0, simClock=0,lastDraw=0;
function draw(t:number){water.material.uniforms.t.value=t;walkers.update(t);renderer.render(scene,camera);dirty=false;}
function animate(t:number){requestAnimationFrame(animate);const dt=Math.min(t-lastT||0,100);lastT=t;if(document.hidden)return;if(panKeys.size&&!panel.open&&t-lastDraw>=33.33)panHeld(Math.min(t-lastDraw,50));const busy=!!down||dirty; const hz=busy?33.33:rate?66.66:111.11;const ambient=!test&&!panel.open&&(rate>0||q.pilgrims>0)&&document.hasFocus();if(ambient)clock+=dt;if(rate&&!panel.open){simClock+=dt*rate;if(simClock>6200){simClock-=6200;const built=tick(s);save();if(built)rebuild();else paint();preview(true);}}if(dirty||t-lastDraw>=hz&&ambient){lastDraw=t;draw(clock/1000);}}
rebuild();setLight();updateCamera();paint();draw(0);requestAnimationFrame(animate);
if(test)Object.assign(window,{bells:{get state(){return s},get report(){return stats(s)},get streets(){return streetData},get pedestrianDebug(){return walkers.debug},samplePedestrians:(t:number)=>{walkers.update(t);return walkers.debug.activeStops},check,project:(x:number,z:number)=>{const a=new T.Vector3(x*C,height(s,x,z),z*C).project(camera);return [(a.x+1)*innerWidth/2,(1-a.y)*innerHeight/2];},step:(n=1)=>{let built=0;for(let i=0;i<n;i++)built+=tick(s);if(built)rebuild();else paint();},place:(k:Tool,x:number,z:number,r=0,to?:Pos)=>{const v=to?line({x,z},to,k==='bridge'):cells(k,x,z,r);const ok=apply(s,k,v,r);if(ok)rebuild(k==='terrace');return ok;},draw:(t=0)=>draw(t),replace:(seed:number)=>replace(fresh(seed)),view:(x:number,y:number,z:number,r:number,a:number,e:number)=>{focus.set(x,y,z);radius=r;az=a;el=e;updateCamera();draw(0);}}});
