import React, { useEffect, useRef, useState } from 'react';
import styled, { StyleSheetManager } from 'styled-components';
import { createPortal } from 'react-dom';
import DomElPicker, { HighlightMode } from './dom-element-picker';

const scrollIntoView = require('scroll-into-view');

interface IProps {
    selectedEl: HTMLElement;
    disabled: boolean;
    onElSelect: (newSelEl: HTMLElement, prevSelEl: HTMLElement, selectedOnClick? : boolean) => void;
    onOverElPicker?:(selEl: HTMLElement) => void;
    domElPicker: DomElPicker;
    boundEl?: HTMLElement;
}

function getDataIdxFromEvtTarget(e: React.MouseEvent<HTMLSpanElement>): number {
  const idxStr = (e.target as HTMLSpanElement).getAttribute('data-f-elidx');
  return idxStr ? +idxStr : -1;
}

export default function AdvanceElementPicker(props: IProps): JSX.Element {
  const [elsInPath, setElsInPath] = useState<[Node, 'valid' | 'sel' | 'invalid'][]>([]);
  const lastIndexHovered = useRef(-1);
  const [lastEls, setLastEls] = useState<Node[]>([]);
  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);
  const mountNode = contentRef?.contentWindow?.document?.body;

  useEffect(() => {
    const body = contentRef?.contentWindow?.document?.body;
    if (body) { body.style.margin = '0'; }
  }, [contentRef]);

  useEffect(() => {
    props.domElPicker.setSelectedBoundedEl(props.boundEl);
    const elsForCurrentEl = props.domElPicker.getParents(props.selectedEl);
    // selectedEl is changed on each click of AEP, this in turns triggers change in elsInPath, if user clicks on an
    // element, the underlaying array would change and user's mouse would be on a different element that what he has
    // clicked. That would create experience issue as mouseover / mousemove / mouseout events are attached.
    // Hence we keep the length of the array same while user is interacting with AEP. Kinda like chrome's tab closing
    // experience.
    const allElsIncludingInitRun = [
      ...elsForCurrentEl.map(el => [el, el === props.selectedEl ? 'sel' : 'valid']),
      ...lastEls.slice(elsForCurrentEl.length).map(el => [el, 'invalid'])
    ];
    setElsInPath(allElsIncludingInitRun as [Node, 'valid' | 'sel' | 'invalid'][]);
    props.domElPicker.setSelectedBoundedEl(null);
  }, [props.selectedEl, lastEls]);

  return (
    <AEPIframe title="AEP" ref={setContentRef}>
      {
        mountNode && createPortal(
          (
            <StyleSheetManager target={contentRef?.contentWindow?.document?.head}>

              <AEPCon
                className={props.disabled ? 'disabled' : ''}
                onMouseOver={() => {
                  if (props.disabled) return;

                  props.domElPicker.setSelectionMode();
                  props.onOverElPicker && props.onOverElPicker(props.selectedEl);
                }}
                onMouseMove={e => {
                  if (props.disabled) return;

                  const i = getDataIdxFromEvtTarget(e);
                  if (i === lastIndexHovered.current) return;
                  lastIndexHovered.current = i;
                  if (i !== -1) {
                    const el = elsInPath[i];
                    props.domElPicker.selectElement(el[0] as HTMLElement, HighlightMode.Selection);
                  }
                }}
                onMouseLeave={() => {
                  if (props.disabled) return;

                  setLastEls([]);
                  lastIndexHovered.current = -1;
                  props.onElSelect(props.selectedEl, props.selectedEl);
                }}
                onClick={e => {
                  if (props.disabled) return;
                  if (lastEls.length === 0) {
                    setLastEls(elsInPath.map(el => el[0]));
                  }

                  const i = getDataIdxFromEvtTarget(e);
                  if (i !== -1) {
                    const el = elsInPath[i];
                    props.onElSelect(el[0] as HTMLElement, props.selectedEl, true);
                  }
                }}
              >
                {elsInPath.map((el, i) => {
                  if (el[0].nodeName.toLowerCase() === 'html') return <React.Fragment key={i} />;

                  return (
                    <span key={i} data-f-elidx={i} className={el[1]}>
                      {el[0].nodeName}
                    </span>
                  );
                })}
                <AlwaysScrollToRightEnd key={-1} />
              </AEPCon>
            </StyleSheetManager>
          ), mountNode
        )
      }
    </AEPIframe>
  );
}

function AlwaysScrollToRightEnd(): JSX.Element {
  const elementRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setTimeout(() => {
      elementRef.current && scrollIntoView(elementRef.current);
    }, 300);
  });
  return <span ref={elementRef} style={{ padding: 0, width: '1px', height: '1px' }} />;
}

export const AEPIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;

  body {
    margin: none;
  }
`;

const AEPCon = styled.div`
  width: 100%;
  display: flex;
  height: 100%;
  background: #424242;
  display: flex;
  flex-direction: row;
  align-items: center;
  text-transform: lowercase;
  overflow-x: auto;
  transition: all 0.3s ease-out;
  opacity: 1;
  font-family: IBM Plex Sans, sans-serif;
  border-bottom-left-radius: 20px;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  
  &.disabled {
    opacity: 0.4;
  }

  &::-webkit-scrollbar {
    width: 1px;
    height: 1px;
  }

  span {
    font-size: 12px;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: 0 0.35rem 0 0.35rem;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    border-radius: 4px;
    margin: 0 2px;
    position: relative;

    &:not(:nth-last-child(-n+2)):after {
      content: '●';
      opacity: 0.85;
      font-size: 8px;
      right: -4px;
      position: absolute;
    }

    &:hover {
      background: #9e96fa;
    }

    &.sel {
      background: #7567FF;
      color: #fff;
      font-weight: 500;
    }
    &.invalid {
      visibility: hidden;
    }
  }
`;
