/// <reference lib="webworker" />
import { createSim, dataPrelude, type Level } from './engine';

// Kid code runs here so an accidental `while (true) {}` can be stopped from the page.
self.onmessage = (e: MessageEvent<{ level: Level; code: string }>) => {
  const { level, code } = e.data;
  const sim = createSim(level);
  const names = Object.keys(sim.api).filter((n) => n !== 'tick');
  const result = sim.run(() => {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...names, `"use strict";\n${dataPrelude(level.data)}\n${code}`);
    fn(...names.map((n) => sim.api[n as keyof typeof sim.api]));
  });
  self.postMessage(result);
};

// tells the page the worker has loaded, so its "ran forever" timer can start fairly
self.postMessage({ ready: true });
