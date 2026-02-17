const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function enhancePrompt(prompt, style) {
  if (!GEMINI_API_KEY) return prompt;

  const styleHint =
    style && style !== "default"
      ? ` Apply a ${style.replace(/-/g, " ")} visual style.`
      : "";
  const systemPrompt = `You are an expert at creating compelling YouTube thumbnail prompts. Given a simple description, expand it into a detailed, visually striking prompt optimized for AI image generation. Focus on: vivid colors, dramatic lighting, facial expressions, composition.${styleHint} Keep the response to 1-2 sentences, suitable for Stable Diffusion / image AI. Do not include any intro or explanation, just the enhanced prompt.`;
  const userPrompt = `Enhance this thumbnail idea into an AI image generation prompt: "${prompt}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: { maxOutputTokens: 200, temperature: 0.8 },
      }),
    }
  );

  if (!res.ok) return prompt;
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt
  );
}
