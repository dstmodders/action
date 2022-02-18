import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Input } from './input';
import { Message } from './slack';

export interface LDoc {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export function newEmptyLDoc(): LDoc {
  return <LDoc>{
    exitCode: 0,
    stderr: '',
    stdout: '',
  };
}

export async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let stderr: string = '';

    core.debug('Getting LDoc version...');
    await exec.exec('ldoc', [], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    });

    const matches: RegExpMatchArray | null = stderr.match(
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

    let stderr: string = '';
    let stdout: string = '';
    const exitCode: number = await exec.exec('ldoc', ['.'], {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
      },
    });

    core.debug(`exit code ${exitCode}`);

    result.exitCode = exitCode;
    result.stderr = stderr.trim();
    result.stdout = stdout.trim();

    if (exitCode === 0) {
      core.info('Generated LDoc documentation');
      if (result.stdout.length > 0) {
        core.info('');
        core.info(result.stdout);
      }
    } else {
      const msg = 'Failed to generate LDoc documentation';
      if (input.ignoreFailure) {
        core.warning(msg);
      } else {
        core.setFailed(msg);
      }

      if (result.stderr.length > 0 || result.stdout.length > 0) {
        core.info('');
      }

      if (result.stdout.length > 0) {
        core.info(result.stdout);
      }

      if (result.stderr.length > 0) {
        if (input.ignoreFailure) {
          core.warning(result.stderr);
        } else {
          core.setFailed(result.stderr);
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
  msg: Message | null = null,
): Promise<LDoc> {
  try {
    core.startGroup('Run LDoc');
    const result: LDoc = await generate(input);
    if (input.slack && msg) {
      await msg.updateLDoc(result);
    }
    core.endGroup();
    return result;
  } catch (error) {
    core.endGroup();
    return Promise.reject(error);
  }
}

export async function setOutput(ldoc: LDoc): Promise<void> {
  core.setOutput('ldoc-exit-code', ldoc.exitCode);
  core.setOutput('ldoc-stderr', ldoc.stderr);
  core.setOutput('ldoc-stdout', ldoc.stdout);
}
