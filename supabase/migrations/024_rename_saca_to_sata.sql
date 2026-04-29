-- Rename saca → sata: add new enum value and migrate existing rows
ALTER TYPE slide_type ADD VALUE IF NOT EXISTS 'sata';
UPDATE slides SET type = 'sata' WHERE type = 'saca';
