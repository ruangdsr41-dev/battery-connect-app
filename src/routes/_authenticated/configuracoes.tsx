import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Check } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { STORES, STORE_LIST, type StoreId, type StoreIdentity } from "@/lib/stores";
import { getStore, saveStore, resetStore, STORE_CONFIG_EVENT } from "@/lib/store-config";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — BATPRO" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { isMaster, nome } = Route.useRouteContext();
  const [tab, setTab] = useState<StoreId>("disk");

  return (
    <AppShell isMaster={isMaster} nome={nome}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize os dados de cada loja. Alterações refletem automaticamente no
          orçamento, no PNG, no PDF e no Copiar WhatsApp.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
        {STORE_LIST.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setTab(s.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {STORES[s.id].nome}
          </button>
        ))}
      </div>

      <StoreEditor key={tab} storeId={tab} />
    </AppShell>
  );
}

function StoreEditor({ storeId }: { storeId: StoreId }) {
  const [form, setForm] = useState<StoreIdentity>(() => getStore(storeId));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(getStore(storeId));
  }, [storeId]);

  function set<K extends keyof StoreIdentity>(k: K, v: StoreIdentity[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSave() {
    setSaving(true);
    saveStore(storeId, {
      nome: form.nome,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      vibe: form.vibe,
      logoUrl: form.logoUrl,
      wordmark: form.wordmark,
      whatsappIntro: form.whatsappIntro,
      whatsappOutro: form.whatsappOutro,
      footerConditions: form.footerConditions,
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
    // dispara evento explicito para outros componentes escutarem
    window.dispatchEvent(new CustomEvent(STORE_CONFIG_EVENT));
  }

  function handleReset() {
    if (!confirm("Restaurar as configurações padrão desta loja?")) return;
    resetStore(storeId);
    setForm(getStore(storeId));
  }

  const conditionsText = form.footerConditions.join("\n");

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
      <Field label="Nome da loja">
        <input
          type="text"
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Telefone">
        <input
          type="text"
          value={form.telefone}
          onChange={(e) => set("telefone", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="WhatsApp (apenas dígitos, com DDI)">
        <input
          type="text"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="URL da logo">
        <input
          type="url"
          value={form.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Wordmark (marca no cabeçalho)" className="md:col-span-2">
        <input
          type="text"
          value={form.wordmark}
          onChange={(e) => set("wordmark", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Texto institucional / vibe" className="md:col-span-2">
        <textarea
          value={form.vibe}
          onChange={(e) => set("vibe", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Introdução da mensagem de WhatsApp" className="md:col-span-2">
        <textarea
          value={form.whatsappIntro}
          onChange={(e) => set("whatsappIntro", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Use <code>{"{cliente}"}</code> e <code>{"{loja}"}</code> como marcadores.
        </p>
      </Field>
      <Field label="Assinatura da mensagem de WhatsApp" className="md:col-span-2">
        <textarea
          value={form.whatsappOutro}
          onChange={(e) => set("whatsappOutro", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
      </Field>

      <Field label="Condições comerciais (uma por linha)" className="md:col-span-2">
        <textarea
          value={conditionsText}
          onChange={(e) =>
            set(
              "footerConditions",
              e.target.value.split("\n").map((s) => s).filter((s, i, arr) => i < arr.length - 1 || s.trim() !== ""),
            )
          }
          rows={6}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Estas condições aparecem no rodapé do preview, PNG, PDF e Copiar WhatsApp desta loja.
        </p>
      </Field>

      <div className="flex items-center gap-2 md:col-span-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Salvo!" : "Salvar configurações"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar padrão
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
