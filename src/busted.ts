import * as core from '@actions/core';
import * as exec from '@actions/exec';

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

// eslint-disable-next-line import/prefer-default-export
export { getVersion };