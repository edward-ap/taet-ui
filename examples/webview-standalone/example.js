// Application-owned host; one framework profile/format per document.
window.mountTaetExample = function (ui) {
  if (!ui.Panel) {
    const data = new ui.DataStore(); data.parse([{id: 'one', text: 'Tæt UI'}]);
    const status = document.querySelector('#app');
    status.setAttribute('role', 'status');
    status.textContent = 'Foundation model: ' + data.all().length + ' record';
    window.taetExample = {data, destroy() { data.destroy(); }};
  } else {
    const name = new ui.TextInput({name: 'name', label: 'Name', value: 'Ada'});
    const status = new ui.ReadonlyText({role: 'status', text: 'Ready'});
    const form = new ui.Form().row(name);
    form.row(new ui.Button({text: 'Apply', onClick() {
      status.setText('Hello, ' + form.value.get().name + '!');
    }}));
    const screen = new ui.Panel('#app', {width: 420}).add(form, status);
    window.taetExample = {screen, form, destroy() { screen.destroy(); }};
  }
  window.addEventListener('pagehide', () => window.taetExample.destroy(), {once: true});
};
