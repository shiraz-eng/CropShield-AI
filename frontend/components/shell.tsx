"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CloudSun,
  Droplets,
  House,
  Menu,
  MessageCircle,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Wheat,
  Warehouse,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDemo } from "@/lib/state";
import { Dialog } from "./ui/dialog";
import { cn } from "@/lib/utils";

const navigation = [
  {
    group: "Workspace",
    links: [
      { path: "/dashboard", name: "Dashboard", Icon: House },
      { path: "/scanner", name: "Crop Scanner", Icon: ScanLine },
      { path: "/crop-doctor", name: "AI Crop Doctor", Icon: Stethoscope },
      { path: "/comparison", name: "Crop Comparison", Icon: ArrowLeftRight },
      { path: "/fields", name: "My Fields", Icon: Sprout },
    ],
  },
  {
    group: "Planning",
    links: [
      { path: "/weather", name: "Weather Guardian", Icon: CloudSun },
      { path: "/reminders", name: "Reminders", Icon: CalendarDays },
      { path: "/assistant", name: "AI Assistant", Icon: MessageCircle },
      { path: "/reports", name: "Reports", Icon: ClipboardList },
      { path: "/settings", name: "Settings", Icon: Settings },
    ],
  },
  {
    group: "Farm tools",
    links: [
      { path: "/aquaguard", name: "AquaGuard AI", Icon: Droplets },
      { path: "/rustwatch", name: "RustWatch AI", Icon: ShieldCheck },
      { path: "/grainsafe", name: "GrainSafe AI", Icon: Warehouse },
    ],
  },
];
const destinations = navigation.flatMap((group) => group.links);

export function AppSidebar({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link href="/dashboard" className="brand" onClick={onNavigate}>
        <span className="brand-mark">
          <Wheat size={23} />
        </span>
        <span>
          <strong>CropShield AI</strong>
          <small>Field monitoring workspace</small>
        </span>
      </Link>
      <nav aria-label="Main navigation">
        {navigation.map(({ group, links }) => (
          <div className="nav-group" key={group}>
            <div className="nav-heading">{group}</div>
            {links.map(({ path: href, name, Icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  className={cn("nav-link", active && "active")}
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {active && <ChevronRight className="nav-arrow" size={15} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <ShieldCheck size={20} />
        <div>
          <strong>Private workspace</strong>
          <small>Your fields and observations</small>
        </div>
      </div>
    </>
  );
}

type SearchField = { id: string; name: string };

export function AppHeader({
  path,
  fields,
}: {
  path: string;
  fields: SearchField[];
}) {
  const { notifications, dismissNotification, user } = useDemo();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const title =
    destinations.find(
      ({ path: href }) => path === href || path.startsWith(href + "/"),
    )?.name ?? "Workspace";
  const matches = [
    ...destinations.map(({ name, path }) => ({ name, path })),
    ...fields.map(({ id, name }) => ({ name, path: "/fields/" + id })),
  ].filter(({ name }) =>
    name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <header className="app-header">
      <div className="header-start">
        <div className="mobile-menu">
          <Dialog
            title="Navigation"
            description="Choose a workspace page."
            open={drawer}
            onOpenChange={setDrawer}
            trigger={
              <button className="icon-button" aria-label="Open navigation">
                <Menu size={21} />
              </button>
            }
          >
            <div className="drawer-nav">
              <AppSidebar path={path} onNavigate={() => setDrawer(false)} />
            </div>
          </Dialog>
        </div>
        <div className="breadcrumbs">
          <span>Workspace</span>
          <ChevronRight size={13} />
          <strong>{title}</strong>
        </div>
      </div>
      <div className="header-actions">
        <Dialog
          title="Search workspace"
          description="Find a page or field."
          open={searchOpen}
          onOpenChange={setSearchOpen}
          trigger={
            <button className="search-trigger">
              <Search size={17} />
              <span>Search workspace</span>
            </button>
          }
        >
          <input
            aria-label="Search workspace"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="search-results">
            {matches.map(({ name, path }) => (
              <Link
                key={path}
                href={path}
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                {name}
                <ChevronRight size={15} />
              </Link>
            ))}
            {!matches.length && <p>No results found.</p>}
          </div>
        </Dialog>
        <Dialog
          title="Notifications"
          description="Reminders and module inspections that are overdue or due within 7 days."
          open={notificationOpen}
          onOpenChange={setNotificationOpen}
          trigger={
            <button
              className="icon-button notification-trigger"
              aria-label={`Notifications (${user.notifications ? notifications.length : 0})`}
            >
              <Bell size={19} />
              {user.notifications && notifications.length > 0 && <i />}
            </button>
          }
        >
          {!user.notifications ? (
            <p>Notifications are paused in Settings.</p>
          ) : notifications.length ? (
            <div className="stack">
              {notifications.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Dismiss ${item.title}`}
                    onClick={() => dismissNotification(item.id)}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>You’re all caught up.</p>
          )}
        </Dialog>
        <Link
          href="/settings"
          className="profile"
          aria-label="Profile settings"
        >
          <span className="avatar">
            {user.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
          <span>
            <strong>{user.name}</strong>
            <small>Farmer</small>
          </span>
          <ChevronDown size={14} />
        </Link>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  fields,
}: {
  children: ReactNode;
  fields: SearchField[];
}) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <AppSidebar path={path} />
      </aside>
      <div className="workspace">
        <AppHeader path={path} fields={fields} />
        <main id="main-content" tabIndex={-1} className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
