import { defineText } from "@/lib/i18n";

// The simulation library and the page a simulation plays on. Simulation
// titles, chapters and subject names are typed by staff and never translated.
export const simulationsText = defineText({
  en: {
    // Library
    backHome: "Home",
    simulations: "Simulations",
    intro:
      "Experiments you can run on screen. Change one thing at a time, watch what happens, and work out why.",
    notSetUp:
      "Your grade and subjects haven't been set yet. Ask your teacher to set them before you can see your simulations.",
    all: "All",
    joinSubjects: (names: string[]) => names.join(", "),
    otherTopics: "Other topics",
    simCount: (n: number) => `${n} simulation${n === 1 ? "" : "s"}`,
    noSims: (grade: string, subjects: string) =>
      `No simulations yet for ${grade} ${subjects}. Check back soon.`,
    topic: (code: string) => `Topic ${code}`,

    // One simulation
    allSubjectSims: (subject: string) => `All ${subject} simulations`,
    language: "Simulation language",
    english: "English",
    malay: "BM",
    fullScreen: "Full screen",
    openInNewTab: "Open in a new tab",
    phoneTip: "On a phone, turn it sideways or use full screen for a bigger view.",
    moreInChapter: (chapter: string) => `More in ${chapter}`,
    moreSims: "More simulations",
  },
  zh: {
    // Library
    backHome: "首页",
    simulations: "模拟实验",
    intro: "可以在屏幕上动手做的实验。一次只改变一样东西，看看会发生什么，再想想为什么。",
    notSetUp: "你的年级和科目还没有设定。请先让老师帮你设定，才能看到你的模拟实验。",
    all: "全部",
    joinSubjects: (names: string[]) => names.join("、"),
    otherTopics: "其他主题",
    simCount: (n: number) => `${n} 个模拟实验`,
    noSims: (grade: string, subjects: string) =>
      `${grade} ${subjects} 暂时还没有模拟实验，请迟些再来看看。`,
    topic: (code: string) => `学习标准 ${code}`,

    // One simulation
    allSubjectSims: (subject: string) => `所有 ${subject} 模拟实验`,
    language: "模拟实验语言",
    english: "English",
    malay: "BM",
    fullScreen: "全屏",
    openInNewTab: "在新分页打开",
    phoneTip: "用手机时，把手机横过来或使用全屏，画面会更大。",
    moreInChapter: (chapter: string) => `${chapter} 的其他模拟实验`,
    moreSims: "更多模拟实验",
  },
});
