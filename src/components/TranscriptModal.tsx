"use client";

import { Check, Copy, X } from "lucide-react";
import type { TranscriptResult } from "@/types/transcript";

type TranscriptModalProps = {
  copied: boolean;
  result: TranscriptResult | null;
  onClose: () => void;
  onCopy: () => void;
};

export function TranscriptModal({
  copied,
  result,
  onClose,
  onCopy,
}: TranscriptModalProps) {
  if (!result) {
    return null;
  }

  return (
    <div className="modalLayer" onMouseDown={onClose} role="presentation">
      <section
        className={`transcriptModal ${copied ? "isCopied" : ""}`}
        aria-label="Tam transkript"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modalTop">
          <div className="modalTitleBlock">
            <span className="modalKicker">Transkript</span>
            <h2>{result.title}</h2>
          </div>
          <div className="modalActions">
            <button
              className="iconButton glassButton"
              type="button"
              onClick={onCopy}
              aria-label="Transkripti kopyala"
              title="Kopyala"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
            </button>
            <button
              className="iconButton ghostButton"
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modalScroll">
          <p>{result.transcript}</p>
        </div>
      </section>
    </div>
  );
}
