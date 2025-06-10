/**
 * Utility functions for currency formatting and handling
 */

/**
 * Get the currency symbol from environment variables
 * Falls back to $ if not configured
 */
export const getCurrencySymbol = (): string => {
  return process.env.CURRENCY_SYMBOL || '$';
};

/**
 * Get the currency code from environment variables
 * Falls back to USD if not configured
 */
export const getCurrencyCode = (): string => {
  return process.env.CURRENCY_CODE || 'USD';
};

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param includeSymbol - Whether to include the currency symbol
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | string | null | undefined, includeSymbol: boolean = true): string => {
  // Handle undefined or null values
  if (amount === undefined || amount === null) {
    amount = 0;
  }
  
  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format to 2 decimal places
  const formattedAmount = Number(numericAmount).toFixed(2);
  
  // Return with or without symbol
  return includeSymbol ? `${getCurrencySymbol()}${formattedAmount}` : formattedAmount;
};
