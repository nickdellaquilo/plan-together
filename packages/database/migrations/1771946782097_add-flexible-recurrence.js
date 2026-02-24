/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add new recurrence columns
  pgm.addColumns('availability_slots', {
    recurrence_type: {
      type: 'varchar(20)',
      default: 'once',
      check: "recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'yearly')"
    },
    recurrence_interval: {
      type: 'integer',
      default: 1,
      check: 'recurrence_interval > 0'
    },
    recurrence_start_date: {
      type: 'date'
    },
    recurrence_end_date: {
      type: 'date'
    }
  });

  // Migrate existing data
  // For specific dates (one-time events)
  pgm.sql(`
    UPDATE availability_slots 
    SET recurrence_type = 'once',
        recurrence_start_date = specific_date
    WHERE specific_date IS NOT NULL
  `);

  // For weekly recurring events
  pgm.sql(`
    UPDATE availability_slots 
    SET recurrence_type = 'weekly',
        recurrence_interval = 1,
        recurrence_start_date = CURRENT_DATE
    WHERE day_of_week IS NOT NULL
  `);

  // Update constraints - make old constraint optional since we have new system
  pgm.dropConstraint('availability_slots', 'recurring_or_specific');
  
  // Add new constraint: must have recurrence_start_date
  pgm.addConstraint('availability_slots', 'must_have_start_date', {
    check: 'recurrence_start_date IS NOT NULL'
  });

  // Add constraint: end_date must be after start_date if present
  pgm.addConstraint('availability_slots', 'valid_recurrence_dates', {
    check: 'recurrence_end_date IS NULL OR recurrence_end_date >= recurrence_start_date'
  });

  // Create index for recurrence queries
  pgm.createIndex('availability_slots', ['recurrence_type', 'recurrence_start_date']);
};

exports.down = (pgm) => {
  pgm.dropConstraint('availability_slots', 'must_have_start_date');
  pgm.dropConstraint('availability_slots', 'valid_recurrence_dates');
  pgm.dropIndex('availability_slots', ['recurrence_type', 'recurrence_start_date']);
  
  pgm.dropColumns('availability_slots', [
    'recurrence_type',
    'recurrence_interval', 
    'recurrence_start_date',
    'recurrence_end_date'
  ]);
  
  // Re-add old constraint
  pgm.addConstraint('availability_slots', 'recurring_or_specific', {
    check: '(day_of_week IS NOT NULL AND specific_date IS NULL) OR (day_of_week IS NULL AND specific_date IS NOT NULL)'
  });
};