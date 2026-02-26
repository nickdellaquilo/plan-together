/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Link events to circles for visibility control
  pgm.createTable('event_circles', {
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
    circle_id: {
      type: 'uuid',
      notNull: true,
      references: 'circles',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indexes
  pgm.createIndex('event_circles', 'event_id');
  pgm.createIndex('event_circles', 'circle_id');

  // Unique constraint: circle can only be linked once per event
  pgm.createConstraint('event_circles', 'unique_event_circle', {
    unique: ['event_id', 'circle_id']
  });
};

exports.down = (pgm) => {
  pgm.dropTable('event_circles', { cascade: true });
};