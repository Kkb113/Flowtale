import React, { useEffect, useRef } from 'react';
import loader from '@fable/common/dist/loader';
import { sleep } from '@fable/common/dist/utils';

interface Props {
  txtBefore?: string;
  width: string;
  showAtPageCenter?: boolean;
}

/*
 * TODO this component is exactly same as client's component/loader. Try to
 *      see if we could move it to common
 */

export default function Loader(props: Props): JSX.Element {
  const conRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const con = conRef?.current;
    if (!con) {
      return () => {};
    }

    let timer: NodeJS.Timeout | null = null;
    let p: Promise<void>;
    (function continuousLoader() {
      timer = setTimeout(async () => {
        p = loader(con!, 600, 500, 400, '', { height: '6px', zIndex: '0' });
        await p;
        await sleep(100);
        continuousLoader();
      }, 16);
    }());

    return async () => {
      p && (await p);
      timer && clearTimeout(timer);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: props.showAtPageCenter ? '100vh' : '100%',
      justifyContent: 'center'
    }}
    >
      {props.txtBefore && <div style={{ marginRight: '0.75rem' }}>{props.txtBefore}</div>}
      <div
        style={{
          width: props.width,
          marginTop: '2px',
          overflow: 'hidden',
          position: 'relative',
        }}
        ref={conRef}
      />
    </div>
  );
}
