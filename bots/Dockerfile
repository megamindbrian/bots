FROM node:argon
MAINTAINER Brian Cullinan "megamindbrian@gmail.com"

ENV HOME /root

# Configure apt
RUN echo 'deb http://us.archive.ubuntu.com/ubuntu/ precise universe' >> /etc/apt/sources.list

# Update aptitude with new repo
RUN apt-get update

# Install software 
RUN apt-get --fix-missing -y install git subversion supervisor cron curl net-tools

# Make ssh dir
#RUN mkdir /root/.ssh/
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy over private key, and set permissions
#ADD id_rsa /root/.ssh/id_rsa

# Create known_hosts
#RUN touch /root/.ssh/known_hosts
# Add bitbuckets key
#RUN ssh-keyscan bitbucket.org >> /root/.ssh/known_hosts

# Create app directory
RUN mkdir -p /usr/src
RUN mkdir -p /var/svn
WORKDIR /usr/src

# Clone the conf files into the docker container
#RUN git clone git@bitbucket.org:User/repo.git

# Bundle app source
#COPY . /usr/src/bots

# create directory for child images to store configuration in
RUN mkdir -p /var/log/supervisor
RUN mkdir -p /etc/supervisor/conf.d

# supervisor base configuration
ADD supervisor.conf /etc/supervisor.conf
ADD svnserve.conf /etc/supervisor/conf.d/
ADD node.conf /etc/supervisor/conf.d/
ADD cron.conf /etc/supervisor/conf.d/

#RUN echo '0 0,6,12,18 * * *  root . /root/.profile;/usr/local/bin/node /application/rssfetch/index.js' >>/etc/crontab
#RUN echo '*/2 * * * *       root curl -s http://localhost/ >/dev/null 2>&1'  >>/etc/crontab

# expose useful ports
EXPOSE 3690
EXPOSE 8080
EXPOSE 4444

# connect data
VOLUME /usr/src
VOLUME /var/svn

#CMD [ "npm", "start" ]

# default command
CMD ["supervisord", "-c", "/etc/supervisor.conf"]


