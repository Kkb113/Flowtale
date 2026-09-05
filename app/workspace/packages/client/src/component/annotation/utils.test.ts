import { validateInput } from './utils';

jest.mock('nanoid', () => ({ nanoid: () => 'fixture' }));

const field = (): HTMLDivElement => {
  const element = document.createElement('div');
  element.setAttribute('fable-x-f-vfn', 'email');
  element.setAttribute('fable-input-field-uid', 'fixture');
  element.innerHTML = '<input class="LeadForm__optionInputInAnn" fable-lead-form-field-name="email">'
    + '<div fable-validation-uid="fixture"></div>';
  return element;
};

it('rejects empty and malformed required email fields and accepts a valid value', () => {
  const element = field();
  expect(validateInput(element).isValid).toBe(false);
  element.querySelector('input')!.value = 'invalid';
  expect(validateInput(element).isValid).toBe(false);
  element.querySelector('input')!.value = ' fixture@example.test ';
  expect(validateInput(element)).toEqual({ isValid: true, fieldName: 'email', fieldValue: 'fixture@example.test' });
});

it.each(['unknown-validator', 'missing-input', 'unsafe-name'])('blocks malformed legacy form %s without throwing', defect => {
  const element = field();
  element.querySelector('input')!.value = 'fixture@example.test';
  if (defect === 'unknown-validator') element.setAttribute('fable-x-f-vfn', 'unknown');
  if (defect === 'missing-input') element.querySelector('input')!.remove();
  if (defect === 'unsafe-name') element.querySelector('input')!.setAttribute('fable-lead-form-field-name', '__proto__');
  expect(validateInput(element).isValid).toBe(false);
  expect((element.querySelector('[fable-validation-uid]') as HTMLDivElement).innerText)
    .toBe('This form field needs to be updated by the demo owner.');
});
