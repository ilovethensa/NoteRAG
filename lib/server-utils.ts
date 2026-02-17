import { Pool, PoolClient } from "pg";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";


const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/rag";
export const pool = new Pool({
  connectionString,
});

export async function executeQuery<T>(
  query: string,
  params: unknown[] = [],
  client?: PoolClient,
): Promise<T[]> {
  let connection: PoolClient;
  if (client) {
    connection = client;
  } else {
    connection = await pool.connect();
  }
  try {
    const result = await connection.query(query, params);
    return result.rows as T[];
  } finally {
    if (!client) {
      connection.release();
    }
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
    baseURL:
      process.env.OPENAI_EMBEDDING_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1",
  },
  modelName: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
});

export const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  },
  modelName: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  temperature: 0.1,
});

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

