import { TextArea, CheckLetter, RadioLetter, DropDownList, MultiSelectDropDown } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').TextAreaOptions} */
const options = { acceptsTab: true, onChange: event => event.source.getLines() };
const text = new TextArea(options); text.lines.set(['A', 'B']); text.destroy();
const check = new CheckLetter({ letter: 1, onChange: event => event.source.getLetter() }); check.destroy();
const radio = new RadioLetter({ items: ['A', 'B'] }); radio.destroy();
const dropdown = new DropDownList({ value: 'a' }); dropdown.destroy();
/** @type {import('taet-ui/inputs').MultiSelectDropDownOptions<{ id: number; text: string }, number>} */
const multiOptions = { value: [1], onChange: event => event.newItems[0]?.text.toUpperCase() };
const multi = new MultiSelectDropDown(multiOptions); multi.data.parse([{ id: 1, text: 'One' }]); multi.destroy();
