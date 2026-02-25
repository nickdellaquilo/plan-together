/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Events table
  pgm.createTable('events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    creator_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    title: {
      type: 'varchar(200)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    event_date: {
      type: 'date',
      notNull: true
    },
    start_time: {
      type: 'time',
      notNull: true
    },
    end_time: {
      type: 'time',
      notNull: true
    },
    location_name: {
      type: 'varchar(200)'
    },
    location_lat: {
      type: 'decimal(10, 8)'
    },
    location_lng: {
      type: 'decimal(11, 8)'
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'planned',
      check: "status IN ('planned', 'confirmed', 'cancelled')"
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Event invites table
  pgm.createTable('event_invites', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    event_id: {
      type: 'uuid',
      notNull: true,
      references: 'events',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    rsvp_status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "rsvp_status IN ('pending', 'going', 'maybe', 'declined')"
    },
    invited_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    responded_at: {
      type: 'timestamp'
    }
  });

  // Indexes
  pgm.createIndex('events', 'creator_id');
  pgm.createIndex('events', 'event_date');
  pgm.createIndex('events', 'status');
  pgm.createIndex('event_invites', 'event_id');
  pgm.createIndex('event_invites', 'user_id');
  pgm.createIndex('event_invites', ['event_id', 'user_id']);
  pgm.createIndex('event_invites', 'rsvp_status');

  // Unique constraint: user can only be invited once per event
  pgm.createConstraint('event_invites', 'unique_event_user', {
    unique: ['event_id', 'user_id']
  });

  // Add constraint: end_time must be after start_time
  pgm.addConstraint('events', 'valid_event_time_range', {
    check: 'end_time > start_time'
  });

  // Trigger for events updated_at
  pgm.createTrigger('events', 'update_events_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  pgm.dropTable('event_invites', { cascade: true });
  pgm.dropTable('events', { cascade: true });
};