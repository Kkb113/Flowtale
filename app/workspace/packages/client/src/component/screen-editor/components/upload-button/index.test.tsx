import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import UploadButton from '.';

describe('UploadButton', () => {
  it('should render the button label correctly', () => {
    const accept = '.jpg,.png';
    const onChange = jest.fn();

    const { getByText } = render(
      <UploadButton accept={accept} onChange={onChange} />
    );

    const uploadButton = getByText('Click to upload');
    expect(uploadButton).toBeInTheDocument();
  });

  it('should call the onChange event handler when a file is selected', () => {
    const accept = '.jpg,.png';
    const onChange = jest.fn();

    const { getByLabelText } = render(
      <UploadButton accept={accept} onChange={onChange} />
    );

    const fileInput = getByLabelText('Click to upload');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['test'], 'test.png', { type: 'image/png' })
        ]
      }
    });

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.files[0].name).toBe('test.png');
  });
});
