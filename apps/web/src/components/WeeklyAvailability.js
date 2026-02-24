import React, { useState, useEffect } from 'react';
import { availabilityAPI } from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { slotMatchesDate, getRecurrenceDescription } from '../utils/recurrence';

const WeeklyAvailability = () => {
  const [weekDates, setWeekDates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '17:00',
    status: 'free',
    notes: ''
  });

  useEffect(() => {
    // Generate next 7 days
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    setWeekDates(dates);
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const response = await availabilityAPI.getMyAvailability();
      setSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  const getSlotsForDate = (date) => {
  return slots.filter(slot => slotMatchesDate(slot, date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
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
        // Editing existing slot (recurring or specific)
        if (editingSlot.day_of_week !== null) {
          // For recurring slots, also send the day of week if it exists
          data.dayOfWeek = editingSlot.day_of_week;
        }
        await availabilityAPI.updateSlot(editingSlot.id, data);
      } else {
        // Creating new specific date slot
        if (!selectedDate) {
          setError('No date selected');
          return;
        }
        data.specificDate = selectedDate.toISOString().split('T')[0];
        await availabilityAPI.createSlot(data);
      }

      setShowModal(false);
      setEditingSlot(null);
      setSelectedDate(null);
      loadAvailability();
    } catch (error) {
      console.error('Submit error:', error);
      setError(error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to save availability');
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Delete this availability?')) return;

    try {
      await availabilityAPI.deleteSlot(slotId);
      loadAvailability();
    } catch (error) {
      setError('Failed to delete availability');
    }
  };

  const openModal = (date, slot = null) => {
    setSelectedDate(date);
    if (slot && slot.specific_date) {
      // Only allow editing specific date slots from here
      setEditingSlot(slot);
      setFormData({
        startTime: slot.start_time.substring(0, 5),
        endTime: slot.end_time.substring(0, 5),
        status: slot.status,
        notes: slot.notes || ''
      });
    } else {
      setEditingSlot(null);
      setFormData({
        startTime: '09:00',
        endTime: '17:00',
        status: 'free',
        notes: ''
      });
    }
    setShowModal(true);
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

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const openRecurringModal = (slot) => {
    setEditingSlot(slot);
    setSelectedDate(null); // No specific date for recurring
    setFormData({
      startTime: slot.start_time.substring(0, 5),
      endTime: slot.end_time.substring(0, 5),
      status: slot.status,
      notes: slot.notes || ''
    });
    setShowModal(true);
  };

  return (
    <div>
      {error && (
        <div style={{
          padding: '0.75rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c33',
          marginBottom: '1rem',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.75rem'
      }}>
        {weekDates.map((date, index) => {
          const daySlots = getSlotsForDate(date);
          const today = isToday(date);

          return (
            <div key={index} style={{
              background: today ? '#f0f7ff' : '#f9fafb',
              borderRadius: '12px',
              padding: '0.75rem',
              border: today ? '2px solid #667eea' : '1px solid #e5e7eb',
              minHeight: '150px'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: 500
                }}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: today ? '#667eea' : '#1f2937'
                }}>
                  {date.getDate()}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#6b7280'
                }}>
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {daySlots.map(slot => {
                  const colors = getStatusColor(slot.status);
                  const isRecurring = slot.recurrence_type !== 'once';
                  
                  return (
                    <div
                      key={slot.id}
                      style={{
                        padding: '0.5rem',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',  // Changed from conditional
                        position: 'relative'
                      }}
                      onClick={() => {
                        if (isRecurring) {
                          // For recurring, we need to go to the main availability page
                          // Or we can handle it here by editing the recurring slot directly
                          if (window.confirm('This is a recurring event. Edit the recurring pattern?')) {
                            openRecurringModal(slot);
                          }
                        } else {
                          openModal(date, slot);
                        }
                      }}
                    >
                      <div style={{
                        fontWeight: 600,
                        color: colors.text,
                        fontSize: '0.7rem'
                      }}>
                        {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                      </div>
                      <div style={{
                        fontSize: '0.65rem',
                        color: colors.text,
                        textTransform: 'capitalize',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {slot.status}
                        {isRecurring && <span title="Recurring weekly">🔄</span>}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => openModal(date)}
                  style={{
                    padding: '0.5rem',
                    background: 'white',
                    border: '1px dashed #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && selectedDate && (
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
            maxWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>
              {editingSlot 
                ? (editingSlot.day_of_week !== null ? 'Edit Recurring Availability' : 'Edit Availability')
                : 'Add Availability'
              }
            </h3>
            {selectedDate && (
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
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

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#333'
                  }}>
                    Start
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#333'
                  }}>
                    End
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#333'
                }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="free">Free</option>
                  <option value="busy">Busy</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#333'
                }}>
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingSlot.id);
                      setShowModal(false);
                    }}
                    style={{
                      padding: '0.625rem 1rem',
                      background: '#fee',
                      color: '#c33',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
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
                  }}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
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

export default WeeklyAvailability;