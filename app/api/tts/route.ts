import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { normalizeForSpeech } from "@/app/utils/speechNormalizer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text")?.trim();

  if (!text) {
    return new NextResponse("Missing text parameter", { status: 400 });
  }

  // Bound text to prevent abuse and normalize for accurate pronunciation
  const safeText = normalizeForSpeech(text.slice(0, 1500));
  const voice = process.env.TTS_VOICE || "en-IN-PrabhatNeural";

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(safeText);

    const chunks: Buffer[] = [];
    return await new Promise<Response>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      audioStream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(
          new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": buffer.length.toString(),
              "Cache-Control":
                "public, max-age=86400, stale-while-revalidate=604800",
            },
          }),
        );
      });

      audioStream.on("error", (err: unknown) => {
        reject(err);
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error("Neural TTS generation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
