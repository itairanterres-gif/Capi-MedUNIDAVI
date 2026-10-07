export function currentPilotContract(contract, now = Date.now()) {
  return contract?.scope === 'pilot' && contract.state === 'ready-for-positive-test' &&
    contract.project === 'https://ggjxbumtnizaeomioves.supabase.co' && contract.private === true &&
    contract.bucket === 'capi-amrigs-private' &&
    contract.prefix === '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40' &&
    contract.questionId === 'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2' &&
    Array.isArray(contract.imagePaths) && contract.imagePaths.length === 1 &&
    contract.imagePaths[0] === '2019/q085_pg19.png' && Date.parse(contract.expiresAt) > now;
}
export function pilotQuestionAllowed(contract, id) {
  return currentPilotContract(contract) && id === contract.questionId;
}
