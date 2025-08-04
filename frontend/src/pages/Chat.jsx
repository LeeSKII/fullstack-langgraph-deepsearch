import { useBasicChat } from "../hooks/useBasicChat";
import { Sender, Bubble } from "@ant-design/x";
import { Bot, CloudCog, User } from "lucide-react";

function Chat() {
  const endpoint = "/llm/chat/stream";
  const {
    sendValue,
    messages,
    isStreaming,
    error,
    setSendValue,
    startStream,
    stopStream,
  } = useBasicChat(endpoint);

  return (
    <div className="container mx-auto p-2 h-screen flex flex-col bg-gray-100">
      <div className="flex flex-col gap-4 h-11/12">
        <div className="flex-1 w-full h-full overflow-y-auto bg-white rounded-lg shadow p-6">
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
