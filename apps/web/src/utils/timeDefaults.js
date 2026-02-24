export function getSmartTimeDefaults() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Round to next 30-minute interval
  let startHour = currentHour;
  let startMinutes = currentMinutes < 30 ? 30 : 0;
  
  if (currentMinutes >= 30) {
    startHour += 1;
  }

  // Handle midnight rollover
  if (startHour >= 24) {
    startHour = 0;
  }

  // Default to 1 hour duration
  let endHour = startHour + 1;
  let endMinutes = startMinutes;

  // Handle midnight rollover for end time
  if (endHour >= 24) {
    endHour = 0;
  }

  const formatTime = (hour, minutes) => {
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  return {
    startTime: formatTime(startHour, startMinutes),
    endTime: formatTime(endHour, endMinutes)
  };
}

export function getDefaultDateForRecurrence(recurrenceType, selectedDate = null) {
  if (selectedDate) {
    return selectedDate.toISOString().split('T')[0];
  }
  
  const today = new Date();
  
  // For recurring events, start today or tomorrow if it's late
  if (recurrenceType !== 'once' && today.getHours() >= 20) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  return today.toISOString().split('T')[0];
}