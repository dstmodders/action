import * as Diff from 'diff';

interface DiffEntry {
  line: number;
  value: string;
  newValue: string;
}

async function compare(original, changed): Promise<DiffEntry[]> {
  const entries = [<DiffEntry>{}];
  entries.pop();

  let isRemoved: boolean = false;
  let line: number = 1;
  let removeLine: number = 0;
  let removeValue: string = '';

  Diff.diffLines(original, changed).forEach((part) => {
    if (!part.removed && !part.added) {
      line += part.count;
    }

    if (part.removed && !part.added) {
      isRemoved = true;
      removeLine = line;
      removeValue = part.value;
      line += part.count;
    }

    if (isRemoved && !part.removed && part.added) {
      entries.push({
        line: removeLine,
        value: removeValue,
        newValue: part.value,
      });
    }
  });

  return entries;
}

export { DiffEntry, compare };
