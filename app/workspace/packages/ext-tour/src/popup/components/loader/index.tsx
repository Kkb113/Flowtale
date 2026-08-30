import React, { useRef, useEffect } from "react";
import loader from "@fable/common/dist/loader";
import { sleep } from "@fable/common/dist/utils";

interface Props {}

/*
 * TODO this component is exactly same as client's component/loader. Try to
 *      see if we could move it to common
 */

export default function Loader(props: Props) {
  const conRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const con = conRef?.current;
    if (!con) {
      return () => {};
    }

    let timer: NodeJS.Timeout | null = null;
    let p: Promise<void>;
    (function continuousLoader() {
      timer = setTimeout(async () => {
        p = loader(con!, 600, 500, 400, "", { height: "6px", zIndex: "0" });
        await p;
        await sleep(100);
        continuousLoader();
      }, 16);
    }());

    return async () => {
      p && (await p);
      timer && clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "10px",
        marginTop: "1rem",
        overflow: "hidden",
        position: "relative",
      }}
      ref={conRef}
    />
  );
}
