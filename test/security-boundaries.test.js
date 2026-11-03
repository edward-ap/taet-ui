import test from 'node:test';
import assert from 'node:assert/strict';
import { gridExporters } from '../src/ui/GridExporters.js';

test('spreadsheet export escapes formula-like strings and headers without changing numeric values or raw defaults', () => {
  const values = ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1', ' \r=1', '\ntext', 'plain', -12, 0, null, 'a,"b'];
  const context = { columns: values.map((_, i) => ({ id: i, title: '=header' })), rows: [values], getValue: (row, col) => row[col.id] };
  for (const kind of ['csv', 'tsv']) {
    const text = gridExporters[kind]({ escapeFormulas: true }).export(context);
    assert.ok(text.startsWith("'=header"));
    for (const prefix of ["'=1+1", "'+SUM(A1)", "'-1+2", "'@SUM(A1)", "'\t=1", "' \r=1", "'\ntext"]) assert.ok(text.includes(prefix));
    assert.ok(text.includes('-12')); assert.ok(!text.includes("'-12"));
    assert.ok(gridExporters[kind]().export(context).startsWith('=header'));
  }
});

