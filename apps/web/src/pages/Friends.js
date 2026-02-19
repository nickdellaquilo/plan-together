import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { friendsAPI } from '../services/api';
import { Search, Phone, UserPlus, UserMinus, ArrowLeft } from 'lucide-react';

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneResult, setPhoneResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'search'

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.getFriends();
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    setError('');
    try {
      const response = await friendsAPI.searchUsers(searchQuery);
      setSearchResults(response.data.users);
    } catch (error) {
      setError('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePhoneSearch = async (e) => {
    e.preventDefault();
    setSearchLoading(true);
    setError('');
    setPhoneResult(null);
    try {
      const response = await friendsAPI.findByPhone(phoneNumber);
      setPhoneResult(response.data.user);
    } catch (error) {
      setError(error.response?.data?.error || 'User not found');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await friendsAPI.sendRequest(userId);
      // Refresh search results
      if (searchQuery) {
        const response = await friendsAPI.searchUsers(searchQuery);
        setSearchResults(response.data.users);
      }
      if (phoneResult) {
        const response = await friendsAPI.findByPhone(phoneNumber);
        setPhoneResult(response.data.user);
      }
    } catch (error) {
      setError('Failed to send friend request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await friendsAPI.removeFriend(friendId);
      loadFriends();
    } catch (error) {
      setError('Failed to remove friend');
    }
  };

  const renderFriendshipStatus = (status, userId) => {
    if (status === 'accepted') {
      return (
        <button
          onClick={() => handleRemoveFriend(userId)}
          style={{
            padding: '0.5rem 1rem',
            background: '#fee',
            color: '#c33',
            border: '1px solid #fcc',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <UserMinus size={16} />
          Remove
        </button>
      );
    } else if (status === 'pending') {
      return (
        <span style={{
          padding: '0.5rem 1rem',
          background: '#fef3c7',
          color: '#92400e',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          Request Sent
        </span>
      );
    } else {
      return (
        <button
          onClick={() => handleAddFriend(userId)}
          style={{
            padding: '0.5rem 1rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <UserPlus size={16} />
          Add Friend
        </button>
      );
    }
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
            Friends
          </h1>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'friends' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'friends' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            My Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'search' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'search' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Find Friends
          </button>
        </div>

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

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  You haven't added any friends yet
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {friends.map(friend => (
                  <div key={friend.user_id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: friend.avatar_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.3rem'
                      }}>
                        {friend.first_name[0]}{friend.last_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {friend.display_name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          {friend.has_car ? '🚗 Has car' : '🚇 Uses transit'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.user_id)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        color: '#6b7280'
                      }}
                    >
                      Remove Friend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* Phone Number Search */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Phone size={20} />
                Find by Phone Number
              </h3>
              <form onSubmit={handlePhoneSearch} style={{
                display: 'flex',
                gap: '0.75rem'
              }}>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Search
                </button>
              </form>

              {phoneResult && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: phoneResult.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {phoneResult.first_name[0]}{phoneResult.last_name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{phoneResult.display_name}</div>
                    </div>
                  </div>
                  {renderFriendshipStatus(phoneResult.friendship_status, phoneResult.id)}
                </div>
              )}
            </div>

            {/* Name/Email Search */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Search size={20} />
                Search by Name or Email
              </h3>
              <form onSubmit={handleSearch} style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for friends..."
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {searchResults.map(user => (
                    <div key={user.id} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: user.avatar_color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '1.1rem'
                        }}>
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.display_name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                      {renderFriendshipStatus(user.friendship_status, user.id)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;