/**
 * NurseFlow API proxy for Cloudflare Workers.
 *
 * Responsibilities:
 *  - Protect WHO ICD API credentials from the public PWA bundle.
 *  - Proxy CIE-11 searches through the official WHO API.
 *  - Proxy CIMA searches and full medicine-detail requests when the PWA is
 *    configured to use Worker mode.
 *
 * Required Cloudflare Worker secrets:
 *   WHO_CLIENT_ID
 *   WHO_CLIENT_SECRET
 *
 * Deploy this file as a Cloudflare Worker and configure its public URL in:
 * NurseFlow > Ajustes > APIs y fuentes.
 */

let tokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Shared response headers.
 *
 * Access-Control-Allow-Origin is intentionally permissive because the PWA may
 * be hosted on any GitHub Pages URL during development. For a public product,
 * replace '*' with the production origin when practical.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300'
};

/**
 * Creates a JSON Response with the Worker CORS policy applied consistently.
 *
 * @param {*} data JSON-serialisable payload.
 * @param {number} status HTTP status code.
 * @returns {Response}
 */
const json = (data, status = 200) => new Response(
  JSON.stringify(data),
  {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
);

/**
 * Returns a valid WHO OAuth access token.
 *
 * Tokens are cached in the Worker isolate and refreshed shortly before expiry
 * to avoid requesting a new token for every CIE-11 search.
 *
 * @param {object} env Cloudflare Worker environment bindings.
 * @returns {Promise<string>}
 */
async function getWhoToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  if (!env.WHO_CLIENT_ID || !env.WHO_CLIENT_SECRET) {
    throw new Error('WHO credentials missing');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'icdapi_access'
  });

  const auth = btoa(`${env.WHO_CLIENT_ID}:${env.WHO_CLIENT_SECRET}`);
  const response = await fetch(
    'https://icdaccessmanagement.who.int/connect/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error(`WHO token ${response.status}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
  };

  return tokenCache.token;
}

/**
 * Searches the WHO ICD-11 MMS release in Spanish.
 *
 * @param {string} query Search text.
 * @param {object} env Cloudflare Worker environment bindings.
 * @returns {Promise<object>}
 */
async function whoSearch(query, env) {
  const token = await getWhoToken(env);
  const url = `https://id.who.int/icd/release/11/2026-01/mms/search?q=${encodeURIComponent(query)}&useFlexisearch=true&flatResults=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'API-Version': 'v2',
      'Accept-Language': 'es',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`WHO search ${response.status}`);
  }

  return response.json();
}

/**
 * Normalises list-shaped API responses used by CIMA search endpoints.
 *
 * @param {*} data Raw response payload.
 * @returns {Array}
 */
function rows(data) {
  return Array.isArray(data)
    ? data
    : (data?.resultados || data?.results || []);
}

/**
 * Searches CIMA both by medicine name and active ingredient and removes
 * duplicate records before returning them to the PWA.
 *
 * @param {string} query Search text.
 * @returns {Promise<Array>}
 */
async function cimaSearch(query) {
  const urls = [
    `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(query)}`,
    `https://cima.aemps.es/cima/rest/medicamentos?practiv1=${encodeURIComponent(query)}`
  ];

  const groups = await Promise.all(
    urls.map(async url => {
      const response = await fetch(url);
      return response.ok ? rows(await response.json()) : [];
    })
  );

  const seen = new Set();
  return groups
    .flat()
    .filter(item => {
      const key = item.nregistro || item.cn || item.nombre;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}

/**
 * Retrieves the full CIMA record for a specific medicine.
 *
 * Search responses are only summaries. This endpoint is required so the PWA
 * can display structured details such as active ingredients, pharmaceutical
 * form and administration routes whenever CIMA provides them.
 *
 * @param {string} registrationNumber CIMA nregistro value.
 * @returns {Promise<object>}
 */
async function cimaDetail(registrationNumber) {
  const response = await fetch(
    `https://cima.aemps.es/cima/rest/medicamento?nregistro=${encodeURIComponent(registrationNumber)}`
  );

  if (!response.ok) {
    throw new Error(`CIMA detail ${response.status}`);
  }

  return response.json();
}

export default {
  /**
   * Cloudflare Worker request handler.
   *
   * @param {Request} request Incoming HTTP request.
   * @param {object} env Worker bindings and secrets.
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health') {
        return json({
          ok: true,
          service: 'NurseFlow API',
          whoConfigured: Boolean(env.WHO_CLIENT_ID && env.WHO_CLIENT_SECRET)
        });
      }

      if (url.pathname === '/icd/search') {
        const query = (url.searchParams.get('q') || '').trim();

        if (query.length < 2) {
          return json({ error: 'query too short' }, 400);
        }

        return json(await whoSearch(query, env));
      }

      // Full medicine detail must be exposed independently from the list search
      // so the frontend can upgrade a lightweight search result on demand.
      if (url.pathname === '/cima/detail') {
        const registrationNumber = (url.searchParams.get('nregistro') || '').trim();

        if (!registrationNumber) {
          return json({ error: 'nregistro required' }, 400);
        }

        return json(await cimaDetail(registrationNumber));
      }

      if (url.pathname === '/cima') {
        const query = (url.searchParams.get('query') || '').trim();

        if (query.length < 2) {
          return json({ error: 'query too short' }, 400);
        }

        return json(await cimaSearch(query));
      }

      return json({
        ok: true,
        endpoints: [
          '/health',
          '/icd/search?q=neumonia',
          '/cima?query=paracetamol',
          '/cima/detail?nregistro=77758'
        ]
      });
    } catch (error) {
      console.error('NurseFlow Worker upstream error:', error);
      return json({ error: error?.message || 'upstream error' }, 502);
    }
  }
};
