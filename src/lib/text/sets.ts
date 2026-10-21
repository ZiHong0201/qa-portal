import { defineText } from "@/lib/i18n";
import { LANGUAGE_LABELS, type QuestionLanguage } from "@/lib/bilingual";

// Working through question sets: the set list, a set's flashcard deck and its
// answer form, the end-of-set celebration, and what submitting an answer says
// back. Question content, set titles and subject names are never translated.

/** Seconds as "1m 20s", or "45s" under a minute. */
function humanTimeEn(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

/** Seconds as "1分20秒", or "45秒" under a minute. */
function humanTimeZh(seconds: number) {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${m}分钟` : `${m}分${rem}秒`;
}

export const setsText = defineText({
  en: {
    // Set list
    backHome: "Home",
    questionSets: "Question sets",
    notSetUp:
      "Your grade and subjects haven't been set yet. Ask your teacher to set them before you can see your question sets.",
    all: "All",
    joinSubjects: (names: string[]) => names.join(", "),
    setSummary: (questions: number, marks: number) =>
      `${questions} question${questions === 1 ? "" : "s"} · ${marks} marks total`,
    marksOf: (got: number, total: number) => `${got} / ${total} marks`,
    answeredOf: (answered: number, total: number) => `${answered} / ${total} answered`,
    noSets: (grade: string, subjects: string) =>
      `No question sets yet for ${grade} ${subjects}. Check back soon.`,

    // One set
    allSubjectSets: (subject: string) => `All ${subject} sets`,
    relatedSimulation: "Related simulation",
    noQuestions: "No questions in this set yet.",

    // Flashcard deck
    resultMessages: {
      PENDING: () => "Your answer has been submitted and is awaiting teacher review.",
      CORRECT: (marks: number) => `Correct! You earned ${marks} marks.`,
      INCORRECT: () => "That wasn't correct. No marks were awarded.",
      APPROVED: (marks: number) => `Approved! You earned ${marks} marks.`,
      REJECTED: () => "Your answer wasn't approved. No marks were awarded.",
    },
    humanTime: humanTimeEn,
    timingSummary: (total: string, average: string) =>
      `How long you took · ${total} in total, ${average} on average`,
    slowest: (n: number, time: string) =>
      `Your slowest was question ${n} at ${time}. Taking longer is not a bad thing - it usually means you were working it through.`,
    questionShort: (n: number) => `Q${n}`,
    questionLanguage: "Question language",
    questionLanguageLabels: LANGUAGE_LABELS as Record<QuestionLanguage, string>,
    setCompleted: (got: number, total: number) =>
      `You've completed this set. Marks obtained: ${got} / ${total}`,
    cardOf: (n: number, total: number, marks: number) => `Card ${n} of ${total} · ${marks} marks`,
    diagramAlt: "Diagram for this question",
    correctAnswer: "Correct answer:",
    takeYourTime: "Take your time reading this — press Next when you're ready.",
    previous: "Previous",
    next: "Next",
    answerFirst: "Answer this question before moving on",

    // Answer form
    typeYourAnswer: "Type your answer",
    writtenHelp:
      "Type your answer in your own words - pasting is turned off. Your teacher marks this one, so it will not be graded straight away.",
    submitting: "Submitting...",
    submitAnswer: "Submit answer",

    // Set complete overlay
    setComplete: "Set complete",
    setCompleteTitle: "Set complete!",
    close: "Close",
    marksPct: (pct: number) => `marks · ${pct}%`,
    nice: "Nice!",
    // Grading bands, so the message matches how the student actually did
    // instead of cheering identically for 10% and 100%.
    praise: (pct: number): string => {
      if (pct === 100) return "Perfect score! Every single one correct.";
      if (pct >= 80) return "Brilliant work — that's a strong result.";
      if (pct >= 50) return "Nice going! Review the ones you missed and you'll climb higher.";
      return "Set finished! Go over the answers you missed — that's where the marks are.";
    },

    // What submitting an answer can say back
    mustLogIn: "You must be logged in.",
    questionUnavailable: "This question is not available.",
    selectAnswer: "Select an answer.",
    invalidChoice: "Invalid choice.",
    alreadyAnswered: "You have already answered this question.",
    enterAnswer: "Enter an answer.",
  },
  zh: {
    // Set list
    backHome: "首页",
    questionSets: "练习",
    notSetUp: "你的年级和科目还没有设定。请先让老师帮你设定，才能看到你的练习。",
    all: "全部",
    joinSubjects: (names: string[]) => names.join("、"),
    setSummary: (questions: number, marks: number) => `${questions} 题 · 共 ${marks} 分`,
    marksOf: (got: number, total: number) => `${got} / ${total} 分`,
    answeredOf: (answered: number, total: number) => `已答 ${answered} / ${total}`,
    noSets: (grade: string, subjects: string) =>
      `${grade} ${subjects} 暂时还没有练习，请迟些再来看看。`,

    // One set
    allSubjectSets: (subject: string) => `所有 ${subject} 练习`,
    relatedSimulation: "相关模拟实验",
    noQuestions: "这份练习还没有题目。",

    // Flashcard deck
    resultMessages: {
      PENDING: () => "你的答案已提交，等待老师批改。",
      CORRECT: (marks: number) => `答对了！你得了 ${marks} 分。`,
      INCORRECT: () => "答错了，这题没有得分。",
      APPROVED: (marks: number) => `已通过！你得了 ${marks} 分。`,
      REJECTED: () => "你的答案未通过，这题没有得分。",
    },
    humanTime: humanTimeZh,
    timingSummary: (total: string, average: string) =>
      `作答用时 · 共 ${total}，平均每题 ${average}`,
    slowest: (n: number, time: string) =>
      `用时最长的是第 ${n} 题（${time}）。慢一点不是坏事，通常代表你在认真思考。`,
    questionShort: (n: number) => `Q${n}`,
    questionLanguage: "题目语言",
    questionLanguageLabels: { ms: "BM", en: "BI", both: "双语" },
    setCompleted: (got: number, total: number) => `你已完成这份练习。得分：${got} / ${total}`,
    cardOf: (n: number, total: number, marks: number) => `题卡 ${n} / ${total} · ${marks} 分`,
    diagramAlt: "本题附图",
    correctAnswer: "正确答案：",
    takeYourTime: "慢慢看清楚，准备好了再按「下一题」。",
    previous: "上一题",
    next: "下一题",
    answerFirst: "先回答这一题才能继续",

    // Answer form
    typeYourAnswer: "输入你的答案",
    writtenHelp: "请用自己的话作答，不能粘贴。这题由老师批改，所以不会马上有分数。",
    submitting: "正在提交…",
    submitAnswer: "提交答案",

    // Set complete overlay
    setComplete: "练习完成",
    setCompleteTitle: "练习完成！",
    close: "关闭",
    marksPct: (pct: number) => `分 · ${pct}%`,
    nice: "太棒了！",
    praise: (pct: number): string => {
      if (pct === 100) return "满分！每一题都答对了。";
      if (pct >= 80) return "非常棒，这是很好的成绩！";
      if (pct >= 50) return "做得不错！复习一下答错的题目，下次会更高分。";
      return "练习完成！把答错的题目再看一遍，分数就藏在那里。";
    },

    // What submitting an answer can say back
    mustLogIn: "请先登录。",
    questionUnavailable: "这道题目目前无法作答。",
    selectAnswer: "请选择一个答案。",
    invalidChoice: "选项无效。",
    alreadyAnswered: "你已经回答过这一题了。",
    enterAnswer: "请输入答案。",
  },
});
