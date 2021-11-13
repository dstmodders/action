import { AnnotationProperties } from '@actions/core';
import * as core from '@actions/core';

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

export {
  Lint,
  LintAnnotation,
  LintFile,
  newEmptyAnnotations,
  newEmptyLint,
  printWarningsForFiles,
};
