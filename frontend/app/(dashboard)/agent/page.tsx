import { AgentChatPage } from "../../../components/agent/AgentChatPage";

export const metadata = { title: "AI Hiring Assistant · Umurava" };

export default function AgentPage() {
  return (
    // Cancels the parent main's padding so the chat fills the entire content area
    <div className="-m-4 md:-m-6 lg:-m-8" style={{ height: "calc(100vh - 4rem)" }}>
      <AgentChatPage />
    </div>
  );
}
