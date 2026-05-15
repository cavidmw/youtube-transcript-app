"use client";

import { Download, ExternalLink, X } from "lucide-react";
import type { HistoryItem } from "@/types/transcript";

type HistoryPanelProps = {
  items: HistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onCopyTranscript: (text: string) => void;
};

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function getDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function groupHistory(items: HistoryItem[]) {
  return items.reduce<Array<{ dateKey: string; title: string; items: HistoryItem[] }>>(
    (groups, item) => {
      const dateKey = getDateKey(item.createdAt);
      const existing = groups.find((group) => group.dateKey === dateKey);

      if (existing) {
        existing.items.push(item);
        return groups;
      }

      groups.push({
        dateKey,
        title: formatDate(item.createdAt),
        items: [item],
      });

      return groups;
    },
    [],
  );
}

function downloadTranscript(item: HistoryItem) {
  const blob = new Blob([item.transcript], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${item.videoId}-transcript.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function HistoryPanel({
  items,
  isOpen,
  onClose,
  onCopyTranscript,
}: HistoryPanelProps) {
  const groups = groupHistory(items);

  return (
    <>
      <div
        className={`historyBackdrop ${isOpen ? "isOpen" : ""}`}
        onMouseDown={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`historyPanel ${isOpen ? "isOpen" : ""}`}
        aria-label="History"
        aria-hidden={!isOpen}
      >
        <div className="historyHeader">
          <div>
            <span className="panelKicker">History</span>
            <h2>Geçmiş</h2>
          </div>
          <button
            className="iconButton ghostButton"
            type="button"
            onClick={onClose}
            aria-label="Geçmişi kapat"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="historyList">
          {groups.length === 0 ? (
            <div className="emptyHistory">
              <p>Henüz transkript yok.</p>
              <span>Bir video işlendiğinde burada görünür.</span>
            </div>
          ) : (
            groups.map((group) => (
              <section className="historyGroup" key={group.dateKey}>
                <h3>{group.title}</h3>
                <div className="dateRule" />
                <div className="historyItems">
                  {group.items.map((item) => (
                    <article className="historyItem" key={item.id}>
                      <a
                        className="thumbLink"
                        href={item.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${item.title} videosunu aç`}
                      >
                        <img src={item.thumbnailUrl} alt="" loading="lazy" />
                      </a>
                      <div className="historyInfo">
                        <a
                          className="historyTitle"
                          href={item.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{item.title}</span>
                          <ExternalLink size={13} />
                        </a>
                        <button
                          className="historySnippet"
                          type="button"
                          onClick={() => onCopyTranscript(item.transcript)}
                          title="Transkripti kopyala"
                        >
                          {item.transcript}
                        </button>
                      </div>
                      <button
                        className="downloadButton"
                        type="button"
                        onClick={() => downloadTranscript(item)}
                        aria-label="Transkripti indir"
                        title="İndir"
                      >
                        <Download size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
