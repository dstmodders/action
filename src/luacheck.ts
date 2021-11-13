import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AnnotationProperties } from '@actions/core';
import { Slack } from './slack';

interface LuacheckLintAnnotation {
  message: string;
  properties: AnnotationProperties;
}

interface LuacheckLint {
  annotations: [LuacheckLintAnnotation];
  output: string;
  issues: number;
}

async function getVersion(): Promise<string> {
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

async function lint(): Promise<LuacheckLint> {
  const result: LuacheckLint = {
    annotations: [<LuacheckLintAnnotation>{}],
    output: '',
    issues: 0,
  };
  result.annotations.pop();

  try {
    let lines: string[] = [];
    let output: string = '';

    await exec
      .exec('luacheck', ['.', '--exclude-files="here/"', '--formatter=plain'], {
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      })
      .then(() => {
        core.debug('Success');
      })
      .catch(() => {
        core.debug('Non-zero exit code');
        lines = output.trim().split(/\r\n|\r|\n/);
      });

    let matches: RegExpMatchArray | null = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const line of lines) {
      matches = line.match(/(.*):(\d*):(\d*): (.*)/i);
      if (matches) {
        const [, file, startLine, startColumn, message] = matches;
        if (
          file.length > 0 &&
          startLine.length > 0 &&
          startColumn.length > 0 &&
          message.length > 0
        )
          result.annotations.push({
            properties: <AnnotationProperties>{
              startLine: Number(startLine),
              startColumn: Number(startColumn),
              file,
            },
            message,
          });
      }
    }

    result.issues = lines.length;
    result.output = output.trim();
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(slack: Slack): Promise<LuacheckLint> {
  try {
    core.startGroup('Run Luacheck');
    const result: LuacheckLint = await lint();

    if (result.issues > 0) {
      core.info(
        `Found ${result.issues} issue${
          result.issues === 0 || result.issues > 1 ? 's' : ''
        }`,
      );
      core.info('');
      core.info(result.output);

      // eslint-disable-next-line no-restricted-syntax
      for (const annotation of result.annotations) {
        core.warning(annotation.message, {
          ...annotation.properties,
          title: 'Luacheck',
        });
      }
    } else {
      core.info('No issues found');
    }

    if (slack.isRunning) {
      if (await slack.update()) {
        if (result.issues > 0) {
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

async function setOutput(l: LuacheckLint): Promise<void> {
  core.setOutput('luacheck-issues', l.issues);
  core.setOutput('luacheck-output', l.output);
}

export {
  LuacheckLint,
  LuacheckLintAnnotation,
  getVersion,
  lint,
  run,
  setOutput,
};
