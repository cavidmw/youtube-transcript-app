const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export type NormalizedYouTubeInput = {
  videoId: string;
  videoUrl: string;
};

function extractIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  const second = parts[1];

  if (first && YOUTUBE_VIDEO_ID_PATTERN.test(first)) {
    return first;
  }

  if (
    ["shorts", "embed", "live", "v"].includes(first || "") &&
    second &&
    YOUTUBE_VIDEO_ID_PATTERN.test(second)
  ) {
    return second;
  }

  return null;
}

function toUrlCandidate(input: string) {
  const trimmed = input.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function normalizeYouTubeInput(input: string): NormalizedYouTubeInput | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) {
    return {
      videoId: trimmed,
      videoUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  try {
    const url = new URL(toUrlCandidate(trimmed));
    const host = url.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    const videoId =
      url.searchParams.get("v") ||
      url.searchParams.get("vi") ||
      extractIdFromPath(url.pathname);

    if (!videoId || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
      return null;
    }

    return {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
