'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveFields, synchronizeFields } = require('../src/fields');

const projectFields = [
  {
    id: 'status-id',
    name: 'Status',
    __typename: 'ProjectV2SingleSelectField',
    isIssueField: false,
  },
  {
    id: 'service-id',
    name: 'Service',
    __typename: 'ProjectV2SingleSelectField',
    isIssueField: false,
  },
  {
    id: 'milestone-id',
    name: 'Platform Milestone',
    __typename: 'ProjectV2SingleSelectField',
    isIssueField: false,
  },
];

test('resolves configured regular Project fields', () => {
  const fields = resolveFields(projectFields, ['Status', 'Service', 'Platform Milestone']);

  assert.deepEqual(fields, [
    { id: 'status-id', name: 'Status', kind: 'singleSelect' },
    { id: 'service-id', name: 'Service', kind: 'singleSelect' },
    { id: 'milestone-id', name: 'Platform Milestone', kind: 'singleSelect' },
  ]);
});

test('rejects Issue-specific fields', () => {
  assert.throws(
    () =>
      resolveFields(
        [
          {
            id: 'priority-id',
            name: 'Priority',
            __typename: 'ProjectV2Field',
            dataType: 'SINGLE_SELECT',
            isIssueField: true,
          },
        ],
        ['Priority'],
      ),
    /Issue-specific field/,
  );
});

test('rejects missing fields', () => {
  assert.throws(() => resolveFields(projectFields, ['Priority']), /Project field not found/);
});

test('rejects duplicate field names', () => {
  assert.throws(
    () =>
      resolveFields(
        [
          ...projectFields,
          {
            id: 'another-status-id',
            name: 'Status',
            __typename: 'ProjectV2SingleSelectField',
            isIssueField: false,
          },
        ],
        ['Status'],
      ),
    /Multiple Project fields found/,
  );
});

test('copies Issue values to the Pull Request', async () => {
  const calls = [];

  const graphql = async (query, variables) => {
    calls.push({ query, variables });
  };

  const fields = [
    { id: 'status-id', name: 'Status' },
    { id: 'service-id', name: 'Service' },
  ];

  const issueItem = {
    id: 'issue-item',
    fieldValues: {
      nodes: [
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          field: { id: 'status-id' },
          optionId: 'in-progress',
        },
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          field: { id: 'service-id' },
          optionId: 'qr-api',
        },
      ],
    },
  };

  const pullRequestItem = {
    id: 'pr-item',
    fieldValues: {
      nodes: [
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          field: { id: 'status-id' },
          optionId: 'todo',
        },
      ],
    },
  };

  const result = await synchronizeFields({
    graphql,
    projectId: 'project-id',
    issueItem,
    pullRequestItem,
    fields,
  });

  assert.deepEqual(result, {
    updated: 2,
    cleared: 0,
    unchanged: 0,
  });

  assert.equal(calls.length, 2);

  assert.deepEqual(calls[0].variables, {
    projectId: 'project-id',
    itemId: 'pr-item',
    fieldId: 'status-id',
    value: { singleSelectOptionId: 'in-progress' },
  });

  assert.deepEqual(calls[1].variables, {
    projectId: 'project-id',
    itemId: 'pr-item',
    fieldId: 'service-id',
    value: { singleSelectOptionId: 'qr-api' },
  });
});

test('clears Pull Request values when the Issue field is empty', async () => {
  const calls = [];

  const graphql = async (query, variables) => {
    calls.push({ query, variables });
  };

  const issueItem = {
    id: 'issue-item',
    fieldValues: { nodes: [] },
  };

  const pullRequestItem = {
    id: 'pr-item',
    fieldValues: {
      nodes: [
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          field: { id: 'status-id' },
          optionId: 'in-progress',
        },
      ],
    },
  };

  const result = await synchronizeFields({
    graphql,
    projectId: 'project-id',
    issueItem,
    pullRequestItem,
    fields: [{ id: 'status-id', name: 'Status' }],
  });

  assert.deepEqual(result, {
    updated: 0,
    cleared: 1,
    unchanged: 0,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /clearProjectV2ItemFieldValue/);
});

test('does not update values that are already identical', async () => {
  let calls = 0;

  const graphql = async () => {
    calls++;
  };

  const item = {
    id: 'item',
    fieldValues: {
      nodes: [
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          field: { id: 'status-id' },
          optionId: 'in-progress',
        },
      ],
    },
  };

  const result = await synchronizeFields({
    graphql,
    projectId: 'project-id',
    issueItem: item,
    pullRequestItem: {
      ...item,
      id: 'pr-item',
    },
    fields: [{ id: 'status-id', name: 'Status' }],
  });

  assert.deepEqual(result, {
    updated: 0,
    cleared: 0,
    unchanged: 1,
  });

  assert.equal(calls, 0);
});
