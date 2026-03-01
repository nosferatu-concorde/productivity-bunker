# Productivity Bunker

> YEAR 2031. THE SURFACE IS GONE.

You command BUNKER-7 — 847 survivors, dwindling oxygen, one merciless overseer: THE OVERLORD.

Complete work — earn oxygen, rations, survival. Miss the deadline — civilians die.

This is not about points. It's about shipping under pressure.

**Ship. Or perish.**

Built with **Phaser 3** and **Mistral AI** for the Mistral Worldwide 2026 Hackathon.

## Game flow

1. **Intro** — lore briefing from the Overlord
2. **Interrogation** — AI interrogates you about your task and breaks it into 3 steps
3. **Timer** — 25 minutes on the clock, check off your steps as you go
4. **Report** — mission results, resource impact, Overlord verdict
5. **Bunker status** — updated oxygen, rations, and civilian count before the next mission

## Requirements

- Node.js 18+
- A [Mistral AI](https://console.mistral.ai/) API key

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
VITE_MISTRAL_API_KEY=your_key_here
```

## Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`. Upload the contents to itch.io or any static host.

## Optional: run with local Ollama

If you want to run the AI locally instead of calling the Mistral API:

```
VITE_USE_OLLAMA=true
```

Make sure [Ollama](https://ollama.com/) is running with the `mistral` model pulled:

```bash
ollama pull mistral
ollama serve
```
