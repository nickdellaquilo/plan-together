/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Availability slots table
  pgm.createTable('availability_slots', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    // For recurring weekly slots
    day_of_week: {
      type: 'integer',
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // NULL for one-time slots
    },
    // For specific one-time slots
    specific_date: {
      type: 'date',
      // NULL for recurring slots
    },
    start_time: {
      type: 'time',
      notNull: true
    },
    end_time: {
      type: 'time',
      notNull: true
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'free',
      check: "status IN ('free', 'busy', 'maybe')"
    },
    notes: {
      type: 'text'
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

  // Add constraint: must have either day_of_week OR specific_date, not both
  pgm.addConstraint('availability_slots', 'recurring_or_specific', {
    check: '(day_of_week IS NOT NULL AND specific_date IS NULL) OR (day_of_week IS NULL AND specific_date IS NOT NULL)'
  });

  // Add constraint: day_of_week must be 0-6 if present
  pgm.addConstraint('availability_slots', 'valid_day_of_week', {
    check: 'day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)'
  });

  // Add constraint: end_time must be after start_time
  pgm.addConstraint('availability_slots', 'valid_time_range', {
    check: 'end_time > start_time'
  });

  // Indexes
  pgm.createIndex('availability_slots', 'user_id');
  pgm.createIndex('availability_slots', 'day_of_week');
  pgm.createIndex('availability_slots', 'specific_date');
  pgm.createIndex('availability_slots', ['user_id', 'day_of_week']);
  pgm.createIndex('availability_slots', ['user_id', 'specific_date']);

  // Trigger for updated_at
  pgm.createTrigger('availability_slots', 'update_availability_slots_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  pgm.dropTable('availability_slots', { cascade: true });
};