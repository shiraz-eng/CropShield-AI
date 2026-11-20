"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  farmer,
  initialComparisons,
  initialFields,
  initialNotifications,
  initialReminders,
  type CropComparison,
  type Field,
  type Notification,
  type Reminder,
  type User,
} from "./data";

interface DemoState {
  fields: Field[];
  setFields: Dispatch<SetStateAction<Field[]>>;
  reminders: Reminder[];
  setReminders: Dispatch<SetStateAction<Reminder[]>>;
  notifications: Notification[];
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
  comparisons: CropComparison[];
  setComparisons: Dispatch<SetStateAction<CropComparison[]>>;
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
}

const Context = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState(initialFields);
  const [reminders, setReminders] = useState(initialReminders);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [comparisons, setComparisons] = useState(initialComparisons);
  const [user, setUser] = useState(farmer);
  return (
    <Context.Provider
      value={{
        fields,
        setFields,
        reminders,
        setReminders,
        notifications,
        setNotifications,
        comparisons,
        setComparisons,
        user,
        setUser,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("The demo provider is missing.");
  return context;
}
