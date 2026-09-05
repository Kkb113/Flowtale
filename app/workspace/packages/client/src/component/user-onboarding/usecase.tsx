import { ArrowRightOutlined } from '@ant-design/icons';
import { Alert, Button as AntdBtn, message } from 'antd';
import { CheckboxValueType } from 'antd/es/checkbox/Group';
import React, { useEffect, useRef, useState } from 'react';
import { OurCheckbox } from '../../common-styled';
import * as Tags from './styled';
import Button from '../button';
import Input from '../input';

interface Props {
  updateUseCasesForOrg: (useCases: string[], othersText: string) => Promise<void>;
  onSubmit: () => void
}

interface CheckboxOptionProps {
  title: string;
  description: string;
  badge?: string;
}

function CheckboxOption(props: CheckboxOptionProps): JSX.Element {
  return (
    <>
      <div className="typ-reg" style={{ fontWeight: 600 }}>
        <span>
          {props.title}
        </span>
        {props.badge && (
          <span className="optn-badge">
            {props.badge}
          </span>
        )}
      </div>
      <div className="typ-sm">{props.description}</div>
    </>
  );
}

const options = [
  {
    label: <CheckboxOption
      title="Marketing"
      badge="3x lead conversion"
      description="Embed interactive tools in your website to generate more leads"
    />,
    value: 'marketing',
  },
  {
    label: <CheckboxOption
      title="Sales"
      badge="2x sales velocity"
      description="Share interactive demos with prospects to close more deals"
    />,
    value: 'sales',
  },
  {
    label: <CheckboxOption
      title="Customer Success"
      badge="50% faster onboarding"
      description="Embed interactive how-to guides in knowledge base"
    />,
    value: 'customer-success',
  },
  {
    label: <CheckboxOption
      title="Product"
      badge="25% increased adoption"
      description="Share product updates and feature releases with ease"
    />,
    value: 'product',
  },
];

export default function Usecase(props: Props): JSX.Element {
  const [showOthersOption, setShowOthersOption] = useState(false);
  const [others, setOthers] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [messageApi, contextHolder] = message.useMessage();

  const handleChange = (checkedValue: CheckboxValueType[]): void => {
    setSelectedOptions(checkedValue.map(val => val.toString()));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (pending.current) return;
    const submittedOthers = showOthersOption ? others.trim() : '';

    if (!selectedOptions.length && !submittedOthers) {
      messageApi.open({
        type: 'error',
        content: 'At least one selection is mandatory',
      });

      return;
    }

    pending.current = true;
    setError(null);
    setIsLoading(true);
    try {
      await props.updateUseCasesForOrg(selectedOptions, submittedOthers);
      if (mounted.current) props.onSubmit();
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Your choices could not be saved.');
    } finally {
      pending.current = false;
      if (mounted.current) setIsLoading(false);
    }
  };

  const handleSkip = (): void => {
    props.onSubmit();
  };

  return (
    <Tags.UsecaseCon>
      {contextHolder}
      {error && <Alert type="error" showIcon message="Your choices could not be saved" description={error} />}
      <div
        className="typ-h1"
        style={{
          fontWeight: 600
        }}
      >How & where would you like to use Fable?
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          width: '90%',
          flexDirection: 'column',
          flex: '1 1 auto',
          justifyContent: 'space-around',
        }}
      >
        <OurCheckbox.Group options={options} onChange={handleChange} />

        <OurCheckbox
          checked={showOthersOption}
          onChange={e => setShowOthersOption(e.target.checked)}
          style={{ transform: `translate(0px, ${showOthersOption ? 0 : -28}px)` }}
        >
          <CheckboxOption title="Others" description="" />
        </OurCheckbox>

        {showOthersOption && (
          <div
            style={{
              marginLeft: '1.5rem',
              marginTop: '0.15rem',
            }}
          >
            <Input
              label="Enter other usecases"
              value={others}
              onChange={e => setOthers(e.target.value)}
            />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: '1.25rem',
            alignItems: 'center'
          }}
        >
          <AntdBtn
            style={{
              color: 'gray',
            }}
            type="link"
            onClick={handleSkip}
            disabled={isLoading}
          >Skip
          </AntdBtn>
          <Button
            type="submit"
            style={{
              flex: '1 1 auto'
            }}
            disabled={isLoading}
            icon={<ArrowRightOutlined />}
          >{isLoading ? 'Loading...' : 'Start for free'}
          </Button>
        </div>
      </form>
    </Tags.UsecaseCon>
  );
}
