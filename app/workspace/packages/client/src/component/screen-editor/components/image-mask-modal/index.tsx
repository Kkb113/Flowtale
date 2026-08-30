import React, { useRef } from 'react';
import * as Tags from './styled';
import Button from '../../../button';
import * as GTags from '../../../../common-styled';
import FileInput from '../../../file-input';
import SelectInput from '../../../select-input';

interface Props {
  open: boolean;
  onCancel: () => void;
  uploadImgMask: (maskImgFile: File) => Promise<void>;
  isUploading: boolean;
  error: string;
}

export default function ImageMaskUploadModal({
  open,
  onCancel,
  uploadImgMask,
  isUploading,
  error
}: Props): JSX.Element {
  return (
    <GTags.BorderedModal
      open={open}
      title=""
      onCancel={onCancel}
      onOk={() => { }}
      style={{ position: 'relative', height: '10px' }}
      footer={null}
    >
      <div>
        <h2 className="typ-h2">Upload Image Mask</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const maskImgFile = formData.get('maskImg') as File;
            uploadImgMask(maskImgFile);
          }}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <FileInput
            id="screen-img"
            accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
            name="maskImg"
            style={{ marginBottom: '1.5rem' }}
            required
          />

          {/* <SelectInput
            id="resolution"
            defaultValue="480"
            options={[{ label: '480p', value: '480' }, { label: '720p', value: '720' }]}
            onChange={e => selectResolutionIpValRef.current = e}
            label="Select resolution"
          /> */}

          <div className="button-two-col-cont">
            <Button
              type="button"
              intent="secondary"
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              style={{ flex: 1 }}
              disabled={isUploading}
            >
              {isUploading ? 'Saving' : 'Save'}
            </Button>
          </div>
          <Tags.ErrorMsg>
            {error}
          </Tags.ErrorMsg>
        </form>
      </div>
    </GTags.BorderedModal>
  );
}
