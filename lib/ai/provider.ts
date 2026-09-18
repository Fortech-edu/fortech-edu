export type ProviderRequest = {
  systemPrompt: string;
  payload: unknown;
  signal: AbortSignal;
};

export interface AIProvider {
  generateJson(request: ProviderRequest): Promise<unknown>;
}

export type AIProviderFailure = "provider_http_error" | "provider_invalid_response";

export class AIProviderError extends Error {
  readonly failure: AIProviderFailure;
  readonly status?: number;

  constructor(failure: AIProviderFailure, status?: number) {
    super(failure);
    this.name = "AIProviderError";
    this.failure = failure;
    this.status = status;
  }
}

type AIEnvironment = {
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
};

class JsonChatProvider implements AIProvider {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    url: string,
    apiKey: string,
    model: string,
  ) {
    this.url = url;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateJson({ systemPrompt, payload, signal }: ProviderRequest) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `UNTRUSTED DATA:\n${JSON.stringify(payload)}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal,
    });

    if (!response.ok) throw new AIProviderError("provider_http_error", response.status);
    const raw = await response.text();
    if (raw.length > 100_000) throw new AIProviderError("provider_invalid_response");
    try {
      const body: unknown = JSON.parse(raw);
      const content = extractContent(body);
      return typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new AIProviderError("provider_invalid_response");
    }
  }
}

export function getConfiguredProvider(environment: AIEnvironment = {
  AI_API_URL: process.env.AI_API_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
}) {
  const { AI_API_URL, AI_API_KEY, AI_MODEL } = environment;
  if (!AI_API_URL || !AI_API_KEY || !AI_MODEL) return null;

  try {
    const url = new URL(AI_API_URL);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new JsonChatProvider(url.toString(), AI_API_KEY, AI_MODEL);
  } catch {
    return null;
  }
}

function extractContent(body: unknown) {
  if (typeof body !== "object" || body === null) throw new AIProviderError("provider_invalid_response");
  const value = body as {
    output_text?: unknown;
    text?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = value.choices?.[0]?.message?.content ?? value.output_text ?? value.text;
  if (typeof content !== "string" && (typeof content !== "object" || content === null)) {
    throw new AIProviderError("provider_invalid_response");
  }
  return content;
}
