'use strict';

const fs = require('node:fs');
const { getPullRequest } = require('./github');
const { synchronizePullRequest } = require('./synchronize');

async function run({
  env = process.env,
  readEvent = (eventPath) => JSON.parse(fs.readFileSync(eventPath, 'utf8')),
  fetchPullRequest = getPullRequest,
  synchronize = synchronizePullRequest,
} = {}) {
  const eventPath = env.GITHUB_EVENT_PATH;
  const repositoryName = env.GITHUB_REPOSITORY;
  const eventName = env.GITHUB_EVENT_NAME;

  if (!eventPath || !repositoryName) {
    throw new Error('GITHUB_EVENT_PATH or GITHUB_REPOSITORY is missing.');
  }

  const [owner, repo] = repositoryName.split('/');

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repositoryName}`);
  }

  const event = readEvent(eventPath);

  if (eventName === 'workflow_dispatch') {
    const number = Number(event.inputs?.pr_number);

    if (!Number.isSafeInteger(number) || number < 1) {
      throw new Error('A valid positive PR number is required.');
    }

    console.log(`Manually requested synchronization for PR #${number}.`);

    event.pull_request = await fetchPullRequest({
      owner,
      repo,
      number,
    });
  }

  await synchronize(event, { owner, repo });
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`::error::${error.message}`);
    if (error.stack) console.error(error.stack);
    process.exitCode = 1;
  });
}

module.exports = { run };
