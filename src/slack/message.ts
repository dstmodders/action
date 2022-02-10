import * as github from '@actions/github';
import { MrkdwnElement } from '@slack/bolt';
import * as helpers from '../helpers';
import { LDoc, newEmptyLDoc } from '../ldoc';
import { Lint, newEmptyLint } from '../lint';
import { Test, newEmptyTest } from '../busted';
import status, { Status } from '../status';
import { Input } from '../input';

export default class Message {
  private input: Input;

  private timestamp: string;

  public bustedTest: Test;

  public isInProgress: boolean;

  public ldoc: LDoc;

  public luacheckLint: Lint;

  public prettierLint: Lint;

  public status: Status;

  public styLuaLint: Lint;

  private static getCheckingField(
    title: string,
    value: string = 'Checking...',
  ): MrkdwnElement {
    return Message.getField(title, value);
  }

  private static getCheckingLintField(
    format: string,
    name: string,
    value: string = 'Checking...',
  ): MrkdwnElement {
    switch (format) {
      case 'failures':
        return Message.getCheckingField(`${name} failures`, value);
      case 'passes':
        return Message.getCheckingField(`${name} passes`, value);
      default:
        return Message.getCheckingField(`${name} issues`, value);
    }
  }

  private static getField(title: string, value: string): MrkdwnElement {
    return {
      type: 'mrkdwn',
      text: `*${title}*\n${value}`,
    };
  }

  private static getRef(): string {
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

  private static getRefField(): MrkdwnElement {
    const {
      eventName,
      issue,
      repo: { owner, repo },
      serverUrl,
    } = github.context;

    const repoUrl: string = `${serverUrl}/${owner}/${repo}`;
    let url: string = '';

    const refField: MrkdwnElement = Message.getField(
      'Commit',
      `<${helpers.getCommitUrl()}|\`${helpers.getCommitShort()}\`>`,
    );

    switch (eventName) {
      case 'pull_request':
        if (issue.number > 0) {
          url = `${repoUrl}/pull/${issue.number}`;
          return Message.getField('Pull Request', `<${url}|#${issue.number}>`);
        }
        return refField;
      case 'push':
        return Message.getField(
          'Commit',
          `<${helpers.getCommitUrl()}|\`${helpers.getCommitShort()} (${helpers.getBranchName()})\`>`,
        );
      default:
        return refField;
    }
  }

  constructor(input: Input) {
    this.bustedTest = newEmptyTest();
    this.input = input;
    this.isInProgress = false;
    this.ldoc = newEmptyLDoc();
    this.luacheckLint = newEmptyLint();
    this.prettierLint = newEmptyLint();
    this.status = status['in-progress'];
    this.styLuaLint = newEmptyLint();
    this.timestamp = '';
  }

  private getGeneralFields(): MrkdwnElement[] {
    return [this.getStatusField(), Message.getRefField()];
  }

  private getStatusField(): MrkdwnElement {
    return Message.getField('Status', this.status.title);
  }

  private getLDocField(): MrkdwnElement {
    if (this.isInProgress) {
      return Message.getCheckingField('LDoc', 'Generating...');
    }
    return this.ldoc.exitCode === 0
      ? Message.getField('LDoc', 'Success')
      : Message.getField('LDoc', 'Failure');
  }

  private getLintField(
    format: string,
    result: Lint,
    title: string,
  ): MrkdwnElement {
    if (this.isInProgress) {
      return Message.getCheckingLintField(format, title);
    }

    if (format === 'failures') {
      if (result.files.length === 0) {
        return Message.getField(`${title} failures`, 'No files');
      }
      return Message.getField(
        `${title} failures`,
        `${result.failed} / ${result.files.length} files`,
      );
    }

    if (format === 'passes') {
      if (result.files.length === 0) {
        return Message.getField(`${title} passes`, 'No files');
      }
      return Message.getField(
        `${title} passes`,
        `${result.passed} / ${result.files.length} files`,
      );
    }

    return Message.getField(`${title} issues`, result.issues.toString());
  }

  public static getText(): string {
    return `GitHub Actions <${helpers.getWorkflowUrl()}|${helpers.getWorkflow()} / ${helpers.getJob()}> job in ${Message.getRef()} by <${helpers.getActorUrl()}|${helpers.getActor()}>`;
  }

  public getFields(): MrkdwnElement[] {
    const fields: MrkdwnElement[] = this.getGeneralFields();

    if (this.input.busted) {
      if (this.isInProgress) {
        fields.push(Message.getCheckingField('Busted passes'));
      } else if (this.bustedTest.total === 0) {
        fields.push(Message.getField('Busted passes', 'No tests'));
      } else {
        fields.push(
          Message.getField(
            'Busted passes',
            `${this.bustedTest.passed} / ${this.bustedTest.total} tests`,
          ),
        );
      }
    }

    if (this.input.ldoc) {
      fields.push(this.getLDocField());
    }

    if (this.input.luacheck) {
      fields.push(
        this.getLintField(
          this.input.slackLuacheckFormat,
          this.luacheckLint,
          'Luacheck',
        ),
      );
    }

    if (this.input.prettier) {
      fields.push(
        this.getLintField(
          this.input.slackPrettierFormat,
          this.prettierLint,
          'Prettier',
        ),
      );
    }

    if (this.input.stylua) {
      fields.push(
        this.getLintField(
          this.input.slackStyLuaFormat,
          this.styLuaLint,
          'StyLua',
        ),
      );
    }

    return fields;
  }

  public updateStatus(): void {
    if (this.input.slackForceStatus.length > 0) {
      if (this.isInProgress) {
        this.status = status['in-progress'];
        return;
      }

      switch (this.input.slackForceStatus) {
        case 'success':
          this.status = status.success;
          return;
        case 'failure':
          this.status = status.failure;
          return;
        case 'cancelled':
          this.status = status.cancelled;
          return;
        case 'skipped':
          this.status = status.skipped;
          return;
        default:
          this.status = status['in-progress'];
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
      this.status = status.failure;
    } else if (!this.isInProgress && !isFailed) {
      this.status = status.success;
    }
  }

  public async updateBusted(result: Test): Promise<void> {
    this.bustedTest = result;
    this.updateStatus();
  }

  public async updateLDoc(result: LDoc): Promise<void> {
    this.ldoc = result;
    this.updateStatus();
  }

  public async updateLuacheck(result: Lint): Promise<void> {
    this.luacheckLint = result;
    this.updateStatus();
  }

  public async updatePrettier(result: Lint): Promise<void> {
    this.prettierLint = result;
    this.updateStatus();
  }

  public async updateStyLua(result: Lint): Promise<void> {
    this.styLuaLint = result;
    this.updateStatus();
  }
}
