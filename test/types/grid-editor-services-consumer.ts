import { DataStore } from 'taet-ui/core';
import { Grid, TreeGrid, gridEditors } from 'taet-ui/grid';
import type { GridEditorOverlayService, SelectGridEditorOptions } from 'taet-ui/grid/editors';

interface Row { id: number; parentId: null; country: string; date: string; time: string; dateTime: string }
interface Country { code: string; label: string; region: string }
const rows: Row[] = [{ id: 1, parentId: null, country: 'ca', date: '2026-09-06', time: '12:30', dateTime: '2026-09-06T12:30' }];
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

export function createServicesGrid(kind: 'Grid' | 'TreeGrid', host: HTMLElement, overlayManager: GridEditorOverlayService) {
  const choices = new DataStore<Country, string>({ idField: 'code' });
  choices.parse([{ code: 'ca', label: 'Canada', region: 'north' }, { code: 'fr', label: 'France', region: 'europe' }]);
  const seen = { queries: [] as string[], rows: [] as number[], renders: [] as string[] };
  const select = gridEditors.select<Row, number, Country, string>(cell => {
    seen.rows.push(cell.id);
    return { data: choices, overlayManager, textField: 'label', searchable: true,
      // External data takes precedence over items; it must not be reparsed.
      items: [{ code: 'ignored', label: 'Ignored', region: 'none' }],
      filterPredicate: (item, query, source) => {
        const code: string = source.data.idOf(item);
        check(source.data === choices && code === item.code, 'Choice source identity');
        seen.queries.push(query);
        return item.region.includes(query);
      },
      renderItem: (item, context) => {
        const code: string = context.id;
        const index: number = context.index;
        const selected: boolean = context.selected;
        const active: boolean = context.active;
        const current: Country | null = context.source.getSelectedItem();
        void index; void selected; void active; void current;
        seen.renders.push(code);
        return `<${item.label}>`;
      }
    };
  });
  const options = { height: 230, width: 680, columns: [
    { id: 'country', width: 180, editor: select },
    { id: 'date', width: 160, editor: gridEditors.date<Row>({ overlayManager }) },
    { id: 'time', width: 140, editor: gridEditors.time<Row>({ overlayManager }) },
    { id: 'dateTime', width: 190, editor: gridEditors.dateTime<Row>({ overlayManager }) }
  ] };
  const grid = kind === 'Grid' ? new Grid<Row>(host, options) : new TreeGrid<Row>(host, options);
  grid.data.parse(rows);
  return { grid, choices, seen };
}

// Runs against the installed package in Node, without DOM or a global overlay.
function checkOwnedChoices() {
  let ids = 0;
  const editor = gridEditors.select<Row, number, Country, string>({
    options: [{ code: 'ca', label: 'Canada', region: 'north' }], textField: 'label',
    getId: (item, index) => { const position: number = index; void position; ids++; return item.code; }
  });
  const grid = new Grid<Row>({ columns: [{ id: 'country', editor }] }); grid.data.parse(rows);
  grid.setCellRanges({ anchor: { rowId: 1, columnId: 'country' }, focus: { rowId: 1, columnId: 'country' } });
  check(grid.pasteClipboardText('fr'), 'Unmounted choice normalization');
  check(ids > 0 && grid.data.get(1)?.country === 'fr', 'Custom choice identity');
  grid.destroy();
}
checkOwnedChoices();

function rejected() {
  gridEditors.select<Row, number, Country, string>({
    // @ts-expect-error Choice schema differs from the Grid row schema.
    filterPredicate: item => item.country === 'ca'
  });
  gridEditors.select<Row, number, Country, string>({
    // @ts-expect-error Choice identity is a string, not the numeric Grid row ID.
    getId: item => item.code.length
  });
  gridEditors.select<Row, number, Country, string>({
    // @ts-expect-error Custom country schemas require records; primitive normalization only produces id/text.
    options: ['ca']
  });
  gridEditors.select<Row, number, Country, string>({
    // @ts-expect-error Renderers are synchronous.
    renderItem: async item => item.label
  });
  gridEditors.date({
    // @ts-expect-error An overlay service must implement getRoot/open/close.
    overlayManager: { getRoot: () => document.body }
  });
  const bad: SelectGridEditorOptions<Row, number, Country, string> = {
    // @ts-expect-error External choice data must match the choice schema.
    data: new DataStore<Row>()
  };
  void bad;
}
void rejected;
