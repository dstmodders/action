export const constants = {
  ERROR: {
    SLACK_ALREADY_RUNNING: 'Slack app is already running',
    SLACK_CHANNEL_NOT_FOUND: 'Slack channel not found',
    SLACK_INIT_FAILURE: 'Failed to initialize Slack app',
    SLACK_NOT_RUNNING: 'Slack app is not running',
    SLACK_TOKEN_NOT_FOUND:
      'Slack app token or signing secret not found. Did you forget to set SLACK_SIGNING_SECRET and/or SLACK_TOKEN environment variables?',
    UNDEFINED_GITHUB_CONTEXT: 'GitHub %s context is undefined',
  },
} as const;

export default constants;
