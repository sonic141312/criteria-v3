import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SchemaEditorPage } from './pages/SchemaEditorPage';
import { GraphBuilderPage } from './pages/GraphBuilderPage';
import { ExecutionRunnerPage } from './pages/ExecutionRunnerPage';
import { AppLayout } from './components/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/schemas" replace />} />
            <Route path="/schemas" element={<SchemaEditorPage />} />
            <Route path="/schemas/:schemaId" element={<SchemaEditorPage />} />
            <Route path="/evaluations/:evaluationId/versions/:versionId/graph" element={<GraphBuilderPage />} />
            <Route path="/executions/:executionId" element={<ExecutionRunnerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
