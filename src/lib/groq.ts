export type GroqMessage =
  | {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    };

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

type GroqChoice = {
  message?: {
    content?: string;
  };
};

type GroqResponse = {
  choices?: GroqChoice[];
  error?: {
    message?: string;
  };
};

function requireGroqKey() {
  if (!groqApiKey) {
    throw new Error('Missing EXPO_PUBLIC_GROQ_API_KEY.');
  }
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Groq did not return JSON.');
  }

  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

async function groqRequest(body: Record<string, unknown>) {
  requireGroqKey();

  const response = await fetch(groqEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as GroqResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Groq request failed.');
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned an empty response.');
  }

  return content;
}

export async function groqJson<T>({
  model,
  messages,
  temperature = 0.2,
}: {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
}) {
  const content = await groqRequest({
    model,
    messages,
    temperature,
    response_format: { type: 'json_object' },
  });

  return extractJson(content) as T;
}

export async function groqText({
  model = GROQ_TEXT_MODEL,
  messages,
  temperature = 0.35,
  maxTokens = 220,
}: {
  model?: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  return groqRequest({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
}
