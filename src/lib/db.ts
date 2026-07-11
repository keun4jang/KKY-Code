import { Pool } from 'pg'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export function sql() {
  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0]
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}` + strings[i + 1]
    }
    const result = await getPool().query(text, values)
    return result.rows
  }
}
