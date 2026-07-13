import { useMemo } from "react";
import { todayISO } from "@/lib/format";

/**
 * Shared metrics for FODashboard and AdminDashboard.
 *
 * FIXED: pendingDeposits used to read ctx.investments.depositStatus — a field that
 * only ever existed on the old unified mock model. Real investment_positions rows
 * ONLY exist once a deposit is already approved (see docs/database-schema.md §3), so
 * that filter was always silently returning an empty array. Pending/reviewable
 * deposits now correctly come from ctx.depositSubmissions.
 *
 * FIXED: all "today" comparisons now use todayISO() (the real current date) instead
 * of the frozen TODAY demo constant — see lib/format.js for why that distinction matters.
 */
export function useStaffMetrics(ctx) {
  return useMemo(() => {
    const today = todayISO();
    const active = ctx.investments.filter((p) => p.status === "active");
    const aum = active.reduce((s, p) => s + p.amount, 0);

    const pendingDeposits = (ctx.depositSubmissions || []).filter(
      (d) => d.status === "pending" || d.status === "clarification_requested"
    );
    const pendingWithdrawals = ctx.withdrawals.filter((w) => w.status === "pending");

    const upcomingMaturities = active.filter(
      (p) => p.maturityDate && daysUntil(p.maturityDate, today) <= 90 && daysUntil(p.maturityDate, today) >= 0
    );
    const overdueMaturities = active.filter((p) => p.maturityDate && p.maturityDate <= today);

    const standardCount = active.filter((p) => p.package === "standard").length;
    const corporateCount = active.filter((p) => p.package === "corporate").length;

    return { active, aum, pendingDeposits, pendingWithdrawals, upcomingMaturities, overdueMaturities, standardCount, corporateCount };
  }, [ctx.investments, ctx.withdrawals, ctx.depositSubmissions]);
}

function daysUntil(dateStr, todayStr) {
  return Math.round((new Date(dateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
}
