import * as core from '@actions/core';
import * as github from '@actions/github';
import { App, MrkdwnElement, SharedChannelItem } from '@slack/bolt';
import { Input } from './input';
import { Lint, newEmptyLint } from './lint';
import { Test, newEmptyTest } from './busted';

export interface SlackOptions {
  channel: string;
  input: Input;
  signingSecret: string;
  token: string;
  colors: {
    default: string;
    failure: string;
    success: string;
    warning: string;
  };
}

export class Slack {
  private app: App;

  private channelID: string;

  private isInProgress: boolean;

  private options: SlackOptions;

  private timestamp: string;

  public bustedTest: Test;

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
    this.bustedTest = newEmptyTest();
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

    if (this.options.input.busted) {
      fields.push(Slack.getCheckingField('Busted passes'));
    }

    if (this.options.input.luacheck) {
      fields.push(Slack.getCheckingField('Luacheck issues'));
    }

    if (this.options.input.prettier) {
      if (this.options.input.slackPrettierFormat === 'passes') {
        fields.push(Slack.getCheckingField('Prettier passes'));
      } else {
        fields.push(Slack.getCheckingField('Prettier issues'));
      }
    }

    if (this.options.input.stylua) {
      if (this.options.input.slackStyLuaFormat === 'passes') {
        fields.push(Slack.getCheckingField('StyLua passes'));
      } else {
        fields.push(Slack.getCheckingField('StyLua issues'));
      }
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

  private getLintField(
    format: string,
    result: Lint,
    title: string,
  ): MrkdwnElement {
    if (format === 'failures') {
      if (this.isInProgress) {
        return Slack.getCheckingField(`${title} failures`);
      }
      if (result.files.length === 0) {
        return Slack.getField(`${title} failures`, 'No files');
      }
      return Slack.getField(
        `${title} failures`,
        `${result.failed} / ${result.files.length} files`,
      );
    }

    if (format === 'passes') {
      if (this.isInProgress) {
        return Slack.getCheckingField(`${title} passes`);
      }
      if (result.files.length === 0) {
        return Slack.getField(`${title} passes`, 'No files');
      }
      return Slack.getField(
        `${title} passes`,
        `${result.passed} / ${result.files.length} files`,
      );
    }

    return this.isInProgress
      ? Slack.getCheckingField(`${title} issues`)
      : Slack.getField(`${title} issues`, result.issues.toString());
  }

  private async updateLintOrTest(result: Lint | Test): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Slack app is not running');
    }

    try {
      if (await this.update()) {
        if (result.failed > 0) {
          core.info('');
        }
        core.info('Updated Slack message');
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public async update(): Promise<boolean> {
    if (!this.isRunning) {
      throw new Error('Slack app is not running');
    }

    const isFailed =
      this.bustedTest.failed > 0 ||
      this.luacheckLint.issues > 0 ||
      this.prettierLint.failed > 0 ||
      this.styLuaLint.failed > 0;

    let color: string = this.options.colors.default;
    let fields: MrkdwnElement[] = Slack.getGeneralFields('In progress');

    if (!this.isInProgress && isFailed) {
      if (this.options.input.ignoreFailure) {
        color = this.options.colors.warning;
        fields = Slack.getGeneralFields('Completed');
      } else {
        color = this.options.colors.failure;
        fields = Slack.getGeneralFields('Failed');
      }
    } else if (!this.isInProgress && !isFailed) {
      color = this.options.colors.success;
      fields = Slack.getGeneralFields('Success');
    }

    if (this.options.input.busted) {
      if (this.isInProgress) {
        fields.push(Slack.getCheckingField('Busted passes'));
      } else if (this.bustedTest.total === 0) {
        fields.push(Slack.getField('Busted passes', 'No tests'));
      } else {
        fields.push(
          Slack.getField(
            'Busted passes',
            `${this.bustedTest.passed} / ${this.bustedTest.total} tests`,
          ),
        );
      }
    }

    if (this.options.input.luacheck) {
      fields.push(
        this.getLintField(
          this.options.input.slackLuacheckFormat,
          this.luacheckLint,
          'Luacheck',
        ),
      );
    }

    if (this.options.input.prettier) {
      fields.push(
        this.getLintField(
          this.options.input.slackPrettierFormat,
          this.prettierLint,
          'Prettier',
        ),
      );
    }

    if (this.options.input.stylua) {
      fields.push(
        this.getLintField(
          this.options.input.slackStyLuaFormat,
          this.styLuaLint,
          'StyLua',
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

  public async updateBusted(result: Test): Promise<void> {
    this.bustedTest = result;
    return this.updateLintOrTest(result);
  }

  public async updateLuacheck(result: Lint): Promise<void> {
    this.luacheckLint = result;
    return this.updateLintOrTest(result);
  }

  public async updatePrettier(result: Lint): Promise<void> {
    this.prettierLint = result;
    return this.updateLintOrTest(result);
  }

  public async updateStyLua(result: Lint): Promise<void> {
    this.styLuaLint = result;
    return this.updateLintOrTest(result);
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
