"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, X } from "lucide-react";

const SOURCES = (
  <>
    <source src="/demo/quotefollow-demo.webm" type="video/webm" />
    <source src="/demo/quotefollow-demo.mp4" type="video/mp4" />
  </>
);
const POSTER = "/demo/quotefollow-demo-poster.jpg";

/**
 * The homepage product demo: a muted loop in the hero, and a full-size copy
 * with controls in a dialog. Recorded by scripts/demo (see its README).
 */
export function HeroDemoVideo() {
  const loopRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fullRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // The browser starts the loop itself (autoPlay), so it doesn't wait for
  // hydration; this pauses it for visitors who asked for reduced motion.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(query.matches);
      const loop = loopRef.current;
      if (!loop) return;
      if (query.matches) {
        loop.pause();
      } else {
        // Browsers only autoplay muted video; make sure the property is set.
        loop.muted = true;
        loop.play().catch(() => undefined);
      }
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  function openFull() {
    loopRef.current?.pause();
    dialogRef.current?.showModal();
    const full = fullRef.current;
    if (full) {
      full.currentTime = 0;
      full.play().catch(() => undefined);
    }
  }

  function onClose() {
    fullRef.current?.pause();
    if (!reducedMotion) {
      loopRef.current?.play().catch(() => undefined);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openFull}
        aria-label="Watch the QuoteFollow product demo"
        className="group relative block w-full overflow-hidden rounded-[1.35rem] border border-[#dce3d7] bg-white p-1.5 text-left shadow-[0_32px_90px_-46px_rgba(33,69,52,0.45)] sm:p-2"
      >
        <span className="mb-1.5 flex items-center gap-1.5 px-2 pt-0.5 sm:mb-2">
          <span className="size-2.5 rounded-full bg-[#e3e8de]" aria-hidden />
          <span className="size-2.5 rounded-full bg-[#e3e8de]" aria-hidden />
          <span className="size-2.5 rounded-full bg-[#e3e8de]" aria-hidden />
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#edf5ed] px-3 py-1 text-[0.7rem] font-semibold text-[#3f6a4f] transition group-hover:bg-[#285742] group-hover:text-white">
            {reducedMotion ? <Play className="size-3" /> : <Volume2 className="size-3" />}
            Watch the 2-minute demo with sound
          </span>
        </span>
        <video
          ref={loopRef}
          className="aspect-[8/5] w-full rounded-[0.95rem] bg-[#f6f8f3]"
          poster={POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
        >
          {SOURCES}
        </video>
      </button>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        aria-label="QuoteFollow product demo"
        className="m-auto w-[min(1100px,calc(100vw-2rem))] max-w-none bg-transparent p-0 backdrop:bg-[#0f1f18]/75 backdrop:backdrop-blur-sm"
      >
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-2xl">
          <video ref={fullRef} className="aspect-[8/5] w-full" poster={POSTER} controls playsInline preload="none">
            {SOURCES}
          </video>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close demo"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-[#1f3f31] shadow hover:bg-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </dialog>
    </>
  );
}
