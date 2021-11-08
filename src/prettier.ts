const core = require('@actions/core');
const exec = require('@actions/exec');

interface PrettierLint {
  output: string;
  issues: number;
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
    output: '',
    issues: 0,
  };

  try {
    let issues: number = 0;
    let output: string = '';

    await exec
      .exec('prettier --list-different --no-color "./**/*.{md,xml,yml}"', [], {
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
    core.startGroup('Run Prettier');
    const result: PrettierLint = await lint();

    issues = result.issues;
    if (issues > 0) {
      core.info(
        `Found ${issues} issue${issues === 0 || issues > 1 ? 's' : ''}:\n`,
      );
      core.info(result.output);
    } else {
      core.info('No issues found');
    }

    core.setOutput('prettier-output', result.output);
    core.setOutput('prettier-issues', issues);
    core.endGroup();
  } catch (error) {
    return Promise.reject(error);
  }

  return issues;
}

export { PrettierLint, getVersion, lint, run };
