FROM ubuntu:23.10

LABEL you can find the application code in the github repository

WORKDIR /project

# installed apps:
#
# apt		:	mc git systemctl wget vim nginx python3 curl
# conda		:	gunicorn flask flask_cors requests tqdm Biopython
# npm           :       pm2 serve

# the demons were running:
#
# 1. nginx as proxy port 3000 -> port 80
# 2. gunicorn for flask back-end on port 5000
# 3. serve for React front-end on port 3000
# (you should run the serve demon using exec after starting the container)

# other container should be starting:
#
# 1. elasticsearch:8.13.0 from docker hub

RUN apt-get update && apt-get install mc git systemctl wget vim nginx python3 curl -y;\
wget https://repo.anaconda.com/miniconda/Miniconda3-py39_23.11.0-2-Linux-x86_64.sh;\
bash Miniconda3-py39_23.11.0-2-Linux-x86_64.sh -b -p ./miniconda3 ;\
./miniconda3/bin/conda config --add channels defaults ;\
./miniconda3/bin/conda config --add channels bioconda ;\
./miniconda3/bin/conda config --add channels conda-forge ;\
./miniconda3/bin/conda init; rm *.sh;\
./miniconda3/bin/conda install gunicorn flask flask_cors requests tqdm Biopython;\
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash ;\
. ~/.bashrc; nvm install 20;\
git clone https://github.com/NikolaiL-dev/web2024_hw.git ; mv web2024_hw/* . ; rm -r web2024_hw;\
cd protein-database; npm install; npm run build; npm install -g serve;\
mv ../nginx_conf/* /etc/nginx/sites-available/

ENV REACTAPP=/project/protein-database/build
ENV FLASKAPP=/project/flask-app/server.py
ENV NODE=/root/.nvm/versions/node/v20.14.0/bin/node
ENV SERVE=/root/.nvm/versions/node/v20.14.0/bin/serve


ENTRYPOINT mkdir public; ln -s /etc/nginx/sites-available/flaskApp /etc/nginx/sites-enabled/flaskApp ;\
unlink /etc/nginx/sites-enabled/default; cd /project/flask-app; ../miniconda3/bin/conda run -n base gunicorn -b 0.0.0.0:5000 wsgi:app& \
systemctl start nginx; ../miniconda3/bin/conda run -n base python init.py --size 100; $NODE $SERVE -s $REACTAPP; bash
