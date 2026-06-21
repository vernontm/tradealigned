/**
 * Navigation config shared between the desktop sidebar and the mobile drawer.
 * Keep this file framework-light, no client hooks, no client-only imports.
 */
import {
  BookOpen,
  CreditCard,
  Gem,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

export const NAV: NavItem[] = [
  { href: "/chat", label: "Trade AI", icon: MessageSquare },
  { href: "/education", label: "Education", icon: GraduationCap },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/drill", label: "Daily Drill", icon: Sparkles },
  { href: "/gems", label: "Gems", icon: Gem },
  { href: "/progress", label: "My Progress", icon: Trophy },
  { href: "/community", label: "Community", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
];
