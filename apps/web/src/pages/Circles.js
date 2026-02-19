import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { circlesAPI, friendsAPI } from '../services/api';
import { ArrowLeft, Users, Plus, Edit2, Trash2, UserPlus, CircleDashed } from 'lucide-react';

const Circles = () => {
  const [myCircles, setMyCircles] = useState([]);
  const [memberOf, setMemberOf] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-circles');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [circleMembers, setCircleMembers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myCirclesRes, memberOfRes, friendsRes] = await Promise.all([
        circlesAPI.getMyCircles(),
        circlesAPI.getMemberOf(),
        friendsAPI.getFriends()
      ]);
      setMyCircles(myCirclesRes.data.circles);
      setMemberOf(memberOfRes.data.circles);
      setFriends(friendsRes.data.friends);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load circles');
    } finally {
      setLoading(false);
    }
  };

  const loadCircleDetails = async (circleId) => {
    try {
      const response = await circlesAPI.getCircle(circleId);
      setSelectedCircle(response.data.circle);
      setCircleMembers(response.data.members);
    } catch (error) {
      console.error('Failed to load circle details:', error);
      setError('Failed to load circle details');
    }
  };

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await circlesAPI.createCircle(formData);
      setSuccess('Circle created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to create circle');
    }
  };

  const handleUpdateCircle = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await circlesAPI.updateCircle(selectedCircle.id, formData);
      setSuccess('Circle updated successfully!');
      setShowEditModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update circle');
    }
  };

  const handleDeleteCircle = async (circleId) => {
    if (!window.confirm('Are you sure you want to delete this circle?')) return;
    
    try {
      await circlesAPI.deleteCircle(circleId);
      setSuccess('Circle deleted successfully!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to delete circle');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await circlesAPI.addMember(selectedCircle.id, userId);
      setSuccess('Member added!');
      loadCircleDetails(selectedCircle.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the circle?')) return;
    
    try {
      await circlesAPI.removeMember(selectedCircle.id, userId);
      setSuccess('Member removed!');
      loadCircleDetails(selectedCircle.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to remove member');
    }
  };

  const openEditModal = (circle) => {
    setSelectedCircle(circle);
    setFormData({
      name: circle.name,
      description: circle.description || ''
    });
    setShowEditModal(true);
  };

  const openAddMemberModal = async (circle) => {
    setSelectedCircle(circle);
    await loadCircleDetails(circle.id);
    setShowAddMemberModal(true);
  };

  const getAvailableFriends = () => {
    if (!circleMembers) return friends;
    const memberIds = circleMembers.map(m => m.id);
    return friends.filter(f => !memberIds.includes(f.user_id));
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
            Friend Circles
          </h1>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('my-circles')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'my-circles' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'my-circles' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            My Circles ({myCircles.length})
          </button>
          <button
            onClick={() => setActiveTab('member-of')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'member-of' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'member-of' ? '#667eea' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Member Of ({memberOf.length})
          </button>
        </div>

        {/* My Circles Tab */}
        {activeTab === 'my-circles' && (
          <div>
            <button
              onClick={() => {
                setFormData({ name: '', description: '' });
                setShowCreateModal(true);
              }}
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
                fontWeight: 600,
                marginBottom: '2rem'
              }}
            >
              <Plus size={20} />
              Create New Circle
            </button>

            {myCircles.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#6b7280' }}>
                  You haven't created any circles yet. Create one to organize your friends!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {myCircles.map(circle => (
                  <div key={circle.id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CircleDashed size={24} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '1.1rem',
                          fontWeight: 600
                        }}>
                          {circle.name}
                        </h3>
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          color: '#6b7280'
                        }}>
                          {circle.member_count} members
                        </p>
                      </div>
                    </div>

                    {circle.description && (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.9rem',
                        marginBottom: '1rem'
                      }}>
                        {circle.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => openAddMemberModal(circle)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <UserPlus size={16} />
                        Manage
                      </button>
                      <button
                        onClick={() => openEditModal(circle)}
                        style={{
                          padding: '0.5rem',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCircle(circle.id)}
                        style={{
                          padding: '0.5rem',
                          background: '#fee',
                          color: '#c33',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Member Of Tab */}
        {activeTab === 'member-of' && (
          <div>
            {memberOf.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#6b7280' }}>
                  You're not a member of any circles yet.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {memberOf.map(circle => (
                  <div key={circle.id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CircleDashed size={24} color="#667eea" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '1.1rem',
                          fontWeight: 600
                        }}>
                          {circle.name}
                        </h3>
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          color: '#6b7280'
                        }}>
                          Created by {circle.creator_name}
                        </p>
                        <p style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '0.85rem',
                          color: '#6b7280'
                        }}>
                          {circle.member_count} members
                        </p>
                      </div>
                    </div>

                    {circle.description && (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.9rem',
                        marginTop: '1rem'
                      }}>
                        {circle.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Circle Modal */}
      {showCreateModal && (
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
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Create New Circle</h2>
            <form onSubmit={handleCreateCircle}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Circle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Soccer Buddies"
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this circle for?"
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  Create Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Circle Modal */}
      {showEditModal && (
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
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Edit Circle</h2>
            <form onSubmit={handleUpdateCircle}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Circle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Manage Members Modal */}
      {showAddMemberModal && selectedCircle && (
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
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Manage {selectedCircle.name}</h2>

            {/* Current Members */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                Current Members ({circleMembers.length})
              </h3>
              {circleMembers.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No members yet. Add some friends below!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {circleMembers.map(member => (
                    <div key={member.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: member.avatar_color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700
                        }}>
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{member.display_name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#fee',
                          color: '#c33',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Friends */}
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                Add Friends
              </h3>
              {getAvailableFriends().length === 0 ? (
                <p style={{ color: '#6b7280' }}>All your friends are already in this circle!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {getAvailableFriends().map(friend => (
                    <div key={friend.user_id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: friend.avatar_color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700
                        }}>
                          {friend.first_name[0]}{friend.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{friend.display_name}</span>
                      </div>
                      <button
                        onClick={() => handleAddMember(friend.user_id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddMemberModal(false)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.75rem',
                background: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Circles;