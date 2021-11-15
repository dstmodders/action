import * as core from '@actions/core';

export interface Input {
  busted: boolean;
  ignoreFailure: boolean;
  luacheck: boolean;
  prettier: boolean;
  slack: boolean;
  stylua: boolean;
}

export async function get(): Promise<Input> {
  try {
    const input: Input = <Input>{};
    input.busted = core.getBooleanInput('busted');
    input.ignoreFailure = core.getBooleanInput('ignore-failure');
    input.luacheck = core.getBooleanInput('luacheck');
    input.prettier = core.getBooleanInput('prettier');
    input.slack = core.getBooleanInput('slack');
    input.stylua = core.getBooleanInput('stylua');
    return input;
  } catch (error) {
    return Promise.reject(error);
  }
}
