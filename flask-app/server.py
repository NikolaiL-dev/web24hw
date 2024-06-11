import json
from flask import Flask
import requests
from pathlib import Path
from flask_cors import CORS, cross_origin
from flask import request, send_from_directory

path2Metadata    = Path('..', 'metadataES')
path2DB          = Path('..', 'public')
# url 127.0.0.1:5000
# {"Content-type": "application/json; charset=UTF-8"}
elastic_password = open(path2Metadata.joinpath('password'), 'r').read().rstrip()
elastic_cerf     = path2Metadata.joinpath('http_ca.crt')
elastic_url      = 'https://localhost:9200'
all_fields       = open(path2Metadata.joinpath('headers.csv'), 'r').read().rstrip().split(',')

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
@app.route('/search', methods=['POST'])

# ElasticSearch handler module
def search():

    # read the input data
    data = request.get_json()

    # formating query
    query = {"size": 100, "query": {
                 "bool":{
                     "must":list()}
                }
            }
    for d in data['query']:
        for key in d.keys():
            if key == 'all':
                query['query']['bool']['should'] = [{"match":{field:d[key]}} for field in all_fields]

            elif key in ['titles', 'protein_names']:
                query['query']['bool']['must'].append({"match_phrase":{key : d[key]}})
            else:
                query['query']['bool']['must'].append({"match": {key: d[key]}})
    query = json.dumps(query)

    session = requests.Session()
    session.auth = ('elastic', elastic_password)
    response = session.post(elastic_url + f'/proteome/_search?pretty',
                            headers={'content-type': 'application/json'},
                            data=query, verify=elastic_cerf)
    return response.json()

@app.route('/record/<id>', methods=['GET'])
def get_record(id):
    d = {"response":[]}
    organism = request.args.get('organism').replace(' ', '_')

    f = open(path2DB.joinpath(organism, id+'.gpff'), 'r')
    return f.read()

@app.route('/download/<id>', methods=['GET'])
def download(id):
    organism = request.args.get('organism').replace(' ', '_')
    return send_from_directory(path2DB.joinpath(organism), id+'.gpff')

if __name__ == "__main__":
    app.run(debug=True)




