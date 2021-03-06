import * as core from '@actions/core';

export interface Input {
  busted: boolean;
  ignoreCheckVersions: boolean;
  ignoreFailure: boolean;
  ignoreSetOutput: boolean;
  ldoc: boolean;
  luacheck: boolean;
  prettier: boolean;
  slack: boolean;
  slackColorDefault: string;
  slackColorFailure: string;
  slackColorSuccess: string;
  slackColorWarning: string;
  slackForceStatus: string;
  slackLuacheckFormat: string;
  slackPrettierFormat: string;
  slackStyLuaFormat: string;
  stylua: boolean;
}

function getSlackForceStatus(name: string): string {
  const value = core.getInput(name);
  if (value.length === 0) {
    return '';
  }
  if (
    value === 'success' ||
    value === 'failure' ||
    value === 'cancelled' ||
    value === 'skipped'
  ) {
    return value;
  }
  throw new Error(
    `Invalid ${name} input value. Should be: success|failure|cancelled|skipped`,
  );
}

function getSlackFormat(name: string): string {
  const value = core.getInput(name);
  if (value.length === 0) {
    return 'issues';
  }
  if (value === 'failures' || value === 'issues' || value === 'passes') {
    return value;
  }
  throw new Error(
    `Invalid ${name} input value. Should be: issues|passes|failures`,
  );
}

function getSlackColor(name: string): string {
  const value = core.getInput(name);
  if (/^#[0-9A-F]{6}$/i.test(value)) {
    return value;
  }
  throw new Error(`Invalid ${name} input value. Should be a valid HEX color`);
}

export async function get(): Promise<Input> {
  try {
    const input: Input = <Input>{};
    input.busted = core.getBooleanInput('busted');
    input.ignoreCheckVersions = core.getBooleanInput('ignore-check-versions');
    input.ignoreFailure = core.getBooleanInput('ignore-failure');
    input.ignoreSetOutput = core.getBooleanInput('ignore-set-output');
    input.ldoc = core.getBooleanInput('ldoc');
    input.luacheck = core.getBooleanInput('luacheck');
    input.prettier = core.getBooleanInput('prettier');
    input.slack = core.getBooleanInput('slack');
    input.slackColorDefault = getSlackColor('slack-color-default');
    input.slackColorFailure = getSlackColor('slack-color-failure');
    input.slackColorSuccess = getSlackColor('slack-color-success');
    input.slackColorWarning = getSlackColor('slack-color-warning');
    input.slackForceStatus = getSlackForceStatus('slack-force-status');
    input.slackLuacheckFormat = getSlackFormat('slack-luacheck-format');
    input.slackPrettierFormat = getSlackFormat('slack-prettier-format');
    input.slackStyLuaFormat = getSlackFormat('slack-stylua-format');
    input.stylua = core.getBooleanInput('stylua');
    return input;
  } catch (error) {
    return Promise.reject(error);
  }
}
