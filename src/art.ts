import * as T from 'three';
import {C,LO,HI,height,natural,river,rand,noise,lookOf,neighbors,roadProfile,roadPad,roadReach,roadTop,terrainGrader,TERRAIN_DIVISIONS,terraceEdges, key,pos,dims,cells,corners,type State,type Bld,type Pos,type Route} from './sim';
const cube=new T.BoxGeometry(1,1,1).toNonIndexed();
const con=new T.ConeGeometry(1,1,7).toNonIndexed(), stone=new T.IcosahedronGeometry(1,0).toNonIndexed();
const bronzeBell=new T.LatheGeometry([[.54,0],[.54,.10],[.45,.16],[.39,.30],[.34,.69],[.31,.91],[.21,1.03],[.11,1.04]].map(([x,y])=>new T.Vector2(x,y)),12).toNonIndexed();
const col=new T.Color(), col2=new T.Color(), strataTone=new T.Color(0x918b78);
export class Batch{
 p:number[]=[]; colors:number[]=[];
 constructor(public tint?:number){}
 tri(a:number[],b:number[],c:number[],color:number,shade=1){this.p.push(...a,...b,...c);col.setHex(this.tint??color).multiplyScalar(shade);for(let i=0;i<3;i++)this.colors.push(col.r,col.g,col.b);}
 quad(a:number[],b:number[],c:number[],d:number[],color:number,shade=1){this.tri(a,b,c,color,shade);this.tri(a,c,d,color,shade);}
 shape(g:T.BufferGeometry,x:number,y:number,z:number,w:number,h:number,d:number,c:number,angle=0,s=1){const p=g.attributes.position;const si=Math.sin(angle),co=Math.cos(angle);col.setHex(this.tint??c).multiplyScalar(s);for(let i=0;i<p.count;i++){const a=p.getX(i)*w,b=p.getZ(i)*d;this.p.push(x+a*co+b*si,y+p.getY(i)*h,z-a*si+b*co);this.colors.push(col.r,col.g,col.b);}}
 box(x:number,y:number,z:number,w:number,h:number,d:number,c:number,a=0,s=1){this.shape(cube,x,y,z,w,h,d,c,a,s);}
 mesh(material:T.Material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));g.computeVertexNormals();return new T.Mesh(g,material);}
}
const terrainMat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
export const solid=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
export const lamps=new T.MeshBasicMaterial({vertexColors:true,color:0xc5a074});
const green=[0x858858,0x68774c,0x9a9569,0x586e50,0x68755c], fir=[0x364c40,0x435b42,0x546649,0x2d4940,0x5c6f53], rock=[0x77796c,0x656d67,0x8e8c7d];
export function ground(s:State,grade=terrainGrader(s)){
 const v:number[]=[],colors:number[]=[],idx:number[]=[],div=TERRAIN_DIVISIONS,res=73*div,stride=res+1;
 const base=new Int32Array(stride*stride).fill(-1),pads=new Map<string,number>();
 function vertex(i:number,j:number,level?:number){
  const k=j*stride+i,tag=level===undefined?'':`${k}:${level}`,old=level===undefined?base[k]:pads.get(tag)??-1;
  if(old!==-1)return old;
  const x=i/div-36.5,z=j/div-36.5,y=grade(x,z,level??natural(x,z,s.seed),level),n=noise(x*.52,z*.52,s.seed+6);
  const slope=level!==undefined?0:Math.max(Math.abs(natural(x+.2,z,s.seed)-natural(x-.2,z,s.seed)),Math.abs(natural(x,z+.2,s.seed)-natural(x,z-.2,s.seed)));
  const at=v.length/3;if(level===undefined)base[k]=at;else pads.set(tag,at);v.push(x*C,y,z*C);
  col.setHex(y<.25?0xa6946f:y<1.17?0x969365:0x7d8859);
  if(y>=.25){col.lerp(col2.setHex(0x586b50),noise(x*.13,z*.13,s.seed+83)*.58);col.lerp(col2.setHex(0xa19669),n*.38);}
  if(level===undefined&&(y>20||slope>.80)){
   const strata=.5+.5*Math.sin(y*2+x*.16+z*.08+noise(x*.3,z*.3,s.seed+9)*3);
   col2.setHex(0x676b60).lerp(strataTone,strata*.7);col.lerp(col2,Math.min(.87,Math.max(0,slope-.31)+(y>20?.22:0)));
  }else if(y>5)col.lerp(col2.setHex(0x697956),.52);
  col.multiplyScalar(.84+n*.22);colors.push(col.r,col.g,col.b);return at;
 }
 // No triangle spans a terrace boundary: a flat pad and the natural slope each own their edge.
 for(let z=0;z<73;z++)for(let x=0;x<73;x++){
  const level=s.terraces[key(x-36,z-36)];
  for(let j=z*div;j<(z+1)*div;j++)for(let i=x*div;i<(x+1)*div;i++){
   const a=vertex(i,j,level),b=vertex(i,j+1,level),c=vertex(i+1,j,level),d=vertex(i+1,j+1,level);
   idx.push(a,b,c,c,b,d);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return new T.Mesh(g,terrainMat);
}
export function terrace(b:Batch,s:State,p:Pos,top:number,grade?:(x:number,z:number,y:number,level?:number)=>number){
 for(const {dx,dz,points,level} of terraceEdges(s,p,top))for(let i=0;i<points.length-1;i++){
  const a=points[i],c=points[i+1];
  const lowA=grade?.(a.x,a.z,top,top)??top,lowC=grade?.(c.x,c.z,top,top)??top;
  const farA=grade?.(a.x,a.z,a.y,level)??a.y,farC=grade?.(c.x,c.z,c.y,level)??c.y;
  // Clip the wall and its stone courses to the actual opposite edge, on cut AND fill sides.
  // The backing face runs uninterrupted from one surface to the other, including at corners.
  const at=(t:number,y:number,offset=0)=>[(a.x+(c.x-a.x)*t)*C+dx*offset,y,(a.z+(c.z-a.z)*t)*C+dz*offset];
  const adj=(t:number)=>farA+(farC-farA)*t,near=(t:number)=>lowA+(lowC-lowA)*t;
  const split=(lowA-farA)/((farC-farA)-(lowC-lowA));
  function face(lo:number,hi:number,fill:boolean){
   if(hi-lo<1e-6)return;
   const floor=(t:number)=>Math.min(near(t),adj(t)),ceil=(t:number)=>Math.max(near(t),adj(t));
   b.quad(at(lo,floor(lo)),at(hi,floor(hi)),at(hi,ceil(hi)),at(lo,ceil(lo)),0x4f5446);
   // Facade sits a hair into the lower surface, with the continuous backing visible at the joints.
   const offset=fill?.018:-.018,step=.38,start=Math.floor(Math.min(floor(lo),floor(hi))/step),end=Math.ceil(Math.max(ceil(lo),ceil(hi))/step);
   if(end-start>48)return; // Malformed imported heights still get the closed backing face.
   const sign=Math.sign(offset),len=Math.hypot(c.x-a.x,c.z-a.z)*C;
   // Each stone is a shallow chamfered block proud of the mortar bed, so the wall catches raking light.
   function stoneBlock(u:number,v:number,l0:number,l1:number,h0:number,h1:number,color:number,shade:number,depth:number,moss:boolean){
    const out=offset+sign*depth,bev=Math.min(.05,(h0-l0)*.3,(h1-l1)*.3),ct=Math.min(.05/len,(v-u)*.3);
    const back=[at(u,l0,offset),at(v,l1,offset),at(v,h1,offset),at(u,h0,offset)];
    if(bev<.012||ct*len<.012){b.quad(back[0],back[1],back[2],back[3],color,shade);return;}
    const U=u+ct,V=v-ct,lerpY=(y0:number,y1:number,t:number)=>y0+(y1-y0)*(t-u)/(v-u);
    const front=[at(U,lerpY(l0,l1,U)+bev,out),at(V,lerpY(l0,l1,V)+bev,out),at(V,lerpY(h0,h1,V)-bev,out),at(U,lerpY(h0,h1,U)-bev,out)];
    b.quad(front[0],front[1],front[2],front[3],color,shade);
    b.quad(back[3],back[2],front[2],front[3],moss?0x6f7d4f:color,shade*1.12); // top bevel catches sky light
    b.quad(back[0],front[0],front[1],back[1],color,shade*.62);                   // underside stays in shadow
    b.quad(back[0],back[3],front[3],front[0],color,shade*.84);
    b.quad(back[1],front[1],front[2],back[2],color,shade*.84);
   }
   // Coping course: flat capstones overhanging the top of fill walls, where the top edge is the level pad.
   if(fill&&Math.abs(near(lo)-near(hi))<1e-4&&near(lo)-Math.max(adj(lo),adj(hi))>.3){
    const top=near(lo),n=Math.max(1,Math.round((hi-lo)*len/.62));
    for(let k=0;k<n;k++){
     const u=lo+(hi-lo)*k/n+.006,v=lo+(hi-lo)*(k+1)/n-.006,r=rand(p.x*29+i+k,p.z*31+k,s.seed+53),o=offset+sign*(.095+r*.02),y0=top-.17,y1=top+.035;
     const f=[at(u,y0,o),at(v,y0,o),at(v,y1,o),at(u,y1,o)],k0=[at(u,y1,offset-sign*.2),at(v,y1,offset-sign*.2)];
     b.quad(f[0],f[1],f[2],f[3],0x8a887a,.92+r*.16);b.quad(f[3],f[2],k0[1],k0[0],0x8f8d7d,1.08);
     b.quad(at(u,y0,offset),at(v,y0,offset),f[1],f[0],0x8a887a,.55);
     b.quad(at(u,y0,offset),f[0],f[3],at(u,y1,offset),0x8a887a,.8);b.quad(at(v,y0,offset),at(v,y1,offset),f[2],f[1],0x8a887a,.8);
    }
   }
   for(let row=start;row<end;row++){
    const bottom=row*step+.012,cap=(row+1)*step-.013;
    const knots=[lo,hi];for(const y of [bottom,cap]){for(const [u,v] of [[farA,farC],[lowA,lowC]]){const t=(y-u)/(v-u);if(t>lo&&t<hi)knots.push(t);}}
    const joint=(row%2===0?.39:.66);if(joint>lo&&joint<hi)knots.push(joint);knots.sort((u,v)=>u-v);
    for(let j=0;j<knots.length-1;j++){
     const u=knots[j]+(j>0&&knots[j]===joint?.009:0),v=knots[j+1]-(knots[j+1]===joint?.009:0);if(v<=u)continue;
     const l0=Math.max(bottom,floor(u)),l1=Math.max(bottom,floor(v)),h0=Math.max(l0,Math.min(cap,ceil(u))),h1=Math.max(l1,Math.min(cap,ceil(v)));
     if(Math.max(h0-l0,h1-l1)<.005)continue;
     const r=rand(p.x*11+i+(u>=joint?18:0),p.z*13+row,s.seed+7),r2=rand(p.z*7+i,p.x*5+row,s.seed+31);
     stoneBlock(u,v,l0,l1,h0,h1,rock[Math.floor(r*3)],.88+r*.22,.035+r2*.05,row===start&&r2<.45);
    }
   }
  }
  if(split>0&&split<1){face(0,split,lowA>farA);face(split,1,lowC>farC);}else if(Math.max(Math.abs(lowA-farA),Math.abs(lowC-farC))>1e-6)face(0,1,lowA+lowC>=farA+farC);
 }
}
export function scenery(s:State,used:Set<string>){const b=new Batch();for(let z=-34;z<=34;z++)for(let x=-34;x<=34;x++){const r=rand(x,z,s.seed+41),px=x+(rand(x,z,s.seed+26)-.5)*.82,pz=z+(rand(x,z,s.seed+25)-.5)*.82,y=height(s,px,pz);if(y<.42||used.has(key(x,z))||s.terraces[key(x,z)]!==undefined)continue;
 let density=y>4?.63:y<1.37?.055:.16;density*=.55+noise(x*.17,z*.17,s.seed+120)*.85;if(r<density){const tall=(1.4+rand(x,z,73)*3.6)*(y>3?1.23:.8);const pine=r>.07||y>5,color=pine?fir[Math.floor(rand(x,z,27)*fir.length)]:[0x98754d,0xa86a4e,0x8e8050][x*x%3]; const tx=px*C,tz=pz*C;b.box(tx,y+tall*.29,tz,tall*.075,tall*.68,tall*.075,0x564536,r*8);if(pine)for(let i=0;i<4;i++){const w=tall*(.29-i*.051);b.shape(con,tx,y+tall*(.47+i*.17),tz,w,tall*(.51-i*.043),w,color,r*20+i*.55,.86+i*.09);}else{for(let i=0;i<4;i++)b.shape(stone,tx+Math.sin(i*2.4)*tall*.32,y+tall*(.57+i*.12),tz+Math.cos(i*2.4)*tall*.28,tall*.38,tall*.38,tall*.36,color,i,.8+i*.1);}}
 else if(r>.87&&y>1.6){const a=.15+(r-.87)*7;b.shape(stone,px*C,y-.07,pz*C,a,a*.7,a*.91,rock[Math.floor(rand(x,z,99)*3)],r*18,.85+rand(x,z,91)*.3);}else if(r>.58&&y<1.5){for(let i=0;i<3;i++)b.shape(con,px*C+i*.13,y+.13,pz*C-i*.15,.08,.32+i*.06,.08,0x9d9b62,i);}}
 return b.mesh(solid);}
const wood=0x573f33,trim=0x372c28,plaster=0xcfb995,paper=0xe6c483,stoneBase=0x7d786b,red=0x904c3b;
export function foundation(s:State,p:Pos[]){return Math.max(...corners(s,p))+.07;}
export function building(out:Batch, lit:Batch,s:State,b:Bld){const dim=dims(b.kind,b.rot),X=(b.x+(dim.w-1)/2)*C,Z=(b.z+(dim.d-1)/2)*C,Y=foundation(s,cells(b.kind,b.x,b.z,b.rot)),base=Math.min(...corners(s,cells(b.kind,b.x,b.z,b.rot)));const style=b.style??rand(b.x,b.z,s.seed+52),angle=b.rot*Math.PI/2+(b.grown?(style-.5)*.075:0),si=Math.sin(angle),co=Math.cos(angle);const pt=(x:number,y:number,z:number)=>[X+x*co+z*si,Y+y,Z-x*si+z*co];const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:number,shade=1)=>{const p=pt(x,y,z);out.box(p[0],p[1],p[2],w,h,d,c,angle,shade);};const glow=(x:number,y:number,z:number,w:number,h:number,d:number,c=0xffbd65)=>{const p=pt(x,y,z);lit.box(p[0],p[1],p[2],w,h,d,c,angle);};
 const W=(b.rot%2?dim.d:dim.w)*C,D=(b.rot%2?dim.w:dim.d)*C,r=style,v=lookOf(s.seed,b);
 if(b.kind==='lantern'){
  const ground=height(s,b.x,b.z)-Y;
  box(0,ground+.04,0,1.38,.21,1.34,0x777c67);
  box(0,ground+.20,0,.77,.17,.72,stoneBase);
  box(0,ground+.63,0,.29,.84,.28,0x777a6e);
  box(0,ground+1.04,0,.69,.14,.68,stoneBase);
  glow(0,ground+1.27,0,.41,.36,.41);
  for(const x of [-1,1])for(const z of [-1,1])box(x*.242,ground+1.25,z*.235,.10,.42,.10,0x787e71);
  box(0,ground+1.47,0,.75,.13,.75,stoneBase);
  const a=pt(0,ground+1.58,0);out.shape(stone,a[0],a[1],a[2],v?.57:.55,v?.17:.26,v?.57:.53,0x777a6e,angle+(v?.78:.2));
  box(0,ground+1.77,0,.19,.18,.19,0x858476);
  return;
 }
 if(b.kind==='garden'){
  const g=height(s,b.x,b.z)-Y, shade=[0xad7452,0xa75f45,0xb58652][Math.floor(r*3)];
  const blob=(x:number,y:number,z:number,w:number,h:number,d:number,c:number,a:number)=>{const p=pt(x,g+y,z);out.shape(stone,p[0],p[1],p[2],w,h,d,c,a+angle);};
  blob(-.22,-.02,-.18,1.19,.29,1.12,0x778252,.8);
  if(!v)box(-.34,g+.55,-.36,.15,1.1,.15,wood,1);
  const nodes=[[-.64,1.19,-.46,.57],[-.28,1.46,-.57,.53],[.05,1.25,-.34,.54],[-.44,1.63,-.29,.49],[-.73,1.40,-.17,.43]];
  if(v===0)for(const [x,y,z,a] of nodes)blob(x,y,z,a,.37,a,shade,y*3);
  else if(v===1){blob(-.31,.32,-.40,.59,.61,.57,0x7f8270,1.8);for(let i=0;i<5;i++)box(-.86+i*.41,g+.023,(i%2)*.36-.19,.35,.042,.80,0xa5997a);}
  else for(let i=0;i<7;i++){const x=-.88+(i%3)*.38,z=-.58+Math.floor(i/3)*.26,h=.94+rand(i,b.id)*.91;box(x,g+h*.5,z,.071,h,.071,0x788452);blob(x,g+h,z,.22,.32,.18,0x788253,i);}

  blob(.75,.04,-.58,.53,.46,.43,0x73786b,2);blob(.49,.02,-.33,.32,.24,.29,0x858776,1);
  for(let j=0;j<4;j++){const x=(j-1.6)*.48, z=.53+Math.sin(j*1.19)*.21;const p=pt(x,0,z);box(x,height(s,p[0]/C,p[2]/C)-Y+.034,z,.38,.11,.32,rock[j%3],.84+j*.02);}
  return;
 }
 // Passage pieces straddle, rather than stand on, the walkable paving beneath them.
 if(b.kind==='templegate'||b.kind==='cloister'||b.kind==='belfry'){
  const timber=v?0x6d5441:0x8d4838,tiles=v?0x736450:0x485d59;
  const pier=(x:number,z:number,top:number,size:number)=>{const p=pt(x,0,z),floor=height(s,p[0]/C,p[2]/C)-Y;
   box(x,floor+.09,z,size*1.59,.28,size*1.59,stoneBase);box(x,(top+floor+.18)/2,z,size,top-floor-.18,size,timber);
   box(x,top-.14,z,size*1.36,.20,size*1.34,trim);
  };
  if(b.kind==='templegate'){
   for(const x of [-1.16,1.16])pier(x,0,2.62,.227);
   for(const x of [-.91,.91]){box(x,2.21,-.06,.26,.13,.35,trim);glow(x,2.01,.078,.16,.24,.16);}
   box(0,2.49,0,2.54,.18,.29,timber);box(0,2.66,0,2.70,.17,.42,timber);
   box(0,2.41,.168,.63,.31,.08,wood);box(0,2.43,.216,.36,.021,.032,0xb69b64);
   roof(2.95,1.84,2.70,.46,tiles,.12);return;
  }
  if(b.kind==='cloister'){
   for(const x of [-1.14,1.14])for(const z of [-2.58,0,2.58])pier(x,z,2.51,.148);
   for(const x of [-1.14,1.14])box(x,2.46,0,.17,.16,5.51,timber);
   for(const z of [-2.58,0,2.58])box(0,2.45,z,2.41,.13,.16,timber);
   roof(2.89,5.92,2.58,.62,tiles,.10);return;
  }
  box(0,.10,0,2.56,.20,2.52,stoneBase);
  for(const x of [-.92,.92])for(const z of [-.82,.82])pier(x,z,2.62,.182);
  box(0,2.51,0,2.09,.19,.22,timber);box(0,2.32,0,.077,.32,.078,trim);
  const col=pt(0,1.16,-.078);out.shape(bronzeBell,col[0],col[1],col[2],.97,1.10,.97,0x8b7652,angle);
  const ring=pt(0,1.26,-.078);out.shape(bronzeBell,ring[0],ring[1],ring[2],.975,.048,.974,0xa38c5e,angle);
  box(.12,1.13,.42,.094,.11,1.09,wood);roof(2.82,2.65,2.65,.76,tiles);return;
 }
 const groundD=Y-base,raised=groundD>.59&&(b.kind==='home'||b.kind==='rowhouse');
 const groundAt=(x:number,z:number)=>{const p=pt(x,0,z);return height(s,p[0]/C,p[2]/C)-Y;};
 const plinthW=W-(b.grown?.65:.31),plinthD=D-(b.grown?.61:.31);
 if(raised){
  box(0,-.077,0,plinthW,.171,plinthD,stoneBase);box(0,-.18,0,plinthW-.16,.13,plinthD-.17,wood);
  const nx=W<C*1.4?2:3;
  for(let i=0;i<nx;i++)for(const side of [-1,0,1]){
   const x=(i/(nx-1)-.5)*(plinthW-.43),z=side*(plinthD/2-.29),y=groundAt(x,z)-.072;
   if(y<-.23){box(x,y+.10,z,.47,.24,.46,rock[(i+side+3)%3]);box(x,(y-.07)/2,z,.205,Math.max(.12,-y-.07),.209,wood);}
  }
  for(const side of [-1,1]){box(side*(plinthW/2-.25),-.29,0,.18,.19,plinthD-.21,wood);box(0,-.29,side*(plinthD/2-.25),plinthW-.19,.19,.19,wood);}
 }else{
  // Short masonry courses on shallow slopes; thicker stone lifts on the downhill side only.
  box(0,-.087,0,plinthW,.188,plinthD,stoneBase);
  for(const side of [-1,1])for(const along of [false,true]){
   const span=along?plinthD:plinthW,edge=along?plinthW:plinthD,n=Math.max(1,Math.ceil(span/.61));
   for(let i=0;i<n;i++){
    const u=(i+.5)*span/n-span/2,x=along?side*(edge/2-.095):u,z=along?u:side*(edge/2-.089),floor=groundAt(x,z)-.095;
    for(let j=0;j<Math.min(8,Math.ceil(Math.max(.13,-floor)/.234));j++){
     const top=-j*.234-.06,bot=Math.max(floor,top-.22),offset=(j%2?-.036:.032);if(top-bot<.02)continue;
     box(x+(along?0:offset),(top+bot)/2,z+(along?offset:0),along?.23:span/n-.027,top-bot,along?span/n-.027:.23,rock[Math.floor(rand(i,j,b.id+side+(along?9:0))*3)],.88+rand(j,i,b.id)*.18);
    }
   }
  }
  // A dark inner footing closes narrow hillside sightlines behind the dressed courses.
  box(0,-groundD/2-.09,0,plinthW-.27,groundD+.17,plinthD-.27,0x6f6b5a);
 }
 if(b.grown&&b.kind!=='stall'){
  if(r>.38){const a=pt(-W*.29,.14,D*.35);out.shape(stone,a[0],a[1],a[2],.33,.29,.27,0x778558,r*8);}
  if(r<.78){const a=pt(W*.25,.20,D*.33);out.shape(stone,a[0],a[1],a[2],.25,.31,.25,0x9f7752,r*11);}
 }
 function entry(z:number,w:number,y=.12){
  const run=Math.max(.70,Math.min(1.40,D*.5-z+.38)),foot=groundAt(0,z+run)+.047,rise=y-foot;
  if(rise<.16)return;const n=Math.min(8,Math.ceil(rise/.18));
  for(let i=0;i<n;i++){const zz=z+run*(1-(i+.5)/n),top=foot+rise*(i+1)/n,low=Math.min(top-.04,groundAt(0,zz)-.065);
   box(0,(top+low)/2,zz,w,top-low,run/n+.017,rock[(b.id+i)%3]);}
 }
 if(b.kind==='farm'){
  for(let i=0;i<3;i++){
   const x=(i-1)*2.77,width=v===1&&i===1?2.12:2.62;
   box(x,.008,0,width,.045,5.18,v===1?0x616e58:0x576f5a);box(x-1.37,.07,0,.14,.18,5.54,0x88765a);
   if(v===1&&i===1){box(x-1.15,.045,0,.33,.07,5.20,0x6a8c80);box(x-.97,.50,-2.07,.067,.87,.07,wood);box(x-1.09,.75,-2.07,.36,.066,.07,wood);}
   for(let j=0;j<8;j++)for(let k=0;k<5;k++){
    if((v===1&&i===1&&k===0)||(v===2&&i===2&&j<3&&k>1))continue;
    const rr=rand(i*13+j,k,b.id),p=pt(x+(k-2)*.42,.13,(j-3.5)*.61);
    out.shape(con,p[0],p[1],p[2],.09+rr*.05,.21+rr*.19,.09,[0xa2a65d,0xb4af66,0x798d58][(k+j)%3],rr*6);
   }
  }
  if(v===2){const x=3.10,z=-1.89;for(const sx of [-1,1])for(const sz of [-1,1])box(x+sx*.42,.59,z+sz*.36,.09,1.14,.09,wood);box(x,1.20,z,1.12,.15,1.04,0x837359);box(x,.23,z,.52,.44,.48,0x987e55);}
  box(0,.06,2.64,W-.32,.18,.22,0x857554);box(0,.06,-2.64,W-.32,.18,.22,0x857554);return;
 }
 function roof(w:number,d:number,y:number,rise:number,cl:number,hip=.17){const t=(u:number,v:number)=>pt(u*(w/2)*(1-hip*(1-v)),y+rise*(1-v)**1.52+.32*Math.pow(Math.abs(u),6)*(v*.8+.2),v*d/2);const sideP=(u:number,v:number,j:number)=>{const a=t(u,v);return j===1?a:pt(u*(w/2)*(1-hip*(1-v)),a[1]-Y,-v*d/2);};for(const j of [-1,1]){ const tiles=Math.max(9,Math.floor(w/.39)),runs=9;for(let i=0;i<tiles;i++)for(let k=0;k<runs;k++){const u=-1+i*2/tiles,v=k/runs,u2=u+2/tiles,v2=(k+1)/runs, sh=.86+rand(i,k,b.id+j)*.26;const a=sideP(u,v,j),b0=sideP(u,v2,j),c=sideP(u2,v2,j),d0=sideP(u2,v,j);if(j===1)out.quad(a,b0,c,d0,cl,sh);else out.quad(d0,c,b0,a,cl,sh);if(k%2===1){const end=c.map((m,i)=>(m+b0[i])*.5);end[1]+=.037;out.tri(b0,end,d0,cl,.64);}}for(let i=0;i<tiles;i++){const u=-1+(i+.5)*2/tiles;const a=sideP(u,1,j);out.shape(stone,a[0],a[1]+.03,a[2],.177,.10,.119,cl,angle,.65);}}
 for(const j of [-1,1]){const tip=sideP(j,0,1),c=pt(j*w*.5,y,d/2),e=pt(j*w*.5,y,-d/2);out.tri(tip,e,c,cl,.72);}
 box(0,y+rise+.11,0,w*(1-hip)+.2,.23,.26,trim);for(const side of [-1,1]){box(side*w*(1-hip)*.49,y+rise+.23,0,.38,.17,.33,trim);const p=pt(side*w*(1-hip)*.49,y+rise+.31,0);out.shape(stone,p[0],p[1],p[2],.19,.23,.12,cl,angle);}}
 function store(w:number,d:number,y:number,h:number,tem=false){const accent=tem?red:wood;box(0,y+.09,0,w+.23,.18,d+.21,wood);box(0,y+h*.51,0,w-.10,h,d-.10,tem?0xd5c49a:plaster);for(const si of [-1,1]){for(let i=0;i<5;i++){const x=(i-2)*(w/4);box(x,y+h*.52,si*d/2,.13,h+.12,.15,accent);if(i<4){const a=x+w/8;box(a,y+h*.58,si*(d/2+.016),w*.168,h*.44,.058,trim);glow(a,y+h*(i===1&&si===1?.43:.58),si*(d/2+.051),w*.14,h*(i===1&&si===1?.65:.36),.028,paper);for(let t=-1;t<=1;t++)box(a+t*w*.032,y+h*.58,si*(d/2+.07),.043,h*.38,.027,accent);box(a,y+h*.56,si*(d/2+.07),w*.16,.055,.027,accent);}}for(let i=-1;i<=1;i++)box(si*w/2,y+h*.51,i*d*.43,.16,h+.12,.13,accent);box(0,y+h*.83,si*d/2,w+.15,.15,.11,accent);box(0,y+h*.95,si*(d/2+.026),w+.26,.18,.26,accent);for(let k=0;k<9;k++)box((k-4)*w/8,y+h*.99,si*(d/2+.19),.11,.15,.47,accent);}box(0,y+h,0,w+.33,.21,d+.30,accent);}
 // A small stack of delivered boards lets players spot a building nearing its next stage.
 if(b.progress!==undefined&&b.progress>=2&&b.tier!==2){
  const x=W*.31,z=D*.32;for(let i=0;i<4;i++)box(x,.095+i*.067,z,.67,.059,.245,i%2?0xa2835a:0x8b6c46);
  box(x+.19,.18,z,.067,.25,.257,trim);
 }
 if(b.kind==='rowhouse'){
  const w=b.grown?1.61+r*.39:2.01,d=b.grown?3.84+r*.51:4.58,h=b.grown?1.56+r*.61:1.96;store(w,d,.16,h);
  const tiles=r>.69?0x4d5859:r>.32?0x5c6662:0x706454;
  if(b.tier===2){const uy=h+.20,uw=w-.20,ud=d-.39;box(0,uy,0,w+.24,.15,d+.27,wood);store(uw,ud,uy,1.28);roof(uw+.70,ud+.85,uy+1.28,.80+r*.39,tiles);}
  else roof(w+.65,d+.77,h+.16,.75+r*.48,tiles);
  // Small slatted entry and a cloth valance across the narrow street front.
  box(0,.14,d/2+.25,1.55,.26,.51,wood);entry(d/2+.40,1.30,.18);
  if(v===0)for(let i=-2;i<=2;i++)box(i*.226,1.41,d/2+.109,.21,.43,.09,r>.63?0x8e5846:0x5a7068);
  if(v===1){box(0,1.65,d/2+.35,1.72,.16,.58,trim);for(const x of [-.77,.77])box(x,.8,d/2+.53,.074,1.63,.073,wood);}
  if(v===2){for(let i=-3;i<=3;i++)box(i*.20,1.01,d/2+.098,.065,.94,.058,wood);for(let i=0;i<3;i++)box(0,.65+i*.32,d/2+.101,1.35,.061,.058,wood);}

  box(0,1.66,d/2+.117,1.19,.062,.105,trim);
  glow(.76,1.32,d/2+.185,.17,.29,.17);box(.76,1.50,d/2+.185,.25,.08,.25,wood);
  return;
 }
 if(b.kind==='stall'){
  const canvas=[0xa76e53,0x78856b,0x697e7b,0xa28859][Math.floor(r*4)];
  if(b.tier===2){
   const tw=2.14,td=1.94,h=b.specialty==='tea'?1.83:b.specialty==='rice'?1.69:2.04;
   store(tw,td,.12,h);roof(tw+.54,td+.59,h+.12,b.specialty==='timber'?.63:.87,b.specialty==='tea'?0x4e6662:b.specialty==='rice'?0x63574c:0x615d53);
   box(0,.62,td/2+.21,1.83,.15,.37,wood);box(0,h-.11,td/2+.10,1.96,.20,.09,trim);
   if(b.specialty==='tea'){
    for(let i=-2;i<=2;i++)box(i*.305,1.34,td/2+.15,.286,.49,.049,i%2?0xc1b290:0x758477);
    for(const x of [-.66,.68]){glow(x,1.14,td/2+.24,.18,.25,.18);box(x,1.29,td/2+.24,.25,.069,.25,trim);}
    box(.41,.29,td/2+.37,.89,.09,.30,0x7d5a3c);
   }else if(b.specialty==='rice'){
    for(let i=-2;i<=2;i++){const a=pt(i*.29,.79,td/2+.19);out.shape(stone,a[0],a[1],a[2],.135,.16,.16,0xa89b70,angle+i*.4);}
   }else{
    for(let j=0;j<5;j++)box(-.86+j*.129,.24+j%2*.13,td/2+.24,.105,.09,.50,j%2?0x9a7751:0x836745);
    for(const s of [-1,1])box(s*.92,.78,td/2+.26,.09,1.5,.086,wood);
   }
   return;
  }
  for(const x of [-1,1])for(const z of [-1,1])box(x*.87,.89,z*.62,.10,1.78,.10,wood);
  box(0,.59,.40,1.91,.12,.94,wood);box(0,.29,.49,1.67,.58,.69,0x6c5441);box(0,1.62,.02,1.9,.08,1.52,trim);
  if(v===1)roof(2.65,2.23,1.75,.48,0x626e65,.10);
  for(let i=-4;i<=4;i++){
   if(v!==1){const shade=v===2?(i<-1?0xb09c70:0x8e7851):i%2===0?canvas:0xd1be92;box(i*.268,1.79,.05,.269,.075,1.92,shade);box(i*.268,1.68,1.00,.269,.19,.045,shade);}
   if(i%2===0&&i!==-4){if(v===2){const a=pt(i*.205,.77,.48);out.shape(stone,a[0],a[1],a[2],.21,.16,.20,0xab9365,angle+i*.9);}else box(i*.205,.75,.48,.27,.16+rand(i,b.id,8)*.13,.41,[0x997c50,0xa97452,0x849057][(i+4)%3]);}
  }
  return;
 }
 if(b.kind==='temple'){const w=W*.77,d=D*.68;for(let t=0;t<6;t++)box(0,.065+t*.083,d*.49+.85-t*.18,3.5,.145,.47,stoneBase);box(0,.29,0,w+1.05,.54,d+1.05,stoneBase);for(const si of [-1,1]){box(si*(w/2+.45),.83,0,.105,.11,d+.9,red);for(let i=-3;i<=3;i++)box(si*(w/2+.45),.59,i*d/6,.1,.51,.1,red);}
 if(v===1){store(w,d,.55,2.64,true);roof(w+1.45,d+1.52,3.19,1.66,0x4f605e,.12);for(const si of [-1,1]){box(si*w*.32,1.69,d/2+.38,.24,2.28,.24,red);glow(si*w*.32,2.16,d/2+.68,.34,.39,.29);}return;}
 if(v===2){
  const tw=w*.73,td=d*.74;for(const x of [-1,1])for(const z of [-1,1]){box(x*tw*.46,2.02,z*td*.45,.36,2.94,.36,red);box(x*tw*.46,.68,z*td*.45,.62,.28,.62,stoneBase);}
  box(0,3.40,0,tw,.39,.28,trim);box(0,3.53,0,tw+.28,.26,td+.29,red);box(0,3.12,0,.21,.62,.19,trim);
  for(let i=0;i<7;i++){const column=pt(0,1.34+i*.22,0),w=1.03-i*.062;out.shape(stone,column[0],column[1],column[2],w,.38,w,0x827251,angle+i*.12);}
  box(0,1.03,.44,.16,.14,1.75,0x71523c);roof(tw+1.57,td+1.97,3.66,1.28,0x495c58);roof(tw*.61+1.06,td*.54+1.15,4.67,.83,0x526764);
  for(const si of [-1,1]){box(si*1.81,1.26,td/2+.59,.17,1.4,.17,red);glow(si*1.81,1.75,td/2+.59,.30,.34,.31);}
  return;
 }
 store(w,d,.55,2.4,true);roof(w+1.35,d+1.58,2.95,1.38,0x4f605e);store(w*.59,d*.62,3.65,1.87,true);roof(w*.59+1.05,d*.62+1.20,5.52,1.10,0x4e5c5a);store(w*.31,d*.39,6.07,1.12,true);roof(w*.31+.94,d*.39+1.04,7.19,.89,0x4c5a59);box(0,8.4,0,.11,1.04,.11,0x9b7b4d);for(let i=0;i<5;i++)box(0,8.09+i*.17,0,.45-i*.058,.07,.45-i*.058,0x9b7b4d);for(const si of [-1,1]){box(si*2.25,1.03,d/2+.9,.17,1.24,.17,red);glow(si*2.25,1.61,d/2+.9,.33,.4,.33);box(si*2.25,1.85,d/2+.9,.46,.13,.46,trim);}return;}
 const w=W*(b.kind==='market'?.84:b.kind==='home'?.70+r*.092:.8),d=D*(b.kind==='home'?.59+r*.102:.67);
 if(b.kind==='market'){
  if(v===2){for(const x of [-1,1])for(const z of [-1,1])box(x*3.25,1.18,z*1.50,.19,2.35,.19,red);box(0,2.32,0,6.89,.18,3.38,wood);roof(7.96,4.61,2.43,1.19,0x58675f,.11);}
  for(let i=-1;i<=1;i++){
   const x=i*2.48,z=v===1?(i===0?-.44:.39):0,y=v===1?(i===0?2.13:1.82):1.91;
   for(let j=0;j<2;j++)for(const si of [-1,1])box(x+si*.97,y*.46,j*2.25-.9+z,.10,y*.92,.10,wood);
   box(x,.61,.57+z,2.09,.17,1.19,wood);
   for(let j=0;j<7;j++){
    const rr=rand(i,j,b.id),cover=j%2===0?[0xa46751,0x627772,0xa57c4c][i+1]:0xccbd94;
    if(v!==2)box(x+(j-3)*.302,y,.22+z,.299,.084,2.58,cover);
    if(v===2&&j%2===0)box(x+(j-3)*.282,1.20,1.25,.171,.78,.034,cover);
    box(x+(j-3)*.285,.82,.63+z,.21,.29*rr+.08,.35,[0x997c50,0x879557,0xad7540][j%3]);
   }
  }return;
 }
 const h=b.kind==='inn'?3.35:b.kind==='work'?1.9:1.47+r*.49,palette=[0x646158,0x5c6662,0x535b5c,0x756a57,0x535451],tiles=palette[Math.floor(r*palette.length)];
 store(w,d,.15,h);
 if(b.kind==='home'&&b.tier===2){const uw=w*(v===1?.89:.78),ud=d*.83,uy=h+.142;
  box(0,uy,0,w+.26,.17,d+.28,wood);store(uw,ud,uy,1.42+r*.26);roof(uw+.84,ud+1.01,uy+1.42+r*.26,1.02,tiles);
  if(v===1){box(0,uy+.18,d*.39,w+.20,.12,.65,wood);box(0,uy+.58,d*.48,w+.20,.089,.091,wood);for(let i=-3;i<=3;i++)box(i*w/7,uy+.36,d*.48,.05,.49,.052,wood);}
 }else roof(w+(v===1?.96:.83),d+(v===1?.99:.85),h+.15,b.kind==='inn'?1.43:(v===1?.80:v===2?1.34:.97)+r*.32,tiles,v===1?.08:.17);
 box(0,.14,d/2+.27,w*.48,.27,.64,wood);if(b.kind==='home')entry(d/2+.48,w*.45,.18);
 if(b.kind==='home'){
  if(v===1){for(const i of [-1,1])box(i*w*.34,.66,d/2+.46,.073,1.31,.074,wood);box(0,1.27,d/2+.28,w*.78,.116,.65,tiles);}
  if(v===2){box(w*.27,.69,d/2+.21,w*.42,1.20,.47,wood);glow(w*.27,.81,d/2+.459,w*.29,.45,.026,paper);box(w*.27,1.29,d/2+.215,w*.48,.12,.64,tiles);for(let i=-2;i<=2;i++)box(w*.27+i*.108,.81,d/2+.482,.026,.49,.03,trim);}
  if(b.grown&&r>.52&&v===0)for(let i=-2;i<=2;i++)box(i*.34,1.33,d/2+.095,.32,.37,.06,r>.78?0x96664d:0x687e73);
 }
 if(b.kind==='work'){
  if(v===0){box(w*.27,h+1.1,-d*.25,.46,1.33,.49,stoneBase);box(w*.27,h+1.78,-d*.25,.57,.14,.61,trim);for(let i=0;i<5;i++)box(-w*.42+i*.24,.25,d/2+.40,.17,.22,.68,wood);}
  if(v===1){box(-.35,.59,d/2+.34,2.23,.129,.58,wood);for(const x of [-1.23,.47])box(x,.29,d/2+.34,.10,.58,.37,wood);for(let i=0;i<5;i++)box(-.34,.68+i*.052,d/2+.23,1.35,.053,.11,i%2?0xa0825b:0x917149);}
  if(v===2){for(const x of [-1.17,1.17])box(x,.72,d/2+.41,.095,1.44,.095,wood);for(let j=0;j<3;j++){box(0,.25+j*.35,d/2+.41,2.4,.082,.48,wood);for(let i=0;i<4;i++)box((i-1.5)*.51,.36+j*.35,d/2+.42,.39,.15,.32,[0x927754,0x9b8055,wood][(i+j)%3]);}}
 }
 if(b.kind==='inn'){
  box(0,2.02,0,w+.37,.16,d+.39,red);
  if(v===1){box(0,1.68,d/2+.30,w+.18,.14,.68,wood);box(0,2.14,d/2+.62,w+.15,.074,.10,red);for(let i=-4;i<=4;i++)box(i*w/9,1.92,d/2+.62,.067,.48,.067,red);}
  if(v===2){box(0,1.47,d/2+.21,w*.82,.098,.54,tiles);for(let i=-1;i<=1;i++){glow(i*.62,1.27,d/2+.46,.22,.25,.23);box(i*.62,1.42,d/2+.46,.26,.061,.27,trim);}}
  for(const si of [-1,1]){box(si*w*.33,1.35,d/2+.16,.08,.63,.37,trim);glow(si*w*.33,1.06,d/2+.34,.28,.42,.28);box(si*w*.33,1.29,d/2+.34,.36,.10,.36,trim);}
 }

}
export function path(batch:Batch,s:State,p:Pos,r:Route,net=true,preview?:Set<string>,grade?:(x:number,z:number,y:number)=>number){
 const {x,z}=p,X=x*C,Z=z*C,Y=r.y??height(s,x,z),stoneColor=net?0xa39b82:0x9c886e;
 if(r.kind==='bridge'){
  const a=r.axis==='x'?Math.PI/2:0;
  for(let i=-3;i<=3;i++)batch.box(X+Math.sin(a)*i*.426,Y+.03,Z+Math.cos(a)*i*.426,1.94,.22,.432,0x8e664c,a,.88+(i+3)*.027);
  for(const si of [-1,1]){const xx=X+si*Math.cos(a)*.96,zz=Z-si*Math.sin(a)*.96,low=Math.min(Y-.1,height(s,x,z));batch.box(xx,(Y+low)/2,zz,.16,Y-low+1.3,.16,red);batch.box(xx,Y+.58,zz,.13,.14,3.0,red,a);batch.box(xx,Y+.26,zz,.08,.07,3.0,wood,a);}
  return;
 }
 const court=r.kind==='court',Y0=roadTop(s,p,r),grid=court?6:3;
 const get=(a:Pos):Route|undefined=>preview?.has(key(a.x,a.z))?{kind:r.kind}:s.roads[key(a.x,a.z)];
 const wx=roadPad(s,p,'x',r,get),wz=roadPad(s,p,'z',r,get);
 const link=(a:Pos)=>{
  const o=get(a);if(!o||Math.abs(roadTop(s,a,o)-Y0)>2.60)return;
  if(o.kind==='bridge'&&(a.x!==x?'x':'z')!==o.axis)return;return o;
 };
 const pad=(wx:number,wz:number)=>court?height(s,wx/C,wz/C)+.10:Y0;
 const support=(a:number[],c:number[],color:number)=>{
  const floor=(k:number[])=>[k[0],Math.min(k[1]-.09,(grade?.(k[0]/C,k[2]/C,height(s,k[0]/C,k[2]/C))??height(s,k[0]/C,k[2]/C))-.095),k[2]];
  batch.quad(a,c,floor(c),floor(a),color);
 };
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const x0=X-wx+i*wx*2/grid,x1=X-wx+(i+1)*wx*2/grid,z0=Z-wz+j*wz*2/grid,z1=Z-wz+(j+1)*wz*2/grid;
  const a=[x0,pad(x0,z0),z0],b=[x0,pad(x0,z1),z1],c=[x1,pad(x1,z1),z1],d=[x1,pad(x1,z0),z0];
  batch.quad(a,b,c,d,court?0xa8a498:stoneColor,.88+rand(x*7+i,z*7+j,s.seed+3)*.20);
  if(i===0&&!link({x:x-1,z}))support(b,a,0x817a64);
  if(i===grid-1&&!link({x:x+1,z}))support(d,c,0x817a64);
  if(j===0&&!link({x,z:z-1}))support(a,d,0x817a64);
  if(j===grid-1&&!link({x,z:z+1}))support(c,b,0x817a64);
 }
 for(const q of neighbors(p)){
  const r2=link(q);if(!r2)continue;
  const k=key(q.x,q.z),dx=q.x-x,dz=q.z-z,virtual=!!preview?.has(k);
  if((!preview||virtual)&&r2.kind!=='bridge'&&(dx<0||dz<0))continue;
  if(court&&r2.kind==='court')continue;
  const axis=dx?'x':'z';
  const lo=roadReach(s,p,axis,r,get),hi=1-roadReach(s,q,axis,r2,get),width=.96;
  const pt=(s:number,v:number,y:number)=>[X+dx*s*C+dz*v,y,Z+dz*s*C-dx*v];
  let prev:number|undefined;
  for(const [i,seg] of roadProfile(s,p,q,r,r2,get).entries()){
   const a=Math.max(lo,seg.from),b=Math.min(hi,seg.to);if(b-a<1e-6)continue;
   const f=(t:number)=>seg.y0+(seg.y1-seg.y0)*((t-seg.from)/(seg.to-seg.from));
   const y0=f(a),y1=f(b);
   if(prev!==undefined&&Math.abs(prev-y0)>1e-6)batch.quad(pt(a,-width,prev),pt(a,-width,y0),pt(a,width,y0),pt(a,width,prev),0x7e7764);
   for(let lane=0;lane<3;lane++){
    const u=width*(lane*2/3-1),v=u+width*2/3;
    batch.quad(pt(a,u,y0),pt(b,u,y1),pt(b,v,y1),pt(a,v,y0),stoneColor,.89+rand(x*17+lane,z*21+i,s.seed+99)*.18);
   }
   for(const side of [-1,1])support(pt(a,side*width,y0),pt(b,side*width,y1),0x857d6b);
   prev=y1;
  }
 }

}
export function gate(b:Batch,s:State){const x=-5*C,z=24*C,y=height(s,-5,24);for(const si of [-1,1]){b.box(x+si*1.48,y+1.69,z,.34,3.4,.37,red);b.box(x+si*1.48,y+.16,z,.56,.35,.56,stoneBase);}b.box(x,y+2.68,z,3.85,.26,.27,red);b.box(x,y+3.37,z,4.49,.33,.39,red);b.box(x,y+3.59,z,5.03,.15,.58,trim);b.box(x,y+3.07,z,1.03,.51,.19,trim);}
export function waterMesh(s:State){const pts=[],idx=[];for(let i=0;i<=150;i++){const z=-37+74*i/150,x=river(z,s.seed);pts.push((x-5.3)*C,.073,z*C,(x+5.3)*C,.073,z*C);if(i<150){const p=i*2;idx.push(p,p+2,p+1,p+1,p+2,p+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);const material=new T.ShaderMaterial({uniforms:{t:{value:0},night:{value:0},mist:{value:new T.Color(0xbfc4ad)}},vertexShader:`varying vec3 w;varying float d;void main(){w=position;vec4 p=modelViewMatrix*vec4(position,1.);d=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 w;varying float d;uniform float t,night;uniform vec3 mist;void main(){ float r=sin(w.z*1.83+w.x*.24+t*.83+sin(w.x*.57+w.z*.09)*1.3);float s=sin(w.x*.92+w.z*.64-t*.76);float glint=smoothstep(.85,1.,r*s);vec3 a=mix(vec3(.23,.39,.35),vec3(.05,.15,.20),night);vec3 b=mix(vec3(.48,.6,.53),vec3(.15,.26,.33),night);vec3 cl=mix(a,b,.35+.12*r+.06*s)+glint*.061;gl_FragColor=vec4(mix(cl,mist,smoothstep(43.,170.,d)),1.);}`,side:T.DoubleSide});return new T.Mesh(g,material);}
