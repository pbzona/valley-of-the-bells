import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, routeTrial, stats, streetPlan, tick, apply, check, cells, line, key, rectangle, roadSurface, roadTreads, roadTop, height } from '../src/sim.ts';
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
  assert.equal(s.pop,16);assert.equal(stats(s).pilgrims,10);assert.ok(stats(s).income>=15);
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
  const old=stats(s);assert.equal(old.pilgrims,10);assert.equal(old.passing(market.id),10);assert.ok(old.trade.get(market.id)>0);
  assert.ok(road(s,'road',-5,13,-11,13));
  const short=stats(s);assert.ok(short.journeys[0].effort<old.journeys[0].effort);assert.ok(short.journeys[0].tiles.includes(key(-8,13)));
  assert.equal(short.passing(market.id),0);assert.equal(short.trade.get(market.id),0);assert.equal(short.pilgrims,4);
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
  const before=streetPlan(s);assert.equal(before.spans.length,1);assert.equal(before.shops.find(v=>v.b.id===market.id).busy,5);
  assert.ok(before.stops[0].some(v=>v.kind==='inn'&&v.building===inn.id));assert.ok(before.stops[0].some(v=>v.kind==='shop'));
  assert.ok(before.stops[0].some(v=>v.kind==='temple'));assert.equal(check(s,'road',cells('road',-5,18)), '');
  const buildings=s.buildings.length;assert.ok(road(s,'road',-5,13,-11,13));
  const after=streetPlan(s),oldMarket=after.shops.find(v=>v.b.id===market.id);assert.equal(oldMarket.busy,0);assert.ok(oldMarket.base);
  assert.equal(stats(s).lodging.get(inn.id),4);assert.equal(after.spans.length,0);assert.equal(s.buildings.length,buildings);
  assert.ok(after.stops[0].every(v=>v.building!==market.id));
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
  const s=routeTrial(),before=stats(s).pilgrims;
  assert.ok(apply(s,'court',rectangle({x:-11,z:6},{x:-9,z:8})));
  assert.ok(place(s,'templegate',-11,8));assert.ok(place(s,'cloister',-10,6,1));assert.ok(place(s,'belfry',-10,9));
  assert.ok(stats(s).net.has(key(-11,8)));assert.equal(stats(s).pilgrims,before);
  assert.equal(s.roads[key(-11,8)].kind,'court');assert.ok(place(s,'erase',-11,8));assert.equal(s.roads[key(-11,8)].kind,'court');
  assert.equal(s.buildings.some(b=>b.kind==='templegate'),false);
});

test('walking deck joins landings exactly, makes stepped uphill approaches and rejects a cliff route',()=>{
  const s=fresh(1748),a={x:-13,z:0},b={x:-12,z:0};
  s.terraces[key(a.x,a.z)]=4;s.terraces[key(b.x,b.z)]=5.1;
  assert.ok(roadTreads(s,a,b)>=5);assert.equal(roadSurface(s,a,b,0),roadTop(s,a));assert.equal(roadSurface(s,a,b,1),roadTop(s,b));
  assert.ok(roadSurface(s,a,b,.72)>roadSurface(s,a,b,.29));
  for(const t of [.204,.373,.584,.723])assert.ok(roadSurface(s,a,b,t)>=height(s,a.x+t,a.z));
  s.terraces[key(b.x,b.z)]=6.25;
  assert.match(check(s,'road',[a,b]),/Too steep/);assert.match(check(s,'court',[a,b]),/gentler/);
});
