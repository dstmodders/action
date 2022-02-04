import * as github from '@actions/github';
import { sprintf } from 'sprintf-js';
import constants from './constants';

export const getEnv = (name: string, isRequired: boolean = false): string => {
  const result = process.env[name] || '';
  if (isRequired && result.length === 0) {
    throw new Error(`Failed to get a required environment variable ${name}`);
  }
  return result;
};

export const getBranchName = (): string => {
  const { ref } = github.context;
  return ref.length > 0 && ref.indexOf('refs/heads/') > -1
    ? ref.slice('refs/heads/'.length)
    : '';
};

export const getActor = (): string => {
  const { actor } = github.context;
  if (actor.length === 0) {
    throw new Error(sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'actor'));
  }
  return actor;
};

export const getActorUrl = (): string => {
  const { actor, serverUrl } = github.context;
  if (actor.length === 0 || serverUrl.length === 0) {
    throw new Error(
      sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'actor or server URL'),
    );
  }
  return `${serverUrl}/${actor}`;
};

export const getJob = (): string => {
  const { job } = github.context;
  if (job.length === 0) {
    throw new Error(sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'job'));
  }
  return job;
};

export const getRepoUrl = (): string => {
  const {
    repo: { owner, repo },
    serverUrl,
  } = github.context;
  if (owner.length === 0 || repo.length === 0 || serverUrl.length === 0) {
    throw new Error(sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'repo'));
  }
  return `${serverUrl}/${owner}/${repo}`;
};

export const getCommit = (): string => {
  const { sha } = github.context;
  if (sha.length === 0) {
    throw new Error(sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'SHA'));
  }
  return sha;
};

export const getCommitShort = (): string => {
  return `${getCommit().substring(0, 7)}`;
};

export const getCommitUrl = (): string => {
  return `${getRepoUrl()}/commit/${getCommitShort()}`;
};

export const getPRUrl = (): string => {
  const {
    eventName,
    issue: { number },
  } = github.context;
  return eventName === 'pull_request' && number > 0
    ? `${getRepoUrl()}/pull/${number}`
    : '';
};

export const getWorkflow = (): string => {
  const { workflow } = github.context;
  if (workflow.length === 0) {
    throw new Error(
      sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'workflow'),
    );
  }
  return workflow;
};

export const getWorkflowUrl = (): string => {
  const { runId } = github.context;
  if (Number.isNaN(runId)) {
    throw new Error(
      sprintf(constants.ERROR.UNDEFINED_GITHUB_CONTEXT, 'run ID'),
    );
  }
  return `${getRepoUrl()}/actions/runs/${runId}`;
};

export default {
  getActor,
  getActorUrl,
  getBranchName,
  getCommit,
  getCommitShort,
  getCommitUrl,
  getEnv,
  getJob,
  getPRUrl,
  getRepoUrl,
  getWorkflow,
  getWorkflowUrl,
};
