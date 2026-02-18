"use client";

import { useState } from 'react';
import {
  ChatThread,
} from '@/lib/client';

interface SidebarProps {
  threads: ChatThread[];
  currentThreadId: number | null;
  loading: boolean;
  error: string | null;
  onSelectThread: (thread: ChatThread) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: number) => void;
  onRenameThread: (threadId: number, newName: string) => void;
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
      transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
    `}>
      <div className="p-4 border-b border-white/20 flex items-center justify-between h-[61px] shrink-0 bg-black">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Threads</h2>
        <div className="flex items-center space-x-2">
          <button
            className="text-[10px] uppercase tracking-widest border border-white/20 px-2 py-1 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-30"
            onClick={onNewThread}
            disabled={loading}
          >
            [New]
          </button>
          {onClose && (
            <button
              className="md:hidden text-[10px] uppercase tracking-widest border border-white/20 px-2 py-1 hover:bg-white hover:text-black transition-all"
              onClick={onClose}
            >
              [X]
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar scroll-smooth overscroll-y-contain">
        {loading && threads.length === 0 && (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        
        <div className="flex flex-col">
          {threads.map((thread, index) => (
            <div
              key={thread.id}
              className={`group flex items-center justify-between p-3 border-b border-white/5 cursor-pointer transition-all duration-200 animate-in ${
                currentThreadId === thread.id ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {editingThreadId === thread.id ? (
                <div className="flex flex-col w-full gap-2 animate-in duration-200">
                  <input
                    type="text"
                    value={editingThreadName}
                    onChange={(e) => setEditingThreadName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(thread.id);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    className="bg-white/10 text-white text-xs w-full px-2 py-1.5 focus:outline-none border border-white/20"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="text-[9px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                      onClick={() => handleSaveRename(thread.id)}
                    >
                      Save
                    </button>
                    <button
                      className="text-[9px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                      onClick={handleCancelRename}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className={`flex-grow text-[11px] truncate uppercase tracking-tight transition-opacity ${
                      currentThreadId === thread.id ? 'opacity-100 font-bold' : 'opacity-60 group-hover:opacity-100'
                    }`}
                    onClick={() => onSelectThread(thread)}
                  >
                    {thread.name}
                  </span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-[9px] uppercase text-white/40 hover:text-white transition-colors p-1"
                      onClick={() => handleEditClick(thread)}
                    >
                      [Edit]
                    </button>
                    <button
                      className="text-[9px] uppercase text-red-500/40 hover:text-red-500 transition-colors p-1"
                      onClick={() => onDeleteThread(thread.id)}
                    >
                      [X]
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {!loading && threads.length === 0 && (
          <div className="p-8 text-center animate-in">
            <div className="text-[10px] uppercase tracking-widest text-white/20">
              No_Stored_Threads
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="p-4 border-t border-red-500/20 bg-red-500/5 text-[9px] uppercase tracking-widest text-red-400">
          ERR: {error}
        </div>
      )}
    </div>
  );
}

