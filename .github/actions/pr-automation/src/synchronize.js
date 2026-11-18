'use strict';

const { getIssue, addLabelsToIssue, graphql } = require('./github');
const { parseIssueReferences } = require('./references');
const { getProject, getProjectItems, addItemToProject } = require('./project');
const { resolveFields, synchronizeFields } = require('./fields');
const { projectOwner, projectNumber, fieldNames } = require('./config');

async function synchronizeLabels(issue, pullRequest, repository, addLabels) {
  const labels = [...new Set((issue.labels || []).map((label) => label.name))];

  if (labels.length === 0) {
    console.log('Labels: source Issue has no labels.');
    return 0;
  }

  await addLabels({
    owner: repository.owner,
    repo: repository.repo,
    number: pullRequest.number,
    labels,
  });

  console.log(`Labels: ${labels.length} label(s) copied to PR.`);
  return labels.length;
}

async function synchronizePullRequest(event, repository, dependencies = {}) {
  const {
    getIssue: fetchIssue = getIssue,
    addLabelsToIssue: applyLabels = addLabelsToIssue,
    graphql: executeGraphql = graphql,
    getProject: fetchProject = getProject,
    getProjectItems: fetchProjectItems = getProjectItems,
    addItemToProject: addProjectItem = addItemToProject,
    resolveFields: resolveProjectFields = resolveFields,
    synchronizeFields: applyFields = synchronizeFields,
  } = dependencies;

  const pullRequest = event.pull_request;

  if (!pullRequest) {
    throw new Error('The workflow did not receive a pull_request payload.');
  }

  const referenceText = [pullRequest.title || '', pullRequest.body || ''].join('\n');

  const references = parseIssueReferences(referenceText, repository);

  if (references.length === 0) {
    console.log(`PR #${pullRequest.number}: no supported Issue reference found. Skipping.`);
    return;
  }

  if (references.length > 1) {
    const list = references.map((ref) => `${ref.owner}/${ref.repo}#${ref.number}`).join(', ');

    throw new Error(
      `PR #${pullRequest.number} references multiple Issues (${list}). ` +
        'This synchronization requires exactly one source Issue.',
    );
  }

  const reference = references[0];

  console.log(
    `PR #${pullRequest.number} is linked to ` +
      `${reference.owner}/${reference.repo}#${reference.number} ` +
      `via ${reference.keyword}.`,
  );

  const issue = await fetchIssue(reference);

  if (issue.pull_request) {
    throw new Error(
      `${reference.owner}/${reference.repo}#${reference.number} ` +
        'is a Pull Request, not an Issue.',
    );
  }

  const project = await fetchProject(projectOwner, projectNumber);

  console.log(`Loaded Project "${project.title}" (#${projectNumber}).`);

  const fields = resolveProjectFields(project.fields.nodes, fieldNames);
  let items = await fetchProjectItems(project.id);

  const issueItem = items.find((item) => item.content?.id === issue.node_id);

  if (!issueItem) {
    throw new Error(
      `Source Issue ${reference.owner}/${reference.repo}#${reference.number} ` +
        `is not in Project #${projectNumber}.`,
    );
  }

  let pullRequestItem = items.find((item) => item.content?.id === pullRequest.node_id);

  if (!pullRequestItem) {
    console.log(`Adding PR #${pullRequest.number} to Project #${projectNumber}.`);

    await addProjectItem(project.id, pullRequest.node_id);

    // Reload the Project items to obtain the actual PR item and field values.
    items = await fetchProjectItems(project.id);

    pullRequestItem = items.find((item) => item.content?.id === pullRequest.node_id);

    if (!pullRequestItem) {
      throw new Error(
        `PR #${pullRequest.number} was added but could not be retrieved from Project #${projectNumber}.`,
      );
    }
  }

  const fieldResult = await applyFields({
    graphql: executeGraphql,
    projectId: project.id,
    issueItem,
    pullRequestItem,
    fields,
  });

  const labelCount = await synchronizeLabels(issue, pullRequest, repository, applyLabels);

  console.log(
    `Synchronization complete for PR #${pullRequest.number}: ` +
      `${fieldResult.updated} fields updated, ` +
      `${fieldResult.cleared} cleared, ` +
      `${fieldResult.unchanged} unchanged, ` +
      `${labelCount} source labels applied.`,
  );
}

module.exports = { synchronizePullRequest };
