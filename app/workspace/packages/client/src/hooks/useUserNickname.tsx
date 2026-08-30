import { useSelector } from 'react-redux';
import { TState } from '../reducer';

const capitalizeFirstChar = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);

export const useUserNickname = (): string => {
  const firstName = useSelector((state: TState) => state.default.principal?.firstName);
  return firstName ? ` ${capitalizeFirstChar(firstName)}` : '';
};
