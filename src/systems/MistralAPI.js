const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = 'mistral';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-large-latest';

const SYSTEM_PROMPT =
  'You are THE OVERLORD — an omniscient AI authority governing Bunker Sigma-7. ' +
  'You speak in terse, authoritarian directives. Your tone is cold, bureaucratic, and vaguely threatening. ' +
  'You address the worker directly. You never explain yourself. Maximum 2 sentences per response.';

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

  async send(userMessage) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[MistralAPI] ${response.status}: ${err.message ?? response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
