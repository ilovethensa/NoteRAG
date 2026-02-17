"use client";

import { useEffect, useRef, useCallback, useReducer, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatReducer, initialChatState } from './reducer';
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


function ChatContentComponent() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const {
    messages,
    input,
    loading,
    threads,
    currentThreadId,
    currentThreadName,

    editingThreadName,
    error,
  } = state;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchThreads = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const fetchedThreads = await apiFetchThreads();
      dispatch({ type: 'SET_THREADS', payload: fetchedThreads });
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
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);


  useEffect(() => {
    const threadIdParam = searchParams.get('thread_id');
    const id = threadIdParam ? parseInt(threadIdParam, 10) : null;

    fetchThreads().then(() => {
      if (id) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id, name: 'Loading...' } });
        fetchMessages(id);
      }
    });
  }, [searchParams, fetchThreads, fetchMessages]);


  useEffect(() => {
    const threadIdParamInUrl = searchParams.get('thread_id');
    const threadIdInUrl = threadIdParamInUrl ? parseInt(threadIdParamInUrl, 10) : null;

    if (currentThreadId !== threadIdInUrl) {
      if (currentThreadId) {
        router.push(`/chat?thread_id=${currentThreadId}`);
      } else {
        router.push(`/chat`);
      }
    }

    if (currentThreadId) {
      const currentThread = threads.find((thread) => thread.id === currentThreadId);
      if (currentThread && (currentThread.name !== currentThreadName || currentThread.id !== currentThreadId)) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: currentThread.id, name: currentThread.name } });
      }
      fetchMessages(currentThreadId);
    } else {
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      if (currentThreadName !== 'New Chat' || currentThreadId !== null) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: null, name: 'New Chat' } });
      }
    }
  }, [currentThreadId, threads, router, fetchMessages, searchParams, currentThreadName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStartNewThread = async () => {
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
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const switchThread = (thread: ChatThread) => {
    dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: thread.id, name: thread.name } });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteThread = async (threadId: number) => {
    if (!confirm('Are you sure you want to delete this thread?')) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await apiDeleteChatThread(threadId);
      dispatch({ type: 'RESET_CHAT' });
      fetchThreads();
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRenameThread = async (threadId: number) => {
    if (!editingThreadName.trim()) {
      dispatch({ type: 'SET_EDITING_THREAD', payload: { id: null, name: '' } });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await apiRenameChatThread(threadId, editingThreadName);
      dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: threadId, name: editingThreadName } });
      dispatch({ type: 'SET_EDITING_THREAD', payload: { id: null, name: '' } });
      fetchThreads();
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSendMessage = async () => {
    if (!input.trim() || currentThreadId === null) return;

    const userMessage: Message = { role: 'user', content: input };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const assistantResponse = await apiqueryRag(input, currentThreadId);

      if (assistantResponse.assistantMessage) {
        dispatch({ type: 'ADD_MESSAGE', payload: assistantResponse.assistantMessage });
      }


      if (messages.length === 0 || !threads.some(t => t.id === currentThreadId)) {
        fetchThreads();
      }
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      dispatch({ type: 'ADD_MESSAGE', payload: { role: 'assistant', content: `Error: ${getErrorMessage(err)}` } });
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div className="flex-grow flex overflow-hidden">
      <div className="flex-1 flex flex-col bg-black">
        <div className="flex-grow overflow-y-auto p-6 space-y-8 font-mono">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
              <div className="text-4xl">_</div>
              <div className="text-xs uppercase tracking-widest">Awaiting_User_Input</div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                  msg.role === 'user' ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}>
                  {msg.role === 'user' ? 'USER_INPUT' : 'SYSTEM_REPLY'}
                </span>
                <span className="text-[9px] text-white/20 tracking-tighter">
                  TIMESTAMP: {new Date().toLocaleTimeString()}
                </span>
              </div>

              <div className={`text-sm leading-relaxed p-4 border ${
                msg.role === 'user' ? 'border-white/20 bg-white/5' : 'border-white/10'
              }`}>
                {msg.content}
              </div>

              {msg.context && msg.context.length > 0 && (
                <div className="mt-2 border-l border-white/20 pl-4 py-2 space-y-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
                    [Retrieved_Source_Fragments]
                  </div>
                  <ul className="space-y-2">
                    {msg.context.map((ctx, i) => (
                      <li key={i} className="text-[10px] text-white/30 leading-normal border-b border-white/5 pb-1 italic">
                        &gt; {ctx}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-white/20 text-white">
                  SYSTEM_REPLY
                </span>
              </div>
              <div className="text-sm p-4 border border-white/10 italic text-white/40">
                Processing_Query...
              </div>
            </div>
          )}
          {error && <div className="text-red-500 text-sm font-mono mt-4">Error: {error}</div>}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatContentComponent />
    </Suspense>
  );
}
