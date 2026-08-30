import React from "react";
import "../../index.less";

interface Props {
  stopBtnText: string,
  deleteBtnText: string,
}

function DisabledStopDelActionBtns(props: Props) {
  return (
    <>
      <button type="button" className="btn-primary" disabled>
        {props.stopBtnText}
      </button>
      <button type="button" className="btn-secondary" disabled>
        {props.deleteBtnText}
      </button>
    </>
  );
}

export default DisabledStopDelActionBtns;
