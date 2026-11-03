import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const [input, baselinePath] = process.argv.slice(2);
if (!input) throw new Error('Usage: npm run perf:check -- <results.json> [same-host-baseline.json]');
const result = JSON.parse(readFileSync(input, 'utf8'));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => { const sorted = [...values].sort((a, b) => a - b); const i = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2; };
function summarize(data) {
  assert.equal(data.rows, 10000); assert.equal(data.columns, 100);
  assert.equal(data.ticks, 60); assert.equal(data.updatesPerTick, 20);
  assert.ok(data.results.length > 0 && data.memory.length === 10, 'Missing workload/lifecycle samples');
  const grouped = new Map();
  for (const sample of data.results) {
    assert.equal(sample.cancelledEdits, 0, 'Background updates lost an edit');
    assert.ok(sample.cells > 0 && sample.cells <= 800, 'Virtual body DOM exceeded its structural budget');
    for (const key of ['updateTimes', 'frameGaps', 'renderTimes', 'edits']) {
      assert.ok(sample[key].length > 0 && sample[key].every(value => Number.isFinite(value) && value >= 0), `Invalid ${key}`);
    }
    assert.equal(sample.updateTimes.length, 60); assert.equal(sample.edits.length, 10);
    if (sample.profiled) continue;
    const key = `${sample.type}/${sample.mode}`;
    const group = grouped.get(key) ?? []; group.push(sample); grouped.set(key, group);
  }
  for (const type of ['Grid', 'TreeGrid']) {
    const memory = data.memory.filter(sample => sample.type === type);
    assert.equal(memory.length, 5);
    assert.deepEqual(memory.map(sample => sample.cycles), [10, 20, 30, 40, 50]);
    for (const sample of memory) {
      assert.equal(sample.jsEventListeners, 0, 'Native listeners retained after destroy');
      assert.equal(sample.nodes, memory[0].nodes, 'DOM grows across teardown cycles');
    }
    assert.ok(memory.at(-1).usedSize - memory[0].usedSize < 1024 * 1024, 'Post-GC heap grew by over 1 MiB');
  }
  return Object.fromEntries([...grouped].map(([key, samples]) => {
    assert.equal(samples.length, 2, `${key}: expected two unprofiled runs`);
    return [key, { updateMs: median(samples.map(s => mean(s.updateTimes))), frameP95Ms: median(samples.map(s => [...s.frameGaps].sort((a,b) => a-b)[56])) }];
  }));
}
const summary = summarize(result);
if (baselinePath) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  assert.equal(result.browser, baseline.browser, 'Timing comparisons require the same browser version');
  assert.ok(result.environment && baseline.environment, 'Timing comparisons require environment metadata');
  assert.deepEqual(result.environment, baseline.environment, 'Timing comparisons require matching environments');
  const previous = summarize(baseline);
  assert.deepEqual(Object.keys(summary).sort(), Object.keys(previous).sort(), 'Workload modes differ');
  for (const [key, value] of Object.entries(summary)) {
    // Broad regression gate, not a claim about sub-millisecond improvements.
    assert.ok(value.updateMs <= previous[key].updateMs * 1.5 + 0.5, `${key}: update regression`);
    assert.ok(value.frameP95Ms <= previous[key].frameP95Ms * 1.5 + 16.7, `${key}: frame-gap regression`);
  }
}
console.log(JSON.stringify({ browser: result.browser, checks: 'passed', timingComparison: Boolean(baselinePath), summary }, null, 2));
