import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Slack } from './slack';
import { Input } from './input';
import {
  Lint,
  LintAnnotation,
  compareToAnnotations,
  getFiles,
  newEmptyAnnotations,
  newEmptyLint,
  printResult,
  setOutput as outputSet,
} from './lint';

export async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let output: string = '';

    core.debug('Getting StyLua version...');
    await exec.exec('stylua', ['--version'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });

    result = output.trim().replace('stylua ', '');
    core.debug(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function lint(input: Input): Promise<Lint> {
  const result: Lint = newEmptyLint();

  try {
    const files = await getFiles('.styluaignore', 'lua');
    if (files.length === 0) {
      core.info('No files found');
      return result;
    }

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    let exitCode: number = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const annotations: [LintAnnotation] = newEmptyAnnotations();

      // eslint-disable-next-line no-await-in-loop
      exitCode = await exec.exec('stylua', ['--check', file], {
        ignoreReturnCode: true,
        silent: true,
      });

      core.debug(`${file}, exit code ${exitCode}`);

      if (exitCode === 0) {
        result.passed += 1;
      } else {
        let changed: string = '';

        // eslint-disable-next-line no-await-in-loop
        await exec.exec(`/bin/bash -c "cat ${file} | stylua -"`, [], {
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
    printResult(input, result, 'StyLua');
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function run(
  input: Input,
  slack: Slack | null = null,
): Promise<Lint> {
  try {
    core.startGroup('Run StyLua');
    const result: Lint = await lint(input);
    if (input.slack && slack) {
      await slack.updateStyLua(result);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

export async function setOutput(l: Lint): Promise<void> {
  await outputSet('stylua', l);
}
