# Plataforma de Sorteios — Plano de Construção

## 1. Visão geral

Site com **duas áreas**:

- **Admin** (privado, exige login): cria sorteios e **marca** números/nomes com os
  dados de quem comprou.
- **Usuário** (público, sem login): abre o link de um sorteio e **apenas visualiza**
  os números/nomes ainda **disponíveis**. Não marca nada.

Regra central: **só o admin marca**. O usuário tem uma única função — ver o que está
disponível.

## 2. Stack

| Camada        | Escolha                                             |
|---------------|-----------------------------------------------------|
| Framework     | Next.js **16.2.9** (App Router, React 19)           |
| Banco         | **Neon** (PostgreSQL serverless)                    |
| Driver DB     | `@neondatabase/serverless`                          |
| Auth          | Sessão stateless via cookie assinado (JWT com `jose`) |
| Senha         | `bcryptjs` (hash bcrypt; compatível com o `crypt()` do Postgres usado na migration) |
| Validação     | `zod`                                               |
| Estilo        | Tailwind v4 (já configurado no projeto)             |

> **Atenção Next 16:** *Middleware* agora chama-se **Proxy** (`proxy.ts` na raiz).
> Mutações usam **Server Actions** (`"use server"`). `cookies()` é **assíncrono**
> (`await cookies()`). Sempre revalidar autorização **dentro** de cada Server Action —
> elas são acessíveis por POST direto.

## 3. Modelo de dados

Ver `migrations/0001_init.sql`. Resumo:

- **admins** — `username`, `password_hash` (bcrypt), `name`. Login do painel.
- **raffles** — sorteio: `title`, `type` (`numbers`|`names`), `total_slots`
  (quantidade), `draw_date`, `status`, `created_by`.
- **raffle_prizes** — prêmios: `position` (1º, 2º…), `description`.
  A *quantidade de prêmios* = nº de linhas.
- **raffle_slots** — os números/nomes. `label` (o número "1" ou o nome "João"),
  `status` (`available`/`taken`) e, quando marcado: `buyer_name`, `buyer_phone`,
  `marked_by`, `marked_at`. É aqui que fica o registro da compra
  (raffle_id + telefone + nome + número/nome), com `CHECK` garantindo integridade.
- **raffle_winners** — ganhadores por prêmio (opcional, para o dia do sorteio).

Decisões:
- Um `raffle_slot` por número/nome. `UNIQUE (raffle_id, label)` impede marcar o mesmo
  duas vezes. "Disponíveis" = `status = 'available'`.
- Sorteio `numbers`: slots gerados 1..N via `generate_number_slots()`.
- Sorteio `names`: o admin informa a lista de nomes na criação (o app faz o insert).

## 4. Estrutura de pastas

```
app/
  (public)/
    page.tsx                     # home: lista de sorteios abertos
    s/[raffleId]/page.tsx        # visão do usuário: números/nomes DISPONÍVEIS
  admin/
    login/page.tsx               # form de login (Server Action)
    layout.tsx                   # protege tudo abaixo (checa sessão)
    page.tsx                     # dashboard: lista de sorteios do admin
    raffles/new/page.tsx         # criar sorteio (tipo, qtd, prêmios, data)
    raffles/[raffleId]/page.tsx  # detalhe: grade de slots p/ marcar
  actions/
    auth.ts                      # "use server": login / logout
    raffles.ts                   # "use server": criar sorteio, marcar slot
lib/
  db.ts                          # conexão Neon (sql`...`)
  session.ts                     # encrypt/decrypt + cookie (jose)
  dal.ts                         # data access layer: getCurrentAdmin(), requireAdmin()
  validation.ts                  # schemas zod
proxy.ts                         # redireciona /admin/* sem sessão -> /admin/login
migrations/
  0001_init.sql
```

## 5. Autenticação e autorização

1. **Login** (`app/actions/auth.ts`): busca admin por `username`, compara senha com
   `bcryptjs.compare`, cria sessão (`jose` assina `{ adminId }`) e grava cookie
   `session` (`httpOnly`, `secure`, `sameSite=lax`).
2. **Proxy** (`proxy.ts`): checagem *otimista* — se rota `/admin/*` (exceto `/admin/login`)
   e sem cookie válido → redireciona para login. Não é a única barreira.
3. **DAL** (`lib/dal.ts`): `requireAdmin()` decodifica a sessão e busca o admin no banco.
   **Toda** Server Action de escrita e **toda** página admin chama `requireAdmin()`
   antes de qualquer operação. As actions do usuário público são somente-leitura.

## 6. Fluxos principais

**Criar sorteio (admin):** form com `title`, `type`, `total_slots`, `draw_date`,
lista de prêmios e (se `names`) a lista de nomes → Server Action valida com zod,
`requireAdmin()`, insere `raffle` + `raffle_prizes`, gera os `raffle_slots`
(`generate_number_slots` ou insert dos nomes) → `revalidatePath('/admin')`.

**Marcar número/nome (admin):** na grade do sorteio, admin clica num slot disponível e
informa `buyer_name` + `buyer_phone` → Server Action `requireAdmin()`, `UPDATE raffle_slots
SET status='taken', buyer_name, buyer_phone, marked_by, marked_at=now()` com
`WHERE id=$ AND status='available'` (evita corrida) → `revalidatePath`.

**Visão do usuário (público):** `/s/[raffleId]` — Server Component lê o sorteio e os slots
`available` e mostra a grade. **Não** expõe `buyer_name`/`buyer_phone`. Sem ação de escrita.

## 7. Variáveis de ambiente (`.env.local`)

```bash
DATABASE_URL=postgresql://...neon.tech/...   # connection string do Neon
SESSION_SECRET=...                           # openssl rand -base64 32
```

## 8. Fases de implementação

1. **Migration** — rodar `0001_init.sql` no Neon. ✅ (arquivo pronto)
2. **Infra** — `lib/db.ts`, `lib/session.ts`, `lib/dal.ts`, `.env.local`; instalar
   `@neondatabase/serverless jose bcryptjs zod`.
3. **Auth** — login/logout, `proxy.ts`, layout admin protegido.
4. **Admin: criar sorteio** — form + action + geração de slots.
5. **Admin: marcar slots** — grade + action de marcação.
6. **Público** — home com sorteios e página de disponíveis.
7. **Polimento** — validações, estados vazios, feedback de erro, responsividade.

## 9. Segurança

- Autorização checada **dentro** de cada Server Action (não confiar só no Proxy).
- Página pública nunca seleciona colunas de comprador.
- Senhas só como hash bcrypt; `SESSION_SECRET` fora do repositório.
- Marcação com `WHERE status='available'` para evitar dupla marcação concorrente.

## 10. Pontos assumidos (confirmar se necessário)

- Usuário **não** faz login — acessa o sorteio por link público (`/s/[raffleId]`).
- Sorteio de **nomes**: os nomes são fornecidos pelo admin na criação.
- Um único nível de admin (sem hierarquia de permissões).
