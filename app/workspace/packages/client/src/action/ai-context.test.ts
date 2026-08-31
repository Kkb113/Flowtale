import { getSingleAnnotationContext } from './ai-context';

const state = Array.from({ length: 30 }, (_, id) => ({ id, text: `Step ${id}` }));

describe('getSingleAnnotationContext', () => {
  it('keeps the target and two preceding steps for annotations beyond the first batch', () => {
    const context = getSingleAnnotationContext(state, 18, 12);
    expect(context).toHaveLength(12);
    expect(context[0].id).toBe(16);
    expect(context.some(item => item.id === 18)).toBe(true);
    expect(context[context.length - 1].id).toBe(27);
  });

  it('starts at zero for early annotations', () => {
    expect(getSingleAnnotationContext(state, 1, 12).map(item => item.id))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('rejects missing targets', () => {
    expect(() => getSingleAnnotationContext(state, 99, 12)).toThrow('Annotation with id 99 not found');
    expect(() => getSingleAnnotationContext(state, undefined, 12)).toThrow('Current Annotation Id not found');
  });
});
