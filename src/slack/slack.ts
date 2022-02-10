import * as core from '@actions/core';
import { App, SharedChannelItem } from '@slack/bolt';
import { Input } from '../input';
import { LDoc } from '../ldoc';
import { Lint } from '../lint';
import { Test } from '../busted';
import Message from './message';
import constants from '../constants';

export interface SlackOptions {
  channel: string;
  input: Input;
  signingSecret: string;
  token: string;
}

export default class Slack {
  private app: App | null;

  private channelID: string;

  private options: SlackOptions;

  private timestamp: string;

  public isRunning: boolean;

  public msg: Message;

  constructor(options: SlackOptions) {
    this.app = null;
    this.channelID = '';
    this.isRunning = false;
    this.msg = new Message(options.input);
    this.options = options;
    this.timestamp = '';
  }

  private async findChannel(name: string): Promise<Object | null> {
    if (!this.app) {
      return null;
    }

    core.debug(`Finding #${name} channel...`);

    try {
      const result = await this.app.client.conversations.list({
        token: this.options.token,
      });

      if (!result.channels) {
        return result;
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const channel of result.channels as SharedChannelItem[]) {
        if (channel.name === name) {
          this.channelID = channel.id;
          core.debug(`Found channel ID: ${this.channelID}`);
          core.info(`Found #${channel.name} channel`);
          return result;
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }

    throw new Error(constants.ERROR.SLACK_CHANNEL_NOT_FOUND);
  }

  private async updateLintOrTest(result: Lint | Test): Promise<void> {
    try {
      if (await this.update()) {
        if (result.output.length > 0) {
          core.info('');
        }
        core.info('Updated Slack message');
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public async updateBusted(result: Test): Promise<void> {
    await this.msg.updateBusted(result);
    return this.updateLintOrTest(result);
  }

  public async updateLDoc(result: LDoc): Promise<void> {
    await this.msg.updateLDoc(result);
    try {
      if (await this.update()) {
        core.info('');
        core.info('Updated Slack message');
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public async updateLuacheck(result: Lint): Promise<void> {
    await this.msg.updateLuacheck(result);
    return this.updateLintOrTest(result);
  }

  public async updatePrettier(result: Lint): Promise<void> {
    await this.msg.updatePrettier(result);
    return this.updateLintOrTest(result);
  }

  public async updateStyLua(result: Lint): Promise<void> {
    await this.msg.updateStyLua(result);
    return this.updateLintOrTest(result);
  }

  private async post(): Promise<boolean> {
    if (!this.app) {
      return Promise.reject(constants.ERROR.SLACK_NOT_RUNNING);
    }

    this.msg.updateStatus();

    core.debug('Posting Slack message...');
    const result = await this.app.client.chat.postMessage({
      channel: this.channelID,
      text: Message.getText(),
      token: this.options.token,
      attachments: [
        {
          color: this.msg.status.color,
          blocks: [
            {
              type: 'section',
              fields: this.msg.getFields(),
            },
          ],
        },
      ],
    });

    if (typeof result.ts === 'string') {
      core.debug(`Timestamp: ${result.ts}`);
      this.timestamp = result.ts;
    }

    return true;
  }

  public async update(): Promise<boolean> {
    if (!this.app || !this.isRunning) {
      return Promise.reject(constants.ERROR.SLACK_NOT_RUNNING);
    }

    this.msg.updateStatus();

    core.debug('Updating Slack message...');
    const result = await this.app.client.chat.update({
      channel: this.channelID,
      text: Message.getText(),
      token: this.options.token,
      ts: this.timestamp,
      attachments: [
        {
          color: this.msg.status.color,
          blocks: [
            {
              type: 'section',
              fields: this.msg.getFields(),
            },
          ],
        },
      ],
    });

    if (typeof result.ts === 'string') {
      core.debug(`Timestamp: ${result.ts}`);
      this.timestamp = result.ts;
    }

    return true;
  }

  public async start(): Promise<void | Error> {
    if (this.isRunning) {
      throw new Error(constants.ERROR.SLACK_ALREADY_RUNNING);
    }

    if (
      this.options.signingSecret.length === 0 ||
      this.options.token.length === 0
    ) {
      throw new Error(
        'Slack app token or signing secret not found. Did you forget to set SLACK_SIGNING_SECRET and/or SLACK_TOKEN environment variables?',
      );
    }

    core.startGroup('Run Slack app');
    core.debug('Starting Slack app...');

    try {
      this.app = new App({
        signingSecret: this.options.signingSecret,
        token: this.options.token,
      });
      await this.app.start(3000);
      this.msg.isInProgress = true;
      this.isRunning = true;
      core.info('Started Slack app');
      await this.findChannel(this.options.channel);
      if (this.channelID.length > 0) {
        if (await this.post()) {
          core.info('Posted Slack message');
        }
      }
      core.endGroup();
      return Promise.resolve();
    } catch (error) {
      core.endGroup();
      return Promise.reject(error);
    }
  }

  public async stop(): Promise<void | Error> {
    if (!this.app || !this.isRunning) {
      throw new Error(constants.ERROR.SLACK_NOT_RUNNING);
    }

    core.startGroup('Stop Slack app');
    core.debug('Stopping Slack app...');

    try {
      this.msg.isInProgress = false;
      if (await this.update()) {
        core.info('Updated Slack message');
      }
      await this.app.stop();
      this.isRunning = false;
      core.info('Stopped Slack app');
      core.endGroup();
      return Promise.resolve();
    } catch (error) {
      core.endGroup();
      return Promise.reject(error);
    }
  }
}
