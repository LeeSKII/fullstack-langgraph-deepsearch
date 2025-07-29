import { memo } from "react";
import ReactJson from "react-json-view";

const JsonRender = memo(({ data }) => {
  return (
    <ReactJson
      name={false}
      theme="summerfruit"
      displayDataTypes={false}
      src={data}
      indentWidth={2}
      collapsed={2}
      sortKeys
    />
  );
});

export default JsonRender;
