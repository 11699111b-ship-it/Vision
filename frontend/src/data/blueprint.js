export const EP_COSTS = {
  'Daily Power-Up': 2,
  'Autopilot Bots': 2,
  'Big Missions': 4,
  'Locked': 0,
};

const FREQ_MAP = {
  'Daily': 'Daily',
  'Weekly': 'Weekly',
  'Monthly': 'Monthly',
  'Quarterly': 'Quarterly',
  'Annually': 'Quarterly',
  'Bi-weekly': 'Weekly',
};

function q(str, goalId) {
  return str.split(' OR ').map((part, idx) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^\((Daily|Weekly|Monthly|Quarterly|Annually|Bi-weekly)\)\s+(.+)$/);
    return {
      id: `${goalId}-q${idx}`,
      text: match ? match[2].trim() : trimmed,
      frequency: match ? (FREQ_MAP[match[1]] || 'Daily') : 'Daily',
    };
  });
}

function mkGoal(roomId, gi, name, tag, questStr) {
  const id = `${roomId}-g${gi}`;
  return { id, name, tag, epCost: EP_COSTS[tag] || 0, quests: q(questStr, id) };
}

function mkRoom(floorId, key, name, icon, goals, locked = false) {
  const id = `${floorId}-r${key}`;
  return {
    id, name, icon, locked,
    goals: goals.map((g, gi) => mkGoal(id, gi, g[0], g[1], g[2])),
    customGoals: [],
  };
}

const INITIAL_BLUEPRINT = {
  floors: [
    {
      id: 'f0', number: 0, name: 'Health & Basics',
      rooms: [
        mkRoom('f0', 'A', 'Physical Health', 'Dumbbell', [
          ['Overall Body Mastery', 'Daily Power-Up',
            `(Daily) 45-minute physical training OR (Daily) Hit strict protein targets OR (Weekly) Prep all healthy meals on Sunday OR (Daily) Record and log all meals in a macro-tracking app to guarantee daily protein adherence OR (Weekly) Film your heaviest compound lifts weekly to refine form and progress toward the 1.5x bodyweight goal safely OR (Quarterly) Book a comprehensive blood panel quarterly to actively monitor and optimize your specific biomarkers`],
          ['High on Energy, Sleep mastery & recovery science', 'Daily Power-Up',
            `(Daily) 15 mins direct sunlight upon waking OR (Daily) Stop caffeine by 2:00 PM OR (Daily) Substitute processed sugar entirely with Stevia OR (Daily) Integrate sleep tracking into your 9-4-2-1 rule to guarantee consecutive 8-hour nights OR (Daily) Log your afternoon energy levels daily to verify the elimination of midday crashes OR (Weekly) Adjust your bedtime incrementally earlier each week until you consistently wake naturally without an alarm`],
          ['Great at sports & physical agility', 'Autopilot Bots',
            `(Weekly) Deliberate drill session on a weakness OR (Monthly) Play against someone better OR (Weekly) Watch professional footage to analyze positioning OR (Daily) Log 15 minutes of highly specific skill drills daily to consistently increase your drill hours OR (Weekly) Record your match results in a spreadsheet to objectively track your competition win rate OR (Annually) Register for a local competitive tournament in Bengaluru to actively pursue an advanced league ranking`],
        ]),
        mkRoom('f0', 'B', 'Mental Health & Safety', 'Shield', [
          ['Mental Health, Meditation & Mastery of Solitude', 'Daily Power-Up',
            `(Daily) 15 mins unplugged in silence OR (Weekly) Long walk without headphones OR (Daily) 5-minute brain dump before bed OR (Daily) Utilize your news fast protocol to strictly enforce your daily unplugged minutes OR (Daily) Keep a simple tally pad to quantitatively compare calm days versus overwhelmed days OR (Weekly) Schedule mandatory non-negotiable "do nothing" blocks weekly to ensure zero annual burnout episodes`],
          ['Emergency Preparedness, basic nursing, first aid & emergency situations', 'Autopilot Bots',
            `(Monthly) Review trauma kit contents OR (Quarterly) Mental simulation of fire escape routes OR (Annually) Refresh CPR skills OR (Monthly) Set recurring calendar alerts specifically for checking medical supply expiration dates OR (Monthly) Watch clinical training videos monthly to ensure you remain capable of stabilizing trauma victims OR (Annually) Book an official in-person certification class this year to secure your formal CPR/First Aid credentials`],
        ]),
      ],
    },
    {
      id: 'f1', number: 1, name: 'Focus & Time Management',
      rooms: [
        mkRoom('f1', 'A', 'Managing Time', 'Clock', [
          ['Curating minimalist, clean, organised workspaces', 'Daily Power-Up',
            `(Daily) 10-minute closing shift for your desk OR (Monthly) Deep purge of one room OR (Weekly) Process mail and clear downloads OR (Daily) Pack your 40L one-bag away immediately after trips to strictly enforce zero visual clutter in your room OR (Daily) Scan all necessary physical documents directly into cloud storage upon receipt to maintain a paperless system OR (Daily) Archive or delete all inbox items at a hard 5:00 PM cutoff to ensure days end with zero unread emails`],
          ['Mastering daily routines, time management, and workflows', 'Daily Power-Up',
            `(Daily) Plan tomorrow's schedule the night before OR (Weekly) Audit calendar for deep versus shallow work OR (Daily) Complete the hardest task in the first 90 mins OR (Daily) Strictly allocate your deep work hours within the 4 and 2 blocks of your 9-4-2-1 rule to guarantee consistency OR (Daily) Log predicted task durations next to actual durations in a spreadsheet to improve estimation accuracy OR (Daily) Set a hard shutdown alarm at 5:45 PM to ensure the workday finishes by 6 PM with zero carry-over`],
          ['Being punctual', 'Daily Power-Up',
            `(Daily) Create a fake deadline 15 mins early for meetings OR (Daily) Prep essentials the night before OR (Weekly) Plan commute times accounting for Bengaluru traffic OR (Daily) Explicitly schedule a 30-minute buffer for Marathahalli traffic directly into calendar event durations OR (Weekly) Review your message history weekly to confirm zero apologetic running late texts have been sent OR (Daily) Set a physical alarm clock to enforce the 15-minute early buffer for all departures`],
          ['Ruthless prioritization and the power to say no', 'Daily Power-Up',
            `(Weekly) Say no to one request OR (Daily) Delete a task not driving your 10-year vision OR (Weekly) Apply the Eisenhower Matrix OR (Weekly) Log hours spent on your top 3 BagOfAl tasks to ensure they hit the 80% threshold OR (Daily) Use a standardized email template to swiftly decline low-ROI requests and increase your decline count OR (Weekly) Review your accepted calendar invites weekly to verify zero commitments were accepted out of guilt`],
        ]),
        mkRoom('f1', 'B', 'Deep Focus', 'Zap', [
          ['Attention Mastery & Hyper-Focus', 'Daily Power-Up',
            `(Daily) Keep phone in another room during deep work OR (Daily) Use a strict website blocker OR (Daily) Turn off all non-human push notifications OR (Daily) Use a stopwatch to explicitly measure unbroken flow state durations for BagOfAl development OR (Daily) Check your screen time app daily and record the total to ensure it remains under limits OR (Daily) Keep a distraction tally pad on your desk to log and count every time you self-interrupt`],
          ['Systems thinking (Systemization) in tech, business and life', 'Daily Power-Up',
            `(Weekly) Convert a recurring frustration into a documented rule OR (Daily) Ask how did the system allow this instead of blaming people OR (Monthly) Audit your life operating system OR (Weekly) Map one new standard operating procedure weekly to actively eliminate single points of human failure OR (Weekly) Use a time-tracking tool when drafting documentation to measure hours spent resolving recurring problems OR (Quarterly) Run a simulated vacation test quarterly to ensure operations continue without your presence for 30 days`],
        ]),
        mkRoom('f1', 'C', 'Emotional Strength', 'ShieldCheck', [
          ['Delayed Gratification & Emotional Control', 'Daily Power-Up',
            `(Daily) Wait 5 mins before acting on an urge OR (Weekly) Take a 1-minute cold shower OR (Monthly) Complete a 24-hour fast OR (Daily) Log every instance of pausing before purchasing decathlon travel gear to track impulse delays OR (Daily) Intentionally schedule the hardest Python coding task first to measure choosing hard tasks over comfort OR (Daily) Keep an emotional trigger log to document instances of controlled anger`],
          ['Resilience and bouncing back quickly from failure', 'Daily Power-Up',
            `(Monthly) Conduct an objective failure review OR (Daily) Reframe an annoyance as a patience exercise OR (Weekly) Log your best failure of the week OR (Weekly) Time-stamp your failures to measure exact turnaround time to launching new code iterations OR (Weekly) Catalog all rejections in a spreadsheet to strip them of emotional weight and view them as data OR (Weekly) Write down one implemented solution directly derived from a recent mistake to track implementation speed`],
          ['Self-acceptance', 'Daily Power-Up',
            `(Daily) Speak to yourself as to a respected friend OR (Weekly) Note a trait you are proud of unrelated to productivity OR (Daily) Practice mirror affirmations OR (Daily) Keep a journal explicitly separating your personal value from BagOfAI KPIs OR (Weekly) Log one unapologetic boundary you enforced without feeling guilty to track boundary setting OR (Weekly) Record instances where you felt imposter syndrome to analyze and accelerate its decline`],
          ['Execution Consistency Over Years', 'Daily Power-Up',
            `(Daily) Enforce the Never Miss Twice rule OR (Weekly) Review a long-term progress graph OR (Daily) Execute a minimum viable action on bad days OR (Daily) Cross off days on a physical wall calendar to visually track habit streak lengths OR (Daily) Log completion of daily coding habits to mathematically prove zero zero days OR (Monthly) Plot cumulative progress towards your 10-year startup goal on a chart`],
        ]),
      ],
    },
    {
      id: 'f2', number: 2, name: 'Learning & Thinking',
      rooms: [
        mkRoom('f2', 'A', 'Knowledge & Skills', 'BookOpen', [
          ['Read lots of books', 'Autopilot Bots',
            `(Daily) Read exactly 10 pages before sleep OR (Weekly) Swap scrolling for an audiobook OR (Daily) Read 20 mins first thing in the morning OR (Daily) Utilize your curated Kindle setup to ensure daily page targets are hit without digital distraction OR (Daily) Use Spotify during commutes to log consistent audiobook hours OR (Weekly) Input highlights into your Second Brain system to track summarized books per year`],
          ['A polymath (having deep knowledge across multiple subjects)', 'Big Missions',
            `(Weekly) Consume a documentary unrelated to your industry OR (Monthly) Watch a deep-dive global affairs video OR (Weekly) Read an obscure niche newsletter OR (Weekly) Log hours spent studying geopolitics and psychology to track study outside your primary industry OR (Weekly) Write synthesizing essays linking first-principles thinking to different disciplines OR (Weekly) Document frameworks from tech, business, and psychology to combine them later`],
          ['One non-digital craft mastered', 'Autopilot Bots',
            `(Weekly) 2 hours in the workshop disconnected OR (Daily) Practice mechanical aspect for 15 mins OR (Monthly) Complete a tangible project OR (Weekly) Use a physical notebook to log weekly hours spent practicing your craft OR (Monthly) Photograph finished tangible projects to count physical items produced OR (Daily) Leave your phone in another room to ensure a total flow state without screens`],
        ]),
        mkRoom('f2', 'B', 'Problem Solving', 'Cpu', [
          ['Mental Models & First Principles', 'Big Missions',
            `(Weekly) Apply one new model to a problem OR (Daily) Note cognitive bias clouding judgment OR (Weekly) Explain situation using First Principles OR (Monthly) Map out the Al-Native SaaS Architect Blueprint using strict first principles to avoid analogy-based errors OR (Weekly) Document your mental models directly into your Nexus HQ system for rapid retrieval OR (Weekly) Review business strategy frameworks weekly to actively prevent emotionally-driven mistakes in your startup`],
          ['Cognitive Independence', 'Daily Power-Up',
            `(Daily) Draft first outline strictly on paper before prompting AI OR (Weekly) Logic puzzle without a calculator OR (Monthly) Write original essay without LLMs OR (Weekly) Hand-draw systems architecture flowcharts for BagOfAl before writing any Python code OR (Daily) Dedicate a specific 90-minute block in your 9-4-2-1 routine strictly to screen-free problem solving OR (Daily) Audit Al-generated code snippets manually to ensure you never accept output without verification`],
          ['Great in Philosophy & Developed a personal philosophy of life', 'Autopilot Bots',
            `(Weekly) Read chapter from classic philosopher OR (Daily) Write one-sentence reflection on day's meaning OR (Monthly) Review core values document OR (Monthly) Integrate your 1-page philosophy directly into the root level of your Nexus HQ OR (Weekly) Listen to philosophical deep-dives on Spotify while commuting around Marathahalli OR (Daily) Apply stoic first principles to navigate the inevitable stress of being a founder`],
        ]),
        mkRoom('f2', 'C', 'Understanding the World', 'Eye', [
          ['Great in psychology', 'Big Missions',
            `(Weekly) Read behavioral psychology case study OR (Daily) Observe user interaction to deduce motivation OR (Weekly) Read academic paper on behavioral economics OR (Monthly) Audit the onboarding flow of BagOfAl specifically to identify and remove cognitive friction OR (Weekly) Apply psychological frameworks to optimize your wife's international job applications OR (Daily) Read foundational psychology texts on your Kindle during your dedicated deep reading blocks`],
          ['Great in economics', 'Big Missions',
            `(Weekly) Watch macro-economics breakdown OR (Monthly) Analyze economic shifts impacting AI OR (Daily) Read front page of financial newspaper OR (Monthly) Analyze global trade deals and labor markets to inform your relocation strategy to Singapore or Dubai OR (Monthly) Study the microeconomics of credit card reward systems to maximize your Tata Neu and HDFC points OR (Weekly) Synthesize economic data into your twin-engine system of curated podcasts and Kindle reading`],
          ['Creativity & Lateral Thinking', 'Big Missions',
            `(Daily) Write 10 ideas for anything OR (Weekly) Combine two unrelated concepts into a pitch OR (Monthly) Change physical environment to force new neural pathways OR (Weekly) Combine principles of robotics with generative Al to brainstorm novel concepts OR (Daily) Step away from your Python coding environment and walk outside when facing a creative block OR (Monthly) Brainstorm entirely new features for Nexus HQ by looking at how offline physical systems are organized`],
        ]),
        mkRoom('f2', 'D', 'Making Decisions', 'Target', [
          ['Judgement & Decision-Making', 'Big Missions',
            `(Daily) Write probability 1-100% of expected outcome before acting OR (Weekly) Seek highly intelligent opposing viewpoint OR (Monthly) Perform Andy Grove's Revolving Door Test OR (Monthly) Map out a detailed decision tree before finalizing your 2026 international relocation hub OR (Quarterly) Conduct a pre-mortem on your next software launch to explicitly identify failure points OR (Monthly) Log the outcomes of your credit card upgrade strategies to verify your forecasting accuracy`],
          ['Contrarian Conviction', 'Big Missions',
            `(Weekly) Write down popular belief you disagree with, citing data OR (Daily) Read disagreeing opinions to find their strongest point OR (Monthly) Publicly admit when a contrarian bet was wrong OR (Monthly) Build your own data sets to evaluate the true potential of Al-Native SaaS platforms OR (Monthly) Base your news fast philosophy on independent data regarding information consumption OR (Daily) Separate your ego from your code; discard Python scripts immediately if better logic is found`],
        ]),
      ],
    },
    {
      id: 'f3', number: 3, name: 'People & Relationships',
      rooms: [
        mkRoom('f3', 'A', 'Immediate Family', 'Heart', [
          ['Quality Time with Nikita', 'Daily Power-Up',
            `(Weekly) Execute phone-free date night OR (Monthly) Visit new art/design exhibition together OR (Daily) 15 mins connecting over morning coffee before tech OR (Weekly) Actively review her interior design portfolio to support her career progression OR (Weekly) Discuss potential international relocation hubs together over morning coffee OR (Monthly) Help her refine concepts like kitchen work triangles for her upcoming interior design book`],
          ['Wife is Happy/Healthy', 'Autopilot Bots',
            `(Daily) Ask how can I make your day easier OR (Weekly) Take over a recurring stressful chore OR (Monthly) Gift her an experience for solo enjoyment OR (Monthly) Set up her workspace ergonomically to support her long hours drafting designs OR (Monthly) Research global labor markets for senior design roles to ease her career transition anxiety OR (Daily) Ensure your shared kitchen is fully stocked with Stevia to align with joint health goals`],
          ['The Family Anchor (Parents/Sister/Grandparents)', 'Autopilot Bots',
            `(Weekly) Call them solely to ask about their week OR (Monthly) Send surprise book/gift tailored to interests OR (Quarterly) Assist sister explicitly with robotics/academic mapping OR (Monthly) Schedule recurring calls to coordinate your sister's international university research OR (Annually) Plan your annual trips back to your second home in Lucknow OR (Monthly) Maintain a shared file with your father-in-law's details to easily send professional gifts`],
          ['Peaceful Household', 'Autopilot Bots',
            `(Weekly) Organize shared physical activity OR (Monthly) Screen-free family dinner OR (Quarterly) Digital-detox weekend for entire household OR (Annually) Optimize your packing systems to ensure seamless stress-free travel for family trips OR (Daily) Standardize household meals to completely exclude processed sugar OR (Weekly) Integrate household maintenance schedules directly into your Nexus HQ`],
        ]),
        mkRoom('f3', 'B', 'Friends & Network', 'Users', [
          ['Great Friendships', 'Autopilot Bots',
            `(Weekly) Send unprompted message to a friend OR (Monthly) Host small dinner OR (Monthly) Check in on friends going through transitions OR (Monthly) Reach out to your sibling specifically to coordinate future travel plans like Northeast India OR (Monthly) Separate your utility startup network from your soul friendships to protect authenticity OR (Quarterly) Host a minimalist gathering to discuss non-tech topics with your core group`],
          ['Networking', 'Big Missions',
            `(Monthly) Introduce two people in network OR (Weekly) Leave high-value comment on peer's post OR (Weekly) Send cold compliment email OR (Weekly) Engage actively in the one-bag minimalist travel community online OR (Monthly) Organize and host virtual meetups like the Build with Claude Code webinar to attract talent OR (Monthly) Reach out to Al engineers in Bengaluru to build a local mastermind group`],
          ['Humour & Charisma', 'Autopilot Bots',
            `(Weekly) Watch 30 mins elite stand-up OR (Daily) Find irony/absurdity in mundane frustration OR (Weekly) Practice callbacks in conversation OR (Daily) Find humor in the daily chaos of Marathahalli traffic to de-escalate road rage OR (Weekly) Use sharp wit to make your virtual webinars more engaging for attendees OR (Monthly) Write down absurd observations from your travel adventures in Tawang to share later`],
        ]),
        mkRoom('f3', 'C', 'Leadership & Empathy', 'Award', [
          ['Active Listening', 'Daily Power-Up',
            `(Daily) Listen purely to understand OR (Weekly) Validate emotion before offering solution OR (Daily) Ask how did that make you feel OR (Weekly) Listen attentively to customer feedback regarding your SaaS architecture blueprints OR (Weekly) Use active listening when reviewing portfolio feedback with your wife OR (Daily) Enforce a strict no-interruption rule during your deep work and 1-on-1s`],
          ['Human Reading & Negotiation', 'Big Missions',
            `(Weekly) Deconstruct recorded negotiation for body language OR (Daily) Identify underlying fear driving an angry comment OR (Monthly) Practice tactical empathy OR (Monthly) Apply tactical empathy when negotiating international visa timelines OR (Daily) Use the FM DJ voice to lower cortisol during high-stress startup server outages OR (Monthly) Master the Ackerman model for negotiating B2B contracts`],
          ['Hiring People', 'Big Missions',
            `(Monthly) Connect with talented person just to build rapport OR (Weekly) Refine onboarding SOP OR (Quarterly) Ask top performers for referrals OR (Monthly) Use paid Python test projects instead of standard interviews to verify technical skills OR (Monthly) Standardize your candidate pipeline directly within Nexus HQ OR (Monthly) Leverage attendees from your webinars to source proactive developer talent`],
          ['Leadership', 'Big Missions',
            `(Weekly) Ask team what is bottlenecking your work OR (Monthly) Record video sharing sprint vision OR (Daily) Publicly praise specific action taken by team member OR (Weekly) Hold unblocking sessions to help developers navigate complex Generative Al integration issues OR (Monthly) Clearly communicate the 10-year vision of BagOfAl to align all team efforts OR (Monthly) Invest aggressively in the career growth of your direct reports to build loyalty`],
          ['People Management', 'Big Missions',
            `(Weekly) Give specific, constructive feedback OR (Monthly) Host 1-on-1 on personal career growth OR (Daily) Walk virtual/physical floor to check morale OR (Weekly) Document clear KPIs for your engineering team to measure code output objectively OR (Daily) Provide instant feedback on architectural decisions to correct course early OR (Monthly) Implement a peer-to-peer recognition system within your startup to boost morale`],
        ]),
        mkRoom('f3', 'D', 'Character & Trust', 'Star', [
          ['High Integrity', 'Daily Power-Up',
            `(Daily) Never make promise you aren't 100% sure of OR (Daily) Admit mistakes instantly without excuses OR (Weekly) Audit recent statements for exaggerations OR (Daily) Over-communicate immediately if you are going to miss a software deployment deadline OR (Daily) Radically enforce honesty when discussing the capabilities of your Al models OR (Daily) Do the right thing regarding data privacy when nobody is watching`],
          ['Earned Trust at Scale', 'Autopilot Bots',
            `(Daily) Refuse to use hyperbolic clickbait OR (Weekly) Share genuine failure with audience OR (Monthly) Refund customer who isn't getting value, unprompted OR (Monthly) Be radically transparent about what your Al-native SaaS products cannot do OR (Daily) Let your execution consistency in the 9-4-2-1 rule prove your competence over time OR (Annually) Publish an annual review detailing your startup's misses to build public trust`],
        ]),
        mkRoom('f3', 'E', 'Future Family (Kids)', 'Baby', [
          ['Instilling Values in Kids', 'Locked',
            `(Weekly) Discuss one core value to pass on OR (Daily) 20 mins 1-on-1 playtime OR (Weekly) Read book together asking open-ended questions OR (Monthly) Define your core first-principle values now before relocating internationally OR (Daily) Model the strict work ethic and focus you want them to emulate OR (Monthly) Discuss how your screen-free philosophy will translate to household rules`],
          ['Kids are Happy/Healthy', 'Locked',
            `(Daily) Enforce strict bedtime routine OR (Weekly) Take them on nature walk OR (Daily) Diet primarily of whole, unprocessed foods OR (Daily) Standardize household meals to completely eliminate processed sugars OR (Annually) Expose them to different cultures through your frequent global travels OR (Daily) Limit passive screen time strictly to encourage physical world engagement`],
        ], true),
      ],
    },
    {
      id: 'f4', number: 4, name: 'Business & Wealth',
      rooms: [
        mkRoom('f4', 'A', 'Strategy & Action', 'Map', [
          ['Strategy & Game Selection', 'Big Missions',
            `(Weekly) Block 90 mins zero-distraction think time OR (Monthly) Read geopolitical case study OR (Daily) Write one paragraph challenging core business thesis OR (Annually) Write out the 3-year plan for BagOfAl to ensure the market cap supports your 10-year goal OR (Monthly) Analyze competitor blind spots in the Generative Al tooling space OR (Monthly) Evaluate the specific global labor markets to align with your international relocation plans`],
          ['Risk-Taker', 'Big Missions',
            `(Monthly) Launch small experiment where failure is probable OR (Weekly) Make one ask with 90% chance of rejection OR (Daily) Pitch idea before completely refined OR (Daily) Allocate 10% of your coding time to high-risk experimental Al workflows OR (Monthly) Pitch your webinar ideas to larger audiences to normalize rejection OR (Monthly) Form a mastermind group with peers attempting similar bold relocation moves`],
          ['Massive Action', 'Big Missions',
            `(Daily) Complete #1 task before checking messages OR (Weekly) Strict Sunday review to map deliverables OR (Daily) 20-minute visual timer for procrastinated task OR (Daily) Ship your Python scripts at 80% perfection rather than obsessing over formatting OR (Daily) Utilize your 9-4-2-1 schedule to execute 1-day sprints consistently OR (Monthly) Publicly commit to your next software launch date to force execution`],
        ]),
        mkRoom('f4', 'B', 'Technology & AI', 'Bot', [
          ['Deploying Tech', 'Big Missions',
            `(Monthly) Fully automate one manual task OR (Weekly) Test one new no-code tool OR (Daily) Note down repetitive copy-paste action OR (Monthly) Map out the operational workflows for Nexus HQ to identify automation points OR (Quarterly) Audit your tech subscriptions quarterly to ensure lean operations OR (Monthly) Implement a custom internal KPI dashboard for tracking metrics automatically`],
          ['Great in AI', 'Big Missions',
            `(Weekly) 1 hour actively prompting new Al model OR (Daily) Read one Al research paper OR (Weekly) Build small internal tool using new LLM API OR (Daily) Spend 30 mins daily testing new models to refine your Al-Native SaaS architecture OR (Weekly) Master prompt engineering frameworks specifically for code generation OR (Weekly) Use Al to automate the creation of your meetup descriptions and marketing copy`],
          ['Cyber Security', 'Big Missions',
            `(Weekly) Review login activity across critical accounts OR (Monthly) Update master passwords and cycle 2FA OR (Quarterly) Run simulated phishing attack on team OR (Daily) Enforce a strict protocol for accessing your banking and credit card data OR (Monthly) Audit your Python codebases explicitly for common vulnerabilities OR (Quarterly) Set up immutable, offline backups for all personal and business data`],
        ]),
        mkRoom('f4', 'C', 'Sales & Marketing', 'Megaphone', [
          ['Marketing & Sales', 'Big Missions',
            `(Daily) Write one piece of persuasive copy OR (Weekly) Reverse-engineer successful sales funnel OR (Weekly) Practice pitch out loud, recording audio OR (Monthly) Build a high-converting landing page for your next virtual webinar OR (Bi-weekly) Run A/B tests on all ad creatives targeting the Al SaaS niche OR (Weekly) Practice objection-handling frameworks specifically tailored for enterprise software sales`],
          ['Creating Leverage', 'Big Missions',
            `(Weekly) Record piece of evergreen media OR (Daily) Write script to automate mundane task OR (Monthly) Deploy capital into asymmetric bet requiring zero maintenance OR (Weekly) Audit your daily tasks and delegate the bottom 80% to focus purely on coding and strategy OR (Monthly) Build proprietary Python software to eliminate manual operations entirely OR (Monthly) Partner with creators who have distribution but lack the tech infrastructure you possess`],
        ]),
        mkRoom('f4', 'D', 'Companies & Investing', 'Lock', [
          ['Great in Business', 'Big Missions',
            `(Weekly) Talk to potential customer purely to listen OR (Daily) Study successful creator's acquisition strategy OR (Weekly) Audit competitor's funnel step-by-step OR (Weekly) Talk to 5 target SaaS users every single week without exception OR (Monthly) Study the unit economics of successful tech companies to model your pricing OR (Weekly) Implement a strict weekly churn-analysis protocol to focus relentlessly on retention`],
          ['Multiple Businesses', 'Big Missions',
            `(Weekly) Document one operational SOP OR (Monthly) Validate one completely new business idea OR (Daily) Empower employee to solve a problem without input OR (Monthly) Build the MVP for your second venture utilizing your existing no-code infrastructure OR (Monthly) Cross-promote your new tools to the audience gained from your webinars OR (Monthly) Set up a holding company structure for tax compartmentalization prior to relocating`],
          ['Capital at Company', 'Autopilot Bots',
            `(Monthly) Review P&L to cut unnecessary expense OR (Weekly) Model a new pricing tier OR (Quarterly) Audit and cull unused SaaS subscriptions OR (Monthly) Build a strict 12-month runway model in your spreadsheet tools OR (Weekly) Implement a weekly cash flow review directly into your Sunday routines OR (Monthly) Optimize pricing models for your SaaS products based on LTV calculations`],
          ['Great in Investment', 'Autopilot Bots',
            `(Weekly) Read deep-dive analysis on a trend OR (Weekly) Track specific market index OR (Monthly) Rebalance portfolio to match target risk ratios OR (Monthly) Set up automatic SIPs to channel revenue directly into global index funds OR (Monthly) Track and maximize your credit card reward points strictly for travel upgrades OR (Daily) Avoid speculative day trading entirely; focus purely on long-term compounding`],
        ]),
      ],
    },
    {
      id: 'f5', number: 5, name: 'Rewards & Giving Back',
      rooms: [
        mkRoom('f5', 'A', 'Self-Image & Confidence', 'Sparkles', [
          ['Much Better Looking', 'Autopilot Bots',
            `(Daily) Adhere to strict morning/night grooming routine OR (Monthly) Upgrade wardrobe item to tailored piece OR (Daily) Apply high-quality SPF every morning without fail OR (Monthly) Audit your travel wardrobe to ensure your one-bag system remains stylish and minimalist OR (Weekly) Maintain excellent posture through the core workouts you track weekly OR (Monthly) Find a highly skilled barber and visit consistently to maintain a sharp appearance`],
          ['Being Courageous', 'Daily Power-Up',
            `(Daily) Lean into a task that makes you uncomfortable OR (Weekly) Publicly share a work-in-progress OR (Daily) Ask a question in a room where you are the least knowledgeable OR (Monthly) Reframe fear as an indicator of growth when applying for international visas OR (Weekly) Speak up in meetings when you have a dissenting architectural opinion OR (Daily) Have difficult conversations immediately rather than avoiding them`],
          ['High Self-Confidence', 'Daily Power-Up',
            `(Daily) Document one difficult thing successfully handled today OR (Weekly) Take decisive action in business without asking for validation OR (Daily) Practice strong, assertive body language before meetings OR (Daily) Stop seeking external validation for your software engineering choices OR (Monthly) Intentionally network with top performers in Bengaluru until you feel you belong OR (Weekly) Review your document of wins during moments of doubt to crush imposter syndrome`],
          ['Happy Person', 'Daily Power-Up',
            `(Daily) Write 3 specific things you are grateful for OR (Daily) Send text expressing genuine appreciation OR (Weekly) Reflect on past hardship and how it led to a current blessing OR (Annually) Invest aggressively in travel experiences to Northeast India over material possessions OR (Daily) Focus entirely on the present moment during your daily unplugged blocks OR (Daily) Celebrate small daily coding wins actively instead of waiting for massive launches`],
        ]),
        mkRoom('f5', 'B', 'Personal Brand', 'Trophy', [
          ['Storyteller', 'Big Missions',
            `(Weekly) Write past story using Hook Conflict Resolution framework OR (Daily) Use an analogy instead of jargon OR (Weekly) Tell a 2-minute structured story at a social gathering OR (Monthly) Collect personal anecdotes from your travels and log them in Nexus HQ OR (Monthly) Use metaphors to explain complex generative Al concepts during your webinars OR (Monthly) Deconstruct the scripts of top-performing tech talks to learn pacing`],
          ['Writer', 'Big Missions',
            `(Daily) Write 500 words without editing OR (Weekly) Rewrite a complex idea so a 10-year-old understands it OR (Daily) Copy down one paragraph from a great author to internalize rhythm OR (Weekly) Edit ruthlessly to remove complex technical jargon from your public essays OR (Weekly) Publish essays publicly to get real-world feedback on your SaaS frameworks OR (Weekly) Read your writing out loud to verify the rhythm of your newsletters`],
          ['Speaking', 'Big Missions',
            `(Daily) Record a 2-minute video explaining a concept OR (Weekly) Study the delivery style of top creators OR (Weekly) Practice speaking for 3 minutes on a random topic with zero filler words OR (Monthly) Record yourself delivering webinar content and critique the playback to improve OR (Weekly) Eliminate filler words when answering live Q&A sessions on technology OR (Weekly) Practice speaking slowly and using deliberate pauses to command attention`],
          ['Personal Brand', 'Big Missions',
            `(Weekly) Publish one high-quality essay/video OR (Daily) Post one raw learning from the day OR (Weekly) Engage thoughtfully with 5 posts from other creators in your niche OR (Weekly) Document your SaaS journey by actively building in public OR (Monthly) Choose 1-2 platforms and enforce a strict content publishing schedule OR (Monthly) Ensure your visual branding is clean and professional across all digital touchpoints`],
          ['Wrote a Book', 'Big Missions',
            `(Daily) Block 30 minutes to write your manuscript OR (Weekly) Synthesize reading notes into a database OR (Weekly) Write one chapter outline without editing yourself OR (Monthly) Compile your existing technical essays and OS notes as foundational material OR (Daily) Block out 30-60 minutes of non-negotiable writing time daily OR (Annually) Hire a professional editor to refine the final manuscript`],
          ['Great at Design', 'Big Missions',
            `(Daily) Deconstruct one beautiful interface to understand why it works OR (Weekly) Recreate a top-tier app screen pixel-for-pixel in Figma OR (Monthly) Read an essay strictly on typography or color theory OR (Weekly) Learn Figma deeply to prototype your SaaS platforms before writing code OR (Monthly) Curate a digital mood board to define the aesthetic of BagOfAI OR (Monthly) Solicit harsh feedback on your UI layouts from actual designers to improve quickly`],
        ]),
        mkRoom('f5', 'C', 'Travel & Freedom', 'Globe', [
          ['Massive Liquid Wealth', 'Autopilot Bots',
            `(Weekly) Auto-transfer funds to investments OR (Monthly) Brainstorm one high-ticket upsell OR (Daily) Log every dollar spent in a zero-based budget OR (Weekly) Continuously upskill in python and Al architecture to increase your hourly market value OR (Monthly) Automate a minimum 20% deduction from all incoming revenue directly into investments OR (Annually) Consult a fiduciary to optimize the holding company structures you plan to build`],
          ['Global Citizen', 'Autopilot Bots',
            `(Monthly) Execute one step toward a new visa or offshore structure OR (Weekly) Read up on real estate in target hubs OR (Monthly) Network with one expat living in your target destination OR (Monthly) Research specific visa and residency pathways for hubs like Singapore or Australia OR (Monthly) Understand the NRI tax implications for multi-country living before relocating OR (Annually) Structure your tech business legally to allow for complete remote global operation`],
          ['Frequent Traveller', 'Autopilot Bots',
            `(Monthly) Auto-transfer money into a travel fund OR (Weekly) Map out an itinerary for a new destination OR (Weekly) Review flight/credit card points strategies to optimize upcoming trips OR (Monthly) Maintain your minimalist packing list using your 40L backpack for ultimate mobility OR (Monthly) Outline a bucket list of destinations extending beyond your recent Northeast India trips OR (Monthly) Optimize your credit cards for maximum air miles and lounge access across borders`],
        ]),
        mkRoom('f5', 'D', 'Helping Others', 'HeartHandshake', [
          ['Helped People in Society', 'Autopilot Bots',
            `(Monthly) Automate a financial donation OR (Weekly) Spend 30 minutes guiding younger wannapreneurs OR (Quarterly) Volunteer a weekend to build or consult for a local NGO OR (Monthly) Build SaaS products that genuinely solve problems rather than just chasing profit OR (Annually) Set up a scholarship or grant to explicitly support students pursuing degrees in robotics OR (Weekly) Use your growing platform to amplify underrepresented tech voices`],
        ]),
      ],
    },
  ],
};

export default INITIAL_BLUEPRINT;
