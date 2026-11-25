// Everything the study pet says. English only, for every student whatever
// language they read the rest of the portal in - the pet is written for
// secondary students, so its voice is a little dry rather than babyish.

import type { Element, Mood, Stage } from "@/lib/study-pet";

export const petText = {
  title: "My Pet",
  alt: "Your pet",

  elements: {
    earth: { name: "Earth", blurb: "Steady and stubborn. Grows moss when you're not looking." },
    water: { name: "Water", blurb: "Calm, curious, always slightly damp." },
    fire: { name: "Fire", blurb: "Warm, loud, impossible to ignore." },
    electricity: { name: "Electricity", blurb: "Fast, fizzy, never sits still." },
    gravity: { name: "Gravity", blurb: "Quiet. Small things orbit it anyway." },
  } satisfies Record<Element, { name: string; blurb: string }>,

  stages: {
    egg: "Egg",
    hatchling: "Hatchling",
    young: "Young",
    adult: "Adult",
    final: "Final form",
  } satisfies Record<Stage, string>,

  // Picking an egg.
  pickTitle: "Pick your egg",
  pickIntro:
    "Your pet grows every time you get a question right. Choose its element - this is for keeps.",
  pickConfirm: (element: string) => `Choose the ${element} egg`,
  pickWarning: "You can't change this later.",
  picking: "Choosing…",
  pickPrompt: "Pick an egg to start",

  // The egg, before hatching.
  eggTitle: (element: string) => `Your ${element} egg`,
  eggToHatch: (n: number) =>
    `${n} more correct answer${n === 1 ? "" : "s"} and something will happen.`,
  eggReady: "It's moving. Give it a name and it will hatch.",
  eggHow: "Get questions right in your sets to warm it up.",
  name: "Name",
  namePlaceholder: "Pebble",
  hatch: "Hatch",
  hatching: "Hatching…",

  // The pet screen.
  rare: "Rare",
  growth: "Growth",
  growthOf: (growth: number, target: number) => `${growth} / ${target}`,
  toNext: (n: number, stage: string) => `${n} more to ${stage.toLowerCase()}`,
  maxed: "Fully grown. It isn't going anywhere.",
  todayGoal: "Today",
  todayOf: (n: number, goal: number) => `${Math.min(n, goal)} / ${goal} correct`,
  goalDone: "Fed for today",
  streak: "Streak",
  streakDays: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
  capReached: "That's all the growing it can do today - the rest still earns you marks.",
  howItWorks: "Each correct answer is 1 growth, up to 30 a day. Getting 5 right in a day feeds it.",
  practise: "Practise a set",

  moods: {
    happy: (name: string) => `${name} is very pleased with you today.`,
    content: (name: string) => `${name} is watching you work. Keep going.`,
    waiting: (name: string) => `${name} is waiting. Not impatiently. Mostly.`,
    asleep: (name: string) => `${name} fell asleep. One correct answer should wake it up.`,
    back: (name: string) => `Oh. You're back. ${name} wasn't waiting or anything.`,
  } satisfies Record<Mood, (name: string) => string>,

  // What the actions send back.
  mustBeStudent: "You must be signed in as a student.",
  badElement: "Pick one of the eggs.",
  alreadyPicked: "You've already picked your egg.",
  pickFirst: "Pick an egg first.",
  notReady: "It isn't ready to hatch yet.",
  alreadyHatched: "It has already hatched.",
  nameRequired: "Give it a name.",
  nameTooLong: (max: number) => `Keep the name to ${max} characters or fewer.`,
  hatched: (name: string) => `${name} hatched!`,
};
