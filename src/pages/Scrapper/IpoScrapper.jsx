import { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    CircularProgress, 
    Alert,
    Chip,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ipoScrapperActions from '../../store/actions/iposcrapper.actions';

const IpoScrapper = () => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [scrapedAt, setScrapedAt] = useState(null);
    const [filter, setFilter] = useState('all');

    const filteredRows = rows.filter(row => {
        if (filter === 'all') return true;
        if (filter === 'sme') {
            // Use the isSME flag if available, otherwise fallback to text detection
            return row.isSME === true || 
                   row.source?.toLowerCase().includes('sme') || 
                   row.companyName?.toLowerCase().includes('sme') ||
                   row.rawText?.toLowerCase().includes('sme') ||
                   row.rawText?.toLowerCase().includes('emerge');
        }
        if (filter === 'mainline') {
            // Mainline IPOs are those that are explicitly not SME
            return row.isSME !== true && 
                   !row.source?.toLowerCase().includes('sme') && 
                   !row.companyName?.toLowerCase().includes('sme') &&
                   !row.rawText?.toLowerCase().includes('sme') &&
                   !row.rawText?.toLowerCase().includes('emerge');
        }
        return true;
    });

    const handleFilterChange = (event, newFilter) => {
        if (newFilter !== null) {
            setFilter(newFilter);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await ipoScrapperActions.iposcrapper();
                // Add unique id to each row for DataGrid
                const iposWithId = (data.ipos || []).map((ipo, idx) => ({
                    id: idx + 1,
                    ...ipo
                }));
                setRows(iposWithId);
                setScrapedAt(data.scrapedAt);
                
                if (data.errors && data.errors.length > 0) {
                    console.warn('Some URLs failed:', data.errors);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'open': return 'success';
            case 'upcoming': return 'info';
            case 'closed': return 'warning';
            case 'listed': return 'default';
            default: return 'default';
        }
    };

    const columns = [
        { 
            field: 'companyName', 
            headerName: 'Company Name', 
            width: 200,
        },
        { 
            field: 'status', 
            headerName: 'Status', 
            width: 120,
            renderCell: (params) => (
                params.value ? (
                    <Chip 
                        label={params.value} 
                        size="small" 
                        color={getStatusColor(params.value)}
                    />
                ) : '-'
            )
        },
        { 
            field: 'openDate', 
            headerName: 'Open Date', 
            width: 130,
        },
        { 
            field: 'closeDate', 
            headerName: 'Close Date', 
            width: 130,
        },
        { 
            field: 'listingDate', 
            headerName: 'Listing Date', 
            width: 130,
        },
        { 
            field: 'issueSize', 
            headerName: 'Issue Size', 
            width: 130,
        },
        { 
            field: 'priceRange', 
            headerName: 'Price Range', 
            width: 130,
        },
        { 
            field: 'lotSize', 
            headerName: 'Lot Size', 
            width: 100,
        },
        { 
            field: 'source', 
            headerName: 'Source', 
            width: 200,
            renderCell: (params) => {
                try {
                    return new URL(params.value).hostname;
                } catch {
                    return params.value || '-';
                }
            }
        },
    ];

    return (
        <Box sx={{ p: 3}}>
            <Typography variant="h4" gutterBottom>
                IPO Data
            </Typography>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Scraping IPO data from multiple sources...</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Make sure proxy server is running: <code>node proxy-server.js</code>
                    </Typography>
                </Alert>
            )}

            {!loading && rows.length === 0 && (
                <Alert severity="warning">
                    No IPO data found. Make sure proxy server is running.
                </Alert>
            )}

            {!loading && rows.length > 0 && (
                <Box>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <ToggleButtonGroup
                            value={filter}
                            exclusive
                            onChange={handleFilterChange}
                            aria-label="IPO filter"
                            sx={{color:'#FFFFFF'}}
                        >
                            <ToggleButton value="all" aria-label="all IPOs" sx={{color:'#FFFFFF'}}>
                                All ({rows.length})
                            </ToggleButton>
                            <ToggleButton value="mainline" aria-label="mainline IPOs" sx={{color:'#FFFFFF'}}>
                                Mainline ({rows.filter(r => !r.source?.toLowerCase().includes('sme') && !r.companyName?.toLowerCase().includes('sme')).length})
                            </ToggleButton>
                            <ToggleButton value="sme" aria-label="SME IPOs" sx={{color:'#FFFFFF'}}>
                                SME ({rows.filter(r => r.source?.toLowerCase().includes('sme') || r.companyName?.toLowerCase().includes('sme')).length})
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Typography variant="body2" color="#FFFFFF">
                            Showing: {filteredRows.length} | Last updated: {new Date(scrapedAt).toLocaleString()}
                        </Typography>
                    </Box>

                    <Box sx={{ height: 700, width: '100%' }}>
                        <DataGrid
                            rows={filteredRows}
                            columns={columns}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 25, page: 0 },
                                },
                            }}
                            pageSizeOptions={[25, 50, 100]}
                            disableRowSelectionOnClick
                            disableColumnFilter
                            disableColumnMenu
                            disableColumnSort
                            sx={{
                                '& .MuiDataGrid-cell': {
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                },
                                '& .MuiDataGrid-columnHeader': {
                                    '&:focus, &:focus-within': {
                                        outline: 'none',
                                    },
                                },
                                '& .MuiDataGrid-columnHeaderTitle': {
                                    fontWeight: 'bold',
                                },
                                '& .MuiDataGrid-sortIcon': {
                                    display: 'none',
                                },
                                '& .MuiDataGrid-columnSeparator': {
                                    display: 'none',
                                },
                            }}
                        />
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default IpoScrapper;
