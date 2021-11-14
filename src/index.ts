import * as core from '@actions/core';
import * as busted from './busted';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
import * as versions from './versions';
import { Lint } from './lint';
import { Slack } from './slack';

async function getEnv(
  name: string,
  isRequired: boolean = false,
): Promise<string> {
  const result = process.env[name] || '';
  if (isRequired && result.length === 0) {
    core.setFailed(`Failed to get a required environment variable ${name}`);
    process.exit(1);
  }
  return result;
}

async function checkVersions(): Promise<versions.Versions> {
  core.startGroup('Check versions');
  const v: versions.Versions = await versions.get();
  core.info(`Busted: ${v.busted}`);
  core.info(`Lua: ${v.lua}`);
  core.info(`Luacheck: ${v.luacheck}`);
  core.info(`Prettier: ${v.prettier}`);
  core.info(`StyLua: ${v.stylua}`);
  core.endGroup();
  return Promise.resolve(v);
}

async function setOutput(
  v: versions.Versions,
  luacheckLint: Lint,
  prettierLint: Lint,
  styLuaLint: Lint,
): Promise<void> {
  core.startGroup('Set output');
  await versions.setOutput(v);
  await luacheck.setOutput(luacheckLint);
  await prettier.setOutput(prettierLint);
  await stylua.setOutput(styLuaLint);
  core.endGroup();
}

async function run() {
  let slack: Slack | null = null;
  let inputBusted: boolean = false;
  let inputLuacheck: boolean = false;
  let inputPrettier: boolean = false;
  let inputSlack: boolean = false;
  let inputStyLua: boolean = false;

  try {
    inputBusted = core.getBooleanInput('busted');
    inputLuacheck = core.getBooleanInput('luacheck');
    inputPrettier = core.getBooleanInput('prettier');
    inputSlack = core.getBooleanInput('slack');
    inputStyLua = core.getBooleanInput('stylua');

    slack = new Slack({
      channel: await getEnv('SLACK_CHANNEL', true),
      signingSecret: await getEnv('SLACK_SIGNING_SECRET', true),
      token: await getEnv('SLACK_TOKEN', true),
      colors: {
        default: core.getInput('slack-color-default'),
        failure: core.getInput('slack-color-failure'),
        success: core.getInput('slack-color-success'),
        warning: core.getInput('slack-color-warning'),
      },
      run: {
        luacheck: inputLuacheck,
        prettier: inputPrettier,
        stylua: inputStyLua,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }

  if (slack == null) {
    core.setFailed('Failed to initialize Slack');
    return;
  }

  try {
    const v: versions.Versions = await checkVersions();

    if (inputSlack) {
      await slack.start();
    }

    if (inputBusted) {
      await busted.run();
    }

    if (inputLuacheck) {
      await luacheck.run(slack);
    }

    if (inputPrettier) {
      await prettier.run(slack);
    }

    if (inputStyLua) {
      await stylua.run(slack);
    }

    if (inputSlack) {
      await slack.stop();
    }

    await setOutput(
      v,
      slack.luacheckLint,
      slack.prettierLint,
      slack.styLuaLint,
    );
  } catch (error) {
    if (inputSlack) {
      await slack.stop();
    }

    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
