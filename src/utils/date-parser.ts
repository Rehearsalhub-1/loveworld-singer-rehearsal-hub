
/**
 * Robust date string parser for various formats used in the app.
 * Handles ordinal suffixes (21st, 24th) and missing years.
 */
export const parseProgramDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    // 1. Clean ordinal suffixes (24th -> 24) and handle case
    let cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
    
    // 2. If it lacks a year (e.g., "SUNDAY, 24TH MAY"), append current or next year
    if (!/\d{4}/.test(cleaned)) {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Try with current year
      const dateWithCurrentYear = new Date(`${cleaned} ${currentYear}`);
      
      if (!isNaN(dateWithCurrentYear.getTime())) {
        // If the date is in the past by more than a month, it might be for NEXT year
        // (e.g., it's Dec 2025 and date is "Jan 5th")
        if (dateWithCurrentYear.getTime() < now.getTime() - (30 * 24 * 60 * 60 * 1000)) {
          return new Date(`${cleaned} ${currentYear + 1}`);
        }
        return dateWithCurrentYear;
      }
    }

    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date;
    
    return null;
  } catch (e) {
    return null;
  }
};
