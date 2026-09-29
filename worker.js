/**
 * Cloudflare Worker opcional para WHO ICD-11.
 * Secrets esperados: WHO_CLIENT_ID y WHO_CLIENT_SECRET
 * Variable opcional: ALLOWED_ORIGIN (ej. https://usuario.github.io)
 */
let tokenCache={token:null,expires:0};
async function token(env){
  if(tokenCache.token && Date.now()<tokenCache.expires-60000) return tokenCache.token;
  const basic=btoa(`${env.WHO_CLIENT_ID}:${env.WHO_CLIENT_SECRET}`);
  const r=await fetch('https://icdaccessmanagement.who.int/connect/token',{method:'POST',headers:{'Authorization':`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&scope=icdapi_access'});
  if(!r.ok) throw new Error('No se pudo autenticar con WHO ICD');
  const j=await r.json(); tokenCache={token:j.access_token,expires:Date.now()+((j.expires_in||3600)*1000)}; return j.access_token;
}
function cors(env,request){const origin=request.headers.get('Origin')||'*';const allowed=env.ALLOWED_ORIGIN||'*';return {'Access-Control-Allow-Origin':allowed==='*'?'*':origin===allowed?origin:allowed,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,OPTIONS','Vary':'Origin'};}
export default {async fetch(request,env){
  const headers=cors(env,request); if(request.method==='OPTIONS') return new Response(null,{headers});
  const url=new URL(request.url);
  if(url.pathname==='/health') return Response.json({ok:true},{headers});
  if(url.pathname!=='/icd/search') return new Response('Not found',{status:404,headers});
  const q=(url.searchParams.get('q')||'').trim(); if(q.length<2) return Response.json({destinationEntities:[]},{headers});
  try{
    const t=await token(env);
    const endpoint=new URL('https://id.who.int/icd/release/11/2026-01/mms/search');
    endpoint.searchParams.set('q',q); endpoint.searchParams.set('useFlexisearch','true'); endpoint.searchParams.set('flatResults','true');
    const r=await fetch(endpoint,{headers:{'Authorization':`Bearer ${t}`,'Accept':'application/json','Accept-Language':'es','API-Version':'v2'}});
    const text=await r.text(); return new Response(text,{status:r.status,headers:{...headers,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'}});
  }catch(e){return Response.json({error:e.message},{status:502,headers});}
}};
