'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { synchronizePullRequest } = require('../src/synchronize');

const repository = {
  owner: 'olml89-access-platform',
  repo: 'qr-api',
};

const pullRequest = {
  number: 42,
  node_id: 'pr-node',
  title: 'Initialize Symfony API',
  body: 'Refs #123',
};

const issue = {
  node_id: 'issue-node',
  labels: [{ name: 'bug' }, { name: 'bug' }, { name: 'infrastructure' }],
};

const project = {
  id: 'project-id',
  title: 'Access Platform',
  fields: {
    nodes: [],
  },
};

const issueItem = {
  id: 'issue-item',
  content: { id: 'issue-node' },
};

const pullRequestItem = {
  id: 'pr-item',
  content: { id: 'pr-node' },
};

function createDependencies(overrides = {}) {
  const calls = {
    getIssue: [],
    addLabelsToIssue: [],
    updateIssueMilestone: [],
    getProject: [],
    getProjectItems: [],
    addItemToProject: [],
    resolveFields: [],
    synchronizeFields: [],
  };

  const dependencies = {
    getIssue: async (reference) => {
      calls.getIssue.push(reference);
      return issue;
    },

    addLabelsToIssue: async (args) => {
      calls.addLabelsToIssue.push(args);
      return [];
    },

    updateIssueMilestone: async (args) => {
      calls.updateIssueMilestone.push(args);
      return {};
    },

    graphql: async () => ({}),

    getProject: async (...args) => {
      calls.getProject.push(args);
      return project;
    },

    getProjectItems: async (projectId) => {
      calls.getProjectItems.push(projectId);
      return [issueItem, pullRequestItem];
    },

    addItemToProject: async (...args) => {
      calls.addItemToProject.push(args);
      return pullRequestItem;
    },

    resolveFields: (projectFields, names) => {
      calls.resolveFields.push({ projectFields, names });
      return [{ id: 'status-id', name: 'Status' }];
    },

    synchronizeFields: async (args) => {
      calls.synchronizeFields.push(args);

      return {
        updated: 1,
        cleared: 0,
        unchanged: 2,
      };
    },
  };

  return {
    calls,
    dependencies: {
      ...dependencies,
      ...overrides,
    },
  };
}

test('rejects events without a Pull Request payload', async () => {
  const { dependencies } = createDependencies();

  await assert.rejects(
    synchronizePullRequest({}, repository, dependencies),
    /did not receive a pull_request payload/,
  );
});

test('skips Pull Requests without a supported Issue reference', async () => {
  const { calls, dependencies } = createDependencies();

  await synchronizePullRequest(
    {
      pull_request: {
        ...pullRequest,
        title: 'Initialize Symfony API',
        body: 'No linked Issue.',
      },
    },
    repository,
    dependencies,
  );

  assert.equal(calls.getIssue.length, 0);
  assert.equal(calls.getProject.length, 0);
  assert.equal(calls.synchronizeFields.length, 0);
  assert.equal(calls.addLabelsToIssue.length, 0);
});

test('rejects Pull Requests referencing multiple Issues', async () => {
  const { calls, dependencies } = createDependencies();

  await assert.rejects(
    synchronizePullRequest(
      {
        pull_request: {
          ...pullRequest,
          body: 'Refs #123 and Closes #456',
        },
      },
      repository,
      dependencies,
    ),
    /references multiple Issues/,
  );

  assert.equal(calls.getIssue.length, 0);
  assert.equal(calls.getProject.length, 0);
});

test('rejects references that point to another Pull Request', async () => {
  const { calls, dependencies } = createDependencies({
    getIssue: async () => ({
      ...issue,
      pull_request: {
        url: 'https://api.github.com/repos/example/repo/pulls/123',
      },
    }),
  });

  await assert.rejects(
    synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies),
    /is a Pull Request, not an Issue/,
  );

  assert.equal(calls.getProject.length, 0);
});

test('rejects source Issues that are not in the Project', async () => {
  const { calls, dependencies } = createDependencies({
    getProjectItems: async (projectId) => {
      calls.getProjectItems.push(projectId);
      return [];
    },
  });

  await assert.rejects(
    synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies),
    /is not in Project #1/,
  );

  assert.equal(calls.synchronizeFields.length, 0);
  assert.equal(calls.addLabelsToIssue.length, 0);
});

test('synchronizes fields and adds source labels to an existing Project PR item', async () => {
  const { calls, dependencies } = createDependencies();

  await synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies);

  assert.equal(calls.getIssue.length, 1);
  assert.deepEqual(calls.getIssue[0], {
    owner: repository.owner,
    repo: repository.repo,
    number: 123,
    keyword: 'Refs',
  });

  assert.deepEqual(calls.getProject, [['olml89-access-platform', 1]]);

  assert.equal(calls.getProjectItems.length, 1);
  assert.equal(calls.addItemToProject.length, 0);

  assert.equal(calls.synchronizeFields.length, 1);
  assert.equal(calls.synchronizeFields[0].projectId, 'project-id');
  assert.equal(calls.synchronizeFields[0].issueItem, issueItem);
  assert.equal(calls.synchronizeFields[0].pullRequestItem, pullRequestItem);

  assert.deepEqual(calls.addLabelsToIssue, [
    {
      owner: repository.owner,
      repo: repository.repo,
      number: 42,
      labels: ['bug', 'infrastructure'],
    },
  ]);

  assert.equal(calls.updateIssueMilestone.length, 0);
});

test('copies the source Issue milestone to the Pull Request', async () => {
  const { calls, dependencies } = createDependencies({
    getIssue: async () => ({
      ...issue,
      milestone: {
        number: 7,
      },
    }),
  });

  await synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies);

  assert.deepEqual(calls.updateIssueMilestone, [
    {
      owner: repository.owner,
      repo: repository.repo,
      number: 42,
      milestone: 7,
    },
  ]);
});

test('does not update the Pull Request when its milestone is unchanged', async () => {
  const { calls, dependencies } = createDependencies({
    getIssue: async () => ({
      ...issue,
      milestone: { number: 7 },
    }),
  });

  await synchronizePullRequest(
    {
      pull_request: {
        ...pullRequest,
        milestone: { number: 7 },
      },
    },
    repository,
    dependencies,
  );

  assert.equal(calls.updateIssueMilestone.length, 0);
});

test('removes the Pull Request milestone when the source Issue has none', async () => {
  const { calls, dependencies } = createDependencies();

  await synchronizePullRequest(
    {
      pull_request: {
        ...pullRequest,
        milestone: { number: 9 },
      },
    },
    repository,
    dependencies,
  );

  assert.deepEqual(calls.updateIssueMilestone, [
    {
      owner: repository.owner,
      repo: repository.repo,
      number: 42,
      milestone: null,
    },
  ]);
});

test('adds the Pull Request to the Project using the returned item', async () => {
  const { calls, dependencies } = createDependencies({
    getProjectItems: async (projectId) => {
      calls.getProjectItems.push(projectId);
      return [issueItem];
    },
  });

  await synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies);

  assert.deepEqual(calls.addItemToProject, [['project-id', 'pr-node']]);
  assert.equal(calls.getProjectItems.length, 1);
  assert.equal(calls.synchronizeFields.length, 1);
  assert.equal(calls.synchronizeFields[0].pullRequestItem, pullRequestItem);
});

test('rejects an invalid item returned when adding the Pull Request', async () => {
  const { calls, dependencies } = createDependencies({
    getProjectItems: async (projectId) => {
      calls.getProjectItems.push(projectId);
      return [issueItem];
    },
    addItemToProject: async (...args) => {
      calls.addItemToProject.push(args);
      return null;
    },
  });

  await assert.rejects(
    synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies),
    /mutation did not return the expected Project item/,
  );

  assert.equal(calls.addItemToProject.length, 1);
  assert.equal(calls.getProjectItems.length, 1);
  assert.equal(calls.synchronizeFields.length, 0);
});

test('does not call the labels API when the source Issue has no labels', async () => {
  const { calls, dependencies } = createDependencies({
    getIssue: async () => ({
      ...issue,
      labels: [],
    }),
  });

  await synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies);

  assert.equal(calls.synchronizeFields.length, 1);
  assert.equal(calls.addLabelsToIssue.length, 0);
});

test('propagates errors returned by the labels API', async () => {
  const { dependencies } = createDependencies({
    addLabelsToIssue: async () => {
      throw new Error('GitHub REST API 422: Label does not exist');
    },
  });

  await assert.rejects(
    synchronizePullRequest({ pull_request: pullRequest }, repository, dependencies),
    /GitHub REST API 422: Label does not exist/,
  );
});
