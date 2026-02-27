import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventsAPI, friendsAPI, circlesAPI } from '../services/api';
import { getSmartTimeDefaults, getDefaultDateForRecurrence } from '../utils/timeDefaults';
import { ArrowLeft, Calendar, Users, Eye } from 'lucide-react';

const CreateEvent = () => {
  const navigate = useNavigate();
  const smartTimes = getSmartTimeDefaults();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: getDefaultDateForRecurrence('once'),
    startTime: smartTimes.startTime,
    endTime: smartTimes.endTime,
    locationName: ''
  });

  const [friends, setFriends] = useState([]);
  const [circles, setCircles] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [selectedInviteCircles, setSelectedInviteCircles] = useState([]);
  const [selectedVisibilityCircles, setSelectedVisibilityCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, circlesRes] = await Promise.all([
        friendsAPI.getFriends(),
        circlesAPI.getMyCircles()
      ]);
      setFriends(friendsRes.data.friends);
      setCircles(circlesRes.data.circles);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load friends and circles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        locationName: formData.locationName,
        inviteUserIds: selectedFriends,
        inviteCircleIds: selectedInviteCircles,
        visibleToCircleIds: selectedVisibilityCircles
      };

      const response = await eventsAPI.createEvent(eventData);
      navigate(`/events/${response.data.event.id}`);
    } catch (error) {
      console.error('Create event error:', error);
      setError(error.response?.data?.error || 'Failed to create event');
      setSubmitting(false);
    }
  };

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleInviteCircle = (circleId) => {
    setSelectedInviteCircles(prev => 
      prev.includes(circleId) 
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
    );
  };

  const toggleVisibilityCircle = (circleId) => {
    setSelectedVisibilityCircles(prev => 
      prev.includes(circleId) 
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
    );
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
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Link to="/events" style={{
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
            Create Event
          </h1>
        </div>
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem'
      }}>
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

        <form onSubmit={handleSubmit}>
          {/* Event Details */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Calendar size={24} />
              Event Details
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333',
                fontSize: '0.9rem'
              }}>
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Weekend Soccer Game"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333',
                fontSize: '0.9rem'
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's the plan?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333',
                fontSize: '0.9rem'
              }}>
                Date *
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

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
                  Start Time *
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
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333',
                  fontSize: '0.9rem'
                }}>
                  End Time *
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
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333',
                fontSize: '0.9rem'
              }}>
                Location
              </label>
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="Central Park, Brooklyn"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Invite People */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users size={24} />
              Invite People
            </h2>

            {/* Invite Circles */}
            {circles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  Circles
                </h3>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {circles.map(circle => (
                    <button
                      key={circle.id}
                      type="button"
                      onClick={() => toggleInviteCircle(circle.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: selectedInviteCircles.includes(circle.id) ? '#667eea' : 'white',
                        color: selectedInviteCircles.includes(circle.id) ? 'white' : '#667eea',
                        border: '2px solid #667eea',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}
                    >
                      {circle.name} ({circle.member_count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Individual Friends */}
            {friends.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  Individual Friends
                </h3>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.5rem'
                }}>
                  {friends.map(friend => (
                    <label
                      key={friend.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.user_id)}
                        onChange={() => toggleFriend(friend.user_id)}
                        style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                      />
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: friend.avatar_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginRight: '0.75rem'
                      }}>
                        {friend.first_name[0]}{friend.last_name[0]}
                      </div>
                      <span>{friend.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visibility Settings */}
          {circles.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid #e5e7eb',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Eye size={24} />
                Who Can See This Event?
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>
                Members of selected circles will be able to see this event, even if not directly invited.
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {circles.map(circle => (
                  <button
                    key={circle.id}
                    type="button"
                    onClick={() => toggleVisibilityCircle(circle.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: selectedVisibilityCircles.includes(circle.id) ? '#10b981' : 'white',
                      color: selectedVisibilityCircles.includes(circle.id) ? 'white' : '#10b981',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.9rem'
                    }}
                  >
                    {circle.name}
                  </button>
                ))}
              </div>
              {selectedVisibilityCircles.length === 0 && (
                <p style={{
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  fontStyle: 'italic'
                }}>
                  If no circles are selected, only invited people can see this event.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '1rem',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => !submitting && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;