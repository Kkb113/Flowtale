import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import Input from '../input';
import UrlCodeShare from './url-code-share';

export type ParamType = Array<{ key: string, value: string, mapping: string}>;

interface IProps {
  onParamsAdd: (utmStr: ParamType, urlVal?: string) => void;
  defVal?: string;
}

const Con = styled.div`
  .qp-con {
    transform: scale(0.9);
    display: flex;
    padding: 1.5rem 0 0 0;
    justify-content: space-between;
    align-items: center;
  }

  .qp {
    gap: 1.5rem;
    display: flex;
    flex-direction: column;
  }

  .qp-item {
    display: flex;
    gap: 1rem;
  }

  .qp-btn {
    transform: scale(0.85);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

export default function (props: IProps): JSX.Element {
  const timer = useRef(0);
  const [ctaUrl, setCtaUrl] = useState('');
  return (
    <Con>
      <p>
        Please paste the URL of your external links which have their UTM parameters included. Links to a demo page, or a signup page, etc are called as <em>External Links</em>.
        <br />
        Please ensure that the external link has all UTM parameters included.
      </p>
      <Input
        sz="medium"
        label="Enter External Link with UTM params; Link starts with https://"
        defaultValue={props.defVal}
        onChange={(e) => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = 0;
          }
          timer.current = setTimeout(() => {
            try {
              const url = new URL(e.target.value || '');
              const searchParams = url.searchParams;
              const params: Array<{ key: string, value: string, mapping: string}> = [];
              for (const [param, value] of Array.from(searchParams.entries())) {
                params.push({
                  key: param,
                  value,
                  mapping: `{{ftm_${param}}}`
                });
              }
              const mappedQuery = params.map((p) => `${p.key}=${p.mapping}`);
              const mappedQueryStr = `${mappedQuery.length ? '?' : ''}${mappedQuery.join('&')}`;
              const mappedUrl = `${url.origin}${url.pathname}${mappedQueryStr}${url.hash}`;
              if (params.length) props.onParamsAdd(params, url.href);
              setCtaUrl(mappedUrl);
            } catch (ex) {
              setCtaUrl('');
              props.onParamsAdd([]);
            }
            clearTimeout(timer.current);
            timer.current = 0;
          }, 300) as unknown as number;
        }}
      />
      {ctaUrl && (
        <div>
          <p>
            Copy the following URL and add it as a CTA in the interactive demo
          </p>
          <UrlCodeShare url={ctaUrl} />
        </div>
      )}
      <p />
    </Con>
  );
}
