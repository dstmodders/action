import * as Diff from 'diff';

interface DiffChange {
  added?: boolean | undefined;
  count: number;
  removed?: boolean | undefined;
  value: string;
}

interface DiffEntry {
  action: string;
  endLine?: number;
  previousValue?: string;
  startLine: number;
  value: string;
}

function newEmptyDiffEntries(): DiffEntry[] {
  const result: DiffEntry[] = [];
  result.pop();
  return result;
}

async function compare(original, changed): Promise<DiffEntry[]> {
  const entries = newEmptyDiffEntries();
  const result: DiffChange[] = Diff.diffLines(original, changed);
  const skip: number[] = [];
  let line: number = 1;

  result.forEach((part, idx) => {
    const nextPart = idx + 1 <= result.length ? result[idx + 1] : null;

    if (!part.removed && !part.added) {
      // unchanged
      line += part.count;
    } else if (part.removed && !part.added && nextPart) {
      const removeLine: number = line;
      line += part.count;

      if (!nextPart.removed && nextPart.added) {
        // replaced
        skip.push(idx + 1);
        entries.push({
          action: 'replace',
          endLine: line,
          previousValue: part.value,
          startLine: removeLine,
          value: nextPart.value,
        });
      } else {
        // removed
        entries.push({
          action: 'remove',
          startLine: line,
          value: part.value,
        });
      }
    } else if (part.added && !skip.includes(idx)) {
      // added
      entries.push({
        action: 'add',
        startLine: line,
        value: part.value,
      });
    } else if (part.removed && !part.added) {
      // removed
      entries.push({
        action: 'remove',
        startLine: line,
        value: part.value,
      });
    }
  });

  return entries;
}

export { DiffChange, DiffEntry, compare, newEmptyDiffEntries };
