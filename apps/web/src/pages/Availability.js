import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { availabilityAPI } from '../services/api';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { slotMatchesDate, getRecurrenceDescription } from '../utils/recurrence';
import { getSmartTimeDefaults, getDefaultDateForRecurrence } from '../utils/timeDefaults';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Availability = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

const [formData, setFormData] = useState({
  recurrenceType: 'once',
  recurrenceInterval: 1,
  recurrenceStartDate: '',
  recurrenceEndDate: '',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  status: 'free',
  notes: ''
});

useEffect(() => {
  loadAvailability();
}, []);
const loadAvailability = async () => {
  try {
    const response = await availabilityAPI.getMyAvailability();
    setSlots(response.data.slots);
  } catch (error) {
    console.error('Failed to load availability:', error);
    setError('Failed to load availability');
  } finally {
    setLoading(false);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  try {
    const data = {
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: formData.status,
      notes: formData.notes || ''
    };

    if (editingSlot) {
      // When editing, only update editable fields
      data.recurrenceInterval = parseInt(formData.recurrenceInterval);
      if (formData.recurrenceEndDate) {
        data.recurrenceEndDate = formData.recurrenceEndDate;
      }
      
      await availabilityAPI.updateSlot(editingSlot.id, data);
      setSuccess('Availability updated!');
    } else {
      // When creating new
      data.recurrenceType = formData.recurrenceType;
      data.recurrenceInterval = parseInt(formData.recurrenceInterval);
      data.recurrenceStartDate = selectedDate 
        ? selectedDate.toISOString().split('T')[0]
        : formData.recurrenceStartDate;
      
      if (formData.recurrenceEndDate) {
        data.recurrenceEndDate = formData.recurrenceEndDate;
      }

      // Add day of week for weekly recurrence
      if (formData.recurrenceType === 'weekly') {
        data.dayOfWeek = parseInt(formData.dayOfWeek);
      }
      
      await availabilityAPI.createSlot(data);
      setSuccess('Availability added!');
    }

    setShowModal(false);
    setEditingSlot(null);
    setSelectedDate(null);
    loadAvailability();
    setTimeout(() => setSuccess(''), 3000);
  } catch (error) {
    console.error('Submit error:', error);
    
    const errorMsg = error.response?.data?.errors 
      ? error.response.data.errors.map(e => e.msg).join(', ')
      : error.response?.data?.error 
      || 'Failed to save availability';
    
    setError(errorMsg);
  }
};

  const handleDelete = async (slotId) => {
    if (!window.confirm('Delete this availability slot?')) return;

    try {
      await availabilityAPI.deleteSlot(slotId);
      setSuccess('Availability deleted!');
      loadAvailability();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to delete availability');
    }
  };

const openModal = (date, slot = null, isRecurring = false) => {
  const smartTimes = getSmartTimeDefaults();
  
  if (slot) {
    setEditingSlot(slot);
    setSelectedDate(slot.recurrence_type === 'once' ? new Date(slot.recurrence_start_date) : null);
    setFormData({
      recurrenceType: slot.recurrence_type || 'once',
      recurrenceInterval: slot.recurrence_interval || 1,
      recurrenceStartDate: slot.recurrence_start_date ? slot.recurrence_start_date.split('T')[0] : '',
      recurrenceEndDate: slot.recurrence_end_date ? slot.recurrence_end_date.split('T')[0] : '',
      dayOfWeek: slot.day_of_week !== null ? slot.day_of_week : (date?.getDay() || 1),
      startTime: slot.start_time.substring(0, 5),
      endTime: slot.end_time.substring(0, 5),
      status: slot.status,
      notes: slot.notes || ''
    });
  } else {
    setEditingSlot(null);
    if (isRecurring) {
      setSelectedDate(null);
      setFormData({
        recurrenceType: 'weekly',
        recurrenceInterval: 1,
        recurrenceStartDate: getDefaultDateForRecurrence('weekly'),
        recurrenceEndDate: '',
        dayOfWeek: date?.getDay() || 1,
        startTime: smartTimes.startTime,
        endTime: smartTimes.endTime,
        status: 'free',
        notes: ''
      });
    } else {
      setSelectedDate(date);
      setFormData({
        recurrenceType: 'once',
        recurrenceInterval: 1,
        recurrenceStartDate: date.toISOString().split('T')[0],
        recurrenceEndDate: '',
        dayOfWeek: 1,
        startTime: smartTimes.startTime,
        endTime: smartTimes.endTime,
        status: 'free',
        notes: ''
      });
    }
  }
  setShowModal(true);
};

  // Calendar generation functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Previous month's trailing days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

const getSlotsForDate = (date) => {
  return slots.filter(slot => slotMatchesDate(slot, date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
};

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'free':
        return { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' };
      case 'busy':
        return { bg: '#fee', border: '#fcc', text: '#c33' };
      case 'maybe':
        return { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' };
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280' };
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Link to="/dashboard" style={{
            padding: '0.5rem',
            borderRadius: '8px',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            color: '#1f2937',
            textDecoration: 'none'
          }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0
          }}>
            My Availability
          </h1>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {success && (
          <div style={{
            padding: '1rem',
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '8px',
            color: '#065f46',
            marginBottom: '1.5rem'
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {/* Calendar Controls */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <button
                onClick={previousMonth}
                style={{
                  padding: '0.5rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={nextMonth}
                style={{
                  padding: '0.5rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={goToToday}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Today
              </button>
              <button
                onClick={() => openModal(null, null, true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                <Plus size={18} />
                Add Recurring
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          {/* Day headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '1px',
            background: '#e5e7eb'
          }}>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} style={{
                padding: '0.75rem',
                background: '#f9fafb',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            background: '#e5e7eb'
          }}>
            {calendarDays.map((day, index) => {
              const daySlots = getSlotsForDate(day.date);
              const today = isToday(day.date);

              return (
                <div
                  key={index}
                  style={{
                    minHeight: '120px',
                    padding: '0.5rem',
                    background: day.isCurrentMonth 
                      ? (today ? '#f0f7ff' : 'white')
                      : '#f9fafb',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: today ? 700 : 600,
                      color: day.isCurrentMonth 
                        ? (today ? '#667eea' : '#1f2937')
                        : '#9ca3af',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: today ? '#667eea' : 'transparent',
                      color: today ? 'white' : (day.isCurrentMonth ? '#1f2937' : '#9ca3af')
                    }}>
                      {day.date.getDate()}
                    </div>
                    
                    {day.isCurrentMonth && (
                      <button
                        onClick={() => openModal(day.date, null, false)}
                        style={{
                          padding: '2px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9ca3af',
                          display: 'flex'
                        }}
                        title="Add availability"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    {daySlots.slice(0, 3).map(slot => {
                      const colors = getStatusColor(slot.status);
                      const isRecurring = slot.recurrence_type !== 'once';
                      
                      return (
                        <div
                          key={slot.id}
                          onClick={() => day.isCurrentMonth && openModal(day.date, slot)}
                          style={{
                            padding: '0.25rem 0.375rem',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: day.isCurrentMonth ? 'pointer' : 'default',
                            opacity: day.isCurrentMonth ? 1 : 0.6
                          }}
                        >
                          <div style={{
                            fontWeight: 600,
                            color: colors.text,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {formatTime(slot.start_time)}
                            {isRecurring && <span style={{ fontSize: '0.6rem' }}>🔄</span>}
                          </div>
                        </div>
                      );
                    })}
                    {daySlots.length > 3 && (
                      <div style={{
                        fontSize: '0.65rem',
                        color: '#6b7280',
                        textAlign: 'center',
                        marginTop: '0.125rem'
                      }}>
                        +{daySlots.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>
              {editingSlot 
                ? (editingSlot.day_of_week !== null ? 'Edit Recurring' : 'Edit Availability')
                : (selectedDate ? 'Add Availability' : 'Add Recurring Availability')
              }
            </h2>
            
            {selectedDate && (
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            )}

            {editingSlot && editingSlot.day_of_week !== null && (
              <p style={{ 
                color: '#667eea', 
                marginBottom: '1.5rem', 
                fontSize: '0.9rem',
                background: '#f0f7ff',
                padding: '0.5rem',
                borderRadius: '6px'
              }}>
                🔄 Repeats every {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][editingSlot.day_of_week]}
              </p>
            )}

            {!selectedDate && !editingSlot && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Day of Week
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Recurrence Type & Day of Week - side by side when both visible */}
              {!editingSlot && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: formData.recurrenceType === 'weekly' ? '1fr 1fr' : '1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#333',
                      fontSize: '0.9rem'
                    }}>
                      Recurrence Pattern
                    </label>
                    <select
                      value={formData.recurrenceType}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        recurrenceType: e.target.value,
                        recurrenceStartDate: selectedDate 
                          ? selectedDate.toISOString().split('T')[0] 
                          : new Date().toISOString().split('T')[0]
                      })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    >
                      <option value="once">One time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {/* Day of Week - show inline for weekly recurrence */}
                  {formData.recurrenceType === 'weekly' && (
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        Day of Week
                      </label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          outline: 'none'
                        }}
                      >
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                          <option key={index} value={index}>{day}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Show recurrence info when editing */}
              {editingSlot && (
                <div style={{
                  padding: '0.75rem',
                  background: '#f0f7ff',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#667eea'
                }}>
                  🔄 {getRecurrenceDescription(editingSlot)}
                </div>
              )}

              {/* Interval - show for repeating patterns */}
              {(formData.recurrenceType !== 'once' || editingSlot?.recurrence_type !== 'once') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    Repeat Every
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
                      style={{
                        width: '80px',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                    <span style={{ color: '#6b7280' }}>
                      {formData.recurrenceType === 'daily' && 'day(s)'}
                      {formData.recurrenceType === 'weekly' && 'week(s)'}
                      {formData.recurrenceType === 'monthly' && 'month(s)'}
                      {formData.recurrenceType === 'yearly' && 'year(s)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Start Date & End Date - side by side for recurring */}
              {!editingSlot && formData.recurrenceType !== 'once' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#333',
                      fontSize: '0.9rem'
                    }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceStartDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceStartDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <small style={{ 
                      color: '#9ca3af', 
                      fontSize: '0.75rem',
                      display: 'block',
                      marginTop: '0.25rem'
                    }}>
                      Type YYYY-MM-DD or use picker
                    </small>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#333',
                      fontSize: '0.9rem'
                    }}>
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                      min={formData.recurrenceStartDate}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* End Date only - for editing recurring events */}
              {editingSlot && editingSlot.recurrence_type !== 'once' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                    Leave empty to repeat indefinitely
                  </small>
                </div>
              )}

              {/* Start Time & End Time - side by side */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <small style={{ 
                    color: '#9ca3af', 
                    fontSize: '0.75rem',
                    display: 'block',
                    marginTop: '0.25rem'
                  }}>
                    Type or use picker
                  </small>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: '0.9rem'
                }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  <option value="free">Free</option>
                  <option value="busy">Busy</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: '0.9rem'
                }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g., Work meeting, Gym"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingSlot.id);
                      setShowModal(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#fee',
                      color: '#c33',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSlot(null);
                    setSelectedDate(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  {editingSlot ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Availability;