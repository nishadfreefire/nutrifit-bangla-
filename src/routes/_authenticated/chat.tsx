import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HeroButton } from "@/components/hero-button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Send, Sparkles, Trash2, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { clearChat, loadChatHistory, sendChatMessage } from "@/lib/chat.functions";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Coach · NutriFit" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: string; content: string };

function ChatPage() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const send = useServerFn(sendChatMessage);
  const load = useServerFn(loadChatHistory);
  const clear = useServerFn(clearChat);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const hist = await load();
        setMessages(hist as Msg[]);
      } catch (e) { console.error(e); }
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 50);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await send({ data: { message: text, lang } });
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  async function onClear() {
    if (!confirm(lang === "bn" ? "সব মেসেজ মুছে ফেলবেন?" : "Delete all messages?")) return;
    try {
      await clear();
      setMessages([]);
      toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Cleared");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const suggestions = lang === "bn"
    ? ["আমার BMI ভালো রাখতে আজ কী খাবো?", "ওজন কমানোর জন্য ৭ দিনের ডায়েট দিন", "বাড়িতে দ্রুত পেট কমানোর ব্যায়াম"]
    : ["What should I eat today to stay healthy?", "Suggest a 7-day weight loss diet", "Quick belly fat exercises at home"];

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("ai_coach")}</p>
            <h1 className="font-display text-2xl font-bold truncate">{lang === "bn" ? "NutriFit এআই কোচ" : "NutriFit AI Coach"}</h1>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("clear_chat")}</span>
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="surface-card flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="mt-4 max-w-sm text-muted-foreground">{t("ai_greeting")}</p>
              <div className="mt-6 grid w-full max-w-md gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(() => taRef.current?.focus(), 0); }}
                    className="rounded-lg border border-border bg-secondary px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5"
                  >{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => (
                <li key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  </div>
                  <div className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="prose-chat"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    )}
                  </div>
                </li>
              ))}
              {sending && (
                <li className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                    </span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(); } }}
            placeholder={t("ask_anything")}
            rows={1}
            className="min-h-11 resize-none rounded-xl bg-card"
            disabled={sending}
          />
          <HeroButton onClick={onSend} disabled={sending || !input.trim()} className="h-11 px-4">
            <Send className="h-4 w-4" />
          </HeroButton>
        </div>
      </div>
    </AppShell>
  );
}
