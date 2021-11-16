import * as core from '@actions/core';
import * as busted from './busted';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
import * as versions from './versions';
import { Input, get as inputGet } from './input';
import { Lint } from './lint';
import { Slack } from './slack';
import { Test } from './busted';

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
  core.info(`LDoc: ${v.ldoc}`);
  core.info(`Lua: ${v.lua}`);
  core.info(`Luacheck: ${v.luacheck}`);
  core.info(`Prettier: ${v.prettier}`);
  core.info(`StyLua: ${v.stylua}`);
  core.endGroup();
  return Promise.resolve(v);
}

async function setOutput(
  v: versions.Versions,
  bustedTest: Test,
  luacheckLint: Lint,
  prettierLint: Lint,
  styLuaLint: Lint,
): Promise<void> {
  core.startGroup('Set output');
  await versions.setOutput(v);
  await busted.setOutput(bustedTest);
  await luacheck.setOutput(luacheckLint);
  await prettier.setOutput(prettierLint);
  await stylua.setOutput(styLuaLint);
  core.endGroup();
}

async function run() {
  let input: Input = <Input>{};
  let slack: Slack | null = null;

  try {
    input = await inputGet();
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
      input,
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

    if (input.slack) {
      await slack.start();
    }

    if (input.busted) {
      await busted.run(input, slack);
    }

    if (input.luacheck) {
      await luacheck.run(input, slack);
    }

    if (input.prettier) {
      await prettier.run(input, slack);
    }

    if (input.stylua) {
      await stylua.run(input, slack);
    }

    if (input.slack) {
      await slack.stop();
    }

    await setOutput(
      v,
      slack.bustedTest,
      slack.luacheckLint,
      slack.prettierLint,
      slack.styLuaLint,
    );
  } catch (error) {
    if (input.slack) {
      await slack.stop();
    }

    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
