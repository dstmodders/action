import * as core from '@actions/core';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';
import { AnnotationProperties } from '@actions/core';
import { Input } from './input';
import { compare, DiffEntry } from './diff';

export interface LintAnnotation {
  action?: string;
  message: string;
  properties: AnnotationProperties;
}

export interface LintFile {
  annotations: [LintAnnotation];
  exitCode: number;
  path: string;
}

export interface Lint {
  failed: number;
  files: LintFile[];
  issues: number;
  output: string;
  passed: number;
}

export function newEmptyAnnotations(): [LintAnnotation] {
  const result: [LintAnnotation] = [<LintAnnotation>{}];
  result.pop();
  return result;
}

export function newEmptyLint(): Lint {
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

export function printWarningsForFiles(files: LintFile[], title: string): void {
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    if (file.exitCode > 0 && file.annotations.length > 0) {
      core.info('');
      core.info(file.path);
      // eslint-disable-next-line no-restricted-syntax
      for (const annotation of file.annotations) {
        let lineRef = `L${annotation.properties.startLine}`;
        if (annotation.properties.endLine) {
          lineRef = `${lineRef}-L${annotation.properties.endLine}`;
        }

        let { action } = annotation;
        if (action) {
          action = action.charAt(0).toUpperCase() + action.slice(1);
        }

        core.warning(annotation.message, {
          ...annotation.properties,
          title: action
            ? `${title} / ${file.path}#${lineRef} / ${action}`
            : `${title} / ${file.path}#${lineRef}`,
        });
      }
    }
  }
}

export function printResult(input: Input, result: Lint, title: string): void {
  if (result.files.length === 0) {
    return;
  }

  core.info(
    `Checked ${result.files.length} file${
      result.files.length === 1 ? '' : 's'
    }: ${result.passed} passed, ${result.failed} failed`,
  );

  if (result.failed > 0) {
    const msg = `Found ${result.issues} issue${result.issues === 1 ? '' : 's'}`;
    if (input.ignoreFailure) {
      core.warning(msg);
    } else {
      core.setFailed(msg);
    }
    printWarningsForFiles(result.files, title);
  } else {
    core.info('No issues found');
  }
}

export async function getFiles(
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

export async function compareToAnnotations(
  annotations: [LintAnnotation],
  file: string,
  changed: string,
): Promise<number> {
  const original: string = fs.readFileSync(file, 'utf8');
  const diffEntries: DiffEntry[] = await compare(original, changed);
  let issues: number = 0;
  diffEntries.forEach((entry) => {
    if (entry.startLine > 0 && entry.value.length > 0) {
      issues += 1;
      annotations.push({
        action: entry.action,
        message: entry.value,
        properties: <AnnotationProperties>{
          endLine: entry.endLine,
          startLine: entry.startLine,
          file,
        },
      });
    }
  });
  return Promise.resolve(issues);
}
