// SPM English Kertas 1 (Reading and Use of English) - Melaka Trial 2026.
//
// Transcribed by eye from the scanned paper; the PDFs carry no text layer.
// Answers are the official PPC SPM 2026 scheme, which agrees with the paper
// throughout.
//
// The scheme adds a marking instruction for the written answers: "Spelling
// must be accurate. No variations allowed", and small or capital letters are
// both accepted. That is passed through to the marker on those questions.

const SPELLING_RULE =
  "The scheme requires accurate spelling with no variations; capitals or small letters are both accepted.";

const PART2_P1 = `Cultural Festivals

Cultural festivals (0) are important events that celebrate the traditions and ways of life of different communities. These celebrations allow people to experience music, food and customs from different backgrounds. Attending cultural festivals regularly (9) ______ people many chances to learn about other cultures and local heritage.`;

const PART2_P2 = `Cultural Festivals

In many countries, festivals are organised to celebrate old traditions. Visitors can watch traditional dances, (10) ______ to local music and taste special dishes. These activities help people gain a deeper understanding of different cultures. Furthermore, festivals also help communities (11) ______ their traditions alive.`;

const PART2_P3 = `Cultural Festivals

On top of that, cultural festivals play a role in bringing communities together. They create a lively environment where people from (12) ______ backgrounds can meet and share experiences. This interaction can (13) ______ understanding and respect among individuals.`;

const PART2_P4 = `Cultural Festivals

In addition, festivals help strengthen relationships within communities. People gather with family members, neighbours and visitors to enjoy the celebrations together. Such gatherings often (14) ______ a sense of unity and respect for cultural differences. Festivals are also important (15) ______ event where people can meet new friends and build connections.`;

const PART2_P5 = `Cultural Festivals

Participating in cultural events can help people learn more about culture and make them feel (16) ______ of their community. It reminds individuals of their shared history and traditions.

In conclusion, cultural festivals are not only entertaining, but also (17) ______ to society. Governments and communities should (18) ______ more cultural events to keep traditions alive and help people understand one another.`;

const PART3_STORY = `The Light by the Lake

When my father told us that he had been promoted, everyone looked proud. He smiled, but I could not. His new job meant that our family had to leave the city and move to a small town where evenings were too quiet. I was sixteen, and moving was not my thing.

On my first day at school, I felt as if everyone knew me. Students looked at me before I introduced myself. Some smiled, while others whispered my name. A small town, I thought, did not need the Internet because stories spread like wildfire. While looking for my classroom, I saw a boy near a noticeboard. He placed a cream-coloured card in my hand.

The boy was about my age, with neat hair, pale skin and an old shirt buttoned to the neck. His name was James. His smile was gentle, but his eyes looked lonely. On the card were only an address and the words, "Come when the sun is low." That evening, my mother thought it was a kind welcome, while my father reminded me to stay alert.

The next day, I forced myself to be brave and followed the address. Soon, I reached a lake that reflected the orange sky. Beside it stood a beautiful house from an old storybook. Its cream walls glowed, golden lamps shone through tall windows, and white flowers climbed along the balcony.

At the front door, a butler in a dark suit welcomed me. James was waiting inside. His hand felt cold, but his voice was warm. The hall smelled of roses and wood. Guests moved quietly around the room. Nobody looked at a phone or asked why I had come alone.

James stayed near me most of the evening. He asked about my old school, my family and whether I missed the city. He listened carefully, but sometimes stared at the lake as if waiting for someone. Before I left, the butler handed me heavy paper bags, so I imagined expensive gifts inside.

At home, my excitement turned sour. The boxes were filled with dry leaves, black stones and burnt wood. My mother turned pale, and my father threw everything away. The next morning, I told Elise, my classmate. She did not laugh and brought me to her house after school.

Elise's mother froze when she saw the card. She had received the invitation years earlier, but had been too frightened to go. Elise's father, whose family had lived there for generations, told us about the rich family who owned the house by the lake and welcomed newcomers with parties.

One evening, their beautiful daughter was found drowned in the lake. On the same night, James, her only brother, disappeared. People believed James had caused his sister's death and run away. A few days later, the house caught fire and destroyed much of the evidence. After that, the family left, and nobody asked about James again.

The story explained the strange gifts. Elise and I checked the place again before sunset. This time, the house was gone. Only broken walls, wild grass and damp earth remained. Rain started pouring, so we turned back. As we were leaving, a pale light rose from the lake and fell on a shabby wall.

Something pulled me towards it. When I pressed my hand against the wet bricks, they collapsed. Behind them stood James in the same clothes, but only his skeleton remained. There was a crack on his skull. The town was shocked. James had not run away. Someone had hurt him, hidden him behind the wall and allowed everyone to blame him.

The light from the lake must have come from James's sister, as if she wanted the truth to be found. My parents wanted to move again, but my father's job made it impossible. I told myself I only had to wait until college. The town did not feel empty anymore. I met kinder people and spent peaceful evenings by the lake.

I learnt an important lesson. A new place may seem strange at first, but every place has its own stories. We should listen, observe and understand before we judge. I hope the siblings have found peace now.`;

const PART4_ARTICLE = `Beauty is Only Skin Deep

Beauty can mean different things in different places. In South Korea, many beauty trends come from K-pop, Korean dramas, skincare products and fashion. Many young people admire the clear skin, slim faces and stylish clothes of Korean stars. Advertisements and social media often show the same perfect look again and again. (27) ______ This can make teenagers feel that they must look a certain way to be accepted.

However, this beauty trend can also bring problems. Some people spend a lot of time on skincare, make-up, clothes and photo editing. Others compare themselves with stars who have stylists, filters and good lighting. (28) ______ Beauty trends can encourage people to take care of themselves, but they can also make people feel less confident.

In Malaysia, people often look at beauty in a more balanced way. Many families and schools teach young people to look clean, speak politely and treat others well. A person may look attractive, but their actions still show what kind of person they are. (29) ______ This reminds us that beauty should not only be about the face.

This does not mean that looks are not important. Looking clean and tidy can help a person feel more confident at school, work or public events. (30) ______ The problem begins when people care too much about looking perfect. A beautiful person who is rude or dishonest will not be respected for long.

Korean beauty trends are also popular among Malaysian teenagers. Some students enjoy Korean skincare, hairstyles or fashion ideas. (31) ______ They can choose what suits their age, school rules and personal comfort. Trends may change quickly, but good values stay with us. (32) ______

In the end, the saying "beauty is only skin deep" teaches us to look beyond a person's looks. A pretty face may get quick attention, but good manners and kindness are more important. True beauty is seen not only in how people look, but also in how they treat others.`;

const PART4_OPTIONS = [
  "A  These images may look perfect, but they are planned.",
  "B  It is fine to look neat and presentable.",
  "C  Inner beauty lasts longer than outer beauty.",
  "D  They may feel unhappy with their own looks.",
  "E  Good character is also part of beauty.",
  "F  Korean stars are popular around the world.",
  "G  Still, students should think before following them.",
  "H  Respect is important in every society.",
];

const PART5_TEXTS = `TEEN HOLIDAY CHOICES

A. Hafiy, 15
During school holidays, I enjoy spending time with my family because we are often busy during school days. We sometimes travel to nearby towns, visit interesting places, or stay at my grandparents' house. At home, I read novels and try simple baking recipes. Holidays help me rest and become closer to my family.

B. Irfan, 17
I like learning new hobbies and creative skills. Last year, I tried painting and basic photography. I enjoyed both because they were fun and useful. I often watch online videos to learn better ways and get new ideas. The holidays give me time to explore my interests and talents.

C. Adudu, 16
I think school holidays should be active and exciting. I do not like staying at home all the time. I usually play hockey with my friends at the stadium. Sometimes, we join sports activities at the community centre. We also go cycling around the neighbourhood to stay healthy, energetic and happy.

D. Opel, 17
For me, school holidays are a good time to earn money and learn useful skills. I sometimes help at my uncle's shop or do simple tasks for my neighbours. These small jobs teach me to be responsible, patient and independent. I can also save money for things I want to buy later.

E. Chang, 15
I prefer quiet and relaxing holidays at home. After a long school term, I like to rest and do simple activities. I usually watch dramas, read interesting books and organise my room. Sometimes, I write in my journal about my thoughts and daily life. These peaceful moments make me feel refreshed.

F. Alif, 17
In my opinion, holidays are the best time to be with friends. We often watch movies, try new cafés, or play video games at someone's house. These activities help us relax after a busy school term. I believe holidays are important because students can enjoy themselves and build stronger friendships.`;

const PART5_MATCH = [
  "A. Hafiy, 15",
  "B. Irfan, 17",
  "C. Adudu, 16",
  "D. Opel, 17",
  "E. Chang, 15",
  "F. Alif, 17",
];

const PART5_SUMMARY = `Teenagers and Their School Holidays

Teenagers spend their school holidays in different ways. Some prefer an active and enjoyable break because they enjoy outdoor games. They may do sports, join community activities or go (37) ______ around the residential area to stay healthy and energetic. Others feel that holidays are better when shared with (38) ______ . They may watch movies, try new cafés or play video games together after a busy school term. There are also teenagers who use the break to make (39) ______ by helping at a shop or doing simple tasks for neighbours. They learn to be disciplined, calm and confident. Some prefer peaceful days at home. They (40) ______ , read books, organise their rooms and write about their thoughts in a journal. They relax and grow through simple activities.`;

const MELAKA = {
  state: "Melaka",
  pdf: "C:/Users/User/Downloads/ENGLISH-Trial SPM 2026-20260917T154200Z-1-001/ENGLISH-Trial SPM 2026/MELAKA/SOALAN TRIAL BI K1 MELAKA 2026 ES.pdf",
  title: "English K1 — Melaka (Trial SPM 2026)",
  description:
    "Bahasa Inggeris Kertas 1 (1119/1): Reading. Peperiksaan Percubaan SPM 2026, Melaka. Five parts, 40 marks.",
  questions: [
    {
      n: 1,
      part: 1,
      context: `To: iffah@email.com\nSubject: School Holiday Trip\n\nHi Iffah,\n\nMy family plans to visit Cameron Highlands during the school holidays. I heard the weather is cool and the scenery is beautiful. We want to visit the strawberry farms and tea plantations. However, we need to plan carefully because the place may be crowded during the holiday season, especially at weekends. Hotel rooms may also be difficult to get. Please suggest other places to visit if you know any. We also hope to avoid rushing on the road, as my father prefers a safer trip.\n\nAin`,
      body: "Why does Ain's family need to plan carefully?",
      choices: [
        "Her father wants to rush on the road during the holiday season.",
        "The place may be crowded and hotel rooms may be hard to get.",
        "The strawberry farms and tea plantations may be closed at weekends.",
      ],
      answer: "B",
    },
    {
      n: 2,
      part: 1,
      context: `Mateen looks up to his older sister, Aulia. She studies hard, attends music practice and helps at home. Although her timetable is busy, she still guides Mateen with his homework every afternoon and gives him advice when he feels worried. Their parents often praise her discipline, but Mateen admires her most because she never makes him feel unimportant. To him, Aulia is not only a sister but also a supporter. Her actions teach him to be responsible. He wants to follow her good example one day.`,
      body: "From the text, why does Mateen admire Aulia?",
      choices: [
        "She is praised for being disciplined.",
        "She studies hard and follows a busy routine.",
        "She makes him feel important and supported.",
      ],
      answer: "C",
    },
    {
      n: 3,
      part: 1,
      context: `HELP THAT MATTERS\n\nMany single mothers raise their children while working and taking care of the home by themselves. Help should make their lives easier, not make them feel weak. People can buy from their small businesses, share job news, look after their children when needed or give school items. Local groups can teach simple work skills so they can earn more money. When single mothers get kind and useful help, their children can have better food, school things and a safer feeling at home. This help gives hope.`,
      body: "According to the text, how can people support single mothers?",
      choices: [
        "By hiring them to do simple work skills.",
        "By providing financial support and school materials.",
        "By supporting their work and helping them care for their families.",
      ],
      answer: "C",
    },
    {
      n: 4,
      part: 1,
      context: `A frog begins life as a tiny egg in water. After a few days, the egg hatches into a tadpole. At first, the tadpole has a tail and breathes through gills. As it grows, back legs appear, followed by front legs. Its lungs develop, and its tail slowly becomes shorter. The young frog then leaves the water more often but still stays near damp places. When it becomes an adult, it can return to the water to lay eggs and begin the cycle again.`,
      body: "Which of the following is TRUE about a frog's life cycle?",
      choices: [
        "A tadpole grows front legs before its back legs appear.",
        "A tadpole breathes through gills before its lungs develop.",
        "A young frog lays eggs after leaving the water more often.",
      ],
      answer: "B",
    },
    {
      n: 5,
      part: 1,
      context: `Book Review\nThe Time Traveller's Secret\n\nThe Time Traveller's Secret is about a teenage girl named Yuhaniz. One day, she finds an old watch in her grandmother's storeroom. The watch can take her to the past. During her journeys, Yuhaniz learns that her family has looked after the watch for many years. She also faces problems and finds out more about her family history. The story is exciting because each trip teaches her something new. Readers can follow Yuhaniz as she becomes braver and more careful.`,
      body: "From the review, what will readers discover in the book?",
      choices: [
        "The watch stayed in Yuhaniz's family for generations.",
        "Time-travelling taught Yuhaniz about her problematic family.",
        "Her grandmother kept the watch to help Yuhaniz learn family history.",
      ],
      answer: "A",
    },
    {
      n: 6,
      part: 1,
      context: `SPORTS CARNIVAL SALE\n\nActiveLife Sports Centre will hold its Sports Carnival Sale from 8 June to 18 July. School teams can get 15% off selected training gear with a minimum purchase of RM400. This offer is only for registered coaches. Members can also get a 20% rebate on selected sportswear, but they must show a membership card and spend at least RM80. Not all items are included in the sale. Staff can help customers check prices. Customers should read the sale terms first.`,
      body: "According to the advertisement, what should customers do to get the 20% rebate?",
      choices: [
        "Be a member and buy selected sportswear worth RM400.",
        "Display membership card and spend at least RM80 on selected sportswear.",
        "Show a membership card and spend a minimum of RM80 on any item in the sale.",
      ],
      answer: "B",
    },
    {
      n: 7,
      part: 1,
      context: `Magnesium is a mineral that our body needs every day. It helps muscles move and relax, and helps nerves send messages. It also keeps the heartbeat steady. The body uses magnesium to turn food into energy and keep bones strong. We can get it from spinach, nuts, beans, bananas and whole grains. Some people take supplements, but healthy food should be the main source. With enough magnesium, people may have energy for daily activities, pay attention better and stay healthy.`,
      body: "From the text, what is one benefit of magnesium to the human body?",
      choices: [
        "It produces energy to keep the body strong.",
        "It allows supplements to replace healthy food.",
        "It may help people stay active, focused and healthy.",
      ],
      answer: "C",
    },
    {
      n: 8,
      part: 1,
      context: `KUALA LUMPUR - The city council will install ten smart surveillance cameras in selected high-crime areas. The cameras can take clear pictures even at night and send quick alerts to the control centre. When officers receive the alerts, they can check the situation and take action faster. A city safety officer said the system will help improve security through better technology. Residents are expected to feel safer because these areas will be watched by trained staff. The council hopes this project will reduce crime and make the city safer.`,
      body: "Which statement is TRUE about the smart cameras?",
      choices: [
        "The cameras can send real-time alerts for fast action.",
        "The cameras will be installed in all areas of Kuala Lumpur.",
        "The cameras will monitor the residents to make them feel safer.",
      ],
      answer: "A",
    },

    // ---- Part 2: cloze, Cultural Festivals ------------------------------
    { n: 9, part: 2, context: PART2_P1, body: "Choose the best word for gap (9).", choices: ["gives", "keeps", "shows", "carries"], answer: "A" },
    { n: 10, part: 2, context: PART2_P2, body: "Choose the best word for gap (10).", choices: ["hear", "enjoy", "focus", "listen"], answer: "D" },
    { n: 11, part: 2, context: PART2_P2, body: "Choose the best word for gap (11).", choices: ["tell", "save", "keep", "pass"], answer: "C" },
    { n: 12, part: 2, context: PART2_P3, body: "Choose the best word for gap (12).", choices: ["transit", "quality", "majority", "different"], answer: "D" },
    { n: 13, part: 2, context: PART2_P3, body: "Choose the best word for gap (13).", choices: ["collect", "follow", "prepare", "improve"], answer: "D" },
    { n: 14, part: 2, context: PART2_P4, body: "Choose the best word for gap (14).", choices: ["build", "invite", "explain", "protect"], answer: "A" },
    { n: 15, part: 2, context: PART2_P4, body: "Choose the best word for gap (15).", choices: ["busy", "quiet", "social", "private"], answer: "C" },
    { n: 16, part: 2, context: PART2_P5, body: "Choose the best word for gap (16).", choices: ["full", "part", "sure", "away"], answer: "B" },
    { n: 17, part: 2, context: PART2_P5, body: "Choose the best word for gap (17).", choices: ["busy", "useful", "careful", "modern"], answer: "B" },
    { n: 18, part: 2, context: PART2_P5, body: "Choose the best word for gap (18).", choices: ["borrow", "explain", "organise", "decorate"], answer: "C" },

    // ---- Part 3: comprehension, The Light by the Lake -------------------
    {
      n: 19,
      part: 3,
      context: PART3_STORY,
      body: "Why could the narrator not smile with her father?",
      choices: [
        "Her parents had to live in a quiet town.",
        "Her father looked proud after the news.",
        "She was eager about starting school again.",
        "She had to leave the city after his promotion.",
      ],
      answer: "D",
    },
    {
      n: 20,
      part: 3,
      context: PART3_STORY,
      body: 'The phrase "spread like wildfire" suggests that stories in the town',
      choices: [
        "were shared mostly by students at school.",
        "were whispered softly before class started.",
        "spread very quickly among the townspeople.",
        "moved through the Internet and social media.",
      ],
      answer: "C",
    },
    {
      n: 21,
      part: 3,
      context: PART3_STORY,
      body: "What impression did James give when the narrator first met him?",
      choices: [
        "He looked lonely but spoke gently.",
        "He seemed shy and afraid of others.",
        "He looked polite but rather mysterious.",
        "He seemed friendly and very confident.",
      ],
      answer: "A",
    },
    {
      n: 22,
      part: 3,
      context: PART3_STORY,
      body: "How did the narrator probably feel when she first saw the house?",
      choices: [
        "Calm beside the lake.",
        "Amazed by its beauty.",
        "Curious about the lamps.",
        "Interested in the balcony flowers.",
      ],
      answer: "B",
    },
    {
      n: 23,
      part: 3,
      context: PART3_STORY,
      body: "What made the gathering seem unusual to the narrator?",
      choices: [
        "The butler welcomed her at the front door.",
        "The hall smelled of roses and polished wood.",
        "Nobody used a phone or asked why she came alone.",
        "James was already waiting inside the house with other guests.",
      ],
      answer: "C",
    },
    {
      n: 24,
      part: 3,
      context: PART3_STORY,
      body: "Why did the narrator expect to find expensive gifts in the paper bags?",
      choices: [
        "The butler gave the bags before she left.",
        "The bags felt heavy when she carried them.",
        "The house looked beautiful and rich inside.",
        "James had stayed with her during the evening.",
      ],
      answer: "B",
    },
    {
      n: 25,
      part: 3,
      context: PART3_STORY,
      body: "What was finally discovered behind the shabby wall?",
      choices: [
        "The truth about the drowned girl.",
        "The evidence destroyed by the fire.",
        "The reason the family left the town.",
        "James's skeleton in the same clothes.",
      ],
      answer: "D",
    },
    {
      n: 26,
      part: 3,
      context: PART3_STORY,
      body: "How did the town change the narrator's thoughts?",
      choices: [
        "She realised that every place has hidden stories.",
        "She became braver after meeting kinder people.",
        "She understood why people feared the old house.",
        "She accepted that moving to a new town was easy.",
      ],
      answer: "A",
    },

    // ---- Part 4: gapped text, Beauty is Only Skin Deep ------------------
    ...[27, 28, 29, 30, 31, 32].map((n, i) => ({
      n,
      part: 4,
      context: PART4_ARTICLE,
      body: `Which sentence fits gap (${n})? Two of the eight sentences are not needed anywhere.`,
      choices: PART4_OPTIONS,
      answer: ["A", "D", "E", "B", "G", "C"][i],
    })),

    // ---- Part 5a: match the statement to the person ---------------------
    {
      n: 33,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I spend quality time with my family.",
      choices: PART5_MATCH,
      answer: "A",
    },
    {
      n: 34,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I watch tutorials to improve my skills.",
      choices: PART5_MATCH,
      answer: "B",
    },
    {
      n: 35,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I get some cash by helping people around me.",
      choices: PART5_MATCH,
      answer: "D",
    },
    {
      n: 36,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I enjoy the comfort of home during the school holidays.",
      choices: PART5_MATCH,
      answer: "E",
    },

    // ---- Part 5b: one word from the texts (written answers) ------------
    ...[37, 38, 39, 40].map((n, i) => ({
      n,
      part: 5,
      type: "FREE",
      context: `${PART5_TEXTS}\n\n${PART5_SUMMARY}\n\nUsing words from the texts, complete the summary. Choose no more than ONE word for each blank.`,
      body: `Write the word that belongs in gap (${n}).`,
      answer: ["cycling", "friends", "money", "rest"][i],
      explanation: SPELLING_RULE,
    })),
  ],
};

export default MELAKA;
