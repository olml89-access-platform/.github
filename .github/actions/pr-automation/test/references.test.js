'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseIssueReferences } = require('../src/references');

const defaultRepository = {
  owner: 'olml89-access-platform',
  repo: 'qr-api',
};

test('detects Refs references', () => {
  assert.deepEqual(parseIssueReferences('Refs #123', defaultRepository), [
    {
      owner: 'olml89-access-platform',
      repo: 'qr-api',
      number: 123,
      keyword: 'Refs',
    },
  ]);
});

test('detects Closes, Fixes and Resolves references', () => {
  for (const keyword of [
    'Close',
    'Closes',
    'Closed',
    'Fix',
    'Fixes',
    'Fixed',
    'Resolve',
    'Resolves',
    'Resolved',
  ]) {
    assert.deepEqual(
      parseIssueReferences(`${keyword} #123`, defaultRepository),
      [
        {
          owner: 'olml89-access-platform',
          repo: 'qr-api',
          number: 123,
          keyword,
        },
      ],
      `Failed for ${keyword}`,
    );
  }
});

test('detects references in another repository', () => {
  assert.deepEqual(parseIssueReferences('Refs other-org/other-repo#456', defaultRepository), [
    {
      owner: 'other-org',
      repo: 'other-repo',
      number: 456,
      keyword: 'Refs',
    },
  ]);
});

test('detects multiple references', () => {
  assert.deepEqual(parseIssueReferences('Refs #123 and Fixes #456', defaultRepository), [
    {
      owner: 'olml89-access-platform',
      repo: 'qr-api',
      number: 123,
      keyword: 'Refs',
    },
    {
      owner: 'olml89-access-platform',
      repo: 'qr-api',
      number: 456,
      keyword: 'Fixes',
    },
  ]);
});

test('removes duplicate references', () => {
  assert.deepEqual(parseIssueReferences('Refs #123 and Closes #123', defaultRepository), [
    {
      owner: 'olml89-access-platform',
      repo: 'qr-api',
      number: 123,
      keyword: 'Closes',
    },
  ]);
});

test('returns an empty array when no reference exists', () => {
  assert.deepEqual(parseIssueReferences('Initialize Symfony API', defaultRepository), []);
});
