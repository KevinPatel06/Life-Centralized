// Checks the owner's local seed file when it exists. CI has no seed file, so the test is skipped there.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBackup } from './backup';

const seedPath = join(__dirname, '..', '..', 'seed.local.json');
const seedTest = existsSync(seedPath) ? test : test.skip;

seedTest('the local seed file is a valid backup with a 7-day routine', () => {
  const result = parseBackup(readFileSync(seedPath, 'utf8'));
  if (!result.ok) throw new Error(result.error);
  expect(result.state.template.days).toHaveLength(7);
  for (const day of result.state.template.days) {
    expect(day.blocks.map((b) => b.id)).toEqual(['morning', 'afternoon', 'evening', 'winddown']);
    for (const item of day.items) expect(['morning', 'afternoon', 'evening', 'winddown']).toContain(item.block);
  }
  for (const task of Object.values(result.state.tasks)) expect(['trading', 'health', 'projects', 'life']).toContain(task.tag);
});
