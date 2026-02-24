import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendsAPI } from '../services/api';
import { Users, UserPlus, Calendar, LogOut, User, Bell, CircleDashed, Clock } from 'lucide-react';
import WeeklyAvailability from '../components/WeeklyAvailability';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getRequests()
      ]);
      setFriends(friendsRes.data.friends);
      setRequests(requestsRes.data.requests);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
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
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Plan Together
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/profile" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#1f2937',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}>
              <User size={18} />
              <span>Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#6b7280',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            Welcome back, {user?.firstName}! 👋
          </h2>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Ready to plan your next hangout?
          </p>
        </div>

        {/* Friend Requests */}
        {requests.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <Bell size={20} color="#667eea" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                Friend Requests ({requests.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.map(request => (
                <div key={request.friendship_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: request.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {request.first_name[0]}{request.last_name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{request.display_name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={async () => {
                        await friendsAPI.acceptRequest(request.friendship_id);
                        loadData();
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        await friendsAPI.rejectRequest(request.friendship_id);
                        loadData();
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#e5e7eb',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Availability */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
              Next 7 Days
            </h3>
            <Link to="/availability" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}>
              Full calendar →
            </Link>
          </div>

          <WeeklyAvailability />
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <Link to="/friends" style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Users size={24} color="white" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
              Manage Friends
            </h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              View and add friends • {friends.length} friends
            </p>
          </Link>

          <Link to="/circles" style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CircleDashed size={24} color="white" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
              Friend Circles
            </h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Organize friends into groups
            </p>
          </Link>

          <Link to="/availability" style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Clock size={24} color="white" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
              My Availability
            </h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Manage your schedule
            </p>
          </Link>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '2px solid #e5e7eb',
            opacity: 0.5
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Calendar size={24} color="#9ca3af" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#9ca3af' }}>
              Create Event
            </h3>
            <p style={{ margin: 0, color: '#9ca3af' }}>
              Coming in Phase 2
            </p>
          </div>
        </div>

        

        {/* Friends List Preview */}
        {friends.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                Your Friends
              </h3>
              <Link to="/friends" style={{
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 500
              }}>
                View all →
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {friends.slice(0, 6).map(friend => (
                <div key={friend.user_id} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: friend.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {friend.first_name[0]}{friend.last_name[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {friend.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {friend.has_car ? '🚗 Has car' : '🚇 Transit'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;