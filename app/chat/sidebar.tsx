"use client";

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchThreads as apiFetchThreads,
  startNewThread as apiStartNewThread,
  deleteChatThread as apiDeleteChatThread,
  renameChatThread as apiRenameChatThread,
  ChatThread,
} from '@/lib/client';
import { getErrorMessage } from '@/lib/utils';
import { useChatState } from './chat-context'; // Assuming a context for chat state

interface SidebarProps {
  threads: ChatThread[];
  currentThreadId: number | null;
  loading: boolean;
  error: string | null;
  onSelectThread: (thread: ChatThread) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: number) => void;
  onRenameThread: (threadId: number, newName: string) => void;
  fetchThreads: () => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  threads,
  currentThreadId,
  loading,
  error,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  fetchThreads,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingThreadName, setEditingThreadName] = useState<string>('');

  const handleEditClick = (thread: ChatThread) => {
    setEditingThreadId(thread.id);
    setEditingThreadName(thread.name);
  };

  const handleSaveRename = async (threadId: number) => {
    if (!editingThreadName.trim()) {
      alert('Thread name cannot be empty.');
      return;
    }
    await onRenameThread(threadId, editingThreadName);
    setEditingThreadId(null);
    setEditingThreadName('');
  };

  const handleCancelRename = () => {
    setEditingThreadId(null);
    setEditingThreadName('');
  };

  return (
    <div className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      fixed md:relative z-50 md:z-auto
      flex flex-col w-64 h-full border-r border-white/20 bg-black
      transition-transform duration-300 ease-in-out
    `}>
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <h2 className="text-lg font-bold">Threads</h2>
        <div className="flex items-center space-x-2">
          <button
            className="text-white/50 hover:text-white transition-colors"
            onClick={onNewThread}
            disabled={loading}
          >
            [New]
          </button>
          {onClose && (
            <button
              className="md:hidden text-white/50 hover:text-white transition-colors"
              onClick={onClose}
            >
              [Close]
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        {loading && threads.length === 0 && (
          <div className="p-4 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded"></div>
            ))}
          </div>
        )}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`flex items-center justify-between p-3 border-b border-white/10 cursor-pointer animate-in ${
              currentThreadId === thread.id ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            {editingThreadId === thread.id ? (
              <input
                type="text"
                value={editingThreadName}
                onChange={(e) => setEditingThreadName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(thread.id);
                  if (e.key === 'Escape') handleCancelRename();
                }}
                className="bg-white/10 text-white text-sm flex-grow mr-2 px-2 py-1"
                autoFocus
              />
            ) : (
              <span
                className="flex-grow text-sm"
                onClick={() => onSelectThread(thread)}
              >
                {thread.name}
              </span>
            )}
            <div className="flex items-center space-x-2">
              {editingThreadId === thread.id ? (
                <>
                  <button
                    className="text-white/50 hover:text-white transition-colors text-xs"
                    onClick={() => handleSaveRename(thread.id)}
                  >
                    [Save]
                  </button>
                  <button
                    className="text-white/50 hover:text-white transition-colors text-xs"
                    onClick={handleCancelRename}
                  >
                    [Cancel]
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="text-white/50 hover:text-white transition-colors text-xs"
                    onClick={() => handleEditClick(thread)}
                  >
                    [Edit]
                  </button>
                  <button
                    className="text-red-500/50 hover:text-red-500 transition-colors text-xs"
                    onClick={() => onDeleteThread(thread.id)}
                  >
                    [X]
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!loading && threads.length === 0 && (
          <div className="p-4 text-white/50 text-sm">No threads yet. Click [New] to start one.</div>
        )}
      </div>
    </div>
  );
}
