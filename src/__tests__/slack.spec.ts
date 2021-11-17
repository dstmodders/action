import expect from 'expect';
import { Slack, SlackOptions } from '../slack';
import { Input } from '../input';

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
      colors: {
        default: '#1f242b',
        failure: '#cc1f2d',
        success: '#24a943',
        warning: '#dcad04',
      },
      input,
    };
  });

  describe('when initialize Slack class', () => {
    it('should match the snapshot', async () => {
      expect(new Slack(options)).toMatchSnapshot();
    });
  });
});
