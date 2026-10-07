import type { SessaoClient } from './api'
import type { EnqueteClient } from './enqueteApi'

// Fail closed if an integrated build ever selects an in-memory adapter.
// No seed data, identities or fake authorization are imported here.
const disabled = {
  get(): never { throw new Error('Modo demo indisponível na integração Capi.') },
}
export const demoClient: SessaoClient = new Proxy({} as SessaoClient, disabled)
export const demoEnqueteClient: EnqueteClient = new Proxy({} as EnqueteClient, disabled)
