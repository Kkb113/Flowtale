const fs = require('node:fs');
const path = require('node:path');
const schema = require('typescript-json-schema');

// Generate everything before touching outputs. A compiler error must never leave
// a successful build with missing or stale AI tool contracts.
function generateSchemas(source, output) {
  const files = fs.readdirSync(source).filter(file => file.endsWith('.ts')).sort();
  if (!files.length) throw new Error('No schema sources found');
  const generated = files.map(file => {
    const program = schema.getProgramFromFiles([path.join(source, file)], {});
    const result = schema.generateSchema(program, '*', { required: true });
    if (!result) throw new Error(`Schema generation failed: ${file}`);
    return [file.replace(/\.ts$/, '.json'), `${JSON.stringify(result, null, 4)}\n`];
  });
  fs.mkdirSync(output, { recursive: true });
  for (const [name, content] of generated) {
    const target = path.join(output, name);
    const staged = `${target}.tmp`;
    fs.writeFileSync(staged, content);
    fs.renameSync(staged, target);
  }
  const names = new Set(generated.map(([name]) => name));
  for (const name of fs.readdirSync(output)) {
    if (name.endsWith('.json') && !names.has(name)) fs.unlinkSync(path.join(output, name));
  }
  return generated.length;
}

module.exports = { generateSchemas };
if (require.main === module) {
  const source = path.join(__dirname, '..', 'src', 'json-schema');
  try {
    console.log(`Generated ${generateSchemas(source, path.join(source, 'out'))} schemas`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
