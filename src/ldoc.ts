import * as core from '@actions/core';
import * as exec from '@actions/exec';

// eslint-disable-next-line import/prefer-default-export
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
