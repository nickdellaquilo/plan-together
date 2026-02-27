import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { ArrowLeft, Calendar, MapPin, Users, Check, X, HelpCircle, Edit2, Trash2 } from 'lucide-react';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [invites, setInvites] = useState([]);
  const [circles, setCircles] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const response = await eventsAPI.getEvent(eventId);
      setEvent(response.data.event);
      setInvites(response.data.invites);
      setCircles(response.data.circles || []);
      setIsCreator(response.data.is_creator);
    } catch (error) {
      console.error('Failed to load event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (status) => {
    try {
      await eventsAPI.rsvp(eventId, status);
      loadEvent(); // Reload to get updated counts
    } catch (error) {
      console.error('RSVP failed:', error);
      setError('Failed to update RSVP');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await eventsAPI.deleteEvent(eventId);
      navigate('/events');
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete event');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ color: '#6b7280' }}>Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#c33', marginBottom: '1rem' }}>{error || 'Event not found'}</p>
          <Link to="/events" style={{
            color: '#667eea',
            textDecoration: 'none',
            fontWeight: 600
          }}>
            ← Back to events
          </Link>
        </div>
      </div>
    );
  }

  const myRSVP = invites.find(inv => inv.rsvp_status)?.rsvp_status;
  const goingCount = invites.filter(inv => inv.rsvp_status === 'going').length + 1; // +1 for creator
  const maybeCount = invites.filter(inv => inv.rsvp_status === 'maybe').length;
  const declinedCount = invites.filter(inv => inv.rsvp_status === 'declined').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              Event Details
            </h1>
          </div>

          {isCreator && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fee',
                  color: '#c33',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Event Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            {event.title}
          </h2>
          {event.description && (
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Event Info */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          marginBottom: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.5rem'
            }}>
              <Calendar size={20} color="#667eea" />
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {formatDate(event.event_date)}
              </span>
            </div>
            <div style={{
              marginLeft: '2rem',
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </div>
          </div>

          {event.location_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <MapPin size={20} color="#667eea" />
              <span style={{ fontSize: '1rem' }}>{event.location_name}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Users size={20} color="#667eea" />
            <span style={{ fontSize: '1rem' }}>
              {goingCount} going
              {maybeCount > 0 && `, ${maybeCount} maybe`}
              {declinedCount > 0 && `, ${declinedCount} declined`}
            </span>
          </div>

          {circles.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f0f7ff',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Visible to circles:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {circles.map(circle => (
                  <span key={circle.id} style={{
                    padding: '0.25rem 0.75rem',
                    background: '#667eea',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}>
                    {circle.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RSVP Buttons (if invited) */}
        {!isCreator && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
              Your Response
            </h3>
            <div style={{
              display: 'flex',
              gap: '1rem'
            }}>
              <button
                onClick={() => handleRSVP('going')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: myRSVP === 'going' ? '#10b981' : 'white',
                  color: myRSVP === 'going' ? 'white' : '#10b981',
                  border: `2px solid #10b981`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Check size={20} />
                Going
              </button>
              <button
                onClick={() => handleRSVP('maybe')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: myRSVP === 'maybe' ? '#f59e0b' : 'white',
                  color: myRSVP === 'maybe' ? 'white' : '#f59e0b',
                  border: `2px solid #f59e0b`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <HelpCircle size={20} />
                Maybe
              </button>
              <button
                onClick={() => handleRSVP('declined')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: myRSVP === 'declined' ? '#ef4444' : 'white',
                  color: myRSVP === 'declined' ? 'white' : '#ef4444',
                  border: `2px solid #ef4444`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <X size={20} />
                Can't Go
              </button>
            </div>
          </div>
        )}

        {/* Attendees */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem' }}>
            Attendees ({invites.length + 1})
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {/* Show creator first */}
            <div style={{
              padding: '1rem',
              background: '#d1fae5',
              borderRadius: '12px',
              border: '2px solid #10b981'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: event.creator_avatar,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {event.creator_name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {event.creator_name}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#065f46',
                textAlign: 'center',
                fontWeight: 600
              }}>
                Organizer • Going
              </div>
            </div>

            {/* Show invitees */}
            {invites.map(invite => {
              let statusColor = '#f3f4f6';
              let statusText = 'Pending';
              let textColor = '#6b7280';
              
              if (invite.rsvp_status === 'going') {
                statusColor = '#d1fae5';
                statusText = 'Going';
                textColor = '#065f46';
              } else if (invite.rsvp_status === 'maybe') {
                statusColor = '#fef3c7';
                statusText = 'Maybe';
                textColor = '#92400e';
              } else if (invite.rsvp_status === 'declined') {
                statusColor = '#fee';
                statusText = 'Declined';
                textColor = '#c33';
              }

              return (
                <div key={invite.id} style={{
                  padding: '1rem',
                  background: statusColor,
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: invite.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {invite.first_name[0]}{invite.last_name[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {invite.display_name}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: textColor,
                    textAlign: 'center'
                  }}>
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;