import React, { FormEvent, useState } from 'react';
import { TourData } from '@fable/common/dist/types';
import { validate } from './utils';

export default function Healthcheck(): JSX.Element {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setChecked(false);
    if (!isValidJson(jsonInput)) {
      setErrors(['The format of the JSON file is not correct. It is invalid.']);
      setChecked(true);
      return;
    }
    setErrors(validate(JSON.parse(jsonInput) as TourData));
    setChecked(true);
  };

  function formatAndSetJSON(str: string): void {
    if (!isValidJson(str)) {
      setJsonInput(str);
      return;
    }
    setJsonInput(JSON.stringify(JSON.parse(str), null, 2));
  }

  function isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <textarea
          value={jsonInput}
          onChange={e => formatAndSetJSON(e.target.value)}
          style={{ width: '90vw', height: '60vh' }}
        />
        <button type="submit" style={{ display: 'block' }}>Validate</button>
      </form>

      {
        checked && (
          <div>
            <div>{errors.length === 0 && 'Valid Tour JSON'}</div>
            <div>{errors.length > 0 && (
            <div>
              <p>Invalid JSON</p>
              <p>These are the errors: </p>
              <ul>
                {
            errors.map((error, idx) => <li key={idx}>{error}</li>)
            }
              </ul>
            </div>
            )}
            </div>
          </div>
        )
      }
    </>
  );
}
