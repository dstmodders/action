import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Slack } from './slack';

interface Test {
  exitCode: number;
  failed: number;
  output: string;
  passed: number;
  time: string;
  total: number;
}

function newEmptyTest(): Test {
  return <Test>{
    exitCode: 0,
    failed: 0,
    output: '',
    passed: 0,
    time: '',
    total: 0,
  };
}

async function getVersion(): Promise<string> {
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

async function getNrOfTests(): Promise<number> {
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

async function test(): Promise<Test> {
  const result: Test = newEmptyTest();

  try {
    const nrOfTests = await getNrOfTests();
    let output: string = '';

    if (nrOfTests === 0) {
      core.info(`No tests found`);
      return result;
    }

    core.info(`Running ${nrOfTests} test${nrOfTests === 1 ? '' : 's'}...`);

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
      const matches: RegExpMatchArray | null = output.match(
        /(\d*) successes.*: (\d+\.\d+|\d+) seconds/i,
      );

      if (matches) {
        const [, successes, seconds] = matches;
        result.passed =
          successes.length > 0 ? Number.parseInt(successes, 10) : 0;
        result.failed = nrOfTests - result.passed;
        result.time = seconds.length > 0 ? seconds : '';
      }
    }

    result.exitCode = exitCode;
    result.output = output.trim();
    result.total = nrOfTests;
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

async function run(slack: Slack | null = null): Promise<Test> {
  try {
    const title = 'Busted';
    core.startGroup(`Run ${title}`);
    const result: Test = await test();

    if (result.total > 0) {
      core.info(`Passed ${result.passed} / ${result.total} tests`);
      if (result.failed > 0) {
        core.info(`Failed ${result.failed} / ${result.total} tests`);
      } else {
        core.info('No failed tests');
      }

      core.info('');
      core.info(result.output);
    }

    if (slack) {
      await slack.updateBusted(result);
    }

    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

export { Test, getNrOfTests, getVersion, newEmptyTest, run, test };
