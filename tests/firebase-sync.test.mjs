import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createEmptyState } from '../dist/finance.js';
import { FirebaseLedgerSync, parseFirebaseConfig, loadFirebaseConfig, storeFirebaseConfig, fingerprint } from '../dist/firebase-sync.js';

const config={apiKey:'test-public-api-key',authDomain:'money-test.firebaseapp.com',projectId:'money-test',appId:'1:123:web:abc'};
const clone=x=>structuredClone(x);
const wait = async()=>{await new Promise(resolve=>setTimeout(resolve,5));};
class MemStorage{
  constructor(){this.store=new Map()}
  getItem(k){return this.store.has(k)?this.store.get(k):null}
  setItem(k,v){this.store.set(k,String(v))}
  removeItem(k){this.store.delete(k)}
}
class Vault{
  enabled=true;
  meta={};
  getMetadata(name){return clone(this.meta[name]||null)}
  async setMetadata(name,value){if(value===null)delete this.meta[name];else this.meta[name]=clone(value)}
}
class Server{
  constructor(){this.docs=new Map();this.watchers=new Map();}
  key(uid){return uid}
  transport(uid){
    const backend=this;
    return {
      currentUser:()=>({uid,email:'money@example.com'}),
      get:async who=>clone(backend.docs.get(who)||null),
      async put(who,expectedRevision,envelope){
        const found=backend.docs.get(who)||null;
        if((found?.revision||0)!==expectedRevision)throw Object.assign(new Error('Remote has changed'),{code:'REVISION_CONFLICT'});
        const entry={revision:(found?.revision||0)+1,envelope:clone(envelope)};
        backend.docs.set(who,entry);
        queueMicrotask(()=>{for(const f of backend.watchers.get(who)||[])f(clone(entry));});
        return clone(entry);
      },
      subscribe(who,fn){let watchers=backend.watchers.get(who);if(!watchers){watchers=new Set();backend.watchers.set(who,watchers);}watchers.add(fn);return()=>watchers.delete(fn)},
      signIn:async()=>({user:{uid,email:'money@example.com'}}),
      signUp:async()=>({user:{uid,email:'money@example.com'}}),
      signOut:async()=>{},close:()=>{},
    };
  }
}
function makeDevice(server,{uid='same-user',onlineState=true,initial=null}={}){
  const vault=new Vault(),storage=new MemStorage();storeFirebaseConfig(config,storage);
  let ledger=initial?clone(initial):createEmptyState('2026-11-27');
  let safe=true; let online=onlineState;
  const sync=new FirebaseLedgerSync({vault,storage,crypto:webcrypto,readState:()=>clone(ledger),
    applyRemote:async value=>{ledger=clone(value);return true},canApplyRemote:()=>safe,
    online:()=>online,makeTransport:async()=>server.transport(uid)});
  return {sync,vault,storage,getLedger:()=>clone(ledger),putLedger:value=>{ledger=clone(value)},
    safe:value=>safe=value,online:value=>online=value};
}
const withTransaction=(device,amount,id)=>{
  const data=device.getLedger();
  data.transactions.push({id,type:'expense',amount,date:'2026-11-27',categoryId:'food',accountId:data.accounts[0].id,note:'Mẫu',createdAt:'2026-11-27T00:00:00.000Z'});
  device.putLedger(data);
};

test('Firebase config rejects secret/admin configuration and accepts only web config fields',()=>{
  assert.throws(()=>parseFirebaseConfig({projectId:'test'}));
  assert.throws(()=>parseFirebaseConfig('{bad json'));
  assert.deepEqual(parseFirebaseConfig({...config,privateKey:'secret'}),config);
  const storage=new MemStorage();storeFirebaseConfig({...config,privateKey:'secret'},storage);
  assert.equal(JSON.stringify(loadFirebaseConfig(storage)).includes('secret'),false);
});

test('new account explicitly creates encrypted cloud then second device unlocks and receives it',async()=>{
  const server=new Server();const a=makeDevice(server), b=makeDevice(server);
  await a.sync.start();assert.equal(a.sync.status().status,'empty-remote');
  let s=a.getLedger();s.profile.name='Máy A';a.putLedger(s);
  await a.sync.createCloud('a long independent password');
  assert.equal(a.sync.status().linked,true);
  assert.equal(server.docs.get('same-user').revision,1);
  assert.equal(JSON.stringify(server.docs.get('same-user')).includes('Máy A'),false);
  await b.sync.start();assert.equal(b.sync.status().status,'needs-key');
  await assert.rejects(b.sync.connectCloud('wrong password length enough'),/Sai mật khẩu/);
  assert.equal(b.getLedger().profile.name,'Bạn');
  await b.sync.connectCloud('a long independent password');
  assert.equal(b.sync.status().incoming,true);
  await b.sync.useRemote();
  assert.equal(b.getLedger().profile.name,'Máy A');
  assert.equal(b.sync.status().linked,true);
});

test('online changes automatically sync and appear on another clean device',async()=>{
  const server=new Server();const a=makeDevice(server),b=makeDevice(server);
  await a.sync.start();await a.sync.createCloud('a long independent password');
  await b.sync.start();await b.sync.connectCloud('a long independent password');await b.sync.useRemote();
  let s=a.getLedger();s.profile.name='Thay đổi A';a.putLedger(s);
  await a.sync.localChanged();await wait();
  assert.equal(server.docs.get('same-user').revision,2);
  assert.equal(b.getLedger().profile.name,'Thay đổi A');
  assert.equal(b.sync.status().conflict,false);
});

test('offline edits stay local and a later connection flushes only against expected revision',async()=>{
  const server=new Server();const a=makeDevice(server);
  await a.sync.start();await a.sync.createCloud('a long independent password');
  a.online(false);let s=a.getLedger();s.profile.name='Offline A';a.putLedger(s);
  await a.sync.localChanged();assert.equal(server.docs.get('same-user').revision,1);
  a.online(true);await a.sync.check();await a.sync.flush();await wait();
  assert.equal(server.docs.get('same-user').revision,2);
  assert.equal(a.sync.status().dirty,false);
});

test('two offline devices making different changes never overwrite silently',async()=>{
  const server=new Server();const a=makeDevice(server), b=makeDevice(server);
  await a.sync.start();await a.sync.createCloud('a long independent password');
  await b.sync.start();await b.sync.connectCloud('a long independent password');await b.sync.useRemote();
  b.online(false);
  let bs=b.getLedger();bs.profile.name='B offline';b.putLedger(bs);await b.sync.localChanged();
  let as=a.getLedger();as.profile.name='A online';a.putLedger(as);await a.sync.localChanged();await wait();
  assert.equal(server.docs.get('same-user').revision,2);
  assert.equal(b.getLedger().profile.name,'B offline');
  b.online(true);await b.sync.check();
  assert.equal(b.sync.status().conflict,true);
  assert.equal(b.getLedger().profile.name,'B offline');
  await b.sync.useRemote();
  assert.equal(b.getLedger().profile.name,'A online');
  assert.equal(b.sync.status().conflict,false);
});

test('owner can explicitly keep local after conflict, with CAS preserving new external revisions',async()=>{
  const server=new Server();const a=makeDevice(server), b=makeDevice(server);
  await a.sync.start();await a.sync.createCloud('a long independent password');
  await b.sync.start();await b.sync.connectCloud('a long independent password');await b.sync.useRemote();
  b.online(false);let bs=b.getLedger();bs.profile.name='B wants to keep';b.putLedger(bs);await b.sync.localChanged();
  let as=a.getLedger();as.profile.name='A';a.putLedger(as);await a.sync.localChanged();await wait();
  b.online(true);await b.sync.check();assert.equal(b.sync.status().conflict,true);
  await b.sync.keepLocal();assert.equal(server.docs.get('same-user').revision,3);
  assert.equal(b.sync.status().conflict,false);
});

test('open form prevents remote auto-replace until user explicitly accepts',async()=>{
  const server=new Server();const a=makeDevice(server),b=makeDevice(server);
  await a.sync.start();await a.sync.createCloud('a long independent password');
  await b.sync.start();await b.sync.connectCloud('a long independent password');await b.sync.useRemote();
  b.safe(false);const initial=b.getLedger().profile.name;
  let s=a.getLedger();s.profile.name='New remote';a.putLedger(s);await a.sync.localChanged();await wait();
  assert.equal(b.getLedger().profile.name,initial);
  assert.equal(b.sync.status().incoming,true);
  b.safe(true);await b.sync.useRemote();assert.equal(b.getLedger().profile.name,'New remote');
});

test('fingerprint captures state changes without exposing plaintext in remote envelope',async()=>{
  const a=createEmptyState('2026-11-27'),b=clone(a);b.profile.name='Secret';
  assert.notEqual(await fingerprint(a,webcrypto),await fingerprint(b,webcrypto));
});

test('repository rules are owner-scoped and deny public access', async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.match(rules,/request\.auth\.uid == uid/);
  assert.match(rules,/allow list, delete: if false/);
  assert.match(rules,/request\.resource\.data\.revision == resource\.data\.revision \+ 1/);
  assert.doesNotMatch(rules,/allow read, write:\s*if true/);
});

test('service worker caches new local Firebase modules but not remote SDK or private data',async()=>{
  const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  assert.match(sw,/1\.5\.0-firebase-sync/);
  assert.match(sw,/firebase-sync\.js/);
  assert.match(sw,/firebase-transport\.js/);
  assert.doesNotMatch(sw,/www\.gstatic\.com.*APP_FILES/);
});
