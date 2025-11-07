import {
  BarChart3,
  LineChart,
  ArrowRightLeft,
  TrendingUp,
  Eye,
  Briefcase,
  PieChart,
  MessagesSquare,
  Newspaper,
  Layout,
  type LucideIcon,
} from "lucide-react";

export type SiteConfig = typeof siteConfig;
export type Navigation = {
  icon: LucideIcon;
  name: string;
  href: string;
};

export const siteConfig = {
  title: "PayGo",
  description: "Stop processing. Start paying.",
};

export const navigations: Navigation[] = [
  {
    icon: Layout,
    name: "Dashboard",
    href: "/",
  },
  {
    icon: Layout,
    name: "Emails",
    href: "/emails",
  },
   {
    icon: Layout,
    name: "File extracter",
    href: "/extracted-files",

  },

];