"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sign with a finger, stylus or mouse. Calls onChange with a PNG data URL
 * after each stroke, or null when cleared.
 */
export function SignaturePad({ onChange, label = "Sign here" }: { onChange: (png: string | null) => void; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Match the drawing buffer to the displayed size (sharp on high-density phone screens).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#140e09";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const [x, y] = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const [x, y] = point(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(canvas.current?.toDataURL("image/png") ?? null);
  }
  function clear() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative border-2 border-ink bg-white">
        <canvas
          ref={canvas}
          aria-label={label}
          role="img"
          className="block h-36 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-wider text-muted">{label}</span>}
        <span className="pointer-events-none absolute inset-x-4 bottom-6 border-b border-dashed border-line" aria-hidden="true" />
      </div>
      <button type="button" onClick={clear} className="mt-2 font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Clear signature</button>
    </div>
  );
}
