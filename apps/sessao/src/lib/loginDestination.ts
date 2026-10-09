const key='sessao-login-destination-v1'
const ttl=30*60*1000
const id='[A-Za-z0-9_-]{1,80}'
const routes=new RegExp(`^#/(?:|coordenacao|cards|importacao(?:/porta-[ab])?|professor(?:/nova|/${id}(?:/resultado)?|/enquetes(?:/nova|/${id})?)?|aluno(?:/${id}(?:/questoes|/cards)?)?|projecao/${id}|projecao-enquete/${id}|enquete(?:/${id})?)$`)
export function safeRoute(hash:string):string|null{return !/[\s\\%?]/.test(hash)&&routes.test(hash)?hash:null}
export function rememberDestination(storage:Storage,hash:string,now=Date.now()){
 const route=safeRoute(hash)
 try{if(route)storage.setItem(key,JSON.stringify({route,at:now}));else storage.removeItem(key)}catch{/* Storage is optional. */}
}
export function readDestination(storage:Storage,now=Date.now()):string|null{
 try{
  const data=JSON.parse(storage.getItem(key)??'null')
  if(data&&typeof data.at==='number'&&now>=data.at&&now-data.at<ttl&&typeof data.route==='string')return safeRoute(data.route)
  storage.removeItem(key)
 }catch{/* No destination is safer than trusting corrupt storage. */}
 return null
}
export function clearDestination(storage:Storage){try{storage.removeItem(key)}catch{/* Storage unavailable. */}}
export function preserveLoginDestination(){rememberDestination(sessionStorage,window.location.hash)}
export function restoreLoginDestination(){
 const current=safeRoute(window.location.hash)
 const route=(current&&current!=='#/'?current:readDestination(sessionStorage))??current
 if(route&&route!==window.location.hash){
  const oldURL=window.location.href
  window.history.replaceState(null,'',window.location.pathname+window.location.search+route)
  window.dispatchEvent(new HashChangeEvent('hashchange',{oldURL,newURL:window.location.href}))
 }
}
