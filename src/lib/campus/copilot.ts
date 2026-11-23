import { z } from "zod";

const envelope = z.object({ candidates: z.array(z.object({
  content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
})).min(1) });

export async function generate<T>(instruction: string, data: object, schema: z.ZodType<T>): Promise<T | undefined> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return undefined;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) return undefined;
  try {
    const jsonSchema = z.toJSONSchema(schema);
    delete jsonSchema.$schema;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(8_000), cache: "no-store",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(data) }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, maxOutputTokens: 2048 },
      }),
    });
    if (!response.ok) return undefined;
    const parsed = envelope.safeParse(await response.json());
    if (!parsed.success) return undefined;
    const content = parsed.data.candidates[0].content.parts.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
    const result = schema.safeParse(JSON.parse(content));
    return result.success ? result.data : undefined;
  } catch { return undefined; }
}

const hits = new Map<string, { count: number; reset: number }>();

export function usageAllowed(id: string, now = Date.now()) {
  for (const [key, each] of hits) if (each.reset <= now) hits.delete(key);
  const existing = hits.get(id);
  if (existing) return ++existing.count <= 10;
  if (hits.size >= 5000) return false;
  hits.set(id, { count: 1, reset: now + 60_000 });
  return true;
}
