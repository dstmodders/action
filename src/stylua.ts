import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import { AnnotationProperties } from '@actions/core';
import { DiffEntry, compare } from './diff';
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

async function lint(): Promise<Lint> {
  const result: Lint = newEmptyLint();

  try {
    const files = await getFiles('.styluaignore', 'lua');
    let exitCode: number = 0;

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const annotations: [LintAnnotation] = newEmptyAnnotations();

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

async function run(slack: Slack | null = null): Promise<Lint> {
  try {
    const title = 'StyLua';
    core.startGroup(`Run ${title}`);
    const result: Lint = await lint();
    print(result, title);
    if (slack) {
      // eslint-disable-next-line no-param-reassign
      slack.styLuaLint = result;
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
  core.setOutput('stylua-failed', l.failed);
  core.setOutput('stylua-passed', l.passed);
  core.setOutput('stylua-total', l.files.length);
  core.setOutput('stylua-output', l.output);
}

export { getVersion, lint, run, setOutput };
