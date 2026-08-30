import api from '@fable/common/dist/api';
import {
  ApiResp,
  RespOrg,
  ResponseStatus
} from '@fable/common/dist/api-contract';

export const getAllUserOrgs = async (): Promise<RespOrg[] | null> => {
  const data = await api<null, ApiResp<RespOrg[]>>('/orgsfruser', {
    auth: true,
  });

  if (data.status === ResponseStatus.Success) {
    return data.data;
  }

  return null;
};
