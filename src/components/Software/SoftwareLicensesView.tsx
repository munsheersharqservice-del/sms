import React, { useState } from 'react';
import { SoftwareDirectoryView } from './SoftwareDirectoryView';
import { RegisterSoftwareView } from './RegisterSoftwareView';
import { SoftwareLicense } from '../../types';

export const SoftwareLicensesView: React.FC = () => {
  const [subTab, setSubTab] = useState<'dir' | 'reg'>('dir');
  const [editingLicense, setEditingLicense] = useState<SoftwareLicense | null>(null);

  const handleEdit = (lic: SoftwareLicense) => {
    setEditingLicense(lic);
    setSubTab('reg');
  };

  const handleRegisterNew = () => {
    setEditingLicense(null);
    setSubTab('reg');
  };

  const handleSuccess = () => {
    setEditingLicense(null);
    setSubTab('dir');
  };

  const handleCancel = () => {
    setEditingLicense(null);
    setSubTab('dir');
  };

  return (
    <div className="space-y-6 pb-12">
      {subTab === 'dir' ? (
        <SoftwareDirectoryView
          onRegisterNew={handleRegisterNew}
          onEdit={handleEdit}
        />
      ) : (
        <RegisterSoftwareView
          editLicense={editingLicense}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
