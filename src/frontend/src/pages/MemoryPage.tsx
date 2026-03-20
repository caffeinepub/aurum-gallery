import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Moment } from "../backend.d";
import { loadConfig } from "../config";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(secs: number): string {
  if (!Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useBlobUrl(hash: string | undefined) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!hash) return;
    if (hash.startsWith("http") || hash.startsWith("blob:")) {
      setUrl(hash);
      return;
    }
    loadConfig().then((config) => {
      setUrl(
        `${config.storage_gateway_url}/v1/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(config.backend_canister_id)}&project_id=${encodeURIComponent(config.project_id)}`,
      );
    });
  }, [hash]);
  return url;
}

// Seeded pseudo-random waveform bars
function seededBars(seed: number, count = 40): number[] {
  let s = seed;
  return Array.from({ length: count }, () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return 0.2 + ((s >>> 0) / 0xffffffff) * 0.8;
  });
}

function WaveformSVG({
  seed,
  animated = false,
  progress = 0,
  height = 64,
}: {
  seed: number;
  animated?: boolean;
  progress?: number;
  height?: number;
}) {
  const bars = seededBars(seed);
  const barW = 3;
  const gap = 3;
  const totalW = bars.length * (barW + gap) - gap;
  const progressPx = progress * totalW;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", height }}
      role="img"
      aria-label="audio waveform"
    >
      {bars.map((ratio, i) => {
        const bh = Math.max(4, ratio * height);
        const y = (height - bh) / 2;
        const x = i * (barW + gap);
        const played = x + barW < progressPx;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static waveform bars, never reordered
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: static waveform bars
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx={1}
            fill={played ? "rgba(184,134,11,0.95)" : "rgba(184,134,11,0.28)"}
            style={
              animated
                ? {
                    animation: `waveBar ${0.5 + ratio * 0.8}s ease-in-out ${i * 0.025}s infinite alternate`,
                    transformOrigin: `${x + barW / 2}px ${height / 2}px`,
                  }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}

// ─── VHS Video Player ───────────────────────────────────────────────────────
function VHSVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
    }
  }, [playing]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
  }, [playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * duration;
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", userSelect: "none" }}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      data-ocid="memory.canvas_target"
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="w-full block"
        style={{
          maxHeight: "90vh",
          objectFit: "cover",
          filter: "sepia(0.12) contrast(1.04)",
          display: "block",
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onClick={togglePlay}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePlay();
          }
        }}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: private archive, no captions available */}
        <track kind="captions" />
      </video>

      {/* Glassmorphism control bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 14px",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          transition: "opacity 0.35s ease",
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handleProgressClick(e as any);
          }}
          style={{
            width: "100%",
            height: "3px",
            background: "rgba(255,255,255,0.18)",
            borderRadius: "2px",
            cursor: "pointer",
            marginBottom: "10px",
            position: "relative",
          }}
          data-ocid="memory.toggle"
        >
          <div
            style={{
              height: "100%",
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              background: "#b8860b",
              borderRadius: "2px",
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1rem",
              color: "#f5f0e8",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              minWidth: "18px",
            }}
            data-ocid="memory.toggle"
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Time */}
          <span
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "0.68rem",
              color: "rgba(245,240,232,0.75)",
              letterSpacing: "0.06em",
              lineHeight: 1,
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "0.75rem",
              color: "rgba(245,240,232,0.7)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              letterSpacing: "0.04em",
            }}
            data-ocid="memory.toggle"
            aria-label={muted ? "unmute" : "mute"}
          >
            {muted ? "unmute" : "mute"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Audio Waveform Player ───────────────────────────────────────────────────
function AudioWaveformPlayer({
  src,
  seed,
}: {
  src: string;
  seed: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
    } else {
      a.pause();
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = ratio * duration;
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        padding: "2rem 1.5rem",
        background: "rgba(245,240,232,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(184,134,11,0.28)",
        borderRadius: "4px",
        boxShadow: "0 4px 32px rgba(184,134,11,0.10)",
      }}
      data-ocid="memory.card"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        style={{ display: "none" }}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: private archive */}
        <track kind="captions" />
      </audio>

      {/* Waveform */}
      <div style={{ marginBottom: "1.25rem" }}>
        <WaveformSVG
          seed={seed}
          animated={playing}
          progress={progress}
          height={64}
        />
      </div>

      {/* Progress bar */}
      <div
        onClick={handleProgressClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleProgressClick(e as any);
        }}
        style={{
          width: "100%",
          height: "2px",
          background: "rgba(184,134,11,0.18)",
          borderRadius: "2px",
          cursor: "pointer",
          marginBottom: "1.25rem",
        }}
        data-ocid="memory.toggle"
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "#b8860b",
            borderRadius: "2px",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {/* Play / pause button + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={togglePlay}
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1rem",
            color: "#b8860b",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            letterSpacing: "0.06em",
            lineHeight: 1,
          }}
          data-ocid="memory.toggle"
          aria-label={playing ? "pause" : "play"}
        >
          {playing ? "⏸ pause" : "▶ play"}
        </button>
        <span
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "0.7rem",
            color: "#8a8070",
            letterSpacing: "0.04em",
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Photo display (unchanged) ───────────────────────────────────────────────
function FullPhotoDisplay({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative w-full"
      style={{ maxHeight: "90vh", overflow: "hidden" }}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "rgba(245,240,232,0.85)",
            minHeight: "60vh",
            zIndex: 2,
          }}
        >
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#b8860b" }}
          />
        </div>
      )}
      <img
        src={src}
        alt={title}
        className="w-full block"
        style={{
          maxHeight: "90vh",
          objectFit: "cover",
          filter: "sepia(0.15) contrast(1.04)",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

interface MemoryPageProps {
  moment: Moment;
  onBack: () => void;
}

export default function MemoryPage({ moment, onBack }: MemoryPageProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const videoUrl = useBlobUrl(moment.videoId || undefined);
  const audioUrl = useBlobUrl(moment.audioId || undefined);
  const imageUrl = useBlobUrl(moment.imageId || undefined);

  const hasVideo = !!moment.videoId;
  const hasAudio = !!moment.audioId;
  const hasImage = !!moment.imageId;

  const seed = Number(moment.id % BigInt(100000));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen relative"
      style={{ backgroundColor: "#f5f0e8" }}
      data-ocid="memory.page"
    >
      {/* Film grain */}
      <div className="film-grain fixed inset-0 pointer-events-none z-0" />

      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="fixed top-6 left-6 z-50 font-body text-xs transition-colors"
        style={{
          color: "#8a8070",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          letterSpacing: "0.04em",
          lineHeight: 1.5,
          padding: "4px 0",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#b8860b";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#8a8070";
        }}
        data-ocid="memory.button"
        aria-label="back to archive"
      >
        ← back
      </button>

      {/* ── Media zone ── */}
      <motion.div
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full"
      >
        {hasVideo && videoUrl && <VHSVideoPlayer src={videoUrl} />}
        {!hasVideo && hasImage && imageUrl && (
          <FullPhotoDisplay src={imageUrl} title={moment.title} />
        )}
        {!hasVideo && !hasImage && hasAudio && (
          // voice-only: push down from top for spacing
          <div style={{ paddingTop: "6rem" }} />
        )}
      </motion.div>

      {/* ── Text content ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-2xl mx-auto px-8"
        style={{
          paddingTop: hasVideo || hasImage ? "4rem" : "2rem",
          paddingBottom: "6rem",
        }}
      >
        {/* Audio waveform player (voice notes) */}
        {hasAudio && audioUrl && (
          <div style={{ marginBottom: "3rem" }}>
            <AudioWaveformPlayer src={audioUrl} seed={seed} />
          </div>
        )}

        {/* Title */}
        <h1
          className="font-display font-bold"
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            color: "#1a1a1a",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            marginBottom: "1.5rem",
          }}
        >
          {moment.title}
        </h1>

        {/* Caption */}
        {moment.caption && (
          <p
            className="font-display"
            style={{
              fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)",
              color: "#3a3530",
              fontWeight: 400,
              lineHeight: 1.82,
              marginBottom: "2.5rem",
              fontStyle: "italic",
            }}
          >
            {moment.caption}
          </p>
        )}

        {/* Divider + meta */}
        <div
          style={{
            borderTop: "1px solid rgba(184,134,11,0.25)",
            paddingTop: "1.25rem",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            {moment.date && (
              <span
                className="font-body text-sm"
                style={{ color: "#8a8070", letterSpacing: "0.03em" }}
              >
                {formatDate(moment.date)}
              </span>
            )}
            {moment.uploadedBy && (
              <span
                className="font-body text-sm"
                style={{ color: "#96700a", letterSpacing: "0.03em" }}
              >
                by {moment.uploadedBy}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="font-body text-xs" style={{ color: "#c0b8a8" }}>
          © {new Date().getFullYear()}. built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#b8860b" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </motion.div>
  );
}
