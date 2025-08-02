import { memo } from "react";

// 搜索结果卡片组件
const WebSearchCard = memo(({ url, title, content }) => {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="border border-neutral-600 rounded-lg p-3 mb-2 h-36 overflow-hidden bg-neutral-800 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer hover:bg-neutral-750"
      onClick={handleClick}
    >
      <h4 className="text-sm font-medium mb-1 text-neutral-300">
        {title}
      </h4>
      <p className="mt-1 text-neutral-400 text-xs">
        {content.substring(0, 100)}
      </p>
    </div>
  );
});

export default WebSearchCard;