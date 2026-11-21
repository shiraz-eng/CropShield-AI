"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Notification, User } from "./data";

interface AccountState {
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
}

const Context = createContext<AccountState | null>(null);

export function DemoProvider({
  children,
  account,
  notices,
}: {
  children: ReactNode;
  account: User;
  notices: Notification[];
}) {
  // Derive from server props so completing a reminder updates the count without a reload.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const notifications = notices.filter(({ id }) => !dismissed.includes(id));
  const dismissNotification = (id: string) => setDismissed((ids) => [...ids, id]);
  const [user, setUser] = useState(account);
  return (
    <Context.Provider value={{ notifications, dismissNotification, user, setUser }}>
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("The account provider is missing.");
  return context;
}
