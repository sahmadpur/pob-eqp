import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface IndividualDraft {
  firstName: string;
  lastName: string;
  fathersName?: string;
  dateOfBirth: string;
  nationalIdOrPassport: string;
  email?: string;
  phone?: string;
  preferredLanguage: string;
}

interface LegalDraft {
  companyName: string;
  taxRegistrationId: string;
  contactPersonName: string;
  contactPersonPhone?: string;
  email?: string;
  phone?: string;
  preferredLanguage: string;
}

interface RegistrationState {
  userId: string | null;
  identifier: string | null; // email or phone used for OTP
  otpVerified: boolean;
  individualDraft: IndividualDraft | null;
  legalDraft: LegalDraft | null;
  documentUploads: string[]; // S3 keys

  setUserId: (id: string) => void;
  setIdentifier: (identifier: string) => void;
  setOtpVerified: (v: boolean) => void;
  setIndividualDraft: (draft: IndividualDraft) => void;
  setLegalDraft: (draft: LegalDraft) => void;
  addDocumentUpload: (s3Key: string) => void;
  reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      userId: null,
      identifier: null,
      otpVerified: false,
      individualDraft: null,
      legalDraft: null,
      documentUploads: [],

      setUserId: (id) => set({ userId: id }),
      setIdentifier: (identifier) => set({ identifier }),
      setOtpVerified: (v) => set({ otpVerified: v }),
      setIndividualDraft: (draft) => set({ individualDraft: draft }),
      setLegalDraft: (draft) => set({ legalDraft: draft }),
      addDocumentUpload: (s3Key) =>
        set((state) => ({ documentUploads: [...state.documentUploads, s3Key] })),
      reset: () =>
        set({
          userId: null,
          identifier: null,
          otpVerified: false,
          individualDraft: null,
          legalDraft: null,
          documentUploads: [],
        }),
    }),
    {
      name: 'pob-registration',
      storage: createJSONStorage(() => sessionStorage), // session only — don't persist beyond tab
    },
  ),
);

// Re-export type for use in pages
export type { RegistrationState };
