import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { normalizeForSpeech } from "@/lib/speech/pronunciation";

// In-memory cache for audio buffers to deliver instant playback (<1ms) on common and replayed answers
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
    // 1. Fast-path: return from memory cache immediately if available (<1ms)
    const cachedBuffer = audioCache.get(cacheKey);
    if (cachedBuffer) {
      const fileSize = cachedBuffer.length;
      const rangeHeader = req.headers.get("range");

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          return new NextResponse("Requested range not satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` },
          });
        }

        const chunk = cachedBuffer.subarray(start, end + 1);
        return new Response(new Uint8Array(chunk), {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunk.length.toString(),
            "Content-Type": "audio/mpeg",
            "Cache-Control":
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }

      return new Response(new Uint8Array(cachedBuffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    // 2. Real-time chunked streaming: flush first MP3 chunk to browser in <150ms!
    // No waiting for the full audio stream to complete before responding!
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(safeText);

    const collectedChunks: Buffer[] = [];

    const stream = new ReadableStream({
      start(controller) {
        let hasData = false;
        const timeout = setTimeout(() => {
          if (!hasData) {
            try {
              controller.error(
                new Error(
                  "Neural TTS audio generation timed out after 15000ms",
                ),
              );
            } catch {}
          }
        }, 15000);

        audioStream.on("data", (chunk: Buffer) => {
          hasData = true;
          collectedChunks.push(chunk);
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {}
        });

        audioStream.on("end", () => {
          clearTimeout(timeout);
          try {
            if (collectedChunks.length > 0) {
              const fullBuffer = Buffer.concat(collectedChunks);
              if (audioCache.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = audioCache.keys().next().value;
                if (oldestKey) audioCache.delete(oldestKey);
              }
              audioCache.set(cacheKey, fullBuffer);
            }
            controller.close();
          } catch {}
        });

        audioStream.on("error", (err: unknown) => {
          clearTimeout(timeout);
          try {
            controller.error(err);
          } catch {}
        });
      },
      cancel() {
        try {
          if (
            typeof (audioStream as unknown as { destroy?: () => void })
              ?.destroy === "function"
          ) {
            (audioStream as unknown as { destroy: () => void }).destroy();
          }
        } catch {}
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Transfer-Encoding": "chunked",
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
