// SPM English Kertas 1 (Reading and Use of English) - Johor Set 3 Trial 2026.
//
// Transcribed by eye from the scanned paper; the PDFs carry no text layer.
// Answers come from the official answer key, except where `keyNote` says
// otherwise.
//
// Johor lays Part 1 out differently from Kedah: a bordered box of text above
// each question rather than a picture beside it. So there is no stimulusPages
// here and nothing is cropped - the box is transcribed into the question,
// which reflows on a phone in a way a scan of a paragraph does not.
//
// The key is filed as "JOHOR(BATU PAHAT)" but its own heading reads "SET 3
// MODUL KECEMERLANGAN SPM 2026", which is this paper. Batu Pahat is the
// district that produced it.

const PART2_PASSAGE_1 = `Preserve Our Nature

In recent years, more people have become aware of the connection between health and the environment. The quality of the air we breathe can significantly impact our well-being. For example, air pollution can (0) lead to serious health issues, including asthma and other respiratory diseases. Therefore, individuals and communities need to take steps to (9) ______ the environment.`;

const PART2_PASSAGE_2 = `Preserve Our Nature

One way to improve environmental health is by reducing waste. Many households now practise recycling and try to avoid using plastic products. This simple action can help (10) ______ the amount of waste that ends up in landfills.`;

const PART2_PASSAGE_3 = `Preserve Our Nature

Another important factor is maintaining a clean and green environment. People are encouraged to plant trees and take part in community clean-up activities. These efforts not only (11) ______ the appearance of the surroundings but also the quality of air. In addition, people should be (12) ______ with their daily habits. This can (13) ______ help lower electricity bills and reduce pollution.`;

const PART2_PASSAGE_4 = `Preserve Our Nature

Furthermore, individuals are advised to (14) ______ smoking, a harmful habit which can damage both personal health and the environment. The government also plays a role by enforcing laws to protect natural resources. People must (15) ______ the importance of these laws and cooperate with authorities. Without public (16) ______ , such efforts may not be successful.`;

const PART2_PASSAGE_5 = `Preserve Our Nature

In conclusion, protecting the environment is a shared responsibility. Everyone should take action and (17) ______ their part in preserving nature. Small actions today can bring (18) ______ benefits in days to come. A clean environment leads to a healthier life and ensures a better future for all.`;

const PART3_STORY = `The world watched closely as Dr Elena Volkov prepared for a historic mission at the International Space Research Centre in Kazakhstan. News reporters gathered outside the massive building while engineers rushed through the corridor carrying tablets and files. Scientists in the control room carefully checked every system before launch. Elena, calm and focused, stood beside the spaceship Aurora 1, ready to lead one of the most important scientific missions ever carried out beyond Earth's atmosphere. The mission would last four days and collect important information about life and survival in deep space.

Elena was born in a small town in northern Russia. Her mother worked as a nurse while her father sold tickets at a railway station. Every evening, she sat near her bedroom window with an old telescope that once belonged to her grandfather to study the stars. Although her family struggled financially, her parents always encouraged her love for science and learning. They would even accompany her at the local library for hours on weekends to read on space.

At school, Elena displayed strong potential in Physics and Mathematics and her teachers noticed her ability in problem-solving. But high school was not always easy: friendship was a challenge because it was hard for her to find people who shared the same interests. Mr Abraham, her class teacher, asked her to lead the school team at a science fair, she jumped at it. Through the experience, she was able to improve her communication skills and made new friends.

After finishing school, Elena entered a leading university in Moscow to study space engineering. In her final year, Elena joined a national research competition for young scientists. Teams from across the country presented their ideas for future space technology. Elena impressed the judges with her confidence and wide knowledge of the subject. Her group did not win, but Elena was offered an opportunity to join a special training programme at the International Space Research Centre.

The training programme was extremely demanding. Elena and her fellow trainees spent weeks completing underwater exercises, surviving in freezing forests and staying alone inside small test chambers for long periods of time. One evening, after a particularly exhausting survival exercise, a fellow scientist named Marcus sat beside her and sighed. "I don't know how much longer I can do this," he admitted. Elena smiled, "I know it's difficult, but every challenge is preparing us for something bigger. If we can handle this, we can handle almost anything." Marcus nodded. "You always seem so calm under pressure." "I just focus on solving one problem at a time," Elena replied.

Although she often felt exhausted herself, Elena refused to give up. Her determination, calm personality and ability to solve problems under pressure impressed the instructors greatly. Elena was finally selected to lead the Aurora 1 mission. During the journey, her team conducted experiments related to plant growth, sleep patterns and human memory in space conditions.

However, the mission was not without danger. On the third day, dark storm clouds surrounded the spaceship as it travelled through the upper atmosphere. Suddenly, warning alarms went off through the cabin. "Elena, we're losing power in the main system," a ground control engineer reported through the crackling radio. Elena quickly examined the data on her screen. "I'm checking the backup system now," she replied calmly. "Keep sending me updates from your side." For the next few hours, she worked closely with the ground control team, testing different solutions while the storm continued to interfere with communications. The situation was stressful, but Elena remained focused.

"I've found the problem," she announced at last. "Attempting to get the system back on again now." Everyone waited anxiously. A few seconds later, the warning alarms stopped, and the power levels returned to normal.

When Aurora 1 safely returned to Earth, Elena received honours for her contribution to the mission. During an interview with the crew, Marcus jokingly said, "Without Elena, I would still be floating around in space. Thank you Elena, for showing us how to stay calm when everything seems to be going wrong." Elena laughed at the comment. As she looked around at her teammates, she felt proud of what they had achieved together and looked forward to the next stage of her career.`;

const PART4_ARTICLE = `A Hard Lesson in Saving

Last year, I received a generous amount of 'duit raya' - money packets, from my relatives. Being a teenager, my first instinct was to head straight to the mall. I had been eyeing a pair of limited-edition sneakers for months.

Even though they cost almost all of my savings, I felt I deserved a reward for my exam results. (27) ______ However, the excitement did not last long. A week later, my school announced a much-anticipated graduation trip to Langkawi. All my close friends were signing up immediately. When I checked my bank account, I realised I only had fifty ringgit left. (28) ______ There was a deep sense of regret as I stared at my expensive sneakers, which now seemed far less important.

I tried asking my parents for an advance on my allowance. My father, however, saw this as a 'teachable moment'. He explained that financial independence requires discipline and planning. (29) ______ He told me that if I wanted to go on the trip, I would have to earn the money myself.

I decided to take up a part-time job at a local bakery on the weekends. It was exhausting work, standing for hours and serving demanding customers. (30) ______ I started to understand the true value of every ringgit I earned. I stopped buying expensive bubble tea and began packing my own lunch for school.

Slowly, my savings began to grow. I tracked every expense in a small notebook to ensure I was staying within my budget. (31) ______ By the end of the month, I had finally saved enough for the trip deposit. It was a proud moment when I handed the cash to my teacher.

In the end, I made it to Langkawi. The trip was amazing, but the lesson I learned was even more valuable. I realised that being a smart consumer isn't about how much you have, but how you manage it. (32) ______

Now, I always think twice before making a big purchase.`;

const PART4_OPTIONS = [
  "A  This helped me clearly see where my money was being spent.",
  "B  I understood that I should have always put my needs first over my wants.",
  "C  Without hesitation, I bought and proudly wore them the very next day to school.",
  "D  He refused to give me any extra cash despite my repeated and constant begging for it.",
  "E  My friends offered to cover my flight tickets as they felt sorry for me.",
  "F  I felt miserable because I could not afford to pay the deposit for the trip.",
  "G  The experience taught me that earning money is much harder than spending it.",
  "H  The sneakers turned out to be surprisingly uncomfortable when worn for long walks.",
];

const PART5_TEXTS = `Living with Neighbours

A - AINEY, 17 years old
When we first moved into this neighbourhood, I was quite anxious about meeting everyone. However, our next-door neighbour came over and brought some homemade traditional snacks. That simple act of kindness made us feel very welcome, happy and relaxed in our new environment.

B - BARIAH, 16 years old
I spend most of my time in the garden. My neighbour and I often share useful tips on growing organic vegetables. It's wonderful because we both end up with a healthy harvest and a stronger friendship. Sharing about what we like makes the hobby much more rewarding and productive for both of us.

C - CHEW, 17 years old
We live in a busy area, so we look out for each other. If my neighbours go away on vacation, I keep an eye on their house to ensure it's safe and sound. They do the same for me, which gives both of us peace of mind. Even though I have security cameras, having real people to help out provides added peace of mind.

D - DANIA, 19 years old
Our street is very lively and welcoming. Once a year, I help organise a potluck lunch for the whole block. It's a great way to catch up with everyone and meet the younger residents who are usually busy with school. These events remind us that we are a part of a loving community.

E - EMMA, 16 years old
My neighbours are elderly and find it hard to take care of their pet. Every evening, I take their cat to the park to play. It's an easy task for me, but it really helps them out and keeps the pet active and safe. I've learned that small things can make a huge difference in someone's life.

F - FUAD, 17 years old
Last month, a pipe burst in my kitchen. I was so worried because my parents weren't home. I called my neighbour, who is very good with tools. He came over immediately and fixed it. I'm so grateful to have someone so skilful nearby. It makes me want to learn those skills so I can help others, too.`;

const PART5_MATCH = [
  "A - AINEY, 17 years old",
  "B - BARIAH, 16 years old",
  "C - CHEW, 17 years old",
  "D - DANIA, 19 years old",
  "E - EMMA, 16 years old",
  "F - FUAD, 17 years old",
];

const PART5_SUMMARY = `A Good Neighbourhood

Maintaining a helpful community provides various benefits to residents. One of them is a sense of security. Good residents often agree to look after each other's (37) ______ while they are traveling. For newcomers, receiving gifts - such as (38) ______ can help lower their stress and boost their mood. Additionally, anyone who enjoys nature may exchange positive (39) ______ with like-minded individuals to achieve a better result. A neighbourhood also needs more (40) ______ persons to provide help during any unexpected household crisis or incidents. All in all, these actions show a strong sense of harmony.`;

const JOHOR = {
  state: "Johor",
  pdf: "C:/Users/User/Downloads/ENGLISH-Trial SPM 2026-20260917T154200Z-1-001/ENGLISH-Trial SPM 2026/JOHOR/SOALAN TRIAL BI K1 JOHOR SET 3 2026 ES.pdf",
  title: "English K1 — Johor Set 3 (Trial SPM 2026)",
  description:
    "Bahasa Inggeris Kertas 1 (1119/1): Reading. Modul Kecemerlangan SPM Tingkatan 5, Johor Set 3, 2026. Five parts, 40 marks.",
  questions: [
    {
      n: 1,
      part: 1,
      context: `PARAGON MALL WEEKEND SALE!\n\nGet up to 70% off on selected popular international labels.\n\nTo make this event special, the first 100 people who arrive before 10:00 a.m. will receive a RM50 gift voucher.\n\nWhether you want new fashion or a gift for a friend, this is the best place to visit.`,
      body: "Shoppers can get extra value for their money by",
      choices: ["showing up earlier.", "shopping on a Sunday.", "buying famous fashion products."],
      answer: "A",
    },
    {
      n: 2,
      part: 1,
      context: `Notice: Please Do Not Touch!\n\nThese plants are sensitive and can be damaged easily. Touching the leaves or flowers may put the plants in danger and stop them from growing well. Please help us keep the garden clean and beautiful by not touching the plants. We hope all visitors can enjoy the garden and take care of the environment together. Thank you!`,
      body: "The notice says that",
      choices: [
        "contact with the flowers or leaves could affect the plants' growth.",
        "visitors should do their part to clean the place.",
        "the plants need minimal care and handling.",
      ],
      answer: "A",
    },
    {
      n: 3,
      part: 1,
      context: `A message from the River Rescue Group:\n\nDid you know that illegal waste is damaging the river in our area? This has decreased the fish population and is also worrying the local fishermen.\n\nWe are looking for individuals to help with the 'Clean Our Waters' programme next Sunday. Cleaning equipment will be provided for free.\n\nCome join and support us!`,
      body: "The River Rescue Group needs people who can",
      choices: [
        "offer support to the local fishermen.",
        "provide the required tools for the event.",
        "contribute to the effort of saving the river.",
      ],
      answer: "C",
    },
    {
      n: 4,
      part: 1,
      context: `SmartPay Account\n\nTired of carrying cash to school every day? Open a SmartPay Account at BrightBank. Students can use their cards for cashless payments at the canteen and bookshop. SmartPay also helps them monitor spending and practise good money management skills. Most importantly, they no longer need to worry about misplacing their money while at school.`,
      body: "Why is SmartPay considered the best option for students?",
      choices: [
        "It allows them to manage their money wisely.",
        "It helps them learn about cashless payments.",
        "It lowers the risk of losing their cash.",
      ],
      answer: "C",
    },
    {
      n: 5,
      part: 1,
      context: `Hi Sara,\n\nPlease remember to bring your reusable bottle to school today. The weather is very hot. It's better for your health to drink more water. Also, try not to buy drinks in plastic bottles. We need to reduce waste to protect the environment.\n\nLove,\nMum`,
      body: "What is the main purpose of the message?",
      choices: [
        "To remind Sara of the humid weather.",
        "To encourage Sara to reduce plastic use.",
        "To ask Sara to purchase drinks in reusable bottles.",
      ],
      answer: "B",
      keyNote:
        "The key gives A. The note's weather line is context, not its purpose, and it says hot rather than humid; the message asks Sara to carry a reusable bottle and avoid plastic ones, which is B. C contradicts the note, which tells her not to buy bottled drinks.",
    },
    {
      n: 6,
      part: 1,
      context: `Traditional cultural practices can promote healthy living. Home-cooked meals, traditional dances, and community gatherings encourage physical activity and strengthen relationships. These activities also support emotional well-being. Today, many people spend more time on sedentary activities and less time practising traditions. Communities should preserve cultural practices while adapting them to modern lifestyles.`,
      body: "What would happen if people continue to practise traditional cultural activities?",
      choices: [
        "They become more emotional.",
        "They have better relationships.",
        "They have greater appreciation of traditions.",
      ],
      answer: "B",
    },
    {
      n: 7,
      part: 1,
      context: `Get yourself a Titan-X Tablet today!\n\nExperience the future with our most advanced device. Whether you're a digital artist or a student, the Titan-X offers smooth multitasking. It features a screen that can protect your eyes during long study sessions. Purchase it now to receive a stylus pen and a 2-year extended warranty. Visit any Tech-World store today!`,
      body: "Why should students buy the Titan-X Tablet?",
      choices: [
        "They can get free gifts and a warranty.",
        "They can extend the protection period in store.",
        "They do not have to worry about eye problems.",
      ],
      answer: "C",
    },
    {
      n: 8,
      part: 1,
      context: `If you are struggling with monthly debt, I recommend that you write the groceries you need before visiting the mall. It prevents you from buying items that you do not actually need. Small changes in your habits lead to big savings. Check my blog for tips on comparing various prices.`,
      body: "According to the writer, how can shoppers save money?",
      choices: ["Compare prices.", "Avoid unnecessary items.", "Follow your shopping list."],
      answer: "C",
    },

    // ---- Part 2: cloze, "Preserve Our Nature" ----------------------------
    {
      n: 9,
      part: 2,
      context: PART2_PASSAGE_1,
      body: "Choose the best word for gap (9).",
      choices: ["secure", "protect", "maintain", "preserve"],
      answer: "B",
    },
    {
      n: 10,
      part: 2,
      context: PART2_PASSAGE_2,
      body: "Choose the best word for gap (10).",
      choices: ["decrease", "destroy", "decline", "delay"],
      answer: "A",
    },
    {
      n: 11,
      part: 2,
      context: PART2_PASSAGE_3,
      body: "Choose the best word for gap (11).",
      choices: ["boost", "increase", "improve", "upgrade"],
      answer: "C",
    },
    {
      n: 12,
      part: 2,
      context: PART2_PASSAGE_3,
      body: "Choose the best word for gap (12).",
      choices: ["careful", "helpful", "grateful", "thankful"],
      answer: "A",
    },
    {
      n: 13,
      part: 2,
      context: PART2_PASSAGE_3,
      body: "Choose the best word for gap (13).",
      choices: ["definitely", "quickly", "slowly", "rarely"],
      answer: "A",
    },
    {
      n: 14,
      part: 2,
      context: PART2_PASSAGE_4,
      body: "Choose the best word for gap (14).",
      choices: ["give in", "give up", "give out", "give away"],
      answer: "B",
    },
    {
      n: 15,
      part: 2,
      context: PART2_PASSAGE_4,
      body: "Choose the best word for gap (15).",
      choices: ["remember", "determine", "realise", "notice"],
      answer: "C",
    },
    {
      n: 16,
      part: 2,
      context: PART2_PASSAGE_4,
      body: "Choose the best word for gap (16).",
      choices: ["unity", "support", "guidance", "assistance"],
      answer: "B",
    },
    {
      n: 17,
      part: 2,
      context: PART2_PASSAGE_5,
      body: "Choose the best word for gap (17).",
      choices: ["give", "play", "hold", "make"],
      answer: "B",
    },
    {
      n: 18,
      part: 2,
      context: PART2_PASSAGE_5,
      body: "Choose the best word for gap (18).",
      choices: ["well-known", "long-term", "full-time", "non-stop"],
      answer: "B",
    },

    // ---- Part 3: comprehension, Dr Elena Volkov -------------------------
    {
      n: 19,
      part: 3,
      context: PART3_STORY,
      body: "The opening paragraph tells us that Elena was",
      choices: [
        "giving support to the public.",
        "steady in her role as the leader.",
        "trying to get everything done quickly.",
        "thorough with the work she was doing.",
      ],
      answer: "B",
    },
    {
      n: 20,
      part: 3,
      context: PART3_STORY,
      body: "From paragraph 2, we learned that",
      choices: [
        "Elena's grandfather encouraged her to be a scientist.",
        "Elena's father taught her how to repair machines.",
        "Elena's parents were supportive of her interest.",
        "Elena's parents were professionals.",
      ],
      answer: "C",
    },
    {
      n: 21,
      part: 3,
      context: PART3_STORY,
      body: "The phrase 'she jumped at it' shows that Elena",
      choices: [
        "struggled to find friends.",
        "had problems with her studies.",
        "realised leadership skills are important.",
        "eagerly accepted the opportunity to socialise.",
      ],
      answer: "D",
    },
    {
      n: 22,
      part: 3,
      context: PART3_STORY,
      body: "Elena was given a chance as a research trainee",
      choices: [
        "because she wanted to be a scientist.",
        "during her first year at the university.",
        "after the judges noticed her capability.",
        "when her team developed new technology.",
      ],
      answer: "C",
    },
    {
      n: 23,
      part: 3,
      context: PART3_STORY,
      body: "The word 'this' in paragraph 5 refers to",
      choices: [
        "being a scientist.",
        "completing the programme.",
        "spending time with other trainees.",
        "staying calm despite facing problems.",
      ],
      answer: "B",
    },
    {
      n: 24,
      part: 3,
      context: PART3_STORY,
      body: "Elena was chosen to lead the mission because",
      choices: [
        "she did not show she was tired.",
        "she was able to focus on one thing at a time.",
        "she showed qualities needed to carry out the task.",
        "she had the knowledge to complete the experiments.",
      ],
      answer: "C",
    },
    {
      n: 25,
      part: 3,
      context: PART3_STORY,
      body: "How did Elena react when problems arise during the mission?",
      choices: [
        "She immediately tested various ways to stop the storm.",
        "She took prompt action before discussing with others.",
        "She calmly told her team to overcome the problem.",
        "She stayed focused despite being under pressure.",
      ],
      answer: "D",
    },
    {
      n: 26,
      part: 3,
      context: PART3_STORY,
      body: "What is the main message of the passage?",
      choices: [
        "Being focused helps maintain motivation and obtain success.",
        "We should be courageous to achieve our dreams and missions.",
        "Parents should encourage their children to pursue their ambitions.",
        "People should chase their dreams with hard work and determination.",
      ],
      answer: "D",
    },

    // ---- Part 4: gapped text --------------------------------------------
    ...[27, 28, 29, 30, 31, 32].map((n, i) => ({
      n,
      part: 4,
      context: PART4_ARTICLE,
      body: `Which sentence fits gap (${n})? Two of the eight sentences are not needed anywhere.`,
      choices: PART4_OPTIONS,
      answer: ["C", "F", "D", "G", "A", "B"][i],
    })),

    // ---- Part 5a: match the statement to the person ----------------------
    {
      n: 33,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I like to gather and connect people of all ages.",
      choices: PART5_MATCH,
      answer: "D",
    },
    {
      n: 34,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Initially, I was worried about socialising.",
      choices: PART5_MATCH,
      answer: "A",
    },
    {
      n: 35,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: Someone's action inspired me to be a useful member of society.",
      choices: PART5_MATCH,
      answer: "F",
    },
    {
      n: 36,
      part: 5,
      context: PART5_TEXTS,
      body: "Which text says: I carry out a specific routine for my ageing neighbours.",
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
      answer: ["house", "snacks", "tips", "skilful"][i],
    })),
  ],
};

export default JOHOR;
