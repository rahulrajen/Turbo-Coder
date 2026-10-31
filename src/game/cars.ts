export interface CarType {
  id: string;
  name: string;
  color: string; // signature paint, used when paint is set to "car's own color"
  cost: number;
}

export const CARS: CarType[] = [
  { id: 'classic', name: 'Classic', color: '#ff3b4a', cost: 0 },
  { id: 'mini', name: 'Mini', color: '#22c55e', cost: 20 },
  { id: 'taxi', name: 'Taxi', color: '#ffcf24', cost: 25 },
  { id: 'police', name: 'Police Car', color: '#1e40af', cost: 35 },
  { id: 'jeep', name: 'Desert Jeep', color: '#b45309', cost: 30 },
  { id: 'buggy', name: 'Jungle Buggy', color: '#84cc16', cost: 30 },
  { id: 'rally', name: 'Rally Car', color: '#2f7bff', cost: 35 },
  { id: 'racer', name: 'F1 Racer', color: '#ef4444', cost: 50 },
  { id: 'truck', name: 'Monster Truck', color: '#a855f7', cost: 45 },
  { id: 'dozer', name: 'Bulldozer', color: '#f59e0b', cost: 40 },
  { id: 'fire', name: 'Fire Truck', color: '#dc2626', cost: 45 },
  { id: 'bus', name: 'Party Bus', color: '#ff5fb0', cost: 40 },
  { id: 'boat', name: 'Boat Car', color: '#0ea5e9', cost: 45 },
  { id: 'sub', name: 'Submarine', color: '#fbbf24', cost: 55 },
  { id: 'rocket', name: 'Rocket Car', color: '#e5e7eb', cost: 70 },
  { id: 'ghost', name: 'Ghost Car', color: '#c4b5fd', cost: 70 },
];

export const carById = (id: string) => CARS.find((c) => c.id === id) ?? CARS[0];

// Each world has three themed cars; boss levels get the F1 racer.
const WORLD_CARS: string[][] = [
  ['classic', 'mini', 'truck'],
  ['taxi', 'police', 'bus'],
  ['jeep', 'buggy', 'truck'],
  ['buggy', 'jeep', 'rally'],
  ['rally', 'jeep', 'mini'],
  ['dozer', 'fire', 'truck'],
  ['boat', 'taxi', 'bus'],
  ['sub', 'boat', 'mini'],
  ['rocket', 'police', 'racer'],
  ['ghost', 'fire', 'rocket'],
];

/** The car a level gives you when you use the "track car". */
export function levelCar(levelId: number): string {
  if (levelId % 10 === 0) return 'racer';
  const list = WORLD_CARS[Math.ceil(levelId / 10) - 1];
  return list[(levelId - 1) % 10 % list.length];
}

/** Which body and paint to draw. 'auto' means "use the level's car" / "use the car's own color". */
export function resolveCar(body: string, color: string, levelId?: number) {
  const id = body === 'auto' ? (levelId ? levelCar(levelId) : 'classic') : body;
  return { id, color: color === 'auto' ? carById(id).color : color };
}
