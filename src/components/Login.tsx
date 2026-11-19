"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { requisitar, type ErroApi } from "@/lib/api";
import type { Papel } from "@/lib/tipos";
import { Alerta, Botao, Campo, Entrada, Logo } from "./ui";

const DEMO: Record<Papel, { login: string; senha: string; quem: string }> = {
  motorista: { login: "529.982.247-25", senha: "1234", quem: "Carlos Mendes, caminhoneiro autônomo" },
  operador: { login: "renata@terminal.demo", senha: "flowdock", quem: "Renata Albuquerque, coordenadora de portaria e docas" },
  transportadora: { login: "despacho@transnordeste.demo", senha: "flowdock", quem: "Paulo Lima, despachante da TransNordeste" },
};

export function Login({ papel, titulo, subtitulo, aoEntrar, rodape }: { papel: Papel; titulo: string; subtitulo: string; aoEntrar: (token: string) => void; rodape?: ReactNode }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const ehMotorista = papel === "motorista";

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const corpo = ehMotorista ? { papel, cpf: login, senha } : { papel, email: login, senha };
      const r = await requisitar<{ token: string }>("POST", "/api/auth/login", { corpo });
      aoEntrar(r.token);
    } catch (e) {
      setErro((e as ErroApi).message);
    } finally {
      setCarregando(false);
    }
  }

  const demo = DEMO[papel];
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Logo className="mb-6 text-2xl" />
      <h1 className="text-2xl font-extrabold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-slate-600">{subtitulo}</p>
      <form onSubmit={enviar} className="mt-6 space-y-4">
        <Campo rotulo={ehMotorista ? "CPF" : "E-mail"}>
          <Entrada
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            inputMode={ehMotorista ? "numeric" : "email"}
            autoComplete="username"
            placeholder={ehMotorista ? "000.000.000-00" : "voce@empresa.com"}
            required
          />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </Campo>
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Botao type="submit" tamanho="lg" className="w-full" carregando={carregando}>
          Entrar
        </Botao>
      </form>
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-blue-950 ring-1 ring-inset ring-blue-200">
        <p className="font-semibold">Conta de demonstração</p>
        <p className="text-sm">{demo.quem}</p>
        <p className="mt-1 font-mono text-sm">
          {demo.login} · senha {demo.senha}
        </p>
        <Botao
          variante="secundario"
          tamanho="sm"
          className="mt-2"
          type="button"
          onClick={() => {
            setLogin(demo.login);
            setSenha(demo.senha);
          }}
        >
          Preencher
        </Botao>
      </div>
      {rodape}
    </div>
  );
}
