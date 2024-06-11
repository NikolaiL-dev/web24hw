import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Record from './Record';

function App() {
    const [searchFields, setSearchFields] = useState([{ category: 'all', query: '' }]);
    const [submittedQuery, setSubmittedQuery] = useState(null);
    const [results, setResults] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalHits, setTotalHits] = useState(0);

    // Load state from localStorage
    useEffect(() => {
        const savedState = JSON.parse(localStorage.getItem('searchState'));
        if (savedState) {
            setSearchFields(savedState.searchFields);
            setSubmittedQuery(savedState.submittedQuery);
            setResults(savedState.results);
            setCurrentPage(savedState.currentPage);
            setTotalHits(savedState.totalHits);
        }
    }, []);

    const handleSearch = async () => {
        const url = 'http://127.0.0.1:5000/search';

        const query = searchFields.reduce((acc, field) => {
            if (field.query !== '') {
                acc.push({ [field.category]: field.query });
            }
            return acc;
        }, []);

        const data = { query };

        try {
            const response = await axios.post(url, data);
            console.log('Response:', response.data);
            if (response.data.hits && Array.isArray(response.data.hits.hits)) {
                setResults(response.data.hits.hits);
                setTotalHits(response.data.hits.hits.length);
            } else {
                setResults([]);
                setTotalHits(0);
            }
            setCurrentPage(1); // Reset to the first page
            setSubmittedQuery(JSON.stringify(data, null, 2)); // Show the submitted query
            saveStateToLocalStorage({
                searchFields,
                submittedQuery: JSON.stringify(data, null, 2),
                results: response.data.hits.hits,
                currentPage: 1,
                totalHits: response.data.hits.hits.length
            });
        } catch (error) {
            console.error('Error:', error);
            setResults([]);
            setTotalHits(0);
        }
    };

    // Save state to localStorage
    const saveStateToLocalStorage = (state) => {
        localStorage.setItem('searchState', JSON.stringify(state));
    };

    // Clear localStorage and state
    const handleClear = () => {
        localStorage.removeItem('searchState');
        setSearchFields([{ category: 'all', query: '' }]);
        setSubmittedQuery(null);
        setResults([]);
        setCurrentPage(1);
        setTotalHits(0);
    };

    const goHome = () => {
        handleClear()
        window.location.href = '/';
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleAddField = () => {
        setSearchFields([...searchFields, { category: 'all', query: '' }]);
    };

    const handleRemoveField = (index) => {
        const fields = [...searchFields];
        fields.splice(index, 1);
        setSearchFields(fields);
    };

    const handleFieldChange = (index, key, value) => {
        const fields = [...searchFields];
        fields[index][key] = value;
        setSearchFields(fields);
    };

    const handleNextPage = () => {
        console.log('Next button clicked');
        if (currentPage < Math.ceil(totalHits / 20)) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            saveStateToLocalStorage({
                searchFields,
                submittedQuery,
                results,
                currentPage: newPage,
                totalHits
            });
            window.scrollTo(0, 0);
        }
    };

    const handlePreviousPage = () => {
        console.log('Previous button clicked');
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            saveStateToLocalStorage({
                searchFields,
                submittedQuery,
                results,
                currentPage: newPage,
                totalHits
            });
            window.scrollTo(0, 0);
        }
    };

    useEffect(() => {
        console.log('Current Page:', currentPage);
    }, [currentPage]);

    const renderCards = () => {
        const startIndex = (currentPage - 1) * 20;
        const endIndex = startIndex + 20;
        const currentHits = results.slice(startIndex, endIndex);
        return currentHits.map(hit => (
            <div key={hit._id} className="card">
                <p style={{fontSize: '26px', textAlign: 'justify'}}> <strong>ID:</strong> {hit._id} </p>
                <p style={{textAlign: 'justify', lineHeight: '1.7'}}> <strong>Main gene names:</strong> {hit._source.gene_names[0]} <br/>
                <strong>Alternative gene names:</strong> {hit._source.gene_names.slice(1)} <br/>
                <strong>Chromosome:</strong> {hit._source.chromosome} </p>
                <p><br/></p>
                <p style={{textAlign: 'justify', lineHeight: '1.7'}}> <strong>Main protein name:</strong> {hit._source.protein_names[0]} <br/>
                <strong>Alternative protein names:</strong> {hit._source.protein_names.slice(1)} <br/>
                <strong>Description:</strong> {hit._source.description} <br/>
                <strong>Regions:</strong> {hit._source.regions.length !== 0 ? hit._source.regions.join(', ') : 'It does not contain specific regions'} <br/>
                <strong>Sites:</strong> {hit._source.sites.length !== 0 ? hit._source.sites.join(', ') : 'It does not contain specific sites'}
                </p>
                <p><br/></p>
                <p style={{textAlign: 'justify', lineHeight: '1.7'}}><strong>Taxonomy:</strong> {hit._source.taxonomy.join(', ')} <br/>
                <strong>Organism:</strong> {hit._source.organism} <br/>
                </p>
                <form action={`/record/${hit._id}`}>
                <input type="hidden" name="organism"   value={hit._source.organism} />
                    <button type="submit" className='link'>View the full record</button>
                </form>
            </div>
        ));
    };

    return (
        <Router>
            <div className="App">
                <header className="App-header" >
                    <h1 onClick={goHome}>Protein Database</h1>
                </header>
                <main>
                    <Routes>
                        <Route path="/" element={
                            <div className="search-container">
                                {searchFields.map((field, index) => (
                                    <div key={index} className="search-field">
                                        <select 
                                            value={field.category} 
                                            onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
                                        >
                                            <option value="all">All</option>
                                            <option value="id">ID</option>
                                            <option value="gene_names">Gene Names</option>
                                            <option value="protein_names">Protein Names</option>
                                            <option value="description">Description</option>
                                            <option value="organism">Organism</option>
                                            <option value="taxonomy">Taxonomy</option>
                                            <option value="PubMedID">PubMedID</option>
                                            <option value="authors">Authors</option>
                                            <option value="titles">Titles</option>
                                            <option value="chromosome">Chromosome</option>
                                            <option value="regions">Regions</option>
                                            <option value="sites">Sites</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            value={field.query} 
                                            onChange={(e) => handleFieldChange(index, 'query', e.target.value)} 
                                            placeholder="Enter search query" 
                                            onKeyPress={handleKeyPress}
                                        />
                                        {index === 0 && <button onClick={handleSearch}>Search</button>}
                                        {index > 0 && <button onClick={() => handleRemoveField(index)}>Remove last field</button>}
                                    </div>
                                ))}
                                <div className="buttons">
                                    <button onClick={handleAddField} className='add-field'>Add new field</button>
                                    <button onClick={handleClear} className='clear-field'>Clear</button>
                                </div>
                                {/* {submittedQuery && (
                                    <div className="submitted-query">
                                        <h3>Submitted Query:</h3>
                                        <pre>{submittedQuery}</pre>
                                    </div>
                                )} */}
                                <div className="results">
                                    {renderCards()}
                                    <div className="pagination">
                                        {currentPage > 1 && (
                                            <button onClick={handlePreviousPage}>Previous page</button>
                                        )}
                                        {currentPage < Math.ceil(totalHits / 20) && (
                                            <button onClick={handleNextPage}>Next page</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        }/>
                        <Route path="/record/:id" element={<Record />} />
                    </Routes>
                </main>
                <footer>
                    <p>This protein database can be used as an support tool for bioinformatic analysis</p>
                    <p>Here provides data for <i>Human</i>, <i>Mouse</i>, <i>D. Melanogaster</i>, 
                       <i> C. Elegans</i> and <i>E. Coli</i> reference proteomes
                       </p>
                    <p>© Nikolai Lebedev, 2024</p>
                </footer>
            </div>
        </Router>
    );
}

export default App;
