import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLidBatch } from '../src/utils/resolveLidBatch';

test('resolve LIDs únicos mantendo a ordem da primeira ocorrência', async () => {
  const calls: string[] = [];
  const result = await resolveLidBatch(
    ['1@lid', '2@lid', '1@lid'],
    async (lid) => {
      calls.push(lid);
      return `${lid.replace('@lid', '')}@s.whatsapp.net`;
    },
    2,
  );

  assert.deepEqual(result, [
    { lid: '1@lid', phone: '1@s.whatsapp.net' },
    { lid: '2@lid', phone: '2@s.whatsapp.net' },
  ]);
  assert.deepEqual(calls.sort(), ['1@lid', '2@lid']);
});

test('respeita o limite de concorrência configurado', async () => {
  let active = 0;
  let maximum = 0;
  await resolveLidBatch(
    Array.from({ length: 12 }, (_, index) => `${index}@lid`),
    async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return null;
    },
    3,
  );

  assert.equal(maximum, 3);
});
