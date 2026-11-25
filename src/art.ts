import * as T from 'three';
import {C,LO,HI,height,natural,river,rand,noise, key,pos,dims,cells,corners,type State,type Bld,type Pos,type Route} from './sim';
const cube=new T.BoxGeometry(1,1,1).toNonIndexed();
const con=new T.ConeGeometry(1,1,7).toNonIndexed(), stone=new T.IcosahedronGeometry(1,0).toNonIndexed();
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
export function ground(s:State){const v=[],colors=[],idx=[],res=170;for(let j=0;j<=res;j++)for(let i=0;i<=res;i++){const x=(i/res-.5)*73,z=(j/res-.5)*73,y=height(s,x,z),n=noise(x*.52,z*.52,s.seed+6), slope=Math.max(Math.abs(natural(x+.2,z,s.seed)-natural(x-.2,z,s.seed)),Math.abs(natural(x,z+.2,s.seed)-natural(x,z-.2,s.seed)));v.push(x*C,y,z*C);col.setHex(y<.25?0xa6946f:y<1.17?0x969365:0x7d8859);if(y>=.25){const blend=noise(x*.13,z*.13,s.seed+83);col.lerp(col2.setHex(0x586b50),blend*.58);col.lerp(col2.setHex(0xa19669),n*.38);}if(y>20||slope>.80){const strata=.5+.5*Math.sin(y*2+x*.16+z*.08+noise(x*.3,z*.3,s.seed+9)*3);col2.setHex(0x676b60).lerp(strataTone,strata*.7);col.lerp(col2,Math.min(.87,Math.max(0,slope-.31)+(y>20?.22:0)));}else if(y>5)col.lerp(col2.setHex(0x697956),.52);col.multiplyScalar(.84+n*.22);colors.push(col.r,col.g,col.b);if(i<res&&j<res){let a=j*(res+1)+i,b=a+res+1;idx.push(a,b,a+1,a+1,b,b+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return new T.Mesh(g,terrainMat);}
export function terrace(b:Batch,s:State,{x,z}:Pos,top:number){for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){if(s.terraces[key(x+dx,z+dz)]===top)continue;const low=Math.min(top-.3,natural(x+dx*.48,z+dz*.48,s.seed)-.12);for(let l=0;l<Math.min(8,Math.ceil((top-low)/.45));l++){const y=top-.19-l*.43;for(let i=0;i<4;i++){const n=(i-1.5)*.75, off=rand(x+i,z+l,s.seed)*.12;b.box(x*C+dx*1.47+dz*n,y,z*C+dz*1.47+dx*n,dx?.27:.72,.404,dz?.27:.72,rock[(i+l)%3],0,.87+off);}}}}
export function scenery(s:State,used:Set<string>){const b=new Batch();for(let z=-34;z<=34;z++)for(let x=-34;x<=34;x++){const r=rand(x,z,s.seed+41),px=x+(rand(x,z,s.seed+26)-.5)*.82,pz=z+(rand(x,z,s.seed+25)-.5)*.82,y=height(s,px,pz);if(y<.42||used.has(key(x,z))||s.terraces[key(x,z)]!==undefined)continue;
 let density=y>4?.63:y<1.37?.055:.16;density*=.55+noise(x*.17,z*.17,s.seed+120)*.85;if(r<density){const tall=(1.4+rand(x,z,73)*3.6)*(y>3?1.23:.8);const pine=r>.07||y>5,color=pine?fir[Math.floor(rand(x,z,27)*fir.length)]:[0x98754d,0xa86a4e,0x8e8050][x*x%3]; const tx=px*C,tz=pz*C;b.box(tx,y+tall*.29,tz,tall*.075,tall*.68,tall*.075,0x564536,r*8);if(pine)for(let i=0;i<4;i++){const w=tall*(.29-i*.051);b.shape(con,tx,y+tall*(.47+i*.17),tz,w,tall*(.51-i*.043),w,color,r*20+i*.55,.86+i*.09);}else{for(let i=0;i<4;i++)b.shape(stone,tx+Math.sin(i*2.4)*tall*.32,y+tall*(.57+i*.12),tz+Math.cos(i*2.4)*tall*.28,tall*.38,tall*.38,tall*.36,color,i,.8+i*.1);}}
 else if(r>.87&&y>1.6){const a=.15+(r-.87)*7;b.shape(stone,px*C,y-.07,pz*C,a,a*.7,a*.91,rock[Math.floor(rand(x,z,99)*3)],r*18,.85+rand(x,z,91)*.3);}else if(r>.58&&y<1.5){for(let i=0;i<3;i++)b.shape(con,px*C+i*.13,y+.13,pz*C-i*.15,.08,.32+i*.06,.08,0x9d9b62,i);}}
 return b.mesh(solid);}
const wood=0x573f33,trim=0x372c28,plaster=0xcfb995,paper=0xe6c483,stoneBase=0x7d786b,red=0x904c3b;
export function foundation(s:State,p:Pos[]){return Math.max(...corners(s,p))+.07;}
export function building(out:Batch, lit:Batch,s:State,b:Bld){const dim=dims(b.kind,b.rot),X=(b.x+(dim.w-1)/2)*C,Z=(b.z+(dim.d-1)/2)*C,Y=foundation(s,cells(b.kind,b.x,b.z,b.rot)),base=Math.min(...corners(s,cells(b.kind,b.x,b.z,b.rot)));const style=b.style??rand(b.x,b.z,s.seed+52),angle=b.rot*Math.PI/2+(b.grown?(style-.5)*.075:0),si=Math.sin(angle),co=Math.cos(angle);const pt=(x:number,y:number,z:number)=>[X+x*co+z*si,Y+y,Z-x*si+z*co];const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:number,shade=1)=>{const p=pt(x,y,z);out.box(p[0],p[1],p[2],w,h,d,c,angle,shade);};const glow=(x:number,y:number,z:number,w:number,h:number,d:number,c=0xffbd65)=>{const p=pt(x,y,z);lit.box(p[0],p[1],p[2],w,h,d,c,angle);};
 const W=(b.rot%2?dim.d:dim.w)*C,D=(b.rot%2?dim.w:dim.d)*C,r=style;
 if(b.kind==='lantern'){
  const ground=height(s,b.x,b.z)-Y;
  box(0,ground+.04,0,1.38,.21,1.34,0x777c67);
  box(0,ground+.20,0,.77,.17,.72,stoneBase);
  box(0,ground+.63,0,.29,.84,.28,0x777a6e);
  box(0,ground+1.04,0,.69,.14,.68,stoneBase);
  glow(0,ground+1.27,0,.41,.36,.41);
  for(const x of [-1,1])for(const z of [-1,1])box(x*.242,ground+1.25,z*.235,.10,.42,.10,0x787e71);
  box(0,ground+1.47,0,.75,.13,.75,stoneBase);
  const a=pt(0,ground+1.58,0);out.shape(stone,a[0],a[1],a[2],.55,.26,.53,0x777a6e,angle+.2);
  box(0,ground+1.77,0,.19,.18,.19,0x858476);
  return;
 }
 if(b.kind==='garden'){
  const g=height(s,b.x,b.z)-Y, shade=[0xad7452,0xa75f45,0xb58652][Math.floor(r*3)];
  const blob=(x:number,y:number,z:number,w:number,h:number,d:number,c:number,a:number)=>{const p=pt(x,g+y,z);out.shape(stone,p[0],p[1],p[2],w,h,d,c,a+angle);};
  blob(-.22,-.02,-.18,1.19,.29,1.12,0x778252,.8);
  box(-.34,g+.55,-.36,.15,1.1,.15,wood,1);
  const nodes=[[-.64,1.19,-.46,.57],[-.28,1.46,-.57,.53],[.05,1.25,-.34,.54],[-.44,1.63,-.29,.49],[-.73,1.40,-.17,.43]];
  for(const [x,y,z,a] of nodes)blob(x,y,z,a,.37,a,shade,y*3);
  blob(.75,.04,-.58,.53,.46,.43,0x73786b,2);blob(.49,.02,-.33,.32,.24,.29,0x858776,1);
  for(let j=0;j<4;j++){const x=(j-1.6)*.48, z=.53+Math.sin(j*1.19)*.21;const p=pt(x,0,z);box(x,height(s,p[0]/C,p[2]/C)-Y+.034,z,.38,.11,.32,rock[j%3],.84+j*.02);}
  return;
 }
 const groundD=Y-base;
 if(b.grown){
  const w=W-.48-r*.23,d=D-.58,offset=(r-.5)*.36;
  box(offset,-groundD/2-.10,-.17,w,groundD+.22,d,r>.51?0x7e7f65:0x867b64);
  for(let i=0;i<Math.floor(w/.55);i++)box(offset+(i+.5)*.55-w/2,-.13,D/2-.43,.50,.20,.14,rock[(i+b.id)%3]);
  if(r>.38){const a=pt(-W*.29,.14,D*.35);out.shape(stone,a[0],a[1],a[2],.33,.29,.27,0x778558,r*8);}
  if(r<.78){const a=pt(W*.25,.20,D*.33);out.shape(stone,a[0],a[1],a[2],.25,.31,.25,0x9f7752,r*11);}
 }else{box(0,-groundD/2-.12,0,W-.32,groundD+.24,D-.32,stoneBase);for(const side of [-1,1]){for(let i=0;i<Math.floor(W/.66);i++){const x=(i+.5)*.66-W/2+.22; box(x,-.24,side*(D/2-.13),.62,.27,.18,rock[(i+Math.floor(r*8))%3]);}for(let i=0;i<Math.floor(D/.66);i++)box(side*(W/2-.13),-.24,(i+.5)*.66-D/2+.22,.18,.27,.62,rock[i%3]);}}
 if(b.kind==='farm'){for(let i=0;i<3;i++){const x=(i-1)*2.77;box(x,.008,0,2.62,.045,5.18,0x576f5a);box(x-1.37,.07,0,.14,.18,5.54,0x88765a);for(let j=0;j<8;j++)for(let k=0;k<5;k++){const rr=rand(i*13+j,k,b.id);const p=pt(x+(k-2)*.42,.13,(j-3.5)*.61);out.shape(con,p[0],p[1],p[2],.09+rr*.05,.21+rr*.19,.09,[0xa2a65d,0xb4af66,0x798d58][(k+j)%3],rr*6);}}box(0,.06,2.64,W-.32,.18,.22,0x857554);box(0,.06,-2.64,W-.32,.18,.22,0x857554);return;}
 function roof(w:number,d:number,y:number,rise:number,cl:number,hip=.17){const t=(u:number,v:number)=>pt(u*(w/2)*(1-hip*(1-v)),y+rise*(1-v)**1.52+.32*Math.pow(Math.abs(u),6)*(v*.8+.2),v*d/2);const sideP=(u:number,v:number,j:number)=>{const a=t(u,v);return j===1?a:pt(u*(w/2)*(1-hip*(1-v)),a[1]-Y,-v*d/2);};for(const j of [-1,1]){ const tiles=Math.max(9,Math.floor(w/.39)),runs=9;for(let i=0;i<tiles;i++)for(let k=0;k<runs;k++){const u=-1+i*2/tiles,v=k/runs,u2=u+2/tiles,v2=(k+1)/runs, sh=.86+rand(i,k,b.id+j)*.26;const a=sideP(u,v,j),b0=sideP(u,v2,j),c=sideP(u2,v2,j),d0=sideP(u2,v,j);if(j===1)out.quad(a,b0,c,d0,cl,sh);else out.quad(d0,c,b0,a,cl,sh);if(k%2===1){const end=c.map((m,i)=>(m+b0[i])*.5);end[1]+=.037;out.tri(b0,end,d0,cl,.64);}}for(let i=0;i<tiles;i++){const u=-1+(i+.5)*2/tiles;const a=sideP(u,1,j);out.shape(stone,a[0],a[1]+.03,a[2],.177,.10,.119,cl,angle,.65);}}
 for(const j of [-1,1]){const tip=sideP(j,0,1),c=pt(j*w*.5,y,d/2),e=pt(j*w*.5,y,-d/2);out.tri(tip,e,c,cl,.72);}
 box(0,y+rise+.11,0,w*(1-hip)+.2,.23,.26,trim);for(const side of [-1,1]){box(side*w*(1-hip)*.49,y+rise+.23,0,.38,.17,.33,trim);const p=pt(side*w*(1-hip)*.49,y+rise+.31,0);out.shape(stone,p[0],p[1],p[2],.19,.23,.12,cl,angle);}}
 function store(w:number,d:number,y:number,h:number,tem=false){const accent=tem?red:wood;box(0,y+.09,0,w+.23,.18,d+.21,wood);box(0,y+h*.51,0,w-.10,h,d-.10,tem?0xd5c49a:plaster);for(const si of [-1,1]){for(let i=0;i<5;i++){const x=(i-2)*(w/4);box(x,y+h*.52,si*d/2,.13,h+.12,.15,accent);if(i<4){const a=x+w/8;box(a,y+h*.58,si*(d/2+.016),w*.168,h*.44,.058,trim);glow(a,y+h*(i===1&&si===1?.43:.58),si*(d/2+.051),w*.14,h*(i===1&&si===1?.65:.36),.028,paper);for(let t=-1;t<=1;t++)box(a+t*w*.032,y+h*.58,si*(d/2+.07),.043,h*.38,.027,accent);box(a,y+h*.56,si*(d/2+.07),w*.16,.055,.027,accent);}}for(let i=-1;i<=1;i++)box(si*w/2,y+h*.51,i*d*.43,.16,h+.12,.13,accent);box(0,y+h*.83,si*d/2,w+.15,.15,.11,accent);box(0,y+h*.95,si*(d/2+.026),w+.26,.18,.26,accent);for(let k=0;k<9;k++)box((k-4)*w/8,y+h*.99,si*(d/2+.19),.11,.15,.47,accent);}box(0,y+h,0,w+.33,.21,d+.30,accent);}
 if(b.kind==='rowhouse'){
  const w=b.grown?1.61+r*.39:2.01,d=b.grown?3.84+r*.51:4.58,h=b.grown?1.56+r*.61:1.96;store(w,d,.16,h);roof(w+.65,d+.77,h+.16,.75+r*.48,r>.69?0x4d5859:r>.32?0x5c6662:0x706454);
  // Small slatted entry and a cloth valance across the narrow street front.
  box(0,.14,d/2+.32,1.73,.26,.61,wood);
  for(let i=-2;i<=2;i++)box(i*.226,1.41,d/2+.109,.21,.43,.09,r>.63?0x8e5846:0x5a7068);
  box(0,1.66,d/2+.117,1.19,.062,.105,trim);
  glow(.76,1.32,d/2+.185,.17,.29,.17);box(.76,1.50,d/2+.185,.25,.08,.25,wood);
  return;
 }
 if(b.kind==='stall'){
  const canvas=[0xa76e53,0x78856b,0x697e7b,0xa28859][Math.floor(r*4)];
  for(const x of [-1,1])for(const z of [-1,1])box(x*.87,.89,z*.62,.10,1.78,.10,wood);
  box(0,.59,.40,1.91,.12,.94,wood);box(0,.29,.49,1.67,.58,.69,0x6c5441);box(0,1.62,.02,1.9,.08,1.52,trim);
  for(let i=-4;i<=4;i++){
   box(i*.268,1.79,.05,.269,.075,1.92,i%2===0?canvas:0xd1be92);
   box(i*.268,1.68,1.00,.269,.19,.045,i%2===0?canvas:0xd1be92);
   if(i%2===0&&i!==-4)box(i*.205,.75,.48,.27,.16+rand(i,b.id,8)*.13,.41,[0xa5915a,0xa97452,0x849057][(i+4)%3]);
  }
  return;
 }
 if(b.kind==='temple'){const w=W*.77,d=D*.68;for(let t=0;t<6;t++)box(0,.065+t*.083,d*.49+.85-t*.18,3.5,.145,.47,stoneBase);box(0,.29,0,w+1.05,.54,d+1.05,stoneBase);for(const si of [-1,1]){box(si*(w/2+.45),.83,0,.105,.11,d+.9,red);for(let i=-3;i<=3;i++)box(si*(w/2+.45),.59,i*d/6,.1,.51,.1,red);}
 store(w,d,.55,2.4,true);roof(w+1.35,d+1.58,2.95,1.38,0x4f605e);store(w*.59,d*.62,3.65,1.87,true);roof(w*.59+1.05,d*.62+1.20,5.52,1.10,0x4e5c5a);store(w*.31,d*.39,6.07,1.12,true);roof(w*.31+.94,d*.39+1.04,7.19,.89,0x4c5a59);box(0,8.4,0,.11,1.04,.11,0x9b7b4d);for(let i=0;i<5;i++)box(0,8.09+i*.17,0,.45-i*.058,.07,.45-i*.058,0x9b7b4d);for(const si of [-1,1]){box(si*2.25,1.03,d/2+.9,.17,1.24,.17,red);glow(si*2.25,1.61,d/2+.9,.33,.4,.33);box(si*2.25,1.85,d/2+.9,.46,.13,.46,trim);}return;}
 const w=W*(b.kind==='market'?.84:b.kind==='home'?.70+r*.092:.8),d=D*(b.kind==='home'?.59+r*.102:.67);
 if(b.kind==='market'){for(let i=-1;i<=1;i++){const x=i*2.48;for(let j=0;j<2;j++)for(const si of [-1,1])box(x+si*.97,.9,j*2.25-.9,.10,1.8,.10,wood);box(x,.61,.57,2.09,.17,1.19,wood);for(let j=0;j<7;j++){const rr=rand(i,j,b.id);box(x+(j-3)*.302,1.91,.22,.299,.084,2.58,j%2===0?[0xa46751,0x627772,0xa57c4c][i+1]:0xccbd94);box(x+(j-3)*.285,.82,.63,.21,.29*rr+.08,.35,[0x997c50,0x879557,0xad7540][j%3]);}}return;}
 const h=b.kind==='inn'?3.35:b.kind==='work'?1.9:1.47+r*.49;store(w,d,.15,h);if(b.kind==='inn')box(0,2.02,0,w+.37,.16,d+.39,red);const palette=[0x646158,0x5c6662,0x535b5c,0x756a57,0x535451];roof(w+.89,d+.95,h+.15,b.kind==='inn'?1.43:.97+r*.47,palette[Math.floor(r*palette.length)]);box(0,.14,d/2+.27,w*.48,.27,.64,wood);if(b.kind==='home'&&b.grown&&r>.52){for(let i=-2;i<=2;i++)box(i*.34,1.33,d/2+.095,.32,.37,.06,r>.78?0x96664d:0x687e73);}if(b.kind==='work'){box(w*.27,h+1.1,-d*.25,.46,1.33,.49,stoneBase);box(w*.27,h+1.78,-d*.25,.57,.14,.61,trim);for(let i=0;i<4;i++)box(-w*.42+i*.22,.25,d/2+.4,.17,.22,.68,wood);}if(b.kind==='inn'){for(const si of [-1,1]){box(si*w*.33,1.35,d/2+.16,.08,.63,.37,trim);glow(si*w*.33,1.06,d/2+.34,.28,.42,.28);box(si*w*.33,1.29,d/2+.34,.36,.10,.36,trim);}}
}
export function path(b:Batch,s:State,{x,z}:Pos,r:Route,net=true,preview?:Set<string>){const X=x*C,Z=z*C,Y=r.y??height(s,x,z);if(r.kind==='bridge'){const a=r.axis==='x'?Math.PI/2:0;for(let i=-3;i<=3;i++)b.box(X+Math.sin(a)*i*.426,Y+.03,Z+Math.cos(a)*i*.426,1.9,.22,.408,0x8e664c,a,.88+(i+3)*.027);for(const si of [-1,1]){const xx=X+si*Math.cos(a)*.96,zz=Z-si*Math.sin(a)*.96;const low=Math.min(Y-.1,height(s,x,z));b.box(xx,(Y+low)/2,zz,.16,Y-low+1.3,.16,red);b.box(xx,Y+.58,zz,.13,.14,3.0,red,a);b.box(xx,Y+.26,zz,.08,.07,3.0,wood,a);}return;}
 const adjacent=(dx:number,dz:number)=>!!s.roads[key(x+dx,z+dz)]||!!preview?.has(key(x+dx,z+dz));const wide=adjacent(1,0)||adjacent(-1,0),deep=adjacent(0,1)||adjacent(0,-1)||!wide;const gradeX=height(s,x+.42,z)-height(s,x-.42,z),gradeZ=height(s,x,z+.42)-height(s,x,z-.42),stepX=wide&&Math.abs(gradeX)>Math.abs(gradeZ),stepZ=deep&&!stepX;const stair=(stepX?Math.abs(gradeX):Math.abs(gradeZ))>.40;
 for(let j=0;j<7;j++)for(let i=0;i<7;i++){if((i===0&&!adjacent(-1,0))||(i===6&&!adjacent(1,0))||(j===0&&!adjacent(0,-1)&&z!==24)||(j===6&&!adjacent(0,1)&&z!==24))continue;if((i===0||i===6)&&(j===0||j===6))continue;const xx=x+(i-3)*.144,zz=z+(j-3)*.144;const y=height(s,stair&&stepZ?x:xx,stair&&stepX?z:zz);b.box(xx*C,y+.096,zz*C,.424,stair?.27:.18,.424,net?0xa19a80:0x9b846b,0,.86+rand(x*7+i,z*7+j,473)*.24);}}
export function gate(b:Batch,s:State){const x=-5*C,z=24*C,y=height(s,-5,24);for(const si of [-1,1]){b.box(x+si*1.48,y+1.69,z,.34,3.4,.37,red);b.box(x+si*1.48,y+.16,z,.56,.35,.56,stoneBase);}b.box(x,y+2.68,z,3.85,.26,.27,red);b.box(x,y+3.37,z,4.49,.33,.39,red);b.box(x,y+3.59,z,5.03,.15,.58,trim);b.box(x,y+3.07,z,1.03,.51,.19,trim);}
export function waterMesh(s:State){const pts=[],idx=[];for(let i=0;i<=150;i++){const z=-37+74*i/150,x=river(z,s.seed);pts.push((x-5.3)*C,.073,z*C,(x+5.3)*C,.073,z*C);if(i<150){const p=i*2;idx.push(p,p+2,p+1,p+1,p+2,p+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);const material=new T.ShaderMaterial({uniforms:{t:{value:0},night:{value:0},mist:{value:new T.Color(0xbfc4ad)}},vertexShader:`varying vec3 w;varying float d;void main(){w=position;vec4 p=modelViewMatrix*vec4(position,1.);d=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 w;varying float d;uniform float t,night;uniform vec3 mist;void main(){ float r=sin(w.z*1.83+w.x*.24+t*.83+sin(w.x*.57+w.z*.09)*1.3);float s=sin(w.x*.92+w.z*.64-t*.76);float glint=smoothstep(.85,1.,r*s);vec3 a=mix(vec3(.23,.39,.35),vec3(.05,.15,.20),night);vec3 b=mix(vec3(.48,.6,.53),vec3(.15,.26,.33),night);vec3 cl=mix(a,b,.35+.12*r+.06*s)+glint*.061;gl_FragColor=vec4(mix(cl,mist,smoothstep(43.,170.,d)),1.);}`,side:T.DoubleSide});return new T.Mesh(g,material);}
