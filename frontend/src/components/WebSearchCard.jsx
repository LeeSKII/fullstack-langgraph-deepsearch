import { memo } from "react";

// 搜索结果卡片组件
const WebSearchCard = memo(({ url, title, content }) => {
  return (
    <div className="border rounded-lg p-4 mb-4 h-40 overflow-y-auto bg-white shadow hover:shadow-md transition-shadow duration-200">
      <a
        href={url}
        className="text-blue-600 hover:underline break-all"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h4 className="text-lg font-semibold mb-2 hover:text-blue-700 transition-colors duration-200">
          {title}
        </h4>
      </a>
      <p className="mt-2 text-gray-600 text-sm">
        {content.substring(0, 100)}
      </p>
    </div>
  );
});

export default WebSearchCard;