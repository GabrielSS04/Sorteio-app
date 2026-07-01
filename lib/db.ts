import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não definida. Configure no .env.local.");
    }
    client = neon(connectionString);
  }
  return client;
}

/**
 * Cliente SQL do Neon. Uso como tagged template:
 *   const rows = await sql`select * from raffles where id = ${id}`;
 * Os valores interpolados são sempre parametrizados (sem risco de SQL injection).
 * A conexão é criada de forma preguiçosa (na 1ª query) para o build não exigir env.
 */
export const sql = ((...args: unknown[]) =>
  // @ts-expect-error repassa os argumentos do tagged template para o cliente real
  getClient()(...args)) as NeonQueryFunction<false, false>;
