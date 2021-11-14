import expect from 'expect';
import * as diff from '../diff';

describe('diff module', () => {
  describe('compare()', () => {
    const original: string = `1st line
2nd line
3d line
4th line
5th line
6th line
7th line
`;

    describe('when adding', () => {
      const changed: string = `1st line
2nd line
Added line after 2nd line
3d line
Added line after 3d line
4th line
5th line
6th line
7th line
Added line after 7th line
`;

      it('should match the snapshot', async () => {
        expect(await diff.compare(original, changed)).toMatchSnapshot();
      });
    });

    describe('when removing', () => {
      const changed: string = `1st line
4th line
5th line
7th line
`;

      it('should match the snapshot', async () => {
        expect(await diff.compare(original, changed)).toMatchSnapshot();
      });
    });

    describe('when replacing', () => {
      const changed: string = `1st line
Replaced 2nd line
Replaced 3d line
4th line
Replaced 5th line
6th line
Replaced 7th line
`;

      it('should match the snapshot', async () => {
        expect(await diff.compare(original, changed)).toMatchSnapshot();
      });
    });

    describe('when unchanged', () => {
      it('should match the snapshot', async () => {
        expect(await diff.compare(original, original)).toMatchSnapshot();
      });
    });
  });
});
