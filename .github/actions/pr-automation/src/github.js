'use strict';

const apiUrl = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

async function request(url, options = {}) {
  const token = process.env.GH_TOKEN;

  if (!token) {
    throw new Error('GH_TOKEN is missing. Pass the PR_TOKEN secret to the action.');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || response.statusText;
    const permissions = response.headers?.get('X-Accepted-GitHub-Permissions');

    throw new Error(
      `GitHub REST API ${response.status}: ${message}` +
        (permissions ? ` (Accepted permissions: ${permissions})` : ''),
    );
  }

  return payload;
}

async function graphql(query, variables = {}) {
  const response = await request(`${apiUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (response.errors?.length) {
    const messages = response.errors.map((error) => error.message).join('; ');
    throw new Error(`GitHub GraphQL API error: ${messages}`);
  }

  return response.data;
}

async function getIssue({ owner, repo, number }) {
  return request(
    `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
  );
}

async function getPullRequest({ owner, repo, number }) {
  return request(
    `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
  );
}

async function addLabelsToIssue({ owner, repo, number, labels }) {
  if (!labels.length) {
    return [];
  }

  return request(
    `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/labels`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels }),
    },
  );
}

async function updateIssueMilestone({ owner, repo, number, milestone }) {
  return request(
    `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone }),
    },
  );
}

module.exports = {
  graphql,
  getIssue,
  getPullRequest,
  addLabelsToIssue,
  updateIssueMilestone,
};
