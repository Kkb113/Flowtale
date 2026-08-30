import { isValidThemeColor } from './theme-colors';

describe('#isValidThemeColor', () => {
  it('accepts six-digit hex theme colors', () => {
    expect(isValidThemeColor('#7567ff')).toBe(true);
    expect(isValidThemeColor('#AABBCC')).toBe(true);
  });

  it('rejects malformed recorded theme colors', () => {
    expect(isValidThemeColor('#aabb((')).toBe(false);
    expect(isValidThemeColor('lab(50% 0 0)')).toBe(false);
    expect(isValidThemeColor('oklch(62% 0.2 250)')).toBe(false);
    expect(isValidThemeColor('transparent')).toBe(false);
  });
});
