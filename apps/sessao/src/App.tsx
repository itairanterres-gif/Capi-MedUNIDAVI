import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Coordenacao } from './features/admin/Coordenacao'
import { Home } from './features/Home'
import { ProfessorHome } from './features/sessao-professor/ProfessorHome'
import { NovaSessao } from './features/sessao-professor/NovaSessao'
import { ProfessorConduzir } from './features/sessao-professor/ProfessorConduzir'
import { ResultadoSessao } from './features/sessao-professor/ResultadoSessao'
import { Projecao } from './features/projecao/Projecao'
import { AlunoEntrar } from './features/sessao-aluno/AlunoEntrar'
import { AlunoSessao } from './features/sessao-aluno/AlunoSessao'
import { RevisaoSP } from './features/sessao-aluno/RevisaoSP'
import { CapiCards } from './features/cards/CapiCards'
import { Importacao } from './features/importacao/Importacao'
import { PortaA } from './features/importacao/PortaA'
import { PortaB } from './features/importacao/PortaB'
import { DEMO_MODE } from './lib/client'
import { CAPI_INTEGRATED } from './lib/capiIntegration'
import { AuthProvider } from './features/auth/AuthContext'
import { RequireAdmin, RequireAuth, RequireStaff } from './features/auth/guards'

function IrParaAtividades() {
  useEffect(() => { window.location.replace('/entrar/') }, [])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        {CAPI_INTEGRATED && <CapiNavigation />}
        {DEMO_MODE && (
          <div className="bg-amber text-white text-center text-xs font-bold py-1 tracking-wide">
            MODO DEMO — dados em memória, sem Supabase. As 799 questões são reais (4ª, 5ª e 6ª fases).
          </div>
        )}
        <Routes>
          {/* No Capi, o início da Sessão é a lista "Suas atividades" do /entrar. */}
          <Route path="/" element={CAPI_INTEGRATED ? <IrParaAtividades /> : <RequireAuth><Home /></RequireAuth>} />
          <Route path="/coordenacao" element={<RequireAdmin><Coordenacao /></RequireAdmin>} />
          <Route path="/professor" element={<RequireStaff><ProfessorHome /></RequireStaff>} />
          <Route path="/professor/nova" element={<RequireStaff><NovaSessao /></RequireStaff>} />
          <Route path="/importacao" element={<RequireStaff><Importacao /></RequireStaff>} />
          <Route path="/importacao/porta-a" element={<RequireStaff><PortaA /></RequireStaff>} />
          <Route path="/importacao/porta-b" element={<RequireStaff><PortaB /></RequireStaff>} />
          <Route path="/professor/:sessaoId" element={<RequireStaff><ProfessorConduzir /></RequireStaff>} />
          {/* Resultado NOMINAL da turma — professor da sessão e coordenação. Nunca projetar. */}
          <Route path="/professor/:sessaoId/resultado" element={<RequireStaff><ResultadoSessao /></RequireStaff>} />
          {/* Projeção fica sem guarda: é a tela de sala (TV/projetor), sem
              login próprio — só lê agregados por sessaoId. */}
          <Route path="/projecao/:sessaoId" element={<Projecao />} />
          <Route path="/aluno" element={<RequireAuth><AlunoEntrar /></RequireAuth>} />
          <Route path="/aluno/:sessaoId" element={<RequireAuth><AlunoSessao /></RequireAuth>} />
          {/* Liberados ao aluno depois da sessão: o banco da SP e o deck. */}
          <Route path="/aluno/:sessaoId/questoes" element={<RequireAuth><RevisaoSP /></RequireAuth>} />
          <Route path="/aluno/:sessaoId/cards" element={<RequireAuth><CapiCards /></RequireAuth>} />
          <Route path="/cards" element={<RequireAuth><CapiCards /></RequireAuth>} />

          {/* Enquetes de sala retiradas do Capi por decisão do professor
              (09/10/2026). Código e dados preservados; rotas desativadas. */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

function CapiNavigation() {
  const route = useLocation()
  const target = '/questoes/#' + route.pathname
  return <nav aria-label="Capi MedUNIDAVI" className="px-6 py-3 bg-white border-b border-border text-sm"><a href={'/entrar?next=' + encodeURIComponent(target)} className="text-blue underline">Voltar ao Capi MedUNIDAVI</a>{' · '}<a href="/sobre" className="text-blue underline">Sobre</a></nav>
}
