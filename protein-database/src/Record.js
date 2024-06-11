import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

const Record = () => {
    const { id } = useParams();
    const { search } = useLocation();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);

    const organism = new URLSearchParams(search).get('organism');

    useEffect(() => {
        const fetchRecord = async () => {
            const url = `http://127.0.0.1:5000/record/${id}?organism=${encodeURIComponent(organism)}`;

            try {
                const response = await axios.get(url);
                setRecord(response.data);
            } catch (error) {
                console.error('Error fetching record:', error);
            }
        };

        fetchRecord();
    }, [id, organism]);

    const downloadFile = async () => {
        const url = `http://127.0.0.1:5000/download/${id}?organism=${encodeURIComponent(organism)}`;
        
        try {
            const response = await axios.get(url, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'application/octet-stream' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `GenBank_${id}.gbk`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };


    return (
        <div className="App">
            <main>
                <div className="record-container">
                    {record ? (
                        <div className="record-details" style={{ whiteSpace: 'pre-line', lineHeight: '1.7', textAlign: 'justify', fontSize: '18px' }}>
                            <h2>Record Details for ID: {id}</h2>
                            <button className="download-button" onClick={downloadFile}>Download GenBank file</button>
                            <button className="back-button" onClick={() => navigate(-1)}>Back</button>
                            <p>{record}</p>
                        </div>
                    ) : (
                        <p>Loading record...</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Record;
