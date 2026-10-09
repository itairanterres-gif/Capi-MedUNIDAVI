const project = 'https://ggjxbumtnizaeomioves.supabase.co';
const bucket = 'capi-amrigs-private';
const prefix = '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40';

// Liberação institucional: sem janela de tempo e sem lista de questões no
// navegador — o servidor (RLS) só devolve questões liberadas a alunos com
// matrícula. O navegador apenas confere que o contrato é o publicado.
export function releasedContract(contract) {
  return contract?.scope === 'release' && contract.state === 'released' && contract.project === project &&
    contract.private === true && contract.bucket === bucket && contract.prefix === prefix;
}
export function currentPilotContract(contract, now = Date.now()) {
  if (releasedContract(contract)) return true;
  return contract?.scope === 'pilot' && contract.state === 'ready-for-positive-test' &&
    contract.project === project && contract.private === true &&
    contract.bucket === bucket &&
    contract.prefix === prefix &&
    contract.questionId === 'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2' &&
    Array.isArray(contract.imagePaths) && contract.imagePaths.length === 1 &&
    contract.imagePaths[0] === '2019/q085_pg19.png' && Date.parse(contract.expiresAt) > now;
}
export function pilotQuestionAllowed(contract, id) {
  if (releasedContract(contract)) return typeof id === 'string' && id.length > 0;
  return currentPilotContract(contract) && id === contract.questionId;
}
// Imagens: no piloto, só a imagem do piloto; na liberação, qualquer imagem do
// manifesto aprovado (o hash de cada uma é conferido no download).
export function imageAllowed(contract, name, hashes) {
  if (!Object.hasOwn(hashes, name)) return false;
  if (releasedContract(contract)) return true;
  return Array.isArray(contract?.imagePaths) && contract.imagePaths.includes(name);
}
