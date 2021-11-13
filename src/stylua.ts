import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import glob from 'glob';
import ignore from 'ignore';
import { AnnotationProperties } from '@actions/core';
import { DiffEntry, compare } from './diff';
import { Slack } from './slack';

interface StyLuaLintAnnotation {
  message: string;
  properties: AnnotationProperties;
}

interface StyLuaLintFile {
  annotations: [StyLuaLintAnnotation];
  exitCode: number;
  path: string;
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
    files: [<StyLuaLintFile>{}],
    output: '',
    passed: 0,
  };
  result.files.pop();

  try {
    const files = await getFiles();
    let exitCode: number = 0;

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const annotations: [StyLuaLintAnnotation] = [<StyLuaLintAnnotation>{}];

      // eslint-disable-next-line no-await-in-loop
      exitCode = await exec.exec('stylua', ['--check', file], {
        ignoreReturnCode: true,
        silent: true,
      });

      if (exitCode === 0) {
        result.passed += 1;
      } else {
        const original: string = fs.readFileSync(file, 'utf8');
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
        const diffEntries: DiffEntry[] = await compare(original, changed);

        diffEntries.forEach((entry) => {
          if (entry.line > 0 && entry.newValue.length > 0) {
            annotations.push({
              message: entry.newValue,
              properties: <AnnotationProperties>{
                startLine: entry.line,
                file,
              },
            });
          }
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

async function run(slack: Slack): Promise<StyLuaLint> {
  try {
    core.startGroup('Run StyLua');
    const result: StyLuaLint = await lint();

    if (result.failed > 0) {
      core.info(`Failed: ${result.failed}`);
      core.info(`Passed: ${result.passed}`);

      // eslint-disable-next-line no-restricted-syntax
      for (const file of result.files) {
        if (file.annotations.length > 0) {
          core.info('');
          core.info(file.path);
          // eslint-disable-next-line no-restricted-syntax
          for (const annotation of file.annotations) {
            core.warning(annotation.message, {
              ...annotation.properties,
              title: 'StyLua',
            });
          }
        }
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

async function setOutput(l: StyLuaLint): Promise<void> {
  core.setOutput('stylua-failed', l.failed);
  core.setOutput('stylua-passed', l.passed);
  core.setOutput('stylua-total', l.files.length);
  core.setOutput('stylua-output', l.output);
}

export {
  StyLuaLint,
  StyLuaLintAnnotation,
  StyLuaLintFile,
  getVersion,
  lint,
  run,
  setOutput,
};
