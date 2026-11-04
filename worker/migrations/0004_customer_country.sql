-- The customer's billing country (ISO 3166-1 alpha-2), saved from the first checkout and prefilled on Polar's page.
ALTER TABLE customers ADD COLUMN country TEXT;
