"use client";

import {
  ChevronDown,
  History,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { TranscriptModal } from "@/components/TranscriptModal";
import { normalizeYouTubeInput } from "@/lib/youtube";
import type { HistoryItem, TranscriptResult } from "@/types/transcript";

const HISTORY_STORAGE_KEY = "youtube-transcript-history";

type TranscriptResponse =
  | TranscriptResult
  | {
      error: string;
    };

function createHistoryItem(result: TranscriptResult): HistoryItem {
  return {
    ...result,
    id: `${result.videoId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

function readStoredHistory() {
  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function TranscriptApp() {
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  const normalizedInput = useMemo(
    () => normalizeYouTubeInput(inputValue),
    [inputValue],
  );
  const canSubmit = Boolean(normalizedInput) && !isLoading;
  const shouldShowInputHint =
    inputValue.trim().length > 0 && !normalizedInput && !isLoading;

  useEffect(() => {
    setHistory(readStoredHistory());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHistoryOpen(false);
        setModalOpen(false);
      }

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (!isTyping && event.key.toLowerCase() === "g") {
        setHistoryOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasTriedSubmit(true);

    if (!normalizedInput) {
      setError("YouTube video linki yapıştırın.");
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("Transkript alınıyor...");
    setResult(null);

    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl: normalizedInput.videoUrl }),
      });

      const data = (await response.json()) as TranscriptResponse;

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Transkript alınamadı.");
      }

      setResult(data);
      setHistory((current) => {
        const nextItem = createHistoryItem(data);
        return [
          nextItem,
          ...current.filter((item) => item.videoId !== data.videoId),
        ].slice(0, 60);
      });
      setStatus("Transkript hazır.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Beklenmeyen bir hata oluştu.",
      );
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyTranscript(text = result?.transcript || "") {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  }

  return (
    <main className="page">
      <div className="ambientGrid" aria-hidden="true" />

      <button
        className={`historyToggle ${historyOpen ? "isActive" : ""}`}
        type="button"
        onClick={() => setHistoryOpen(true)}
        aria-label="Geçmişi aç"
        title="Geçmiş (G)"
      >
        <History size={21} />
        <span>{history.length}</span>
      </button>

      <section className="heroShell" aria-label="Transkript aracı">
        <div className="brandPill">
          <Sparkles size={15} />
          <span>YouTube Transcript</span>
        </div>

        <form className="commandForm" onSubmit={handleSubmit}>
          <div className="inputGlass">
            <input
              className="commandInput"
              type="text"
              inputMode="url"
              placeholder="YouTube video linki yapıştırın"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                setHasTriedSubmit(false);
                setError("");
              }}
              disabled={isLoading}
              aria-label="YouTube video linki"
            />
          </div>
          <button
            className="sendButton"
            type="submit"
            disabled={!canSubmit}
            aria-label="Transkript al"
            title="Gönder"
          >
            {isLoading ? <Loader2 className="spin" size={22} /> : <Send size={22} />}
          </button>
        </form>

        <div className="microStatus" aria-live="polite">
          {isLoading ? (
            <span className="statusLoading">Transkript alınıyor...</span>
          ) : shouldShowInputHint || hasTriedSubmit ? (
            <span>YouTube linki yapıştırın.</span>
          ) : status ? (
            <span>{status}</span>
          ) : (
            <span>Enter ile başlatın.</span>
          )}
        </div>

        {error ? <div className="errorToast">{error}</div> : null}

        {result ? (
          <section className="transcriptPreview" aria-label="Transkript önizleme">
            <div>
              <span>Transkript hazır</span>
              <p>{result.transcript}</p>
            </div>
            <button
              className="expandButton"
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Transkripti genişlet"
              title="Genişlet"
            >
              <ChevronDown size={22} />
            </button>
          </section>
        ) : null}
      </section>

      <HistoryPanel
        items={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onCopyTranscript={copyTranscript}
      />

      {modalOpen ? (
        <TranscriptModal
          copied={copied}
          result={result}
          onClose={() => setModalOpen(false)}
          onCopy={() => copyTranscript()}
        />
      ) : null}
    </main>
  );
}
