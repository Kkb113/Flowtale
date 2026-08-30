#!/bin/bash

sudo su

apt-get update
apt-get install -y docker.io
apt-get install -y docker-compose

### To check status of docker daemon
# systemctl status docker

# make
apt-get install -y build-essential

# Install java
apt install -y openjdk-17-jdk openjdk-17-jre

# Install maven
# EXIT FROM SU
wget https://mirrors.estointernet.in/apache/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.tar.gz
tar -xvf apache-maven-3.6.3-bin.tar.gz
sudo mv apache-maven-3.6.3 /opt/
rm apache-maven-3.6.3-bin.tar.gz
sudo ln -s /opt/apache-maven-3.6.3/bin/mvn /usr/local/bin/

# github deploy token
# https://docs.github.com/en/developers/overview/managing-deploy-keys#deploy-keys
cd ~/.ssh && ssh-keygen -t ed25519 -C "akash@sharefable.com"
# NAME THE FILE AS github
eval "$(ssh-agent -s)"
ss-add ~/.ssh/github
git clone git@github.com:sharefable/api.git

# From local inside (${project}/api)
scp env.dev fab-api:~/api/



