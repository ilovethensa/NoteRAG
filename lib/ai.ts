import { PoolClient } from "pg";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { pool, embeddings, llm, executeQuery, withTransaction, recordTokenUsage } from "./server-utils";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatThread = {
  id: number;
  name: string;
  created_at: string;
};

export const getThreads = async (): Promise<ChatThread[]> => {
  return executeQuery<ChatThread>(
    "SELECT id, name, created_at FROM chat_threads ORDER BY created_at DESC",
  );
};

export const getMessages = async (
  threadId: string | number,
  client?: PoolClient,
): Promise<Message[]> => {
  return executeQuery<Message>(
    "SELECT role, content FROM chat_history WHERE thread_id = $1 ORDER BY id ASC",
    [threadId],
    client,
  );
};

export const createThread = async (
  name: string = "New Chat",
  client?: PoolClient,
): Promise<number> => {
  const result = await executeQuery<{ id: number }>(
    "INSERT INTO chat_threads (name) VALUES ($1) RETURNING id",
    [name],
    client,
  );
  return result[0].id;
};

export const addMessage = async (
  threadId: string | number,
  role: "user" | "assistant" | "system",
  content: string,
  client?: PoolClient,
): Promise<void> => {
  await executeQuery(
    "INSERT INTO chat_history (thread_id, role, content) VALUES ($1, $2, $3)",
    [threadId, role, content],
    client,
  );
};

export const updateThreadName = async (
  threadId: string | number,
  name: string,
  client?: PoolClient,
): Promise<void> => {
  await executeQuery(
    "UPDATE chat_threads SET name = $1 WHERE id = $2",
    [name, threadId],
    client,
  );
};

export const deleteThread = async (
  threadId: string | number,
  client?: PoolClient,
): Promise<void> => {
  await executeQuery(
    "DELETE FROM chat_threads WHERE id = $1",
    [threadId],
    client,
  );
};

export const clearAllChats = async (): Promise<void> => {
  await executeQuery("TRUNCATE chat_threads CASCADE");
};

export const countMessagesInThread = async (
  threadId: string | number,
  client?: PoolClient,
): Promise<number> => {
  const result = await executeQuery<{ count: string }>(
    "SELECT COUNT(*) FROM chat_history WHERE thread_id = $1",
    [threadId],
    client,
  );
  return parseInt(result[0].count, 10);
};

let pgVectorStore: PGVectorStore | null = null;

const getVectorStore = () => {
  if (pgVectorStore) return pgVectorStore;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  pgVectorStore = new PGVectorStore(embeddings, {
    pool,
    tableName: "snippets",
    columns: {
      idColumnName: "id",
      contentColumnName: "content",
      vectorColumnName: "embedding",
    },
  });
  return pgVectorStore;
};

const buildPrompt = (query: string, relevantDocs: string) => `
  You are an AI assistant. Use the following pieces of context to answer the user's question.
  If you don't know the answer, just say that you don't know, don't try to make up an answer.
  Treat the context as the absolute truth, unless it starts with "IRONY:" in which case its ironic, use that to help with arguments
  ---------------------
  Context:
  ${relevantDocs}
  ---------------------
  Question: ${query}
`;

const formatAnswer = (
  answer: string | (string | object)[] | null | undefined,
): string => {
  if (Array.isArray(answer)) {
    return answer
      .map((item: string | object) => {
        if (typeof item === "object" && item !== null && "text" in item) {
          return item.text;
        }
        return String(item);
      })
      .join("\n");
  } else if (answer === null || answer === undefined) {
    return "";
  }
  return answer;
};

export const QueryRAG = async (query: string, threadId?: string | number) => {
  const store = getVectorStore();
  const results = await store.similaritySearch(query, 5);
  const relevantDocs = results
    .map((doc) => doc.pageContent.replace(/`/g, "\\`"))
    .join("\\n\\n");

  let history: Message[] = [];
  if (threadId) {
    history = await getMessages(threadId);
  }

  const prompt = buildPrompt(query, relevantDocs);

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const chatCompletion = await llm.invoke(messages);
  const usage = chatCompletion.usage_metadata;
  if (usage) {
    await recordTokenUsage('chat', usage.total_tokens);
  }

  const answer = formatAnswer(chatCompletion.content);

  if (threadId) {
    await withTransaction(async (client) => {
      await addMessage(threadId, "user", query, client);
      await addMessage(threadId, "assistant", answer, client);

      const messageCount = await countMessagesInThread(threadId, client);
      if (messageCount <= 2) {
        const threadName =
          query.length > 30 ? query.substring(0, 30) + "..." : query;
        await updateThreadName(threadId, threadName, client);
      }
    });
  }

  return {
    answer: answer,
    context: results.map((doc) => doc.pageContent),
    threadId: threadId,
  };
};
