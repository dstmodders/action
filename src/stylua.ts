import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';

interface StyLuaLintFile {
  path: string;
  exitCode: number;
}

interface StyLuaLint {
  failed: number;
  files: StyLuaLintFile[];
  output: string;
  passed: number;
}

async function getFiles(): Promise<string[]> {
  const ignoreFile: string = '.styluaignore';
  if (fs.existsSync(ignoreFile)) {
    const data: string = fs.readFileSync(ignoreFile, 'utf8');
    const ignored: string[] = data.trim().split(/\r\n|\r|\n/);
    const paths = glob.sync('**/*.lua');
    return Promise.resolve(ignore().add(ignored).filter(paths));
  }
  return Promise.resolve(glob.sync('**/*.lua'));
}

async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let output: string = '';

    core.debug(`Getting StyLua version...`);
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

async function lint(): Promise<StyLuaLint> {
  const result: StyLuaLint = {
    failed: 0,
    files: [],
    output: '',
    passed: 0,
  };

  try {
    const files = await getFiles();
    let exitCode: number = 0;

    core.info(`Checking ${files.length} files...`);

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      exitCode = await exec.exec('stylua', ['--check', file], {
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

async function run(): Promise<StyLuaLint> {
  try {
    core.startGroup('Run StyLua');
    const result: StyLuaLint = await lint();

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

    core.setOutput('stylua-failed', result.failed);
    core.setOutput('stylua-passed', result.passed);
    core.setOutput('stylua-total', result.files.length);
    core.endGroup();
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return Promise.reject(new Error('An unexpected error'));
}

export { StyLuaLint, getVersion, lint, run };
