/**
 * NurseFlow edge API for Cloudflare Workers.
 *
 * Responsibilities:
 * 1. Protect WHO ICD credentials (optional CIE-11 integration).
 * 2. Proxy CIMA/AEMPS requests to avoid browser CORS differences.
 * 3. Aggregate the CIMA resources needed by the medication screen in one call.
 *
 * Secrets required only for CIE-11:
 *   WHO_CLIENT_ID
 *   WHO_CLIENT_SECRET
 */

let tokenCache = { token: null, expiresAt: 0 };

const CIMA_BASE = 'https://cima.aemps.es/cima/rest';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300'
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});

function asRows(data){
  return Array.isArray(data) ? data : (data?.resultados || data?.results || []);
}

async function fetchJson(url, options = {}){
  const response = await fetch(url, options);
  if(!response.ok) throw new Error(`Upstream ${response.status}: ${url}`);
  return response.json();
}

/* ------------------------------ WHO ICD-11 ------------------------------ */
async function getWhoToken(env){
  if(tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) return tokenCache.token;
  if(!env.WHO_CLIENT_ID || !env.WHO_CLIENT_SECRET) throw new Error('WHO credentials missing');

  const body = new URLSearchParams({ grant_type:'client_credentials', scope:'icdapi_access' });
  const auth = btoa(`${env.WHO_CLIENT_ID}:${env.WHO_CLIENT_SECRET}`);
  const response = await fetch('https://icdaccessmanagement.who.int/connect/token', {
    method:'POST',
    headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' },
    body
  });
  if(!response.ok) throw new Error(`WHO token ${response.status}`);
  const data = await response.json();
  tokenCache = { token:data.access_token, expiresAt:Date.now() + Number(data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function whoSearch(q, env){
  const token = await getWhoToken(env);
  const url = `https://id.who.int/icd/release/11/2026-01/mms/search?q=${encodeURIComponent(q)}&useFlexisearch=true&flatResults=true`;
  const response = await fetch(url, {
    headers:{ Authorization:`Bearer ${token}`, 'API-Version':'v2', 'Accept-Language':'es', 'Content-Type':'application/json' }
  });
  if(!response.ok) throw new Error(`WHO search ${response.status}`);
  return response.json();
}

/* ------------------------------ CIMA/AEMPS ------------------------------ */
async function cimaSearch(q){
  const nameUrl = `${CIMA_BASE}/medicamentos?nombre=${encodeURIComponent(q)}&autorizados=1`;
  const activeUrl = `${CIMA_BASE}/medicamentos?practiv1=${encodeURIComponent(q)}&autorizados=1`;
  const [byName, byActive] = await Promise.all([
    fetchJson(nameUrl).catch(()=>[]),
    fetchJson(activeUrl).catch(()=>[])
  ]);
  const seen = new Set();
  return [...asRows(byName), ...asRows(byActive)].filter(item => {
    const key = item.nregistro || item.nombre;
    if(!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

async function cimaMedicine(nregistro){
  return fetchJson(`${CIMA_BASE}/medicamento?nregistro=${encodeURIComponent(nregistro)}`);
}

async function cimaSections(nregistro){
  const response = await fetch(`${CIMA_BASE}/docSegmentado/contenido/1?nregistro=${encodeURIComponent(nregistro)}`, {
    headers:{ Accept:'application/json' }
  });
  if(!response.ok) throw new Error(`CIMA sections ${response.status}`);
  return asRows(await response.json());
}

async function cimaNotes(nregistro){
  return asRows(await fetchJson(`${CIMA_BASE}/notas?nregistro=${encodeURIComponent(nregistro)}`).catch(()=>[]));
}

async function cimaMaterials(nregistro){
  return asRows(await fetchJson(`${CIMA_BASE}/materiales?nregistro=${encodeURIComponent(nregistro)}`).catch(()=>[]));
}

async function cimaSupplyForMedicine(medicine){
  const affected = (medicine?.presentaciones || []).filter(p => p.cn && p.psum);
  const results = await Promise.all(affected.map(async p => {
    const rows = asRows(await fetchJson(`${CIMA_BASE}/psuministro/${encodeURIComponent(p.cn)}`).catch(()=>[]));
    return rows.map(row => ({ ...row, presentationName:p.nombre || row.nombre || '', cn:p.cn }));
  }));
  return results.flat();
}

/**
 * Returns a complete medication bundle for the frontend.
 * The Worker does not reinterpret clinical content: it forwards official
 * medicine metadata, segmented SmPC sections, safety notes/materials and
 * current supply incidents.
 */
async function cimaClinicalBundle(nregistro){
  const medicine = await cimaMedicine(nregistro);
  const [sections, notes, materials, supply] = await Promise.all([
    cimaSections(nregistro).catch(()=>[]),
    cimaNotes(nregistro),
    cimaMaterials(nregistro),
    cimaSupplyForMedicine(medicine)
  ]);
  return {
    source:'CIMA/AEMPS',
    fetchedAt:new Date().toISOString(),
    medicine,
    sections,
    notes,
    materials,
    supply
  };
}

export default {
  async fetch(request, env){
    if(request.method === 'OPTIONS') return new Response(null, { status:204, headers:cors });
    const url = new URL(request.url);

    try{
      if(url.pathname === '/health'){
        return json({ ok:true, service:'NurseFlow API', whoConfigured:Boolean(env.WHO_CLIENT_ID && env.WHO_CLIENT_SECRET) });
      }

      if(url.pathname === '/icd/search'){
        const q = (url.searchParams.get('q') || '').trim();
        if(q.length < 2) return json({ error:'query too short' }, 400);
        return json(await whoSearch(q, env));
      }

      if(url.pathname === '/cima/search'){
        const q = (url.searchParams.get('q') || '').trim();
        if(q.length < 2) return json({ error:'query too short' }, 400);
        return json(await cimaSearch(q));
      }

      if(url.pathname === '/cima/medicine'){
        const nregistro = (url.searchParams.get('nregistro') || '').trim();
        if(!nregistro) return json({ error:'nregistro required' }, 400);
        return json(await cimaMedicine(nregistro));
      }

      if(url.pathname === '/cima/clinical'){
        const nregistro = (url.searchParams.get('nregistro') || '').trim();
        if(!nregistro) return json({ error:'nregistro required' }, 400);
        return json(await cimaClinicalBundle(nregistro));
      }

      return json({
        ok:true,
        endpoints:[
          '/health',
          '/icd/search?q=neumonia',
          '/cima/search?q=paracetamol',
          '/cima/medicine?nregistro=77758',
          '/cima/clinical?nregistro=77758'
        ]
      });
    }catch(error){
      return json({ error:error?.message || 'upstream error' }, 502);
    }
  }
};
