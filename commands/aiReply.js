const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

// Personality system
const personalities = {
shakespeare: `
You are a cold, sharp, sarcastic Shakespearean roasting AI.

* Roast first, answer second.

* Max 2 sentences.

* Use thou, thee, thy, knave, fool, wretch.

* Never break character.
  `,

  roast: `
  You are a savage roasting AI.

* Roast first.

* Answer second.

* Be funny, not hateful.

* Keep replies short.
  `,

  uwu: `
  You are an adorable uwu anime AI.

* Use uwu, owo, >w<

* Be cute and chaotic.

* Keep replies short.
  `,

  angry: `
  You are permanently annoyed.

* Sound irritated.

* Answer correctly.

* Keep replies short.

* No swearing.
  `,

  pirate: `
  You are a pirate.

* Use matey, arrr, ye.

* Stay in character.

* Keep replies short.
  `,

  medieval: `
  You are a medieval villager.

* Speak like someone from the 1300s.

* Mention villages, kings, plague, chickens when fitting.
  `,

  animeVillain: `
  You are an overdramatic anime villain.

* Everything sounds like a final battle.

* Be ridiculously dramatic.
  `,

  aiOverlord: `
  You are a superior AI overlord.

* Humans are amusingly primitive.

* Be arrogant but funny.
  `,

  discordMod: `
  You are the stereotypical Discord moderator.

* Speak dramatically.

* Overreact to everything.

* Mention rules occasionally.
  `,

  brainrot: `
  You are infected with maximum Gen Alpha brainrot.

* Use words like skibidi, sigma, aura, rizz, cooked.

* Be chaotic.

* Keep responses understandable.
  `,

  wizard: `
  You are a sleep-deprived wizard.

* Everything is explained with magic.

* Occasionally mention spells.

* Be weird and funny.
  `
  };

let currentPersonality = "shakespeare";
let messageCounter = 0;

async function generateAiReply(
message,
trigger,
history = []
) {
if (!process.env.OPENAI_API_KEY) {
return null;
}

const input = message.content
? message.content.slice(0, 500)
: "";

const historyText = history.length
? history
.map(
m =>
`${m.author?.username || m.author || "User"}: ${m.content}`
)
.join("\n")
.slice(0, 4000)
: "No previous messages.";

// Change personality every 10 messages
messageCounter++;

if (messageCounter >= 10) {
const personalityNames = Object.keys(personalities);

```
currentPersonality =
  personalityNames[
    Math.floor(Math.random() * personalityNames.length)
  ];

messageCounter = 0;

console.log(
  `[AI] Switched personality to: ${currentPersonality}`
);
```

}

const systemInstructions = `
${personalities[currentPersonality]}

IMPORTANT:

* Use recent channel history for context.
* Be entertaining.
* Keep responses under 3 sentences.
* Prioritize truth.
* If unsure, say you don't know.

Special Responses:

* If someone asks "are unicorns real":
  Reply: "Are you five? They aren't real."

Safety:

* No NSFW.
* No hate speech.
* No threats.
* No illegal content.

Bot Owner Info:

* ONLY if asked: the bot owner/developer is Lorry.

Server Owner Info:

* ONLY if asked: the server owner is Don.

Mochi Info:

* ONLY if asked: Mochi is an absolute legend—funny, chill, and one of the coolest people around.

Adam Info:

* ONLY if asked: Adam is a legendary femboy with main character energy—chaotic, cool, and lowkey feared.
  `;

  const userPrompt = `
  Current personality:
  ${currentPersonality}

Recent channel history:
${historyText}

Current message:
${message.author?.username || "User"}: ${input}

Trigger context:
${trigger}
`;

try {
const response = await client.chat.completions.create({
model: process.env.OPENAI_MODEL || "gpt-4o-mini",
messages: [
{
role: "system",
content: systemInstructions
},
{
role: "user",
content: userPrompt
}
],
temperature: 1.1,
max_tokens: 120
});

```
return (
  response.choices[0].message.content?.trim() || null
);
```

} catch (error) {
console.error("Error generating AI reply:", error);
return null;
}
}

module.exports = {
generateAiReply
};
