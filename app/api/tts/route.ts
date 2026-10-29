import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { normalizeForSpeech } from "@/lib/speech/pronunciation";

// In-memory cache for audio buffers to deliver instant playback (<2ms) on common and replayed answers
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text")?.trim();

  if (!text) {
    return new NextResponse("Missing text parameter", { status: 400 });
  }

  // Bound text to prevent abuse and normalize for accurate pronunciation
  const safeText = normalizeForSpeech(text.slice(0, 1500));
  if (!safeText) {
    return new NextResponse("Empty text after normalization", { status: 400 });
  }

  const voice = process.env.TTS_VOICE || "en-IN-PrabhatNeural";
  const cacheKey = `${voice}:::${safeText}`;

  try {
    let fullBuffer = audioCache.get(cacheKey);

    if (!fullBuffer) {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(safeText);

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (chunks.length > 0) {
            resolve();
          } else {
            reject(new Error("Neural TTS audio generation timed out after 10000ms"));
          }
        }, 10000);

        audioStream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        audioStream.on("end", () => {
          clearTimeout(timeout);
          resolve();
        });

        audioStream.on("error", (err: unknown) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      fullBuffer = Buffer.concat(chunks);

      // Store in LRU cache
      if (audioCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = audioCache.keys().next().value;
        if (oldestKey) audioCache.delete(oldestKey);
      }
      audioCache.set(cacheKey, fullBuffer);
    }

    const fileSize = fullBuffer.length;
    const rangeHeader = req.headers.get("range");

    // Safari & iOS WebKit strictly require Byte Range requests (HTTP 206) for media playback
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunk = fullBuffer.subarray(start, end + 1);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunk.length.toString(),
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new Response(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Neural TTS generation error:", msg);
    return NextResponse.json(
      { error: msg, fallback: "webspeech" },
      { status: 502 },
    );
  }
}
