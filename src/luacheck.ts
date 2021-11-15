import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AnnotationProperties } from '@actions/core';
import { Slack } from './slack';
import {
  Lint,
  LintAnnotation,
  getFiles,
  newEmptyAnnotations,
  newEmptyLint,
  print,
} from './lint';

export async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let output: string = '';

    core.debug(`Getting Luacheck version...`);
    await exec.exec('luacheck', ['--version'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });

    const lines: string[] = output.trim().split(/\r\n|\r|\n/);
    result = lines[0].replace('Luacheck: ', '');
    core.debug(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function lint(): Promise<Lint> {
  const result: Lint = newEmptyLint();

  try {
    const files = await getFiles('.luacheckignore', 'lua');
    if (files.length === 0) {
      core.info(`No files found`);
      return result;
    }

    core.info(
      `Checking ${files.length} file${files.length === 1 ? '' : 's'}...`,
    );

    let exitCode: number = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const annotations: [LintAnnotation] = newEmptyAnnotations();
      let output: string = '';

      // eslint-disable-next-line no-await-in-loop
      exitCode = await exec.exec('luacheck', ['--formatter=plain', file], {
        ignoreReturnCode: true,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      core.debug(`${file}, exit code ${exitCode}`);

      if (exitCode === 0) {
        result.passed += 1;
      } else {
        result.failed += 1;
        result.output += `${file}\n`;

        const lines: string[] = output.trim().split(/\r\n|\r|\n/);
        let matches: RegExpMatchArray | null = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const line of lines) {
          matches = line.match(/(.*):(\d*):(\d*): (.*)/i);
          if (matches) {
            const [, , startLine, startColumn, message] = matches;
            if (
              file.length > 0 &&
              startLine.length > 0 &&
              startColumn.length > 0 &&
              message.length > 0
            ) {
              result.issues += 1;
              annotations.push({
                properties: <AnnotationProperties>{
                  startLine: Number(startLine),
                  startColumn: Number(startColumn),
                  file,
                },
                message,
              });
            }
          }
        }

        result.files.push({
          path: file,
          annotations,
          exitCode,
        });
      }
    }

    result.output = result.output.trim();
    print(result, 'Luacheck');
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function run(slack: Slack | null = null): Promise<Lint> {
  try {
    core.startGroup('Run Luacheck');
    const result: Lint = await lint();
    if (slack) {
      await slack.updateLuacheck(result);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

export async function setOutput(l: Lint): Promise<void> {
  core.setOutput('luacheck-failed', l.failed);
  core.setOutput('luacheck-issues', l.issues);
  core.setOutput('luacheck-output', l.output);
  core.setOutput('luacheck-passed', l.passed);
  core.setOutput('luacheck-total', l.files.length);
}
