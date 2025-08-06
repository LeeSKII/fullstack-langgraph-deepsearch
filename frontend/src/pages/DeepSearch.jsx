import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { useChat } from "../hooks/useChat";

const DeepSearch = () => {
  const {
    messages,
    query,
    isStreaming,
    error,
    steps,
    streamMessage,
    drawerVisible,
    history,
    currentConversationId,
    effort,
    model,
    scrollAreaRef,
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
  } = useChat();

  const handleRetry = () => {
    // 找到最后一条人类消息
    const lastHumanMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.type === "user");

    if (lastHumanMessage) {
      // 清理原来的最近的一条AI消息和人类消息
      const newMessages = messages.slice(0, -2); // 移除最后两条消息（AI和人类）
      const query = lastHumanMessage.content;

      // 更新消息状态
      setMessages(newMessages);

      // 设置查询内容并提交
      setQuery(query);
      handleSubmit();
    }
  };

  return (
    <>
      {/* History Button */}
      <div className="fixed top-4 right-6 z-10">
        <Button
          variant="ghost"
          onClick={() => setDrawerVisible(true)}
          className="bg-neutral-700 cursor-pointer hover:bg-neutral-600 text-neutral-300"
        >
          <History />
          <span className="hidden sm:inline">历史记录</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
        <main className="h-full w-full sm:max-w-4xl mx-auto relative">
          {messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isStreaming}
              query={query}
              setQuery={setQuery}
              effort={effort}
              setEffort={setEffort}
              model={model}
              setModel={setModel}
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
              onRetry={handleRetry}
            />
          )}
        </main>
      </div>

      {/* History Drawer */}
      <HistoryDrawer
        drawerVisible={drawerVisible}
        setDrawerVisible={setDrawerVisible}
        history={history}
        restoreConversation={restoreConversation}
        deleteConversation={deleteConversation}
        currentConversationId={currentConversationId}
      />
    </>
  );
};

export default DeepSearch;
