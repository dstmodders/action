import * as github from '@actions/github';
import expect from 'expect';
import helpers from '../helpers';

describe('helpers', () => {
  const ENV = process.env;
  const GITHUB_CONTEXT = { ...github.context };

  beforeAll(() => {
    process.env = { ...ENV };
  });

  afterAll(() => {
    process.env = ENV;
  });

  describe('getEnv()', () => {
    describe("when env doesn't exist", () => {
      describe('and is not required', () => {
        it('should return an empty string', async () => {
          expect(helpers.getEnv('TEST')).toMatch('');
        });
      });

      describe('and is required', () => {
        it('should throw an error', async () => {
          expect(() => helpers.getEnv('TEST', true)).toThrowError(
            'Failed to get a required environment variable TEST',
          );
        });
      });
    });

    describe('when env exists', () => {
      beforeAll(() => {
        process.env = { ...ENV };
        process.env.TEST = 'test';
      });

      it('should return its value', async () => {
        expect(helpers.getEnv('TEST')).toMatch('test');
        expect(helpers.getEnv('TEST', true)).toMatch('');
      });
    });
  });

  describe('getBranchName()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.ref = GITHUB_CONTEXT.ref;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.ref = 'refs/heads/develop';
        });

        it('should return its value', async () => {
          expect(helpers.getBranchName()).toMatch('develop');
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.ref = '';
        });

        it('should return an empty string', async () => {
          expect(helpers.getBranchName()).toMatch('');
        });
      });
    });
  });

  describe('getActor()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.actor = GITHUB_CONTEXT.actor;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.actor = 'user';
        });

        it('should return its value', async () => {
          expect(helpers.getActor()).toMatch('user');
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.actor = '';
        });

        it('should throw an error', async () => {
          expect(() => helpers.getActor()).toThrowError(
            'GitHub actor context is undefined',
          );
        });
      });
    });
  });

  describe('getActorUrl()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.actor = GITHUB_CONTEXT.actor;
        github.context.serverUrl = GITHUB_CONTEXT.serverUrl;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.actor = 'user';
          github.context.serverUrl = 'https://github.com';
        });

        it('should return its value', async () => {
          expect(helpers.getActorUrl()).toMatch('https://github.com/user');
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.actor = '';
          github.context.serverUrl = '';
        });

        it('should throw an error', async () => {
          expect(() => helpers.getActorUrl()).toThrowError(
            'GitHub actor or server URL context is undefined',
          );
        });
      });
    });
  });

  describe('getJob()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.job = GITHUB_CONTEXT.job;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.job = 'test';
        });

        it('should return its value', async () => {
          expect(helpers.getJob()).toMatch('test');
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.job = '';
        });

        it('should throw an error', async () => {
          expect(() => helpers.getJob()).toThrowError(
            'GitHub job context is undefined',
          );
        });
      });
    });
  });

  describe('getRepoUrl()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.serverUrl = GITHUB_CONTEXT.serverUrl;
        jest.restoreAllMocks();
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.serverUrl = 'https://github.com';
          jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
            return {
              owner: 'user',
              repo: 'repository',
            };
          });
        });

        it('should return its value', async () => {
          expect(helpers.getRepoUrl()).toMatch(
            'https://github.com/user/repository',
          );
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.serverUrl = '';
          jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
            return {
              owner: '',
              repo: '',
            };
          });
        });

        it('should throw an error', async () => {
          expect(() => helpers.getRepoUrl()).toThrowError(
            'GitHub repo context is undefined',
          );
        });
      });
    });
  });

  describe('getCommit()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.sha = GITHUB_CONTEXT.sha;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.sha = '0bf2c9eb66d0a76fcd90b93e66074876ebc4405a';
        });

        it('should return its value', async () => {
          expect(helpers.getCommit()).toMatch(
            '0bf2c9eb66d0a76fcd90b93e66074876ebc4405a',
          );
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.sha = '';
        });

        it('should throw an error', async () => {
          expect(() => helpers.getCommit()).toThrowError(
            'GitHub SHA context is undefined',
          );
        });
      });
    });
  });

  describe('getCommitShort()', () => {
    describe('when corresponding GitHub context', () => {
      afterAll(() => {
        github.context.sha = GITHUB_CONTEXT.sha;
      });

      describe('exists', () => {
        beforeAll(() => {
          github.context.sha = '0bf2c9eb66d0a76fcd90b93e66074876ebc4405a';
        });

        it('should return its value', async () => {
          expect(helpers.getCommitShort()).toMatch('0bf2c9e');
        });
      });

      describe("doesn't exist", () => {
        beforeAll(() => {
          github.context.sha = '';
        });

        it('should throw an error', async () => {
          expect(() => helpers.getCommitShort()).toThrowError(
            'GitHub SHA context is undefined',
          );
        });
      });
    });
  });
});
