"use client";
import useJBDocsStore from "@/state/useJBDocsStore";
import { C, FONT_BODY } from "@/lib/theme";
import { Toast } from "@/components/ui/primitives";
import { Sidebar } from "@/components/layout/Sidebar";

import { LoginScreen } from "@/features/auth/LoginScreen";
import { RegisterWizard } from "@/features/auth/RegisterWizard";
import { ForcedPasswordChange } from "@/features/auth/ForcedPasswordChange";

import { InvestorDashboard } from "@/features/investor/InvestorDashboard";
import { InvestWizard } from "@/features/investor/InvestWizard";
import { MyInvestments } from "@/features/investor/MyInvestments";
import { TransactionHistory } from "@/features/investor/TransactionHistory";
import { WithdrawalsScreen } from "@/features/investor/WithdrawalsScreen";
import { RequestWithdrawalModal } from "@/features/investor/RequestWithdrawalModal";
import { MaturityCentre } from "@/features/investor/MaturityCentre";
import { NotificationsScreen } from "@/features/investor/NotificationsScreen";
import { StatementsScreen } from "@/features/investor/StatementsScreen";
import { ProfileScreen } from "@/features/investor/ProfileScreen";

import { FODashboard } from "@/features/finance/FODashboard";

import { InvestorsTable } from "@/features/staff/InvestorsTable";
import { AddInvestorModal } from "@/features/staff/AddInvestorModal";
import { InvestorDetailScreen } from "@/features/staff/InvestorDetailScreen";
import { DepositsQueue } from "@/features/staff/DepositsQueue";
import { WithdrawalsQueue } from "@/features/staff/WithdrawalsQueue";
import { ReportsScreen } from "@/features/staff/ReportsScreen";
import { AuditLogsScreen } from "@/features/staff/AuditLogsScreen";

import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { AllInvestments } from "@/features/admin/AllInvestments";
import { AdminSettings } from "@/features/admin/AdminSettings";
import { CreateFOModal } from "@/features/admin/CreateFOModal";

/**
 * JBDocsApp
 * ----------------------------------------------------------------
 * Thin routing shell. All state and business logic lives in
 * useJBDocsStore(). This component only:
 *   1. Reads the current session/view from ctx
 *   2. Picks which screen to render
 *   3. Renders the persistent Sidebar + active modals + toasts
 * ----------------------------------------------------------------
 */
export default function JBDocsApp() {
  const ctx = useJBDocsStore();
  const { session, view, forcedPwSession, activeModal, toast } = ctx;

  let content = null;
  if (forcedPwSession) {
    content = <ForcedPasswordChange ctx={ctx} />;
  } else if (!session) {
    content = <LoginScreen ctx={ctx} />;
  } else {
    const role = session.role;
    let screen = null;
    if (role === "investor") {
      if (view === "dashboard") screen = <InvestorDashboard ctx={ctx} />;
      else if (view === "invest") screen = <InvestWizard ctx={ctx} />;
      else if (view === "investments") screen = <MyInvestments ctx={ctx} />;
      else if (view === "transactions") screen = <TransactionHistory ctx={ctx} />;
      else if (view === "withdrawals") screen = <WithdrawalsScreen ctx={ctx} />;
      else if (view === "maturity") screen = <MaturityCentre ctx={ctx} />;
      else if (view === "notifications") screen = <NotificationsScreen ctx={ctx} />;
      else if (view === "statements") screen = <StatementsScreen ctx={ctx} />;
      else if (view === "profile") screen = <ProfileScreen ctx={ctx} />;
      else screen = <InvestorDashboard ctx={ctx} />;
    } else if (role === "finance_officer") {
      if (view === "dashboard") screen = <FODashboard ctx={ctx} />;
      else if (view === "investors") screen = <InvestorsTable ctx={ctx} />;
      else if (view === "investorDetail") screen = <InvestorDetailScreen ctx={ctx} />;
      else if (view === "deposits") screen = <DepositsQueue ctx={ctx} />;
      else if (view === "withdrawals") screen = <WithdrawalsQueue ctx={ctx} />;
      else if (view === "reports") screen = <ReportsScreen ctx={ctx} />;
      else if (view === "auditlogs") screen = <AuditLogsScreen ctx={ctx} />;
      else screen = <FODashboard ctx={ctx} />;
    } else if (role === "super_admin") {
      if (view === "dashboard") screen = <AdminDashboard ctx={ctx} />;
      else if (view === "investors") screen = <InvestorsTable ctx={ctx} />;
      else if (view === "investorDetail") screen = <InvestorDetailScreen ctx={ctx} />;
      else if (view === "allinvestments") screen = <AllInvestments ctx={ctx} />;
      else if (view === "deposits") screen = <DepositsQueue ctx={ctx} />;
      else if (view === "withdrawals") screen = <WithdrawalsQueue ctx={ctx} />;
      else if (view === "reports") screen = <ReportsScreen ctx={ctx} />;
      else if (view === "auditlogs") screen = <AuditLogsScreen ctx={ctx} />;
      else if (view === "settings") screen = <AdminSettings ctx={ctx} />;
      else screen = <AdminDashboard ctx={ctx} />;
    }

    content = (
      <div style={{ display: "flex", height: "100vh", width: "100%", fontFamily: FONT_BODY, background: C.pageBg, overflow: "hidden" }}>
        <Sidebar ctx={ctx} />
        {screen}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh", fontFamily: FONT_BODY }}>
      {content}
      <Toast toast={toast} />
      {activeModal && activeModal.type === "requestWithdrawal" ? <RequestWithdrawalModal ctx={ctx} payload={activeModal.payload} /> : null}
      {activeModal && activeModal.type === "addInvestor" ? <AddInvestorModal ctx={ctx} /> : null}
      {activeModal && activeModal.type === "createFO" ? <CreateFOModal ctx={ctx} /> : null}
    </div>
  );

}
