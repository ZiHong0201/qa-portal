// SPM English Kertas 1 (Reading and Use of English) - Kedah Trial 2026.
//
// Transcribed by eye from the scanned paper: the PDFs carry no text layer, so
// nothing here was extracted mechanically and every line is a reading of the
// page. Answers come from the official SKEMA, except where noted in `keyNote`.
//
// Structure of the paper, which is the same in all fifteen states:
//   Part 1  Q1-8    one picture stimulus each, options A-C
//   Part 2  Q9-18   cloze over one passage, options A-D
//   Part 3  Q19-26  comprehension of one long story, options A-D
//   Part 4  Q27-32  gapped text, six gaps, options A-H with two spare
//   Part 5  Q33-36  match a statement to a person A-F
//           Q37-40  complete notes with ONE word from the passage (written)
//
// Parts 2-5 each hang on a shared passage. The portal shows one question at a
// time, so the passage travels with every question that needs it. Part 3, 4
// and 5 carry the whole text because the questions range over all of it; Part
// 2 carries the paragraph holding its own gap, which is what a reader needs to
// choose a word and is far kinder on a phone than 300 words repeated ten times.

const PART3_STORY = `It is the year 2035, and seventeen-year-old Farid is riding his electric motorcycle home from school. As he arrives at his family's wooden house in Baling, Kedah, the front door unlocks automatically as soon as he rides through the gate. The ceiling fans in his living room also switch on independently through motion sensor. How is this possible? That's because Farid and his family live in a rural smart home supported by an intelligent system called "RumAI". The system helps Farid's family control electricity, water, and fuel use in a careful and organised way.

In the near future, smart homes will not only be found in big cities such as Kuala Lumpur or Penang. In many rural areas across Malaysia, families are also living in smart homes. However, these homes are designed differently. They are connected to electricity and clean water supply, but they focus on reducing energy use, saving water, and lowering carbon emissions. The aim is to build a home that is modern, safe, and environmentally friendly.

Farid's house was built with natural cooling in mind. Large windows allow fresh air to flow through the rooms. The roof reflects heat, and the walls are made from materials that keep the indoor temperature stable. Because of this design, the family rarely uses air-conditioning. The system checks both indoor and outdoor conditions before making changes. This reduces electricity use and keeps the home comfortable.

Another feature of RumAI is it can manage the house lighting. During the day, curtains open to let in sunlight. At night, low-energy LED lights are used. If a room is empty for more than ten minutes, the lights switch off automatically. Solar panels on the roof provide extra energy during sunny days. Although the house is connected to the national grid, it depends partly on renewable energy to reduce its carbon footprint.

Water management is another important feature. Rainwater from the roof is collected and stored in tanks. This water is used for gardening and cleaning outdoor areas. RumAI monitors daily water usage. If consumption increases suddenly, the system sends a reminder to the family's phones. This helps them develop responsible habits without feeling stressed.

The smart system also manages appliances in order to make life more convenient and accessible for the family. For example, the washing machine operates automatically when it detects a full load of laundry, especially during off-peak hours when electricity consumption costs less. It is also able to identify when Farid's father's electric car requires recharging. During sunny days, RumAI charges the car using mainly solar energy, and will switch to on-the-grid charging on days with weak sunlight. When travelling, the system also suggests the best time to leave to avoid traffic and tracks the position of the car when GPS location tracking is turned on.

One evening, the true value of the smart home became clear. Farid's grandmother, who is seventy-eight years old, was resting in her room. She wore a small health monitor connected to RumAI. The device tracked her heart rate and movement. Suddenly, the system detected an irregular heartbeat and noticed that she had not moved for several minutes.

Within seconds, RumAI sent an urgent alert to Farid's parents' phones. The lights in her room switched on automatically, and a calm voice message asked if she needed help. When there was no response, the system contacted the nearest clinic and shared her health data. Farid's father rushed to her room and found her weak but conscious. Thanks to the early warning, medical help arrived quickly. The doctor later explained that the quick response prevented a serious heart attack.

After that night, the family felt even more grateful for their smart home. The system did not only save energy and reduce waste. It also protected the people inside it.

As a result of innovation and careful development, rural smart homes in Malaysia prove that technology can support both sustainability and safety. Families can enjoy comfort while maintaining a low carbon lifestyle. For Farid and his family, their home is more than a building. It is a safe, modern, and convenient place to call home.`;

const PART4_ARTICLE = `WHY RETAIL THERAPY FEELS SO POWERFUL

Shopping has long been associated with pleasure, comfort and even stress relief. In fact, a global study conducted by Deloitte found that nearly 80% of adults across 23 countries admitted to making a purchase simply to lift their mood within the past month. (27) ___ This finding highlights just how widespread emotional spending has become in today's consumer culture.

The term "retail therapy" describes the act of shopping to improve one's emotional state rather than to meet practical needs. (28) ___ Consumer researchers say that spending behaviour is not just about acquiring items. Instead, it is often influenced by hidden emotional triggers that shape how individuals respond to stress, boredom or uncertainty. (29) ___

Interestingly, the study showed that retail therapy occurs across all income groups. The most frequently chosen splurge category was food and beverages, ahead of fashion and beauty products. (30) ___ Enjoying a special meal or drink can create moments of comfort and connection, particularly after periods of social isolation. Such experiences may help ease feelings of disconnection and loneliness.

The research also challenged assumptions about gender differences in spending behaviour. (31) ___ In fact, when they chose to splurge, men tended to spend significantly more. Some experts explain that this may be because men have fewer socially accepted ways to openly express certain emotions, so shopping becomes a way to meet emotional needs without talking about them.

When asked why consumers make mood-boosting purchases, many mentioned stress relief, self-reward and temporary escape from daily pressures. Although experts caution against excessive debt, taking a small break and treating yourself in moderation can serve psychological functions. (32) ___ Ultimately, retail therapy may not replace professional support but it demonstrates how closely consumption is linked to emotional well-being in modern life.`;

const PART4_OPTIONS = [
  "A  As a result, purchasing becomes a coping strategy rather than a simple transaction.",
  "B  Some analysts believe this reflects differences in how emotions are socially expressed.",
  "C  Many acknowledged that the item was not essential and, in some cases, beyond their budget.",
  "D  This suggests that shopping choices can reflect deeper psychological needs.",
  "E  Therefore, financial discipline is unnecessary when shopping improves mood.",
  "F  Unlike material possessions, food-related purchases are often tied to shared experiences.",
  "G  For many individuals, the act of buying provides a sense of regained control.",
  "H  While retail therapy is often associated with women, men reported similar patterns of indulgence.",
];

const PART5_VIEWS = `The Use of Technology and Artificial Intelligence (AI) in Schools

A - Maria, 16
I think technology and AI help students learn faster. Sometimes teachers explain things in a difficult way, but AI tools can provide simpler and even step-by-step explanations. This helps students revise lessons and learn at their own pace.

B - Janne, 15
Technology helps schools, but I worry about relying too much on AI. Students might stop thinking and solving problems because they let AI give them answers. This can make them lazy and lose important skills.

C - Aisyah, 17
In my opinion, AI should be used as a learning assistant rather than a replacement for teachers. AI can help students search for information quickly and understand difficult topics, but teachers still play an important role in guiding students. Teachers can ensure that students use AI responsibly and do not misuse it for cheating or copying answers.

D - Leo, 19
I enjoy using technology in class because it makes lessons more engaging and interactive. Instead of just reading from textbooks, we can watch educational videos, use learning apps, and even explore simulations that help us understand real-life situations better. AI tools can also personalise learning by suggesting activities based on our strengths and weaknesses.

E - Emma, 16
While technology and AI can improve learning, not all students have equal access to devices or stable internet connections at home. This creates a gap between those who can benefit fully from digital tools and those who cannot. If schools rely too heavily on AI, students from less privileged backgrounds may feel left behind or disadvantaged.

F - Daniel, 18
I believe AI will play a major role in our future, especially in the workplace. That is why schools should not only allow the use of AI but also teach students how to use it responsibly and effectively. Students need to understand both the advantages and the risks, such as over-reliance or misuse.`;

const PART5_NOTES = `AI in Schools

People have different opinions about using technology and AI in schools. Some think AI can explain lessons more clearly and help students learn at their own (37) ______ , making studying easier and faster. Others worry that (38) ______ heavily on AI may stop students from thinking for themselves and solving problems independently. Teachers are in charge of (39) ______ students in applying AI in their learning to make sure AI is not being misused. Learning to use AI responsibly now can also prepare students for (40) ______ employment. However, there are concerns about unequal access to devices and the internet, creating a gap in the nation. Therefore, while AI offers many advantages in education, it must be used wisely and fairly to ensure all students benefit equally.`;

const PART5_MATCH = ["A - Maria, 16", "B - Janne, 15", "C - Aisyah, 17", "D - Leo, 19", "E - Emma, 16", "F - Daniel, 18"];

const KEDAH = {
  state: "Kedah",
  pdf: "C:/Users/User/Downloads/ENGLISH-Trial SPM 2026-20260917T154200Z-1-001/ENGLISH-Trial SPM 2026/KEDAH/SOALAN TRIAL BI K1 KEDAH 2026 ES.pdf",
  title: "English K1 — Kedah (Trial SPM 2026)",
  description:
    "Bahasa Inggeris Kertas 1: Reading and Use of English. Modul Peningkatan Prestasi Murid Tingkatan 5, Kedah 2026. Five parts, 40 marks, 1 hour 30 minutes in the real paper.",
  // Page numbers in the source PDF holding the Part 1 stimuli, in order. The
  // first band on page 2 is the "Questions 1 to 8" rubric, not a stimulus.
  stimulusPages: [2, 3, 4, 5],
  stimulusSkip: ["p02-1"],
  questions: [
    {
      n: 1,
      part: 1,
      body: "Based on the advertisement, customers can get a discount if they buy the Sonix headphones …",
      choices: [
        "before the sale ends on 15 June 2026.",
        "from www.sonixaudio.com by 15 June 2026.",
        "through the company's social media before 15 June 2026.",
      ],
      answer: "B",
    },
    {
      n: 2,
      part: 1,
      body: "The phrase 'kill two birds with one stone' means",
      choices: [
        "city waste can be used to grow food.",
        "a junkyard can be transformed into a garden.",
        "environmental solutions are achieved together with social support.",
      ],
      answer: "C",
    },
    {
      n: 3,
      part: 1,
      body: "The purpose of the call is to…",
      choices: [
        "remind Mr Tan that the order will be delivered that day.",
        "confirm Mr Tan's order of the vanilla cake and a bouquet of red roses.",
        "inform Mr Tan that the timing for his order collection is at 4.30 pm that day.",
      ],
      answer: "C",
    },
    {
      n: 4,
      part: 1,
      body: "What is Adam's main concern about the message?",
      choices: [
        "It contains wrong information about the group.",
        "It was shared with people it was not meant for.",
        "It can be seen by many people at the same time.",
      ],
      answer: "B",
    },
    {
      n: 5,
      part: 1,
      body: "What can we infer from the text?",
      choices: [
        "Parents need to monitor every detail of their teenagers' spending.",
        "Teenagers should manage their money by allocating it carefully.",
        "Regular saving can help teenagers become disciplined and accountable.",
      ],
      answer: "C",
    },
    {
      n: 6,
      part: 1,
      body: "Which statement is true based on the Merdeka Day Poster?",
      choices: [
        "People participate in parades and ceremonies.",
        "People join the cultural performances on that day.",
        "People put on national colours to show patriotism.",
      ],
      answer: "C",
    },
    {
      n: 7,
      part: 1,
      body: 'Which is the correct order in the "Light Refraction Magic" experiment?',
      choices: [
        "Draw the arrows while you are looking through the glass, and fill the glass before using it.",
        "Fill the glass after you look through it, and place the paper before you draw the arrows.",
        "Draw arrows before filling the glass, then look through the glass after placing the paper.",
      ],
      answer: "C",
      keyNote:
        "The SKEMA gives D, but this question is printed with three options (A-C) only. The poster's steps run: draw the arrows, fill the glass, place the paper behind it, look through - which is option C.",
    },
    {
      n: 8,
      part: 1,
      body: "The passage suggests that...",
      choices: [
        "family plays an important role in teaching values and promoting unity.",
        "family members are responsible for guiding and interacting with children.",
        "family gatherings are important for sharing stories and values.",
      ],
      answer: "A",
    },

    // ---- Part 2: cloze, "The Teen Survival Guide" -------------------------
    {
      n: 9,
      part: 2,
      context: `The Teen Survival Guide\n\nAdolescence is a period of significant physiological and emotional change, and many teenagers (0) experience a wide variety of challenges during these formative years. From the intense pressure of upcoming academic exams to (9) ______ with friends, mental well-being is often put to the test. Experts suggest that maintaining a balanced perspective is key to navigating these social hurdles successfully.`,
      body: "Choose the best word for gap (9).",
      choices: ["strikes", "battles", "disputes", "arguments"],
      answer: "D",
    },
    {
      n: 10,
      part: 2,
      context: `The Teen Survival Guide\n\nIn the digital age, constant (10) ______ to computer screens can also lead to eye strain and poor posture, which negatively impacts overall health. To (11) ______ these issues, specialists recommend balancing a busy social life with adequate rest. It is also vital to maintain a nutritious diet to (12) ______ energy levels and prevent skin problems such as spots, which can affect a teenager's self-esteem.`,
      body: "Choose the best word for gap (10).",
      choices: ["interaction", "exposure", "viewing", "contact"],
      answer: "B",
    },
    {
      n: 11,
      part: 2,
      context: `The Teen Survival Guide\n\nIn the digital age, constant (10) ______ to computer screens can also lead to eye strain and poor posture, which negatively impacts overall health. To (11) ______ these issues, specialists recommend balancing a busy social life with adequate rest. It is also vital to maintain a nutritious diet to (12) ______ energy levels and prevent skin problems such as spots, which can affect a teenager's self-esteem.`,
      body: "Choose the best word for gap (11).",
      choices: ["erase", "avoid", "remove", "address"],
      answer: "D",
    },
    {
      n: 12,
      part: 2,
      context: `The Teen Survival Guide\n\nIn the digital age, constant (10) ______ to computer screens can also lead to eye strain and poor posture, which negatively impacts overall health. To (11) ______ these issues, specialists recommend balancing a busy social life with adequate rest. It is also vital to maintain a nutritious diet to (12) ______ energy levels and prevent skin problems such as spots, which can affect a teenager's self-esteem.`,
      body: "Choose the best word for gap (12).",
      choices: ["expand", "boost", "grow", "add"],
      answer: "B",
    },
    {
      n: 13,
      part: 2,
      context: `The Teen Survival Guide\n\nPhysical health is equally important, especially when (13) ______ on an outdoor excursion or a long-distance holiday. Being prepared for minor (14) ______ or sudden illnesses is a necessity for any young traveler. Many teens unfortunately forget to (15) ______ basic first-aid kit containing essential items like antiseptic cream, bandages, and painkillers, which are often overlooked until they are needed.`,
      body: "Choose the best word for gap (13).",
      choices: ["going", "taking", "getting", "boarding"],
      answer: "A",
    },
    {
      n: 14,
      part: 2,
      context: `The Teen Survival Guide\n\nPhysical health is equally important, especially when (13) ______ on an outdoor excursion or a long-distance holiday. Being prepared for minor (14) ______ or sudden illnesses is a necessity for any young traveler. Many teens unfortunately forget to (15) ______ basic first-aid kit containing essential items like antiseptic cream, bandages, and painkillers, which are often overlooked until they are needed.`,
      body: "Choose the best word for gap (14).",
      choices: ["symptoms", "damages", "problems", "injuries"],
      answer: "D",
    },
    {
      n: 15,
      part: 2,
      context: `The Teen Survival Guide\n\nPhysical health is equally important, especially when (13) ______ on an outdoor excursion or a long-distance holiday. Being prepared for minor (14) ______ or sudden illnesses is a necessity for any young traveler. Many teens unfortunately forget to (15) ______ basic first-aid kit containing essential items like antiseptic cream, bandages, and painkillers, which are often overlooked until they are needed.`,
      body: "Choose the best word for gap (15).",
      choices: ["fill", "load", "pack", "collect"],
      answer: "C",
    },
    {
      n: 16,
      part: 2,
      context: `The Teen Survival Guide\n\nThese supplies are (16) ______ for dealing with minor mishaps, such as a painful blister from walking or sudden physical discomfort that could otherwise ruin a trip. Furthermore, protecting oneself from the harsh outdoor environment is a must. Using sun cream and insect repellent can effectively (17) ______ sunburn and itchy mosquito bites, which are common complaints during the summer months.`,
      body: "Choose the best word for gap (16).",
      choices: ["beneficial", "essential", "sufficient", "efficient"],
      answer: "B",
    },
    {
      n: 17,
      part: 2,
      context: `The Teen Survival Guide\n\nThese supplies are (16) ______ for dealing with minor mishaps, such as a painful blister from walking or sudden physical discomfort that could otherwise ruin a trip. Furthermore, protecting oneself from the harsh outdoor environment is a must. Using sun cream and insect repellent can effectively (17) ______ sunburn and itchy mosquito bites, which are common complaints during the summer months.`,
      body: "Choose the best word for gap (17).",
      choices: ["prevent", "control", "avoid", "block"],
      answer: "A",
    },
    {
      n: 18,
      part: 2,
      context: `The Teen Survival Guide\n\nBy taking these small (18) ______ , teenagers can improve their overall physical condition and enjoy their newfound independence with greater confidence. This proactive approach ensures that the transition into adulthood is as smooth and healthy as possible. Ultimately, staying informed and prepared is the best way to thrive during these transformative years.`,
      body: "Choose the best word for gap (18).",
      choices: ["efforts", "choices", "routines", "precautions"],
      answer: "D",
    },

    // ---- Part 3: comprehension, Farid's smart home -----------------------
    {
      n: 19,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 1, what causes the ceiling fans to turn on automatically?",
      choices: [
        "Farid's movements triggered RumAI's motion sensor.",
        "Farid's electric motorcycle passed through the gate.",
        "Farid controlled the switches using RumAI.",
        "Farid's front door unlocked automatically.",
      ],
      answer: "A",
    },
    {
      n: 20,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 2, why are rural smart homes environmentally friendly?",
      choices: [
        "They are built to use less resources and have a smaller carbon footprint.",
        "They are created with less energy compared to homes in big cities.",
        "They are connected to an electric source and clean water supply.",
        "They are designed differently compared to other homes.",
      ],
      answer: "A",
    },
    {
      n: 21,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 3, why does Farid's family rarely use air conditioning?",
      choices: [
        "The system controls both the indoor and outdoor temperature.",
        "Electricity must be conserved to make the house comfortable.",
        "The house design helps to keep the temperature cool.",
        "There is a lot of fresh air circulation in the living room.",
      ],
      answer: "C",
    },
    {
      n: 22,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 4, how does RumAI manage the energy during the day?",
      choices: [
        "The lights in an empty room will be switched off automatically.",
        "The house is connected to the national grid for electricity.",
        "RumAI will switch to only using low energy LED lights.",
        "Extra energy will not be generated by the solar panels.",
      ],
      answer: "A",
    },
    {
      n: 23,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 5, what is the step taken by RumAI to help the family manage their water usage effectively?",
      choices: [
        "It collects rainwater from the roof for household use.",
        "It encourages the family to develop responsible habits.",
        "It notifies the family if there is a sudden rise of water usage.",
        "It monitors the water usage for gardening and cleaning outdoor areas.",
      ],
      answer: "C",
    },
    {
      n: 24,
      part: 3,
      context: PART3_STORY,
      body: "In paragraph 6, which actions show that RumAI makes life easier for its residents?",
      choices: [
        "It detects when the car battery is low and alerts the owner before it runs out.",
        "It runs the washing machine automatically during off-peak hours to save electricity costs.",
        "It informs the owner about traffic and always tracks the car's location.",
        "It detects sunlight levels during the day and adjusts the energy source for car charging.",
      ],
      answer: "D",
    },
    {
      n: 25,
      part: 3,
      context: PART3_STORY,
      body: "What aspect of the smart home has been the most helpful to Farid's family?",
      choices: ["Water management", "Energy conservation", "Health monitoring", "Temperature control"],
      answer: "C",
    },
    {
      n: 26,
      part: 3,
      context: PART3_STORY,
      body: "What is the main message that the writer wants to share about smart homes?",
      choices: [
        "Technology can help improve life and promote sustainability.",
        "All homes in Malaysia will be smart homes by the year 2035.",
        "We should maintain a low carbon footprint when designing homes.",
        "Everyone should switch to green technology to live a comfortable lifestyle.",
      ],
      answer: "A",
    },

    // ---- Part 4: gapped text ---------------------------------------------
    ...[27, 28, 29, 30, 31, 32].map((n, i) => ({
      n,
      part: 4,
      // The eight sentences are the answer options, so they are not repeated
      // here - the portal already lists them under the question.
      context: PART4_ARTICLE,
      body: `Which sentence fits gap (${n})? Two of the eight sentences are not needed anywhere.`,
      choices: PART4_OPTIONS,
      answer: ["C", "A", "D", "F", "H", "G"][i],
    })),

    // ---- Part 5a: match the statement to the person ----------------------
    {
      n: 33,
      part: 5,
      context: PART5_VIEWS,
      body: "Which person says: Overuse of AI may reduce students' problem-solving skills.",
      choices: PART5_MATCH,
      answer: "B",
    },
    {
      n: 34,
      part: 5,
      context: PART5_VIEWS,
      body: "Which person says: Digital tools make learning more engaging and personalised.",
      choices: PART5_MATCH,
      answer: "D",
    },
    {
      n: 35,
      part: 5,
      context: PART5_VIEWS,
      body: "Which person says: Unequal access to technology widens the learning gap among students.",
      choices: PART5_MATCH,
      answer: "E",
    },
    {
      n: 36,
      part: 5,
      context: PART5_VIEWS,
      body: "Which person says: Schools should teach responsible AI use as it is crucial in future careers.",
      choices: PART5_MATCH,
      answer: "F",
    },

    // ---- Part 5b: one word from the passage (written answers) ------------
    ...[37, 38, 39, 40].map((n, i) => ({
      n,
      part: 5,
      type: "FREE",
      context: `${PART5_NOTES}\n\nComplete the notes using information from the text. Choose no more than ONE word from the passage.`,
      body: `Write the word that belongs in gap (${n}).`,
      answer: ["pace", "relying", "guiding", "future"][i],
    })),
  ],
};

export default KEDAH;
