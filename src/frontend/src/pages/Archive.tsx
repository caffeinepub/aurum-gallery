import { Toaster } from "@/components/ui/sonner";
import { HttpAgent } from "@icp-sdk/core/agent";
import { ArrowLeft, Loader2, Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Moment } from "../backend.d";
import { loadConfig } from "../config";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { useAllMoments, useCreateMoment } from "../hooks/useQueries";
import { StorageClient } from "../utils/StorageClient";
import MemoryPage from "./MemoryPage";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const d = new Date(ms);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  height = 48,
}: {
  seed: number;
  animated?: boolean;
  height?: number;
}) {
  const bars = seededBars(seed);
  const barW = 2;
  const gap = 2;
  const totalW = bars.length * (barW + gap) - gap;
  return (
    <svg
      width={totalW}
      height={height}
      viewBox={`0 0 ${totalW} ${height}`}
      style={{ display: "block" }}
      role="img"
      aria-label="audio waveform"
    >
      {bars.map((ratio, i) => {
        const bh = Math.max(4, ratio * height);
        const y = (height - bh) / 2;
        const x = i * (barW + gap);
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
            fill="rgba(184,134,11,0.75)"
            style={
              animated
                ? {
                    animation: `waveBar ${0.6 + ratio * 0.7}s ease-in-out ${i * 0.03}s infinite alternate`,
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

function MemoryImage({ imageId, alt }: { imageId: string; alt: string }) {
  const url = useBlobUrl(imageId || undefined);
  const [loaded, setLoaded] = useState(false);

  if (!imageId) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ borderRadius: "2px 2px 0 0" }}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(245,240,232,0.6)" }}
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#b8860b" }}
          />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className="w-full h-auto block"
        style={{ filter: "sepia(0.15) contrast(1.04)" }}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}

function VideoCard({
  moment,
  onClick,
}: {
  moment: Moment;
  onClick?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useBlobUrl(moment.videoId || undefined);

  const handleMouseEnter = () => {
    if (videoRef.current && url) videoRef.current.play().catch(() => {});
  };
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        background: "#111",
        borderRadius: "2px 2px 0 0",
        overflow: "hidden",
        aspectRatio: "16/9",
      }}
    >
      {url ? (
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover block"
          style={{ filter: "sepia(0.18) contrast(1.04)" }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ minHeight: "120px" }}
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#b8860b" }}
          />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.18)",
          transition: "opacity 0.3s",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "2rem",
            color: "rgba(245,240,232,0.88)",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          ▶
        </span>
      </div>
    </div>
  );
}

function VoiceCard({ moment }: { moment: Moment }) {
  const seed = Number(moment.id % BigInt(100000));
  return (
    <div
      className="px-5 pt-5 pb-1"
      style={{
        background: "rgba(184,134,11,0.06)",
        borderRadius: "2px 2px 0 0",
      }}
    >
      <div className="flex items-center justify-center py-3 overflow-hidden">
        <WaveformSVG seed={seed} height={48} />
      </div>
      <div
        className="flex items-center gap-1.5 pb-2"
        style={{ justifyContent: "flex-end" }}
      >
        <span
          style={{
            fontSize: "0.6rem",
            color: "#96700a",
            fontFamily: "Georgia, serif",
            letterSpacing: "0.08em",
            background: "rgba(184,134,11,0.14)",
            border: "1px solid rgba(184,134,11,0.25)",
            borderRadius: "2px",
            padding: "1px 6px",
          }}
        >
          ◉ voice
        </span>
      </div>
    </div>
  );
}

function MemoryCard({
  moment,
  index,
  onClick,
}: {
  moment: Moment;
  index: number;
  onClick?: () => void;
}) {
  const hasVideo = !!moment.videoId;
  const hasAudio = !!moment.audioId;
  const hasImage = !!moment.imageId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={onClick ? { scale: 1.015 } : undefined}
      className={`memory-card mb-4 break-inside-avoid${onClick ? " cursor-pointer" : ""}`}
      data-ocid={`archive.item.${index + 1}`}
      style={{
        background: "rgba(245, 240, 232, 0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(184, 134, 11, 0.22)",
        borderRadius: "3px",
        boxShadow:
          "0 2px 16px rgba(184,134,11,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
      onClick={hasVideo ? undefined : onClick}
      role={onClick && !hasVideo ? "button" : undefined}
      tabIndex={onClick && !hasVideo ? 0 : undefined}
      onKeyDown={
        onClick && !hasVideo
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {hasVideo && <VideoCard moment={moment} onClick={onClick} />}
      {!hasVideo && hasAudio && !hasImage && <VoiceCard moment={moment} />}
      {!hasVideo && hasImage && (
        <MemoryImage imageId={moment.imageId} alt={moment.title} />
      )}

      <div className="px-5 py-4">
        <h3
          className="font-display font-bold text-base leading-snug mb-1"
          style={{ color: "#1a1a1a" }}
        >
          {moment.title}
        </h3>
        {moment.caption && (
          <p
            className="font-body text-sm leading-relaxed mb-3"
            style={{ color: "#4a4540", fontWeight: 300 }}
          >
            {moment.caption}
          </p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-body text-xs" style={{ color: "#8a8070" }}>
            {formatDate(moment.date)}
          </span>
          {moment.uploadedBy && (
            <span
              className="font-body text-xs px-2 py-0.5 rounded-sm"
              style={{
                background: "rgba(184,134,11,0.12)",
                color: "#96700a",
                border: "1px solid rgba(184,134,11,0.2)",
              }}
            >
              by {moment.uploadedBy}
            </span>
          )}
        </div>
        {moment.createdAt && moment.createdAt > BigInt(0) && (
          <p className="font-body text-xs mt-1" style={{ color: "#b0a898" }}>
            {formatTimestamp(moment.createdAt)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Capture Flow
// ─────────────────────────────────────────────────────────────────────────────

type CreateStep =
  | "closed"
  | "menu"
  | "snap"
  | "film"
  | "speak"
  | "upload"
  | "preview";

type CaptureMediaType = "photo" | "video" | "voice";

interface CapturedMedia {
  blob: Blob;
  mediaType: CaptureMediaType;
  blobUrl: string;
}

function formatElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// CreateMenu — step 1
function CreateMenu({
  onPick,
  onClose,
}: {
  onPick: (step: CreateStep) => void;
  onClose: () => void;
}) {
  const tiles: { step: CreateStep; emoji: string; label: string }[] = [
    { step: "snap", emoji: "📷", label: "snap" },
    { step: "film", emoji: "🎥", label: "film" },
    { step: "speak", emoji: "🎙️", label: "speak" },
    { step: "upload", emoji: "📁", label: "upload" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={onClose}
      data-ocid="create.modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(245,240,232,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(184,134,11,0.28)",
          borderRadius: "6px",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.28), 0 4px 24px rgba(184,134,11,0.10)",
          padding: "2rem",
          width: "100%",
          maxWidth: "360px",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8a8070",
            padding: "4px",
          }}
          data-ocid="create.close_button"
        >
          <X className="w-4 h-4" />
        </button>

        <h2
          className="font-display font-bold text-xl mb-6"
          style={{ color: "#1a1a1a", letterSpacing: "0.01em" }}
        >
          make a memory.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {tiles.map(({ step, emoji, label }) => (
            <button
              key={step}
              type="button"
              onClick={() => onPick(step)}
              style={{
                background: "rgba(184,134,11,0.08)",
                border: "1px solid rgba(184,134,11,0.2)",
                borderRadius: "4px",
                padding: "1.5rem 1rem",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                transition: "border-color 0.18s, background 0.18s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(184,134,11,0.55)";
                el.style.background = "rgba(184,134,11,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(184,134,11,0.2)";
                el.style.background = "rgba(184,134,11,0.08)";
              }}
              data-ocid={`create.${label}.button`}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>{emoji}</span>
              <span
                className="font-body text-sm"
                style={{ color: "#4a4540", letterSpacing: "0.04em" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// CameraViewfinder — step 2 for Snap / Film
function CameraViewfinder({
  mode,
  onCapture,
  onBack,
}: {
  mode: "snap" | "film";
  onCapture: (blob: Blob) => void;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  useEffect(() => {
    let mounted = true;
    const constraints =
      mode === "snap"
        ? { video: true, audio: false }
        : { video: true, audio: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (!mounted) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      })
      .catch(() => {
        if (mounted)
          setError("couldn't access camera. check your browser permissions.");
      });
    return () => {
      mounted = false;
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCaptureRef.current(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onCaptureRef.current(blob);
    };
    mr.start();
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= 119) {
          mr.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (error) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "#000" }}
        data-ocid="camera.error_state"
      >
        <p
          className="font-body text-sm mb-6 text-center px-8"
          style={{ color: "rgba(245,240,232,0.75)" }}
        >
          {error}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm px-6 py-2"
          style={{
            color: "#b8860b",
            border: "1px solid rgba(184,134,11,0.4)",
            background: "none",
            cursor: "pointer",
            borderRadius: "3px",
          }}
        >
          go back
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "#000" }}
      data-ocid="camera.panel"
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover block"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 0.4s" }}
        />

        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            data-ocid="camera.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "rgba(184,134,11,0.6)" }}
            />
          </div>
        )}

        {/* 90s camcorder VIEW frame — corner brackets */}
        {ready && (
          <>
            {/* top-left */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                left: "6%",
                width: 60,
                height: 60,
                borderTop: "2px solid rgba(255,255,255,0.85)",
                borderLeft: "2px solid rgba(255,255,255,0.85)",
              }}
            />
            {/* top-right */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                right: "6%",
                width: 60,
                height: 60,
                borderTop: "2px solid rgba(255,255,255,0.85)",
                borderRight: "2px solid rgba(255,255,255,0.85)",
              }}
            />
            {/* bottom-left */}
            <div
              style={{
                position: "absolute",
                bottom: "18%",
                left: "6%",
                width: 60,
                height: 60,
                borderBottom: "2px solid rgba(255,255,255,0.85)",
                borderLeft: "2px solid rgba(255,255,255,0.85)",
              }}
            />
            {/* bottom-right */}
            <div
              style={{
                position: "absolute",
                bottom: "18%",
                right: "6%",
                width: 60,
                height: 60,
                borderBottom: "2px solid rgba(255,255,255,0.85)",
                borderRight: "2px solid rgba(255,255,255,0.85)",
              }}
            />
            {/* VIEW label */}
            <div
              style={{
                position: "absolute",
                top: "calc(10% - 1.25rem)",
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.6rem",
                letterSpacing: "0.3em",
                fontFamily: "monospace",
              }}
            >
              VIEW
            </div>
          </>
        )}

        {/* REC badge — video mode only, while recording */}
        {mode === "film" && isRecording && (
          <div
            className="rec-blink"
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ff3b30",
              }}
            />
            <span
              style={{
                color: "white",
                fontSize: "0.72rem",
                fontFamily: "monospace",
                letterSpacing: "0.12em",
              }}
            >
              REC {formatElapsed(elapsed)}
            </span>
          </div>
        )}

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          style={{
            position: "absolute",
            top: "1rem",
            left: mode === "film" && isRecording ? "5.5rem" : "1rem",
            background: "rgba(0,0,0,0.45)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
          }}
          data-ocid="camera.button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Shutter / Record button */}
        <div
          style={{
            position: "absolute",
            bottom: "2.5rem",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {mode === "snap" ? (
            <button
              type="button"
              onClick={capturePhoto}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "white",
                border: "4px solid rgba(255,255,255,0.35)",
                cursor: "pointer",
                boxShadow: "0 0 0 2px rgba(255,255,255,0.2)",
              }}
              data-ocid="camera.primary_button"
            />
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: isRecording ? "#ff3b30" : "white",
                border: "4px solid rgba(255,255,255,0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 2px rgba(255,255,255,0.2)",
              }}
              data-ocid="camera.primary_button"
            >
              {isRecording ? (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    background: "white",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#ff3b30",
                  }}
                />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// VoiceRecorder — step 2 for Speak
function VoiceRecorder({
  onCapture,
  onBack,
}: {
  onCapture: (blob: Blob) => void;
  onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  useEffect(() => {
    let mounted = true;
    let audioCtx: AudioContext | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!mounted) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;

        // AnalyserNode for waveform
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        // MediaRecorder
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onCaptureRef.current(blob);
        };
        mr.start();
        setRecording(true);

        // Timer
        timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);

        // Waveform RAF
        const animate = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars = barRefs.current;
          const count = bars.length;
          for (let i = 0; i < count; i++) {
            const b = bars[i];
            if (!b) continue;
            const dataIdx = Math.floor((i / count) * dataArray.length);
            const val = dataArray[dataIdx] / 255;
            const h = Math.max(4, val * 120);
            b.style.height = `${h}px`;
            b.style.background = `rgba(184,134,11,${(0.25 + val * 0.55).toFixed(2)})`;
          }
          rafRef.current = requestAnimationFrame(animate);
        };
        animate();
      })
      .catch(() => {
        if (mounted)
          setError("couldn't access mic. check your browser permissions.");
      });

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      audioCtx?.close().catch(() => {});
    };
  }, []);

  const handleStop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  if (error) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "rgba(10,8,6,0.95)" }}
        data-ocid="voice.error_state"
      >
        <p
          className="font-body text-sm mb-6 text-center px-8"
          style={{ color: "rgba(245,240,232,0.75)" }}
        >
          {error}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm px-6 py-2"
          style={{
            color: "#b8860b",
            border: "1px solid rgba(184,134,11,0.4)",
            background: "none",
            cursor: "pointer",
            borderRadius: "3px",
          }}
        >
          go back
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(10,8,6,0.95)" }}
      data-ocid="voice.panel"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          position: "absolute",
          top: "1.5rem",
          left: "1.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(245,240,232,0.6)",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
        data-ocid="voice.button"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Live waveform bars */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          height: "120px",
          marginBottom: "2rem",
        }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: waveform bars never reordered
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            style={{
              width: "3px",
              height: "8px",
              borderRadius: "2px",
              background: "rgba(184,134,11,0.25)",
              transition: "height 0.05s ease, background 0.05s ease",
            }}
          />
        ))}
      </div>

      {/* Timer */}
      <p
        style={{
          fontFamily: "monospace",
          color: "#b8860b",
          fontSize: "1.5rem",
          marginBottom: "0.75rem",
          letterSpacing: "0.1em",
        }}
      >
        {formatElapsed(elapsed)}
      </p>

      {/* Pulsing speak label */}
      {recording && (
        <p
          className="rec-pulse"
          style={{
            color: "rgba(184,134,11,0.75)",
            fontFamily: "Georgia, serif",
            fontSize: "0.82rem",
            letterSpacing: "0.12em",
            marginBottom: "2.5rem",
          }}
        >
          ● speak
        </p>
      )}

      {/* Stop button */}
      <button
        type="button"
        onClick={handleStop}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#b8860b",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(184,134,11,0.4)",
        }}
        data-ocid="voice.primary_button"
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 3,
            background: "#f5f0e8",
          }}
        />
      </button>
    </div>
  );
}

// PreviewScreen — step 3
function PreviewScreen({
  captured,
  onBack,
  onClose,
  onSuccess,
}: {
  captured: CapturedMedia;
  onBack: () => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { actor } = useActor();
  const createMoment = useCreateMoment();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    setUploading(true);
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({ host: config.backend_host });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
      const bytes = new Uint8Array(await captured.blob.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) =>
        setProgress(pct),
      );

      let imageId = "";
      let videoId: string | null = null;
      let audioId: string | null = null;
      if (captured.mediaType === "photo") imageId = hash;
      else if (captured.mediaType === "video") videoId = hash;
      else audioId = hash;

      if (!actor) throw new Error("not connected");
      await actor.createMoment(
        title,
        caption,
        date,
        imageId,
        user ?? "us",
        videoId,
        audioId,
      );

      createMoment.reset();
      toast("done 🖤", {
        style: {
          background: "#1a1a1a",
          color: "#f5f0e8",
          border: "none",
          borderRadius: "3px",
          fontFamily: "inherit",
        },
        position: "bottom-center",
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        `couldn't save it: ${
          err instanceof Error ? err.message : "try again?"
        }`,
      );
    } finally {
      setUploading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "0.875rem",
    color: "#1a1a1a",
    borderBottom: "1px solid rgba(184,134,11,0.35)",
    paddingBottom: "0.5rem",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto"
      style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      data-ocid="preview.modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(245,240,232,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(184,134,11,0.28)",
          borderRadius: "6px",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.28), 0 4px 24px rgba(184,134,11,0.10)",
          width: "100%",
          maxWidth: "448px",
          overflow: "hidden",
          margin: "2rem auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media preview */}
        {captured.mediaType === "photo" && (
          <img
            src={captured.blobUrl}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              display: "block",
              filter: "sepia(0.18) contrast(1.04)",
            }}
          />
        )}
        {captured.mediaType === "video" && (
          // biome-ignore lint/a11y/useMediaCaption: user-recorded personal video, no caption needed
          <video
            src={captured.blobUrl}
            controls
            playsInline
            style={{
              width: "100%",
              maxHeight: 220,
              display: "block",
              background: "#000",
            }}
          />
        )}
        {captured.mediaType === "voice" && (
          <div
            style={{
              background: "rgba(184,134,11,0.08)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <WaveformSVG seed={42} height={56} />
            {/* biome-ignore lint/a11y/useMediaCaption: user-recorded personal audio, no caption needed */}
            <audio
              src={captured.blobUrl}
              controls
              style={{ width: "100%", opacity: 0.7 }}
            />
          </div>
        )}

        {/* Upload progress */}
        {uploading && progress > 0 && progress < 100 && (
          <div
            style={{
              height: 2,
              background: "rgba(184,134,11,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#b8860b",
                transition: "width 0.3s",
              }}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what's this?"
            required
            style={inputStyle}
            data-ocid="preview.input"
          />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="say something about it"
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
            data-ocid="preview.textarea"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={inputStyle}
            data-ocid="preview.input"
          />

          <div
            style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}
          >
            <button
              type="button"
              onClick={onBack}
              style={{
                flex: 1,
                padding: "0.625rem",
                fontFamily: "system-ui, sans-serif",
                fontSize: "0.875rem",
                border: "1px solid rgba(184,134,11,0.35)",
                color: "#8a8070",
                background: "transparent",
                borderRadius: "3px",
                cursor: "pointer",
              }}
              data-ocid="preview.cancel_button"
            >
              nvm
            </button>
            <button
              type="submit"
              disabled={uploading || !title || !date}
              style={{
                flex: 1,
                padding: "0.625rem",
                fontFamily: "system-ui, sans-serif",
                fontSize: "0.875rem",
                background:
                  uploading || !title ? "rgba(184,134,11,0.5)" : "#b8860b",
                color: "#f5f0e8",
                border: "none",
                borderRadius: "3px",
                cursor: uploading || !title ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
              data-ocid="preview.submit_button"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  saving...
                </>
              ) : (
                "add to archive"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing: EmptyState, SearchModal
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center"
      style={{ minHeight: "60vh" }}
      data-ocid="archive.empty_state"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          opacity: 0.6,
          zIndex: 1,
        }}
      />
      <div className="relative z-10 text-center px-8 max-w-sm">
        <div
          className="mb-8 mx-auto"
          style={{
            width: "1px",
            height: "64px",
            background:
              "linear-gradient(to bottom, transparent, rgba(184,134,11,0.4), transparent)",
          }}
        />
        <p
          className="font-display text-lg font-bold mb-2"
          style={{ color: "#3a3530", letterSpacing: "0.02em" }}
        >
          nothing here yet
        </p>
        <p className="font-body text-sm mb-8" style={{ color: "#8a8070" }}>
          drop something in. a photo, a note, whatever.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="font-body text-xs px-5 py-2.5 rounded-sm transition-all duration-200"
          style={{
            border: "1px solid rgba(184,134,11,0.45)",
            color: "#96700a",
            background: "rgba(184,134,11,0.06)",
            letterSpacing: "0.05em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(184,134,11,0.14)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(184,134,11,0.06)";
          }}
        >
          add a memory
        </button>
        <div
          className="mt-8 mx-auto"
          style={{
            width: "1px",
            height: "64px",
            background:
              "linear-gradient(to bottom, transparent, rgba(184,134,11,0.4), transparent)",
          }}
        />
      </div>
    </motion.div>
  );
}

function SearchModal({
  moments,
  onClose,
  onSelectMoment,
}: {
  moments: Moment[];
  onClose: () => void;
  onSelectMoment?: (m: Moment) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? moments.filter(
        (m) =>
          m.title.toLowerCase().includes(trimmed) ||
          (m.caption ?? "").toLowerCase().includes(trimmed),
      )
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      data-ocid="search.modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl"
        style={{
          background: "rgba(245,240,232,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(184,134,11,0.32)",
          borderRadius: "4px",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.22), 0 4px 24px rgba(184,134,11,0.10)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-sm transition-colors"
          style={{ color: "#8a8070" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#b8860b";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#8a8070";
          }}
          data-ocid="search.close_button"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-7 pb-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search your memories..."
            className="w-full bg-transparent outline-none text-xl pb-3"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              borderBottom: "1px solid rgba(184,134,11,0.3)",
              color: "#1a1a1a",
              caretColor: "#b8860b",
            }}
            data-ocid="search.search_input"
          />
          {trimmed && (
            <p
              className="mt-2 text-xs"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#8a8070",
              }}
            >
              {results.length > 0
                ? `${results.length} found`
                : "nothing matched that."}
            </p>
          )}
          {!trimmed && (
            <p
              className="mt-2 text-xs"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#b0a898",
              }}
            >
              start typing to search.
            </p>
          )}
        </div>

        {trimmed && results.length > 0 && (
          <div
            className="px-7 pb-7 overflow-y-auto"
            style={{ maxHeight: "55vh" }}
            data-ocid="search.list"
          >
            <div style={{ columnCount: 2, columnGap: "1rem" }}>
              {results.map((m, i) => (
                <MemoryCard
                  key={m.id.toString()}
                  moment={m}
                  index={i}
                  onClick={
                    onSelectMoment
                      ? () => {
                          onClose();
                          onSelectMoment(m);
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {trimmed && results.length === 0 && (
          <div
            className="px-7 pb-7 text-center py-10"
            data-ocid="search.empty_state"
          >
            <p
              className="text-sm"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#8a8070",
              }}
            >
              nothing matched that.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Archive — main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Archive({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const { data: moments, isLoading, refetch } = useAllMoments();
  const [createStep, setCreateStep] = useState<CreateStep>("closed");
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  // File picker ref for Upload mode
  const filePickerRef = useRef<HTMLInputElement>(null);

  const sorted = [...(moments ?? [])].sort((a, b) =>
    Number(b.createdAt - a.createdAt),
  );

  const handleCapture = useCallback(
    (blob: Blob, mediaType: CaptureMediaType) => {
      const blobUrl = URL.createObjectURL(blob);
      setCapturedMedia({ blob, mediaType, blobUrl });
      setCreateStep("preview");
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let mediaType: CaptureMediaType = "photo";
    if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "voice";
    const blobUrl = URL.createObjectURL(file);
    setCapturedMedia({ blob: file, mediaType, blobUrl });
    setCreateStep("preview");
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleMenuPick = (step: CreateStep) => {
    if (step === "upload") {
      setCreateStep("upload");
      // Trigger file picker after state update
      setTimeout(() => filePickerRef.current?.click(), 50);
    } else {
      setCreateStep(step);
    }
  };

  const handleClose = useCallback(() => {
    // Revoke any existing blob URL
    if (capturedMedia?.blobUrl) URL.revokeObjectURL(capturedMedia.blobUrl);
    setCapturedMedia(null);
    setCreateStep("closed");
  }, [capturedMedia]);

  const handlePreviewBack = useCallback(() => {
    if (capturedMedia?.blobUrl) URL.revokeObjectURL(capturedMedia.blobUrl);
    setCapturedMedia(null);
    setCreateStep("menu");
  }, [capturedMedia]);

  // Show single memory page
  if (selectedMoment) {
    return (
      <AnimatePresence mode="wait">
        <MemoryPage
          key={selectedMoment.id.toString()}
          moment={selectedMoment}
          onBack={() => setSelectedMoment(null)}
        />
      </AnimatePresence>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#f5f0e8" }}
    >
      <div className="film-grain fixed inset-0 pointer-events-none z-0" />
      <Toaster />

      {/* Hidden file input for Upload mode */}
      <input
        ref={filePickerRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Nav */}
      <header
        className="sticky top-0 z-20 px-6 py-4"
        style={{
          background: "rgba(245,240,232,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(184,134,11,0.15)",
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1
            className="font-display font-bold text-xl"
            style={{ color: "#1a1a1a" }}
            data-ocid="archive.section"
          >
            our archive.
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1 transition-colors"
              style={{
                color: "#8a8070",
                background: "transparent",
                border: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#b8860b";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#8a8070";
              }}
              aria-label="search memories"
              data-ocid="search.open_modal_button"
            >
              <Search className="w-4 h-4" />
            </button>
            <span className="font-body text-xs" style={{ color: "#8a8070" }}>
              {user}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="font-body text-xs transition-colors"
              style={{ color: "#8a8070" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#b8860b";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#8a8070";
              }}
              data-ocid="archive.button"
            >
              leave
            </button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-24"
            data-ocid="archive.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#b8860b" }}
            />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState onAdd={() => setCreateStep("menu")} />
        ) : (
          <AnimatePresence>
            <div
              style={{ columnCount: 2, columnGap: "1rem" }}
              className="sm:columns-2 columns-1"
              data-ocid="archive.list"
            >
              {sorted.map((m, i) => (
                <MemoryCard
                  key={m.id.toString()}
                  moment={m as Moment}
                  index={i}
                  onClick={() => setSelectedMoment(m as Moment)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating + button */}
      {sorted.length > 0 && (
        <motion.button
          type="button"
          onClick={() => setCreateStep("menu")}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-8 right-8 z-30 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "#b8860b",
            color: "#f5f0e8",
            boxShadow:
              "0 4px 20px rgba(184,134,11,0.40), 0 2px 8px rgba(0,0,0,0.12)",
          }}
          data-ocid="archive.open_modal_button"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Live Capture Flow */}
      <AnimatePresence>
        {createStep === "menu" && (
          <CreateMenu
            key="menu"
            onPick={handleMenuPick}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Camera viewfinder — full screen, no AnimatePresence wrapper needed */}
      {(createStep === "snap" || createStep === "film") && (
        <CameraViewfinder
          mode={createStep}
          onCapture={(blob) =>
            handleCapture(blob, createStep === "snap" ? "photo" : "video")
          }
          onBack={() => setCreateStep("menu")}
        />
      )}

      {createStep === "speak" && (
        <VoiceRecorder
          onCapture={(blob) => handleCapture(blob, "voice")}
          onBack={() => setCreateStep("menu")}
        />
      )}

      <AnimatePresence>
        {createStep === "preview" && capturedMedia && (
          <PreviewScreen
            key="preview"
            captured={capturedMedia}
            onBack={handlePreviewBack}
            onClose={handleClose}
            onSuccess={() => refetch()}
          />
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <SearchModal
            moments={sorted}
            onClose={() => setSearchOpen(false)}
            onSelectMoment={(m) => {
              setSearchOpen(false);
              setSelectedMoment(m);
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="font-body text-xs" style={{ color: "#b0a898" }}>
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
    </div>
  );
}
