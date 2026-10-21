# LagroInAction (LIA) - PHP + Apache, for Render.
FROM php:8.5-apache

# PostgreSQL driver for PDO (Neon is PostgreSQL)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

# Use PHP's production settings (hides error details from visitors)
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Only the public/ folder is reachable from the web.
# includes/ (database code, settings) stays private.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf /etc/apache2/apache2.conf \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Render sends traffic to the port in $PORT (10000 by default)
ENV PORT=10000
RUN sed -ri 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf \
    && sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/' /etc/apache2/sites-available/000-default.conf

COPY public/ /var/www/html/public/
COPY includes/ /var/www/html/includes/

EXPOSE 10000
