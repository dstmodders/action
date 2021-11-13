# github-action

## Overview

This action for [GitHub Actions][] is designed to run different modding tools
for [Don't Starve Together][] and is based on our [docker-dst-mod][]. Its main
purpose is to improve the workflow within our organization.

It supports running [Luacheck][], [Prettier][] and/or [StyLua][] to find code
issues. It supports [Slack][] notification as well.

## Usage

```yml
- uses: dstmodders/github-action@main
  with:
    # Run Luacheck
    # Default: false
    luacheck: true

    # Run Prettier
    # Default: false
    prettier: true

    # Enable Slack notification
    # Default: false
    slack: true

    # Default color for Slack attachment
    # Default: '#dcad04'
    slack-color-default: '#dcad04'

    # Failure color for Slack attachment
    # Default: '#cc1f2d'
    slack-color-failure: '#cc1f2d'

    # Success color for Slack attachment
    # Default: '#24a943'
    slack-color-success: '#24a943'

    # Warning color for Slack attachment
    # Default: '#dcad04'
    slack-color-warning: '#dcad04'

    # Run StyLua
    # Default: false
    stylua: true
  env:
    # Slack channel for sending a notification to
    SLACK_CHANNEL: ${{ secrets.SLACK_CHANNEL }}

    # Slack app signing secret
    SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }}

    # Slack app token
    SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }}
```

## License

Released under the [MIT License](https://opensource.org/licenses/MIT).

[docker-dst-mod]: https://github.com/dstmodders/docker-dst-mod
[don't starve together]: https://www.klei.com/games/dont-starve-together
[github actions]: https://github.com/features/actions
[luacheck]: https://github.com/mpeterv/luacheck
[prettier]: https://prettier.io/
[slack]: https://slack.com/
[stylua]: https://github.com/JohnnyMorganz/StyLua