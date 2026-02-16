/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true
    },
    phone_number: {
      type: 'varchar(20)',
      unique: true
    },
    email_verified: {
      type: 'boolean',
      default: false
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

  // Profiles table
  pgm.createTable('profiles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    first_name: {
      type: 'varchar(100)',
      notNull: true
    },
    last_name: {
      type: 'varchar(100)',
      notNull: true
    },
    display_name: {
      type: 'varchar(100)'
    },
    bio: {
      type: 'text'
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
    has_car: {
      type: 'boolean',
      default: false
    },
    car_seats: {
      type: 'integer'
    },
    car_mpg: {
      type: 'decimal(5, 2)'
    },
    avatar_color: {
      type: 'varchar(7)',
      default: '#3b82f6'
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

  // Create indexes for better query performance
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'phone_number');
  pgm.createIndex('profiles', 'user_id');

  // Create function to update updated_at timestamp
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      NEW.updated_at = current_timestamp;
      RETURN NEW;
    END;
    `
  );

  // Create triggers to automatically update updated_at
  pgm.createTrigger('users', 'update_users_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('profiles', 'update_profiles_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  pgm.dropTable('profiles', { cascade: true });
  pgm.dropTable('users', { cascade: true });
  pgm.dropFunction('update_updated_at_column', [], { cascade: true });
  pgm.dropExtension('uuid-ossp');
};