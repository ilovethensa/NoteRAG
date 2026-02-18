"use client";

import { useState, useRef, useEffect } from 'react';
import { getSnippets, createSnippet, fetchStats } from '@/lib/client';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState<{ chat: number, embedding: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const snippets = await getSnippets();
      const exportData = {
        version: "1.0",
        snippets: snippets.map(s => ({ content: s.content }))
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noterag-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ text: 'Knowledge base exported successfully.', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to export knowledge base.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.snippets || !Array.isArray(data.snippets)) {
        throw new Error('Invalid export file format');
      }

      const total = data.snippets.length;
      let count = 0;
      
      for (const snippet of data.snippets) {
        if (snippet.content) {
          try {
            await createSnippet(snippet.content);
            count++;
          } catch (err) {
            console.error('Failed to import snippet:', err);
          }
        }
      }

      setMessage({ text: `Import completed. ${count} of ${total} snippets added.`, type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to import. Ensure file is a valid export JSON.', type: 'error' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-grow flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full gap-y-8 md:gap-y-12 overflow-y-auto custom-scrollbar">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white/70 text-[10px] md:text-xs uppercase tracking-[0.2em]">
          <span className="w-2 h-2 bg-white animate-pulse" />
          System Settings
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4">
          {/* Export Section */}
          <div className="border border-white/20 p-4 md:p-6 space-y-4 bg-white/[0.05]">
            <h3 className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-white">Export_Knowledge_Base</h3>
            <p className="text-[10px] md:text-[11px] text-white/60 leading-relaxed font-mono">
              Saves current snippets as a structured JSON file for backup or relocation.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-white text-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {exporting ? 'Processing...' : 'Export_Data'}
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-white/20 p-4 md:p-6 space-y-4 bg-white/[0.05]">
            <h3 className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-white">Import_Knowledge_Base</h3>
            <p className="text-[10px] md:text-[11px] text-white/60 leading-relaxed font-mono">
              Injects snippets from a JSON export into the current database.
            </p>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="w-full border border-white/30 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {importing ? 'Syncing...' : 'Import_Data'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {message && (
          <div className={`text-[10px] font-mono tracking-wider p-4 border animate-in slide-in-from-top-2 duration-300 ${
            message.type === 'success' ? 'border-white/40 bg-white/10 text-white' : 'border-red-700 bg-red-950/40 text-red-300'
          }`}>
            <span className="opacity-60 mr-2">[{message.type === 'success' ? 'SUCCESS' : 'FAILURE'}]</span>
            {message.text}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white/70 text-[10px] uppercase tracking-[0.2em]">
          Usage Metrics
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="border border-white/20 p-6 space-y-2 bg-white/[0.05]">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Chat_Tokens_Consumed</h3>
            <div className="text-3xl font-mono text-white">
              {stats?.chat.toLocaleString() || '0'}
            </div>
            <p className="text-[10px] text-white/50 font-mono italic">Total tokens used in AI dialogues.</p>
          </div>

          <div className="border border-white/20 p-6 space-y-2 bg-white/[0.05]">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Embedded_Tokens</h3>
            <div className="text-3xl font-mono text-white">
              {stats?.embedding.toLocaleString() || '0'}
            </div>
            <p className="text-[10px] text-white/50 font-mono italic">Total tokens converted to vector embeddings.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
