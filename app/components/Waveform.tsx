"use client";

interface WaveformProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export function Waveform({
  isActive,
  color = "#60a5fa",
  barCount = 7,
}: WaveformProps) {
  return (
    <div
      className="flex items-center justify-center gap-0.75"
      aria-hidden="true"
      style={{ height: 28 }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            height: isActive ? `${14 + (i % 3) * 6}px` : "4px",
            backgroundColor: color,
            opacity: isActive ? 1 : 0.3,
            transition: isActive ? "none" : "all 0.4s ease",
            animationPlayState: isActive ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}
