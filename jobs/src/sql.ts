import { getApiConnection } from './db';
  
export async function executeQuery<T>(query: string): Promise<T[]> {
  const conn = await getApiConnection();
  try {
    const [rows] = await conn.query(query);
    return rows as T[];
  } finally {
    conn.release();
  }
}
