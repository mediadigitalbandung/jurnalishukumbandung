"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  image?: string | null;
  options: PollOption[];
  totalVotes: number;
}

// Legacy support for hardcoded polls
interface LegacyPoll {
  question: string;
  image?: string;
  options: { label: string; percentage: number }[];
  totalVotes: number;
}

interface Props {
  items?: LegacyPoll[];
  categorySlug?: string;
}

export default function PollingCarousel({ items, categorySlug }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({}); // pollId → optionId
  const [voting, setVoting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      const url = categorySlug ? `/api/polls?category=${categorySlug}` : "/api/polls";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const fetchedPolls: Poll[] = json.data || [];
      setPolls(fetchedPolls);

      // Check which polls user already voted on
      const voteChecks = await Promise.all(
        fetchedPolls.map(async (p) => {
          try {
            const r = await fetch(`/api/polls/${p.id}/vote`);
            if (r.ok) {
              const j = await r.json();
              return { pollId: p.id, votedOptionId: j.data?.votedOptionId };
            }
          } catch {}
          return { pollId: p.id, votedOptionId: null };
        })
      );
      const voted: Record<string, string> = {};
      for (const v of voteChecks) {
        if (v.votedOptionId) voted[v.pollId] = v.votedOptionId;
      }
      setVotedPolls(voted);
    } catch {
      // Fallback to empty
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  async function handleVote(pollId: string, optionId: string) {
    if (votedPolls[pollId] || voting) return;
    try {
      setVoting(pollId);
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        // Update poll with new results
        setPolls((prev) =>
          prev.map((p) =>
            p.id === pollId
              ? { ...p, totalVotes: json.data.totalVotes, options: json.data.options }
              : p
          )
        );
        setVotedPolls((prev) => {
          const updated = { ...prev, [pollId]: optionId };
          // Auto-scroll to next unvoted poll
          setTimeout(() => {
            if (!scrollRef.current) return;
            const currentIdx = polls.findIndex((p) => p.id === pollId);
            const nextUnvoted = polls.findIndex((p, i) => i > currentIdx && !updated[p.id]);
            if (nextUnvoted !== -1) {
              const cards = scrollRef.current.querySelectorAll("[data-poll-card]");
              if (cards[nextUnvoted]) {
                cards[nextUnvoted].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                setTimeout(checkScroll, 500);
              }
            }
          }, 800);
          return updated;
        });
      }
    } catch {}
    finally {
      setVoting(null);
    }
  }

  // If no polls from API and legacy items provided, show nothing (legacy data removed)
  const displayPolls = polls;

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.querySelector("div")?.offsetWidth || 300;
    const amount = (cardWidth + 16) * (direction === "left" ? -1 : 1);
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    setTimeout(checkScroll, 400);
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-[18.75rem] rounded-xl border border-border bg-surface-secondary p-5 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-surface-tertiary mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j}><div className="h-3 w-full rounded bg-surface-tertiary" /><div className="h-1.5 rounded-full bg-surface-tertiary mt-1" /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayPolls.length === 0) return null;

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button onClick={() => scroll("left")} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-lg border border-border text-txt-primary hover:bg-surface-secondary transition-all opacity-0 group-hover:opacity-100" aria-label="Geser kiri">
          <ChevronLeft size={20} />
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll("right")} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-lg border border-border text-txt-primary hover:bg-surface-secondary transition-all opacity-0 group-hover:opacity-100" aria-label="Geser kanan">
          <ChevronRight size={20} />
        </button>
      )}

      <div ref={scrollRef} onScroll={checkScroll} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
        {displayPolls.map((poll) => {
          const hasVoted = !!votedPolls[poll.id];
          const votedOptionId = votedPolls[poll.id];
          const isVoting = voting === poll.id;

          return (
            <div key={poll.id} data-poll-card className="shrink-0 w-[calc(100vw-3rem)] sm:w-[18.75rem] md:w-[21.25rem] rounded-xl border border-border bg-surface-secondary overflow-hidden hover:shadow-card-hover transition-shadow">
              {poll.image && (
                <div className="relative w-full aspect-[2/1]">
                  <Image src={poll.image} alt={poll.question} fill className="object-cover" sizes="340px" />
                </div>
              )}
              <div className="p-5">
                <p className="text-sm font-semibold text-txt-primary mb-4 leading-snug">{poll.question}</p>

                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const isTop = opt.percentage === Math.max(...poll.options.map((o) => o.percentage)) && poll.totalVotes > 0;
                    const isSelected = votedOptionId === opt.id;

                    return hasVoted ? (
                      // After voting — show results
                      <div key={opt.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={`text-xs flex items-center gap-1 ${isSelected ? "font-bold text-goto-green" : "text-txt-primary"}`}>
                            {isSelected && <CheckCircle size={12} />}
                            {opt.label}
                          </span>
                          <span className={`font-bold text-xs ${isTop ? "text-goto-green" : "text-txt-primary"}`}>
                            {opt.percentage}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isSelected ? "bg-goto-green" : isTop ? "bg-goto-green/60" : "bg-goto-green/30"}`}
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      // Before voting — clickable options
                      <button
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        disabled={isVoting}
                        className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                          isVoting
                            ? "opacity-50 cursor-not-allowed border-border text-txt-muted"
                            : "border-border text-txt-primary hover:border-goto-green hover:bg-goto-light/30 hover:text-goto-green active:scale-[0.98]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-txt-muted mt-3">
                  {poll.totalVotes.toLocaleString("id-ID")} suara
                  {hasVoted && <span className="text-goto-green ml-1">· Terima kasih telah voting!</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {displayPolls.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {displayPolls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!scrollRef.current) return;
                const card = scrollRef.current.querySelector("div");
                const cardWidth = (card?.offsetWidth || 300) + 16;
                scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
                setTimeout(checkScroll, 400);
              }}
              className="h-1.5 w-1.5 rounded-full bg-border hover:bg-goto-green transition-colors"
              aria-label={`Polling ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
