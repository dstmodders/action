import * as core from '@actions/core';
import * as github from '@actions/github';
import { App, MrkdwnElement, SharedChannelItem } from '@slack/bolt';
import { LuacheckLint, LuacheckLintAnnotation } from './luacheck';
import { PrettierLint, PrettierLintAnnotation } from './prettier';
import { StyLuaLint } from './stylua';

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

  private options: SlackOptions;

  private timestamp: string;

  private channelID: string;

  public luacheckLint: LuacheckLint;

  public prettierLint: PrettierLint;

  public styLuaLint: StyLuaLint;

  private static getBranchName(): string {
    let branchName = github.context.ref;
    if (branchName.indexOf('refs/heads/') > -1) {
      branchName = branchName.slice('refs/heads/'.length);
    }
    return branchName;
  }

  private static getText(): string {
    const { actor, job, runId, serverUrl, workflow } = github.context;
    const { owner, repo } = github.context.repo;

    const actorUrl: string = `${serverUrl}/${actor}`;
    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    const jobUrl: string = `${repoUrl}/actions/runs/${runId}`;

    const branchName = this.getBranchName();

    const branchUrl = `${repoUrl}/tree/${branchName}`;

    return `GitHub Actions <${jobUrl}|${workflow} / ${job}> job in <${repoUrl}|${owner}/${repo}>@<${branchUrl}|${branchName}> by <${actorUrl}|${actor}>`;
  }

  private static getGeneralFields(status: string): MrkdwnElement[] {
    const { owner } = github.context.repo;
    const { serverUrl } = github.context;
    const { sha } = github.context;

    const { repo } = github.context.repo;
    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;

    const commitUrl: string = `${repoUrl}/commit/${sha}`;

    return [
      {
        type: 'mrkdwn',
        text: `*Status*\n${status}`,
      },
      {
        type: 'mrkdwn',
        text: `*Commit*\n<${commitUrl}|\`${sha.substring(
          0,
          7,
        )} (${this.getBranchName()})\`>`,
      },
    ];
  }

  constructor(options: SlackOptions) {
    this.channelID = '';
    this.options = options;
    this.timestamp = '';

    this.luacheckLint = <LuacheckLint>{
      annotations: [<LuacheckLintAnnotation>{}],
      output: '',
      issues: 0,
    };

    this.prettierLint = <PrettierLint>{
      annotations: [<PrettierLintAnnotation>{}],
      failed: 0,
      files: [],
      output: '',
      passed: 0,
    };

    this.styLuaLint = <StyLuaLint>{
      failed: 0,
      files: [],
      output: '',
      passed: 0,
    };

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

  private async post() {
    const fields: MrkdwnElement[] = Slack.getGeneralFields('In progress');

    if (this.options.run.luacheck) {
      fields.push({
        type: 'mrkdwn',
        text: '*Luacheck issues*\nChecking...',
      });
    }

    if (this.options.run.prettier) {
      fields.push({
        type: 'mrkdwn',
        text: '*Prettier issues*\nChecking...',
      });
    }

    if (this.options.run.stylua) {
      fields.push({
        type: 'mrkdwn',
        text: '*StyLua passes*\nChecking...',
      });
    }

    core.debug('Posting message...');
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

    core.info('Posted message');

    if (typeof result.ts === 'string') {
      core.debug(`Timestamp: ${result.ts}`);
      this.timestamp = result.ts;
    }

    return result;
  }

  private async update() {
    let color = this.options.colors.success;
    let fields = Slack.getGeneralFields('Completed');
    if (
      this.luacheckLint.issues > 0 ||
      this.prettierLint.failed > 0 ||
      this.styLuaLint.failed > 0
    ) {
      color = this.options.colors.failure;
      fields = Slack.getGeneralFields('Failed');
    }

    if (this.options.run.luacheck) {
      fields.push({
        type: 'mrkdwn',
        text: `*Luacheck issues*\n${this.luacheckLint.issues}`,
      });
    }

    if (this.options.run.prettier) {
      fields.push({
        type: 'mrkdwn',
        text: `*Prettier passes*\n${this.prettierLint.passed} / ${this.prettierLint.files.length} files`,
      });
    }

    if (this.options.run.stylua) {
      fields.push({
        type: 'mrkdwn',
        text: `*StyLua passes*\n${this.styLuaLint.passed} / ${this.styLuaLint.files.length} files`,
      });
    }

    core.debug('Updating message...');
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

    core.info('Updated message');

    if (typeof result.ts === 'string') {
      core.debug(`Timestamp: ${result.ts}`);
      this.timestamp = result.ts;
    }

    return result;
  }

  public async start(): Promise<void> {
    core.startGroup('Run Slack app');
    core.debug('Starting Slack app...');
    await this.app.start(3000);
    core.debug('Slack app is running');
    await this.findChannel(this.options.channel);
    if (this.channelID.length > 0) {
      await this.post();
    }
    core.endGroup();
  }

  public async stop(): Promise<void> {
    core.startGroup('Stop Slack app');
    await this.update();
    core.debug('Stopping Slack app...');
    await this.app.stop();
    core.debug('Slack app is stopped');
    core.endGroup();
  }
}

export { Slack, SlackOptions };
