import * as core from '@actions/core';
import { Input, get as inputGet } from './input';
import { Message, Slack } from './slack';
import { Output, set as outputSet } from './output';
import { busted, ldoc, luacheck, prettier, stylua } from './tools';
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

  let msg: Message | null = null;

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
      msg = new Message(slack);
      msg.isInProgress = true;
      await slack.start();
      await msg.post();
    }

    // run
    if (input.busted) {
      output.busted = await busted.run(input, msg);
    }

    if (input.ldoc) {
      output.ldoc = await ldoc.run(input, msg);
    }

    if (input.luacheck) {
      output.luacheck = await luacheck.run(input, msg);
    }

    if (input.prettier) {
      output.prettier = await prettier.run(input, msg);
    }

    if (input.stylua) {
      output.stylua = await stylua.run(input, msg);
    }

    // stop Slack
    if (input.slack) {
      if (msg !== null) {
        msg.isInProgress = false;
        await msg.update();
      }
      await slack.stop();
    }

    // output
    await outputSet(input, output);
  } catch (error) {
    if (input.slack) {
      if (msg !== null) {
        msg.isInProgress = false;
        await msg.update();
      }
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
