import test from 'node:test';
import assert from 'node:assert/strict';
import { calendar, rankOf, pos, fresh, routeTrial, stats, streetPlan, tick, apply, check, cells, line, key, rectangle, roadSurface, roadTreads, roadTop, height, terrainGrader, roadProfile, terraceEdges, terraceLevel } from '../src/sim.ts';
const place=(s,k,x,z,r=0)=>apply(s,k,cells(k,x,z,r),r);
const road=(s,k,x,z,a,b)=>apply(s,k,line({x,z},{x:a,z:b},k==='bridge'));
test('seeded maps are deterministic, with a working starter economy',()=>{
  assert.deepEqual(fresh(1748),fresh(1748));
  for(let seed=1;seed<=1500;seed++){const s=fresh(seed),q=stats(s); assert.ok(q.cap>=8&&q.farms===1,`seed ${seed}`);}
});
test('validates overlap, water, budgets and steep terrain',()=>{
  const s=fresh(1748);
  assert.equal(check(s,'home',cells('home',-7,17)),'Building in the way');
  const bridge=line({x:2,z:10},{x:14,z:10},true);
  assert.match(check(s,'road',bridge),/water/);
  assert.match(check(s,'temple',cells('temple',-10,22)),/higher ground|Uneven/);
  s.coin=0;assert.match(check(s,'home',cells('home',-7,13)),/Need 16/);
});
test('build a pilgrimage route; severing access stops visits',()=>{
  const s=fresh(1748);
  assert.ok(place(s,'work',-7,14,1));assert.ok(place(s,'inn',-4,12,3));
  assert.ok(road(s,'road',-5,13,-11,13));assert.ok(road(s,'road',-11,13,-11,6));
  assert.ok(place(s,'terrace',-14,6)); assert.ok(place(s,'temple',-14,6,1));
  assert.equal(s.wood,4);
  for(let i=0;i<5;i++)tick(s);
  assert.equal(s.pop,16);assert.equal(stats(s).visitors('common'),10);assert.ok(stats(s).income>=15);
  assert.ok(place(s,'erase',-11,11));assert.equal(stats(s).pilgrims,0);
});
test('bridges connect bank-to-bank and erase as one structure',()=>{
  const s=fresh(1748);assert.ok(road(s,'bridge',2,10,14,10));
  assert.ok(road(s,'road',-5,13,-5,10));assert.ok(road(s,'road',-5,10,2,10));
  assert.ok(stats(s).net.has(key(14,10)));assert.ok(place(s,'erase',7,10));assert.ok(!s.roads[key(14,10)]);
});

test('narrow buildings and props occupy only their stated footprints',()=>{
  const s=fresh(1748);
  assert.deepEqual(cells('rowhouse',-6,15),[{x:-6,z:15},{x:-6,z:16}]);
  assert.deepEqual(cells('rowhouse',-4,14,1),[{x:-4,z:14},{x:-3,z:14}]);
  assert.ok(place(s,'rowhouse',-6,15));assert.ok(place(s,'rowhouse',-4,14,1));
  assert.ok(place(s,'stall',-4,18));assert.ok(place(s,'lantern',-8,17));assert.ok(place(s,'garden',-8,18));
  assert.equal(stats(s).cap,24);assert.equal(stats(s).stalls,1);
  assert.equal(stats(s).rice,5);assert.equal(stats(s).wood,-1);
  assert.equal(check(s,'stall',cells('stall',-8,18)),'Building in the way');
  assert.ok(place(s,'erase',-8,18));assert.ok(s.buildings.some(b=>b.kind==='lantern'));
  assert.ok(place(s,'erase',-5,18));assert.equal(stats(s).stalls,0);
});


test('a quicker approach reroutes visitors, lodging and trade; cutting it restores the old market',()=>{
  const s=routeTrial();const market=s.buildings.find(b=>b.kind==='market');
  const old=stats(s);assert.ok(old.pilgrims>=7);assert.ok(old.passing(market.id)>0);assert.ok(old.trade.get(market.id)>0);
  assert.ok(road(s,'road',-5,13,-11,13));
  const common=q=>q.journeys.find(j=>j.type==='common'),short=stats(s);assert.ok(common(short).effort<common(old).effort);assert.ok(common(short).tiles.includes(key(-8,13)));
  assert.equal(short.passing(market.id),0);assert.equal(short.trade.get(market.id),0);assert.ok(short.pilgrims<old.pilgrims);
  assert.ok(place(s,'inn',-9,11));assert.ok(stats(s).pilgrims>old.pilgrims);
  assert.ok(place(s,'erase',-8,13));assert.ok(stats(s).passing(market.id)>0);
});

test('growth needs whole reserved lots, faces frontage, and puts stalls where pilgrims pass',()=>{
  const s=fresh(1748);s.pop=16;
  assert.ok(place(s,'plot',-6,14));assert.equal(tick(s),0);
  assert.ok(place(s,'plot',-7,14));assert.equal(tick(s),1);
  const b=s.buildings.at(-1);assert.equal(b.kind,'rowhouse');assert.equal(b.rot,1);assert.equal(b.grown,true);assert.ok(b.style>=0&&b.style<1);assert.equal(stats(s).cap,20);assert.equal(Object.keys(s.plots).length,0);
  const market=routeTrial();assert.ok(place(market,'plot',-4,8));assert.equal(tick(market),1);assert.equal(market.buildings.at(-1).kind,'stall');
  const none=routeTrial();assert.ok(place(none,'plot',-4,8));assert.ok(road(none,'road',-5,13,-11,13));assert.equal(tick(none),0);assert.ok(none.plots[key(-4,8)]);
});


test('street cues reflect commerce and lodging without occupying grid cells',()=>{
  const s=routeTrial(),market=s.buildings.find(b=>b.kind==='market'),inn=s.buildings.find(b=>b.kind==='inn');
  const ci=stats(s).journeys.findIndex(j=>j.type==='common'),before=streetPlan(s);assert.equal(before.spans.length,1);assert.ok(before.shops.find(v=>v.b.id===market.id).busy>0);
  assert.ok(before.stops[ci].some(v=>v.kind==='inn'&&v.building===inn.id));assert.ok(before.stops[ci].some(v=>v.kind==='shop'));
  assert.ok(before.stops[ci].some(v=>v.kind==='temple'));assert.equal(check(s,'road',cells('road',-5,18)), '');
  const buildings=s.buildings.length;assert.ok(road(s,'road',-5,13,-11,13));
  const after=streetPlan(s),oldMarket=after.shops.find(v=>v.b.id===market.id);assert.equal(oldMarket.busy,0);assert.ok(oldMarket.base);
  assert.ok(stats(s).lodging.get(inn.id)<stats(routeTrial()).lodging.get(inn.id));assert.equal(after.spans.length,0);assert.equal(s.buildings.length,buildings);
  assert.ok(after.stops.every(list=>list.every(v=>v.building!==market.id)));
});

test('progression adds capacity and permanent shops without changing lot footprints',()=>{
  const s=fresh(1748);s.pop=16;s.wood=34;s.rice=24;
  assert.ok(place(s,'stall',-4,18));
  const h=s.buildings[0],lot=cells(h.kind,h.x,h.z,h.rot);
  for(let i=0;i<3;i++)tick(s);
  assert.equal(h.tier,2);assert.equal(stats(s).cap,20);assert.deepEqual(cells(h.kind,h.x,h.z,h.rot),lot);assert.ok(s.wood>=14);
  const t=routeTrial(),stall=t.buildings.find(b=>b.kind==='stall'&&b.z===6);
  for(let i=0;i<3;i++)tick(t);
  assert.equal(stall.tier,2);assert.equal(stall.specialty,'tea');assert.ok(t.wood>=14);
  const dry=routeTrial();assert.ok(road(dry,'road',-5,13,-11,13));for(let i=0;i<3;i++)tick(dry);
  assert.equal(dry.buildings.find(b=>b.kind==='stall'&&b.z===6).tier,undefined);
});


test('temple courtyards carry pilgrim routes and passage pieces do not remove the paving beneath',()=>{
  const s=routeTrial();assert.match(check(s,'templegate',cells('templegate',-11,8)),/Unlocks/);s.renown=80;const before=stats(s).pilgrims;
  assert.ok(apply(s,'court',rectangle({x:-11,z:6},{x:-9,z:8})));
  assert.ok(place(s,'templegate',-11,8));assert.ok(place(s,'cloister',-10,6,1));assert.ok(place(s,'belfry',-10,9));
  assert.ok(stats(s).net.has(key(-11,8)));assert.ok(stats(s).visitors('common')>=stats(routeTrial()).visitors('common'));
  assert.equal(s.roads[key(-11,8)].kind,'court');assert.ok(place(s,'erase',-11,8));assert.equal(s.roads[key(-11,8)].kind,'court');
  assert.equal(s.buildings.some(b=>b.kind==='templegate'),false);
});

test('walking deck joins landings exactly, makes stepped uphill approaches and rejects a cliff route',()=>{
  const s=fresh(1748),a={x:-13,z:0},b={x:-12,z:0};
  s.terraces[key(a.x,a.z)]=4;s.terraces[key(b.x,b.z)]=5.1;
  assert.ok(roadTreads(s,a,b)>=5);assert.equal(roadSurface(s,a,b,0),roadTop(s,a));assert.equal(roadSurface(s,a,b,1),roadTop(s,b));
  assert.ok(roadSurface(s,a,b,.72)>roadSurface(s,a,b,.29));
  assert.ok(apply(s,'road',[a,b]));const grade=terrainGrader(s);
 for(const t of [.204,.373,.584,.723])assert.ok(roadSurface(s,a,b,t)>=grade(a.x+t,a.z,height(s,a.x+t,a.z)));
 const sections=roadProfile(s,a,b);assert.ok(sections.every((p,i)=>i===0||Math.abs(p.y0-sections[i-1].y1)<=.20501));
 for(const t of [.115,.309,.473,.657,.886])assert.ok(Math.abs(roadSurface(s,a,b,t)-roadSurface(s,b,a,1-t))<.00001);
 delete s.roads[key(a.x,a.z)];delete s.roads[key(b.x,b.z)];
  s.terraces[key(b.x,b.z)]=6.25;
  assert.match(check(s,'road',[a,b]),/Too steep/);assert.match(check(s,'court',[a,b]),/gentler/);
});


test('a steep terrace exposes both cut and fill walls, without seams between equal pads',()=>{
 const s=fresh(1748),lot=cells('terrace',-18,-13),top=terraceLevel(s,lot);
 assert.ok(apply(s,'terrace',lot));
 const edges=lot.flatMap(p=>terraceEdges(s,p,top));assert.equal(edges.length,12);
 const ground=edges.flatMap(e=>e.points.map(p=>p.y));assert.ok(Math.min(...ground)<top-4);assert.ok(Math.max(...ground)>top+3);
 s.terraces[key(-19,-13)]=top-1.5;
 assert.ok(terraceEdges(s,lot[0],top).find(e=>e.dx===-1).points.every(p=>p.y===top-1.5));
 assert.ok(!terraceEdges(s,{x:-19,z:-13},top-1.5).some(e=>e.dx===1));
});


function hillTemple(){
  const s=fresh(1748);s.coin=2000;
  assert.ok(road(s,'road',-5,13,-11,13));assert.ok(road(s,'road',-11,13,-11,6));
  assert.ok(place(s,'terrace',-14,6));assert.ok(place(s,'temple',-14,6,1));s.pop=16;return s;
}
test('a calm approach draws ascetics and builds renown; trade at the top of the approach erodes it',()=>{
  const quiet=hillTemple();for(const z of [7,9,11])assert.ok(place(quiet,'lantern',-10,z));
  const q=stats(quiet);assert.ok(q.serenity>.6);assert.ok(q.visitors('ascetic')>0);
  for(let i=0;i<40;i++)tick(quiet);assert.ok(rankOf(quiet.renown)>=1);
  const loud=hillTemple();for(const z of [7,9,11])assert.ok(place(loud,'stall',-10,z));
  const l=stats(loud);assert.ok(l.serenity<q.serenity-.25);assert.equal(l.visitors('ascetic'),0);assert.ok(l.renownTarget<q.renownTarget);
});
test('carts cannot climb stairs and crowds slow deliveries',()=>{
  const s=routeTrial(),q=stats(s);
  assert.ok(q.cartRoutes.length>0);
  for(const r of q.cartRoutes)for(let i=1;i<r.tiles.length;i++){const a=pos(r.tiles[i-1]),b=pos(r.tiles[i]);assert.equal(roadTreads(s,a,b),0);}
  assert.ok([...q.supply.values()].every(f=>f<=1&&f>=.45));
  const inn=s.buildings.find(b=>b.kind==='inn');assert.ok([...q.front.get(inn.id).keys()].some(k=>q.freight.get(k)));
});
test('patrons need renown and a cart-free inn on their route; seasons change the crowd',()=>{
  const s=hillTemple();s.pop=24;assert.ok(place(s,'inn',-13,11,1));
  assert.equal(stats(s).visitors('patron'),0);s.renown=40;assert.ok(stats(s).visitors('patron')>0);
  assert.ok(place(s,'work',-10,11));assert.ok(place(s,'stall',-10,9));const carted=stats(s);
  assert.ok(carted.freight.get(key(-11,11))>0);assert.equal(carted.visitors('patron'),0);
  assert.ok(carted.stranded.includes(s.buildings.find(b=>b.kind==='farm').id)); // The lowland farm cannot haul up the stairs.
  const fest=hillTemple();fest.day=21;assert.equal(calendar(21).festival,'Bell Festival');
  const plain=hillTemple();plain.day=40;
  assert.ok(stats(fest).journeys.find(j=>j.type==='common').demand>stats(plain).journeys.find(j=>j.type==='common').demand);
  const winter=hillTemple();winter.day=100;winter.renown=40;assert.equal(stats(winter).visitors('patron'),0);
});
