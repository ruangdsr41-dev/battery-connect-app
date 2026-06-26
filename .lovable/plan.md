## Escopo desta etapa

Login controlado + 5 funcionalidades escolhidas (1, 2, 3, 6, 9).

---

### 1. Autenticação e papéis (master / padrão)

- E-mail + senha como método único. **Cadastro público desativado** — só o master cria usuários.
- Você (primeiro usuário) será marcado como **master** automaticamente.
- Tabela `user_roles` separada com enum `app_role` = `master | padrao` (padrão de segurança — nunca guardar papel no perfil).
- Tabela `profiles` com nome, e-mail, status (ativo/inativo), último acesso.
- Função `has_role(user_id, role)` SECURITY DEFINER para uso em RLS e no app.
- Rotas autenticadas sob `_authenticated/`; rotas só-master sob `_authenticated/admin/`.
- **Reset de senha por e-mail** com página `/reset-password` (fluxo padrão Supabase).
- Tela `/auth` (login) e tela `/esqueci-senha`.
- Botão **Atualizar planilha** e refetch forçado: visíveis somente para master.

### 2. Gestão de usuários (master)

Página `/admin/usuarios`:
- Listar todos (nome, e-mail, papel, status, último acesso).
- Criar novo usuário (e-mail + senha temporária + papel).
- Alternar papel master ↔ padrão.
- Ativar/desativar conta.
- Disparar reset de senha.
- Excluir usuário.

### 3. Auditoria + Dashboard

Tabela `audit_log`: `user_id`, `event` (`login`, `login_failed`, `search`, `sheet_refresh`, `pdf_export`, `whatsapp_share`, `user_created`, `role_changed`, `user_disabled`), `payload jsonb` (ex.: termo, resultados_count, codigo_moura), `created_at`.

Página `/admin/dashboard` (só master):
- Cards: total buscas (hoje/7d/30d), usuários ativos, buscas sem resultado, atualizações de planilha.
- Top 10 termos pesquisados.
- Top 10 baterias mais consultadas (por código Moura visualizado).
- Buscas sem resultado (para corrigir planilha).
- Usuários mais ativos.
- Buscas por hora (gráfico simples).
- Tabela de eventos recentes com filtro por tipo e usuário.

Todas as buscas com debounce de 1.2s já existente disparam log apenas quando `q` estabiliza (evita poluir o log com keystrokes).

### 6. PDF + compartilhamento WhatsApp

No `BatteryCard`, dois botões:
- **PDF**: gera ficha técnica A4 com logo Moura, dados do veículo, código, garantia, dimensões, observação. Lib `jspdf` + `jspdf-autotable` (já compatíveis com Worker/cliente).
- **WhatsApp**: abre `https://wa.me/?text=` com resumo da aplicação + link da pesquisa pré-preenchido.

Ambos os eventos vão para `audit_log`.

### 9. Busca por placa

- Campo de busca aceita placas no formato **Mercosul** (`ABC1D23`) e **antigo** (`ABC1234`).
- Detecção por regex no input; se for placa, consulta API e preenche marca/modelo/ano automaticamente, exibindo um chip "Placa ABC1D23 → Chevrolet Onix 2018" acima dos resultados.
- Provider: **API gratuita pública** (ex.: `brasilapi.com.br` não tem placa; vamos usar `api.placas.dev` ou similar gratuita; se exigir chave, peço como secret).
- Se a API falhar, mostra aviso e mantém só o texto digitado como busca normal.

> ⚠️ APIs de placa 100% gratuitas e estáveis são raras. Vou implementar com fallback: tenta a pública; se não, peço secret de um provedor pago (ex.: Apibrasil, Placas API). Confirme se posso pedir o secret caso necessário.

---

## Detalhes técnicos

- **Migração SQL** cria: enum `app_role`, tabelas `profiles`, `user_roles`, `audit_log`, função `has_role`, trigger `on_auth_user_created` que cria `profiles` + atribui `master` se for o primeiro usuário (senão `padrao`), GRANTs e políticas RLS para cada tabela.
- **Server functions** em `src/lib/`:
  - `admin.functions.ts` — listar/criar/atualizar/excluir usuários (usa `requireSupabaseAuth` + check `has_role master` + `supabaseAdmin` para Auth Admin API).
  - `audit.functions.ts` — `logEvent`, `getDashboardMetrics`, `getRecentEvents`.
  - `placa.functions.ts` — consulta API externa server-side (evita CORS e esconde chave).
- **start.ts** já tem `attachSupabaseAuth` — nada a mudar.
- **Layout protegido**: criar `src/routes/_authenticated/route.tsx` (gerenciado pela integração) + `_authenticated/admin/route.tsx` para gatear por papel master.
- **Esconder Atualizar planilha** quando `role !== 'master'`.
- **Nav inferior**: adicionar aba "Admin" só para master.

---

## Confirmações antes de implementar

1. **Seu e-mail de master**: qual e-mail você quer usar como master? Ele será o primeiro a se cadastrar e ganha o papel automaticamente.
2. **Auto-confirmar e-mail no signup?** Recomendo **sim** para simplificar (sem precisar abrir e-mail). Você prefere?
3. **Placa**: posso prosseguir com tentativa gratuita e, se necessário, pedir secret de provedor pago?
4. **E-mails de reset de senha**: usar template padrão da Lovable Emails (precisa configurar domínio uma vez) ou só o template default do Supabase por enquanto?

Responda (pode ser curto, ex.: "1: meuemail@x.com, 2: sim, 3: ok, 4: default por enquanto") e eu implemento tudo em sequência.