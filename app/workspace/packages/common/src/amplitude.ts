import { init, track, setUserId, reset } from '@amplitude/analytics-browser';
import posthog from 'posthog-js';
import { isProdEnv } from './utils';
import { CmnEvtProp } from './types';
import raiseDeferredError from './deferred-error';

export const initProductAnalytics = (): void => {
  if (!isProdEnv()) {
    return;
  }
  const AMPLITUDE_KEY = process.env.REACT_APP_AMPLITUDE_KEY;
  const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY;

  if (!AMPLITUDE_KEY) {
    raiseDeferredError(new Error('amplitude api key is not defined'));
  } else {
    init(AMPLITUDE_KEY, {
      defaultTracking: false,
    });
  }

  if (!POSTHOG_KEY) {
    raiseDeferredError(new Error('posthog api key is not defined'));
  } else {
    posthog.init(
      POSTHOG_KEY,
      {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
      }
    );
  }
};

export const traceEvent = (eventName: string, eventProperties: Record<string, string | boolean | number | null>, commonEventProperties?: CmnEvtProp[]) : void => {
  if (!isProdEnv()) {
    return;
  }

  const finalEvenProperties = eventProperties;
  const data = JSON.parse(localStorage.getItem('fable/ep')!);
  commonEventProperties?.forEach((property) => {
    finalEvenProperties[property] = data[property];
  });

  // if (data.email && data.email.endsWith('@sharefable.com')) {
  //   return;
  // }
  const timer = setTimeout(() => {
    track(eventName, finalEvenProperties);
    posthog.capture(eventName, finalEvenProperties);
    clearTimeout(timer);
  }, 0);
};

export const setProductAnalyticsUserId = (userId: string) => {
  if (!isProdEnv()) {
    return;
  }
  posthog.identify(
    userId,
    { email: userId }
  );
  setUserId(userId);
  // if (userId.endsWith('@sharefable.com')) {
  //   posthog.opt_out_capturing();
  // } else if (posthog.has_opted_out_capturing()) {
  //   posthog.opt_in_capturing();
  // }
};

export const resetProductAnalytics = () => {
  if (!isProdEnv()) {
    return;
  }
  reset();
  posthog.reset();
};
