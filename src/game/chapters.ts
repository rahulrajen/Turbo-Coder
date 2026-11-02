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
      { ...COACH, text: "Welcome to Garage Town! I'm Coach Gearheart. A car does only what you tell it, one command at a time, in order." },
      { ...NICK, text: 'Ha! My car is the fastest. Catch me at the finish line, if you can!' },
      { ...COACH, text: "Don't listen to him. Tell your car where to go and show him what you can do!" },
    ],
    learn: {
      title: 'A program is a list of commands',
      text: 'The car does your commands from top to bottom. forward() drives one step. left() and right() turn the car.',
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
      { ...COACH, text: "Welcome to Loop City! The roads here are LONG. Typing 'forward' fifty times will make you very tired." },
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
    concept: 'Choices (if / else)',
    scenery: ['🌵', '🪨', '🐪', '☀️'],
    intro: [
      { ...GLITCH, text: "Hehehe! I'm Dr. Glitch! I've mixed up the desert roads. Your car won't know which way to turn!" },
      { ...COACH, text: "Give your car eyes! A sensor (the car's eyes) looks at the road. Then IF something is true, the car can choose what to do." },
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
      { ...COACH, text: "Join questions with && (AND), || (OR) and ! (NOT). Compare numbers with > and <. Now you can think like a real coder!" },
      { ...NICK, text: "Cones? I'll jump right over them! ...Oops, I'm stuck. Don't tell anyone." },
    ],
    learn: {
      title: 'Joining conditions',
      text: '&& means BOTH must be true. || means at least ONE is true. ! changes true to false. distanceAhead() > 0 compares numbers.',
      code: 'if (roadLeft() && !roadRight()) {\n  left();\n}\nif (distanceAhead() > 0) {\n  forward();\n}',
    },
  },
  {
    id: 5,
    name: 'Number Mountain',
    emoji: '⛰️',
    world: 'mountain',
    concept: 'Variables & maths',
    scenery: ['⛰️', '🪨', '🌲', '🐐'],
    intro: [
      { ...COACH, text: 'Up on Number Mountain, signs show numbers. A VARIABLE is a box with a name. It keeps a number for you!' },
      { ...COACH, text: 'You can put a number in a box, read it, add to it and do maths with it.' },
      { ...GLITCH, text: "My tricks are changing the numbers! Can you keep up?" },
    ],
    learn: {
      title: 'Variables are boxes with names',
      text: 'let makes a new box. n += 1 adds 1 to it. You can use a box anywhere you use a number, even inside maths.',
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
      { ...COACH, text: 'Welcome to the Function Factory! Here we make our OWN commands.' },
      { ...COACH, text: "Write a group of commands once and give it a name. Then call that name any time you want. No more copy and paste!" },
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
    concept: 'Function inputs (parameters)',
    scenery: ['⚓', '🚢', '🐚', '🦀'],
    intro: [
      { ...COACH, text: 'Hello, sailor! At Parameter Port our commands can take INPUTS. You can tell a function how many steps to drive!' },
      { ...NICK, text: 'Inputs? Outputs? I only know "go go go!"' },
      { ...COACH, text: 'A parameter is a box that gets filled when you call the function: go(3) puts 3 into the box.' },
    ],
    learn: {
      title: 'Parameters are function inputs',
      text: 'Put a name in the ( ) when you make the function. When you call it, give it a value, like a number, to use.',
      code: 'function go(n) {\n  for (let i = 0; i < n; i++) {\n    forward();\n  }\n}\ngo(3);\nright();\ngo(5);',
    },
  },
  {
    id: 8,
    name: 'List Sea',
    emoji: '🐠',
    world: 'lagoon',
    concept: 'Lists & objects',
    scenery: ['🐠', '🪸', '🐙', '🐚'],
    intro: [
      { ...COACH, text: "Splash! Under the sea, treasure maps are LISTS. A list keeps many things in order inside one box." },
      { ...COACH, text: 'A for...of loop goes to every item in a list, one by one. Objects keep facts with names together too!' },
    ],
    learn: {
      title: 'Lists (arrays) and objects',
      text: 'A list looks like [3, 2, 4]. for (const x of list) goes to each item. An object like {n: 2, t: "R"} has parts with names: stop.n',
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
      { ...COACH, text: "We've flown into space! Locked gates 🚪 open only when you SAY the secret word." },
      { ...COACH, text: 'Words in code are called STRINGS. They go between quote marks. Join them with +. EVENTS run code when something happens, like passing a sign!' },
      { ...GLITCH, text: "Hahaha! You can never guess my passwords!" },
    ],
    learn: {
      title: 'Strings, say() and events',
      text: 'say("hi") makes the car talk. You can join strings: "tur" + "bo". onSign runs your code every time the car passes a road sign.',
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
      { ...GLITCH, text: "You came to MY castle! I've filled it with BUGS. Broken code everywhere! You can never fix them all!" },
      { ...COACH, text: 'A bug is a mistake in code. Fixing bugs is called DEBUGGING. Read the code, find the problem, fix it!' },
      { ...COACH, text: "One more trick: a function that calls ITSELF is called recursion. Use everything you have learnt. All the best!" },
    ],
    learn: {
      title: 'Debugging and recursion',
      text: 'Debugging: run the code, see what goes wrong, change one thing, try again. Recursion: a function calls itself until a rule says stop.',
      code: 'function dash(n) {\n  if (n > 0) {\n    forward();\n    dash(n - 1);\n  }\n}\ndash(5);',
    },
  },
];

/** The world a level belongs to. */
export const chapterFor = (level: { chapter: number }) => CHAPTERS[level.chapter - 1];
