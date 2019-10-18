#! /bin/bash
#   Copyright 2015-2016, Google, Inc.
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This is the current contents of the GCE instance Metadata `startup-script`,
# which is automatically executed when the `gcloud compute instances reset`
# command is run.
# TODO(#500): Move as much of this as possible to checked-in scripts and split
#   startup code from re-deployment code.

# [START startup]
set -v
#STARTUP=init
STARTUP=deploy

# [START env]
APP_DIR="/opt/app"  # Startup
REPO_DIR="/opt/amphtml"  # Startup + App
REPO="ampproject/amphtml"  # Startup + App

PRIVATE_KEY=$(echo | base64 -w 0 <<EOF
-----BEGIN RSA PRIVATE KEY-----
[REDACTED]
-----END RSA PRIVATE KEY-----
EOF
)  # Probot
# [END env]

supervisorctl stop nodeapp


if [ "$STARTUP" = init ]; then
  # [START logging]
  # Install logging monitor. The monitor will automatically pick up logs sent to
  # syslog.
  curl -s "https://storage.googleapis.com/signals-agents/logging/google-fluentd-install.sh" | bash
  service google-fluentd restart &
  # [END logging]

  # [START installs]
  # Install dependencies from apt
  apt-get update
  apt-get install -yq ca-certificates git nodejs build-essential supervisor

  # Install nodejs
  mkdir /opt/nodejs
  curl https://nodejs.org/dist/v10.15.0/node-v10.15.0-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
  ln -s /opt/nodejs/bin/node /usr/bin/node
  ln -s /opt/nodejs/bin/npm /usr/bin/npm
  # [END installs]
fi


# [START git]
# Get the application source code from the Google Cloud Repository.
# git requires $HOME and it's not set during the startup script.
export HOME=/root
git config --global credential.helper gcloud.sh
rm -rf "${APP_DIR}"
# TODO(#500): Deploy from `amphtml/amp-github-apps`
git clone https://source.developers.google.com/p/amp-owners-bot/r/amp-owners-bot "${APP_DIR}"
# [END git]

# [START update]
cat > .env <<EOF
NODE_ENV=production
LOG_LEVEL=trace
PORT=8080
INFO_SERVER_PORT=8081

APP_ID=22611
WEBHOOK_SECRET=[REDACTED]
PRIVATE_KEY=${PRIVATE_KEY}
GITHUB_ACCESS_TOKEN=[REDACTED]

GITHUB_REPO=${REPO}
GITHUB_REPO_DIR=${REPO_DIR}
GITHUB_BOT_USERNAME=amp-owners-bot
ADD_REVIEWERS_OPT_OUT=1
EOF

# Install app dependencies
cd "${APP_DIR}"
APP_COMMIT_SHA=$(git log --max-count=1 --pretty='format:%h')  # App
APP_COMMIT_MSG=$(git log --max-count=1 --pretty='format:%s')  # App
npm install
# [END update]


if [ "$STARTUP" = init ]; then
  # [START clone]
  # Get a clean copy of the target repository to be evaluated
  rm -rf "${REPO_DIR}"
  git clone "https://github.com/${REPO}.git" "${REPO_DIR}"
  # [END clone]

  # [START auth]
  # Create a nodeapp user. The application will run as this user.
  useradd -m -d /home/nodeapp nodeapp
  chown -R nodeapp:nodeapp "${REPO_DIR}"
  # [END auth]

  # Configure supervisor to run the node app.
  cat >/etc/supervisor/conf.d/node-app.conf << EOF
[program:nodeapp]
directory=${APP_DIR}
command=npm run start
autostart=true
autorestart=true
user=nodeapp
environment=HOME="/home/nodeapp",USER="nodeapp",APP_COMMIT_SHA="${APP_COMMIT_SHA}",APP_COMMIT_MSG="${APP_COMMIT_MSG}"
nodaemon=true
stdout_logfile=syslog
stdout_logfile_maxbytes=0
stderr_logfile=syslog
stderr_logfile_maxbytes=0
EOF

fi


# [START supervisor]
chown -R nodeapp:nodeapp "${APP_DIR}"
supervisorctl reread
supervisorctl start nodeapp
# [END supervisor]

# Application should now be running under supervisor
# [END startup]
