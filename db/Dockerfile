# PostgreSQL with the Mail Space schema, applied when the database is first created
FROM postgres:16-alpine
COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
