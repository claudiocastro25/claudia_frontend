import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Paper,
  Pagination,
  IconButton,
  Tooltip,
  Chip,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import { Search, Download, Filter } from 'lucide-react';

// Function to download the data as CSV
const downloadCSV = (data, filename = 'data.csv') => {
  if (!data || data.length === 0) return;
  
  // Get headers
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that need quotes (strings with commas, quotes, or newlines)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value !== undefined && value !== null ? value : '';
      }).join(',')
    )
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const DataTable = ({ 
  data = [], 
  title = "Data Table", 
  onCreateChart,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 10
}) => {
  const theme = useTheme();
  // State for search and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  
  // Get table headers (columns) from the first data item
  const headers = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);
  
  // Function to determine the cell type (numeric, date, text)
  const getCellType = (value) => {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') return 'numeric';
    
    // Check if it's a date string
    if (typeof value === 'string') {
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
        /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO date with time
      ];
      
      if (dateFormats.some(regex => regex.test(value))) {
        return 'date';
      }
    }
    
    return 'text';
  };
  
  // Column types for each header (used for sorting and rendering)
  const columnTypes = useMemo(() => {
    if (data.length === 0) return {};
    
    return headers.reduce((types, header) => {
      // Check the first non-null value to determine the type
      const nonNullValue = data.find(item => item[header] !== null && item[header] !== undefined);
      const value = nonNullValue ? nonNullValue[header] : null;
      types[header] = getCellType(value);
      return types;
    }, {});
  }, [data, headers]);
  
  // Handle sort request
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };
  
  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let processedData = [...data];
    
    // Apply search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      processedData = processedData.filter(row => 
        Object.values(row).some(value => 
          value !== null && 
          value !== undefined && 
          value.toString().toLowerCase().includes(lowerCaseSearchTerm)
        )
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      processedData.sort((a, b) => {
        if (a[sortConfig.key] === null || a[sortConfig.key] === undefined) return 1;
        if (b[sortConfig.key] === null || b[sortConfig.key] === undefined) return -1;
        
        let comparison = 0;
        const type = columnTypes[sortConfig.key];
        
        if (type === 'numeric') {
          comparison = a[sortConfig.key] - b[sortConfig.key];
        } else if (type === 'date') {
          comparison = new Date(a[sortConfig.key]) - new Date(b[sortConfig.key]);
        } else {
          comparison = a[sortConfig.key].toString().localeCompare(b[sortConfig.key].toString());
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return processedData;
  }, [data, searchTerm, sortConfig, columnTypes]);
  
  // Paginate the data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);
  
  // Format cell value based on its type
  const formatCellValue = (value, type) => {
    if (value === null || value === undefined) return '—';
    
    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    if (type === 'numeric') {
      // Format number based on its magnitude
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(2)}K`;
      }
      return value.toString();
    }
    
    // For very long strings, truncate
    if (typeof value === 'string' && value.length > 100) {
      return `${value.substring(0, 100)}...`;
    }
    
    return value.toString();
  };
  
  if (data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" align="center">
          {title}
        </Typography>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No data available
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Table header with title, search and actions */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        
        <TextField
          size="small"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mr: 2, width: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />
        
        <Box>
          {onCreateChart && (
            <Tooltip title="Create chart">
              <IconButton onClick={() => onCreateChart(data)} sx={{ mr: 1 }}>
                <Filter size={20} />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Download CSV">
            <IconButton onClick={() => downloadCSV(data, `${title.replace(/\s+/g, '_').toLowerCase()}.csv`)}>
              <Download size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Data stats */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex' }}>
        <Chip 
          label={`${filteredAndSortedData.length} ${filteredAndSortedData.length === 1 ? 'row' : 'rows'}`} 
          size="small" 
          variant="outlined"
          sx={{ mr: 1 }}
        />
        
        {searchTerm && (
          <Chip 
            label={`Search: "${searchTerm}"`} 
            size="small" 
            onDelete={() => setSearchTerm('')}
            sx={{ mr: 1 }}
          />
        )}
        
        {sortConfig.key && (
          <Chip 
            icon={<Filter size={14} />}
            label={`Sorted by ${sortConfig.key} (${sortConfig.direction})`} 
            size="small"
            onDelete={() => setSortConfig({ key: null, direction: 'asc' })}
          />
        )}
      </Box>
      
      {/* Table container */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="data table" size="small">
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  align={columnTypes[header] === 'numeric' ? 'right' : 'left'}
                  sortDirection={sortConfig.key === header ? sortConfig.direction : false}
                  sx={{ 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <TableSortLabel
                    active={sortConfig.key === header}
                    direction={sortConfig.key === header ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort(header)}
                  >
                    {header}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {headers.map((header) => (
                  <TableCell 
                    key={`${rowIndex}-${header}`}
                    align={columnTypes[header] === 'numeric' ? 'right' : 'left'}
                  >
                    {formatCellValue(row[header], columnTypes[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Showing {Math.min(filteredAndSortedData.length, (page - 1) * rowsPerPage + 1)} to {Math.min(filteredAndSortedData.length, page * rowsPerPage)} of {filteredAndSortedData.length} entries
          </Typography>
        </Box>
        
        <Pagination 
          count={Math.ceil(filteredAndSortedData.length / rowsPerPage)} 
          page={page}
          onChange={handlePageChange}
          shape="rounded"
          size="small"
        />
      </Box>
    </Paper>
  );
};

export default DataTable;