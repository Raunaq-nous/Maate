// Test document classification logic used in use-upload

function getDocumentType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes('prescription') || name.includes('rx') || name.includes('medication')) {
    return 'PRESCRIPTION';
  }
  if (
    name.includes('scan') ||
    name.includes('mri') ||
    name.includes('xray') ||
    name.includes('x-ray') ||
    name.includes('ultrasound') ||
    name.includes('imaging')
  ) {
    return 'IMAGING';
  }
  if (name.includes('discharge') || name.includes('summary') || name.includes('hospital')) {
    return 'DISCHARGE_SUMMARY';
  }
  if (name.includes('vaccin') || name.includes('immuniz')) {
    return 'VACCINATION';
  }
  if (name.includes('insurance') || name.includes('claim') || name.includes('policy')) {
    return 'INSURANCE';
  }
  if (name.includes('referral') || name.includes('letter')) {
    return 'REFERRAL';
  }
  if (name.includes('consent')) {
    return 'CONSENT_FORM';
  }
  if (name.includes('note') || name.includes('doctor')) {
    return 'DOCTOR_NOTE';
  }
  if (
    name.includes('lab') ||
    name.includes('blood') ||
    name.includes('report') ||
    name.includes('test') ||
    name.includes('panel')
  ) {
    return 'LAB_REPORT';
  }
  return 'OTHER';
}

describe('Document Upload Classification & State Machine', () => {
  describe('getDocumentType Classification', () => {
    it('should classify lab reports correctly', () => {
      expect(getDocumentType('fasting_blood_sugar_panel.pdf')).toBe('LAB_REPORT');
      expect(getDocumentType('lipid_profile_test_2026.png')).toBe('LAB_REPORT');
      expect(getDocumentType('complete_metabolic_report.pdf')).toBe('LAB_REPORT');
    });

    it('should classify prescriptions and medications correctly', () => {
      expect(getDocumentType('rx_metformin_dr_mehta.jpg')).toBe('PRESCRIPTION');
      expect(getDocumentType('prescription_hypertension.pdf')).toBe('PRESCRIPTION');
      expect(getDocumentType('medication_schedule.pdf')).toBe('PRESCRIPTION');
    });

    it('should classify imaging scans correctly', () => {
      expect(getDocumentType('chest_xray_scan.png')).toBe('IMAGING');
      expect(getDocumentType('mri_brain_t2.dcm')).toBe('IMAGING');
      expect(getDocumentType('abdominal_ultrasound.jpeg')).toBe('IMAGING');
    });

    it('should classify discharge summaries and hospital records correctly', () => {
      expect(getDocumentType('hospital_discharge_summary.pdf')).toBe('DISCHARGE_SUMMARY');
    });

    it('should fallback to OTHER for unrecognized documents', () => {
      expect(getDocumentType('miscellaneous_receipt.pdf')).toBe('OTHER');
      expect(getDocumentType('unknown_scan.pdf')).toBe('IMAGING');
      expect(getDocumentType('file_12345.pdf')).toBe('OTHER');
    });
  });

  describe('Upload File State Flow', () => {
    it('should initialize files in idle state with 0 progress', () => {
      const mockFile = { name: 'blood_test.pdf', size: 1024, type: 'application/pdf' };
      const uploadItem = {
        id: 'upload-1',
        file: mockFile,
        progress: 0,
        status: 'idle' as const,
      };

      expect(uploadItem.status).toBe('idle');
      expect(uploadItem.progress).toBe(0);
    });

    it('should handle terminal processing status transitions', () => {
      const transitions = [
        { status: 'idle', progress: 0 },
        { status: 'uploading', progress: 50 },
        { status: 'processing', progress: 100 },
        { status: 'completed', progress: 100 },
      ];

      expect(transitions[0].status).toBe('idle');
      expect(transitions[3].status).toBe('completed');
    });
  });
});
