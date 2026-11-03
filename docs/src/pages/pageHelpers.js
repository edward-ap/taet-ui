export function liveExample(title, create, description, styles) {
  return { title, create, description, styles,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}

export function apiRows(rows) {
  return rows.map(([name, type, description]) => ({ name, type, description }));
}

// The public examples target the full portable ESM distribution.
export function importsFor(stable, experimental = []) {
  const names = [...new Set([...stable, ...experimental])];
  return [[names.length ? `import { ${names.join(", ")} } from "./taet-ui.min.js";` : "",
    '// In HTML, once: <link rel="stylesheet" href="./taet-ui.min.css">'
  ].filter(Boolean).join("\n")];
}
