// Gerador de QR code autocontido — sem rede, sem dependência externa, para
// não depender do wi-fi da sala (a mesma razão de projeto do artifact que
// deu origem a este componente). Modo byte, correção nível M, versões 1–10
// (cobre confortavelmente uma URL do tipo
// "https://questoes.unidavi.app/#/enquete/entrar?c=ABC123").
//
// Adaptado do artifact "Onde a turma pende" (enquete de ética, 1ª fase) para
// esta base de código: aqui recebe `cor` em vez de embutir uma paleta
// própria, para herdar as cores do design system (kit.tsx) em vez de duas
// paletas concorrentes no mesmo app.

import { useMemo } from 'react'

const BLOCOS_M: Record<number, [number, number, number, number, number]> = {
  1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0], 4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0], 7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37], 10: [26, 4, 43, 1, 44],
}
const ALINHAMENTO: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
}

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
;(function inicializarTabelas() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function gerador(grau: number) {
  let p = [1]
  for (let i = 0; i < grau; i++) {
    const q = new Array(p.length + 1).fill(0)
    for (let j = 0; j < p.length; j++) {
      q[j] ^= mul(p[j], 1)
      q[j + 1] ^= mul(p[j], EXP[i])
    }
    p = q
  }
  return p
}

function correcao(dados: number[], nEc: number) {
  const g = gerador(nEc)
  const r = new Array(dados.length + nEc).fill(0)
  dados.forEach((d, i) => (r[i] = d))
  for (let i = 0; i < dados.length; i++) {
    const c = r[i]
    if (!c) continue
    for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c)
  }
  return r.slice(dados.length)
}

function bch(valor: number, poli: number, grau: number) {
  const nbits = (n: number) => (n === 0 ? 0 : 32 - Math.clz32(n))
  let v = valor << grau
  while (nbits(v) >= nbits(poli)) v ^= poli << (nbits(v) - nbits(poli))
  return (valor << grau) | v
}
const bitsFormato = (m: number) => (bch(m, 0b10100110111, 10) ^ 0b101010000010010) & 0x7fff

function capacidade(v: number) {
  const [, g1, d1, g2, d2] = BLOCOS_M[v]
  return g1 * d1 + g2 * d2 - Math.ceil((4 + (v >= 10 ? 16 : 8)) / 8)
}

function codificar(texto: string) {
  const bytes = Array.from(new TextEncoder().encode(texto))
  let versao: number | null = null
  for (let v = 1; v <= 10; v++) if (capacidade(v) >= bytes.length) { versao = v; break }
  if (!versao) throw new Error('link longo demais para o QR autocontido (versão máx. 10)')
  const [nEc, g1, d1, g2, d2] = BLOCOS_M[versao]
  const totalDados = g1 * d1 + g2 * d2
  const bits: number[] = []
  const push = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1) }
  push(0b0100, 4)
  push(bytes.length, versao >= 10 ? 16 : 8)
  bytes.forEach((b) => push(b, 8))
  for (let i = 0; i < 4 && bits.length < totalDados * 8; i++) bits.push(0)
  while (bits.length % 8) bits.push(0)
  const cw: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]
    cw.push(b)
  }
  let k = 0
  while (cw.length < totalDados) cw.push([0xec, 0x11][k++ % 2])
  const bd: number[][] = []
  const be: number[][] = []
  let p = 0
  for (let i = 0; i < g1; i++) { const b = cw.slice(p, p + d1); p += d1; bd.push(b); be.push(correcao(b, nEc)) }
  for (let i = 0; i < g2; i++) { const b = cw.slice(p, p + d2); p += d2; bd.push(b); be.push(correcao(b, nEc)) }
  const fin: number[] = []
  for (let i = 0; i < Math.max(d1, d2); i++) for (const b of bd) if (i < b.length) fin.push(b[i])
  for (let i = 0; i < nEc; i++) for (const b of be) fin.push(b[i])
  return { versao, codewords: fin }
}

function reservado(versao: number, n: number, r: number, c: number) {
  if (r === 6 || c === 6) return true
  if (r <= 8 && c <= 8) return true
  if (r <= 8 && c >= n - 8) return true
  if (r >= n - 8 && c <= 8) return true
  for (const ar of ALINHAMENTO[versao]) for (const ac of ALINHAMENTO[versao]) {
    if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) continue
    if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true
  }
  return false
}

function mascara(r: number, c: number, k: number) {
  switch (k) {
    case 0: return (r + c) % 2 === 0
    case 1: return r % 2 === 0
    case 2: return c % 3 === 0
    case 3: return (r + c) % 3 === 0
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  }
}

function penalidade(m: number[][]) {
  const n = m.length
  let p = 0
  const varrer = (get: (a: number, b: number) => number) => {
    for (let a = 0; a < n; a++) {
      let run = 1
      for (let b = 1; b < n; b++) {
        if (get(a, b) === get(a, b - 1)) run++
        else { if (run >= 5) p += 3 + (run - 5); run = 1 }
      }
      if (run >= 5) p += 3 + (run - 5)
    }
  }
  varrer((a, b) => m[a][b])
  varrer((a, b) => m[b][a])
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c]
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3
  }
  let esc = 0
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) esc += m[r][c]
  p += Math.floor(Math.abs((esc * 100) / (n * n) - 50) / 5) * 10
  return p
}

function gerarQR(texto: string): number[][] {
  const { versao, codewords } = codificar(texto)
  const n = versao * 4 + 17
  const base: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null))

  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const y = r + i, x = c + j
      if (y < 0 || x < 0 || y >= n || x >= n) continue
      const dentro = i >= 0 && i <= 6 && j >= 0 && j <= 6
      const anel = dentro && (i === 0 || i === 6 || j === 0 || j === 6)
      const nucleo = i >= 2 && i <= 4 && j >= 2 && j <= 4
      base[y][x] = anel || nucleo ? 1 : 0
    }
  }
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0)
  for (let i = 8; i < n - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0
    if (base[6][i] === null) base[6][i] = v
    if (base[i][6] === null) base[i][6] = v
  }
  for (const r of ALINHAMENTO[versao]) for (const c of ALINHAMENTO[versao]) {
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) continue
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) base[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) === 1 ? 0 : 1
  }

  const pos: [number, number][] = []
  let cima = true, col = n - 1
  while (col > 0) {
    if (col === 6) col--
    for (let i = 0; i < n; i++) {
      const r = cima ? n - 1 - i : i
      for (const cc of [col, col - 1]) if (cc >= 0 && !reservado(versao, n, r, cc)) pos.push([r, cc])
    }
    cima = !cima
    col -= 2
  }
  const bits: number[] = []
  codewords.forEach((b) => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1) })

  let melhor: { pen: number; m: number[][] } | null = null
  for (let k = 0; k < 8; k++) {
    const m = base.map((r) => r.map((v) => (v === null ? 0 : v)))
    pos.forEach(([r, c], i) => {
      const bit = i < bits.length ? bits[i] : 0
      m[r][c] = mascara(r, c, k) ? bit ^ 1 : bit
    })
    const f = bitsFormato(k)
    for (let i = 0; i < 15; i++) {
      const bit = (f >> i) & 1
      if (i < 6) m[i][8] = bit
      else if (i === 6) m[7][8] = bit
      else if (i === 7) m[8][8] = bit
      else if (i === 8) m[8][7] = bit
      else m[8][14 - i] = bit
      if (i < 8) m[8][n - 1 - i] = bit
      else m[n - 15 + i][8] = bit
    }
    m[n - 8][8] = 1
    const pen = penalidade(m)
    if (!melhor || pen < melhor.pen) melhor = { pen, m }
  }
  return melhor!.m
}

/**
 * QR autocontido, gerado no cliente — sem chamada de rede. `cor` deve casar
 * com um token do design system (ex.: a var CSS por trás de `bg-blue`), não
 * um hex solto, para o QR acompanhar tema claro/escuro se um dia existir.
 */
export function QR({ texto, lado, cor = '#023E88' }: { texto: string; lado: number | string; cor?: string }) {
  const m = useMemo(() => {
    try {
      return gerarQR(texto)
    } catch {
      return null
    }
  }, [texto])
  if (!m) return null
  const n = m.length
  const q = 3
  const total = n + q * 2
  const quadrados: JSX.Element[] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r][c]) quadrados.push(<rect key={`${r}-${c}`} x={c + q} y={r + q} width={1} height={1} />)
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={lado}
      height={lado}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code para entrar"
      style={{ display: 'block', background: '#fff' }}
    >
      <g fill={cor}>{quadrados}</g>
    </svg>
  )
}
