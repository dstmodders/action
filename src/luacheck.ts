import * as core from '@actions/core';
import * as exec from '@actions/exec';

interface LuacheckLint {
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
    output: '',
    issues: 0,
  };

  try {
    let issues: number = 0;
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
        issues = output.trim().split(/\r\n|\r|\n/).length;
      });

    result.output = output.trim();
    result.issues = issues;
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(): Promise<number> {
  let issues: number = 0;

  try {
    core.startGroup('Run Luacheck');
    const result: LuacheckLint = await lint();

    issues = result.issues;
    if (issues > 0) {
      core.info(
        `Found ${issues} issue${issues === 0 || issues > 1 ? 's' : ''}:\n`,
      );
      core.info(result.output);
    } else {
      core.info('No issues found');
    }

    core.setOutput('luacheck-output', result.output);
    core.setOutput('luacheck-issues', issues);
    core.endGroup();
  } catch (error) {
    return Promise.reject(error);
  }

  return issues;
}

export { LuacheckLint, getVersion, lint, run };
