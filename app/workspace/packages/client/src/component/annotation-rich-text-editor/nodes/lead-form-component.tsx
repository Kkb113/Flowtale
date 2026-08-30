import { Button as AntdButton, Popover, Radio, Tooltip } from 'antd';
import './lead-form-component.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  BaseSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExclamationCircleTwoTone, HolderOutlined, MoreOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { DragDropContext, Draggable, DropResult, Droppable } from 'react-beautiful-dnd';
import BlackRightPointingDoubleTriangleWithVerticalBar from '../../../assets/black_right_pointing_double_triangle_with_vertical_bar.png';
import ClosedLockWithKey from '../../../assets/closed_lock_with_key.png';
import Wrench from '../../../assets/wrench.png';
import joinClasses from '../utils/join-classes';
import { $isLeadFormNode, createLeadFormOption } from './lead-form-node';
import type { Option, Options, LeadFormNode } from './lead-form-node';
import Button from '../../button';
import { parseFieldName } from '../../annotation/utils';
import { LeadFormField, LeadFormFieldAutocompleteType } from '../utils/lead-form-node-utils';
import { OurLink, OurRadio } from '../../../common-styled';
import Input from '../../input';
import { CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND } from '../plugins/toolbar-plugin';
import { debounce } from '../../../utils';

export enum LeadFormPropertyType {
  PrimaryKey,
  Optional,
  CalculatedField,
  None
}

export const LEAD_FORM_FIELDS: {
  label: string,
  placeholder: string,
  autocompleteType: LeadFormFieldAutocompleteType,
  type: LeadFormField,
  property?: LeadFormPropertyType,
}[] = [
  {
    label: 'Email',
    placeholder: 'Enter your Email {[email]}',
    type: 'email',
    autocompleteType: 'email',
  },
  {
    label: 'First name',
    placeholder: 'Enter your First Name {[ first_name ]}',
    autocompleteType: 'given-name',
    type: 'text',
  },
  {
    label: 'Last name',
    placeholder: 'Enter your Last Name {[ last_name ]}',
    autocompleteType: 'family-name',
    type: 'text',
  },
  {
    label: 'Country',
    placeholder: 'Enter your Country {[ country ]}',
    autocompleteType: 'country-name',
    type: 'text',
  },
  {
    label: 'Industry',
    placeholder: 'Enter your Industry {[ industry ]}',
    autocompleteType: 'on',
    type: 'text',
  },
  {
    label: 'Company',
    placeholder: 'Enter your Company {[ org ]}',
    autocompleteType: 'organization',
    type: 'text',
  },
  {
    label: 'Mobile',
    placeholder: 'Enter your Mobile number {[ phone ]}',
    autocompleteType: 'tel',
    type: 'text',
  },
  {
    label: 'Website URL',
    placeholder: 'Enter your Website URL {[ website_url ]}',
    autocompleteType: 'on',
    type: 'text',
  }
];

interface LeadFormOptionProps {
  index: number;
  option: Option;
  options: Options;
  withLeadFormNode: (
    cb: (leadFormNode: LeadFormNode) => void,
    onSelect?: () => void,
  ) => void;
}

interface LeadFromPropertyTypeRadioOption {
  value: LeadFormPropertyType;
  icon: string;
  title: string;
}

const LeadFormPropertyTypeRadioOptions: LeadFromPropertyTypeRadioOption[] = [
  {
    value: LeadFormPropertyType.PrimaryKey,
    icon: ClosedLockWithKey,
    title: 'Primary key',
  },
  {
    value: LeadFormPropertyType.Optional,
    icon: BlackRightPointingDoubleTriangleWithVerticalBar,
    title: 'Optional',
  },
  {
    value: LeadFormPropertyType.CalculatedField,
    icon: Wrench,
    title: 'Calculated field',
  },
];

function LeadFormOptionComponent({
  option,
  index,
  options,
  withLeadFormNode,
}: LeadFormOptionProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [propertyType, setPropertyType] = useState<LeadFormPropertyType>(option.property);
  const [calculatedFieldValue, setCalculatedFieldValue] = useState(option.calculatedValue);

  useEffect(() => {
    setPropertyType(option.property);
    setCalculatedFieldValue(option.calculatedValue);
  }, [option]);

  const text = option.text;

  const debouncedCalculatedValueOnChangeHandler = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    withLeadFormNode((node) => {
      node.changeCalculatedFieldValue(option, e.target.value);
    });
  }, 300);

  return (
    <div className="LeadForm__optionContainer">
      <div className="LeadForm__optionInputWrapper">
        <input
          className="LeadForm__optionInput"
          type="text"
          value={text}
          onChange={(e) => {
            const target = e.target;
            const value = target.value;
            const selectionStart = target.selectionStart;
            const selectionEnd = target.selectionEnd;

            if (option.property === LeadFormPropertyType.PrimaryKey) {
              editor.dispatchCommand(CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND, parseFieldName(value));
            }

            withLeadFormNode(
              (node) => {
                node.setOptionText(option, value);
              },
              () => {
                target.selectionStart = selectionStart;
                target.selectionEnd = selectionEnd;
              },
            );
          }}
          placeholder={`Field ${index + 1}`}
        />
      </div>
      {option.property !== LeadFormPropertyType.None && (
        <div
          style={{
            position: 'absolute',
            backgroundColor: 'white',
            border: '0.5px solid gray',
            fontSize: '0.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '16px',
            top: 0,
            left: 0,
            transform: 'translate(-35%, -35%)',
          }}
        >
          {option.property === LeadFormPropertyType.CalculatedField && (
          <Tooltip
            placement="left"
            title={`This is a calulated field with value: ${option.calculatedValue}`}
          >
            <img src={Wrench} alt="" width={10} />
          </Tooltip>
          )}
          {option.property === LeadFormPropertyType.Optional && (
          <Tooltip
            placement="left"
            title="This field is optional"
          >
            <img src={BlackRightPointingDoubleTriangleWithVerticalBar} alt="" width={10} />
          </Tooltip>
          )}
          {option.property === LeadFormPropertyType.PrimaryKey && (
          <Tooltip
            placement="left"
            title="This is your lead form's primary key"
          >
            <img src={ClosedLockWithKey} alt="" width={10} />
          </Tooltip>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={option.property === LeadFormPropertyType.PrimaryKey || options.length < 2}
        className={joinClasses(
          'LeadForm__optionDelete',
          (option.property === LeadFormPropertyType.PrimaryKey || options.length < 2)
          && 'LeadForm__optionDeleteDisabled',
        )}
        aria-label="Remove"
        onClick={() => {
          withLeadFormNode((node) => {
            node.deleteOption(option);
          });
        }}
      />

      <Popover
        placement="topRight"
        content={(
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <Radio.Group
              onChange={(e) => {
                const property = e.target.value;

                if (property === LeadFormPropertyType.PrimaryKey) {
                  editor.dispatchCommand(CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND, parseFieldName(option.text));
                }

                withLeadFormNode((node) => {
                  node.changePropertyType(option, property);
                });
              }}
              value={propertyType}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {LeadFormPropertyTypeRadioOptions.map((opt, idx) => (
                <OurRadio className="our-radio-lead-form-hover" value={opt.value} key={idx}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={opt.icon}
                      alt=""
                      width={16}
                    />

                    <div>
                      {opt.title}
                    </div>
                  </div>
                </OurRadio>
              ))}
            </Radio.Group>

            {propertyType === LeadFormPropertyType.CalculatedField && (
              <Input
                value={calculatedFieldValue}
                onChange={e => {
                  setCalculatedFieldValue(e.target.value);
                  debouncedCalculatedValueOnChangeHandler(e);
                }}
                label="Calculated value"
              />
            )}

            <OurLink
              onClick={() => {
                if (option.property === LeadFormPropertyType.PrimaryKey) {
                  editor.dispatchCommand(CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND, '');
                }

                withLeadFormNode((node) => {
                  node.changePropertyType(option, LeadFormPropertyType.None);
                });
              }}
            >
              Reset
            </OurLink>
          </div>
        )}
        trigger="click"
      >
        <AntdButton
          type="text"
          size="small"
          icon={<MoreOutlined />}
        />
      </Popover>

    </div>
  );
}

const getPrimaryKey = (options: Options): string => {
  const optionSetAsPk = options.find(option => option.property === LeadFormPropertyType.PrimaryKey);
  if (optionSetAsPk) return parseFieldName(optionSetAsPk.text);
  return '';
};

export default function LeadFormComponent({
  options,
  nodeKey,
}: {
  nodeKey: NodeKey;
  options: Options;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [primaryKey, setPrimaryKey] = useState(() => getPrimaryKey(options));
  const ref = useRef(null);

  useEffect(() => {
    setPrimaryKey(getPrimaryKey(options));

    /**
     * Updating old form fields to have new option params
     */
    const updatedOptions: unknown[] = [];
    let shouldUpdateOptions = false;

    for (const opt of options) {
      if (opt.property === undefined) {
        shouldUpdateOptions = true;
        const property = opt.type === 'email' ? LeadFormPropertyType.PrimaryKey : LeadFormPropertyType.None;
        const newOption: Option = { ...opt, calculatedValue: '', property };
        updatedOptions.push(newOption);
      }
    }

    if (shouldUpdateOptions) {
      withLeadFormNode((node) => {
        node.updateOptions(updatedOptions as Options);
      });
    }
  }, [options]);

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isLeadFormNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  useEffect(() => mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      setSelection(editorState.read(() => $getSelection()));
    }),
    editor.registerCommand<MouseEvent>(
      CLICK_COMMAND,
      (payload) => {
        const event = payload;

        if (event.target === ref.current) {
          if (!event.shiftKey) {
            clearSelection();
          }
          setSelected(!isSelected);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      onDelete,
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      onDelete,
      COMMAND_PRIORITY_LOW,
    ),
  ), [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

  const withLeadFormNode = (
    cb: (node: LeadFormNode) => void,
    onUpdate?: () => void,
  ): void => {
    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if ($isLeadFormNode(node)) {
          cb(node);
        }
      },
      { onUpdate },
    );
  };

  const getCustomOption = (): string => {
    let maxCount = 0;
    for (const option of options) {
      const match = option.text.match(/\d+/);
      if (match) maxCount = Math.max(maxCount, parseInt(match[0], 10));
    }

    return `Field ${maxCount + 1} {[field${maxCount + 1}]}`;
  };

  const addOption = (value: string, type: LeadFormField, autocompleteType: LeadFormFieldAutocompleteType): void => {
    withLeadFormNode((node) => {
      node.addOption(createLeadFormOption(value, type, autocompleteType));
    });
  };

  const rearrangeOption = (r: DropResult): void => {
    if (!r.destination) return;

    withLeadFormNode((node) => {
      node.rearrangeOptions(r.source.index, r.destination!.index);
    });
  };

  const isFocused = $isNodeSelection(selection) && isSelected;

  const presentOptions = options.map(option => parseFieldName(option.text));

  const availableOptions = LEAD_FORM_FIELDS
    .filter(field => {
      if (field.type === 'email') return false;
      const res = !presentOptions.includes(parseFieldName(field.placeholder));
      return res;
    });

  return (
    <Popover
      content={(
        <div className="lead-form-options-popover">
          {availableOptions.map((field) => (
            <div
              key={field.label}
              onClick={() => {
                addOption(field.placeholder, field.type, field.autocompleteType);
                setPopoverOpen(false);
              }}
              className="option"
            >
              {field.label}
            </div>
          ))}

          <div
            onClick={() => {
              addOption(getCustomOption(), 'text', 'on');
              setPopoverOpen(false);
            }}
            className="option"
          >
            Custom field
          </div>
        </div>
    )}
      title={(
        <div>
          <div>
            Choose from the following fields
          </div>
          <div className="sub">All these fields are automatically synced with integrations automatically.</div>
          <div className="sub"> Custom fields are added to additional fields if integrations support it. </div>
        </div>
      )}
      trigger="click"
      open={popoverOpen}
      onOpenChange={(visible) => !visible && setPopoverOpen(visible)}
      arrow={false}
      placement="left"
    >
      <div
        className={`LeadForm__container ${isFocused ? 'focused' : ''}`}
        ref={ref}
      >
        <div className="LeadForm__inner">
          <DragDropContext onDragEnd={rearrangeOption}>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {options.map((option, index) => (
                    <Draggable key={option.uid} draggableId={option.uid + index} index={index}>
                      {(providedInner, snapshotInner) => (
                        <div
                          key={option.uid}
                          {...providedInner.draggableProps}
                          ref={providedInner.innerRef}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Tooltip
                              placement="left"
                              title={<span>Drag to reorder.</span>}
                              overlayStyle={{ fontSize: '0.75rem' }}
                            >
                              <AntdButton
                                type="text"
                                size="small"
                                icon={<HolderOutlined
                                  style={{ opacity: '0.65', fontSize: '14px' }}
                                />}
                                {...providedInner.dragHandleProps}
                              />
                            </Tooltip>
                            <LeadFormOptionComponent
                              key={option.uid}
                              withLeadFormNode={withLeadFormNode}
                              option={option}
                              index={index}
                              options={options}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="LeadForm__footer">
            <Button
              intent="secondary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginLeft: '22px' }}
              onClick={() => setPopoverOpen(true)}
            >
              Add a new field
            </Button>
            <Tooltip title={<LeadFormInfoTooltip options={options} />}>
              <QuestionCircleOutlined />
            </Tooltip>
          </div>

          {!primaryKey && (
            <div
              style={{
                marginTop: '0.75rem',
                display: 'flex',
                gap: '0.25rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
                className="err-line"
              >
                Primary key is not set. If someone submits
                the lead form, the data won't be submitted
              </div>
            </div>
          )}

        </div>
      </div>
    </Popover>
  );
}

interface LeadFormTooltipProps {
  options: Options;
}

function LeadFormInfoTooltip(props: LeadFormTooltipProps): JSX.Element {
  const sampleFormData = props.options.map(option => `"${parseFieldName(option.text)}": "..."`);

  return (
    <div className="lead-form-tooltip">
      <p>For the following placeholder</p>

      <p>
        <span className="select">
          Enter your First Name <code>{'{[firstName]}'}</code>
        </span>
      </p>

      <p>
        Once user enters their first name, the value is assigned to <code style={{ fontWeight: 'bold' }}>{'{[firstName]}'}</code> field
      </p>
      <p>
        Example: When user submits the form the data would look like
      </p>

      {'{'}
      <pre style={{ margin: 0 }}>
        {sampleFormData.map(kv => <div key={kv}>  {kv}</div>)}
      </pre>
      {'}'}
    </div>
  );
}
