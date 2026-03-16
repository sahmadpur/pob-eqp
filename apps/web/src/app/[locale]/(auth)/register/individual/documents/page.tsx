'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { DocumentUploader } from '@/components/registration/document-uploader';
import { useRegistrationStore } from '@/store/registration.store';

// P1-04: Individual customer — ID / passport document upload
export default function IndividualDocumentsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { addDocumentUpload, otpVerified } = useRegistrationStore();

  const [idUploaded, setIdUploaded] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = idUploaded;

  const handleContinue = () => {
    setLoading(true);
    router.push(`/${locale}/register/success?type=individual`);
  };

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="w-8 h-1.5 rounded-full bg-pob-blue" />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step 4 of 4</span>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1">Identity Documents</h2>
      <p className="text-gray-500 text-sm mb-5">
        Upload your identification documents to verify your identity.
      </p>

      <div className="space-y-5">
        <DocumentUploader
          documentType="NATIONAL_ID"
          label="National ID or Passport"
          description="Front page clearly showing your photo, name, and document number"
          required
          onUploaded={(f) => {
            addDocumentUpload(f.s3Key);
            setIdUploaded(true);
          }}
          onRemove={() => setIdUploaded(false)}
        />

        <DocumentUploader
          documentType="DRIVER_LICENSE"
          label="Driver's License"
          description="Must be valid and clearly legible (optional but recommended)"
          onUploaded={(f) => {
            addDocumentUpload(f.s3Key);
            setPhotoUploaded(true);
          }}
          onRemove={() => setPhotoUploaded(false)}
        />
      </div>

      {/* Info box */}
      <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Privacy Notice:</strong> Your documents are encrypted and stored securely
          on AWS S3 with cross-region replication. They will only be used for identity
          verification purposes and retained for 7 years per legal requirements.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className="py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Completing...' : 'Complete Registration'}
        </button>
      </div>

      {!idUploaded && (
        <p className="text-center text-xs text-gray-400 mt-3">
          National ID or Passport is required to continue
        </p>
      )}
    </>
  );
}
