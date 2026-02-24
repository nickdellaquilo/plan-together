// Helper to check if a slot matches a specific date
export function slotMatchesDate(slot, targetDate) {
  const target = new Date(targetDate);
  const startDate = new Date(slot.recurrence_start_date);
  const endDate = slot.recurrence_end_date ? new Date(slot.recurrence_end_date) : null;

  // Check if target is within range
  if (target < startDate) return false;
  if (endDate && target > endDate) return false;

  switch (slot.recurrence_type) {
    case 'once':
      return slot.recurrence_start_date.split('T')[0] === targetDate.toISOString().split('T')[0];
    
    case 'daily': {
      const daysDiff = Math.floor((target - startDate) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % slot.recurrence_interval === 0;
    }
    
    case 'weekly': {
      if (target.getDay() !== slot.day_of_week) return false;
      const weeksDiff = Math.floor((target - startDate) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff >= 0 && weeksDiff % slot.recurrence_interval === 0;
    }
    
    case 'monthly': {
      const monthsDiff = (target.getFullYear() - startDate.getFullYear()) * 12 
                        + (target.getMonth() - startDate.getMonth());
      return monthsDiff >= 0 
        && monthsDiff % slot.recurrence_interval === 0
        && target.getDate() === startDate.getDate();
    }
    
    case 'yearly': {
      const yearsDiff = target.getFullYear() - startDate.getFullYear();
      return yearsDiff >= 0 
        && yearsDiff % slot.recurrence_interval === 0
        && target.getMonth() === startDate.getMonth()
        && target.getDate() === startDate.getDate();
    }
    
    default:
      return false;
  }
}

export function getRecurrenceDescription(slot) {
  const interval = slot.recurrence_interval;
  
  switch (slot.recurrence_type) {
    case 'once':
      return 'One time';
    case 'daily':
      return interval === 1 ? 'Every day' : `Every ${interval} days`;
    case 'weekly':
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[slot.day_of_week];
      return interval === 1 ? `Every ${dayName}` : `Every ${interval} weeks on ${dayName}`;
    case 'monthly':
      return interval === 1 ? 'Every month' : `Every ${interval} months`;
    case 'yearly':
      return interval === 1 ? 'Every year' : `Every ${interval} years`;
    default:
      return 'Unknown';
  }
}