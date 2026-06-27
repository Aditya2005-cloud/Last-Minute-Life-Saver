import { db, auth } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs,
  writeBatch
} from "firebase/firestore";
import { Task, Habit, ScheduleItem } from "../types";

// --- Custom Error Infrastructure (for security diagnostics) ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Tasks Syncing ---
export const subscribeTasks = (userId: string, callback: (tasks: Task[]) => void) => {
  const q = query(collection(db, "users", userId, "tasks"));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });
    // Sort tasks locally by orderIndex (or fallback to dueDate, then id)
    tasks.sort((a, b) => {
      const aOrder = a.orderIndex ?? 999999;
      const bOrder = b.orderIndex ?? 999999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      
      return a.id.localeCompare(b.id);
    });
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/tasks`);
  });
};

export const saveTaskToFirestore = async (userId: string, task: Task) => {
  const path = `users/${userId}/tasks/${task.id}`;
  try {
    const cleanTask = JSON.parse(JSON.stringify(task)); // ensure no undefined fields
    await setDoc(doc(db, "users", userId, "tasks", task.id), cleanTask);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTaskFromFirestore = async (userId: string, taskId: string) => {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "tasks", taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// --- Habits Syncing ---
export const subscribeHabits = (userId: string, callback: (habits: Habit[]) => void) => {
  const q = query(collection(db, "users", userId, "habits"));
  return onSnapshot(q, (snapshot) => {
    const habits: Habit[] = [];
    snapshot.forEach((doc) => {
      habits.push({ id: doc.id, ...doc.data() } as Habit);
    });
    callback(habits);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/habits`);
  });
};

export const saveHabitToFirestore = async (userId: string, habit: Habit) => {
  const path = `users/${userId}/habits/${habit.id}`;
  try {
    const cleanHabit = JSON.parse(JSON.stringify(habit));
    await setDoc(doc(db, "users", userId, "habits", habit.id), cleanHabit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteHabitFromFirestore = async (userId: string, habitId: string) => {
  const path = `users/${userId}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "habits", habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// --- Schedule/CalendarEvents Syncing ---
export const subscribeSchedule = (userId: string, callback: (schedule: ScheduleItem[]) => void) => {
  const q = query(collection(db, "users", userId, "schedule"));
  return onSnapshot(q, (snapshot) => {
    const schedule: ScheduleItem[] = [];
    snapshot.forEach((doc) => {
      schedule.push({ ...doc.data() } as ScheduleItem);
    });
    callback(schedule);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/schedule`);
  });
};

export const saveScheduleToFirestore = async (userId: string, schedule: ScheduleItem[]) => {
  const path = `users/${userId}/schedule`;
  try {
    const batch = writeBatch(db);
    // Delete existing schedule first
    const snapshot = await getDocs(collection(db, "users", userId, "schedule"));
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Write new items
    schedule.forEach((item, index) => {
      const id = item.taskId || `item-${index}`;
      const docRef = doc(db, "users", userId, "schedule", id);
      batch.set(docRef, JSON.parse(JSON.stringify(item)));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveTasksBatchToFirestore = async (userId: string, changedTasks: Task[], deletedTaskIds: string[]) => {
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    changedTasks.forEach((task) => {
      const docRef = doc(db, "users", userId, "tasks", task.id);
      batch.set(docRef, JSON.parse(JSON.stringify(task)));
    });
    deletedTaskIds.forEach((id) => {
      const docRef = doc(db, "users", userId, "tasks", id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveHabitsBatchToFirestore = async (userId: string, changedHabits: Habit[], deletedHabitIds: string[]) => {
  const path = `users/${userId}/habits`;
  try {
    const batch = writeBatch(db);
    changedHabits.forEach((habit) => {
      const docRef = doc(db, "users", userId, "habits", habit.id);
      batch.set(docRef, JSON.parse(JSON.stringify(habit)));
    });
    deletedHabitIds.forEach((id) => {
      const docRef = doc(db, "users", userId, "habits", id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
