// Gerador de PRIMEIROS NOMES distintos (sem repetição) para sorteios do
// tipo "nomes", evitando que o admin precise digitar nome por nome.

// Pool grande de primeiros nomes (masculinos e femininos).
// Deduplicado abaixo para garantir que nunca haja repetição.
const RAW_NAMES: string[] = [
  "Ana", "Beatriz", "Bruna", "Camila", "Carla", "Carolina", "Cecília", "Clara",
  "Daniela", "Débora", "Eduarda", "Elaine", "Eliane", "Emanuelle", "Fabiana",
  "Fernanda", "Flávia", "Gabriela", "Giovana", "Helena", "Heloísa", "Ingrid",
  "Isabela", "Isadora", "Jaqueline", "Joana", "Júlia", "Juliana", "Karina",
  "Larissa", "Laura", "Letícia", "Lívia", "Lorena", "Luana", "Luiza", "Manuela",
  "Marcela", "Maria", "Mariana", "Marina", "Melissa", "Milena", "Nádia",
  "Natália", "Nicole", "Olívia", "Patrícia", "Paula", "Priscila", "Rafaela",
  "Raíssa", "Rebeca", "Renata", "Roberta", "Sabrina", "Sara", "Simone", "Sofia",
  "Tainá", "Tatiane", "Vanessa", "Vera", "Vitória", "Yara", "Yasmin", "Zélia",
  "Adriana", "Alessandra", "Aline", "Amanda", "Andressa", "Bárbara", "Bianca",
  "Bruna", "Caroline", "Cíntia", "Cristiane", "Denise", "Elisa", "Estela",
  "Franciele", "Gisele", "Iara", "Janaína", "Jéssica", "Josiane", "Kelly",
  "Laís", "Leila", "Lidiane", "Lúcia", "Marta", "Michele", "Mônica", "Nayara",
  "Poliana", "Regina", "Sandra", "Sílvia", "Sônia", "Talita", "Thaís", "Valéria",
  "Alan", "Alexandre", "André", "Antônio", "Arthur", "Augusto", "Benício",
  "Bernardo", "Breno", "Bruno", "Caio", "Carlos", "César", "Daniel", "Danilo",
  "Davi", "Diego", "Douglas", "Eduardo", "Emanuel", "Enzo", "Érico", "Fábio",
  "Felipe", "Fernando", "Francisco", "Gabriel", "Geraldo", "Gilberto", "Guilherme",
  "Gustavo", "Heitor", "Henrique", "Hugo", "Ícaro", "Igor", "Ismael", "Ivan",
  "Jaime", "Jean", "João", "Joaquim", "Jonas", "Jorge", "José", "Juliano",
  "Júnior", "Kauã", "Leandro", "Leonardo", "Lucas", "Luís", "Luiz", "Marcelo",
  "Marcos", "Mário", "Mateus", "Matheus", "Mauro", "Miguel", "Murilo", "Nathan",
  "Nelson", "Nícolas", "Otávio", "Paulo", "Pedro", "Rafael", "Raul", "Renan",
  "Renato", "Ricardo", "Roberto", "Rodrigo", "Rogério", "Ronaldo", "Samuel",
  "Sérgio", "Thiago", "Tomás", "Vagner", "Valter", "Vicente", "Vinícius",
  "Vítor", "Wagner", "Wesley", "William", "Yuri",
  "Abigail", "Abner", "Ademir", "Adilson", "Adriano", "Afonso", "Agatha",
  "Aline", "Álvaro", "Ariel", "Armando", "Baltazar", "Benedita", "Benjamim",
  "Bento", "Bianca", "Brenda", "Caetano", "Cauã", "Célia", "Cláudia",
  "Cláudio", "Cleber", "Conrado", "Cora", "Dalva", "Dara", "Davi", "Delfina",
  "Dora", "Edson", "Elias", "Eloá", "Elói", "Emília", "Ester", "Ezequiel",
  "Fabrício", "Fátima", "Felícia", "Frederico", "Genoveva", "Gilmar",
  "Glória", "Graça", "Haroldo", "Hélio", "Hélcio", "Iasmin", "Iberê", "Ilana",
  "Isaac", "Ítalo", "Ivo", "Jacinto", "Jandira", "Joel", "Jonatã", "Josué",
  "Júpiter", "Kléber", "Laís", "Lauro", "Lélia", "Lenir", "Levi", "Lindomar",
  "Lino", "Lorenzo", "Lourdes", "Luca", "Luciano", "Ludmila", "Maitê",
  "Manoel", "Márcia", "Márcio", "Marilda", "Marlene", "Maurício", "Melina",
  "Nara", "Neide", "Nilton", "Noa", "Norberto", "Odete", "Orlando", "Osvaldo",
  "Pábio", "Percival", "Quintino", "Ramiro", "Raquel", "Reginaldo", "Rita",
  "Rúben", "Rui", "Sálvio", "Selma", "Sidney", "Sueli", "Tadeu", "Tamara",
  "Telma", "Teodoro", "Ubirajara", "Valdir", "Valentina", "Vanderlei",
  "Vânia", "Vera", "Vitor", "Wanda", "Washington", "Wilson", "Xavier", "Zilda",
];

// Remove qualquer repetição (case-insensitive) -> pool 100% único.
export const NAME_POOL: string[] = (() => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of RAW_NAMES) {
    const key = name.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }
  return unique;
})();

/**
 * Retorna `count` PRIMEIROS NOMES distintos, embaralhados, sem repetição.
 * O máximo é o tamanho do pool (NAME_POOL.length) — não repete nomes.
 */
export function generateNames(count: number): string[] {
  const n = Math.max(0, Math.min(Math.floor(count) || 0, NAME_POOL.length));

  // Fisher–Yates: embaralha uma cópia e pega os `n` primeiros.
  const pool = [...NAME_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
