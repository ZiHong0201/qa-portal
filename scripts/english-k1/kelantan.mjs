// SPM English Kertas 1 (Reading and Use of English) - Kelantan Trial 2026.
//
// Transcribed by eye from the scanned paper; the PDFs carry no text layer.
// Answers are the official MPSM Kelantan scheme, which agrees with the paper
// throughout - no keyNote entries here.
//
// Part 1 is single-column with a bordered text stimulus above each question
// (an email, an SMS, a dialogue, a notice), so nothing is cropped: the box is
// transcribed and reflows on a phone.

const PART2_P1 = `Night Market vs Shopping Mall: A Personal Experience

Having visited both night markets and shopping malls on (0) numerous occasions, I have come to appreciate the distinct experiences that each offers, as they differ not only in atmosphere but also in how engaged I feel. Although both serve as popular shopping (9) ______ , my experiences in each setting have shaped my preferences in different ways.`;

const PART2_P2 = `Night Market vs Shopping Mall: A Personal Experience

Whenever I find myself in a shopping mall, what (10) ______ most is the level of comfort and convenience it provides, particularly due to its air-conditioned environment, which allows me to (11) ______ for extended periods without feeling physically drained, even during hot or rainy weather. Moreover, with facilities such as cinemas, restaurants, and entertainment centres all located within the same space, it becomes possible to combine shopping with leisure activities, making each visit both (12) ______ and enjoyable.`;

const PART2_P3 = `Night Market vs Shopping Mall: A Personal Experience

In contrast, my experiences at night markets tend to be far more dynamic and immersive, largely because of the (13) ______ atmosphere created by the crowded passages, lively stalls, and the constant buzz of activity. As I move through the market, I am often drawn to the variety of street food and handmade (14) ______ , which not only reflect local culture but also make each visit feel distinct. What further enhances the experience is the opportunity to interact directly with sellers and engage in (15) ______ , which, although sometimes challenging, brings a sense of success and personal satisfaction when a good deal is secured.`;

const PART2_P4 = `Night Market vs Shopping Mall: A Personal Experience

Despite these appealing aspects, I have also encountered certain (16) ______ at night markets, such as unpredictable weather conditions and limited parking spaces, which can occasionally reduce the enjoyment of the (17) ______ experience. Nevertheless, it is precisely this lively and authentic environment that continues to draw me in. All in all, while I tend to choose shopping malls when I (18) ______ comfort and efficiency, I am more inclined to visit night markets when I desire a richer, more engaging experience that goes beyond mere shopping.`;

const PART3_ARTICLE = `On Thursday, September 16, 2021, just weeks into the school year, two groups of boys brawled across the courtyard at Southwood High School in Shreveport, Louisiana. The following day, two groups of girls picked up where the boys had left off. In a mere two days, 23 students were in police custody. One student was charged for allegedly hitting an assistant principal. Another was charged with threatening a resource officer and a staff member.

When a school administrator told her former classmate Craig Lee, a business owner and community activist, that gang tensions were rising, Lee wanted to do something. He contacted Michael La'Fitte, a fellow activist, who had an 11th-grade daughter at Southwood. That Sunday, the two held an emergency meeting with parents and the principal. By the end of the four-hour session, a group of the fathers in attendance had decided it was time to make their presence known on campus.

"We're dads," La'Fitte told CBS News. "The best people to take care of our kids are who? Us." That was how Dads on Duty was born. Its goal: Make sure the kids are safe. Around 40 men organized into six-person shifts, with two shifts on campus every day. They started the day after the meeting. These dads are business owners, truck drivers, chefs, and financial advisers who sacrifice their own schedules and commitments. Some are fathers of kids at the school, while others are uncles, grandfathers, brothers, and men like Lee, who doesn't have a child at Southwood but wants the youth in his community to know they have an entire village behind them.

Now, anyone who wants to enter the school with rage and a closed fist will have to dodge boisterous papa bears, big smiles, positive affirmations, and a plethora of dad jokes. It is hard to be a tough guy when somebody's uncle has just tricked you into checking your shoelaces for the umpteenth time, only to find that they are not, in fact, untied.   [line 21]

Since Dads on Duty arrived on campus, fights have drastically declined, and gang battles have stopped completely. "The school has been happy, you can feel it," said one student. Another told the Washington Post, "They interact with all the kids like we're their own children." But it is not just corny jokes and bubbly good mornings that have healed Southwood. It is the Positive Presence Promotion, developed by Dads on Duty to make sure every student feels as if someone is invested in their success. That means taking an interest in home lives, engaging in dialogue about entrepreneurship and alternatives to gang culture, sponsoring essay contests, and ultimately, making sure every kid has an adult they trust to turn to in times of crisis.

The dads are not meant to replace security guards or disciplinarians. If they do see a fight, they get security or an assistant principal on the scene in no time. Their presence is meant to be more preventive than reactionary. For instance, one day after school, Dad on Duty Mike Morgan noticed that a student had been bullied by his friends and Morgan immediately steered him clear of the area, leaving them stunned. It was likely to avoid an assault. It was a situation requiring more delicacy and a personal investment than law enforcement or security might have offered.

The Shreveport dads have already partnered with fathers in other parts of the country, who have followed their example. Groups in Henderson, Nevada; Little Rock, Arkansas; and Jackson, Mississippi, have formed versions of Dads on Duty. As La'Fitte told People, the more the merrier. "We'd like this to be the same as the Parent-Teacher Association (PTA) - something that is in every school in every state."

Adapted from Readers' Digest`;

const PART4_ARTICLE = `Puteri Saadong - the Kelantan Princess

Puteri Saadong was a powerful queen who ruled Kelantan in the late 1600s. She was the adopted daughter of the famous Queen Siti Wan Kembang, also known as Che Siti, a legendary ruler of Kelantan. (27) ______ She became the ruler of Jembal in 1663, taking over from her father.

Later, in 1667, she was officially made the Raja, or queen, of Kelantan. When Puteri Saadong was only 15 years old, Che Siti arranged for her to marry her cousin, Raja Abdullah. (28) ______

A difficult time came when Puteri Saadong was captured by the Siamese, who are people from Siam. She was forced to stay with King Narai of Siam. (29) ______ Raja Abdullah promised he would wait for her and never marry anyone else.

After several years, Puteri Saadong successfully managed to heal King Narai from a mysterious illness. (30) ______ When she finally returned to Bukit Marak, she found that Raja Abdullah had broken his promise. (31) ______ His new wife had apparently been jealous of Puteri Saadong's marriage to Raja Abdullah before.

A very serious argument between Puteri Saadong and Raja Abullah happened when she discovered this. (32) ______ After this sad incident, Puteri Saadong left Bukit Marak and was never seen again.`;

const PART4_OPTIONS = [
  "A  This happened to save her husband, Raja Abdullah, from harm.",
  "B  Puteri Saadong was raised in a place called Bukit Marak by Che Siti, after her own mother passed away",
  "C  The King had promised her freedom if she could cure him.",
  "D  Upon her return, Puteri Saadong found that everything had changed.",
  "E  As she matured, she became admired not only for her physical beauty but also for her wisdom and calm personality.",
  "F  He was the Raja of Kelantan-Selatan, which was also known as Jembal.",
  "G  It is believed that in her great anger, a tragic event occurred involving Raja Abdullah.",
  "H  She learned that he had remarried.",
];

const PART5_TEXTS = `Stress Management

A - Hafiz
For me, stress usually comes from a lot of unfinished tasks piling up. To stay calm, I use a 'time-blocking' method. By breaking my massive projects into tiny, bite-sized goals, the workload feels much less difficult. It's all about taking control of your schedule. When you have a clear objective for the day, you significantly reduce that worried feeling of being constantly behind.

B - Helen
I used to get overwhelmed easily, but now I prefer being mindful to keep calm. Whenever I feel a panic attack coming, I stop and focus on my breathing for five minutes. It sounds simple, but it's a powerful way to reduce instant anxiety. Instead of worrying about future exams, I try to concentrate on the current state. This mental shift helps me maintain my calmness even during the busiest weeks.

C - Danny
I'm a firm believer that sitting at a desk all day is a recipe for a breakdown. Exercise such as an easy run or gym session with friends serves as my antidote to stress. Physical activity acts as a 'reset' for my brain. After physical activity, I feel mentally sharper and emotionally happier. It's the most effective way to restore my energy after a long day of classes.

D - Malik
When school life gets too loud, I retreat into my sketchbook. I find that my creative outlets distract me from the burden of my schoolwork. Whether I'm drawing or playing the guitar, I enter a 'flow state' where time just disappears. This creative focus helps to neutralize any negative thoughts and gives me a sense of accomplishment that isn't tied to my grades.

E - Anita
I think the worst thing you can do is suffer in silence. I always reach out to my friends when I'm feeling the heat. Usually, just having a short chat or laugh at jokes is enough to reduce the pressure. We often realize we're all in the same boat, which makes the struggle feel less personal. Receiving the sense of compassion is honestly the greatest therapy.

F - Haziq
People often underestimate the power of a good night's sleep. When you're sleep-deprived, even small problems seem too difficult to solve. I go to bed early especially when exam is approaching. Giving your brain time to rest is not 'wasting time'; it's a way to bolster your mental resilience. A well-rested mind is much harder to stress out!`;

const PART5_MATCH = ["A - Hafiz", "B - Helen", "C - Danny", "D - Malik", "E - Anita", "F - Haziq"];

const PART5_SUMMARY = `Stress Management Tips

Managing academic life effectively requires more than just hard work; it requires a smart strategy. Students should first establish a consistent (37) ______ to ensure that every subject receives adequate attention throughout the week. When the workload becomes heavy, engaging in a physical or creative hobby serves as a (38) ______ antidote to clear a cluttered mind. To help ease the mental pressure that often comes from high expectations, it is also important to experience others' (39) ______ . Ultimately, these habits help to build long-term (40) ______ that allows you to stay mentally strong even during the most challenging exam seasons.`;

const KELANTAN = {
  state: "Kelantan",
  pdf: "C:/Users/User/Downloads/ENGLISH-Trial SPM 2026-20260917T154200Z-1-001/ENGLISH-Trial SPM 2026/KELANTAN/SOALAN TRIAL BI K1 KELANTAN 2026 ES.pdf",
  title: "English K1 — Kelantan (Trial SPM 2026)",
  description:
    "Bahasa Inggeris Kertas 1 (1119/1): Reading. MPSM Kelantan Trial, Tingkatan 5, 2026. Five parts, 40 marks.",
  questions: [
    {
      n: 1,
      part: 1,
      context: `From: Feng@email.com\nTo: Fina@email.com\nSubject: Graduation Dress\n\nHi Fina!\n\nI was wondering if I could borrow one of your formal dresses for our school graduation? They're not cheap, and I'd rather not buy something for one-time use. I'll take great care of it and give it back right after! Let me know early if you can't, so I can ask around. Thanks!`,
      body: "From the email, we know that Feng",
      choices: [
        "has a backup plan for the dress.",
        "returns the dress in a clean condition.",
        "believes formal dresses are used once.",
      ],
      answer: "A",
    },
    {
      n: 2,
      part: 1,
      context: `Priya — 29-May 08:17\n\nAileen,\n\nMy brain is officially a mess after that physics exam. My memory storage is full and I can't take in any more information! I feel like I need a complete timeout. Want to grab some food and meet later? My energy levels are at 1% and I'm definitely not doing well right now. Let me know if you're free to recharge!`,
      body: "Priya is sending this message to",
      choices: [
        "explain that she has fallen physically ill.",
        "complain about her poor exam results.",
        "ask for a break after intense studying.",
      ],
      answer: "C",
    },
    {
      n: 3,
      part: 1,
      context: `April 27th\n\nI witnessed something extraordinary today. While wandering through the old market, I saw a street artist creating a bright mural. It wasn't just a painting, as it seemed to catch the true feeling of the city. I was completely fascinated by his technique. Honestly, it was a powerful reminder that beauty often hides in the most unexpected spots.`,
      body: "What is the main message of the writer's diary entry?",
      choices: [
        "Describing the daily life of the old market.",
        "Seeing the artist work on the painting.",
        "Finding beauty in surprising places.",
      ],
      answer: "C",
    },
    {
      n: 4,
      part: 1,
      context: `Noel:  Look! This premium hoodie is heavily discounted at fifty percent off.\nRudi:  That's an exceptional bargain! Do you intend to purchase it?\nNoel:  Absolutely. Plus, there's a promotion on these beanies. If I buy one, the second one is free.\nRudi:  Wait! Look at these sunglasses. They're on a flash sale!\nNoel:  Perfect. I just love these lucrative offers.`,
      body: "According to the dialogue, what is true about the items?",
      choices: [
        "The free gift is given when customers buy a beanie.",
        "The hoodie is being sold as part of a clearance event.",
        "The price for the sunglasses is reduced for a limited time.",
      ],
      answer: "C",
    },
    {
      n: 5,
      part: 1,
      context: `ROBOTICS CLUB\nImportant Notice\n\nPlease be informed that this Wednesday's Robotics Club meeting will no longer be held in the Science Lab. Because the lab is being upgraded, we will meet in Computer Room 1 instead. The session still starts at 2:45 pm. We will be testing the new sensors for the upcoming competition, so don't be late.`,
      body: "Which detail about the meeting is confirmed by the notice?",
      choices: [
        "It will carry out a practice for the competition.",
        "It will take place after the room upgrade.",
        "It will be held in a different location.",
      ],
      answer: "C",
    },
    {
      n: 6,
      part: 1,
      context: `To: aj.workprofile@email.com\nSubject: Application for Retail Sales Assistant\n\nDear Hiring Manager,\n\nI am writing to express my interest in the advertised position. As a student, I have gained effective communication and strong organisational skills. I am enthusiastic to contribute to your team and gain professional experience. I believe my proactive approach makes me a suitable candidate.\n\nThank you for your time and consideration.\n\nYours faithfully,\nHasnah Hasan`,
      body: "Which statement best describes Hasnah's attitude toward work?",
      choices: [
        "She seeks a role in management.",
        "She aims to support her colleagues.",
        "She prioritises her personal development.",
      ],
      answer: "B",
    },
    {
      n: 7,
      part: 1,
      context: `Kenny:  Hey, did you hear about the health check-up in town? I'm not sure if it's actually happening.\nRavi:   It's real! I've checked. I was a bit nervous to join, but they give good advice on food and exercise.\nKenny:  True. It's better to stay healthy now. Do you want to sign up together?\nRavi:   That sounds like a plan!`,
      body: "The phone conversation is mostly about",
      choices: [
        "confirming the location of the event.",
        "registering for a programme.",
        "getting health tips.",
      ],
      answer: "B",
    },
    {
      n: 8,
      part: 1,
      context: `Marinus-Malaysia\n\nJoin us in nurturing ocean-aware youth through Voice for the Waves: a nationwide pictorial-essay competition inspiring students to care for the seas that provide for us all. It is a marine-themed competition inspiring young changemakers to tell bold visual stories about our oceans. Let your creativity speak for the sea and inspire real action.`,
      body: "What is the main purpose of the announcement?",
      choices: [
        "To encourage students to participate in a marine project.",
        "To provide instructions on how to enter the competition.",
        "To explain the importance of protecting the oceans.",
      ],
      answer: "A",
    },

    // ---- Part 2: cloze, night market vs shopping mall --------------------
    { n: 9, part: 2, context: PART2_P1, body: "Choose the best word for gap (9).", choices: ["places", "venues", "destinations", "locations"], answer: "C" },
    { n: 10, part: 2, context: PART2_P2, body: "Choose the best word for gap (10).", choices: ["stands of", "stands in", "stands on", "stands out"], answer: "D" },
    { n: 11, part: 2, context: PART2_P2, body: "Choose the best word for gap (11).", choices: ["deal", "shop", "trade", "purchase"], answer: "B" },
    { n: 12, part: 2, context: PART2_P2, body: "Choose the best word for gap (12).", choices: ["economical", "practical", "functional", "logical"], answer: "B" },
    { n: 13, part: 2, context: PART2_P3, body: "Choose the best word for gap (13).", choices: ["vibrant", "vivid", "chaotic", "colourful"], answer: "A" },
    { n: 14, part: 2, context: PART2_P3, body: "Choose the best word for gap (14).", choices: ["objects", "gifts", "goods", "materials"], answer: "C" },
    { n: 15, part: 2, context: PART2_P3, body: "Choose the best word for gap (15).", choices: ["debating", "haggling", "negotiating", "trading"], answer: "B" },
    { n: 16, part: 2, context: PART2_P4, body: "Choose the best word for gap (16).", choices: ["barriers", "constraints", "inconveniences", "obstacles"], answer: "C" },
    { n: 17, part: 2, context: PART2_P4, body: "Choose the best word for gap (17).", choices: ["familiar", "similar", "overall", "total"], answer: "C" },
    { n: 18, part: 2, context: PART2_P4, body: "Choose the best word for gap (18).", choices: ["ensure", "offer", "seek", "provide"], answer: "C" },

    // ---- Part 3: comprehension, Dads on Duty ----------------------------
    {
      n: 19,
      part: 3,
      context: PART3_ARTICLE,
      body: "In paragraph 1, what specific event triggered the formation of Dads on Duty?",
      choices: [
        "Groups of boys clashed with groups of girls at the school courtyard.",
        "A few students were charged for assaulting a staff member.",
        "23 students were arrested for two days of chaotic fighting.",
        "Two boys intimidated the school staff.",
      ],
      answer: "C",
    },
    {
      n: 20,
      part: 3,
      context: PART3_ARTICLE,
      body: "What was the role played by Craig Lee and Michael La'Fitte?",
      choices: [
        "Asking the parents to always be present on campus",
        "Calling the school administrators to solve the problem",
        "Contacting parents and the principal for a special session",
        "Participating actively in community activities in Southwood",
      ],
      answer: "C",
    },
    {
      n: 21,
      part: 3,
      context: PART3_ARTICLE,
      body: "From paragraph 3, all the statements are correct about Dads on Duty, except the",
      choices: [
        "objective is to offer protection to the kids.",
        "members are divided into six-person shifts daily.",
        "duty must start the following day after the meeting.",
        "group members must have a child attending the school.",
      ],
      answer: "D",
    },
    {
      n: 22,
      part: 3,
      context: PART3_ARTICLE,
      body: 'The word "rage" in line 21 means',
      choices: ["madness.", "passion.", "desire.", "anger."],
      answer: "D",
    },
    {
      n: 23,
      part: 3,
      context: PART3_ARTICLE,
      body: "What change has been noted since the arrival of Dads on Duty?",
      choices: [
        "More interaction between students",
        "Reduced number of fights seen in school",
        "Increased interest in their dads' home lives",
        "Less dependency on adults among students",
      ],
      answer: "B",
    },
    {
      n: 24,
      part: 3,
      context: PART3_ARTICLE,
      body: "How did the group respond if they witnessed an actual physical fight?",
      choices: [
        "They submitted a report to the school administrators.",
        "They confronted whoever involved in the fight.",
        "They enforced the physical punishment.",
        "They immediately called the authorities.",
      ],
      answer: "D",
    },
    {
      n: 25,
      part: 3,
      context: PART3_ARTICLE,
      body: "In paragraph 6, why did Mike Morgan steer the student away from the bullies?",
      choices: [
        "He wanted to see how the bullies would react.",
        "He tried to use a softer approach to defuse the situation.",
        "He tried to prevent the bully and the students from brawling.",
        "He wanted to take disciplinary measures against the bullies afterwards.",
      ],
      answer: "B",
    },
    {
      n: 26,
      part: 3,
      context: PART3_ARTICLE,
      body: "Which headline most accurately summarizes the core message of the story?",
      choices: [
        "The Fall of Gang Culture among students at Southwood High School",
        "Transforming School Safety Through Presence and Guidance",
        "How Dad Jokes and Pranks Can End High School Fighting",
        "The Role of Law Enforcement in Louisiana Schools",
      ],
      answer: "B",
    },

    // ---- Part 4: gapped text, Puteri Saadong ----------------------------
    ...[27, 28, 29, 30, 31, 32].map((n, i) => ({
      n,
      part: 4,
      context: PART4_ARTICLE,
      body: `Which sentence fits gap (${n})? Two of the eight sentences are not needed anywhere.`,
      choices: PART4_OPTIONS,
      answer: ["B", "F", "A", "C", "H", "G"][i],
    })),

    // ---- Part 5a: match the statement to the person ---------------------
    {
      n: 33,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Enjoy an artistic break to help refresh the mind.",
      choices: PART5_MATCH,
      answer: "D",
    },
    {
      n: 34,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Focus on the present to keep composure.",
      choices: PART5_MATCH,
      answer: "B",
    },
    {
      n: 35,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Prioritise organisational skills when completing tasks.",
      choices: PART5_MATCH,
      answer: "A",
    },
    {
      n: 36,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Communicate with someone trusted during tough times.",
      choices: PART5_MATCH,
      answer: "E",
    },

    // ---- Part 5b: one word from the texts (written answers) -------------
    ...[37, 38, 39, 40].map((n, i) => ({
      n,
      part: 5,
      type: "FREE",
      context: `${PART5_TEXTS}\n\n${PART5_SUMMARY}\n\nUsing words from the texts, complete the summary. Choose no more than ONE word for each blank.`,
      body: `Write the word that belongs in gap (${n}).`,
      answer: ["schedule", "powerful", "compassion", "resilience"][i],
    })),
  ],
};

export default KELANTAN;
