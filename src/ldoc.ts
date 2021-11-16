import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Input } from './input';
import { Slack } from './slack';

export interface LDoc {
  error: string;
  exitCode: number;
  output: string;
}

export function newEmptyLDoc(): LDoc {
  return <LDoc>{
    exitCode: 0,
    output: '',
  };
}

export async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let error: string = '';

    core.debug(`Getting LDoc version...`);
    await exec.exec('ldoc', [], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stderr: (data: Buffer) => {
          error += data.toString();
        },
      },
    });

    const matches: RegExpMatchArray | null = error.match(
      /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gm,
    );

    if (matches && matches.length > 0) {
      result = matches[0].trim();
    }

    core.debug(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function generate(input: Input): Promise<LDoc> {
  const result: LDoc = newEmptyLDoc();

  try {
    core.info('Generating LDoc documentation...');

    let output: string = '';
    let error: string = '';
    const exitCode: number = await exec.exec('ldoc', ['.'], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stderr: (data: Buffer) => {
          error += data.toString();
        },
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });

    core.debug(`exit code ${exitCode}`);

    result.error = error.trim();
    result.exitCode = exitCode;
    result.output = output.trim();

    if (exitCode === 0) {
      core.info('Generated LDoc documentation');
      if (result.output.length > 0) {
        core.info('');
        core.info(result.output);
      }
    } else {
      const msg = 'Failed to generate LDoc documentation';
      if (input.ignoreFailure) {
        core.warning(msg);
      } else {
        core.setFailed(msg);
      }

      if (result.error.length > 0 || result.output.length > 0) {
        core.info('');
      }

      if (result.output.length > 0) {
        core.info(result.output);
      }

      if (result.error.length > 0) {
        if (input.ignoreFailure) {
          core.warning(result.error);
        } else {
          core.setFailed(result.error);
        }
      }
    }
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

export async function run(
  input: Input,
  slack: Slack | null = null,
): Promise<LDoc> {
  try {
    core.startGroup('Run LDoc');
    const result: LDoc = await generate(input);
    if (slack) {
      await slack.updateLDoc(result);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}
