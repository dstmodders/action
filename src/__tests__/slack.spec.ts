import expect from 'expect';
import { Input } from '../input';
import { Slack, SlackOptions } from '../slack';

describe('slack', () => {
  let input: Input;
  let options: SlackOptions;

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
    it('should match the snapshot', async () => {
      expect(new Slack(options)).toMatchSnapshot();
    });
  });
});
