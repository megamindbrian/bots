FROM selenium/standalone-firefox-debug
MAINTAINER Brian Cullinan "megamindbrian@gmail.com"

USER root

ENV HOME /root

# Configure apt
RUN echo 'deb http://us.archive.ubuntu.com/ubuntu/ precise universe' >> /etc/apt/sources.list

# Update aptitude with new repo
RUN apt-get update
RUN apt-get -y upgrade

# Install software 
RUN apt-get install --fix-missing -y nodejs npm supervisor build-essential curl
RUN curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Create app directory
RUN mkdir -p /usr/src
WORKDIR /usr/src

RUN export DISPLAY=:99

# create directory for child images to store configuration in
RUN mkdir -p /var/log/supervisor
RUN mkdir -p /etc/supervisor/conf.d

# supervisor base configuration
ADD supervisor.conf /etc/supervisor.conf
ADD node.conf /etc/supervisor/conf.d/
ADD xvfb.conf /etc/supervisor/conf.d/
ADD fluxbox.conf /etc/supervisor/conf.d/
ADD x11vnc.conf /etc/supervisor/conf.d/

# Bundle app source
VOLUME /usr/src

EXPOSE 8080
EXPOSE 7055
EXPOSE 4444
EXPOSE 5900

CMD ["supervisord", "-c", "/etc/supervisor.conf"]



