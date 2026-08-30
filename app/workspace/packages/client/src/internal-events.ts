import {
  AnnotationBtnClickedPayload,
  CtaClickedInternal,
} from './analytics/types';
import {
  ExtMsg,
  InternalEvents,
  Payload_DemoLoadingFinished,
  Payload_DemoLoadingStarted,
  Payload_JourneySwitch,
  Payload_Navigation,
} from './types';
import { createIframeSrc, mergeL1JsonIgnoreUndefined, postMessageForEvent } from './utils';
import { P_RespTour } from './entity-processor';
import { logEvent as logEvent2 } from './analytics/events';
import { CBCtaClickEvent, CBDemoOpened, CBEventBase, CBEvents, CBLeadFormFilledEvent, logEventToCblt } from './analytics/handlers';
import { Clock, EventDataOnNav, FableLeadContactProps, JourneyNameIndexData, addToGlobalAppData, getGlobalData } from './global';
import { AnnotationSerialIdMap } from './component/annotation/ops';
import { getUUID } from './analytics/utils';

type Payload_IE_AnnotationNav = AnnotationBtnClickedPayload;
type Payload_IE_JourneySwitch = Payload_JourneySwitch;
type Payload_IE_DemoLoadingStarted = Payload_DemoLoadingStarted;
type Payload_IE_DemoLoadingFinished = Payload_DemoLoadingFinished;
type Payload_IE_Navigation = Payload_Navigation;
type Payload_IE_CtaClicked = CtaClickedInternal;

type Payload_IE_All = Payload_IE_AnnotationNav
  | Payload_IE_JourneySwitch
  | Payload_IE_DemoLoadingStarted
  | Payload_IE_DemoLoadingFinished
  | Payload_IE_Navigation
  | Payload_IE_CtaClicked
  | FableLeadContactProps;

export function emitEvent<T>(
  ev: InternalEvents,
  payload: T
) : void {
  const event = new CustomEvent(ev, {
    detail: payload,
  });
  document.dispatchEvent(event);
}

const registeredListeners = {} as Record<InternalEvents, Array<<T extends Payload_IE_All>(payload: T) => void>>;

function trimStr(str: string | undefined): string | undefined {
  if (!str) return str;
  return str.trim();
}

export function registerListenerForInternalEvent(ev: InternalEvents, fn: (payload: Payload_IE_All) => void): void {
  if (ev in registeredListeners) registeredListeners[ev].push(fn);
  else registeredListeners[ev] = [fn];
}

function flushLocalClockIfAny(onFlush: (annEvt: EventDataOnNav) => void = () => {}) {
  const navData = getGlobalData('evtDataOnNav') as EventDataOnNav | undefined;
  const clocks = (getGlobalData('localClocks') || {}) as Record<string, Clock>;
  if (navData) {
    let clock: Clock;
    // stop the previous clock and log time spent event for previous annotation
    if (clock = clocks[navData.annRefId]) {
      const timeSpent = clock.getOffsetInSec();
      logEvent2('time_spent_in_ann', {
        annId: navData.annRefId,
        annType: navData.annotationType
      }, { offset: timeSpent });
      clock.dispose();
      delete clocks[navData.annRefId];
      onFlush(navData);
    }
  }
  return clocks;
}

export function isConversionUrl(url: string) {
  if (!(url && url.trim())) {
    return false;
  }

  try {
    const u = new URL(url);
    return u.host !== 'app.sharefable.com';
  } catch (e) {
    return true;
  }
}

const fireCBLeadFormFilled = (lead: FableLeadContactProps | null, demoData: P_RespTour) => {
  if (!lead) return;
  logEventToCblt<CBLeadFormFilledEvent & CBEventBase>({
    event: CBEvents.LEAD_FORM_FILLED,
    payload: {
      leadStrEncoded: btoa(JSON.stringify(lead)),
      ti: demoData.id
    },
  }, demoData.rid);
};

export function initInternalEvents() : Array<[InternalEvents, (ev: Event) => void]> {
  registerListenerForInternalEvent(InternalEvents.OnNavigation, (payload: Payload_IE_All) => {
    const journeyData = getGlobalData('journeyData') as JourneyNameIndexData;
    const journeyIndex = journeyData !== undefined ? journeyData.journeyIndex : -1;
    const tPayload = {
      ...payload,
      journeyIndex
    } as Payload_IE_Navigation;
    const postMsgPayload: Payload_Navigation = {
      journeyIndex: tPayload.journeyIndex,
      currentAnnotationRefId: tPayload.currentAnnotationRefId,
      annotationType: tPayload.annotationType,
      box: tPayload.box,
      screenId: tPayload.screenId,
      annConfigType: tPayload.annConfigType
    };
    postMessageForEvent<Payload_Navigation>(ExtMsg.OnNavigation, postMsgPayload);

    const clocks = flushLocalClockIfAny((navEvtData) => {
      if (navEvtData.annotationType === 'leadform') {
        let lead = getGlobalData('lead') as FableLeadContactProps | null;
        const demoData = getGlobalData('demo') as P_RespTour;
        if (lead) fireCBLeadFormFilled(lead, demoData);
        else {
        // It might happen that this event gets fired before the lead gets pushed to global config.
          setTimeout(() => {
            lead = getGlobalData('lead') as FableLeadContactProps | null;
            fireCBLeadFormFilled(lead, demoData);
          }, 1500);
        }
      }
    });

    // Register a new clock for the current annotation
    // Send event every 5 seconds so that we don't loose data in case user closes the whindow
    // after reading the annotation
    const clock = clocks[tPayload.currentAnnotationRefId] = new Clock();
    clock.triggerEvery(10, 12, (t: number) => {
      logEvent2('time_spent_in_ann', {
        annId: tPayload.currentAnnotationRefId,
        annType: tPayload.annotationType
      }, { offset: t });
    });
    addToGlobalAppData('localClocks', clocks);
    addToGlobalAppData('evtDataOnNav', {
      annRefId: tPayload.currentAnnotationRefId,
      annotationType: tPayload.annotationType
    });

    logEvent2('nav_to_ann', {
      annId: tPayload.currentAnnotationRefId,
      annType: tPayload.annotationType
    });

    // Only send completion information if user is progressing through the demo
    const serialIdMap = (getGlobalData('annotationSerialIdMap') || {}) as AnnotationSerialIdMap;
    if (serialIdMap && tPayload.currentAnnotationRefId in serialIdMap) {
      const completionPercentage = Math.ceil(
        // eslint-disable-next-line no-mixed-operators
        (serialIdMap[tPayload.currentAnnotationRefId].absIdx + 1) * 100 / serialIdMap[tPayload.currentAnnotationRefId].absLen
      );
      const prevCompletion = (getGlobalData('completionPercentage') || 0) as number;
      if (completionPercentage > prevCompletion) {
        addToGlobalAppData('completionPercentage', completionPercentage);
        logEvent2('completion', undefined, {
          offset: completionPercentage
        });
      }
    }

    // we can't send leadform filled event here as when a lead form is opened (not clicked submit)
    // this function is triggered
  });

  registerListenerForInternalEvent(InternalEvents.LeadAssign, (payload: Payload_IE_All) => {
    const savedLead = getGlobalData('lead') as FableLeadContactProps | undefined;
    const lead = payload as FableLeadContactProps;
    const updatedLead = mergeL1JsonIgnoreUndefined(savedLead || {}, payload);
    addToGlobalAppData('lead', updatedLead);
    const demo = getGlobalData('demo') as P_RespTour;

    const mergedLeadData = {
      ...lead,
      pk_val: trimStr(updatedLead.pk_val)!,
      phone: trimStr(updatedLead.phone),
      first_name: trimStr(updatedLead.first_name),
      last_name: trimStr(updatedLead.last_name),
      org: lead.org || updatedLead.org,
      email: trimStr(updatedLead.email),
    };
    // TODO review contract
    logEventToCblt<FableLeadContactProps & CBEventBase>({
      event: CBEvents.CREATE_CONTACT,
      payload: {
        ...mergedLeadData,
        // For cobalt we send the full lead information inside custom field as well to support custom field mapping
        custom_fields: mergedLeadData,
        ti: demo.id,
      },
    }, demo.rid);

    logEvent2('user_assign', updatedLead);
  });

  registerListenerForInternalEvent(InternalEvents.OnCtaClicked, (payload: Payload_IE_All) => {
    const tPayload = payload as CtaClickedInternal;
    const lead = getGlobalData('lead') as FableLeadContactProps | null;
    const demoData = getGlobalData('demo') as P_RespTour;
    // When a cta is clicked for the current annotation we stop calculating time as
    // this will be marked as conversion
    flushLocalClockIfAny();

    if (isConversionUrl(tPayload.url)) {
      logEvent2('cta_clicked', {
        source: tPayload.ctaFrom,
        btnId: tPayload.btnId,
        btnTxt: tPayload.btnTxt,
        url: tPayload.url
      });

      logEventToCblt<CBCtaClickEvent & CBEventBase>({
        event: CBEvents.CTA_CLICKED,
        payload: {
          leadStrEncoded: lead ? btoa(JSON.stringify(lead)) : '',
          ti: demoData.id,
          pk_key: lead?.pk_key || '',
          pk_val: lead?.pk_val || '',
          anon: !lead,
          source: tPayload.ctaFrom,
          cta_txt: tPayload.btnTxt,
          cta_url: tPayload.url,
          our_event_id: getUUID(),
        },
      }, demoData.rid);
    }
  });

  registerListenerForInternalEvent(InternalEvents.JourneySwitch, (payload: Payload_IE_All) => {
    const tPayload = {
      ...payload,
    };
    postMessageForEvent(ExtMsg.JourneySwitch, tPayload as Payload_IE_JourneySwitch);
  });

  registerListenerForInternalEvent(InternalEvents.DemoLoadingStarted, (payload: Payload_IE_All) => {
    const demoData = getGlobalData('demo') as P_RespTour;
    const tPayload = {
      ...payload,
      demoUrl: createIframeSrc(`/demo/${demoData.rid}`) || '',
      demoDisplayName: demoData.displayName || '',
      demoRid: demoData.rid || '',
    };
    postMessageForEvent(ExtMsg.DemoLoadingStarted, tPayload as Payload_IE_DemoLoadingStarted);
  });

  registerListenerForInternalEvent(InternalEvents.DemoLoadingFinished, () => {
    // TODO only raise this across sessions
    const lead = getGlobalData('lead') as FableLeadContactProps | null;
    const demoData = getGlobalData('demo') as P_RespTour;
    logEvent2('demo_opened');

    logEventToCblt<CBDemoOpened & CBEventBase>({
      event: CBEvents.DEMO_OPENED,
      payload: {
        leadStrEncoded: lead ? btoa(JSON.stringify(lead)) : '',
        ti: demoData.id,
        anon: !lead,
      },
    }, demoData.rid);
  });

  // register event listener to document
  const unsubs: Array<[InternalEvents, (ev: Event) => void]> = [];
  for (const name of Object.values(InternalEvents)) {
    const l = (ev: Event): void => {
      if (!(ev instanceof CustomEvent)) return;
      const cev = ev as CustomEvent;
      (registeredListeners[name] || []).forEach(fn => fn(cev.detail as Payload_IE_All));
    };
    unsubs.push([name, l]);
    document.addEventListener(name, l);
  }
  return unsubs;
}

export function disposeInternalEvents(unsubs: Array<[InternalEvents, (e: Event) => void]>): void {
  for (const name of Object.values(InternalEvents)) {
    registeredListeners[name] = [];
  }
  for (const [name, unsub] of unsubs) {
    document.removeEventListener(name, unsub);
  }
}
