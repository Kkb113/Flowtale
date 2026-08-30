import React, { useEffect, useState } from 'react';
import FableCircularLogo from '../../assets/form/logo_fable_circular.svg';
import StarImg from '../../assets/form/star.svg';
import * as Tags from './styled';
import AnswerBtn from './answer-btn';

export interface IFormData {
  id: string,
  title?: string,
  question: string,
  answers: {id: string, value:string}[]
}

export interface QualificationDecision {
  default: string;
  options: Record<string, string>
}

export interface Contact {
  email: string;
  text: string;
}

interface IProps {
  descision: QualificationDecision;
  form: IFormData[];
  formHeader: string;
  contact?: Contact;
}

function QualificationQuestion({ form, descision, formHeader, contact }: IProps): JSX.Element {
  const [currStep, setCurrStep] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<string>('');

  useEffect(() => {
    if (selectedOptions !== '' && selectedOptions.split(':').length === form.length) {
      const demoUrl: string = descision.options[selectedOptions]
        ? descision.options[selectedOptions]
        : descision.default;
      window.open(demoUrl, '_self');
    }
  }, [selectedOptions]);

  return (
    <Tags.QBuilderContainer>
      <Tags.SectionTop>
        <img src={FableCircularLogo} alt="Fable circular logo" />
        <div>
          <p>{formHeader}</p>
          { contact && (
            <p>
              <a href={`mailto:${contact.email}`} target="_blank" rel="noreferrer">{contact.text}</a>
            </p>
          )}
        </div>
      </Tags.SectionTop>
      <Tags.FormContainer
        key={currStep}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tags.FormHeaderCon>
          <p
            style={{ position: 'relative' }}
          >
            {form[currStep].title || ''}
            {form[currStep].title && <img src={StarImg} alt="Star" />}
          </p>
          <p>
            {form[currStep].question}
          </p>
        </Tags.FormHeaderCon>
        <Tags.FormQueCon>
          {form[currStep].answers.map(({ id, value }) => (
            <AnswerBtn
              key={id}
              text={value}
              onClick={() => {
                setCurrStep(prvStep => (form.length - 1 > prvStep ? prvStep + 1 : prvStep));
                setSelectedOptions(p => ((p.length === 0) ? `${id}` : `${p}:${id}`));
              }}
            />
          ))}
        </Tags.FormQueCon>
        <Tags.Curve>
          <Tags.Oval />
        </Tags.Curve>
      </Tags.FormContainer>
    </Tags.QBuilderContainer>
  );
}

export default QualificationQuestion;
