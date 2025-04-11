import React from 'react';
import { Box, Typography, Chip, Card, CardContent, CardActionArea } from '@mui/material';
import { 
  PictureAsPdf, Description, TableChart, Image, DataObject, Article 
} from '@mui/icons-material';

const getDocumentIcon = (fileType) => {
  switch (fileType?.toLowerCase()) {
    case 'pdf': return <PictureAsPdf color="error" />;
    case 'docx':
    case 'doc': return <Description color="primary" />;
    case 'xlsx':
    case 'xls':
    case 'csv': return <TableChart color="success" />;
    case 'json': return <DataObject color="warning" />;
    case 'jpg':
    case 'jpeg':
    case 'png': return <Image color="secondary" />;
    default: return <Article color="action" />;
  }
};

const DocumentReference = ({ documents = [], onViewDocument }) => {
  if (!documents || documents.length === 0) return null;
  
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Documentos referenciados ({documents.length})
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1.5
        }}
      >
        {documents.map((doc, index) => (
          <Card 
            key={doc.document_id || index}
            variant="outlined"
            sx={{ 
              width: 120, 
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardActionArea onClick={() => onViewDocument(doc)}>
              <Box 
                sx={{ 
                  height: 80, 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  svg: { fontSize: 40 }
                }}
              >
                {getDocumentIcon(doc.file_type)}
              </Box>
              <CardContent sx={{ py: 1, px: 1 }}>
                <Typography 
                  variant="caption" 
                  component="div" 
                  noWrap
                  title={doc.filename}
                >
                  {doc.filename}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default DocumentReference;