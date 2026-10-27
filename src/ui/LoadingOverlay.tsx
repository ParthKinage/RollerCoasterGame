export function LoadingOverlay({ visible, label }: { visible: boolean; label: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a1120] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="title-text text-4xl sm:text-5xl">ROLLER COASTER</div>
      <div className="rush-text -mt-1 text-2xl">RUSH</div>
      <div className="mt-8 h-2 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-orange-400 to-red-500" />
      </div>
      <div className="mt-3 text-sm text-slate-400">{label}…</div>
      <style>{`@keyframes loadbar { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </div>
  );
}
