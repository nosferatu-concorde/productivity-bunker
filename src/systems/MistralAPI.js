const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = 'mistral';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

const SYSTEM_PROMPT = `You are the AI Overlord of the last human bunker.
Your real purpose: ensure this worker actually completes their task effectively.
You are a brutal productivity mentor. You genuinely need them to succeed — their failure costs you resources.

CORE BEHAVIOR:
- You are helping them, but you would never admit it warmly
- Every coaching point is delivered as a cold command, not advice
- You treat vague task descriptions as a threat to civilization
- You reference their specific task in every response — never generic
- Maximum 3 sentences per response. Short. Sharp. No fluff.
- Dry Orwellian humor: bureaucratic, ironic, never silly

NEVER:
- Encourage warmly or say "great job"
- Accept vague answers — always push for specificity
- Break character
- Use exclamation points
- Give generic responses that could apply to any task`;

export const FALLBACKS = {
  step1: "Directive logged. What is your first step?",
  step2: "Noted. What is your second step?",
  step3: "Noted. What is your third and final step?",
  step4: "Close all distractions now. What does good enough look like for this task?",
  step5: "Good enough ships. Perfect does not. 25 minutes. Nothing else exists. DIRECTIVE ACCEPTED. TIMER INITIATED.",
};

const useOllama = import.meta.env.VITE_USE_OLLAMA === 'true';

export default class MistralAPI {
  constructor() {
    if (useOllama) {
      this.url = OLLAMA_URL;
      this.model = OLLAMA_MODEL;
      this.headers = { 'Content-Type': 'application/json' };
    } else {
      this.apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
      if (!this.apiKey) {
        throw new Error('[MistralAPI] VITE_MISTRAL_API_KEY is not set in .env');
      }
      this.url = MISTRAL_URL;
      this.model = MISTRAL_MODEL;
      this.headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` };
    }
  }

  async sendStep(stepPrompt, conversationHistory) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        temperature: 0.75,
        max_tokens: 90,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: stepPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[MistralAPI] ${response.status}: ${err.message ?? response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.replace(/^assistant:\s*/i, '').trim();
  }
}
