import type { BlockType } from './ast';

/** How every block looks on screen: icon, name and colour group. Shared by the editor and the guides. */
export const META: Record<BlockType, { icon: string; label: string; cls: string }> = {
  forward: { icon: '⬆️', label: 'Drive', cls: 'b-move' },
  left: { icon: '↰', label: 'Turn left', cls: 'b-turn' },
  right: { icon: '↱', label: 'Turn right', cls: 'b-turn' },
  repeat: { icon: '🔁', label: 'Repeat', cls: 'b-loop' },
  while: { icon: '🔄', label: 'While', cls: 'b-loop' },
  if: { icon: '❓', label: 'If', cls: 'b-logic' },
  let: { icon: '📦', label: 'Make box', cls: 'b-var' },
  set: { icon: '✏️', label: 'Set box', cls: 'b-var' },
  change: { icon: '➕', label: 'Change box', cls: 'b-var' },
  function: { icon: '🛠️', label: 'Function', cls: 'b-fn' },
  call: { icon: '📞', label: 'Call', cls: 'b-fn' },
  foreach: { icon: '📜', label: 'For each', cls: 'b-list' },
  say: { icon: '💬', label: 'Say', cls: 'b-say' },
  onsign: { icon: '🪧', label: 'On sign', cls: 'b-event' },
  honk: { icon: '📣', label: 'Horn', cls: 'b-fun' },
  spin: { icon: '🌀', label: 'Spin', cls: 'b-fun' },
  jump: { icon: '🦘', label: 'Jump', cls: 'b-fun' },
  dance: { icon: '💃', label: 'Dance', cls: 'b-fun' },
  flash: { icon: '🚨', label: 'Party lights', cls: 'b-fun' },
  sing: { icon: '🎵', label: 'Sing', cls: 'b-fun' },
};
