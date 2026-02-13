import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API is not configured" },
        { status: 503 }
      );
    }

    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert at creating compelling YouTube thumbnail prompts. Given a simple description, expand it into a detailed, visually striking prompt optimized for AI image generation. Focus on: vivid colors, dramatic lighting, facial expressions, composition. Keep the response to 1-2 sentences, suitable for Stable Diffusion / image AI. Do not include any intro or explanation, just the enhanced prompt.`;
    const userPrompt = `Enhance this thumbnail idea into an AI image generation prompt: "${prompt}"`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.8,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Gemini]", res.status, err);
      return NextResponse.json(
        { error: "Prompt enhancement failed" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;

    return NextResponse.json({ enhancedPrompt: text });
  } catch (err) {
    console.error("[Enhance]", err);
    return NextResponse.json(
      { error: "Prompt enhancement failed" },
      { status: 500 }
    );
  }
}
