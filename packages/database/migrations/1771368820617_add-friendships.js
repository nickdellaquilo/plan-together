/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Friendships table
  pgm.createTable('friendships', {
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
    friend_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'accepted', 'blocked')"
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

  // Prevent self-friendship
  pgm.addConstraint('friendships', 'no_self_friendship', {
    check: 'user_id != friend_id'
  });

  // Unique user-friend pairs
  pgm.createConstraint('friendships', 'unique_user_friend', {
    unique: ['user_id', 'friend_id']
  });

  // Indexes
  pgm.createIndex('friendships', 'user_id');
  pgm.createIndex('friendships', 'friend_id');
  pgm.createIndex('friendships', 'status');

  // Trigger for updated_at
  pgm.createTrigger('friendships', 'update_friendships_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  pgm.dropTable('friendships', { cascade: true });
};