import * as core from '@actions/core';
import * as busted from './busted';
import * as ldoc from './ldoc';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
import { Input, get as inputGet } from './input';
import { Output, set as outputSet } from './output';
import { Slack } from './slack';
import { getEnv } from './helpers';
import { check as checkVersions } from './versions';
import constants from './constants';

async function run(input: Input) {
  const output: Output = <Output>{};
  const slack: Slack | null = new Slack({
    channel: getEnv('SLACK_CHANNEL', input.slack),
    signingSecret: getEnv('SLACK_SIGNING_SECRET', input.slack),
    token: getEnv('SLACK_TOKEN', input.slack),
    input,
  });

  if (slack == null) {
    throw new Error(constants.ERROR.SLACK_INIT_FAILURE);
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

inputGet()
  .then((input) => {
    run(input).catch((err) => {
      core.setFailed(err.message);
    });
  })
  .catch((err) => {
    core.setFailed(err.message);
  });
