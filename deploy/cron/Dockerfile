# Replaces netlify/functions/*.ts (Netlify Scheduled Functions), which just call
# the app's own /api/cron/* routes on a schedule. Same routes, same CRON_SECRET
# bearer auth — only the scheduler changes.
FROM alpine:3.20
RUN apk add --no-cache curl busybox-suid
COPY crontab /etc/crontabs/root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
