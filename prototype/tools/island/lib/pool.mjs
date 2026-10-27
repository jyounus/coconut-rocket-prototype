// A tiny worker-thread pool: every worker is initialised once with shared buffers, then tasks are handed out
// one at a time as workers free up.
import { Worker } from 'node:worker_threads';

export class Pool {
  constructor(n, url, init) {
    this.workers = []; this.ready = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(url, { workerData: init, resourceLimits: { maxOldGenerationSizeMb: 4096 } });
      this.workers.push(w);
      this.ready.push(new Promise((res, rej) => { w.once('message', m => m === 'ready' ? res() : rej(new Error(String(m)))); w.once('error', rej); }));
    }
  }
  async run(tasks, onDone) {
    await Promise.all(this.ready);
    const results = new Array(tasks.length); let next = 0, done = 0;
    if (!tasks.length) return results;
    return new Promise((res, rej) => {
      const feed = w => { if (next < tasks.length) { const i = next++; w._i = i; w.postMessage(tasks[i]); } };
      for (const w of this.workers) {
        w.removeAllListeners('message'); w.removeAllListeners('error');
        w.on('message', m => { if (m && m.error) { rej(new Error(m.error)); return; } results[w._i] = m; done++; onDone?.(done, tasks.length); if (done === tasks.length) res(results); else feed(w); });
        w.on('error', rej);
        feed(w);
      }
    });
  }
  close() { for (const w of this.workers) w.terminate(); }
}
