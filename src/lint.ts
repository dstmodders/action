import * as core from '@actions/core';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';
import { AnnotationProperties } from '@actions/core';
import { Slack } from './slack';
import { compare, DiffEntry } from './diff';

interface LintAnnotation {
  message: string;
  properties: AnnotationProperties;
}

interface LintFile {
  annotations: [LintAnnotation];
  exitCode: number;
  path: string;
}

interface Lint {
  failed: number;
  files: LintFile[];
  issues: number;
  output: string;
  passed: number;
}

function newEmptyAnnotations(): [LintAnnotation] {
  const result: [LintAnnotation] = [<LintAnnotation>{}];
  result.pop();
  return result;
}

function newEmptyLint(): Lint {
  const result: Lint = {
    failed: 0,
    files: [<LintFile>{}],
    issues: 0,
    output: '',
    passed: 0,
  };
  result.files.pop();
  return result;
}

function printWarningsForFiles(files: LintFile[], title: string): void {
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    if (file.exitCode > 0 && file.annotations.length > 0) {
      core.info('');
      core.info(file.path);
      // eslint-disable-next-line no-restricted-syntax
      for (const annotation of file.annotations) {
        core.warning(annotation.message, {
          ...annotation.properties,
          title,
        });
      }
    }
  }
}

function print(result: Lint, title: string): void {
  if (result.failed > 0) {
    core.info(`Failed: ${result.failed}`);
    core.info(`Passed: ${result.passed}`);
    printWarningsForFiles(result.files, title);
  } else {
    core.info('No issues found');
  }
}

async function getFiles(
  ignoreFile: string,
  extensions: string,
): Promise<string[]> {
  if (fs.existsSync(ignoreFile)) {
    const data: string = fs.readFileSync(ignoreFile, 'utf8');
    const ignored: string[] = data.trim().split(/\r\n|\r|\n/);
    const paths = glob.sync(`**/*.${extensions}`);
    return Promise.resolve(ignore().add(ignored).filter(paths));
  }
  return Promise.resolve(glob.sync(`**/*.${extensions}`));
}

async function compareToAnnotations(
  annotations: [LintAnnotation],
  file: string,
  changed: string,
): Promise<void> {
  const original: string = fs.readFileSync(file, 'utf8');
  const diffEntries: DiffEntry[] = await compare(original, changed);
  diffEntries.forEach((entry) => {
    if (entry.startLine > 0 && entry.value.length > 0) {
      annotations.push({
        message: entry.value,
        properties: <AnnotationProperties>{
          startLine: entry.startLine,
          file,
        },
      });
    }
  });
  return Promise.resolve();
}

async function updateSlack(result: Lint, slack: Slack): Promise<void> {
  try {
    if (slack.isRunning) {
      if (await slack.update()) {
        if (result.failed > 0) {
          core.info('');
        }
        core.info('Updated Slack message');
      }
      return Promise.resolve();
    }
    return Promise.reject();
  } catch (error) {
    return Promise.reject(error);
  }
}

export {
  Lint,
  LintAnnotation,
  LintFile,
  compareToAnnotations,
  getFiles,
  newEmptyAnnotations,
  newEmptyLint,
  print,
  printWarningsForFiles,
  updateSlack,
};
