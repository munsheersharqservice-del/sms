import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  HardDrive,
  Server,
  Plus,
  CheckCircle2,
  Building,
  Building2,
  MapPin,
  Calendar,
  Shield,
  FileText,
  KeyRound,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Clock,
  Paperclip,
  UploadCloud,
  FileCheck,
  Trash2,
  FileCode,
  Search,
  Check,
  Microscope,
} from 'lucide-react';
import { Department, Asset, SoftwareLicense, AccessoryItem, CustomerSector, PpmFrequency, AttachmentItem, PpmType, isGovernmentCustomer, resolveCustomerSector } from '../../types';
import { EXCEL_SOFTWARE_REGISTRY_URL } from '../Software/SoftwareDirectoryView';
import { calculateNextPpmDate } from '../../utils/ppmUtils';

export const STANDARD_MANUFACTURERS = [
  'PLANMECA',
  'KAVO',
  'AMANN GIRRBACH',
  'SIEMENS HEALTHINEERS',
  'MELAG',
  'DENTSPLY SIRONA',
  'VITA ZAHNFABRIK',
  '3D SYSTEMS',
  'BIOLASE',
  'ACTEON',
  'CARESTREAM DENTAL',
  'SHARQ MEDICAL',
  'W&H',
  'NSK',
  'A-DEC',
  'STERN WEBER',
  'SIRONA',
  'NEWTOM',
  'MYRAY',
  'CASTELLINI',
  'FONA',
  'PHILIPS',
  'GE HEALTHCARE',
];

export const computeWarrantyExpiry = (installDate: string, years: number): string => {
  if (!installDate || years <= 0) return '';
  try {
    const parts = installDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parts[1];
      const day = parts[2];
      if (!isNaN(year)) {
        return `${year + years}-${month}-${day}`;
      }
    }
    const d = new Date(installDate);
    if (isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

interface AssetSoftwareSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'asset' | 'software';
  prefilledCustomerName?: string;
  prefilledAsset?: Asset | null;
  prefilledSoftware?: SoftwareLicense | null;
}

export const AssetSoftwareSideDrawer: React.FC<AssetSoftwareSideDrawerProps> = ({
  isOpen,
  onClose,
  initialMode = 'asset',
  prefilledCustomerName,
  prefilledAsset,
  prefilledSoftware,
}) => {
  const {
    customers,
    assets,
    addCustomer,
    addAsset,
    updateAsset,
    addSoftwareLicense,
    updateSoftwareLicense,
    refreshSoftwareLicensesFromExcel,
    refreshFromGoogleSheets,
    isSyncingSheets,
    isGoogleConnected,
    connectGoogle,
    googleUser,
    currentSpreadsheetUrl,
    exportToGoogleSheets,
    isAdmin,
  } = useApp();

  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [activeMode, setActiveMode] = useState<'asset' | 'software'>(initialMode);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Customer Add Modal State
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustLocation, setQuickCustLocation] = useState('');
  const [quickCustSector, setQuickCustSector] = useState<CustomerSector>('Private');
  const [quickCustDept, setQuickCustDept] = useState<Department>('Medical');
  const [quickCustContact, setQuickCustContact] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');

  // Customer Dropdown & Search States (Asset Form)
  const [assetCustomerSearch, setAssetCustomerSearch] = useState('');
  const [showAssetCustomerDropdown, setShowAssetCustomerDropdown] = useState(false);
  const assetCustomerDropdownRef = useRef<HTMLDivElement>(null);

  // Manufacturer States (Asset Form)
  const [isCustomManufacturer, setIsCustomManufacturer] = useState(false);
  const [customManufacturerInput, setCustomManufacturerInput] = useState('');

  // Customer Dropdown & Search States (Software Form)
  const [softCustomerSearch, setSoftCustomerSearch] = useState('');
  const [showSoftCustomerDropdown, setShowSoftCustomerDropdown] = useState(false);
  const softCustomerDropdownRef = useRef<HTMLDivElement>(null);

  // Software Provider Custom State
  const [isCustomSoftProvider, setIsCustomSoftProvider] = useState(false);
  const [customSoftProviderInput, setCustomSoftProviderInput] = useState('');

  // Asset Form States - Clean and empty by default
  const [assetSerial, setAssetSerial] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetManufacturer, setAssetManufacturer] = useState('');
  const [assetCustomer, setAssetCustomer] = useState('');
  const [assetSector, setAssetSector] = useState<CustomerSector>('Private');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetRoom, setAssetRoom] = useState('');
  const [assetDept, setAssetDept] = useState<Department>('Dental');
  const [assetInstallDate, setAssetInstallDate] = useState('');
  const [assetWarrantyYears, setAssetWarrantyYears] = useState<number>(1);
  const [assetWarrantyExpiry, setAssetWarrantyExpiry] = useState('');
  const [assetPpmFrequency, setAssetPpmFrequency] = useState<PpmFrequency>('None');
  const [assetPpmType, setAssetPpmType] = useState<PpmType>('Yearly Maintenance');
  const [assetLastPpmDate, setAssetLastPpmDate] = useState('');
  const [assetNextPpmDate, setAssetNextPpmDate] = useState('');
  const [assetInvoiceNo, setAssetInvoiceNo] = useState('');
  const [assetReportNo, setAssetReportNo] = useState('');
  const [assetReportLink, setAssetReportLink] = useState('');
  const [assetAccessoriesText, setAssetAccessoriesText] = useState('');
  const [assetPartsText, setAssetPartsText] = useState('');
  const [assetParts, setAssetParts] = useState<{ name: string; serialNumber: string }[]>([
    { name: '', serialNumber: '' },
    { name: '', serialNumber: '' },
    { name: '', serialNumber: '' },
  ]);

  // Asset File Attachment State
  const [assetAttachmentName, setAssetAttachmentName] = useState('');
  const [assetAttachmentDataUrl, setAssetAttachmentDataUrl] = useState('');
  const [assetAttachmentSize, setAssetAttachmentSize] = useState<number>(0);
  const assetFileInputRef = useRef<HTMLInputElement>(null);

  // Software Form States - Clean and empty by default
  const [softCustomer, setSoftCustomer] = useState('');
  const [softLocation, setSoftLocation] = useState('');
  const [softProvider, setSoftProvider] = useState('');
  const [softName, setSoftName] = useState('');
  const [softVersion, setSoftVersion] = useState('');
  const [softLicenseKey, setSoftLicenseKey] = useState('');
  const [softServerIp, setSoftServerIp] = useState('');
  const [softNotes, setSoftNotes] = useState('');
  const [softInstalledDate, setSoftInstalledDate] = useState('');

  // Software File Attachment State
  const [softAttachmentName, setSoftAttachmentName] = useState('');
  const [softAttachmentDataUrl, setSoftAttachmentDataUrl] = useState('');
  const [softAttachmentSize, setSoftAttachmentSize] = useState<number>(0);
  const softFileInputRef = useRef<HTMLInputElement>(null);

  // Refs to prevent unwanted form wiping when dependencies change
  const prevIsOpenRef = useRef(false);
  const activeEditingAssetIdRef = useRef<string | null>(null);
  const activeEditingSoftwareIdRef = useRef<string | null>(null);

  // Sync mode with props
  useEffect(() => {
    if (initialMode && isOpen && !prevIsOpenRef.current) {
      setActiveMode(initialMode);
    }
  }, [initialMode, isOpen]);

  // Load prefilled or initialize empty form ONLY when opened or when target item changes
  useEffect(() => {
    if (isOpen) {
      const isFreshOpen = !prevIsOpenRef.current;
      const assetId = prefilledAsset?.id || null;
      const softwareId = prefilledSoftware?.id || null;
      const targetChanged =
        (prefilledAsset && assetId !== activeEditingAssetIdRef.current) ||
        (prefilledSoftware && softwareId !== activeEditingSoftwareIdRef.current);

      if (isFreshOpen || targetChanged) {
        prevIsOpenRef.current = true;
        activeEditingAssetIdRef.current = assetId;
        activeEditingSoftwareIdRef.current = softwareId;
        setSuccessMessage(null);
        setShowQuickAddCust(false);

        if (prefilledAsset) {
          setActiveMode('asset');
          setAssetSerial(prefilledAsset.serialNumber || '');
          setAssetNumber(prefilledAsset.assetNumber || '');
          setAssetModel(prefilledAsset.model || '');
          setAssetManufacturer(prefilledAsset.manufacturer || '');
          setIsCustomManufacturer(false);
          setCustomManufacturerInput('');
          setAssetCustomer(prefilledAsset.customerName || '');
          setAssetSector(prefilledAsset.sector || 'Private');
          setAssetLocation(prefilledAsset.customerLocation || '');
          setAssetRoom(prefilledAsset.roomNumber || '');
          setAssetDept(prefilledAsset.department || 'Dental');
          setAssetInstallDate(prefilledAsset.installationDate || '');
          
          let initYears = 1;
          if (prefilledAsset.warrantyDuration) {
            const match = prefilledAsset.warrantyDuration.match(/\d+/);
            if (match) initYears = Math.min(10, Math.max(0, parseInt(match[0], 10)));
          } else if (prefilledAsset.installationDate && prefilledAsset.warrantyExpiry) {
            try {
              const iy = new Date(prefilledAsset.installationDate).getFullYear();
              const ey = new Date(prefilledAsset.warrantyExpiry).getFullYear();
              if (!isNaN(iy) && !isNaN(ey) && ey >= iy) {
                initYears = Math.min(10, Math.max(0, ey - iy));
              }
            } catch {}
          }
          setAssetWarrantyYears(initYears);
          setAssetWarrantyExpiry(
            prefilledAsset.warrantyExpiry ||
              computeWarrantyExpiry(prefilledAsset.installationDate || '', initYears)
          );

          setAssetPpmFrequency(prefilledAsset.ppmFrequency || 'None');
          setAssetPpmType(prefilledAsset.ppmType || 'Yearly Maintenance');
          setAssetLastPpmDate(prefilledAsset.lastPpmDate || '');
          setAssetNextPpmDate(prefilledAsset.nextPpmDate || '');
          setAssetInvoiceNo(prefilledAsset.invoiceNo || '');
          setAssetReportNo(prefilledAsset.installationReportNumber || '');
          setAssetReportLink(prefilledAsset.installationReportLink || '');
          setAssetAccessoriesText(
            prefilledAsset.accessories?.map((ac) => `${ac.name} (${ac.serialNumber})`).join(', ') || ''
          );
          setAssetPartsText(
            prefilledAsset.partsApplicable?.map((p) => `${p.partName}: ${p.partSerialNumber}`).join(', ') || ''
          );

          const loadedParts = [
            { name: '', serialNumber: '' },
            { name: '', serialNumber: '' },
            { name: '', serialNumber: '' },
          ];
          if (prefilledAsset.partsApplicable && prefilledAsset.partsApplicable.length > 0) {
            prefilledAsset.partsApplicable.slice(0, 3).forEach((p, idx) => {
              loadedParts[idx] = {
                name: p.partName || '',
                serialNumber: p.partSerialNumber || '',
              };
            });
          }
          setAssetParts(loadedParts);

          setAssetAttachmentName(prefilledAsset.attachmentName || prefilledAsset.attachments?.[0]?.name || '');
          setAssetAttachmentDataUrl(prefilledAsset.attachmentDataUrl || prefilledAsset.attachments?.[0]?.dataUrl || '');
          setAssetAttachmentSize(prefilledAsset.attachments?.[0]?.size || 0);
        } else if (isFreshOpen) {
          // ASSET ADD ALL FILLING KEEP EMPTY ENGINEER WILL CHOOSE
          setAssetSerial('');
          setAssetNumber('');
          setAssetModel('');
          setAssetManufacturer('');
          setIsCustomManufacturer(false);
          setCustomManufacturerInput('');
          setAssetCustomer(prefilledCustomerName || '');
          const matchCust = customers.find((c) => c.name === prefilledCustomerName);
          setAssetSector(matchCust?.sector || 'Private');
          setAssetLocation(matchCust?.location || '');
          setAssetRoom('');
          setAssetDept('Dental');
          setAssetInstallDate('');
          setAssetWarrantyYears(1);
          setAssetWarrantyExpiry('');
          setAssetPpmFrequency('None');
          setAssetLastPpmDate('');
          setAssetNextPpmDate('');
          setAssetInvoiceNo('');
          setAssetReportNo('');
          setAssetReportLink('');
          setAssetAccessoriesText('');
          setAssetPartsText('');
          setAssetParts([
            { name: '', serialNumber: '' },
            { name: '', serialNumber: '' },
            { name: '', serialNumber: '' },
          ]);
          setAssetAttachmentName('');
          setAssetAttachmentDataUrl('');
          setAssetAttachmentSize(0);
        }

        if (prefilledSoftware) {
          setActiveMode('software');
          setSoftCustomer(prefilledSoftware.customerName || '');
          setSoftLocation(prefilledSoftware.customerLocation || '');
          setSoftProvider(prefilledSoftware.manufacturer || '');
          setIsCustomSoftProvider(false);
          setCustomSoftProviderInput('');
          setSoftName(prefilledSoftware.model || '');
          setSoftVersion(prefilledSoftware.version || '');
          setSoftLicenseKey(prefilledSoftware.licenseNumber || '');
          setSoftServerIp(prefilledSoftware.serverIp || '');
          setSoftNotes(prefilledSoftware.notes || '');
          setSoftInstalledDate(prefilledSoftware.installedDate || '');
          setSoftAttachmentName(prefilledSoftware.attachmentName || prefilledSoftware.attachments?.[0]?.name || '');
          setSoftAttachmentDataUrl(prefilledSoftware.attachmentDataUrl || prefilledSoftware.attachments?.[0]?.dataUrl || '');
          setSoftAttachmentSize(prefilledSoftware.attachments?.[0]?.size || 0);
        } else if (isFreshOpen) {
          setSoftCustomer(prefilledCustomerName || '');
          const matchCust = customers.find((c) => c.name === prefilledCustomerName);
          setSoftLocation(matchCust?.location || '');
          setSoftProvider('');
          setIsCustomSoftProvider(false);
          setCustomSoftProviderInput('');
          setSoftName('');
          setSoftVersion('');
          setSoftLicenseKey('');
          setSoftServerIp('');
          setSoftNotes('');
          setSoftInstalledDate('');
          setSoftAttachmentName('');
          setSoftAttachmentDataUrl('');
          setSoftAttachmentSize(0);
        }
      }
    } else {
      prevIsOpenRef.current = false;
      activeEditingAssetIdRef.current = null;
      activeEditingSoftwareIdRef.current = null;
    }
  }, [isOpen, prefilledAsset, prefilledSoftware, prefilledCustomerName]);

  // Dynamic list of all manufacturers (standard + any from existing assets and software)
  const allManufacturers = Array.from(
    new Set([
      ...STANDARD_MANUFACTURERS,
      ...assets.map((a) => (a.manufacturer || '').trim().toUpperCase()).filter(Boolean),
    ])
  ).sort();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assetCustomerDropdownRef.current &&
        !assetCustomerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssetCustomerDropdown(false);
      }
      if (
        softCustomerDropdownRef.current &&
        !softCustomerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSoftCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customer list for Asset Drawer
  const filteredAssetCustomers = customers.filter((c) => {
    const q = assetCustomerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.sector && c.sector.toLowerCase().includes(q))
    );
  });

  // Filtered customer list for Software Drawer
  const filteredSoftCustomers = customers.filter((c) => {
    const q = softCustomerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  });

  // When PPM frequency or install date changes, auto-update next PPM date if not custom
  const handlePpmFrequencyChange = (freq: PpmFrequency) => {
    setAssetPpmFrequency(freq);
    if (freq !== 'None') {
      const baseDate = assetLastPpmDate || assetInstallDate || new Date().toISOString().split('T')[0];
      const nextDate = calculateNextPpmDate(baseDate, freq);
      setAssetNextPpmDate(nextDate);
    } else {
      setAssetNextPpmDate('');
    }
  };

  // Handle Asset File Upload
  const handleAssetFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAssetAttachmentName(file.name);
      setAssetAttachmentDataUrl(reader.result as string);
      setAssetAttachmentSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  // Handle Software File Upload
  const handleSoftFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSoftAttachmentName(file.name);
      setSoftAttachmentDataUrl(reader.result as string);
      setSoftAttachmentSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  // Handle Quick Customer Creation
  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      alert('Please enter a Customer / Facility Name.');
      return;
    }

    const resolvedSector = resolveCustomerSector(quickCustName, quickCustSector);
    const created = addCustomer({
      name: quickCustName.trim().toUpperCase(),
      location: quickCustLocation.trim() || 'Doha, Qatar',
      sector: resolvedSector,
      department: quickCustDept,
      contactPerson: quickCustContact.trim() || undefined,
      phone: quickCustPhone.trim() || undefined,
      email: quickCustEmail.trim() || undefined,
    });

    if (activeMode === 'asset') {
      setAssetCustomer(created.name);
      setAssetLocation(created.location);
      setAssetSector(created.sector || 'Private');
    } else {
      setSoftCustomer(created.name);
      setSoftLocation(created.location);
    }

    setShowQuickAddCust(false);
    setQuickCustName('');
    setQuickCustLocation('');
    setQuickCustContact('');
    setQuickCustPhone('');
    setQuickCustEmail('');
    setSuccessMessage(`Master Customer "${created.name}" added and selected!`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  if (!isOpen) return null;

  // Handle Asset Submission
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveMfg = (
      isCustomManufacturer
        ? customManufacturerInput
        : (assetManufacturer && assetManufacturer !== '__ADD_NEW__' ? assetManufacturer : customManufacturerInput)
    ).trim().toUpperCase() || 'SHARQ MEDICAL';

    if (!assetSerial.trim() || !assetModel.trim() || !assetCustomer.trim()) {
      alert('Please fill in Serial Number, Model, and Customer Name.');
      return;
    }

    // Auto-create customer in Master Customers if not yet registered
    const trimmedCust = assetCustomer.trim().toUpperCase();
    const existingCust = customers.find((c) => c.name.toUpperCase() === trimmedCust);
    if (!existingCust && trimmedCust) {
      addCustomer({
        name: trimmedCust,
        location: assetLocation.trim() || 'Doha, Qatar',
        sector: assetSector,
        department: assetDept,
      });
    }

    const calculatedNextPpm =
      assetNextPpmDate ||
      (assetPpmFrequency && assetPpmFrequency !== 'None' && (assetLastPpmDate || assetInstallDate)
        ? calculateNextPpmDate(assetLastPpmDate || assetInstallDate, assetPpmFrequency)
        : undefined);

    const effectiveWarrantyExpiry =
      assetWarrantyExpiry ||
      (assetInstallDate && assetWarrantyYears > 0
        ? computeWarrantyExpiry(assetInstallDate, assetWarrantyYears)
        : undefined);

    const parsedAccessories: AccessoryItem[] = assetAccessoriesText
      .split(',')
      .map((item, idx) => ({
        id: `acc-${Date.now()}-${idx}`,
        name: item.trim(),
        serialNumber: `ACC-SN-${idx + 1}`,
      }))
      .filter((a) => a.name.length > 0);

    const savedParts = assetParts
      .filter((p) => (p.name && p.name.trim()) || (p.serialNumber && p.serialNumber.trim()))
      .map((p, idx) => ({
        id: `part-${Date.now()}-${idx}`,
        partName: p.name.trim(),
        partSerialNumber: p.serialNumber.trim().toUpperCase(),
      }));

    const assetAttachments: AttachmentItem[] = assetAttachmentName && assetAttachmentDataUrl
      ? [
          {
            id: `att-asset-${Date.now()}`,
            name: assetAttachmentName,
            size: assetAttachmentSize || 1024,
            type: assetAttachmentName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            dataUrl: assetAttachmentDataUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]
      : [];

    if (prefilledAsset) {
      updateAsset(prefilledAsset.id, {
        serialNumber: assetSerial.trim().toUpperCase(),
        assetNumber: (assetNumber || '').trim().toUpperCase() || undefined,
        model: assetModel.trim().toUpperCase(),
        manufacturer: effectiveMfg,
        customerName: trimmedCust,
        sector: assetSector,
        customerLocation: assetLocation.trim(),
        roomNumber: assetRoom.trim().toUpperCase(),
        department: assetDept,
        installationDate: assetInstallDate || undefined,
        warrantyDuration: `${assetWarrantyYears} ${assetWarrantyYears === 1 ? 'Year' : 'Years'}`,
        warrantyExpiry: effectiveWarrantyExpiry,
        ppmFrequency: assetPpmFrequency,
        ppmType: assetPpmFrequency !== 'None' ? assetPpmType : undefined,
        lastPpmDate: assetLastPpmDate || undefined,
        nextPpmDate: calculatedNextPpm,
        invoiceNo: assetInvoiceNo.trim().toUpperCase(),
        installationReportNumber: assetReportNo.trim().toUpperCase(),
        attachmentName: assetAttachmentName || undefined,
        attachmentDataUrl: assetAttachmentDataUrl || undefined,
        attachments: assetAttachments.length > 0 ? assetAttachments : prefilledAsset.attachments,
        accessories: parsedAccessories,
        partsApplicable: savedParts,
      });
      setSuccessMessage(`Asset ${assetSerial.toUpperCase()} updated & live synced!`);
    } else {
      addAsset({
        serialNumber: assetSerial.trim().toUpperCase(),
        assetNumber: (assetNumber || '').trim().toUpperCase() || undefined,
        model: assetModel.trim().toUpperCase(),
        manufacturer: effectiveMfg,
        customerName: trimmedCust,
        sector: assetSector,
        customerLocation: assetLocation.trim(),
        roomNumber: assetRoom.trim().toUpperCase(),
        department: assetDept,
        installationDate: assetInstallDate || undefined,
        warrantyDuration: `${assetWarrantyYears} ${assetWarrantyYears === 1 ? 'Year' : 'Years'}`,
        warrantyExpiry: effectiveWarrantyExpiry,
        ppmFrequency: assetPpmFrequency,
        ppmType: assetPpmFrequency !== 'None' ? assetPpmType : undefined,
        lastPpmDate: assetLastPpmDate || undefined,
        nextPpmDate: calculatedNextPpm,
        invoiceNo: assetInvoiceNo.trim().toUpperCase(),
        installationReportNumber: assetReportNo.trim().toUpperCase(),
        attachmentName: assetAttachmentName || undefined,
        attachmentDataUrl: assetAttachmentDataUrl || undefined,
        attachments: assetAttachments,
        accessories: parsedAccessories,
        partsApplicable: savedParts,
        status: 'Active',
      });
      setSuccessMessage(`Asset ${assetSerial.toUpperCase()} registered & live updated in database!`);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Handle Software Submission
  const handleSaveSoftware = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveSoftMfg = (
      isCustomSoftProvider
        ? customSoftProviderInput
        : (softProvider && softProvider !== '__ADD_NEW__' ? softProvider : customSoftProviderInput)
    ).trim().toUpperCase() || 'PLANMECA';

    if (!softCustomer.trim() || !softName.trim()) {
      alert('Please specify Customer Name and Software Model/Name.');
      return;
    }

    const softwareAttachments: AttachmentItem[] = softAttachmentName && softAttachmentDataUrl
      ? [
          {
            id: `att-soft-${Date.now()}`,
            name: softAttachmentName,
            size: softAttachmentSize || 1024,
            type: softAttachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            dataUrl: softAttachmentDataUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]
      : [];

    if (prefilledSoftware) {
      updateSoftwareLicense(prefilledSoftware.id, {
        customerName: softCustomer.trim().toUpperCase(),
        customerLocation: softLocation.trim() || undefined,
        manufacturer: effectiveSoftMfg,
        model: softName.trim().toUpperCase(),
        version: softVersion.trim() || '6.0.1',
        licenseNumber: softLicenseKey.trim().toUpperCase(),
        serverIp: softServerIp.trim() || undefined,
        notes: softNotes.trim() || undefined,
        installedDate: softInstalledDate || undefined,
        attachmentName: softAttachmentName || undefined,
        attachmentDataUrl: softAttachmentDataUrl || undefined,
        attachments: softwareAttachments.length > 0 ? softwareAttachments : prefilledSoftware.attachments,
      });
      setSuccessMessage(`Software license for "${softName.toUpperCase()}" updated live!`);
    } else {
      addSoftwareLicense({
        customerName: softCustomer.trim().toUpperCase(),
        customerLocation: softLocation.trim() || undefined,
        manufacturer: effectiveSoftMfg,
        model: softName.trim().toUpperCase(),
        version: softVersion.trim() || '6.0.1',
        licenseNumber: softLicenseKey.trim().toUpperCase(),
        serverIp: softServerIp.trim() || undefined,
        notes: softNotes.trim() || undefined,
        installedDate: softInstalledDate || undefined,
        attachmentName: softAttachmentName || undefined,
        attachmentDataUrl: softAttachmentDataUrl || undefined,
        attachments: softwareAttachments,
      });
      setSuccessMessage(`Software license "${softName.toUpperCase()}" added & live updated in database!`);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Side Drawer Window */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 text-white flex flex-col gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/30">
                {activeMode === 'asset' ? <HardDrive className="w-5 h-5" /> : <Server className="w-5 h-5 text-indigo-400" />}
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-wide uppercase text-white flex items-center gap-2">
                  <span>{activeMode === 'asset' ? 'Register New Equipment' : 'Register New Software License'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Two-Way Live Sync
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instant synchronization with Master Database & Google Sheets / Excel
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveMode('asset')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeMode === 'asset'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>+ ADD ASSET / EQUIPMENT</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('software')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeMode === 'software'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>+ ADD SOFTWARE LICENSE</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Add Master Customer Popup / Overlay */}
        {showQuickAddCust && (
          <div className="m-4 p-4 bg-slate-900 text-white rounded-xl border border-cyan-500 shadow-xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-cyan-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>+ Add Master Customer / Facility</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAddCust(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Customer / Facility Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value.toUpperCase())}
                  placeholder="e.g. AL AHLI HOSPITAL / DOHA DENTAL"
                  className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Sector / Category
                  </label>
                  <select
                    value={quickCustSector}
                    onChange={(e) => setQuickCustSector(e.target.value as CustomerSector)}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Private">Private</option>
                    <option value="Government">Government</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Location / Address in Qatar
                  </label>
                  <input
                    type="text"
                    value={quickCustLocation}
                    onChange={(e) => setQuickCustLocation(e.target.value)}
                    placeholder="e.g. Ahmed Bin Ali St, Doha"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={quickCustContact}
                    onChange={(e) => setQuickCustContact(e.target.value)}
                    placeholder="e.g. Dr. Mohammed"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    placeholder="e.g. +974 4489 8888"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCust(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ASSET FORM */}
          {activeMode === 'asset' && (
            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block uppercase tracking-wider">
                  Equipment Identification & Specs
                </span>
                <p className="text-[11px] text-slate-500">
                  Enter serial number, model, hospital customer, and attach commissioning documentation.
                </p>
              </div>

              {/* Datalists for quick autocompletion */}
              <datalist id="drawer-customers-list">
                {customers.map((c) => (
                  <option key={`dl-c-${c.id}`} value={c.name}>
                    {c.sector ? `[${c.sector}]` : ''} {c.location || ''}
                  </option>
                ))}
              </datalist>

              <datalist id="drawer-mfg-list">
                <option value="PLANMECA" />
                <option value="KAVO" />
                <option value="AMANN GIRRBACH" />
                <option value="SIEMENS HEALTHINEERS" />
                <option value="MELAG" />
                <option value="DENTSPLY SIRONA" />
                <option value="VITA ZAHNFABRIK" />
                <option value="3D SYSTEMS" />
                <option value="BIOLASE" />
                <option value="ACTEON" />
                <option value="CARESTREAM DENTAL" />
                <option value="SHARQ MEDICAL" />
              </datalist>

              <datalist id="drawer-models-list">
                <option value="PROMAX 3D MID" />
                <option value="PROMAX 3D CLASSIC" />
                <option value="VISO G7 CBCT" />
                <option value="COMPACT I5 DENTAL UNIT" />
                <option value="COMPACT I TOUCH" />
                <option value="PLANMECA SOVEREIGN" />
                <option value="CERAMILL MOTION 2" />
                <option value="CERAMILL MAP 600" />
                <option value="CERAMILL MATIK" />
                <option value="CERAMILL THERM 3" />
                <option value="VACUUMAT 6000 M" />
                <option value="NEXTDENT 5100 3D PRINTER" />
                <option value="ESTETICA E70" />
                <option value="ESTETICA E80" />
                <option value="OP 3D PRO" />
                <option value="MELAPRINT 60" />
                <option value="MELAG VACUKLAV 41 B+" />
              </datalist>

              {/* Live Google Sheet Status / Sync Banner - Admin Only */}
              {isAdmin && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  isGoogleConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isGoogleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{isGoogleConnected ? 'Live 2-Way Google Sheet Sync Active' : 'Offline / Local Registration'}</span>
                        {googleUser?.email && (
                          <span className="text-[10px] text-slate-500 font-normal">({googleUser.email})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {isGoogleConnected
                          ? 'New equipment will write immediately to the "Equipment" tab.'
                          : 'Connect your Google account to write new assets live to the master sheet.'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isGoogleConnected ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await connectGoogle();
                          } catch (e: any) {
                            console.warn('Connect error:', e);
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Connect Google</span>
                      </button>
                    ) : (
                      <a
                        href={currentSpreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-[10px] flex items-center gap-1"
                      >
                        <span>Open Sheet</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Row 1: Serial Number, Hospital Asset/HBE #, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={assetSerial}
                    onChange={(e) => setAssetSerial(e.target.value.toUpperCase())}
                    placeholder="e.g. SN-KAVO-8821"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden uppercase placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Hospital Asset / HBE #
                  </label>
                  <input
                    type="text"
                    value={assetNumber}
                    onChange={(e) => setAssetNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. HBE-110293 / AST-012"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden uppercase placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Equipment Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="drawer-models-list"
                    value={assetModel}
                    onChange={(e) => setAssetModel(e.target.value.toUpperCase())}
                    placeholder="e.g. PROMAX 3D / ESTETICA E70"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden uppercase placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Customer & Manufacturer */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Master Customer Selection Dropdown */}
                  <div className="relative" ref={assetCustomerDropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase">
                        Customer / Facility <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCust(true)}
                        className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                        title="Add New Master Customer to Database"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ New Customer</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={assetCustomer}
                        onFocus={() => setShowAssetCustomerDropdown(true)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssetCustomer(val);
                          setAssetCustomerSearch(val);
                          setShowAssetCustomerDropdown(true);
                          const c = customers.find((cust) => cust.name.toUpperCase() === val.trim().toUpperCase());
                          if (c?.location) setAssetLocation(c.location);
                          if (isGovernmentCustomer(val)) {
                            setAssetSector('Government');
                          } else if (c?.sector) {
                            setAssetSector(c.sector);
                          }
                          if (c?.department) setAssetDept(c.department);
                        }}
                        placeholder="Search or select customer..."
                        className="w-full pl-8 pr-8 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowAssetCustomerDropdown(!showAssetCustomerDropdown)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Customer Dropdown Results */}
                    {showAssetCustomerDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 py-1 divide-y divide-slate-100">
                        <div className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center justify-between">
                          <span>{filteredAssetCustomers.length} Customers in Database</span>
                          <button
                            type="button"
                            onClick={() => setShowQuickAddCust(true)}
                            className="text-teal-700 hover:underline font-bold"
                          >
                            + Quick Add
                          </button>
                        </div>
                        {filteredAssetCustomers.length > 0 ? (
                          filteredAssetCustomers.map((c, idx) => (
                            <button
                              key={`asset-cust-opt-${c.id}-${idx}`}
                              type="button"
                              onClick={() => {
                                setAssetCustomer(c.name);
                                setAssetCustomerSearch('');
                                if (c.location) setAssetLocation(c.location);
                                if (isGovernmentCustomer(c.name)) {
                                  setAssetSector('Government');
                                } else if (c.sector) {
                                  setAssetSector(c.sector);
                                }
                                if (c.department) setAssetDept(c.department);
                                setShowAssetCustomerDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs hover:bg-teal-50 flex items-start justify-between cursor-pointer transition-colors ${
                                assetCustomer.toUpperCase() === c.name.toUpperCase() ? 'bg-teal-50/80 font-bold' : ''
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{c.name}</span>
                                  {assetCustomer.toUpperCase() === c.name.toUpperCase() && (
                                    <Check className="w-3 h-3 text-teal-600" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span>{c.location || 'Doha, Qatar'}</span>
                                  {c.contactPerson && <span>• Contact: {c.contactPerson}</span>}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  c.sector === 'Government'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {c.sector || 'Private'}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center">
                            <p className="text-xs text-slate-600 mb-2 font-medium">
                              No customer found matching &quot;{assetCustomerSearch}&quot;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickCustName(assetCustomerSearch);
                                setShowQuickAddCust(true);
                                setShowAssetCustomerDropdown(false);
                              }}
                              className="px-2.5 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 cursor-pointer"
                            >
                              + Register &quot;{assetCustomerSearch}&quot; as New Customer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manufacturer Selection with Add New / Custom Option */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-extrabold text-slate-800 uppercase">
                        Manufacturer / Brand <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomManufacturer(!isCustomManufacturer);
                          if (!isCustomManufacturer) {
                            setCustomManufacturerInput('');
                          }
                        }}
                        className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                        title="Add New Manufacturer Not in List"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{isCustomManufacturer ? 'Select Existing' : '+ New Manufacturer'}</span>
                      </button>
                    </div>

                    {isCustomManufacturer ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          autoFocus
                          value={customManufacturerInput}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setCustomManufacturerInput(val);
                            setAssetManufacturer(val);
                          }}
                          placeholder="Type new manufacturer name..."
                          className="w-full px-3 py-2 text-xs bg-amber-50 text-slate-900 font-bold uppercase border-2 border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customManufacturerInput.trim()) {
                              setAssetManufacturer(customManufacturerInput.trim().toUpperCase());
                            }
                            setIsCustomManufacturer(false);
                          }}
                          className="px-2.5 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 cursor-pointer"
                          title="Confirm Manufacturer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={assetManufacturer}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              setIsCustomManufacturer(true);
                              setCustomManufacturerInput('');
                            } else {
                              setAssetManufacturer(val);
                            }
                          }}
                          className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        >
                          <option value="">-- Select Manufacturer / Brand --</option>
                          <optgroup label="Standard Manufacturers">
                            {allManufacturers.map((mfg) => (
                              <option key={`mfg-opt-${mfg}`} value={mfg}>
                                {mfg}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Options">
                            <option value="__ADD_NEW__" className="text-teal-700 font-bold">
                              ➕ Add New / Other Manufacturer...
                            </option>
                          </optgroup>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Category / Sector Choice (Government vs Private) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Customer Category / Sector</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Categorizes customer for PPM & contracts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetSector('Government')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                        assetSector === 'Government'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Government (HMC, PHCC, etc.)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssetSector('Private')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                        assetSector === 'Private'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>Private (Hospital / Clinics)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Location, Room, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    placeholder="e.g. Al Sadd, Doha"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Room / Clinic
                  </label>
                  <input
                    type="text"
                    value={assetRoom}
                    onChange={(e) => setAssetRoom(e.target.value.toUpperCase())}
                    placeholder="e.g. CLINIC-02 / OT-1"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={assetDept}
                    onChange={(e) => setAssetDept(e.target.value as Department)}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value="Dental">Dental Department</option>
                    <option value="Medical">Medical Department</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              {/* PPM VALIDATION & SCHEDULE SECTION */}
              <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      PPM Validation & Maintenance Frequency
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                    Auto-Calculated
                  </span>
                </div>

                {/* PPM Frequency Selector: 3 Month / 6 Month / 1 Year / None */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    Select PPM Validation Interval:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['3 Months', '6 Months', '1 Year', 'None'] as PpmFrequency[]).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handlePpmFrequencyChange(freq)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                          assetPpmFrequency === freq
                            ? 'bg-[#F26522] text-white border-[#F26522] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-orange-300'
                        }`}
                      >
                        {freq === '3 Months' && '3 Months (Quarterly)'}
                        {freq === '6 Months' && '6 Months (Semi-Annual)'}
                        {freq === '1 Year' && '1 Year (Annual)'}
                        {freq === 'None' && 'No PPM Required'}
                      </button>
                    ))}
                  </div>

                  {assetPpmFrequency !== 'None' && (
                    <div className="pt-2 border-t border-orange-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-orange-950 uppercase flex items-center gap-1.5">
                          <span>PPM Maintenance Type</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-orange-700 font-semibold">
                          6-Month / Periodic Classification
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAssetPpmType('Yearly Maintenance')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            assetPpmType === 'Yearly Maintenance'
                              ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">1</span>
                          <span>Yearly Maintenance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAssetPpmType('Routine Checkup')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            assetPpmType === 'Routine Checkup'
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">2</span>
                          <span>Routine Checkup</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Last PPM & Next PPM Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                      Last PPM Executed Date
                    </label>
                    <input
                      type="date"
                      value={assetLastPpmDate}
                      onChange={(e) => {
                        setAssetLastPpmDate(e.target.value);
                        if (assetPpmFrequency !== 'None') {
                          setAssetNextPpmDate(calculateNextPpmDate(e.target.value, assetPpmFrequency));
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:bg-white focus:text-black focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1 flex items-center justify-between">
                      <span>Next PPM Due Date</span>
                      <span className="text-[10px] text-orange-600 lowercase font-normal">
                        (validated automatically)
                      </span>
                    </label>
                    <input
                      type="date"
                      value={assetNextPpmDate}
                      onChange={(e) => setAssetNextPpmDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white text-black font-bold border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:bg-white focus:text-black focus:outline-hidden text-orange-950"
                    />
                  </div>
                </div>
              </div>

              {/* Install Date, Warranty Duration, Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Installation Date
                  </label>
                  <input
                    type="date"
                    value={assetInstallDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setAssetInstallDate(newDate);
                      if (newDate && assetWarrantyYears > 0) {
                        setAssetWarrantyExpiry(computeWarrantyExpiry(newDate, assetWarrantyYears));
                      }
                      if (!assetLastPpmDate && assetPpmFrequency !== 'None') {
                        setAssetNextPpmDate(calculateNextPpmDate(newDate, assetPpmFrequency));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span>Warranty Duration</span>
                    <span className="text-[10px] text-teal-700 font-bold">
                      {assetWarrantyYears === 0 ? '0 Yrs (Out)' : `${assetWarrantyYears} Yr${assetWarrantyYears > 1 ? 's' : ''}`}
                    </span>
                  </label>
                  <select
                    value={assetWarrantyYears}
                    onChange={(e) => {
                      const yrs = parseInt(e.target.value, 10);
                      setAssetWarrantyYears(yrs);
                      if (assetInstallDate) {
                        setAssetWarrantyExpiry(computeWarrantyExpiry(assetInstallDate, yrs));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((yr) => (
                      <option key={`warranty-${yr}`} value={yr}>
                        {yr === 0 ? '0 Years (No Warranty / Out of Warranty)' : `${yr} ${yr === 1 ? 'Year' : 'Years'} Warranty`}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Expires on:</span>
                    <span className="font-mono font-bold text-teal-900">
                      {assetWarrantyYears === 0
                        ? 'No Warranty'
                        : assetWarrantyExpiry || (assetInstallDate ? computeWarrantyExpiry(assetInstallDate, assetWarrantyYears) : 'Set Install Date')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Invoice No
                  </label>
                  <input
                    type="text"
                    value={assetInvoiceNo}
                    onChange={(e) => setAssetInvoiceNo(e.target.value.toUpperCase())}
                    placeholder="e.g. INV-9912"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Installation Report Number */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  Installation Report No
                </label>
                <input
                  type="text"
                  value={assetReportNo}
                  onChange={(e) => setAssetReportNo(e.target.value.toUpperCase())}
                  placeholder="e.g. INST-REP-2026"
                  className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              {/* REAL ATTACHED FILE TO DATABASE FOR ASSET */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-teal-700" />
                    <span>Attach File to Database (Commissioning, Warranty, PDF, Photo)</span>
                  </label>
                  <span className="text-[10px] text-teal-800 font-bold bg-teal-200/70 px-2 py-0.5 rounded-full">
                    Saved to Database
                  </span>
                </div>

                <input
                  type="file"
                  ref={assetFileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAssetFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />

                {assetAttachmentName ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-teal-300 shadow-2xs">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <FileCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {assetAttachmentName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {assetAttachmentSize ? `${Math.round(assetAttachmentSize / 1024)} KB` : 'Attached'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {assetAttachmentDataUrl && (
                        <a
                          href={assetAttachmentDataUrl}
                          download={assetAttachmentName}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAssetAttachmentName('');
                          setAssetAttachmentDataUrl('');
                          setAssetAttachmentSize(0);
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        title="Remove Attached File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => assetFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleAssetFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-white hover:bg-teal-50/40 rounded-lg p-3 text-center cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <UploadCloud className="w-5 h-5 text-teal-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Click to attach or drag & drop equipment document / photo
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        PDF, DOCX, PNG, JPG, or Reports up to 25MB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Applicable Parts (3 Items) & Accessories */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase">
                      Applicable Parts (Up to 3 Items)
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Item Name & Serial Number
                    </span>
                  </div>
                  <div className="space-y-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
                    {[0, 1, 2].map((idx) => (
                      <div key={`part-row-${idx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[10px] font-black text-teal-700">#{idx + 1}</span>
                          <input
                            type="text"
                            value={assetParts[idx]?.name || ''}
                            onChange={(e) => {
                              const updated = [...assetParts];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setAssetParts(updated);
                            }}
                            placeholder={`Part ${idx + 1} Name (e.g. Sensor, Tube, Board)`}
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={assetParts[idx]?.serialNumber || ''}
                            onChange={(e) => {
                              const updated = [...assetParts];
                              updated[idx] = { ...updated[idx], serialNumber: e.target.value.toUpperCase() };
                              setAssetParts(updated);
                            }}
                            placeholder={`Part ${idx + 1} Serial Number`}
                            className="w-full px-2.5 py-1.5 text-xs bg-white text-black font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Accessories (Comma separated)
                  </label>
                  <textarea
                    rows={2}
                    value={assetAccessoriesText}
                    onChange={(e) => setAssetAccessoriesText(e.target.value)}
                    placeholder="e.g. 3D Sensor, Wireless Foot Control, Head Positioner"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{prefilledAsset ? 'Save Asset Changes' : 'Register Asset & Live Sync'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SOFTWARE FORM */}
          {activeMode === 'software' && (
            <form onSubmit={handleSaveSoftware} className="space-y-4">
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600" />
                    Master Excel Software Registry
                  </span>
                  <a
                    href={EXCEL_SOFTWARE_REGISTRY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    <span>View Sheet (gid=1053502553)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Direct live two-way update. Software added here is immediately linked with customer assets and synced to Google Sheets.
                </p>
              </div>

              {/* Customer / Facility */}
              <div className="relative" ref={softCustomerDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase">
                    Customer / Facility Name <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddCust(true)}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                    title="Add New Master Customer to Database"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+ New Customer</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={softCustomer}
                    onFocus={() => setShowSoftCustomerDropdown(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSoftCustomer(val);
                      setSoftCustomerSearch(val);
                      setShowSoftCustomerDropdown(true);
                      const c = customers.find((cust) => cust.name.toUpperCase() === val.trim().toUpperCase());
                      if (c?.location) setSoftLocation(c.location);
                    }}
                    placeholder="Search or select customer..."
                    className="w-full pl-8 pr-8 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden placeholder:text-slate-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowSoftCustomerDropdown(!showSoftCustomerDropdown)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Software Customer Dropdown Results */}
                {showSoftCustomerDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 py-1 divide-y divide-slate-100">
                    <div className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center justify-between">
                      <span>{filteredSoftCustomers.length} Customers in Database</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCust(true)}
                        className="text-indigo-700 hover:underline font-bold"
                      >
                        + Quick Add
                      </button>
                    </div>
                    {filteredSoftCustomers.length > 0 ? (
                      filteredSoftCustomers.map((c, idx) => (
                        <button
                          key={`soft-cust-opt-${c.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSoftCustomer(c.name);
                            setSoftCustomerSearch('');
                            if (c.location) setSoftLocation(c.location);
                            setShowSoftCustomerDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 flex items-start justify-between cursor-pointer transition-colors ${
                            softCustomer.toUpperCase() === c.name.toUpperCase() ? 'bg-indigo-50 font-bold' : ''
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {softCustomer.toUpperCase() === c.name.toUpperCase() && (
                                <Check className="w-3 h-3 text-indigo-600" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span>{c.location || 'Doha, Qatar'}</span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              c.sector === 'Government'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {c.sector || 'Private'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-600 mb-2 font-medium">
                          No customer matching &quot;{softCustomerSearch}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCustName(softCustomerSearch);
                            setShowQuickAddCust(true);
                            setShowSoftCustomerDropdown(false);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                        >
                          + Register &quot;{softCustomerSearch}&quot; as New Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Provider & Software Platform Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase">
                      Software Provider / Mfg <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSoftProvider(!isCustomSoftProvider);
                        if (!isCustomSoftProvider) setCustomSoftProviderInput('');
                      }}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{isCustomSoftProvider ? 'Select Existing' : '+ New Provider'}</span>
                    </button>
                  </div>

                  {isCustomSoftProvider ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customSoftProviderInput}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCustomSoftProviderInput(val);
                          setSoftProvider(val);
                        }}
                        placeholder="Type new provider..."
                        className="w-full px-3 py-2 text-xs bg-amber-50 text-slate-900 font-bold uppercase border-2 border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customSoftProviderInput.trim()) {
                            setSoftProvider(customSoftProviderInput.trim().toUpperCase());
                          }
                          setIsCustomSoftProvider(false);
                        }}
                        className="px-2.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={softProvider}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsCustomSoftProvider(true);
                          setCustomSoftProviderInput('');
                        } else {
                          setSoftProvider(val);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="">-- Select Provider / Brand --</option>
                      <optgroup label="Standard Providers">
                        {allManufacturers.map((mfg) => (
                          <option key={`soft-mfg-${mfg}`} value={mfg}>
                            {mfg}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Options">
                        <option value="__ADD_NEW__" className="text-indigo-700 font-bold">
                          ➕ Add New / Other Provider...
                        </option>
                      </optgroup>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Software Platform / Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={softName}
                    onChange={(e) => setSoftName(e.target.value.toUpperCase())}
                    placeholder="e.g. ROMEXIS / SQL SERVER"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Version & License Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Version / Build
                  </label>
                  <input
                    type="text"
                    value={softVersion}
                    onChange={(e) => setSoftVersion(e.target.value)}
                    placeholder="e.g. 6.0.1 / 6.5.2 / 2022"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    License Number / Key / S.N
                  </label>
                  <input
                    type="text"
                    value={softLicenseKey}
                    onChange={(e) => setSoftLicenseKey(e.target.value.toUpperCase())}
                    placeholder="e.g. RXS0197988K"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Server IP & Installation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Host Server IP Address
                  </label>
                  <input
                    type="text"
                    value={softServerIp}
                    onChange={(e) => setSoftServerIp(e.target.value)}
                    placeholder="e.g. 10.104.239.2 / 192.168.1.50"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-mono font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    Installation / Deployment Date
                  </label>
                  <input
                    type="date"
                    value={softInstalledDate}
                    onChange={(e) => setSoftInstalledDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden"
                  />
                </div>
              </div>

              {/* REAL ATTACHED FILE TO SOFTWARE */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Attach Software License Document / Key File / Manual</span>
                  </label>
                  <span className="text-[10px] text-indigo-800 font-bold bg-indigo-200/70 px-2 py-0.5 rounded-full">
                    Software Attachment
                  </span>
                </div>

                <input
                  type="file"
                  ref={softFileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSoftFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.key,.lic,.txt,.jpg,.jpeg,.png,.doc,.docx"
                />

                {softAttachmentName ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-indigo-300 shadow-2xs">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <FileCode className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {softAttachmentName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {softAttachmentSize ? `${Math.round(softAttachmentSize / 1024)} KB` : 'Attached'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {softAttachmentDataUrl && (
                        <a
                          href={softAttachmentDataUrl}
                          download={softAttachmentName}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSoftAttachmentName('');
                          setSoftAttachmentDataUrl('');
                          setSoftAttachmentSize(0);
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        title="Remove Attached File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => softFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleSoftFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 rounded-lg p-3 text-center cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <UploadCloud className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Click to attach or drag & drop license certificate, key file, or guide
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        PDF, KEY, LIC, PNG, JPG, or DOCX files
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  Notes / Module Configuration / Remarks
                </label>
                <textarea
                  rows={3}
                  value={softNotes}
                  onChange={(e) => setSoftNotes(e.target.value)}
                  placeholder="e.g. Romexis 3D Maxillo + Ceph license, 5 client workstations connected"
                  className="w-full px-3 py-2 text-xs bg-white text-black font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-black focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{prefilledSoftware ? 'Save License Changes' : 'Register Software & Live Sync'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
