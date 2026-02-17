
export type Message = {
  role: "user" | "assistant";
  content: string;
  context?: string[];
};

export type ChatThread = {
  id: number;
  name: string;
  created_at: string;
};

export type Snippet = {
  id: number;
  content: string;
};


export const getSnippets = async (): Promise<Snippet[]> => {
  const res = await fetch("/api/snippets");
  if (!res.ok) {
    throw new Error("Failed to fetch snippets");
  }
  return res.json();
};

export const createSnippet = async (content: string): Promise<void> => {
  const res = await fetch("/api/snippets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error("Failed to create a snippet");
  }
};

export const updateSnippet = async (
  id: number,
  content: string,
): Promise<void> => {
  const res = await fetch("/api/snippets", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, content }),
  });
  if (!res.ok) {
    throw new Error("Failed to update the snippet");
  }
};

export const deleteSnippet = async (id: number): Promise<void> => {
  const res = await fetch(`/api/snippets?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete the snippet");
  }
};


export const fetchThreads = async (): Promise<ChatThread[]> => {
  const res = await fetch("/api/chat");
  if (!res.ok) {
    throw new Error("Failed to fetch threads");
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    console.error("API response for threads was not an array:", data);
    return [];
  }
  return data;
};

export const fetchMessages = async (threadId: number): Promise<Message[]> => {
  const res = await fetch(`/api/chat?thread_id=${threadId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json();
};

export const startNewThread = async (
  name: string = "New Chat",
): Promise<{ threadId: number; name: string }> => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [], name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create new thread");
  }
  return { threadId: data.threadId, name };
};

export const deleteChatThread = async (threadId: number): Promise<void> => {
  const res = await fetch(`/api/chat?thread_id=${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to delete thread");
  }
};

export const renameChatThread = async (
  threadId: number,
  newName: string,
): Promise<void> => {
  const res = await fetch("/api/chat", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: threadId, name: newName }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to rename thread");
  }
};


export const queryRag = async (
  query: string,
  threadId: number,
): Promise<{ assistantMessage: Message; threadId: number }> => {
  const res = await fetch("/api/rag", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, thread_id: threadId }),
  });
  const assistantResponse = await res.json();
  if (!res.ok) {
    throw new Error(
      assistantResponse.error || "Something went wrong with RAG query",
    );
  }

  if (assistantResponse.answer) {
    assistantResponse.assistantMessage = {
      role: "assistant",
      content: assistantResponse.answer,
      context: assistantResponse.context,
    };
  } else {
    throw new Error("No answer received from RAG");
  }

  return assistantResponse;
};
