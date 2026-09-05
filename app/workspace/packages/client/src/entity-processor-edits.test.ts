import { mergeEdits, mergeGlobalEdits } from './entity-processor';
import { AllEdits, ElEditType } from './types';

jest.mock('./utils', () => ({}));

it('retains resets in a pending screen journal until they remove acknowledged edits', () => {
  const saved: AllEdits<ElEditType> = { title: { [ElEditType.Text]: [1, 'Original', 'Saved', 'title'] } };
  const original = JSON.stringify(saved);
  const pending = mergeEdits(
    { title: { [ElEditType.Text]: [2, 'Original', 'Pending', 'title'] } },
    { title: { [ElEditType.Text]: [3, 'Original', null, 'title'] } },
    true
  );
  expect(pending.title[ElEditType.Text]![2]).toBeNull();
  expect(mergeEdits(saved, pending)).toEqual({});
  expect(JSON.stringify(saved)).toBe(original);
  expect(pending.title[ElEditType.Text]![2]).toBeNull();
});

it('keeps global resets and never mutates the acknowledged file or incoming changes', () => {
  const saved = { title: { [ElEditType.Text]: { type: ElEditType.Text as const,
    timeInSec: 1,
    oldValue: 'Original',
    newValue: 'Saved',
    fid: 'title',
    srnId: 1 } } };
  const reset = { title: { [ElEditType.Text]: { ...saved.title[ElEditType.Text], newValue: null } } };
  const before = JSON.stringify({ saved, reset });
  const pending = mergeGlobalEdits(saved, reset, true);
  expect(mergeGlobalEdits(saved, pending)).toEqual({});
  expect(JSON.stringify({ saved, reset })).toBe(before);
  const changed = pending.title[ElEditType.Text]!;
  if (changed.type === ElEditType.Text) changed.oldValue = 'Independent';
  expect(reset.title[ElEditType.Text].oldValue).toBe('Original');
});

it('reapplies an edit after resetting it without changing unrelated elements', () => {
  const saved: AllEdits<ElEditType> = { other: { [ElEditType.Text]: [1, 'Original', 'Keep', 'other'] } };
  const reset: AllEdits<ElEditType> = { title: { [ElEditType.Text]: [2, 'Original', null, 'title'] } };
  const pending = mergeEdits(reset, { title: { [ElEditType.Text]: [3, 'Original', 'Final', 'title'] } }, true);
  const merged = mergeEdits(saved, pending);
  expect(merged.other).toEqual(saved.other);
  expect(merged.title[ElEditType.Text]![2]).toBe('Final');
  expect(saved).not.toHaveProperty('title');
});
