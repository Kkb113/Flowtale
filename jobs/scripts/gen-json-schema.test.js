const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateSchemas } = require('./gen-json-schema');

let directory;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-schema-test-')); });
afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });

test('compiler errors fail generation and preserve the previously generated contracts', () => {
  const source = path.join(directory, 'source');
  const output = path.join(directory, 'out');
  fs.mkdirSync(source);
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(source, 'invalid.ts'), 'export interface Broken { field: MissingType; }');
  fs.writeFileSync(path.join(output, 'previous.json'), '{"existing":true}');
  expect(() => generateSchemas(source, output)).toThrow('Schema generation failed');
  expect(fs.readdirSync(output)).toEqual(['previous.json']);
  expect(fs.readFileSync(path.join(output, 'previous.json'), 'utf8')).toBe('{"existing":true}');
});

test('empty source directories cannot silently erase contracts', () => {
  const source = path.join(directory, 'empty');
  fs.mkdirSync(source);
  expect(() => generateSchemas(source, path.join(directory, 'out'))).toThrow('No schema sources');
});
