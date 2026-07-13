import React from "react";

export function Svg({ size, color, style, children }) {
  const s = size || 20;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {children}
    </svg>
  );
}

export function Home(p) { return <Svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 21v-6h6v6" /></Svg>; }

export function Wallet(p) { return <Svg {...p}><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="17" cy="14" r="1.4" fill="currentColor" stroke="none" /></Svg>; }

export function TrendingUp(p) { return <Svg {...p}><polyline points="3,17 9,11 13,15 21,7" /><polyline points="14,7 21,7 21,14" /></Svg>; }

export function FileText(p) { return <Svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><line x1="9" y1="13" x2="16" y2="13" /><line x1="9" y1="17" x2="16" y2="17" /></Svg>; }

export function Bell(p) { return <Svg {...p}><path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10.3 20a1.8 1.8 0 003.4 0" /></Svg>; }

export function SettingsIcon(p) { return <Svg {...p}><line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2" /></Svg>; }

export function User(p) { return <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></Svg>; }

export function LogOut(p) { return <Svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></Svg>; }

export function Menu(p) { return <Svg {...p}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></Svg>; }

export function X(p) { return <Svg {...p}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Svg>; }

export function Plus(p) { return <Svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>; }

export function Check(p) { return <Svg {...p}><polyline points="5,13 10,18 19,7" /></Svg>; }

export function XCircle(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></Svg>; }

export function Clock(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 16,14" /></Svg>; }

export function AlertTriangle(p) { return <Svg {...p}><path d="M12 3l10 18H2z" /><line x1="12" y1="9" x2="12" y2="14" /><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" /></Svg>; }

export function ChevronRight(p) { return <Svg {...p}><polyline points="9,5 16,12 9,19" /></Svg>; }

export function ChevronDown(p) { return <Svg {...p}><polyline points="5,9 12,16 19,9" /></Svg>; }

export function ChevronLeft(p) { return <Svg {...p}><polyline points="15,5 8,12 15,19" /></Svg>; }

export function Search(p) { return <Svg {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.3" y2="16.3" /></Svg>; }

export function Eye(p) { return <Svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Svg>; }

export function EyeOff(p) { return <Svg {...p}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0112 5c6 0 10 7 10 7a17.9 17.9 0 01-3.4 4.3M6.6 6.6A17.6 17.6 0 002 12s4 7 10 7c1.4 0 2.7-.3 3.9-.8" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></Svg>; }

export function ArrowUpRight(p) { return <Svg {...p}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="8,7 17,7 17,16" /></Svg>; }

export function ArrowDownRight(p) { return <Svg {...p}><line x1="7" y1="7" x2="17" y2="17" /><polyline points="17,8 17,17 8,17" /></Svg>; }

export function Shield(p) { return <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Svg>; }

export function Users(p) { return <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17" cy="9" r="2.6" /><path d="M16 13.2c2.6.5 4.5 2.4 4.5 4.8" /></Svg>; }

export function ClipboardList(p) { return <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="16" y2="15" /></Svg>; }

export function CreditCard(p) { return <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></Svg>; }

export function Calendar(p) { return <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></Svg>; }

export function Download(p) { return <Svg {...p}><path d="M12 3v12" /><polyline points="7,11 12,16 17,11" /><path d="M5 19h14" /></Svg>; }

export function Edit2(p) { return <Svg {...p}><path d="M16 3l5 5L8 21H3v-5z" /></Svg>; }

export function Lock(p) { return <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></Svg>; }

export function HelpCircle(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 014.8 1c0 1.7-2.3 1.7-2.3 3.5" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" /></Svg>; }

export function RefreshCw(p) { return <Svg {...p}><path d="M21 12a9 9 0 01-15.5 6.3L3 16" /><polyline points="3,21 3,16 8,16" /><path d="M3 12a9 9 0 0115.5-6.3L21 8" /><polyline points="21,3 21,8 16,8" /></Svg>; }

export function Camera(p) { return <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13.5" r="3.5" /></Svg>; }

export function Upload(p) { return <Svg {...p}><path d="M12 16V4" /><polyline points="7,9 12,4 17,9" /><path d="M5 16v3a2 2 0 002 2h10a2 2 0 002-2v-3" /></Svg>; }

export function Target(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></Svg>; }

export function UserPlus(p) { return <Svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></Svg>; }

export function Building2(p) { return <Svg {...p}><rect x="4" y="3" width="11" height="18" /><rect x="15" y="9" width="6" height="12" /><line x1="7" y1="7" x2="9" y2="7" /><line x1="7" y1="11" x2="9" y2="11" /><line x1="7" y1="15" x2="9" y2="15" /></Svg>; }

export function Mail(p) { return <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><polyline points="3,6 12,13 21,6" /></Svg>; }

export function Phone(p) { return <Svg {...p}><path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2.2 2A17 17 0 013 6.2 2 2 0 015 4z" /></Svg>; }

export function MapPin(p) { return <Svg {...p}><path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></Svg>; }

export function Briefcase(p) { return <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="3" y1="13" x2="21" y2="13" /></Svg>; }

export function Award(p) { return <Svg {...p}><circle cx="12" cy="8" r="5" /><polyline points="8.5,13 7,21 12,18 17,21 15.5,13" /></Svg>; }

export function BarChart2(p) { return <Svg {...p}><line x1="6" y1="20" x2="6" y2="11" /><line x1="12" y1="20" x2="12" y2="5" /><line x1="18" y1="20" x2="18" y2="14" /></Svg>; }

export function ShieldCheck(p) { return <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><polyline points="9,12 11,14 15,9" /></Svg>; }

export function FileCheck(p) { return <Svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><polyline points="9,14 11,16 16,11" /></Svg>; }

export function AlertCircle(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" /></Svg>; }

export function Banknote(p) { return <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><line x1="6" y1="9.3" x2="6" y2="9" /><line x1="18" y1="15.3" x2="18" y2="15" /></Svg>; }

export function Landmark(p) { return <Svg {...p}><line x1="3" y1="22" x2="21" y2="22" /><line x1="5" y1="22" x2="5" y2="11" /><line x1="9" y1="22" x2="9" y2="11" /><line x1="15" y1="22" x2="15" y2="11" /><line x1="19" y1="22" x2="19" y2="11" /><polygon points="12,2 21,9 3,9" /></Svg>; }

export function ArrowRightLeft(p) { return <Svg {...p}><polyline points="17,1 21,5 17,9" /><line x1="3" y1="5" x2="21" y2="5" /><polyline points="7,15 3,19 7,23" /><line x1="3" y1="19" x2="21" y2="19" /></Svg>; }

export function CheckCircle2(p) { return <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="8,12 11,15 16,9" /></Svg>; }

export function Repeat(p) { return <Svg {...p}><polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></Svg>; }

export function Sparkles(p) { return <Svg {...p}><path d="M12 2l1.8 4.6L18 8l-4.2 1.6L12 14l-1.8-4.4L6 8l4.2-1.4z" /><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></Svg>; }

export function IdCard(p) { return <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="11" r="2.2" /><line x1="5" y1="16" x2="11" y2="16" /><line x1="14" y1="9" x2="19" y2="9" /><line x1="14" y1="13" x2="19" y2="13" /></Svg>; }

export function UserCog(p) { return <Svg {...p}><circle cx="9" cy="9" r="3.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="18" cy="16" r="2.2" /><line x1="18" y1="12.5" x2="18" y2="13.5" /><line x1="18" y1="18.5" x2="18" y2="19.5" /><line x1="14.5" y1="16" x2="15.5" y2="16" /><line x1="20.5" y1="16" x2="21.5" y2="16" /></Svg>; }

export function KeyRound(p) { return <Svg {...p}><circle cx="8" cy="15" r="4.5" /><path d="M11.5 11.5L21 2" /><path d="M17 6l3 3" /><path d="M14 9l2.5 2.5" /></Svg>; }
