export function StudioVideoWatermark() {
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-10 select-none md:bottom-4 md:right-4"
      aria-hidden="true"
    >
      <span className="inline-block rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/60 backdrop-blur-[2px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] md:text-xs">
        SceneFlow AI Studio
      </span>
    </div>
  );
}
