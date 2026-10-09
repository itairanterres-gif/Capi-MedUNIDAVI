import { downloadPrivateImage } from './private-images.mjs';

export const privateImageMessage = 'Figura indisponível. Acesso negado, sessão expirada ou arquivo ausente. Entre novamente ou tente recarregar.';

// One owner per render: clear destroys URLs and invalidates outstanding downloads.
export function createPrivateImageView({ client, contract, hashes, document, urls = URL, download = downloadPrivateImage }) {
  let generation = 0;
  const owned = new Map();
  function clear() {
    generation++;
    for (const [url, entry] of owned) {
      entry.image.removeAttribute('src'); urls.revokeObjectURL(url); entry.cancel();
    }
    owned.clear();
  }
  function mount(images, { onReady = () => {} } = {}) {
    const current = generation;
    const jobs = [];
    const nodes = (images || []).map(item => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      const status = document.createElement('p');
      image.alt = item.alt || 'Figura associada à questão';
      image.hidden = true;
      caption.textContent = item.legenda || '';
      status.textContent = 'Carregando figura privada…'; status.setAttribute('role', 'status');
      figure.append(image, caption, status);
      jobs.push((async () => {
        try {
          if (typeof item.url !== 'string' || !/^\/amrigs\/\d{4}\/[\w.-]+\.png$/.test(item.url)) throw new Error('path');
          const blob = await download(client, contract, item.url.slice('/amrigs/'.length), hashes);
          if (current !== generation) return false;
          const url = urls.createObjectURL(blob);
          const loaded = new Promise(resolve => {
            owned.set(url, { image, cancel: () => resolve(false) });
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
          });
          image.src = url;
          if (!await loaded) throw new Error('decode');
          if (current !== generation) return false;
          image.hidden = false; status.textContent = ''; return true;
        } catch {
          if (current === generation) {
            if (image.src && owned.has(image.src)) { urls.revokeObjectURL(image.src); owned.delete(image.src); }
            image.removeAttribute('src'); image.hidden = true; status.textContent = privateImageMessage;
          }
          return false;
        }
      })());
      return figure;
    });
    const ready = Promise.all(jobs).then(results => {
      const ok = current === generation && results.every(Boolean);
      if (current === generation) onReady(ok);
      return ok;
    });
    return { nodes, ready };
  }
  return { mount, clear };
}
