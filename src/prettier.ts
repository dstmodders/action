import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {
  Lint,
  LintAnnotation,
  compareToAnnotations,
  getFiles,
  newEmptyAnnotations,
  newEmptyLint,
  print,
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
        let changed: string = '';

        // eslint-disable-next-line no-await-in-loop
        await exec.exec(`prettier ${file}"`, [], {
          ignoreReturnCode: true,
          silent: true,
          listeners: {
            stdout: (data: Buffer) => {
              changed += data.toString();
            },
          },
        });

        result.failed += 1;
        result.output += `${file}\n`;

        // eslint-disable-next-line no-await-in-loop
        result.issues += await compareToAnnotations(annotations, file, changed);
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
      await slack.updatePrettier(result);
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
  core.setOutput('prettier-issues', l.issues);
  core.setOutput('prettier-output', l.output);
  core.setOutput('prettier-passed', l.passed);
  core.setOutput('prettier-total', l.files.length);
}

export { getVersion, lint, run, setOutput };
