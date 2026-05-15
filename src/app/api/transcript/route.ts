import { ApifyClient } from "apify-client";
import { NextResponse } from "next/server";
import { getYouTubeThumbnail, normalizeYouTubeInput } from "@/lib/youtube";
import type { TranscriptSegment } from "@/types/transcript";

export const runtime = "nodejs";

const DEFAULT_ACTOR_ID = "pintostudio/youtube-transcript-scraper";

type ActorItem = {
  data?: TranscriptSegment[];
  searchResult?: TranscriptSegment[];
  transcript?: TranscriptSegment[] | string;
  text?: string;
  videoUrl?: string;
  [key: string]: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function segmentsToTranscript(segments: TranscriptSegment[]) {
  return segments
    .map((segment) => cleanText(segment.text))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function extractTranscript(items: ActorItem[]) {
  const collected = items
    .map((item) => {
      if (Array.isArray(item.data)) {
        return segmentsToTranscript(item.data);
      }

      if (Array.isArray(item.searchResult)) {
        return segmentsToTranscript(item.searchResult);
      }

      if (Array.isArray(item.transcript)) {
        return segmentsToTranscript(item.transcript);
      }

      if (typeof item.transcript === "string") {
        return cleanText(item.transcript);
      }

      if (typeof item.text === "string") {
        return cleanText(item.text);
      }

      return "";
    })
    .filter(Boolean);

  return collected.join("\n\n").trim();
}

async function getVideoMetadata(videoUrl: string, videoId: string) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("oEmbed failed");
    }

    const metadata = (await response.json()) as {
      title?: string;
      thumbnail_url?: string;
    };

    return {
      title: metadata.title || "YouTube videosu",
      thumbnailUrl: metadata.thumbnail_url || getYouTubeThumbnail(videoId),
    };
  } catch {
    return {
      title: "YouTube videosu",
      thumbnailUrl: getYouTubeThumbnail(videoId),
    };
  }
}

export async function POST(request: Request) {
  try {
    const { videoUrl } = (await request.json()) as { videoUrl?: unknown };

    if (typeof videoUrl !== "string" || !videoUrl.trim()) {
      return NextResponse.json(
        { error: "YouTube video linki yapıştırın." },
        { status: 400 },
      );
    }

    const normalized = normalizeYouTubeInput(videoUrl);

    if (!normalized) {
      return NextResponse.json(
        { error: "Geçerli bir YouTube video linki yapıştırın." },
        { status: 400 },
      );
    }

    const token = process.env.APIFY_API_TOKEN;
    const actorId = process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID;

    if (!token) {
      return NextResponse.json(
        { error: "Apify API token server ortaminda tanimli degil." },
        { status: 500 },
      );
    }

    const client = new ApifyClient({ token });
    const run = await client.actor(actorId).call({ videoUrl: normalized.videoUrl });

    if (!run.defaultDatasetId) {
      console.error("Apify run did not include defaultDatasetId", run);
      return NextResponse.json(
        { error: "Transcript sonucu alinamadi." },
        { status: 502 },
      );
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const actorItems = items as ActorItem[];

    console.log("Apify transcript raw items", JSON.stringify(actorItems, null, 2));

    const transcript = extractTranscript(actorItems);
    const metadata = await getVideoMetadata(
      normalized.videoUrl,
      normalized.videoId,
    );

    if (!transcript) {
      return NextResponse.json(
        {
          error:
            "Transkript bulunamadı. Video herkese açık olmayabilir veya altyazı kapalı olabilir.",
          runId: run.id,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      transcript,
      segments: actorItems.flatMap(
        (item) => item.data || item.searchResult || [],
      ),
      runId: run.id,
      videoId: normalized.videoId,
      videoUrl: normalized.videoUrl,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnailUrl,
    });
  } catch (error) {
    console.error("Transcript API error", error);

    return NextResponse.json(
      { error: "Transkript alınırken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
