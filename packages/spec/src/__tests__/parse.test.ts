import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AesValidationError,
  parsePlaybookText,
  parsePolicyText,
  parseWorkflowText
} from '../index.js';

test('parses a valid YAML workflow', () => {
  const result = parseWorkflowText(`
kind: Workflow
version: 1
name: default
initial: discovery
states:
  discovery:
    next: [planning]
  planning:
    next: [execution, discovery]
  execution:
    next: [verification, planning]
  verification:
    next: [completed, execution, planning]
  completed:
    next: []
`, 'yaml');
  assert.equal(result.name, 'default');
  assert.equal(result.initial, 'discovery');
});

test('parses a valid JSON policy', () => {
  const result = parsePolicyText(JSON.stringify({
    kind: 'Policy', version: 1, name: 'architecture-escalation',
    when: { architecture: true }, action: { modelClass: 'powerful' }
  }), 'json');
  assert.equal(result.action.modelClass, 'powerful');
});

test('parses a valid YAML playbook', () => {
  const result = parsePlaybookText(`
kind: Playbook
version: 1
name: bugfix
steps:
  - reproduce
  - inspect
  - patch
  - verify
`, 'yaml');
  assert.deepEqual(result.steps, ['reproduce', 'inspect', 'patch', 'verify']);
});

test('throws a structured validation error for invalid model class', () => {
  assert.throws(() => parsePolicyText(JSON.stringify({
    kind: 'Policy', version: 1, name: 'bad-policy',
    when: { architecture: true }, action: { modelClass: 'ultra' }
  }), 'json'), AesValidationError);
});

test('parses inline YAML objects containing multi-item arrays', () => {
  const result = parseWorkflowText(`
kind: Workflow
version: 1
name: inline
initial: discovery
states:
  discovery: { next: [planning] }
  planning: { next: [execution, discovery] }
  execution: { next: [verification, planning] }
  verification: { next: [completed, execution, planning] }
  completed: { next: [] }
`, 'yaml');
  assert.deepEqual(result.states.planning.next, ['execution', 'discovery']);
});
