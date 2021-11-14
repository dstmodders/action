import * as core from '@actions/core';
import * as github from '@actions/github';
import { App, MrkdwnElement, SharedChannelItem } from '@slack/bolt';
import { Lint, newEmptyLint } from './lint';

interface SlackOptions {
  channel: string;
  signingSecret: string;
  token: string;
  colors: {
    default: string;
    failure: string;
    success: string;
    warning: string;
  };
  run: {
    luacheck: boolean;
    prettier: boolean;
    stylua: boolean;
  };
}

class Slack {
  private app: App;

  private channelID: string;

  private isInProgress: boolean;

  private options: SlackOptions;

  private timestamp: string;

  public isRunning: boolean;

  public luacheckLint: Lint;

  public prettierLint: Lint;

  public styLuaLint: Lint;

  private static getBranchName(): string {
    const { ref } = github.context;
    if (ref.indexOf('refs/heads/') > -1) {
      return ref.slice('refs/heads/'.length);
    }
    return '';
  }

  private static getRepoText(): string {
    const { eventName, issue, serverUrl } = github.context;
    const { owner, repo } = github.context.repo;

    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;

    let branchName: string = '';
    let result: string = '';
    let url: string = '';

    result = `<${repoUrl}|${owner}/${repo}>`;

    switch (eventName) {
      case 'pull_request':
        if (issue.number > 0) {
          url = `${repoUrl}/pull/${issue.number}`;
          result = `${result}#<${url}|${issue.number}>`;
        }
        break;
      case 'push':
        branchName = this.getBranchName();
        if (branchName.length > 0) {
          url = `${repoUrl}/tree/${branchName}`;
          result = `${result}@<${url}|${branchName}>`;
        }
        break;
      default:
        break;
    }

    return result;
  }

  private static getText(): string {
    const { actor, job, runId, serverUrl, workflow } = github.context;
    const { owner, repo } = github.context.repo;

    const actorUrl: string = `${serverUrl}/${actor}`;
    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    const jobUrl: string = `${repoUrl}/actions/runs/${runId}`;

    return `GitHub Actions <${jobUrl}|${workflow} / ${job}> job in ${this.getRepoText()} by <${actorUrl}|${actor}>`;
  }

  private static getField(title: string, value: string): MrkdwnElement {
    return {
      type: 'mrkdwn',
      text: `*${title}*\n${value}`,
    };
  }

  private static getCheckingField(title: string): MrkdwnElement {
    return this.getField(title, 'Checking...');
  }

  private static getGeneralFields(status: string): MrkdwnElement[] {
    const { eventName, issue, serverUrl, sha } = github.context;
    const { owner, repo } = github.context.repo;

    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    const commitUrl: string = `${repoUrl}/commit/${sha}`;
    let url: string = '';

    const statusField: MrkdwnElement = {
      type: 'mrkdwn',
      text: `*Status*\n${status}`,
    };

    let refField: MrkdwnElement = {
      type: 'mrkdwn',
      text: `*Commit*\n<${commitUrl}|\`${sha.substring(0, 7)}\`>`,
    };

    switch (eventName) {
      case 'pull_request':
        if (issue.number > 0) {
          url = `${repoUrl}/pull/${issue.number}`;
          refField = {
            type: 'mrkdwn',
            text: `*Pull Request*\n<${url}|#${issue.number}>`,
          };
        }
        break;
      case 'push':
        refField = {
          type: 'mrkdwn',
          text: `*Commit*\n<${commitUrl}|\`${sha.substring(
            0,
            7,
          )} (${this.getBranchName()})\`>`,
        };
        break;
      default:
        break;
    }

    return [statusField, refField];
  }

  constructor(options: SlackOptions) {
    this.channelID = '';
    this.isInProgress = false;
    this.isRunning = false;
    this.luacheckLint = newEmptyLint();
    this.options = options;
    this.prettierLint = newEmptyLint();
    this.styLuaLint = newEmptyLint();
    this.timestamp = '';

    this.app = new App({
      signingSecret: options.signingSecret,
      token: options.token,
    });
  }

  private async findChannel(name: string) {
    core.debug(`Finding #${name} channel...`);
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
      }
    }

    return result;
  }

  private async post(): Promise<boolean> {
    if (!this.isRunning) {
      throw new Error('Slack app is not running');
    }

    const fields: MrkdwnElement[] = Slack.getGeneralFields('In progress');

    if (this.options.run.luacheck) {
      fields.push(Slack.getCheckingField('Luacheck issues'));
    }

    if (this.options.run.prettier) {
      fields.push(Slack.getCheckingField('Prettier passes'));
    }

    if (this.options.run.stylua) {
      fields.push(Slack.getCheckingField('StyLua passes'));
    }

    core.debug('Posting Slack message...');
    const result = await this.app.client.chat.postMessage({
      channel: this.channelID,
      text: Slack.getText(),
      token: this.options.token,
      attachments: [
        {
          color: this.options.colors.default,
          blocks: [
            {
              type: 'section',
              fields,
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
    if (!this.isRunning) {
      throw new Error('Slack app is not running');
    }

    let color = this.options.colors.default;
    let fields = Slack.getGeneralFields('In progress');

    if (
      !this.isInProgress &&
      (this.luacheckLint.issues > 0 ||
        this.prettierLint.failed > 0 ||
        this.styLuaLint.failed > 0)
    ) {
      color = this.options.colors.failure;
      fields = Slack.getGeneralFields('Failed');
    } else if (!this.isInProgress) {
      color = this.options.colors.success;
      fields = Slack.getGeneralFields('Success');
    }

    if (this.options.run.luacheck) {
      fields.push(
        this.isInProgress
          ? Slack.getCheckingField('Luacheck issues')
          : Slack.getField(
              'Luacheck issues',
              this.luacheckLint.issues.toString(),
            ),
      );
    }

    if (this.options.run.prettier) {
      fields.push(
        this.isInProgress
          ? Slack.getCheckingField('Prettier passes')
          : Slack.getField(
              'Prettier passes',
              `${this.prettierLint.passed} / ${this.prettierLint.files.length} files`,
            ),
      );
    }

    if (this.options.run.stylua) {
      fields.push(
        this.isInProgress
          ? Slack.getCheckingField('StyLua passes')
          : Slack.getField(
              'StyLua passes',
              `${this.styLuaLint.passed} / ${this.styLuaLint.files.length} files`,
            ),
      );
    }

    core.debug('Updating Slack message...');
    const result = await this.app.client.chat.update({
      channel: this.channelID,
      text: Slack.getText(),
      token: this.options.token,
      ts: this.timestamp,
      attachments: [
        {
          blocks: [
            {
              type: 'section',
              fields,
            },
          ],
          color,
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
    core.startGroup('Run Slack app');
    core.debug('Starting Slack app...');
    try {
      await this.app.start(3000);
      this.isInProgress = true;
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
    core.startGroup('Stop Slack app');
    core.debug('Stopping Slack app...');
    try {
      this.isInProgress = false;
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

export { Slack, SlackOptions };
