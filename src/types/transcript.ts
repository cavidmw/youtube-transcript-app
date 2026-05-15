export type TranscriptSegment = {
  start?: string | number;
  dur?: string | number;
  text?: unknown;
};

export type TranscriptResult = {
  transcript: string;
  segments: TranscriptSegment[];
  runId: string;
  videoId: string;
  videoUrl: string;
  title: string;
  thumbnailUrl: string;
};

export type HistoryItem = TranscriptResult & {
  id: string;
  createdAt: string;
};
