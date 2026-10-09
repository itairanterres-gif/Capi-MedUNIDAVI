import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const packageSHA = '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40';
const manifestSHA = 'e22d34e7144e568509aaf521ac93cc54f9bec8cd67fbe0b79c7a192345774d20';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function readApprovedAssets(env) {
  if (env.CAPI_AMRIGS_MANIFEST) {
    const bytes = await readFile(env.CAPI_AMRIGS_MANIFEST);
    if (hash(bytes) !== manifestSHA) throw new Error('Approved manifest hash mismatch');
    const manifest = JSON.parse(bytes);
    if (manifest.version !== 1 || manifest.sourcePackageSHA256 !== packageSHA || manifest.total !== 477 ||
        manifest.status !== 'draft' || Object.keys(manifest.imagens_sha256 || {}).length !== 31)
      throw new Error('Approved draft manifest required');
    return manifest.imagens_sha256;
  }
  const bytes = await readFile(env.CAPI_AMRIGS_PACKAGE);
  if (hash(bytes) !== packageSHA) throw new Error('Approved package hash mismatch');
  const pkg = JSON.parse(bytes);
  if (pkg.questoes?.length !== 477 || !pkg.questoes.every(q => q.status === 'draft') || Object.keys(pkg.imagens_sha256 || {}).length !== 31)
    throw new Error('Approved draft package required');
  return pkg.imagens_sha256;
}
