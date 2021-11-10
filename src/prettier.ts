import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';

interface PrettierLintFile {
  path: string;
  exitCode: number;
}

interface PrettierLint {
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
    failed: 0,
    files: [],
    output: '',
    passed: 0,
  };

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
      }

      result.files.push({
        path: file,
        exitCode,
      });
    }
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(): Promise<PrettierLint> {
  try {
    core.startGroup('Run Prettier');
    const result: PrettierLint = await lint();

    if (result.failed > 0) {
      core.info(`Failed: ${result.failed}. Passed: ${result.passed}.\n`);

      result.files.forEach((file) => {
        if (file.exitCode > 0) {
          core.info(file.path);
        }
      });
    } else {
      core.info('No issues found');
    }

    core.setOutput('prettier-failed', result.failed);
    core.setOutput('prettier-passed', result.passed);
    core.setOutput('prettier-total', result.files.length);
    core.endGroup();
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

export { PrettierLint, PrettierLintFile, getVersion, lint, run };
