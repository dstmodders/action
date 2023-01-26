import * as github from '@actions/github';
import { Slack, SlackOptions } from '../index';
import { Input } from '../../input';

const { expect } = require('expect');

describe('slack', () => {
  const ENV = process.env;
  const GITHUB_CONTEXT = { ...github.context };

  let input: Input;
  let options: SlackOptions;

  beforeAll(() => {
    process.env = { ...ENV };
  });

  afterAll(() => {
    process.env = ENV;
  });

  beforeEach(() => {
    input = <Input>{
      busted: false,
      ignoreCheckVersions: false,
      ignoreFailure: false,
      ignoreSetOutput: false,
      ldoc: false,
      luacheck: false,
      prettier: false,
      slack: false,
      slackForceStatus: '',
      slackLuacheckFormat: '',
      slackPrettierFormat: '',
      slackStyLuaFormat: '',
      stylua: false,
    };

    options = <SlackOptions>{
      channel: 'test',
      signingSecret: '',
      token: '',
      input,
    };
  });

  describe('when initialize Slack class', () => {
    beforeAll(() => {
      github.context.actor = 'user';
      github.context.job = 'Test';
      github.context.runId = 1;
      github.context.workflow = 'CI';
      jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
        return {
          owner: 'user',
          repo: 'repository',
        };
      });
    });

    afterAll(() => {
      github.context.actor = GITHUB_CONTEXT.actor;
      github.context.job = GITHUB_CONTEXT.job;
      github.context.runId = GITHUB_CONTEXT.runId;
      github.context.workflow = GITHUB_CONTEXT.workflow;
      jest.restoreAllMocks();
    });

    it('should match the snapshot', async () => {
      expect(new Slack(options)).toMatchSnapshot();
    });
  });
});
