import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, stats, tick, apply, check, cells, line, key } from '../src/sim.ts';
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
