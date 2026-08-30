import {
  getDefaultTourOpts,
  getDisplayableTime,
  normalizeGlobalConfig,
  SHORT_MONTHS,
} from './utils';
import { IGlobalConfig } from './types';

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

  describe('#normalizeGlobalConfig', () => {
    it('fills missing values without replacing valid falsey values', () => {
      const config = normalizeGlobalConfig({
        annConPad: null,
        showStepNo: false,
        fontFamily: '',
      });

      expect(config.annConPad).toBe('14 14');
      expect(config.showStepNo).toBe(false);
      expect(config.fontFamily).toBe('');
    });

    it('parses a legacy serialized configuration', () => {
      const config = normalizeGlobalConfig(JSON.stringify({ annConPad: '18 20' }));

      expect(config.annConPad).toBe('18 20');
      expect(config.primaryColor).toBe('#7567ff');
    });
  });

  describe('#getDefaultTourOpts', () => {
    it('uses safe defaults when global options are absent', () => {
      const opts = getDefaultTourOpts(undefined as unknown as IGlobalConfig);

      expect(opts.annotationPadding._val).toBe('14 14');
    });
  });
});
