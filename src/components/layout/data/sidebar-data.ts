import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  Database,
  FileStack,
  Gauge,
  LayoutDashboard,
  Ship,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'
import { type SidebarData } from '../types'

// PORTIX navigation (PORTIX_UI_UX_TRANSFORMATION.md §3). Management perspective
// gets the ten executive modules; the Submission perspective a data workspace.
export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Intelligence',
      items: [
        { title: 'Executive Overview', url: '/', icon: LayoutDashboard, only: 'management' },
        {
          title: 'Port Performance',
          icon: TrendingUp,
          only: 'management',
          items: [
            { title: 'Performance vs target', url: '/performance' },
            { title: 'Vessel-level reports', url: '/reports' },
          ],
        },
        {
          title: 'Vessel Intelligence',
          icon: Ship,
          items: [
            { title: 'Analytics', url: '/vessel-intelligence' },
            { title: 'Vessel calls', url: '/vessel-calls' },
            { title: 'Berths & wharves', url: '/berths' },
            { title: 'Live operations', url: '/operations' },
          ],
        },
        {
          title: 'Terminal Intelligence',
          icon: Building2,
          items: [
            { title: 'Benchmark', url: '/terminals' },
            { title: 'Cargo operations', url: '/cargo' },
          ],
        },
        { title: 'Strategic KPIs', url: '/kpis', icon: Target, only: 'management' },
      ],
    },
    {
      title: 'Decisions',
      items: [
        {
          title: 'Alerts & Risks',
          icon: Bell,
          items: [
            { title: 'Alerts', url: '/alerts' },
            { title: 'Safety & incidents', url: '/incidents' },
          ],
        },
        { title: 'Management Actions', url: '/actions', icon: ClipboardList, only: 'management' },
        { title: 'AI Intelligence', url: '/ask', icon: Bot },
      ],
    },
    {
      title: 'Data',
      items: [
        { title: 'My Data Workspace', url: '/', icon: Gauge, only: 'submission' },
        { title: 'Submissions', url: '/submissions', icon: FileStack, only: 'submission' },
        {
          title: 'Data Integration',
          icon: Database,
          items: [
            { title: 'Submission review', url: '/submissions' },
            { title: 'API integration monitor', url: '/api-monitor' },
            { title: 'Vessel registry', url: '/vessels' },
          ],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        { title: 'Roles & Access', url: '/access', icon: ShieldCheck },
        { title: 'Demo Guide', url: '/guide', icon: BookOpen },
      ],
    },
  ],
}
