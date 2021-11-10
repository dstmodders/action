import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function getVersion(): Promise<string> {
  let result: string = '';

  try {
    let error: string = '';

    core.debug(`Getting Lua version...`);
    await exec.exec('lua', ['-v'], {
      silent: true,
      listeners: {
        stderr: (data: Buffer) => {
          error += data.toString();
        },
      },
    });

    result = error
      .trim()
      .replace('Lua ', '')
      .replace(/\s*Copyright.*/, '')
      .trim();
    core.debug(result);
  } catch (error) {
    return Promise.reject(error);
  }

  return result;
}

// eslint-disable-next-line import/prefer-default-export
export { getVersion };
