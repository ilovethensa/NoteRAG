"use client";

import { useReducer, useEffect } from 'react';
import {
  getSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  Snippet,
} from '@/lib/client';
import { reducer, initialState } from './reducer';

const SNIPPET_COLLAPSE_LENGTH = 200;

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { snippets, newSnippet, editingId, editingContent, expandedSnippets } = state;

  const fetchSnippets = async () => {
    try {
      const snippets = await getSnippets();
      dispatch({ type: 'SET_SNIPPETS', payload: snippets });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch snippets' });
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnippet.trim()) return;
    try {
      await createSnippet(newSnippet);
      dispatch({ type: 'SET_NEW_SNIPPET', payload: '' });
      await fetchSnippets();
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create snippet' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this snippet? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteSnippet(id);
      await fetchSnippets();
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete snippet' });
    }
  };

  const handleEdit = (snippet: Snippet) => {
    dispatch({ type: 'START_EDITING', payload: { id: snippet.id, content: snippet.content } });
  };

  const handleSave = async (id: number) => {
    if (!editingContent.trim()) return;
    try {
      await updateSnippet(id, editingContent);
      dispatch({ type: 'FINISH_EDITING' });
      await fetchSnippets();
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save snippet' });
    }
  };

  const toggleSnippetExpansion = (id: number) => {
    dispatch({ type: 'TOGGLE_SNIPPET_EXPANSION', payload: id });
  };

  return (
    <div className="flex-grow flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full gap-y-8 md:gap-y-12">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white/50 text-[10px] md:text-xs uppercase tracking-[0.2em]">
          <span className="w-2 h-2 bg-white animate-pulse" />
          Add Snippet
        </div>
        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            className="w-full bg-black border border-white/20 p-4 pb-14 md:pb-4 text-sm md:text-base text-white focus:outline-none focus:border-white/50 transition-colors resize-none font-mono"
            rows={4}
            value={newSnippet}
            onChange={(e) => dispatch({ type: 'SET_NEW_SNIPPET', payload: e.target.value })}
            placeholder="Type content to embed..."
          />
          <button
            type="submit"
            className="absolute bottom-4 right-4 bg-white text-black px-4 md:px-6 py-2 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-6 flex-grow flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 text-white/50 text-[10px] md:text-xs uppercase tracking-[0.2em]">
            Knowledge Base
          </div>
          <div className="text-[9px] md:text-[10px] text-white/30 uppercase">
            Total: {snippets.length}
          </div>
        </div>
        
        <ul className="grid grid-cols-1 gap-4 overflow-y-auto pr-2">
          {snippets.map((snippet) => {
            const isExpanded = expandedSnippets.has(snippet.id);
            const isCollapsible = snippet.content.length > SNIPPET_COLLAPSE_LENGTH;
            const displayedContent = isCollapsible && !isExpanded
              ? snippet.content.substring(0, SNIPPET_COLLAPSE_LENGTH) + '...'
              : snippet.content;

            return (
              <li key={snippet.id} className="border border-white/10 p-4 group hover:border-white/30 transition-colors flex flex-col gap-4">
                {editingId === snippet.id ? (
                  <textarea
                    className="w-full bg-white/5 border border-white/20 p-2 text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                    rows={3}
                    value={editingContent}
                    onChange={(e) => dispatch({ type: 'SET_EDITING_CONTENT', payload: e.target.value })}
                  />
                ) : (
                  <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                    <span className="text-white/20 mr-2 text-[10px] md:text-xs">#{snippet.id.toString().padStart(3, '0')}</span>
                    {displayedContent}
                    {isCollapsible && (
                      <button 
                        onClick={() => toggleSnippetExpansion(snippet.id)}
                        className="text-[10px] uppercase text-blue-400 hover:text-blue-200 ml-2"
                      >
                        [{isExpanded ? 'Collapse' : 'Expand'}]
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId === snippet.id ? (
                    <button
                      onClick={() => handleSave(snippet.id)}
                      className="text-[10px] uppercase tracking-tighter border border-white/40 px-3 py-1 hover:bg-white hover:text-black transition-colors"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(snippet)}
                      className="text-[10px] uppercase tracking-tighter border border-white/20 px-3 py-1 hover:border-white/40 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(snippet.id)}
                    className="text-[10px] uppercase tracking-tighter border border-red-900/50 text-red-500/70 px-3 py-1 hover:bg-red-500 hover:text-black transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}