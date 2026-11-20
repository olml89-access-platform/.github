'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../src/index');

function createContext({
  eventName = 'workflow_dispatch',
  inputs = { pr_number: '42' },
  pullRequest = undefined,
} = {}) {
  const event = {
    inputs,
    ...(pullRequest ? { pull_request: pullRequest } : {}),
  };

  const calls = {
    fetchPullRequest: [],
    synchronize: [],
  };

  return {
    calls,
    event,
    options: {
      env: {
        GITHUB_EVENT_PATH: '/tmp/event.json',
        GITHUB_REPOSITORY: 'olml89-access-platform/.github',
        GITHUB_EVENT_NAME: eventName,
      },
      readEvent: () => structuredClone(event),
      fetchPullRequest: async (args) => {
        calls.fetchPullRequest.push(args);

        return {
          number: args.number,
          title: 'Implement PR automation',
          body: 'Refs: #1',
          node_id: 'PR_node_id',
        };
      },
      synchronize: async (...args) => {
        calls.synchronize.push(args);
      },
    },
  };
}

test('workflow_dispatch retrieves and synchronizes the requested PR', async () => {
  const context = createContext();

  await run(context.options);

  assert.deepEqual(context.calls.fetchPullRequest, [
    {
      owner: 'olml89-access-platform',
      repo: '.github',
      number: 42,
    },
  ]);

  assert.equal(context.calls.synchronize.length, 1);
  assert.equal(context.calls.synchronize[0][0].pull_request.number, 42);

  assert.deepEqual(context.calls.synchronize[0][1], {
    owner: 'olml89-access-platform',
    repo: '.github',
  });
});

test('workflow_dispatch rejects a missing PR number', async () => {
  const context = createContext({
    inputs: {},
  });

  await assert.rejects(run(context.options), {
    message: 'A valid positive PR number is required.',
  });

  assert.equal(context.calls.fetchPullRequest.length, 0);
  assert.equal(context.calls.synchronize.length, 0);
});

test('workflow_dispatch rejects an invalid PR number', async () => {
  for (const number of ['abc', '0', '-1', '1.5', '']) {
    const context = createContext({
      inputs: { pr_number: number },
    });

    await assert.rejects(run(context.options), {
      message: 'A valid positive PR number is required.',
    });

    assert.equal(context.calls.synchronize.length, 0);
  }
});

test('workflow_dispatch propagates GitHub API errors', async () => {
  const context = createContext();

  context.options.fetchPullRequest = async () => {
    throw new Error('Pull Request not found.');
  };

  await assert.rejects(run(context.options), {
    message: 'Pull Request not found.',
  });

  assert.equal(context.calls.synchronize.length, 0);
});

test('pull_request events do not retrieve the PR through the API', async () => {
  const pullRequest = {
    number: 42,
    title: 'Implement PR automation',
    body: 'Refs: #1',
    node_id: 'PR_node_id',
  };

  const context = createContext({
    eventName: 'pull_request',
    pullRequest,
  });

  await run(context.options);

  assert.equal(context.calls.fetchPullRequest.length, 0);
  assert.equal(context.calls.synchronize.length, 1);
  assert.deepEqual(context.calls.synchronize[0][0].pull_request, pullRequest);
});

test('run rejects missing GitHub environment variables', async () => {
  await assert.rejects(
    run({
      env: {},
    }),
    {
      message: 'GITHUB_EVENT_PATH or GITHUB_REPOSITORY is missing.',
    },
  );
});

test('run rejects an invalid repository name', async () => {
  await assert.rejects(
    run({
      env: {
        GITHUB_EVENT_PATH: '/tmp/event.json',
        GITHUB_REPOSITORY: 'invalid-repository',
        GITHUB_EVENT_NAME: 'workflow_dispatch',
      },
      readEvent: () => ({}),
    }),
    {
      message: 'Invalid GITHUB_REPOSITORY value: invalid-repository',
    },
  );
});
