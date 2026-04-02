import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Door, Controller, Policy, AccessTestLog } from '../types';

interface ABACState {
  users: User[];
  doors: Door[];
  controllers: Controller[];
  policies: Policy[];
  testLogs: AccessTestLog[];
  
  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  
  setDoors: (doors: Door[]) => void;
  addDoor: (door: Door) => void;
  updateDoor: (door: Door) => void;
  deleteDoor: (id: string) => void;
  
  setControllers: (controllers: Controller[]) => void;
  addController: (controller: Controller) => void;
  updateController: (controller: Controller) => void;
  deleteController: (id: string) => void;
  
  setPolicies: (policies: Policy[]) => void;
  addPolicy: (policy: Policy) => void;
  updatePolicy: (policy: Policy) => void;
  deletePolicy: (id: string) => void;

  addTestLog: (log: AccessTestLog) => void;
  clearAll: () => void;
}

export const useStore = create<ABACState>()(
  persist(
    (set) => ({
      users: [],
      doors: [],
      controllers: [],
      policies: [],
      testLogs: [],

      setUsers: (users) => set({ users }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (user) => set((state) => ({ 
        users: state.users.map((u) => u.id === user.id ? user : u) 
      })),
      deleteUser: (id) => set((state) => ({ 
        users: state.users.filter((u) => u.id !== id) 
      })),

      setDoors: (doors) => set({ doors }),
      addDoor: (door) => set((state) => ({ doors: [...state.doors, door] })),
      updateDoor: (door) => set((state) => ({ 
        doors: state.doors.map((d) => d.id === door.id ? door : d) 
      })),
      deleteDoor: (id) => set((state) => ({ 
        doors: state.doors.filter((d) => d.id !== id) 
      })),

      setControllers: (controllers) => set({ controllers }),
      addController: (controller) => set((state) => ({ controllers: [...state.controllers, controller] })),
      updateController: (controller) => set((state) => ({ 
        controllers: state.controllers.map((c) => c.id === controller.id ? controller : c) 
      })),
      deleteController: (id) => set((state) => ({ 
        controllers: state.controllers.filter((c) => c.id !== id) 
      })),

      setPolicies: (policies) => set({ policies }),
      addPolicy: (policy) => set((state) => ({ policies: [...state.policies, policy] })),
      updatePolicy: (policy) => set((state) => ({ 
        policies: state.policies.map((p) => p.id === policy.id ? policy : p) 
      })),
      deletePolicy: (id) => set((state) => ({ 
        policies: state.policies.filter((p) => p.id !== id) 
      })),

      addTestLog: (log) => set((state) => ({ 
        testLogs: [log, ...state.testLogs].slice(0, 50) 
      })),

      clearAll: () => set({ users: [], doors: [], controllers: [], policies: [], testLogs: [] }),
    }),
    {
      name: 'abac-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
