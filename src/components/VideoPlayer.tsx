import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoScene } from '../content/videos';

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export interface VideoProgressReport {
  /** Intervalles réellement lus depuis le dernier rapport. */
  ranges: [number, number][];
  position: number;
  duration: number;
  ended: boolean;
}

interface Props {
  src: string;
  title: string;
  /** Position de reprise (s) : le lecteur reprend là où l'apprenant s'est arrêté. */
  resumeAt?: number;
  /** Part déjà vue (0–100), affichée sous la vidéo. */
  percentSeen?: number;
  /** Chapitres (V0). */
  scenes?: VideoScene[];
  /** Ne lire que ce segment (« revoir la scène concernée »). */
  segment?: { start: number; end: number; label: string } | null;
  onProgress?: (report: VideoProgressReport) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  poster?: string;
}

/**
 * Lecteur vidéo : reprise à la dernière position, enregistrement des intervalles lus (« vue à X % »),
 * chapitres facultatifs et lecture d'un segment seul.
 */
export function VideoPlayer({ src, title, resumeAt = 0, percentSeen, scenes, segment, onProgress, onEnded, autoPlay = false, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const pending = useRef<[number, number][]>([]);
  const segStart = useRef<number | null>(null);
  const lastT = useRef(0);
  const reportRef = useRef(onProgress);
  reportRef.current = onProgress;

  const closeSegment = useCallback(() => {
    if (segStart.current !== null && lastT.current > segStart.current) pending.current.push([segStart.current, lastT.current]);
    segStart.current = null;
  }, []);

  const flush = useCallback(
    (ended = false) => {
      const v = ref.current;
      if (!v) return;
      const wasPlaying = segStart.current !== null;
      closeSegment();
      if (wasPlaying && !v.paused) segStart.current = v.currentTime;
      if (!pending.current.length && !ended) return;
      const ranges = pending.current;
      pending.current = [];
      reportRef.current?.({ ranges, position: v.currentTime, duration: v.duration || 0, ended });
    },
    [closeSegment],
  );

  // Rapport périodique (toutes les 5 s) et au démontage.
  useEffect(() => {
    const id = window.setInterval(() => flush(), 5000);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, [flush]);

  // Lecture d'un segment seul.
  useEffect(() => {
    const v = ref.current;
    if (!v || !segment) return;
    closeSegment();
    v.currentTime = segment.start;
    void v.play().catch(() => {});
  }, [segment, closeSegment]);

  const onLoaded = () => {
    const v = ref.current!;
    setDuration(v.duration);
    if (!segment && resumeAt > 1 && resumeAt < v.duration - 2) v.currentTime = resumeAt;
    if (autoPlay) void v.play().catch(() => {});
  };

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  const jump = (start: number) => {
    const v = ref.current;
    if (!v) return;
    closeSegment();
    v.currentTime = start;
    void v.play().catch(() => {});
  };

  const current = scenes?.find((s) => t >= s.start && t < s.end);

  return (
    <div className="overflow-hidden rounded-[20px] bg-ink text-white shadow-[0_24px_48px_-24px_rgba(22,50,79,0.6)]">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={ref}
          src={src}
          poster={poster}
          className="h-full w-full"
          controls
          playsInline
          preload="metadata"
          aria-label={title}
          onLoadedMetadata={onLoaded}
          onPlay={() => {
            setPlaying(true);
            segStart.current = ref.current!.currentTime;
          }}
          onPause={() => {
            setPlaying(false);
            flush();
          }}
          onSeeking={() => closeSegment()}
          onSeeked={() => {
            if (ref.current && !ref.current.paused) segStart.current = ref.current.currentTime;
            lastT.current = ref.current?.currentTime ?? 0;
          }}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            lastT.current = time;
            setT(time);
            if (segment && time >= segment.end) {
              e.currentTarget.pause();
            }
          }}
          onEnded={() => {
            setPlaying(false);
            flush(true);
            onEnded?.();
          }}
        />
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-1.5 text-sm font-semibold hover:bg-white/20" aria-label={playing ? 'Pause' : 'Lecture'}>
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Lecture'}
          </button>
          {segment && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
              <RotateCcw size={13} /> À revoir : {segment.label}
            </span>
          )}
          <span className="ml-auto text-xs tabular-nums text-slate-300">
            {fmt(t)} / {fmt(duration)}
            {percentSeen !== undefined && <span className="ml-2 rounded-full bg-white/12 px-2 py-0.5">vue à {percentSeen} %</span>}
          </span>
        </div>
        {scenes && (
          <div className="thin-scroll flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label={`Chapitres de la vidéo ${title}`}>
            {scenes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(s.start)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-left text-xs ring-1 transition ${current?.id === s.id ? 'bg-white/18 ring-teal-300' : 'ring-white/20 hover:bg-white/10'}`}
              >
                <span className="font-semibold">{s.title}</span>
                <span className="ml-1.5 text-slate-300">{fmt(s.start)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
