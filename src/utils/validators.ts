export const isValidUgandanPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  // Strip spaces, dashes, brackets, and plus signs
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Format 1: 07XXXXXXXX (10 digits starting with 07, 03, or 04)
  // Format 2: 2567XXXXXXXX (12 digits starting with 2567, 2563, or 2564)
  // Format 3: 7XXXXXXXX (9 digits starting with 7, 3, or 4)
  const regex = /^(?:256|0)?(3[1-9]|4[0-4]|7[0-9])\d{7}$/;
  return regex.test(cleaned);
};

