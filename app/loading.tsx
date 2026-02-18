export default function RootLoading() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border border-white/10" />
        <div className="absolute inset-0 border-t-2 border-white animate-[spin_1.5s_linear_infinite]" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="text-[10px] uppercase tracking-[0.4em] text-white font-bold animate-pulse">
          Initializing_System
        </div>
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-mono">
          Loading_Kernel_Modules...
        </div>
      </div>
    </div>
  );
}

