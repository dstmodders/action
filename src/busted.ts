import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Input } from './input';
import { Slack } from './slack';

export interface Test {
  exitCode: number;
  failed: number;
  output: string;
  passed: number;
  time: string;
  total: number;
}

export function newEmptyTest(): Test {
  return <Test>{
    exitCode: 0,
    failed: 0,
    output: '',
    passed: 0,
    time: '',
    total: 0,
  };
}

export async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let output: string = '';

    core.debug(`Getting Busted version...`);
    await exec.exec('busted', ['--version'], {
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

// This approach doesn't give the real number of tests. You should get them from
// Busted output instead.
export async function getNrOfTests(): Promise<number> {
  try {
    let result: number = 0;
    let output: string = '';

    const exitCode: number = await exec.exec(
      '/bin/bash -c "busted --list . | wc -l"',
      [],
      {
        ignoreReturnCode: true,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      },
    );

    if (exitCode === 0) {
      result = Number.parseInt(output.trim(), 10);
    }

    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function test(input: Input): Promise<Test> {
  const result: Test = newEmptyTest();

  try {
    let nrOfTests = await getNrOfTests();
    let output: string = '';

    if (nrOfTests === 0) {
      core.info(`No tests found`);
      return result;
    }

    core.info(`Running tests...`);

    const exitCode: number = await exec.exec('busted', ['.'], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });

    if (output.length > 0) {
      nrOfTests = output.split('\n')[0].length;

      const matches: RegExpMatchArray | null = output.match(
        /(\d*) successes.*: (\d+\.\d+|\d+) seconds/i,
      );

      if (matches) {
        const [, successes, seconds] = matches;
        result.passed =
          successes.length > 0 ? Number.parseInt(successes, 10) : 0;
        result.failed = nrOfTests - result.passed;
        if (result.failed < 0) {
          result.failed = 0;
        }
        result.time = seconds.length > 0 ? seconds : '';
      }
    }

    result.exitCode = exitCode;
    result.output = output.trim();
    result.total = nrOfTests;

    core.info(
      `Ran ${nrOfTests} test${nrOfTests === 1 ? '' : 's'}: ${
        result.passed
      } passed, ${result.failed} failed`,
    );

    if (result.failed > 0) {
      const msg = `Failed ${result.failed} test${
        result.failed === 1 ? '' : 's'
      }`;
      if (input.ignoreFailure) {
        core.warning(msg);
      } else {
        core.setFailed(msg);
      }
    } else {
      core.info('No failed tests');
    }

    core.info('');
    core.info(result.output);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function run(
  input: Input,
  slack: Slack | null = null,
): Promise<Test> {
  try {
    const title = 'Busted';
    core.startGroup(`Run ${title}`);
    const result: Test = await test(input);
    if (input.slack && slack) {
      await slack.updateBusted(result);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

export async function setOutput(t: Test): Promise<void> {
  core.setOutput('busted-failed', t.failed);
  core.setOutput('busted-output', t.output);
  core.setOutput('busted-passed', t.passed);
  core.setOutput('busted-total', t.total);
}
