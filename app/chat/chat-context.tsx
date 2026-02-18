"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchThreads as apiFetchThreads,
  fetchMessages as apiFetchMessages,
  startNewThread as apiStartNewThread,
  deleteChatThread as apiDeleteChatThread,
  renameChatThread as apiRenameChatThread,
  queryRag as apiqueryRag,
  Message,
  ChatThread,
} from '@/lib/client';
import { getErrorMessage } from '@/lib/utils';
import { chatReducer, initialChatState, ChatState, ChatAction } from './reducer'; // Assuming reducer.ts is in the same directory

// Create the context
const ChatStateContext = createContext<ChatState | undefined>(undefined);
const ChatDispatchContext = createContext<React.Dispatch<ChatAction> | undefined>(undefined);

// Custom hook to use the chat state
export function useChatState() {
  const context = useContext(ChatStateContext);
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatProvider');
  }
  return context;
}

// Custom hook to use the chat dispatch function
export function useChatDispatch() {
  const context = useContext(ChatDispatchContext);
  if (context === undefined) {
    throw new Error('useChatDispatch must be used within a ChatProvider');
  }
  return context;
}

// Chat Provider component
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoized action creators
  const fetchThreads = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const fetchedThreads = await apiFetchThreads();
      dispatch({ type: 'SET_THREADS', payload: fetchedThreads });
      return fetchedThreads;
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const fetchMessages = useCallback(async (threadId: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const fetchedMessages = await apiFetchMessages(threadId);
      dispatch({ type: 'SET_MESSAGES', payload: fetchedMessages });
      // Update current thread name if not already set or changed
      const currentThread = state.threads.find((thread) => thread.id === threadId);
      if (currentThread && currentThread.name !== state.currentThreadName) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: currentThread.id, name: currentThread.name } });
      }
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.threads, state.currentThreadName]);

  const handleStartNewThread = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newThread = await apiStartNewThread();
      dispatch({ type: 'RESET_CHAT' });
      dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: newThread.threadId, name: newThread.name } });
      fetchThreads();
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchThreads]);

  const handleSelectThread = useCallback((thread: ChatThread) => {
    dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: thread.id, name: thread.name } });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    router.push(`/chat?thread_id=${thread.id}`);
  }, [router]);

  const handleDeleteThread = useCallback(async (threadId: number) => {
    if (!confirm('Are you sure you want to delete this thread?')) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await apiDeleteChatThread(threadId);
      dispatch({ type: 'RESET_CHAT' });
      const updatedThreads = await fetchThreads();
      // After deleting, if there are other threads, navigate to the most recent one
      if (updatedThreads && updatedThreads.length > 0) {
        const remainingThreads = updatedThreads.filter(t => t.id !== threadId);
        const mostRecentThread = remainingThreads.length > 0 ? remainingThreads[0] : null;
        if (mostRecentThread) {
            router.push(`/chat?thread_id=${mostRecentThread.id}`);
        } else {
            router.push('/chat'); // No threads left, go to new chat state
        }
      } else {
        router.push('/chat'); // No threads left, go to new chat state
      }
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchThreads, router, state.threads]);

  const handleRenameThread = useCallback(async (threadId: number, newName: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await apiRenameChatThread(threadId, newName);
      dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: threadId, name: newName } });
      fetchThreads();
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchThreads]);

  const handleSendMessage = useCallback(async () => {
    if (!state.input.trim()) return;

    let threadIdToUse = state.currentThreadId;
    if (threadIdToUse === null) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const newThread = await apiStartNewThread();
        threadIdToUse = newThread.threadId;
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: threadIdToUse, name: newThread.name } });
        fetchThreads();
      } catch (err: unknown) {
        dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
    }

    const userMessage: Message = { role: 'user', content: state.input };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const assistantResponse = await apiqueryRag(state.input, threadIdToUse!);

      if (assistantResponse.assistantMessage) {
        dispatch({ type: 'ADD_MESSAGE', payload: assistantResponse.assistantMessage });
      }
      
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      dispatch({ type: 'ADD_MESSAGE', payload: { role: 'assistant', content: `Error: ${getErrorMessage(err)}` } });
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.input, state.currentThreadId, fetchThreads]);

  // Effects for initial load and URL changes
  useEffect(() => {
    const threadIdParam = searchParams.get('thread_id');
    const id = threadIdParam ? parseInt(threadIdParam, 10) : null;

    fetchThreads().then((fetchedThreads) => {
      if (id) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id, name: 'Loading...' } });
        fetchMessages(id);
      } else if (fetchedThreads && fetchedThreads.length > 0) {
        const mostRecentThread = fetchedThreads[0];
        router.push(`/chat?thread_id=${mostRecentThread.id}`);
      }
    });
  }, [searchParams, fetchThreads, fetchMessages, router]);

  // Effect to keep URL in sync with currentThreadId
  useEffect(() => {
    if (state.currentThreadId) {
      router.push(`/chat?thread_id=${state.currentThreadId}`);
    } else {
      router.push(`/chat`);
    }
  }, [state.currentThreadId, router]);

  // Effect to scroll messages into view
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);


  return (
    <ChatStateContext.Provider value={{ ...state, messagesEndRef }}>
      <ChatDispatchContext.Provider value={dispatch}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
}
