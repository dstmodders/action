import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';
import { AnnotationProperties } from '@actions/core';
import {
  Lint,
  LintAnnotation,
  newEmptyAnnotations,
  newEmptyLint,
  printWarningsForFiles,
} from './lint';
import { Slack } from './slack';

async function getFiles(): Promise<string[]> {
  const ignoreFile: string = '.prettierignore';
  if (fs.existsSync(ignoreFile)) {
    const data: string = fs.readFileSync(ignoreFile, 'utf8');
    const ignored: string[] = data.trim().split(/\r\n|\r|\n/);
    const paths = glob.sync('**/*.{md,xml,yml}');
    return Promise.resolve(ignore().add(ignored).filter(paths));
  }
  return Promise.resolve(glob.sync('**/*.{md,xml,yml}'));
}

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
    const files = await getFiles();
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

async function run(slack: Slack): Promise<Lint> {
  try {
    core.startGroup('Run Prettier');
    const result: Lint = await lint();

    if (result.failed > 0) {
      core.info(`Failed: ${result.failed}`);
      core.info(`Passed: ${result.passed}`);
      printWarningsForFiles(result.files, 'Prettier');
    } else {
      core.info('No issues found');
    }

    if (slack.isRunning) {
      if (await slack.update()) {
        if (result.failed > 0) {
          core.info('');
        }
        core.info('Updated Slack message');
      }
    }

    core.endGroup();
    return Promise.resolve(result);
  } catch (error) {
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
