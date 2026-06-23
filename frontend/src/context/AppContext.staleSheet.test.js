import { isStaleSheetRead } from './AppContext';

describe('isStaleSheetRead', () => {
  it('flags a sheet read older than the trusted local timestamp as stale', () => {
    expect(isStaleSheetRead(1000, 900)).toBe(true);
  });

  it('does not flag a sheet read newer than or equal to local as stale', () => {
    expect(isStaleSheetRead(1000, 1000)).toBe(false);
    expect(isStaleSheetRead(1000, 1100)).toBe(false);
  });

  it('does not flag when either timestamp is missing (nothing to compare against)', () => {
    expect(isStaleSheetRead(null, 900)).toBe(false);
    expect(isStaleSheetRead(1000, null)).toBe(false);
    expect(isStaleSheetRead(undefined, undefined)).toBe(false);
  });
});
