import { defineText } from "@/lib/i18n";
import { FEEDBACK_CLOSED_ERROR } from "@/lib/feedback";

// The student's feedback page (/dashboard/feedback): the form, the list of
// what they have sent, and the messages sending can come back with.
//
// The credit line ("Aisyah, Form 2", "Anonymous student") is what the public
// website and the admin's export print, so it stays as stored in both
// languages - only the words around it are translated here. The questions
// themselves are the admin's, worded in both languages on each question.

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

    optional: "(optional)",
    starsLabel: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
    yes: "Yes",
    no: "No",
    quoteNotice:
      "Mr Tan may share messages on his website, which anyone can read. Choose below how you'd like to be named. Changed your mind? Press \"Don't quote this\" next to the message on this page.",
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
    notReady: "The feedback form isn't ready yet. Please check back later.",
    answerRequired: (question: string) => `Please answer “${question}”.`,
    answerTooLong: (question: string, n: number) => `Keep your answer to “${question}” under ${n} characters.`,
    chooseOne: (question: string) => `Choose one of the options for “${question}”.`,
    minMessage: (n: number) => `Write at least ${n} characters in your message.`,
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

    optional: "（可选）",
    starsLabel: (n: number) => `${n} 星`,
    yes: "是",
    no: "否",
    quoteNotice: "老师可能会把留言分享在他的网站上，网站是公开的，任何人都看得到。请在下面选择要怎么署名。改变主意了？在这个页面按留言旁边的“不要引用”就可以。",
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
    notReady: "意见反馈还没准备好，请稍后再来看看。",
    answerRequired: (question: string) => `请回答“${question}”。`,
    answerTooLong: (question: string, n: number) => `“${question}”的回答请不要超过 ${n} 个字。`,
    chooseOne: (question: string) => `请为“${question}”选择一个选项。`,
    minMessage: (n: number) => `留言请至少写 ${n} 个字。`,
    nameTooLong: "这个名字太长了。",
    chooseStars: "请选择 1 到 5 星。",
    yesOrNo: "请回答是或否。",
    chooseCredit: "请选择要怎么署名。",
    typeShortName: "请输入要显示的名字。",
    dailyLimit: (n: number) => `你在过去 24 小时内已经发送了 ${n} 条留言，谢谢你！下一条请明天再发送。`,
    sent: "已发送，谢谢你！每一条留言老师都会看。",
  },
});
