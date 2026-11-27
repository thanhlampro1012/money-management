import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LocalVault, VAULT_KEY} from '../dist/vault.js';
import {GitHubCloudSync,deriveCloudKey,encryptCloudState,decryptCloudState} from '../dist/cloud.js';
import {createEmptyState,validateState} from '../dist/finance.js';

const pass='really-safe-example-passphrase-2026';
const makeStorage=()=>{
  const data=new Map();
  return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{data.set(k,String(v));},removeItem:k=>data.delete(k),dump:()=>Object.fromEntries(data)};
};
function example(){const s=createEmptyState('2026-11-27');s.transactions.push({id:'pay1',date:'2026-11-27',type:'income',amount:85000,categoryId:'salary',accountId:s.accounts[0].id,note:'Thử',createdAt:'2026-11-27T00:00:00.000Z'});return validateState(s);}

test('local vault encrypts the financial ledger and recovery without retaining cleartext',async()=>{
 const storage=makeStorage(),state=example();storage.setItem('vi-minh:v1',JSON.stringify(state));
 storage.setItem('money-management:recovery:v1',JSON.stringify({version:1,savedAt:'2026-11-27T00:00:00.000Z',state}));
 const vault=new LocalVault({storage});await vault.enable(pass);
 assert.equal(storage.getItem('vi-minh:v1'),null);assert.equal(storage.getItem('money-management:recovery:v1'),null);
 assert.equal(storage.getItem(VAULT_KEY).includes('pay1'),false);
 assert.equal(JSON.parse(vault.adapter.getItem('vi-minh:v1')).transactions[0].amount,85000);
 let updated=example();updated.transactions[0].amount=85001;vault.adapter.setItem('vi-minh:v1',JSON.stringify(updated));await vault.flush();
 const opened=new LocalVault({storage});await assert.rejects(opened.open('wrong-password-2026'),/không đúng|hỏng/);
 await opened.open(pass);assert.equal(JSON.parse(opened.adapter.getItem('vi-minh:v1')).transactions[0].amount,85001);
});
test('vault detects stale edits from another browser tab and never overwrites the newer copy',async()=>{
 const storage=makeStorage();storage.setItem('vi-minh:v1',JSON.stringify(example()));
 const a=new LocalVault({storage});await a.enable(pass);
 const b=new LocalVault({storage});await b.open(pass);
 const av=example();av.profile.name='Tab A';a.adapter.setItem('vi-minh:v1',JSON.stringify(av));await a.flush();
 const bv=example();bv.profile.name='Tab B';b.adapter.setItem('vi-minh:v1',JSON.stringify(bv));await assert.rejects(b.flush(),e=>e.code==='CONFLICT');
 b.rollback();await b.refresh();assert.equal(JSON.parse(b.adapter.getItem('vi-minh:v1')).profile.name,'Tab A');
});
test('cloud payload authenticates and rejects wrong key or damaged ciphertext',async()=>{
 const salt=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
 const key=await deriveCloudKey(pass,Uint8Array.from(atob(salt),c=>c.charCodeAt(0)));
 const result=await encryptCloudState(example(),key,salt);
 assert.equal((await decryptCloudState(result,key)).transactions[0].amount,85000);
 await assert.rejects(decryptCloudState({...result,ciphertext:result.ciphertext.slice(0,-4)+'AAAA'},key),/Sai mật khẩu/);
});
test('cloud creates a non-public encrypted Gist; restore is explicit; stale remote changes block overwrites',async()=>{
 const storage=makeStorage();storage.setItem('vi-minh:v1',JSON.stringify(example()));
 const vault=new LocalVault({storage});await vault.enable(pass);
 const network={content:null,version:0};
 const fakeFetch=async(url,opts)=>{
  const method=opts.method;
  if(!opts.headers.Authorization?.startsWith('Bearer github_pat_'))return{ok:false,status:401};
  if(method==='POST'){const body=JSON.parse(opts.body);assert.equal(body.public,false);network.content=body.files['money-management-encrypted.json'].content;network.version+=1;}
  else if(method==='PATCH'){const body=JSON.parse(opts.body);network.content=body.files['money-management-encrypted.json'].content;network.version+=1;}
  const gist={id:'a'.repeat(32),files:{'money-management-encrypted.json':{content:network.content}},history:[{version:String(network.version).padStart(40,'0')}],updated_at:new Date().toISOString()};
  return{ok:true,json:async()=>gist};
 };
 const remote=new GitHubCloudSync({vault,readState:example,fetchImpl:fakeFetch});
 await remote.create('github_pat_test',pass,example());assert.equal(remote.status().connected,true);
 assert.equal(storage.getItem(VAULT_KEY).includes('github_pat_test'),false);
 const otherStorage=makeStorage();otherStorage.setItem('vi-minh:v1',JSON.stringify(createEmptyState('2026-11-27')));
 const otherVault=new LocalVault({storage:otherStorage});await otherVault.enable('another-long-passphrase-2026');
 const other=new GitHubCloudSync({vault:otherVault,readState:example,fetchImpl:fakeFetch});
 await other.connect('github_pat_test',remote.status().gistId,pass);
 assert.equal(other.status().remoteChanges,true);assert.equal((await other.push(example())),false);
 assert.equal(other.peekRemote().state.transactions[0].amount,85000);
 await other.acknowledgePull(other.peekRemote().revision);assert.equal(other.status().remoteChanges,false);
 const newState=example();newState.transactions[0].amount=87000;assert.equal(await remote.push(newState),true);
 const tries=await other.push(example());assert.equal(tries,false);assert.equal(other.status().remoteChanges,true);
 assert.equal(other.peekRemote().state.transactions[0].amount,87000);
});
