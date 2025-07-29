import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";
import {
  Loader2,
  Activity,
  Info,
  Search,
  TextSearch,
  Brain,
  Pen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import WebSearchCard from "./WebSearchCard";
import JsonRender from "./JsonRender";

export function ActivityTimeline({ processedEvents, isLoading }) {
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(!isLoading);

  //外部属性变化之后触发状态
  useEffect(() => {
    setIsTimelineCollapsed(!isLoading);
  }, [isLoading]);
  const getEventIcon = (node, index) => {
    if (index === 0 && isLoading && processedEvents.length === 0) {
      return <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />;
    }

    // Handle case where node is undefined
    if (!node) {
      return <Activity className="h-4 w-4 text-neutral-400" />;
    }

    if (node.toLowerCase().includes("generating")) {
      return <TextSearch className="h-4 w-4 text-neutral-400" />;
    } else if (node.toLowerCase().includes("thinking")) {
      return <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />;
    } else if (node.toLowerCase().includes("reflection")) {
      return <Brain className="h-4 w-4 text-neutral-400" />;
    } else if (node.toLowerCase().includes("research")) {
      return <Search className="h-4 w-4 text-neutral-400" />;
    } else if (node.toLowerCase().includes("finalizing")) {
      return <Pen className="h-4 w-4 text-neutral-400" />;
    }
    return <Activity className="h-4 w-4 text-neutral-400" />;
  };

  return (
    <Card className="border-none rounded-lg bg-neutral-700 max-h-96">
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          <div
            className="flex items-center justify-start text-sm w-full cursor-pointer gap-2 text-neutral-100"
            onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
          >
            Research Process
            {isTimelineCollapsed ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronUp className="h-4 w-4 mr-2" />
            )}
          </div>
        </CardDescription>
      </CardHeader>
      {!isTimelineCollapsed && (
        // ScrollArea 需要默认高度才能触发自定义滚动条
        <ScrollArea className="h-96 overflow-y-auto">
          <CardContent>
            {isLoading && processedEvents.length === 0 && (
              <div className="relative pl-8 pb-4">
                <div className="absolute left-3 top-3.5 h-full w-0.5 bg-neutral-800" />
                <div className="absolute left-0.5 top-2 h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center ring-4 ring-neutral-900">
                  <Loader2 className="h-3 w-3 text-neutral-400 animate-spin" />
                </div>
                <div>
                  <p className="text-sm text-neutral-300 font-medium">
                    Searching...
                  </p>
                </div>
              </div>
            )}
            {processedEvents.length > 0 ? (
              <div className="space-y-0">
                {processedEvents.map((eventItem, index) => (
                  <div key={index} className="relative pl-8 pb-4">
                    {index < processedEvents.length - 1 ||
                    (isLoading && index === processedEvents.length - 1) ? (
                      <div className="absolute left-3 top-3.5 h-full w-0.5 bg-neutral-600" />
                    ) : null}
                    <div className="absolute left-0.5 top-2 h-6 w-6 rounded-full bg-neutral-600 flex items-center justify-center ring-4 ring-neutral-700">
                      {getEventIcon(eventItem.node, index)}
                    </div>
                    <div>
                      <p className="text-sm text-neutral-200 font-medium mb-0.5">
                        {eventItem.node}
                      </p>
                      <div className="text-xs text-neutral-300 leading-relaxed">
                        {eventItem.node === "web_search" &&
                        eventItem.data &&
                        eventItem.data.web_search_results ? (
                          <div className="flex flex-wrap gap-4 mt-2">
                            {eventItem.data.web_search_results.map(
                              (search_data) => (
                                <div
                                  className="w-[calc(20%-1rem)] p-2"
                                  key={search_data.url}
                                >
                                  <WebSearchCard
                                    url={search_data.url}
                                    title={search_data.title}
                                    content={
                                      search_data.content || search_data.snippet
                                    }
                                  />
                                </div>
                              )
                            )}
                          </div>
                        ) : eventItem.node === "analyze_need_web_search" ? (
                          <div className="flex flex-wrap gap-4 mt-2">
                            <JsonRender
                              data={{
                                query: eventItem.data?.query,
                                isNeedWebSearch:
                                  eventItem.data?.isNeedWebSearch,
                                reason: eventItem.data?.reason,
                                confidence: eventItem.data?.confidence,
                              }}
                            />
                          </div>
                        ) : eventItem.node === "generate_search_query" ? (
                          <JsonRender
                            data={{
                              web_search_query:
                                eventItem.data?.web_search_query,
                              web_search_depth:
                                eventItem.data?.web_search_depth,
                              reason: eventItem.data?.reason,
                              confidence: eventItem.data?.confidence,
                            }}
                          />
                        ) : eventItem.node === "evaluate_search_results" ? (
                          <div className="flex flex-wrap gap-4 mt-2">
                            <JsonRender
                              data={{
                                is_sufficient: eventItem.data?.is_sufficient,
                                followup_search_query:
                                  eventItem.data?.followup_search_query,
                                search_depth: eventItem.data?.search_depth,
                                reason: eventItem.data?.reason,
                                confidence: eventItem.data?.confidence,
                              }}
                            />
                          </div>
                        ) : typeof eventItem.data === "string" ? (
                          eventItem.data
                        ) : Array.isArray(eventItem.data) ? (
                          eventItem.data.join(", ")
                        ) : eventItem.data ? (
                          <div className="font-mono max-h-50 overflow-y-auto">
                            <JsonRender data={eventItem.data} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && processedEvents.length > 0 && (
                  <div className="relative pl-8 pb-4">
                    <div className="absolute left-0.5 top-2 h-5 w-5 rounded-full bg-neutral-600 flex items-center justify-center ring-4 ring-neutral-700">
                      <Loader2 className="h-3 w-3 text-neutral-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-300 font-medium">
                        Searching...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : !isLoading ? ( // Only show "No activity" if not loading and no events
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 pt-10">
                <Info className="h-6 w-6 mb-3" />
                <p className="text-sm">No activity to display.</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Timeline will update during processing.
                </p>
              </div>
            ) : null}
          </CardContent>
        </ScrollArea>
      )}
    </Card>
  );
}
