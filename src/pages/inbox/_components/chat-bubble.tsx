import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { format } from "date-fns";

type Message = Doc<"messages">;

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isAgent = message.role === "agent";
  const time = format(new Date(message.timestamp), "hh:mm a");

  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isAgent
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        <p className="leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isAgent ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {time} {isAgent && "· AI"}
        </p>
      </div>
    </div>
  );
}
