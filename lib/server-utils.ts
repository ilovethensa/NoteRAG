import { Pool, PoolClient } from "pg";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { getEncoding } from "js-tiktoken";

const enc = getEncoding("cl100k_base");

export function countTokens(text: string): number {
  return enc.encode(text).length;
}

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

export async function recordTokenUsage(
  type: "chat" | "embedding",
  tokens: number,
  client?: PoolClient,
): Promise<void> {
      await executeQuery(
      "INSERT INTO token_usage (type, tokens) VALUES ($1, $2)",
      [type, tokens],
      client,
    );
  }
  
  export async function getTokenUsageStats(): Promise<{ chat: number; embedding: number }> {
    const result = await executeQuery<{ type: string; total: string }>(
      "SELECT type, SUM(tokens) as total FROM token_usage GROUP BY type"
    );
    
    const stats = { chat: 0, embedding: 0 };
    result.forEach(row => {
      if (row.type === 'chat') stats.chat = parseInt(row.total, 10);
      if (row.type === 'embedding') stats.embedding = parseInt(row.total, 10);
    });
    
    return stats;
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

