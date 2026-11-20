'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPullRequest } = require('../src/github');

test('retrieves a Pull Request using the GitHub REST API', async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GH_TOKEN;

  let request;

  process.env.GH_TOKEN = 'test-token';

  globalThis.fetch = async (url, options) => {
    request = { url, options };

    return {
      ok: true,
      json: async () => ({
        number: 42,
        title: 'Implement PR automation',
      }),
    };
  };

  try {
    const pullRequest = await getPullRequest({
      owner: 'olml89-access-platform',
      repo: '.github',
      number: 42,
    });

    assert.equal(
      request.url,
      'https://api.github.com/repos/olml89-access-platform/.github/pulls/42',
    );

    assert.equal(request.options.method, undefined);
    assert.equal(request.options.headers.Authorization, 'Bearer test-token');
    assert.equal(request.options.headers.Accept, 'application/vnd.github+json');
    assert.equal(request.options.headers['X-GitHub-Api-Version'], '2022-11-28');

    assert.deepEqual(pullRequest, {
      number: 42,
      title: 'Implement PR automation',
    });
  } finally {
    globalThis.fetch = originalFetch;

    if (originalToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = originalToken;
    }
  }
});

test('propagates errors returned by the GitHub Pull Request API', async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GH_TOKEN;

  process.env.GH_TOKEN = 'test-token';

  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({
      message: 'Not Found',
    }),
  });

  try {
    await assert.rejects(
      getPullRequest({
        owner: 'olml89-access-platform',
        repo: '.github',
        number: 999,
      }),
      {
        message: 'GitHub REST API 404: Not Found',
      },
    );
  } finally {
    globalThis.fetch = originalFetch;

    if (originalToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = originalToken;
    }
  }
});
