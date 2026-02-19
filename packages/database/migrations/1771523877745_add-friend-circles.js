/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Circles table
  pgm.createTable('circles', {
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
    name: {
      type: 'varchar(200)',
      notNull: true
    },
    description: {
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

  // Circle members table
  pgm.createTable('circle_members', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    circle_id: {
      type: 'uuid',
      notNull: true,
      references: 'circles',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    added_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indexes
  pgm.createIndex('circles', 'creator_id');
  pgm.createIndex('circle_members', 'circle_id');
  pgm.createIndex('circle_members', 'user_id');

  // Unique constraint: user can only be added once per circle
  pgm.createConstraint('circle_members', 'unique_circle_user', {
    unique: ['circle_id', 'user_id']
  });

  // Trigger for circles updated_at
  pgm.createTrigger('circles', 'update_circles_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  pgm.dropTable('circle_members', { cascade: true });
  pgm.dropTable('circles', { cascade: true });
};