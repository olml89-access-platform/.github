'use strict';

const UPDATE_FIELD_MUTATION = `
  mutation ($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: $value
    }) {
      projectV2Item { id }
    }
  }
`;

const CLEAR_FIELD_MUTATION = `
  mutation ($projectId: ID!, $itemId: ID!, $fieldId: ID!) {
    clearProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
    }) {
      projectV2Item { id }
    }
  }
`;

function resolveFields(projectFields, requiredNames) {
  return requiredNames.map((name) => {
    const matches = projectFields.filter((field) => field.name === name);

    if (matches.length === 0) {
      throw new Error(`Project field not found: "${name}".`);
    }

    if (matches.length > 1) {
      throw new Error(
        `Multiple Project fields found with the name "${name}". ` + 'Field names must be unique.',
      );
    }

    const field = matches[0];

    if (field.isIssueField) {
      throw new Error(
        `Field "${name}" is an Issue-specific field and cannot be copied to a Pull Request. ` +
          'Use a regular custom Project field instead.',
      );
    }

    let kind;

    switch (field.__typename) {
      case 'ProjectV2SingleSelectField':
        kind = 'singleSelect';
        break;
      case 'ProjectV2MultiSelectField':
        kind = 'multiSelect';
        break;
      case 'ProjectV2IterationField':
        kind = 'iteration';
        break;
      case 'ProjectV2Field':
        kind = { TEXT: 'text', NUMBER: 'number', DATE: 'date' }[field.dataType];
        break;
      default:
        kind = null;
    }

    if (!kind) {
      throw new Error(
        `Unsupported type for Project field "${name}": ${field.__typename} (${field.dataType}).`,
      );
    }

    return { id: field.id, name, kind };
  });
}

function readItemValues(item) {
  const values = new Map();

  for (const value of item.fieldValues?.nodes || []) {
    const fieldId = value.field?.id;
    if (!fieldId) continue;

    let input;

    switch (value.__typename) {
      case 'ProjectV2ItemFieldSingleSelectValue':
        input = value.optionId ? { singleSelectOptionId: value.optionId } : null;
        break;
      case 'ProjectV2ItemFieldMultiSelectValue': {
        const ids = (value.options || []).map((option) => option.id).sort();
        input = ids.length ? { multiSelectOptionIds: ids } : null;
        break;
      }
      case 'ProjectV2ItemFieldTextValue':
        input = value.text === null ? null : { text: value.text };
        break;
      case 'ProjectV2ItemFieldNumberValue':
        input = value.number === null ? null : { number: value.number };
        break;
      case 'ProjectV2ItemFieldDateValue':
        input = value.date ? { date: value.date } : null;
        break;
      case 'ProjectV2ItemFieldIterationValue':
        input = value.iterationId ? { iterationId: value.iterationId } : null;
        break;
      default:
        continue;
    }

    if (input !== null) values.set(fieldId, input);
  }

  return values;
}

function normalize(value) {
  if (value?.multiSelectOptionIds) {
    return { multiSelectOptionIds: [...value.multiSelectOptionIds].sort() };
  }

  return value;
}

function areEqual(left, right) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

async function synchronizeFields({ graphql, projectId, issueItem, pullRequestItem, fields }) {
  const sourceValues = readItemValues(issueItem);
  const targetValues = readItemValues(pullRequestItem);

  const result = { updated: 0, cleared: 0, unchanged: 0 };

  for (const field of fields) {
    const source = sourceValues.get(field.id) ?? null;
    const target = targetValues.get(field.id) ?? null;

    if (source === null) {
      if (target === null) {
        result.unchanged++;
        console.log(`${field.name}: already empty.`);
        continue;
      }

      await graphql(CLEAR_FIELD_MUTATION, {
        projectId,
        itemId: pullRequestItem.id,
        fieldId: field.id,
      });

      result.cleared++;
      console.log(`${field.name}: cleared on PR.`);
      continue;
    }

    if (areEqual(source, target)) {
      result.unchanged++;
      console.log(`${field.name}: unchanged.`);
      continue;
    }

    await graphql(UPDATE_FIELD_MUTATION, {
      projectId,
      itemId: pullRequestItem.id,
      fieldId: field.id,
      value: source,
    });

    result.updated++;
    console.log(`${field.name}: copied to PR.`);
  }

  return result;
}

module.exports = { resolveFields, synchronizeFields };
