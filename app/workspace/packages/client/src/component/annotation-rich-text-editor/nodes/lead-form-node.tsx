/* eslint-disable class-methods-use-this */

import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';
import { getRandomId } from '@fable/common/dist/utils';
import { FABLE_LEAD_FORM_FIELD_NAME, FABLE_LEAD_FORM_ID, FABLE_LEAD_FORM_VALIDATION_FN } from '../../../constants';
import {
  LeadFormField,
  LeadFormFieldAutocompleteType,
  OPTION_INPUT_CLASSNAME,
  OPTION_INPUT_IS_OPTIONAL,
  removeFieldNameDefinition
} from '../utils/lead-form-node-utils';
import { parseFieldName } from '../../annotation/utils';
import { rearrangeArray } from '../../../utils';
import { LeadFormPropertyType } from './lead-form-component';

export type Options = ReadonlyArray<Option>;

export type Option = Readonly<{
  text: string;
  uid: string;
  type: LeadFormField;
  autocompleteType: LeadFormFieldAutocompleteType;
  property: LeadFormPropertyType;
  calculatedValue: string;
}>;

const LeadFormComponent = React.lazy(() => import('./lead-form-component'));

export function createLeadFormOption(
  text = '',
  type: LeadFormField = 'text',
  autocompleteType: LeadFormFieldAutocompleteType = 'on',
  property = LeadFormPropertyType.None,
  calculatedValue = '',
): Option {
  return {
    text,
    uid: getRandomId(),
    type,
    autocompleteType,
    property,
    calculatedValue,
  };
}

function cloneOption(
  option: Option,
  text: string,
): Option {
  return {
    text,
    uid: option.uid,
    type: option.type,
    autocompleteType: option.autocompleteType,
    property: option.property,
    calculatedValue: option.calculatedValue,
  };
}

export type SerializedLeadFormNode = Spread<
  {
    options: Options;
  },
  SerializedLexicalNode
>;

function convertLeadFormElement(domNode: HTMLElement): DOMConversionOutput | null {
  const options = domNode.getAttribute('data-lexical-lead-form-options');
  if (options !== null) {
    const node = $createLeadFormNode(JSON.parse(options));
    return { node };
  }
  return null;
}

export class LeadFormNode extends DecoratorNode<JSX.Element> {
  __options: Options;

  static getType(): string {
    return 'lead-form';
  }

  static clone(node: LeadFormNode): LeadFormNode {
    return new LeadFormNode(node.__options, node.__key);
  }

  static importJSON(serializedNode: SerializedLeadFormNode): LeadFormNode {
    const node = $createLeadFormNode(
      serializedNode.options,
    );
    serializedNode.options.forEach(node.addOption);
    return node;
  }

  constructor(options: Options, key?: NodeKey) {
    super(key);
    this.__options = options;
  }

  exportJSON(): SerializedLeadFormNode {
    return {
      options: this.__options,
      type: 'lead-form',
      version: 1,
    };
  }

  addOption(option: Option): void {
    const self = this.getWritable();
    const options = Array.from(self.__options);
    options.unshift(option);
    self.__options = options;
  }

  rearrangeOptions(sourceIndex: number, destinationIndex: number): void {
    const self = this.getWritable();
    const options = Array.from(self.__options);
    self.__options = rearrangeArray(options, sourceIndex, destinationIndex);
  }

  deleteOption(option: Option): void {
    const self = this.getWritable();
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options.splice(index, 1);
    self.__options = options;
  }

  setOptionText(option: Option, text: string): void {
    const self = this.getWritable();
    const clonedOption = cloneOption(option, text);
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  changePropertyType(option: Option, property: LeadFormPropertyType): void {
    const self = this.getWritable();
    const clonedOption: Option = { ...option, property };
    const options = Array.from(self.__options);

    if (property === LeadFormPropertyType.PrimaryKey) {
      const previousPrimaryKey = options.find(opt => opt.property === LeadFormPropertyType.PrimaryKey);
      if (previousPrimaryKey) {
        const index = options.indexOf(previousPrimaryKey);
        options[index] = { ...previousPrimaryKey, property: LeadFormPropertyType.None };
      }
    }

    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  updateOptions(options: Options): void {
    const self = this.getWritable();
    self.__options = options;
  }

  changeCalculatedFieldValue(option: Option, calculatedValue: string): void {
    const self = this.getWritable();
    const clonedOption: Option = { ...option, calculatedValue };
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-lead-form-options')) {
          return null;
        }

        return {
          conversion: convertLeadFormElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const container = document.createElement('span');
    const innerCon = document.createElement('span');

    container.appendChild(innerCon);

    container.setAttribute(
      'data-lexical-lead-form-options',
      JSON.stringify(this.__options),
    );

    container.classList.add('LeadForm__container');
    container.setAttribute('id', FABLE_LEAD_FORM_ID);

    innerCon.classList.add('LeadForm__inner');

    for (const option of this.__options) {
      const optionCon = document.createElement('span');
      const optionInputWrapper = document.createElement('span');
      const optionInputValidationWrapper = document.createElement('span');
      const optionInput = document.createElement('input');

      optionCon.classList.add('LeadForm__optionContainer');
      optionCon.setAttribute('fable-input-field-uid', option.uid);
      optionCon.setAttribute(FABLE_LEAD_FORM_VALIDATION_FN, option.type);
      innerCon.appendChild(optionCon);

      optionInputValidationWrapper.innerText = 'Error msg';
      optionInputValidationWrapper.classList.add('LeadForm__inputValidation');
      optionInputValidationWrapper.setAttribute('fable-validation-uid', option.uid);

      optionInputWrapper.classList.add('LeadForm__optionInputWrapper');
      optionCon.appendChild(optionInputWrapper);
      optionCon.appendChild(optionInputValidationWrapper);

      const fieldName = parseFieldName(option.text);

      optionInput.classList.add(OPTION_INPUT_CLASSNAME);
      optionInput.setAttribute('fable-input-uid', option.uid);
      optionInput.setAttribute(FABLE_LEAD_FORM_FIELD_NAME, fieldName);
      optionInput.type = 'text';
      optionInput.placeholder = removeFieldNameDefinition(option.text);

      if (option.property === LeadFormPropertyType.CalculatedField) {
        optionInput.setAttribute('value', option.calculatedValue);
        optionCon.style.display = 'none';
      }

      if (option.property === LeadFormPropertyType.Optional) {
        optionInput.classList.add(OPTION_INPUT_IS_OPTIONAL);
      }

      const autocompleteType = option.autocompleteType;
      if (autocompleteType && autocompleteType !== 'on') {
        optionInput.id = autocompleteType;
        optionInput.name = autocompleteType;
        optionInput.autocomplete = autocompleteType;
      } else {
        optionInput.id = parseFieldName(option.text);
        optionInput.name = fieldName;
        optionInput.autocomplete = 'on';
      }

      optionInputWrapper.appendChild(optionInput);
    }

    return { element: container };
  }

  createDOM(): HTMLElement {
    const elem = document.createElement('span');
    elem.style.display = 'inline-block';
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <LeadFormComponent
          options={this.__options}
          nodeKey={this.__key}
        />
      </Suspense>
    );
  }
}

export function $createLeadFormNode(options: Options): LeadFormNode {
  return new LeadFormNode(options);
}

export function $isLeadFormNode(
  node: LexicalNode | null | undefined,
): node is LeadFormNode {
  return node instanceof LeadFormNode;
}
