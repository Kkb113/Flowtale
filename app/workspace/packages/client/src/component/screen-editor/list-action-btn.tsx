import React, { useState, useEffect, useRef } from 'react';
import {
  EditItem,
} from '../../types';
import * as Tags from './styled';
import { showOrHideEditsFromEl } from './utils/edits';

interface IProps {
  edit: EditItem;
  element: HTMLElement;
}

export default function ListActionBtn({ edit, element }: IProps): JSX.Element {
  const [isShowOriginalState, setIsShowOriginalState] = useState<boolean>(false);
  const editRef = useRef(edit);
  const elementRef = useRef(element);

  useEffect(() => {
    editRef.current = edit;
    elementRef.current = element;
  }, [element, edit]);

  useEffect(() => () => {
    handleShowOriginal(editRef.current, true, elementRef.current);
  }, []);

  const handleShowOriginal = (e: EditItem, isShowOriginal: boolean, el: HTMLElement): void => {
    showOrHideEditsFromEl(e, isShowOriginal, el);
    setIsShowOriginalState(prevState => !prevState);
  };

  return (
    <Tags.ListActionBtn onClick={() => handleShowOriginal(edit, isShowOriginalState, element)}>
      {isShowOriginalState ? 'Show Edited' : 'Show Original'}
    </Tags.ListActionBtn>
  );
}
