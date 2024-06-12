This is my project on the basics of web development.
The application implements a protein database with the ability to search,
view and download data in genbank format.

# How to run?
## 1. Download and run elasticsearch container

Download the image and launch the container:
* using bridge from container port 9200 to host port 9200
* saving password in ESP variable
```
sudo docker pull elasticsearch:8.13.0
ESP=lk66jJ31231HJGhg//70hfshy462bdmsj
sudo docker run --name es01 -p 9200:9200 -e "ELASTIC_PASSWORD=$ESP" -d --rm -m 8Gb elasticsearch:8.13.0
```
Copy user password and certificate file to some folder:
```
mkdir ~/metadataES
PATH2METADATA=~/metadataES
sudo docker cp es01:/usr/share/elasticsearch/config/certs/http_ca.crt $PATH2METADATA
sudo chmod 744 $PATH2METADATA/http_ca.crt
echo "$ESP" > ~/metadataES/password
```
You can check connection with ES using this command:
```
curl --cacert $PATH2METADATA/http_ca.crt -u elastic:$ESP https:/localhost:9200
```
```
output:
{
  "name" : "9948edbc1146",
  "cluster_name" : "docker-cluster",
  "cluster_uuid" : "oiOgu_coSGiJ46Sly20vfQ",
  "version" : {
    "number" : "8.13.0",
    "build_flavor" : "default",
    "build_type" : "docker",
    "build_hash" : "09df99393193b2c53d92899662a8b8b3c55b45cd",
    "build_date" : "2024-03-22T03:35:46.757803203Z",
    "build_snapshot" : false,
    "lucene_version" : "9.10.0",
    "minimum_wire_compatibility_version" : "7.17.0",
    "minimum_index_compatibility_version" : "7.0.0"
  },
  "tagline" : "You Know, for Search"
}
```
If everything works, it means that you have configured ES correctly.

## 2. Running js React front-end and python flask back-end applications in the second container
Download the dockerfile from this repository.  For example, like this:
```
wget https://raw.githubusercontent.com/NikolaiL-dev/web24hw/main/Dockerfile
```
Then assemble the image from this file and run the container:
* this container uses the host network
* `SIZE` variable controls the size of the database. 
The specified value (=500) means that 500 records for 5 different 
organisms will be presented in the database (total 500 * 5 = 2500 records).
```
sudo docker build . --tag hw_lebedev:react
sudo docker run --volume $PATH2METADATA/:/project/metadataES --env SIZE=500 --name hw_l --net host -d --rm hw_lebedev:react
```
**Please wait a few minutes (~3)! When the container is launched, the database and
index are created, nothing will work until this process is over.**

## 3. Connecting to the database site
* enter `localhost` in web browser
* you should use `http` protocol

# Key points
1. The `flask application` is launched using `gunicorn` running on port 5000.
    * It can send search queries to `elasticsearch` index.
    * Find and display specific records.
    * Send the file for download to the client.
   

2. The `js React application` is launched using `serve` running on port 3000.
    * `Nginx` is used here as a proxy server to redirect all requests from port 80 to 3000.
    *  Using the search bar, you can search the `elasticsearch` index.
      * For example, select the "protein name" category and enter "tumor" as query. 
        You will find all the proteins that have this word in their name.
      * All finds are displayed as cards.
      * You can view the contents of the genbank file if you click on the "View the full record" button.
      * You can also download this file if you click on the appropriate button.






