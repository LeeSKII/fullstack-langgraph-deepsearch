import { useState, useEffect, useRef, useCallback } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChatMessagesView } from "./components/ChatMessagesView";
import { Button } from "./components/ui/button";
import { History } from "lucide-react";
import { HistoryDrawer } from "./components/HistoryDrawer";
import {
  saveConversationToHistory,
  handleNewSearch,
  restoreConversation,
  deleteConversation,
  startStream,
  parseEventData,
  handleErrorEvent,
  handleCustomEvent,
  handleMessagesEvent,
  processEvent,
  stopStream,
  handleSubmit,
  handleCancel
} from "./lib/homeHelpers";

const Home = () => {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([]); //步骤，keys:node,data
  const [streamMessage, setStreamMessage] = useState("");
  const [currentNode, setCurrentNode] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const abortControllerRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // 将历史记录保存到localStorage中
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);

  // 监听messages变量的变化，在对话结束时保存记录
  useEffect(() => {
    // 只有在非流式传输状态下才保存记录
    if (!isStreaming && messages.length > 0) {
      saveConversationToHistory(messages, currentConversationId, setHistory);
    }
  }, [messages, isStreaming]);

  // 清理函数：组件卸载时中断请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);


  return (
    <>
      {/* History Button */}
      <div className="fixed top-4 right-6 z-10">
        <Button
          variant="ghost"
          onClick={() => setDrawerVisible(true)}
          className="bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
        >
          <History />
          历史记录
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
        <main className="h-full w-full sm:max-w-4xl mx-auto relative">
          {messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={(inputValue, effort, model) => handleSubmit(
                inputValue,
                effort,
                model,
                (inputValue, effort, model) => startStream(
                  inputValue,
                  effort,
                  model,
                  messages,
                  setError,
                  setSteps,
                  setMessages,
                  setStreamMessage,
                  setIsStreaming,
                  abortControllerRef,
                  parseEventData,
                  handleErrorEvent,
                  handleMessagesEvent,
                  handleCustomEvent,
                  processEvent,
                  setCurrentNode,
                  steps
                )
              )}
              onCancel={() => handleCancel(() => stopStream(
                abortControllerRef,
                setIsStreaming,
                setMessages,
                streamMessage
              ))}
              isLoading={isStreaming}
              query={query}
              setQuery={setQuery}
            />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl text-red-400 font-bold">Error</h1>
                <p className="text-red-400">{JSON.stringify(error)}</p>

                <Button
                  variant="destructive"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <ChatMessagesView
              messages={messages}
              streamMessage={streamMessage}
              isLoading={isStreaming}
              scrollAreaRef={scrollAreaRef}
              onSubmit={(inputValue, effort, model) => handleSubmit(
                inputValue,
                effort,
                model,
                (inputValue, effort, model) => startStream(
                  inputValue,
                  effort,
                  model,
                  messages,
                  setError,
                  setSteps,
                  setMessages,
                  setStreamMessage,
                  setIsStreaming,
                  abortControllerRef,
                  parseEventData,
                  handleErrorEvent,
                  handleMessagesEvent,
                  handleCustomEvent,
                  processEvent,
                  setCurrentNode,
                  steps
                )
              )}
              onCancel={() => handleCancel(() => stopStream(
                abortControllerRef,
                setIsStreaming,
                setMessages,
                streamMessage
              ))}
              liveActivityEvents={steps}
              onNewSearch={() => handleNewSearch(
                () => saveConversationToHistory(messages, currentConversationId, setHistory),
                messages,
                setCurrentConversationId,
                setSteps,
                setMessages,
                setStreamMessage,
                setIsStreaming,
                setCurrentNode,
                setError,
                setQuery
              )}
              query={query}
              setQuery={setQuery}
            />
          )}
        </main>
      </div>

      {/* History Drawer */}
      <HistoryDrawer
        drawerVisible={drawerVisible}
        setDrawerVisible={setDrawerVisible}
        history={history}
        restoreConversation={(conversation) => restoreConversation(
          conversation,
          setDrawerVisible,
          setCurrentConversationId,
          setSteps,
          setIsStreaming,
          setCurrentNode,
          setError,
          setMessages,
          setStreamMessage
        )}
        deleteConversation={(conversationId) => deleteConversation(
          conversationId,
          setHistory
        )}
      />
    </>
  );
};

export default Home;
