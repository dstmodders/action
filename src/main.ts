import * as core from '@actions/core';
import * as lua from './lua';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
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
  let luaVersion: string = '';
  let luacheckVersion: string = '';
  let prettierVersion: string = '';

  core.startGroup('Check versions');
  await lua.getVersion().then((version) => {
    luaVersion = version;
    core.info(`Lua: ${luaVersion}`);
  });

  await luacheck.getVersion().then((version) => {
    luacheckVersion = version;
    core.info(`Luacheck: ${luacheckVersion}`);
  });

  await prettier.getVersion().then((version) => {
    prettierVersion = version;
    core.info(`Prettier: ${prettierVersion}`);
  });

  core.setOutput('lua-version', luaVersion);
  core.setOutput('luacheck-version', luacheckVersion);
  core.setOutput('prettier-version', prettierVersion);
  core.endGroup();
}

async function run() {
  let slack: Slack | null = null;
  let inputSlack: boolean = false;
  let inputLuacheck: boolean = false;
  let inputPrettier: boolean = false;

  try {
    inputSlack = core.getBooleanInput('slack');
    inputLuacheck = core.getBooleanInput('luacheck');
    inputPrettier = core.getBooleanInput('prettier');

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

  let issuesLuacheck: number = 0;
  let issuesPrettier: number = 0;

  try {
    await checkVersions();

    if (inputSlack) {
      await slack.start();
    }

    if (inputLuacheck) {
      issuesLuacheck = await luacheck.run();
    }

    if (inputPrettier) {
      issuesPrettier = await prettier.run();
    }

    if (inputSlack) {
      await slack.stop(issuesLuacheck, issuesPrettier);
    }
  } catch (error) {
    if (inputSlack) {
      await slack.stop(issuesLuacheck, issuesPrettier);
    }

    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
