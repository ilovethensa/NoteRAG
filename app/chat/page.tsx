"use client";

import { useEffect, useRef, useCallback, useReducer, Suspense, useState } from 'react';
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
import Sidebar from './sidebar';

function ChatContentComponent() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    messages,
    input,
    loading,
    isQuerying,
    threads,
    currentThreadId,
    currentThreadName,
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
      return fetchedThreads; // Return fetched threads
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

    fetchThreads().then((fetchedThreads) => {
      if (id) {
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id, name: 'Loading...' } });
        fetchMessages(id);
      } else if (fetchedThreads && fetchedThreads.length > 0) {
        // If no thread_id in URL, select the most recent thread
        const mostRecentThread = fetchedThreads[0];
        router.push(`/chat?thread_id=${mostRecentThread.id}`);
      }
    });
  }, [searchParams, fetchThreads, fetchMessages, router]);


  useEffect(() => {
    if (currentThreadId) {
      router.push(`/chat?thread_id=${currentThreadId}`);
    } else {
      router.push(`/chat`);
    }
  }, [currentThreadId, router]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartNewThread = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newThread = await apiStartNewThread();
      dispatch({ type: 'RESET_CHAT' });
      dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: newThread.threadId, name: newThread.name } });
      fetchThreads();
      setSidebarOpen(false); // Close sidebar on mobile after starting new thread
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSelectThread = (thread: ChatThread) => {
    dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: thread.id, name: thread.name } });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    router.push(`/chat?thread_id=${thread.id}`);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleDeleteThread = async (threadId: number) => {
    if (!confirm('Are you sure you want to delete this thread?')) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await apiDeleteChatThread(threadId);
      dispatch({ type: 'RESET_CHAT' });
      fetchThreads();
      // After deleting, if there are other threads, navigate to the most recent one
      if (threads.length > 1) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        const mostRecentThread = remainingThreads[0];
        router.push(`/chat?thread_id=${mostRecentThread.id}`);
      } else {
        router.push('/chat'); // No threads left, go to new chat state
      }
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleRenameThread = async (threadId: number, newName: string) => {
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
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // If there's no currentThreadId, create a new one first
    let threadIdToUse = currentThreadId;
    if (threadIdToUse === null) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const newThread = await apiStartNewThread();
        threadIdToUse = newThread.threadId;
        dispatch({ type: 'SET_CURRENT_THREAD', payload: { id: threadIdToUse, name: newThread.name } });
        fetchThreads(); // Refresh threads to include the new one
      } catch (err: unknown) {
        dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
    }

    const userMessage: Message = { role: 'user', content: input };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_IS_QUERYING', payload: true });

    try {
      const assistantResponse = await apiqueryRag(input, threadIdToUse!);

      if (assistantResponse.assistantMessage) {
        dispatch({ type: 'ADD_MESSAGE', payload: assistantResponse.assistantMessage });
      }
      
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      dispatch({ type: 'ADD_MESSAGE', payload: { role: 'assistant', content: `Error: ${getErrorMessage(err)}` } });
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) });
    } finally {
      dispatch({ type: 'SET_IS_QUERYING', payload: false });
    }
  };

  return (
    <div className="flex flex-grow overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar
        threads={threads}
        currentThreadId={currentThreadId}
        loading={loading}
        error={error}
        onSelectThread={handleSelectThread}
        onNewThread={handleStartNewThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col bg-black w-full min-w-0">
        {/* Mobile Header Toggle */}
        <div className="md:hidden border-b border-white/20 p-4 flex items-center bg-black">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-xs uppercase tracking-widest border border-white/20 px-3 py-1.5"
          >
            [Threads]
          </button>
          <span className="ml-4 text-xs font-bold truncate opacity-50">
            {currentThreadName || 'New Chat'}
          </span>
        </div>

        <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 font-mono">
          {loading && messages.length === 0 && (
            <div className="space-y-8 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="h-3 w-32 bg-white/10 rounded"></div>
                  <div className="h-24 bg-white/5 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
              <div className="text-4xl">_</div>
              <div className="text-[10px] md:text-xs uppercase tracking-widest">Awaiting_User_Input</div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className="flex flex-col gap-2 animate-in">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 ${
                  msg.role === 'user' ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}>
                  {msg.role === 'user' ? 'USER_INPUT' : 'SYSTEM_REPLY'}
                </span>
                <span className="text-[8px] md:text-[9px] text-white/20 tracking-tighter">
                  TIMESTAMP: {new Date().toLocaleTimeString()}
                </span>
              </div>

              <div className={`text-sm leading-relaxed p-3 md:p-4 border ${
                msg.role === 'user' ? 'border-white/20 bg-white/5' : 'border-white/10'
              }`}>
                {msg.content}
              </div>

              {msg.context && msg.context.length > 0 && (
                <div className="mt-2 border-l border-white/20 pl-4 py-2 space-y-2">
                  <div className="text-[8px] md:text-[9px] uppercase tracking-widest text-white/40 font-bold">
                    [Retrieved_Source_Fragments]
                  </div>
                  <ul className="space-y-2">
                    {msg.context.map((ctx, i) => (
                      <li key={i} className="text-[9px] md:text-[10px] text-white/30 leading-normal border-b border-white/5 pb-1 italic">
                        &gt; {ctx}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {isQuerying && (
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 bg-white/20 text-white">
                  SYSTEM_REPLY
                </span>
              </div>
              <div className="text-sm p-3 md:p-4 border border-white/10 italic text-white/40">
                Processing_Query...
              </div>
            </div>
          )}
          {error && <div className="text-red-500 text-xs md:text-sm font-mono mt-4">Error: {error}</div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-white/20 p-4 flex gap-2">
          <input
            type="text"
            className="flex-grow bg-white/10 px-4 py-2 text-sm focus:outline-none min-w-0"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => dispatch({ type: 'SET_INPUT', payload: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSendMessage();
              }
            }}
            disabled={loading}
          />
          <button
            className="bg-white text-black px-4 py-2 text-sm uppercase tracking-widest disabled:opacity-50 whitespace-nowrap"
            onClick={handleSendMessage}
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-grow overflow-hidden relative animate-pulse">
      <div className="hidden md:flex flex-col w-64 border-r border-white/20 bg-black">
        <div className="p-4 border-b border-white/20 h-[61px] flex items-center">
          <div className="h-4 w-24 bg-white/10 rounded"></div>
        </div>
        <div className="flex-grow p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded"></div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-black">
        <div className="md:hidden border-b border-white/20 p-4 h-[61px] bg-black">
          <div className="h-6 w-20 bg-white/10 rounded"></div>
        </div>
        <div className="flex-grow p-4 md:p-6 space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-3 w-32 bg-white/10 rounded"></div>
              <div className="h-24 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/20 p-4 flex gap-2">
          <div className="flex-grow h-10 bg-white/10 rounded"></div>
          <div className="h-10 w-20 bg-white/10 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatContentComponent />
    </Suspense>
  );
}
