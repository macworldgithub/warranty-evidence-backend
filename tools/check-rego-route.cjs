#!/usr/bin/env node
'use strict';

// Run after deploying/restarting Warranty. No user token or InfoAgent credentials
// are sent; the registered route must reject this probe before provider lookup.
async function main() {
  const host = (process.argv[2] || process.env.WARRANTY_API_HOST || 'https://warranty-evidence.omnisuiteai.com').replace(/\/+$/, '');
  const url = new URL(host);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Pass the backend origin without /api/v1 or credentials.');
  }
  const endpoint = url.origin + '/api/v1/vehicle/decode-rego';
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ rego: 'TEST01', state: 'VIC' }),
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (response.status === 401) {
    console.log('PASS: POST ' + endpoint + ' is registered and requires a user session.');
    return;
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 404 && /Cannot POST/.test(String(body.message || ''))) {
    throw new Error('The deployed backend is missing POST /api/v1/vehicle/decode-rego. Deploy the current Warranty backend, rebuild it, and restart its running service.');
  }
  throw new Error('Expected HTTP 401 from the registered Rego route; received HTTP ' + response.status + '. Check the deployed service and proxy configuration.');
}

main().catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
