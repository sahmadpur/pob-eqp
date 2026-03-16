'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { DocumentUploader } from '@/components/registration/document-uploader';
import { useRegistrationStore } from '@/store/registration.store';

// P1-08: Legal entity — document upload
// Required: company registration certificate, tax registration certificate
// Optional: contract, up to 5 additional supporting docs
export default function LegalDocumentsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { addDocumentUpload } = useRegistrationStore();

  const [regCertUploaded, setRegCertUploaded] = useState(false);
  const [taxCertUploaded, setTaxCertUploaded] = useState(false);
  const [additionalCount, setAdditionalCount] = useState(0);

  const canContinue = regCertUploaded && taxCertUploaded;

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full ${step <= 4 ? 'w-8 bg-pob-blue' : 'w-4 bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step 4 of 5</span>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1">Company Documents</h2>
      <p className="text-gray-500 text-sm mb-5">
        Upload your company&apos;s registration documents for Finance review.
      </p>

      <div className="space-y-5">
        {/* Required */}
        <div className="p-4 border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
              Required
            </span>
          </div>

          <DocumentUploader
            documentType="COMPANY_CERTIFICATE"
            label="Company Registration Certificate"
            description="Official state registration certificate (Dövlət qeydiyyatı şəhadətnaməsi)"
            required
            onUploaded={(f) => {
              addDocumentUpload(f.s3Key);
              setRegCertUploaded(true);
            }}
            onRemove={() => setRegCertUploaded(false)}
          />

          <DocumentUploader
            documentType="TAX_CERTIFICATE"
            label="Tax Registration Certificate"
            description="VÖEN / Tax identification certificate issued by Ministry of Taxes"
            required
            onUploaded={(f) => {
              addDocumentUpload(f.s3Key);
              setTaxCertUploaded(true);
            }}
            onRemove={() => setTaxCertUploaded(false)}
          />
        </div>

        {/* Optional */}
        <div className="p-4 border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              Optional
            </span>
          </div>

          <DocumentUploader
            documentType="CONTRACT"
            label="Port Contract / Agreement"
            description="If your company has an existing contract with Port of Baku"
            onUploaded={(f) => {
              addDocumentUpload(f.s3Key);
              setAdditionalCount((n) => n + 1);
            }}
            onRemove={() => setAdditionalCount((n) => Math.max(0, n - 1))}
          />

          <DocumentUploader
            documentType="ADDITIONAL"
            label="Additional Supporting Documents"
            description="Any other supporting documents (max 5 total)"
            maxFiles={Math.max(0, 3 - additionalCount)}
            onUploaded={(f) => {
              addDocumentUpload(f.s3Key);
              setAdditionalCount((n) => n + 1);
            }}
            onRemove={() => setAdditionalCount((n) => Math.max(0, n - 1))}
          />
        </div>
      </div>

      <div className="mt-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Finance Review:</strong> Your documents will be reviewed by a Finance Officer
          within 1–2 business days. You will be notified via email/SMS once a decision is made.
          Ensure all documents are clear, legible, and not expired.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => router.back()}
          className="py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => router.push(`/${locale}/register/legal/review`)}
          disabled={!canContinue}
          className="py-2.5 bg-pob-blue text-white font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Review & Submit →
        </button>
      </div>

      {!canContinue && (
        <p className="text-center text-xs text-gray-400 mt-3">
          Registration certificate and tax certificate are required
        </p>
      )}
    </>
  );
}
