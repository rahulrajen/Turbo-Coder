import { type Block, type BlockType, type Feature, FUN_TYPES, allBlocks, countBlocks, countCodeLines, featuresOfBlocks, toCode } from './ast';
import type { Dir, Level, Tier } from './engine';
import { type TrackSpec, grow, makeTests } from './variants';
import { type Part, type RouteSpec, buildGrid } from './route';
import {
  DODGE, F, L, R, SMART, all, any, bin, call, chg, cmp, each, fn, fx, honk, iff, mk, no, num, ok, onsign, rep, say, setv, sn, str, v, whl,
} from './dsl';

interface Opts {
  use?: Feature[];
  data?: Record<string, unknown>;
  secret?: string;
  starter?: Block[];
  signs?: Record<number, number>;
  gates?: number[];
}

/** Blocks on offer in a world. The very first levels (straight roads) only offer Drive. */
function toolsFor(ch: number, index: number, ref: Block[]): BlockType[] {
  const turns = allBlocks(ref).some((b) => b.type !== 'forward');
  if (ch === 1 && !turns && index <= 6) return ['forward'];
  const t: BlockType[] = ['forward', 'left', 'right'];
  if (ch >= 2) t.push('repeat');
  if (ch >= 3) t.push('if', 'while');
  if (ch >= 5) t.push('let', 'set', 'change');
  if (ch >= 6) t.push('function', 'call');
  if (ch >= 8) t.push('foreach');
  if (ch >= 9) t.push('say', 'onsign');
  // fun blocks (free, never count against stars) once kids know Drive and turning
  if (ch > 1 || index >= 5) t.push(...FUN_TYPES);
  return t;
}

const DEFAULT_USE: Record<number, Feature[]> = { 2: ['repeat'], 3: ['while'], 4: ['if'], 5: ['let'], 6: ['function'], 7: ['function'], 8: ['foreach'], 9: ['say'] };

type Draft = Omit<Level, 'id' | 'index' | 'boss' | 'tools' | 'tier' | 'tests'> & { route: RouteSpec };

function make(ch: number, title: string, story: string, hint: string, parts: Part[], dir: Dir, ref: Block[], o: Opts): Draft {
  const route: RouteSpec = { dir, parts, signs: o.signs, gates: o.gates };
  const { grid } = buildGrid(route);
  return {
    route,
    chapter: ch,
    title,
    story,
    hint,
    grid,
    startDir: dir,
    ref,
    par: { blocks: countBlocks(ref), lines: countCodeLines(toCode(ref)) },
    use: o.use ?? DEFAULT_USE[ch] ?? [],
    data: o.data ?? {},
    secret: o.secret,
    starter: o.starter,
  };
}

// The first 100 levels (by their original numbers, kept so saved progress can follow them)...
const ORIGINAL: (Draft & { old: number })[] = [];
// ...and the extra levels slotted in after them (after = original number, 0 = start of the world).
const EXTRA: { after: number; draft: Draft }[] = [];

function lv(id: number, title: string, story: string, hint: string, parts: Part[], dir: Dir, ref: Block[], o: Opts = {}) {
  ORIGINAL.push({ ...make(Math.ceil(id / 10), title, story, hint, parts, dir, ref, o), old: id });
}

/** A new level for world `ch`, placed after original level `after` (0 = first in the world). */
function nl(ch: number, after: number, title: string, story: string, hint: string, parts: Part[], ref: Block[], o: Opts & { dir?: Dir } = {}) {
  EXTRA.push({ after, draft: make(ch, title, story, hint, parts, o.dir ?? 1, ref, o) });
}

/** Turns a route into the plain commands that drive it (no loops). */
const seq = (parts: Part[]): Block[] => parts.flatMap((p) => (typeof p === 'number' ? fx(p) : p === 'L' ? [L()] : p === 'R' ? [R()] : DODGE()));
/** Same, but every straight longer than 1 becomes a Repeat. */
const loopy = (parts: Part[]): Block[] =>
  parts.flatMap((p) => (typeof p === 'number' ? (p > 1 ? [rep(p, F())] : [F()]) : p === 'L' ? [L()] : p === 'R' ? [R()] : DODGE()));
/** "Drive 3 steps, Turn left, Drive 2 steps." */
const describe = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === 'number' ? `Drive ${p} ${p === 1 ? 'step' : 'steps'}` : p === 'L' ? 'Turn left' : p === 'R' ? 'Turn right' : 'go around the cone'))
    .join(', ')
    .replace(/^./, (c) => c.toUpperCase()) + '.';

const STAIRS: Part[] = [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'];
const SPIRAL: Part[] = [1, 'R', 2, 'R', 3, 'R', 4, 'R', 5];
const turnToRoad = () => iff(ok('roadLeft'), [L()], [R()]);

// ---------- Chapter 1: Garage Town (commands) ----------
lv(1, 'Start the Engine', 'A little longer road with a shiny coin 🪙 on it. Pick it up on the way!', 'Count the steps from your car to the flag. You need 4 Drive blocks.', [4], 1, fx(4));
lv(2, 'Sharp Corner', 'The road turns left here! Your car must turn too.', 'Drive 3 steps, Turn left, then Drive 2 steps.', [3, 'L', 2], 1, [...fx(3), L(), ...fx(2)]);
lv(3, 'Right Turn', 'Now the road turns right. Nitro Nick is already far ahead!', 'Drive 2 steps, Turn right, Drive 3 steps.', [2, 'R', 3], 1, [...fx(2), R(), ...fx(3)]);
lv(4, 'Coin Road', 'Shiny coins 🪙 are on the road. Pick them up on the way to the flag!', 'Turn left at the first corner and Turn right at the second. Drive 2 steps between the turns.', [2, 'L', 2, 'R', 2], 1, [...fx(2), L(), ...fx(2), R(), ...fx(2)]);
lv(5, 'U-Turn Lane', 'A thin road that goes one way and then comes back.', 'Turn right two times, with one Drive in between.', [2, 'R', 1, 'R', 2], 1, [...fx(2), R(), ...fx(1), R(), ...fx(2)]);
lv(6, 'Zig Zag', 'Wheee! Right, left, right, left!', 'Drive, Turn right, Drive, Turn left… then do the same again.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1], 1, [F(), R(), F(), L(), F(), R(), F(), L(), F()]);
lv(7, 'Around the Building', 'Drive all the way around the building.', 'Turn right 3 times. Drive 2 steps, 2 steps, 2 steps and then 1 step.', [2, 'R', 2, 'R', 2, 'R', 1], 1, [...fx(2), R(), ...fx(2), R(), ...fx(2), R(), F()]);
lv(8, 'The Long Road', 'This road is very, very long. You need MANY Drive blocks… phew! Is there an easier way?', 'You need 8 Drive blocks. Tired? Loop City has a trick for this!', [8], 1, fx(8));
lv(9, 'Mountain Road', 'A twisty road. Look carefully at each turn.', 'Drive 2 steps, Turn left, Drive 3 steps, Turn right, Drive 2 steps, Turn left, Drive 1 step.', [2, 'L', 3, 'R', 2, 'L', 1], 1, [...fx(2), L(), ...fx(3), R(), ...fx(2), L(), F()]);
lv(10, "Nick's Zig-Zag", 'BOSS RACE! Nitro Nick made a zig-zag road. Reach the flag before him!', 'Turn right, Turn left, Turn right. Drive 2 steps between the turns.', [2, 'R', 2, 'L', 2, 'R', 2], 1, [...fx(2), R(), ...fx(2), L(), ...fx(2), R(), ...fx(2)]);

// ---------- Chapter 2: Loop City (loops) ----------
lv(11, 'Repeat Power', "Coach: 'Use the Repeat block. You need only one!'", 'Repeat 8 times, with a Drive inside.', [8], 1, [rep(8, F())]);
lv(12, 'Corner Loop', 'Two long straight roads with a turn. Loops make it easy.', 'Repeat 5 Drive, Turn left, Repeat 5 Drive.', [5, 'L', 5], 1, [rep(5, F()), L(), rep(5, F())]);
lv(13, 'Stairs', 'Climb the zig-zag stairs. Find the part that repeats!', 'One stair is Drive, Turn right, Drive, Turn left. Repeat it 4 times.', STAIRS, 1, [rep(4, F(), R(), F(), L())]);
lv(14, 'Loop in a Loop', 'You can put a Repeat inside another Repeat!', 'Repeat 3: [Repeat 3 Drive, Turn right]. Then Drive 2 more steps.', [3, 'R', 3, 'R', 3, 'R', 2], 1, [rep(3, rep(3, F()), R()), rep(2, F())]);
lv(15, 'Long Twisty Road', 'Left, right, left… four long straight roads.', 'Repeat 2: [Drive 4 steps, Turn left, Drive 4 steps, Turn right].', [4, 'L', 4, 'R', 4, 'L', 4], 1, [rep(2, rep(4, F()), L(), rep(4, F()), R())]);
lv(16, 'Spiral In', 'This road goes round and round. Each straight part is shorter than the last.', 'Drive 4, 3, 2, then 1 step, with a Turn right in between.', [4, 'R', 3, 'R', 2, 'R', 1], 1, [rep(4, F()), R(), rep(3, F()), R(), rep(2, F()), R(), F()]);
lv(17, 'Find the Pattern', 'Find the part that repeats and put it in a loop!', 'Drive 2 steps, Turn right, Drive 2 steps, Turn left. Do it 3 times.', [2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2], 1, [rep(3, rep(2, F()), R(), rep(2, F()), L())]);
lv(18, 'Cone Weaving', 'Cones 🚧 are on the road! Go around each one.', 'One dodge (going around a cone): Drive, Turn right, Drive, Turn left, Drive, Drive, Turn left, Drive, Turn right. Do it 2 times.', ['D', 'D'], 1, [rep(2, ...DODGE())]);
lv(19, 'Three Cones', 'Three cones in a line. Loops will help!', 'Put the whole dodge inside Repeat 3.', ['D', 'D', 'D'], 1, [rep(3, ...DODGE())]);
lv(20, 'Loop City Race', 'BOSS! Nitro Nick wants a big race in Loop City!', 'Repeat 2: [Repeat 3 Drive, Turn right, Repeat 3 Drive, Turn left]. Then Drive 3 more steps.', [3, 'R', 3, 'L', 3, 'R', 3, 'L', 3], 1, [rep(2, rep(3, F()), R(), rep(3, F()), L()), rep(3, F())]);

// ---------- Chapter 3: Sandy Desert (if / else / while) ----------
lv(21, 'Look Ahead', 'A long desert road. Your While loop works for any length!', 'While NOT atFinish: Drive.', [7], 1, [whl(no('atFinish'), F())]);
lv(22, 'Wall Finder', "'roadAhead' is true when there is road in front of you.", 'While roadAhead: Drive. Then Turn right. Then the same While again.', [5, 'R', 4], 1, [whl(ok('roadAhead'), F()), R(), whl(ok('roadAhead'), F())]);
lv(23, 'Stuck? Turn!', 'If there is road ahead, drive. If not, turn right. Dr. Glitch hid the signs!', 'While NOT atFinish: If roadAhead, Drive, else Turn right.', [3, 'R', 2, 'R', 3, 'R', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [R()]))], { use: ['while', 'if'] });
lv(24, 'Left Only', 'All these turns go left.', 'Same as before, but Turn left in the else.', [3, 'L', 2, 'L', 3, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [L()]))], { use: ['while', 'if'] });
lv(25, 'Left or Right?', "The road turns both ways. Ask the car's eyes which way is open!", 'In the else, check roadLeft: If yes, Turn left, else Turn right.', [2, 'R', 2, 'L', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(26, 'Cone Trouble', 'Two cones with road in between. One smart loop can do both!', 'The same smart loop as before works on cones too!', ['D', 2, 'D'], 1, SMART(), { use: ['while', 'if'] });
lv(27, 'Desert Maze', 'A twisty maze. One smart loop can drive any road.', 'While NOT atFinish: If roadAhead, Drive, else If roadLeft, Turn left, else Turn right.', [3, 'R', 2, 'L', 4, 'L', 2, 'R', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(28, 'Coin Finder', "'coinAhead' can see coins. Use Horn when a coin is in front!", 'Add an If inside your smart loop: If coinAhead, Horn.', [2, 'R', 2, 'L', 3, 'R', 2], 1, [whl(no('atFinish'), iff(ok('coinAhead'), [honk()]), iff(ok('roadAhead'), [F()], [turnToRoad()]))], { use: ['while', 'if'] });
lv(29, 'Zig-Zag Highway', 'A long zig-zag road. Counting will take too long!', 'The smart loop works on zig-zags too.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1], 1, SMART(), { use: ['while', 'if'] });
lv(30, 'Sand Storm', 'BOSS! Dr. Glitch made a sand storm! Get past cones and corners with ONE smart loop.', 'While NOT atFinish… the same smart loop you have been making.', ['D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 1], 1, SMART(), { use: ['while', 'if'] });

// ---------- Chapter 4: Cone Jungle (conditions) ----------
lv(31, 'Measure the Road', 'Use distanceAhead to measure both straight roads. No need to count!', 'Repeat (distanceAhead) times: Drive. Turn right. Repeat (distanceAhead) times: Drive.', [5, 'R', 4], 1, [rep(sn('distanceAhead'), F()), R(), rep(sn('distanceAhead'), F())], { use: [] });
lv(32, 'Greater Than', 'Use distanceAhead > 0 to choose: drive or turn? This road has more turns.', 'If distanceAhead > 0, Drive, else turn towards the road.', [3, 'R', 2, 'L', 4, 'L', 2], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(33, 'This AND That', '&& means BOTH things must be true. Turn left only if left is open AND right is closed.', 'Join two checks with AND to choose the turn.', [3, 'L', 2, 'R', 3, 'R', 2, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);
lv(34, 'Right Side First', 'Explorers always look at the right side first. You try it!', 'If roadAhead, Drive, else If roadRight, Turn right, else Turn left.', [2, 'R', 3, 'L', 2, 'R', 4], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadRight'), [R()], [L()])]))]);
lv(35, 'Three Questions', 'Ask three questions, one after another: turn left? turn right? drive?', 'Three If blocks one after another, each using NOT roadAhead and one side.', [2, 'L', 2, 'R', 2, 'L', 2, 'R', 3], 1, [whl(no('atFinish'), iff(all(no('roadAhead'), ok('roadLeft')), [L()]), iff(all(no('roadAhead'), ok('roadRight')), [R()]), iff(ok('roadAhead'), [F()]))]);
lv(36, 'Count and Turn', 'Put a counting loop and a choice together.', 'While NOT atFinish: Repeat (distanceAhead) Drive, then If roadLeft, Turn left, else Turn right.', [4, 'R', 2, 'L', 3, 'R', 5], 1, [whl(no('atFinish'), rep(sn('distanceAhead'), F()), turnToRoad())]);
lv(37, 'Jungle Dodge', 'Cones and corners, both together.', 'Your smart loop works on cones too.', ['D', 1, 'D', 'D'], 1, SMART());
lv(38, 'This OR That', '|| means at least ONE is true. Keep driving while ANY road is open.', 'While roadAhead OR roadLeft OR roadRight: …', [2, 'R', 2, 'R', 2, 'L', 2, 'L', 3], 1, [whl(any(ok('roadAhead'), ok('roadLeft'), ok('roadRight')), iff(ok('roadAhead'), [F()], [turnToRoad()]))]);
lv(39, 'Jungle Swing', 'A long jungle road with many cones and turns.', 'Use the smart loop that checks distanceAhead.', [2, 'D', 2, 'R', 2, 'D', 2, 'L', 3], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(40, "Nick's Jungle Trap", 'BOSS! Nitro Nick put cones everywhere to trap you! Use everything you know.', 'While NOT atFinish: If roadAhead, Drive, else If roadLeft AND NOT roadRight, Turn left, else Turn right.', ['D', 'D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 'D', 1, 'R', 2], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);

// ---------- Chapter 5: Number Mountain (variables) ----------
lv(41, 'Meet the Box', 'One more box practice: put 4 in steps and drive that far.', 'Make box steps = 4, then Repeat (steps) Drive.', [4], 1, [mk('steps', num(4)), rep(v('steps'), F())]);
lv(42, 'Two Boxes', 'Use two boxes for two straight roads.', 'Make box a = 3 and Make box b = 5. Repeat a, Turn right, Repeat b.', [3, 'R', 5], 1, [mk('a', num(3)), mk('b', num(5)), rep(v('a'), F()), R(), rep(v('b'), F())]);
lv(43, 'Sign Reader', 'Another sign! Put its number in a box and drive that far.', 'Drive 1 step to reach the sign. Make box n = readSign. Repeat n times Drive.', [5], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 4 } });
lv(44, 'Two Signs', 'Two signs on a longer road. Read, drive, turn, then read the next one!', 'After the turn, Drive 1 step, then Set box n = readSign and Repeat n.', [4, 'R', 3], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F()), R(), F(), setv('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 3, 5: 2 } });
lv(45, 'Growing Spiral', 'A bigger spiral! Use Change box after every side to make the number bigger.', 'Make box n = 1. Repeat 4: [Repeat n Drive, Turn right, Change box n by 1]. At the end, Repeat n Drive.', SPIRAL, 1, [mk('n', num(1)), rep(4, rep(v('n'), F()), R(), chg('n', num(1))), rep(v('n'), F())]);
lv(46, 'Count Down', 'Count down to zero. Change box by -1 each time.', 'Make box n = 6. While n > 0: Drive and Change box n by -1.', [6], 1, [mk('n', num(6)), whl(cmp(v('n'), '>', num(0)), F(), chg('n', num(-1)))]);
lv(47, 'Maths Time', 'More maths! Find each straight road with × and +.', 'The first straight road is 2 × 3 steps. The second is 4 + 1 steps.', [6, 'R', 5], 1, [mk('a', bin(num(2), '*', num(3))), rep(v('a'), F()), R(), rep(bin(num(4), '+', num(1)), F())]);
lv(48, 'Half the Way', 'This sign shows only HALF the way. Make it double!', 'Drive 1 step to reach the sign. Make box h = readSign. Repeat (h × 2) Drive. Then Turn left and Repeat 3 Drive.', [5, 'L', 3], 1, [F(), mk('h', sn('readSign')), rep(bin(v('h'), '*', num(2)), F()), L(), rep(3, F())], { signs: { 1: 2 } });
lv(49, 'Double Trouble', 'Each part of the road is double the last: 1, 2, 4, 8. Change box n by n!', 'Make box n = 1. Repeat 3: [Repeat n Drive, Turn right, Change box n by n]. Then Repeat n Drive.', [1, 'R', 2, 'R', 4, 'R', 8], 1, [mk('n', num(1)), rep(3, rep(v('n'), F()), R(), chg('n', v('n'))), rep(v('n'), F())]);
lv(50, 'Mountain Top', 'BOSS! Signs all the way to the mountain top. Read each one and do what it says!', 'While NOT atFinish: Drive, Make box n = readSign, Repeat n Drive, then turn towards the road.', [4, 'R', 3, 'L', 2], 1, [whl(no('atFinish'), F(), mk('n', sn('readSign')), rep(v('n'), F()), turnToRoad())], { signs: { 1: 3, 5: 2, 8: 1 } });

// ---------- Chapter 6: Function Factory (functions) ----------
const dodgeFn = () => fn('dodge', [], ...DODGE());
lv(51, 'Meet Functions', 'Make your own command called stair. Write it once, use it three times.', 'Function stair: Drive, Turn right, Drive, Turn left. Then Repeat 3: Call stair.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1], 1, [fn('stair', [], F(), R(), F(), L()), rep(3, call('stair'))]);
lv(52, 'Side by Side', 'A function for one full straight road.', 'Function side: Repeat 3 Drive. Call side, Turn right, Call side, Turn left, Call side.', [3, 'R', 3, 'L', 3], 1, [fn('side', [], rep(3, F())), call('side'), R(), call('side'), L(), call('side')]);
lv(53, 'Dodge Maker', 'Put the cone dodge inside a function. Call it three times!', 'Function dodge has the 9 dodge moves inside.', ['D', 'D', 'D'], 1, [dodgeFn(), rep(3, call('dodge'))]);
lv(54, 'Square Maker', 'A function can have a turn inside it too.', 'Function side: Repeat 3 Drive, Turn right. Repeat 3: Call side. Then Drive 2 steps.', [3, 'R', 3, 'R', 3, 'R', 2], 1, [fn('side', [], rep(3, F()), R()), rep(3, call('side')), rep(2, F())]);
lv(55, 'Snake Road', 'One function for every row of the snake road.', 'Function row: Repeat 2 Drive. Then: Call row, Turn right, Drive, Turn right, Call row, Turn left, Drive, Turn left, Call row.', [2, 'R', 1, 'R', 2, 'L', 1, 'L', 2], 1, [fn('row', [], rep(2, F())), call('row'), R(), F(), R(), call('row'), L(), F(), L(), call('row')]);
lv(56, 'Horn Helper', 'Make a cheer function that plays the Horn two times. Use it halfway.', 'Function cheer: Horn, Horn. Drive 3 steps, Call cheer, Drive 3 steps.', [6], 1, [fn('cheer', [], honk(), honk()), rep(3, F()), call('cheer'), rep(3, F())]);
lv(57, 'Mirror Moves', 'A zig-zag going the other way.', 'Function zag: Drive, Turn left, Drive, Turn right. Repeat it 3 times.', [1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R'], 1, [fn('zag', [], F(), L(), F(), R()), rep(3, call('zag'))]);
lv(58, 'Helper Calls Helper', 'A function can call another function!', 'Function b: Drive 2 steps. Function a: Call b, Turn right, Call b. Then Call a, Turn left, Call a.', [2, 'R', 2, 'L', 2, 'R', 2], 1, [fn('b', [], rep(2, F())), fn('a', [], call('b'), R(), call('b')), call('a'), L(), call('a')]);
lv(59, 'Dodge and Drive', 'Dodge, drive, dodge, drive, dodge. Functions and loops together.', 'Function dodge. Repeat 2: [Call dodge, Drive 2 steps]. Then Call dodge.', ['D', 2, 'D', 2, 'D'], 1, [dodgeFn(), rep(2, call('dodge'), rep(2, F())), call('dodge')]);
lv(60, 'Factory Boss', 'BOSS! The Factory Boss gives you a test: make a turn function and a smart loop.', 'Function turn: If roadLeft, Turn left, else Turn right. While NOT atFinish: If roadAhead, Drive, else Call turn.', [3, 'R', 2, 'L', 4, 'L', 2, 'R', 3, 'D', 1], 1, [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))], { use: ['function', 'while'] });

// ---------- Chapter 7: Parameter Port (parameters) ----------
const goFn = () => fn('go', ['n'], rep(v('n'), F()));
lv(61, 'Go N Steps', 'Use go(n) with two different numbers and a turn in between.', 'Function go(n): Repeat n Drive. Then Call go(3), Turn right, Call go(4).', [3, 'R', 4], 1, [goFn(), call('go', num(3)), R(), call('go', num(4))]);
lv(62, 'Go and Turn', 'A function that drives n steps and then turns.', 'Function leg(n): Repeat n Drive, Turn right. Call leg(2), leg(3) and leg(4). Then Drive 1 step.', [2, 'R', 3, 'R', 4, 'R', 1], 1, [fn('leg', ['n'], rep(v('n'), F()), R()), call('leg', num(2)), call('leg', num(3)), call('leg', num(4)), F()]);
lv(63, 'Two at Once', 'A function can take two numbers: step(a, b).', 'Function step(a, b): Repeat a Drive, Turn right, Repeat b Drive, Turn left.', [2, 'R', 3, 'L', 4, 'R', 1, 'L', 1], 1, [fn('step', ['a', 'b'], rep(v('a'), F()), R(), rep(v('b'), F()), L()), call('step', num(2), num(3)), call('step', num(4), num(1)), F()]);
lv(64, 'Box Goes In', 'Give a box to a function. You can even add to it: k + 1.', 'Make box k = 3. go(k), Turn right, go(k + 1), Turn left, go(k + 2).', [3, 'R', 4, 'L', 5], 1, [goFn(), mk('k', num(3)), call('go', v('k')), R(), call('go', bin(v('k'), '+', num(1))), L(), call('go', bin(v('k'), '+', num(2)))]);
lv(65, 'Spiral Again', 'Use a function, a growing box and a loop together.', 'Function leg(n). Make box n = 1. Repeat 4: [Call leg(n), Change box n by 1]. Then Repeat n Drive.', SPIRAL, 1, [fn('leg', ['n'], rep(v('n'), F()), R()), mk('n', num(1)), rep(4, call('leg', v('n')), chg('n', num(1))), rep(v('n'), F())]);
lv(66, 'Many Dodges', 'Tell the function HOW MANY dodges to do.', 'Function dodges(times): Repeat times [the dodge moves]. Call dodges(3).', ['D', 'D', 'D'], 1, [fn('dodges', ['times'], rep(v('times'), ...DODGE())), call('dodges', num(3))]);
lv(67, 'Say Which Way', "Give a word to a function: turn('left') or turn('right').", "Function turn(d): If d == 'left', Turn left, else Turn right.", [2, 'L', 2, 'R', 2, 'R', 2], 1, [fn('turn', ['d'], iff(cmp(v('d'), '==', str('left')), [L()], [R()])), rep(2, F()), call('turn', str('left')), rep(2, F()), call('turn', str('right')), rep(2, F()), call('turn', str('right')), rep(2, F())]);
lv(68, 'Sign Number', 'Read a sign and give the number to your function.', 'Drive, Make box n = readSign, go(n), Turn right, Drive, Set box n = readSign, go(n).', [4, 'R', 3], 1, [goFn(), F(), mk('n', sn('readSign')), call('go', v('n')), R(), F(), setv('n', sn('readSign')), call('go', v('n'))], { signs: { 1: 3, 5: 2 } });
lv(69, 'Function Tower', 'A function that calls another function that takes a number.', 'Function go(n). Function leg(n): go(n), Turn right. Then leg(2), leg(3), leg(4) and Drive.', [2, 'R', 3, 'R', 4, 'R', 1], 1, [goFn(), fn('leg', ['n'], call('go', v('n')), R()), call('leg', num(2)), call('leg', num(3)), call('leg', num(4)), F()]);
lv(70, 'Harbour Boss', 'BOSS! Roads of 1, 2, 3, 4, 5 steps, turning right, left, right, left. Use everything you know!', 'Function go(n). Make box n = 1. Repeat 2: [go(n), Turn right, Change box n by 1, go(n), Turn left, Change box n by 1]. Then go(n).', [1, 'R', 2, 'L', 3, 'R', 4, 'L', 5], 1, [goFn(), mk('n', num(1)), rep(2, call('go', v('n')), R(), chg('n', num(1)), call('go', v('n')), L(), chg('n', num(1))), call('go', v('n'))]);

// ---------- Chapter 8: List Lagoon (lists & objects) ----------
lv(71, 'Road Map', 'The treasure map is a list: legs = [3, 2]. Use For each to go through every item.', 'For each leg in legs: Repeat leg Drive, Turn right.', [3, 'R', 2], 1, [each('leg', 'legs', rep(v('leg'), F()), R())], { data: { legs: [3, 2] } });
lv(72, 'Longer List', 'Same idea, more items in the list.', 'The same For each block works for any list.', [2, 'R', 3, 'R', 2, 'R', 4], 1, [each('leg', 'legs', rep(v('leg'), F()), R())], { data: { legs: [2, 3, 2, 4] } });
lv(73, 'Pick an Item', 'Three items this time: legs[0], legs[1] and legs[2]. Counting starts at 0!', 'Repeat legs[0] Drive, Turn right, Repeat legs[1] Drive, Turn left, Repeat legs[2] Drive.', [2, 'R', 3, 'L', 4], 1, [rep(v('legs[0]'), F()), R(), rep(v('legs[1]'), F()), L(), rep(v('legs[2]'), F())], { data: { legs: [2, 3, 4] }, use: [] });
lv(74, 'List of Words', "A list can keep words too. Turn right for 'R', else turn left.", "For each t in turns: Repeat 2 Drive, If t == 'R', Turn right, else Turn left. Then Drive 2 more steps.", [2, 'R', 2, 'L', 2, 'R', 2], 1, [each('t', 'turns', rep(2, F()), iff(cmp(v('t'), '==', str('R')), [R()], [L()])), rep(2, F())], { data: { turns: ['R', 'L', 'R'] } });
lv(75, 'Add Them Up', 'Make a box called total and add every coin to it.', 'Make box total = 0. For each c in coins: Change box total by c. Then Repeat total Drive.', [6], 1, [mk('total', num(0)), each('c', 'coins', chg('total', v('c'))), rep(v('total'), F())], { data: { coins: [1, 2, 3] } });
lv(76, 'Stops in a List', 'Three stops this time, each with stop.n (how far) and stop.t (which way).', "For each stop in stops: Repeat stop.n Drive, then If stop.t == 'R', Turn right, else Turn left.", [2, 'R', 3, 'L', 2], 1, [each('stop', 'stops', rep(v('stop.n'), F()), iff(cmp(v('stop.t'), '==', str('R')), [R()], [L()]))], { data: { stops: [{ n: 2, t: 'R' }, { n: 3, t: 'L' }, { n: 2, t: 'R' }] } });
lv(77, 'Growing Roads', "The list goes 1 to 5. Use the car's eyes to choose the turn.", 'For each leg: Repeat leg Drive, If roadLeft, Turn left, else Turn right.', [1, 'R', 2, 'L', 3, 'R', 4, 'L', 5], 1, [each('leg', 'legs', rep(v('leg'), F()), turnToRoad())], { data: { legs: [1, 2, 3, 4, 5] } });
lv(78, 'List and Function', 'Use a function and a list together.', 'Function go(n). For each leg: go(leg), then turn towards the road.', [2, 'R', 3, 'L', 2, 'R', 3], 1, [goFn(), each('leg', 'legs', call('go', v('leg')), turnToRoad())], { data: { legs: [2, 3, 2, 3] } });
lv(79, 'Secret Code', "The list has commands as letters: 'F', 'R' and 'L'. You are the reader!", "For each cmd: If cmd == 'F', Drive, else If cmd == 'R', Turn right, else Turn left.", [2, 'R', 1, 'L', 3], 1, [each('cmd', 'cmds', iff(cmp(v('cmd'), '==', str('F')), [F()], [iff(cmp(v('cmd'), '==', str('R')), [R()], [L()])]))], { data: { cmds: ['F', 'F', 'R', 'F', 'L', 'F', 'F', 'F'] } });
lv(80, 'Octopus Treasure Map', 'BOSS! A list of objects. Each one has a command c and how many times n.', "For each step in map: Repeat step.n [If step.c == 'F', Drive, else If 'R', Turn right, else Turn left].", [3, 'R', 2, 'L', 4, 'R', 2], 1, [each('step', 'map', rep(v('step.n'), iff(cmp(v('step.c'), '==', str('F')), [F()], [iff(cmp(v('step.c'), '==', str('R')), [R()], [L()])])))], {
  data: { map: [{ c: 'F', n: 3 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }, { c: 'L', n: 1 }, { c: 'F', n: 4 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }] },
});

// ---------- Chapter 9: Gate Galaxy (strings, objects, events) ----------
lv(81, 'First Words', "Another gate! This time the secret word is 'open'.", "Drive 1 step, Say 'open', then Repeat 3 Drive.", [4], 1, [F(), say(str('open')), rep(3, F())], { gates: [2], secret: 'open' });
lv(82, 'Password Box', 'The password box has a new word in it. Say it at the gate!', 'Drive 1 step, say(password), Repeat 3 Drive.', [4], 1, [F(), say(v('password')), rep(3, F())], { gates: [2], secret: 'turbo', data: { password: 'turbo' } });
lv(83, 'Word Glue', 'Boxes a and b each have one part of the password. Join them with +.', 'say(a + b)', [4], 1, [F(), say(bin(v('a'), '+', v('b'))), rep(3, F())], { gates: [2], secret: 'turbo', data: { a: 'tur', b: 'bo' } });
lv(84, 'Two Gates', 'Two gates, same password.', 'Say the password before each gate.', [3, 'R', 3], 1, [F(), say(v('password')), F(), F(), R(), F(), say(v('password')), F(), F()], { gates: [2, 5], secret: 'nova', data: { password: 'nova' } });
lv(85, 'Car Facts', 'car.fuel is a part of the car object. Use it as a number!', 'Repeat car.fuel Drive, Turn right, Repeat (car.fuel − 1) Drive.', [4, 'R', 3], 1, [rep(v('car.fuel'), F()), R(), rep(bin(v('car.fuel'), '-', num(1)), F())], { data: { car: { fuel: 4 } }, use: [] });
lv(86, "The Driver's Word", 'The password is inside an object: driver.word.', 'say(driver.word)', [4], 1, [F(), say(v('driver.word')), rep(3, F())], { gates: [2], secret: 'vroom', data: { driver: { name: 'Zoom', word: 'vroom' } } });
const signHandler = () => onsign('sign', iff(cmp(v('sign'), '==', num(1)), [L()], [R()]));
lv(87, 'Sign Rules', 'Now there are two kinds of signs: 1 means left, 2 means right.', 'On sign: If sign == 1, Turn left, else Turn right. Then Repeat 6 Drive.', [2, 'R', 2, 'L', 2], 1, [signHandler(), rep(6, F())], { signs: { 2: 2, 4: 1 }, use: ['onsign'] });
lv(88, 'Three Signs', 'More signs, same On sign block.', 'Use the same On sign block, then Repeat 10 Drive.', [3, 'R', 2, 'R', 2, 'L', 3], 1, [signHandler(), rep(10, F())], { signs: { 3: 2, 5: 2, 7: 1 }, use: ['onsign'] });
lv(89, 'Sign and Gate', "Sign 1 means 'say the password'. Sign 2 means 'turn right'.", 'On sign: If sign == 1, say(password), else Turn right. Repeat 8 Drive.', [5, 'R', 3], 1, [onsign('sign', iff(cmp(v('sign'), '==', num(1)), [say(v('password'))], [R()])), rep(8, F())], { signs: { 1: 1, 5: 2 }, gates: [2], secret: 'turbo', data: { password: 'turbo' }, use: ['onsign'] });
lv(90, 'Gate Guard', 'BOSS! Three kinds of signs and a gate: 1 = say the code word, 2 = right, 3 = left.', 'On sign: If sign == 2, Turn right, else If sign == 3, Turn left, else say(code.word). Repeat 11 Drive.', [4, 'R', 3, 'L', 4], 1, [onsign('sign', iff(cmp(v('sign'), '==', num(2)), [R()], [iff(cmp(v('sign'), '==', num(3)), [L()], [say(v('code.word'))])])), rep(11, F())], { signs: { 1: 1, 4: 2, 7: 3 }, gates: [2], secret: 'nova', data: { code: { word: 'nova' } }, use: ['onsign'] });

// ---------- Chapter 10: Glitch's Castle (debugging & recursion) ----------
lv(91, 'Bug Hunt 1', "Dr. Glitch's first bug! The car stops before the first corner. Find it and fix it.", 'The first Repeat should drive 4 times, not 3.', [4, 'R', 3], 1, [rep(4, F()), R(), rep(3, F())], { starter: [rep(3, F()), R(), rep(3, F())], use: [] });
lv(92, 'Bug Hunt 2', 'The car turns the wrong way somewhere. Fix the bug!', 'The second turn should be LEFT.', [2, 'R', 2, 'L', 2], 1, [rep(2, F()), R(), rep(2, F()), L(), rep(2, F())], { starter: [rep(2, F()), R(), rep(2, F()), R(), rep(2, F())], use: [] });
lv(93, 'Bug Hunt 3', 'The car gets stuck at the corner and never stops. What should it do when there is no road ahead?', 'Add an else that turns towards the road.', [3, 'R', 2, 'L', 2], 1, SMART(), { starter: [whl(no('atFinish'), iff(ok('roadAhead'), [F()]))], use: ['if'] });
lv(94, 'Bug Hunt 4', 'For the second straight road, the box has the wrong number.', 'The second Repeat needs n + 1.', [3, 'R', 4], 1, [mk('n', num(3)), rep(v('n'), F()), R(), rep(bin(v('n'), '+', num(1)), F())], { starter: [mk('n', num(3)), rep(v('n'), F()), R(), rep(v('n'), F())], use: ['let'] });
lv(95, 'Bug Hunt 5', 'The function does not use its number! Fix go(n).', 'Inside go, Repeat n times, not 3.', [2, 'R', 4], 1, [goFn(), call('go', num(2)), R(), call('go', num(4))], { starter: [fn('go', ['n'], rep(3, F())), call('go', num(2)), R(), call('go', num(4))], use: ['function'] });
lv(96, 'Recursion 1', 'A function that calls itself! dash(5) drives one step, then calls dash(4), then dash(3)…', 'If n > 0: Drive, then Call dash(n − 1).', [5], 1, [fn('dash', ['n'], iff(cmp(v('n'), '>', num(0)), [F(), call('dash', bin(v('n'), '-', num(1)))])), call('dash', num(5))], { use: ['function'] });
lv(97, 'Recursion 2', 'Stairs made by a function that calls itself!', 'stairs(n): If n > 0, Drive, Turn right, Drive, Turn left, Call stairs(n − 1).', STAIRS, 1, [fn('stairs', ['n'], iff(cmp(v('n'), '>', num(0)), [F(), R(), F(), L(), call('stairs', bin(v('n'), '-', num(1)))])), call('stairs', num(4))], { use: ['function'] });
lv(98, 'Recursion 3', 'A spiral made by a function that calls itself. Each part gets longer.', 'spiral(n): If n < 6, Repeat n Drive, Turn right, Call spiral(n + 1). Call spiral(1).', SPIRAL, 1, [fn('spiral', ['n'], iff(cmp(v('n'), '<', num(6)), [rep(v('n'), F()), R(), call('spiral', bin(v('n'), '+', num(1)))])), call('spiral', num(1))], { use: ['function'] });
lv(99, 'Mixed Mission', 'Dodge, drive, turn, drive, dodge. Choose your best blocks!', 'Function dodge. Call dodge, Repeat 2 Drive, Turn right, Repeat 2 Drive, Call dodge.', ['D', 2, 'R', 2, 'D'], 1, [dodgeFn(), call('dodge'), rep(2, F()), R(), rep(2, F()), call('dodge')], { use: ['function'] });
lv(100, "Glitch's Last Fight", 'THE LAST BOSS! Twisty roads and cones everywhere. Show Dr. Glitch what a real coder can do!', 'A function for turning and a smart loop. You know this!', [2, 'R', 3, 'L', 2, 'D', 2, 'R', 3, 'L', 2, 'D', 'D', 2, 'R', 2], 1, [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))], { use: ['function', 'while'] });

// =====================================================================================
// Extra, gentler levels. Worlds 1-5 grow to 30 levels and worlds 6-10 to 20,
// ramping from easy to hard. `after` says which original level each one follows.
// =====================================================================================

// ---------- World 1: Garage Town ----------
nl(1, 0, 'First Gear', "Coach Gearheart: 'Tap Drive to move one step. The flag is two steps away!'", 'Tap the Drive block two times, then press GO.', [2], fx(2));
nl(1, 0, 'Three Steps', 'A little further this time. Count the steps!', 'You need 3 Drive blocks.', [3], fx(3));
nl(1, 1, 'Five Steps', 'A longer straight road. Count carefully!', 'You need 5 Drive blocks.', [5], fx(5));
nl(1, 1, 'Tiny Turn', 'Your first turn! Turning only turns the car. It does not move it.', 'Drive 1 step, Turn left, Drive 1 step.', [1, 'L', 1], seq([1, 'L', 1]));
nl(1, 1, 'Corner Shop', 'Drive to the corner, then turn left to reach the shop.', describe([2, 'L', 1]), [2, 'L', 1], seq([2, 'L', 1]));
nl(1, 2, 'Now Go Right', 'Now try turning RIGHT.', 'Drive 1 step, Turn right, Drive 1 step.', [1, 'R', 1], seq([1, 'R', 1]));
nl(1, 2, 'Right Corner', 'Two steps, a right turn, then two more steps.', describe([2, 'R', 2]), [2, 'R', 2], seq([2, 'R', 2]));
nl(1, 3, 'Short Hop', 'A long part, then a quick turn and a tiny part.', describe([3, 'R', 1]), [3, 'R', 1], seq([3, 'R', 1]));
nl(1, 3, 'Facing Up', 'This time your car starts facing UP. Left and right are as the car sees them!', describe([1, 'L', 2]), [1, 'L', 2], seq([1, 'L', 2]), { dir: 0 });
nl(1, 4, 'Sharp U-Turn', 'A sharp U-turn takes you all the way back.', describe([1, 'R', 1, 'R', 1]), [1, 'R', 1, 'R', 1], seq([1, 'R', 1, 'R', 1]));
nl(1, 5, 'Two Lefts', 'Two left turns, one after another!', describe([2, 'L', 2, 'L', 2]), [2, 'L', 2, 'L', 2], seq([2, 'L', 2, 'L', 2]));
nl(1, 6, 'Wiggle Road', 'Left, right, left. Wiggle wiggle!', describe([1, 'L', 1, 'R', 1, 'L', 1]), [1, 'L', 1, 'R', 1, 'L', 1], seq([1, 'L', 1, 'R', 1, 'L', 1]));
nl(1, 7, 'Round the Park', 'Drive around the whole park, turning left each time.', describe([2, 'L', 2, 'L', 2, 'L', 1]), [2, 'L', 2, 'L', 2, 'L', 1], seq([2, 'L', 2, 'L', 2, 'L', 1]));
nl(1, 8, 'Long and Short', 'A long road, then a short one.', describe([6, 'R', 2]), [6, 'R', 2], seq([6, 'R', 2]));
nl(1, 8, 'Change Lanes', 'Move to the next lane and keep going.', describe([3, 'R', 1, 'L', 3]), [3, 'R', 1, 'L', 3], seq([3, 'R', 1, 'L', 3]));
nl(1, 9, 'Down the Hill', 'Follow the road down the hill.', describe([1, 'R', 2, 'L', 2, 'R', 1]), [1, 'R', 2, 'L', 2, 'R', 1], seq([1, 'R', 2, 'L', 2, 'R', 1]));
nl(1, 9, 'Big U-Turn', 'Go up, then come all the way back.', describe([3, 'L', 2, 'L', 3]), [3, 'L', 2, 'L', 3], seq([3, 'L', 2, 'L', 3]));
nl(1, 9, 'Stairs Down', 'A road like stairs going down.', describe([1, 'R', 1, 'L', 2, 'R', 1, 'L', 1]), [1, 'R', 1, 'L', 2, 'R', 1, 'L', 1], seq([1, 'R', 1, 'L', 2, 'R', 1, 'L', 1]));
nl(1, 9, 'Mountain Climb', 'Go up, go across, then come down again.', describe([2, 'L', 2, 'R', 2, 'R', 1]), [2, 'L', 2, 'R', 2, 'R', 1], seq([2, 'L', 2, 'R', 2, 'R', 1]));
nl(1, 9, 'Secret Shortcut', "Nitro Nick's secret shortcut. Can you follow it?", describe([2, 'R', 2, 'L', 1, 'L', 2]), [2, 'R', 2, 'L', 1, 'L', 2], seq([2, 'R', 2, 'L', 1, 'L', 2]));

// ---------- World 2: Loop City ----------
nl(2, 0, 'First Loop', 'Meet the Repeat block! Put one Drive inside it and make the number 4.', 'Tap Repeat, tap Drive (it goes inside), make the number 4.', [4], [rep(4, F())]);
nl(2, 0, 'Six in a Row', 'One Repeat block can drive 6 steps.', 'Repeat 6 times: Drive.', [6], [rep(6, F())]);
nl(2, 11, 'Loop, Turn, Loop', 'Two loops with a turn between them.', 'Repeat 3 Drive, Turn left, Repeat 3 Drive.', [3, 'L', 3], loopy([3, 'L', 3]));
nl(2, 11, 'Four and Four', 'Same idea, but the other way.', 'Repeat 4 Drive, Turn right, Repeat 4 Drive.', [4, 'R', 4], loopy([4, 'R', 4]));
nl(2, 12, 'Big and Small', 'A big loop and a small loop.', 'Repeat 6 Drive, Turn right, Repeat 2 Drive.', [6, 'R', 2], loopy([6, 'R', 2]));
nl(2, 12, 'Tower Road', 'Your car starts facing up again.', 'Repeat 2 Drive, Turn left, Repeat 5 Drive.', [2, 'L', 5], loopy([2, 'L', 5]), { dir: 0 });
nl(2, 12, 'Mini Stairs', 'Put MORE than one block inside a Repeat!', 'Repeat 2: Drive, Turn right, Drive, Turn left.', [1, 'R', 1, 'L', 1, 'R', 1, 'L'], [rep(2, F(), R(), F(), L())]);
nl(2, 13, 'Stairs Up', 'Stairs going the other way.', 'Repeat 3: Drive, Turn left, Drive, Turn right.', [1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R'], [rep(3, F(), L(), F(), R())]);
nl(2, 14, 'Double Zig-Zag', 'A zig-zag with longer straight parts.', 'Repeat 2: [Repeat 2 Drive, Turn right, Repeat 2 Drive, Turn left].', [2, 'R', 2, 'L', 2, 'R', 2, 'L'], [rep(2, rep(2, F()), R(), rep(2, F()), L())]);
nl(2, 14, 'Two Corners', 'A loop inside a loop: the inside loop drives, the outside loop does it two times.', 'Repeat 2: [Repeat 3 Drive, Turn right]. Then Repeat 3 Drive.', [3, 'R', 3, 'R', 3], [rep(2, rep(3, F()), R()), rep(3, F())]);
nl(2, 14, 'Little Square', 'Almost all the way round a little square.', 'Repeat 3: [Repeat 2 Drive, Turn right]. Then Drive 1 step.', [2, 'R', 2, 'R', 2, 'R', 1], [rep(3, rep(2, F()), R()), F()]);
nl(2, 15, 'Big Left Turns', 'Big corners, all turning left.', 'Repeat 2: [Repeat 5 Drive, Turn left]. Then Repeat 5 Drive.', [5, 'L', 5, 'L', 5], [rep(2, rep(5, F()), L()), rep(5, F())]);
nl(2, 16, 'Long Zig-Zag', 'A really long zig-zag. Find the part that repeats!', 'Repeat 4: [Repeat 2 Drive, Turn right, Repeat 2 Drive, Turn left].', [2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2], [rep(4, rep(2, F()), R(), rep(2, F()), L())]);
nl(2, 17, 'First Cone', 'A traffic cone 🚧 is on the road! Drive around it.', 'Drive, Turn right, Drive, Turn left, Drive, Drive, Turn left, Drive, Turn right.', ['D'], DODGE(), { use: [] });
nl(2, 17, 'Drive and Dodge', 'Drive up to the cone, then go around it.', 'Repeat 2 Drive, then the dodge moves.', [2, 'D'], [rep(2, F()), ...DODGE()]);
nl(2, 18, 'Dodge, Drive, Dodge', 'Cone, road, cone.', 'Repeat 2: [the dodge, then Repeat 2 Drive].', ['D', 2, 'D'], [rep(2, ...DODGE(), rep(2, F()))]);
nl(2, 19, 'Three Zig-Zags', 'Three big zig-zags.', 'Repeat 3: [Repeat 3 Drive, Turn right, Repeat 3 Drive, Turn left].', [3, 'R', 3, 'L', 3, 'R', 3, 'L', 3, 'R', 3], [rep(3, rep(3, F()), R(), rep(3, F()), L())]);
nl(2, 19, 'Cone Lane', 'FOUR cones in a line!', 'Repeat 4 with the whole dodge inside.', ['D', 'D', 'D', 'D'], [rep(4, ...DODGE())]);
nl(2, 19, 'Big Square', 'Nearly all the way round a big square.', 'Repeat 3: [Repeat 4 Drive, Turn right]. Then Repeat 3 Drive.', [4, 'R', 4, 'R', 4, 'R', 3], [rep(3, rep(4, F()), R()), rep(3, F())]);
nl(2, 19, 'Tallest Stairs', 'The tallest stairs in Loop City.', 'Repeat 6: Drive, Turn right, Drive, Turn left.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'], [rep(6, F(), R(), F(), L())]);

// ---------- World 3: Sandy Desert ----------
const untilFinish = () => [whl(no('atFinish'), F())];
const whileRoad = (turn: () => Block) => [whl(ok('roadAhead'), F()), turn(), whl(ok('roadAhead'), F())];
const turnIfBlocked = (turn: () => Block) => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [turn()]))];
const WI: Feature[] = ['while', 'if'];
nl(3, 0, 'Are We There Yet?', "Your car's eyes can check atFinish. It is true when you reach the flag.", 'While NOT atFinish: Drive.', [3], untilFinish());
nl(3, 0, 'Keep Going', 'The same While loop works for any length of road!', 'While NOT atFinish: Drive.', [5], untilFinish());
nl(3, 21, 'Road Ahead?', "'roadAhead' is true when there is road in front of the car.", 'While roadAhead: Drive.', [4], [whl(ok('roadAhead'), F())]);
nl(3, 21, 'Look, Turn, Look', 'Drive until the road ends, turn, and do it again.', 'While roadAhead: Drive. Turn right. While roadAhead: Drive.', [3, 'R', 3], whileRoad(R));
nl(3, 22, 'Left at the End', 'Same idea, but turn left.', 'While roadAhead: Drive. Turn left. While roadAhead: Drive.', [2, 'L', 4], whileRoad(L));
nl(3, 22, 'No Road? Turn!', 'Meet If and else: if there is road, drive. If not, turn right.', 'While NOT atFinish: If roadAhead, Drive, else Turn right.', [3, 'R', 2], turnIfBlocked(R), { use: WI });
nl(3, 23, 'Right, Right', 'Two right turns. Your smart loop can do both!', 'While NOT atFinish: If roadAhead, Drive, else Turn right.', [2, 'R', 2, 'R', 2], turnIfBlocked(R), { use: WI });
nl(3, 23, 'No Road? Go Left!', 'This road turns left.', 'While NOT atFinish: If roadAhead, Drive, else Turn left.', [2, 'L', 3], turnIfBlocked(L), { use: WI });
nl(3, 24, 'Left Turn Desert', 'Lots of left turns.', 'Same loop, but Turn left in the else.', [3, 'L', 2, 'L', 3], turnIfBlocked(L), { use: WI });
nl(3, 24, 'Which Way?', 'Now the road turns both ways. Check roadLeft to choose!', 'In the else: If roadLeft, Turn left, else Turn right.', [2, 'R', 2, 'L', 2], SMART(), { use: WI });
nl(3, 25, 'Sand Hill Race', 'Up and over the sand hills.', 'Your which-way loop works here too.', [3, 'L', 2, 'R', 3], SMART(), { use: WI });
nl(3, 25, 'Smart Dodge', 'A cone! Your smart car can go around it without counting.', 'The which-way loop goes around cones too.', ['D'], SMART(), { use: WI });
nl(3, 26, 'Cone, Then Drive', 'A cone, then a long road.', 'Same smart loop!', ['D', 3], SMART(), { use: WI });
nl(3, 26, 'Cactus Valley', 'A twisty valley full of cactus plants.', 'Same smart loop!', [2, 'R', 4, 'L', 2, 'L', 3], SMART(), { use: WI });
nl(3, 27, 'Coin Horn', "'coinAhead' is true when a coin is just in front. Use Horn when you see one!", 'While NOT atFinish: If coinAhead, Horn. Then Drive.', [4], [whl(no('atFinish'), iff(ok('coinAhead'), [honk()]), F())], { use: WI });
nl(3, 28, 'Desert Wiggle', 'A wiggly sand road.', 'The smart loop can do wiggles.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1], SMART(), { use: WI });
nl(3, 29, 'Round the Pond', 'Go around the water pond and down the other side.', 'Same smart loop!', [3, 'R', 3, 'R', 3, 'L', 3, 'L', 3], SMART(), { use: WI });
nl(3, 29, 'Cone Corner', 'Cones near the corners. Stay smart!', 'Same smart loop!', ['D', 2, 'R', 3, 'D', 2], SMART(), { use: WI });
nl(3, 29, 'Weaving Road', 'A turn, then cones.', 'Same smart loop!', [3, 'L', 2, 'D', 2, 'R', 3], SMART(), { use: WI });
nl(3, 29, 'Magic Road', "Is this road real or magic? Only your car's eyes know!", 'Same smart loop!', [4, 'R', 2, 'D', 2, 'L', 3], SMART(), { use: WI });

// ---------- World 4: Cone Jungle ----------
const repDist = () => rep(sn('distanceAhead'), F());
const distSmart = () => [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))];
const andSmart = () => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))];
const rightSmart = () => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadRight'), [R()], [L()])]))];
const threeIfs = () => [whl(no('atFinish'), iff(all(no('roadAhead'), ok('roadLeft')), [L()]), iff(all(no('roadAhead'), ok('roadRight')), [R()]), iff(ok('roadAhead'), [F()]))];
const countTurn = () => [whl(no('atFinish'), repDist(), turnToRoad())];
const orLoop = () => [whl(any(ok('roadAhead'), ok('roadLeft'), ok('roadRight')), iff(ok('roadAhead'), [F()], [turnToRoad()]))];
const notLoop = () => [whl(no('atFinish'), iff(no('roadAhead'), [turnToRoad()], [F()]))];
nl(4, 0, 'How Far?', "'distanceAhead' is a NUMBER: how many road steps are in front. Use it in a Repeat!", 'Repeat (distanceAhead) times: Drive.', [4], [repDist()], { use: [] });
nl(4, 0, 'Measure Again', 'The same trick on a longer road.', 'Repeat (distanceAhead) times: Drive.', [6], [repDist()], { use: [] });
nl(4, 0, 'Measure the Corner', 'Measure, drive, turn, measure again.', 'Repeat (distanceAhead) Drive, Turn left, Repeat (distanceAhead) Drive.', [3, 'L', 5], [repDist(), L(), repDist()], { use: [] });
nl(4, 31, 'More Than Zero', "'>' means 'greater than'. Keep driving while the distance is more than 0.", 'While distanceAhead > 0: Drive.', [5], [whl(cmp(sn('distanceAhead'), '>', num(0)), F())], { use: ['while'] });
nl(4, 31, 'Corner Check', 'Use > inside an If to choose when to turn.', 'If distanceAhead > 0, Drive, else turn towards the road.', [3, 'R', 3], distSmart());
nl(4, 32, 'Left AND Not Right', 'Turn left only when left is open AND right is closed.', 'Join two checks with AND.', [3, 'L', 3], andSmart());
nl(4, 33, 'Right First', 'Look at the right side first this time.', 'If roadAhead, Drive, else If roadRight, Turn right, else Turn left.', [2, 'R', 2], rightSmart());
nl(4, 33, 'Right Side Road', 'The right-side-first rule works on left turns too!', 'If roadAhead, Drive, else If roadRight, Turn right, else Turn left.', [3, 'L', 2, 'L', 2], rightSmart());
nl(4, 34, 'Ask Three Times', 'Three If blocks, one after another: turn left? turn right? drive?', 'Each If checks NOT roadAhead and one side.', [2, 'R', 2], threeIfs());
nl(4, 35, 'Count, Then Turn', 'Drive the full straight road with distanceAhead, then turn.', 'While NOT atFinish: Repeat (distanceAhead) Drive, then turn towards the road.', [3, 'R', 3], countTurn());
nl(4, 35, 'Jungle Corners', 'Same idea with more corners.', 'While NOT atFinish: Repeat (distanceAhead) Drive, then turn towards the road.', [2, 'L', 4, 'R', 2], countTurn());
nl(4, 36, 'River Cone', 'A cone near the small river.', 'Your which-way loop can go around cones.', ['D', 2], SMART());
nl(4, 37, 'Any Road Is OK', "'||' means OR. Keep going while ANY road is open.", 'While roadAhead OR roadLeft OR roadRight: …', [2, 'R', 3], orLoop());
nl(4, 38, 'Try NOT', 'You used NOT with atFinish. Now try it with roadAhead: if there is NOT a road ahead, turn!', 'While NOT atFinish: If NOT roadAhead, turn towards the road, else Drive.', [3, 'L', 2], notLoop());
nl(4, 38, 'NOT Again', 'NOT works on longer roads too.', 'Same NOT loop.', [2, 'R', 2, 'L', 2, 'R', 2], notLoop());
nl(4, 38, 'Exactly Zero', "'=' checks if two things are the same. Turn when the distance is exactly 0.", 'If distanceAhead = 0, turn towards the road, else Drive.', [4, 'R', 3, 'L', 4], [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '==', num(0)), [turnToRoad()], [F()]))]);
nl(4, 39, 'At Least One', "'≥' means 'greater than or equal to'. Drive while there is at least 1 step of road.", 'While distanceAhead ≥ 1: Drive.', [5], [whl(cmp(sn('distanceAhead'), '>=', num(1)), F())], { use: ['while'] });
nl(4, 39, 'Two Cones', 'Two cones and a turn.', 'Use the AND loop.', ['D', 'D', 2, 'L', 2], andSmart());
nl(4, 39, 'Measure and Dodge', 'Measure the road to get past the cones.', 'Use the distanceAhead > 0 loop.', [3, 'R', 2, 'D', 2, 'L', 3], distSmart());
nl(4, 39, 'Jungle Run', 'A long drive through the jungle.', 'Use the OR loop.', [2, 'L', 2, 'R', 2, 'D', 'D', 2], orLoop());

// ---------- World 5: Number Mountain ----------
const n = (k: number) => num(k);
nl(5, 0, 'My First Box', 'A variable is a box with a name. Make a box called steps with 3 in it, then Repeat (steps).', 'Make box steps = 3, then Repeat (steps) Drive.', [3], [mk('steps', n(3)), rep(v('steps'), F())]);
nl(5, 0, 'Bigger Number', 'Change the number in the box to drive further.', 'Make box steps = 5, then Repeat (steps) Drive.', [5], [mk('steps', n(5)), rep(v('steps'), F())]);
nl(5, 41, 'Use It Twice', 'A box can be used again and again!', 'Make box n = 2. Repeat n Drive, Turn left, Repeat n Drive.', [2, 'L', 2], [mk('n', n(2)), rep(v('n'), F()), L(), rep(v('n'), F())]);
nl(5, 41, 'Box in a Loop', 'Use your box inside a loop inside a loop!', 'Make box n = 3. Repeat 2: [Repeat n Drive, Turn right]. Then Repeat n Drive.', [3, 'R', 3, 'R', 3], [mk('n', n(3)), rep(2, rep(v('n'), F()), R()), rep(v('n'), F())]);
nl(5, 42, 'Read the Sign', "'readSign' reads the number on the sign under your car.", 'Drive 1 step. Make box n = readSign. Repeat n Drive.', [4], [F(), mk('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 3 } });
nl(5, 43, 'New Sign, New Number', 'Use Set box to put a new number in the same box.', 'After the turn: Drive, Set box n = readSign, Repeat n Drive.', [3, 'L', 2], [F(), mk('n', sn('readSign')), rep(v('n'), F()), L(), F(), setv('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 2, 4: 1 } });
nl(5, 45, 'Count Down 4', 'Count 4, 3, 2, 1… Change the box by -1 each time.', 'Make box n = 4. While n > 0: Drive, Change box n by -1.', [4], [mk('n', n(4)), whl(cmp(v('n'), '>', n(0)), F(), chg('n', n(-1)))]);
nl(5, 44, 'Plus One', 'Change a box by 1 to make it bigger.', 'Make box n = 2. Repeat n Drive, Turn right, Change box n by 1, Repeat n Drive.', [2, 'R', 3], [mk('n', n(2)), rep(v('n'), F()), R(), chg('n', n(1)), rep(v('n'), F())]);
nl(5, 44, 'Small Spiral', 'Each side is one step longer than the last.', 'Make box n = 1. Repeat 2: [Repeat n Drive, Turn right, Change box n by 1]. Then Repeat n Drive.', [1, 'R', 2, 'R', 3], [mk('n', n(1)), rep(2, rep(v('n'), F()), R(), chg('n', n(1))), rep(v('n'), F())]);
nl(5, 46, 'Times Table', 'Maths in a box: × means times.', 'Make box a = 2 × 2. Repeat a Drive, Turn left, Repeat (4 − 2) Drive.', [4, 'L', 2], [mk('a', bin(n(2), '*', n(2))), rep(v('a'), F()), L(), rep(bin(n(4), '-', n(2)), F())]);
nl(5, 47, 'Double Sign', 'This sign shows only HALF the way. Make it double!', 'Drive, Make box h = readSign, Repeat (h × 2) Drive.', [7], [F(), mk('h', sn('readSign')), rep(bin(v('h'), '*', n(2)), F())], { signs: { 1: 3 } });
nl(5, 48, 'Double Up', 'Make the box double: Change box n by n.', 'Make box n = 2. Repeat n Drive, Turn left, Change box n by n, Repeat n Drive.', [2, 'L', 4], [mk('n', n(2)), rep(v('n'), F()), L(), chg('n', v('n')), rep(v('n'), F())]);
nl(5, 49, 'Same Number', 'Three straight roads, all the same length. One box for all!', 'Make box n = 3, then use Repeat n three times.', [3, 'R', 3, 'L', 3], [mk('n', n(3)), rep(v('n'), F()), R(), rep(v('n'), F()), L(), rep(v('n'), F())]);
nl(5, 49, 'Smaller Spiral', 'Each side is one step SHORTER. Change box by -1!', 'Make box n = 5. Repeat 4: [Repeat n Drive, Turn right, Change box n by -1]. Then Repeat n Drive.', [5, 'R', 4, 'R', 3, 'R', 2, 'R', 1], [mk('n', n(5)), rep(4, rep(v('n'), F()), R(), chg('n', n(-1))), rep(v('n'), F())]);
nl(5, 49, 'Sign Plus One', 'The road is one step longer than the sign says.', 'Drive, Make box n = readSign, Repeat (n + 1) Drive.', [4], [F(), mk('n', sn('readSign')), rep(bin(v('n'), '+', n(1)), F())], { signs: { 1: 2 } });
nl(5, 49, 'Box Maths', 'The last side is one step shorter than the others.', 'Make box side = 3. Repeat 3: [Repeat side Drive, Turn right]. Then Repeat (side − 1) Drive.', [3, 'R', 3, 'R', 3, 'R', 2], [mk('side', n(3)), rep(3, rep(v('side'), F()), R()), rep(bin(v('side'), '-', n(1)), F())]);
nl(5, 49, 'Spiral Stairs', 'A spiral that grows, with four sides.', 'Make box n = 1. Repeat 3: [Repeat n Drive, Turn right, Change box n by 1]. Then Repeat n Drive.', [1, 'R', 2, 'R', 3, 'R', 4], [mk('n', n(1)), rep(3, rep(v('n'), F()), R(), chg('n', n(1))), rep(v('n'), F())]);
nl(5, 49, 'Half Way', '÷ means divide. The second road is half of the first.', 'Make box n = 6. Repeat n Drive, Turn left, Repeat (n ÷ 2) Drive.', [6, 'L', 3], [mk('n', n(6)), rep(v('n'), F()), L(), rep(bin(v('n'), '/', n(2)), F())]);
const signTrail = () => [whl(no('atFinish'), F(), mk('n', sn('readSign')), rep(v('n'), F()), turnToRoad())];
nl(5, 49, 'Follow the Signs', 'Follow the signs: drive, read, go that far, turn.', 'While NOT atFinish: Drive, Make box n = readSign, Repeat n Drive, turn towards the road.', [3, 'R', 2], signTrail(), { signs: { 1: 2, 4: 1 } });
nl(5, 49, 'Hill Top Road', 'Three signs on the way to the top.', 'Same follow-the-signs loop.', [3, 'L', 3, 'R', 2], signTrail(), { signs: { 1: 2, 4: 2, 7: 1 } });

// ---------- World 6: Function Factory ----------
const smartFn = () => [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))];
nl(6, 0, 'My First Function', 'A function is your OWN command. Make one called two that drives twice.', 'Function two: Drive, Drive. Then: Call two, Turn right, Call two.', [2, 'R', 2], [fn('two', [], F(), F()), call('two'), R(), call('two')]);
nl(6, 0, 'Stair Function', 'Make a command called step and use it two times.', 'Function step: Drive, Turn right, Drive, Turn left. Call step two times.', [1, 'R', 1, 'L', 1, 'R', 1, 'L'], [fn('step', [], F(), R(), F(), L()), call('step'), call('step')]);
nl(6, 51, 'Long Side', 'A function can have a loop inside.', 'Function side: Repeat 4 Drive. Call side, Turn left, Call side.', [4, 'L', 4], [fn('side', [], rep(4, F())), call('side'), L(), call('side')]);
nl(6, 52, 'Two Dodges', 'Put the dodge in a function and call it two times.', 'Function dodge: the 9 dodge moves. Call it two times.', ['D', 'D'], [dodgeFn(), call('dodge'), call('dodge')]);
nl(6, 53, 'Corner Function', 'A function with a turn inside.', 'Function side: Repeat 2 Drive, Turn right. Repeat 3: Call side. Then Drive.', [2, 'R', 2, 'R', 2, 'R', 1], [fn('side', [], rep(2, F()), R()), rep(3, call('side')), F()]);
nl(6, 55, 'Beep Beep Beep', 'Make a beep function that plays the Horn three times.', 'Function beep: Horn, Horn, Horn. Call beep, then Repeat 3 Drive.', [3], [fn('beep', [], honk(), honk(), honk()), call('beep'), rep(3, F())]);
nl(6, 57, 'Zig-Zag Function', 'One function, two zig-zags.', 'Function zz: Repeat 2 Drive, Turn left, Repeat 2 Drive, Turn right. Repeat 2: Call zz.', [2, 'L', 2, 'R', 2, 'L', 2, 'R'], [fn('zz', [], rep(2, F()), L(), rep(2, F()), R()), rep(2, call('zz'))]);
nl(6, 58, 'Two Helpers', 'Make two functions: one turns right, one turns left.', 'Function a: Repeat 3 Drive, Turn right. Function b: Repeat 3 Drive, Turn left. Call a, b, a, then Repeat 3 Drive.', [3, 'R', 3, 'L', 3, 'R', 3], [fn('a', [], rep(3, F()), R()), fn('b', [], rep(3, F()), L()), call('a'), call('b'), call('a'), rep(3, F())]);
nl(6, 59, 'Smart Turn', 'Put the "which way?" choice into a function.', 'Function turn: If roadLeft, Turn left, else Turn right. While NOT atFinish: If roadAhead, Drive, else Call turn.', [2, 'R', 3, 'L', 2], smartFn(), { use: ['function', 'while'] });
nl(6, 59, 'Factory Floor', 'A twisty factory floor with a cone.', 'Same turn function and smart loop.', [3, 'L', 2, 'D', 2, 'R', 3], smartFn(), { use: ['function', 'while'] });

// ---------- World 7: Parameter Port ----------
nl(7, 0, 'Tell It How Far', 'A function can take a number: go(3) drives 3.', 'Function go(n): Repeat n Drive. Then Call go(3).', [3], [goFn(), call('go', n(3))]);
nl(7, 0, 'Different Numbers', 'Call the same function with different numbers.', 'go(2), Turn left, go(3).', [2, 'L', 3], [goFn(), call('go', n(2)), L(), call('go', n(3))]);
nl(7, 61, 'Along the Port', 'Three calls along the port.', 'go(4), Turn right, go(2), Turn right, go(4).', [4, 'R', 2, 'R', 4], [goFn(), call('go', n(4)), R(), call('go', n(2)), R(), call('go', n(4))]);
nl(7, 62, 'Drive, Then Turn', 'A function that drives and then turns.', 'Function leg(n): Repeat n Drive, Turn right. leg(1), leg(2), then Repeat 3 Drive.', [1, 'R', 2, 'R', 3], [fn('leg', ['n'], rep(v('n'), F()), R()), call('leg', n(1)), call('leg', n(2)), rep(3, F())]);
nl(7, 64, 'How Many Stairs', 'Tell the function how many stairs to climb.', 'Function hop(times): Repeat times [Drive, Turn right, Drive, Turn left]. Call hop(3).', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'], [fn('hop', ['times'], rep(v('times'), F(), R(), F(), L())), call('hop', n(3))]);
nl(7, 67, 'Number and Word', "Give it two things: a number AND a word. move(3, 'L') drives 3 steps, then turns left.", "Function move(n, d): Repeat n Drive, If d = 'L', Turn left, else Turn right.", [3, 'L', 2, 'R', 3], [fn('move', ['n', 'd'], rep(v('n'), F()), iff(cmp(v('d'), '==', str('L')), [L()], [R()])), call('move', n(3), str('L')), call('move', n(2), str('R')), rep(3, F())]);
nl(7, 68, 'Zig by Number', 'A zig-zag function. You choose the size.', 'Function zig(n): Repeat n Drive, Turn right, Repeat n Drive, Turn left. Call zig(2), then Repeat 2 Drive.', [2, 'R', 2, 'L', 2], [fn('zig', ['n'], rep(v('n'), F()), R(), rep(v('n'), F()), L()), call('zig', n(2)), rep(2, F())]);
nl(7, 69, 'Smaller Each Time', 'Give your function a box that gets smaller.', 'leg(n): Repeat n Drive, Turn right. Make box n = 4. Repeat 3: [leg(n), Change box n by -1]. Then Repeat n Drive.', [4, 'R', 3, 'R', 2, 'R', 1], [fn('leg', ['n'], rep(v('n'), F()), R()), mk('n', n(4)), rep(3, call('leg', v('n')), chg('n', n(-1))), rep(v('n'), F())]);
nl(7, 69, 'Square Dance', 'A function that takes a number, drives AND turns. Use it three times.', 'side(n): Repeat n Drive, Turn right. Call side(3) three times, then Repeat 2 Drive.', [3, 'R', 3, 'R', 3, 'R', 2], [fn('side', ['n'], rep(v('n'), F()), R()), call('side', n(3)), call('side', n(3)), call('side', n(3)), rep(2, F())]);
nl(7, 69, 'Growing Waves', 'Waves that grow: 1, 2, 3.', 'Make box n = 1. go(n), Turn right, Change box n by 1, go(n), Turn left, Change box n by 1, go(n).', [1, 'R', 2, 'L', 3], [goFn(), mk('n', n(1)), call('go', v('n')), R(), chg('n', n(1)), call('go', v('n')), L(), chg('n', n(1)), call('go', v('n'))]);

// ---------- World 8: List Lagoon ----------
const legLoop = () => [each('leg', 'legs', rep(v('leg'), F()), R())];
const cmdLoop = (item: string, list: string) => [each(item, list, iff(cmp(v(item), '==', str('F')), [F()], [iff(cmp(v(item), '==', str('R')), [R()], [L()])]))];
const mapLoop = () => [each('step', 'map', rep(v('step.n'), iff(cmp(v('step.c'), '==', str('F')), [F()], [iff(cmp(v('step.c'), '==', str('R')), [R()], [L()])])))];
nl(8, 0, 'First List', 'A list keeps many things in order: legs = [2, 2]. For each goes through them one by one.', 'For each leg in legs: Repeat leg Drive, Turn right.', [2, 'R', 2], legLoop(), { data: { legs: [2, 2] } });
nl(8, 71, 'One, Two, Three', 'A list that counts up.', 'For each leg in legs: Repeat leg Drive, Turn right.', [1, 'R', 2, 'R', 3], legLoop(), { data: { legs: [1, 2, 3] } });
nl(8, 72, 'First and Second', 'legs[0] is the FIRST item and legs[1] the second.', 'Repeat legs[0] Drive, Turn left, Repeat legs[1] Drive.', [3, 'L', 2], [rep(v('legs[0]'), F()), L(), rep(v('legs[1]'), F())], { data: { legs: [3, 2] }, use: [] });
nl(8, 73, 'A Word in a List', "Lists can keep words. 'L' means turn left.", "For each t in turns: Repeat 2 Drive, If t = 'R', Turn right, else Turn left. Then Repeat 2 Drive.", [2, 'L', 2], [each('t', 'turns', rep(2, F()), iff(cmp(v('t'), '==', str('R')), [R()], [L()])), rep(2, F())], { data: { turns: ['L'] } });
nl(8, 74, 'Coin Count', 'Add up the list to find how far to go.', 'Make box total = 0. For each c in coins: Change box total by c. Repeat total Drive.', [4], [mk('total', n(0)), each('c', 'coins', chg('total', v('c'))), rep(v('total'), F())], { data: { coins: [1, 3] } });
nl(8, 75, 'Two Stops', 'Each stop has two parts: how far (n) and which way (t).', "For each stop: Repeat stop.n Drive, If stop.t = 'R', Turn right, else Turn left.", [3, 'R', 2], [each('stop', 'stops', rep(v('stop.n'), F()), iff(cmp(v('stop.t'), '==', str('R')), [R()], [L()]))], { data: { stops: [{ n: 3, t: 'R' }, { n: 2, t: 'R' }] } });
nl(8, 77, 'Coral Road', "A list of road lengths and the car's eyes for turning.", 'For each leg: Repeat leg Drive, then turn towards the road.', [2, 'L', 3, 'R', 2], [each('leg', 'legs', rep(v('leg'), F()), turnToRoad())], { data: { legs: [2, 3, 2] } });
nl(8, 78, 'Small Commands', "A short list of commands: 'F' drive, 'L' left, 'R' right.", "For each cmd: If cmd = 'F', Drive, else If 'R', Turn right, else Turn left.", [1, 'L', 2], cmdLoop('cmd', 'cmds'), { data: { cmds: ['F', 'L', 'F', 'F'] } });
nl(8, 79, 'Pearl Map', 'A map made of objects: c is the command and n is how many times.', "For each step in map: Repeat step.n [If step.c = 'F', Drive, else If 'R', Turn right, else Turn left].", [3, 'R', 3], mapLoop(), { data: { map: [{ c: 'F', n: 3 }, { c: 'R', n: 1 }, { c: 'F', n: 3 }] } });
nl(8, 79, 'Shell Map', 'A longer map to the shells.', 'Same map loop.', [2, 'L', 4, 'R', 1], mapLoop(), { data: { map: [{ c: 'F', n: 2 }, { c: 'L', n: 1 }, { c: 'F', n: 4 }, { c: 'R', n: 1 }, { c: 'F', n: 1 }] } });

// ---------- World 9: Gate Galaxy ----------
const signSays = () => onsign('sign', say(v('password')));
nl(9, 0, 'Magic Word', "A gate 🚪 is in the way! Stand in front of it and say the magic word 'go'.", "Drive, Say 'go', Drive, Drive.", [3], [F(), say(str('go')), F(), F()], { gates: [2], secret: 'go' });
nl(9, 81, 'Password Please', 'The password is in a box called password.', 'Repeat 2 Drive, say(password), Repeat 3 Drive.', [5], [rep(2, F()), say(v('password')), rep(3, F())], { gates: [3], secret: 'zoom', data: { password: 'zoom' } });
nl(9, 83, 'Space Glue', 'Join two words together with +.', 'say(a + b)', [4], [F(), say(bin(v('a'), '+', v('b'))), rep(3, F())], { gates: [2], secret: 'starship', data: { a: 'star', b: 'ship' } });
nl(9, 85, 'Fuel Meter', 'car.fuel is a number inside the car object.', 'Repeat car.fuel Drive, Turn left, Repeat (car.fuel − 3) Drive.', [5, 'L', 2], [rep(v('car.fuel'), F()), L(), rep(bin(v('car.fuel'), '-', n(3)), F())], { data: { car: { fuel: 5 } }, use: [] });
nl(9, 86, 'First Event', 'On sign runs your code on its own every time you pass a sign. Sign 2 means right.', 'On sign: If sign = 1, Turn left, else Turn right. Then Repeat 4 Drive.', [2, 'R', 2], [signHandler(), rep(4, F())], { signs: { 2: 2 }, use: ['onsign'] });
nl(9, 87, 'Left Signs', 'Two signs that both say left.', 'Same On sign block, then Repeat 6 Drive.', [2, 'L', 2, 'L', 2], [signHandler(), rep(6, F())], { signs: { 2: 1, 4: 1 }, use: ['onsign'] });
nl(9, 88, 'Talking Sign', 'When the car passes this sign, make it say the password.', 'On sign: say(password). Then Repeat 4 Drive.', [4], [signSays(), rep(4, F())], { signs: { 1: 1 }, gates: [2], secret: 'nova', data: { password: 'nova' }, use: ['onsign'] });
nl(9, 89, 'Star Corners', 'Signs at every corner.', 'Same left/right On sign block, then Repeat 8 Drive.', [3, 'R', 2, 'L', 3], [signHandler(), rep(8, F())], { signs: { 3: 2, 5: 1 }, use: ['onsign'] });
nl(9, 89, 'Moon Gate', 'Sign 1 = say the code word. Sign 3 = turn left.', 'On sign: If sign = 3, Turn left, else say(code.word). Repeat 7 Drive.', [4, 'L', 3], [onsign('sign', iff(cmp(v('sign'), '==', n(3)), [L()], [say(v('code.word'))])), rep(7, F())], { signs: { 1: 1, 4: 3 }, gates: [2], secret: 'moon', data: { code: { word: 'moon' } }, use: ['onsign'] });
nl(9, 89, 'Star Road', 'A sign at every turn. Let On sign do the turning!', 'Same left/right On sign block, then Repeat 8 Drive.', [2, 'R', 2, 'L', 2, 'R', 2], [signHandler(), rep(8, F())], { signs: { 2: 2, 4: 1, 6: 2 }, use: ['onsign'] });

// ---------- World 10: Glitch's Castle ----------
nl(10, 0, 'Tiny Bug', 'Dr. Glitch broke this short program. It stops one step too soon!', 'Change the Repeat from 2 to 3.', [3], [rep(3, F())], { starter: [rep(2, F())], use: [] });
nl(10, 91, 'Wrong Way', 'This program turns the wrong way at the corner.', 'Change Turn right to Turn left.', [2, 'L', 2], [rep(2, F()), L(), rep(2, F())], { starter: [rep(2, F()), R(), rep(2, F())], use: [] });
nl(10, 93, 'Box Bug', 'The box has the wrong number in it.', 'Make box n = 4, not 3.', [4], [mk('n', n(4)), rep(v('n'), F())], { starter: [mk('n', n(3)), rep(v('n'), F())], use: ['let'] });
nl(10, 95, 'Tiny Recursion', 'A function that calls ITSELF. dash(3) drives, then calls dash(2), then dash(1)…', 'dash(n): If n > 0, Drive, then Call dash(n − 1). Call dash(3).', [3], [fn('dash', ['n'], iff(cmp(v('n'), '>', n(0)), [F(), call('dash', bin(v('n'), '-', n(1)))])), call('dash', n(3))], { use: ['function'] });
nl(10, 97, 'Little Spiral', 'A small spiral made by a function that calls itself.', 'spiral(n): If n < 4, Repeat n Drive, Turn right, Call spiral(n + 1). Call spiral(1).', [1, 'R', 2, 'R', 3], [fn('spiral', ['n'], iff(cmp(v('n'), '<', n(4)), [rep(v('n'), F()), R(), call('spiral', bin(v('n'), '+', n(1)))])), call('spiral', n(1))], { use: ['function'] });
nl(10, 98, 'Spinning Bug', 'This smart loop turns round at the corner and goes back. Fix the turn!', 'In the else, Turn right instead of Turn left.', [2, 'R', 3], turnIfBlocked(R), { starter: turnIfBlocked(L), use: WI });
nl(10, 98, 'Function Bug', 'The function is fine, but the program turns the wrong way.', 'Turn left between the two go(3) calls.', [3, 'L', 3], [goFn(), call('go', n(3)), L(), call('go', n(3))], { starter: [goFn(), call('go', n(3)), R(), call('go', n(3))], use: ['function'] });
nl(10, 98, 'Dodge Bug', 'One turn in this dodge is wrong. Find it!', 'The second turn of the dodge should be Turn left.', ['D', 2], [...DODGE(), rep(2, F())], { starter: [F(), R(), F(), R(), F(), F(), L(), F(), R(), rep(2, F())], use: [] });
nl(10, 99, 'Castle Paths', 'Twisty castle paths with a cone.', 'Function turn and a smart loop.', [2, 'R', 2, 'L', 2, 'D', 2], smartFn(), { use: ['function', 'while'] });
nl(10, 99, 'Final Exam', "A list, a function and the car's eyes, all together. Dr. Glitch is watching!", 'Function go(n). For each leg in legs: go(leg), then turn towards the road.', [3, 'R', 2, 'L', 3, 'R', 2], [goFn(), each('leg', 'legs', call('go', v('leg')), turnToRoad())], { data: { legs: [3, 2, 3, 2] }, use: ['foreach', 'function'] });

// ---------- difficulty, earlier ideas, and putting each world in order ----------

/** First third of a world: warm-up (learn). Middle: challenge (practise). Last third and the boss: expert (master). */
function tierOf(index: number, size: number): Tier {
  if (index <= Math.round(size / 3)) return 'warmup';
  if (index <= Math.round((size * 2) / 3)) return 'challenge';
  return 'expert';
}

const roadLength = (grid: string[]) => grid.join('').replace(/[#o]/g, '').length;

/** The world where each idea is first taught. */
const FIRST_WORLD: Partial<Record<Feature, number>> = { loop: 2, repeat: 2, while: 3, if: 3, let: 5, function: 6, foreach: 8, say: 9, onsign: 9 };

/**
 * Adds ideas from EARLIER worlds to "must use", but only ones the model solution really uses:
 * one on challenge levels, up to two on expert levels. An earlier loop is asked for as "any loop",
 * so a kid can choose Repeat, While or For each.
 */
function carryOver(use: Feature[], ref: Block[], ch: number, tier: Tier): Feature[] {
  const max = tier === 'challenge' ? 1 : tier === 'expert' ? 2 : 0;
  if (max === 0) return use;
  const has = featuresOfBlocks(ref);
  const loops: Feature[] = ['repeat', 'while', 'foreach', 'loop'];
  const extra = (['loop', 'if', 'let', 'function', 'foreach', 'say'] as Feature[]).filter(
    (f) =>
      has.has(f) &&
      (FIRST_WORLD[f] ?? 99) < ch &&
      !use.includes(f) &&
      !(loops.includes(f) && use.some((u) => loops.includes(u))),
  );
  return [...use, ...extra.slice(0, max)];
}

// ---------- put each world in order and number every level ----------
function assemble(): Level[] {
  const out: Level[] = [];
  for (let ch = 1; ch <= 10; ch++) {
    const extras = (after: number) => EXTRA.filter((e) => e.draft.chapter === ch && e.after === after).map((e) => e.draft);
    const world: (Draft & { old?: number })[] = [...extras(0)];
    for (const o of ORIGINAL.filter((l) => l.chapter === ch).sort((a, b) => a.old - b.old)) world.push(o, ...extras(o.old));
    world.forEach((d, i) => {
      const { route, ...rest } = d;
      const index = i + 1;
      const tier = tierOf(index, world.length);
      const level: Level = { ...rest, id: out.length + 1, index, boss: i === world.length - 1, tools: toolsFor(ch, index, d.ref), tier, tests: [] };
      let main: TrackSpec = { route, data: d.data, secret: d.secret };
      // expert levels get a longer, twistier road when the model solution works on one
      if (tier === 'expert') {
        const grown = grow(level, main, roadLength(level.grid), d.ref);
        if (grown) {
          main = grown.spec;
          level.grid = grown.grid;
        }
      }
      // challenge and expert levels: the program must also win on other versions of the track
      if (tier !== 'warmup') level.tests = makeTests(level, main, level.grid, d.ref);
      // carry ideas from earlier worlds into "must use", where the level really needs them
      level.use = carryOver(level.use, d.ref, ch, tier);
      out.push(level);
    });
  }
  return out;
}

export const LEVELS: Level[] = assemble();
export const TOTAL_LEVELS = LEVELS.length;
export const levelById = (id: number) => LEVELS[id - 1];
export const levelsIn = (chapter: number) => LEVELS.filter((l) => l.chapter === chapter);
/** Old level number (1-100) → new level number, for moving saved progress. */
export const OLD_TO_NEW: Record<number, number> = Object.fromEntries(LEVELS.filter((l) => l.old).map((l) => [l.old, l.id]));
