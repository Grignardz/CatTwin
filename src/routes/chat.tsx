import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send, Camera, ChevronDown, Trash2 } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/lib/auth";
import { generateReply, SUGGESTED_QUESTIONS } from "@/lib/geminiChat";
import { pageVariants, childVariants, tapScale } from "@/lib/motion";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — CatTwin AI" }] }),
  component: Chat,
});

const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Chat() {
  const { user, addChatMessage, clearChatHistory } = useAuth();
  const cats = user?.cats ?? [];
  const activeCat = cats[0] ?? null;
  const catName = activeCat?.name ?? "your cat";

  // Persisted conversation memory for this cat.
  const history = useMemo(
    () => (user?.chatMessages ?? []).filter((m) => m.catId === activeCat?.id),
    [user?.chatMessages, activeCat?.id],
  );

  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [typing, setTyping] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Seed a greeting the first time this cat has no history.
  useEffect(() => {
    if (!activeCat) return;
    if (history.length === 0) {
      const greetingText = `Hi! I'm your AI veterinary assistant. I can see ${activeCat.name} (${activeCat.breed}, ${activeCat.age}) is registered — ask me anything about their health, feeding, or care, and I'll answer using their actual logged data.`;
      addChatMessage(activeCat.id, { role: "assistant", text: greetingText });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length, typing]);

  async function sendMessage(text: string) {
    if (!text.trim() || !activeCat) return;
    const historyForRequest = history; // capture before appending the new user message
    addChatMessage(activeCat.id, { role: "user", text });
    setInput("");
    setSendError(null);
    setTyping(true);
    try {
      const reply = await generateReply(text, user, activeCat, historyForRequest);
      addChatMessage(activeCat.id, { role: "assistant", text: reply.text });
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to get a response. Please try again.",
      );
    } finally {
      setTyping(false);
    }
  }

  function handleClearHistory() {
    if (!activeCat) return;
    clearChatHistory(activeCat.id);
    setClearConfirm(false);
  }

  const visibleMessages = collapsed ? history.slice(-3) : history;

  return (
    <PhoneShell>
      <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        {/* Header */}
        <motion.div variants={childVariants} className="px-6 pt-12 pb-4 flex items-center gap-3">
          <motion.div whileTap={tapScale}>
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </Link>
          </motion.div>
          <div className="flex-1 text-center">
            <h1 className="font-serif text-xl font-semibold">Assistant</h1>
            {activeCat && <p className="text-xs text-muted-foreground">{catName}</p>}
          </div>
          {activeCat && history.length > 0 && (
            <motion.button
              whileTap={tapScale}
              onClick={() => setClearConfirm(true)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label="Clear conversation"
            >
              <Trash2 size={15} className="text-muted-foreground" />
            </motion.button>
          )}
        </motion.div>

        {/* Clear confirm */}
        <AnimatePresence>
          {clearConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="px-6 mb-3"
            >
              <div className="bg-red-100 dark:bg-red-900/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-red-700 dark:text-red-300 flex-1">
                  Clear this conversation?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="text-xs bg-card px-3 py-1.5 rounded-full font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-full font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <AnimatePresence>
          {history.length > 4 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 mb-2 flex justify-center"
            >
              <motion.button
                whileTap={tapScale}
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1"
              >
                <motion.div
                  animate={{ rotate: collapsed ? 0 : 180 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                >
                  <ChevronDown size={12} />
                </motion.div>
                {collapsed ? "Show full history" : "Collapse older messages"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="px-6 space-y-3 pb-2">
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`max-w-[82%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-[var(--coral-soft)]"
                      : "rounded-tl-sm bg-card"
                  }`}
                >
                  {msg.text}
                </motion.div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start"
              >
                <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sendError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start"
            >
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-2xl rounded-tl-sm px-4 py-3 text-xs max-w-[82%]">
                {sendError}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        <motion.div variants={childVariants} className="px-6 mt-2 flex gap-2 flex-wrap pb-2">
          {SUGGESTED_QUESTIONS.map((p, i) => (
            <motion.button
              key={p}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={tapScale}
              onClick={() => sendMessage(p)}
              className="text-xs bg-secondary rounded-full px-3 py-1.5 text-foreground transition-colors"
            >
              {p}
            </motion.button>
          ))}
        </motion.div>

        {/* Input bar */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] z-40">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.2 }}
            className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-lg border border-border"
          >
            <motion.div whileTap={{ scale: 0.85 }}>
              <Link
                to="/photo-analysis"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Photo analysis"
              >
                <Camera size={18} />
              </Link>
            </motion.div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder={activeCat ? `Ask about ${catName}…` : "Ask CatTwin AI…"}
              className="flex-1 bg-transparent outline-none text-sm"
              aria-label="Message input"
            />
            <motion.button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              whileTap={input.trim() ? tapScale : {}}
              animate={input.trim() ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
              className="w-9 h-9 rounded-full bg-[var(--coral)] flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </PhoneShell>
  );
}
