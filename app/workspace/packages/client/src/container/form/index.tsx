import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Tags from './styled';
import QualificationQuestion, {
  Contact,
  IFormData,
  QualificationDecision
} from '../../component/form/qualification-question';
import HeartLoader from '../../component/loader/heart';

type FullFormData = Record<string, {
  formHeader: string;
  contact?: Contact;
  qualificationCriteria: Array<IFormData>;
  qualificationDecision: QualificationDecision;
}>

function Form() {
  const params = useParams<{formId: string}>();
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [formData, setFormData] = useState<FullFormData | null>(null);

  useEffect(() => {
    (async () => {
      const resp = await fetch(`https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/root/form-data/manual_form_data.json?ts=${+new Date()}`);
      const data = await resp.json() as FullFormData;
      setDataLoaded(true);
      setFormData(data);
    })();
  }, []);

  if (!isDataLoaded) {
    return (<HeartLoader />);
  }

  const {
    qualificationDecision,
    qualificationCriteria,
    formHeader,
    contact
  } = formData![params.formId!];

  return (
    <Tags.FormContainer>
      <QualificationQuestion
        formHeader={formHeader}
        form={qualificationCriteria}
        descision={qualificationDecision}
        contact={contact}
      />
    </Tags.FormContainer>
  );
}

export default Form;
