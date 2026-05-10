"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Volume2 } from "lucide-react";

interface Props {
  /** Plain-text or HTML article content. HTML will be stripped. */
  text: string;
  /** Optional title prepended to the spoken text */
  title?: string;
}

const STORAGE_KEY = "jhb-tts-rate";

function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  // Drop scripts/styles
  tmp.querySelectorAll("script,style,iframe,figure.advertisement").forEach((el) => el.remove());
  return tmp.textContent?.replace(/\s+/g, " ").trim() || "";
}

function pickIndonesianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const id = voices.find((v) => v.lang?.toLowerCase().startsWith("id"));
  if (id) return id;
  const ms = voices.find((v) => v.lang?.toLowerCase().startsWith("ms"));
  if (ms) return ms;
  return voices.find((v) => v.default) || voices[0] || null;
}

// Split long text into <200 char chunks at sentence boundaries to avoid TTS cutoff bug
function chunkText(text: string, max = 200): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > max) {
      if (buf) out.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export default function AudioPlayer({ text, title }: Props) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying]     = useState(false);
  const [paused, setPaused]       = useState(false);
  const [progress, setProgress]   = useState(0); // 0..1
  const [rate, setRate]           = useState(1.0);
  const chunksRef = useRef<string[]>([]);
  const idxRef    = useRef(0);
  const totalRef  = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setRate(parseFloat(stored) || 1.0);

    return () => window.speechSynthesis.cancel();
  }, []);

  function buildChunks() {
    const fullText = (title ? `${title}. ` : "") + stripHtml(text);
    const chunks = chunkText(fullText, 180);
    chunksRef.current = chunks;
    totalRef.current  = chunks.length;
    idxRef.current    = 0;
  }

  function speakNext() {
    if (idxRef.current >= chunksRef.current.length) {
      stop();
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunksRef.current[idxRef.current]);
    const voices = window.speechSynthesis.getVoices();
    const voice  = pickIndonesianVoice(voices);
    if (voice) utter.voice = voice;
    utter.lang  = "id-ID";
    utter.rate  = rate;
    utter.pitch = 1;

    utter.onend = () => {
      idxRef.current++;
      setProgress(idxRef.current / Math.max(totalRef.current, 1));
      if (idxRef.current < chunksRef.current.length) {
        speakNext();
      } else {
        stop();
      }
    };
    utter.onerror = () => {
      idxRef.current++;
      if (idxRef.current < chunksRef.current.length) speakNext();
      else stop();
    };
    window.speechSynthesis.speak(utter);
  }

  function play() {
    if (!supported) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      return;
    }
    buildChunks();
    setPlaying(true);
    setPaused(false);
    setProgress(0);

    // Voices may load async on first call — wait briefly
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        speakNext();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      // Fallback: speak after 500ms even if voiceschanged didn't fire
      setTimeout(speakNext, 500);
    } else {
      speakNext();
    }
  }

  function pause() {
    window.speechSynthesis.pause();
    setPaused(true);
    setPlaying(false);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    idxRef.current = 0;
  }

  function restart() {
    stop();
    setTimeout(play, 100);
  }

  function changeRate(newRate: number) {
    setRate(newRate);
    localStorage.setItem(STORAGE_KEY, String(newRate));
    if (playing || paused) {
      // Restart at current chunk with new rate
      const currentIdx = idxRef.current;
      window.speechSynthesis.cancel();
      idxRef.current = currentIdx;
      setTimeout(speakNext, 100);
    }
  }

  if (!supported) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-4">
      <div className="flex items-center gap-3">
        <Volume2 className="h-5 w-5 text-goto-green" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-txt-primary">Dengarkan artikel</p>
          <p className="text-xs text-txt-secondary">Suara dibacakan langsung di perangkat Anda</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!playing && !paused ? (
          <button
            onClick={play}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            aria-label="Putar audio artikel"
          >
            <Play className="h-4 w-4" />
            Putar
          </button>
        ) : playing ? (
          <button
            onClick={pause}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            aria-label="Jeda audio"
          >
            <Pause className="h-4 w-4" />
            Jeda
          </button>
        ) : (
          <button
            onClick={play}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            aria-label="Lanjutkan audio"
          >
            <Play className="h-4 w-4" />
            Lanjut
          </button>
        )}

        {(playing || paused) && (
          <>
            <button
              onClick={stop}
              className="btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-txt-secondary hover:text-red-600"
              aria-label="Stop audio"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
            <button
              onClick={restart}
              className="btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-txt-secondary hover:text-goto-green"
              aria-label="Ulang dari awal"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ulang
            </button>
          </>
        )}

        <select
          value={rate}
          onChange={(e) => changeRate(parseFloat(e.target.value))}
          className="ml-auto rounded-full border border-border bg-white px-2 py-1 text-xs text-txt-secondary"
          aria-label="Kecepatan baca"
        >
          <option value="0.75">0.75×</option>
          <option value="1">1×</option>
          <option value="1.25">1.25×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </div>

      {(playing || paused) && totalRef.current > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className="h-full bg-goto-green transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
