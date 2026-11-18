'use strict';

const fs = require('node:fs');
const { synchronizePullRequest } = require('./synchronize');

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repositoryName = process.env.GITHUB_REPOSITORY;

  if (!eventPath || !repositoryName) {
    throw new Error('GITHUB_EVENT_PATH or GITHUB_REPOSITORY is missing.');
  }

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const [owner, repo] = repositoryName.split('/');

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repositoryName}`);
  }

  await synchronizePullRequest(event, { owner, repo });
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  if (error.stack) console.error(error.stack);
  process.exitCode = 1;
});
