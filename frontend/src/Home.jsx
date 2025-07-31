import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChatMessagesView } from "./components/ChatMessagesView";
import { Button } from "./components/ui/button";
import { History } from "lucide-react";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { useChat } from "./hooks/useChat";

const Home = () => {
  const {
    messages,
    query,
    isStreaming,
    error,
    steps,
    streamMessage,
    drawerVisible,
    history,
    scrollAreaRef,
    setQuery,
    setDrawerVisible,
    handleSubmit,
    handleCancel,
    handleNewSearch,
    restoreConversation,
    deleteConversation,
  } = useChat();

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

      {/* History Drawer */}
      <HistoryDrawer
        drawerVisible={drawerVisible}
        setDrawerVisible={setDrawerVisible}
        history={history}
        restoreConversation={restoreConversation}
        deleteConversation={deleteConversation}
      />
    </>
  );
};

export default Home;
