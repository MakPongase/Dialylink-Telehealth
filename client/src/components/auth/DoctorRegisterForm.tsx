'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from './StepIndicator';
import PasswordStrengthBar from './PasswordStrengthBar';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { getProvinces, getCities, getBarangays, LocationItem } from '../../lib/location-api';
import { ShieldAlert, CloudUpload, FileText, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

interface DoctorRegisterFormProps {
  onBackToRoleSelection: () => void;
}

export default function DoctorRegisterForm({ onBackToRoleSelection }: DoctorRegisterFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Name State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Account State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Professional / Personal Details
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Nephrology');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [phone, setPhone] = useState('');
  
  // Philippine Location State
  const [streetAddress, setStreetAddress] = useState('');
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [barangays, setBarangays] = useState<LocationItem[]>([]);
  
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedBarangayCode, setSelectedBarangayCode] = useState('');
  const [selectedBarangayName, setSelectedBarangayName] = useState('');

  const [bio, setBio] = useState('');

  // Upload States
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [prcIdDoc, setPrcIdDoc] = useState<File | null>(null);
  const [prcIdDocUrl, setPrcIdDocUrl] = useState('');

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  // Errors / Loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const steps = [
    { number: 1, label: 'Account Info' },
    { number: 2, label: 'Professional' },
    { number: 3, label: 'Credentials' },
    { number: 4, label: 'Review & Submit' }
  ];

  useEffect(() => {
    async function loadProvinces() {
      const data = await getProvinces();
      setProvinces(data);
    }
    loadProvinces();
  }, []);

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvinceCode(code);
    setSelectedProvinceName(name);
    
    setSelectedCityCode('');
    setSelectedCityName('');
    setSelectedBarangayCode('');
    setSelectedBarangayName('');
    setCities([]);
    setBarangays([]);

    if (code) {
      const data = await getCities(code);
      setCities(data);
    }
  };

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedCityCode(code);
    setSelectedCityName(name);
    
    setSelectedBarangayCode('');
    setSelectedBarangayName('');
    setBarangays([]);

    if (code) {
      const data = await getBarangays(code);
      setBarangays(data);
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedBarangayCode(code);
    setSelectedBarangayName(name);
  };

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const validatePassword = (val: string) => {
    return val.length >= 8 && /\d/.test(val);
  };

  const handleBlur = (field: string, value: string) => {
    const newErrors = { ...errors };

    if (field === 'firstName') {
      if (!value.trim()) newErrors.firstName = 'First Name is required.';
      else delete newErrors.firstName;
    }
    
    if (field === 'lastName') {
      if (!value.trim()) newErrors.lastName = 'Last Name is required.';
      else delete newErrors.lastName;
    }

    if (field === 'email') {
      if (!value.trim()) newErrors.email = 'Email Address is required.';
      else if (!validateEmail(value)) newErrors.email = 'Invalid email format.';
      else delete newErrors.email;
    }

    if (field === 'password') {
      if (!value) newErrors.password = 'Password is required.';
      else if (!validatePassword(value)) newErrors.password = 'Password must be at least 8 characters and contain 1 number.';
      else delete newErrors.password;

      if (confirmPassword && value !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      } else if (confirmPassword && value === confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (field === 'confirmPassword') {
      if (!value) newErrors.confirmPassword = 'Confirm Password is required.';
      else if (value !== password) newErrors.confirmPassword = 'Passwords do not match.';
      else delete newErrors.confirmPassword;
    }

    if (field === 'licenseNumber') {
      if (!value.trim()) newErrors.licenseNumber = 'PRC License Number is required.';
      else delete newErrors.licenseNumber;
    }

    if (field === 'hospitalAffiliation') {
      if (!value.trim()) newErrors.hospitalAffiliation = 'Hospital / Clinic affiliation is required.';
      else delete newErrors.hospitalAffiliation;
    }

    if (field === 'phone') {
      const numericVal = value.replace(/\s+/g, '');
      if (!value.trim()) newErrors.phone = 'Personal Phone Number is required.';
      else if (numericVal.length !== 10) newErrors.phone = 'Phone number must be exactly 10 digits.';
      else delete newErrors.phone;
    }

    if (field === 'streetAddress') {
      if (!value.trim()) newErrors.streetAddress = 'Street Address is required.';
      else delete newErrors.streetAddress;
    }

    setErrors(newErrors);
  };

  // Upload to Supabase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setApiError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('doctors')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('doctors')
        .getPublicUrl(data.path);

      setProfilePhotoUrl(urlData.publicUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setApiError('Profile photo upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrcIdDoc(file);
    setUploadingDoc(true);
    setApiError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `prc_docs/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('doctors')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('doctors')
        .getPublicUrl(data.path);

      setPrcIdDocUrl(urlData.publicUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setApiError('License document upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleNext = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      if (!firstName.trim()) nextErrors.firstName = 'First Name is required.';
      if (!lastName.trim()) nextErrors.lastName = 'Last Name is required.';
      if (!email.trim()) nextErrors.email = 'Email Address is required.';
      else if (!validateEmail(email)) nextErrors.email = 'Invalid email format.';
      
      if (!password) nextErrors.password = 'Password is required.';
      else if (!validatePassword(password)) nextErrors.password = 'Password must be at least 8 characters and contain 1 number.';
      
      if (!confirmPassword) nextErrors.confirmPassword = 'Confirm Password is required.';
      else if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
      setStep(2);
      setMaxVisitedStep(Math.max(maxVisitedStep, 2));
    } else if (step === 2) {
      if (!licenseNumber.trim()) nextErrors.licenseNumber = 'PRC License Number is required.';
      if (!hospitalAffiliation.trim()) nextErrors.hospitalAffiliation = 'Hospital / Clinic affiliation is required.';
      if (!streetAddress.trim()) nextErrors.streetAddress = 'Street Address is required.';
      if (!selectedProvinceCode) nextErrors.province = 'Province is required.';
      if (!selectedCityCode) nextErrors.city = 'City/Municipality is required.';
      if (!selectedBarangayCode) nextErrors.barangay = 'Barangay is required.';
      
      const numericVal = phone.replace(/\s+/g, '');
      if (!phone.trim()) nextErrors.phone = 'Phone number is required.';
      else if (numericVal.length !== 10) nextErrors.phone = 'Phone number must be exactly 10 digits.';

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
      setStep(3);
      setMaxVisitedStep(Math.max(maxVisitedStep, 3));
    } else if (step === 3) {
      if (!profilePhotoUrl) nextErrors.profilePhoto = 'Profile photo is required.';
      if (!prcIdDocUrl) nextErrors.prcIdDoc = 'PRC ID / License document is required.';

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
      setStep(4);
      setMaxVisitedStep(Math.max(maxVisitedStep, 4));
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBackToRoleSelection();
    }
  };

  const handleStepNavigation = (stepNumber: number) => {
    if (stepNumber <= maxVisitedStep) {
      setStep(stepNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAccuracy) {
      setApiError('You must confirm that the information is accurate.');
      return;
    }

    setSubmitting(true);
    setApiError('');

    const fullAddress = `${streetAddress}, Brgy. ${selectedBarangayName}, ${selectedCityName}, ${selectedProvinceName}`;
    const formattedPhone = `+63 ${phone.replace(/\s+/g, '')}`;
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');

    try {
      const response = await api.post('/api/auth/register', {
        full_name: fullName,
        email,
        password,
        role: 'doctor',
        license_number: licenseNumber,
        specialization,
        years_experience: parseInt(yearsExperience, 10),
        hospital_affiliation: hospitalAffiliation,
        phone: formattedPhone,
        address: fullAddress,
        city: selectedCityName,
        province: selectedProvinceName,
        bio,
        profile_photo_url: profilePhotoUrl,
        prc_doc_url: prcIdDocUrl
      });

      if (response.data.success) {
        setIsSubmitted(true);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setApiError(err.response?.data?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const showMatchIndicator = password.length > 0 && confirmPassword.length > 0;

  if (isSubmitted) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white border border-gray-200 rounded-md shadow-lg p-10 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle className="h-10 w-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Registration Submitted!</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Your credentials and PRC details are currently under review by our administration. Access will be unlocked within 1–2 business days.
          </p>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors shadow-sm"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
      
      <StepIndicator 
        steps={steps} 
        currentStep={step} 
        maxVisitedStep={maxVisitedStep} 
        onStepClick={handleStepNavigation} 
      />

      <div className="p-8 md:p-10 space-y-6">
        {apiError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-800 p-4 rounded-md text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <span>{apiError}</span>
          </div>
        )}

        {/* STEP 1: Account Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Doctor Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={(e) => handleBlur('firstName', e.target.value)}
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.firstName}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Middle Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Optional"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={(e) => handleBlur('lastName', e.target.value)}
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1 mt-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                placeholder="doctor@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => handleBlur('email', e.target.value)}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={(e) => handleBlur('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>}
                <div className="mt-2">
                  <PasswordStrengthBar password={password} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Confirm Password <span className="text-red-500">*</span></span>
                  {showMatchIndicator && (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> MATCH</span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> NO MATCH</span>
                      )}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Professional Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  PRC License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.licenseNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="7-digit License No."
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  onBlur={(e) => handleBlur('licenseNumber', e.target.value)}
                />
                {errors.licenseNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.licenseNumber}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                >
                  {['Nephrology', 'Internal Medicine', 'General Practice', 'Other'].map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Years of Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Hospital / Clinic Affiliation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.hospitalAffiliation ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="Primary hospital or workspace"
                  value={hospitalAffiliation}
                  onChange={(e) => setHospitalAffiliation(e.target.value)}
                  onBlur={(e) => handleBlur('hospitalAffiliation', e.target.value)}
                />
                {errors.hospitalAffiliation && <p className="text-xs text-red-500 mt-1 font-medium">{errors.hospitalAffiliation}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Personal Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                  +63
                </span>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-r-md border text-sm focus:outline-none focus:ring-1 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => handleBlur('phone', e.target.value)}
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Enter your 10-digit mobile number</p>
              {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>}
            </div>

            {/* PH Location dropdowns */}
            <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Practice Location Details</h4>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.streetAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="House/Lot No., Street Name"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  onBlur={(e) => handleBlur('streetAddress', e.target.value)}
                />
                {errors.streetAddress && <p className="text-xs text-red-500 mt-1 font-medium">{errors.streetAddress}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Province / Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 bg-white ${errors.province ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    value={selectedProvinceCode}
                    onChange={handleProvinceChange}
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  {errors.province && <p className="text-xs text-red-500 mt-1 font-medium">{errors.province}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    City / Municipality <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={!selectedProvinceCode || cities.length === 0}
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 bg-white disabled:opacity-50 ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    value={selectedCityCode}
                    onChange={handleCityChange}
                  >
                    <option value="">Select City / Municipality</option>
                    {cities.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.city && <p className="text-xs text-red-500 mt-1 font-medium">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Barangay <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!selectedCityCode || barangays.length === 0}
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 bg-white disabled:opacity-50 ${errors.barangay ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  value={selectedBarangayCode}
                  onChange={handleBarangayChange}
                >
                  <option value="">Select Barangay</option>
                  {barangays.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
                {errors.barangay && <p className="text-xs text-red-500 mt-1 font-medium">{errors.barangay}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Short Bio
                </label>
                <span className="text-[10px] text-gray-400 font-semibold">{bio.length}/300 chars</span>
              </div>
              <textarea
                maxLength={300}
                className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="Introduce yourself to patients (max 300 characters)"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Credentials Upload */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border border-dashed border-gray-200 rounded-md p-6 text-center flex flex-col items-center justify-center space-y-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Profile Photo <span className="text-red-500">*</span>
                </span>
                
                {profilePhotoUrl ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                    <img src={profilePhotoUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                    <CloudUpload className="h-8 w-8" />
                  </div>
                )}

                <label className="cursor-pointer px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-sm">
                  {uploadingPhoto ? 'Uploading...' : 'Choose Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="border border-dashed border-gray-200 rounded-md p-6 text-center flex flex-col items-center justify-center space-y-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  PRC ID Document <span className="text-red-500">*</span>
                </span>

                {prcIdDoc ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-md text-blue-700 max-w-full overflow-hidden shadow-sm">
                    <FileText className="h-5 w-5 shrink-0" />
                    <div className="text-left overflow-hidden">
                      <p className="text-xs font-bold truncate max-w-[150px]">{prcIdDoc.name}</p>
                      <p className="text-[10px] opacity-70">{(prcIdDoc.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                    <CloudUpload className="h-8 w-8" />
                  </div>
                )}

                <label className="cursor-pointer px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-sm">
                  {uploadingDoc ? 'Uploading...' : 'Choose File (PDF/Image)'}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
                </label>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-md text-xs space-y-1 shadow-sm">
              <p className="font-bold uppercase tracking-wider">Important Notice</p>
              <p className="leading-relaxed">
                Your account will be reviewed by an admin before you can access doctor features. This usually takes 1–2 business days.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4 uppercase tracking-wider">
                Registration Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Full Name</span>
                  <span className="text-gray-900 font-medium">Dr. {[firstName, middleName, lastName].filter(Boolean).join(' ')}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Email Address</span>
                  <span className="text-gray-900 font-medium">{email}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">PRC License No.</span>
                  <span className="text-gray-900 font-medium">{licenseNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Specialization</span>
                  <span className="text-gray-900 font-medium">{specialization}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Years Experience</span>
                  <span className="text-gray-900 font-medium">{yearsExperience} Years</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Affiliation</span>
                  <span className="text-gray-900 font-medium">{hospitalAffiliation}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Personal Phone Number</span>
                  <span className="text-gray-900 font-medium">+63 {phone}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Practice Address</span>
                  <span className="text-gray-900 font-medium">{streetAddress}, Brgy. {selectedBarangayName}, {selectedCityName}, {selectedProvinceName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Bio</span>
                  <p className="text-gray-900 font-medium whitespace-pre-wrap">{bio || 'No bio entered.'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 mt-6">
              <input
                id="accuracy-check"
                type="checkbox"
                required
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 cursor-pointer"
                checked={confirmAccuracy}
                onChange={(e) => setConfirmAccuracy(e.target.checked)}
              />
              <label htmlFor="accuracy-check" className="text-sm text-gray-600 font-medium select-none cursor-pointer leading-tight">
                I confirm that the information provided above is accurate to the best of my knowledge and authorize its verification.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !confirmAccuracy}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-all flex items-center justify-center text-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Doctor Account...' : 'Submit Credentials'}
            </button>
          </form>
        )}

        {/* Footer Navigation Buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
