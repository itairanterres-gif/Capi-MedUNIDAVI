// Production remains closed until the private delivery and server authorization
// contract are implemented and verified. An environment flag cannot approve it.
export function requireLocalImageFixture(env) {
  if (env.CAPI_LOCAL_PREPARATION !== '1' || env.CF_PAGES === '1' || env.CI === 'true')
    throw new Error('Private Supabase images unprovisioned: production build blocked');
}

// Future delivery primitive: no public URLs, signed links or anonymous fallback.
// Caller must supply the existing authenticated Supabase client and reviewed map.
export async function downloadPrivateImage(client, contract, name, hashes) {
  if (contract?.state !== 'verified' || contract.private !== true || !contract.bucket ||
      !/^[a-z0-9-]+$/.test(contract.bucket) || !/^[a-f0-9]{64}$/.test(contract.prefix || ''))
    throw new Error('Private image contract incomplete');
  if (!/^\d{4}\/[\w.-]+\.png$/.test(name) || !Object.hasOwn(hashes, name))
    throw new Error('Image outside approved manifest');
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth?.user || auth.user.is_anonymous) throw new Error('Authentication required');
  const { data, error } = await client.storage.from(contract.bucket).download(contract.prefix + '/' + name);
  if (error || !data) throw new Error('Private image unavailable');
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length > 10000000 || [137,80,78,71,13,10,26,10].some((b,i) => bytes[i] !== b))
    throw new Error('Invalid PNG');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
  if (hash !== hashes[name]) throw new Error('Image hash mismatch');
  return data;
}
