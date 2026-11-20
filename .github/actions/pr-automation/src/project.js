'use strict';

const { graphql } = require('./github');

const PROJECT_QUERY = `
  query ($owner: String!, $number: Int!, $after: String) {
    organization(login: $owner) {
      projectV2(number: $number) {
        id
        title
        fields(first: 100, after: $after) {
          nodes {
            __typename
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
              isIssueField
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const PROJECT_ITEMS_QUERY = `
  query ($projectId: ID!, $after: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $after) {
          nodes {
            id
            content {
              ... on Issue { id }
              ... on PullRequest { id }
            }
            fieldValues(first: 100) {
              nodes {
                __typename

                ... on ProjectV2ItemFieldSingleSelectValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  optionId
                }

                ... on ProjectV2ItemFieldMultiSelectValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  options { id }
                }

                ... on ProjectV2ItemFieldTextValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  text
                }

                ... on ProjectV2ItemFieldNumberValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  number
                }

                ... on ProjectV2ItemFieldDateValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  date
                }

                ... on ProjectV2ItemFieldIterationValue {
                  field { ... on ProjectV2FieldCommon { id } }
                  iterationId
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const ADD_ITEM_MUTATION = `
  mutation ($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {
      projectId: $projectId
      contentId: $contentId
    }) {
      item { id }
    }
  }
`;

async function getProject(owner, number) {
  const fields = [];
  let project = null;
  let after = null;

  do {
    const data = await graphql(PROJECT_QUERY, {
      owner,
      number,
      after,
    });

    const currentProject = data.organization?.projectV2;

    if (!currentProject) {
      throw new Error(`Project #${number} was not found in organization ${owner}.`);
    }

    if (!project) {
      project = {
        id: currentProject.id,
        title: currentProject.title,
      };
    }

    fields.push(...currentProject.fields.nodes);

    after = currentProject.fields.pageInfo.hasNextPage
      ? currentProject.fields.pageInfo.endCursor
      : null;
  } while (after);

  return {
    ...project,
    fields: { nodes: fields },
  };
}

async function getProjectItems(projectId) {
  const items = [];
  let after = null;

  do {
    const data = await graphql(PROJECT_ITEMS_QUERY, {
      projectId,
      after,
    });

    const connection = data.node?.items;

    if (!connection) {
      throw new Error(`Could not read items for Project ID ${projectId}.`);
    }

    items.push(...connection.nodes);

    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);

  return items;
}

async function addItemToProject(projectId, contentId) {
  const data = await graphql(ADD_ITEM_MUTATION, {
    projectId,
    contentId,
  });

  return data.addProjectV2ItemById.item;
}

module.exports = { getProject, getProjectItems, addItemToProject };
