#!/bin/bash

# stop old bots
docker stop $(docker ps --format "{{.ID}}\t{{.Image}}\t{{.Names}}" | grep "selenium" | awk '{print $3}')
docker stop robots
docker ps -q -a | xargs docker rm
docker rmi $(docker images | grep "^<none>" | awk '{print $3}')

# remove old bots
docker rmi megamind/bots
docker rmi megamind/selenium
docker rmi sosmethod

# build new bots
docker build -t megamind/bots /Users/briancullinan/Documents/robots/bots
docker build -t megamind/selenium /Users/briancullinan/Documents/robots/node-selenium
docker build -t megamind/sosmethod /Users/briancullinan/Documents/sosmethod

# create network
docker network create -d bridge --subnet 172.25.0.0/16 megamindnetwork

# run new bots
docker run --name selenium -h selenium --net=megamindnetwork -p 4444:4444 -p 8081:8080 -p 5901:5900 --link=robots:robots -d -v /Users/briancullinan/Documents/robots/node-selenium/:/usr/src -v /Users/briancullinan/Documents/robots/bots/defaultProfile:/usr/profile -v /Users/briancullinan/Downloads:/data/downloads --shm-size=1g megamind/selenium
docker run --name robots -h robots --net=megamindnetwork -e WEBDRIVER_HOST=selenium --link selenium:selenium -p 8080:8080 -p 3690:3690 -d -v /Users/briancullinan/Documents/svn/:/var/svn -v /Users/briancullinan/Documents/robots/bots/:/usr/src -v /Users/briancullinan/Documents/robots/bots/defaultProfile:/usr/profile -v /Users/briancullinan/Contacts:/data/contacts -v /Users/briancullinan/Downloads:/data/downloads -v /Users/briancullinan/Timeline:/data/timeline megamind/bots
#docker run --name robots -h robots --net=megamindnetwork --net=host -d -v /Users/briancullinan/Documents/svn/:/var/svn -v /Users/briancullinan/Documents/robots/bots/:/usr/src megamind/bots
#docker run --name sosmethod -h sosmethod --net=megamindnetwork --link mongodb:mongodb -p 8082:3000 -d -v /Users/briancullinan/Documents/sosmethod/:/usr/src megamind/sosmethod
#docker run -d -p 27017:27017 -v /Users/briancullinan/Documents/db/:/data/db --name mongodb library/mongo

docker network connect megamindnetwork selenium
docker network connect megamindnetwork robots
docker network connect megamindnetwork sosmethod
docker network connect megamindnetwork mongodb

