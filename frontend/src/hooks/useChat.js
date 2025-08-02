import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([]);
  const [streamMessage, setStreamMessage] = useState("");
  const [currentNode, setCurrentNode] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [effort, setEffort] = useState("low");
  const [model, setModel] = useState("google/gemini-2.0-flash-001");
  const [history, setHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("chatHistory");
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.error("Failed to parse chat history:", e);
      return [];
    }
  });
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const abortControllerRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // 将历史记录保存到localStorage中
  useEffect(() => {
    try {
      localStorage.setItem("chatHistory", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [history]);

  // 监听messages变量的变化，在对话结束时保存记录
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      saveConversationToHistory();
    }
  }, [messages, isStreaming, currentConversationId]);

  // 清理函数：组件卸载时中断请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 保存当前对话到历史记录
  const saveConversationToHistory = () => {
    if (messages.length > 0) {
      if (currentConversationId) {
        setHistory((prevHistory) => {
          const existingIndex = prevHistory.findIndex(
            (item) => item.id === currentConversationId
          );
          if (existingIndex >= 0) {
            // 检查消息是否相等
            const existingMessages = prevHistory[existingIndex].messages;
            const isMessagesEqual =
              JSON.stringify(existingMessages) === JSON.stringify(messages);

            if (isMessagesEqual) {
              // 消息相等，不更新
              return prevHistory;
            }

            const timestamp = new Date().toLocaleString();
            const updatedHistory = [...prevHistory];
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              timestamp,
              messages: [...messages],
            };
            return updatedHistory;
          } else {
            const timestamp = new Date().toLocaleString();
            const conversation = {
              id: uuidv4(),
              timestamp,
              messages: [...messages],
            };
            return [conversation, ...prevHistory];
          }
        });
      } else {
        const timestamp = new Date().toLocaleString();
        const conversation = {
          id: uuidv4(),
          timestamp,
          messages: [...messages],
        };
        setHistory((prevHistory) => [conversation, ...prevHistory]);
      }
    }
  };

  // 处理新搜索
  const handleNewSearch = () => {
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
    // 如果点击的是当前对话，则只关闭抽屉，不重新加载
    if (conversation.id === currentConversationId) {
      setDrawerVisible(false);
      return;
    }

    setDrawerVisible(false);
    setCurrentConversationId(conversation.id);
    setSteps([]);
    setIsStreaming(false);
    setCurrentNode("");
    setError(null);
    setMessages(conversation.messages);

    const lastAssistantMessage = conversation.messages
      .filter((msg) => msg.type === "assistant")
      .pop();
    setStreamMessage(lastAssistantMessage ? lastAssistantMessage.content : "");
  };

  // 删除历史对话
  const deleteConversation = (conversationId) => {
    setHistory((prevHistory) =>
      prevHistory.filter((conversation) => conversation.id !== conversationId)
    );
  };

  // 解析事件数据函数
  const parseEventData = (eventData) => {
    try {
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
    } catch (e) {
      console.error("Failed to parse event data:", e);
      return { eventType: "error", data: "Invalid event format" };
    }
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

  // 处理消息事件函数
  const handleMessagesEvent = (parsed) => {
    setStreamMessage((prev) => prev + parsed.data.data.content);
  };

  // 处理custom数据，目前用来指示节点转换
  const handleCustomEvent = (parsed) => {
    if (process.env.NODE_ENV === "development") {
      console.log("Custom event from node:", parsed);
      console.log("Event type:", parsed.data.type);
    }

    const timestamp = Date.now();

    if (parsed.data.type === "node_execute") {
      if (parsed.data.data.status === "running") {
        setCurrentNode(parsed.node);
      }

      if (parsed.data.data.status === "done") {
        setSteps((prev) => {
          return [
            ...prev,
            {
              id: timestamp,
              node: parsed.node,
              data: parsed.data.data.data,
              status: "success",
            },
          ];
        });
      }
    }

    // 处理流式消息传输和消息更新
    if (
      parsed.data.type === "update_stream_messages" &&
      parsed.data.data.status === "running"
    ) {
      setStreamMessage("");
    }

    if (parsed.data.type === "update_messages") {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        parsed.data.data.messages[parsed.data.data.messages.length - 1],
      ]);
    }
  };

  // 处理事件函数
  const processEvent = (eventData) => {
    const { eventType, data } = parseEventData(eventData);

    if (eventType === "error") {
      handleErrorEvent(data);
    } else if (eventType === "end") {
      setIsStreaming(false);
      if (!currentConversationId) {
        setCurrentConversationId(uuidv4());
      }
      if (process.env.NODE_ENV === "development") {
        console.log("End event received, steps:", steps);
      }
    } else if (data) {
      if (data === ":keep-alive") return;

      try {
        const parsed = JSON.parse(data);

        if (parsed.mode === "messages") {
          handleMessagesEvent(parsed);
        } else if (parsed.mode === "custom") {
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
      setMessages((prev) => {
        const tempArr = prev.slice(0, -1);
        return [...tempArr, { type: "assistant", content: streamMessage }];
      });
    }
  };

  // 开始流式传输函数
  const startStream = async () => {
    if (!query.trim()) {
      setError("查询不能为空");
      return;
    }

    setError(null);
    setSteps([]);
    setMessages((prev) => [
      ...prev,
      { type: "user", content: query },
      { type: "assistant", content: "Researching..." },
    ]);
    setStreamMessage("");
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/llm/deep/search/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, messages, effort, model }),
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eventEndIndex;
        while ((eventEndIndex = buffer.indexOf("\n\n")) !== -1) {
          const eventData = buffer.substring(0, eventEndIndex);
          buffer = buffer.substring(eventEndIndex + 2);
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
      abortControllerRef.current = null;
    }
  };

  // 处理提交事件
  const handleSubmit = () => {
    startStream();
  };

  // 处理取消事件
  const handleCancel = () => {
    stopStream();
  };

  return {
    // State
    messages,
    query,
    isStreaming,
    error,
    steps,
    streamMessage,
    currentNode,
    drawerVisible,
    history,
    currentConversationId,
    effort,
    model,
    abortControllerRef,
    scrollAreaRef,

    // Actions
    setQuery,
    setDrawerVisible,
    setEffort,
    setModel,
    handleSubmit,
    handleCancel,
    handleNewSearch,
    restoreConversation,
    deleteConversation,
    setMessages,
  };
};
