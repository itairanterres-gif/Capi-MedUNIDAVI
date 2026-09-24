"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefing } from "@/components/Briefing";
import { Chat } from "@/components/Chat";
import { Cronometro } from "@/components/Cronometro";
import { Feedback } from "@/components/Feedback";
import { PainelExames } from "@/components/PainelExames";
import { publicar } from "@/lib/canal";
import {
  MarcacaoAvaliada,
  SessaoCompleta,
  baixar,
  paraJson,
  paraMarkdown,
} from "@/lib/exportar";
import { ESTADO_INICIAL, EstadoMomentos } from "@/lib/persona";
import {
  CUSTO_ZERO,
  DURACAO_CONSULTA_S,
  DURACAO_SEGUNDA_TENTATIVA_S,
  Custo,
  Fala,
  FalhaTecnica,
  Tentativa,
  somarCusto,
} from "@/lib/sessao";

type Fase = "briefing" | "consulta" | "feedback" | "segunda" | "fechamento";

const PRIMEIRA_FALA =
  "Bom dia. Sou o médico que vai te atender hoje. Como a senhora está?";

export default function Pagina() {
  const [fase, setFase] = useState<Fase>("briefing");
  const [sessaoId] = useState(
    () => `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const [iniciadaEm, setIniciadaEm] = useState<number>(Date.now());
  const [modelo, setModelo] = useState("—");

  const [t1, setT1] = useState<Fala[]>([]);
  const [t2, setT2] = useState<Fala[]>([]);
  const [momento, setMomento] = useState<1 | 2 | 3>(1);

  const [estado, setEstado] = useState<EstadoMomentos>(ESTADO_INICIAL);
  const [custo, setCusto] = useState<Custo>(CUSTO_ZERO);
  const [ocupado, setOcupado] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const [vozLigada, setVozLigada] = useState(false);
  const [falhas, setFalhas] = useState<FalhaTecnica[]>([]);

  const [preMarcacao, setPreMarcacao] = useState<MarcacaoAvaliada[]>([]);
  const [avaliando, setAvaliando] = useState(false);
  const [erroAvaliador, setErroAvaliador] = useState<string | null>(null);

  const restantes = useRef(DURACAO_CONSULTA_S);
  const tentativa: Tentativa = fase === "segunda" ? 2 : 1;
  const falas = fase === "segunda" ? t2 : t1;

  const sessao: SessaoCompleta = useMemo(
    () => ({
      sessaoId,
      iniciadaEm,
      modelo,
      tentativa1: t1,
      momentoRefeito: t2.length ? momento : null,
      tentativa2: t2,
      preMarcacao,
      revisaoDocente: {},
      falhasTecnicas: falhas,
      custo,
    }),
    [sessaoId, iniciadaEm, modelo, t1, t2, momento, preMarcacao, falhas, custo],
  );

  useEffect(() => {
    if (fase !== "briefing") publicar(sessao);
  }, [sessao, fase]);

  const registrarFalha = useCallback((descricao: string) => {
    setFalhas((f) => [...f, { em: Date.now(), descricao }]);
  }, []);

  const chamarPaciente = useCallback(
    async (historico: Fala[], opcoes: { encerrar?: boolean } = {}) => {
      setOcupado(true);
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessaoId,
            tentativa,
            falas: historico,
            segundosRestantes: restantes.current,
            momentoRetomado: tentativa === 2 ? momento : undefined,
            estadoCliente: estado,
            encerrar: opcoes.encerrar ?? false,
          }),
        });
        const dados = await r.json();
        if (!r.ok) throw new Error(dados?.erro ?? `HTTP ${r.status}`);
        setModelo(dados.modelo);
        setEstado(dados.estado);
        setCusto((c) => somarCusto(c, { ...dados.custo, chamadas: 1 }));
        const nova: Fala = {
          papel: "paciente",
          texto: dados.fala,
          em: Date.now(),
        };
        if (tentativa === 2) setT2((f) => [...f, nova]);
        else setT1((f) => [...f, nova]);
      } catch (e) {
        registrarFalha(
          `Falha na resposta da paciente virtual: ${
            e instanceof Error ? e.message : "erro desconhecido"
          }`,
        );
      } finally {
        setOcupado(false);
      }
    },
    [sessaoId, tentativa, momento, estado, registrarFalha],
  );

  function enviar(texto: string) {
    const nova: Fala = { papel: "interno", texto, em: Date.now() };
    const historico = [...falas, nova];
    if (tentativa === 2) setT2(historico);
    else setT1(historico);
    void chamarPaciente(historico);
  }

  function iniciar() {
    setIniciadaEm(Date.now());
    restantes.current = DURACAO_CONSULTA_S;
    const abertura: Fala = { papel: "interno", texto: PRIMEIRA_FALA, em: Date.now() };
    setT1([abertura]);
    setFase("consulta");
    void chamarPaciente([abertura]);
  }

  function encerrarCena() {
    if (encerrado) return;
    setEncerrado(true);
    if (!ocupado && falas.length) {
      void chamarPaciente(falas, { encerrar: true });
    }
  }

  async function irParaFeedback() {
    setFase("feedback");
    setAvaliando(true);
    setErroAvaliador(null);
    try {
      const r = await fetch("/api/avaliador", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ falas: t1 }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados?.erro ?? `HTTP ${r.status}`);
      setPreMarcacao(dados.marcacoes);
      setCusto((c) => somarCusto(c, dados.custo));
    } catch (e) {
      const m = e instanceof Error ? e.message : "erro desconhecido";
      setErroAvaliador(m);
      registrarFalha(`Falha na pré-marcação do checklist: ${m}`);
    } finally {
      setAvaliando(false);
    }
  }

  function iniciarSegunda() {
    restantes.current = DURACAO_SEGUNDA_TENTATIVA_S;
    setEstado(ESTADO_INICIAL);
    setEncerrado(false);
    const abertura: Fala = {
      papel: "interno",
      texto: PRIMEIRA_FALA,
      em: Date.now(),
    };
    setT2([abertura]);
    setFase("segunda");
    void chamarPaciente([abertura]);
  }

  const ultimaPaciente =
    [...falas].reverse().find((f) => f.papel === "paciente")?.texto ?? null;

  if (fase === "briefing") return <Briefing aoIniciar={iniciar} />;

  if (fase === "feedback")
    return (
      <Feedback
        preMarcacao={preMarcacao}
        carregando={avaliando}
        erro={erroAvaliador}
        momento={momento}
        aoEscolherMomento={setMomento}
        aoIniciarSegunda={iniciarSegunda}
        aoPular={() => setFase("fechamento")}
      />
    );

  if (fase === "fechamento")
    return (
      <div>
        <h1>Fim da estação</h1>
        <p className="sub">
          O debriefing é conduzido pelo professor, presencialmente ou por vídeo,
          a partir desta transcrição. A pré-marcação do checklist é insumo, não
          conclusão.
        </p>

        <div className="cartao">
          <h2 style={{ marginTop: 0 }}>Exportar registro</h2>
          <p className="sub">
            {custo.chamadas} chamadas à API · {custo.tokensEntrada} tokens de
            entrada · {custo.tokensSaida} de saída ·{" "}
            {(custo.duracaoMs / 1000).toFixed(1)} s de API · modelo {modelo}
          </p>
          <div className="linha">
            <button
              onClick={() =>
                baixar(`${sessaoId}.md`, paraMarkdown(sessao), "text/markdown")
              }
            >
              Baixar .md
            </button>
            <button
              className="secundario"
              onClick={() =>
                baixar(`${sessaoId}.json`, paraJson(sessao), "application/json")
              }
            >
              Baixar .json
            </button>
          </div>
          <p className="sub espaco">
            A exportação feita aqui traz o checklist sem a revisão docente. Para
            o registro completo, exporte pela tela do preceptor (
            <span className="mono">/preceptor</span>).
          </p>
        </div>

        <div className="cartao">
          <h3 style={{ marginTop: 0 }}>Falhas técnicas registradas</h3>
          {falhas.length === 0 ? (
            <p className="sub">Nenhuma.</p>
          ) : (
            <ul>
              {falhas.map((f, i) => (
                <li key={i} className="sub">
                  {new Date(f.em).toLocaleTimeString("pt-BR")} — {f.descricao}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );

  // fases "consulta" e "segunda"
  const duracao =
    fase === "segunda" ? DURACAO_SEGUNDA_TENTATIVA_S : DURACAO_CONSULTA_S;

  return (
    <div>
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>
            {fase === "segunda"
              ? `Segunda tentativa — momento ${momento}`
              : "Consulta"}
          </h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Maria Aparecida Souza, 61 anos — retorno ambulatorial
          </p>
        </div>
        <Cronometro
          duracaoS={duracao}
          rodando={!encerrado}
          aoZerar={encerrarCena}
          aoMudar={(r) => (restantes.current = r)}
        />
      </div>

      <div className="consulta espaco">
        <Chat
          falas={falas}
          ocupado={ocupado}
          encerrado={encerrado}
          aoEnviar={enviar}
          vozLigada={vozLigada}
          aoAlternarVoz={setVozLigada}
          ultimaFalaPaciente={ultimaPaciente}
        />
        <PainelExames />
      </div>

      <div className="linha espaco">
        {!encerrado && (
          <button className="secundario" onClick={encerrarCena}>
            Encerrar consulta agora
          </button>
        )}
        {encerrado && fase === "consulta" && (
          <button onClick={irParaFeedback} disabled={ocupado}>
            Ver feedback
          </button>
        )}
        {encerrado && fase === "segunda" && (
          <button onClick={() => setFase("fechamento")} disabled={ocupado}>
            Concluir estação
          </button>
        )}
        {falhas.length > 0 && (
          <span className="etiqueta">
            {falhas.length} falha(s) técnica(s) registrada(s)
          </span>
        )}
      </div>
    </div>
  );
}
