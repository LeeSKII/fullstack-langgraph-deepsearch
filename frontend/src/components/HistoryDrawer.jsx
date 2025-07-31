import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

const truncateTitle = (title, maxLength = 20) => {
  if (!title) return "空对话";
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + "...";
};

export const HistoryDrawer = ({
  drawerVisible,
  setDrawerVisible,
  history,
  restoreConversation,
  deleteConversation,
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-20 flex transition-opacity duration-300 ${
          drawerVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${
            drawerVisible ? "opacity-50" : "opacity-0"
          }`}
          onClick={() => setDrawerVisible(false)}
        />
        <div
          className={`relative text-white ml-auto w-full max-w-md h-full bg-neutral-900 shadow-2xl border-l border-neutral-700 overflow-y-auto transition-transform duration-300 ease-in-out ${
            drawerVisible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
            <h2 className="text-lg font-bold">历史记录</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrawerVisible(false)}
              className="text-neutral-400 hover:text-white"
            >
              关闭
            </Button>
          </div>
          <div className="p-4 h-[calc(100vh-80px)]">
            <ScrollArea className="h-full">
              {history.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">
                  暂无历史记录
                </p>
              ) : (
                <div className="space-y-2 pr-2">
                  {[...history]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex flex-row justify-between items-center p-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 transition-colors duration-200 cursor-pointer w-full"
                      onClick={() => restoreConversation(conversation)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {truncateTitle(conversation.messages[0]?.content)}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {conversation.timestamp}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
};
