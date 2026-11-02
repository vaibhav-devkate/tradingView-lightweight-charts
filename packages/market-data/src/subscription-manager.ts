/**
 * Reference-counted symbol subscriptions.
 *
 * Several consumers (watchlist, chart, portfolio, or many browser clients on the server)
 * may want the same symbol. The upstream feed should only be asked to subscribe on the
 * first request and unsubscribe when the last consumer goes away.
 */
export class SubscriptionManager {
  private readonly counts = new Map<string, number>();

  /** Registers interest; returns symbols that need a new upstream subscription. */
  acquire(symbols: readonly string[]): string[] {
    const added: string[] = [];
    for (const s of new Set(symbols)) {
      const n = this.counts.get(s) ?? 0;
      this.counts.set(s, n + 1);
      if (n === 0) added.push(s);
    }
    return added;
  }

  /** Releases interest; returns symbols that no consumer needs any more. */
  release(symbols: readonly string[]): string[] {
    const removed: string[] = [];
    for (const s of new Set(symbols)) {
      const n = this.counts.get(s);
      if (n === undefined) continue;
      if (n <= 1) {
        this.counts.delete(s);
        removed.push(s);
      } else {
        this.counts.set(s, n - 1);
      }
    }
    return removed;
  }

  active(): string[] {
    return [...this.counts.keys()];
  }

  isActive(symbol: string): boolean {
    return this.counts.has(symbol);
  }
}
