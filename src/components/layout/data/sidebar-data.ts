import {
  Anchor,
  BarChart3,
  BookOpen,
  Cable,
  LayoutDashboard,
  Package,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Waves,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Operations',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Vessel Calls', url: '/vessel-calls', icon: Ship },
        { title: 'Berth Board', url: '/berths', icon: Anchor },
        { title: 'Cargo & Terminal', url: '/cargo', icon: Package },
        { title: 'Safety & Incidents', url: '/incidents', icon: ShieldAlert },
      ],
    },
    {
      title: 'Master Data',
      items: [{ title: 'Vessel Registry', url: '/vessels', icon: Waves }],
    },
    {
      title: 'Reporting',
      items: [{ title: 'KPIs & Reports', url: '/reports', icon: BarChart3 }],
    },
    {
      title: 'System',
      items: [
        { title: 'Integration Simulator', url: '/integrations', icon: Cable },
        { title: 'Roles & Access', url: '/access', icon: ShieldCheck },
        { title: 'Demo Guide', url: '/guide', icon: BookOpen },
      ],
    },
  ],
}
