export const constants = {
  ERROR: {
    SLACK_ALREADY_RUNNING: 'Slack app is already running',
    SLACK_NOT_RUNNING: 'Slack app is not running',
    UNDEFINED_GITHUB_CONTEXT: 'GitHub %s context is undefined',
  },
} as const;

export default constants;
