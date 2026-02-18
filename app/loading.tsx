export default function RootLoading() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-white animate-[ping_1s_linear_infinite]" />
        <div className="w-2 h-2 bg-white animate-[ping_1s_linear_infinite_0.2s]" />
        <div className="w-2 h-2 bg-white animate-[ping_1s_linear_infinite_0.4s]" />
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
        System_Initializing...
      </div>
    </div>
  );
}
