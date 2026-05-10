-- PostGIS for geography(point) columns on saves and users
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm for trigram indexes used by full-text search on title/description
CREATE EXTENSION IF NOT EXISTS pg_trgm;
