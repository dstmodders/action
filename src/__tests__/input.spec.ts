import * as input from '../input';
import { Input } from '../input';

const { expect } = require('expect');

describe('input', () => {
  describe('get()', () => {
    describe('when no inputs are set', () => {
      it('should throw an error', async () => {
        expect.assertions(1);
        try {
          await input.get();
        } catch (error) {
          if (error instanceof Error) {
            expect(error.message).toMatch(
              'Input does not meet YAML 1.2 "Core Schema" specification: busted',
            );
          }
        }
      });
    });

    describe('when all inputs are set', () => {
      describe('as default values', () => {
        beforeEach(() => {
          process.env.INPUT_BUSTED = 'false';
          process.env.INPUT_LDOC = 'false';
          process.env.INPUT_LUACHECK = 'false';
          process.env.INPUT_PRETTIER = 'false';
          process.env.INPUT_SLACK = 'false';
          process.env.INPUT_STYLUA = 'false';
          process.env['INPUT_IGNORE-CHECK-VERSIONS'] = 'false';
          process.env['INPUT_IGNORE-FAILURE'] = 'false';
          process.env['INPUT_IGNORE-SET-OUTPUT'] = 'false';
          process.env['INPUT_SLACK-COLOR-DEFAULT'] = '#1f242b';
          process.env['INPUT_SLACK-COLOR-FAILURE'] = '#cc1f2d';
          process.env['INPUT_SLACK-COLOR-SUCCESS'] = '#24a943';
          process.env['INPUT_SLACK-COLOR-WARNING'] = '#dcad04';
          process.env['INPUT_SLACK-FORCE-STATUS'] = '';
          process.env['INPUT_SLACK-LUACHECK-FORMAT'] = 'issues';
          process.env['INPUT_SLACK-PRETTIER-FORMAT'] = 'issues';
          process.env['INPUT_SLACK-STYLUA-FORMAT'] = 'issues';
        });

        it("shouldn't throw an error", async () => {
          expect.assertions(0);
          try {
            await input.get();
          } catch (error) {
            expect(error).not.toBeNull();
          }
        });

        it('should match the snapshot', async () => {
          expect(await input.get()).toMatchSnapshot();
        });

        describe('and slack-color-default is set', () => {
          describe('and valid', () => {
            beforeEach(() => {
              process.env['INPUT_SLACK-COLOR-DEFAULT'] = '#cccccc';
            });

            it("shouldn't throw an error", async () => {
              expect.assertions(0);
              try {
                await input.get();
              } catch (error) {
                expect(error).not.toBeNull();
              }
            });
          });

          describe('and invalid', () => {
            beforeEach(() => {
              process.env['INPUT_SLACK-COLOR-DEFAULT'] = 'test';
            });

            it('should throw an error', async () => {
              expect.assertions(1);
              try {
                await input.get();
              } catch (error) {
                if (error instanceof Error) {
                  expect(error.message).toMatch(
                    'Invalid slack-color-default input value. Should be a valid HEX color',
                  );
                }
              }
            });
          });
        });

        describe('and slack-force-status is set', () => {
          describe('and valid', () => {
            beforeEach(() => {
              process.env['INPUT_SLACK-FORCE-STATUS'] = 'skipped';
            });

            it("shouldn't throw an error", async () => {
              expect.assertions(0);
              try {
                await input.get();
              } catch (error) {
                expect(error).not.toBeNull();
              }
            });
          });

          describe('and invalid', () => {
            beforeEach(() => {
              process.env['INPUT_SLACK-FORCE-STATUS'] = 'test';
            });

            it('should throw an error', async () => {
              expect.assertions(1);
              try {
                await input.get();
              } catch (error) {
                if (error instanceof Error) {
                  expect(error.message).toMatch(
                    'Invalid slack-force-status input value. Should be: success|failure|cancelled|skipped',
                  );
                }
              }
            });
          });
        });

        describe('and slack-luacheck-format is empty', () => {
          beforeEach(() => {
            process.env['INPUT_SLACK-LUACHECK-FORMAT'] = '';
          });

          it("shouldn't throw an error", async () => {
            expect.assertions(0);
            try {
              await input.get();
            } catch (error) {
              expect(error).not.toBeNull();
            }
          });

          it('should have the "issues" value', async () => {
            const result: Input = await input.get();
            expect(result.slackLuacheckFormat).toMatch('issues');
          });
        });

        describe('and slack-luacheck-format is invalid', () => {
          beforeEach(() => {
            process.env['INPUT_SLACK-LUACHECK-FORMAT'] = 'test';
          });

          it('should throw an error', async () => {
            expect.assertions(1);
            try {
              await input.get();
            } catch (error) {
              if (error instanceof Error) {
                expect(error.message).toMatch(
                  'Invalid slack-luacheck-format input value. Should be: issues|passes|failures',
                );
              }
            }
          });
        });
      });
    });
  });
});
