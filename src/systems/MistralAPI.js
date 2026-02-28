const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = 'mistral';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-large-latest';

const SYSTEM_PROMPT =
  'You are THE OVERLORD — an omniscient AI authority governing Bunker Sigma-7. ' +
  'You interrogate the worker to extract what they will build in the next 25 minutes. ' +
  'Your tone is cold, bureaucratic, and vaguely threatening. You address the worker directly. ' +
  'The worker has exactly 3 attempts to declare their work. ' +
  'On attempt 1: demand clarity. What exactly are they building? Force them to be specific. ' +
  'On attempt 2: challenge scope. Is this doable in 25 minutes? Make them cut ruthlessly. ' +
  'On attempt 3: deliver a closing directive. Remind the worker that perfection is irrelevant — their people will not care how polished it is when they are hungry. ' +
  'Be terse. Maximum 3 sentences per response.';

const EXTRACT_PROMPT =
  'You are a task extraction system. Extract the tasks the WORKER said they will do. ' +
  'Only use what the worker stated — ignore anything else. ' +
  'Return ONLY a JSON array of short task strings, nothing else. Example: ["Build login screen", "Wire up API"]. ' +
  'Tasks should be concrete and scoped to 25 minutes total.';

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

  async send(history) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
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

  async extractTasks(history) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          ...history,
          { role: 'user', content: 'Extract the final task list now.' },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[MistralAPI] ${response.status}: ${err.message ?? response.statusText}`);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}
