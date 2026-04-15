export const EP_COSTS = {
  'Daily Power-Up': 2,
  'Autopilot Bots': 2,
  'Big Missions': 4,
  'Locked': 0,
};

function q(str, goalId) {
  return str.split(' OR ').map((part, idx) => {
    const match = part.trim().match(/^(.+?)\s*\((Daily|Weekly|Monthly|Quarterly)\)$/);
    return {
      id: `${goalId}-q${idx}`,
      text: match ? match[1].trim() : part.trim(),
      frequency: match ? match[2] : 'Daily',
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
      id: 'f0', number: 0, name: 'The Secret Basement',
      rooms: [
        mkRoom('f0', 'A', 'The Body Engine', 'Dumbbell', [
          ['Super Strong Body', 'Daily Power-Up', '45-min training (Daily) OR hit protein targets (Daily)'],
          ['Full Battery Sleep', 'Daily Power-Up', '15 mins sunlight (Daily) OR stop caffeine by 2PM (Daily)'],
          ['Playing Sports', 'Autopilot Bots', 'Deliberate drill session (Weekly) OR play better opponent (Monthly)'],
        ]),
        mkRoom('f0', 'B', 'The Shield', 'Shield', [
          ['Calm Mind & Quiet Time', 'Daily Power-Up', '15 mins unplugged (Daily) OR 5-min brain dump (Daily)'],
          ['Superhero First Aid', 'Autopilot Bots', 'Review trauma kit (Monthly) OR mental fire drill (Quarterly)'],
        ]),
      ],
    },
    {
      id: 'f1', number: 1, name: 'The Command Center',
      rooms: [
        mkRoom('f1', 'A', 'The Time Machine', 'Clock', [
          ['Clean Desk, Clean Room', 'Daily Power-Up', '10-min closing shift (Daily) OR process mail (Weekly)'],
          ['The Master Schedule', 'Daily Power-Up', 'Plan tomorrow tonight (Daily) OR hardest task first (Daily)'],
          ['Always Being on Time', 'Daily Power-Up', 'Fake deadline 15 mins early (Daily) OR prep clothes (Daily)'],
          ['Saying No to Distractions', 'Daily Power-Up', 'Say no to one request (Weekly) OR delete a task (Daily)'],
        ]),
        mkRoom('f1', 'B', 'The Laser Beam', 'Zap', [
          ['Laser Focus', 'Daily Power-Up', 'Phone in other room (Daily) OR use website blocker (Daily)'],
          ['Making Good Rules', 'Daily Power-Up', 'Convert frustration to rule (Weekly) OR audit OS (Monthly)'],
        ]),
        mkRoom('f1', 'C', 'The Armor', 'ShieldCheck', [
          ['Waiting for the Reward', 'Daily Power-Up', 'Wait 5 mins before urge (Daily) OR 1-min cold shower (Weekly)'],
          ['Bouncing Back from Mistakes', 'Daily Power-Up', 'Objective failure review (Monthly) OR reframe annoyance (Daily)'],
          ['Being Nice to Yourself', 'Daily Power-Up', 'Speak to yourself as a friend (Daily) OR mirror affirmation (Daily)'],
          ['Showing Up Every Day', 'Daily Power-Up', 'Never Miss Twice rule (Daily) OR minimum viable action (Daily)'],
        ]),
      ],
    },
    {
      id: 'f2', number: 2, name: 'The Brain Lab',
      rooms: [
        mkRoom('f2', 'A', 'The Library', 'BookOpen', [
          ['Read Lots of Books', 'Autopilot Bots', 'Read 10 pages before sleep (Daily) OR 20 mins in morning (Daily)'],
          ['Learning Everything Polymath', 'Big Missions', 'Consume unrelated documentary (Weekly) OR read obscure newsletter (Weekly)'],
          ['Building with Hands Craft', 'Autopilot Bots', '2 hours in workshop (Weekly) OR 15 mins mechanical practice (Daily)'],
        ]),
        mkRoom('f2', 'B', 'The Puzzle Room', 'Cpu', [
          ['Learning the Rules Mental Models', 'Big Missions', 'Apply new model to problem (Weekly) OR note cognitive bias (Daily)'],
          ['Thinking for Yourself', 'Daily Power-Up', 'Outline on paper before AI (Daily) OR logic puzzle (Weekly)'],
          ["Figuring Out Your Why", 'Autopilot Bots', 'Read classic philosophy (Weekly) OR write day meaning (Daily)'],
        ]),
        mkRoom('f2', 'C', 'X-Ray Vision', 'Eye', [
          ['How People Think', 'Big Missions', 'Read behavioral case study (Weekly) OR observe user interaction (Daily)'],
          ['How Money Works', 'Big Missions', 'Watch macro breakdown (Weekly) OR read financial paper (Daily)'],
          ['Thinking Outside the Box', 'Big Missions', 'Write 10 ideas (Daily) OR combine unrelated concepts (Weekly)'],
        ]),
        mkRoom('f2', 'D', 'The Magic 8-Ball', 'Target', [
          ['Making Smart Guesses', 'Big Missions', 'Write probability before acting (Daily) OR seek opposing view (Weekly)'],
          ['Being Right When Others Wrong', 'Big Missions', 'Write down belief you disagree with (Weekly) OR admit wrong bet (Monthly)'],
        ]),
      ],
    },
    {
      id: 'f3', number: 3, name: 'The Team Lounge',
      rooms: [
        mkRoom('f3', 'A', 'The Inner Circle', 'Heart', [
          ['Fun Time with Nikita', 'Daily Power-Up', 'Phone-free date night (Weekly) OR chat over morning coffee (Daily)'],
          ['Nikita is Happy', 'Autopilot Bots', 'Ask how to make day easier (Daily) OR take over stressful chore (Weekly)'],
          ['The Family Anchor', 'Autopilot Bots', 'Call parents or sister (Weekly) OR assist sister with studies (Quarterly)'],
          ['Peaceful Home', 'Autopilot Bots', 'Shared physical activity (Weekly) OR screen-free dinner (Monthly)'],
        ]),
        mkRoom('f3', 'B', 'The Friendship Club', 'Users', [
          ['Making Great Friends', 'Autopilot Bots', 'Send unprompted message (Weekly) OR host small dinner (Monthly)'],
          ['Knowing Helpful People', 'Big Missions', 'Introduce two people (Monthly) OR send cold compliment email (Weekly)'],
          ['Being Funny and Charismatic', 'Autopilot Bots', 'Watch elite stand-up (Weekly) OR practice callbacks (Weekly)'],
        ]),
        mkRoom('f3', 'C', 'The Hero Academy', 'Award', [
          ['Really Listening to Others', 'Daily Power-Up', 'Listen purely to understand (Daily) OR ask how that made them feel (Daily)'],
          ['Reading Faces and Solving Fights', 'Big Missions', 'Identify underlying fear (Daily) OR practice tactical empathy (Monthly)'],
          ['Picking the Best Players', 'Big Missions', 'Connect with talented person (Monthly) OR refine onboarding (Weekly)'],
          ['Being a Great Captain', 'Big Missions', 'Ask what is blocking team (Weekly) OR praise publicly (Daily)'],
          ['Helping Your Team Grow', 'Big Missions', 'Give constructive feedback (Weekly) OR host career 1-on-1 (Monthly)'],
        ]),
        mkRoom('f3', 'D', 'The Golden Badge', 'Star', [
          ['Always Telling Truth', 'Daily Power-Up', 'Never promise if unsure (Daily) OR admit mistake instantly (Daily)'],
          ["Earning Everyone's Trust", 'Autopilot Bots', 'Refuse clickbait (Daily) OR share genuine failure (Weekly)'],
        ]),
        mkRoom('f3', 'E', 'Future Sidekicks', 'Baby', [
          ['Teaching Good Rules', 'Locked', 'Discuss parenting frameworks (Weekly) OR define family constitution (Monthly)'],
          ['Happy Kids', 'Locked', 'Enforce bedtime routine (Daily) OR nature walk (Weekly)'],
        ], true),
      ],
    },
    {
      id: 'f4', number: 4, name: 'The Invention Factory',
      rooms: [
        mkRoom('f4', 'A', 'The Master Plan', 'Map', [
          ['Picking the Right Game', 'Big Missions', '90 mins think time (Weekly) OR challenge core thesis (Daily)'],
          ['Taking Smart Risks', 'Big Missions', 'Launch small experiment (Monthly) OR pitch unrefined idea (Daily)'],
          ['Getting Things Done Fast', 'Big Missions', 'Complete task 1 before messages (Daily) OR 20-min visual timer (Daily)'],
        ]),
        mkRoom('f4', 'B', 'The Robot Workshop', 'Bot', [
          ['Using Computers for Boring Work', 'Big Missions', 'Automate manual task (Monthly) OR test no-code tool (Weekly)'],
          ['Becoming an AI Wizard', 'Big Missions', '1 hour prompting new AI model (Weekly) OR read AI paper (Daily)'],
          ['Digital Shield Security', 'Big Missions', 'Review login activity (Weekly) OR update master passwords (Monthly)'],
        ]),
        mkRoom('f4', 'C', 'The Megaphone', 'Megaphone', [
          ['Selling and Sharing Ideas', 'Big Missions', 'Write persuasive copy (Daily) OR practice pitch out loud (Weekly)'],
          ['Using Magic Multipliers', 'Big Missions', 'Record evergreen media (Weekly) OR write automation script (Daily)'],
          ['Running a Great Business', 'Big Missions', 'Talk to customer to listen (Weekly) OR study acquisition strategy (Daily)'],
        ]),
        mkRoom('f4', 'D', 'The Treasure Vault', 'Lock', [
          ['Running Multiple Businesses', 'Big Missions', 'Document operational SOP (Weekly) OR empower employee (Daily)'],
          ['Managing Company Piggy Bank', 'Autopilot Bots', 'Review P&L to cut expense (Monthly) OR model pricing tier (Weekly)'],
          ['Planting Money Seeds', 'Autopilot Bots', 'Read deep-dive trend analysis (Weekly) OR track market index (Weekly)'],
        ]),
      ],
    },
    {
      id: 'f5', number: 5, name: 'The Trophy Room',
      rooms: [
        mkRoom('f5', 'A', 'The Superhero Suit', 'Sparkles', [
          ['Looking Great', 'Autopilot Bots', 'Adhere to grooming routine (Daily) OR apply high-quality SPF (Daily)'],
          ['Being Brave', 'Daily Power-Up', 'Lean into uncomfortable task (Daily) OR share work-in-progress (Weekly)'],
          ['High Self-Confidence', 'Daily Power-Up', 'Document difficult thing handled (Daily) OR decisive action (Weekly)'],
          ['Happy Person', 'Daily Power-Up', 'Write 3 gratitudes (Daily) OR send appreciation text (Daily)'],
        ]),
        mkRoom('f5', 'B', 'The Hall of Fame', 'Trophy', [
          ['Great Storyteller', 'Big Missions', 'Write past story using framework (Weekly) OR use analogy (Daily)'],
          ['Great Writer', 'Big Missions', 'Write 500 words without editing (Daily) OR rewrite complex idea simply (Weekly)'],
          ['Speaking to the World', 'Big Missions', 'Record 2-min concept video (Daily) OR practice speaking without filler words (Weekly)'],
          ['Personal Brand', 'Big Missions', 'Publish high-quality essay (Weekly) OR post raw learning (Daily)'],
          ['Wrote a Book', 'Big Missions', 'Block 30 mins manuscript writing (Daily) OR synthesize reading notes (Weekly)'],
          ['Designing Beautiful Things', 'Big Missions', 'Deconstruct beautiful UI (Daily) OR recreate app screen pixel-for-pixel (Weekly)'],
        ]),
        mkRoom('f5', 'C', 'The Magic Carpet', 'Globe', [
          ['Massive Liquid Wealth', 'Autopilot Bots', 'Auto-transfer funds to investments (Weekly) OR log budget (Daily)'],
          ['Global Citizen', 'Autopilot Bots', 'Execute step toward visa (Monthly) OR read real estate in target hub (Weekly)'],
          ['Frequent Traveller', 'Autopilot Bots', 'Auto-transfer to travel fund (Monthly) OR map itinerary (Weekly)'],
        ]),
        mkRoom('f5', 'D', 'The Heart of Gold', 'HeartHandshake', [
          ['Helping People in Society', 'Autopilot Bots', 'Automate financial donation (Monthly) OR mentor younger builder (Weekly)'],
        ]),
      ],
    },
  ],
};

export default INITIAL_BLUEPRINT;
