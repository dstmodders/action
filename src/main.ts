import * as core from '@actions/core';
import * as lua from './lua';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
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

async function checkVersions(): Promise<void> {
  core.startGroup('Check versions');
  const luaVersion: string = await lua.getVersion();
  const luacheckVersion: string = await luacheck.getVersion();
  const prettierVersion: string = await prettier.getVersion();
  const styluaVersion: string = await stylua.getVersion();

  core.info(`Lua: ${luaVersion}`);
  core.info(`Luacheck: ${luacheckVersion}`);
  core.info(`Prettier: ${prettierVersion}`);
  core.info(`StyLua: ${styluaVersion}`);

  core.setOutput('lua-version', luaVersion);
  core.setOutput('luacheck-version', luacheckVersion);
  core.setOutput('prettier-version', prettierVersion);
  core.setOutput('stylua-version', prettierVersion);
  core.endGroup();
}

async function run() {
  let slack: Slack | null = null;
  let inputLuacheck: boolean = false;
  let inputPrettier: boolean = false;
  let inputSlack: boolean = false;
  let inputStyLua: boolean = false;

  try {
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
    await checkVersions();

    if (inputSlack) {
      await slack.start();
    }

    if (inputLuacheck) {
      slack.luacheckIssues = await luacheck.run();
    }

    if (inputPrettier) {
      slack.prettierIssues = await prettier.run();
    }

    if (inputStyLua) {
      slack.styLuaIssues = await stylua.run();
    }

    if (inputSlack) {
      await slack.stop();
    }
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
