import React, { useEffect, useState } from 'react';
import { IDemoHubConfigDemo, SelectEntry as SelectEntryType } from '../../../types';
import { useDemoHubQlfcnCtx } from '../ctx';
import * as Tags from '../styled';
import { EntryProps } from '../type';
import BaseEntry from './base-entry';

type Option = SelectEntryType['options'][0];

interface Props extends EntryProps {
  entryData: SelectEntryType;
  isMultiSelect: boolean;
}

function SelectEntry(props: Props): JSX.Element {
  const { setSelectedDemosForEntries, selectedDemosForEntries } = useDemoHubQlfcnCtx();
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);

  const isOptionSelected = (option: Option, optionsList: Option[]): boolean => {
    const foundOption = optionsList.find(p => p.id === option.id);
    return !!foundOption;
  };

  const combineDemos = (): IDemoHubConfigDemo[] => {
    const demos = [];
    for (const option of selectedOptions) {
      demos.push(...option.demos);
    }
    return demos;
  };

  useEffect(() => {
    setSelectedDemosForEntries(prev => ({
      ...prev,
      [props.entryData.slug]: {
        entrySlug: props.entryData.slug,
        options: selectedOptions,
        demos: combineDemos(),
      },
    }));
  }, [selectedOptions]);

  return (
    <BaseEntry
      entryBaseData={props.entryData}
      isVisible={props.isVisible}
      hideContinue={false}
      hideSkip={props.isLast}
      goToNext={() => {
        if (!selectedOptions.length) return;
        const selectedDemos = selectedDemosForEntries[props.entryData.slug].demos;
        if (selectedDemos.length) {
          props.goToNext();
          return;
        }
        props.goToNext();
      }}
      onSkip={props.onSkip}
      hideEndCTA
      isContBtnDisabled={selectedOptions.length <= 0}
    >
      <Tags.SelectionOptionsList className="opts-con">
        {
        props.entryData.options.map(option => (
          <Tags.SelectOption
            key={option.id}
            styleData={props.entryData.style}
            onClick={() => {
              if (props.isMultiSelect) {
                setSelectedOptions(prev => {
                  if (isOptionSelected(option, prev)) {
                    return prev.filter(p => p.id !== option.id);
                  }
                  return [...prev, option];
                });
              } else {
                setSelectedOptions(prev => {
                  if (isOptionSelected(option, prev)) {
                    return [];
                  }
                  return [option];
                });
              }
            }}
          >
            <div className="line1">
              <div className="opt-title">{option.title}</div>
              {isOptionSelected(option, selectedOptions) ? <Tags.CheckFilledIcon
                style={{ fontSize: 'calc(1.5rem + 4px)', color: props.entryData.style.borderColor }}
              /> : <Tags.EmptyCircle
                style={{ color: '#9E9E9E', borderColor: props.entryData.style.borderColor }}
              />}
            </div>
            {option.desc && (
              <div className="opt-subtitle line2">{option.desc}</div>
            )}
          </Tags.SelectOption>
        ))
      }

      </Tags.SelectionOptionsList>
    </BaseEntry>
  );
}

export default SelectEntry;
