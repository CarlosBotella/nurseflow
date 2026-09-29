const NurseDB = (() => {
  const NAME = 'nurseflow-db';
  const VERSION = 3;
  const STORES = ['settings','schedule','exceptions','days','cases','procedures','meds','flashcards','tasks','quiz','pae','customTerms','meta'];
  let db;
  function open(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(NAME,VERSION);
      req.onupgradeneeded=()=>{
        const d=req.result;
        STORES.forEach(s=>{ if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'}); });
      };
      req.onsuccess=()=>{db=req.result; resolve(db)};
      req.onerror=()=>reject(req.error);
    });
  }
  async function ready(){ if(!db) await open(); return db; }
  async function put(store,value){ const d=await ready(); return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>res(value);tx.onerror=()=>rej(tx.error);}); }
  async function bulkPut(store,values){ const d=await ready(); return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');const os=tx.objectStore(store);values.forEach(v=>os.put(v));tx.oncomplete=()=>res(values);tx.onerror=()=>rej(tx.error);}); }
  async function get(store,id){const d=await ready();return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function all(store){const d=await ready();return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
  async function remove(store,id){const d=await ready();return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function clear(store){const d=await ready();return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function exportAll(){const out={app:'NurseFlow',version:3,exportedAt:new Date().toISOString(),stores:{}};for(const s of STORES)out.stores[s]=await all(s);return out;}
  async function importAll(payload){if(!payload?.stores)throw new Error('Copia no válida');const d=await ready();for(const s of STORES){const tx=d.transaction(s,'readwrite');const os=tx.objectStore(s);os.clear();for(const row of (payload.stores[s]||[]))os.put(row);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});}return true;}
  async function reset(){ for(const s of STORES) await clear(s); }
  return {STORES,open,put,bulkPut,get,all,remove,clear,exportAll,importAll,reset};
})();
