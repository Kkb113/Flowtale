const {
  copyFileSync,
  mkdirSync,
  readdirSync,
} = require('node:fs');
const { join } = require('node:path');

const source = join(__dirname, '..', 'src', 'http', 'llm-ops', 'prompts');
const destination = join(__dirname, '..', 'dist', 'src', 'http', 'llm-ops', 'prompts');

mkdirSync(destination, { recursive: true });

for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isFile()) {
    copyFileSync(join(source, entry.name), join(destination, entry.name));
  }
}
