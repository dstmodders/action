import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AnnotationProperties } from '@actions/core';
import {
  Lint,
  LintAnnotation,
  getFiles,
  newEmptyAnnotations,
  newEmptyLint,
  print,
  updateSlack,
} from './lint';
import { Slack } from './slack';

async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let output: string = '';

    core.debug(`Getting Prettier version...`);
    await exec.exec('prettier', ['--version'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });

    result = output.trim();
    core.debug(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function lint(): Promise<Lint> {
  const result: Lint = newEmptyLint();

  try {
    const files = await getFiles('.prettierignore', '{md,xml,yml}');
    let exitCode: number = 0;

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const annotations: [LintAnnotation] = newEmptyAnnotations();

      // eslint-disable-next-line no-await-in-loop
      exitCode = await exec.exec('prettier', ['--check', '--no-color', file], {
        ignoreReturnCode: true,
        silent: true,
      });

      if (exitCode === 0) {
        result.passed += 1;
      } else {
        result.failed += 1;
        result.output += `${file}\n`;
        annotations.push({
          message: 'Code style issues found',
          properties: <AnnotationProperties>{
            file,
          },
        });
      }

      result.files.push({
        path: file,
        annotations,
        exitCode,
      });
    }

    result.output = result.output.trim();
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(slack: Slack | null = null): Promise<Lint> {
  try {
    const title = 'Prettier';
    core.startGroup(`Run ${title}`);
    const result: Lint = await lint();
    print(result, title);
    if (slack) {
      // eslint-disable-next-line no-param-reassign
      slack.prettierLint = result;
      await updateSlack(result, slack);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

async function setOutput(l: Lint): Promise<void> {
  core.setOutput('prettier-failed', l.failed);
  core.setOutput('prettier-passed', l.passed);
  core.setOutput('prettier-total', l.files.length);
  core.setOutput('prettier-output', l.output);
}

export { getVersion, lint, run, setOutput };
