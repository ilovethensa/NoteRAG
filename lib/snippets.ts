import { embeddings, executeQuery, countTokens, recordTokenUsage } from "./server-utils";

export type Snippet = {
  id: number;
  content: string;
};

const generateEmbedding = async (content: string) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const snippetEmbedding = await embeddings.embedQuery(content);
  const tokens = countTokens(content);
  await recordTokenUsage('embedding', tokens);
  return "[" + snippetEmbedding.join(",") + "]";
};

export const getSnippets = async (): Promise<Snippet[]> => {
  return executeQuery<Snippet>(
    "SELECT id, content FROM snippets ORDER BY id DESC",
  );
};

export const createSnippet = async (content: string): Promise<void> => {
  const embedding = await generateEmbedding(content);
  await executeQuery(
    "INSERT INTO snippets (content, embedding) VALUES ($1, $2)",
    [content, embedding],
  );
};

export const updateSnippet = async (
  id: string | number,
  content: string,
): Promise<void> => {
  const embedding = await generateEmbedding(content);
  await executeQuery(
    "UPDATE snippets SET content = $1, embedding = $2 WHERE id = $3",
    [content, embedding, id],
  );
};

export const deleteSnippet = async (id: string | number): Promise<void> => {
  await executeQuery("DELETE FROM snippets WHERE id = $1", [id]);
};
