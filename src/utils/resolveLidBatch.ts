export interface LidResolution {
  lid: string;
  phone: string | null;
}

export async function resolveLidBatch(
  lids: string[],
  resolver: (lid: string) => Promise<string | null>,
  concurrency = 10,
): Promise<LidResolution[]> {
  const uniqueLids = [...new Set(lids)];
  const results = new Array<LidResolution>(uniqueLids.length);
  let cursor = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), uniqueLids.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < uniqueLids.length) {
      const index = cursor;
      cursor += 1;
      const lid = uniqueLids[index];
      results[index] = { lid, phone: await resolver(lid) };
    }
  });
  await Promise.all(workers);
  return results;
}
