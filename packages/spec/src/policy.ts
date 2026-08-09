import { AesValidationError } from './errors.js';
import { isModelClass, type ModelClass } from './common.js';

export type PolicyFactValue = string | number | boolean;

export interface PolicyAction {
  modelClass?: ModelClass;
  fastMode?: boolean;
  recommendFreshChat?: boolean;
}

export interface PolicyDocument {
  kind: 'Policy';
  version: 1;
  name: string;
  when: Record<string, PolicyFactValue>;
  action: PolicyAction;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validatePolicyDocument(value: unknown): PolicyDocument {
  if (!isRecord(value) || value.kind !== 'Policy' || value.version !== 1) {
    throw new AesValidationError('Invalid Policy kind or version');
  }
  if (typeof value.name !== 'string' || value.name.length === 0) {
    throw new AesValidationError('Policy name must be a non-empty string');
  }
  if (!isRecord(value.when)) {
    throw new AesValidationError('Policy when must be an object');
  }
  const when: Record<string, PolicyFactValue> = {};
  for (const [key, fact] of Object.entries(value.when)) {
    if (!['string', 'number', 'boolean'].includes(typeof fact)) {
      throw new AesValidationError(`Policy fact ${key} must be primitive`);
    }
    when[key] = fact as PolicyFactValue;
  }

  if (!isRecord(value.action)) {
    throw new AesValidationError('Policy action must be an object');
  }
  const action: PolicyAction = {};
  if (value.action.modelClass !== undefined) {
    if (!isModelClass(value.action.modelClass)) {
      throw new AesValidationError('Policy action modelClass is invalid');
    }
    action.modelClass = value.action.modelClass;
  }
  if (value.action.fastMode !== undefined) {
    if (typeof value.action.fastMode !== 'boolean') {
      throw new AesValidationError('Policy action fastMode must be boolean');
    }
    action.fastMode = value.action.fastMode;
  }
  if (value.action.recommendFreshChat !== undefined) {
    if (typeof value.action.recommendFreshChat !== 'boolean') {
      throw new AesValidationError('Policy action recommendFreshChat must be boolean');
    }
    action.recommendFreshChat = value.action.recommendFreshChat;
  }
  if (Object.keys(action).length === 0) {
    throw new AesValidationError('Policy action must contain at least one action');
  }

  return { kind: 'Policy', version: 1, name: value.name, when, action };
}
