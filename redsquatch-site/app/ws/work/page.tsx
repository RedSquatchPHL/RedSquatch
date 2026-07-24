'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import WorkCardCarousel from '@/components/WorkCardCarousel';
import BackburnerPanel from '@/components/BackburnerPanel';
import DoneListPanel from '@/components/DoneListPanel';
import WorkCardJournalPanel from '@/components/WorkCardJournalPanel';
import TimerTray from '@/components/TimerTray';
import WorkCardUploadButton, { ImportResult } from '@/components/WorkCardUploadButton';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import type { WorkCard } from '@/components/WorkCard';
import styles from '@/styles/work.module.css';

export default function WorkCardsPage() {
  const [checking, setChecking] = useState(true);
  const [cards, setCards] = useState<WorkCard[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [focalId, setFocalId] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [journalCardId, setJournalCardId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/'); return; }
        setChecking(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  async function loadCards() {
    const res = await fetch(`${API}/api/client/work-cards`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards ?? []);
    }
  }

  useEffect(() => {
    if (checking) return;
    loadCards();
    const poll = setInterval(loadCards, 60000);
    return () => clearInterval(poll);
  }, [checking]);

  // Single shared clock — every countdown (card badges, timer tray) derives its
  // remaining time from this plus each card's server-authoritative follow_up_at,
  // so a page reload just recomputes correctly instead of losing state.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Done cards move out to the left-hand list; Backburner cards move out to the
  // right-hand list. Only cards in neither state occupy the carousel.
  const activeCards = useMemo(
    () => cards.filter(c => !c.backburner && !c.done).sort((a, b) => a.ticket_number.localeCompare(b.ticket_number)),
    [cards]
  );
  const backburnerCards = useMemo(() => cards.filter(c => c.backburner), [cards]);
  const doneCards = useMemo(() => cards.filter(c => c.done), [cards]);
  const pendingFollowUps = useMemo(() => cards.filter(c => c.follow_up_at != null), [cards]);
  const dueIds = useMemo(() => {
    const s = new Set<number>();
    for (const c of cards) {
      if (c.follow_up_at && new Date(c.follow_up_at).getTime() <= now) s.add(c.id);
    }
    return s;
  }, [cards, now]);

  // Keep the manual carousel order stable across data refreshes: cards still active
  // keep their current position (so a due-triggered reorder below survives a poll),
  // newly-appeared ones (fresh import, or just restored from Done/Backburner) land
  // at the end.
  useEffect(() => {
    setOrder(prevOrder => {
      const activeIds = activeCards.map(c => c.id);
      const activeIdSet = new Set(activeIds);
      const kept = prevOrder.filter(id => activeIdSet.has(id));
      const keptSet = new Set(kept);
      const missing = activeIds.filter(id => !keptSet.has(id));
      return [...kept, ...missing];
    });
  }, [activeCards]);

  // When a follow-up timer fires, splice that card to just after the current focal
  // position (per spec: pulse + jump-to-next-in-queue, not a toast). firedRef stops
  // this from re-splicing on every clock tick once a card has already been surfaced.
  useEffect(() => {
    const newlyDue: number[] = [];
    for (const c of cards) {
      const isDue = !!c.follow_up_at && new Date(c.follow_up_at).getTime() <= now;
      if (isDue && !firedRef.current.has(c.id)) {
        newlyDue.push(c.id);
        firedRef.current.add(c.id);
      } else if (!isDue) {
        firedRef.current.delete(c.id);
      }
    }
    if (newlyDue.length === 0) return;
    setOrder(prev => {
      const next = prev.filter(id => !newlyDue.includes(id));
      const focalIdx = focalId != null ? next.indexOf(focalId) : -1;
      const insertAt = focalIdx >= 0 ? focalIdx + 1 : 0;
      next.splice(insertAt, 0, ...newlyDue);
      return next;
    });
  }, [cards, now, focalId]);

  const cardsById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
  const orderedActiveCards = useMemo(
    () => order.map(id => cardsById.get(id)).filter((c): c is WorkCard => !!c),
    [order, cardsById]
  );

  // Seed/repair the focal card whenever it's unset or has drifted out of the active pool.
  useEffect(() => {
    if (focalId != null && orderedActiveCards.some(c => c.id === focalId)) return;
    setFocalId(orderedActiveCards[0]?.id ?? null);
  }, [orderedActiveCards, focalId]);

  async function patchCard(id: number, body: Record<string, unknown>) {
    const res = await fetch(`${API}/api/client/work-cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setCards(prev => prev.map(c => (c.id === id ? updated : c)));
    }
  }

  // Shared by Done/Backburner toggling on: when a card leaves the active pool, hand
  // focus to whatever's next in the carousel order rather than leaving it dangling.
  function advanceFocalAwayFrom(id: number) {
    setFocalId(prevFocal => {
      if (prevFocal !== id) return prevFocal;
      const idx = order.indexOf(id);
      const remaining = order.filter(oid => oid !== id);
      return remaining.length === 0 ? null : remaining[Math.min(idx, remaining.length - 1)];
    });
  }

  function handleToggleDone(id: number) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const next = !card.done;
    setCards(prev => prev.map(c => (c.id === id ? { ...c, done: next } : c)));
    patchCard(id, { done: next });
    if (next) advanceFocalAwayFrom(id);
  }

  function handleToggleBackburner(id: number) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const next = !card.backburner;
    setCards(prev => prev.map(c => (c.id === id ? { ...c, backburner: next } : c)));
    patchCard(id, { backburner: next });
    if (next) advanceFocalAwayFrom(id);
    else setFocalId(id);
  }

  function handleSetFollowUp(id: number, minutes: number | null) {
    if (minutes == null) {
      setCards(prev => prev.map(c => (c.id === id ? { ...c, follow_up_at: null } : c)));
      patchCard(id, { clear_follow_up: true });
    } else {
      const target = new Date(Date.now() + minutes * 60000).toISOString();
      setCards(prev => prev.map(c => (c.id === id ? { ...c, follow_up_at: target } : c)));
      patchCard(id, { follow_up_minutes: minutes });
    }
  }

  function handleSetParent(id: number, parentId: number | null) {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, parent_id: parentId } : c)));
    patchCard(id, { parent_id: parentId });
  }

  // Used by the Backburner panel, Done list, and cascade clicks: pulls a card out of
  // whichever side-list it's in (if any) and brings it front-and-center as the focal card.
  function handleFocusCard(id: number) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const patch: Record<string, unknown> = {};
    if (card.backburner) patch.backburner = false;
    if (card.done) patch.done = false;
    if (Object.keys(patch).length > 0) {
      setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
      patchCard(id, patch);
    }
    setFocalId(id);
  }

  function handlePrev() {
    if (orderedActiveCards.length === 0) return;
    const idx = orderedActiveCards.findIndex(c => c.id === focalId);
    const nextIdx = idx <= 0 ? orderedActiveCards.length - 1 : idx - 1;
    setFocalId(orderedActiveCards[nextIdx].id);
  }

  function handleNext() {
    if (orderedActiveCards.length === 0) return;
    const idx = orderedActiveCards.findIndex(c => c.id === focalId);
    const nextIdx = idx < 0 || idx === orderedActiveCards.length - 1 ? 0 : idx + 1;
    setFocalId(orderedActiveCards[nextIdx].id);
  }

  function handleImported(result: ImportResult) {
    setImportResult(result);
    loadCards();
  }

  const journalCard = cards.find(c => c.id === journalCardId) ?? null;

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#b87333' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`work-page jungle-bg ${styles.workPage} pb-28`}>
      <div className="max-w-[1400px] mx-auto mb-6">
        <HeaderBrand version="3.1" showVersion />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Work Cards</h1>
          <p className={styles.subheader}>{cards.length} card{cards.length === 1 ? '' : 's'} on the board</p>
        </header>

        <div className={styles.toolbar}>
          <WorkCardUploadButton onImported={handleImported} />
        </div>

        {importResult && (
          <div className={styles.importSummary}>
            <span>
              Imported {importResult.imported}, updated {importResult.updated}, removed {importResult.removed}
              {importResult.needsReview.length > 0 && ` — ${importResult.needsReview.length} row(s) need review`}
            </span>
            <button type="button" className={styles.dismissBtn} onClick={() => setImportResult(null)}>×</button>
          </div>
        )}
        {importResult && importResult.needsReview.length > 0 && (
          <div className={styles.needsReviewBox}>
            {importResult.needsReview.map((row, i) => (
              <pre key={i} className={styles.needsReviewRow}>{JSON.stringify(row)}</pre>
            ))}
          </div>
        )}

        <WorkCardCarousel
          cards={orderedActiveCards}
          allCards={cards}
          focalId={focalId}
          now={now}
          dueIds={dueIds}
          onPrev={handlePrev}
          onNext={handleNext}
          onToggleDone={handleToggleDone}
          onToggleBackburner={handleToggleBackburner}
          onSetFollowUp={handleSetFollowUp}
          onSetParent={handleSetParent}
          onOpenJournal={setJournalCardId}
          onFocusCard={handleFocusCard}
        />
      </div>

      <DoneListPanel cards={doneCards} onRestore={handleFocusCard} />
      <BackburnerPanel cards={backburnerCards} onRestore={handleFocusCard} />
      <TimerTray cards={pendingFollowUps} now={now} onJumpTo={setFocalId} />
      {journalCard && <WorkCardJournalPanel card={journalCard} onClose={() => setJournalCardId(null)} />}
    </div>
  );
}
