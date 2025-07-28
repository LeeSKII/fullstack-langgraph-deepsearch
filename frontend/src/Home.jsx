import { useState, useEffect, useRef, useCallback } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { Button } from "@/components/ui/button";

const Home = () => {
  const [messages, setMessages] = useState([]);
  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="h-full w-full sm:max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <WelcomeScreen />
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
            messages={thread.messages}
            isLoading={thread.isLoading}
            scrollAreaRef={scrollAreaRef}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            liveActivityEvents={processedEventsTimeline}
            historicalActivities={historicalActivities}
          />
        )}
      </main>
    </div>
  );
};

export default Home;
