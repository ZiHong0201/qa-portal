import { defineText } from "@/lib/i18n";

// The student home page and what sits around it on every dashboard page: the
// check-in card, the suspended notice, the cat's study tips, the pop-up ad
// chrome and the "add to my phone" offers. The install offers are shared with
// the admin pages, which pin the language to English.
export const homeText = defineText({
  en: {
    // Home page
    fallbackName: "there",
    welcome: (name: string) => `Welcome, ${name}!`,
    welcomeBack: (name: string) => `Welcome back, ${name}!`,
    notSetUp:
      "Your grade and subjects haven't been set yet. Ask your teacher to set them and your journey will show up here.",
    pickUp: (title: string, left: number) =>
      `Pick up ${title} where you left off — ${left} card${left === 1 ? "" : "s"} to go.`,
    nextReady: "Your next set is ready when you are.",
    allDone: "You've finished every set available. Nicely done!",
    continueJourney: "Continue journey →",
    startJourney: "Start your journey →",
    allSets: "All sets",
    marksEarned: "Marks earned",
    setsFinished: "Sets finished",
    scoreboard: "Scoreboard",
    checkInStreak: "Check-in streak",
    days: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
    choosePath: "Choose your path",
    choosePathHelp: "Hover a subject to wake it up, then tap to see its sets.",
    setCount: (n: number) => `${n} set${n === 1 ? "" : "s"}`,
    noQuestions: "No questions yet",
    subjectProgress: (answered: number, questions: number, done: number) =>
      `${answered} / ${questions} answered · ${done} set${done === 1 ? "" : "s"} done`,
    scoreboardBlurb: "See where you stand in the top 10",
    giftExchange: "Gift Exchange",
    giftExchangeBlurb: "Spend your marks on gifts",
    feedbackBanner: "Anything you'd like to tell your teacher? Share your thoughts!",

    // Check-in card
    dailyCheckIn: "Daily check-in",
    streakInARow: (n: number) => `${n} day${n === 1 ? "" : "s"} in a row`,
    startStreak: "Start your streak today",
    dayOfWeek: (n: number) => `Day ${n} of this week`,
    claimedBefore: "Checked in — ",
    bonusMarks: (n: number) => `+${n} bonus marks`,
    claimedAfter: (weekly: boolean, bonus: number) =>
      ` added${weekly ? `, including the +${bonus} weekly bonus` : ""}. Come back tomorrow to keep the streak.`,
    offerBefore: "Check in for ",
    offerFullWeek: (bonus: number) => ` — a full week, so the +${bonus} weekly bonus is included!`,
    offerToGo: (days: number, bonus: number) =>
      ` · ${days} more day${days === 1 ? "" : "s"} for a +${bonus} weekly bonus`,
    doneToday: "Done today",
    checkingIn: "Checking in…",
    checkInButton: (n: number) => `Check in +${n}`,
    checkInRules: (max: number, bonus: number, every: number) =>
      `Daily marks grow with your streak, up to ${max} a day, plus +${bonus} every ${every}th day. Bonus marks are spendable in the gift exchange — the scoreboard still ranks marks you earn from questions.`,

    // Check-in action
    checkInLoggedOut: "You need to be logged in to check in.",
    checkInStudentsOnly: "Check-ins are for students only.",
    alreadyCheckedIn: "You've already checked in today. Come back tomorrow!",

    // Suspended notice. The second line under each part is in BM, as before.
    suspendedTitle: "Your account has been suspended",
    suspendedTitleSub: "Akaun anda telah digantung",
    suspendedReason: "Reason / Sebab",
    suspendedSince: (date: string) => `Since ${date}`,
    suspendedContact: "Please contact admin if you think this is a mistake.",
    suspendedContactSub: "Sila hubungi admin jika anda rasa ini satu kesilapan.",
    logOut: "Log out",
    loggingOut: "Logging out…",

    // Pop-up ads (the ad itself is staff-made and stays as typed)
    announcement: "Announcement",
    close: "Close",

    // Cat companion
    hintForQuestion: "Hint for this question",
    studyTip: "Study tip",
    otherHint: "Other hint →",
    anotherTip: "Another tip →",
    hideStudyBuddy: "Hide study buddy",
    getStudyTip: "Get a study tip",
    tips: [
      "Read the question twice before choosing an answer!",
      "Eliminate the options you're sure are wrong first — it's easier from there.",
      "Stuck on one? Skip it and come back later with fresh eyes.",
      "Diagrams often hold the key — look closely before answering!",
      "Watch for words like \"NOT\" or \"EXCEPT\" — they flip the whole question.",
      "Double-check units — they're a classic trap in Physics questions.",
      "A confident guess beats a blank answer. You've got this!",
      "Take a deep breath. One question at a time.",
      "After finishing a set, review what you got wrong — that's where the real learning happens.",
      "Break big topics into small chunks instead of cramming it all at once.",
      "If two options look almost identical, the difference between them is usually the trick.",
      "Say the question out loud in your head — it helps catch details you might skim past.",
      "You don't have to be fast. Being careful matters more.",
      "Come back to flashcards you got wrong tomorrow — repetition is how it sticks.",
      "Proud of you for practicing. Keep going!",
    ],

    // Install offers
    iosTitle: "Add to your iPhone",
    iosSub: "Three taps in Safari",
    iosStep1Before: "Tap",
    iosStep1After: "at the bottom of Safari",
    iosStep2Before: "Scroll down and choose ",
    iosStep2Bold: "Add to Home Screen",
    iosStep3Before: "Tap ",
    iosStep3Bold: "Add",
    iosStep3After: " — done",
    iosSafariOnly: "This only works in Safari. If you're in Chrome, open the site in Safari first.",
    gotIt: "Got it",
    addToPhone: "Add to my phone",
    bannerTitle: "Add the portal to your phone",
    bannerOneTap: "One tap, and it gets its own icon like any other app.",
    bannerIos: "Takes three taps in Safari — we'll show you.",
    install: "Install",
    showMe: "Show me",
    dismiss: "Dismiss",
  },
  zh: {
    // Home page
    fallbackName: "同学",
    welcome: (name: string) => `欢迎，${name}！`,
    welcomeBack: (name: string) => `欢迎回来，${name}！`,
    notSetUp: "老师还没为你设定年级和科目。请老师设定好后，你的学习进度就会出现在这里。",
    pickUp: (title: string, left: number) => `接着完成「${title}」吧，还剩 ${left} 张题卡。`,
    nextReady: "下一份练习已经准备好，随时可以开始。",
    allDone: "所有练习都完成了，真棒！",
    continueJourney: "继续练习 →",
    startJourney: "开始练习 →",
    allSets: "全部练习",
    marksEarned: "获得分数",
    setsFinished: "完成练习",
    scoreboard: "排行榜",
    checkInStreak: "连续签到",
    days: (n: number) => `${n} 天`,
    choosePath: "选择科目",
    choosePathHelp: "把鼠标移到科目上唤醒它，再点击查看里面的练习。",
    setCount: (n: number) => `${n} 份练习`,
    noQuestions: "还没有题目",
    subjectProgress: (answered: number, questions: number, done: number) =>
      `已作答 ${answered} / ${questions} · 完成 ${done} 份练习`,
    scoreboardBlurb: "看看你有没有进前 10 名",
    giftExchange: "礼品兑换",
    giftExchangeBlurb: "用积分换礼品",
    feedbackBanner: "有什么话想告诉老师的吗？ 欢迎留下你的看法!",

    // Check-in card
    dailyCheckIn: "每日签到",
    streakInARow: (n: number) => `已连续签到 ${n} 天`,
    startStreak: "今天就开始连续签到吧",
    dayOfWeek: (n: number) => `本周第 ${n} 天`,
    claimedBefore: "签到成功，获得 ",
    bonusMarks: (n: number) => `+${n} 奖励分`,
    claimedAfter: (weekly: boolean, bonus: number) =>
      `${weekly ? `（含每周 +${bonus} 奖励）` : ""}。明天记得再来，保持连续签到！`,
    offerBefore: "签到可获得 ",
    offerFullWeek: (bonus: number) => `，满一周了，含每周 +${bonus} 奖励！`,
    offerToGo: (days: number, bonus: number) => ` · 再签 ${days} 天可得每周 +${bonus} 奖励`,
    doneToday: "今日已签到",
    checkingIn: "正在签到…",
    checkInButton: (n: number) => `签到 +${n}`,
    checkInRules: (max: number, bonus: number, every: number) =>
      `连续签到越久，每日奖励分越多，每天最多 ${max} 分；每满 ${every} 天再加 ${bonus} 分。奖励分可在礼品兑换中使用，排行榜仍只按答题所得的分数排名。`,

    // Check-in action
    checkInLoggedOut: "请先登录再签到。",
    checkInStudentsOnly: "签到只限学生。",
    alreadyCheckedIn: "你今天已经签到了，明天再来吧！",

    // Suspended notice. The second line is English, for a parent reading along.
    suspendedTitle: "你的账户已停用",
    suspendedTitleSub: "Your account has been suspended",
    suspendedReason: "原因 / Reason",
    suspendedSince: (date: string) => `自 ${date} 起`,
    suspendedContact: "如果你觉得这是误会，请联系管理员。",
    suspendedContactSub: "Please contact admin if you think this is a mistake.",
    logOut: "登出",
    loggingOut: "正在登出…",

    // Pop-up ads (the ad itself is staff-made and stays as typed)
    announcement: "公告",
    close: "关闭",

    // Cat companion
    hintForQuestion: "本题提示",
    studyTip: "学习小贴士",
    otherHint: "换个提示 →",
    anotherTip: "再来一个 →",
    hideStudyBuddy: "收起学习伙伴",
    getStudyTip: "看一条学习小贴士",
    tips: [
      "选答案之前，先把题目读两遍！",
      "先排除你确定错误的选项，剩下的就容易多了。",
      "卡住了？先跳过，等一下再回来看。",
      "图表往往藏着关键，作答前仔细看看！",
      "留意 NOT、EXCEPT（BUKAN、KECUALI）这类字，它们会让整道题的意思反过来。",
      "记得检查单位，这是物理题的经典陷阱。",
      "有把握的猜测总比留空好。你可以的！",
      "深呼吸，一题一题来。",
      "做完一份练习后，回顾做错的题目，那才是真正学到东西的时候。",
      "把大课题拆成小部分来读，不要一次过硬塞。",
      "如果两个选项看起来几乎一样，它们的差别通常就是陷阱所在。",
      "在心里把题目念一遍，能帮你发现容易看漏的细节。",
      "不用急，细心比快更重要。",
      "答错的题卡，明天再复习一次，重复才记得牢。",
      "为你坚持练习感到骄傲，继续加油！",
    ],

    // Install offers
    iosTitle: "添加到你的 iPhone",
    iosSub: "在 Safari 里点三下就好",
    iosStep1Before: "点击 Safari 底部的",
    iosStep1After: "按钮",
    iosStep2Before: "往下滑，选择",
    iosStep2Bold: "添加到主屏幕",
    iosStep3Before: "点击",
    iosStep3Bold: "添加",
    iosStep3After: "，完成！",
    iosSafariOnly: "只能在 Safari 里操作。如果你正在用 Chrome，请先用 Safari 打开本网站。",
    gotIt: "知道了",
    addToPhone: "添加到手机",
    bannerTitle: "把练习平台添加到手机",
    bannerOneTap: "点一下，它就会像其他 App 一样有自己的图标。",
    bannerIos: "在 Safari 里点三下就好，我们教你。",
    install: "安装",
    showMe: "教我",
    dismiss: "关闭",
  },
});
