import { notImplemented } from '@r15k/engine';
import type { Result } from '@r15k/engine';
import type { SaveDocumentV1 } from './save-schema.ts';

/** Validates every field of a parsed save document; the error lists every problem. */
export function validateSave(_value: unknown): Result<SaveDocumentV1, readonly string[]> {
  return notImplemented('arcade.validateSave');
}
