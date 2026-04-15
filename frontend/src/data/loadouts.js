// Smart Loadout preset quest IDs
// ID format: {floorId}-r{roomKey}-g{goalIndex}-q{questIndex}
// EP costs: Daily Power-Up = 2, Autopilot Bots = 2, Big Missions = 4

export const FOUNDER_GRIND = {
  id: 'founder',
  label: 'FOUNDER GRIND',
  description: 'Peak execution — focus, leverage, output',
  totalEP: 16,
  questIds: [
    'f1-rA-g1-q0',  // Plan tomorrow tonight          (Daily,  2EP)
    'f1-rA-g2-q0',  // Fake deadline 15 mins early    (Daily,  2EP)
    'f1-rB-g0-q0',  // Phone in other room             (Daily,  2EP)
    'f2-rA-g0-q0',  // Read 10 pages before sleep     (Daily,  2EP)
    'f4-rA-g2-q0',  // Complete task 1 before messages (Daily,  4EP)
    'f4-rC-g0-q0',  // Write persuasive copy           (Daily,  4EP)
  ],
};

export const RECOVERY_WEEK = {
  id: 'recovery',
  label: 'RECOVERY WEEK',
  description: 'Recharge mode — body, mind, relationships',
  totalEP: 12,
  questIds: [
    'f0-rA-g0-q0',  // 45-min training                 (Daily,   2EP)
    'f0-rA-g1-q0',  // 15 mins sunlight                 (Daily,   2EP)
    'f0-rB-g0-q0',  // 15 mins unplugged                (Daily,   2EP)
    'f3-rA-g0-q0',  // Phone-free date night            (Weekly,  2EP)
    'f5-rA-g3-q0',  // Write 3 gratitudes               (Daily,   2EP)
    'f1-rC-g2-q0',  // Speak to yourself as a friend    (Daily,   2EP)
  ],
};
