import { currentPilotContract } from './pilot-runtime.mjs';
// Future delivery primitive: no public URLs, signed links or anonymous fallback.
// Caller must supply the existing authenticated Supabase client and reviewed map.
export async function downloadPrivateImage(client, contract, name, hashes) {
  if (!currentPilotContract(contract)) throw new Error('Private image contract incomplete');
  if (!/^\d{4}\/[\w.-]+\.png$/.test(name) || !Object.hasOwn(hashes, name) || !contract.imagePaths.includes(name))
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
  if (!currentPilotContract(contract)) throw new Error('Private image contract expired');
  return data;
}
