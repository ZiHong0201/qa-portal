import { defineText } from "@/lib/i18n";

// The frame around every student page: the nav bar and its phone drawer, the
// notices under it, and the signed-out landing page.
export const shellText = defineText({
  en: {
    brand: "Mr Tan",
    brandSub: "Exercise Portal",
    portalName: "Mr Tan Exercise Portal",
    home: "Home",
    mySets: "My Sets",
    simulations: "Simulations",
    giftExchange: "Gift Exchange",
    scoreboard: "Scoreboard",
    feedback: "Feedback",
    myCat: "My Cat",
    myProfile: "My profile",
    points: "points",
    pts: "pts",
    logOut: "Log out",
    loggingOut: "Logging out…",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    devDisclaimer: "This site is still under development, all data will be cleared on 1 January 2027",
    resetToday: (date: string) => `Marks and points are being reset today (${date}).`,
    resetSoon: (date: string, days: number) =>
      `Heads up: all marks, points and streaks reset on ${date} - ${days} day${days === 1 ? "" : "s"} away. Spend your points before then.`,
    landingTagline: "Answer questions, earn marks, and watch your progress climb.",
    logIn: "Log in",
    // What every student action says to a suspended account; SUSPENDED_ERROR
    // in lib/suspension.ts is the English of this.
    suspended: "Your account is suspended. Please contact admin if you think this is a mistake.",
  },
  zh: {
    brand: "Mr Tan",
    brandSub: "练习平台",
    portalName: "Mr Tan 练习平台",
    home: "首页",
    mySets: "我的练习",
    simulations: "模拟实验",
    giftExchange: "礼品兑换",
    scoreboard: "排行榜",
    feedback: "意见反馈",
    myCat: "我的猫咪",
    myProfile: "我的资料",
    points: "积分",
    pts: "积分",
    logOut: "登出",
    loggingOut: "正在登出…",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    devDisclaimer: "本网站仍在开发中，所有资料将于 2027 年 1 月 1 日清除",
    resetToday: (date: string) => `今天（${date}）将重置所有分数和积分。`,
    resetSoon: (date: string, days: number) =>
      `提醒：所有分数、积分和连续签到将于 ${date} 重置，还有 ${days} 天。请在那之前用掉你的积分。`,
    landingTagline: "答题、赚分，看着自己一步步进步。",
    logIn: "登录",
    suspended: "你的账号已停用。如果你觉得有误，请联系管理员。",
  },
});
