import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { availabilityAPI } from '../services/api';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const Availability = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('recurring'); // 'recurring' or 'specific'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    specificDate: '',
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
        // When editing, include day of week for recurring slots
        if (editingSlot.day_of_week !== null) {
          data.dayOfWeek = parseInt(formData.dayOfWeek);
        }
        
        console.log('Updating slot:', editingSlot.id, data);
        await availabilityAPI.updateSlot(editingSlot.id, data);
        setSuccess('Availability updated!');
      } else {
        // When creating new
        if (activeTab === 'recurring') {
          data.dayOfWeek = parseInt(formData.dayOfWeek);
        } else {
          if (!formData.specificDate) {
            setError('Please select a date');
            return;
          }
          data.specificDate = formData.specificDate;
        }
        
        console.log('Creating slot:', data);
        const response = await availabilityAPI.createSlot(data);
        console.log('Create response:', response);  // ← ADD THIS
        setSuccess('Availability added!');
      }

      setShowModal(false);
      setEditingSlot(null);
      console.log('About to reload availability...');  // ← ADD THIS
      await loadAvailability();  // ← Make this await
      console.log('Reloaded availability');  // ← ADD THIS
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('=== FULL ERROR OBJECT ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('========================');
      
      // Better error display
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

  const openModal = (slot = null, isRecurring = true) => {
    if (slot) {
      setEditingSlot(slot);
      setFormData({
        dayOfWeek: slot.day_of_week !== null ? slot.day_of_week : 1,
        specificDate: slot.specific_date ? slot.specific_date.split('T')[0] : '',  // ← Changed this
        startTime: slot.start_time.substring(0, 5),
        endTime: slot.end_time.substring(0, 5),
        status: slot.status,
        notes: slot.notes || ''
      });
      setActiveTab(slot.day_of_week !== null ? 'recurring' : 'specific');
    } else {
      setEditingSlot(null);
      setFormData({
        dayOfWeek: 1,
        specificDate: '',
        startTime: '09:00',
        endTime: '17:00',
        status: 'free',
        notes: ''
      });
      setActiveTab(isRecurring ? 'recurring' : 'specific');
    }
    setShowModal(true);
  };

  const getRecurringSlots = () => {
    return slots.filter(s => s.day_of_week !== null);
  };

  const getSpecificSlots = () => {
    return slots.filter(s => s.specific_date !== null);
  };

  const getSlotsForDay = (dayOfWeek) => {
    return getRecurringSlots()
      .filter(s => s.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
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
    return `${displayHour}:${minutes} ${ampm}`;
  };

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

        {/* Add Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => openModal(null, true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Plus size={20} />
            Add Recurring Availability
          </button>
          <button
            onClick={() => openModal(null, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Calendar size={20} />
            Add Specific Date
          </button>
        </div>

        {/* Weekly Calendar View */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>
            Weekly Schedule
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1rem'
          }}>
            {DAYS.map((day, index) => (
              <div key={index} style={{
                minHeight: '200px'
              }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '0.75rem',
                  padding: '0.5rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  {day}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {getSlotsForDay(index).map(slot => {
                    const colors = getStatusColor(slot.status);
                    return (
                      <div
                        key={slot.id}
                        style={{
                          padding: '0.75rem',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => openModal(slot)}
                      >
                        <div style={{
                          fontWeight: 600,
                          color: colors.text,
                          marginBottom: '0.25rem'
                        }}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: colors.text,
                          textTransform: 'capitalize'
                        }}>
                          {slot.status}
                        </div>
                        {slot.notes && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: colors.text,
                            marginTop: '0.25rem',
                            opacity: 0.8
                          }}>
                            {slot.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Specific Dates List */}
        {getSpecificSlots().length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>
              Specific Dates
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {getSpecificSlots()
                .sort((a, b) => a.specific_date.localeCompare(b.specific_date))
                .map(slot => {
                  const colors = getStatusColor(slot.status);
                  return (
                    <div
                      key={slot.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: colors.text }}>
                          {new Date(slot.specific_date).toLocaleDateString('en-US', {
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: colors.text, marginTop: '0.25rem' }}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)} • {slot.status}
                        </div>
                        {slot.notes && (
                          <div style={{ fontSize: '0.85rem', color: colors.text, marginTop: '0.25rem', opacity: 0.8 }}>
                            {slot.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openModal(slot)}
                          style={{
                            padding: '0.5rem',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(slot.id)}
                          style={{
                            padding: '0.5rem',
                            background: '#fee',
                            border: '1px solid #fcc',
                            color: '#c33',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
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
            <h2 style={{ margin: '0 0 1.5rem 0' }}>
              {editingSlot ? 'Edit Availability' : 'Add Availability'}
            </h2>

            <form onSubmit={handleSubmit}>
              {!editingSlot && (
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  padding: '0.25rem',
                  background: '#f3f4f6',
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('recurring')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: activeTab === 'recurring' ? 'white' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: activeTab === 'recurring' ? '#667eea' : '#6b7280'
                    }}
                  >
                    Recurring
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('specific')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: activeTab === 'specific' ? 'white' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: activeTab === 'specific' ? '#667eea' : '#6b7280'
                    }}
                  >
                    Specific Date
                  </button>
                </div>
              )}

              {activeTab === 'recurring' ? (
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
                    //disabled={editingSlot && editingSlot.day_of_week !== null}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  >
                    {DAYS.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333'
                  }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.specificDate}
                    onChange={(e) => {
                      console.log('Date changed to:', e.target.value);
                      setFormData({ ...formData, specificDate: e.target.value });
                    }}
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
              )}

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
                    color: '#333'
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
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#333'
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSlot(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
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
                    fontWeight: 600
                  }}
                >
                  {editingSlot ? 'Save Changes' : 'Add Availability'}
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