// Form validation utilities

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUniversityId(id: string): boolean {
  // Example format: UGR/1234/12 or similar
  return id.length >= 5 && id.length <= 20;
}

export function validateNationalId(id: string): boolean {
  // Ethiopian National ID format varies, basic validation
  return id.length >= 8 && id.length <= 20;
}

export function validatePhoneNumber(phone: string): boolean {
  // Ethiopian phone format: +251XXXXXXXXX or 09XXXXXXXX
  const phoneRegex = /^(\+251|0)(9|7)\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

export function validatePassengerName(name: string): boolean {
  // At least 2 characters, letters, spaces, hyphens, apostrophes only
  const nameRegex = /^[a-zA-Z\s'-]{2,100}$/;
  return nameRegex.test(name.trim());
}

export function validateBookingReference(ref: string): boolean {
  // Format: HUT-XXXX where X is alphanumeric
  const refRegex = /^HUT-[A-Z0-9]{4}$/i;
  return refRegex.test(ref);
}

export function validatePassengerDetails(passenger: {
  fullName: string;
  identityType: string;
  identityNumber: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate full name
  if (!passenger.fullName || !passenger.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (!validatePassengerName(passenger.fullName)) {
    errors.fullName = 'Please enter a valid full name (letters, spaces, hyphens only)';
  }

  // Validate identity type
  if (!passenger.identityType) {
    errors.identityType = 'Identity type is required';
  }

  // Validate identity number based on type
  if (!passenger.identityNumber || !passenger.identityNumber.trim()) {
    if (passenger.identityType === 'OTHER') {
      // Child or dependent without adult ID is permitted
      passenger.identityNumber = 'CHILD-DEPENDENT';
    } else {
      errors.identityNumber = 'Identity number is required';
    }
  } else {
    if (passenger.identityType === 'UNIVERSITY_ID' && !validateUniversityId(passenger.identityNumber)) {
      errors.identityNumber = 'Please enter a valid university ID';
    } else if (passenger.identityType === 'NATIONAL_ID' && !validateNationalId(passenger.identityNumber)) {
      errors.identityNumber = 'Please enter a valid national ID (8-20 characters)';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateTripSearch(data: {
  routeId?: string;
  date?: string;
  passengers?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.routeId) {
    errors.routeId = 'Please select a route';
  }

  if (!data.date) {
    errors.date = 'Please select a travel date';
  } else {
    const selectedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.date = 'Travel date cannot be in the past';
    }
  }

  if (!data.passengers || data.passengers < 1) {
    errors.passengers = 'At least one passenger is required';
  } else if (data.passengers > 200) {
    errors.passengers = 'Passenger count exceeds single transaction limit (200)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeInput(input: string): string {
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '')
    .trim();
}

export function validateFileUpload(file: File, options: {
  maxSizeBytes?: number;
  allowedTypes?: string[];
} = {}): ValidationResult {
  const errors: Record<string, string> = {};
  
  const maxSize = options.maxSizeBytes || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (file.size > maxSize) {
    errors.file = `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
  }

  if (!allowedTypes.includes(file.type)) {
    errors.file = `File type must be one of: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
