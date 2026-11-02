export interface Chapter {
  id: number;
  name: string;
  emoji: string;
  world: string;
  concept: string;
  scenery: string[];
  intro: { who: string; emoji: string; text: string }[];
  learn: { title: string; text: string; code: string };
}

const COACH = { who: 'Coach Gearheart', emoji: '🤖' };
const NICK = { who: 'Nitro Nick', emoji: '🦊' };
const GLITCH = { who: 'Dr. Glitch', emoji: '👾' };

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: 'Garage Town',
    emoji: '🏠',
    world: 'meadow',
    concept: 'Commands',
    scenery: ['🌳', '🌼', '🌲', '🐑'],
    intro: [
      { ...COACH, text: "Welcome to Garage Town, champ! I'm Coach Gearheart. A car only does what you tell it, one command at a time, in order." },
      { ...NICK, text: 'Ha! My car is the fastest. Try to catch me at the finish line, rookie!' },
      { ...COACH, text: 'Ignore him. Tell your car where to go and show him what you can do!' },
    ],
    learn: {
      title: 'A program is a list of commands',
      text: 'The car runs your commands from top to bottom. forward() drives one square. left() and right() turn the car.',
      code: 'forward();\nforward();\nleft();\nforward();',
    },
  },
  {
    id: 2,
    name: 'Loop City',
    emoji: '🌃',
    world: 'city',
    concept: 'Loops',
    scenery: ['🏢', '🏬', '🏙️', '🚦'],
    intro: [
      { ...COACH, text: "Welcome to Loop City! The roads here are LONG. Typing 'forward' fifty times would be exhausting." },
      { ...COACH, text: 'A LOOP repeats commands for you. Tell the car how many times and it does the rest!' },
      { ...NICK, text: "Loops? I just drive fast. Hmph." },
    ],
    learn: {
      title: 'Loops repeat things',
      text: 'A for loop runs the commands inside { } again and again. The number says how many times.',
      code: 'for (let i = 0; i < 5; i++) {\n  forward();\n}',
    },
  },
  {
    id: 3,
    name: 'Sandy Desert',
    emoji: '🏜️',
    world: 'desert',
    concept: 'Decisions (if / else)',
    scenery: ['🌵', '🪨', '🐪', '☀️'],
    intro: [
      { ...GLITCH, text: "Hehehe! I'm Dr. Glitch! I've scrambled the desert roads. Your car won't know which way to turn!" },
      { ...COACH, text: 'Give your car eyes! Sensors let it look at the road, then IF something is true it can decide what to do.' },
    ],
    learn: {
      title: 'if / else and while',
      text: 'if runs commands only when something is true. else runs when it is not. while keeps going until the answer changes.',
      code: 'while (!atFinish()) {\n  if (roadAhead()) {\n    forward();\n  } else {\n    right();\n  }\n}',
    },
  },
  {
    id: 4,
    name: 'Cone Jungle',
    emoji: '🌴',
    world: 'jungle',
    concept: 'Conditions (and / or / not)',
    scenery: ['🌴', '🦜', '🌿', '🐒'],
    intro: [
      { ...COACH, text: 'The jungle is full of traffic cones 🚧 and tricky corners. We need smarter questions!' },
      { ...COACH, text: "Combine questions with && (AND), || (OR) and ! (NOT). Compare numbers with > and <. Now you're a real thinker!" },
      { ...NICK, text: "Cones? I'll zoom right over them! ...Oops, I'm stuck. Don't tell anyone." },
    ],
    learn: {
      title: 'Combining conditions',
      text: '&& means BOTH must be true. || means at least ONE is true. ! flips true to false. distanceAhead() > 0 compares numbers.',
      code: 'if (roadLeft() && !roadRight()) {\n  left();\n}\nif (distanceAhead() > 0) {\n  forward();\n}',
    },
  },
  {
    id: 5,
    name: 'Number Mountain',
    emoji: '⛰️',
    world: 'mountain',
    concept: 'Variables & math',
    scenery: ['⛰️', '🪨', '🌲', '🐐'],
    intro: [
      { ...COACH, text: 'Up on Number Mountain, signs show numbers. A VARIABLE is a labelled box that remembers a number for you!' },
      { ...COACH, text: 'You can put a number in a box, read it, add to it and do math with it.' },
      { ...GLITCH, text: "My glitch is changing the numbers! Can you keep up?" },
    ],
    learn: {
      title: 'Variables are labelled boxes',
      text: 'let makes a new box. n += 1 adds to it. You can use a box anywhere you would use a number, even inside math.',
      code: 'let steps = 4;\nfor (let i = 0; i < steps; i++) {\n  forward();\n}\nsteps += 1;',
    },
  },
  {
    id: 6,
    name: 'Function Factory',
    emoji: '🏭',
    world: 'factory',
    concept: 'Functions',
    scenery: ['⚙️', '🏭', '🔧', '🛠️'],
    intro: [
      { ...COACH, text: 'Welcome to the Function Factory! Here we build our OWN commands.' },
      { ...COACH, text: "Write a group of commands once, give it a name, then call that name whenever you want. No more copy and paste!" },
    ],
    learn: {
      title: 'Make your own command',
      text: 'function gives a group of commands a name. Write it once and use it many times by calling its name.',
      code: 'function dodge() {\n  forward();\n  right();\n  forward();\n  left();\n}\ndodge();\ndodge();',
    },
  },
  {
    id: 7,
    name: 'Parameter Port',
    emoji: '⚓',
    world: 'harbor',
    concept: 'Function parameters',
    scenery: ['⚓', '🚢', '🐚', '🦀'],
    intro: [
      { ...COACH, text: 'Ahoy! At Parameter Port our commands can take INPUTS. A function can be told how many steps to drive!' },
      { ...NICK, text: 'Inputs? Outputs? I only know "go go go!"' },
      { ...COACH, text: 'A parameter is a box that gets filled when you call the function: go(3) puts 3 into the box.' },
    ],
    learn: {
      title: 'Parameters give functions inputs',
      text: 'Put a name in the ( ) when you make the function. When you call it, give it a value to use.',
      code: 'function go(n) {\n  for (let i = 0; i < n; i++) {\n    forward();\n  }\n}\ngo(3);\nright();\ngo(5);',
    },
  },
  {
    id: 8,
    name: 'List Lagoon',
    emoji: '🐠',
    world: 'lagoon',
    concept: 'Lists & objects',
    scenery: ['🐠', '🪸', '🐙', '🐚'],
    intro: [
      { ...COACH, text: "Splash! Under the sea, treasure maps are LISTS. A list keeps many things in order inside one box." },
      { ...COACH, text: 'You can visit every item in a list with a for...of loop. Objects keep named facts together too!' },
    ],
    learn: {
      title: 'Lists (arrays) and objects',
      text: 'A list looks like [3, 2, 4]. for (const x of list) visits each item. An object like {n: 2, t: "R"} has named parts: stop.n',
      code: 'const legs = [3, 2, 4];\nfor (const leg of legs) {\n  for (let i = 0; i < leg; i++) {\n    forward();\n  }\n  right();\n}',
    },
  },
  {
    id: 9,
    name: 'Gate Galaxy',
    emoji: '🪐',
    world: 'galaxy',
    concept: 'Strings, events & say',
    scenery: ['⭐', '🪐', '🌙', '🛸'],
    intro: [
      { ...COACH, text: "We've blasted into space! Locked gates 🚪 only open when you SAY the secret word." },
      { ...COACH, text: 'Words in code are called STRINGS and live between quote marks. Join them with +. And EVENTS run code when something happens, like passing a sign!' },
      { ...GLITCH, text: "Mwahaha! You'll never crack my passwords!" },
    ],
    learn: {
      title: 'Strings, say() and events',
      text: 'say("hi") makes the car talk. Strings can be joined: "tur" + "bo". onSign runs your code every time the car passes a road sign.',
      code: 'say("open");\nonSign((sign) => {\n  if (sign === 1) {\n    left();\n  }\n});',
    },
  },
  {
    id: 10,
    name: "Glitch's Castle",
    emoji: '🏰',
    world: 'castle',
    concept: 'Debugging & recursion',
    scenery: ['💀', '🕸️', '🦇', '🏰'],
    intro: [
      { ...GLITCH, text: "You made it to MY castle! I've filled it with BUGS. Broken code everywhere! You'll never fix them all!" },
      { ...COACH, text: 'A bug is a mistake in code. Fixing bugs is called DEBUGGING. Read the code, find the problem, fix it!' },
      { ...COACH, text: "And one more trick: a function that calls ITSELF is called recursion. Use everything you've learned. Good luck, champion!" },
    ],
    learn: {
      title: 'Debugging and recursion',
      text: 'Debugging: run the code, watch what goes wrong, change one thing, try again. Recursion: a function calls itself until a rule says stop.',
      code: 'function dash(n) {\n  if (n > 0) {\n    forward();\n    dash(n - 1);\n  }\n}\ndash(5);',
    },
  },
];

/** The world a level belongs to. */
export const chapterFor = (level: { chapter: number }) => CHAPTERS[level.chapter - 1];
