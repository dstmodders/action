import * as core from '@actions/core';
import * as busted from './busted';
import * as ldoc from './ldoc';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
import { Input, get as inputGet } from './input';
import { Output, set as outputSet } from './output';
import { Slack } from './slack';
import { check as checkVersions } from './versions';

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

async function run() {
  const output: Output = <Output>{};
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
    if (!input.ignoreCheckVersions) {
      output.versions = await checkVersions();
    }

    if (input.slack) {
      await slack.start();
    }

    if (input.busted) {
      output.busted = await busted.run(input, slack);
    }

    if (input.ldoc) {
      output.ldoc = await ldoc.run(input, slack);
    }

    if (input.luacheck) {
      output.luacheck = await luacheck.run(input, slack);
    }

    if (input.prettier) {
      output.prettier = await prettier.run(input, slack);
    }

    if (input.stylua) {
      output.stylua = await stylua.run(input, slack);
    }

    if (input.slack) {
      await slack.stop();
    }

    await outputSet(input, output);
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
