const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_BASE_URL = "https://router.huggingface.co/hf-inference/models";
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds for model loading

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateImage(
  prompt: string,
  options?: { width?: number; height?: number; negativePrompt?: string }
): Promise<{
  imageUrl: string;
  size: string;
}> {
  if (!HF_API_KEY) {
    throw new Error("Hugging Face API is not configured");
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
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: options?.width || 1024,
            height: options?.height || 1024,
            ...(options?.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
          },
        }),
      }
    );

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const imageUrl = `data:image/png;base64,${base64}`;
      const w = options?.width || 1024;
      const h = options?.height || 1024;
      return { imageUrl, size: `${w}x${h}` };
    }

    // Model is loading — wait and retry
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      const wait = (body as { estimated_time?: number }).estimated_time;
      console.warn(`[HF] Model loading, retrying in ${wait ?? RETRY_DELAY / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await delay(wait ? wait * 1000 : RETRY_DELAY);
      continue;
    }

    lastError = await res.text();
    console.error("[HF]", res.status, lastError);
    break;
  }

  throw new Error("Image generation failed");
}
