import { pool } from '../lib/server-utils';

async function main() {
  const client = await pool.connect();
  try {
    
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS snippets (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding VECTOR(${process.env.PGVECTOR_EMBEDDING_DIMENSIONS || '1024'})
      );
    `);
    console.log('Snippets table initialized.');

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_threads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Chat threads table initialized.');

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Chat history table initialized.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL, -- 'chat' or 'embedding'
        tokens INTEGER NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Token usage table initialized.');

    console.log('Database schema fully initialized successfully.');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
