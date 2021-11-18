# action

[![Codecov](https://img.shields.io/codecov/c/github/dstmodders/action.svg)](https://codecov.io/gh/dstmodders/action)
[![Code Climate](https://img.shields.io/codeclimate/maintainability/dstmodders/action)](https://codeclimate.com/github/dstmodders/action)
![Dependencies](https://img.shields.io/librariesio/github/dstmodders/action)

## Overview

This action for [GitHub Actions][] is designed to run different modding tools
for [Don't Starve Together][] and is based on our [docker-dst-mod][]. Its main
purpose is to improve the workflow within our organization.

It supports running [Busted][], [Luacheck][], [Prettier][] and/or [StyLua][] to
find code issues or run tests. It supports [Slack][] notification as well.

- [Usage](#usage)
- [Outputs](#outputs)
- [Slack notification](#slack-notification)
  - [1. Add your app](#1-add-your-app)
  - [2. Enable notification](#2-enable-notification)
  - [3. Enjoy](#3-enjoy)

## Usage

```yml
- uses: dstmodders/action@main
  with:
    # Run Busted
    # Default: false
    busted: true

    # Run LDoc
    # Default: false
    ldoc: true

    # Run Luacheck
    # Default: false
    luacheck: true

    # Run Prettier
    # Default: false
    prettier: true

    # Run StyLua
    # Default: false
    stylua: true

    # Enable Slack notification
    # Default: false
    slack: true

    # Default color for Slack attachment
    # Default: '#1f242b'
    slack-color-default: '#1f242b'

    # Failure color for Slack attachment
    # Default: '#cc1f2d'
    slack-color-failure: '#cc1f2d'

    # Success color for Slack attachment
    # Default: '#24a943'
    slack-color-success: '#24a943'

    # Warning color for Slack attachment
    # Default: '#dcad04'
    slack-color-warning: '#dcad04'

    # Force Slack status: success|failure|cancelled|skipped
    # Respects:
    #   steps.<step id>.conclusion
    #   steps.<step id>.outcome
    # See: https://docs.github.com/en/actions/learn-github-actions/contexts#steps-context
    # Default: ''
    slack-force-status: ''

    # Slack field format for Luacheck: issues|passes|failures
    # Default: 'issues'
    slack-luacheck-format: 'issues'

    # Slack field format for Prettier: issues|passes|failures
    # Default: 'issues'
    slack-prettier-format: 'issues'

    # Slack field format for StyLua: issues|passes|failures
    # Default: 'issues'
    slack-stylua-format: 'issues'

    # Ignore check versions step (disables versions output)
    # Default: false
    ignore-check-versions: false

    # Ignore failures (action passes even when issues found or tests fail)
    # Default: false
    ignore-failure: false

    # Ignore set output step (disables all action output)
    # Default: false
    ignore-set-output: false
  env:
    # Slack channel for sending a notification to
    SLACK_CHANNEL: ${{ secrets.SLACK_CHANNEL }}

    # Slack app signing secret
    SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }}

    # Slack app token
    SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }}
```

## Outputs

The action supports different outputs that you may use for your purposes.

See [action.yml](action.yml) to learn more.

## Slack notification

The action can send a Slack notification as well.

![Slack notification](slack-notification.png 'Slack notification')

### 1. Add your app

Go to your [Slack API Apps][] and create/change your own bot. It's pretty
straightforward and the only thing that you need to know is setting the minimum
required "Bot Token Scopes" in "OAuth & Permissions":

- `channels:read`
- `chat:write`
- `chat:write.public`

![Bot Token Scopes](slack-bot-token-scopes.png 'Bot Token Scopes')

### 2. Enable notification

Add `slack` input set to `true` with all corresponding env variables:

- `SLACK_CHANNEL`
- `SLACK_SIGNING_SECRET`
- `SLACK_TOKEN`

For example:

```yml
- uses: dstmodders/action@main
  with:
    luacheck: true
    prettier: true
    stylua: true
    slack: true # required
  env:
    SLACK_CHANNEL: ${{ secrets.SLACK_CHANNEL }} # required
    SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }} # required
    SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }} # required
```

```yml
- uses: dstmodders/action@main
  with:
    busted: true
    slack: true # required
  env:
    SLACK_CHANNEL: ${{ secrets.SLACK_CHANNEL }} # required
    SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }} # required
    SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }} # required
```

### 3. Enjoy

![Slack notifications](slack-notifications.png 'Slack notifications')

## License

Released under the [MIT License](https://opensource.org/licenses/MIT).

[action.yml]: action.yml
[busted]: https://olivinelabs.com/busted/
[docker-dst-mod]: https://github.com/dstmodders/docker-dst-mod
[don't starve together]: https://www.klei.com/games/dont-starve-together
[github actions]: https://github.com/features/actions
[luacheck]: https://github.com/mpeterv/luacheck
[prettier]: https://prettier.io/
[slack api apps]: https://api.slack.com/apps/
[slack]: https://slack.com/
[stylua]: https://github.com/JohnnyMorganz/StyLua
