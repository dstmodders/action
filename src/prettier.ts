import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AnnotationProperties } from '@actions/core';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';
import { Slack } from './slack';

interface PrettierLintAnnotation {
  message: string;
  properties: AnnotationProperties;
}

interface PrettierLintFile {
  path: string;
  exitCode: number;
}

interface PrettierLint {
  annotations: [PrettierLintAnnotation];
  failed: number;
  files: PrettierLintFile[];
  output: string;
  passed: number;
}

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

async function lint(): Promise<PrettierLint> {
  const result: PrettierLint = {
    annotations: [<PrettierLintAnnotation>{}],
    failed: 0,
    files: [],
    output: '',
    passed: 0,
  };
  result.annotations.pop();

  try {
    const files = await getFiles();
    let exitCode: number = 0;

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
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
        result.annotations.push({
          message: 'Code style issues found',
          properties: <AnnotationProperties>{
            file,
          },
        });
      }

      result.files.push({
        path: file,
        exitCode,
      });
    }

    result.output = result.output.trim();
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(slack: Slack): Promise<PrettierLint> {
  try {
    core.startGroup('Run Prettier');
    const result: PrettierLint = await lint();

    if (result.failed > 0) {
      core.info(`Failed: ${result.failed}`);
      core.info(`Passed: ${result.passed}`);
      core.info('');
      core.info(result.output);

      // eslint-disable-next-line no-restricted-syntax
      for (const annotation of result.annotations) {
        core.warning(annotation.message, {
          ...annotation.properties,
          title: 'Prettier',
        });
      }
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

async function setOutput(l: PrettierLint): Promise<void> {
  core.setOutput('prettier-failed', l.failed);
  core.setOutput('prettier-passed', l.passed);
  core.setOutput('prettier-total', l.files.length);
  core.setOutput('prettier-output', l.output);
}

export {
  PrettierLint,
  PrettierLintAnnotation,
  PrettierLintFile,
  getVersion,
  lint,
  run,
  setOutput,
};
