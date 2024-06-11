import colorsys

from Bio import SeqIO
from os import mkdir, remove, listdir
import json
import time
from tqdm import tqdm
from pathlib import Path
import requests
import gzip
import argparse
import shutil

parser = argparse.ArgumentParser(prog='genbank file parser')
parser.add_argument('-s', '--size',
                    help='number of records for each taxon')
args=parser.parse_args()
print('Download the data...')
def gb2json(path):
    '''
    the function convert gb file to json format
    path     :     str or Path     :    path to gb file with single record 
    return json as string
    '''
    # read gb file
    gb = SeqIO.read(path, 'gb')

    # create empty vars
    authors, id, titles           = [], [], []
    protein_names, regions, sites = set(), set(), set()
    
    # parse information about sci-articles
    if 'references' in gb.annotations.keys():
        for paper in gb.annotations['references']:   
            authors.append(paper.authors)
            id.append(paper.pubmed_id)
            titles.append(paper.title)
    
    # parse common information about protein
    for feature in gb.features:
        keys = feature.qualifiers.keys()
        if 'organism' in keys: 
            if 'Bacteria' in gb.annotations['taxonomy']:
                chromosome = 'genomic'
            else:
                chromosome = feature.qualifiers['chromosome']
        elif ('product' in keys) or (('product' in keys) and ('note' in keys)):
            if 'product' in keys:
                protein_names.add(*feature.qualifiers['product'])
            if 'note' in keys:
                protein_names.add(*feature.qualifiers['note'])
            
        elif 'gene' in keys:
            gene_names = feature.qualifiers['gene']
            if 'gene_synonym' in keys:
                gene_names.append(*feature.qualifiers['gene_synonym'])
        elif 'region_name' in keys:
            regions.add(*feature.qualifiers['region_name'])
        elif 'site_type' in keys:
            sites.add(*feature.qualifiers['site_type'])
            
    # create a dictionary and convert it to json format
    d = {'id'            :   gb.name,
         'gene_names'    :   gene_names,
         'protein_names' :   list(protein_names),
         'description'   :   gb.description,
         'organism'      :   gb.annotations['organism'],
         'taxonomy'      :   gb.annotations['taxonomy'],
         'PubMedID'      :   id,
         'authors'       :   authors,
         'titles'        :   titles,
         'chromosome'    :   chromosome,
         'regions'       :   list(regions),
         'sites'         :   list(sites)
        }

    for key in d.keys():
        if type(d[key]) is type(str()):
            d[key] = d[key].replace('"', '')
        elif type(d[key]) is type(list()):
            d[key] = [elem.replace('"', '') for elem in d[key]]
    
    return json.dumps(d)

# get whole proteome of mouse and human from NCBI ftp server
download = {'Homo_sapiens'                              : 'https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/405/GCF_000001405.26_GRCh38/GCF_000001405.26_GRCh38_protein.gpff.gz',
            'Mus_musculus'                              : 'https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/635/GCF_000001635.27_GRCm39/GCF_000001635.27_GRCm39_protein.gpff.gz',
            'Escherichia_coli_str._K-12_substr._MG1655' : 'https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/005/845/GCF_000005845.2_ASM584v2/GCF_000005845.2_ASM584v2_protein.gpff.gz',
            'Caenorhabditis_elegans'                    : 'https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/002/985/GCF_000002985.6_WBcel235/GCF_000002985.6_WBcel235_protein.gpff.gz',
            'Drosophila_melanogaster'                   : 'https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/215/GCF_000001215.4_Release_6_plus_ISO1_MT/GCF_000001215.4_Release_6_plus_ISO1_MT_protein.gpff.gz'}


path = (Path.cwd().parents[0])

elastic_password = open(path.joinpath('metadataES', 'password'), 'r').read().rstrip()
elastic_cerf     = path.joinpath('metadataES', 'http_ca.crt')
elastic_url      = 'https://localhost:9200'
upperTrashold    = int(args.size)

# absolute path to the project dir
path = (Path.cwd().parents[0]).joinpath('public')

start_time = time.time()
for organism in download.keys():
    dbpath = path.joinpath(organism)
    if not dbpath.exists(): mkdir(dbpath)

    # download file from ftp
    response = requests.get(download[organism])
    response.raise_for_status()

    # create arhived .gz file
    with open(dbpath.joinpath(f'{organism}.gb.gz'), 'wb') as file:
        file.write(response.content)

    # gnu-unzip this file and remove .gz
    with gzip.open(dbpath.joinpath(f'{organism}.gb.gz'), 'rb') as f_in:
        with open(dbpath.joinpath(f'{organism}.gb'), 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    remove(dbpath.joinpath(f'{organism}.gb.gz'))

    # parse gb-file
    gb = SeqIO.parse(dbpath.joinpath(f'{organism}.gb'), 'genbank')
    # i -- limits the number of downloaded records
    for i, record in enumerate(gb):
        if i == upperTrashold: break
        with open(dbpath.joinpath(f'{record.name}.gpff'), 'w') as gb_f:
            SeqIO.write(record, gb_f, 'genbank')
    remove(dbpath.joinpath(f'{organism}.gb'))

# start new session
session = requests.Session()
session.auth = ('elastic', elastic_password)

for organism in download.keys():
    for file_name in tqdm(listdir(path.joinpath(organism))):
        if 'gpff' not in file_name: continue
        json_content = gb2json(path.joinpath(organism, file_name))
        

        response = session.put(elastic_url + f'/proteome/_doc/{file_name.split(".")[0]}?pretty',
                               headers={'content-type': 'application/json'},
                               data=json_content,
                               verify=elastic_cerf)

with open(path.parents[0].joinpath('metadataES',
                                   'headers.csv'), 'w') as f:
    
    headers = json.loads(json_content)
    headers = ','.join(list(headers.keys()))
    f.write(headers)
    
print('Elapsed time: ', round((time.time() - start_time)/60, 2), 'min')
