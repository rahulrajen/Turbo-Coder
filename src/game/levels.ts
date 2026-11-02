import { type Block, type BlockType, type Feature, allBlocks, countBlocks, countCodeLines, toCode } from './ast';
import type { Dir, Level } from './engine';
import { type Part, buildGrid } from './route';
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
  if (ch > 1) t.push('honk');
  if (ch >= 2) t.push('repeat');
  if (ch >= 3) t.push('if', 'while');
  if (ch >= 5) t.push('let', 'set', 'change');
  if (ch >= 6) t.push('function', 'call');
  if (ch >= 8) t.push('foreach');
  if (ch >= 9) t.push('say', 'onsign');
  return t;
}

const DEFAULT_USE: Record<number, Feature[]> = { 2: ['repeat'], 3: ['while'], 4: ['if'], 5: ['let'], 6: ['function'], 7: ['function'], 8: ['foreach'], 9: ['say'] };

type Draft = Omit<Level, 'id' | 'index' | 'boss' | 'tools'>;

function make(ch: number, title: string, story: string, hint: string, parts: Part[], dir: Dir, ref: Block[], o: Opts): Draft {
  const { grid } = buildGrid({ dir, parts, signs: o.signs, gates: o.gates });
  return {
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
/** "Drive 3, turn left, drive 2." */
const describe = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === 'number' ? `drive ${p}` : p === 'L' ? 'turn left' : p === 'R' ? 'turn right' : 'dodge the cone'))
    .join(', ')
    .replace(/^./, (c) => c.toUpperCase()) + '.';

const STAIRS: Part[] = [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'];
const SPIRAL: Part[] = [1, 'R', 2, 'R', 3, 'R', 4, 'R', 5];
const turnToRoad = () => iff(ok('roadLeft'), [L()], [R()]);

// ---------- Chapter 1: Garage Town (commands) ----------
lv(1, 'Start Your Engine', 'A slightly longer road with a shiny coin 🪙 on it. Grab it on the way!', 'Count the squares between your car and the flag. You need 4 Drive blocks.', [4], 1, fx(4));
lv(2, 'Sharp Corner', 'The road bends left! Cars must turn to follow it.', 'Drive 3 times, turn left, then drive 2 times.', [3, 'L', 2], 1, [...fx(3), L(), ...fx(2)]);
lv(3, 'Right Turn', "Now the road bends right. Nitro Nick is already zooming ahead!", 'Drive twice, turn right, drive 3 times.', [2, 'R', 3], 1, [...fx(2), R(), ...fx(3)]);
lv(4, 'Coin Trail', 'Shiny coins 🪙 are lying on the road. Grab them on your way to the flag!', 'Left at the first bend, right at the second. Drive twice between the turns.', [2, 'L', 2, 'R', 2], 1, [...fx(2), L(), ...fx(2), R(), ...fx(2)]);
lv(5, 'U-Turn Alley', 'A narrow road that doubles back on itself.', 'Turn right twice with one drive in between.', [2, 'R', 1, 'R', 2], 1, [...fx(2), R(), ...fx(1), R(), ...fx(2)]);
lv(6, 'Zig Zag', 'Wheee! Right, left, right, left!', 'Drive, turn right, drive, turn left… and repeat the pattern.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1], 1, [F(), R(), F(), L(), F(), R(), F(), L(), F()]);
lv(7, 'Round the Block', 'Drive all the way around the block.', 'Three right turns. Drive 2, 2, 2 and then 1.', [2, 'R', 2, 'R', 2, 'R', 1], 1, [...fx(2), R(), ...fx(2), R(), ...fx(2), R(), F()]);
lv(8, 'The Long Road', 'This road is looooong. You will need MANY Drive blocks… phew! Is there a shortcut?', 'You need 8 Drive blocks. Tired? Loop City has a trick!', [8], 1, fx(8));
lv(9, 'Mountain Pass', 'Twisty road ahead. Look carefully at each bend.', 'Drive 2, left, drive 3, right, drive 2, left, drive 1.', [2, 'L', 3, 'R', 2, 'L', 1], 1, [...fx(2), L(), ...fx(3), R(), ...fx(2), L(), F()]);
lv(10, "Nick's Chicane", 'BOSS RACE! Nitro Nick set up a chicane. Beat him to the flag!', 'Right, left, right with 2 drives between each turn.', [2, 'R', 2, 'L', 2, 'R', 2], 1, [...fx(2), R(), ...fx(2), L(), ...fx(2), R(), ...fx(2)]);

// ---------- Chapter 2: Loop City (loops) ----------
lv(11, 'Repeat Power', "Coach: 'Use the Repeat block. You only need one!'", 'Repeat 8 times, with a Drive inside.', [8], 1, [rep(8, F())]);
lv(12, 'Corner Loop', 'Two long straights with a bend. Loops make it easy.', 'Repeat 5 Drive, turn left, Repeat 5 Drive.', [5, 'L', 5], 1, [rep(5, F()), L(), rep(5, F())]);
lv(13, 'Staircase', 'Climb the zig-zag stairs. Spot the pattern that repeats!', 'One step is Drive, right, drive, left. Repeat it 4 times.', STAIRS, 1, [rep(4, F(), R(), F(), L())]);
lv(14, 'Loop in a Loop', 'You can put a Repeat inside another Repeat!', 'Repeat 3 of [Repeat 3 Drive, turn right]. Then drive 2 more.', [3, 'R', 3, 'R', 3, 'R', 2], 1, [rep(3, rep(3, F()), R()), rep(2, F())]);
lv(15, 'Long & Winding', 'Left, right, left… four long straights.', 'Repeat 2 of [4 drives, left, 4 drives, right].', [4, 'L', 4, 'R', 4, 'L', 4], 1, [rep(2, rep(4, F()), L(), rep(4, F()), R())]);
lv(16, 'Spiral In', 'Roads that spiral inward get shorter each time.', 'Straights of 4, 3, 2, then 1, with right turns between.', [4, 'R', 3, 'R', 2, 'R', 1], 1, [rep(4, F()), R(), rep(3, F()), R(), rep(2, F()), R(), F()]);
lv(17, 'Pattern Spotter', 'Find the pattern and loop it!', 'Drive 2, right, drive 2, left. Three times.', [2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2], 1, [rep(3, rep(2, F()), R(), rep(2, F()), L())]);
lv(18, 'Cone Slalom', 'Cones 🚧 block the road! Swerve around each one.', 'One dodge: drive, right, drive, left, drive, drive, left, drive, right. Do it twice.', ['D', 'D'], 1, [rep(2, ...DODGE())]);
lv(19, 'Triple Slalom', 'Three cones in a row. Loops to the rescue!', 'Put the whole dodge inside Repeat 3.', ['D', 'D', 'D'], 1, [rep(3, ...DODGE())]);
lv(20, 'Roundabout Rally', 'BOSS! Nitro Nick challenges you to the Loop City Grand Prix!', 'Repeat 2 of [Repeat 3 Drive, right, Repeat 3 Drive, left]. Then drive 3 more.', [3, 'R', 3, 'L', 3, 'R', 3, 'L', 3], 1, [rep(2, rep(3, F()), R(), rep(3, F()), L()), rep(3, F())]);

// ---------- Chapter 3: Sandy Desert (if / else / while) ----------
lv(21, 'Look Ahead', 'A long desert road. Your While loop does not care how long it is!', 'While NOT atFinish: Drive.', [7], 1, [whl(no('atFinish'), F())]);
lv(22, 'Wall Detector', "'roadAhead' is true when there is road in front of you.", 'While roadAhead: Drive. Then turn right. Then do it again.', [5, 'R', 4], 1, [whl(ok('roadAhead'), F()), R(), whl(ok('roadAhead'), F())]);
lv(23, 'Turn When Blocked', 'If there is road ahead, drive. Otherwise turn right. Dr. Glitch hid the signs!', 'While not atFinish: If roadAhead then Drive, else turn right.', [3, 'R', 2, 'R', 3, 'R', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [R()]))], { use: ['while', 'if'] });
lv(24, 'Left Only', 'These bends all go left.', 'Same idea as before, but turn left in the else.', [3, 'L', 2, 'L', 3, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [L()]))], { use: ['while', 'if'] });
lv(25, 'Left or Right?', 'The bends go both ways. Ask the sensors which way is open!', 'In the else, check roadLeft: if true turn left, else turn right.', [2, 'R', 2, 'L', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(26, 'Cone Trouble', 'Two cones with road in between. One smart loop handles both!', 'The same smart loop as before works on cones too!', ['D', 2, 'D'], 1, SMART(), { use: ['while', 'if'] });
lv(27, 'Desert Maze', 'A winding maze. One smart loop solves any road.', 'While not atFinish: if roadAhead drive, else if roadLeft left, else right.', [3, 'R', 2, 'L', 4, 'L', 2, 'R', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(28, 'Coin Radar', "'coinAhead' sees coins. Honk when a coin is coming up!", 'Add an If inside your smart loop: coinAhead then honk.', [2, 'R', 2, 'L', 3, 'R', 2], 1, [whl(no('atFinish'), iff(ok('coinAhead'), [honk()]), iff(ok('roadAhead'), [F()], [turnToRoad()]))], { use: ['while', 'if'] });
lv(29, 'Zig Zag Highway', 'A long zig-zag. Counting would take forever.', 'The smart loop handles zig zags too.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1], 1, SMART(), { use: ['while', 'if'] });
lv(30, 'Sandstorm Run', "BOSS! Dr. Glitch's sandstorm! Dodge cones and corners with ONE smart loop.", 'While not atFinish… the same smart loop you have been building.', ['D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 1], 1, SMART(), { use: ['while', 'if'] });

// ---------- Chapter 4: Cone Jungle (conditions) ----------
lv(31, 'Measure Up', 'Measure both straights with distanceAhead. No counting needed!', 'Repeat (distanceAhead) times: Drive. Turn right. Repeat (distanceAhead) times: Drive.', [5, 'R', 4], 1, [rep(sn('distanceAhead'), F()), R(), rep(sn('distanceAhead'), F())], { use: [] });
lv(32, 'Greater Than', 'Use distanceAhead > 0 to decide: drive or turn? This road has more bends.', 'If distanceAhead > 0 then Drive, else turn toward the road.', [3, 'R', 2, 'L', 4, 'L', 2], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(33, 'This AND That', '&& means BOTH things must be true. Turn left only if left is open AND right is closed.', 'Use two conditions joined with AND in the turn check.', [3, 'L', 2, 'R', 3, 'R', 2, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);
lv(34, 'Right-Hand Rule', 'Explorers always check the right side first. Try it!', 'If roadAhead drive, else if roadRight turn right, else left.', [2, 'R', 3, 'L', 2, 'R', 4], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadRight'), [R()], [L()])]))]);
lv(35, 'Three Questions', 'Ask separate questions one after another: turn left? turn right? drive?', 'Three If blocks in a row, each using NOT roadAhead and a side.', [2, 'L', 2, 'R', 2, 'L', 2, 'R', 3], 1, [whl(no('atFinish'), iff(all(no('roadAhead'), ok('roadLeft')), [L()]), iff(all(no('roadAhead'), ok('roadRight')), [R()]), iff(ok('roadAhead'), [F()]))]);
lv(36, 'Count and Turn', 'Mix a counting loop with a decision.', 'While not atFinish: Repeat (distanceAhead) Drive, then if roadLeft turn left else right.', [4, 'R', 2, 'L', 3, 'R', 5], 1, [whl(no('atFinish'), rep(sn('distanceAhead'), F()), turnToRoad())]);
lv(37, 'Jungle Dodge', 'Cones and corners together.', 'Your smart loop works around cones too.', ['D', 1, 'D', 'D'], 1, SMART());
lv(38, 'This OR That', '|| means at least ONE is true. Keep driving while ANY road is open.', 'While roadAhead OR roadLeft OR roadRight: …', [2, 'R', 2, 'R', 2, 'L', 2, 'L', 3], 1, [whl(any(ok('roadAhead'), ok('roadLeft'), ok('roadRight')), iff(ok('roadAhead'), [F()], [turnToRoad()]))]);
lv(39, 'Vine Swing', 'A long jungle road full of cones and bends.', 'Use the distance-checking smart loop.', [2, 'D', 2, 'R', 2, 'D', 2, 'L', 3], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(40, "Nick's Jungle Trap", 'BOSS! Nitro Nick left a trap of cones! Use everything you know.', 'While not atFinish: if roadAhead drive, else if roadLeft AND NOT roadRight turn left, else turn right.', ['D', 'D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 'D', 1, 'R', 2], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);

// ---------- Chapter 5: Number Mountain (variables) ----------
lv(41, 'Meet Variables', 'One more box warm-up: put 4 in steps and drive that far.', 'Make steps = 4, then Repeat (steps) Drive.', [4], 1, [mk('steps', num(4)), rep(v('steps'), F())]);
lv(42, 'Two Boxes', 'Use two boxes for two straight bits of road.', 'Make a = 3 and b = 5. Repeat a, turn right, repeat b.', [3, 'R', 5], 1, [mk('a', num(3)), mk('b', num(5)), rep(v('a'), F()), R(), rep(v('b'), F())]);
lv(43, 'Sign Reader', 'Another sign! Read it into a box and drive that far.', 'Drive once to reach the sign. Make n = readSign. Repeat n times Drive.', [5], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 4 } });
lv(44, 'Sign Chain', 'Two signs on a longer road. Read, drive, turn, then read the next one!', 'After the turn, drive once, then Set n = readSign and repeat n.', [4, 'R', 3], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F()), R(), F(), setv('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 3, 5: 2 } });
lv(45, 'Growing Spiral', 'A bigger spiral! Grow your box with Change after every side.', 'Make n = 1. Repeat 4: [Repeat n Drive, turn right, Change n by 1]. Finish with Repeat n Drive.', SPIRAL, 1, [mk('n', num(1)), rep(4, rep(v('n'), F()), R(), chg('n', num(1))), rep(v('n'), F())]);
lv(46, 'Countdown', 'Count down to zero. Change by -1 each time.', 'Make n = 6. While n > 0: Drive and Change n by -1.', [6], 1, [mk('n', num(6)), whl(cmp(v('n'), '>', num(0)), F(), chg('n', num(-1)))]);
lv(47, 'Math Time', 'More math! Work out each straight with × and +.', 'The first straight is 2 × 3 and the second is 4 + 1.', [6, 'R', 5], 1, [mk('a', bin(num(2), '*', num(3))), rep(v('a'), F()), R(), rep(bin(num(4), '+', num(1)), F())]);
lv(48, 'Half the Distance', 'This sign shows HALF the distance. Double it!', 'Make h = readSign. Repeat (h × 2) Drive.', [5, 'L', 3], 1, [F(), mk('h', sn('readSign')), rep(bin(v('h'), '*', num(2)), F()), L(), rep(3, F())], { signs: { 1: 2 } });
lv(49, 'Double Trouble', 'The legs double each time: 1, 2, 4, 8. Change n by n!', 'Make n = 1. Repeat 3: [Repeat n Drive, right, Change n by n]. Then Repeat n Drive.', [1, 'R', 2, 'R', 4, 'R', 8], 1, [mk('n', num(1)), rep(3, rep(v('n'), F()), R(), chg('n', v('n'))), rep(v('n'), F())]);
lv(50, 'Summit Calculator', 'BOSS! Signs all the way to the summit. Read each one and act!', 'While not atFinish: Drive, make n = readSign, repeat n Drive, then turn toward the road.', [4, 'R', 3, 'L', 2], 1, [whl(no('atFinish'), F(), mk('n', sn('readSign')), rep(v('n'), F()), turnToRoad())], { signs: { 1: 3, 5: 2, 8: 1 } });

// ---------- Chapter 6: Function Factory (functions) ----------
const dodgeFn = () => fn('dodge', [], ...DODGE());
lv(51, 'Meet Functions', 'Build your own command called stair. Write it once, use it three times.', 'Function stair: Drive, right, drive, left. Then Repeat 3 call stair.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1], 1, [fn('stair', [], F(), R(), F(), L()), rep(3, call('stair'))]);
lv(52, 'Side by Side', 'A function for a whole straight bit of road.', 'Function side: Repeat 3 Drive. Call it, turn right, call it, turn left, call it.', [3, 'R', 3, 'L', 3], 1, [fn('side', [], rep(3, F())), call('side'), R(), call('side'), L(), call('side')]);
lv(53, 'Dodge Machine', 'Turn the cone dodge into a function. Call it three times!', 'Function dodge holds the 9 dodge moves.', ['D', 'D', 'D'], 1, [dodgeFn(), rep(3, call('dodge'))]);
lv(54, 'Square Maker', 'A function can include a turn too.', 'Function side: Repeat 3 Drive, turn right. Repeat 3 call side. Then drive 2.', [3, 'R', 3, 'R', 3, 'R', 2], 1, [fn('side', [], rep(3, F()), R()), rep(3, call('side')), rep(2, F())]);
lv(55, 'Snake Road', 'A function for each row of the snake.', 'Function row: Repeat 2 Drive. Row, right, drive, right, row, left, drive, left, row.', [2, 'R', 1, 'R', 2, 'L', 1, 'L', 2], 1, [fn('row', [], rep(2, F())), call('row'), R(), F(), R(), call('row'), L(), F(), L(), call('row')]);
lv(56, 'Honk Helper', 'Make a cheer function that honks twice. Use it at the checkpoint.', 'Function cheer: honk, honk. Drive 3, cheer, drive 3.', [6], 1, [fn('cheer', [], honk(), honk()), rep(3, F()), call('cheer'), rep(3, F())]);
lv(57, 'Mirror Moves', 'A zig-zag in the other direction.', 'Function zag: Drive, left, drive, right. Repeat 3.', [1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R'], 1, [fn('zag', [], F(), L(), F(), R()), rep(3, call('zag'))]);
lv(58, 'Helpers Calling Helpers', 'A function can call another function!', 'Make b (drive 2). Make a: call b, right, call b. Then a, left, a.', [2, 'R', 2, 'L', 2, 'R', 2], 1, [fn('b', [], rep(2, F())), fn('a', [], call('b'), R(), call('b')), call('a'), L(), call('a')]);
lv(59, 'Dodge and Drive', 'Dodge, drive, dodge, drive, dodge. Functions and loops together.', 'Function dodge. Repeat 2: [call dodge, drive 2]. Then call dodge.', ['D', 2, 'D', 2, 'D'], 1, [dodgeFn(), rep(2, call('dodge'), rep(2, F())), call('dodge')]);
lv(60, "Foreman's Final", "BOSS! The Factory Foreman's test: make a turn function and a smart loop.", 'Function turn: if roadLeft left else right. While not atFinish: if roadAhead drive else call turn.', [3, 'R', 2, 'L', 4, 'L', 2, 'R', 3, 'D', 1], 1, [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))], { use: ['function', 'while'] });

// ---------- Chapter 7: Parameter Port (parameters) ----------
const goFn = () => fn('go', ['n'], rep(v('n'), F()));
lv(61, 'Move N', 'Use go(n) with two different numbers and a turn in between.', 'Function go(n): Repeat n Drive. Then go 3, right, go 4.', [3, 'R', 4], 1, [goFn(), call('go', num(3)), R(), call('go', num(4))]);
lv(62, 'Go and Turn', 'A function that drives n squares and then turns.', 'Function leg(n): Repeat n Drive, turn right. Call leg 2, 3 and 4. Then drive once.', [2, 'R', 3, 'R', 4, 'R', 1], 1, [fn('leg', ['n'], rep(v('n'), F()), R()), call('leg', num(2)), call('leg', num(3)), call('leg', num(4)), F()]);
lv(63, 'Two Inputs', 'A function can take two numbers: step(a, b).', 'Function step(a, b): Repeat a Drive, right, repeat b Drive, left.', [2, 'R', 3, 'L', 4, 'R', 1, 'L', 1], 1, [fn('step', ['a', 'b'], rep(v('a'), F()), R(), rep(v('b'), F()), L()), call('step', num(2), num(3)), call('step', num(4), num(1)), F()]);
lv(64, 'Boxes as Inputs', 'Pass a box into a function. You can even add to it: k + 1.', 'Make k = 3. go(k), right, go(k + 1), left, go(k + 2).', [3, 'R', 4, 'L', 5], 1, [goFn(), mk('k', num(3)), call('go', v('k')), R(), call('go', bin(v('k'), '+', num(1))), L(), call('go', bin(v('k'), '+', num(2)))]);
lv(65, 'Spiral Again', 'Combine a function, a growing box and a loop.', 'Function leg(n). Make n = 1. Repeat 4: [call leg(n), change n by 1]. Then Repeat n Drive.', SPIRAL, 1, [fn('leg', ['n'], rep(v('n'), F()), R()), mk('n', num(1)), rep(4, call('leg', v('n')), chg('n', num(1))), rep(v('n'), F())]);
lv(66, 'Many Dodges', 'Pass the NUMBER of dodges into the function.', 'Function dodges(times): Repeat times [dodge moves]. Call dodges(3).', ['D', 'D', 'D'], 1, [fn('dodges', ['times'], rep(v('times'), ...DODGE())), call('dodges', num(3))]);
lv(67, 'Say Which Way', "Pass a word into a function: turn('left') or turn('right').", "Function turn(d): if d == 'left' then left else right.", [2, 'L', 2, 'R', 2, 'R', 2], 1, [fn('turn', ['d'], iff(cmp(v('d'), '==', str('left')), [L()], [R()])), rep(2, F()), call('turn', str('left')), rep(2, F()), call('turn', str('right')), rep(2, F()), call('turn', str('right')), rep(2, F())]);
lv(68, 'Sign Input', 'Read a sign and pass the number into your function.', 'Drive, make n = readSign, go(n), right, drive, set n = readSign, go(n).', [4, 'R', 3], 1, [goFn(), F(), mk('n', sn('readSign')), call('go', v('n')), R(), F(), setv('n', sn('readSign')), call('go', v('n'))], { signs: { 1: 3, 5: 2 } });
lv(69, 'Function Tower', 'A function that calls a function that takes an input.', 'Make go(n). Make leg(n): go(n), right. Then leg 2, 3, 4 and drive.', [2, 'R', 3, 'R', 4, 'R', 1], 1, [goFn(), fn('leg', ['n'], call('go', v('n')), R()), call('leg', num(2)), call('leg', num(3)), call('leg', num(4)), F()]);
lv(70, 'Harbor Master', 'BOSS! Legs 1, 2, 3, 4, 5 with alternating turns. Everything you know!', 'Function go(n). Make n = 1. Repeat 2: [go n, right, change n 1, go n, left, change n 1]. Then go n.', [1, 'R', 2, 'L', 3, 'R', 4, 'L', 5], 1, [goFn(), mk('n', num(1)), rep(2, call('go', v('n')), R(), chg('n', num(1)), call('go', v('n')), L(), chg('n', num(1))), call('go', v('n'))]);

// ---------- Chapter 8: List Lagoon (lists & objects) ----------
lv(71, 'Route Card', 'The treasure map is a list: legs = [3, 2]. Visit every item with For each.', 'For each leg in legs: Repeat leg Drive, turn right.', [3, 'R', 2], 1, [each('leg', 'legs', rep(v('leg'), F()), R())], { data: { legs: [3, 2] } });
lv(72, 'Longer List', 'Same idea, more legs.', 'The same For each block works for any list.', [2, 'R', 3, 'R', 2, 'R', 4], 1, [each('leg', 'legs', rep(v('leg'), F()), R())], { data: { legs: [2, 3, 2, 4] } });
lv(73, 'Pick an Item', 'Three items this time: legs[0], legs[1] and legs[2]. Counting starts at 0!', 'Repeat legs[0] Drive, right, Repeat legs[1] Drive, left, Repeat legs[2] Drive.', [2, 'R', 3, 'L', 4], 1, [rep(v('legs[0]'), F()), R(), rep(v('legs[1]'), F()), L(), rep(v('legs[2]'), F())], { data: { legs: [2, 3, 4] }, use: [] });
lv(74, 'List of Words', "A list can hold words. Turn right for 'R' and left otherwise.", "For each t in turns: Repeat 2 Drive, if t == 'R' right else left. Then drive 2 more.", [2, 'R', 2, 'L', 2, 'R', 2], 1, [each('t', 'turns', rep(2, F()), iff(cmp(v('t'), '==', str('R')), [R()], [L()])), rep(2, F())], { data: { turns: ['R', 'L', 'R'] } });
lv(75, 'Add Them Up', 'Make a box called total and add every coin to it.', 'Make total = 0. For each c in coins: change total by c. Then Repeat total Drive.', [6], 1, [mk('total', num(0)), each('c', 'coins', chg('total', v('c'))), rep(v('total'), F())], { data: { coins: [1, 2, 3] } });
lv(76, 'Objects in a List', 'Three stops this time, each with stop.n (how far) and stop.t (which way).', "For each stop in stops: Repeat stop.n Drive, then if stop.t == 'R' right else left.", [2, 'R', 3, 'L', 2], 1, [each('stop', 'stops', rep(v('stop.n'), F()), iff(cmp(v('stop.t'), '==', str('R')), [R()], [L()]))], { data: { stops: [{ n: 2, t: 'R' }, { n: 3, t: 'L' }, { n: 2, t: 'R' }] } });
lv(77, 'Growing Legs', 'Legs 1 to 5. Use a sensor to choose the turn.', 'For each leg: Repeat leg Drive, if roadLeft left else right.', [1, 'R', 2, 'L', 3, 'R', 4, 'L', 5], 1, [each('leg', 'legs', rep(v('leg'), F()), turnToRoad())], { data: { legs: [1, 2, 3, 4, 5] } });
lv(78, 'List and Function', 'Combine a function with a list.', 'Make go(n). For each leg: go(leg), then turn toward the road.', [2, 'R', 3, 'L', 2, 'R', 3], 1, [goFn(), each('leg', 'legs', call('go', v('leg')), turnToRoad())], { data: { legs: [2, 3, 2, 3] } });
lv(79, 'Secret Commands', "The list holds commands as words: 'F', 'R' and 'L'. You are the interpreter!", "For each cmd: if cmd == 'F' drive, else if cmd == 'R' right, else left.", [2, 'R', 1, 'L', 3], 1, [each('cmd', 'cmds', iff(cmp(v('cmd'), '==', str('F')), [F()], [iff(cmp(v('cmd'), '==', str('R')), [R()], [L()])]))], { data: { cmds: ['F', 'F', 'R', 'F', 'L', 'F', 'F', 'F'] } });
lv(80, "Kraken's Treasure Map", 'BOSS! A list of objects: each has a command c and how many times n.', "For each step in map: Repeat step.n [if step.c == 'F' drive, else if 'R' right, else left].", [3, 'R', 2, 'L', 4, 'R', 2], 1, [each('step', 'map', rep(v('step.n'), iff(cmp(v('step.c'), '==', str('F')), [F()], [iff(cmp(v('step.c'), '==', str('R')), [R()], [L()])])))], {
  data: { map: [{ c: 'F', n: 3 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }, { c: 'L', n: 1 }, { c: 'F', n: 4 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }] },
});

// ---------- Chapter 9: Gate Galaxy (strings, objects, events) ----------
lv(81, 'First Words', "Another gate! This time the secret word is 'open'.", "Drive once, say 'open', then Repeat 3 Drive.", [4], 1, [F(), say(str('open')), rep(3, F())], { gates: [2], secret: 'open' });
lv(82, 'Password Box', 'The password box has a new word in it. Say it at the gate!', 'Drive once, say(password), Repeat 3 Drive.', [4], 1, [F(), say(v('password')), rep(3, F())], { gates: [2], secret: 'turbo', data: { password: 'turbo' } });
lv(83, 'Word Glue', 'Two boxes a and b hold parts of the password. Join them with +.', 'say(a + b)', [4], 1, [F(), say(bin(v('a'), '+', v('b'))), rep(3, F())], { gates: [2], secret: 'turbo', data: { a: 'tur', b: 'bo' } });
lv(84, 'Double Gates', 'Two gates, same password.', 'Say the password before each gate.', [3, 'R', 3], 1, [F(), say(v('password')), F(), F(), R(), F(), say(v('password')), F(), F()], { gates: [2, 5], secret: 'nova', data: { password: 'nova' } });
lv(85, 'Object Basics', 'car.fuel is a part of the car object. Use it as a number!', 'Repeat car.fuel Drive, right, Repeat (car.fuel − 1) Drive.', [4, 'R', 3], 1, [rep(v('car.fuel'), F()), R(), rep(bin(v('car.fuel'), '-', num(1)), F())], { data: { car: { fuel: 4 } }, use: [] });
lv(86, "The Driver's Word", 'The password is part of an object: driver.word.', 'say(driver.word)', [4], 1, [F(), say(v('driver.word')), rep(3, F())], { gates: [2], secret: 'vroom', data: { driver: { name: 'Zoom', word: 'vroom' } } });
const signHandler = () => onsign('sign', iff(cmp(v('sign'), '==', num(1)), [L()], [R()]));
lv(87, 'Road Signs Rule', 'Now there are two kinds of signs: 1 means left, 2 means right.', 'onSign: if sign == 1 left else right. Then Repeat 6 Drive.', [2, 'R', 2, 'L', 2], 1, [signHandler(), rep(6, F())], { signs: { 2: 2, 4: 1 }, use: ['onsign'] });
lv(88, 'Three Signs', 'More signs, same handler.', 'Use the same onSign handler, then Repeat 10 Drive.', [3, 'R', 2, 'R', 2, 'L', 3], 1, [signHandler(), rep(10, F())], { signs: { 3: 2, 5: 2, 7: 1 }, use: ['onsign'] });
lv(89, 'Sign and Gate', "Sign 1 means 'say the password'. Sign 2 means 'turn right'.", 'onSign: if sign == 1 say(password) else right. Repeat 8 Drive.', [5, 'R', 3], 1, [onsign('sign', iff(cmp(v('sign'), '==', num(1)), [say(v('password'))], [R()])), rep(8, F())], { signs: { 1: 1, 5: 2 }, gates: [2], secret: 'turbo', data: { password: 'turbo' }, use: ['onsign'] });
lv(90, 'Gatekeeper', 'BOSS! Three kinds of signs and a gate: 1 = say the code word, 2 = right, 3 = left.', 'onSign: if sign == 2 right, else if sign == 3 left, else say(code.word). Repeat 11 Drive.', [4, 'R', 3, 'L', 4], 1, [onsign('sign', iff(cmp(v('sign'), '==', num(2)), [R()], [iff(cmp(v('sign'), '==', num(3)), [L()], [say(v('code.word'))])])), rep(11, F())], { signs: { 1: 1, 4: 2, 7: 3 }, gates: [2], secret: 'nova', data: { code: { word: 'nova' } }, use: ['onsign'] });

// ---------- Chapter 10: Glitch's Castle (debugging & recursion) ----------
lv(91, 'Bug Hunt 1', "Dr. Glitch's first bug! This program stops short of the first corner. Find and fix it.", 'The first Repeat should drive 4 times, not 3.', [4, 'R', 3], 1, [rep(4, F()), R(), rep(3, F())], { starter: [rep(3, F()), R(), rep(3, F())], use: [] });
lv(92, 'Bug Hunt 2', 'Something turns the wrong way. Fix the bug!', 'The second turn should be LEFT.', [2, 'R', 2, 'L', 2], 1, [rep(2, F()), R(), rep(2, F()), L(), rep(2, F())], { starter: [rep(2, F()), R(), rep(2, F()), R(), rep(2, F())], use: [] });
lv(93, 'Bug Hunt 3', 'The car gets stuck at the corner and loops forever. What should it do when there is no road ahead?', 'Add an else to turn toward the road.', [3, 'R', 2, 'L', 2], 1, SMART(), { starter: [whl(no('atFinish'), iff(ok('roadAhead'), [F()]))], use: ['if'] });
lv(94, 'Bug Hunt 4', 'A box has the wrong number in it for the second straight.', 'The second Repeat needs n + 1.', [3, 'R', 4], 1, [mk('n', num(3)), rep(v('n'), F()), R(), rep(bin(v('n'), '+', num(1)), F())], { starter: [mk('n', num(3)), rep(v('n'), F()), R(), rep(v('n'), F())], use: ['let'] });
lv(95, 'Bug Hunt 5', 'The function ignores its input! Fix go(n).', 'Inside go, Repeat n times, not 3.', [2, 'R', 4], 1, [goFn(), call('go', num(2)), R(), call('go', num(4))], { starter: [fn('go', ['n'], rep(3, F())), call('go', num(2)), R(), call('go', num(4))], use: ['function'] });
lv(96, 'Recursion 1', 'A function that calls itself! dash(5) drives one square, then calls dash(4), then dash(3)…', 'If n > 0: Drive, then call dash(n − 1).', [5], 1, [fn('dash', ['n'], iff(cmp(v('n'), '>', num(0)), [F(), call('dash', bin(v('n'), '-', num(1)))])), call('dash', num(5))], { use: ['function'] });
lv(97, 'Recursion 2', 'A recursive staircase!', 'stairs(n): if n > 0, drive, right, drive, left, call stairs(n − 1).', STAIRS, 1, [fn('stairs', ['n'], iff(cmp(v('n'), '>', num(0)), [F(), R(), F(), L(), call('stairs', bin(v('n'), '-', num(1)))])), call('stairs', num(4))], { use: ['function'] });
lv(98, 'Recursion 3', 'A recursive spiral: the legs grow each time.', 'spiral(n): if n < 6, repeat n drive, right, call spiral(n + 1). Call spiral(1).', SPIRAL, 1, [fn('spiral', ['n'], iff(cmp(v('n'), '<', num(6)), [rep(v('n'), F()), R(), call('spiral', bin(v('n'), '+', num(1)))])), call('spiral', num(1))], { use: ['function'] });
lv(99, 'Mixed Mission', 'Dodge, drive, turn, drive, dodge. Pick your best tools!', 'Function dodge. Call it, repeat 2 drive, turn right, repeat 2 drive, call dodge.', ['D', 2, 'R', 2, 'D'], 1, [dodgeFn(), call('dodge'), rep(2, F()), R(), rep(2, F()), call('dodge')], { use: ['function'] });
lv(100, "Dr. Glitch's Last Stand", 'THE FINAL BOSS! Winding roads and cones everywhere. Show Dr. Glitch what a real coder can do!', 'A function for turning plus a smart loop. You know this!', [2, 'R', 3, 'L', 2, 'D', 2, 'R', 3, 'L', 2, 'D', 'D', 2, 'R', 2], 1, [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))], { use: ['function', 'while'] });

// =====================================================================================
// Extra, gentler levels. Worlds 1-5 grow to 30 levels and worlds 6-10 to 20,
// ramping from easy to hard. `after` says which original level each one follows.
// =====================================================================================

// ---------- World 1: Garage Town ----------
nl(1, 0, 'First Gear', "Coach Gearheart: 'Tap Drive to move one square. Two squares to the flag!'", 'Tap the Drive block twice, then press GO.', [2], fx(2));
nl(1, 0, 'Three Hops', 'Just a little further this time. Count the squares!', 'You need 3 Drive blocks.', [3], fx(3));
nl(1, 1, 'Five Squares', 'A longer straight road. Count carefully!', 'You need 5 Drive blocks.', [5], fx(5));
nl(1, 1, 'Tiny Turn', 'Your first turn! Turning spins the car but does not move it.', 'Drive 1, turn left, drive 1.', [1, 'L', 1], seq([1, 'L', 1]));
nl(1, 1, 'Corner Shop', 'Drive to the corner, then turn left to reach the shop.', describe([2, 'L', 1]), [2, 'L', 1], seq([2, 'L', 1]));
nl(1, 2, 'Right Away', 'Now try turning RIGHT.', 'Drive 1, turn right, drive 1.', [1, 'R', 1], seq([1, 'R', 1]));
nl(1, 2, 'Square Corner', 'Two squares, a right turn, two more squares.', describe([2, 'R', 2]), [2, 'R', 2], seq([2, 'R', 2]));
nl(1, 3, 'Short Hop', 'A long bit, then a quick turn and a tiny bit.', describe([3, 'R', 1]), [3, 'R', 1], seq([3, 'R', 1]));
nl(1, 3, 'Facing Up', 'This time your car starts pointing UP the screen. Left and right are from the car\'s point of view!', describe([1, 'L', 2]), [1, 'L', 2], seq([1, 'L', 2]), { dir: 0 });
nl(1, 4, 'Hairpin', 'A hairpin bend turns you all the way around.', describe([1, 'R', 1, 'R', 1]), [1, 'R', 1, 'R', 1], seq([1, 'R', 1, 'R', 1]));
nl(1, 5, 'Lefty Loop', 'Two left turns in a row!', describe([2, 'L', 2, 'L', 2]), [2, 'L', 2, 'L', 2], seq([2, 'L', 2, 'L', 2]));
nl(1, 6, 'Wiggle Road', 'Left, right, left. Wiggle wiggle!', describe([1, 'L', 1, 'R', 1, 'L', 1]), [1, 'L', 1, 'R', 1, 'L', 1], seq([1, 'L', 1, 'R', 1, 'L', 1]));
nl(1, 7, 'Block Party', 'Drive around a whole city block, turning left each time.', describe([2, 'L', 2, 'L', 2, 'L', 1]), [2, 'L', 2, 'L', 2, 'L', 1], seq([2, 'L', 2, 'L', 2, 'L', 1]));
nl(1, 8, 'Long and Short', 'A long road with a short tail.', describe([6, 'R', 2]), [6, 'R', 2], seq([6, 'R', 2]));
nl(1, 8, 'Step Aside', 'Hop over to the next lane and keep going.', describe([3, 'R', 1, 'L', 3]), [3, 'R', 1, 'L', 3], seq([3, 'R', 1, 'L', 3]));
nl(1, 9, 'Downhill', 'Follow the road down the hill.', describe([1, 'R', 2, 'L', 2, 'R', 1]), [1, 'R', 2, 'L', 2, 'R', 1], seq([1, 'R', 2, 'L', 2, 'R', 1]));
nl(1, 9, 'Big U-Turn', 'Go up and come all the way back the other way.', describe([3, 'L', 2, 'L', 3]), [3, 'L', 2, 'L', 3], seq([3, 'L', 2, 'L', 3]));
nl(1, 9, 'Steps Down', 'A road like stairs going down.', describe([1, 'R', 1, 'L', 2, 'R', 1, 'L', 1]), [1, 'R', 1, 'L', 2, 'R', 1, 'L', 1], seq([1, 'R', 1, 'L', 2, 'R', 1, 'L', 1]));
nl(1, 9, 'Mountain Climb', 'Up, across and back down again.', describe([2, 'L', 2, 'R', 2, 'R', 1]), [2, 'L', 2, 'R', 2, 'R', 1], seq([2, 'L', 2, 'R', 2, 'R', 1]));
nl(1, 9, 'Sneaky Shortcut', "Nitro Nick's secret shortcut. Can you follow it?", describe([2, 'R', 2, 'L', 1, 'L', 2]), [2, 'R', 2, 'L', 1, 'L', 2], seq([2, 'R', 2, 'L', 1, 'L', 2]));

// ---------- World 2: Loop City ----------
nl(2, 0, 'Loop Starter', 'Meet the Repeat block! Put one Drive inside it and set the number to 4.', 'Tap Repeat, tap Drive (it goes inside), make the number 4.', [4], [rep(4, F())]);
nl(2, 0, 'Six in a Row', 'One Repeat block can drive 6 squares.', 'Repeat 6 times: Drive.', [6], [rep(6, F())]);
nl(2, 11, 'Loop, Turn, Loop', 'Two loops with a turn between them.', 'Repeat 3 Drive, turn left, Repeat 3 Drive.', [3, 'L', 3], loopy([3, 'L', 3]));
nl(2, 11, 'Four and Four', 'Same idea, the other direction.', 'Repeat 4 Drive, turn right, Repeat 4 Drive.', [4, 'R', 4], loopy([4, 'R', 4]));
nl(2, 12, 'Big and Small', 'A big loop and a small loop.', 'Repeat 6 Drive, turn right, Repeat 2 Drive.', [6, 'R', 2], loopy([6, 'R', 2]));
nl(2, 12, 'Tower Road', 'Your car starts facing up again.', 'Repeat 2 Drive, turn left, Repeat 5 Drive.', [2, 'L', 5], loopy([2, 'L', 5]), { dir: 0 });
nl(2, 12, 'Mini Stairs', 'Put MORE than one block inside a Repeat!', 'Repeat 2: Drive, turn right, Drive, turn left.', [1, 'R', 1, 'L', 1, 'R', 1, 'L'], [rep(2, F(), R(), F(), L())]);
nl(2, 13, 'Stairs Up', 'Stairs going the other way.', 'Repeat 3: Drive, turn left, Drive, turn right.', [1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R'], [rep(3, F(), L(), F(), R())]);
nl(2, 14, 'Double Zig', 'A zig-zag with longer steps.', 'Repeat 2: [Repeat 2 Drive, right, Repeat 2 Drive, left].', [2, 'R', 2, 'L', 2, 'R', 2, 'L'], [rep(2, rep(2, F()), R(), rep(2, F()), L())]);
nl(2, 14, 'Two Corners', 'A loop inside a loop: the inner one drives, the outer one does it twice.', 'Repeat 2: [Repeat 3 Drive, turn right]. Then Repeat 3 Drive.', [3, 'R', 3, 'R', 3], [rep(2, rep(3, F()), R()), rep(3, F())]);
nl(2, 14, 'Little Square', 'Almost all the way round a little square.', 'Repeat 3: [Repeat 2 Drive, turn right]. Then Drive once.', [2, 'R', 2, 'R', 2, 'R', 1], [rep(3, rep(2, F()), R()), F()]);
nl(2, 15, 'Lefty Laps', 'Big left-hand corners.', 'Repeat 2: [Repeat 5 Drive, turn left]. Then Repeat 5 Drive.', [5, 'L', 5, 'L', 5], [rep(2, rep(5, F()), L()), rep(5, F())]);
nl(2, 16, 'Long Zigzag', 'A really long zig-zag. Find the pattern!', 'Repeat 4: [Repeat 2 Drive, right, Repeat 2 Drive, left].', [2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2, 'L', 2, 'R', 2], [rep(4, rep(2, F()), R(), rep(2, F()), L())]);
nl(2, 17, 'First Cone', 'A traffic cone 🚧 blocks the road! Drive around it.', 'Drive, right, drive, left, drive, drive, left, drive, right.', ['D'], DODGE(), { use: [] });
nl(2, 17, 'Run-Up Dodge', 'Drive up to the cone, then dodge it.', 'Repeat 2 Drive, then the dodge moves.', [2, 'D'], [rep(2, F()), ...DODGE()]);
nl(2, 18, 'Dodge, Drive, Dodge', 'Cone, road, cone.', 'Repeat 2: [the dodge, then Repeat 2 Drive].', ['D', 2, 'D'], [rep(2, ...DODGE(), rep(2, F()))]);
nl(2, 19, 'Triple Zag', 'Three big zig-zags.', 'Repeat 3: [Repeat 3 Drive, right, Repeat 3 Drive, left].', [3, 'R', 3, 'L', 3, 'R', 3, 'L', 3, 'R', 3], [rep(3, rep(3, F()), R(), rep(3, F()), L())]);
nl(2, 19, 'Cone Alley', 'FOUR cones in a row!', 'Repeat 4 with the whole dodge inside.', ['D', 'D', 'D', 'D'], [rep(4, ...DODGE())]);
nl(2, 19, 'Big Square', 'Nearly all the way round a big square.', 'Repeat 3: [Repeat 4 Drive, turn right]. Then Repeat 3 Drive.', [4, 'R', 4, 'R', 4, 'R', 3], [rep(3, rep(4, F()), R()), rep(3, F())]);
nl(2, 19, 'Skyscraper Stairs', 'The tallest staircase in Loop City.', 'Repeat 6: Drive, right, Drive, left.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'], [rep(6, F(), R(), F(), L())]);

// ---------- World 3: Sandy Desert ----------
const untilFinish = () => [whl(no('atFinish'), F())];
const whileRoad = (turn: () => Block) => [whl(ok('roadAhead'), F()), turn(), whl(ok('roadAhead'), F())];
const turnIfBlocked = (turn: () => Block) => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [turn()]))];
const WI: Feature[] = ['while', 'if'];
nl(3, 0, 'Are We There Yet?', "Your car has a sensor called atFinish. It's true when you reach the flag.", 'While NOT atFinish: Drive.', [3], untilFinish());
nl(3, 0, 'Keep Going', 'The same While loop works for any length of road!', 'While NOT atFinish: Drive.', [5], untilFinish());
nl(3, 21, 'Road Ahead?', "'roadAhead' is true when there is road in front of the car.", 'While roadAhead: Drive.', [4], [whl(ok('roadAhead'), F())]);
nl(3, 21, 'Look, Turn, Look', 'Drive until the road ends, turn, and do it again.', 'While roadAhead: Drive. Turn right. While roadAhead: Drive.', [3, 'R', 3], whileRoad(R));
nl(3, 22, 'Left at the End', 'Same idea, turning left.', 'While roadAhead: Drive. Turn left. While roadAhead: Drive.', [2, 'L', 4], whileRoad(L));
nl(3, 22, 'If Blocked, Turn', 'Meet IF / ELSE: if there is road, drive; otherwise turn right.', 'While not atFinish: If roadAhead then Drive, else turn right.', [3, 'R', 2], turnIfBlocked(R), { use: WI });
nl(3, 23, 'Right, Right', 'Two right-hand bends. Your smart loop handles both!', 'While not atFinish: If roadAhead then Drive, else turn right.', [2, 'R', 2, 'R', 2], turnIfBlocked(R), { use: WI });
nl(3, 23, 'If Blocked, Go Left', 'This road bends left.', 'While not atFinish: If roadAhead then Drive, else turn left.', [2, 'L', 3], turnIfBlocked(L), { use: WI });
nl(3, 24, 'Lefty Desert', 'Lots of left bends.', 'Same loop, turning left in the else.', [3, 'L', 2, 'L', 3], turnIfBlocked(L), { use: WI });
nl(3, 24, 'Which Way?', 'Now the bends go both ways. Check roadLeft to choose!', 'In the else: if roadLeft turn left, else turn right.', [2, 'R', 2, 'L', 2], SMART(), { use: WI });
nl(3, 25, 'Dune Dash', 'Up and over the sand dunes.', 'Your which-way loop works here too.', [3, 'L', 2, 'R', 3], SMART(), { use: WI });
nl(3, 25, 'Sensor Dodge', "A cone! Your smart car can dodge it without counting.", 'The which-way loop dodges cones too.', ['D'], SMART(), { use: WI });
nl(3, 26, 'Cone and Cruise', 'A cone, then a long road.', 'Same smart loop!', ['D', 3], SMART(), { use: WI });
nl(3, 26, 'Cactus Canyon', 'A twisty canyon full of cacti.', 'Same smart loop!', [2, 'R', 4, 'L', 2, 'L', 3], SMART(), { use: WI });
nl(3, 27, 'Coin Beeper', "'coinAhead' is true when a coin is right in front. Honk when you see one!", 'While not atFinish: if coinAhead then honk. Then Drive.', [4], [whl(no('atFinish'), iff(ok('coinAhead'), [honk()]), F())], { use: WI });
nl(3, 28, 'Desert Wiggle', 'A wiggly sand road.', 'The smart loop handles wiggles.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1], SMART(), { use: WI });
nl(3, 29, 'Oasis Loop', 'Around the oasis and down the other side.', 'Same smart loop!', [3, 'R', 3, 'R', 3, 'L', 3, 'L', 3], SMART(), { use: WI });
nl(3, 29, 'Cone Corner', 'Cones near the corners. Stay smart!', 'Same smart loop!', ['D', 2, 'R', 3, 'D', 2], SMART(), { use: WI });
nl(3, 29, 'Sand Slalom', 'A turn, then cones.', 'Same smart loop!', [3, 'L', 2, 'D', 2, 'R', 3], SMART(), { use: WI });
nl(3, 29, 'Mirage Road', "Is it real or a mirage? Only your sensors know!", 'Same smart loop!', [4, 'R', 2, 'D', 2, 'L', 3], SMART(), { use: WI });

// ---------- World 4: Cone Jungle ----------
const repDist = () => rep(sn('distanceAhead'), F());
const distSmart = () => [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))];
const andSmart = () => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))];
const rightSmart = () => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadRight'), [R()], [L()])]))];
const threeIfs = () => [whl(no('atFinish'), iff(all(no('roadAhead'), ok('roadLeft')), [L()]), iff(all(no('roadAhead'), ok('roadRight')), [R()]), iff(ok('roadAhead'), [F()]))];
const countTurn = () => [whl(no('atFinish'), repDist(), turnToRoad())];
const orLoop = () => [whl(any(ok('roadAhead'), ok('roadLeft'), ok('roadRight')), iff(ok('roadAhead'), [F()], [turnToRoad()]))];
const notLoop = () => [whl(no('atFinish'), iff(no('roadAhead'), [turnToRoad()], [F()]))];
nl(4, 0, 'How Far?', "'distanceAhead' is a NUMBER: how many road squares are in front. Use it in a Repeat!", 'Repeat (distanceAhead) times: Drive.', [4], [repDist()], { use: [] });
nl(4, 0, 'Measure Twice', 'The same trick on a longer road.', 'Repeat (distanceAhead) times: Drive.', [6], [repDist()], { use: [] });
nl(4, 0, 'Measure the Corner', 'Measure, drive, turn, measure again.', 'Repeat (distanceAhead) Drive, turn left, Repeat (distanceAhead) Drive.', [3, 'L', 5], [repDist(), L(), repDist()], { use: [] });
nl(4, 31, 'More Than Zero', "'>' means 'greater than'. Keep driving while the distance is more than 0.", 'While distanceAhead > 0: Drive.', [5], [whl(cmp(sn('distanceAhead'), '>', num(0)), F())], { use: ['while'] });
nl(4, 31, 'Greater Corner', 'Use > inside an If to decide when to turn.', 'If distanceAhead > 0 Drive, else turn toward the road.', [3, 'R', 3], distSmart());
nl(4, 32, 'Left AND Not Right', 'Turn left only when left is open AND right is closed.', 'Use two conditions joined with AND.', [3, 'L', 3], andSmart());
nl(4, 33, 'Right First', 'Check the right side first this time.', 'If roadAhead drive, else if roadRight turn right, else left.', [2, 'R', 2], rightSmart());
nl(4, 33, 'Right-Hand Path', 'The right-first rule works on left bends too!', 'If roadAhead drive, else if roadRight turn right, else left.', [3, 'L', 2, 'L', 2], rightSmart());
nl(4, 34, 'Ask Three Times', 'Three separate If blocks: turn left? turn right? drive?', 'Each If checks NOT roadAhead plus one side.', [2, 'R', 2], threeIfs());
nl(4, 35, 'Count, Then Turn', 'Drive the whole straight with distanceAhead, then turn.', 'While not atFinish: Repeat (distanceAhead) Drive, then turn toward the road.', [3, 'R', 3], countTurn());
nl(4, 35, 'Vine Corners', 'Same idea with more corners.', 'While not atFinish: Repeat (distanceAhead) Drive, then turn toward the road.', [2, 'L', 4, 'R', 2], countTurn());
nl(4, 36, 'Cone Creek', 'A cone by the creek.', 'Your which-way loop handles cones.', ['D', 2], SMART());
nl(4, 37, 'Any Road Will Do', "'||' means OR. Keep going while ANY road is open.", 'While roadAhead OR roadLeft OR roadRight: …', [2, 'R', 3], orLoop());
nl(4, 38, 'NOT Today', 'You have used NOT with atFinish. Now try it on roadAhead: if there is NOT road ahead, turn!', 'While not atFinish: if NOT roadAhead, turn toward the road, else Drive.', [3, 'L', 2], notLoop());
nl(4, 38, 'Not Again', 'NOT works on longer roads too.', 'Same NOT loop.', [2, 'R', 2, 'L', 2, 'R', 2], notLoop());
nl(4, 38, 'Exactly Zero', "'=' checks if two things are equal. Turn when the distance is exactly 0.", 'If distanceAhead = 0, turn toward the road, else Drive.', [4, 'R', 3, 'L', 4], [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '==', num(0)), [turnToRoad()], [F()]))]);
nl(4, 39, 'At Least One', "'≥' means 'greater than or equal'. Drive while there is at least 1 square.", 'While distanceAhead ≥ 1: Drive.', [5], [whl(cmp(sn('distanceAhead'), '>=', num(1)), F())], { use: ['while'] });
nl(4, 39, 'Double Trouble Cones', 'Two cones and a turn.', 'Use the AND loop.', ['D', 'D', 2, 'L', 2], andSmart());
nl(4, 39, 'Measured Dodge', 'Measure your way past the cones.', 'Use the distanceAhead > 0 loop.', [3, 'R', 2, 'D', 2, 'L', 3], distSmart());
nl(4, 39, 'Jungle Run', 'A long run through the jungle.', 'Use the OR loop.', [2, 'L', 2, 'R', 2, 'D', 'D', 2], orLoop());

// ---------- World 5: Number Mountain ----------
const n = (k: number) => num(k);
nl(5, 0, 'My First Box', 'A variable is a box with a name. Make a box called steps with 3 in it, then Repeat (steps).', 'Make steps = 3, then Repeat (steps) Drive.', [3], [mk('steps', n(3)), rep(v('steps'), F())]);
nl(5, 0, 'Bigger Box', 'Change the number in the box to drive further.', 'Make steps = 5, then Repeat (steps) Drive.', [5], [mk('steps', n(5)), rep(v('steps'), F())]);
nl(5, 41, 'Use It Twice', 'A box can be used again and again!', 'Make n = 2. Repeat n Drive, turn left, Repeat n Drive.', [2, 'L', 2], [mk('n', n(2)), rep(v('n'), F()), L(), rep(v('n'), F())]);
nl(5, 41, 'Box in a Loop', 'Use your box inside a loop inside a loop!', 'Make n = 3. Repeat 2: [Repeat n Drive, turn right]. Then Repeat n Drive.', [3, 'R', 3, 'R', 3], [mk('n', n(3)), rep(2, rep(v('n'), F()), R()), rep(v('n'), F())]);
nl(5, 42, 'Read the Sign', "'readSign' reads the number on the sign under your car.", 'Drive once. Make n = readSign. Repeat n Drive.', [4], [F(), mk('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 3 } });
nl(5, 43, 'New Sign, New Number', 'Use Set to put a new number in the same box.', 'After the turn: Drive, Set n = readSign, Repeat n Drive.', [3, 'L', 2], [F(), mk('n', sn('readSign')), rep(v('n'), F()), L(), F(), setv('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 2, 4: 1 } });
nl(5, 45, 'Count Down 4', 'Count 4, 3, 2, 1… Change the box by -1 each time.', 'Make n = 4. While n > 0: Drive, Change n by -1.', [4], [mk('n', n(4)), whl(cmp(v('n'), '>', n(0)), F(), chg('n', n(-1)))]);
nl(5, 44, 'Plus One', 'Change a box by 1 to make it bigger.', 'Make n = 2. Repeat n Drive, turn right, Change n by 1, Repeat n Drive.', [2, 'R', 3], [mk('n', n(2)), rep(v('n'), F()), R(), chg('n', n(1)), rep(v('n'), F())]);
nl(5, 44, 'Baby Spiral', 'Each side is one longer than the last.', 'Make n = 1. Repeat 2: [Repeat n Drive, right, Change n by 1]. Then Repeat n Drive.', [1, 'R', 2, 'R', 3], [mk('n', n(1)), rep(2, rep(v('n'), F()), R(), chg('n', n(1))), rep(v('n'), F())]);
nl(5, 46, 'Times Table', 'Math in a box: × means times.', 'Make a = 2 × 2. Repeat a Drive, turn left, Repeat (4 − 2) Drive.', [4, 'L', 2], [mk('a', bin(n(2), '*', n(2))), rep(v('a'), F()), L(), rep(bin(n(4), '-', n(2)), F())]);
nl(5, 47, 'Double Sign', 'This sign shows HALF the way. Double it!', 'Drive, make h = readSign, Repeat (h × 2) Drive.', [7], [F(), mk('h', sn('readSign')), rep(bin(v('h'), '*', n(2)), F())], { signs: { 1: 3 } });
nl(5, 48, 'Double Up', 'Make the box double itself: Change n by n.', 'Make n = 2. Repeat n Drive, left, Change n by n, Repeat n Drive.', [2, 'L', 4], [mk('n', n(2)), rep(v('n'), F()), L(), chg('n', v('n')), rep(v('n'), F())]);
nl(5, 49, 'Same Number', 'Three straights, all the same length. One box for all!', 'Make n = 3, then use Repeat n three times.', [3, 'R', 3, 'L', 3], [mk('n', n(3)), rep(v('n'), F()), R(), rep(v('n'), F()), L(), rep(v('n'), F())]);
nl(5, 49, 'Shrinking Spiral', 'Each side is one SHORTER. Change by -1!', 'Make n = 5. Repeat 4: [Repeat n Drive, right, Change n by -1]. Then Repeat n Drive.', [5, 'R', 4, 'R', 3, 'R', 2, 'R', 1], [mk('n', n(5)), rep(4, rep(v('n'), F()), R(), chg('n', n(-1))), rep(v('n'), F())]);
nl(5, 49, 'Sign Plus One', 'The road is one longer than the sign says.', 'Drive, make n = readSign, Repeat (n + 1) Drive.', [4], [F(), mk('n', sn('readSign')), rep(bin(v('n'), '+', n(1)), F())], { signs: { 1: 2 } });
nl(5, 49, 'Box Math', 'The last side is one shorter than the others.', 'Make side = 3. Repeat 3: [Repeat side Drive, right]. Then Repeat (side − 1) Drive.', [3, 'R', 3, 'R', 3, 'R', 2], [mk('side', n(3)), rep(3, rep(v('side'), F()), R()), rep(bin(v('side'), '-', n(1)), F())]);
nl(5, 49, 'Spiral Staircase', 'A growing spiral with four sides.', 'Make n = 1. Repeat 3: [Repeat n Drive, right, Change n by 1]. Then Repeat n Drive.', [1, 'R', 2, 'R', 3, 'R', 4], [mk('n', n(1)), rep(3, rep(v('n'), F()), R(), chg('n', n(1))), rep(v('n'), F())]);
nl(5, 49, 'Halfway Home', '÷ means divide. The second road is half the first.', 'Make n = 6. Repeat n Drive, left, Repeat (n ÷ 2) Drive.', [6, 'L', 3], [mk('n', n(6)), rep(v('n'), F()), L(), rep(bin(v('n'), '/', n(2)), F())]);
const signTrail = () => [whl(no('atFinish'), F(), mk('n', sn('readSign')), rep(v('n'), F()), turnToRoad())];
nl(5, 49, 'Sign Trail', 'Follow the signs: drive, read, go that far, turn.', 'While not atFinish: Drive, make n = readSign, Repeat n Drive, turn toward the road.', [3, 'R', 2], signTrail(), { signs: { 1: 2, 4: 1 } });
nl(5, 49, 'Peak Path', 'Three signs on the way to the peak.', 'Same sign-following loop.', [3, 'L', 3, 'R', 2], signTrail(), { signs: { 1: 2, 4: 2, 7: 1 } });

// ---------- World 6: Function Factory ----------
const smartFn = () => [fn('turn', [], turnToRoad()), whl(no('atFinish'), iff(ok('roadAhead'), [F()], [call('turn')]))];
nl(6, 0, 'My First Function', 'A function is your OWN command. Make one called two that drives twice.', 'Function two: Drive, Drive. Then: call two, turn right, call two.', [2, 'R', 2], [fn('two', [], F(), F()), call('two'), R(), call('two')]);
nl(6, 0, 'Step Function', 'Make a step command and use it twice.', 'Function step: Drive, right, Drive, left. Call step twice.', [1, 'R', 1, 'L', 1, 'R', 1, 'L'], [fn('step', [], F(), R(), F(), L()), call('step'), call('step')]);
nl(6, 51, 'Long Side', 'A function can hold a loop.', 'Function side: Repeat 4 Drive. Call side, turn left, call side.', [4, 'L', 4], [fn('side', [], rep(4, F())), call('side'), L(), call('side')]);
nl(6, 52, 'Double Dodge', 'Put the dodge in a function and call it twice.', 'Function dodge: the 9 dodge moves. Call it twice.', ['D', 'D'], [dodgeFn(), call('dodge'), call('dodge')]);
nl(6, 53, 'Corner Function', 'A function with a turn inside.', 'Function side: Repeat 2 Drive, turn right. Repeat 3 call side. Then Drive.', [2, 'R', 2, 'R', 2, 'R', 1], [fn('side', [], rep(2, F()), R()), rep(3, call('side')), F()]);
nl(6, 55, 'Beep Beep Beep', 'Make a beep function that honks three times.', 'Function beep: honk, honk, honk. Call beep, then Repeat 3 Drive.', [3], [fn('beep', [], honk(), honk(), honk()), call('beep'), rep(3, F())]);
nl(6, 57, 'Zig Zag Function', 'One function, two zig-zags.', 'Function zz: Repeat 2 Drive, left, Repeat 2 Drive, right. Repeat 2 call zz.', [2, 'L', 2, 'R', 2, 'L', 2, 'R'], [fn('zz', [], rep(2, F()), L(), rep(2, F()), R()), rep(2, call('zz'))]);
nl(6, 58, 'Two Helpers', 'Make two functions: one turns right, one turns left.', 'a: Repeat 3 Drive, right. b: Repeat 3 Drive, left. Call a, b, a, then Repeat 3 Drive.', [3, 'R', 3, 'L', 3, 'R', 3], [fn('a', [], rep(3, F()), R()), fn('b', [], rep(3, F()), L()), call('a'), call('b'), call('a'), rep(3, F())]);
nl(6, 59, 'Smart Turn Function', 'Put the "which way?" choice into a function.', 'Function turn: if roadLeft left else right. While not atFinish: if roadAhead Drive else call turn.', [2, 'R', 3, 'L', 2], smartFn(), { use: ['function', 'while'] });
nl(6, 59, 'Factory Floor', 'A twisty factory floor with a cone.', 'Same turn function and smart loop.', [3, 'L', 2, 'D', 2, 'R', 3], smartFn(), { use: ['function', 'while'] });

// ---------- World 7: Parameter Port ----------
nl(7, 0, 'Tell It How Far', 'A function can take a number: go(3) drives 3.', 'Function go(n): Repeat n Drive. Then call go(3).', [3], [goFn(), call('go', n(3))]);
nl(7, 0, 'Two Different Numbers', 'Call the same function with different numbers.', 'go(2), turn left, go(3).', [2, 'L', 3], [goFn(), call('go', n(2)), L(), call('go', n(3))]);
nl(7, 61, 'Dock Walk', 'Three calls along the dock.', 'go(4), right, go(2), right, go(4).', [4, 'R', 2, 'R', 4], [goFn(), call('go', n(4)), R(), call('go', n(2)), R(), call('go', n(4))]);
nl(7, 62, 'Leg Day', 'A function that drives and then turns.', 'Function leg(n): Repeat n Drive, right. leg(1), leg(2), then Repeat 3 Drive.', [1, 'R', 2, 'R', 3], [fn('leg', ['n'], rep(v('n'), F()), R()), call('leg', n(1)), call('leg', n(2)), rep(3, F())]);
nl(7, 64, 'Hop Count', 'Tell the function how many stairs to climb.', 'Function hop(times): Repeat times [Drive, right, Drive, left]. Call hop(3).', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'], [fn('hop', ['times'], rep(v('times'), F(), R(), F(), L())), call('hop', n(3))]);
nl(7, 67, 'Direction Word', "Two inputs: a number AND a word. move(3, 'L') drives 3 then turns left.", "Function move(n, d): Repeat n Drive, if d = 'L' left else right.", [3, 'L', 2, 'R', 3], [fn('move', ['n', 'd'], rep(v('n'), F()), iff(cmp(v('d'), '==', str('L')), [L()], [R()])), call('move', n(3), str('L')), call('move', n(2), str('R')), rep(3, F())]);
nl(7, 68, 'Zig by Number', 'A zig-zag function with a size.', 'Function zig(n): Repeat n Drive, right, Repeat n Drive, left. Call zig(2), then Repeat 2 Drive.', [2, 'R', 2, 'L', 2], [fn('zig', ['n'], rep(v('n'), F()), R(), rep(v('n'), F()), L()), call('zig', n(2)), rep(2, F())]);
nl(7, 69, 'Shrinking Harbor', 'Pass a shrinking box into your function.', 'leg(n): Repeat n Drive, right. Make n = 4. Repeat 3: [leg(n), Change n by -1]. Then Repeat n Drive.', [4, 'R', 3, 'R', 2, 'R', 1], [fn('leg', ['n'], rep(v('n'), F()), R()), mk('n', n(4)), rep(3, call('leg', v('n')), chg('n', n(-1))), rep(v('n'), F())]);
nl(7, 69, 'Square Dance', 'A function with an input that drives AND turns, used three times.', 'side(n): Repeat n Drive, right. Call side(3) three times, then Repeat 2 Drive.', [3, 'R', 3, 'R', 3, 'R', 2], [fn('side', ['n'], rep(v('n'), F()), R()), call('side', n(3)), call('side', n(3)), call('side', n(3)), rep(2, F())]);
nl(7, 69, 'Growing Waves', 'Waves that grow: 1, 2, 3.', 'Make n = 1. go(n), right, change n by 1, go(n), left, change n by 1, go(n).', [1, 'R', 2, 'L', 3], [goFn(), mk('n', n(1)), call('go', v('n')), R(), chg('n', n(1)), call('go', v('n')), L(), chg('n', n(1)), call('go', v('n'))]);

// ---------- World 8: List Lagoon ----------
const legLoop = () => [each('leg', 'legs', rep(v('leg'), F()), R())];
const cmdLoop = (item: string, list: string) => [each(item, list, iff(cmp(v(item), '==', str('F')), [F()], [iff(cmp(v(item), '==', str('R')), [R()], [L()])]))];
const mapLoop = () => [each('step', 'map', rep(v('step.n'), iff(cmp(v('step.c'), '==', str('F')), [F()], [iff(cmp(v('step.c'), '==', str('R')), [R()], [L()])])))];
nl(8, 0, 'Two Legs', 'A list holds many things in order: legs = [2, 2]. For each visits them one by one.', 'For each leg in legs: Repeat leg Drive, turn right.', [2, 'R', 2], legLoop(), { data: { legs: [2, 2] } });
nl(8, 71, 'One, Two, Three', 'A list that counts up.', 'For each leg in legs: Repeat leg Drive, turn right.', [1, 'R', 2, 'R', 3], legLoop(), { data: { legs: [1, 2, 3] } });
nl(8, 72, 'First and Second', 'legs[0] is the FIRST item and legs[1] the second.', 'Repeat legs[0] Drive, turn left, Repeat legs[1] Drive.', [3, 'L', 2], [rep(v('legs[0]'), F()), L(), rep(v('legs[1]'), F())], { data: { legs: [3, 2] }, use: [] });
nl(8, 73, 'A Word in a List', "Lists can hold words. 'L' means turn left.", "For each t in turns: Repeat 2 Drive, if t = 'R' right else left. Then Repeat 2 Drive.", [2, 'L', 2], [each('t', 'turns', rep(2, F()), iff(cmp(v('t'), '==', str('R')), [R()], [L()])), rep(2, F())], { data: { turns: ['L'] } });
nl(8, 74, 'Coin Count', 'Add up the list to find how far to go.', 'Make total = 0. For each c in coins: Change total by c. Repeat total Drive.', [4], [mk('total', n(0)), each('c', 'coins', chg('total', v('c'))), rep(v('total'), F())], { data: { coins: [1, 3] } });
nl(8, 75, 'Two Stops', 'Each stop has two parts: how far (n) and which way (t).', "For each stop: Repeat stop.n Drive, if stop.t = 'R' right else left.", [3, 'R', 2], [each('stop', 'stops', rep(v('stop.n'), F()), iff(cmp(v('stop.t'), '==', str('R')), [R()], [L()]))], { data: { stops: [{ n: 3, t: 'R' }, { n: 2, t: 'R' }] } });
nl(8, 77, 'Reef Route', 'A list of legs and a sensor for turning.', 'For each leg: Repeat leg Drive, then turn toward the road.', [2, 'L', 3, 'R', 2], [each('leg', 'legs', rep(v('leg'), F()), turnToRoad())], { data: { legs: [2, 3, 2] } });
nl(8, 78, 'Mini Commands', "A short list of commands: 'F' drive, 'L' left, 'R' right.", "For each cmd: if cmd = 'F' Drive, else if 'R' right, else left.", [1, 'L', 2], cmdLoop('cmd', 'cmds'), { data: { cmds: ['F', 'L', 'F', 'F'] } });
nl(8, 79, 'Pearl Map', 'A map made of objects: c is the command and n how many times.', "For each step in map: Repeat step.n [if step.c = 'F' Drive, else if 'R' right, else left].", [3, 'R', 3], mapLoop(), { data: { map: [{ c: 'F', n: 3 }, { c: 'R', n: 1 }, { c: 'F', n: 3 }] } });
nl(8, 79, 'Shell Map', 'A longer map to the shells.', 'Same map loop.', [2, 'L', 4, 'R', 1], mapLoop(), { data: { map: [{ c: 'F', n: 2 }, { c: 'L', n: 1 }, { c: 'F', n: 4 }, { c: 'R', n: 1 }, { c: 'F', n: 1 }] } });

// ---------- World 9: Gate Galaxy ----------
const signSays = () => onsign('sign', say(v('password')));
nl(9, 0, 'Magic Word', "A gate 🚪 blocks the way! Face it and say the magic word 'go'.", "Drive, say 'go', Drive, Drive.", [3], [F(), say(str('go')), F(), F()], { gates: [2], secret: 'go' });
nl(9, 81, 'Password Please', 'The password is in a box called password.', 'Repeat 2 Drive, say(password), Repeat 3 Drive.', [5], [rep(2, F()), say(v('password')), rep(3, F())], { gates: [3], secret: 'zoom', data: { password: 'zoom' } });
nl(9, 83, 'Space Glue', 'Glue two words together with +.', 'say(a + b)', [4], [F(), say(bin(v('a'), '+', v('b'))), rep(3, F())], { gates: [2], secret: 'starship', data: { a: 'star', b: 'ship' } });
nl(9, 85, 'Fuel Gauge', 'car.fuel is a number inside the car object.', 'Repeat car.fuel Drive, left, Repeat (car.fuel − 3) Drive.', [5, 'L', 2], [rep(v('car.fuel'), F()), L(), rep(bin(v('car.fuel'), '-', n(3)), F())], { data: { car: { fuel: 5 } }, use: [] });
nl(9, 86, 'First Event', 'onSign runs your code by itself every time you pass a sign. Sign 2 means right.', 'onSign: if sign = 1 left, else right. Then Repeat 4 Drive.', [2, 'R', 2], [signHandler(), rep(4, F())], { signs: { 2: 2 }, use: ['onsign'] });
nl(9, 87, 'Left Signs', 'Two signs that both say left.', 'Same handler, then Repeat 6 Drive.', [2, 'L', 2, 'L', 2], [signHandler(), rep(6, F())], { signs: { 2: 1, 4: 1 }, use: ['onsign'] });
nl(9, 88, 'Talking Sign', 'When the car passes this sign, make it say the password.', 'onSign: say(password). Then Repeat 4 Drive.', [4], [signSays(), rep(4, F())], { signs: { 1: 1 }, gates: [2], secret: 'nova', data: { password: 'nova' }, use: ['onsign'] });
nl(9, 89, 'Comet Corners', 'Signs at every corner.', 'Same left/right handler, then Repeat 8 Drive.', [3, 'R', 2, 'L', 3], [signHandler(), rep(8, F())], { signs: { 3: 2, 5: 1 }, use: ['onsign'] });
nl(9, 89, 'Moon Gate', 'Sign 1 = say the code word. Sign 3 = turn left.', 'onSign: if sign = 3 left, else say(code.word). Repeat 7 Drive.', [4, 'L', 3], [onsign('sign', iff(cmp(v('sign'), '==', n(3)), [L()], [say(v('code.word'))])), rep(7, F())], { signs: { 1: 1, 4: 3 }, gates: [2], secret: 'moon', data: { code: { word: 'moon' } }, use: ['onsign'] });
nl(9, 89, 'Star Hopper', 'A sign at every bend. Let the event do the steering!', 'Same left/right handler, then Repeat 8 Drive.', [2, 'R', 2, 'L', 2, 'R', 2], [signHandler(), rep(8, F())], { signs: { 2: 2, 4: 1, 6: 2 }, use: ['onsign'] });

// ---------- World 10: Glitch's Castle ----------
nl(10, 0, 'Tiny Bug', 'Dr. Glitch broke this short program. It stops one square early!', 'Change the Repeat from 2 to 3.', [3], [rep(3, F())], { starter: [rep(2, F())], use: [] });
nl(10, 91, 'Wrong Way', 'This program turns the wrong way at the corner.', 'Change turn right to turn LEFT.', [2, 'L', 2], [rep(2, F()), L(), rep(2, F())], { starter: [rep(2, F()), R(), rep(2, F())], use: [] });
nl(10, 93, 'Box Bug', 'The box has the wrong number in it.', 'Make n = 4, not 3.', [4], [mk('n', n(4)), rep(v('n'), F())], { starter: [mk('n', n(3)), rep(v('n'), F())], use: ['let'] });
nl(10, 95, 'Tiny Recursion', 'A function that calls ITSELF. dash(3) drives, then calls dash(2), then dash(1)…', 'dash(n): if n > 0, Drive, then call dash(n − 1). Call dash(3).', [3], [fn('dash', ['n'], iff(cmp(v('n'), '>', n(0)), [F(), call('dash', bin(v('n'), '-', n(1)))])), call('dash', n(3))], { use: ['function'] });
nl(10, 97, 'Little Spiral', 'A small recursive spiral.', 'spiral(n): if n < 4, Repeat n Drive, right, call spiral(n + 1). Call spiral(1).', [1, 'R', 2, 'R', 3], [fn('spiral', ['n'], iff(cmp(v('n'), '<', n(4)), [rep(v('n'), F()), R(), call('spiral', bin(v('n'), '+', n(1)))])), call('spiral', n(1))], { use: ['function'] });
nl(10, 98, 'Spinning Bug', 'This smart loop spins at the corner and goes back. Fix the turn!', 'In the else, turn RIGHT instead of left.', [2, 'R', 3], turnIfBlocked(R), { starter: turnIfBlocked(L), use: WI });
nl(10, 98, 'Function Bug', 'The function is fine, but the program turns the wrong way.', 'Turn LEFT between the two go(3) calls.', [3, 'L', 3], [goFn(), call('go', n(3)), L(), call('go', n(3))], { starter: [goFn(), call('go', n(3)), R(), call('go', n(3))], use: ['function'] });
nl(10, 98, 'Dodge Bug', 'One turn in this dodge is wrong. Find it!', 'The second turn of the dodge should be LEFT.', ['D', 2], [...DODGE(), rep(2, F())], { starter: [F(), R(), F(), R(), F(), F(), L(), F(), R(), rep(2, F())], use: [] });
nl(10, 99, 'Castle Corridors', 'Winding castle halls with a cone.', 'Function turn plus a smart loop.', [2, 'R', 2, 'L', 2, 'D', 2], smartFn(), { use: ['function', 'while'] });
nl(10, 99, 'Final Exam', 'A list, a function and a sensor all together. Dr. Glitch is watching!', 'Function go(n). For each leg in legs: go(leg), then turn toward the road.', [3, 'R', 2, 'L', 3, 'R', 2], [goFn(), each('leg', 'legs', call('go', v('leg')), turnToRoad())], { data: { legs: [3, 2, 3, 2] }, use: ['foreach', 'function'] });

// ---------- put each world in order and number every level ----------
function assemble(): Level[] {
  const out: Level[] = [];
  for (let ch = 1; ch <= 10; ch++) {
    const extras = (after: number) => EXTRA.filter((e) => e.draft.chapter === ch && e.after === after).map((e) => e.draft);
    const world: (Draft & { old?: number })[] = [...extras(0)];
    for (const o of ORIGINAL.filter((l) => l.chapter === ch).sort((a, b) => a.old - b.old)) world.push(o, ...extras(o.old));
    world.forEach((d, i) =>
      out.push({ ...d, id: out.length + 1, index: i + 1, boss: i === world.length - 1, tools: toolsFor(ch, i + 1, d.ref) }),
    );
  }
  return out;
}

export const LEVELS: Level[] = assemble();
export const TOTAL_LEVELS = LEVELS.length;
export const levelById = (id: number) => LEVELS[id - 1];
export const levelsIn = (chapter: number) => LEVELS.filter((l) => l.chapter === chapter);
/** Old level number (1-100) → new level number, for moving saved progress. */
export const OLD_TO_NEW: Record<number, number> = Object.fromEntries(LEVELS.filter((l) => l.old).map((l) => [l.old, l.id]));
