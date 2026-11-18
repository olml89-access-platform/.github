'use strict';

const REFERENCE_PATTERN =
  /\b(?<keyword>close[sd]?|fix(?:es|ed)?|resolve[sd]?|refs?)\s*:?\s+(?:(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+))?#(?<number>\d+)\b/gi;

function parseIssueReferences(text, defaultRepository) {
  const references = new Map();

  for (const match of (text || '').matchAll(REFERENCE_PATTERN)) {
    const owner = match.groups.owner || defaultRepository.owner;
    const repo = match.groups.repo || defaultRepository.repo;
    const number = Number(match.groups.number);
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}#${number}`;

    references.set(key, {
      owner,
      repo,
      number,
      keyword: match.groups.keyword,
    });
  }

  return [...references.values()];
}

module.exports = { parseIssueReferences };
