
# Productivity Bunker - Game Design Document (GDD)

## Core Concept
You’re the leader of a dying bunker civilization, answerable to an AI Overlord that assigns real-world tasks (e.g., "code for 25 minutes"). Complete tasks on time to earn resources and upgrade your bunker. Fail, and your people perish. The game blends the Pomodoro technique with dystopian stakes and dark humor, powered by Mistral AI for dynamic Overlord dialogue.

## Game Loop
1. **AI Interview:** Overlord assigns a 25-minute task (e.g., "Debug the login system").
2. **Real-World Work:** Player works IRL while the game timer counts down.
3. **Task Completion:**
   - Early: Bonus resources = `(25 - actual_time) * 2`.
   - On Time (25 mins): +10 rations.
   - Overtime: -10 oxygen.
4. **Bunker Management:** Spend resources on upgrades (e.g., "Better Air Filter").

## Key Features
- **Pomodoro Mechanics:** Tasks are 25-minute sprints—finish early for bonuses, late for penalties.
- **Dystopian Stakes:** Lose oxygen/rations on failure; civilians die if resources deplete.
- **AI Overlord:** Mistral-powered dialogue with Orwellian tone + dark humor.
- **Progression:** Unlock upgrades to reduce penalties.

## Tech Stack
- **Game Engine:** Phaser 3 (2D, pixel art).
- **AI:** Mistral API for Overlord dialogue.
- **Timer:** JavaScript `setTimeout` or Phaser’s `TimeEvent`.

## MVP Scope (48 Hours)
| Feature               | Description                                  | Priority |
|-----------------------|----------------------------------------------|----------|
| AI Overlord Dialogue  | 3–5 dynamic lines per task outcome.          | High     |
| Task Timer            | 25-minute countdown with visual feedback.    | High     |
| Resource System       | Rations, oxygen, tools (bars + penalties).   | High     |
| Bunker Upgrades       | 2–3 upgrades (e.g., "Hydroponics: +5 rations/day"). | Medium   |
| Civilian Stakes       | Population counter (e.g., "42/50 survivors"). | Medium   |

## Art Style
- **Visuals:** Glitchy terminal UI, red/text warnings, pixel-art bunker.
- **Sound:** Air leaks (overtime), cheers (early finish), Overlord text-to-speech (stretch goal).

## Why It Stands Out
- **Innovation:** First game to gamify real-world productivity with dystopian stakes.
- **AI Hook:** Mistral’s dynamic, humorous Overlord makes tasks engaging.
- **Demo-Friendly:** The 25-minute loop is easy to showcase in 2 mins.

## Judges’ Pitch
*"Productivity Bunker turns your to-do list into a survival game. The AI Overlord’s sarcasm keeps you accountable, and the civilian stakes make procrastination literally deadly. Built in 48 hours with Phaser 3 and Mistral AI, it’s Habitica meets 1984—but your GitHub commits are the rebellion."*

## Next Steps
1. Prototype the AI interview + timer (Phaser).
2. Integrate Mistral API for dialogue.
3. Add resource bars and 1 upgrade.

## Setup Instructions
1. Clone this repo.
2. Open `index.html` in a browser to start the game.
3. Run `ai_overlord.py` for local dialogue testing (requires Mistral API key).

## File Structure
```
productivity_bunker/
├── index.html          # Phaser game entry point
├── game.js             # Core game logic
├── ai_overlord.py      # Python script for Mistral API dialogue
├── dialogue.json       # Sample Overlord lines
├── README.md           # This file
└── assets/             # Images, sounds (stretch goal)
```
