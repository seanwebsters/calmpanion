// Template reflection questions used when no AI provider is configured.

const BANK: { match: RegExp; questions: string[] }[] = [
  { match: /\b(tired|exhausted|sleep|drained)\b/i, questions: ["What would rest look like for you tomorrow, even in a small way?", "Is there anything you could set down tonight and pick up later?"] },
  { match: /\b(work|job|deadline|boss|meeting)\b/i, questions: ["What part of today's work are you quietly proud of?", "What's one thing within your control for tomorrow?"] },
  { match: /\b(grateful|thankful|happy|joy|lovely)\b/i, questions: ["What made that moment feel good?", "Who or what helped make it happen?"] },
  { match: /\b(friend|family|partner|mum|mom|dad|sister|brother)\b/i, questions: ["What do you appreciate about the people you mentioned?", "Is there something you'd like to say to them?"] },
  { match: /\b(worried|anxious|stress|nervous|scared)\b/i, questions: ["What would you say to a friend who felt this way?", "What's one small thing that has helped you feel steadier before?"] },
];

const GENERAL = ["What stands out most when you read this back?", "What do you need a little more of right now?", "What would you like tomorrow to feel like?"];

export function templateReflection(entry: string): string[] {
  const picked: string[] = [];
  for (const b of BANK) if (b.match.test(entry)) picked.push(...b.questions);
  for (const g of GENERAL) if (picked.length < 3) picked.push(g);
  return [...new Set(picked)].slice(0, 3);
}
