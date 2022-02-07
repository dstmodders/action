import * as core from '@actions/core';
import * as github from '@actions/github';
import { App, MrkdwnElement, SharedChannelItem } from '@slack/bolt';
import * as helpers from '../helpers';
import { Input } from '../input';
import { LDoc, newEmptyLDoc } from '../ldoc';
import { Lint, newEmptyLint } from '../lint';
import { Test, newEmptyTest } from '../busted';
import constants from '../constants';

export interface SlackOptions {
  channel: string;
  input: Input;
  signingSecret: string;
  token: string;
}

export const status = {
  CANCELLED: 'cancelled',
  FAILURE: 'failure',
  IN_PROGRESS: 'in-progress',
  SKIPPED: 'skipped',
  SUCCESS: 'success',
};

export default class Slack {
  private app: App | null;

  private channelID: string;

  private isInProgress: boolean;

  private options: SlackOptions;

  private status: string;

  private timestamp: string;

  public bustedTest: Test;

  public isRunning: boolean;

  public ldoc: LDoc;

  public luacheckLint: Lint;

  public prettierLint: Lint;

  public styLuaLint: Lint;

  private static getRepoText(): string {
    const {
      eventName,
      issue,
      repo: { owner, repo },
      serverUrl,
    } = github.context;

    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    let branchName: string = '';
    let result: string = `<${repoUrl}|${owner}/${repo}>`;
    let url: string = '';

    switch (eventName) {
      case 'pull_request':
        if (issue.number > 0) {
          url = `${repoUrl}/pull/${issue.number}`;
          result = `${result}#<${url}|${issue.number}>`;
        }
        break;
      case 'push':
        branchName = helpers.getBranchName();
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
    const {
      actor,
      repo: { owner, repo },
      runId,
      serverUrl,
      workflow,
    } = github.context;

    const actorUrl: string = `${serverUrl}/${actor}`;
    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    const jobUrl: string = `${repoUrl}/actions/runs/${runId}`;

    return `GitHub Actions <${jobUrl}|${workflow} / ${helpers.getJob()}> job in ${this.getRepoText()} by <${actorUrl}|${actor}>`;
  }

  private static getField(title: string, value: string): MrkdwnElement {
    return {
      type: 'mrkdwn',
      text: `*${title}*\n${value}`,
    };
  }

  private static getCheckingField(
    title: string,
    value: string = 'Checking...',
  ): MrkdwnElement {
    return this.getField(title, value);
  }

  private static getCheckingLintField(
    format: string,
    name: string,
    value: string = 'Checking...',
  ): MrkdwnElement {
    switch (format) {
      case 'failures':
        return Slack.getCheckingField(`${name} failures`, value);
      case 'passes':
        return Slack.getCheckingField(`${name} passes`, value);
      default:
        return Slack.getCheckingField(`${name} issues`, value);
    }
  }

  private static getRefField(): MrkdwnElement {
    const {
      eventName,
      issue,
      repo: { owner, repo },
      serverUrl,
      sha,
    } = github.context;

    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    const commitUrl: string = `${repoUrl}/commit/${sha}`;
    let url: string = '';

    const refField: MrkdwnElement = Slack.getField(
      'Commit',
      `<${commitUrl}|\`${sha.substring(0, 7)}\`>`,
    );

    switch (eventName) {
      case 'pull_request':
        if (issue.number > 0) {
          url = `${repoUrl}/pull/${issue.number}`;
          return Slack.getField('Pull Request', `<${url}|#${issue.number}>`);
        }
        return refField;
      case 'push':
        return Slack.getField(
          'Commit',
          `<${commitUrl}|\`${sha.substring(
            0,
            7,
          )} (${helpers.getBranchName()})\`>`,
        );
      default:
        return refField;
    }
  }

  constructor(options: SlackOptions) {
    this.app = null;
    this.bustedTest = newEmptyTest();
    this.channelID = '';
    this.isInProgress = false;
    this.isRunning = false;
    this.ldoc = newEmptyLDoc();
    this.luacheckLint = newEmptyLint();
    this.options = options;
    this.prettierLint = newEmptyLint();
    this.status = status.IN_PROGRESS;
    this.styLuaLint = newEmptyLint();
    this.timestamp = '';
  }

  private getStatusColor(): string {
    switch (this.status) {
      case status.SUCCESS:
        return this.options.input.slackColorSuccess;
      case status.FAILURE:
        if (this.options.input.ignoreFailure) {
          return this.options.input.slackColorWarning;
        }
        return this.options.input.slackColorFailure;
      default:
        return this.options.input.slackColorDefault;
    }
  }

  private getStatusField(): MrkdwnElement {
    switch (this.status) {
      case status.IN_PROGRESS:
        return Slack.getField('Status', 'In progress');
      case status.SUCCESS:
        return Slack.getField('Status', 'Success');
      case status.FAILURE:
        if (this.options.input.ignoreFailure) {
          return Slack.getField('Status', 'Completed');
        }
        return Slack.getField('Status', 'Failure');
      case status.CANCELLED:
        return Slack.getField('Status', 'Cancelled');
      case status.SKIPPED:
        return Slack.getField('Status', 'Skipped');
      default:
        return Slack.getField('Status', 'Error');
    }
  }

  private getGeneralFields(): MrkdwnElement[] {
    return [this.getStatusField(), Slack.getRefField()];
  }

  private async findChannel(name: string) {
    if (!this.app) {
      return null;
    }

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

  private getLDocField(): MrkdwnElement {
    if (this.isInProgress) {
      return Slack.getCheckingField('LDoc', 'Generating...');
    }
    return this.ldoc.exitCode === 0
      ? Slack.getField('LDoc', 'Success')
      : Slack.getField('LDoc', 'Failure');
  }

  private getLintField(
    format: string,
    result: Lint,
    title: string,
  ): MrkdwnElement {
    if (this.isInProgress) {
      return Slack.getCheckingLintField(format, title);
    }

    if (format === 'failures') {
      if (result.files.length === 0) {
        return Slack.getField(`${title} failures`, 'No files');
      }
      return Slack.getField(
        `${title} failures`,
        `${result.failed} / ${result.files.length} files`,
      );
    }

    if (format === 'passes') {
      if (result.files.length === 0) {
        return Slack.getField(`${title} passes`, 'No files');
      }
      return Slack.getField(
        `${title} passes`,
        `${result.passed} / ${result.files.length} files`,
      );
    }

    return Slack.getField(`${title} issues`, result.issues.toString());
  }

  private updateStatus(): void {
    if (this.options.input.slackForceStatus.length > 0) {
      if (this.isInProgress) {
        this.status = status.IN_PROGRESS;
        return;
      }

      switch (this.options.input.slackForceStatus) {
        case 'success':
          this.status = status.SUCCESS;
          return;
        case 'failure':
          this.status = status.FAILURE;
          return;
        case 'cancelled':
          this.status = status.CANCELLED;
          return;
        case 'skipped':
          this.status = status.SKIPPED;
          return;
        default:
          this.status = status.IN_PROGRESS;
          return;
      }
    }

    const isFailed =
      this.bustedTest.failed > 0 ||
      this.ldoc.exitCode > 0 ||
      this.luacheckLint.issues > 0 ||
      this.prettierLint.failed > 0 ||
      this.styLuaLint.failed > 0;

    if (!this.isInProgress && isFailed) {
      this.status = status.FAILURE;
    } else if (!this.isInProgress && !isFailed) {
      this.status = status.SUCCESS;
    }
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

  private async post(): Promise<boolean> {
    if (!this.app) {
      return Promise.reject(constants.ERROR.SLACK_NOT_RUNNING);
    }

    const fields: MrkdwnElement[] = this.getGeneralFields();

    if (this.options.input.busted) {
      fields.push(Slack.getCheckingField('Busted passes'));
    }

    if (this.options.input.ldoc) {
      fields.push(Slack.getCheckingField('LDoc', 'Generating...'));
    }

    if (this.options.input.luacheck) {
      fields.push(
        Slack.getCheckingLintField(
          this.options.input.slackLuacheckFormat,
          'Luacheck',
        ),
      );
    }

    if (this.options.input.prettier) {
      fields.push(
        Slack.getCheckingLintField(
          this.options.input.slackPrettierFormat,
          'Prettier',
        ),
      );
    }

    if (this.options.input.stylua) {
      fields.push(
        Slack.getCheckingLintField(
          this.options.input.slackStyLuaFormat,
          'StyLua',
        ),
      );
    }

    core.debug('Posting Slack message...');
    const result = await this.app.client.chat.postMessage({
      channel: this.channelID,
      text: Slack.getText(),
      token: this.options.token,
      attachments: [
        {
          color: this.options.input.slackColorDefault,
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
    if (!this.app || !this.isRunning) {
      return Promise.reject(constants.ERROR.SLACK_NOT_RUNNING);
    }

    this.updateStatus();

    const fields: MrkdwnElement[] = this.getGeneralFields();

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

    if (this.options.input.ldoc) {
      fields.push(this.getLDocField());
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
          color: this.getStatusColor(),
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

  public async updateBusted(result: Test): Promise<void> {
    this.bustedTest = result;
    return this.updateLintOrTest(result);
  }

  public async updateLDoc(result: LDoc): Promise<void> {
    this.ldoc = result;

    if (!this.app || !this.isRunning) {
      return Promise.reject(new Error(constants.ERROR.SLACK_NOT_RUNNING));
    }

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
    if (!this.app || !this.isRunning) {
      throw new Error(constants.ERROR.SLACK_NOT_RUNNING);
    }

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
