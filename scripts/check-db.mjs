import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

// Carrega DATABASE_URL do .env.local (simples, sem dependência extra).
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
if (!url) throw new Error("DATABASE_URL não encontrada em .env.local");

const sql = neon(url);

// 1) Tabelas criadas?
const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public'
  order by table_name
`;
console.log("Tabelas:", tables.map((t) => t.table_name).join(", "));

// 2) Admin existe?
const admins = await sql`select username, name from admins`;
console.log("Admins:", admins);

// 3) Testa o insert atômico com array (o ponto que eu queria validar).
const rows = await sql`
  with new_raffle as (
    insert into raffles (title, type, total_slots, status)
    values ('__teste_conexao__', 'names', 3, 'draft')
    returning id
  ),
  ins_prizes as (
    insert into raffle_prizes (raffle_id, position, description)
    select nr.id, ord, descr
    from new_raffle nr,
         unnest(${["1º prêmio", "2º prêmio"]}::text[]) with ordinality as t(descr, ord)
    returning 1
  ),
  ins_slots as (
    insert into raffle_slots (raffle_id, position, label)
    select nr.id, ord, label
    from new_raffle nr,
         unnest(${["Ana", "Bruno", "Carla"]}::text[]) with ordinality as t(label, ord)
    returning 1
  )
  select id from new_raffle
`;
const testId = rows[0].id;

const counts = await sql`
  select
    (select count(*) from raffle_prizes where raffle_id = ${testId})::int as prizes,
    (select count(*) from raffle_slots  where raffle_id = ${testId})::int as slots
`;
console.log("Insert com array OK -> prêmios:", counts[0].prizes, "slots:", counts[0].slots);

// 4) Limpa o teste.
await sql`delete from raffles where id = ${testId}`;
console.log("Sorteio de teste removido. ✅ Tudo certo.");
