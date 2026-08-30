import { getDisplayableTime, SHORT_MONTHS } from './utils';

describe('utils', () => {
  describe('#getDisplayableTime', () => {
    it('should return readable time relative to the current time', () => {
      const currentTime = +new Date();
      let dateStr = getDisplayableTime(new Date(currentTime - 10 * 1000));
      expect(dateStr).toBe('Just now');

      dateStr = getDisplayableTime(new Date(currentTime - 90 * 1000));
      expect(dateStr).toBe('1 min ago');

      dateStr = getDisplayableTime(new Date(currentTime - 200 * 1000));
      expect(dateStr).toBe('3 mins ago');

      dateStr = getDisplayableTime(new Date(currentTime - 1.5 * 60 * 60 * 1000));
      expect(dateStr).toBe('1 hour ago');

      dateStr = getDisplayableTime(new Date(currentTime - 3 * 60 * 60 * 1000));
      expect(dateStr).toBe('3 hours ago');

      const yesterday = new Date(currentTime - 26 * 60 * 60 * 1000);
      dateStr = getDisplayableTime(yesterday);
      expect(dateStr).toBe(`${yesterday.getDate()} ${SHORT_MONTHS[yesterday.getMonth()]}`);
    });
  });
});
