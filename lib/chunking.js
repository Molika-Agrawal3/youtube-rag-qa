/**
 * Groups short caption segments into larger chunks for embedding.
 *
 * Why: a single caption line ("so the next thing is") has almost no meaning
 * on its own, so its embedding is useless for search. A chunk of roughly a
 * paragraph carries enough context to match a question.
 *
 * Overlap: each chunk repeats the last `overlapSegments` segments of the
 * previous chunk, so an idea that spans a chunk boundary still appears
 * whole in at least one chunk.
 *
 * Returns: [{ text, startSeconds }], where startSeconds is when the chunk
 * begins in the video (used for timestamped citations).
 */
export function chunkSegments(segments, { maxChars = 1000, overlapSegments = 2 } = {}) {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const segment of segments) {
    const addedLength = segment.text.length + 1; // +1 for the joining space

    if (current.length > 0 && currentLength + addedLength > maxChars) {
      chunks.push(toChunk(current));

      // Start the next chunk with the tail of this one (the overlap).
      // Never carry over the whole chunk, or we'd never make progress.
      const keep = Math.min(overlapSegments, current.length - 1);
      current = keep > 0 ? current.slice(-keep) : [];
      currentLength = current.reduce((sum, s) => sum + s.text.length + 1, 0);
    }

    current.push(segment);
    currentLength += addedLength;
  }

  if (current.length > 0) chunks.push(toChunk(current));
  return chunks;
}

function toChunk(segments) {
  return {
    text: segments.map((s) => s.text).join(" "),
    startSeconds: segments[0].startSeconds,
  };
}
