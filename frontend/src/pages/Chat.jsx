import { useState, useRef, use } from "react";
import { Sender, Bubble } from "@ant-design/x";
import { Bot, CloudCog, User } from "lucide-react";

function Chat() {
  const endpoint = "/llm/chat/stream";
  const [sendValue, setSendValue] = useState("");
  const [streamMessage, setStreamMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // 开始流式传输函数
  const startStream = async (endpoint) => {
    setIsStreaming(true);
    setStreamMessage("");

    let sendMessages = [...messages, { role: "user", content: sendValue }];
    // 添加一个空的assistant消息用于流式显示
    let showMessages = [
      ...sendMessages,
      { role: "assistant", content: "", status: "loading" },
    ];
    setMessages(showMessages);
    try {
      // 创建中断控制器
      abortControllerRef.current = new AbortController();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: sendMessages }),
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
          console.log(eventData);
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
  const handleCustomEvent = (parsed_data) => {
    if (parsed_data.data.type == "update_message") {
      // 更新当前流式消息的内容
      const ai_response = parsed_data.data.message;
      setMessages((prev) => {
        const tempArr = prev.slice(0, -1);
        return [...tempArr, { role: "assistant", content: ai_response }];
      });
    }
  };

  // 处理更新事件函数
  const handleUpdatesEvent = (parsed_data) => {};

  // 处理消息事件函数
  const handleMessagesEvent = (parsed_data) => {
    // 更新最后一个assistant消息的内容（流式消息）
    const messageChunkId = parsed_data.data.data.id;
    const newContent = parsed_data.data.data.content;
    setMessages((prev) => {
      const lastAiMessage = prev[prev.length - 1];
      if (lastAiMessage.role === "assistant") {
        const tempContent = lastAiMessage.content + newContent;
        return [
          ...prev.slice(0, -1),
          { role: "assistant", content: tempContent },
        ];
      }
    });

    setStreamMessage((prev) => {
      return prev + newContent;
    });
  };

  // 处理事件函数
  const processEvent = (eventData) => {
    const { eventType, data } = parseEventData(eventData);

    // 处理不同事件类型
    if (eventType === "error") {
      handleErrorEvent(data);
    } else if (eventType === "end") {
      setSendValue("");
      setIsStreaming(false);
    } else if (data) {
      // 忽略心跳包
      if (data === ":keep-alive") return;

      try {
        const parsed_data = JSON.parse(data);

        if (parsed_data.mode === "updates") {
          handleUpdatesEvent(parsed_data);
        } else if (parsed_data.mode === "messages") {
          handleMessagesEvent(parsed_data);
        } else if (parsed_data.mode === "custom") {
          handleCustomEvent(parsed_data);
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
    }
  };

  return (
    <div>
      <div className="flex-1 w-full h-full overflow-y-auto bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-3">
          {messages.map((message, i) => {
            if (message.role === "assistant") {
              return (
                <Bubble
                  key={i}
                  placement="start"
                  content={message.content}
                  avatar={{ icon: <Bot />, style: { background: "#1d3acdff" } }}
                  loading={message.status === "loading"}
                />
              );
            } else {
              return (
                <Bubble
                  key={i}
                  placement="end"
                  content={message.content}
                  avatar={{ icon: <User />, style: { background: "#87d068" } }}
                />
              );
            }
          })}
        </div>
      </div>
      <Sender
        submitType="shiftEnter"
        value={sendValue}
        onChange={(v) => {
          setSendValue(v);
        }}
        placeholder="Press Shift + Enter to send message"
        loading={isStreaming}
        onSubmit={() => {
          startStream(endpoint);
        }}
        onCancel={() => {
          stopStream();
        }}
      />
    </div>
  );
}

export default Chat;
