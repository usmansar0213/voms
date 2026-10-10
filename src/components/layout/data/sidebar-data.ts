import {
  Anchor,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  FileStack,
  LayoutDashboard,
  Package,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Waves,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Home',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Submission Center', url: '/submissions', icon: FileStack, only: 'submission' },
        { title: 'Submission Review', url: '/submissions', icon: FileStack, only: 'management' },
        { title: 'Alerts', url: '/alerts', icon: Bell },
        { title: 'Ask VOMS (AI)', url: '/ask', icon: Bot },
      ],
    },
    {
      title: 'Operations',
      items: [
        { title: 'Vessel Calls', url: '/vessel-calls', icon: Ship },
        { title: 'Berths & Wharves', url: '/berths', icon: Anchor },
        { title: 'Cargo & Terminal', url: '/cargo', icon: Package },
        { title: 'Safety & Incidents', url: '/incidents', icon: ShieldAlert },
      ],
    },
    {
      title: 'Data & Reporting',
      items: [
        { title: 'API Integration Monitor', url: '/api-monitor', icon: PlugZap },
        { title: 'KPIs & Reports', url: '/reports', icon: BarChart3, only: 'management' },
        { title: 'Vessel Registry', url: '/vessels', icon: Waves },
      ],
    },
    {
      title: 'System',
      items: [
        { title: 'Roles & Access', url: '/access', icon: ShieldCheck },
        { title: 'Demo Guide', url: '/guide', icon: BookOpen },
      ],
    },
  ],
}
