-- Manual migration: add recurrence columns to tasks table
ALTER TABLE tasks ADD COLUMN recurrence VARCHAR(20);
ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE;
