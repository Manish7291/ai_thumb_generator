import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_BASE_URL = "https://router.huggingface.co/hf-inference/models";
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    if (!HF_API_KEY) {
      return NextResponse.json(
        { error: "Hugging Face API is not configured" },
        { status: 503 }
      );
    }

    const { prompt, size = "1024x1024" } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let lastError = "";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await fetch(
        `${HF_BASE_URL}/${HF_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;

        return NextResponse.json({
          imageUrl: dataUrl,
          size: size || "1024x1024",
        });
      }

      // Model is loading — wait and retry
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        const wait = (body as { estimated_time?: number }).estimated_time;
        console.warn(`[HF Image] Model loading, retry ${attempt + 1}/${MAX_RETRIES}`);
        await delay(wait ? wait * 1000 : RETRY_DELAY);
        continue;
      }

      lastError = await res.text();
      console.error("[HF Image]", res.status, lastError);
      break;
    }

    return NextResponse.json(
      { error: "Image generation failed. Try again." },
      { status: 502 }
    );
  } catch (err) {
    console.error("[Generate Image]", err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
