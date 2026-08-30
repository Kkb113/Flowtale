import React, { useEffect, useState } from 'react';
import { EntryProps, SelectStep } from '../type';
import BaseEntry from './base-entry';
import { useDemoHubQlfcnCtx } from '../ctx';
import { isEventValid, objectToSearchParams } from '../../../utils';

interface Props extends EntryProps {
  entryData: SelectStep,
}

function DemoEntry(props: Props): JSX.Element {
  const [searchParamsStr, setSearchParamsStr] = useState<string>('');
  const { leadFormValues, demoParams } = useDemoHubQlfcnCtx();
  const [isDemoCompleted, setIsDemoCompleted] = useState(false);

  useEffect(() => {
    const skipLeadform : Record<string, string> = {};
    if (Object.keys(leadFormValues).length !== 0) {
      skipLeadform.skiplf = '1';
    }
    setSearchParamsStr(objectToSearchParams({ ...leadFormValues, ...demoParams, ...skipLeadform }));
  }, [leadFormValues]);

  const receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation', demoRid: string }>): void => {
    if (isEventValid(e) && e.data.type === 'lastAnnotation' && e.data.demoRid === props.entryData.demoData?.rid) {
      props.goToNext();
      setIsDemoCompleted(true);
    }
  };

  useEffect(() => {
    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, []);

  return (
    <BaseEntry
      entryBaseData={{
        ...props.entryData,
        title: props.entryData.demoData?.name || '',
        desc: props.entryData.demoData?.desc || '',
      }}
      isVisible={props.isVisible}
      hideContinue
      hideSkip={props.isLast}
      goToNext={props.goToNext}
      onSkip={props.onSkip}
      hideEndCTA={!(isDemoCompleted && props.isLast)}
      isDemo
      compact
    >
      {
          props.isVisible && (
            <iframe
              width="100%"
              height="100%"
              // eslint-disable-next-line max-len
              src={`${window.location.origin}/embed/demo/${props.entryData.demoData!.rid}?${searchParamsStr}`}
              allowFullScreen
              title={props.entryData.demoData!.rid}
              style={{
                border: 'none',
                width: '100%',
                height: 'calc(100% - 1rem)',
                marginBottom: '1rem',
                flex: '1 1 auto',
                borderRadius: `${props.entryData.style.borderRadius}px`,
                boxShadow: 'rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px'
              }}
            />
          )
        }
    </BaseEntry>
  );
}
export default DemoEntry;
