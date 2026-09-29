/**
 * NurseFlow API proxy for Cloudflare Workers.
 * Required secrets:
 *   WHO_CLIENT_ID
 *   WHO_CLIENT_SECRET
 * Deploy this file as a Worker and configure its URL in NurseFlow > Ajustes > APIs y fuentes.
 */
let tokenCache = { token: null, expiresAt: 0 };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});

async function getWhoToken(env){
  if(tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) return tokenCache.token;
  if(!env.WHO_CLIENT_ID || !env.WHO_CLIENT_SECRET) throw new Error('WHO credentials missing');
  const body=new URLSearchParams({grant_type:'client_credentials',scope:'icdapi_access'});
  const auth=btoa(`${env.WHO_CLIENT_ID}:${env.WHO_CLIENT_SECRET}`);
  const r=await fetch('https://icdaccessmanagement.who.int/connect/token',{method:'POST',headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!r.ok) throw new Error(`WHO token ${r.status}`);
  const data=await r.json();
  tokenCache={token:data.access_token,expiresAt:Date.now()+(Number(data.expires_in||3600)*1000)};
  return tokenCache.token;
}

async function whoSearch(q,env){
  const token=await getWhoToken(env);
  const url=`https://id.who.int/icd/release/11/2026-01/mms/search?q=${encodeURIComponent(q)}&useFlexisearch=true&flatResults=true`;
  const r=await fetch(url,{headers:{'Authorization':`Bearer ${token}`,'API-Version':'v2','Accept-Language':'es','Content-Type':'application/json'}});
  if(!r.ok) throw new Error(`WHO search ${r.status}`);
  return r.json();
}

function rows(data){return Array.isArray(data)?data:(data?.resultados||data?.results||[])}
async function cimaSearch(q){
  const urls=[`https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(q)}`,`https://cima.aemps.es/cima/rest/medicamentos?practiv1=${encodeURIComponent(q)}`];
  const out=await Promise.all(urls.map(async u=>{const r=await fetch(u);return r.ok?rows(await r.json()):[]}));
  const seen=new Set();
  return out.flat().filter(x=>{const k=x.nregistro||x.cn||x.nombre;if(seen.has(k))return false;seen.add(k);return true}).slice(0,40);
}

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const url=new URL(request.url);
    try{
      if(url.pathname==='/health')return json({ok:true,service:'NurseFlow API',whoConfigured:Boolean(env.WHO_CLIENT_ID&&env.WHO_CLIENT_SECRET)});
      if(url.pathname==='/icd/search'){
        const q=(url.searchParams.get('q')||'').trim();if(q.length<2)return json({error:'query too short'},400);
        return json(await whoSearch(q,env));
      }
      if(url.pathname==='/cima'){
        const q=(url.searchParams.get('query')||'').trim();if(q.length<2)return json({error:'query too short'},400);
        return json(await cimaSearch(q));
      }
      return json({ok:true,endpoints:['/health','/icd/search?q=neumonia','/cima?query=paracetamol']});
    }catch(e){return json({error:e.message||'upstream error'},502)}
  }
};
