import { useBasicChat } from "../hooks/useBasicChat";
import { Sender, Bubble } from "@ant-design/x";
import { Bot, User, History, Trash2 } from "lucide-react";
import { Drawer } from "antd";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

function Chat() {
  const endpoint = "/llm/chat/stream";
  const {
    sendValue,
    messages,
    isStreaming,
    abortControllerRef,
    setSendValue,
    setIsStreaming,
    setMessages,
    startStream,
    stopStream,
  } = useBasicChat(endpoint);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // 清理函数：组件卸载时中断请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 将历史记录保存到localStorage中
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);
  // 监听messages变量的变化，在对话结束时保存记录
  useEffect(() => {
    // 只有在非流式传输状态下才保存记录
    if (!isStreaming && messages.length > 0) {
      saveConversationToHistory();
    }
  }, [messages, isStreaming]);
  // 保存当前对话到历史记录
  const saveConversationToHistory = () => {
    if (messages.length > 0) {
      const timestamp = new Date().toLocaleString();

      if (currentConversationId) {
        // 如果当前对话是从历史记录中恢复的，更新该历史记录
        setHistory((prevHistory) => {
          const existingIndex = prevHistory.findIndex(
            (item) => item.id === currentConversationId
          );
          if (existingIndex >= 0) {
            // 更新现有历史记录
            const updatedHistory = [...prevHistory];
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              timestamp: timestamp,
              messages: [...messages],
            };
            return updatedHistory;
          } else {
            // 如果没有找到现有历史记录，创建新的历史记录
            const conversation = {
              id: uuidv4(),
              timestamp: timestamp,
              messages: [...messages],
            };
            return [conversation, ...prevHistory];
          }
        });
      } else {
        // 如果当前对话不是从历史记录中恢复的，创建新的历史记录
        const conversation = {
          id: uuidv4(),
          timestamp: timestamp,
          messages: [...messages],
        };
        setHistory((prevHistory) => [conversation, ...prevHistory]);
      }
    }
  };
  // 恢复历史对话
  const restoreConversation = (conversation) => {
    // 关闭Drawer
    setDrawerVisible(false);

    // 保存当前恢复的对话的uuid
    setCurrentConversationId(conversation.id);

    setIsStreaming(false);

    // 设置历史对话为当前对话
    setMessages(conversation.messages);
  };
  // 删除历史对话
  const deleteConversation = (conversationId) => {
    setHistory((prevHistory) =>
      prevHistory.filter((conversation) => conversation.id !== conversationId)
    );
  };
  return (
    <div className="container mx-auto p-2 h-screen flex flex-col font-sans antialiased">
      {/* History Button */}
      <div className="fixed top-4 right-6 z-10">
        <Button
          variant="ghost"
          onClick={() => setDrawerVisible(true)}
          className="bg-neutral-500 cursor-pointer hover:bg-neutral-600 text-neutral-300"
        >
          <History />
        </Button>
      </div>

      {/* 历史记录Drawer */}
      <Drawer
        title="历史对话记录"
        placement="left"
        closable={true}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {history.length === 0 ? (
          <p className="text-neutral-100 text-center py-4">暂无历史记录</p>
        ) : (
          <div className="space-y-2 pr-2">
            {[...history]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex flex-row justify-between items-center p-3 rounded-lg transition-colors duration-200 cursor-pointer w-full ${
                    conversation.id === currentConversationId
                      ? "bg-blue-300 hover:bg-blue-500"
                      : "bg-neutral-300 hover:bg-neutral-500"
                  }`}
                  onClick={() => restoreConversation(conversation)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.messages[0]?.content.slice(0, 20)}
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
                      className="text-neutral-700 hover:text-red-600 hover:bg-red-900/10 p-1"
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
      </Drawer>
      <div className="flex flex-col gap-4 h-11/12">
        <div className="flex-1 w-full h-full overflow-y-auto rounded-lg shadow p-6">
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => {
              if (message.role === "assistant") {
                return (
                  <Bubble
                    key={i}
                    placement="start"
                    content={message.content}
                    avatar={{
                      icon: <Bot />,
                      style: { background: "#1d3acdff" },
                    }}
                    loading={message.status === "loading"}
                  />
                );
              } else {
                return (
                  <Bubble
                    key={i}
                    placement="end"
                    content={message.content}
                    avatar={{
                      icon: <User />,
                      style: { background: "#87d068" },
                    }}
                  />
                );
              }
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 justify-center items-center w-full mt-2 h-1/12 bg-white rounded-lg shadow p-4 z-10">
        <Sender
          submitType="shiftEnter"
          value={sendValue}
          onChange={(v) => {
            setSendValue(v);
          }}
          placeholder="Press Shift + Enter to send message"
          loading={isStreaming}
          onSubmit={() => {
            startStream();
          }}
          onCancel={() => {
            stopStream();
          }}
        />
      </div>
    </div>
  );
}

export default Chat;
