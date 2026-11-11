// Helper of tools/check.mjs: builds tower models on a worker thread (there are thousands, so the
// check spreads them over the CPU's cores). Not something to run on its own.
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** An error as one line: its message and the first src/ line of its stack. */
export function where(err) {
  if (!(err instanceof Error)) return String(err);
  const at = (err.stack ?? '').split('\n').find((l) => l.includes('/src/'));
  return `${err.message}${at ? `  (${at.trim().replace(/^at /, '').replace(`file://${ROOT}`, '')})` : ''}`;
}

/**
 * Faces and signs are painted on a <canvas>. Node has none, so painting goes to a stand-in that
 * swallows every call: the check sees that the code runs, not what it draws.
 */
export function fakeCanvas() {
  const blank = new Proxy(function () {}, { get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : blank), set: () => true, apply: () => blank, construct: () => blank });
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => blank, addEventListener() {}, toDataURL: () => '' }) };
}

if (!isMainThread) {
  fakeCanvas();
  const fails = [];
  let n = 0;
  try {
    const { TOWERS } = await import('../src/config.js');
    const { TOWER_MODELS } = await import('../src/models.js');
    for (const key of workerData.keys) {
      if (!TOWER_MODELS[key]) {
        fails.push([`tower ${key} has no model in TOWER_MODELS`, '']);
        continue;
      }
      for (let lv = 0; lv < TOWERS[key].levels.length; lv++) {
        try {
          n++;
          if (!TOWER_MODELS[key](lv)?.root) fails.push([`tower ${key} level ${lv} built no model`, '']);
        } catch (err) {
          fails.push([`tower ${key} level ${lv}`, where(err)]);
        }
      }
    }
  } catch (err) {
    fails.push(['src/models.js would not load', where(err)]);
  }
  parentPort.postMessage({ n, fails });
}
