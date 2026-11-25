import * as T from 'three';
import {Batch,foundation} from './art';
import {C,cells,dims,height,pos,rand,type LanternSpan,type Shopfront,type State} from './sim';
const oak=0x684d3a,iron=0x40382f,cream=0xc2aa81;
const tones=[0xa36a4c,0x777c52,0x9a8254,0x6f7e71];
const basket=new T.CylinderGeometry(.5,.36,1,8).toNonIndexed();
const lump=new T.IcosahedronGeometry(1,0).toNonIndexed();

export function shopfront(s:State,item:Shopfront,b:Batch,l:Batch){
 const {b:h,sideX:sx,sideZ:sz,busy,base}=item;
 const p=pos(item.road),theta=Math.atan2(sx,sz),tx=sz,tz=-sx;
 const zOffset=.08+(rand(h.id,3,s.seed)-.5)*.23;
 const originX=p.x*C+sx*1.57+tx*zOffset,originZ=p.z*C+sz*1.57+tz*zOffset;
 const pack=(a:Batch,along:number,raise:number,depth:number,w:number,h:number,d:number,color:number)=>{
  const x=originX+tx*along+sx*depth,z=originZ+tz*along+sz*depth,y=height(s,x/C,z/C);
  a.box(x,y+raise,z,w,h,d,color,theta);
 };
 const round=(along:number,raise:number,depth:number,w:number,h:number,d:number,color:number)=>{
  const x=originX+tx*along+sx*depth,z=originZ+tz*along+sz*depth,y=height(s,x/C,z/C);
  b.shape(basket,x,y+raise,z,w,h,d,color,theta);
 };
 // A short set of exposed steps joins hill shop platforms back to the lane.
 const walkX=originX+tx*.94,walkZ=originZ+tz*.94;
 const stepTop=foundation(s,cells(h.kind,h.x,h.z,h.rot)),foot=height(s,(walkX-sx*.49)/C,(walkZ-sz*.49)/C)+.082;
 if(stepTop-foot>.32){
  const n=Math.min(7,Math.ceil((stepTop-foot)/.19)),run=1.19;
  for(let i=0;i<n;i++){
   const u=(i+.5)/n,depth=-.50+u*run,x=walkX+sx*depth,z=walkZ+sz*depth;
   const floor=height(s,x/C,z/C)-.075,y=foot+(stepTop-foot)*(i+1)/n;
   if(y>floor)b.box(x,(y+floor)/2,z,.83,y-floor,run/n+.024,i%2?0x8a8372:0x928b77,theta);
  }
 }
 const shade=tones[h.id%tones.length];
 if(h.kind==='inn'){
  // Cloth sign, a pair of slippers, and luggage distinguish a lodging stop from a shop.
  if(!busy)return;
  pack(b,.84,.91,.15,.075,1.8,.075,oak);pack(b,.53,1.70,.16,.63,.06,.09,oak);
  pack(b,.57,1.38,.16,.42,.61,.045,shade);pack(b,.57,1.57,.125,.26,.075,.025,cream);
  for(let i=0;i<Math.min(3,Math.ceil(busy/2));i++){
   pack(b,-.77+i*.39,.18,.12,.33,.30,.29,tones[(h.id+i+1)%4]);
   pack(b,-.77+i*.39,.23,.10,.078,.32,.33,cream);pack(b,-.87+i*.39,.047,-.22,.085,.045,.18,oak);
   pack(b,-.75+i*.39,.047,-.22,.085,.045,.18,oak);
  }
  // Warm porch lamps by the entrance, rather than a synthetic point light per window.
  pack(b,-1.08,.65,.25,.12,1.3,.11,oak);pack(b,-1.08,1.35,.25,.34,.09,.34,iron);
  pack(l,-1.08,1.19,.25,.225,.273,.205,0xffbd69);
  return;
 }
 if(!base&&!busy)return;
 // Every operating vendor keeps a small local display. Tourist traffic adds a distinct outer bay.
 round(-.58,.18,.19,.47,.35,.45,oak);round(-.58,.353,.19,.38,.059,.36,0xac9265);
 pack(b,-.10,.16,.13,.41,.31,.40,0x917650);pack(b,-.10,.28,.13,.43,.073,.42,0xb09869);
 if(!busy)return;
 const w=h.kind==='market'?1.82:1.36,roofY=1.52;
 for(const x of [-w/2,w/2]){pack(b,x,.74,-.29,.078,1.48,.078,oak);pack(b,x,.80,.40,.071,1.60,.071,oak);}
 const fy=height(s,originX/C,originZ/C);
 const p3=(a:number,y:number,d:number)=>[originX+tx*a+sx*d,fy+y,originZ+tz*a+sz*d];
 for(let i=0;i<7;i++){
  const a=w*(i/7-.5),c=w*((i+1)/7-.5),color=i%2===0?shade:cream;
  b.quad(p3(a,roofY+.21,.43),p3(c,roofY+.21,.43),p3(c,roofY,-.34),p3(a,roofY,-.34),color,.91+i*.015);
  b.quad(p3(a,roofY,-.34),p3(c,roofY,-.34),p3(c,roofY-.125,-.34),p3(a,roofY-.125,-.34),color,.84);
 }
 pack(b,.08,.51,-.06,w*.84,.11,.53,oak);
 for(let i=0;i<Math.min(5,2+busy);i++){
  const along=w*((i%3)-1)*.265,depth=i<3?-.15:.14;
  round(along,.592,depth,.28,.07,.27,0x9d825b);
  for(let j=0;j<3;j++){const a=along+(j-1)*.058,x=originX+tx*a+sx*depth,z=originZ+tz*a+sz*depth,y=height(s,x/C,z/C)+.658;
   b.shape(lump,x,y,z,.049,.061,.052,tones[(i+h.id)%4],j*2.4);}
 }
}

export function hangingLanterns(s:State,span:LanternSpan,b:Batch,l:Batch){
 const p=pos(span.road),dx=span.axis==='x'?1:0,dz=1-dx;
 const left=foundation(s,cells(span.a.kind,span.a.x,span.a.z,span.a.rot))+(span.a.kind==='inn'?2.70:2.08);
 const right=foundation(s,cells(span.b.kind,span.b.x,span.b.z,span.b.rot))+(span.b.kind==='inn'?2.70:2.08);
 const y=(t:number)=>left*(1-t)+right*t-Math.sin(t*Math.PI)*.35;
 const x=(t:number)=>p.x*C+(t-.5)*5.02*dx,z=(t:number)=>p.z*C+(t-.5)*5.02*dz;
 for(let i=0;i<18;i++){
  const a=i/18,c=(i+1)/18,w=.035;
  const row=(t:number,f:number,h:number)=>[x(t)+dz*f,y(t)+h,z(t)-dx*f];
  b.quad(row(a,0,-w),row(c,0,-w),row(c,0,w),row(a,0,w),0x584a3d);
  b.quad(row(a,-w,0),row(c,-w,0),row(c,w,0),row(a,w,0),0x665447);
 }
 for(const t of [.20,.39,.61,.80]){
  const X=x(t),Y=y(t),Z=z(t),h=.19+rand(span.a.id,Math.round(t*100),s.seed)*.09;
  b.box(X,Y-.081,Z,.040,.173,.040,iron);
  b.shape(basket,X,Y-.17,Z,.29,.058,.29,iron);
  l.shape(basket,X,Y-.20-h*.5,Z,.245,h,.245,0xffbb67,t*6);
  b.shape(basket,X,Y-.20-h,Z,.22,.054,.22,iron);
 }
}

// Soft contact shading is baked into one small terrain-conforming mesh. No realtime shadow maps.
const shadeMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:T.DoubleSide});
export function contactShadows(s:State){
 const xyz:number[]=[],rgba:number[]=[],ix:number[]=[],seg=14;
 for(const b of s.buildings){
  if(b.kind==='farm')continue;
  const {w,d}=dims(b.kind,b.rot),cx=(b.x+(w-1)/2)*C,cz=(b.z+(d-1)/2)*C;
  const start=xyz.length/3,prop=b.kind==='lantern'||b.kind==='garden',rx=prop?.95:w*1.5+.25,rz=prop?.9:d*1.5+.25;
  for(let ring=0;ring<3;ring++)for(let i=0;i<seg;i++){
   const t=i/seg*Math.PI*2,r=[0,.73,1][ring],x=cx+Math.cos(t)*rx*r,z=cz+Math.sin(t)*rz*r;
   xyz.push(x,height(s,x/C,z/C)+.043,z);rgba.push(.033,.040,.029,[.26,.19,0][ring]);
   if(ring<2){const a=start+ring*seg+i,c=start+ring*seg+(i+1)%seg;ix.push(a,c,c+seg,a,c+seg,a+seg);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('color',new T.Float32BufferAttribute(rgba,4));g.setIndex(ix);
 const mesh=new T.Mesh(g,shadeMaterial);mesh.renderOrder=1;return mesh;
}

const warmthMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
export function lanternPools(s:State,spans:LanternSpan[]){
 const v:number[]=[],c:number[]=[],indices:number[]=[],segments=16;
 for(const span of spans){
  const p=pos(span.road),at=v.length/3,crossX=span.axis==='x';
  for(let ring=0;ring<3;ring++)for(let i=0;i<segments;i++){
   const t=i/segments*Math.PI*2,r=[0,.6,1][ring],x=p.x*C+Math.cos(t)*r*(crossX?2.17:1.24),z=p.z*C+Math.sin(t)*r*(crossX?1.24:2.17);
   v.push(x,height(s,x/C,z/C)+.216,z);c.push(.42,.16,.039,[.37,.14,0][ring]);
   if(ring<2){const a=at+ring*segments+i,b=at+ring*segments+(i+1)%segments;indices.push(a,b,b+segments,a,b+segments,a+segments);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('color',new T.Float32BufferAttribute(c,4));g.setIndex(indices);
 const mesh=new T.Mesh(g,warmthMaterial);mesh.renderOrder=2;return mesh;
}
