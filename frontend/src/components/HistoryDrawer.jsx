import { Button } from "./ui/button";
import { useState, useEffect } from "react";

export const HistoryDrawer = ({ 
  drawerVisible, 
  setDrawerVisible, 
  history, 
  restoreConversation 
}) => {
  return (
    <>
      {drawerVisible && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setDrawerVisible(false)}
          />
          <div className="relative ml-auto w-full max-w-md h-full bg-neutral-800 shadow-xl overflow-y-auto">
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
            <div className="p-4">
              {history.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">暂无历史记录</p>
              ) : (
                <div className="space-y-2">
                  {history.map((conversation) => (
                    <div 
                      key={conversation.id}
                      className="p-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 cursor-pointer transition-colors duration-200"
                      onClick={() => restoreConversation(conversation)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conversation.messages[0]?.content || "空对话"}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {conversation.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};