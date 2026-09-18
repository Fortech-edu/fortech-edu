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
  /**
   * Capped, secret-free provider diagnostics: HTTP-visible facts only —
   * configured model name, provider error code/status, and a short provider
   * message. Never contains the API key, auth headers, or request payload.
   */
  readonly detail?: string;

  constructor(failure: AIProviderFailure, status?: number, detail?: string) {
    super(failure);
    this.name = "AIProviderError";
    this.failure = failure;
    this.status = status;
    this.detail = detail;
  }
}

/** Provider error bodies are parsed only up to this size; larger bodies are truncated. */
const MAX_ERROR_BODY_PARSE_LENGTH = 20_000;
/** Total diagnostics appended to a provider failure. */
const MAX_DIAGNOSTIC_LENGTH = 240;
/** Cap for any single provider-provided text fragment inside diagnostics. */
const MAX_DIAGNOSTIC_FRAGMENT_LENGTH = 160;

type ProviderErrorDiagnostic = {
  code?: string;
  status?: string;
  message?: string;
};

/**
 * Extracts the provider's own error code/status/message from known response
 * shapes: Google REST errors as `[{ error: { code, message, status } }]`,
 * object form `{ error: { ... } }`, and OpenAI-style error objects.
 */
function extractErrorDiagnostic(bodyText: string): ProviderErrorDiagnostic | null {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      if (typeof candidate !== "object" || candidate === null) continue;
      const error = (candidate as { error?: unknown }).error;
      if (typeof error !== "object" || error === null) continue;
      const { code, status, message } = error as {
        code?: unknown;
        status?: unknown;
        message?: unknown;
      };
      const diagnostic: ProviderErrorDiagnostic = {};
      if (typeof code === "number" || typeof code === "string") diagnostic.code = String(code);
      if (typeof status === "string" && status.trim()) diagnostic.status = status;
      if (typeof message === "string" && message.trim()) diagnostic.message = message;
      if (diagnostic.code || diagnostic.status || diagnostic.message) return diagnostic;
    }
    return null;
  } catch {
    return null;
  }
}

function flattenDiagnosticText(value: string, maxLength: number) {
  const flattened = value.replace(/\s+/g, " ").trim();
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength - 1)}…` : flattened;
}

/**
 * Builds capped, secret-free diagnostics for a non-2xx provider response from
 * facts the provider itself reported. Never includes the request payload,
 * auth headers, or credentials.
 */
function describeHttpFailure(response: Response, bodyText: string, model: string): string {
  const parts = [`model=${model}`];
  const diagnostic = extractErrorDiagnostic(bodyText.slice(0, MAX_ERROR_BODY_PARSE_LENGTH));
  if (diagnostic?.code) parts.push(`google_code=${flattenDiagnosticText(diagnostic.code, 40)}`);
  if (diagnostic?.status) parts.push(`google_status=${flattenDiagnosticText(diagnostic.status, 60)}`);
  if (diagnostic?.message) {
    parts.push(`message="${flattenDiagnosticText(diagnostic.message, MAX_DIAGNOSTIC_FRAGMENT_LENGTH)}"`);
  }
  if (parts.length === 1) {
    // Non-JSON or unrecognized body: keep a tiny capped excerpt so failures
    // like wrong gateway paths still identify themselves in logs.
    parts.push(`body="${flattenDiagnosticText(bodyText.slice(0, MAX_ERROR_BODY_PARSE_LENGTH), MAX_DIAGNOSTIC_FRAGMENT_LENGTH)}"`);
  }
  const detail = parts.join(" ");
  return detail.length > MAX_DIAGNOSTIC_LENGTH ? `${detail.slice(0, MAX_DIAGNOSTIC_LENGTH - 1)}…` : detail;
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
        temperature: 0,
      }),
      signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new AIProviderError(
        "provider_http_error",
        response.status,
        describeHttpFailure(response, bodyText, this.model),
      );
    }
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
