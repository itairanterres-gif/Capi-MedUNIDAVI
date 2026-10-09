const key='capi-login-destination-v1';
const ttl=30*60*1000;
const id='[A-Za-z0-9_-]{1,80}';
const paths=new RegExp(`^(?:/amrigs/|/questoes/(?:#/(?:|coordenacao|cards|importacao(?:/porta-[ab])?|professor(?:/nova|/${id}(?:/resultado)?|/enquetes(?:/nova|/${id})?)?|aluno(?:/${id}(?:/questoes|/cards)?)?|projecao/${id}|projecao-enquete/${id}|enquete(?:/${id})?))?)$`);
export function safeDestination(value){return typeof value==='string'&&!/[\s\\%?]/.test(value)&&paths.test(value)?value:null}
export function clearDestination(storage){try{storage.removeItem(key)}catch{}}
export function loginDestination(search,storage,now=Date.now()){
 const params=new URLSearchParams(search);
 if(params.has('next')){
  const next=safeDestination(params.get('next'));
  clearDestination(storage);
  if(next){try{storage.setItem(key,JSON.stringify({next,at:now}))}catch{};return next}
  return '/questoes/';
 }
 try{
  const data=JSON.parse(storage.getItem(key)??'null');
  if(data&&typeof data.at==='number'&&now>=data.at&&now-data.at<ttl){const next=safeDestination(data.next);if(next)return next}
 }catch{}
 clearDestination(storage);
 return '/questoes/';
}
