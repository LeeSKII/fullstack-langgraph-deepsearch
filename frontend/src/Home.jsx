import { useState, useEffect, useRef, useCallback } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChatMessagesView } from "./components/ChatMessagesView";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";

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
  const [loadingConversationId, setLoadingConversationId] = useState(null);
  const abortControllerRef = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const scrollAreaRef = useRef(null);

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

  // 清理函数：组件卸载时中断请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (currentNode === "assistant_node") {
      setOpenStatus(false);
    }
  }, [currentNode]);

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

  const handleNewSearch = () => {
    // 保存当前对话到历史记录
    saveConversationToHistory();

    // 清空当前恢复的对话的uuid
    setCurrentConversationId(null);

    setSteps([]);
    setMessages([]);
    setStreamMessage("");
    setIsStreaming(false);
    setCurrentNode("");
    setError(null);
    setQuery("");
  };

  // 恢复历史对话
  const restoreConversation = (conversation) => {
    // 关闭Drawer
    setDrawerVisible(false);

    // 保存当前恢复的对话的uuid
    setCurrentConversationId(conversation.id);

    // 清空当前状态
    setSteps([]);
    setIsStreaming(false);
    setCurrentNode("");
    setError(null);

    // 设置历史对话为当前对话
    setMessages(conversation.messages);

    // 将最后一条assistant的消息设置为streamMessage
    const lastAssistantMessage = conversation.messages
      .filter((msg) => msg.type === "ai")
      .pop();
    setStreamMessage(lastAssistantMessage ? lastAssistantMessage.content : "");
  };

  // 开始流式传输函数
  const startStream = async (inputValue, effort, model) => {
    if (!inputValue.trim()) {
      setError("查询不能为空");
      return;
    }

    // 重置状态
    setError(null);
    setSteps([]);
    setOpenStatus(true);
    setMessages((prev) => {
      return [
        ...prev,
        { type: "human", content: inputValue },
        { type: "ai", content: "Researching...", status: "loading" },
      ];
    });
    setStreamMessage("");
    setIsStreaming(true);

    try {
      // 创建中断控制器
      abortControllerRef.current = new AbortController();

      const response = await fetch("/llm/deep/search/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: inputValue, messages, effort, model }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported");
      }

      // 创建流式读取器
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // 解码并处理数据块
        buffer += decoder.decode(value, { stream: true });

        // 处理完整的SSE事件 (以\n\n分隔)
        let eventEndIndex;
        while ((eventEndIndex = buffer.indexOf("\n\n")) !== -1) {
          const eventData = buffer.substring(0, eventEndIndex);
          buffer = buffer.substring(eventEndIndex + 2);
          // console.log(eventData);
          processEvent(eventData);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Streaming error:", err);
        setError(err.message || "流式传输失败");
      }
    } finally {
      setIsStreaming(false);
      if (!error) {
        setQuery("");
      }
      abortControllerRef.current = null;
    }
  };

  // 解析事件数据函数
  const parseEventData = (eventData) => {
    const lines = eventData.split("\n");
    let eventType = "messages";
    let data = null;

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.replace("event:", "").trim();
      } else if (line.startsWith("data:")) {
        data = line.replace("data:", "").trim();
      }
    }

    return { eventType, data };
  };

  // 处理错误事件函数
  const handleErrorEvent = (data) => {
    try {
      const errorData = JSON.parse(data);
      setError(errorData.error || "Unknown error");
    } catch (e) {
      setError("Invalid error format");
    }
  };

  //处理custom数据，目前用来指示节点转换
  const handleCustomEvent = (parsed) => {
    console.log("Custom event from node:", parsed);
    console.log("Event type:", parsed.data.type);
    if (parsed.data.type === "node_execute") {
      if (parsed.data.data.status === "running") {
        console.log("Node running:", parsed);
        setCurrentNode(parsed.node);
        setSteps((prev) => [
          ...prev,
          {
            id: Date.now(),
            node: parsed.data.node,
            status: "pending",
          },
        ]);
      }
      // 节点从正在执行变成已完成
      if (parsed.data.data.status === "done") {
        console.log("Node done:", parsed);
        setSteps((prev) => {
          // 如果steps数组为空，先添加一个步骤
          if (prev.length === 0) {
            return [
              {
                id: Date.now(),
                node: parsed.node,
                data: parsed.data.data.data,
                status: "success",
              },
            ];
          } else {
            // 如果steps数组不为空，更新最后一个步骤
            let temp_arr = prev.slice(0, -1);
            return [
              ...temp_arr, // 排除最后一个元素
              {
                id: Date.now(),
                node: parsed.node,
                data: parsed.data.data.data,
                status: "success",
              },
            ];
          }
        });
      }
    }
    // 节点有流式消息传输
    if (
      parsed.data.type === "update_stream_messages" &&
      parsed.data.data.status === "running"
    ) {
      setStreamMessage("");
    }
    if (parsed.data.type === "update_messages") {
      setMessages((prev) => {
        return [
          ...prev.slice(0, -1), // 排除最后一个元素
          parsed.data.data.messages[parsed.data.data.messages.length - 1],
        ];
      });
    }

    // 节点有流式消息传输
    if (
      parsed.data.type === "update_stream_messages" &&
      parsed.data.data.status === "running"
    ) {
      setStreamMessage("");
    }
    if (parsed.data.type === "update_messages") {
      setMessages((prev) => {
        return [
          ...prev.slice(0, -1), // 排除最后一个元素
          parsed.data.data.messages[parsed.data.data.messages.length - 1],
        ];
      });
    }
  };

  // 处理消息事件函数
  const handleMessagesEvent = (parsed) => {
    setStreamMessage((prev) => {
      return prev + parsed.data.data.content;
    });
  };

  // 处理事件函数
  const processEvent = (eventData) => {
    const { eventType, data } = parseEventData(eventData);

    // 处理不同事件类型
    if (eventType === "error") {
      handleErrorEvent(data);
    } else if (eventType === "end") {
      setIsStreaming(false);
      console.log("End event received, steps:", steps);
    } else if (data) {
      // 忽略心跳包
      if (data === ":keep-alive") return;

      try {
        const parsed = JSON.parse(data);

        if (parsed.mode === "messages") {
          handleMessagesEvent(parsed);
        } else if (parsed.mode === "custom") {
          console.log("Received custom event:", parsed);
          handleCustomEvent(parsed);
        }
      } catch (e) {
        console.error("Failed to parse event data:", e);
      }
    }
  };

  // 停止流式传输函数
  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      //暂存最后的临时消息
      setMessages((prev) => {
        let temp_arr = prev.slice(0, -1);
        return [...temp_arr, { type: "ai", content: streamMessage }];
      });
    }
  };

  // 处理提交事件
  const handleSubmit = (inputValue, effort, model) => {
    startStream(inputValue, effort, model);
  };

  // 处理取消事件
  const handleCancel = () => {
    stopStream();
  };

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="h-full w-full sm:max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <WelcomeScreen
            handleSubmit={handleSubmit}
            onCancel={handleCancel}
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
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            liveActivityEvents={steps}
            onNewSearch={handleNewSearch}
            query={query}
            setQuery={setQuery}
          />
        )}
      </main>
    </div>
  );
};

export default Home;
