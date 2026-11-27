/** Encrypted GitHub Gist cloud backup and guarded cross-device synchronization.
 * No financial data or GitHub tokens are ever sent to our public GitHub Pages repo.
 * Tokens and the cloud key live inside the password-protected local vault.
 */
import { validateState } from './finance.js';

const API='https://api.github.com/gists';
const FILENAME='money-management-encrypted.json';
const ITERATIONS=420_000;
const ENCRYPTION_AAD=new TextEncoder().encode('Money Management cloud backup v1');
const enc=new TextEncoder();
const dec=new TextDecoder('utf-8',{fatal:true});
const MAX_BYTES=600_000;
const error=(code,message)=>Object.assign(new Error(message),{code});
function b64(bytes){const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let str='';for(let i=0;i<a.length;i+=16384)str+=String.fromCharCode(...a.subarray(i,i+16384));return btoa(str);}
function from64(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function hexId(id){return /^[0-9a-f]{20,64}$/i.test(String(id))?String(id):'';}

export async function deriveCloudKey(password,salt,crypto=globalThis.crypto){
  if(typeof password!=='string'||password.length<12)throw error('PASSWORD','Mật khẩu đám mây cần ít nhất 12 ký tự.');
  if(!crypto?.subtle||!crypto?.getRandomValues)throw error('CRYPTO','Trình duyệt không hỗ trợ mã hóa Web Crypto.');
  const source=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},source,256);
  return b64(new Uint8Array(bits));
}
async function cryptoKey(raw,crypto){return crypto.subtle.importKey('raw',from64(raw),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptCloudState(state, rawKey, salt, crypto=globalThis.crypto){
  const normalized=validateState(state);
  const text=JSON.stringify(normalized);
  if(enc.encode(text).length>MAX_BYTES)throw error('SIZE','Sổ hiện tại quá lớn cho một file Gist. Hãy giữ bản sao JSON và dùng dịch vụ lưu trữ phù hợp hơn.');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:ENCRYPTION_AAD},await cryptoKey(rawKey,crypto),enc.encode(text));
  return {format:'money-management-cloud-v1',salt,iterations:ITERATIONS,nonce:b64(iv),ciphertext:b64(encrypted)};
}
export async function decryptCloudState(envelope,rawKey,crypto=globalThis.crypto){
  if(!envelope||envelope.format!=='money-management-cloud-v1'||typeof envelope.ciphertext!=='string'||envelope.iterations!==ITERATIONS)throw error('FORMAT','File trên đám mây không đúng định dạng Money Management.');
  const iv=from64(envelope.nonce);
  if(iv.length!==12)throw error('FORMAT','File đám mây bị hỏng.');
  try{
    const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:ENCRYPTION_AAD},await cryptoKey(rawKey,crypto),from64(envelope.ciphertext));
    return validateState(JSON.parse(dec.decode(bytes)));
  }catch{throw error('DECRYPT','Sai mật khẩu đám mây hoặc bản sao đã bị sửa/hỏng. Không thay đổi sổ trên thiết bị.');}
}
function parseGist(gist){
  if(!gist || typeof gist.id!=='string'||!hexId(gist.id))throw error('GIST','Không nhận được Gist hợp lệ từ GitHub.');
  const entry=gist.files?.[FILENAME];
  if(!entry||entry.truncated||typeof entry.content!=='string'||entry.content.length>2_000_000)throw error('GIST_FILE','Không tìm thấy file mã hóa hoặc file quá lớn. Không thay đổi dữ liệu.');
  let envelope;
  try{envelope=JSON.parse(entry.content);}catch{throw error('FORMAT','Nội dung file mã hóa bị lỗi.');}
  const revision=gist.history?.[0]?.version;
  if(!/^[0-9a-f]{40}$/i.test(revision||''))throw error('REVISION','Không thể xác nhận phiên bản đám mây để tránh ghi đè.');
  return {id:gist.id,envelope,revision,updatedAt:gist.updated_at};
}
export class GitHubCloudSync {
  constructor({vault,readState,fetchImpl=globalThis.fetch,crypto=globalThis.crypto,onChange=()=>{}}){
    this.vault=vault;this.readState=readState;this.fetchImpl=fetchImpl;this.crypto=crypto;this.onChange=onChange;
    this.connection=vault.getMetadata('cloud');
    this.remotePending=null;
    this.state={status:this.connection?(this.connection.pendingInit?'needs-pull':'connected'):'unconfigured',lastSyncedAt:this.connection?.lastSync||null,error:'',pending:0,remoteChanges:Boolean(this.connection?.pendingInit)};
    this._queue=Promise.resolve();
  }
  status(){return {...this.state,connected:Boolean(this.connection),gistId:this.connection?.gistId||'',gistUrl:this.connection?.gistId?`https://gist.github.com/${this.connection.gistId}`:'',};}
  notify(patch={}){Object.assign(this.state,patch);this.onChange(this.status());return this.status();}
  async api(token,method,url,body){
    if(!this.fetchImpl)throw error('OFFLINE','Không thể kết nối GitHub.');
    let response;
    try{response=await this.fetchImpl(url,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});}
    catch{throw error('NETWORK','Không kết nối được GitHub. Sổ trên thiết bị vẫn an toàn; thử lại khi có mạng.');}
    if(!response.ok){
      const problem=({401:'Mã GitHub không hợp lệ hoặc đã hết hạn.',403:'GitHub từ chối quyền Gist hoặc giới hạn API.',404:'Không tìm thấy Gist. Kiểm tra ID và quyền truy cập.',409:'Dữ liệu đám mây đang có xung đột.'})[response.status]
        ||`GitHub trả về lỗi ${response.status}.`;
      throw error('GITHUB',problem);
    }
    return response.json();
  }
  async create(token,password,state){
    if(!this.vault.enabled)throw error('VAULT','Hãy bật mã hóa trên thiết bị trước.');
    const salt=b64(this.crypto.getRandomValues(new Uint8Array(16)));
    const key=await deriveCloudKey(password,from64(salt),this.crypto);
    this.notify({status:'syncing',error:''});
    try{
      const encrypted=await encryptCloudState(state,key,salt,this.crypto);
      const gist=await this.api(token,'POST',API,{description:'Money Management · encrypted personal backup (do not publish the key)',public:false,files:{[FILENAME]:{content:JSON.stringify(encrypted)}}});
      const parsed=parseGist(gist);
      this.connection={gistId:parsed.id,token,key,salt,revision:parsed.revision,lastSync:new Date().toISOString(),pendingInit:false};
      await this.vault.setMetadata('cloud',this.connection);
      this.remotePending=null;
      return this.notify({status:'connected',lastSyncedAt:this.connection.lastSync,remoteChanges:false,error:''});
    }catch(e){this.notify({status:'error',error:e.message});throw e;}
  }
  async connect(token,gistId,password){
    if(!this.vault.enabled)throw error('VAULT','Hãy bật mã hóa trên thiết bị trước.');
    const id=hexId((gistId||'').trim().split('/').filter(Boolean).at(-1));
    if(!id)throw error('ID','ID Gist không hợp lệ. Hãy dán ID hoặc URL của Gist sao lưu.');
    this.notify({status:'syncing',error:''});
    try{
      const parsed=parseGist(await this.api(token,'GET',`${API}/${id}`));
      const key=await deriveCloudKey(password,from64(parsed.envelope.salt),this.crypto);
      const remote=await decryptCloudState(parsed.envelope,key,this.crypto);
      this.connection={gistId:id,token,key,salt:parsed.envelope.salt,revision:parsed.revision,lastSync:null,pendingInit:true};
      this.remotePending={state:remote,revision:parsed.revision};
      await this.vault.setMetadata('cloud',this.connection);
      return this.notify({status:'needs-pull',remoteChanges:true,error:''});
    }catch(e){this.notify({status:'error',error:e.message});throw e;}
  }
  async check(){
    if(!this.connection)return this.status();
    const c=this.connection;
    try{
      const result=parseGist(await this.api(c.token,'GET',`${API}/${c.gistId}`));
      if(result.revision!==c.revision || c.pendingInit){
        const state=await decryptCloudState(result.envelope,c.key,this.crypto);
        this.remotePending={state,revision:result.revision};
        return this.notify({status:'needs-pull',remoteChanges:true,error:''});
      }
      return this.notify({status:'connected',remoteChanges:false,error:''});
    }catch(e){return this.notify({status:'error',error:e.message});}
  }
  peekRemote(){return this.remotePending?{...this.remotePending,state:structuredClone(this.remotePending.state)}:null;}
  async acknowledgePull(revision){
    if(!this.remotePending || this.remotePending.revision!==revision || !this.connection)throw error('CONFLICT','Bản đám mây đã thay đổi. Hãy kiểm tra lại.');
    const updated={...this.connection,revision,lastSync:new Date().toISOString(),pendingInit:false};
    await this.vault.setMetadata('cloud',updated);
    this.connection=updated;this.remotePending=null;
    return this.notify({status:'connected',remoteChanges:false,lastSyncedAt:updated.lastSync,error:''});
  }
  /** Never auto-overwrite a changed remote; queue pushes in their original order. */
  push(state){
    if(!this.connection || this.state.remoteChanges || this.connection.pendingInit)return Promise.resolve(false);
    const snapshot=structuredClone(state);
    this.notify({pending:this.state.pending+1});
    const work=this._queue.catch(()=>{}).then(async()=>{
      const c=this.connection;
      if(!c||this.state.remoteChanges)return false;
      if(globalThis.navigator?.onLine===false){this.notify({status:'offline',error:'Đang ngoại tuyến. Chưa đồng bộ thay đổi lên đám mây.'});return false;}
      this.notify({status:'syncing',error:''});
      try{
        const latest=parseGist(await this.api(c.token,'GET',`${API}/${c.gistId}`));
        if(latest.revision!==c.revision){
          this.remotePending={state:await decryptCloudState(latest.envelope,c.key,this.crypto),revision:latest.revision};
          this.notify({status:'needs-pull',remoteChanges:true,error:'Gist đã thay đổi trên thiết bị khác. Đã dừng ghi để tránh mất dữ liệu; hãy xem bản đám mây trong Cài đặt.'});
          return false;
        }
        const encrypted=await encryptCloudState(snapshot,c.key,c.salt,this.crypto);
        const response=parseGist(await this.api(c.token,'PATCH',`${API}/${c.gistId}`,{files:{[FILENAME]:{content:JSON.stringify(encrypted)}}}));
        const next={...c,revision:response.revision,lastSync:new Date().toISOString()};
        this.connection=next;
        try{await this.vault.setMetadata('cloud',next);}catch{throw error('LOCAL_SAVE','Đã cập nhật đám mây nhưng không ghi nhớ được phiên bản. Hãy kiểm tra lại trước khi ghi tiếp.');}
        this.notify({status:'connected',lastSyncedAt:next.lastSync,error:'',remoteChanges:false});
        return true;
      }catch(e){this.notify({status:'error',error:e.message});return false;}
    }).finally(()=>this.notify({pending:Math.max(0,this.state.pending-1)}));
    this._queue=work.catch(()=>{});
    return work;
  }
  async disconnect(){
    await this._queue;
    await this.vault.setMetadata('cloud',null);
    this.connection=null;this.remotePending=null;
    return this.notify({status:'unconfigured',lastSyncedAt:null,remoteChanges:false,error:''});
  }
  flush(){return this._queue;}
}
