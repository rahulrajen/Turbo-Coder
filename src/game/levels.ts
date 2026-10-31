import { type Block, type BlockType, type Feature, countBlocks, countCodeLines, toCode } from './ast';
import type { Level } from './engine';
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

function toolsFor(id: number): BlockType[] {
  if (id === 1) return ['forward'];
  const ch = Math.ceil(id / 10);
  const t: BlockType[] = ['forward', 'left', 'right'];
  if (id >= 5) t.push('honk');
  if (ch >= 2) t.push('repeat');
  if (ch >= 3) t.push('if', 'while');
  if (ch >= 5) t.push('let', 'set', 'change');
  if (ch >= 6) t.push('function', 'call');
  if (ch >= 8) t.push('foreach');
  if (ch >= 9) t.push('say', 'onsign');
  return t;
}

const DEFAULT_USE: Record<number, Feature[]> = { 2: ['repeat'], 3: ['while'], 4: ['if'], 5: ['let'], 6: ['function'], 7: ['function'], 8: ['foreach'], 9: ['say'] };

const SPEC: Level[] = [];

function lv(id: number, title: string, story: string, hint: string, parts: Part[], dir: 0 | 1 | 2 | 3, ref: Block[], o: Opts = {}) {
  const { grid } = buildGrid({ dir, parts, signs: o.signs, gates: o.gates });
  SPEC.push({
    id,
    chapter: Math.ceil(id / 10),
    title,
    story,
    hint,
    grid,
    startDir: dir,
    tools: toolsFor(id),
    ref,
    par: { blocks: countBlocks(ref), lines: countCodeLines(toCode(ref)) },
    use: o.use ?? DEFAULT_USE[Math.ceil(id / 10)] ?? [],
    data: o.data ?? {},
    secret: o.secret,
    starter: o.starter,
    boss: id % 10 === 0,
  });
}

const STAIRS: Part[] = [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L'];
const SPIRAL: Part[] = [1, 'R', 2, 'R', 3, 'R', 4, 'R', 5];
const turnToRoad = () => iff(ok('roadLeft'), [L()], [R()]);

// ---------- Chapter 1: Garage Town (commands) ----------
lv(1, 'Start Your Engine', "Coach Gearheart: 'This is your car! Drive it to the checkered flag. Tap Drive until you get there.'", 'Count the squares between your car and the flag. You need 4 Drive blocks.', [4], 1, fx(4));
lv(2, 'Sharp Corner', 'The road bends left! Cars must turn to follow it.', 'Drive 3 times, turn left, then drive 2 times.', [3, 'L', 2], 1, [...fx(3), L(), ...fx(2)]);
lv(3, 'Right Turn', "Now the road bends right. Nitro Nick is already zooming ahead!", 'Drive twice, turn right, drive 3 times.', [2, 'R', 3], 1, [...fx(2), R(), ...fx(3)]);
lv(4, 'Coin Trail', 'Shiny coins 🪙 are lying on the road. Grab them on your way to the flag!', 'Left at the first bend, right at the second. Drive twice between the turns.', [2, 'L', 2, 'R', 2], 1, [...fx(2), L(), ...fx(2), R(), ...fx(2)]);
lv(5, 'U-Turn Alley', 'A narrow road that doubles back on itself.', 'Turn right twice with one drive in between.', [2, 'R', 1, 'R', 2], 1, [...fx(2), R(), ...fx(1), R(), ...fx(2)]);
lv(6, 'Zig Zag', 'Wheee! Right, left, right, left!', 'Drive, turn right, drive, turn left… and repeat the pattern.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1], 1, [F(), R(), F(), L(), F(), R(), F(), L(), F()]);
lv(7, 'Round the Block', 'Drive all the way around the block.', 'Three right turns. Drive 2, 2, 2 and then 1.', [2, 'R', 2, 'R', 2, 'R', 1], 1, [...fx(2), R(), ...fx(2), R(), ...fx(2), R(), F()]);
lv(8, 'The Long Road', 'This road is looooong. You will need MANY Drive blocks… phew! Is there a shortcut?', 'You need 8 Drive blocks. Tired? The next town has a trick!', [8], 1, fx(8));
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
lv(21, 'Look Ahead', "Your car has sensors! 'atFinish' tells it when it has arrived.", 'While NOT atFinish: Drive.', [7], 1, [whl(no('atFinish'), F())]);
lv(22, 'Wall Detector', "'roadAhead' is true when there is road in front of you.", 'While roadAhead: Drive. Then turn right. Then do it again.', [5, 'R', 4], 1, [whl(ok('roadAhead'), F()), R(), whl(ok('roadAhead'), F())]);
lv(23, 'Turn When Blocked', 'If there is road ahead, drive. Otherwise turn right. Dr. Glitch hid the signs!', 'While not atFinish: If roadAhead then Drive, else turn right.', [3, 'R', 2, 'R', 3, 'R', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [R()]))], { use: ['while', 'if'] });
lv(24, 'Left Only', 'These bends all go left.', 'Same idea as before, but turn left in the else.', [3, 'L', 2, 'L', 3, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [L()]))], { use: ['while', 'if'] });
lv(25, 'Left or Right?', 'The bends go both ways. Ask the sensors which way is open!', 'In the else, check roadLeft: if true turn left, else turn right.', [2, 'R', 2, 'L', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(26, 'Cone Trouble', 'Dr. Glitch dropped cones. Your smart car can dodge them without counting!', 'The same smart loop as before works on cones too!', ['D', 2, 'D'], 1, SMART(), { use: ['while', 'if'] });
lv(27, 'Desert Maze', 'A winding maze. One smart loop solves any road.', 'While not atFinish: if roadAhead drive, else if roadLeft left, else right.', [3, 'R', 2, 'L', 4, 'L', 2, 'R', 3, 'R', 1, 'L', 2], 1, SMART(), { use: ['while', 'if'] });
lv(28, 'Coin Radar', "'coinAhead' sees coins. Honk when a coin is coming up!", 'Add an If inside your smart loop: coinAhead then honk.', [2, 'R', 2, 'L', 3, 'R', 2], 1, [whl(no('atFinish'), iff(ok('coinAhead'), [honk()]), iff(ok('roadAhead'), [F()], [turnToRoad()]))], { use: ['while', 'if'] });
lv(29, 'Zig Zag Highway', 'A long zig-zag. Counting would take forever.', 'The smart loop handles zig zags too.', [1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1, 'L', 1, 'R', 1], 1, SMART(), { use: ['while', 'if'] });
lv(30, 'Sandstorm Run', "BOSS! Dr. Glitch's sandstorm! Dodge cones and corners with ONE smart loop.", 'While not atFinish… the same smart loop you have been building.', ['D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 1], 1, SMART(), { use: ['while', 'if'] });

// ---------- Chapter 4: Cone Jungle (conditions) ----------
lv(31, 'Measure Up', "'distanceAhead' counts the road squares in front. Use it as a number!", 'Repeat (distanceAhead) times: Drive. Turn right. Repeat (distanceAhead) times: Drive.', [5, 'R', 4], 1, [rep(sn('distanceAhead'), F()), R(), rep(sn('distanceAhead'), F())], { use: [] });
lv(32, 'Greater Than', 'Compare numbers with > and <. Drive while the distance is more than 0.', 'If distanceAhead > 0 then Drive, else turn toward the road.', [3, 'R', 2, 'L', 4, 'L', 2], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(33, 'This AND That', '&& means BOTH things must be true. Turn left only if left is open AND right is closed.', 'Use two conditions joined with AND in the turn check.', [3, 'L', 2, 'R', 3, 'R', 2, 'L', 1], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);
lv(34, 'Right-Hand Rule', 'Explorers always check the right side first. Try it!', 'If roadAhead drive, else if roadRight turn right, else left.', [2, 'R', 3, 'L', 2, 'R', 4], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadRight'), [R()], [L()])]))]);
lv(35, 'Three Questions', 'Ask separate questions one after another: turn left? turn right? drive?', 'Three If blocks in a row, each using NOT roadAhead and a side.', [2, 'L', 2, 'R', 2, 'L', 2, 'R', 3], 1, [whl(no('atFinish'), iff(all(no('roadAhead'), ok('roadLeft')), [L()]), iff(all(no('roadAhead'), ok('roadRight')), [R()]), iff(ok('roadAhead'), [F()]))]);
lv(36, 'Count and Turn', 'Mix a counting loop with a decision.', 'While not atFinish: Repeat (distanceAhead) Drive, then if roadLeft turn left else right.', [4, 'R', 2, 'L', 3, 'R', 5], 1, [whl(no('atFinish'), rep(sn('distanceAhead'), F()), turnToRoad())]);
lv(37, 'Jungle Dodge', 'Cones and corners together.', 'Your smart loop works around cones too.', ['D', 1, 'D', 'D'], 1, SMART());
lv(38, 'This OR That', '|| means at least ONE is true. Keep driving while ANY road is open.', 'While roadAhead OR roadLeft OR roadRight: …', [2, 'R', 2, 'R', 2, 'L', 2, 'L', 3], 1, [whl(any(ok('roadAhead'), ok('roadLeft'), ok('roadRight')), iff(ok('roadAhead'), [F()], [turnToRoad()]))]);
lv(39, 'Vine Swing', 'A long jungle road full of cones and bends.', 'Use the distance-checking smart loop.', [2, 'D', 2, 'R', 2, 'D', 2, 'L', 3], 1, [whl(no('atFinish'), iff(cmp(sn('distanceAhead'), '>', num(0)), [F()], [turnToRoad()]))]);
lv(40, "Nick's Jungle Trap", 'BOSS! Nitro Nick left a trap of cones! Use everything you know.', 'While not atFinish: if roadAhead drive, else if roadLeft AND NOT roadRight turn left, else turn right.', ['D', 'D', 2, 'R', 3, 'D', 2, 'L', 2, 'D', 'D', 1, 'R', 2], 1, [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(all(ok('roadLeft'), no('roadRight')), [L()], [R()])]))]);

// ---------- Chapter 5: Number Mountain (variables) ----------
lv(41, 'Meet Variables', 'A variable is a labelled box. Make a box called steps and put 4 inside.', 'Make steps = 4, then Repeat (steps) Drive.', [4], 1, [mk('steps', num(4)), rep(v('steps'), F())]);
lv(42, 'Two Boxes', 'Use two boxes for two straight bits of road.', 'Make a = 3 and b = 5. Repeat a, turn right, repeat b.', [3, 'R', 5], 1, [mk('a', num(3)), mk('b', num(5)), rep(v('a'), F()), R(), rep(v('b'), F())]);
lv(43, 'Sign Reader', "'readSign' reads the number on a road sign. This sign shows how far to go!", 'Drive once to reach the sign. Make n = readSign. Repeat n times Drive.', [5], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 4 } });
lv(44, 'Sign Chain', 'Two signs! Put the new number into your box with Set.', 'After the turn, drive once, then Set n = readSign and repeat n.', [4, 'R', 3], 1, [F(), mk('n', sn('readSign')), rep(v('n'), F()), R(), F(), setv('n', sn('readSign')), rep(v('n'), F())], { signs: { 1: 3, 5: 2 } });
lv(45, 'Growing Spiral', 'Each side is one longer than the last. A box can grow with Change!', 'Make n = 1. Repeat 4: [Repeat n Drive, turn right, Change n by 1]. Finish with Repeat n Drive.', SPIRAL, 1, [mk('n', num(1)), rep(4, rep(v('n'), F()), R(), chg('n', num(1))), rep(v('n'), F())]);
lv(46, 'Countdown', 'Count down to zero. Change by -1 each time.', 'Make n = 6. While n > 0: Drive and Change n by -1.', [6], 1, [mk('n', num(6)), whl(cmp(v('n'), '>', num(0)), F(), chg('n', num(-1)))]);
lv(47, 'Math Time', 'You can do math in code: × means multiply. Put math anywhere a number goes.', 'The first straight is 2 × 3 and the second is 4 + 1.', [6, 'R', 5], 1, [mk('a', bin(num(2), '*', num(3))), rep(v('a'), F()), R(), rep(bin(num(4), '+', num(1)), F())]);
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
lv(61, 'Move N', 'Give your function a number: go(3). The box n holds the number.', 'Function go(n): Repeat n Drive. Then go 3, right, go 4.', [3, 'R', 4], 1, [goFn(), call('go', num(3)), R(), call('go', num(4))]);
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
lv(73, 'Pick an Item', 'legs[0] is the FIRST item. Computers start counting at 0!', 'Repeat legs[0] Drive, right, Repeat legs[1] Drive, left, Repeat legs[2] Drive.', [2, 'R', 3, 'L', 4], 1, [rep(v('legs[0]'), F()), R(), rep(v('legs[1]'), F()), L(), rep(v('legs[2]'), F())], { data: { legs: [2, 3, 4] }, use: [] });
lv(74, 'List of Words', "A list can hold words. Turn right for 'R' and left otherwise.", "For each t in turns: Repeat 2 Drive, if t == 'R' right else left. Then drive 2 more.", [2, 'R', 2, 'L', 2, 'R', 2], 1, [each('t', 'turns', rep(2, F()), iff(cmp(v('t'), '==', str('R')), [R()], [L()])), rep(2, F())], { data: { turns: ['R', 'L', 'R'] } });
lv(75, 'Add Them Up', 'Make a box called total and add every coin to it.', 'Make total = 0. For each c in coins: change total by c. Then Repeat total Drive.', [6], 1, [mk('total', num(0)), each('c', 'coins', chg('total', v('c'))), rep(v('total'), F())], { data: { coins: [1, 2, 3] } });
lv(76, 'Objects in a List', 'Each stop is an object with parts: stop.n and stop.t.', "For each stop in stops: Repeat stop.n Drive, then if stop.t == 'R' right else left.", [2, 'R', 3, 'L', 2], 1, [each('stop', 'stops', rep(v('stop.n'), F()), iff(cmp(v('stop.t'), '==', str('R')), [R()], [L()]))], { data: { stops: [{ n: 2, t: 'R' }, { n: 3, t: 'L' }, { n: 2, t: 'R' }] } });
lv(77, 'Growing Legs', 'Legs 1 to 5. Use a sensor to choose the turn.', 'For each leg: Repeat leg Drive, if roadLeft left else right.', [1, 'R', 2, 'L', 3, 'R', 4, 'L', 5], 1, [each('leg', 'legs', rep(v('leg'), F()), turnToRoad())], { data: { legs: [1, 2, 3, 4, 5] } });
lv(78, 'List and Function', 'Combine a function with a list.', 'Make go(n). For each leg: go(leg), then turn toward the road.', [2, 'R', 3, 'L', 2, 'R', 3], 1, [goFn(), each('leg', 'legs', call('go', v('leg')), turnToRoad())], { data: { legs: [2, 3, 2, 3] } });
lv(79, 'Secret Commands', "The list holds commands as words: 'F', 'R' and 'L'. You are the interpreter!", "For each cmd: if cmd == 'F' drive, else if cmd == 'R' right, else left.", [2, 'R', 1, 'L', 3], 1, [each('cmd', 'cmds', iff(cmp(v('cmd'), '==', str('F')), [F()], [iff(cmp(v('cmd'), '==', str('R')), [R()], [L()])]))], { data: { cmds: ['F', 'F', 'R', 'F', 'L', 'F', 'F', 'F'] } });
lv(80, "Kraken's Treasure Map", 'BOSS! A list of objects: each has a command c and how many times n.', "For each step in map: Repeat step.n [if step.c == 'F' drive, else if 'R' right, else left].", [3, 'R', 2, 'L', 4, 'R', 2], 1, [each('step', 'map', rep(v('step.n'), iff(cmp(v('step.c'), '==', str('F')), [F()], [iff(cmp(v('step.c'), '==', str('R')), [R()], [L()])])))], {
  data: { map: [{ c: 'F', n: 3 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }, { c: 'L', n: 1 }, { c: 'F', n: 4 }, { c: 'R', n: 1 }, { c: 'F', n: 2 }] },
});

// ---------- Chapter 9: Gate Galaxy (strings, objects, events) ----------
lv(81, 'First Words', "A locked gate 🚪! Say the secret word 'open' while facing it.", "Drive once, say 'open', then Repeat 3 Drive.", [4], 1, [F(), say(str('open')), rep(3, F())], { gates: [2], secret: 'open' });
lv(82, 'Password Box', 'The password is stored in a box called password. Say it!', 'Drive once, say(password), Repeat 3 Drive.', [4], 1, [F(), say(v('password')), rep(3, F())], { gates: [2], secret: 'turbo', data: { password: 'turbo' } });
lv(83, 'Word Glue', 'Two boxes a and b hold parts of the password. Join them with +.', 'say(a + b)', [4], 1, [F(), say(bin(v('a'), '+', v('b'))), rep(3, F())], { gates: [2], secret: 'turbo', data: { a: 'tur', b: 'bo' } });
lv(84, 'Double Gates', 'Two gates, same password.', 'Say the password before each gate.', [3, 'R', 3], 1, [F(), say(v('password')), F(), F(), R(), F(), say(v('password')), F(), F()], { gates: [2, 5], secret: 'nova', data: { password: 'nova' } });
lv(85, 'Object Basics', 'car.fuel is a part of the car object. Use it as a number!', 'Repeat car.fuel Drive, right, Repeat (car.fuel − 1) Drive.', [4, 'R', 3], 1, [rep(v('car.fuel'), F()), R(), rep(bin(v('car.fuel'), '-', num(1)), F())], { data: { car: { fuel: 4 } }, use: [] });
lv(86, "The Driver's Word", 'The password is part of an object: driver.word.', 'say(driver.word)', [4], 1, [F(), say(v('driver.word')), rep(3, F())], { gates: [2], secret: 'vroom', data: { driver: { name: 'Zoom', word: 'vroom' } } });
const signHandler = () => onsign('sign', iff(cmp(v('sign'), '==', num(1)), [L()], [R()]));
lv(87, 'Road Signs Rule', 'onSign runs code whenever you pass a sign. Sign 1 means left, sign 2 means right.', 'onSign: if sign == 1 left else right. Then Repeat 6 Drive.', [2, 'R', 2, 'L', 2], 1, [signHandler(), rep(6, F())], { signs: { 2: 2, 4: 1 }, use: ['onsign'] });
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

export const LEVELS: Level[] = SPEC.sort((a, b) => a.id - b.id);
export const TOTAL_LEVELS = LEVELS.length;
export const levelById = (id: number) => LEVELS[id - 1];
