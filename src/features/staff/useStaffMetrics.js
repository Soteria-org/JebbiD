import React, { useMemo } from "react";
import { TODAY } from "@/lib/constants";
import { daysBetween } from "@/lib/format";

export function useStaffMetrics(ctx) {
  return useMemo(() => {
    const active = ctx.investments.filter((p) => p.status === "active");
    const aum = active.reduce((s, p) => s + p.amount, 0);
    const pendingDeposits = ctx.investments.filter((p) => p.depositStatus === "pending");
    const pendingWithdrawals = ctx.withdrawals.filter((w) => w.status === "pending");
    const upcomingMaturities = active.filter((p) => p.maturityDate && daysBetween(TODAY, p.maturityDate) <= 90 && daysBetween(TODAY, p.maturityDate) >= 0);
    const overdueMaturities = active.filter((p) => p.maturityDate && p.maturityDate <= TODAY);
    const standardCount = active.filter((p) => p.package === "standard").length;
    const corporateCount = active.filter((p) => p.package === "corporate").length;
    return { active, aum, pendingDeposits, pendingWithdrawals, upcomingMaturities, overdueMaturities, standardCount, corporateCount };
  }, [ctx.investments, ctx.withdrawals]);
}
