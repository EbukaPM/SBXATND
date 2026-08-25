#!/bin/sh
set -e

# busybox crond does not inherit the container's environment by default, so
# each cron job has no access to $APP_URL/$CRON_SECRET unless we hand it to
# them explicitly. Dump the env once at startup into a file each job sources.
printenv | sed 's/^\([^=]*\)=\(.*\)$/export \1="\2"/' > /etc/cron.env
chmod 600 /etc/cron.env

exec crond -f -l 2
