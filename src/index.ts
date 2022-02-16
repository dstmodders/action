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
import { getEnv } from './helpers';
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
    // check versions
    if (!input.ignoreCheckVersions) {
      output.versions = await checkVersions();
    }

    // start Slack
    if (input.slack) {
      await slack.start();
      slack.msg.isInProgress = true;
      await slack.msg.post();
    }

    // run
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

    // stop Slack
    if (input.slack) {
      slack.msg.isInProgress = false;
      await slack.msg.update();
      await slack.stop();
    }

    // output
    await outputSet(input, output);
  } catch (error) {
    if (input.slack) {
      slack.msg.isInProgress = false;
      await slack.msg.update();
      await slack.stop();
    }

    if (error instanceof Error) {
      throw error;
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
