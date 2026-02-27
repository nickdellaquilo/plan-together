import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { ArrowLeft, Plus, Calendar, MapPin, Users } from 'lucide-react';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' or 'past'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    try {
      const params = {};
      
      if (filter === 'upcoming') {
        params.upcoming = 'true';
      } else if (filter === 'past') {
        params.upcoming = 'false';
      }
      
      const response = await eventsAPI.getMyEvents(params);
      setEvents(response.data.events);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
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

  const getRSVPColor = (status) => {
    switch (status) {
      case 'going': return { bg: '#d1fae5', text: '#065f46' };
      case 'maybe': return { bg: '#fef3c7', text: '#92400e' };
      case 'declined': return { bg: '#fee', text: '#c33' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
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
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              Events
            </h1>
          </div>

          <Link
            to="/events/create"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            <Plus size={20} />
            Create Event
          </Link>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setFilter('upcoming')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: filter === 'upcoming' ? '2px solid #667eea' : '2px solid transparent',
              color: filter === 'upcoming' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: filter === 'past' ? '2px solid #667eea' : '2px solid transparent',
              color: filter === 'past' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Past
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <Calendar size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              No {filter} events
            </p>
            <Link
              to="/events/create"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <Plus size={20} />
              Create Event
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {events.map(event => {
              const rsvpColor = getRSVPColor(event.my_rsvp);
              
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.2rem',
                        fontWeight: 600
                      }}>
                        {event.title}
                      </h3>
                      {event.description && (
                        <p style={{
                          margin: '0 0 0.75rem 0',
                          color: '#6b7280',
                          fontSize: '0.9rem'
                        }}>
                          {event.description}
                        </p>
                      )}
                    </div>

                    {event.my_rsvp && (
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: rsvpColor.bg,
                        color: rsvpColor.text,
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        marginLeft: '1rem'
                      }}>
                        {event.my_rsvp}
                      </div>
                    )}

                    {event.is_creator && (
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: '#f0f7ff',
                        color: '#667eea',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginLeft: '1rem'
                      }}>
                        Organizer
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} />
                      {formatDate(event.event_date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </div>
                    {event.location_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} />
                        {event.location_name}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} />
                      {event.going_count} going
                      {event.maybe_count > 0 && `, ${event.maybe_count} maybe`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;