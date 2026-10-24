import { Innertube } from "youtubei.js";

/**
 * Turns any common YouTube link into its 11-character video ID.
 * Returns null if the input isn't a recognizable YouTube video.
 *
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s → dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ                       → dQw4w9WgXcQ
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ         → dQw4w9WgXcQ
 */
export function extractVideoId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  // Someone may paste just the ID itself.
  if (ID_PATTERN.test(value)) return value;

  let url;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      // /shorts/ID, /embed/ID, /live/ID, /v/ID
      const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      if (match) id = match[2];
    }
  }

  return id && ID_PATTERN.test(id) ? id : null;
}

/**
 * Which YouTube app we pretend to be when asking for caption links.
 *
 * YouTube now serves EMPTY captions to the regular web client unless the
 * request carries a "proof of origin" token, and its transcript endpoint
 * rejects requests outright. Caption links issued to the iOS and visionOS
 * apps still work without a token, so we ask as those clients, in order.
 * If YouTube changes this again, this list is the place to adjust.
 */
const CAPTION_CLIENTS = ["IOS", "VISIONOS"];

// Creating an Innertube client is slow, so we create one and reuse it.
let innertubePromise = null;
function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = Innertube.create({ lang: "en" });
  }
  return innertubePromise;
}

/**
 * Fetches a video's title, channel and transcript.
 * Each transcript segment is one caption line with its start time.
 */
export async function fetchTranscript(videoId) {
  const youtube = await getInnertube();
  let sawCaptionTracks = false;
  let lastError = null;

  for (const client of CAPTION_CLIENTS) {
    try {
      const info = await youtube.getBasicInfo(videoId, { client });
      const track = pickCaptionTrack(info.captions?.caption_tracks ?? []);
      if (!track) continue;
      sawCaptionTracks = true;

      const segments = await downloadCaptions(track.base_url);
      if (segments.length === 0) continue;

      return {
        title: info.basic_info?.title ?? "Untitled video",
        channelName: info.basic_info?.author ?? "Unknown channel",
        segments,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (!sawCaptionTracks && !lastError) {
    throw new TranscriptUnavailableError(
      "This video has no captions, so it can't be analyzed."
    );
  }
  throw new TranscriptUnavailableError(
    "Couldn't download this video's captions from YouTube.",
    { cause: lastError ?? undefined }
  );
}

/**
 * Picks the best caption track: English captions written by a person first,
 * then English auto-generated ("asr") captions, then whatever exists.
 */
function pickCaptionTrack(tracks) {
  const isEnglish = (t) => t.language_code?.startsWith("en");
  return (
    tracks.find((t) => isEnglish(t) && t.kind !== "asr") ??
    tracks.find((t) => isEnglish(t)) ??
    tracks[0] ??
    null
  );
}

/**
 * Downloads a caption track in YouTube's "json3" format and converts it to
 * [{ text, startSeconds }]. In json3, each caption is an "event" with a start
 * time (tStartMs) and pieces of text ("segs").
 */
async function downloadCaptions(baseUrl) {
  const response = await fetch(`${baseUrl}&fmt=json3`);
  if (!response.ok) {
    throw new Error(`Caption download failed with HTTP ${response.status}`);
  }
  const body = await response.text();
  if (!body) return [];
  return parseJson3Captions(JSON.parse(body));
}

export function parseJson3Captions(data) {
  return (data.events ?? [])
    .filter((event) => Array.isArray(event.segs))
    .map((event) => ({
      text: event.segs
        .map((seg) => seg.utf8 ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
      startSeconds: Math.floor((event.tStartMs ?? 0) / 1000),
    }))
    .filter((segment) => segment.text.length > 0);
}

// A specific error type, so the API route can tell this apart from a crash
// and show the user a helpful message.
export class TranscriptUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "TranscriptUnavailableError";
  }
}
