import { defineText } from "@/lib/i18n";
import { FEEDBACK_CLOSED_ERROR, KIND_LABELS, type FeedbackKind } from "@/lib/feedback";

// The student's feedback page (/dashboard/feedback): the form, the list of
// what they have sent, and the messages sending can come back with.
//
// The credit line ("Aisyah, Form 2", "Anonymous student") is what the public
// website and the admin's export print, so it stays as stored in both
// languages - only the words around it are translated here. The English kind
// labels come from KIND_LABELS, which the (English) admin page uses too.

export const feedbackText = defineText({
  en: {
    title: "Feedback",
    intro: "Got an idea, a suggestion, or something to say about the classes or this portal? Tell Mr Tan here.",
    closed: FEEDBACK_CLOSED_ERROR,
    sentHeading: "What you've sent",
    nothingYet: "Nothing yet.",
    readByTeacher: "Read by Mr Tan",
    wouldRecommend: "Would recommend Mr Tan",
    wouldNotRecommend: "Would not recommend Mr Tan",
    mayBeQuoted: (credit: string) => `May be quoted on the website as “${credit}”`,
    notForWebsite: "Not for the website",

    kindLabels: KIND_LABELS,
    kindHints: {
      IDEA: "Something new you'd like to see",
      SUGGESTION: "Something we could do better",
      FEEDBACK: "How the classes or portal are going for you",
    } as Record<FeedbackKind, string>,
    whatIsIt: "What is it?",
    yourMessage: "Your message",
    optional: "(optional)",
    rate: "Rate Mr Tan",
    starsLabel: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
    recommendQuestion: "Will you recommend Mr Tan to your friends?",
    yes: "Yes",
    no: "No",
    mayQuote: "You may quote this on the Mr Tan website",
    mayQuoteHelp:
      "Anyone can read the website. Leave this off to keep your message between you and Mr Tan. Not sure? Ask a parent first. You can change your mind later on this page.",
    howName: "How should we name you?",
    fullName: "My full name",
    nameIGoBy: (withGrade: boolean) => `The name I go by${withGrade ? " and my grade" : ""}`,
    nameToShow: "The name to show",
    dontName: "Don't name me",
    shownAs: "It would be shown as:",
    send: "Send",
    sending: "Sending…",
    limitReached: "You've sent the most for today. Thank you! Come back tomorrow.",
    canSendMore: (n: number) => `You can send ${n} more today.`,
    stopConfirm: "Stop Mr Tan quoting this message? You can't turn it back on for this one.",
    saving: "Saving…",
    dontQuote: "Don't quote this",

    // Sending: the action and sendFeedback's checks.
    needLogin: "You need to be logged in to send feedback.",
    studentsOnly: "Feedback is for students only.",
    chooseKind: "Choose idea, suggestion or feedback.",
    minMessage: (n: number) => `Write at least ${n} characters.`,
    maxMessage: (n: number) => `Keep it under ${n} characters.`,
    nameTooLong: "That name is too long.",
    chooseStars: "Choose 1 to 5 stars.",
    yesOrNo: "Answer yes or no.",
    chooseCredit: "Choose how you'd like to be named.",
    typeShortName: "Type the name you'd like shown.",
    dailyLimit: (n: number) =>
      `You've sent ${n} messages in the last 24 hours. Thank you! Please send the next one tomorrow.`,
    sent: "Sent - thank you! Mr Tan reads every message.",
  },
  zh: {
    title: "意见反馈",
    intro: "对课堂或这个平台有什么想法或建议？有什么话想告诉老师的，欢迎在这里留下！",
    closed: "意见反馈暂时关闭，请稍后再来看看。",
    sentHeading: "你发送过的",
    nothingYet: "还没有。",
    readByTeacher: "老师已读",
    wouldRecommend: "会推荐 Mr Tan",
    wouldNotRecommend: "不会推荐 Mr Tan",
    mayBeQuoted: (credit: string) => `可在网站上引用，署名为“${credit}”`,
    notForWebsite: "不公开到网站",

    kindLabels: { IDEA: "想法", SUGGESTION: "建议", FEEDBACK: "反馈" },
    kindHints: {
      IDEA: "希望看到的新东西",
      SUGGESTION: "我们可以做得更好的地方",
      FEEDBACK: "你觉得课堂或平台怎么样",
    },
    whatIsIt: "是哪一种？",
    yourMessage: "你的留言",
    optional: "（可选）",
    rate: "给老师评分",
    starsLabel: (n: number) => `${n} 星`,
    recommendQuestion: "你会把 Mr Tan 推荐给朋友吗？",
    yes: "会",
    no: "不会",
    mayQuote: "可以把这段话引用在 Mr Tan 网站上",
    mayQuoteHelp:
      "网站是公开的，任何人都看得到。不勾选的话，你的留言只有你和老师知道。不确定？先问问爸妈。之后也可以在这个页面改变主意。",
    howName: "要怎么署名？",
    fullName: "我的全名",
    nameIGoBy: (withGrade: boolean) => (withGrade ? "我常用的名字和年级" : "我常用的名字"),
    nameToShow: "要显示的名字",
    dontName: "不要署名",
    shownAs: "会显示为：",
    send: "发送",
    sending: "正在发送…",
    limitReached: "今天已经发送到上限了，谢谢你！明天再来吧。",
    canSendMore: (n: number) => `今天还可以发送 ${n} 条。`,
    stopConfirm: "确定不让老师引用这条留言吗？这条留言之后不能再开启引用。",
    saving: "正在保存…",
    dontQuote: "不要引用",

    needLogin: "请先登录，再发送意见反馈。",
    studentsOnly: "意见反馈只限学生使用。",
    chooseKind: "请选择想法、建议或反馈。",
    minMessage: (n: number) => `请至少写 ${n} 个字。`,
    maxMessage: (n: number) => `请不要超过 ${n} 个字。`,
    nameTooLong: "这个名字太长了。",
    chooseStars: "请选择 1 到 5 星。",
    yesOrNo: "请回答会或不会。",
    chooseCredit: "请选择要怎么署名。",
    typeShortName: "请输入要显示的名字。",
    dailyLimit: (n: number) => `你在过去 24 小时内已经发送了 ${n} 条留言，谢谢你！下一条请明天再发送。`,
    sent: "已发送，谢谢你！每一条留言老师都会看。",
  },
});
