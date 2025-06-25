import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type ProjectCreateMethod = "github" | "scratch";

export interface ProjectFormData {
  method: ProjectCreateMethod | null;
  // Data for scratch method
  projectName: string;
  description: string;
  website: string;
  // Data for github method
  selectedRepository: {
    name: string;
    date: string;
  } | null;
  // Common data for roles configuration
  roles: Array<{
    id: string;
    name: string;
    description: string;
    skillLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    isOpen: boolean;
  }>;
}

interface ProjectCreateStore {
  // State
  formData: ProjectFormData;
  currentStep: number;

  // Actions
  setMethod: (method: ProjectCreateMethod) => void;
  updateProjectInfo: (
    info: Partial<
      Pick<ProjectFormData, "projectName" | "description" | "website">
    >
  ) => void;
  selectRepository: (repo: { name: string; date: string }) => void;
  updateRoles: (roles: ProjectFormData["roles"]) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetForm: () => void;
}

const initialFormData: ProjectFormData = {
  method: null,
  projectName: "",
  description: "",
  website: "",
  selectedRepository: null,
  roles: [],
};

export const useProjectCreateStore = create<ProjectCreateStore>()(
  devtools(
    persist(
      (set) => ({
        formData: initialFormData,
        currentStep: 0,

        setMethod: (method) =>
          set((state) => ({
            formData: { ...state.formData, method },
            currentStep: 1,
          })),

        updateProjectInfo: (info) =>
          set((state) => ({
            formData: { ...state.formData, ...info },
          })),

        selectRepository: (repo) =>
          set((state) => ({
            formData: { ...state.formData, selectedRepository: repo },
          })),

        updateRoles: (roles) =>
          set((state) => ({
            formData: { ...state.formData, roles },
          })),

        nextStep: () =>
          set((state) => ({
            currentStep: state.currentStep + 1,
          })),

        previousStep: () =>
          set((state) => ({
            currentStep: Math.max(0, state.currentStep - 1),
          })),

        resetForm: () =>
          set({
            formData: initialFormData,
            currentStep: 0,
          }),
      }),
      {
        name: "project-create-storage",
        partialize: (state) => ({
          formData: state.formData,
          currentStep: state.currentStep,
        }),
      }
    ),
    {
      name: "project-create-store",
    }
  )
);
