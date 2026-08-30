import React, { useState } from 'react';
import { uploadImgFileObjectToAws } from '../upload-media-to-aws';

const useUploadFileToAws = (): { uploadFile: (file: File) => Promise<string>, loading: boolean } => {
  const [isLoading, setIsLoading] = useState(false);

  const uploadFile = async (file: File): Promise<string> => {
    setIsLoading(true);

    try {
      const uploadUrl = await uploadImgFileObjectToAws(file);
      setIsLoading(false);
      return uploadUrl?.cdnUrl || '';
    } catch (e) {
      setIsLoading(false);
    }
    return '';
  };

  return { uploadFile, loading: isLoading };
};

export default useUploadFileToAws;
