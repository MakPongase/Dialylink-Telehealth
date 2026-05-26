'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from './StepIndicator';
import PasswordStrengthBar from './PasswordStrengthBar';
import api from '../../lib/api';
import { getProvinces, getCities, getBarangays, LocationItem } from '../../lib/location-api';
import { ShieldAlert, CheckCircle2, CheckCircle, XCircle } from 'lucide-react';

interface PatientRegisterFormProps {
  onBackToRoleSelection: () => void;
}

export default function PatientRegisterForm({ onBackToRoleSelection }: PatientRegisterFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Name State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('A+');
  
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

  // Emergency Contact State
  const [emergencyFirstName, setEmergencyFirstName] = useState('');
  const [emergencyMiddleName, setEmergencyMiddleName] = useState('');
  const [emergencyLastName, setEmergencyLastName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  // Field Validation Error States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const steps = [
    { number: 1, label: 'Account Info' },
    { number: 2, label: 'Personal Details' },
    { number: 3, label: 'Review & Submit' }
  ];

  // Fetch provinces on mount
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
    
    // Reset child dropdowns
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
    
    // Reset child dropdowns
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

  // Validation functions
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

    if (field === 'dateOfBirth') {
      if (!value) newErrors.dateOfBirth = 'Date of birth is required.';
      else delete newErrors.dateOfBirth;
    }

    if (field === 'streetAddress') {
      if (!value.trim()) newErrors.streetAddress = 'Street Address is required.';
      else delete newErrors.streetAddress;
    }

    if (field === 'emergencyFirstName') {
      if (!value.trim()) newErrors.emergencyFirstName = 'First Name is required.';
      else delete newErrors.emergencyFirstName;
    }

    if (field === 'emergencyLastName') {
      if (!value.trim()) newErrors.emergencyLastName = 'Last Name is required.';
      else delete newErrors.emergencyLastName;
    }

    if (field === 'emergencyContactPhone') {
      const numericVal = value.replace(/\s+/g, '');
      if (!value.trim()) newErrors.emergencyContactPhone = 'Emergency phone is required.';
      else if (numericVal.length !== 10) newErrors.emergencyContactPhone = 'Phone number must be exactly 10 digits.';
      else delete newErrors.emergencyContactPhone;
    }

    setErrors(newErrors);
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
      if (!dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.';
      if (!streetAddress.trim()) nextErrors.streetAddress = 'Street Address is required.';
      if (!selectedProvinceCode) nextErrors.province = 'Province is required.';
      if (!selectedCityCode) nextErrors.city = 'City/Municipality is required.';
      if (!selectedBarangayCode) nextErrors.barangay = 'Barangay is required.';
      if (!emergencyFirstName.trim()) nextErrors.emergencyFirstName = 'First Name is required.';
      if (!emergencyLastName.trim()) nextErrors.emergencyLastName = 'Last Name is required.';
      
      const numericVal = emergencyContactPhone.replace(/\s+/g, '');
      if (!emergencyContactPhone.trim()) nextErrors.emergencyContactPhone = 'Emergency phone is required.';
      else if (numericVal.length !== 10) nextErrors.emergencyContactPhone = 'Phone number must be exactly 10 digits.';

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
      setStep(3);
      setMaxVisitedStep(Math.max(maxVisitedStep, 3));
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
    setSuccessMsg('');

    // Combine address parts
    const fullAddress = `${streetAddress}, Brgy. ${selectedBarangayName}, ${selectedCityName}, ${selectedProvinceName}`;
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
    const fullEmergencyName = [emergencyFirstName.trim(), emergencyMiddleName.trim(), emergencyLastName.trim()].filter(Boolean).join(' ');
    const formattedPhone = `+63 ${emergencyContactPhone.replace(/\s+/g, '')}`;

    try {
      const response = await api.post('/api/auth/register', {
        full_name: fullName,
        email,
        password,
        role: 'patient',
        date_of_birth: dateOfBirth,
        blood_type: bloodType,
        address: fullAddress,
        city: selectedCityName,
        province: selectedProvinceName,
        emergency_contact_name: fullEmergencyName,
        emergency_contact_phone: formattedPhone
      });

      if (response.data.success) {
        setSuccessMsg('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
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

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden">
      
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

        {successMsg && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-md text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Account Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Patient Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="John"
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
                placeholder="name@example.com"
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
                <input
                  type="password"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={(e) => handleBlur('password', e.target.value)}
                />
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
                <input
                  type="password"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Personal Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  onBlur={(e) => handleBlur('dateOfBirth', e.target.value)}
                />
                {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1 font-medium">{errors.dateOfBirth}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Blood Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PH Location dropdowns */}
            <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Philippine Location Details</h4>
              
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

            {/* Emergency Contacts divided into first/middle/last name */}
            <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contact Details</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.emergencyFirstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    placeholder="Jane"
                    value={emergencyFirstName}
                    onChange={(e) => setEmergencyFirstName(e.target.value)}
                    onBlur={(e) => handleBlur('emergencyFirstName', e.target.value)}
                  />
                  {errors.emergencyFirstName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.emergencyFirstName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="Optional"
                    value={emergencyMiddleName}
                    onChange={(e) => setEmergencyMiddleName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${errors.emergencyLastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    placeholder="Doe"
                    value={emergencyLastName}
                    onChange={(e) => setEmergencyLastName(e.target.value)}
                    onBlur={(e) => handleBlur('emergencyLastName', e.target.value)}
                  />
                  {errors.emergencyLastName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.emergencyLastName}</p>}
                </div>
              </div>

              {/* Styled emergency phone */}
              <div className="space-y-1 mt-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Emergency Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                    +63
                  </span>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-r-md border text-sm focus:outline-none focus:ring-1 ${errors.emergencyContactPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-600'}`}
                    placeholder="912 345 6789"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    onBlur={(e) => handleBlur('emergencyContactPhone', e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Enter 10-digit mobile number (e.g., 912 345 6789)</p>
                {errors.emergencyContactPhone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.emergencyContactPhone}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4 uppercase tracking-wider">
                Registration Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Full Name</span>
                  <span className="text-gray-900 font-medium">{[firstName, middleName, lastName].filter(Boolean).join(' ')}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Email Address</span>
                  <span className="text-gray-900 font-medium">{email}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Date of Birth</span>
                  <span className="text-gray-900 font-medium">{dateOfBirth}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Blood Type</span>
                  <span className="text-gray-900 font-medium">{bloodType}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Address</span>
                  <span className="text-gray-900 font-medium">{streetAddress}, Brgy. {selectedBarangayName}, {selectedCityName}, {selectedProvinceName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Emergency Contact Name</span>
                  <span className="text-gray-900 font-medium">{[emergencyFirstName, emergencyMiddleName, emergencyLastName].filter(Boolean).join(' ')}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Emergency Contact Phone</span>
                  <span className="text-gray-900 font-medium">+63 {emergencyContactPhone}</span>
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
                I confirm that the information provided above is accurate to the best of my knowledge.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !confirmAccuracy}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-all flex items-center justify-center text-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Footer Navigation Buttons */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-md text-sm hover:bg-gray-50 transition-colors disabled:opacity-30"
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
