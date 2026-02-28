# Claude Code Instructions — Productivity Bunker AI Overlord Dialogue System

Update the AI Overlord dialogue system in Productivity Bunker to implement a 5-step 
mentoring interrogation before the task timer starts.

## The Goal

The Overlord is a brutal productivity mentor disguised as a villain. He genuinely needs 
the worker to succeed because failure costs him resources. Every coaching point is 
delivered as a cold command, never warm advice.

---

## Update MistralAPI.js

Replace the current system prompt and methods with the following:

### System Prompt

```js
const OVERLORD_SYSTEM_PROMPT = `You are the AI Overlord of the last human bunker.
Your real purpose: ensure this worker actually completes their task effectively.
You are a brutal productivity mentor. You genuinely need them to succeed — their 
failure costs you resources.

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
- Give generic responses that could apply to any task`
```

### Conversation State

Track this object across the 5 steps:

```js
const sessionState = {
  taskDescription: "",      // set after step 1
  steps: "",                // set after step 2 (player's 3 steps)
  doneStandard: "",         // set after step 3 (saved from Overlord response, not player input)
  conversationHistory: []   // full message history passed to every Mistral call
}
```

### The 5 Step Prompts

```js
// STEP 1 — Player submits task, Overlord clarifies/reframes
const step1Prompt = `The worker submitted this task: "${taskDescription}".
If it is vague, push back and demand specificity — what exactly, for whom, what is the scope.
If it is already specific, acknowledge it coldly and confirm it as their directive.
1-2 sentences. Make them feel the weight of being imprecise.`

// STEP 2 — Overlord commands 3 steps
const step2Prompt = `Task confirmed: "${taskDescription}".
Command the worker to break this into exactly 3 executable steps.
Tell them vague plans waste oxygen. Demand they type the 3 steps now.
2 sentences max. Frame it as a non-negotiable order.`

// STEP 3 — Player typed their 3 steps, Overlord sets good enough standard
const step3Prompt = `Task: "${taskDescription}".
Worker's 3 steps: "${steps}".
Now define what DONE looks like for this task — the minimum acceptable output.
Remind them perfection is not a resource the bunker has.
Reference their actual steps. 2-3 sentences.`

// STEP 4 — Overlord orders distraction elimination
const step4Prompt = `Task: "${taskDescription}".
Order the worker to close all distractions right now — tabs, phone, notifications.
Tell them to name out loud what they are closing. Frame it as a direct command.
2 sentences. Cold and specific.`

// STEP 5 — Focus sendoff, timer about to start
const step5Prompt = `Task: "${taskDescription}". Steps: "${steps}". Done standard: "${doneStandard}".
Deliver the final pre-mission sendoff.
Remind them: good enough ships, perfect does not. 25 minutes. Nothing else exists.
End with exactly: "DIRECTIVE ACCEPTED. TIMER INITIATED."
3 sentences max.`
```

### Mistral Call Settings

Use these settings on every call:

```js
{
  model: "mistral-small-latest",
  temperature: 0.75,
  max_tokens: 90,
  messages: [
    { role: "system", content: OVERLORD_SYSTEM_PROMPT },
    ...sessionState.conversationHistory,
    { role: "user", content: currentStepPrompt }
  ]
}
```

After every Mistral response, append both the user prompt and the assistant response 
to conversationHistory so the Overlord remembers the full session.

### Fallback Lines (API failure)

```js
const fallbacks = {
  step1: "Define the scope precisely or the directive is void. Vague intentions are how civilizations die.",
  step2: "Break it into 3 steps. No more. No less. Name them now or the timer does not start.",
  step3: "Good enough ships. Perfect does not. Define the minimum acceptable output from your steps.",
  step4: "Close every tab. Silence your phone. Name what you are closing. Do it now.",
  step5: "25 minutes. 3 steps. Good enough is the standard. Nothing else exists. DIRECTIVE ACCEPTED. TIMER INITIATED."
}
```

---

## Update TaskDefinitionScene.js

Wire up the 5-step flow as follows:

### Step Sequence

```
Scene loads
  → Overlord opening line (hardcoded):
    "State your directive, worker. Vague answers cost oxygen."
  → Player types task → submit → triggers step1 Mistral call
  → Overlord step1 response typewritten
  → Player types clarified task → submit → save as taskDescription → triggers step2 call
  → Overlord step2 response typewritten (commands 3 steps)
  → Player types their 3 steps → submit → save as steps → triggers step3 call
  → Overlord step3 response typewritten (sets done standard)
  → Save Overlord step3 response as doneStandard → triggers step4 call automatically
  → Overlord step4 response typewritten (distraction elimination order)
  → Player types what they are closing → submit → triggers step5 call
  → Overlord step5 response typewritten
  → After typewriter finishes → wait 1500ms → show [ INITIATE WORK SEQUENCE ] button
```

### On [ INITIATE WORK SEQUENCE ] Click

- Flash screen red once (50ms)
- Transition to BunkerScene passing:

```js
{ taskDescription, steps, doneStandard }
```

### Input Behavior

- Input disabled while Overlord is typing (typewriter active)
- Input re-enabled and focused after each Overlord line finishes
- Empty submit: typewrite "Silence is not a directive, worker." and re-prompt same step
- Max input length: 150 characters

---

## Update BunkerScene.js

- Accept taskDescription, steps, doneStandard from scene data
- Display taskDescription in the ACTIVE DIRECTIVE panel
- Display the 3 steps in a MISSION STEPS sub-panel below the directive
- On scene load trigger one Mistral call:

```js
`Task: "${taskDescription}". Steps: "${steps}". Timer started.
Worker is now executing. Issue a short watch-and-wait surveillance statement.
1-2 sentences. Cold. They are being monitored.`
```

- Show response in Overlord transmission panel via typewriter

---

## Critical Implementation Notes

- Pass full `conversationHistory` on every single Mistral call — the Overlord must 
  remember the full session or the coaching flow breaks
- Step 3 done standard is extracted from the Overlord's own response — save the full 
  Overlord text as doneStandard. The player does not type this one, it triggers automatically
- Step 4 player input is acknowledged but not saved to state — it is a ritual action 
  (naming distractions out loud), not data
- Do not start the 25 minute timer until [ INITIATE WORK SEQUENCE ] is clicked
- Keep sessionState scoped to the current session — reset on new game
