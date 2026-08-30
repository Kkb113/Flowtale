import React, { useEffect, useState } from 'react';
import { $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  LexicalCommand,
  $createParagraphNode,
  createCommand,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createImageNode, ImagePayload } from '../nodes/image-node';
import { uploadImgFileObjectToAws } from '../../../upload-media-to-aws';
import * as GTags from '../../../common-styled';
import Button from '../../button';
import FileInput from '../../file-input';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

interface ImageUploadPluginProps {
  isModalOpen: boolean;
  modalControls: {
    showModal: () => void;
    handleOk: () => void;
    handleCancel: () => void;
  }
}

export default function ImageUploadPlugin({ isModalOpen, modalControls }: ImageUploadPluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [imgUrl, setImgUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => mergeRegister(
    editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    )
  ), [editor]);

  const handleOk = (): void => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: '', src: imgUrl } as InsertImagePayload);
    setImgUrl('');
    modalControls.handleOk();
  };

  const handleCancel = (): void => {
    setImgUrl('');
    modalControls.handleCancel();
  };

  const handleSelectedImageChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    setIsUploading(true);
    const selectedImage = e.target.files![0];
    if (!selectedImage) {
      setIsUploading(false);
      return;
    }
    const imageUrl = await uploadImgFileObjectToAws(selectedImage);
    if (!imageUrl) return;
    setImgUrl(imageUrl.cdnUrl);
    setIsUploading(false);
  };

  return (
    <GTags.BorderedModal
      style={{ height: '10px' }}
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={(
        <div className="button-two-col-cont">
          <Button
            type="button"
            intent="secondary"
            onClick={handleCancel}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            style={{ flex: 1 }}
            onClick={handleOk}
            disabled={Boolean(isUploading || !imgUrl)}
          >
            {isUploading ? 'Uploading' : 'Insert'}
          </Button>
        </div>
      )}
    >

      <div className="modal-content-cont">
        <div className="modal-title">Insert Image</div>
        <FileInput
          style={{ marginTop: '1rem' }}
          onChange={handleSelectedImageChange}
          accept="image/png, image/gif, image/jpeg, image/webp, image/svg+xml"
        />
      </div>
    </GTags.BorderedModal>
  );
}
